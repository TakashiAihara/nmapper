import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle, Badge, Progress } from '@/components/ui'
import { useWebSocketEvent } from '@/hooks/useWebSocket'
import { useNotifications } from '@/services/notificationService'
import { formatDuration, cn } from '@/lib/utils'
import {
  Activity,
  Cpu,
  HardDrive,
  Memory,
  Zap,
  AlertTriangle,
  CheckCircle,
  Server,
  Thermometer,
  Gauge,
  Clock
} from 'lucide-react'

interface SystemHealthMonitorProps {
  className?: string
}

interface SystemHealthMetrics {
  cpu: {
    usage: number
    temperature?: number
    cores: number
    frequency?: number
  }
  memory: {
    used: number
    total: number
    usage: number
    available: number
  }
  disk: {
    used: number
    total: number
    usage: number
    available: number
  }
  network: {
    bytesIn: number
    bytesOut: number
    packetsIn: number
    packetsOut: number
  }
  system: {
    uptime: number
    loadAverage: number[]
    processes: number
    temperature?: number
  }
  services: {
    database: 'healthy' | 'warning' | 'critical'
    scanner: 'healthy' | 'warning' | 'critical'
    websocket: 'healthy' | 'warning' | 'critical'
    api: 'healthy' | 'warning' | 'critical'
  }
  timestamp: Date
}

interface HealthAlert {
  id: string
  type: 'cpu' | 'memory' | 'disk' | 'service' | 'temperature'
  level: 'warning' | 'critical'
  message: string
  value?: number
  threshold?: number
  timestamp: Date
}

const HEALTH_THRESHOLDS = {
  cpu: { warning: 75, critical: 90 },
  memory: { warning: 80, critical: 95 },
  disk: { warning: 85, critical: 95 },
  temperature: { warning: 70, critical: 80 }
}

