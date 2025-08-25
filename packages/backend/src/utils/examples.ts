/**
 * Examples showing how to use the comprehensive logging and error handling system
 */

import { 
  logger, 
  LogLevel,
  setupGlobalErrorHandling,
  DatabaseError,
  NetworkError,
  ValidationError,
  errorHandler,
  ErrorRecovery,
  performanceMonitor,
  requestLogger,
  databaseLogger,
  systemMonitor,
  logRotationManager,
  timeAsyncOperation
} from './index.js'

// Example 1: Basic logging with different levels
export function exampleBasicLogging(): void {
  // Simple logging
  logger.info('Application started')
  logger.debug('Debug information')
  logger.warn('Warning message')
  logger.error('Error occurred')

  // Logging with metadata
  logger.info('User logged in', {
    metadata: {
      userId: '12345',
      email: 'user@example.com',
      ip: '192.168.1.100'
    }
  })

  // Logging with categories and components
  logger.info('Database connection established', {
    category: 'database',
    component: 'PostgreSQL',
    metadata: {
      host: 'localhost',
      port: 5432,
      database: 'nmapper'
    }
  })
}

// Example 2: Scoped logging
export function exampleScopedLogging(): void {
  // Create scoped loggers for specific contexts
  const scanLogger = logger.withCategory('scanning').withComponent('NmapScanner')
  const dbLogger = logger.withCategory('database').withComponent('PostgreSQL')
  
  // Request-scoped logging
  const requestId = 'req_123456'
  const requestLogger = logger.withRequestId(requestId)
  
  scanLogger.info('Starting network scan', {
    metadata: { target: '192.168.1.0/24' }
  })
  
  dbLogger.debug('Executing query', {
    metadata: { 
      query: 'SELECT * FROM devices',
      parameters: []
    }
  })
  
  requestLogger.info('Processing API request', {
    metadata: {
      method: 'GET',
      endpoint: '/api/network/current'
    }
  })
}

// Example 3: Error handling with different error types
export function exampleErrorHandling(): void {
  try {
    // Simulate database error
    throw new DatabaseError('Connection failed', {
      metadata: {
        host: 'localhost',
        port: 5432,
        error: 'ECONNREFUSED'
      }
    })
  } catch (error) {
    // Error is automatically logged with structured data
    errorHandler.handle(error, {
      component: 'DatabaseService',
      metadata: { operation: 'connect' }
    })
  }

  try {
    // Simulate validation error
    throw new ValidationError('Invalid input data', {
      email: ['Invalid email format'],
      age: ['Must be between 18 and 100']
    })
  } catch (error) {
    if (error instanceof ValidationError) {
      logger.error('Validation failed', {
        category: 'validation',
        metadata: {
          fieldErrors: error.fieldErrors,
          errorCount: Object.keys(error.fieldErrors).length
        }
      })
    }
  }
}

// Example 4: Performance monitoring
export async function examplePerformanceMonitoring(): Promise<void> {
  // Manual timing
  performanceMonitor.startTiming('database-query', {
    query: 'SELECT * FROM snapshots',
    table: 'snapshots'
  })
  
  // Simulate database operation
  await new Promise(resolve => setTimeout(resolve, 250))
  
  const metrics = performanceMonitor.endTiming('database-query', true)
  
  if (metrics) {
    logger.info('Database query completed', {
      category: 'performance',
      metadata: {
        duration: metrics.duration,
        operation: metrics.operation
      }
    })
  }

  // Using the convenience wrapper
  const result = await timeAsyncOperation(
    'network-scan',
    async () => {
      // Simulate network scan
      await new Promise(resolve => setTimeout(resolve, 1000))
      return { devices: 5, ports: 127 }
    },
    { target: '192.168.1.0/24' }
  )

  logger.info('Network scan results', {
    category: 'scanning',
    metadata: result
  })
}

// Example 5: Request/Response logging
export function exampleRequestLogging(): void {
  const requestId = `req_${Date.now()}_${Math.random()}`
  
  // Log incoming request
  requestLogger.logRequest({
    requestId,
    method: 'POST',
    url: '/api/system/scan',
    headers: {
      'content-type': 'application/json',
      'user-agent': 'NMapper-Client/1.0'
    },
    body: {
      networkRange: '192.168.1.0/24',
      scanType: 'discovery'
    },
    ip: '192.168.1.100',
    userId: 'user_12345'
  })

  // Log response
  setTimeout(() => {
    requestLogger.logResponse({
      requestId,
      statusCode: 200,
      headers: {
        'content-type': 'application/json'
      },
      body: {
        snapshotId: 'snap_789',
        devicesFound: 12
      },
      duration: 1500,
      size: 2048
    })
  }, 1500)
}

// Example 6: Database query logging
export async function exampleDatabaseLogging(): Promise<void> {
  const queryId = `query_${Date.now()}`
  const query = 'SELECT id, ip, hostname FROM devices WHERE last_seen > $1'
  const parameters = [new Date(Date.now() - 24 * 60 * 60 * 1000)]

  // Log query start
  databaseLogger.logQueryStart({
    queryId,
    query,
    parameters,
    connectionId: 'conn_123',
    transactionId: 'txn_456'
  })

  try {
    // Simulate query execution
    await new Promise(resolve => setTimeout(resolve, 150))
    
    // Log successful completion
    databaseLogger.logQueryComplete({
      queryId,
      query,
      parameters,
      duration: 150,
      rowsAffected: 8,
      connectionId: 'conn_123',
      transactionId: 'txn_456'
    })
  } catch (error) {
    // Log query error
    databaseLogger.logQueryComplete({
      queryId,
      query,
      parameters,
      error: error instanceof Error ? error : new Error(String(error)),
      connectionId: 'conn_123',
      transactionId: 'txn_456'
    })
  }
}

