import { useState, useEffect, useRef } from 'react'
import { Card, CardContent, CardHeader, CardTitle, Badge } from '@/components/ui'
import { useWebSocketEvent } from '@/hooks/useWebSocket'
import { useNotifications } from '@/services/notificationService'
import { cn } from '@/lib/utils'
import {
  Activity,
  Zap,
  Bell,
  Eye,
  TrendingUp,
  Users,
  Shield,
  AlertTriangle,
  CheckCircle,
  RefreshCw,
  Network,
  Clock,
  Database
} from 'lucide-react'

interface EventDrivenUIUpdatesProps {
  className?: string
}

interface UIEvent {
  id: string
  type: 'device' | 'scan' | 'system' | 'security' | 'network' | 'user'
  event: string
  description: string
  data?: any
  timestamp: Date
  severity: 'info' | 'warning' | 'critical'
  acknowledged: boolean
}

interface UIAnimation {
  element: string
  type: 'pulse' | 'shake' | 'glow' | 'bounce'
  duration: number
}

interface ComponentUpdate {
  componentId: string
  updateType: 'data' | 'style' | 'visibility' | 'content'
  payload: any
  timestamp: Date
}

const EVENT_ICONS = {
  device: Users,
  scan: Activity,
  system: Database,
  security: Shield,
  network: Network,
  user: Eye
} as const

const SEVERITY_COLORS = {
  info: 'text-blue-500',
  warning: 'text-yellow-500',
  critical: 'text-red-500'
} as const

const SEVERITY_BADGES = {
  info: 'default',
  warning: 'warning',
  critical: 'destructive'
} as const

