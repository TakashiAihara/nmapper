import { EventEmitter } from 'events'
import { NmapExecutor, NmapOptions, NmapExecutionResult, createHostDiscoveryScan, createPortScan } from './nmap.js'
import { parseNmapXML } from './parser.js'
import type { Device, NetworkSnapshot } from '@nmapper/shared'
import { validateIP, validateNetworkRange, validatePortRange } from '@nmapper/shared'

export interface ScanRequest {
  id: string
  type: ScanType
  targets: string[]
  ports?: string
  options?: Partial<NmapOptions>
  priority?: number
  timeout?: number
  metadata?: Record<string, any>
}

export interface ScanResult {
  requestId: string
  success: boolean
  devices: Device[]
  errors: string[]
  duration: number
  timestamp: Date
  nmapResult?: NmapExecutionResult
  metadata?: Record<string, any>
}

export interface ScanProgress {
  requestId: string
  stage: ScanStage
  progress: number // 0-100
  message: string
  timestamp: Date
}

export enum ScanType {
  HOST_DISCOVERY = 'host_discovery',
  PORT_SCAN = 'port_scan',
  SERVICE_SCAN = 'service_scan',
  COMPREHENSIVE = 'comprehensive',
  QUICK = 'quick'
}

export enum ScanStage {
  QUEUED = 'queued',
  PREPARING = 'preparing',
  SCANNING = 'scanning',
  PARSING = 'parsing',
  PROCESSING = 'processing',
  COMPLETED = 'completed',
  FAILED = 'failed'
}

export interface ScannerConfig {
  nmapPath?: string
  maxConcurrentScans?: number
  defaultTimeout?: number
  queueSize?: number
  retryAttempts?: number
  retryDelay?: number
}

export class NetworkScanner extends EventEmitter {
  private nmapExecutor: NmapExecutor
  private scanQueue: ScanRequest[] = []
  private activeScanCount = 0
  private scanResults = new Map<string, ScanResult>()
  private config: ScannerConfig
  private isProcessing = false

  constructor(config: ScannerConfig = {}) {
    super()
    
    this.config = {
      nmapPath: 'nmap',
      maxConcurrentScans: 1,
      defaultTimeout: 30000,
      queueSize: 100,
      retryAttempts: 2,
      retryDelay: 5000,
      ...config
    }

    this.nmapExecutor = new NmapExecutor(
      this.config.nmapPath,
      this.config.defaultTimeout,
      this.config.maxConcurrentScans
    )
  }

  async initialize(): Promise<void> {
    const nmapCheck = await this.nmapExecutor.checkNmapAvailability()
    
    if (!nmapCheck.available) {
      throw new Error(`nmap is not available: ${nmapCheck.error}`)
    }

    console.log(`Network scanner initialized with nmap version ${nmapCheck.version}`)
    this.emit('scanner-ready', { version: nmapCheck.version })
  }

  async queueScan(request: ScanRequest): Promise<void> {
    // Validate request
    this.validateScanRequest(request)

    // Check queue size
    if (this.scanQueue.length >= this.config.queueSize!) {
      throw new Error(`Scan queue is full (${this.config.queueSize} items)`)
    }

    // Add to queue with default values
    const scanRequest: ScanRequest = {
      priority: 5,
      timeout: this.config.defaultTimeout,
      ...request
    }

    this.scanQueue.push(scanRequest)
    this.scanQueue.sort((a, b) => (b.priority || 5) - (a.priority || 5))

    this.emitProgress(request.id, ScanStage.QUEUED, 0, 'Scan queued')
    this.emit('scan-queued', { requestId: request.id, queueSize: this.scanQueue.length })

    // Start processing if not already running
    if (!this.isProcessing) {
      this.processQueue()
    }
  }

  private validateScanRequest(request: ScanRequest): void {
    if (!request.id) {
      throw new Error('Scan request ID is required')
    }

    if (!request.targets || request.targets.length === 0) {
      throw new Error('At least one target must be specified')
    }

    // Validate targets
    for (const target of request.targets) {
      if (!validateIP(target) && !validateNetworkRange(target)) {
        throw new Error(`Invalid target: ${target}`)
      }
    }

    // Validate port range if specified
    if (request.ports && !validatePortRange(request.ports)) {
      throw new Error(`Invalid port range: ${request.ports}`)
    }

    // Check for duplicate request ID
    if (this.scanResults.has(request.id) || this.scanQueue.some(r => r.id === request.id)) {
      throw new Error(`Scan request with ID ${request.id} already exists`)
    }
  }

