import { useState, useMemo } from 'react'
import { Card, CardContent, CardHeader, CardTitle, Badge } from '@/components/ui'
import { useRecentChanges } from '@/hooks'
import { cn } from '@/lib/utils'
import {
  Clock,
  Plus,
  Minus,
  Edit,
  Activity,
  Network,
  AlertTriangle,
  Info,
  CheckCircle,
  Filter,
  Calendar,
  TrendingUp,
  BarChart3
} from 'lucide-react'

interface ChangeTimelineProps {
  limit?: number
  hours?: number
  showFilters?: boolean
  className?: string
}

interface TimelineFilters {
  changeTypes: Set<string>
  severities: Set<string>
  timeRange: '1h' | '6h' | '24h' | '7d'
}

const CHANGE_TYPE_CONFIG = {
  device_added: {
    icon: Plus,
    color: 'text-green-600 bg-green-50 border-green-200',
    label: 'Device Added'
  },
  device_removed: {
    icon: Minus,
    color: 'text-red-600 bg-red-50 border-red-200',
    label: 'Device Removed'
  },
  device_updated: {
    icon: Edit,
    color: 'text-blue-600 bg-blue-50 border-blue-200',
    label: 'Device Updated'
  },
  port_changed: {
    icon: Activity,
    color: 'text-purple-600 bg-purple-50 border-purple-200',
    label: 'Port Changed'
  },
  service_changed: {
    icon: Network,
    color: 'text-orange-600 bg-orange-50 border-orange-200',
    label: 'Service Changed'
  }
} as const

const SEVERITY_CONFIG = {
  low: { color: 'text-gray-600', badge: 'secondary' },
  medium: { color: 'text-yellow-600', badge: 'warning' },
  high: { color: 'text-red-600', badge: 'destructive' }
} as const

const TIME_RANGE_OPTIONS = {
  '1h': { label: '1 Hour', hours: 1 },
  '6h': { label: '6 Hours', hours: 6 },
  '24h': { label: '24 Hours', hours: 24 },
  '7d': { label: '7 Days', hours: 168 }
} as const

