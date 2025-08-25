import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle, Button, Badge } from '@/components/ui'
import { useDeviceHistory, useSnapshotComparison } from '@/hooks'
import { LoadingState, DataTable } from '@/components/common'
import { cn } from '@/lib/utils'
import type { Device, ChangeEvent, SnapshotDiff } from '@nmapper/shared'
import {
  History,
  Calendar,
  Clock,
  Plus,
  Minus,
  ArrowRight,
  AlertTriangle,
  CheckCircle,
  Info,
  Network,
  Shield,
  Settings,
  RefreshCw,
  Filter,
  Search,
  Eye,
  ChevronDown,
  ChevronRight,
  Activity,
  Zap,
  Globe,
  Server,
  FileText,
  User,
  Database
} from 'lucide-react'

interface DeviceHistoryCardProps {
  deviceId: string
  timeRange?: number // hours to look back
  limit?: number
  onEventClick?: (event: ChangeEvent) => void
  className?: string
}

interface HistoryEvent {
  id: string
  timestamp: Date
  type: 'device_discovered' | 'device_removed' | 'status_changed' | 'port_opened' | 'port_closed' | 'service_changed' | 'security_event' | 'configuration_changed' | 'scan_completed'
  severity: 'low' | 'medium' | 'high' | 'critical'
  title: string
  description: string
  details?: any
  before?: any
  after?: any
}