export function EventDrivenUIUpdates({ className }: EventDrivenUIUpdatesProps) {
  const [recentEvents, setRecentEvents] = useState<UIEvent[]>([])
  const [activeAnimations, setActiveAnimations] = useState<UIAnimation[]>([])
  const [componentUpdates, setComponentUpdates] = useState<ComponentUpdate[]>([])
  const [uiStatistics, setUiStatistics] = useState({
    totalEvents: 0,
    eventsLastHour: 0,
    criticalEvents: 0,
    activeAnimations: 0
  })
  
  const eventCountRef = useRef(0)
  const notifications = useNotifications()

  // Generic event handler for all UI events
  const handleUIEvent = (eventType: string, eventData: any, severity: 'info' | 'warning' | 'critical' = 'info') => {
    const event: UIEvent = {
      id: `${eventType}-${Date.now()}-${Math.random()}`,
      type: getEventCategory(eventType),
      event: eventType,
      description: getEventDescription(eventType, eventData),
      data: eventData,
      timestamp: new Date(),
      severity,
      acknowledged: false
    }

    setRecentEvents(prev => [event, ...prev.slice(0, 49)]) // Keep last 50 events
    eventCountRef.current++
    
    updateStatistics(event)
    
    // Trigger UI animations for important events
    if (severity === 'critical' || severity === 'warning') {
      triggerAnimation(getAnimationForEvent(eventType))
    }
  }

  // Device events
  useWebSocketEvent('device:discovered', (data) => {
    handleUIEvent('device:discovered', data, 'info')
  }, [])

  useWebSocketEvent('device:updated', (data) => {
    handleUIEvent('device:updated', data, 'info')
  }, [])

  useWebSocketEvent('device:removed', (data) => {
    handleUIEvent('device:removed', data, 'warning')
  }, [])

  useWebSocketEvent('device:status_changed', (data) => {
    handleUIEvent('device:status_changed', data, data.status === 'offline' ? 'warning' : 'info')
  }, [])

  // Scan events
  useWebSocketEvent('scan:started', (data) => {
    handleUIEvent('scan:started', data, 'info')
  }, [])

  useWebSocketEvent('scan:progress', (data) => {
    handleUIEvent('scan:progress', data, 'info')
  }, [])

  useWebSocketEvent('scan:completed', (data) => {
    handleUIEvent('scan:completed', data, 'info')
  }, [])

  useWebSocketEvent('scan:failed', (data) => {
    handleUIEvent('scan:failed', data, 'critical')
  }, [])

  // System events
  useWebSocketEvent('system:health_update', (data) => {
    const hasCriticalMetrics = 
      data.cpu?.usage > 90 || 
      data.memory?.usage > 95 || 
      data.disk?.usage > 95
    
    handleUIEvent('system:health_update', data, hasCriticalMetrics ? 'critical' : 'info')
  }, [])

  useWebSocketEvent('system:alert', (data) => {
    handleUIEvent('system:alert', data, data.level)
  }, [])

  useWebSocketEvent('system:service_status', (data) => {
    handleUIEvent('system:service_status', data, data.status === 'critical' ? 'critical' : 'warning')
  }, [])

  // Network events
  useWebSocketEvent('network:topology_changed', (data) => {
    handleUIEvent('network:topology_changed', data, 'info')
  }, [])

  useWebSocketEvent('network:device_risk_changed', (data) => {
    handleUIEvent('network:device_risk_changed', data, data.newRisk === 'high' ? 'critical' : 'warning')
  }, [])

  useWebSocketEvent('network:anomaly_detected', (data) => {
    handleUIEvent('network:anomaly_detected', data, 'critical')
  }, [])

  // Security events
  useWebSocketEvent('security:threat_detected', (data) => {
    handleUIEvent('security:threat_detected', data, 'critical')
  }, [])

  useWebSocketEvent('security:vulnerability_found', (data) => {
    handleUIEvent('security:vulnerability_found', data, data.severity === 'high' ? 'critical' : 'warning')
  }, [])

  // Component update events
  useWebSocketEvent('ui:component_update', (data) => {
    const update: ComponentUpdate = {
      componentId: data.componentId,
      updateType: data.updateType,
      payload: data.payload,
      timestamp: new Date()
    }
    
    setComponentUpdates(prev => [update, ...prev.slice(0, 19)]) // Keep last 20 updates
    handleUIEvent('ui:component_update', data, 'info')
  }, [])

  // Helper functions
  const getEventCategory = (eventType: string): UIEvent['type'] => {
    if (eventType.startsWith('device:')) return 'device'
    if (eventType.startsWith('scan:')) return 'scan'
    if (eventType.startsWith('system:')) return 'system'
    if (eventType.startsWith('security:')) return 'security'
    if (eventType.startsWith('network:')) return 'network'
    return 'user'
  }

  const getEventDescription = (eventType: string, data: any): string => {
    switch (eventType) {
      case 'device:discovered':
        return `New device discovered: ${data.device?.hostname || data.device?.ip || 'Unknown'}`
      case 'device:updated':
        return `Device updated: ${data.device?.hostname || data.device?.ip || 'Unknown'}`
      case 'device:removed':
        return `Device removed: ${data.deviceId || 'Unknown'}`
      case 'device:status_changed':
        return `Device ${data.deviceId} is now ${data.status}`
      case 'scan:started':
        return `Network scan started: ${data.scanId?.slice(0, 8) || 'Unknown ID'}`
      case 'scan:progress':
        return `Scan progress: ${data.progress?.toFixed(1) || 0}% (${data.stage || 'unknown stage'})`
      case 'scan:completed':
        return `Network scan completed: ${data.scanId?.slice(0, 8) || 'Unknown ID'}`
      case 'scan:failed':
        return `Scan failed: ${data.error || 'Unknown error'}`
      case 'system:health_update':
        return `System metrics updated - CPU: ${data.cpu?.usage?.toFixed(1) || 0}%, Memory: ${data.memory?.usage?.toFixed(1) || 0}%`
      case 'system:alert':
        return `System alert: ${data.message || 'Unknown alert'}`
      case 'system:service_status':
        return `Service ${data.service} is now ${data.status}`
      case 'network:topology_changed':
        return 'Network topology changed'
      case 'network:device_risk_changed':
        return `Device ${data.deviceId} risk level changed to ${data.newRisk}`
      case 'network:anomaly_detected':
        return `Network anomaly detected: ${data.description || 'Unknown anomaly'}`
      case 'security:threat_detected':
        return `Security threat detected: ${data.threat || 'Unknown threat'}`
      case 'security:vulnerability_found':
        return `Vulnerability found: ${data.vulnerability || 'Unknown vulnerability'}`
      case 'ui:component_update':
        return `Component ${data.componentId} updated (${data.updateType})`
      default:
        return `Event: ${eventType}`
    }
  }

  const getAnimationForEvent = (eventType: string): UIAnimation => {
    switch (eventType) {
      case 'device:discovered':
        return { element: 'device-list', type: 'pulse', duration: 2000 }
      case 'scan:started':
        return { element: 'scan-progress', type: 'glow', duration: 3000 }
      case 'scan:failed':
        return { element: 'scan-progress', type: 'shake', duration: 1000 }
      case 'system:alert':
        return { element: 'system-health', type: 'bounce', duration: 1500 }
      case 'security:threat_detected':
        return { element: 'security-panel', type: 'shake', duration: 2000 }
      default:
        return { element: 'main-content', type: 'pulse', duration: 1000 }
    }
  }

  const triggerAnimation = (animation: UIAnimation) => {
    setActiveAnimations(prev => [...prev, animation])
    
    setTimeout(() => {
      setActiveAnimations(prev => prev.filter(a => a !== animation))
    }, animation.duration)
  }

  const updateStatistics = (event: UIEvent) => {
    setUiStatistics(prev => ({
      totalEvents: prev.totalEvents + 1,
      eventsLastHour: prev.eventsLastHour + 1, // Simplified - would track actual hour
      criticalEvents: prev.criticalEvents + (event.severity === 'critical' ? 1 : 0),
      activeAnimations: activeAnimations.length
    }))
  }

  const acknowledgeEvent = (eventId: string) => {
    setRecentEvents(prev => 
      prev.map(event => 
        event.id === eventId 
          ? { ...event, acknowledged: true }
          : event
      )
    )
  }

  const clearAllEvents = () => {
    setRecentEvents([])
    setUiStatistics(prev => ({
      ...prev,
      totalEvents: 0,
      eventsLastHour: 0,
      criticalEvents: 0
    }))
  }

  return (
    <div className={cn('space-y-6', className)}>
      {/* Event Statistics */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Zap className="h-5 w-5" />
              <span>Event-Driven UI Activity</span>
            </div>
            
            <div className="flex items-center space-x-2">
              {activeAnimations.length > 0 && (
                <Badge variant="default" className="animate-pulse">
                  <Activity className="h-3 w-3 mr-1" />
                  {activeAnimations.length} active
                </Badge>
              )}
              
              {recentEvents.length > 0 && (
                <button
                  onClick={clearAllEvents}
                  className="text-xs text-muted-foreground hover:text-foreground transition-colors"
                >
                  Clear all
                </button>
              )}
            </div>
          </CardTitle>
        </CardHeader>
        
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center p-3 bg-muted/30 rounded-lg">
              <Activity className="h-4 w-4 mx-auto mb-1 text-blue-500" />
              <p className="text-sm font-medium">{uiStatistics.totalEvents}</p>
              <p className="text-xs text-muted-foreground">Total Events</p>
            </div>
            
            <div className="text-center p-3 bg-muted/30 rounded-lg">
              <Clock className="h-4 w-4 mx-auto mb-1 text-green-500" />
              <p className="text-sm font-medium">{uiStatistics.eventsLastHour}</p>
              <p className="text-xs text-muted-foreground">Last Hour</p>
            </div>
            
            <div className="text-center p-3 bg-muted/30 rounded-lg">
              <AlertTriangle className="h-4 w-4 mx-auto mb-1 text-red-500" />
              <p className="text-sm font-medium">{uiStatistics.criticalEvents}</p>
              <p className="text-xs text-muted-foreground">Critical Events</p>
            </div>
            
            <div className="text-center p-3 bg-muted/30 rounded-lg">
              <Zap className="h-4 w-4 mx-auto mb-1 text-purple-500" />
              <p className="text-sm font-medium">{activeAnimations.length}</p>
              <p className="text-xs text-muted-foreground">Active Animations</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Recent Events */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Bell className="h-5 w-5" />
            <span>Recent UI Events</span>
            <Badge variant="outline">{recentEvents.length}</Badge>
          </CardTitle>
        </CardHeader>
        
        <CardContent>
          <div className="space-y-2 max-h-96 overflow-y-auto">
            {recentEvents.length === 0 ? (
              <div className="text-center py-8">
                <Eye className="mx-auto h-8 w-8 text-muted-foreground mb-2" />
                <p className="text-sm text-muted-foreground">No recent UI events</p>
                <p className="text-xs text-muted-foreground">Events will appear here as they occur</p>
              </div>
            ) : (
              recentEvents.slice(0, 20).map((event) => {
                const Icon = EVENT_ICONS[event.type]
                return (
                  <div
                    key={event.id}
                    className={cn(
                      'flex items-start space-x-3 p-3 rounded-lg border transition-all duration-200',
                      event.acknowledged 
                        ? 'bg-muted/30 border-muted opacity-60'
                        : 'bg-background border-border hover:bg-muted/50',
                      !event.acknowledged && event.severity === 'critical' && 'ring-1 ring-red-500/20',
                      !event.acknowledged && event.severity === 'warning' && 'ring-1 ring-yellow-500/20'
                    )}
                  >
                    <Icon className={cn(
                      'h-4 w-4 flex-shrink-0 mt-0.5',
                      event.acknowledged ? 'text-muted-foreground' : SEVERITY_COLORS[event.severity]
                    )} />
                    
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between mb-1">
                        <div>
                          <p className="text-sm font-medium">{event.event}</p>
                          <p className="text-sm text-muted-foreground">{event.description}</p>
                        </div>
                        
                        <div className="flex items-center space-x-2 ml-2">
                          <Badge 
                            variant={SEVERITY_BADGES[event.severity] as any}
                            className="text-xs"
                          >
                            {event.severity}
                          </Badge>
                          
                          {!event.acknowledged && (
                            <button
                              onClick={() => acknowledgeEvent(event.id)}
                              className="text-xs text-muted-foreground hover:text-foreground transition-colors"
                            >
                              Ack
                            </button>
                          )}
                        </div>
                      </div>
                      
                      <div className="flex items-center space-x-2 text-xs text-muted-foreground">
                        <span>{event.timestamp.toLocaleTimeString()}</span>
                        <span>•</span>
                        <span className="capitalize">{event.type}</span>
                        {event.acknowledged && (
                          <>
                            <span>•</span>
                            <CheckCircle className="h-3 w-3" />
                            <span>Acknowledged</span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                )
              })
            )}
          </div>
        </CardContent>
      </Card>

      {/* Active Animations */}
      {activeAnimations.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <RefreshCw className="h-5 w-5 animate-spin" />
              <span>Active UI Animations</span>
            </CardTitle>
          </CardHeader>
          
          <CardContent>
            <div className="space-y-2">
              {activeAnimations.map((animation, index) => (
                <div key={index} className="flex items-center justify-between p-2 bg-muted/30 rounded">
                  <div className="flex items-center space-x-3">
                    <div className={cn(
                      'w-2 h-2 rounded-full',
                      animation.type === 'pulse' && 'bg-blue-500 animate-pulse',
                      animation.type === 'shake' && 'bg-red-500 animate-bounce',
                      animation.type === 'glow' && 'bg-green-500 animate-pulse',
                      animation.type === 'bounce' && 'bg-yellow-500 animate-bounce'
                    )} />
                    <span className="text-sm font-medium">{animation.element}</span>
                    <Badge variant="outline" className="text-xs">
                      {animation.type}
                    </Badge>
                  </div>
                  
                  <span className="text-xs text-muted-foreground">
                    {animation.duration}ms
                  </span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Component Updates */}
      {componentUpdates.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <TrendingUp className="h-5 w-5" />
              <span>Component Updates</span>
            </CardTitle>
          </CardHeader>
          
          <CardContent>
            <div className="space-y-1 max-h-32 overflow-y-auto">
              {componentUpdates.slice(0, 10).map((update, index) => (
                <div key={index} className="flex items-center justify-between text-sm p-2 bg-muted/30 rounded">
                  <div className="flex items-center space-x-2">
                    <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse" />
                    <span className="font-mono text-xs">{update.componentId}</span>
                    <Badge variant="outline" className="text-xs">
                      {update.updateType}
                    </Badge>
                  </div>
                  
                  <span className="text-xs text-muted-foreground">
                    {update.timestamp.toLocaleTimeString()}
                  </span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}