import { Card, CardContent, CardHeader, CardTitle, Badge, Button } from '@/components/ui'
import { formatRelativeTime, formatDuration, cn } from '@/lib/utils'
import { useSystemStatus, useSystemHealth, useStartScan, useStopScan } from '@/hooks/useApi'
import { useAppStore } from '@/store'
import {
  Activity,
  AlertTriangle,
  CheckCircle,
  Clock,
  Database,
  Play,
  Square,
  RefreshCw,
  HardDrive,
  Wifi,
  Shield,
  Zap,
  Calendar
} from 'lucide-react'

interface SystemStatusProps {
  className?: string
}

export function SystemStatus({ className }: SystemStatusProps) {
  const { data: systemStatus, isLoading } = useSystemStatus()
  const { data: health } = useSystemHealth()
  const { isScanning } = useAppStore()
  
  const { mutate: startScan, isPending: isStarting } = useStartScan()
  const { mutate: stopScan, isPending: isStopping } = useStopScan()

  const handleScanToggle = () => {
    if (isScanning) {
      stopScan()
    } else {
      startScan()
    }
  }

  if (isLoading) {
    return (
      <div className={cn('space-y-6', className)}>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="h-32 bg-muted rounded-lg animate-pulse" />
          ))}
        </div>
      </div>
    )
  }

  if (!systemStatus) {
    return (
      <Card className={className}>
        <CardContent className="flex items-center justify-center py-12">
          <div className="text-center">
            <AlertTriangle className="mx-auto h-12 w-12 text-red-500" />
            <h3 className="mt-4 text-lg font-semibold">System status unavailable</h3>
            <p className="text-muted-foreground">
              Unable to retrieve system information
            </p>
          </div>
        </CardContent>
      </Card>
    )
  }

  const systemHealthy = health?.status === 'healthy'
  const nextScanTime = systemStatus.nextScanTime ? new Date(systemStatus.nextScanTime) : null

  return (
    <div className={cn('space-y-6', className)}>
      {/* System Health Overview */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center space-x-2">
              <Activity className="h-5 w-5" />
              <span>System Status</span>
            </CardTitle>
            
            <div className="flex items-center space-x-2">
              <Badge 
                variant={systemHealthy ? 'success' : 'destructive'}
                className="flex items-center space-x-1"
              >
                {systemHealthy ? (
                  <CheckCircle className="h-3 w-3" />
                ) : (
                  <AlertTriangle className="h-3 w-3" />
                )}
                <span>{health?.status || 'unknown'}</span>
              </Badge>
              
              <Button
                onClick={handleScanToggle}
                disabled={isStarting || isStopping}
                size="sm"
                variant={isScanning ? "destructive" : "default"}
              >
                {isStarting || isStopping ? (
                  <RefreshCw className="h-4 w-4 animate-spin mr-2" />
                ) : isScanning ? (
                  <Square className="h-4 w-4 mr-2" />
                ) : (
                  <Play className="h-4 w-4 mr-2" />
                )}
                {isScanning ? 'Stop Scan' : 'Start Scan'}
              </Button>
            </div>
          </div>
        </CardHeader>
        
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="flex items-center space-x-3">
              <div className={cn(
                'p-2 rounded-lg',
                isScanning ? 'bg-blue-100 dark:bg-blue-900' : 'bg-gray-100 dark:bg-gray-800'
              )}>
                <Wifi className={cn(
                  'h-5 w-5',
                  isScanning ? 'text-blue-600 dark:text-blue-400' : 'text-gray-600 dark:text-gray-400'
                )} />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Scanner Status</p>
                <p className="font-medium">
                  {isScanning ? 'Active' : 'Idle'}
                </p>
              </div>
            </div>

            <div className="flex items-center space-x-3">
              <div className="p-2 rounded-lg bg-green-100 dark:bg-green-900">
                <Database className="h-5 w-5 text-green-600 dark:text-green-400" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Total Snapshots</p>
                <p className="font-medium">{systemStatus.totalSnapshots.toLocaleString()}</p>
              </div>
            </div>

            <div className="flex items-center space-x-3">
              <div className="p-2 rounded-lg bg-purple-100 dark:bg-purple-900">
                <HardDrive className="h-5 w-5 text-purple-600 dark:text-purple-400" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Database Size</p>
                <p className="font-medium">
                  {(systemStatus.databaseSize / (1024 * 1024)).toFixed(1)} MB
                </p>
              </div>
            </div>

            <div className="flex items-center space-x-3">
              <div className="p-2 rounded-lg bg-orange-100 dark:bg-orange-900">
                <Clock className="h-5 w-5 text-orange-600 dark:text-orange-400" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Uptime</p>
                <p className="font-medium">{formatDuration(systemStatus.uptime * 1000)}</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Scanning Status */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Shield className="h-5 w-5" />
              <span>Scanning Information</span>
            </CardTitle>
          </CardHeader>
          
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Current Status</span>
              <Badge variant={isScanning ? "default" : "outline"}>
                {isScanning ? 'Scanning in progress' : 'Idle'}
              </Badge>
            </div>

            {nextScanTime && (
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Next Scheduled Scan</span>
                <div className="text-sm font-medium">
                  {nextScanTime > new Date() ? (
                    <div className="flex items-center space-x-1">
                      <Calendar className="h-3 w-3" />
                      <span>{formatRelativeTime(nextScanTime)}</span>
                    </div>
                  ) : (
                    <Badge variant="warning">Overdue</Badge>
                  )}
                </div>
              </div>
            )}

            {systemStatus.nmapVersion && (
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Nmap Version</span>
                <Badge variant="outline" className="font-mono">
                  {systemStatus.nmapVersion}
                </Badge>
              </div>
            )}

            <div className="pt-2 border-t">
              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <span>Memory Usage (Node.js)</span>
                <div className="space-y-1 text-right">
                  <div>RSS: {(systemStatus.memoryUsage.rss / (1024 * 1024)).toFixed(1)} MB</div>
                  <div>Heap: {(systemStatus.memoryUsage.heapUsed / (1024 * 1024)).toFixed(1)} / {(systemStatus.memoryUsage.heapTotal / (1024 * 1024)).toFixed(1)} MB</div>
                  <div>External: {(systemStatus.memoryUsage.external / (1024 * 1024)).toFixed(1)} MB</div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* System Health Components */}
        {health && health.components && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Zap className="h-5 w-5" />
                <span>System Components</span>
              </CardTitle>
            </CardHeader>
            
            <CardContent>
              <div className="space-y-3">
                {health.components.map((component) => (
                  <div key={component.name} className="flex items-center justify-between p-3 border rounded-lg">
                    <div className="flex items-center space-x-3">
                      {component.healthy ? (
                        <CheckCircle className="h-5 w-5 text-green-500" />
                      ) : (
                        <AlertTriangle className="h-5 w-5 text-red-500" />
                      )}
                      
                      <div>
                        <p className="font-medium">{component.name}</p>
                        <p className="text-xs text-muted-foreground">
                          {component.message || component.status}
                        </p>
                      </div>
                    </div>
                    
                    <div className="text-right">
                      <Badge 
                        variant={component.healthy ? 'success' : 'destructive'} 
                        className="text-xs"
                      >
                        {component.status}
                      </Badge>
                      
                      {component.lastCheck && (
                        <p className="text-xs text-muted-foreground mt-1">
                          {formatRelativeTime(new Date(component.lastCheck * 1000))}
                        </p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Quick Actions */}
      <Card>
        <CardHeader>
          <CardTitle>Quick Actions</CardTitle>
        </CardHeader>
        
        <CardContent>
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" size="sm">
              <RefreshCw className="h-4 w-4 mr-2" />
              Refresh Status
            </Button>
            
            <Button variant="outline" size="sm">
              <Database className="h-4 w-4 mr-2" />
              View Logs
            </Button>
            
            <Button variant="outline" size="sm">
              <Activity className="h-4 w-4 mr-2" />
              System Metrics
            </Button>
            
            <Button variant="outline" size="sm">
              <Shield className="h-4 w-4 mr-2" />
              Security Report
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}