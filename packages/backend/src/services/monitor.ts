import { EventEmitter } from 'events'
import { createScanningSystem } from '../scanning/index.js'
import { createSnapshotSystem } from '../snapshots/index.js'
import { initializeConfig, getAppConfig } from '../config/index.js'
import { database, runPendingMigrations } from '../database/index.js'
import type { NetworkSnapshot, Device, ScanRequest, HealthStatus, ComponentHealth } from '@nmapper/shared'
import type { NetworkScanner, ScanScheduler } from '../scanning/index.js'
import type { SnapshotManager } from '../snapshots/index.js'

export interface MonitoringServiceConfig {
  autoStart?: boolean
  gracefulShutdownTimeout?: number
  healthCheckInterval?: number
  metricsEnabled?: boolean
  notificationsEnabled?: boolean
}

export interface ServiceStatus {
  status: 'starting' | 'running' | 'stopping' | 'stopped' | 'error'
  uptime: number
  lastScan?: Date
  totalScans: number
  errors: number
  components: {
    database: 'connected' | 'disconnected' | 'error'
    scanner: 'ready' | 'busy' | 'error'
    snapshots: 'ready' | 'error'
    configuration: 'loaded' | 'error'
  }
}

export interface MonitoringMetrics {
  uptime: number
  totalScans: number
  totalDevices: number
  activeSchedules: number
  lastScanTime?: number
  scanErrors: number
  averageScanDuration: number
  scansCompleted: number
  devicesDiscovered: number
  changesDetected: number
  snapshotsStored: number
  errorsEncountered: number
  memoryUsage: NodeJS.MemoryUsage
  lastUpdate: Date
}

export class NetworkMonitoringService extends EventEmitter {
  private config: MonitoringServiceConfig
  private appConfig: any
  
  // Core components
  private scanner?: NetworkScanner
  private scheduler?: ScanScheduler
  private snapshotManager?: SnapshotManager
  
  // Service state
  private status: ServiceStatus = {
    status: 'stopped',
    uptime: 0,
    totalScans: 0,
    errors: 0,
    components: {
      database: 'disconnected',
      scanner: 'error',
      snapshots: 'error',
      configuration: 'error'
    }
  }
  private startTime?: Date
  private shutdownInProgress = false
  private healthCheckTimer?: NodeJS.Timeout
  private metrics: MonitoringMetrics
  
  constructor(config: MonitoringServiceConfig = {}) {
    super()
    
    this.config = {
      autoStart: false,
      gracefulShutdownTimeout: 30000,
      healthCheckInterval: 30000,
      metricsEnabled: true,
      notificationsEnabled: true,
      ...config
    }
    
    this.metrics = {
      uptime: 0,
      totalScans: 0,
      totalDevices: 0,
      activeSchedules: 0,
      lastScanTime: undefined,
      scanErrors: 0,
      averageScanDuration: 0,
      scansCompleted: 0,
      devicesDiscovered: 0,
      changesDetected: 0,
      snapshotsStored: 0,
      errorsEncountered: 0,
      memoryUsage: process.memoryUsage(),
      lastUpdate: new Date()
    }
    
    this.setupProcessHandlers()
  }

  async initialize(): Promise<void> {
    this.status.status = 'starting'
    this.emit('service-initializing')

    try {
      console.log('Initializing Network Monitoring Service...')

      // 1. Load configuration
      await this.initializeConfiguration()
      
      // 2. Initialize database
      await this.initializeDatabase()
      
      // 3. Initialize core components
      await this.initializeComponents()
      
      // 4. Set up event handlers
      this.setupEventHandlers()
      
      // 5. Start health monitoring
      if (this.config.healthCheckInterval) {
        this.startHealthMonitoring()
      }

      this.startTime = new Date()
      console.log('Network Monitoring Service initialized successfully')
      
      this.emit('service-initialized')

    } catch (error) {
      this.status.status = 'error'
      this.emit('service-error', {
        phase: 'initialization',
        error: error instanceof Error ? error.message : String(error)
      })
      throw error
    }
  }

