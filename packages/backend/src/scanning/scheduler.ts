import { EventEmitter } from 'events'
import { NetworkScanner, ScanRequest, ScanResult, ScanType } from './scanner.js'
import { ScanResultProcessor, ProcessingResult } from './processor.js'
import type { NetworkSnapshot } from '@nmapper/shared'

export interface ScheduledScan {
  id: string
  name: string
  enabled: boolean
  cronExpression?: string
  interval?: number // milliseconds
  scanConfig: Omit<ScanRequest, 'id'>
  lastRun?: Date
  nextRun?: Date
  runCount: number
  failureCount: number
  lastResult?: ScanResult
  createdAt: Date
  updatedAt: Date
}

export interface ScanSchedulerConfig {
  maxConcurrentScans?: number
  maxQueueSize?: number
  defaultScanTimeout?: number
  retryAttempts?: number
  retryDelay?: number
  enableMetrics?: boolean
}

export interface ScanMetrics {
  totalScans: number
  successfulScans: number
  failedScans: number
  averageScanDuration: number
  lastScanTime?: Date
  activeScanCount: number
  queuedScanCount: number
  scheduledScanCount: number
}

export class ScanScheduler extends EventEmitter {
  private scanner: NetworkScanner
  private processor: ScanResultProcessor
  private scheduledScans = new Map<string, ScheduledScan>()
  private activeIntervals = new Map<string, NodeJS.Timeout>()
  private config: ScanSchedulerConfig
  private metrics: ScanMetrics
  private running = false

  constructor(
    scanner: NetworkScanner,
    processor: ScanResultProcessor,
    config: ScanSchedulerConfig = {}
  ) {
    super()
    
    this.scanner = scanner
    this.processor = processor
    
    this.config = {
      maxConcurrentScans: 3,
      maxQueueSize: 50,
      defaultScanTimeout: 300000, // 5 minutes
      retryAttempts: 2,
      retryDelay: 60000, // 1 minute
      enableMetrics: true,
      ...config
    }

    this.metrics = {
      totalScans: 0,
      successfulScans: 0,
      failedScans: 0,
      averageScanDuration: 0,
      activeScanCount: 0,
      queuedScanCount: 0,
      scheduledScanCount: 0
    }

    this.setupEventHandlers()
  }

  private setupEventHandlers(): void {
    // Scanner events
    this.scanner.on('scan-completed', (result: ScanResult) => {
      this.handleScanCompleted(result)
    })

    this.scanner.on('scan-failed', (result: ScanResult) => {
      this.handleScanFailed(result)
    })

    this.scanner.on('scan-progress', (progress) => {
      this.emit('scan-progress', progress)
    })

    // Processor events
    this.processor.on('processing-completed', ({ result, requestId }) => {
      this.handleProcessingCompleted(requestId, result)
    })

    this.processor.on('processing-failed', ({ requestId, error }) => {
      this.handleProcessingFailed(requestId, error)
    })
  }

  async start(): Promise<void> {
    if (this.running) {
      throw new Error('Scheduler is already running')
    }

    await this.scanner.initialize()
    this.running = true

    // Start all enabled scheduled scans
    for (const [id, scheduledScan] of this.scheduledScans) {
      if (scheduledScan.enabled) {
        this.startScheduledScan(id)
      }
    }

    this.emit('scheduler-started')
    console.log('Scan scheduler started')
  }

  async stop(): Promise<void> {
    if (!this.running) {
      return
    }

    this.running = false

    // Clear all intervals
    for (const [id, interval] of this.activeIntervals) {
      clearInterval(interval)
    }
    this.activeIntervals.clear()

    // Shutdown scanner
    await this.scanner.shutdown()

    this.emit('scheduler-stopped')
    console.log('Scan scheduler stopped')
  }