export function SystemHealthMonitor({ className }: SystemHealthMonitorProps) {
  const [metrics, setMetrics] = useState<SystemHealthMetrics | null>(null)
  const [alerts, setAlerts] = useState<HealthAlert[]>([])
  const [isConnected, setIsConnected] = useState(false)
  const notifications = useNotifications()

  // Listen for system health updates
  useWebSocketEvent('system:health_update', (data) => {
    const newMetrics: SystemHealthMetrics = {
      ...data,
      timestamp: new Date(data.timestamp)
    }
    
    setMetrics(newMetrics)
    checkHealthThresholds(newMetrics)
  }, [])

  // Listen for system alerts
  useWebSocketEvent('system:alert', (data) => {
    const alert: HealthAlert = {
      id: `${data.type}-${Date.now()}`,
      type: data.type,
      level: data.level,
      message: data.message,
      value: data.value,
      threshold: data.threshold,
      timestamp: new Date()
    }

    setAlerts(prev => [alert, ...prev.slice(0, 9)]) // Keep last 10 alerts

    // Show notification for critical alerts
    if (data.level === 'critical') {
      notifications.show({
        title: 'System Alert',
        description: data.message,
        level: 'error',
        persistent: true
      })
    }
  }, [])

  // Listen for service status changes
  useWebSocketEvent('system:service_status', (data) => {
    if (!metrics) return

    setMetrics(prev => prev ? {
      ...prev,
      services: {
        ...prev.services,
        [data.service]: data.status
      }
    } : prev)
  }, [metrics])

  // Connection status
  useWebSocketEvent('connect', () => {
    setIsConnected(true)
  }, [])

  useWebSocketEvent('disconnect', () => {
    setIsConnected(false)
  }, [])

  // Check thresholds and generate alerts
  const checkHealthThresholds = (newMetrics: SystemHealthMetrics) => {
    const newAlerts: HealthAlert[] = []

    // CPU usage check
    if (newMetrics.cpu.usage > HEALTH_THRESHOLDS.cpu.critical) {
      newAlerts.push({
        id: `cpu-critical-${Date.now()}`,
        type: 'cpu',
        level: 'critical',
        message: `CPU usage critically high: ${newMetrics.cpu.usage.toFixed(1)}%`,
        value: newMetrics.cpu.usage,
        threshold: HEALTH_THRESHOLDS.cpu.critical,
        timestamp: new Date()
      })
    } else if (newMetrics.cpu.usage > HEALTH_THRESHOLDS.cpu.warning) {
      newAlerts.push({
        id: `cpu-warning-${Date.now()}`,
        type: 'cpu',
        level: 'warning',
        message: `CPU usage high: ${newMetrics.cpu.usage.toFixed(1)}%`,
        value: newMetrics.cpu.usage,
        threshold: HEALTH_THRESHOLDS.cpu.warning,
        timestamp: new Date()
      })
    }

    // Memory usage check
    if (newMetrics.memory.usage > HEALTH_THRESHOLDS.memory.critical) {
      newAlerts.push({
        id: `memory-critical-${Date.now()}`,
        type: 'memory',
        level: 'critical',
        message: `Memory usage critically high: ${newMetrics.memory.usage.toFixed(1)}%`,
        value: newMetrics.memory.usage,
        threshold: HEALTH_THRESHOLDS.memory.critical,
        timestamp: new Date()
      })
    } else if (newMetrics.memory.usage > HEALTH_THRESHOLDS.memory.warning) {
      newAlerts.push({
        id: `memory-warning-${Date.now()}`,
        type: 'memory',
        level: 'warning',
        message: `Memory usage high: ${newMetrics.memory.usage.toFixed(1)}%`,
        value: newMetrics.memory.usage,
        threshold: HEALTH_THRESHOLDS.memory.warning,
        timestamp: new Date()
      })
    }

    // Disk usage check
    if (newMetrics.disk.usage > HEALTH_THRESHOLDS.disk.critical) {
      newAlerts.push({
        id: `disk-critical-${Date.now()}`,
        type: 'disk',
        level: 'critical',
        message: `Disk usage critically high: ${newMetrics.disk.usage.toFixed(1)}%`,
        value: newMetrics.disk.usage,
        threshold: HEALTH_THRESHOLDS.disk.critical,
        timestamp: new Date()
      })
    } else if (newMetrics.disk.usage > HEALTH_THRESHOLDS.disk.warning) {
      newAlerts.push({
        id: `disk-warning-${Date.now()}`,
        type: 'disk',
        level: 'warning',
        message: `Disk usage high: ${newMetrics.disk.usage.toFixed(1)}%`,
        value: newMetrics.disk.usage,
        threshold: HEALTH_THRESHOLDS.disk.warning,
        timestamp: new Date()
      })
    }

    // Temperature check
    if (newMetrics.cpu.temperature && newMetrics.cpu.temperature > HEALTH_THRESHOLDS.temperature.critical) {
      newAlerts.push({
        id: `temp-critical-${Date.now()}`,
        type: 'temperature',
        level: 'critical',
        message: `System temperature critically high: ${newMetrics.cpu.temperature}°C`,
        value: newMetrics.cpu.temperature,
        threshold: HEALTH_THRESHOLDS.temperature.critical,
        timestamp: new Date()
      })
    } else if (newMetrics.cpu.temperature && newMetrics.cpu.temperature > HEALTH_THRESHOLDS.temperature.warning) {
      newAlerts.push({
        id: `temp-warning-${Date.now()}`,
        type: 'temperature',
        level: 'warning',
        message: `System temperature high: ${newMetrics.cpu.temperature}°C`,
        value: newMetrics.cpu.temperature,
        threshold: HEALTH_THRESHOLDS.temperature.warning,
        timestamp: new Date()
      })
    }

    if (newAlerts.length > 0) {
      setAlerts(prev => [...newAlerts, ...prev.slice(0, 10 - newAlerts.length)])
    }
  }

  const formatBytes = (bytes: number) => {
    if (bytes === 0) return '0 B'
    const k = 1024
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`
  }

  const getServiceIcon = (service: string) => {
    switch (service) {
      case 'database': return HardDrive
      case 'scanner': return Activity
      case 'websocket': return Zap
      case 'api': return Server
      default: return Activity
    }
  }

  const getServiceStatusColor = (status: string) => {
    switch (status) {
      case 'healthy': return 'text-green-500'
      case 'warning': return 'text-yellow-500'
      case 'critical': return 'text-red-500'
      default: return 'text-muted-foreground'
    }
  }

  const getServiceStatusBadge = (status: string) => {
    switch (status) {
      case 'healthy': return 'success'
      case 'warning': return 'warning'  
      case 'critical': return 'destructive'
      default: return 'secondary'
    }
  }

  const getUsageColor = (usage: number, type: 'cpu' | 'memory' | 'disk') => {
    const thresholds = HEALTH_THRESHOLDS[type]
    if (usage >= thresholds.critical) return 'text-red-500'
    if (usage >= thresholds.warning) return 'text-yellow-500'
    return 'text-green-500'
  }

  const getProgressColor = (usage: number, type: 'cpu' | 'memory' | 'disk') => {
    const thresholds = HEALTH_THRESHOLDS[type]
    if (usage >= thresholds.critical) return 'bg-red-500'
    if (usage >= thresholds.warning) return 'bg-yellow-500'
    return 'bg-green-500'
  }

  if (!metrics) {
    return (
      <Card className={className}>
        <CardContent className="flex items-center justify-center py-8">
          <div className="text-center">
            <Activity className={cn(
              'mx-auto h-8 w-8 mb-3',
              isConnected ? 'text-blue-500 animate-pulse' : 'text-muted-foreground'
            )} />
            <h3 className="text-lg font-semibold mb-1">
              {isConnected ? 'Loading system metrics...' : 'Connecting to system monitor...'}
            </h3>
            <p className="text-sm text-muted-foreground">
              Waiting for system health data
            </p>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className={cn('space-y-6', className)}>
      {/* System Overview */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Server className="h-5 w-5" />
              <span>System Health</span>
            </div>
            
            <div className="flex items-center space-x-2">
              <Badge variant={isConnected ? 'success' : 'destructive'} className="flex items-center space-x-1">
                {isConnected ? (
                  <CheckCircle className="h-3 w-3" />
                ) : (
                  <AlertTriangle className="h-3 w-3" />
                )}
                <span>{isConnected ? 'Connected' : 'Disconnected'}</span>
              </Badge>
              
              <Badge variant="outline" className="text-xs font-mono">
                {new Date(metrics.timestamp).toLocaleTimeString()}
              </Badge>
            </div>
          </CardTitle>
        </CardHeader>
        
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {/* CPU Usage */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <Cpu className="h-4 w-4 text-blue-500" />
                  <span className="text-sm font-medium">CPU</span>
                </div>
                <span className={cn('text-sm font-mono', getUsageColor(metrics.cpu.usage, 'cpu'))}>
                  {metrics.cpu.usage.toFixed(1)}%
                </span>
              </div>
              
              <Progress 
                value={metrics.cpu.usage} 
                className="h-2"
                style={{
                  '--progress-background': getProgressColor(metrics.cpu.usage, 'cpu')
                } as React.CSSProperties}
              />
              
              <div className="text-xs text-muted-foreground">
                {metrics.cpu.cores} cores
                {metrics.cpu.temperature && (
                  <span className="ml-2">• {metrics.cpu.temperature}°C</span>
                )}
              </div>
            </div>

            {/* Memory Usage */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <Memory className="h-4 w-4 text-purple-500" />
                  <span className="text-sm font-medium">Memory</span>
                </div>
                <span className={cn('text-sm font-mono', getUsageColor(metrics.memory.usage, 'memory'))}>
                  {metrics.memory.usage.toFixed(1)}%
                </span>
              </div>
              
              <Progress 
                value={metrics.memory.usage} 
                className="h-2"
                style={{
                  '--progress-background': getProgressColor(metrics.memory.usage, 'memory')
                } as React.CSSProperties}
              />
              
              <div className="text-xs text-muted-foreground">
                {formatBytes(metrics.memory.used)} / {formatBytes(metrics.memory.total)}
              </div>
            </div>

            {/* Disk Usage */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <HardDrive className="h-4 w-4 text-green-500" />
                  <span className="text-sm font-medium">Disk</span>
                </div>
                <span className={cn('text-sm font-mono', getUsageColor(metrics.disk.usage, 'disk'))}>
                  {metrics.disk.usage.toFixed(1)}%
                </span>
              </div>
              
              <Progress 
                value={metrics.disk.usage} 
                className="h-2"
                style={{
                  '--progress-background': getProgressColor(metrics.disk.usage, 'disk')
                } as React.CSSProperties}
              />
              
              <div className="text-xs text-muted-foreground">
                {formatBytes(metrics.disk.used)} / {formatBytes(metrics.disk.total)}
              </div>
            </div>

            {/* System Load */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <Gauge className="h-4 w-4 text-orange-500" />
                  <span className="text-sm font-medium">Load Avg</span>
                </div>
                <span className="text-sm font-mono">
                  {metrics.system.loadAverage[0]?.toFixed(2) || '0.00'}
                </span>
              </div>
              
              <div className="text-xs text-muted-foreground space-y-1">
                <div>1m: {metrics.system.loadAverage[0]?.toFixed(2) || '0.00'}</div>
                <div>5m: {metrics.system.loadAverage[1]?.toFixed(2) || '0.00'}</div>
                <div>15m: {metrics.system.loadAverage[2]?.toFixed(2) || '0.00'}</div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Services Status */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Activity className="h-5 w-5" />
            <span>Services Status</span>
          </CardTitle>
        </CardHeader>
        
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {Object.entries(metrics.services).map(([service, status]) => {
              const Icon = getServiceIcon(service)
              return (
                <div key={service} className="flex items-center space-x-3 p-3 bg-muted/30 rounded-lg">
                  <Icon className={cn('h-5 w-5', getServiceStatusColor(status))} />
                  <div className="flex-1">
                    <div className="text-sm font-medium capitalize">{service}</div>
                    <Badge 
                      variant={getServiceStatusBadge(status) as any} 
                      className="text-xs mt-1"
                    >
                      {status}
                    </Badge>
                  </div>
                </div>
              )
            })}
          </div>
        </CardContent>
      </Card>

      {/* Recent Alerts */}
      {alerts.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <AlertTriangle className="h-5 w-5" />
                <span>System Alerts</span>
              </div>
              
              <Badge variant="outline">
                {alerts.length} alert{alerts.length !== 1 ? 's' : ''}
              </Badge>
            </CardTitle>
          </CardHeader>
          
          <CardContent>
            <div className="space-y-2 max-h-64 overflow-y-auto">
              {alerts.slice(0, 10).map((alert) => (
                <div
                  key={alert.id}
                  className={cn(
                    'flex items-start space-x-3 p-3 rounded-lg border',
                    alert.level === 'critical' 
                      ? 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800'
                      : 'bg-yellow-50 dark:bg-yellow-900/20 border-yellow-200 dark:border-yellow-800'
                  )}
                >
                  <AlertTriangle className={cn(
                    'h-4 w-4 flex-shrink-0 mt-0.5',
                    alert.level === 'critical' ? 'text-red-500' : 'text-yellow-500'
                  )} />
                  
                  <div className="flex-1 min-w-0">
                    <p className={cn(
                      'text-sm font-medium',
                      alert.level === 'critical' 
                        ? 'text-red-700 dark:text-red-300'
                        : 'text-yellow-700 dark:text-yellow-300'
                    )}>
                      {alert.message}
                    </p>
                    
                    <div className="flex items-center space-x-2 mt-1">
                      <Badge 
                        variant={alert.level === 'critical' ? 'destructive' : 'warning'} 
                        className="text-xs"
                      >
                        {alert.level}
                      </Badge>
                      
                      <span className="text-xs text-muted-foreground">
                        {alert.timestamp.toLocaleTimeString()}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* System Information */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Clock className="h-5 w-5" />
            <span>System Information</span>
          </CardTitle>
        </CardHeader>
        
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="text-center p-3 bg-muted/30 rounded-lg">
              <Clock className="h-4 w-4 mx-auto mb-1 text-blue-500" />
              <p className="text-sm font-medium">{formatDuration(metrics.system.uptime * 1000)}</p>
              <p className="text-xs text-muted-foreground">Uptime</p>
            </div>
            
            <div className="text-center p-3 bg-muted/30 rounded-lg">
              <Activity className="h-4 w-4 mx-auto mb-1 text-green-500" />
              <p className="text-sm font-medium">{metrics.system.processes}</p>
              <p className="text-xs text-muted-foreground">Processes</p>
            </div>
            
            {metrics.system.temperature && (
              <div className="text-center p-3 bg-muted/30 rounded-lg">
                <Thermometer className="h-4 w-4 mx-auto mb-1 text-orange-500" />
                <p className="text-sm font-medium">{metrics.system.temperature}°C</p>
                <p className="text-xs text-muted-foreground">System Temp</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}