  async start(): Promise<void> {
    if (this.status.status !== 'stopped' && this.status.status !== 'error') {
      throw new Error(`Cannot start service in ${this.status.status} state`)
    }

    try {
      await this.initialize()
      
      this.status.status = 'running'
      this.startTime = new Date()
      
      // Start the scanning scheduler
      if (this.scheduler) {
        await this.scheduler.start()
      }

      // Create initial scheduled scan if configured
      await this.setupInitialScans()

      console.log('Network Monitoring Service started successfully')
      this.emit('service-started', {
        timestamp: new Date(),
        config: this.getServiceStatus()
      })

    } catch (error) {
      this.status.status = 'error'
      this.emit('service-error', {
        phase: 'startup',
        error: error instanceof Error ? error.message : String(error)
      })
      throw error
    }
  }

  async stop(): Promise<void> {
    if (this.status.status === 'stopped' || this.shutdownInProgress) {
      return
    }

    this.shutdownInProgress = true
    this.status.status = 'stopping'
    
    console.log('Stopping Network Monitoring Service...')
    this.emit('service-stopping')

    try {
      // Stop health monitoring
      if (this.healthCheckTimer) {
        clearInterval(this.healthCheckTimer)
        this.healthCheckTimer = undefined
      }

      // Stop scheduler
      if (this.scheduler) {
        await this.scheduler.stop()
      }

      // Close database connections
      if (database.isInitialized()) {
        await database.close()
      }

      this.status.status = 'stopped'
      this.shutdownInProgress = false
      
      console.log('Network Monitoring Service stopped successfully')
      this.emit('service-stopped')

    } catch (error) {
      this.status.status = 'error'
      this.emit('service-error', {
        phase: 'shutdown',
        error: error instanceof Error ? error.message : String(error)
      })
      throw error
    }
  }

  async restart(): Promise<void> {
    await this.stop()
    await this.start()
  }

  async executeManualScan(
    networkRange?: string,
    options: {
      scanType?: 'discovery' | 'comprehensive' | 'quick'
      ports?: string
      priority?: number
    } = {}
  ): Promise<NetworkSnapshot> {
    if (!this.scheduler) {
      throw new Error('Service not initialized')
    }

    const range = networkRange || this.appConfig?.scan?.defaultNetworkRange || '192.168.1.0/24'
    
    console.log(`Executing manual scan for ${range}`)
    
    try {
      let snapshot: NetworkSnapshot

      switch (options.scanType || 'discovery') {
        case 'comprehensive':
          snapshot = await this.scheduler.scanMultipleTargets(
            [range], 
            'comprehensive' as any
          )
          break
          
        case 'quick':
          snapshot = await this.scheduler.scanMultipleTargets(
            [range], 
            'quick' as any
          )
          break
          
        default:
          snapshot = await this.scheduler.discoverNetworkDevices(range)
      }

      this.updateMetrics({
        scansCompleted: this.metrics.scansCompleted + 1,
        devicesDiscovered: this.metrics.devicesDiscovered + snapshot.deviceCount
      })

      this.emit('manual-scan-completed', {
        snapshot,
        scanType: options.scanType,
        networkRange: range
      })

      return snapshot

    } catch (error) {
      this.metrics.errorsEncountered++
      this.emit('manual-scan-failed', {
        networkRange: range,
        error: error instanceof Error ? error.message : String(error)
      })
      throw error
    }
  }

  async scheduleRegularScan(
    name: string,
    networkRange: string,
    interval: number,
    options: {
      scanType?: 'discovery' | 'comprehensive' | 'quick'
      ports?: string
      enabled?: boolean
    } = {}
  ): Promise<string> {
    if (!this.scheduler) {
      throw new Error('Service not initialized')
    }

    const scanConfig: ScanRequest = {
      networkRange,
      scanType: options.scanType || 'discovery',
      ports: options.ports
    }

    // For now, just emit that a scan was scheduled
    const scheduledScanId = `scheduled-${Date.now()}`
    // TODO: Implement actual scheduling integration

    console.log(`Scheduled regular scan "${name}" for ${networkRange} every ${interval}ms`)
    
    this.emit('scan-scheduled', {
      id: scheduledScanId,
      name,
      networkRange,
      interval,
      scanType: options.scanType
    })

    return scheduledScanId
  }

