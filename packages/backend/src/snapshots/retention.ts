import { EventEmitter } from 'events'
// Temporary placeholder for CronJob - would use real cron library
class CronJob {
  constructor(
    schedule: string,
    callback: () => void,
    context?: any,
    start?: boolean
  ) {}
  
  stop() {}
  nextDates(count: number): Array<{ toDate: () => Date }> {
    return [{ toDate: () => new Date(Date.now() + 60000) }] // 1 minute from now
  }
}
import { SnapshotStorage } from './storage.js'
import { SnapshotVersioning } from './versioning.js'
import type { NetworkSnapshot } from '@nmapper/shared'
import { db } from '../database/index.js'

export interface RetentionPolicy {
  name: string
  enabled: boolean
  priority: number
  conditions: {
    maxAge?: number // days
    maxCount?: number
    minFreeSpace?: number // bytes
    preserveStable?: boolean
    preserveTagged?: boolean
    preserveWeekly?: boolean
    preserveMonthly?: boolean
  }
  schedule?: string // cron expression
  dryRun?: boolean
  createdAt: Date
  lastRun?: Date
  nextRun?: Date
}

export interface RetentionResult {
  policyName: string
  deletedSnapshots: number
  freedSpace: number
  preservedSnapshots: number
  errors: string[]
  executionTime: number
  dryRun: boolean
}

export interface RetentionMetrics {
  totalPolicies: number
  activePolicies: number
  lastCleanupTime?: Date
  nextScheduledCleanup?: Date
  totalSnapshotsDeleted: number
  totalSpaceFreed: number
  averageCleanupTime: number
}

export class SnapshotRetention extends EventEmitter {
  private storage: SnapshotStorage
  private versioning?: SnapshotVersioning
  private policies = new Map<string, RetentionPolicy>()
  private cronJobs = new Map<string, CronJob>()
  private isRunning = false
  private metrics: RetentionMetrics

  constructor(
    storage: SnapshotStorage,
    versioning?: SnapshotVersioning
  ) {
    super()
    
    this.storage = storage
    this.versioning = versioning
    
    this.metrics = {
      totalPolicies: 0,
      activePolicies: 0,
      totalSnapshotsDeleted: 0,
      totalSpaceFreed: 0,
      averageCleanupTime: 0
    }
  }

  async initialize(): Promise<void> {
    try {
      await this.loadPoliciesFromDatabase()
      await this.scheduleActivePolicies()
      
      this.isRunning = true
      console.log('Snapshot retention system initialized')
      this.emit('retention-initialized')

    } catch (error) {
      console.error('Failed to initialize retention system:', error)
      throw error
    }
  }

  async createPolicy(
    name: string,
    conditions: RetentionPolicy['conditions'],
    schedule?: string,
    options: {
      enabled?: boolean
      priority?: number
      dryRun?: boolean
    } = {}
  ): Promise<RetentionPolicy> {
    if (this.policies.has(name)) {
      throw new Error(`Retention policy '${name}' already exists`)
    }

    const policy: RetentionPolicy = {
      name,
      enabled: options.enabled !== false,
      priority: options.priority || 50,
      conditions,
      schedule,
      dryRun: options.dryRun || false,
      createdAt: new Date()
    }

    // Calculate next run time if schedule is provided
    if (schedule && policy.enabled) {
      try {
        const cronJob = new CronJob(schedule, () => {}, null, false)
        policy.nextRun = cronJob.nextDates(1)[0].toDate()
      } catch (error) {
        throw new Error(`Invalid cron schedule: ${schedule}`)
      }
    }

    // Save to database
    await this.savePolicyToDatabase(policy)

    this.policies.set(name, policy)
    this.metrics.totalPolicies++

    if (policy.enabled) {
      this.metrics.activePolicies++
      await this.schedulePolicyIfNeeded(policy)
    }

    this.emit('policy-created', policy)
    console.log(`Created retention policy: ${name}`)

    return policy
  }

