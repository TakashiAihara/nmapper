import { Card, CardContent, CardHeader, CardTitle, Badge, Progress } from '@/components/ui'
import { formatBytes, formatDuration, cn } from '@/lib/utils'
import { useSystemMetrics, useSystemHealth } from '@/hooks/useApi'
import {
  Activity,
  Cpu,
  HardDrive,
  MemoryStick,
  Network,
  Clock,
  Zap,
  AlertTriangle,
  CheckCircle,
  TrendingUp,
  TrendingDown
} from 'lucide-react'

interface SystemMetricsProps {
  className?: string
}

// Mock system metrics data structure
interface SystemMetrics {
  timestamp: Date
  cpu: {
    usage: number
    loadAverage: number[]
    cores: number
  }
  memory: {
    used: number
    total: number
    free: number
    cached: number
    buffers: number
  }
  disk: {
    used: number
    total: number
    free: number
    iops: {
      read: number
      write: number
    }
  }
  network: {
    bytesIn: number
    bytesOut: number
    packetsIn: number
    packetsOut: number
    connections: number
  }
  process: {
    uptime: number
    pid: number
    heapUsed: number
    heapTotal: number
    rss: number
  }
}

export function SystemMetrics({ className }: SystemMetricsProps) {
  const { data: metrics, isLoading } = useSystemMetrics()
  const { data: health } = useSystemHealth()

  // Mock data for demonstration
  const mockMetrics: SystemMetrics = {
    timestamp: new Date(),
    cpu: {
      usage: 45.2,
      loadAverage: [1.2, 1.5, 1.8],
      cores: 8
    },
    memory: {
      used: 6.4 * 1024 * 1024 * 1024,
      total: 16 * 1024 * 1024 * 1024,
      free: 9.6 * 1024 * 1024 * 1024,
      cached: 2.1 * 1024 * 1024 * 1024,
      buffers: 0.5 * 1024 * 1024 * 1024
    },
    disk: {
      used: 180 * 1024 * 1024 * 1024,
      total: 500 * 1024 * 1024 * 1024,
      free: 320 * 1024 * 1024 * 1024,
      iops: {
        read: 125,
        write: 89
      }
    },
    network: {
      bytesIn: 1.2 * 1024 * 1024,
      bytesOut: 2.5 * 1024 * 1024,
      packetsIn: 1250,
      packetsOut: 980,
      connections: 45
    },
    process: {
      uptime: 24 * 60 * 60 * 1000, // 24 hours
      pid: 1234,
      heapUsed: 128 * 1024 * 1024,
      heapTotal: 256 * 1024 * 1024,
      rss: 512 * 1024 * 1024
    }
  }

  const systemMetrics = mockMetrics

  const cpuUsageColor = systemMetrics.cpu.usage > 80 ? 'text-red-500' : 
                       systemMetrics.cpu.usage > 60 ? 'text-yellow-500' : 'text-green-500'
  
  const memoryUsagePercent = (systemMetrics.memory.used / systemMetrics.memory.total) * 100
  const memoryUsageColor = memoryUsagePercent > 80 ? 'text-red-500' : 
                          memoryUsagePercent > 60 ? 'text-yellow-500' : 'text-green-500'
  
  const diskUsagePercent = (systemMetrics.disk.used / systemMetrics.disk.total) * 100
  const diskUsageColor = diskUsagePercent > 80 ? 'text-red-500' : 
                        diskUsagePercent > 60 ? 'text-yellow-500' : 'text-green-500'

  if (isLoading) {
    return (
      <div className={cn('space-y-6', className)}>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-32 bg-muted rounded-lg animate-pulse" />
          ))}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-64 bg-muted rounded-lg animate-pulse" />
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className={cn('space-y-6', className)}>
      {/* System Health Status */}
      {health && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span className="flex items-center space-x-2">
                <Activity className="h-5 w-5" />
                <span>System Health</span>
              </span>
              <Badge 
                variant={health.status === 'healthy' ? 'success' : 
                        health.status === 'degraded' ? 'warning' : 'destructive'}
              >
                {health.status}
              </Badge>
            </CardTitle>
          </CardHeader>
          
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {health.components?.map((component) => (
                <div key={component.name} className="flex items-center justify-between">
                  <span className="text-sm">{component.name}</span>
                  <div className="flex items-center space-x-1">
                    {component.healthy ? (
                      <CheckCircle className="h-4 w-4 text-green-500" />
                    ) : (
                      <AlertTriangle className="h-4 w-4 text-red-500" />
                    )}
                    <span className="text-xs text-muted-foreground">
                      {component.status}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Key Metrics Overview */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">CPU Usage</p>
                <p className={cn('text-2xl font-bold', cpuUsageColor)}>
                  {systemMetrics.cpu.usage.toFixed(1)}%
                </p>
              </div>
              <Cpu className="h-8 w-8 text-muted-foreground" />
            </div>
            <div className="mt-2">
              <Progress value={systemMetrics.cpu.usage} className="h-2" />
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Load: {systemMetrics.cpu.loadAverage[0].toFixed(2)}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Memory</p>
                <p className={cn('text-2xl font-bold', memoryUsageColor)}>
                  {memoryUsagePercent.toFixed(1)}%
                </p>
              </div>
              <MemoryStick className="h-8 w-8 text-muted-foreground" />
            </div>
            <div className="mt-2">
              <Progress value={memoryUsagePercent} className="h-2" />
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {formatBytes(systemMetrics.memory.used)} / {formatBytes(systemMetrics.memory.total)}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Disk Usage</p>
                <p className={cn('text-2xl font-bold', diskUsageColor)}>
                  {diskUsagePercent.toFixed(1)}%
                </p>
              </div>
              <HardDrive className="h-8 w-8 text-muted-foreground" />
            </div>
            <div className="mt-2">
              <Progress value={diskUsagePercent} className="h-2" />
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {formatBytes(systemMetrics.disk.used)} / {formatBytes(systemMetrics.disk.total)}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Uptime</p>
                <p className="text-2xl font-bold">
                  {formatDuration(systemMetrics.process.uptime)}
                </p>
              </div>
              <Clock className="h-8 w-8 text-muted-foreground" />
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              PID: {systemMetrics.process.pid}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Detailed Metrics */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* CPU Details */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Cpu className="h-5 w-5" />
              <span>CPU Performance</span>
            </CardTitle>
          </CardHeader>
          
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-muted-foreground">Current Usage</p>
                <p className={cn('text-xl font-bold', cpuUsageColor)}>
                  {systemMetrics.cpu.usage.toFixed(1)}%
                </p>
              </div>
              
              <div>
                <p className="text-sm text-muted-foreground">CPU Cores</p>
                <p className="text-xl font-bold">{systemMetrics.cpu.cores}</p>
              </div>
            </div>

            <div>
              <p className="text-sm text-muted-foreground mb-2">Load Average</p>
              <div className="grid grid-cols-3 gap-2">
                {['1m', '5m', '15m'].map((period, index) => (
                  <div key={period} className="text-center p-2 bg-muted rounded">
                    <p className="text-xs text-muted-foreground">{period}</p>
                    <p className="font-medium">
                      {systemMetrics.cpu.loadAverage[index]?.toFixed(2) || 0}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Memory Details */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <MemoryStick className="h-5 w-5" />
              <span>Memory Usage</span>
            </CardTitle>
          </CardHeader>
          
          <CardContent className="space-y-4">
            <div>
              <div className="flex justify-between text-sm mb-1">
                <span>Used</span>
                <span>{formatBytes(systemMetrics.memory.used)}</span>
              </div>
              <Progress value={memoryUsagePercent} className="h-2" />
            </div>

            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <p className="text-muted-foreground">Total</p>
                <p className="font-medium">{formatBytes(systemMetrics.memory.total)}</p>
              </div>
              
              <div>
                <p className="text-muted-foreground">Free</p>
                <p className="font-medium">{formatBytes(systemMetrics.memory.free)}</p>
              </div>
              
              <div>
                <p className="text-muted-foreground">Cached</p>
                <p className="font-medium">{formatBytes(systemMetrics.memory.cached)}</p>
              </div>
              
              <div>
                <p className="text-muted-foreground">Buffers</p>
                <p className="font-medium">{formatBytes(systemMetrics.memory.buffers)}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Disk I/O */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <HardDrive className="h-5 w-5" />
              <span>Disk Performance</span>
            </CardTitle>
          </CardHeader>
          
          <CardContent className="space-y-4">
            <div>
              <div className="flex justify-between text-sm mb-1">
                <span>Disk Usage</span>
                <span>{formatBytes(systemMetrics.disk.used)}</span>
              </div>
              <Progress value={diskUsagePercent} className="h-2" />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-muted-foreground">Read IOPS</p>
                <div className="flex items-center space-x-2">
                  <TrendingUp className="h-4 w-4 text-green-500" />
                  <span className="font-medium">{systemMetrics.disk.iops.read}</span>
                </div>
              </div>
              
              <div>
                <p className="text-sm text-muted-foreground">Write IOPS</p>
                <div className="flex items-center space-x-2">
                  <TrendingDown className="h-4 w-4 text-blue-500" />
                  <span className="font-medium">{systemMetrics.disk.iops.write}</span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Network Activity */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Network className="h-5 w-5" />
              <span>Network Activity</span>
            </CardTitle>
          </CardHeader>
          
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-muted-foreground">Bytes In</p>
                <div className="flex items-center space-x-2">
                  <TrendingUp className="h-4 w-4 text-green-500" />
                  <span className="font-medium">
                    {formatBytes(systemMetrics.network.bytesIn)}
                  </span>
                </div>
              </div>
              
              <div>
                <p className="text-sm text-muted-foreground">Bytes Out</p>
                <div className="flex items-center space-x-2">
                  <TrendingDown className="h-4 w-4 text-blue-500" />
                  <span className="font-medium">
                    {formatBytes(systemMetrics.network.bytesOut)}
                  </span>
                </div>
              </div>
              
              <div>
                <p className="text-sm text-muted-foreground">Packets In</p>
                <span className="font-medium">
                  {systemMetrics.network.packetsIn.toLocaleString()}
                </span>
              </div>
              
              <div>
                <p className="text-sm text-muted-foreground">Packets Out</p>
                <span className="font-medium">
                  {systemMetrics.network.packetsOut.toLocaleString()}
                </span>
              </div>
            </div>

            <div>
              <p className="text-sm text-muted-foreground">Active Connections</p>
              <div className="flex items-center space-x-2 mt-1">
                <Zap className="h-4 w-4 text-yellow-500" />
                <span className="text-lg font-bold">
                  {systemMetrics.network.connections}
                </span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}