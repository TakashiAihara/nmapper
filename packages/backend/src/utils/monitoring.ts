import { logger, LogLevel } from './logger.js'
import { performance } from 'perf_hooks'

// Performance monitoring utilities
export interface PerformanceMetrics {
  operation: string
  duration: number
  startTime: number
  endTime: number
  success: boolean
  metadata?: Record<string, unknown>
  error?: Error
}

export interface TimingInfo {
  label: string
  startTime: number
  metadata?: Record<string, unknown>
}

export class PerformanceMonitor {
  private static instance: PerformanceMonitor | null = null
  private timings = new Map<string, TimingInfo>()
  private metrics: PerformanceMetrics[] = []
  private readonly maxMetrics = 1000

  static getInstance(): PerformanceMonitor {
    if (!PerformanceMonitor.instance) {
      PerformanceMonitor.instance = new PerformanceMonitor()
    }
    return PerformanceMonitor.instance
  }

  startTiming(label: string, metadata?: Record<string, unknown>): void {
    this.timings.set(label, {
      label,
      startTime: performance.now(),
      metadata
    })
  }

  endTiming(label: string, success = true, error?: Error): PerformanceMetrics | null {
    const timing = this.timings.get(label)
    if (!timing) {
      logger.warn('Attempted to end timing for unknown label', {
        category: 'performance',
        metadata: { label }
      })
      return null
    }

    const endTime = performance.now()
    const duration = endTime - timing.startTime

    const metric: PerformanceMetrics = {
      operation: label,
      duration,
      startTime: timing.startTime,
      endTime,
      success,
      metadata: timing.metadata,
      error
    }

    // Store metric
    this.metrics.push(metric)
    if (this.metrics.length > this.maxMetrics) {
      this.metrics.shift()
    }

    // Log performance
    const logLevel = success ? LogLevel.DEBUG : LogLevel.WARN
    logger.log(logLevel, `Performance: ${label} completed in ${duration.toFixed(2)}ms`, {
      category: 'performance',
      metadata: {
        operation: label,
        duration,
        success,
        ...timing.metadata
      },
      error
    })

    this.timings.delete(label)
    return metric
  }

  // Decorator for automatic timing
  time<T extends (...args: any[]) => any>(
    operation: string,
    fn: T,
    metadata?: Record<string, unknown>
  ): T {
    return ((...args: Parameters<T>): ReturnType<T> => {
      const timingId = `${operation}-${Date.now()}-${Math.random()}`
      this.startTiming(timingId, { operation, ...metadata })

      try {
        const result = fn(...args)
        
        // Handle async functions
        if (result instanceof Promise) {
          return result
            .then(value => {
              this.endTiming(timingId, true)
              return value
            })
            .catch(error => {
              this.endTiming(timingId, false, error)
              throw error
            }) as ReturnType<T>
        }

        this.endTiming(timingId, true)
        return result
      } catch (error) {
        this.endTiming(timingId, false, error instanceof Error ? error : new Error(String(error)))
        throw error
      }
    }) as T
  }

  // Async timing wrapper
  async timeAsync<T>(
    operation: string,
    fn: () => Promise<T>,
    metadata?: Record<string, unknown>
  ): Promise<T> {
    const timingId = `${operation}-${Date.now()}-${Math.random()}`
    this.startTiming(timingId, { operation, ...metadata })

    try {
      const result = await fn()
      this.endTiming(timingId, true)
      return result
    } catch (error) {
      this.endTiming(timingId, false, error instanceof Error ? error : new Error(String(error)))
      throw error
    }
  }

  getMetrics(filter?: {
    operation?: string
    success?: boolean
    minDuration?: number
    maxDuration?: number
    since?: Date
  }): PerformanceMetrics[] {
    let filtered = [...this.metrics]

    if (filter) {
      if (filter.operation) {
        filtered = filtered.filter(m => m.operation === filter.operation)
      }
      if (filter.success !== undefined) {
        filtered = filtered.filter(m => m.success === filter.success)
      }
      if (filter.minDuration !== undefined) {
        filtered = filtered.filter(m => m.duration >= filter.minDuration!)
      }
      if (filter.maxDuration !== undefined) {
        filtered = filtered.filter(m => m.duration <= filter.maxDuration!)
      }
      if (filter.since) {
        const sinceTime = filter.since.getTime() - performance.timeOrigin
        filtered = filtered.filter(m => m.startTime >= sinceTime)
      }
    }

    return filtered.sort((a, b) => b.startTime - a.startTime)
  }

  getStats(operation?: string): {
    count: number
    averageDuration: number
    minDuration: number
    maxDuration: number
    successRate: number
    totalDuration: number
  } {
    const metrics = operation 
      ? this.metrics.filter(m => m.operation === operation)
      : this.metrics

    if (metrics.length === 0) {
      return {
        count: 0,
        averageDuration: 0,
        minDuration: 0,
        maxDuration: 0,
        successRate: 0,
        totalDuration: 0
      }
    }

    const durations = metrics.map(m => m.duration)
    const successCount = metrics.filter(m => m.success).length

    return {
      count: metrics.length,
      averageDuration: durations.reduce((sum, d) => sum + d, 0) / durations.length,
      minDuration: Math.min(...durations),
      maxDuration: Math.max(...durations),
      successRate: (successCount / metrics.length) * 100,
      totalDuration: durations.reduce((sum, d) => sum + d, 0)
    }
  }