  private async processQueue(): Promise<void> {
    if (this.isProcessing) {
      return
    }

    this.isProcessing = true

    try {
      while (this.scanQueue.length > 0 && this.activeScanCount < this.config.maxConcurrentScans!) {
        const request = this.scanQueue.shift()
        if (request) {
          this.activeScanCount++
          this.processScanRequest(request).finally(() => {
            this.activeScanCount--
          })
        }
      }
    } finally {
      this.isProcessing = false
      
      // Continue processing if there are more items in queue
      if (this.scanQueue.length > 0 && this.activeScanCount < this.config.maxConcurrentScans!) {
        setImmediate(() => this.processQueue())
      }
    }
  }

  private async processScanRequest(request: ScanRequest): Promise<void> {
    const startTime = Date.now()

    try {
      this.emitProgress(request.id, ScanStage.PREPARING, 10, 'Preparing scan')

      // Build nmap options based on scan type
      const nmapOptions = this.buildNmapOptions(request)
      
      this.emitProgress(request.id, ScanStage.SCANNING, 20, 'Executing nmap scan')

      // Execute the scan
      const nmapResult = await this.nmapExecutor.executeScan(nmapOptions)

      this.emitProgress(request.id, ScanStage.PARSING, 70, 'Parsing scan results')

      // Parse the results
      const devices = nmapResult.xmlOutput ? await parseNmapXML(nmapResult.xmlOutput) : []

      this.emitProgress(request.id, ScanStage.PROCESSING, 90, 'Processing results')

      // Create scan result
      const result: ScanResult = {
        requestId: request.id,
        success: nmapResult.exitCode === 0,
        devices,
        errors: nmapResult.stderr ? [nmapResult.stderr] : [],
        duration: Date.now() - startTime,
        timestamp: new Date(),
        nmapResult,
        metadata: request.metadata
      }

      this.scanResults.set(request.id, result)
      this.emitProgress(request.id, ScanStage.COMPLETED, 100, 'Scan completed')
      this.emit('scan-completed', result)

      console.log(`Scan ${request.id} completed successfully. Found ${devices.length} devices.`)

    } catch (error) {
      const result: ScanResult = {
        requestId: request.id,
        success: false,
        devices: [],
        errors: [error instanceof Error ? error.message : String(error)],
        duration: Date.now() - startTime,
        timestamp: new Date(),
        metadata: request.metadata
      }

      this.scanResults.set(request.id, result)
      this.emitProgress(request.id, ScanStage.FAILED, 0, `Scan failed: ${error}`)
      this.emit('scan-failed', result)

      console.error(`Scan ${request.id} failed:`, error)
    }
  }

  private buildNmapOptions(request: ScanRequest): NmapOptions {
    const baseOptions: NmapOptions = {
      targets: request.targets,
      ports: request.ports,
      hostTimeout: request.timeout,
      ...request.options
    }

    switch (request.type) {
      case ScanType.HOST_DISCOVERY:
        return {
          ...createHostDiscoveryScan(request.targets[0]),
          ...baseOptions
        }

      case ScanType.PORT_SCAN:
        return {
          ...createPortScan(request.targets[0], request.ports),
          ...baseOptions
        }

      case ScanType.SERVICE_SCAN:
        return {
          ...baseOptions,
          serviceDetection: true,
          serviceVersionIntensity: 5,
          scriptScan: false,
          osDetection: false
        }

      case ScanType.COMPREHENSIVE:
        return {
          ...baseOptions,
          scanType: 'comprehensive',
          serviceDetection: true,
          serviceVersionIntensity: 7,
          osDetection: true,
          scriptScan: true,
          timingTemplate: 4
        }

      case ScanType.QUICK:
        return {
          ...baseOptions,
          ports: '22,80,443,3389,5432,3306',
          serviceDetection: true,
          osDetection: false,
          scriptScan: false,
          timingTemplate: 4
        }

      default:
        return baseOptions
    }
  }

