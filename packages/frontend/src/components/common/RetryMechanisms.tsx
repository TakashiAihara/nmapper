import React, { useState, useCallback, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle, Button } from '@/components/ui'
import { useNotifications } from './NotificationSystem'
import { LoadingSpinner } from './LoadingSpinner'
import { cn } from '@/lib/utils'
import {
  RefreshCw,
  AlertTriangle,
  CheckCircle,
  Clock,
  Zap,
  WifiOff,
  Server,
  Database,
  Network,
  Settings,
  Activity,
  Eye
} from 'lucide-react'

interface RetryConfig {
  maxAttempts: number
  baseDelay: number // milliseconds
  maxDelay: number // milliseconds
  backoffMultiplier: number
  retryableErrors?: string[] // Error types that should trigger retry
}

interface UseRetryOptions extends Partial<RetryConfig> {
  onRetry?: (attempt: number, error: Error) => void
  onMaxAttemptsReached?: (error: Error) => void
  onSuccess?: () => void
}

interface RetryState {
  attempt: number
  isRetrying: boolean
  error: Error | null
  nextRetryIn: number
  hasReachedMaxAttempts: boolean
}

const DEFAULT_CONFIG: RetryConfig = {
  maxAttempts: 3,
  baseDelay: 1000,
  maxDelay: 10000,
  backoffMultiplier: 2,
  retryableErrors: [
    'NetworkError',
    'TimeoutError',
    'FetchError',
    'ConnectionError',
    'ServiceUnavailable'
  ]
}

export function useRetry<T>(
  operation: () => Promise<T>,
  options: UseRetryOptions = {}
) {
  const config = { ...DEFAULT_CONFIG, ...options }
  const [state, setState] = useState<RetryState>({
    attempt: 0,
    isRetrying: false,
    error: null,
    nextRetryIn: 0,
    hasReachedMaxAttempts: false
  })

  const isRetryableError = useCallback((error: Error) => {
    if (!config.retryableErrors?.length) return true
    return config.retryableErrors.some(errorType => 
      error.name.includes(errorType) || error.message.includes(errorType)
    )
  }, [config.retryableErrors])

  const calculateDelay = useCallback((attempt: number) => {
    const delay = Math.min(
      config.baseDelay * Math.pow(config.backoffMultiplier, attempt - 1),
      config.maxDelay
    )
    // Add some jitter (±20%)
    const jitter = delay * 0.2 * (Math.random() - 0.5)
    return Math.round(delay + jitter)
  }, [config])

  const execute = useCallback(async (): Promise<T> => {
    setState(prev => ({ ...prev, isRetrying: true, error: null }))
    
    try {
      const result = await operation()
      setState({
        attempt: 0,
        isRetrying: false,
        error: null,
        nextRetryIn: 0,
        hasReachedMaxAttempts: false
      })
      options.onSuccess?.()
      return result
    } catch (error) {
      const currentAttempt = state.attempt + 1
      const isRetryable = isRetryableError(error as Error)
      const hasAttemptsLeft = currentAttempt < config.maxAttempts
      
      if (isRetryable && hasAttemptsLeft) {
        const delay = calculateDelay(currentAttempt)
        
        setState(prev => ({
          ...prev,
          attempt: currentAttempt,
          error: error as Error,
          nextRetryIn: delay,
          isRetrying: false
        }))

        options.onRetry?.(currentAttempt, error as Error)

        // Auto-retry after delay
        setTimeout(() => {
          execute()
        }, delay)
        
        throw error
      } else {
        setState(prev => ({
          ...prev,
          attempt: currentAttempt,
          error: error as Error,
          isRetrying: false,
          hasReachedMaxAttempts: true,
          nextRetryIn: 0
        }))

        if (hasAttemptsLeft) {
          // Not retryable error
          console.warn('Non-retryable error:', error)
        } else {
          options.onMaxAttemptsReached?.(error as Error)
        }
        
        throw error
      }
    }
  }, [operation, state.attempt, config, options, isRetryableError, calculateDelay])

  const retry = useCallback(() => {
    setState(prev => ({ ...prev, attempt: 0, hasReachedMaxAttempts: false }))
    return execute()
  }, [execute])

  const reset = useCallback(() => {
    setState({
      attempt: 0,
      isRetrying: false,
      error: null,
      nextRetryIn: 0,
      hasReachedMaxAttempts: false
    })
  }, [])

  return {
    execute,
    retry,
    reset,
    ...state,
    remainingAttempts: Math.max(0, config.maxAttempts - state.attempt)
  }
}