  createScheduledScan(
    name: string,
    scanConfig: Omit<ScanRequest, 'id'>,
    schedule: { interval?: number; cronExpression?: string },
    enabled: boolean = true
  ): string {
    const id = `scheduled-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
    
    const scheduledScan: ScheduledScan = {
      id,
      name,
      enabled,
      ...schedule,
      scanConfig,
      runCount: 0,
      failureCount: 0,
      createdAt: new Date(),
      updatedAt: new Date()
    }

    // Calculate next run time
    if (schedule.interval) {
      scheduledScan.nextRun = new Date(Date.now() + schedule.interval)
    }

    this.scheduledScans.set(id, scheduledScan)
    this.metrics.scheduledScanCount++

    if (enabled && this.running) {
      this.startScheduledScan(id)
    }

    this.emit('scheduled-scan-created', scheduledScan)
    return id
  }

  updateScheduledScan(
    id: string,
    updates: Partial<Omit<ScheduledScan, 'id' | 'createdAt' | 'runCount' | 'failureCount'>>
  ): void {
    const scheduledScan = this.scheduledScans.get(id)
    if (!scheduledScan) {
      throw new Error(`Scheduled scan ${id} not found`)
    }

    // Stop current schedule if running
    if (this.activeIntervals.has(id)) {
      clearInterval(this.activeIntervals.get(id)!)
      this.activeIntervals.delete(id)
    }

    // Update scan
    const updatedScan = {
      ...scheduledScan,
      ...updates,
      updatedAt: new Date()
    }

    // Recalculate next run time if interval changed
    if (updates.interval !== undefined) {
      updatedScan.nextRun = new Date(Date.now() + updates.interval)
    }

    this.scheduledScans.set(id, updatedScan)

    // Restart if enabled and running
    if (updatedScan.enabled && this.running) {
      this.startScheduledScan(id)
    }

    this.emit('scheduled-scan-updated', updatedScan)
  }

  deleteScheduledScan(id: string): void {
    const scheduledScan = this.scheduledScans.get(id)
    if (!scheduledScan) {
      throw new Error(`Scheduled scan ${id} not found`)
    }

    // Stop interval if active
    if (this.activeIntervals.has(id)) {
      clearInterval(this.activeIntervals.get(id)!)
      this.activeIntervals.delete(id)
    }

    this.scheduledScans.delete(id)
    this.metrics.scheduledScanCount--

    this.emit('scheduled-scan-deleted', { id, name: scheduledScan.name })
  }

  private startScheduledScan(id: string): void {
    const scheduledScan = this.scheduledScans.get(id)
    if (!scheduledScan || !scheduledScan.enabled) {
      return
    }

    // Clear existing interval
    if (this.activeIntervals.has(id)) {
      clearInterval(this.activeIntervals.get(id)!)
    }

    if (scheduledScan.interval) {
      // Interval-based scheduling
      const interval = setInterval(() => {
        this.executeScheduledScan(id)
      }, scheduledScan.interval)

      this.activeIntervals.set(id, interval)

      // Run immediately if this is the first time
      if (scheduledScan.runCount === 0) {
        setTimeout(() => this.executeScheduledScan(id), 1000)
      }
    } else if (scheduledScan.cronExpression) {
      // Cron-based scheduling would require a cron library
      console.warn(`Cron scheduling not yet implemented for scan ${id}`)
    }
  }

  private async executeScheduledScan(id: string): Promise<void> {
    const scheduledScan = this.scheduledScans.get(id)
    if (!scheduledScan || !scheduledScan.enabled) {
      return
    }

    try {
      const scanRequest: ScanRequest = {
        ...scheduledScan.scanConfig,
        id: `${id}-${Date.now()}`,
        metadata: {
          ...scheduledScan.scanConfig.metadata,
          scheduledScanId: id,
          scheduledScanName: scheduledScan.name
        }
      }

      // Update scheduled scan
      scheduledScan.lastRun = new Date()
      scheduledScan.runCount++
      if (scheduledScan.interval) {
        scheduledScan.nextRun = new Date(Date.now() + scheduledScan.interval)
      }
      this.scheduledScans.set(id, scheduledScan)

      // Queue the scan
      await this.scanner.queueScan(scanRequest)

      this.emit('scheduled-scan-executed', {
        scheduledScanId: id,
        scanRequestId: scanRequest.id,
        scheduledScan
      })

    } catch (error) {
      scheduledScan.failureCount++
      this.scheduledScans.set(id, scheduledScan)

      console.error(`Failed to execute scheduled scan ${id}:`, error)
      this.emit('scheduled-scan-failed', {
        scheduledScanId: id,
        error: error instanceof Error ? error.message : String(error)
      })
    }
  }

  async executeImmediateScan(scanRequest: ScanRequest): Promise<ProcessingResult> {
    // Add unique timestamp if ID is not unique
    if (!scanRequest.id.includes(Date.now().toString())) {
      scanRequest.id = `${scanRequest.id}-${Date.now()}`
    }

    await this.scanner.queueScan(scanRequest)

    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error('Scan execution timed out'))
      }, scanRequest.timeout || this.config.defaultScanTimeout!)

      const handleProcessingCompleted = (requestId: string, result: ProcessingResult) => {
        if (requestId === scanRequest.id) {
          clearTimeout(timeout)
          this.removeListener('processing-completed', handleProcessingCompleted)
          this.removeListener('processing-failed', handleProcessingFailed)
          resolve(result)
        }
      }

      const handleProcessingFailed = (requestId: string, error: string) => {
        if (requestId === scanRequest.id) {
          clearTimeout(timeout)
          this.removeListener('processing-completed', handleProcessingCompleted)
          this.removeListener('processing-failed', handleProcessingFailed)
          reject(new Error(error))
        }
      }

      this.on('processing-completed', handleProcessingCompleted)
      this.on('processing-failed', handleProcessingFailed)
    })
  }

  async discoverNetworkDevices(networkRange: string): Promise<NetworkSnapshot> {
    const scanRequest: ScanRequest = {
      id: `network-discovery-${Date.now()}`,
      type: ScanType.HOST_DISCOVERY,
      targets: [networkRange],
      priority: 10,
      metadata: { scanType: 'network-discovery' }
    }

    const result = await this.executeImmediateScan(scanRequest)
    return result.snapshot
  }

  async scanMultipleTargets(targets: string[], scanType: ScanType = ScanType.QUICK): Promise<NetworkSnapshot> {
    const scanRequest: ScanRequest = {
      id: `multi-target-scan-${Date.now()}`,
      type: scanType,
      targets,
      priority: 8,
      metadata: { scanType: 'multi-target' }
    }

    const result = await this.executeImmediateScan(scanRequest)
    return result.snapshot
  }

  private handleScanCompleted(result: ScanResult): void {
    this.updateMetrics(result, true)
    
    // Process the scan result
    this.processor.processScanResult(result)
      .catch(error => {
        console.error(`Failed to process scan result ${result.requestId}:`, error)
        this.emit('processing-failed', { requestId: result.requestId, error: error.message })
      })
  }

  private handleScanFailed(result: ScanResult): void {
    this.updateMetrics(result, false)
    this.emit('scan-failed', result)
  }

  private handleProcessingCompleted(requestId: string, result: ProcessingResult): void {
    this.emit('processing-completed', requestId, result)
    this.emit('snapshot-ready', result.snapshot)
  }

  private handleProcessingFailed(requestId: string, error: string): void {
    this.emit('processing-failed', requestId, error)
  }

  private updateMetrics(result: ScanResult, success: boolean): void {
    if (!this.config.enableMetrics) return

    this.metrics.totalScans++
    this.metrics.lastScanTime = result.timestamp

    if (success) {
      this.metrics.successfulScans++
    } else {
      this.metrics.failedScans++
    }

    // Update average scan duration
    const totalDuration = this.metrics.averageScanDuration * (this.metrics.totalScans - 1) + result.duration
    this.metrics.averageScanDuration = totalDuration / this.metrics.totalScans

    // Update active counts
    const queueStatus = this.scanner.getQueueStatus()
    this.metrics.activeScanCount = queueStatus.activeScanCount
    this.metrics.queuedScanCount = queueStatus.queueSize
  }

  getScheduledScans(): ScheduledScan[] {
    return Array.from(this.scheduledScans.values())
  }

  getScheduledScan(id: string): ScheduledScan | undefined {
    return this.scheduledScans.get(id)
  }

  getMetrics(): ScanMetrics {
    const queueStatus = this.scanner.getQueueStatus()
    
    return {
      ...this.metrics,
      activeScanCount: queueStatus.activeScanCount,
      queuedScanCount: queueStatus.queueSize,
      scheduledScanCount: this.scheduledScans.size
    }
  }

  enableScheduledScan(id: string): void {
    const scheduledScan = this.scheduledScans.get(id)
    if (!scheduledScan) {
      throw new Error(`Scheduled scan ${id} not found`)
    }

    scheduledScan.enabled = true
    scheduledScan.updatedAt = new Date()
    
    if (this.running) {
      this.startScheduledScan(id)
    }

    this.emit('scheduled-scan-enabled', scheduledScan)
  }

  disableScheduledScan(id: string): void {
    const scheduledScan = this.scheduledScans.get(id)
    if (!scheduledScan) {
      throw new Error(`Scheduled scan ${id} not found`)
    }

    scheduledScan.enabled = false
    scheduledScan.updatedAt = new Date()

    // Stop interval if active
    if (this.activeIntervals.has(id)) {
      clearInterval(this.activeIntervals.get(id)!)
      this.activeIntervals.delete(id)
    }

    this.emit('scheduled-scan-disabled', scheduledScan)
  }

  isRunning(): boolean {
    return this.running
  }

  getConfig(): ScanSchedulerConfig {
    return { ...this.config }
  }

  updateConfig(newConfig: Partial<ScanSchedulerConfig>): void {
    this.config = { ...this.config, ...newConfig }
    
    // Update scanner config if needed
    if (newConfig.maxConcurrentScans !== undefined) {
      this.scanner.updateConfig({ maxConcurrentScans: newConfig.maxConcurrentScans })
    }

    this.emit('config-updated', this.config)
  }
}