  async getNetworkOverview(): Promise<{
    totalDevices: number
    activeDevices: number
    recentChanges: number
    lastScanTime?: Date
    topServices: Array<{ name: string; count: number }>
    riskSummary: { high: number; medium: number; low: number }
  }> {
    if (!this.snapshotManager) {
      throw new Error('Service not initialized')
    }

    const latestSnapshot = await this.snapshotManager.getLatestSnapshot()
    
    if (!latestSnapshot) {
      return {
        totalDevices: 0,
        activeDevices: 0,
        recentChanges: 0,
        topServices: [],
        riskSummary: { high: 0, medium: 0, low: 0 }
      }
    }

    // Calculate metrics from latest snapshot
    const activeDevices = latestSnapshot.devices.filter(d => d.isActive).length
    
    // Get service statistics
    const serviceStats = new Map<string, number>()
    latestSnapshot.devices.forEach(device => {
      device.services?.forEach(service => {
        const count = serviceStats.get(service.name) || 0
        serviceStats.set(service.name, count + 1)
      })
    })

    const topServices = Array.from(serviceStats.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([name, count]) => ({ name, count }))

    // Get risk summary
    const riskSummary = { high: 0, medium: 0, low: 0 }
    latestSnapshot.devices.forEach(device => {
      if (device.riskLevel) {
        riskSummary[device.riskLevel]++
      }
    })

    // Get recent changes (simplified - would need actual diff calculation)
    const recentChanges = 0 // Would compare with previous snapshot

    return {
      totalDevices: latestSnapshot.deviceCount,
      activeDevices,
      recentChanges,
      lastScanTime: latestSnapshot.timestamp,
      topServices,
      riskSummary
    }
  }

  getServiceStatus(): ServiceStatus {
    const uptime = this.startTime ? Date.now() - this.startTime.getTime() : 0

    return {
      status: this.status.status,
      uptime,
      lastScan: this.getLastScanTime(),
      totalScans: this.metrics.scansCompleted,
      errors: this.metrics.errorsEncountered,
      components: {
        database: database.isInitialized() ? 'connected' : 'disconnected',
        scanner: this.scanner ? 'ready' : 'error',
        snapshots: this.snapshotManager ? 'ready' : 'error',
        configuration: this.appConfig ? 'loaded' : 'error'
      }
    }
  }

  getMetrics(): MonitoringMetrics {
    return {
      ...this.metrics,
      uptime: this.startTime ? Date.now() - this.startTime.getTime() : 0,
      memoryUsage: process.memoryUsage(),
      lastUpdate: new Date()
    }
  }

  private async initializeConfiguration(): Promise<void> {
    try {
      this.appConfig = await initializeConfig({
        throwOnError: true,
        validateSchema: true
      })
      
      console.log('Configuration loaded successfully')
      
    } catch (error) {
      console.error('Failed to load configuration:', error)
      throw new Error(`Configuration initialization failed: ${error}`)
    }
  }

  private async initializeDatabase(): Promise<void> {
    try {
      const dbConfig = this.appConfig.database
      
      await database.initialize({
        host: dbConfig.host,
        port: dbConfig.port,
        database: dbConfig.database,
        username: dbConfig.username,
        password: dbConfig.password,
        poolSize: dbConfig.poolSize,
        ssl: dbConfig.ssl
      })

      // Run database migrations
      await runPendingMigrations()
      
      console.log('Database initialized successfully')
      
    } catch (error) {
      console.error('Failed to initialize database:', error)
      throw new Error(`Database initialization failed: ${error}`)
    }
  }

