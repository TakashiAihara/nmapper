import { EventEmitter } from 'events'
import { SnapshotStorage } from './storage.js'
import { SnapshotDiffer } from './differ.js'
import { db } from '../database/index.js'
import type { NetworkSnapshot, SnapshotDiff, Device } from '@nmapper/shared'

export interface SnapshotManagerConfig {
  autoCleanup?: boolean
  retentionDays?: number
  maxSnapshotsInMemory?: number
  enableChangeDetection?: boolean
  diffSensitivity?: 'low' | 'medium' | 'high'
  enableMetrics?: boolean
}

export interface SnapshotMetrics {
  totalSnapshots: number
  snapshotsToday: number
  averageDevicesPerSnapshot: number
  mostActiveDevice: string | null
  largestSnapshot: {
    id: string
    deviceCount: number
    timestamp: Date
  } | null
  recentChanges: {
    devicesAdded: number
    devicesRemoved: number
    portsChanged: number
  }
}

export interface CreateSnapshotOptions {
  generateDiff?: boolean
  diffOptions?: {
    sensitivity?: 'low' | 'medium' | 'high'
    includeUnchanged?: boolean
  }
  notifyChanges?: boolean
  autoCleanup?: boolean
}

export class SnapshotManager extends EventEmitter {
  private storage: SnapshotStorage
  private differ: SnapshotDiffer
  private config: SnapshotManagerConfig
  private recentSnapshots = new Map<string, NetworkSnapshot>()
  private cleanupTimer?: NodeJS.Timeout

  constructor(
    storage: SnapshotStorage,
    differ: SnapshotDiffer,
    config: SnapshotManagerConfig = {}
  ) {
    super()

    this.storage = storage
    this.differ = differ
    
    this.config = {
      autoCleanup: true,
      retentionDays: 30,
      maxSnapshotsInMemory: 10,
      enableChangeDetection: true,
      diffSensitivity: 'medium',
      enableMetrics: true,
      ...config
    }

    this.setupEventHandlers()
    
    if (this.config.autoCleanup) {
      this.startCleanupTimer()
    }
  }

  private setupEventHandlers(): void {
    // Storage events
    this.storage.on('snapshot-saved', (event) => {
      this.emit('snapshot-created', event)
    })

    this.storage.on('snapshot-deleted', (event) => {
      this.recentSnapshots.delete(event.snapshotId)
      this.emit('snapshot-deleted', event)
    })

    this.storage.on('snapshots-cleaned', (event) => {
      this.emit('snapshots-cleaned', event)
    })

    // Differ events
    this.differ.on('diff-completed', (event) => {
      this.emit('diff-generated', event)
      
      // Check for significant changes
      const severity = this.differ.getChangeSeverity(event.diff)
      if (severity === 'high') {
        this.emit('significant-changes-detected', {
          diff: event.diff,
          severity,
          summary: this.differ.summarizeDiff(event.diff)
        })
      }
    })
  }

  async createSnapshot(
    snapshot: NetworkSnapshot,
    options: CreateSnapshotOptions = {}
  ): Promise<{
    snapshotId: string
    diff?: SnapshotDiff
    changesSummary?: string
  }> {
    const opts: CreateSnapshotOptions = {
      generateDiff: this.config.enableChangeDetection,
      notifyChanges: true,
      autoCleanup: false,
      ...options
    }

    try {
      // Save the snapshot
      const snapshotId = await this.storage.saveSnapshot(snapshot)

      // Add to recent snapshots cache
      this.addToRecentSnapshots(snapshot)

      let diff: SnapshotDiff | undefined
      let changesSummary: string | undefined

      // Generate diff if requested
      if (opts.generateDiff) {
        const latestSnapshot = await this.getLatestSnapshotBefore(snapshot.timestamp)
        
        if (latestSnapshot) {
          diff = await this.differ.generateDiff(
            latestSnapshot,
            snapshot,
            {
              sensitivity: opts.diffOptions?.sensitivity || this.config.diffSensitivity,
              includeUnchanged: opts.diffOptions?.includeUnchanged || false,
              detectPortChanges: true,
              detectServiceChanges: true,
              detectOSChanges: true,
              detectPropertyChanges: true
            }
          )

          changesSummary = this.differ.summarizeDiff(diff)

          // Store the diff in database
          await this.storeDiff(diff)

          // Notify about changes if requested
          if (opts.notifyChanges && diff.summary.totalChanges > 0) {
            this.emit('network-changes-detected', {
              snapshot,
              diff,
              changesSummary,
              severity: this.differ.getChangeSeverity(diff)
            })
          }
        }
      }

      // Auto cleanup if requested
      if (opts.autoCleanup && this.config.autoCleanup) {
        this.scheduleCleanup()
      }

      console.log(`Snapshot ${snapshotId} created successfully${changesSummary ? ` with changes: ${changesSummary}` : ''}`)

      return {
        snapshotId,
        diff,
        changesSummary
      }

    } catch (error) {
      this.emit('snapshot-create-error', {
        snapshotId: snapshot.id,
        error: error instanceof Error ? error.message : String(error)
      })
      throw error
    }
  }