  async updatePolicy(
    name: string,
    updates: Partial<Omit<RetentionPolicy, 'name' | 'createdAt'>>
  ): Promise<RetentionPolicy> {
    const policy = this.policies.get(name)
    if (!policy) {
      throw new Error(`Retention policy '${name}' not found`)
    }

    // Update policy
    const updatedPolicy = { ...policy, ...updates }

    // Handle schedule changes
    if (updates.schedule !== undefined || updates.enabled !== undefined) {
      await this.unschedulePolicyIfNeeded(name)
      
      if (updatedPolicy.schedule && updatedPolicy.enabled) {
        try {
          const cronJob = new CronJob(updatedPolicy.schedule, () => {}, null, false)
          updatedPolicy.nextRun = cronJob.nextDates(1)[0].toDate()
        } catch (error) {
          throw new Error(`Invalid cron schedule: ${updatedPolicy.schedule}`)
        }
      }
    }

    // Update metrics
    if (policy.enabled !== updatedPolicy.enabled) {
      if (updatedPolicy.enabled) {
        this.metrics.activePolicies++
      } else {
        this.metrics.activePolicies--
      }
    }

    // Save to database
    await this.savePolicyToDatabase(updatedPolicy)

    this.policies.set(name, updatedPolicy)

    if (updatedPolicy.enabled && updatedPolicy.schedule) {
      await this.schedulePolicyIfNeeded(updatedPolicy)
    }

    this.emit('policy-updated', updatedPolicy)
    return updatedPolicy
  }

  async deletePolicy(name: string): Promise<boolean> {
    const policy = this.policies.get(name)
    if (!policy) {
      return false
    }

    // Unschedule if needed
    await this.unschedulePolicyIfNeeded(name)

    // Delete from database
    await this.deletePolicyFromDatabase(name)

    this.policies.delete(name)
    this.metrics.totalPolicies--

    if (policy.enabled) {
      this.metrics.activePolicies--
    }

    this.emit('policy-deleted', { name })
    return true
  }

  async executePolicy(
    policyName: string,
    dryRun?: boolean
  ): Promise<RetentionResult> {
    const policy = this.policies.get(policyName)
    if (!policy) {
      throw new Error(`Retention policy '${policyName}' not found`)
    }

    const startTime = Date.now()
    const isDryRun = dryRun !== undefined ? dryRun : policy.dryRun || false

    this.emit('policy-execution-started', { policyName, dryRun: isDryRun })

    try {
      // Get snapshots to evaluate
      const snapshots = await this.getSnapshotsForEvaluation()
      
      // Apply retention logic
      const { toDelete, toPreserve } = await this.evaluateSnapshots(
        snapshots,
        policy
      )

      let deletedCount = 0
      let freedSpace = 0
      const errors: string[] = []

      // Execute deletions
      if (!isDryRun && toDelete.length > 0) {
        const storageMetricsBefore = await this.storage.getStorageMetrics()

        for (const snapshot of toDelete) {
          try {
            await this.storage.deleteSnapshot(snapshot.id)
            deletedCount++
          } catch (error) {
            const errorMsg = `Failed to delete snapshot ${snapshot.id}: ${error}`
            errors.push(errorMsg)
            console.error(errorMsg)
          }
        }

        const storageMetricsAfter = await this.storage.getStorageMetrics()
        freedSpace = storageMetricsBefore.storageSize - storageMetricsAfter.storageSize
      } else if (isDryRun) {
        deletedCount = toDelete.length
        // Estimate freed space
        freedSpace = toDelete.reduce((sum, snapshot) => 
          sum + this.estimateSnapshotSize(snapshot), 0
        )
      }

      const executionTime = Date.now() - startTime

      const result: RetentionResult = {
        policyName,
        deletedSnapshots: deletedCount,
        freedSpace,
        preservedSnapshots: toPreserve.length,
        errors,
        executionTime,
        dryRun: isDryRun
      }

      // Update policy last run time
      policy.lastRun = new Date()
      if (policy.schedule) {
        try {
          const cronJob = new CronJob(policy.schedule, () => {}, null, false)
          policy.nextRun = cronJob.nextDates(1)[0].toDate()
        } catch (error) {
          console.warn(`Failed to calculate next run for policy ${policyName}:`, error)
        }
      }

      await this.savePolicyToDatabase(policy)

      // Update metrics
      this.metrics.totalSnapshotsDeleted += deletedCount
      this.metrics.totalSpaceFreed += freedSpace
      this.updateAverageCleanupTime(executionTime)
      this.metrics.lastCleanupTime = new Date()

      this.emit('policy-execution-completed', result)

      console.log(`Policy '${policyName}' executed: ${deletedCount} snapshots ${isDryRun ? 'would be ' : ''}deleted, ${this.formatBytes(freedSpace)} ${isDryRun ? 'would be ' : ''}freed`)

      return result

    } catch (error) {
      const executionTime = Date.now() - startTime
      const result: RetentionResult = {
        policyName,
        deletedSnapshots: 0,
        freedSpace: 0,
        preservedSnapshots: 0,
        errors: [error instanceof Error ? error.message : String(error)],
        executionTime,
        dryRun: isDryRun
      }

      this.emit('policy-execution-failed', result)
      throw error
    }
  }

