import { Card, CardContent, CardHeader, CardTitle, Button } from '@/components/ui'
import { cn } from '@/lib/utils'
import {
  AlertTriangle,
  RefreshCw,
  Home,
  Wifi,
  WifiOff,
  Server,
  Database,
  Search,
  GitCompare,
  Shield,
  FileX,
  Clock,
  Ban,
  Info,
  HelpCircle
} from 'lucide-react'

interface ErrorStateProps {
  type?: 'default' | 'network' | 'database' | 'notFound' | 'forbidden' | 'timeout' | 'offline'
  title?: string
  description?: string
  actionText?: string
  onAction?: () => void
  showHome?: boolean
  className?: string
  size?: 'sm' | 'md' | 'lg'
}

const ERROR_CONFIGS = {
  default: {
    icon: AlertTriangle,
    color: 'text-red-500',
    title: 'Something went wrong',
    description: 'An unexpected error occurred. Please try again.'
  },
  network: {
    icon: WifiOff,
    color: 'text-red-500',
    title: 'Connection Failed',
    description: 'Unable to connect to the server. Please check your network connection.'
  },
  database: {
    icon: Database,
    color: 'text-red-500',
    title: 'Database Error',
    description: 'Unable to retrieve data from the database.'
  },
  notFound: {
    icon: Search,
    color: 'text-gray-500',
    title: 'Not Found',
    description: 'The requested resource could not be found.'
  },
  forbidden: {
    icon: Ban,
    color: 'text-red-500',
    title: 'Access Denied',
    description: 'You do not have permission to access this resource.'
  },
  timeout: {
    icon: Clock,
    color: 'text-orange-500',
    title: 'Request Timeout',
    description: 'The request took too long to complete. Please try again.'
  },
  offline: {
    icon: WifiOff,
    color: 'text-gray-500',
    title: 'You are offline',
    description: 'Please check your internet connection and try again.'
  }
} as const