  async getSnapshot(snapshotId: string): Promise<NetworkSnapshot | null> {
    // Check recent snapshots cache first
    const cached = this.recentSnapshots.get(snapshotId)
    if (cached) {
      return cached
    }

    // Load from storage
    const snapshot = await this.storage.getSnapshot(snapshotId)
    
    if (snapshot) {
      this.addToRecentSnapshots(snapshot)
    }

    return snapshot
  }

  async getLatestSnapshot(): Promise<NetworkSnapshot | null> {
    return this.storage.getLatestSnapshot()
  }

  async getSnapshotHistory(
    options: {
      limit?: number
      startDate?: Date
      endDate?: Date
      deviceIp?: string
    } = {}
  ): Promise<NetworkSnapshot[]> {
    const result = await this.storage.querySnapshots({
      limit: options.limit || 20,
      startDate: options.startDate,
      endDate: options.endDate,
      deviceIp: options.deviceIp,
      sortBy: 'timestamp',
      sortOrder: 'desc'
    })

    // Load full snapshots
    const snapshots: NetworkSnapshot[] = []
    for (const snapshot of result.snapshots) {
      const fullSnapshot = await this.getSnapshot(snapshot.id)
      if (fullSnapshot) {
        snapshots.push(fullSnapshot)
      }
    }

    return snapshots
  }

  async deleteSnapshot(snapshotId: string): Promise<boolean> {
    const deleted = await this.storage.deleteSnapshot(snapshotId)
    
    if (deleted) {
      this.recentSnapshots.delete(snapshotId)
    }

    return deleted
  }

  async generateDiffBetween(
    fromSnapshotId: string,
    toSnapshotId: string
  ): Promise<SnapshotDiff> {
    const fromSnapshot = await this.getSnapshot(fromSnapshotId)
    const toSnapshot = await this.getSnapshot(toSnapshotId)

    if (!fromSnapshot) {
      throw new Error(`From snapshot ${fromSnapshotId} not found`)
    }

    if (!toSnapshot) {
      throw new Error(`To snapshot ${toSnapshotId} not found`)
    }

    return this.differ.generateDiff(fromSnapshot, toSnapshot, {
      sensitivity: this.config.diffSensitivity
    })
  }

  async getDeviceHistory(
    deviceIp: string,
    options: {
      limit?: number
      startDate?: Date
      endDate?: Date
    } = {}
  ): Promise<{
    snapshots: NetworkSnapshot[]
    deviceHistory: Device[]
    changes: SnapshotDiff[]
  }> {
    // Get snapshots containing this device
    const snapshots = await this.storage.getSnapshotHistory(
      deviceIp,
      options.limit || 10
    )

    // Extract device information from each snapshot
    const deviceHistory: Device[] = []
    for (const snapshot of snapshots) {
      const device = snapshot.devices.find(d => d.ip === deviceIp)
      if (device) {
        deviceHistory.push(device)
      }
    }

    // Generate diffs between consecutive snapshots
    const changes = await this.differ.compareManySnapshots(snapshots, {
      sensitivity: this.config.diffSensitivity
    })

    return {
      snapshots,
      deviceHistory,
      changes
    }
  }

