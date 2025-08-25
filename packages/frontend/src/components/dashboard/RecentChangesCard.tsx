import { useState, useMemo } from 'react'
import { Card, CardContent, CardHeader, CardTitle, Button, Badge } from '@/components/ui'
import { useRecentChanges } from '@/hooks'
import { LoadingSpinner, ErrorState } from '@/components/common'
import { cn } from '@/lib/utils'
import {
  Clock,
  Plus,
  Minus,
  Edit,
  Activity,
  Network,
  AlertTriangle,
  RefreshCw,
  Eye,
  Filter,
  TrendingUp,
  Calendar,
  ArrowRight,
  Info
} from 'lucide-react'

interface RecentChangesCardProps {
  className?: string
  limit?: number
  timeRange?: number // hours
  showFilters?: boolean
}

interface ChangeTypeConfig {
  icon: React.ComponentType<{ className?: string }>
  color: string
  bgColor: string
  label: string
}

const CHANGE_TYPE_CONFIG: Record<string, ChangeTypeConfig> = {
  device_added: {
    icon: Plus,
    color: 'text-green-600',
    bgColor: 'bg-green-50 border-green-200',
    label: 'Device Added'
  },
  device_removed: {
    icon: Minus,
    color: 'text-red-600',
    bgColor: 'bg-red-50 border-red-200',
    label: 'Device Removed'
  },
  device_updated: {
    icon: Edit,
    color: 'text-blue-600',
    bgColor: 'bg-blue-50 border-blue-200',
    label: 'Device Updated'
  },
  port_changed: {
    icon: Activity,
    color: 'text-purple-600',
    bgColor: 'bg-purple-50 border-purple-200',
    label: 'Port Changed'
  },
  service_changed: {
    icon: Network,
    color: 'text-orange-600',
    bgColor: 'bg-orange-50 border-orange-200',
    label: 'Service Changed'
  }
}

const SEVERITY_CONFIG = {
  low: { color: 'text-gray-600', badge: 'secondary' },
  medium: { color: 'text-yellow-600', badge: 'warning' },
  high: { color: 'text-red-600', badge: 'destructive' }
} as const

