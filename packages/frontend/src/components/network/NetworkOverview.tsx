import { Card, CardContent, CardHeader, CardTitle, Badge } from '@/components/ui'
import { cn } from '@/lib/utils'
import type { NetworkStatus, Device } from '@nmapper/shared'
import {
  Wifi,
  WifiOff,
  Shield,
  AlertTriangle,
  CheckCircle,
  Server,
  Monitor,
  Smartphone,
  Router
} from 'lucide-react'

interface NetworkOverviewProps {
  networkStatus?: NetworkStatus
  devices?: Device[]
  className?: string
}

export function NetworkOverview({ networkStatus, devices = [], className }: NetworkOverviewProps) {
  // Calculate statistics
  const stats = {
    total: devices.length,
    online: devices.filter(d => d.isActive).length,
    offline: devices.filter(d => !d.isActive).length,
    highRisk: devices.filter(d => d.riskLevel === 'high').length,
    mediumRisk: devices.filter(d => d.riskLevel === 'medium').length,
    lowRisk: devices.filter(d => d.riskLevel === 'low').length,
    openPorts: devices.reduce((sum, d) => sum + (d.ports?.filter(p => p.state === 'open').length || 0), 0),
    services: devices.reduce((sum, d) => sum + (d.services?.length || 0), 0)
  }

  // Device type breakdown
  const deviceTypes = devices.reduce((acc, device) => {
    const type = device.deviceType || 'unknown'
    acc[type] = (acc[type] || 0) + 1
    return acc
  }, {} as Record<string, number>)

  // Vendor breakdown (top 5)
  const vendors = devices.reduce((acc, device) => {
    if (device.vendor) {
      acc[device.vendor] = (acc[device.vendor] || 0) + 1
    }
    return acc
  }, {} as Record<string, number>)

  const topVendors = Object.entries(vendors)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 5)

  function getDeviceTypeIcon(type: string) {
    const lowerType = type.toLowerCase()
    if (lowerType.includes('server')) return Server
    if (lowerType.includes('router') || lowerType.includes('network')) return Router
    if (lowerType.includes('mobile') || lowerType.includes('phone')) return Smartphone
    return Monitor
  }

  return (
    <div className={cn('space-y-6', className)}>
      {/* Main Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Total Devices</p>
                <p className="text-2xl font-bold">{stats.total}</p>
              </div>
              <Monitor className="h-8 w-8 text-muted-foreground" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Online</p>
                <p className="text-2xl font-bold text-green-600">{stats.online}</p>
              </div>
              <Wifi className="h-8 w-8 text-green-500" />
            </div>
            <div className="mt-2">
              <Badge variant="success" className="text-xs">
                {stats.total > 0 ? Math.round((stats.online / stats.total) * 100) : 0}% uptime
              </Badge>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Offline</p>
                <p className="text-2xl font-bold text-red-600">{stats.offline}</p>
              </div>
              <WifiOff className="h-8 w-8 text-red-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">High Risk</p>
                <p className="text-2xl font-bold text-red-600">{stats.highRisk}</p>
              </div>
              <AlertTriangle className="h-8 w-8 text-red-500" />
            </div>
            {stats.mediumRisk > 0 && (
              <div className="mt-2">
                <Badge variant="warning" className="text-xs">
                  {stats.mediumRisk} medium risk
                </Badge>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Secondary Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Shield className="h-5 w-5" />
              <span>Security Overview</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-sm">Open Ports</span>
              <Badge variant="outline">{stats.openPorts}</Badge>
            </div>
            
            <div className="flex items-center justify-between">
              <span className="text-sm">Running Services</span>
              <Badge variant="outline">{stats.services}</Badge>
            </div>

            <div className="space-y-2">
              <div className="text-sm font-medium">Risk Distribution</div>
              <div className="flex space-x-2">
                <Badge variant="success" className="flex-1 justify-center">
                  Low: {stats.lowRisk}
                </Badge>
                <Badge variant="warning" className="flex-1 justify-center">
                  Med: {stats.mediumRisk}
                </Badge>
                <Badge variant="destructive" className="flex-1 justify-center">
                  High: {stats.highRisk}
                </Badge>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Device Types</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {Object.entries(deviceTypes)
                .sort(([, a], [, b]) => b - a)
                .map(([type, count]) => {
                  const Icon = getDeviceTypeIcon(type)
                  const percentage = Math.round((count / stats.total) * 100)
                  
                  return (
                    <div key={type} className="flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        <Icon className="h-4 w-4 text-muted-foreground" />
                        <span className="text-sm capitalize">{type}</span>
                      </div>
                      <div className="flex items-center space-x-2">
                        <span className="text-sm text-muted-foreground">{percentage}%</span>
                        <Badge variant="outline" className="text-xs">{count}</Badge>
                      </div>
                    </div>
                  )
                })}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Vendor Breakdown */}
      {topVendors.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Top Vendors</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {topVendors.map(([vendor, count]) => {
                const percentage = Math.round((count / stats.total) * 100)
                
                return (
                  <div key={vendor} className="flex items-center justify-between">
                    <span className="text-sm font-medium">{vendor}</span>
                    <div className="flex items-center space-x-2">
                      <span className="text-sm text-muted-foreground">{percentage}%</span>
                      <Badge variant="outline" className="text-xs">{count} devices</Badge>
                    </div>
                  </div>
                )
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Network Status */}
      {networkStatus && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span>Network Status</span>
              <Badge variant={networkStatus.isScanning ? "default" : "outline"}>
                {networkStatus.isScanning ? "Scanning..." : "Idle"}
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
              <div>
                <span className="text-muted-foreground">Total Snapshots</span>
                <p className="font-medium">{networkStatus.totalSnapshots}</p>
              </div>
              
              <div>
                <span className="text-muted-foreground">Database Size</span>
                <p className="font-medium">{(networkStatus.databaseSize / (1024 * 1024)).toFixed(1)} MB</p>
              </div>
              
              <div>
                <span className="text-muted-foreground">System Uptime</span>
                <p className="font-medium">{Math.floor(networkStatus.uptime / 3600)}h</p>
              </div>
              
              {networkStatus.nmapVersion && (
                <div>
                  <span className="text-muted-foreground">Nmap Version</span>
                  <p className="font-medium">{networkStatus.nmapVersion}</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}