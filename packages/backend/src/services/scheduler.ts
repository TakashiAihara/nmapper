import { EventEmitter } from 'events'
import { NetworkMonitoringService } from './monitor.js'

export interface ScheduleConfig {
  name: string
  networkRange: string
  enabled: boolean
  interval: number // milliseconds
  scanType: 'discovery' | 'comprehensive' | 'quick'
  ports?: string
  description?: string
  tags?: string[]
  retries?: number
  timeout?: number
  nextRun?: Date
  lastRun?: Date
  runCount?: number
  errorCount?: number
}

export interface ScheduleExecution {
  scheduleId: string
  scheduleName: string
  startTime: Date
  endTime?: Date
  duration?: number
  success: boolean
  error?: string
  devicesFound?: number
  changesDetected?: number
}

export interface SchedulerMetrics {
  totalSchedules: number
  activeSchedules: number
  completedRuns: number
  failedRuns: number
  averageExecutionTime: number
  nextScheduledRun?: Date
  lastCompletedRun?: Date
}

export class MonitoringScheduler extends EventEmitter {
  private monitorService: NetworkMonitoringService
  private schedules = new Map<string, ScheduleConfig>()
  private timers = new Map<string, NodeJS.Timeout>()
  private executions = new Map<string, ScheduleExecution>()
  private isRunning = false

  constructor(monitorService: NetworkMonitoringService) {
    super()
    this.monitorService = monitorService
  }

  async start(): Promise<void> {
    if (this.isRunning) {
      return
    }

    this.isRunning = true
    
    // Start all enabled schedules
    for (const [id, schedule] of this.schedules) {
      if (schedule.enabled) {
        this.startSchedule(id)
      }
    }

    console.log('Monitoring scheduler started')
    this.emit('scheduler-started')
  }

  async stop(): Promise<void> {
    if (!this.isRunning) {
      return
    }

    this.isRunning = false

    // Clear all timers
    for (const [id, timer] of this.timers) {
      clearTimeout(timer)
    }
    this.timers.clear()

    console.log('Monitoring scheduler stopped')
    this.emit('scheduler-stopped')
  }

  createSchedule(config: Omit<ScheduleConfig, 'nextRun' | 'lastRun' | 'runCount' | 'errorCount'>): string {
    const scheduleId = this.generateScheduleId(config.name)
    
    const schedule: ScheduleConfig = {
      ...config,
      nextRun: this.calculateNextRun(config.interval),
      runCount: 0,
      errorCount: 0
    }

    this.schedules.set(scheduleId, schedule)

    if (schedule.enabled && this.isRunning) {
      this.startSchedule(scheduleId)
    }

    this.emit('schedule-created', { id: scheduleId, schedule })
    console.log(`Created schedule "${config.name}" for ${config.networkRange}`)

    return scheduleId
  }

  updateSchedule(scheduleId: string, updates: Partial<ScheduleConfig>): boolean {
    const schedule = this.schedules.get(scheduleId)
    if (!schedule) {
      return false
    }

    // Stop current timer if running
    const timer = this.timers.get(scheduleId)
    if (timer) {
      clearTimeout(timer)
      this.timers.delete(scheduleId)
    }

    // Apply updates
    const updatedSchedule = { ...schedule, ...updates }

    // Recalculate next run if interval changed
    if (updates.interval !== undefined) {
      updatedSchedule.nextRun = this.calculateNextRun(updates.interval)
    }

    this.schedules.set(scheduleId, updatedSchedule)

    // Restart if enabled
    if (updatedSchedule.enabled && this.isRunning) {
      this.startSchedule(scheduleId)
    }

    this.emit('schedule-updated', { id: scheduleId, schedule: updatedSchedule })
    return true
  }

  deleteSchedule(scheduleId: string): boolean {
    const schedule = this.schedules.get(scheduleId)
    if (!schedule) {
      return false
    }

    // Stop timer if running
    const timer = this.timers.get(scheduleId)
    if (timer) {
      clearTimeout(timer)
      this.timers.delete(scheduleId)
    }

    this.schedules.delete(scheduleId)
    this.emit('schedule-deleted', { id: scheduleId, name: schedule.name })
    
    return true
  }

  enableSchedule(scheduleId: string): boolean {
    const schedule = this.schedules.get(scheduleId)
    if (!schedule) {
      return false
    }

    schedule.enabled = true
    
    if (this.isRunning) {
      this.startSchedule(scheduleId)
    }

    this.emit('schedule-enabled', { id: scheduleId, schedule })
    return true
  }

  disableSchedule(scheduleId: string): boolean {
    const schedule = this.schedules.get(scheduleId)
    if (!schedule) {
      return false
    }

    schedule.enabled = false

    // Stop timer if running
    const timer = this.timers.get(scheduleId)
    if (timer) {
      clearTimeout(timer)
      this.timers.delete(scheduleId)
    }

    this.emit('schedule-disabled', { id: scheduleId, schedule })
    return true
  }