  private async initializeComponents(): Promise<void> {
    try {
      // Initialize scanning system
      const scanningSystem = createScanningSystem({
        nmapPath: this.appConfig.scan.nmapPath,
        maxConcurrentScans: this.appConfig.scan.maxConcurrentScans,
        defaultTimeout: this.appConfig.scan.timeout
      })

      this.scanner = scanningSystem.scanner
      this.scheduler = scanningSystem.scheduler

      // Initialize snapshot system
      const snapshotSystem = createSnapshotSystem({
        storage: {
          enableCompression: false,
          retentionPolicyEnabled: this.appConfig.monitoring.enableChangeNotifications
        }
      })

      this.snapshotManager = snapshotSystem.manager

      console.log('Core components initialized successfully')
      
    } catch (error) {
      console.error('Failed to initialize components:', error)
      throw new Error(`Component initialization failed: ${error}`)
    }
  }

  private setupEventHandlers(): void {
    if (this.scheduler) {
      this.scheduler.on('snapshot-ready', (snapshot: NetworkSnapshot) => {
        this.handleSnapshotReady(snapshot)
      })

      this.scheduler.on('scan-completed', (result) => {
        this.handleScanCompleted(result)
      })

      this.scheduler.on('scan-failed', (result) => {
        this.handleScanFailed(result)
      })
    }

    if (this.snapshotManager) {
      this.snapshotManager.on('network-changes-detected', (event) => {
        this.handleNetworkChanges(event)
      })

      this.snapshotManager.on('significant-changes-detected', (event) => {
        this.handleSignificantChanges(event)
      })
    }
  }

  private async setupInitialScans(): Promise<void> {
    if (!this.appConfig.scan.defaultNetworkRange) {
      console.warn('No default network range configured, skipping initial scan setup')
      return
    }

    try {
      // Schedule regular network discovery
      await this.scheduleRegularScan(
        'Regular Network Discovery',
        this.appConfig.scan.defaultNetworkRange,
        this.appConfig.scan.interval,
        {
          scanType: 'discovery',
          enabled: true
        }
      )

      console.log('Initial scans configured successfully')

    } catch (error) {
      console.warn('Failed to set up initial scans:', error)
    }
  }

  private startHealthMonitoring(): void {
    this.healthCheckTimer = setInterval(async () => {
      try {
        await this.performHealthCheck()
      } catch (error) {
        console.error('Health check failed:', error)
        this.emit('health-check-failed', error)
      }
    }, this.config.healthCheckInterval!)
  }

  private async performHealthCheck(): Promise<void> {
    // Update metrics
    this.updateMetrics({
      uptime: this.startTime ? Date.now() - this.startTime.getTime() : 0,
      memoryUsage: process.memoryUsage(),
      lastUpdate: new Date()
    })

    // Check database connection
    if (database.isInitialized()) {
      try {
        await database.testConnection()
      } catch (error) {
        this.emit('component-error', { component: 'database', error })
      }
    }

    // Emit health status
    this.emit('health-check', {
      status: this.getServiceStatus(),
      metrics: this.getMetrics()
    })
  }

  private async handleSnapshotReady(snapshot: NetworkSnapshot): Promise<void> {
    try {
      // Store the snapshot
      const result = await this.snapshotManager!.createSnapshot(snapshot, {
        generateDiff: true,
        notifyChanges: this.config.notificationsEnabled
      })

      this.updateMetrics({
        snapshotsStored: this.metrics.snapshotsStored + 1,
        devicesDiscovered: this.metrics.devicesDiscovered + snapshot.deviceCount
      })

      if (result.diff && result.diff.summary.totalChanges > 0) {
        this.updateMetrics({
          changesDetected: this.metrics.changesDetected + result.diff.summary.totalChanges
        })
      }

      this.emit('snapshot-stored', {
        snapshotId: result.snapshotId,
        deviceCount: snapshot.deviceCount,
        changes: result.changesSummary
      })

    } catch (error) {
      console.error('Failed to handle snapshot:', error)
      this.metrics.errorsEncountered++
      this.emit('snapshot-error', error)
    }
  }

  private handleScanCompleted(result: any): void {
    this.updateMetrics({
      scansCompleted: this.metrics.scansCompleted + 1,
      averageScanDuration: this.calculateAverageDuration(result.duration)
    })

    this.emit('scan-completed', result)
  }