  async getNetworkTimeline(
    options: {
      startDate?: Date
      endDate?: Date
      includeMinorChanges?: boolean
    } = {}
  ): Promise<{
    snapshots: NetworkSnapshot[]
    majorChanges: SnapshotDiff[]
    timeline: Array<{
      timestamp: Date
      type: 'snapshot' | 'change'
      data: NetworkSnapshot | SnapshotDiff
      summary?: string
    }>
  }> {
    const snapshots = await this.getSnapshotHistory({
      startDate: options.startDate,
      endDate: options.endDate,
      limit: 50
    })

    const changes = await this.differ.compareManySnapshots(snapshots, {
      sensitivity: this.config.diffSensitivity
    })

    // Filter major changes
    const majorChanges = changes.filter(diff => {
      const severity = this.differ.getChangeSeverity(diff)
      return severity === 'high' || severity === 'medium' || options.includeMinorChanges
    })

    // Create timeline
    const timeline: Array<{
      timestamp: Date
      type: 'snapshot' | 'change'
      data: NetworkSnapshot | SnapshotDiff
      summary?: string
    }> = []

    // Add snapshots to timeline
    snapshots.forEach(snapshot => {
      timeline.push({
        timestamp: snapshot.timestamp,
        type: 'snapshot',
        data: snapshot,
        summary: `Scan completed: ${snapshot.deviceCount} devices, ${snapshot.totalPorts} ports`
      })
    })

    // Add changes to timeline
    majorChanges.forEach(diff => {
      timeline.push({
        timestamp: diff.timestamp,
        type: 'change',
        data: diff,
        summary: this.differ.summarizeDiff(diff)
      })
    })

    // Sort timeline by timestamp
    timeline.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())

