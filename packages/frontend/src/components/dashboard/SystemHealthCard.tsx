import { useState, useMemo } from 'react'
import { Card, CardContent, CardHeader, CardTitle, Button, Badge } from '@/components/ui'
import { useSystemHealth, useSystemStatistics } from '@/hooks'
import { useSystemStore, systemSelectors } from '@/store'
import { LoadingSpinner, ErrorState } from '@/components/common'
import { formatDuration, cn } from '@/lib/utils'
import {
  Activity,
  Cpu,
  HardDrive,
  Memory,
  Zap,
  Server,
  Database,
  Wifi,
  AlertTriangle,
  CheckCircle,
  RefreshCw,
  Settings,
  TrendingUp,
  TrendingDown,
  Thermometer,
  Clock,
  BarChart3
} from 'lucide-react'

interface SystemHealthCardProps {
  className?: string
  showDetails?: boolean
}

export function SystemHealthCard({ 
  className, 
  showDetails = false 
}: SystemHealthCardProps) {
  const { 
    data: health, 
    isLoading: healthLoading, 
    error: healthError 
  } = useSystemHealth({ refetchInterval: 30000 })
  
  const { 
    data: statistics, 
    isLoading: statsLoading 
  } = useSystemStatistics({ refetchInterval: 60000 })

  const { 
    alerts, 
    unacknowledgedAlerts,
    acknowledgeAllCritical 
  } = useSystemStore()

  const [showAllServices, setShowAllServices] = useState(false)

  // Calculate overall system health
  const systemHealth = useMemo(() => {
    if (!health) return 'unknown'
    
    return systemSelectors.getSystemHealthStatus(
      health.services,
      {
        cpu: health.cpu,
        memory: health.memory,
        disk: health.disk,
        uptime: health.uptime || 0,
        loadAverage: [0, 0, 0], // Simplified for now
        processes: 0,
        network: { bytesIn: 0, bytesOut: 0, packetsIn: 0, packetsOut: 0 }
      }
    )
  }, [health])

  // Get critical alerts
  const criticalAlerts = useMemo(() => {
    return systemSelectors.getCriticalAlerts(alerts)
  }, [alerts])

  const getHealthColor = (status: string) => {
    switch (status) {
      case 'healthy': return 'text-green-500'
      case 'warning': return 'text-yellow-500'
      case 'critical': return 'text-red-500'
      default: return 'text-gray-500'
    }
  }

  const getHealthBadge = (status: string) => {
    switch (status) {
      case 'healthy': return 'success'
      case 'warning': return 'warning'
      case 'critical': return 'destructive'
      default: return 'secondary'
    }
  }

  const getUsageColor = (usage: number, type: 'cpu' | 'memory' | 'disk') => {
    const thresholds = { cpu: [75, 90], memory: [80, 95], disk: [85, 95] }[type]
    if (usage >= thresholds[1]) return 'text-red-500'
    if (usage >= thresholds[0]) return 'text-yellow-500'
    return 'text-green-500'
  }

  const getProgressColor = (usage: number, type: 'cpu' | 'memory' | 'disk') => {
    const thresholds = { cpu: [75, 90], memory: [80, 95], disk: [85, 95] }[type]
    if (usage >= thresholds[1]) return 'bg-red-500'
    if (usage >= thresholds[0]) return 'bg-yellow-500'
    return 'bg-green-500'
  }

  const formatBytes = (bytes: number) => {
    if (bytes === 0) return '0 B'
    const k = 1024
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`
  }

  if (healthError) {
    return (
      <Card className={className}>
        <ErrorState
          type="database"
          title="System Health Unavailable"
          description="Unable to load system health information"
          size="sm"
        />
      </Card>
    )
  }

  const isLoading = healthLoading || statsLoading

  return (
    <Card className={className}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center space-x-2">
            <Server className="h-5 w-5" />
            <span>System Health</span>
            {isLoading && <LoadingSpinner size="sm" />}
          </CardTitle>
          
          <div className="flex items-center space-x-2">
            {/* Overall Health Status */}
            <Badge variant={getHealthBadge(systemHealth) as any}>
              {systemHealth === 'healthy' ? (
                <CheckCircle className="h-3 w-3 mr-1" />
              ) : (
                <AlertTriangle className="h-3 w-3 mr-1" />
              )}
              {systemHealth}
            </Badge>

            {/* Critical Alerts Indicator */}
            {unacknowledgedAlerts > 0 && (
              <Badge variant="destructive" className="animate-pulse">
                {unacknowledgedAlerts} alerts
              </Badge>
            )}

            {/* Refresh Button */}
            <Button variant="ghost" size="sm" disabled={isLoading}>
              <RefreshCw className={cn('h-4 w-4', isLoading && 'animate-spin')} />
            </Button>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-6">
        {/* System Resource Metrics */}
        {health && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* CPU Usage */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <Cpu className="h-4 w-4 text-blue-500" />
                  <span className="text-sm font-medium">CPU</span>
                </div>
                <span className={cn('text-sm font-mono', getUsageColor(health.cpu.usage, 'cpu'))}>
                  {health.cpu.usage.toFixed(1)}%
                </span>
              </div>
              
              <div className="w-full bg-muted rounded-full h-2">
                <div
                  className={cn('h-2 rounded-full transition-all duration-300', getProgressColor(health.cpu.usage, 'cpu'))}
                  style={{ width: `${health.cpu.usage}%` }}
                />
              </div>
              
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>{health.cpu.cores} cores</span>
                {health.cpu.temperature && (
                  <span className="flex items-center space-x-1">
                    <Thermometer className="h-3 w-3" />
                    <span>{health.cpu.temperature}°C</span>
                  </span>
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
                <span className={cn('text-sm font-mono', getUsageColor(health.memory.usage, 'memory'))}>
                  {health.memory.usage.toFixed(1)}%
                </span>
              </div>
              
              <div className="w-full bg-muted rounded-full h-2">
                <div
                  className={cn('h-2 rounded-full transition-all duration-300', getProgressColor(health.memory.usage, 'memory'))}
                  style={{ width: `${health.memory.usage}%` }}
                />
              </div>
              
              <div className="text-xs text-muted-foreground">
                {formatBytes(health.memory.used)} / {formatBytes(health.memory.total)}
              </div>
            </div>

            {/* Disk Usage */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <HardDrive className="h-4 w-4 text-green-500" />
                  <span className="text-sm font-medium">Disk</span>
                </div>
                <span className={cn('text-sm font-mono', getUsageColor(health.disk.usage, 'disk'))}>
                  {health.disk.usage.toFixed(1)}%
                </span>
              </div>
              
              <div className="w-full bg-muted rounded-full h-2">
                <div
                  className={cn('h-2 rounded-full transition-all duration-300', getProgressColor(health.disk.usage, 'disk'))}
                  style={{ width: `${health.disk.usage}%` }}
                />
              </div>
              
              <div className="text-xs text-muted-foreground">
                {formatBytes(health.disk.used)} / {formatBytes(health.disk.total)}
              </div>
            </div>
          </div>
        )}

        {/* Services Status */}
        {health?.services && (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="text-sm font-medium flex items-center space-x-2">
                <Activity className="h-4 w-4" />
                <span>Services Status</span>
              </h4>
              {Object.keys(health.services).length > 4 && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowAllServices(!showAllServices)}
                  className="text-xs"
                >
                  {showAllServices ? 'Show Less' : `Show All ${Object.keys(health.services).length}`}
                </Button>
              )}
            </div>
            
            <div className="grid grid-cols-2 gap-3">
              {Object.entries(health.services)
                .slice(0, showAllServices ? undefined : 4)
                .map(([service, status]) => {
                const Icon = {
                  database: Database,
                  scanner: Activity,
                  websocket: Wifi,
                  api: Server
                }[service] || Server

                return (
                  <div key={service} className="flex items-center space-x-3 p-2 border rounded">
                    <Icon className={cn('h-4 w-4', getHealthColor(status))} />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium capitalize truncate">{service}</p>
                      <Badge
                        variant={getHealthBadge(status) as any}
                        className="text-xs"
                      >
                        {status}
                      </Badge>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {/* Critical Alerts */}
        {criticalAlerts.length > 0 && (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="text-sm font-medium flex items-center space-x-2 text-red-600">
                <AlertTriangle className="h-4 w-4" />
                <span>Critical Alerts ({criticalAlerts.length})</span>
              </h4>
              <Button
                variant="outline"
                size="sm"
                onClick={acknowledgeAllCritical}
                className="text-xs"
              >
                Acknowledge All
              </Button>
            </div>
            
            <div className="space-y-2 max-h-32 overflow-y-auto">
              {criticalAlerts.slice(0, 3).map((alert) => (
                <div key={alert.id} className="flex items-start space-x-2 p-2 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded">
                  <AlertTriangle className="h-4 w-4 text-red-500 flex-shrink-0 mt-0.5" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-red-700 dark:text-red-300">
                      {alert.title}
                    </p>
                    <p className="text-xs text-red-600 dark:text-red-400">
                      {alert.message}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {alert.timestamp.toLocaleTimeString()}
                    </p>
                  </div>
                </div>
              ))}
              {criticalAlerts.length > 3 && (
                <p className="text-xs text-muted-foreground text-center">
                  +{criticalAlerts.length - 3} more critical alerts
                </p>
              )}
            </div>
          </div>
        )}

        {/* System Statistics */}
        {statistics && showDetails && (
          <div className="space-y-3">
            <h4 className="text-sm font-medium flex items-center space-x-2">
              <BarChart3 className="h-4 w-4" />
              <span>System Statistics</span>
            </h4>
            
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <div className="text-center p-2 bg-muted/30 rounded">
                <Clock className="h-4 w-4 mx-auto mb-1 text-blue-500" />
                <p className="text-sm font-bold">
                  {health?.uptime ? formatDuration(health.uptime * 1000) : 'Unknown'}
                </p>
                <p className="text-xs text-muted-foreground">Uptime</p>
              </div>
              
              <div className="text-center p-2 bg-muted/30 rounded">
                <Activity className="h-4 w-4 mx-auto mb-1 text-green-500" />
                <p className="text-sm font-bold">{statistics.totalScans}</p>
                <p className="text-xs text-muted-foreground">Total Scans</p>
              </div>
              
              <div className="text-center p-2 bg-muted/30 rounded">
                <Database className="h-4 w-4 mx-auto mb-1 text-purple-500" />
                <p className="text-sm font-bold">
                  {formatBytes(statistics.databaseSize || 0)}
                </p>
                <p className="text-xs text-muted-foreground">DB Size</p>
              </div>
              
              <div className="text-center p-2 bg-muted/30 rounded">
                <AlertTriangle className="h-4 w-4 mx-auto mb-1 text-orange-500" />
                <p className="text-sm font-bold">{statistics.alertCount || 0}</p>
                <p className="text-xs text-muted-foreground">Active Alerts</p>
              </div>
            </div>
          </div>
        )}

        {/* System Information */}
        {health && (
          <div className="space-y-3">
            <h4 className="text-sm font-medium flex items-center space-x-2">
              <Server className="h-4 w-4" />
              <span>System Information</span>
            </h4>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">CPU Cores:</span>
                  <span className="font-mono">{health.cpu.cores}</span>
                </div>
                {health.cpu.frequency && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">CPU Frequency:</span>
                    <span className="font-mono">{health.cpu.frequency} MHz</span>
                  </div>
                )}
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Total Memory:</span>
                  <span className="font-mono">{formatBytes(health.memory.total)}</span>
                </div>
              </div>
              
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Available Memory:</span>
                  <span className="font-mono">{formatBytes(health.memory.available)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Total Disk:</span>
                  <span className="font-mono">{formatBytes(health.disk.total)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Available Disk:</span>
                  <span className="font-mono">{formatBytes(health.disk.available)}</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Quick Actions */}
        <div className="flex flex-wrap gap-2 pt-3 border-t">
          <Button variant="outline" size="sm" className="text-xs">
            <BarChart3 className="h-3 w-3 mr-1" />
            View Metrics
          </Button>
          <Button variant="outline" size="sm" className="text-xs">
            <AlertTriangle className="h-3 w-3 mr-1" />
            All Alerts
          </Button>
          <Button variant="outline" size="sm" className="text-xs">
            <Settings className="h-3 w-3 mr-1" />
            System Settings
          </Button>
          {criticalAlerts.length > 0 && (
            <Button variant="destructive" size="sm" className="text-xs">
              <Zap className="h-3 w-3 mr-1" />
              Emergency Mode
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  )
}