  private handleScanFailed(result: any): void {
    this.metrics.errorsEncountered++
    this.emit('scan-failed', result)
  }

  private handleNetworkChanges(event: any): void {
    console.log(`Network changes detected: ${event.changesSummary}`)
    this.emit('network-changes', event)
  }

  private handleSignificantChanges(event: any): void {
    console.log(`Significant network changes detected: ${event.summary}`)
    this.emit('significant-changes', event)
    
    // Could trigger alerts/notifications here
    if (this.config.notificationsEnabled) {
      this.emit('alert', {
        type: 'significant-changes',
        severity: event.severity,
        message: event.summary,
        timestamp: new Date()
      })
    }
  }

  private updateMetrics(updates: Partial<MonitoringMetrics>): void {
    Object.assign(this.metrics, updates)
    this.metrics.lastUpdate = new Date()
  }

  private calculateAverageDuration(newDuration: number): number {
    if (this.metrics.averageScanDuration === 0) {
      return newDuration
    }
    return (this.metrics.averageScanDuration + newDuration) / 2
  }

  private getLastScanTime(): Date | undefined {
    // Would typically get this from scheduler or database
    return this.scheduler?.getMetrics().lastScanTime
  }

  private setupProcessHandlers(): void {
    // Graceful shutdown on SIGTERM
    process.once('SIGTERM', async () => {
      console.log('Received SIGTERM, shutting down gracefully...')
      await this.stop()
      process.exit(0)
    })

    // Graceful shutdown on SIGINT (Ctrl+C)
    process.once('SIGINT', async () => {
      console.log('Received SIGINT, shutting down gracefully...')
      await this.stop()
      process.exit(0)
    })

    // Handle uncaught exceptions
    process.on('uncaughtException', (error) => {
      console.error('Uncaught exception:', error)
      this.emit('service-error', {
        phase: 'runtime',
        error: error.message,
        stack: error.stack
      })
    })

    // Handle unhandled promise rejections
    process.on('unhandledRejection', (reason, promise) => {
      console.error('Unhandled rejection at:', promise, 'reason:', reason)
      this.emit('service-error', {
        phase: 'runtime',
        error: String(reason)
      })
    })
  }

  getScheduler() {
    return this.scheduler
  }

  getHealthStatus(): HealthStatus {
    const now = Date.now()
    const components: ComponentHealth[] = []

    // Database health
    components.push({
      name: 'Database',
      healthy: this.status.components.database === 'connected',
      status: this.status.components.database,
      lastCheck: now,
      message: this.status.components.database === 'connected' ? 'Connection active' : 'Connection issues detected'
    })

    // Scanner health
    components.push({
      name: 'Scanner',
      healthy: this.status.components.scanner !== 'error',
      status: this.status.components.scanner,
      lastCheck: now,
      message: this.status.components.scanner === 'ready' ? 'Ready for scans' : 'Scanner unavailable'
    })

    // Snapshots health
    components.push({
      name: 'Snapshots',
      healthy: this.status.components.snapshots === 'ready',
      status: this.status.components.snapshots,
      lastCheck: now,
      message: this.status.components.snapshots === 'ready' ? 'Storage operational' : 'Storage issues detected'
    })

    // Configuration health
    components.push({
      name: 'Configuration',
      healthy: this.status.components.configuration === 'loaded',
      status: this.status.components.configuration,
      lastCheck: now,
      message: this.status.components.configuration === 'loaded' ? 'Config loaded' : 'Config issues detected'
    })

    const allHealthy = components.every(c => c.healthy)
    const someHealthy = components.some(c => c.healthy)

    return {
      status: allHealthy ? 'healthy' : someHealthy ? 'degraded' : 'unhealthy',
      timestamp: now,
      components
    }
  }
}

// Factory function for easy service creation
export function createNetworkMonitorService(config?: MonitoringServiceConfig): NetworkMonitoringService {
  return new NetworkMonitoringService(config)
}