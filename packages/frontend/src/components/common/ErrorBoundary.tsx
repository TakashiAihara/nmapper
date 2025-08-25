import React, { Component, ErrorInfo, ReactNode } from 'react'
import { Card, CardContent, CardHeader, CardTitle, Button } from '@/components/ui'
import { AlertTriangle, RefreshCw, Home, Bug, Copy, CheckCircle } from 'lucide-react'
import { cn } from '@/lib/utils'

interface Props {
  children: ReactNode
  fallback?: ReactNode
  onError?: (error: Error, errorInfo: ErrorInfo) => void
  showDetails?: boolean
  className?: string
}

interface State {
  hasError: boolean
  error: Error | null
  errorInfo: ErrorInfo | null
  showErrorDetails: boolean
  errorCopied: boolean
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props)
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
      showErrorDetails: false,
      errorCopied: false
    }
  }

  static getDerivedStateFromError(error: Error): Partial<State> {
    return {
      hasError: true,
      error
    }
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    this.setState({
      error,
      errorInfo
    })

    // Log error to external service
    console.error('ErrorBoundary caught an error:', error, errorInfo)
    
    // Call optional error handler
    if (this.props.onError) {
      this.props.onError(error, errorInfo)
    }
  }

  handleRetry = () => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
      showErrorDetails: false,
      errorCopied: false
    })
  }

  handleGoHome = () => {
    window.location.href = '/'
  }

  toggleErrorDetails = () => {
    this.setState(prev => ({
      showErrorDetails: !prev.showErrorDetails
    }))
  }

  copyErrorDetails = async () => {
    const { error, errorInfo } = this.state
    if (!error) return

    const errorText = `
Error: ${error.name}: ${error.message}

Stack Trace:
${error.stack}

Component Stack:
${errorInfo?.componentStack}

Timestamp: ${new Date().toISOString()}
User Agent: ${navigator.userAgent}
URL: ${window.location.href}
    `.trim()

    try {
      await navigator.clipboard.writeText(errorText)
      this.setState({ errorCopied: true })
      setTimeout(() => {
        this.setState({ errorCopied: false })
      }, 2000)
    } catch (clipboardError) {
      console.error('Failed to copy error details:', clipboardError)
    }
  }

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback
      }

      const { error, errorInfo, showErrorDetails, errorCopied } = this.state

      return (
        <div className={cn('flex items-center justify-center min-h-[400px] p-4', this.props.className)}>
          <Card className="max-w-2xl w-full">
            <CardHeader>
              <CardTitle className="flex items-center space-x-2 text-destructive">
                <AlertTriangle className="h-6 w-6" />
                <span>Something went wrong</span>
              </CardTitle>
            </CardHeader>

            <CardContent className="space-y-4">
              <div>
                <p className="text-muted-foreground mb-4">
                  An unexpected error occurred while rendering this component. 
                  You can try refreshing the page or return to the home page.
                </p>

                <div className="flex flex-wrap gap-2">
                  <Button onClick={this.handleRetry} variant="default" size="sm">
                    <RefreshCw className="h-4 w-4 mr-2" />
                    Try Again
                  </Button>

                  <Button onClick={this.handleGoHome} variant="outline" size="sm">
                    <Home className="h-4 w-4 mr-2" />
                    Go Home
                  </Button>

                  {this.props.showDetails !== false && (
                    <Button 
                      onClick={this.toggleErrorDetails} 
                      variant="ghost" 
                      size="sm"
                    >
                      <Bug className="h-4 w-4 mr-2" />
                      {showErrorDetails ? 'Hide' : 'Show'} Details
                    </Button>
                  )}
                </div>
              </div>

              {/* Error Details */}
              {showErrorDetails && error && (
                <div className="space-y-4 border-t pt-4">
                  <div className="flex items-center justify-between">
                    <h4 className="text-sm font-semibold">Error Details</h4>
                    <Button
                      onClick={this.copyErrorDetails}
                      variant="outline"
                      size="sm"
                      className="h-8"
                    >
                      {errorCopied ? (
                        <>
                          <CheckCircle className="h-3 w-3 mr-1 text-green-500" />
                          Copied
                        </>
                      ) : (
                        <>
                          <Copy className="h-3 w-3 mr-1" />
                          Copy
                        </>
                      )}
                    </Button>
                  </div>

                  <div className="space-y-3">
                    <div>
                      <h5 className="text-sm font-medium text-red-600 mb-1">Error Message</h5>
                      <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded p-3">
                        <code className="text-sm text-red-700 dark:text-red-300">
                          {error.name}: {error.message}
                        </code>
                      </div>
                    </div>

                    {error.stack && (
                      <div>
                        <h5 className="text-sm font-medium text-muted-foreground mb-1">Stack Trace</h5>
                        <div className="bg-muted rounded p-3 max-h-48 overflow-y-auto">
                          <pre className="text-xs font-mono whitespace-pre-wrap text-muted-foreground">
                            {error.stack}
                          </pre>
                        </div>
                      </div>
                    )}

                    {errorInfo?.componentStack && (
                      <div>
                        <h5 className="text-sm font-medium text-muted-foreground mb-1">Component Stack</h5>
                        <div className="bg-muted rounded p-3 max-h-48 overflow-y-auto">
                          <pre className="text-xs font-mono whitespace-pre-wrap text-muted-foreground">
                            {errorInfo.componentStack}
                          </pre>
                        </div>
                      </div>
                    )}

                    <div className="text-xs text-muted-foreground space-y-1">
                      <p><strong>Timestamp:</strong> {new Date().toISOString()}</p>
                      <p><strong>URL:</strong> {window.location.href}</p>
                      <p><strong>User Agent:</strong> {navigator.userAgent}</p>
                    </div>
                  </div>
                </div>
              )}

              {/* Help Text */}
              <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded p-3">
                <p className="text-sm text-blue-700 dark:text-blue-300">
                  <strong>Need help?</strong> If this error persists, please copy the error details above and 
                  report it to the development team. Include information about what you were doing when the error occurred.
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      )
    }

    return this.props.children
  }
}

// Higher-order component wrapper
export function withErrorBoundary<P extends object>(
  WrappedComponent: React.ComponentType<P>,
  errorBoundaryProps?: Omit<Props, 'children'>
) {
  const WithErrorBoundaryComponent = (props: P) => (
    <ErrorBoundary {...errorBoundaryProps}>
      <WrappedComponent {...props} />
    </ErrorBoundary>
  )

  WithErrorBoundaryComponent.displayName = 
    `withErrorBoundary(${WrappedComponent.displayName || WrappedComponent.name})`

  return WithErrorBoundaryComponent
}

// Hook for handling async errors in function components
export function useErrorHandler() {
  const handleError = React.useCallback((error: Error) => {
    // Throw the error so it gets caught by ErrorBoundary
    setTimeout(() => {
      throw error
    }, 0)
  }, [])

  return handleError
}