export function ErrorState({
  type = 'default',
  title,
  description,
  actionText = 'Try Again',
  onAction,
  showHome = true,
  size = 'md',
  className
}: ErrorStateProps) {
  const config = ERROR_CONFIGS[type]
  const Icon = config.icon

  const sizeClasses = {
    sm: { container: 'py-8', icon: 'h-8 w-8', title: 'text-lg', desc: 'text-sm' },
    md: { container: 'py-12', icon: 'h-12 w-12', title: 'text-xl', desc: 'text-sm' },
    lg: { container: 'py-16', icon: 'h-16 w-16', title: 'text-2xl', desc: 'text-base' }
  }

  const sizes = sizeClasses[size]

  const handleGoHome = () => {
    window.location.href = '/'
  }

  return (
    <Card className={className}>
      <CardContent className={cn('flex items-center justify-center', sizes.container)}>
        <div className="text-center max-w-md">
          <Icon className={cn(sizes.icon, config.color, 'mx-auto mb-4')} />
          
          <h3 className={cn('font-semibold mb-2', sizes.title)}>
            {title || config.title}
          </h3>
          
          <p className={cn('text-muted-foreground mb-6', sizes.desc)}>
            {description || config.description}
          </p>

          <div className="flex flex-col sm:flex-row gap-2 justify-center">
            {onAction && (
              <Button onClick={onAction} size="sm">
                <RefreshCw className="h-4 w-4 mr-2" />
                {actionText}
              </Button>
            )}
            
            {showHome && (
              <Button onClick={handleGoHome} variant="outline" size="sm">
                <Home className="h-4 w-4 mr-2" />
                Go Home
              </Button>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

// Specialized Error Components
export function NetworkError({ 
  onRetry, 
  className 
}: { 
  onRetry?: () => void
  className?: string 
}) {
  return (
    <ErrorState
      type="network"
      onAction={onRetry}
      actionText="Retry Connection"
      className={className}
    />
  )
}

export function DatabaseError({ 
  onRetry, 
  className 
}: { 
  onRetry?: () => void
  className?: string 
}) {
  return (
    <ErrorState
      type="database"
      onAction={onRetry}
      actionText="Retry Query"
      className={className}
    />
  )
}

export function NotFoundError({ 
  title = "Device Not Found",
  description = "The requested device could not be found in the network.",
  className 
}: { 
  title?: string
  description?: string
  className?: string 
}) {
  return (
    <ErrorState
      type="notFound"
      title={title}
      description={description}
      showHome={false}
      className={className}
    />
  )
}

export function ForbiddenError({ className }: { className?: string }) {
  return (
    <ErrorState
      type="forbidden"
      className={className}
    />
  )
}

export function TimeoutError({ 
  onRetry, 
  className 
}: { 
  onRetry?: () => void
  className?: string 
}) {
  return (
    <ErrorState
      type="timeout"
      onAction={onRetry}
      actionText="Try Again"
      className={className}
    />
  )
}

export function OfflineError({ className }: { className?: string }) {
  return (
    <ErrorState
      type="offline"
      showHome={false}
      className={className}
    />
  )
}

// Empty State Components
export function EmptyState({
  icon: IconComponent = Search,
  title = "No data found",
  description = "There's nothing here yet.",
  actionText,
  onAction,
  className
}: {
  icon?: React.ComponentType<{ className?: string }>
  title?: string
  description?: string
  actionText?: string
  onAction?: () => void
  className?: string
}) {
  return (
    <Card className={className}>
      <CardContent className="flex items-center justify-center py-12">
        <div className="text-center max-w-md">
          <IconComponent className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
          
          <h3 className="text-xl font-semibold mb-2">
            {title}
          </h3>
          
          <p className="text-muted-foreground mb-6">
            {description}
          </p>

          {onAction && actionText && (
            <Button onClick={onAction} variant="outline" size="sm">
              {actionText}
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  )
}

// Specialized Empty States
export function NoDevicesFound({ 
  onStartScan,
  className 
}: { 
  onStartScan?: () => void
  className?: string 
}) {
  return (
    <EmptyState
      icon={Search}
      title="No devices found"
      description="No devices have been discovered on the network. Start a scan to find devices."
      actionText={onStartScan ? "Start Network Scan" : undefined}
      onAction={onStartScan}
      className={className}
    />
  )
}

export function NoSnapshotsFound({ 
  onCreateSnapshot,
  className 
}: { 
  onCreateSnapshot?: () => void
  className?: string 
}) {
  return (
    <EmptyState
      icon={FileX}
      title="No snapshots found"
      description="No network snapshots have been created yet. Create your first snapshot to track network changes."
      actionText={onCreateSnapshot ? "Create Snapshot" : undefined}
      onAction={onCreateSnapshot}
      className={className}
    />
  )
}

export function NoChangesFound({ className }: { className?: string }) {
  return (
    <EmptyState
      icon={GitCompare}
      title="No changes detected"
      description="The network snapshots are identical. No changes were found between the selected snapshots."
      className={className}
    />
  )
}

export function ScanNotRunning({ 
  onStartScan,
  className 
}: { 
  onStartScan?: () => void
  className?: string 
}) {
  return (
    <EmptyState
      icon={Activity}
      title="No active scan"
      description="Start a network scan to monitor progress and discover devices on your network."
      actionText={onStartScan ? "Start Scan" : undefined}
      onAction={onStartScan}
      className={className}
    />
  )
}

export function ConfigurationRequired({ 
  onConfigure,
  className 
}: { 
  onConfigure?: () => void
  className?: string 
}) {
  return (
    <EmptyState
      icon={Settings}
      title="Configuration required"
      description="Please configure your network settings before starting a scan."
      actionText={onConfigure ? "Configure Settings" : undefined}
      onAction={onConfigure}
      className={className}
    />
  )
}

// Permission/Auth Error States
export function LoginRequired({ 
  onLogin,
  className 
}: { 
  onLogin?: () => void
  className?: string 
}) {
  return (
    <ErrorState
      type="forbidden"
      title="Login Required"
      description="You must be logged in to access this feature."
      actionText="Sign In"
      onAction={onLogin}
      showHome={false}
      className={className}
    />
  )
}

// Service-specific Error States
export function ServiceUnavailable({ 
  service = "service",
  onRetry,
  className 
}: { 
  service?: string
  onRetry?: () => void
  className?: string 
}) {
  return (
    <ErrorState
      icon={Server}
      color="text-orange-500"
      title={`${service} Unavailable`}
      description={`The ${service} is currently unavailable. Please try again later.`}
      onAction={onRetry}
      actionText="Try Again"
      className={className}
    />
  )
}

export function MaintenanceMode({ className }: { className?: string }) {
  return (
    <ErrorState
      icon={Settings}
      color="text-blue-500"
      title="Maintenance Mode"
      description="The system is currently undergoing maintenance. Please check back later."
      showHome={false}
      className={className}
    />
  )
}

// Generic Error Handler Component
export function ErrorHandler({
  error,
  onRetry,
  className
}: {
  error: Error | string
  onRetry?: () => void
  className?: string
}) {
  const errorMessage = error instanceof Error ? error.message : error
  const errorName = error instanceof Error ? error.name : 'Error'

  // Determine error type based on error properties
  let errorType: ErrorStateProps['type'] = 'default'
  if (errorMessage.toLowerCase().includes('network') || errorMessage.toLowerCase().includes('fetch')) {
    errorType = 'network'
  } else if (errorMessage.toLowerCase().includes('timeout')) {
    errorType = 'timeout'
  } else if (errorMessage.toLowerCase().includes('forbidden') || errorMessage.toLowerCase().includes('unauthorized')) {
    errorType = 'forbidden'
  } else if (errorMessage.toLowerCase().includes('not found')) {
    errorType = 'notFound'
  }

  return (
    <ErrorState
      type={errorType}
      title={errorName}
      description={errorMessage}
      onAction={onRetry}
      className={className}
    />
  )
}