export function RecentChangesCard({
  className,
  limit = 20,
  timeRange = 24,
  showFilters = false
}: RecentChangesCardProps) {
  const { 
    data: changes = [], 
    isLoading, 
    error,
    refetch 
  } = useRecentChanges(limit, timeRange, { refetchInterval: 60000 })

  const [selectedSeverities, setSelectedSeverities] = useState<Set<string>>(
    new Set(['low', 'medium', 'high'])
  )
  const [selectedTypes, setSelectedTypes] = useState<Set<string>>(
    new Set(Object.keys(CHANGE_TYPE_CONFIG))
  )
  const [showAllChanges, setShowAllChanges] = useState(false)

  // Filter and process changes
  const { filteredChanges, statistics } = useMemo(() => {
    const filtered = changes.filter(change => {
      if (!selectedSeverities.has(change.severity)) return false
      if (!selectedTypes.has(change.changeType)) return false
      return true
    })

    const stats = {
      total: filtered.length,
      last24h: filtered.filter(c => 
        new Date(c.timestamp).getTime() > Date.now() - 24 * 60 * 60 * 1000
      ).length,
      last1h: filtered.filter(c => 
        new Date(c.timestamp).getTime() > Date.now() - 60 * 60 * 1000
      ).length,
      bySeverity: {
        high: filtered.filter(c => c.severity === 'high').length,
        medium: filtered.filter(c => c.severity === 'medium').length,
        low: filtered.filter(c => c.severity === 'low').length
      },
      byType: Object.keys(CHANGE_TYPE_CONFIG).reduce((acc, type) => {
        acc[type] = filtered.filter(c => c.changeType === type).length
        return acc
      }, {} as Record<string, number>)
    }

    return { filteredChanges: filtered, statistics: stats }
  }, [changes, selectedSeverities, selectedTypes])

  // Display changes (limited unless showing all)
  const displayChanges = showAllChanges 
    ? filteredChanges 
    : filteredChanges.slice(0, 5)

  const handleRefresh = () => {
    refetch()
  }

  const toggleSeverityFilter = (severity: string) => {
    setSelectedSeverities(prev => {
      const newSet = new Set(prev)
      if (newSet.has(severity)) {
        newSet.delete(severity)
      } else {
        newSet.add(severity)
      }
      return newSet
    })
  }

  const toggleTypeFilter = (type: string) => {
    setSelectedTypes(prev => {
      const newSet = new Set(prev)
      if (newSet.has(type)) {
        newSet.delete(type)
      } else {
        newSet.add(type)
      }
      return newSet
    })
  }

  const formatTimeAgo = (timestamp: Date) => {
    const now = new Date()
    const diff = now.getTime() - new Date(timestamp).getTime()
    const minutes = Math.floor(diff / 60000)
    const hours = Math.floor(minutes / 60)
    const days = Math.floor(hours / 24)

    if (days > 0) return `${days}d ago`
    if (hours > 0) return `${hours}h ago`
    if (minutes > 0) return `${minutes}m ago`
    return 'Just now'
  }

  if (error) {
    return (
      <Card className={className}>
        <ErrorState
          type="database"
          title="Recent Changes Unavailable"
          description="Unable to load recent network changes"
          onAction={handleRefresh}
          size="sm"
        />
      </Card>
    )
  }

  return (
    <Card className={className}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center space-x-2">
            <Clock className="h-5 w-5" />
            <span>Recent Changes</span>
            <Badge variant="outline">{statistics.total} in {timeRange}h</Badge>
            {isLoading && <LoadingSpinner size="sm" />}
          </CardTitle>
          
          <div className="flex items-center space-x-2">
            {/* Activity Indicator */}
            {statistics.last1h > 0 && (
              <Badge variant="default" className="animate-pulse">
                <Activity className="h-3 w-3 mr-1" />
                {statistics.last1h} recent
              </Badge>
            )}

            {/* Refresh Button */}
            <Button
              variant="ghost"
              size="sm"
              onClick={handleRefresh}
              disabled={isLoading}
            >
              <RefreshCw className={cn('h-4 w-4', isLoading && 'animate-spin')} />
            </Button>

            {/* Filter Toggle */}
            {showFilters && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {/* Toggle filter panel */}}
              >
                <Filter className="h-4 w-4" />
              </Button>
            )}
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Quick Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <div className="text-center p-2 bg-muted/30 rounded">
            <p className="text-lg font-bold">{statistics.total}</p>
            <p className="text-xs text-muted-foreground">Total Changes</p>
          </div>
          <div className="text-center p-2 bg-red-50 dark:bg-red-900/20 rounded">
            <p className="text-lg font-bold text-red-600">{statistics.bySeverity.high}</p>
            <p className="text-xs text-muted-foreground">Critical</p>
          </div>
          <div className="text-center p-2 bg-yellow-50 dark:bg-yellow-900/20 rounded">
            <p className="text-lg font-bold text-yellow-600">{statistics.bySeverity.medium}</p>
            <p className="text-xs text-muted-foreground">Medium</p>
          </div>
          <div className="text-center p-2 bg-green-50 dark:bg-green-900/20 rounded">
            <p className="text-lg font-bold text-green-600">{statistics.last1h}</p>
            <p className="text-xs text-muted-foreground">Last Hour</p>
          </div>
        </div>

        {/* Filters (if enabled) */}
        {showFilters && (
          <div className="space-y-3 p-3 bg-muted/30 rounded-lg">
            {/* Severity Filters */}
            <div>
              <h4 className="text-xs font-medium mb-2">Severity</h4>
              <div className="flex flex-wrap gap-1">
                {Object.entries(SEVERITY_CONFIG).map(([severity, config]) => (
                  <button
                    key={severity}
                    onClick={() => toggleSeverityFilter(severity)}
                    className={cn(
                      'px-2 py-1 text-xs rounded border transition-colors',
                      selectedSeverities.has(severity)
                        ? 'bg-primary text-primary-foreground border-primary'
                        : 'bg-background border-border hover:bg-muted'
                    )}
                  >
                    {severity} ({statistics.bySeverity[severity as keyof typeof statistics.bySeverity]})
                  </button>
                ))}
              </div>
            </div>

            {/* Change Type Filters */}
            <div>
              <h4 className="text-xs font-medium mb-2">Change Types</h4>
              <div className="flex flex-wrap gap-1">
                {Object.entries(CHANGE_TYPE_CONFIG).map(([type, config]) => (
                  <button
                    key={type}
                    onClick={() => toggleTypeFilter(type)}
                    className={cn(
                      'px-2 py-1 text-xs rounded border transition-colors',
                      selectedTypes.has(type)
                        ? 'bg-primary text-primary-foreground border-primary'
                        : 'bg-background border-border hover:bg-muted'
                    )}
                  >
                    {config.label} ({statistics.byType[type]})
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Changes List */}
        {isLoading ? (
          <div className="space-y-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="flex items-start space-x-3 p-3 border rounded animate-pulse">
                <div className="w-4 h-4 bg-muted rounded mt-0.5" />
                <div className="flex-1 space-y-2">
                  <div className="h-4 bg-muted rounded w-3/4" />
                  <div className="h-3 bg-muted rounded w-1/2" />
                </div>
                <div className="h-6 w-12 bg-muted rounded" />
              </div>
            ))}
          </div>
        ) : filteredChanges.length === 0 ? (
          <div className="text-center py-8">
            <Info className="mx-auto h-8 w-8 text-muted-foreground mb-2" />
            <h3 className="text-sm font-medium mb-1">No Recent Changes</h3>
            <p className="text-xs text-muted-foreground">
              No network changes detected in the last {timeRange} hours
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {displayChanges.map((change, index) => {
              const config = CHANGE_TYPE_CONFIG[change.changeType] || CHANGE_TYPE_CONFIG.device_updated
              const Icon = config.icon
              const severityConfig = SEVERITY_CONFIG[change.severity as keyof typeof SEVERITY_CONFIG]

              return (
                <div
                  key={`${change.deviceId}-${change.timestamp}-${index}`}
                  className={cn(
                    'flex items-start space-x-3 p-3 border rounded-lg transition-colors hover:bg-muted/30',
                    config.bgColor
                  )}
                >
                  <div className="flex-shrink-0 mt-0.5">
                    <Icon className={cn('h-4 w-4', config.color)} />
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between mb-1">
                      <div className="flex items-center space-x-2">
                        <p className="text-sm font-medium">{change.description}</p>
                        <Badge
                          variant={severityConfig.badge as any}
                          className="text-xs"
                        >
                          {change.severity}
                        </Badge>
                      </div>
                      <span className="text-xs text-muted-foreground whitespace-nowrap">
                        {formatTimeAgo(change.timestamp)}
                      </span>
                    </div>

                    <div className="flex items-center space-x-4 text-xs text-muted-foreground">
                      <span className="flex items-center space-x-1">
                        <Network className="h-3 w-3" />
                        <span>Device: <code className="font-mono">{change.deviceId}</code></span>
                      </span>
                      <span className="flex items-center space-x-1">
                        <Clock className="h-3 w-3" />
                        <span>{new Date(change.timestamp).toLocaleTimeString()}</span>
                      </span>
                    </div>
                  </div>
                </div>
              )
            })}

            {/* Show More/Less Button */}
            {filteredChanges.length > 5 && (
              <div className="text-center pt-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowAllChanges(!showAllChanges)}
                  className="text-xs"
                >
                  {showAllChanges ? (
                    <>Show Less</>
                  ) : (
                    <>Show All {filteredChanges.length} Changes <ArrowRight className="h-3 w-3 ml-1" /></>
                  )}
                </Button>
              </div>
            )}
          </div>
        )}

        {/* Change Trend */}
        {statistics.total > 0 && (
          <div className="flex items-center justify-between pt-3 border-t">
            <div className="flex items-center space-x-2 text-sm">
              <TrendingUp className={cn(
                'h-4 w-4',
                statistics.last1h > statistics.total / 24 ? 'text-red-500' : 'text-green-500'
              )} />
              <span className="text-muted-foreground">
                {statistics.last1h > statistics.total / 24 ? 'Increasing' : 'Normal'} activity
              </span>
            </div>

            <Button variant="outline" size="sm" className="text-xs">
              <Eye className="h-3 w-3 mr-1" />
              View Timeline
            </Button>
          </div>
        )}

        {/* Quick Actions */}
        <div className="flex flex-wrap gap-2 pt-2">
          <Button variant="outline" size="sm" className="text-xs">
            <Calendar className="h-3 w-3 mr-1" />
            View History
          </Button>
          <Button variant="outline" size="sm" className="text-xs">
            <AlertTriangle className="h-3 w-3 mr-1" />
            Critical Only
          </Button>
          <Button variant="outline" size="sm" className="text-xs">
            <Network className="h-3 w-3 mr-1" />
            By Device
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}