  clearMetrics(): void {
    this.metrics = []
    logger.info('Performance metrics cleared', {
      category: 'performance'
    })
  }
}

// Request/Response logging utilities
export interface RequestLogData {
  requestId: string
  method: string
  url: string
  headers?: Record<string, string>
  body?: unknown
  userAgent?: string
  ip?: string
  userId?: string
  sessionId?: string
}

export interface ResponseLogData {
  requestId: string
  statusCode: number
  headers?: Record<string, string>
  body?: unknown
  duration: number
  size?: number
}

export class RequestLogger {
  private static instance: RequestLogger | null = null
  private requests = new Map<string, { startTime: number; request: RequestLogData }>()

  static getInstance(): RequestLogger {
    if (!RequestLogger.instance) {
      RequestLogger.instance = new RequestLogger()
    }
    return RequestLogger.instance
  }

  logRequest(data: RequestLogData): void {
    this.requests.set(data.requestId, {
      startTime: performance.now(),
      request: data
    })

    logger.info('HTTP Request', {
      category: 'http',
      requestId: data.requestId,
      metadata: {
        method: data.method,
        url: data.url,
        userAgent: data.userAgent,
        ip: data.ip,
        userId: data.userId,
        bodySize: data.body ? JSON.stringify(data.body).length : 0
      }
    })
  }

  logResponse(data: ResponseLogData): void {
    const request = this.requests.get(data.requestId)
    this.requests.delete(data.requestId)

    const logLevel = data.statusCode >= 400 ? LogLevel.WARN : LogLevel.INFO
    const logMessage = `HTTP Response ${data.statusCode}`

    logger.log(logLevel, logMessage, {
      category: 'http',
      requestId: data.requestId,
      metadata: {
        statusCode: data.statusCode,
        duration: data.duration,
        size: data.size,
        method: request?.request.method,
        url: request?.request.url,
        userId: request?.request.userId
      }
    })
  }

  logError(requestId: string, error: Error): void {
    const request = this.requests.get(requestId)
    this.requests.delete(requestId)

    logger.error('HTTP Request Error', {
      category: 'http',
      requestId,
      error,
      metadata: {
        method: request?.request.method,
        url: request?.request.url,
        userId: request?.request.userId
      }
    })
  }
}

// Database query logging
export interface DatabaseQueryLog {
  queryId: string
  query: string
  parameters?: unknown[]
  duration?: number
  rowsAffected?: number
  error?: Error
  connectionId?: string
  transactionId?: string
}

export class DatabaseLogger {
  private static instance: DatabaseLogger | null = null
  private activeQueries = new Map<string, { startTime: number; query: string }>()

  static getInstance(): DatabaseLogger {
    if (!DatabaseLogger.instance) {
      DatabaseLogger.instance = new DatabaseLogger()
    }
    return DatabaseLogger.instance
  }

  logQueryStart(data: Omit<DatabaseQueryLog, 'duration' | 'rowsAffected'>): void {
    this.activeQueries.set(data.queryId, {
      startTime: performance.now(),
      query: data.query
    })

    logger.debug('Database Query Started', {
      category: 'database',
      metadata: {
        queryId: data.queryId,
        query: data.query.substring(0, 200), // Truncate long queries
        parameterCount: data.parameters?.length || 0,
        connectionId: data.connectionId,
        transactionId: data.transactionId
      }
    })
  }

  logQueryComplete(data: DatabaseQueryLog): void {
    const active = this.activeQueries.get(data.queryId)
    this.activeQueries.delete(data.queryId)

    const duration = active ? performance.now() - active.startTime : data.duration || 0
    const logLevel = data.error ? LogLevel.ERROR : LogLevel.DEBUG

    logger.log(logLevel, 'Database Query Completed', {
      category: 'database',
      error: data.error,
      metadata: {
        queryId: data.queryId,
        query: data.query.substring(0, 200),
        duration,
        rowsAffected: data.rowsAffected,
        success: !data.error,
        connectionId: data.connectionId,
        transactionId: data.transactionId
      }
    })
  }
}

// System resource monitoring
export interface SystemMetrics {
  timestamp: Date
  cpu: {
    usage: number
    loadAverage: number[]
  }
  memory: {
    used: number
    free: number
    total: number
    heapUsed: number
    heapTotal: number
    external: number
    arrayBuffers: number
  }
  disk?: {
    used: number
    free: number
    total: number
  }
  network?: {
    bytesReceived: number
    bytesSent: number
  }
}

export class SystemMonitor {
  private static instance: SystemMonitor | null = null
  private monitoringTimer?: NodeJS.Timeout
  private isMonitoring = false
  private metrics: SystemMetrics[] = []
  private readonly maxMetrics = 1440 // 24 hours of minute-by-minute data