interface RetryButtonProps {
  onRetry: () => void | Promise<void>
  disabled?: boolean
  isRetrying?: boolean
  attempt?: number
  maxAttempts?: number
  nextRetryIn?: number
  error?: Error | null
  size?: 'sm' | 'md' | 'lg'
  variant?: 'default' | 'outline' | 'destructive'
  className?: string
  showAttempts?: boolean
  autoRetry?: boolean
}

export function RetryButton({
  onRetry,
  disabled = false,
  isRetrying = false,
  attempt = 0,
  maxAttempts = 3,
  nextRetryIn = 0,
  error,
  size = 'md',
  variant = 'outline',
  className,
  showAttempts = true,
  autoRetry = false
}: RetryButtonProps) {
  const [countdown, setCountdown] = useState(0)

  useEffect(() => {
    if (nextRetryIn > 0 && autoRetry) {
      setCountdown(Math.ceil(nextRetryIn / 1000))
      const interval = setInterval(() => {
        setCountdown(prev => {
          if (prev <= 1) {
            clearInterval(interval)
            return 0
          }
          return prev - 1
        })
      }, 1000)
      return () => clearInterval(interval)
    }
  }, [nextRetryIn, autoRetry])

  const isMaxAttemptsReached = attempt >= maxAttempts
  const remainingAttempts = Math.max(0, maxAttempts - attempt)

  const getButtonText = () => {
    if (isRetrying) return 'Retrying...'
    if (countdown > 0) return `Auto retry in ${countdown}s`
    if (isMaxAttemptsReached) return 'Max attempts reached'
    if (showAttempts && attempt > 0) return `Retry (${remainingAttempts} left)`
    return 'Retry'
  }

  const isButtonDisabled = disabled || isRetrying || isMaxAttemptsReached || countdown > 0

  return (
    <div className={cn('space-y-2', className)}>
      <Button
        variant={variant}
        size={size}
        onClick={onRetry}
        disabled={isButtonDisabled}
        className="flex items-center space-x-2"
      >
        {isRetrying ? (
          <LoadingSpinner size="sm" />
        ) : (
          <RefreshCw className={cn(
            size === 'sm' ? 'h-3 w-3' : size === 'lg' ? 'h-5 w-5' : 'h-4 w-4'
          )} />
        )}
        <span>{getButtonText()}</span>
      </Button>
      
      {error && (
        <p className="text-xs text-red-600 max-w-xs">
          {error.message}
        </p>
      )}
    </div>
  )
}

interface RetryableOperationProps {
  children: (state: {
    execute: () => Promise<void>
    isLoading: boolean
    error: Error | null
    retry: () => Promise<void>
    reset: () => void
    attempt: number
    remainingAttempts: number
    hasReachedMaxAttempts: boolean
  }) => React.ReactNode
  operation: () => Promise<void>
  retryConfig?: Partial<RetryConfig>
  showNotifications?: boolean
  className?: string
}

