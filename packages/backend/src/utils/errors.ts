import { logger } from './logger.js'

// Base error classes
export abstract class BaseError extends Error {
  abstract readonly code: string
  abstract readonly statusCode: number
  abstract readonly category: string
  
  public readonly timestamp: Date
  public readonly requestId?: string
  public readonly userId?: string
  public readonly metadata: Record<string, unknown>

  constructor(
    message: string,
    options: {
      cause?: Error
      requestId?: string
      userId?: string
      metadata?: Record<string, unknown>
    } = {}
  ) {
    super(message)
    
    this.name = this.constructor.name
    this.timestamp = new Date()
    this.requestId = options.requestId
    this.userId = options.userId
    this.metadata = options.metadata || {}
    
    if (options.cause) {
      this.cause = options.cause
      this.stack += `\nCaused by: ${options.cause.stack}`
    }

    // Maintain proper stack trace
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, this.constructor)
    }
  }

  toJSON(): Record<string, unknown> {
    return {
      name: this.name,
      code: this.code,
      message: this.message,
      category: this.category,
      statusCode: this.statusCode,
      timestamp: this.timestamp.toISOString(),
      requestId: this.requestId,
      userId: this.userId,
      metadata: this.metadata,
      stack: this.stack
    }
  }

  log(): void {
    logger.error(this.message, {
      category: this.category,
      error: this,
      requestId: this.requestId,
      metadata: {
        code: this.code,
        statusCode: this.statusCode,
        ...this.metadata
      }
    })
  }
}

// Configuration Errors
export class ConfigurationError extends BaseError {
  readonly code = 'CONFIGURATION_ERROR'
  readonly statusCode = 500
  readonly category = 'configuration'
}

export class MissingConfigError extends ConfigurationError {
  readonly code = 'MISSING_CONFIG'
  
  constructor(configKey: string, options?: Parameters<typeof BaseError.prototype.constructor>[1]) {
    super(`Missing required configuration: ${configKey}`, options)
  }
}

export class InvalidConfigError extends ConfigurationError {
  readonly code = 'INVALID_CONFIG'
  
  constructor(configKey: string, reason?: string, options?: Parameters<typeof BaseError.prototype.constructor>[1]) {
    const message = reason 
      ? `Invalid configuration for ${configKey}: ${reason}`
      : `Invalid configuration: ${configKey}`
    super(message, options)
  }
}

// Database Errors
export class DatabaseError extends BaseError {
  readonly code = 'DATABASE_ERROR'
  readonly statusCode = 500
  readonly category = 'database'
}

export class ConnectionError extends DatabaseError {
  readonly code = 'CONNECTION_ERROR'
  
  constructor(details?: string, options?: Parameters<typeof BaseError.prototype.constructor>[1]) {
    super(`Database connection failed${details ? `: ${details}` : ''}`, options)
  }
}

export class QueryError extends DatabaseError {
  readonly code = 'QUERY_ERROR'
  
  constructor(query?: string, details?: string, options?: Parameters<typeof BaseError.prototype.constructor>[1]) {
    const message = query 
      ? `Query failed: ${query}${details ? ` - ${details}` : ''}`
      : `Database query failed${details ? `: ${details}` : ''}`
    super(message, options)
  }
}

export class TransactionError extends DatabaseError {
  readonly code = 'TRANSACTION_ERROR'
  
  constructor(operation: string, options?: Parameters<typeof BaseError.prototype.constructor>[1]) {
    super(`Transaction failed during ${operation}`, options)
  }
}

export class MigrationError extends DatabaseError {
  readonly code = 'MIGRATION_ERROR'
  
  constructor(version?: string, options?: Parameters<typeof BaseError.prototype.constructor>[1]) {
    const message = version 
      ? `Migration failed for version ${version}`
      : 'Database migration failed'
    super(message, options)
  }
}

// Network/Scanning Errors
export class NetworkError extends BaseError {
  readonly code = 'NETWORK_ERROR'
  readonly statusCode = 500
  readonly category = 'network'
}

export class ScanError extends NetworkError {
  readonly code = 'SCAN_ERROR'
  
  constructor(target?: string, reason?: string, options?: Parameters<typeof BaseError.prototype.constructor>[1]) {
    const message = target
      ? `Scan failed for ${target}${reason ? `: ${reason}` : ''}`
      : `Network scan failed${reason ? `: ${reason}` : ''}`
    super(message, options)
  }
}

export class NmapError extends NetworkError {
  readonly code = 'NMAP_ERROR'
  
  constructor(command?: string, exitCode?: number, options?: Parameters<typeof BaseError.prototype.constructor>[1]) {
    const message = command
      ? `Nmap execution failed: ${command}${exitCode ? ` (exit code: ${exitCode})` : ''}`
      : 'Nmap execution failed'
    super(message, options)
  }
}