    return {
      snapshots,
      majorChanges,
      timeline
    }
  }

  async getMetrics(): Promise<SnapshotMetrics> {
    if (!this.config.enableMetrics) {
      throw new Error('Metrics are disabled')
    }

    const storageMetrics = await this.storage.getStorageMetrics()

    // Get today's snapshots count
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const todayResult = await this.storage.querySnapshots({
      startDate: today,
      limit: 1000
    })

    // Find most active device (appears in most snapshots)
    const deviceActivity = new Map<string, number>()
    const recentSnapshots = await this.getSnapshotHistory({ limit: 20 })
    
    recentSnapshots.forEach(snapshot => {
      snapshot.devices.forEach(device => {
        const count = deviceActivity.get(device.ip) || 0
        deviceActivity.set(device.ip, count + 1)
      })
    })

    const mostActiveDevice = Array.from(deviceActivity.entries())
      .sort((a, b) => b[1] - a[1])[0]?.[0] || null

    // Find largest snapshot
    let largestSnapshot: SnapshotMetrics['largestSnapshot'] = null
    recentSnapshots.forEach(snapshot => {
      if (!largestSnapshot || snapshot.deviceCount > largestSnapshot.deviceCount) {
        largestSnapshot = {
          id: snapshot.id,
          deviceCount: snapshot.deviceCount,
          timestamp: snapshot.timestamp
        }
      }
    })

    // Calculate recent changes
    const recentChanges = { devicesAdded: 0, devicesRemoved: 0, portsChanged: 0 }
    if (recentSnapshots.length >= 2) {
      try {
        const latestDiff = await this.differ.generateDiff(
          recentSnapshots[1],
          recentSnapshots[0]
        )
        
        recentChanges.devicesAdded = latestDiff.summary.devicesAdded
        recentChanges.devicesRemoved = latestDiff.summary.devicesRemoved
        recentChanges.portsChanged = latestDiff.summary.portsChanged
      } catch (error) {
        console.warn('Failed to calculate recent changes:', error)
      }
    }

    return {
      totalSnapshots: storageMetrics.totalSnapshots,
      snapshotsToday: todayResult.snapshots.length,
      averageDevicesPerSnapshot: storageMetrics.averageDevicesPerSnapshot,
      mostActiveDevice,
      largestSnapshot,
      recentChanges
    }
  }

  async cleanup(retentionDays?: number): Promise<{
    deletedSnapshots: number
    freedSpace: number
  }> {
    const days = retentionDays || this.config.retentionDays || 30
    
    const metricsBeforeCleanup = await this.storage.getStorageMetrics()
    const deletedSnapshots = await this.storage.cleanupOldSnapshots(days)
    const metricsAfterCleanup = await this.storage.getStorageMetrics()
    
    const freedSpace = metricsBeforeCleanup.storageSize - metricsAfterCleanup.storageSize

    // Clear recent snapshots cache
    this.recentSnapshots.clear()

    return {
      deletedSnapshots,
      freedSpace
    }
  }

  private async getLatestSnapshotBefore(timestamp: Date): Promise<NetworkSnapshot | null> {
    const result = await this.storage.querySnapshots({
      endDate: new Date(timestamp.getTime() - 1), // 1ms before
      limit: 1,
      sortBy: 'timestamp',
      sortOrder: 'desc'
    })

    if (result.snapshots.length === 0) {
      return null
    }

    return this.getSnapshot(result.snapshots[0].id)
  }

  private async storeDiff(diff: SnapshotDiff): Promise<void> {
    // Store diff in database for quick retrieval
    try {
      await db.createRecord('snapshot_diffs', {
        from_snapshot_id: diff.fromSnapshot,
        to_snapshot_id: diff.toSnapshot,
        timestamp: diff.timestamp,
        devices_added: diff.summary.devicesAdded,
        devices_removed: diff.summary.devicesRemoved,
        devices_changed: diff.summary.devicesChanged,
        ports_changed: diff.summary.portsChanged,
        services_changed: diff.summary.servicesChanged,
        total_changes: diff.summary.totalChanges,
        diff_data: JSON.stringify(diff.deviceChanges)
      })
    } catch (error) {
      console.warn('Failed to store diff in database:', error)
    }
  }

  private addToRecentSnapshots(snapshot: NetworkSnapshot): void {
    this.recentSnapshots.set(snapshot.id, snapshot)

    // Limit cache size
    const maxSize = this.config.maxSnapshotsInMemory || 10
    if (this.recentSnapshots.size > maxSize) {
      // Remove oldest snapshot
      const oldestKey = this.recentSnapshots.keys().next().value
      if (oldestKey) {
        this.recentSnapshots.delete(oldestKey)
      }
    }
  }

  private startCleanupTimer(): void {
    // Run cleanup daily
    const cleanupInterval = 24 * 60 * 60 * 1000 // 24 hours

    this.cleanupTimer = setInterval(async () => {
      try {
        await this.cleanup()
      } catch (error) {
        console.error('Scheduled cleanup failed:', error)
      }
    }, cleanupInterval)
  }

  private scheduleCleanup(): void {
    // Schedule cleanup for next execution loop
    setImmediate(async () => {
      try {
        await this.cleanup()
      } catch (error) {
        console.error('Auto cleanup failed:', error)
      }
    })
  }

  getConfig(): SnapshotManagerConfig {
    return { ...this.config }
  }

  updateConfig(newConfig: Partial<SnapshotManagerConfig>): void {
    this.config = { ...this.config, ...newConfig }
    
    // Restart cleanup timer if autoCleanup setting changed
    if (newConfig.autoCleanup !== undefined) {
      if (this.cleanupTimer) {
        clearInterval(this.cleanupTimer)
        this.cleanupTimer = undefined
      }
      
      if (this.config.autoCleanup) {
        this.startCleanupTimer()
      }
    }

    this.emit('config-updated', this.config)
  }

  async shutdown(): Promise<void> {
    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer)
      this.cleanupTimer = undefined
    }

    this.recentSnapshots.clear()
    this.emit('shutdown')
    console.log('Snapshot manager shutdown complete')
  }
}