export function DeviceHistoryCard({ 
  deviceId, 
  timeRange = 168, // Default to 1 week
  limit = 50,
  onEventClick,
  className 
}: DeviceHistoryCardProps) {
  const { data: historyData, isLoading, error, refetch } = useDeviceHistory(deviceId, { timeRange, limit })
  
  const [searchQuery, setSearchQuery] = useState('')
  const [severityFilter, setSeverityFilter] = useState<string>('all')
  const [typeFilter, setTypeFilter] = useState<string>('all')
  const [expandedEvents, setExpandedEvents] = useState<Set<string>>(new Set())
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc')

  // Mock history events for demonstration
  const mockEvents: HistoryEvent[] = [
    {
      id: '1',
      timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000),
      type: 'port_opened',
      severity: 'medium',
      title: 'New Service Detected',
      description: 'HTTP service started on port 8080',
      details: { port: 8080, service: 'http', product: 'Apache', version: '2.4.41' },
      after: { port: 8080, state: 'open', service: 'http' }
    },
    {
      id: '2',
      timestamp: new Date(Date.now() - 4 * 60 * 60 * 1000),
      type: 'status_changed',
      severity: 'high',
      title: 'Device Status Changed',
      description: 'Device went offline for 15 minutes',
      before: { status: 'online', responseTime: 12 },
      after: { status: 'offline', responseTime: null }
    },
    {
      id: '3',
      timestamp: new Date(Date.now() - 6 * 60 * 60 * 1000),
      type: 'security_event',
      severity: 'critical',
      title: 'Security Vulnerability Detected',
      description: 'Outdated SSH service with known vulnerabilities',
      details: { service: 'ssh', version: '7.4', vulnerabilities: ['CVE-2021-41617'] }
    },
    {
      id: '4',
      timestamp: new Date(Date.now() - 12 * 60 * 60 * 1000),
      type: 'service_changed',
      severity: 'low',
      title: 'Service Version Updated',
      description: 'SSH service updated to newer version',
      before: { service: 'ssh', version: '7.4', product: 'OpenSSH' },
      after: { service: 'ssh', version: '8.6', product: 'OpenSSH' }
    },
    {
      id: '5',
      timestamp: new Date(Date.now() - 24 * 60 * 60 * 1000),
      type: 'device_discovered',
      severity: 'low',
      title: 'Device First Discovered',
      description: 'Device was first detected on the network',
      after: { ip: deviceId, hostname: 'unknown', ports: [], services: [] }
    }
  ]

  const eventTypeIcons = {
    device_discovered: Plus,
    device_removed: Minus,
    status_changed: Activity,
    port_opened: Network,
    port_closed: Network,
    service_changed: Settings,
    security_event: Shield,
    configuration_changed: Settings,
    scan_completed: RefreshCw
  }

  const severityColors = {
    low: 'text-green-500',
    medium: 'text-yellow-500',
    high: 'text-orange-500',
    critical: 'text-red-500'
  }

  const severityBadgeColors = {
    low: 'bg-green-100 text-green-800 dark:bg-green-950 dark:text-green-300',
    medium: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-950 dark:text-yellow-300',
    high: 'bg-orange-100 text-orange-800 dark:bg-orange-950 dark:text-orange-300',
    critical: 'bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-300'
  }

  const getEventIcon = (type: string) => {
    return eventTypeIcons[type as keyof typeof eventTypeIcons] || Info
  }

  const toggleEventExpansion = (eventId: string) => {
    const newExpanded = new Set(expandedEvents)
    if (newExpanded.has(eventId)) {
      newExpanded.delete(eventId)
    } else {
      newExpanded.add(eventId)
    }
    setExpandedEvents(newExpanded)
  }

  const formatTimeAgo = (date: Date) => {
    const now = new Date()
    const diff = now.getTime() - date.getTime()
    
    const minutes = Math.floor(diff / 60000)
    const hours = Math.floor(diff / 3600000)
    const days = Math.floor(diff / 86400000)
    
    if (days > 0) return `${days}d ago`
    if (hours > 0) return `${hours}h ago`
    if (minutes > 0) return `${minutes}m ago`
    return 'Just now'
  }

  const filteredEvents = mockEvents.filter(event => {
    if (severityFilter !== 'all' && event.severity !== severityFilter) return false
    if (typeFilter !== 'all' && event.type !== typeFilter) return false
    
    if (searchQuery) {
      const query = searchQuery.toLowerCase()
      return (
        event.title.toLowerCase().includes(query) ||
        event.description.toLowerCase().includes(query) ||
        event.type.toLowerCase().includes(query)
      )
    }
    
    return true
  })

  const sortedEvents = [...filteredEvents].sort((a, b) => {
    if (sortOrder === 'desc') {
      return b.timestamp.getTime() - a.timestamp.getTime()
    } else {
      return a.timestamp.getTime() - b.timestamp.getTime()
    }
  })

  const eventTypeCounts = mockEvents.reduce((acc, event) => {
    acc[event.type] = (acc[event.type] || 0) + 1
    return acc
  }, {} as Record<string, number>)

  const severityCounts = mockEvents.reduce((acc, event) => {
    acc[event.severity] = (acc[event.severity] || 0) + 1
    return acc
  }, {} as Record<string, number>)

  if (isLoading) {
    return (
      <Card className={cn('h-full', className)}>
        <LoadingState
          type="card"
          icon="history"
          title="Loading Device History"
          description="Retrieving historical events and changes..."
        />
      </Card>
    )
  }

  if (error) {
    return (
      <Card className={cn('h-full', className)}>
        <CardContent className="flex items-center justify-center h-48">
          <div className="text-center">
            <History className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
            <p className="text-sm text-muted-foreground">Unable to load device history</p>
            <Button variant="outline" size="sm" onClick={() => refetch()} className="mt-2">
              <RefreshCw className="h-4 w-4 mr-2" />
              Retry
            </Button>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className={cn('h-full', className)}>
      <CardHeader className="pb-4">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg flex items-center space-x-2">
            <History className="h-5 w-5" />
            <span>Device History</span>
          </CardTitle>
          
          <div className="flex items-center space-x-2">
            <select
              value={timeRange}
              onChange={(e) => {/* Update time range */}}
              className="text-xs border rounded px-2 py-1 bg-background"
            >
              <option value={24}>Last 24h</option>
              <option value={168}>Last Week</option>
              <option value={720}>Last Month</option>
              <option value={8760}>Last Year</option>
            </select>
            
            <Button
              variant="outline"
              size="sm"
              onClick={() => refetch()}
            >
              <RefreshCw className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Summary Statistics */}
        <div className="grid grid-cols-4 gap-2 mt-4">
          {Object.entries(severityCounts).map(([severity, count]) => (
            <div key={severity} className="text-center p-2 bg-muted/30 rounded">
              <p className="text-lg font-bold">{count}</p>
              <p className="text-xs text-muted-foreground capitalize">{severity}</p>
            </div>
          ))}
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Search and Filters */}
        <div className="flex flex-col sm:flex-row gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search events..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 text-sm border rounded-md bg-background"
            />
          </div>
          
          <div className="flex space-x-2">
            <select
              value={severityFilter}
              onChange={(e) => setSeverityFilter(e.target.value)}
              className="px-3 py-2 text-sm border rounded-md bg-background"
            >
              <option value="all">All Severity</option>
              <option value="critical">Critical</option>
              <option value="high">High</option>
              <option value="medium">Medium</option>
              <option value="low">Low</option>
            </select>
            
            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
              className="px-3 py-2 text-sm border rounded-md bg-background"
            >
              <option value="all">All Types</option>
              <option value="device_discovered">Discovered</option>
              <option value="status_changed">Status</option>
              <option value="port_opened">Port Opened</option>
              <option value="port_closed">Port Closed</option>
              <option value="service_changed">Service</option>
              <option value="security_event">Security</option>
            </select>
          </div>
        </div>

        {/* Results Info */}
        <div className="flex items-center justify-between text-sm text-muted-foreground">
          <span>Showing {sortedEvents.length} events</span>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setSortOrder(sortOrder === 'desc' ? 'asc' : 'desc')}
            className="text-xs"
          >
            {sortOrder === 'desc' ? 'Newest First' : 'Oldest First'}
          </Button>
        </div>

        {/* Events Timeline */}
        <div className="space-y-3 max-h-96 overflow-y-auto">
          {sortedEvents.length === 0 ? (
            <div className="text-center py-8">
              <History className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
              <p className="text-sm text-muted-foreground">No events found matching your criteria</p>
            </div>
          ) : (
            sortedEvents.map((event, index) => {
              const EventIcon = getEventIcon(event.type)
              const isExpanded = expandedEvents.has(event.id)
              
              return (
                <div key={event.id} className="relative">
                  {/* Timeline line */}
                  {index < sortedEvents.length - 1 && (
                    <div className="absolute left-4 top-10 w-0.5 h-8 bg-border" />
                  )}
                  
                  <div className="flex items-start space-x-3">
                    {/* Event Icon */}
                    <div className={cn(
                      'flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center',
                      'bg-background border-2',
                      severityColors[event.severity].replace('text-', 'border-')
                    )}>
                      <EventIcon className={cn('h-4 w-4', severityColors[event.severity])} />
                    </div>
                    
                    {/* Event Content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <h4 className="text-sm font-medium">{event.title}</h4>
                        <div className="flex items-center space-x-2">
                          <Badge className={cn('text-xs', severityBadgeColors[event.severity])}>
                            {event.severity}
                          </Badge>
                          <span className="text-xs text-muted-foreground">
                            {formatTimeAgo(event.timestamp)}
                          </span>
                        </div>
                      </div>
                      
                      <p className="text-sm text-muted-foreground mt-1">{event.description}</p>
                      
                      {/* Expandable Details */}
                      {(event.details || event.before || event.after) && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => toggleEventExpansion(event.id)}
                          className="mt-2 h-6 text-xs text-muted-foreground"
                        >
                          {isExpanded ? (
                            <ChevronDown className="h-3 w-3 mr-1" />
                          ) : (
                            <ChevronRight className="h-3 w-3 mr-1" />
                          )}
                          {isExpanded ? 'Hide Details' : 'Show Details'}
                        </Button>
                      )}
                      
                      {isExpanded && (
                        <div className="mt-2 p-3 bg-muted/30 rounded-lg space-y-2">
                          {event.before && event.after && (
                            <div className="grid grid-cols-2 gap-4 text-xs">
                              <div>
                                <p className="font-medium text-muted-foreground mb-1">Before</p>
                                <pre className="bg-background p-2 rounded text-xs overflow-x-auto">
                                  {JSON.stringify(event.before, null, 2)}
                                </pre>
                              </div>
                              <div>
                                <p className="font-medium text-muted-foreground mb-1">After</p>
                                <pre className="bg-background p-2 rounded text-xs overflow-x-auto">
                                  {JSON.stringify(event.after, null, 2)}
                                </pre>
                              </div>
                            </div>
                          )}
                          
                          {event.details && (
                            <div>
                              <p className="font-medium text-muted-foreground mb-1 text-xs">Details</p>
                              <pre className="bg-background p-2 rounded text-xs overflow-x-auto">
                                {JSON.stringify(event.details, null, 2)}
                              </pre>
                            </div>
                          )}
                          
                          <div className="flex items-center justify-between text-xs text-muted-foreground pt-2 border-t">
                            <span>Event ID: {event.id}</span>
                            <span>{event.timestamp.toLocaleString()}</span>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )
            })
          )}
        </div>

        {/* Quick Actions */}
        <div className="border-t pt-4">
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">Quick Actions</span>
            <div className="flex space-x-2">
              <Button variant="outline" size="sm">
                <FileText className="h-4 w-4 mr-2" />
                Export History
              </Button>
              <Button variant="outline" size="sm">
                <Eye className="h-4 w-4 mr-2" />
                View All Changes
              </Button>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}