export class NetworkTimeoutError extends NetworkError {
  readonly code = 'NETWORK_TIMEOUT'
  readonly statusCode = 408
  
  constructor(target?: string, timeout?: number, options?: Parameters<typeof BaseError.prototype.constructor>[1]) {
    const message = target
      ? `Network timeout for ${target}${timeout ? ` after ${timeout}ms` : ''}`
      : `Network operation timed out${timeout ? ` after ${timeout}ms` : ''}`
    super(message, options)
  }
}

// Validation Errors
export class ValidationError extends BaseError {
  readonly code = 'VALIDATION_ERROR'
  readonly statusCode = 400
  readonly category = 'validation'
  
  public readonly fieldErrors: Record<string, string[]>
  
  constructor(
    message: string,
    fieldErrors: Record<string, string[]> = {},
    options?: Parameters<typeof BaseError.prototype.constructor>[1]
  ) {
    super(message, options)
    this.fieldErrors = fieldErrors
  }

  toJSON(): Record<string, unknown> {
    return {
      ...super.toJSON(),
      fieldErrors: this.fieldErrors
    }
  }
}

export class InvalidInputError extends ValidationError {
  readonly code = 'INVALID_INPUT'
  
  constructor(field: string, reason?: string, options?: Parameters<typeof BaseError.prototype.constructor>[1]) {
    const message = reason
      ? `Invalid ${field}: ${reason}`
      : `Invalid input: ${field}`
    super(message, { [field]: [reason || 'Invalid value'] }, options)
  }
}

export class MissingRequiredFieldError extends ValidationError {
  readonly code = 'MISSING_REQUIRED_FIELD'
  
  constructor(field: string, options?: Parameters<typeof BaseError.prototype.constructor>[1]) {
    super(`Missing required field: ${field}`, { [field]: ['This field is required'] }, options)
  }
}

// Authentication/Authorization Errors
export class AuthError extends BaseError {
  readonly code = 'AUTH_ERROR'
  readonly statusCode = 401
  readonly category = 'auth'
}

export class UnauthorizedError extends AuthError {
  readonly code = 'UNAUTHORIZED'
  
  constructor(reason?: string, options?: Parameters<typeof BaseError.prototype.constructor>[1]) {
    super(reason || 'Authentication required', options)
  }
}

export class ForbiddenError extends AuthError {
  readonly code = 'FORBIDDEN'
  readonly statusCode = 403
  
  constructor(resource?: string, options?: Parameters<typeof BaseError.prototype.constructor>[1]) {
    const message = resource
      ? `Access denied to ${resource}`
      : 'Access denied'
    super(message, options)
  }
}

export class TokenError extends AuthError {
  readonly code = 'TOKEN_ERROR'
  
  constructor(reason?: string, options?: Parameters<typeof BaseError.prototype.constructor>[1]) {
    super(reason || 'Invalid or expired token', options)
  }
}

// Resource Errors
export class ResourceError extends BaseError {
  readonly code = 'RESOURCE_ERROR'
  readonly statusCode = 404
  readonly category = 'resource'
}

export class NotFoundError extends ResourceError {
  readonly code = 'NOT_FOUND'
  
  constructor(resource?: string, id?: string, options?: Parameters<typeof BaseError.prototype.constructor>[1]) {
    const message = resource && id
      ? `${resource} with ID ${id} not found`
      : resource
        ? `${resource} not found`
        : 'Resource not found'
    super(message, options)
  }
}

export class ConflictError extends ResourceError {
  readonly code = 'CONFLICT'
  readonly statusCode = 409
  
  constructor(resource?: string, reason?: string, options?: Parameters<typeof BaseError.prototype.constructor>[1]) {
    const message = resource
      ? `Conflict with ${resource}${reason ? `: ${reason}` : ''}`
      : `Resource conflict${reason ? `: ${reason}` : ''}`
    super(message, options)
  }
}

export class ResourceBusyError extends ResourceError {
  readonly code = 'RESOURCE_BUSY'
  readonly statusCode = 423
  
  constructor(resource?: string, options?: Parameters<typeof BaseError.prototype.constructor>[1]) {
    const message = resource
      ? `${resource} is currently busy`
      : 'Resource is busy'
    super(message, options)
  }
}

// Rate Limiting Errors
export class RateLimitError extends BaseError {
  readonly code = 'RATE_LIMIT_EXCEEDED'
  readonly statusCode = 429
  readonly category = 'rateLimit'
  
  public readonly retryAfter?: number
  
  constructor(retryAfter?: number, options?: Parameters<typeof BaseError.prototype.constructor>[1]) {
    super('Rate limit exceeded', options)
    this.retryAfter = retryAfter
  }

  toJSON(): Record<string, unknown> {
    return {
      ...super.toJSON(),
      retryAfter: this.retryAfter
    }
  }
}