  async executeScheduleNow(scheduleId: string): Promise<ScheduleExecution> {
    const schedule = this.schedules.get(scheduleId)
    if (!schedule) {
      throw new Error(`Schedule ${scheduleId} not found`)
    }

    return this.executeSchedule(scheduleId, schedule)
  }

  getSchedule(scheduleId: string): ScheduleConfig | undefined {
    return this.schedules.get(scheduleId)
  }

  getAllSchedules(): Map<string, ScheduleConfig> {
    return new Map(this.schedules)
  }

  getScheduleExecutions(scheduleId: string, limit = 10): ScheduleExecution[] {
    // In a real implementation, this would query a database
    // For now, return recent executions from memory
    const executions: ScheduleExecution[] = []
    
    for (const execution of this.executions.values()) {
      if (execution.scheduleId === scheduleId) {
        executions.push(execution)
      }
    }

    return executions
      .sort((a, b) => b.startTime.getTime() - a.startTime.getTime())
      .slice(0, limit)
  }

  getMetrics(): SchedulerMetrics {
    const totalSchedules = this.schedules.size
    const activeSchedules = Array.from(this.schedules.values())
      .filter(s => s.enabled).length

    const allExecutions = Array.from(this.executions.values())
    const completedRuns = allExecutions.filter(e => e.success).length
    const failedRuns = allExecutions.filter(e => !e.success).length

    const executionsWithDuration = allExecutions.filter(e => e.duration !== undefined)
    const averageExecutionTime = executionsWithDuration.length > 0
      ? executionsWithDuration.reduce((sum, e) => sum + (e.duration || 0), 0) / executionsWithDuration.length
      : 0

    // Find next scheduled run
    let nextScheduledRun: Date | undefined
    for (const schedule of this.schedules.values()) {
      if (schedule.enabled && schedule.nextRun) {
        if (!nextScheduledRun || schedule.nextRun < nextScheduledRun) {
          nextScheduledRun = schedule.nextRun
        }
      }
    }

    // Find last completed run
    const lastExecution = allExecutions
      .filter(e => e.success && e.endTime)
      .sort((a, b) => (b.endTime?.getTime() || 0) - (a.endTime?.getTime() || 0))[0]

    return {
      totalSchedules,
      activeSchedules,
      completedRuns,
      failedRuns,
      averageExecutionTime,
      nextScheduledRun,
      lastCompletedRun: lastExecution?.endTime
    }
  }

  private startSchedule(scheduleId: string): void {
    const schedule = this.schedules.get(scheduleId)
    if (!schedule || !schedule.enabled) {
      return
    }

    // Clear existing timer
    const existingTimer = this.timers.get(scheduleId)
    if (existingTimer) {
      clearTimeout(existingTimer)
    }

    // Calculate delay until next run
    const now = new Date()
    const nextRun = schedule.nextRun || this.calculateNextRun(schedule.interval)
    const delay = Math.max(0, nextRun.getTime() - now.getTime())

    // Set up timer
    const timer = setTimeout(async () => {
      try {
        await this.executeSchedule(scheduleId, schedule)
      } catch (error) {
        console.error(`Failed to execute schedule ${scheduleId}:`, error)
      }
      
      // Reschedule if still enabled
      if (schedule.enabled && this.isRunning) {
        schedule.nextRun = this.calculateNextRun(schedule.interval)
        this.startSchedule(scheduleId)
      }
    }, delay)

    this.timers.set(scheduleId, timer)
    console.log(`Scheduled "${schedule.name}" to run in ${Math.round(delay / 1000)} seconds`)
  }

  private async executeSchedule(scheduleId: string, schedule: ScheduleConfig): Promise<ScheduleExecution> {
    const execution: ScheduleExecution = {
      scheduleId,
      scheduleName: schedule.name,
      startTime: new Date(),
      success: false
    }

    this.emit('execution-started', { scheduleId, execution })

    try {
      console.log(`Executing schedule: ${schedule.name}`)

      // Execute the scan
      const snapshot = await this.monitorService.executeManualScan(
        schedule.networkRange,
        {
          scanType: schedule.scanType,
          ports: schedule.ports
        }
      )

      execution.endTime = new Date()
      execution.duration = execution.endTime.getTime() - execution.startTime.getTime()
      execution.success = true
      execution.devicesFound = snapshot.deviceCount
      execution.changesDetected = 0 // Would be calculated from diff

      // Update schedule stats
      schedule.lastRun = execution.startTime
      schedule.runCount = (schedule.runCount || 0) + 1

      this.emit('execution-completed', { scheduleId, execution, snapshot })
      console.log(`Schedule "${schedule.name}" completed: ${snapshot.deviceCount} devices found`)

    } catch (error) {
      execution.endTime = new Date()
      execution.duration = execution.endTime.getTime() - execution.startTime.getTime()
      execution.success = false
      execution.error = error instanceof Error ? error.message : String(error)

      // Update error count
      schedule.errorCount = (schedule.errorCount || 0) + 1

      this.emit('execution-failed', { scheduleId, execution, error })
      console.error(`Schedule "${schedule.name}" failed:`, error)

      // Retry logic
      if (schedule.retries && (schedule.errorCount || 0) <= schedule.retries) {
        console.log(`Retrying schedule "${schedule.name}" in 5 minutes...`)
        setTimeout(() => {
          if (schedule.enabled && this.isRunning) {
            this.executeSchedule(scheduleId, schedule)
          }
        }, 5 * 60 * 1000) // 5 minutes
      }
    }

    // Store execution (in memory for now)
    const executionId = `${scheduleId}-${execution.startTime.getTime()}`
    this.executions.set(executionId, execution)

    // Clean up old executions (keep last 100)
    if (this.executions.size > 100) {
      const sorted = Array.from(this.executions.entries())
        .sort((a, b) => b[1].startTime.getTime() - a[1].startTime.getTime())
      
      // Remove oldest executions
      const toRemove = sorted.slice(100)
      toRemove.forEach(([id]) => this.executions.delete(id))
    }

    return execution
  }