export function ChangeTimeline({
  limit = 50,
  hours = 24,
  showFilters = true,
  className
}: ChangeTimelineProps) {
  const [filters, setFilters] = useState<TimelineFilters>({
    changeTypes: new Set(Object.keys(CHANGE_TYPE_CONFIG)),
    severities: new Set(['low', 'medium', 'high']),
    timeRange: '24h'
  })

  const [expandedEvents, setExpandedEvents] = useState<Set<string>>(new Set())

  // Use the time range from filters
  const actualHours = TIME_RANGE_OPTIONS[filters.timeRange].hours
  const { 
    data: changes = [], 
    isLoading, 
    error 
  } = useRecentChanges(limit, actualHours)

  // Filter and group changes
  const { filteredChanges, groupedByTime, statistics } = useMemo(() => {
    const filtered = changes.filter(change => {
      if (!filters.changeTypes.has(change.changeType)) return false
      if (!filters.severities.has(change.severity)) return false
      return true
    })

    // Group by time periods (hourly for < 24h, daily for longer)
    const groupBy = actualHours <= 24 ? 'hour' : 'day'
    const grouped: Record<string, typeof filtered> = {}

    filtered.forEach(change => {
      const date = new Date(change.timestamp)
      let key: string

      if (groupBy === 'hour') {
        key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')} ${String(date.getHours()).padStart(2, '0')}:00`
      } else {
        key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
      }

      if (!grouped[key]) grouped[key] = []
      grouped[key].push(change)
    })

    // Calculate statistics
    const stats = {
      total: filtered.length,
      byType: Object.keys(CHANGE_TYPE_CONFIG).reduce((acc, type) => {
        acc[type] = filtered.filter(c => c.changeType === type).length
        return acc
      }, {} as Record<string, number>),
      bySeverity: {
        low: filtered.filter(c => c.severity === 'low').length,
        medium: filtered.filter(c => c.severity === 'medium').length,
        high: filtered.filter(c => c.severity === 'high').length
      }
    }

    return { 
      filteredChanges: filtered, 
      groupedByTime: grouped, 
      statistics: stats 
    }
  }, [changes, filters, actualHours])

  const toggleFilter = (category: 'changeTypes' | 'severities', value: string) => {
    setFilters(prev => {
      const newSet = new Set(prev[category])
      if (newSet.has(value)) {
        newSet.delete(value)
      } else {
        newSet.add(value)
      }
      return { ...prev, [category]: newSet }
    })
  }

  const toggleTimeRange = (range: keyof typeof TIME_RANGE_OPTIONS) => {
    setFilters(prev => ({ ...prev, timeRange: range }))
  }

  const toggleEventExpansion = (eventId: string) => {
    setExpandedEvents(prev => {
      const newSet = new Set(prev)
      if (newSet.has(eventId)) {
        newSet.delete(eventId)
      } else {
        newSet.add(eventId)
      }
      return newSet
    })
  }

  const formatTimeGroupKey = (key: string) => {
    if (key.includes(':')) {
      // Hour format
      const date = new Date(key.replace(' ', 'T') + ':00')
      return date.toLocaleString([], {
        month: 'short',
        day: 'numeric',
        hour: 'numeric',
        hour12: true
      })
    } else {
      // Day format
      const date = new Date(key + 'T00:00:00')
      return date.toLocaleDateString([], {
        weekday: 'short',
        month: 'short',
        day: 'numeric'
      })
    }
  }

  if (error) {
    return (
      <Card className={className}>
        <CardContent className="flex items-center justify-center py-12">
          <div className="text-center">
            <Clock className="mx-auto h-12 w-12 text-red-500 mb-4" />
            <h3 className="text-lg font-semibold text-red-700 mb-2">Failed to Load Timeline</h3>
            <p className="text-sm text-muted-foreground">
              {error instanceof Error ? error.message : 'Unable to load recent changes'}
            </p>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className={cn('space-y-6', className)}>
      {/* Header with Statistics */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Clock className="h-5 w-5" />
              <span>Change Timeline</span>
              <Badge variant="outline">
                {filteredChanges.length} changes in {TIME_RANGE_OPTIONS[filters.timeRange].label.toLowerCase()}
              </Badge>
            </div>
            <div className="flex items-center space-x-2">
              {Object.entries(TIME_RANGE_OPTIONS).map(([key, { label }]) => (
                <button
                  key={key}
                  onClick={() => toggleTimeRange(key as keyof typeof TIME_RANGE_OPTIONS)}
                  className={cn(
                    'px-3 py-1 text-xs rounded border transition-colors',
                    filters.timeRange === key
                      ? 'bg-primary text-primary-foreground border-primary'
                      : 'bg-background hover:bg-muted border-border'
                  )}
                >
                  {label}
                </button>
              ))}
            </div>
          </CardTitle>
        </CardHeader>

        {/* Quick Stats */}
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-4">
            <div className="text-center">
              <p className="text-lg font-bold">{statistics.total}</p>
              <p className="text-xs text-muted-foreground">Total</p>
            </div>
            {Object.entries(CHANGE_TYPE_CONFIG).map(([type, config]) => (
              <div key={type} className="text-center">
                <p className={cn('text-lg font-bold', config.color.split(' ')[0])}>
                  {statistics.byType[type] || 0}
                </p>
                <p className="text-xs text-muted-foreground">{config.label}</p>
              </div>
            ))}
            {Object.entries(statistics.bySeverity).map(([severity, count]) => (
              <div key={severity} className="text-center">
                <p className={cn('text-lg font-bold', SEVERITY_CONFIG[severity as keyof typeof SEVERITY_CONFIG].color)}>
                  {count}
                </p>
                <p className="text-xs text-muted-foreground capitalize">{severity}</p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Filters */}
      {showFilters && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center space-x-2">
              <Filter className="h-4 w-4" />
              <span>Filters</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Change Type Filters */}
              <div>
                <h4 className="text-sm font-medium mb-3">Change Types</h4>
                <div className="space-y-2">
                  {Object.entries(CHANGE_TYPE_CONFIG).map(([type, config]) => (
                    <div key={type} className="flex items-center space-x-2">
                      <input
                        type="checkbox"
                        id={`type-${type}`}
                        checked={filters.changeTypes.has(type)}
                        onChange={() => toggleFilter('changeTypes', type)}
                      />
                      <label 
                        htmlFor={`type-${type}`} 
                        className={cn('text-sm', config.color.split(' ')[0])}
                      >
                        {config.label} ({statistics.byType[type] || 0})
                      </label>
                    </div>
                  ))}
                </div>
              </div>

              {/* Severity Filters */}
              <div>
                <h4 className="text-sm font-medium mb-3">Severity Levels</h4>
                <div className="space-y-2">
                  {Object.entries(SEVERITY_CONFIG).map(([severity, config]) => (
                    <div key={severity} className="flex items-center space-x-2">
                      <input
                        type="checkbox"
                        id={`sev-${severity}`}
                        checked={filters.severities.has(severity)}
                        onChange={() => toggleFilter('severities', severity)}
                      />
                      <label 
                        htmlFor={`sev-${severity}`} 
                        className={cn('text-sm capitalize', config.color)}
                      >
                        {severity} ({statistics.bySeverity[severity as keyof typeof statistics.bySeverity]})
                      </label>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Timeline */}
      {isLoading ? (
        <Card>
          <CardContent className="flex items-center justify-center py-12">
            <div className="text-center">
              <Clock className="mx-auto h-8 w-8 text-blue-500 animate-spin mb-4" />
              <h3 className="text-lg font-semibold mb-2">Loading Timeline</h3>
              <p className="text-sm text-muted-foreground">
                Fetching recent network changes...
              </p>
            </div>
          </CardContent>
        </Card>
      ) : filteredChanges.length === 0 ? (
        <Card>
          <CardContent className="flex items-center justify-center py-12">
            <div className="text-center">
              <CheckCircle className="mx-auto h-12 w-12 text-green-500 mb-4" />
              <h3 className="text-lg font-semibold mb-2">No Changes</h3>
              <p className="text-sm text-muted-foreground">
                No network changes in the selected time range
              </p>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {Object.entries(groupedByTime)
            .sort(([a], [b]) => new Date(b.replace(' ', 'T') + (b.includes(':') ? ':00' : 'T00:00:00')).getTime() - 
                               new Date(a.replace(' ', 'T') + (a.includes(':') ? ':00' : 'T00:00:00')).getTime())
            .map(([timeKey, timeChanges]) => (
            <Card key={timeKey}>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <Calendar className="h-4 w-4 text-muted-foreground" />
                    <h3 className="font-medium">{formatTimeGroupKey(timeKey)}</h3>
                    <Badge variant="outline">{timeChanges.length} changes</Badge>
                  </div>
                  <div className="flex space-x-1">
                    {[...new Set(timeChanges.map(c => c.changeType))].map(type => {
                      const config = CHANGE_TYPE_CONFIG[type as keyof typeof CHANGE_TYPE_CONFIG]
                      if (!config) return null
                      const Icon = config.icon
                      return (
                        <div
                          key={type}
                          className="w-6 h-6 rounded-full bg-muted flex items-center justify-center"
                          title={config.label}
                        >
                          <Icon className="h-3 w-3" />
                        </div>
                      )
                    })}
                  </div>
                </div>
              </CardHeader>

              <CardContent>
                <div className="space-y-3">
                  {timeChanges
                    .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
                    .map((change, index) => {
                    const changeConfig = CHANGE_TYPE_CONFIG[change.changeType as keyof typeof CHANGE_TYPE_CONFIG]
                    const severityConfig = SEVERITY_CONFIG[change.severity as keyof typeof SEVERITY_CONFIG]
                    const eventId = `${timeKey}-${index}`

                    if (!changeConfig) return null

                    const ChangeIcon = changeConfig.icon

                    return (
                      <div
                        key={eventId}
                        className={cn(
                          'flex items-start space-x-3 p-3 border rounded-lg transition-all duration-200',
                          changeConfig.color,
                          'hover:shadow-sm cursor-pointer'
                        )}
                        onClick={() => toggleEventExpansion(eventId)}
                      >
                        <div className="flex-shrink-0 mt-0.5">
                          <ChangeIcon className="h-4 w-4" />
                        </div>

                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between mb-1">
                            <div className="flex items-center space-x-2">
                              <p className="text-sm font-medium">{change.description}</p>
                              <Badge 
                                variant={severityConfig.badge as any}
                                className="text-xs"
                              >
                                {change.severity}
                              </Badge>
                            </div>
                            <div className="text-xs text-muted-foreground">
                              {new Date(change.timestamp).toLocaleTimeString()}
                            </div>
                          </div>

                          <div className="flex items-center space-x-4 text-xs text-muted-foreground">
                            <span>Device: <code className="font-mono">{change.deviceId}</code></span>
                            <span>Type: {changeConfig.label}</span>
                          </div>

                          {expandedEvents.has(eventId) && (
                            <div className="mt-3 pt-3 border-t border-current/20">
                              <div className="grid grid-cols-2 gap-4 text-xs">
                                <div>
                                  <span className="font-medium">Timestamp:</span>
                                  <p className="font-mono">{new Date(change.timestamp).toISOString()}</p>
                                </div>
                                <div>
                                  <span className="font-medium">Change Type:</span>
                                  <p>{changeConfig.label}</p>
                                </div>
                                <div>
                                  <span className="font-medium">Severity:</span>
                                  <p className="capitalize">{change.severity}</p>
                                </div>
                                <div>
                                  <span className="font-medium">Device ID:</span>
                                  <p className="font-mono">{change.deviceId}</p>
                                </div>
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    )
                  })}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}