// Example 7: Error recovery patterns
export async function exampleErrorRecovery(): Promise<any> {
  // Retry with backoff
  const result = await ErrorRecovery.retry(
    async () => {
      // Simulate unreliable operation
      if (Math.random() < 0.7) {
        throw new NetworkError('Network timeout')
      }
      return { success: true, data: 'operation result' }
    },
    {
      maxAttempts: 3,
      delay: 1000,
      backoffMultiplier: 2,
      shouldRetry: (error, attempt) => {
        // Only retry network errors, not validation errors
        return error instanceof NetworkError && attempt < 3
      }
    }
  )

  // Operation with timeout
  const timeoutResult = await ErrorRecovery.withTimeout(
    async () => {
      // Simulate long-running operation
      await new Promise(resolve => setTimeout(resolve, 2000))
      return 'completed'
    },
    5000, // 5 second timeout
    'Operation timed out after 5 seconds'
  )

  return { result, timeoutResult }
}

// Example 8: System monitoring
export function exampleSystemMonitoring(): void {
  // Start system monitoring (if not already started)
  systemMonitor.startMonitoring(30000) // Every 30 seconds

  // Get current system metrics
  const currentMetrics = systemMonitor.getCurrentMetrics()
  if (currentMetrics) {
    logger.info('Current system metrics', {
      category: 'system',
      metadata: {
        memoryUsed: currentMetrics.memory.used,
        memoryTotal: currentMetrics.memory.total,
        cpuLoad: currentMetrics.cpu.loadAverage[0],
        heapUsed: currentMetrics.memory.heapUsed
      }
    })
  }

  // Get performance statistics
  const perfStats = performanceMonitor.getStats('database-query')
  logger.info('Database query performance stats', {
    category: 'performance',
    metadata: {
      totalQueries: perfStats.count,
      averageDuration: perfStats.averageDuration,
      successRate: perfStats.successRate,
      slowestQuery: perfStats.maxDuration
    }
  })
}

// Example 9: Log rotation management
export async function exampleLogRotation(): Promise<void> {
  // Manual log rotation
  await logRotationManager.rotateNow()
  
  // Get log file statistics
  const stats = await logRotationManager.getStats()
  logger.info('Log file statistics', {
    category: 'logRotation',
    metadata: {
      totalFiles: stats.totalFiles,
      totalSize: stats.totalSize,
      compressedFiles: stats.compressedFiles,
      averageFileSize: stats.averageFileSize
    }
  })

  // Manual cleanup
  await logRotationManager.cleanupNow()
}

// Example 10: Complete application setup
export async function exampleApplicationSetup(): Promise<void> {
  // 1. Setup global error handling
  setupGlobalErrorHandling()

  // 2. Configure logger
  logger.setLevel(LogLevel.INFO)
  logger.info('Application initializing', {
    category: 'startup',
    metadata: {
      version: '1.0.0',
      environment: process.env.NODE_ENV || 'development',
      nodeVersion: process.version
    }
  })

  // 3. Start system monitoring
  systemMonitor.startMonitoring(60000) // Every minute

  // 4. Start log rotation
  await logRotationManager.start()

  // 5. Create application-specific loggers
  const appLogger = logger.withCategory('application')
  const httpLogger = logger.withCategory('http')
  const dbLogger = logger.withCategory('database')

  // 6. Log successful startup
  appLogger.info('Application started successfully', {
    metadata: {
      startupTime: Date.now(),
      pid: process.pid,
      uptime: process.uptime()
    }
  })

  // 7. Setup graceful shutdown
  process.on('SIGINT', async () => {
    appLogger.info('Graceful shutdown initiated')
    
    systemMonitor.stopMonitoring()
    await logRotationManager.stop()
    await logger.close()
    
    appLogger.info('Application shutdown complete')
    process.exit(0)
  })
}

// Example 11: Integration with Express/HTTP middleware
export function createLoggingMiddleware() {
  return (req: any, res: any, next: any) => {
    const requestId = req.headers['x-request-id'] || `req_${Date.now()}_${Math.random()}`
    const startTime = Date.now()

    // Add request ID to request object
    req.requestId = requestId

    // Log request
    requestLogger.logRequest({
      requestId,
      method: req.method,
      url: req.url,
      headers: req.headers,
      body: req.body,
      userAgent: req.headers['user-agent'],
      ip: req.ip || req.connection.remoteAddress,
      userId: req.user?.id,
      sessionId: req.sessionID
    })

    // Log response when it finishes
    res.on('finish', () => {
      const duration = Date.now() - startTime
      requestLogger.logResponse({
        requestId,
        statusCode: res.statusCode,
        headers: res.getHeaders(),
        duration,
        size: res.get('content-length')
      })
    })

    // Log errors
    res.on('error', (error: Error) => {
      requestLogger.logError(requestId, error)
    })

    next()
  }
}

// Export all examples for testing
export const examples = {
  basicLogging: exampleBasicLogging,
  scopedLogging: exampleScopedLogging,
  errorHandling: exampleErrorHandling,
  performanceMonitoring: examplePerformanceMonitoring,
  requestLogging: exampleRequestLogging,
  databaseLogging: exampleDatabaseLogging,
  errorRecovery: exampleErrorRecovery,
  systemMonitoring: exampleSystemMonitoring,
  logRotation: exampleLogRotation,
  applicationSetup: exampleApplicationSetup,
  loggingMiddleware: createLoggingMiddleware
}