  private calculateNextRun(interval: number): Date {
    return new Date(Date.now() + interval)
  }

  private generateScheduleId(name: string): string {
    const timestamp = Date.now()
    const sanitized = name.toLowerCase().replace(/[^a-z0-9]/g, '-')
    return `${sanitized}-${timestamp}`
  }

  // Predefined schedule templates
  createDailyDiscoveryScan(networkRange: string, hour = 2): string {
    // Calculate next run at specified hour
    const nextRun = new Date()
    nextRun.setHours(hour, 0, 0, 0)
    if (nextRun <= new Date()) {
      nextRun.setDate(nextRun.getDate() + 1)
    }

    return this.createSchedule({
      name: `Daily Discovery - ${networkRange}`,
      networkRange,
      enabled: true,
      interval: 24 * 60 * 60 * 1000, // 24 hours
      scanType: 'discovery',
      description: `Daily network discovery scan at ${hour}:00 AM`,
      tags: ['daily', 'discovery', 'automated'],
      retries: 2
    })
  }

  createWeeklyComprehensiveScan(networkRange: string, dayOfWeek = 0, hour = 1): string {
    // Calculate next run on specified day at specified hour
    const nextRun = new Date()
    const targetDay = dayOfWeek // 0 = Sunday, 1 = Monday, etc.
    const daysUntilTarget = (targetDay + 7 - nextRun.getDay()) % 7
    
    nextRun.setDate(nextRun.getDate() + daysUntilTarget)
    nextRun.setHours(hour, 0, 0, 0)
    
    if (nextRun <= new Date()) {
      nextRun.setDate(nextRun.getDate() + 7)
    }

    return this.createSchedule({
      name: `Weekly Comprehensive - ${networkRange}`,
      networkRange,
      enabled: true,
      interval: 7 * 24 * 60 * 60 * 1000, // 7 days
      scanType: 'comprehensive',
      description: `Weekly comprehensive scan on ${['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'][dayOfWeek]} at ${hour}:00 AM`,
      tags: ['weekly', 'comprehensive', 'automated'],
      retries: 3,
      timeout: 300000 // 5 minutes
    })
  }

  createCustomIntervalScan(
    name: string,
    networkRange: string,
    intervalMinutes: number,
    scanType: 'discovery' | 'comprehensive' | 'quick' = 'discovery'
  ): string {
    return this.createSchedule({
      name,
      networkRange,
      enabled: true,
      interval: intervalMinutes * 60 * 1000,
      scanType,
      description: `Custom scan every ${intervalMinutes} minutes`,
      tags: ['custom', 'interval'],
      retries: 1
    })
  }

  // Bulk operations
  enableAllSchedules(): void {
    for (const [id, schedule] of this.schedules) {
      if (!schedule.enabled) {
        this.enableSchedule(id)
      }
    }
  }

  disableAllSchedules(): void {
    for (const [id, schedule] of this.schedules) {
      if (schedule.enabled) {
        this.disableSchedule(id)
      }
    }
  }

  deleteAllSchedules(): void {
    const scheduleIds = Array.from(this.schedules.keys())
    for (const id of scheduleIds) {
      this.deleteSchedule(id)
    }
  }

  // Export/Import functionality
  exportSchedules(): any[] {
    return Array.from(this.schedules.values())
  }

  importSchedules(schedules: ScheduleConfig[]): string[] {
    const importedIds: string[] = []

    for (const schedule of schedules) {
      try {
        const id = this.createSchedule(schedule)
        importedIds.push(id)
      } catch (error) {
        console.warn(`Failed to import schedule ${schedule.name}:`, error)
      }
    }

    return importedIds
  }
}