// System Errors
export class SystemError extends BaseError {
  readonly code = 'SYSTEM_ERROR'
  readonly statusCode = 500
  readonly category = 'system'
}

export class ServiceUnavailableError extends SystemError {
  readonly code = 'SERVICE_UNAVAILABLE'
  readonly statusCode = 503
  
  constructor(service?: string, options?: Parameters<typeof BaseError.prototype.constructor>[1]) {
    const message = service
      ? `${service} service is unavailable`
      : 'Service unavailable'
    super(message, options)
  }
}

export class InternalServerError extends SystemError {
  readonly code = 'INTERNAL_SERVER_ERROR'
  
  constructor(details?: string, options?: Parameters<typeof BaseError.prototype.constructor>[1]) {
    super(details || 'Internal server error', options)
  }
}

export class MaintenanceModeError extends SystemError {
  readonly code = 'MAINTENANCE_MODE'
  readonly statusCode = 503
  
  constructor(options?: Parameters<typeof BaseError.prototype.constructor>[1]) {
    super('System is currently in maintenance mode', options)
  }
}

// File System Errors
export class FileSystemError extends BaseError {
  readonly code = 'FILESYSTEM_ERROR'
  readonly statusCode = 500
  readonly category = 'filesystem'
}

export class FileNotFoundError extends FileSystemError {
  readonly code = 'FILE_NOT_FOUND'
  readonly statusCode = 404
  
  constructor(filePath?: string, options?: Parameters<typeof BaseError.prototype.constructor>[1]) {
    const message = filePath
      ? `File not found: ${filePath}`
      : 'File not found'
    super(message, options)
  }
}

export class PermissionError extends FileSystemError {
  readonly code = 'PERMISSION_ERROR'
  readonly statusCode = 403
  
  constructor(operation?: string, path?: string, options?: Parameters<typeof BaseError.prototype.constructor>[1]) {
    const message = operation && path
      ? `Permission denied for ${operation} on ${path}`
      : 'Permission denied'
    super(message, options)
  }
}

export class DiskSpaceError extends FileSystemError {
  readonly code = 'DISK_SPACE_ERROR'
  
  constructor(path?: string, options?: Parameters<typeof BaseError.prototype.constructor>[1]) {
    const message = path
      ? `Insufficient disk space for ${path}`
      : 'Insufficient disk space'
    super(message, options)
  }
}

// Error Handler Class
export class ErrorHandler {
  private static instance: ErrorHandler | null = null

  static getInstance(): ErrorHandler {
    if (!ErrorHandler.instance) {
      ErrorHandler.instance = new ErrorHandler()
    }
    return ErrorHandler.instance
  }

  handle(error: unknown, context?: {
    requestId?: string
    userId?: string
    component?: string
    metadata?: Record<string, unknown>
  }): BaseError {
    // If it's already a BaseError, just log and return
    if (error instanceof BaseError) {
      if (context?.requestId) error.requestId = context.requestId
      if (context?.userId) error.userId = context.userId
      error.log()
      return error
    }

    // Convert Error objects to InternalServerError
    if (error instanceof Error) {
      const wrappedError = new InternalServerError(error.message, {
        cause: error,
        ...context
      })
      wrappedError.log()
      return wrappedError
    }

    // Handle unknown errors
    const unknownError = new InternalServerError('An unknown error occurred', {
      ...context,
      metadata: {
        originalError: String(error),
        ...context?.metadata
      }
    })
    unknownError.log()
    return unknownError
  }

  // Factory methods for common error scenarios
  static createDatabaseError(operation: string, cause?: Error): DatabaseError {
    return new DatabaseError(`Database operation failed: ${operation}`, { cause })
  }

  static createValidationError(fieldErrors: Record<string, string[]>): ValidationError {
    const errorCount = Object.keys(fieldErrors).length
    return new ValidationError(
      `Validation failed for ${errorCount} field${errorCount === 1 ? '' : 's'}`,
      fieldErrors
    )
  }

  static createNetworkError(target: string, cause?: Error): NetworkError {
    return new NetworkError(`Network error for ${target}`, { cause })
  }

  // Async error wrapper
  static async wrapAsync<T>(
    operation: () => Promise<T>,
    context?: {
      operationName?: string
      component?: string
      requestId?: string
      metadata?: Record<string, unknown>
    }
  ): Promise<T> {
    try {
      return await operation()
    } catch (error) {
      const handler = ErrorHandler.getInstance()
      throw handler.handle(error, context)
    }
  }

  // Sync error wrapper
  static wrap<T>(
    operation: () => T,
    context?: {
      operationName?: string
      component?: string
      requestId?: string
      metadata?: Record<string, unknown>
    }
  ): T {
    try {
      return operation()
    } catch (error) {
      const handler = ErrorHandler.getInstance()
      throw handler.handle(error, context)
    }
  }
}