export function RetryableOperation({
  children,
  operation,
  retryConfig,
  showNotifications = true,
  className
}: RetryableOperationProps) {
  const notifications = useNotifications()
  
  const retryState = useRetry(operation, {
    ...retryConfig,
    onRetry: (attempt, error) => {
      if (showNotifications) {
        notifications.showWarning(
          `Retry Attempt ${attempt}`,
          `Operation failed: ${error.message}. Retrying...`,
          { duration: 3000 }
        )
      }
    },
    onMaxAttemptsReached: (error) => {
      if (showNotifications) {
        notifications.showError(
          'Operation Failed',
          `Max retry attempts reached: ${error.message}`,
          { persistent: true }
        )
      }
    },
    onSuccess: () => {
      if (showNotifications && retryState.attempt > 0) {
        notifications.showSuccess(
          'Operation Succeeded',
          'Operation completed successfully after retry'
        )
      }
    }
  })

  return (
    <div className={className}>
      {children({
        execute: retryState.execute,
        isLoading: retryState.isRetrying,
        error: retryState.error,
        retry: retryState.retry,
        reset: retryState.reset,
        attempt: retryState.attempt,
        remainingAttempts: retryState.remainingAttempts,
        hasReachedMaxAttempts: retryState.hasReachedMaxAttempts
      })}
    </div>
  )
}

interface ErrorRecoveryCardProps {
  error: Error
  onRetry?: () => void | Promise<void>
  onReset?: () => void
  onContact?: () => void
  retryConfig?: {
    attempt: number
    maxAttempts: number
    isRetrying: boolean
    nextRetryIn: number
  }
  className?: string
  showDetails?: boolean
  suggestions?: string[]
}