  private emitProgress(requestId: string, stage: ScanStage, progress: number, message: string): void {
    const progressEvent: ScanProgress = {
      requestId,
      stage,
      progress,
      message,
      timestamp: new Date()
    }

    this.emit('scan-progress', progressEvent)
  }

  getScanResult(requestId: string): ScanResult | undefined {
    return this.scanResults.get(requestId)
  }

  getAllScanResults(): ScanResult[] {
    return Array.from(this.scanResults.values())
  }

  getQueueStatus(): {
    queueSize: number
    activeScanCount: number
    totalCompleted: number
    maxConcurrentScans: number
  } {
    return {
      queueSize: this.scanQueue.length,
      activeScanCount: this.activeScanCount,
      totalCompleted: this.scanResults.size,
      maxConcurrentScans: this.config.maxConcurrentScans!
    }
  }

  cancelScan(requestId: string): boolean {
    const queueIndex = this.scanQueue.findIndex(r => r.id === requestId)
    
    if (queueIndex >= 0) {
      this.scanQueue.splice(queueIndex, 1)
      this.emitProgress(requestId, ScanStage.FAILED, 0, 'Scan cancelled')
      return true
    }

    return false
  }

  clearResults(olderThan?: Date): number {
    let cleared = 0
    
    if (olderThan) {
      for (const [id, result] of this.scanResults) {
        if (result.timestamp < olderThan) {
          this.scanResults.delete(id)
          cleared++
        }
      }
    } else {
      cleared = this.scanResults.size
      this.scanResults.clear()
    }

    this.emit('results-cleared', { count: cleared })
    return cleared
  }

  async discoverNetwork(networkRange: string): Promise<Device[]> {
    const requestId = `discovery-${Date.now()}`
    
    await this.queueScan({
      id: requestId,
      type: ScanType.HOST_DISCOVERY,
      targets: [networkRange],
      priority: 10
    })

    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        this.removeAllListeners(`scan-completed-${requestId}`)
        this.removeAllListeners(`scan-failed-${requestId}`)
        reject(new Error('Network discovery timed out'))
      }, this.config.defaultTimeout! * 2)

      this.once('scan-completed', (result: ScanResult) => {
        if (result.requestId === requestId) {
          clearTimeout(timeout)
          resolve(result.devices)
        }
      })

      this.once('scan-failed', (result: ScanResult) => {
        if (result.requestId === requestId) {
          clearTimeout(timeout)
          reject(new Error(result.errors.join(', ')))
        }
      })
    })
  }

  async scanDevice(ip: string, ports?: string): Promise<Device[]> {
    const requestId = `device-${ip}-${Date.now()}`
    
    await this.queueScan({
      id: requestId,
      type: ScanType.PORT_SCAN,
      targets: [ip],
      ports,
      priority: 8
    })

    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error('Device scan timed out'))
      }, this.config.defaultTimeout! * 2)

      this.once('scan-completed', (result: ScanResult) => {
        if (result.requestId === requestId) {
          clearTimeout(timeout)
          resolve(result.devices)
        }
      })

      this.once('scan-failed', (result: ScanResult) => {
        if (result.requestId === requestId) {
          clearTimeout(timeout)
          reject(new Error(result.errors.join(', ')))
        }
      })
    })
  }

  updateConfig(newConfig: Partial<ScannerConfig>): void {
    this.config = { ...this.config, ...newConfig }
    
    if (newConfig.maxConcurrentScans !== undefined) {
      this.nmapExecutor.setMaxConcurrentScans(newConfig.maxConcurrentScans)
    }

    this.emit('config-updated', this.config)
  }

  getConfig(): ScannerConfig {
    return { ...this.config }
  }

  async shutdown(): Promise<void> {
    // Clear the queue
    const cancelledScans = this.scanQueue.length
    this.scanQueue.length = 0

    // Wait for active scans to complete (with timeout)
    const maxWaitTime = 30000 // 30 seconds
    const startTime = Date.now()

    while (this.activeScanCount > 0 && (Date.now() - startTime) < maxWaitTime) {
      await new Promise(resolve => setTimeout(resolve, 1000))
    }

    console.log(`Scanner shutdown complete. ${cancelledScans} queued scans cancelled.`)
    this.emit('scanner-shutdown', { cancelledScans, activeScanCount: this.activeScanCount })
  }
}