  private async evaluateSnapshots(
    snapshots: NetworkSnapshot[],
    policy: RetentionPolicy
  ): Promise<{
    toDelete: NetworkSnapshot[]
    toPreserve: NetworkSnapshot[]
  }> {
    const toDelete: NetworkSnapshot[] = []
    const toPreserve: NetworkSnapshot[] = []

    // Get additional metadata for evaluation
    const snapshotVersions = this.versioning ? 
      await this.getSnapshotVersions(snapshots.map(s => s.id)) : new Map()
    
    const snapshotTags = this.versioning ? 
      await this.getSnapshotTags(snapshots.map(s => s.id)) : new Map()

    for (const snapshot of snapshots) {
      let shouldDelete = false
      let shouldPreserve = false

      // Check age condition
      if (policy.conditions.maxAge) {
        const ageInDays = (Date.now() - snapshot.timestamp.getTime()) / (1000 * 60 * 60 * 24)
        if (ageInDays > policy.conditions.maxAge) {
          shouldDelete = true
        }
      }

      // Check count condition (will be handled after sorting)
      // This is a simplified check - full implementation would need proper sorting

      // Check preservation conditions
      if (policy.conditions.preserveStable && snapshotVersions.get(snapshot.id)?.isStable) {
        shouldPreserve = true
      }

      if (policy.conditions.preserveTagged && snapshotTags.has(snapshot.id)) {
        shouldPreserve = true
      }

      if (policy.conditions.preserveWeekly && this.isWeeklySnapshot(snapshot, snapshots)) {
        shouldPreserve = true
      }

      if (policy.conditions.preserveMonthly && this.isMonthlySnapshot(snapshot, snapshots)) {
        shouldPreserve = true
      }

      // Final decision
      if (shouldPreserve) {
        toPreserve.push(snapshot)
      } else if (shouldDelete) {
        toDelete.push(snapshot)
      } else {
        toPreserve.push(snapshot)
      }
    }

    // Handle maxCount condition
    if (policy.conditions.maxCount && snapshots.length > policy.conditions.maxCount) {
      const sortedSnapshots = [...snapshots].sort((a, b) => 
        b.timestamp.getTime() - a.timestamp.getTime()
      )

      const excessCount = snapshots.length - policy.conditions.maxCount
      const excessSnapshots = sortedSnapshots.slice(policy.conditions.maxCount)

      // Move excess snapshots to delete list (unless preserved)
      excessSnapshots.forEach(snapshot => {
        if (!toPreserve.includes(snapshot)) {
          toDelete.push(snapshot)
          const preserveIndex = toPreserve.indexOf(snapshot)
          if (preserveIndex >= 0) {
            toPreserve.splice(preserveIndex, 1)
          }
        }
      })
    }

    return { toDelete: [...new Set(toDelete)], toPreserve: [...new Set(toPreserve)] }
  }