export function ErrorRecoveryCard({
  error,
  onRetry,
  onReset,
  onContact,
  retryConfig,
  className,
  showDetails = false,
  suggestions = []
}: ErrorRecoveryCardProps) {
  const [showErrorDetails, setShowErrorDetails] = useState(showDetails)
  
  const getErrorTypeIcon = (error: Error) => {
    if (error.name.includes('Network') || error.message.includes('network')) {
      return <WifiOff className="h-5 w-5 text-red-500" />
    }
    if (error.name.includes('Timeout') || error.message.includes('timeout')) {
      return <Clock className="h-5 w-5 text-yellow-500" />
    }
    if (error.name.includes('Server') || error.message.includes('server')) {
      return <Server className="h-5 w-5 text-red-500" />
    }
    if (error.name.includes('Database') || error.message.includes('database')) {
      return <Database className="h-5 w-5 text-red-500" />
    }
    return <AlertTriangle className="h-5 w-5 text-red-500" />
  }

  const getErrorTypeDescription = (error: Error) => {
    if (error.name.includes('Network') || error.message.includes('network')) {
      return 'Network connectivity issue detected'
    }
    if (error.name.includes('Timeout') || error.message.includes('timeout')) {
      return 'Operation timed out'
    }
    if (error.name.includes('Server') || error.message.includes('server')) {
      return 'Server error occurred'
    }
    if (error.name.includes('Database') || error.message.includes('database')) {
      return 'Database connection problem'
    }
    return 'An unexpected error occurred'
  }

  const defaultSuggestions = [
    'Check your internet connection',
    'Verify server status',
    'Try refreshing the page',
    'Clear browser cache and cookies'
  ]

  const allSuggestions = suggestions.length > 0 ? suggestions : defaultSuggestions

  return (
    <Card className={cn('w-full max-w-2xl', className)}>
      <CardHeader>
        <CardTitle className="flex items-center space-x-2 text-red-600">
          {getErrorTypeIcon(error)}
          <span>Operation Failed</span>
        </CardTitle>
      </CardHeader>
      
      <CardContent className="space-y-4">
        <div>
          <p className="text-muted-foreground mb-2">
            {getErrorTypeDescription(error)}
          </p>
          <p className="text-sm font-medium text-red-600">
            {error.message}
          </p>
        </div>

        {/* Retry Information */}
        {retryConfig && (
          <div className="bg-muted/30 rounded-lg p-3">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium">Retry Status</span>
              <span className="text-xs text-muted-foreground">
                Attempt {retryConfig.attempt} of {retryConfig.maxAttempts}
              </span>
            </div>
            
            {retryConfig.nextRetryIn > 0 && (
              <div className="flex items-center space-x-2 text-sm text-blue-600">
                <Clock className="h-4 w-4" />
                <span>Next retry in {Math.ceil(retryConfig.nextRetryIn / 1000)}s</span>
              </div>
            )}
          </div>
        )}

        {/* Suggestions */}
        {allSuggestions.length > 0 && (
          <div>
            <h4 className="text-sm font-medium mb-2">Suggestions:</h4>
            <ul className="text-sm text-muted-foreground space-y-1">
              {allSuggestions.map((suggestion, index) => (
                <li key={index} className="flex items-start space-x-2">
                  <span className="text-blue-500 mt-1">•</span>
                  <span>{suggestion}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Error Details Toggle */}
        <div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowErrorDetails(!showErrorDetails)}
            className="text-muted-foreground"
          >
            <Eye className="h-4 w-4 mr-2" />
            {showErrorDetails ? 'Hide' : 'Show'} Technical Details
          </Button>
          
          {showErrorDetails && (
            <div className="mt-3 p-3 bg-muted/50 rounded border text-sm">
              <div className="space-y-2">
                <div>
                  <strong>Error Type:</strong> {error.name}
                </div>
                <div>
                  <strong>Message:</strong> {error.message}
                </div>
                {error.stack && (
                  <div>
                    <strong>Stack Trace:</strong>
                    <pre className="mt-1 text-xs font-mono whitespace-pre-wrap">
                      {error.stack}
                    </pre>
                  </div>
                )}
                <div>
                  <strong>Timestamp:</strong> {new Date().toISOString()}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Action Buttons */}
        <div className="flex flex-wrap gap-2 pt-2 border-t">
          {onRetry && (
            <RetryButton
              onRetry={onRetry}
              isRetrying={retryConfig?.isRetrying}
              attempt={retryConfig?.attempt}
              maxAttempts={retryConfig?.maxAttempts}
              nextRetryIn={retryConfig?.nextRetryIn}
              error={error}
              autoRetry={true}
            />
          )}
          
          {onReset && (
            <Button variant="outline" size="sm" onClick={onReset}>
              <RefreshCw className="h-4 w-4 mr-2" />
              Reset
            </Button>
          )}
          
          {onContact && (
            <Button variant="outline" size="sm" onClick={onContact}>
              <Activity className="h-4 w-4 mr-2" />
              Contact Support
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  )
}

// Specialized retry components for common operations
export function NetworkRetryCard({ 
  error, 
  onRetry, 
  className 
}: { 
  error: Error
  onRetry: () => void
  className?: string 
}) {
  return (
    <ErrorRecoveryCard
      error={error}
      onRetry={onRetry}
      className={className}
      suggestions={[
        'Check your internet connection',
        'Verify network settings',
        'Try switching to a different network',
        'Disable VPN if enabled'
      ]}
    />
  )
}

export function ServerRetryCard({ 
  error, 
  onRetry, 
  className 
}: { 
  error: Error
  onRetry: () => void
  className?: string 
}) {
  return (
    <ErrorRecoveryCard
      error={error}
      onRetry={onRetry}
      className={className}
      suggestions={[
        'Server may be temporarily unavailable',
        'Check server status page',
        'Try again in a few minutes',
        'Contact administrator if problem persists'
      ]}
    />
  )
}

export function ScanRetryCard({ 
  error, 
  onRetry, 
  className 
}: { 
  error: Error
  onRetry: () => void
  className?: string 
}) {
  return (
    <ErrorRecoveryCard
      error={error}
      onRetry={onRetry}
      className={className}
      suggestions={[
        'Verify network permissions',
        'Check target network accessibility',
        'Adjust scan parameters',
        'Ensure sufficient system resources'
      ]}
    />
  )
}