  static getInstance(): SystemMonitor {
    if (!SystemMonitor.instance) {
      SystemMonitor.instance = new SystemMonitor()
    }
    return SystemMonitor.instance
  }

  startMonitoring(intervalMs = 60000): void { // Default: 1 minute
    if (this.isMonitoring) {
      return
    }

    this.isMonitoring = true
    this.collectMetrics() // Initial collection

    this.monitoringTimer = setInterval(() => {
      this.collectMetrics()
    }, intervalMs)

    logger.info('System monitoring started', {
      category: 'system',
      metadata: { intervalMs }
    })
  }

  stopMonitoring(): void {
    if (!this.isMonitoring) {
      return
    }

    this.isMonitoring = false
    
    if (this.monitoringTimer) {
      clearInterval(this.monitoringTimer)
      this.monitoringTimer = undefined
    }

    logger.info('System monitoring stopped', {
      category: 'system'
    })
  }

  private collectMetrics(): void {
    try {
      const memUsage = process.memoryUsage()
      const cpuUsage = process.cpuUsage()
      
      let loadAverage: number[] = []
      try {
        loadAverage = require('os').loadavg()
      } catch {
        loadAverage = [0, 0, 0] // Windows doesn't support loadavg
      }

      const metric: SystemMetrics = {
        timestamp: new Date(),
        cpu: {
          usage: (cpuUsage.user + cpuUsage.system) / 1000000, // Convert to seconds
          loadAverage
        },
        memory: {
          used: memUsage.rss,
          free: require('os').freemem(),
          total: require('os').totalmem(),
          heapUsed: memUsage.heapUsed,
          heapTotal: memUsage.heapTotal,
          external: memUsage.external,
          arrayBuffers: memUsage.arrayBuffers
        }
      }

      this.metrics.push(metric)
      if (this.metrics.length > this.maxMetrics) {
        this.metrics.shift()
      }

      // Log warnings for high resource usage
      const memoryUsagePercent = (metric.memory.used / metric.memory.total) * 100
      if (memoryUsagePercent > 90) {
        logger.warn('High memory usage detected', {
          category: 'system',
          metadata: {
            memoryUsagePercent: memoryUsagePercent.toFixed(1),
            memoryUsed: metric.memory.used,
            memoryTotal: metric.memory.total
          }
        })
      }

      const highLoad = loadAverage[0] > require('os').cpus().length * 0.8
      if (highLoad) {
        logger.warn('High CPU load detected', {
          category: 'system',
          metadata: {
            loadAverage: loadAverage[0],
            cpuCount: require('os').cpus().length,
            loadThreshold: require('os').cpus().length * 0.8
          }
        })
      }

    } catch (error) {
      logger.error('Error collecting system metrics', {
        category: 'system',
        error: error instanceof Error ? error : new Error(String(error))
      })
    }
  }

  getMetrics(since?: Date): SystemMetrics[] {
    if (since) {
      return this.metrics.filter(m => m.timestamp >= since)
    }
    return [...this.metrics]
  }

  getCurrentMetrics(): SystemMetrics | null {
    return this.metrics.length > 0 ? this.metrics[this.metrics.length - 1] : null
  }

  getAverageMetrics(minutes = 15): Partial<SystemMetrics> | null {
    const since = new Date(Date.now() - minutes * 60 * 1000)
    const recentMetrics = this.getMetrics(since)
    
    if (recentMetrics.length === 0) {
      return null
    }

    const avgCpuUsage = recentMetrics.reduce((sum, m) => sum + m.cpu.usage, 0) / recentMetrics.length
    const avgMemoryUsed = recentMetrics.reduce((sum, m) => sum + m.memory.used, 0) / recentMetrics.length
    const avgLoadAverage = recentMetrics.reduce((sum, m) => sum + m.cpu.loadAverage[0], 0) / recentMetrics.length

    return {
      cpu: {
        usage: avgCpuUsage,
        loadAverage: [avgLoadAverage]
      },
      memory: {
        used: avgMemoryUsed,
        total: recentMetrics[recentMetrics.length - 1].memory.total,
        free: 0, // Not meaningful as average
        heapUsed: 0,
        heapTotal: 0,
        external: 0,
        arrayBuffers: 0
      },
      timestamp: new Date()
    }
  }
}

// Create singleton instances
export const performanceMonitor = PerformanceMonitor.getInstance()
export const requestLogger = RequestLogger.getInstance()
export const databaseLogger = DatabaseLogger.getInstance()
export const systemMonitor = SystemMonitor.getInstance()

// Convenience functions
export function timeOperation<T>(
  operation: string,
  fn: () => T,
  metadata?: Record<string, unknown>
): T {
  return performanceMonitor.time(operation, fn, metadata)()
}

export async function timeAsyncOperation<T>(
  operation: string,
  fn: () => Promise<T>,
  metadata?: Record<string, unknown>
): Promise<T> {
  return performanceMonitor.timeAsync(operation, fn, metadata)
}

// Auto-start system monitoring in production
if (process.env.NODE_ENV === 'production' || process.env.ENABLE_SYSTEM_MONITORING === 'true') {
  systemMonitor.startMonitoring()
}