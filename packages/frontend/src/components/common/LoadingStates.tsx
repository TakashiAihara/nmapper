import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui'
import { LoadingSpinner } from './LoadingSpinner'
import { cn } from '@/lib/utils'
import {
  Activity,
  Network,
  Database,
  Search,
  GitCompare,
  BarChart3,
  Settings,
  Zap,
  FileText
} from 'lucide-react'

interface LoadingStateProps {
  type?: 'default' | 'skeleton' | 'card' | 'inline' | 'overlay'
  title?: string
  description?: string
  icon?: 'activity' | 'network' | 'database' | 'search' | 'compare' | 'chart' | 'settings' | 'zap' | 'file'
  size?: 'sm' | 'md' | 'lg'
  className?: string
}

const ICONS = {
  activity: Activity,
  network: Network,
  database: Database,
  search: Search,
  compare: GitCompare,
  chart: BarChart3,
  settings: Settings,
  zap: Zap,
  file: FileText
} as const

// Skeleton Components
export function SkeletonLine({ className }: { className?: string }) {
  return (
    <div className={cn('h-4 bg-muted rounded animate-pulse', className)} />
  )
}

export function SkeletonCard({ className }: { className?: string }) {
  return (
    <Card className={cn('animate-pulse', className)}>
      <CardContent className="p-6">
        <div className="space-y-4">
          <SkeletonLine className="w-3/4" />
          <SkeletonLine className="w-1/2" />
          <SkeletonLine className="w-full" />
          <div className="flex space-x-2">
            <div className="h-6 w-16 bg-muted rounded" />
            <div className="h-6 w-20 bg-muted rounded" />
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

export function SkeletonTable({ 
  rows = 5, 
  columns = 4, 
  className 
}: { 
  rows?: number
  columns?: number
  className?: string 
}) {
  return (
    <div className={cn('space-y-3', className)}>
      {/* Header */}
      <div className="grid gap-4" style={{ gridTemplateColumns: `repeat(${columns}, 1fr)` }}>
        {Array.from({ length: columns }).map((_, i) => (
          <SkeletonLine key={`header-${i}`} className="h-5 w-3/4" />
        ))}
      </div>
      
      {/* Rows */}
      {Array.from({ length: rows }).map((_, rowIndex) => (
        <div key={`row-${rowIndex}`} className="grid gap-4" style={{ gridTemplateColumns: `repeat(${columns}, 1fr)` }}>
          {Array.from({ length: columns }).map((_, colIndex) => (
            <SkeletonLine key={`cell-${rowIndex}-${colIndex}`} className="h-4" />
          ))}
        </div>
      ))}
    </div>
  )
}

export function SkeletonGrid({ 
  items = 8, 
  columns = 4,
  className 
}: { 
  items?: number
  columns?: number
  className?: string 
}) {
  return (
    <div className={cn(
      'grid gap-4',
      columns === 2 && 'grid-cols-1 md:grid-cols-2',
      columns === 3 && 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3',
      columns === 4 && 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4',
      className
    )}>
      {Array.from({ length: items }).map((_, i) => (
        <SkeletonCard key={i} />
      ))}
    </div>
  )
}

// Main Loading State Component
export function LoadingState({
  type = 'default',
  title,
  description,
  icon,
  size = 'md',
  className
}: LoadingStateProps) {
  const IconComponent = icon ? ICONS[icon] : Activity

  const sizeClasses = {
    sm: { container: 'py-8', icon: 'h-6 w-6', title: 'text-lg', desc: 'text-sm' },
    md: { container: 'py-12', icon: 'h-8 w-8', title: 'text-xl', desc: 'text-sm' },
    lg: { container: 'py-16', icon: 'h-12 w-12', title: 'text-2xl', desc: 'text-base' }
  }

  const sizes = sizeClasses[size]

  if (type === 'skeleton') {
    return <SkeletonCard className={className} />
  }

  if (type === 'inline') {
    return (
      <div className={cn('flex items-center space-x-2', className)}>
        <LoadingSpinner size="sm" />
        <span className="text-sm text-muted-foreground">
          {title || 'Loading...'}
        </span>
      </div>
    )
  }

  if (type === 'overlay') {
    return (
      <div className={cn(
        'absolute inset-0 bg-background/80 backdrop-blur-sm flex items-center justify-center z-50',
        className
      )}>
        <div className="text-center">
          <LoadingSpinner size="lg" className="mb-4 text-primary" />
          {title && (
            <h3 className={cn('font-semibold mb-2', sizes.title)}>
              {title}
            </h3>
          )}
          {description && (
            <p className={cn('text-muted-foreground', sizes.desc)}>
              {description}
            </p>
          )}
        </div>
      </div>
    )
  }

  const content = (
    <div className="text-center">
      <div className="flex items-center justify-center mb-4">
        <div className="relative">
          <IconComponent className={cn(sizes.icon, 'text-muted-foreground')} />
          <div className="absolute -bottom-1 -right-1">
            <LoadingSpinner size="sm" className="text-primary" />
          </div>
        </div>
      </div>
      
      {title && (
        <h3 className={cn('font-semibold mb-2', sizes.title)}>
          {title}
        </h3>
      )}
      
      {description && (
        <p className={cn('text-muted-foreground', sizes.desc)}>
          {description}
        </p>
      )}
    </div>
  )

  if (type === 'card') {
    return (
      <Card className={className}>
        <CardContent className={cn('flex items-center justify-center', sizes.container)}>
          {content}
        </CardContent>
      </Card>
    )
  }

  // Default type
  return (
    <div className={cn('flex items-center justify-center', sizes.container, className)}>
      {content}
    </div>
  )
}

// Specialized Loading Components
export function NetworkLoadingState({ className }: { className?: string }) {
  return (
    <LoadingState
      type="card"
      icon="network"
      title="Loading Network Data"
      description="Discovering devices and analyzing network topology..."
      className={className}
    />
  )
}

export function ScanLoadingState({ className }: { className?: string }) {
  return (
    <LoadingState
      type="card"
      icon="search"
      title="Scanning Network"
      description="Performing network scan and service discovery..."
      className={className}
    />
  )
}

export function ComparisonLoadingState({ className }: { className?: string }) {
  return (
    <LoadingState
      type="card"
      icon="compare"
      title="Comparing Snapshots"
      description="Analyzing differences between network snapshots..."
      className={className}
    />
  )
}

export function DatabaseLoadingState({ className }: { className?: string }) {
  return (
    <LoadingState
      type="card"
      icon="database"
      title="Loading Data"
      description="Retrieving information from the database..."
      className={className}
    />
  )
}

export function ChartLoadingState({ className }: { className?: string }) {
  return (
    <LoadingState
      type="card"
      icon="chart"
      title="Preparing Charts"
      description="Processing data for visualization..."
      className={className}
    />
  )
}

// Data Loading Placeholders
export function DeviceListLoading({ count = 8 }: { count?: number }) {
  return <SkeletonGrid items={count} columns={4} />
}

export function TableLoading({ 
  rows = 5, 
  columns = 4 
}: { 
  rows?: number
  columns?: number 
}) {
  return <SkeletonTable rows={rows} columns={columns} />
}

export function CardListLoading({ count = 6 }: { count?: number }) {
  return (
    <div className="space-y-4">
      {Array.from({ length: count }).map((_, i) => (
        <SkeletonCard key={i} />
      ))}
    </div>
  )
}

// Progress Loading States
export function ProgressLoadingState({
  title = "Processing...",
  progress,
  description,
  className
}: {
  title?: string
  progress?: number
  description?: string
  className?: string
}) {
  return (
    <Card className={className}>
      <CardContent className="py-8">
        <div className="text-center space-y-4">
          <LoadingSpinner size="lg" className="text-primary" />
          
          <div>
            <h3 className="text-lg font-semibold mb-1">{title}</h3>
            {description && (
              <p className="text-sm text-muted-foreground">{description}</p>
            )}
          </div>

          {progress !== undefined && (
            <div className="w-full max-w-xs mx-auto">
              <div className="flex justify-between text-sm mb-1">
                <span>Progress</span>
                <span>{Math.round(progress)}%</span>
              </div>
              <div className="w-full bg-muted rounded-full h-2">
                <div
                  className="bg-primary h-2 rounded-full transition-all duration-300"
                  style={{ width: `${progress}%` }}
                />
              </div>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )
}