// Global error handler setup
export function setupGlobalErrorHandling(): void {
  const handler = ErrorHandler.getInstance()

  process.on('uncaughtException', (error) => {
    logger.error('Uncaught Exception:', {
      category: 'system',
      error,
      metadata: { type: 'uncaughtException' }
    })
    
    // Give time for logs to flush before exiting
    setTimeout(() => {
      process.exit(1)
    }, 1000)
  })

  process.on('unhandledRejection', (reason, promise) => {
    logger.error('Unhandled Promise Rejection:', {
      category: 'system',
      error: reason instanceof Error ? reason : new Error(String(reason)),
      metadata: {
        type: 'unhandledRejection',
        promise: promise.toString()
      }
    })
  })

  // Handle warnings
  process.on('warning', (warning) => {
    logger.warn('Process Warning:', {
      category: 'system',
      metadata: {
        name: warning.name,
        message: warning.message,
        stack: warning.stack
      }
    })
  })
}

// Utility functions
export function isError(error: unknown): error is Error {
  return error instanceof Error
}

export function isBaseError(error: unknown): error is BaseError {
  return error instanceof BaseError
}

export function getErrorCode(error: unknown): string {
  if (isBaseError(error)) {
    return error.code
  }
  if (isError(error)) {
    return error.constructor.name.toUpperCase()
  }
  return 'UNKNOWN_ERROR'
}

export function getErrorMessage(error: unknown): string {
  if (isError(error)) {
    return error.message
  }
  return String(error)
}

export function getErrorStack(error: unknown): string | undefined {
  if (isError(error)) {
    return error.stack
  }
  return undefined
}

// Error recovery utilities
export class ErrorRecovery {
  static async retry<T>(
    operation: () => Promise<T>,
    options: {
      maxAttempts?: number
      delay?: number
      backoffMultiplier?: number
      shouldRetry?: (error: unknown, attempt: number) => boolean
    } = {}
  ): Promise<T> {
    const {
      maxAttempts = 3,
      delay = 1000,
      backoffMultiplier = 2,
      shouldRetry = (error, attempt) => attempt < maxAttempts
    } = options

    let lastError: unknown
    let currentDelay = delay

    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      try {
        return await operation()
      } catch (error) {
        lastError = error
        
        if (!shouldRetry(error, attempt)) {
          throw error
        }

        if (attempt < maxAttempts) {
          logger.warn(`Operation failed (attempt ${attempt}/${maxAttempts}), retrying in ${currentDelay}ms`, {
            category: 'retry',
            error: error instanceof Error ? error : new Error(String(error)),
            metadata: { attempt, maxAttempts, delay: currentDelay }
          })

          await new Promise(resolve => setTimeout(resolve, currentDelay))
          currentDelay *= backoffMultiplier
        }
      }
    }

    throw lastError
  }

  static async withTimeout<T>(
    operation: () => Promise<T>,
    timeoutMs: number,
    timeoutMessage = 'Operation timed out'
  ): Promise<T> {
    const timeoutPromise = new Promise<never>((_, reject) => {
      setTimeout(() => {
        reject(new NetworkTimeoutError(timeoutMessage, timeoutMs))
      }, timeoutMs)
    })

    return Promise.race([operation(), timeoutPromise])
  }

  static async withCircuitBreaker<T>(
    operation: () => Promise<T>,
    options: {
      failureThreshold?: number
      resetTimeout?: number
      onStateChange?: (state: 'CLOSED' | 'OPEN' | 'HALF_OPEN') => void
    } = {}
  ): Promise<T> {
    // This is a simplified circuit breaker implementation
    // In production, you'd want a more sophisticated implementation
    
    const {
      failureThreshold = 5,
      resetTimeout = 60000,
      onStateChange
    } = options

    // This would typically be stored in a shared state manager
    const state = { failures: 0, lastFailure: 0, state: 'CLOSED' as const }

    const now = Date.now()
    
    // Check if circuit should be reset
    if (state.state === 'OPEN' && now - state.lastFailure > resetTimeout) {
      state.state = 'HALF_OPEN'
      onStateChange?.('HALF_OPEN')
    }

    // Reject immediately if circuit is open
    if (state.state === 'OPEN') {
      throw new ServiceUnavailableError('Circuit breaker is OPEN')
    }

    try {
      const result = await operation()
      
      // Reset on success
      if (state.failures > 0) {
        state.failures = 0
        state.state = 'CLOSED'
        onStateChange?.('CLOSED')
      }
      
      return result
    } catch (error) {
      state.failures++
      state.lastFailure = now

      if (state.failures >= failureThreshold) {
        state.state = 'OPEN'
        onStateChange?.('OPEN')
      }

      throw error
    }
  }
}

// Export error handler instance
export const errorHandler = ErrorHandler.getInstance()