  private async getSnapshotsForEvaluation(): Promise<NetworkSnapshot[]> {
    // Get all snapshots (this could be optimized for large datasets)
    const result = await this.storage.querySnapshots({
      limit: 10000, // Large limit to get most snapshots
      sortBy: 'timestamp',
      sortOrder: 'desc'
    })

    // Get full snapshots
    const snapshots: NetworkSnapshot[] = []
    for (const snapshot of result.snapshots) {
      const fullSnapshot = await this.storage.getSnapshot(snapshot.id)
      if (fullSnapshot) {
        snapshots.push(fullSnapshot)
      }
    }

    return snapshots
  }

  private async getSnapshotVersions(snapshotIds: string[]): Promise<Map<string, any>> {
    if (!this.versioning) return new Map()

    const versions = new Map()
    
    try {
      const results = await db.executeQuery(`
        SELECT snapshot_id, is_stable, tags
        FROM snapshot_versions 
        WHERE snapshot_id = ANY($1)
      `, [snapshotIds])

      results.forEach(result => {
        versions.set(result.snapshot_id, {
          isStable: result.is_stable,
          tags: result.tags || []
        })
      })
    } catch (error) {
      console.warn('Failed to get snapshot versions:', error)
    }

    return versions
  }

  private async getSnapshotTags(snapshotIds: string[]): Promise<Map<string, string[]>> {
    if (!this.versioning) return new Map()

    const tags = new Map<string, string[]>()
    
    try {
      const results = await db.executeQuery(`
        SELECT sv.snapshot_id, vt.name as tag_name
        FROM snapshot_versions sv
        JOIN version_tags vt ON sv.version = vt.version
        WHERE sv.snapshot_id = ANY($1)
      `, [snapshotIds])

      results.forEach(result => {
        const existing = tags.get(result.snapshot_id) || []
        existing.push(result.tag_name)
        tags.set(result.snapshot_id, existing)
      })
    } catch (error) {
      console.warn('Failed to get snapshot tags:', error)
    }

    return tags
  }

  private isWeeklySnapshot(snapshot: NetworkSnapshot, allSnapshots: NetworkSnapshot[]): boolean {
    const snapshotDate = new Date(snapshot.timestamp)
    const weekStart = new Date(snapshotDate)
    weekStart.setDate(snapshotDate.getDate() - snapshotDate.getDay())
    weekStart.setHours(0, 0, 0, 0)

    const weekEnd = new Date(weekStart)
    weekEnd.setDate(weekStart.getDate() + 7)

    // Check if this is the latest snapshot in its week
    const weekSnapshots = allSnapshots.filter(s => {
      const sDate = new Date(s.timestamp)
      return sDate >= weekStart && sDate < weekEnd
    })

    const latestInWeek = weekSnapshots.reduce((latest, current) => 
      current.timestamp > latest.timestamp ? current : latest
    )

    return latestInWeek.id === snapshot.id
  }

  private isMonthlySnapshot(snapshot: NetworkSnapshot, allSnapshots: NetworkSnapshot[]): boolean {
    const snapshotDate = new Date(snapshot.timestamp)
    const monthStart = new Date(snapshotDate.getFullYear(), snapshotDate.getMonth(), 1)
    const monthEnd = new Date(snapshotDate.getFullYear(), snapshotDate.getMonth() + 1, 1)

    // Check if this is the latest snapshot in its month
    const monthSnapshots = allSnapshots.filter(s => {
      const sDate = new Date(s.timestamp)
      return sDate >= monthStart && sDate < monthEnd
    })

    const latestInMonth = monthSnapshots.reduce((latest, current) => 
      current.timestamp > latest.timestamp ? current : latest
    )

    return latestInMonth.id === snapshot.id
  }

  private estimateSnapshotSize(snapshot: NetworkSnapshot): number {
    // Rough estimate based on device and port count
    const baseSize = 1024 // 1KB base
    const deviceSize = 512 * snapshot.deviceCount // 512 bytes per device
    const portSize = 64 * snapshot.totalPorts // 64 bytes per port
    
    return baseSize + deviceSize + portSize
  }

  private async schedulePolicyIfNeeded(policy: RetentionPolicy): Promise<void> {
    if (!policy.schedule || !policy.enabled) {
      return
    }

    try {
      const cronJob = new CronJob(
        policy.schedule,
        async () => {
          try {
            await this.executePolicy(policy.name)
          } catch (error) {
            console.error(`Scheduled policy execution failed for ${policy.name}:`, error)
          }
        },
        null,
        true // Start immediately
      )

      this.cronJobs.set(policy.name, cronJob)
      console.log(`Scheduled policy ${policy.name} with cron: ${policy.schedule}`)

    } catch (error) {
      console.error(`Failed to schedule policy ${policy.name}:`, error)
      throw error
    }
  }

  private async unschedulePolicyIfNeeded(policyName: string): Promise<void> {
    const cronJob = this.cronJobs.get(policyName)
    if (cronJob) {
      cronJob.stop()
      this.cronJobs.delete(policyName)
    }
  }

  private async scheduleActivePolicies(): Promise<void> {
    for (const policy of this.policies.values()) {
      if (policy.enabled && policy.schedule) {
        await this.schedulePolicyIfNeeded(policy)
      }
    }
  }

  private async loadPoliciesFromDatabase(): Promise<void> {
    // This would load policies from database if they were persisted
    // For now, we'll start with empty policies
    console.log('Loaded retention policies from database')
  }

  private async savePolicyToDatabase(policy: RetentionPolicy): Promise<void> {
    // This would save policy to database for persistence
    // For now, we'll just log
    console.log(`Saved policy ${policy.name} to database`)
  }

  private async deletePolicyFromDatabase(policyName: string): Promise<void> {
    // This would delete policy from database
    console.log(`Deleted policy ${policyName} from database`)
  }

  private updateAverageCleanupTime(executionTime: number): void {
    if (this.metrics.averageCleanupTime === 0) {
      this.metrics.averageCleanupTime = executionTime
    } else {
      this.metrics.averageCleanupTime = (this.metrics.averageCleanupTime + executionTime) / 2
    }
  }

  private formatBytes(bytes: number): string {
    const units = ['B', 'KB', 'MB', 'GB']
    let size = bytes
    let unitIndex = 0

    while (size >= 1024 && unitIndex < units.length - 1) {
      size /= 1024
      unitIndex++
    }

    return `${size.toFixed(1)} ${units[unitIndex]}`
  }

  getPolicies(): RetentionPolicy[] {
    return Array.from(this.policies.values())
  }

  getPolicy(name: string): RetentionPolicy | undefined {
    return this.policies.get(name)
  }

  getMetrics(): RetentionMetrics {
    // Calculate next scheduled cleanup
    let nextScheduledCleanup: Date | undefined
    for (const policy of this.policies.values()) {
      if (policy.enabled && policy.nextRun) {
        if (!nextScheduledCleanup || policy.nextRun < nextScheduledCleanup) {
          nextScheduledCleanup = policy.nextRun
        }
      }
    }

    return {
      ...this.metrics,
      nextScheduledCleanup
    }
  }

  async shutdown(): Promise<void> {
    this.isRunning = false

    // Stop all cron jobs
    for (const [policyName, cronJob] of this.cronJobs) {
      cronJob.stop()
    }
    this.cronJobs.clear()

    this.emit('retention-shutdown')
    console.log('Snapshot retention system shutdown complete')
  }
}