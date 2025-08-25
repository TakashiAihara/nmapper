import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle, Button, Badge } from '@/components/ui'
import { useDeviceDetails, useDeviceActions } from '@/hooks'
import { LoadingState, ErrorState } from '@/components/common'
import { cn } from '@/lib/utils'
import type { Device } from '@nmapper/shared'
import {
  Monitor,
  Router,
  Server,
  Printer,
  Smartphone,
  Wifi,
  MapPin,
  Calendar,
  Clock,
  Network,
  Shield,
  AlertTriangle,
  CheckCircle,
  Copy,
  RefreshCw,
  Settings,
  Edit2,
  MoreHorizontal,
  Globe,
  Fingerprint,
  Cpu,
  HardDrive,
  MemoryStick,
  Activity,
  Eye,
  EyeOff,
  ExternalLink
} from 'lucide-react'

interface DeviceInfoCardProps {
  deviceId: string
  onRefresh?: () => void
  onEdit?: (device: Device) => void
  className?: string
}

export function DeviceInfoCard({ deviceId, onRefresh, onEdit, className }: DeviceInfoCardProps) {
  const { data: device, isLoading, error, refetch } = useDeviceDetails(deviceId)
  const { updateDevice, scanDevice } = useDeviceActions()
  
  const [isScanning, setIsScanning] = useState(false)
  const [showAdvanced, setShowAdvanced] = useState(false)
  const [showSensitive, setShowSensitive] = useState(false)

  const deviceTypeIcons = {
    computer: Monitor,
    router: Router,
    switch: Wifi,
    printer: Printer,
    phone: Smartphone,
    server: Server
  }

  const getDeviceIcon = (type: string) => {
    return deviceTypeIcons[type as keyof typeof deviceTypeIcons] || Monitor
  }

  const getStatusColor = (status: string) => {
    switch (status?.toLowerCase()) {
      case 'online': return 'text-green-500'
      case 'offline': return 'text-red-500'
      case 'warning': return 'text-yellow-500'
      default: return 'text-gray-500'
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status?.toLowerCase()) {
      case 'online': return CheckCircle
      case 'offline': return AlertTriangle
      case 'warning': return AlertTriangle
      default: return Clock
    }
  }

  const handleManualScan = async () => {
    if (!device) return
    
    setIsScanning(true)
    try {
      await scanDevice(device.ip)
      await refetch()
      onRefresh?.()
    } finally {
      setIsScanning(false)
    }
  }

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text)
  }

  const formatUptime = (seconds: number) => {
    const days = Math.floor(seconds / 86400)
    const hours = Math.floor((seconds % 86400) / 3600)
    const minutes = Math.floor((seconds % 3600) / 60)
    
    if (days > 0) return `${days}d ${hours}h ${minutes}m`
    if (hours > 0) return `${hours}h ${minutes}m`
    return `${minutes}m`
  }

  const formatBytes = (bytes: number) => {
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB']
    if (bytes === 0) return '0 B'
    const i = Math.floor(Math.log(bytes) / Math.log(1024))
    return `${Math.round(bytes / Math.pow(1024, i) * 100) / 100} ${sizes[i]}`
  }

  if (isLoading) {
    return (
      <Card className={cn('h-full', className)}>
        <LoadingState
          type="card"
          icon="device"
          title="Loading Device Information"
          description="Fetching device details and system information..."
        />
      </Card>
    )
  }

  if (error || !device) {
    return (
      <Card className={cn('h-full', className)}>
        <ErrorState
          type="device"
          title="Device Not Found"
          description="Unable to load device information. The device may have been removed or is no longer accessible."
          onAction={() => refetch()}
        />
      </Card>
    )
  }

  const DeviceIcon = getDeviceIcon(device.deviceType || 'computer')
  const StatusIcon = getStatusIcon(device.status || 'unknown')

  return (
    <Card className={cn('h-full', className)}>
      <CardHeader className="pb-4">
        <div className="flex items-start justify-between">
          <div className="flex items-center space-x-3">
            <div className="relative">
              <DeviceIcon className="h-8 w-8 text-primary" />
              <StatusIcon className={cn('h-4 w-4 absolute -bottom-1 -right-1', getStatusColor(device.status || 'unknown'))} />
            </div>
            <div>
              <CardTitle className="text-lg">
                {device.hostname || device.ip}
              </CardTitle>
              <div className="flex items-center space-x-2 text-sm text-muted-foreground">
                <span>{device.ip}</span>
                {device.mac && (
                  <>
                    <span>•</span>
                    <span>{device.mac}</span>
                  </>
                )}
              </div>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleManualScan}
              disabled={isScanning}
            >
              <RefreshCw className={cn('h-4 w-4', isScanning && 'animate-spin')} />
            </Button>
            
            {onEdit && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => onEdit(device)}
              >
                <Edit2 className="h-4 w-4" />
              </Button>
            )}
            
            <Button variant="ghost" size="sm">
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Status and Type Badges */}
        <div className="flex flex-wrap gap-2">
          <Badge variant={device.status === 'online' ? 'default' : 'secondary'}>
            <StatusIcon className={cn('h-3 w-3 mr-1', getStatusColor(device.status || 'unknown'))} />
            {device.status || 'Unknown'}
          </Badge>
          
          <Badge variant="outline">
            <DeviceIcon className="h-3 w-3 mr-1" />
            {device.deviceType || 'Unknown Type'}
          </Badge>
          
          {device.vendor && (
            <Badge variant="outline">
              {device.vendor}
            </Badge>
          )}
          
          {device.osInfo?.name && (
            <Badge variant="outline">
              {device.osInfo.name}
            </Badge>
          )}
        </div>
      </CardHeader>

      <CardContent className="space-y-6">
        {/* Basic Information */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-3">
            <h4 className="text-sm font-semibold text-muted-foreground">Network Information</h4>
            
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">IP Address</span>
                <div className="flex items-center space-x-2">
                  <span className="text-sm font-mono">{device.ip}</span>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => copyToClipboard(device.ip)}
                    className="h-6 w-6 p-0"
                  >
                    <Copy className="h-3 w-3" />
                  </Button>
                </div>
              </div>

              {device.mac && (
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">MAC Address</span>
                  <div className="flex items-center space-x-2">
                    <span className="text-sm font-mono">{showSensitive ? device.mac : '••:••:••:••:••:••'}</span>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setShowSensitive(!showSensitive)}
                      className="h-6 w-6 p-0"
                    >
                      {showSensitive ? <EyeOff className="h-3 w-3" /> : <Eye className="h-3 w-3" />}
                    </Button>
                  </div>
                </div>
              )}

              {device.hostname && device.hostname !== device.ip && (
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Hostname</span>
                  <span className="text-sm font-mono">{device.hostname}</span>
                </div>
              )}

              {device.domain && (
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Domain</span>
                  <span className="text-sm">{device.domain}</span>
                </div>
              )}

              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Last Seen</span>
                <span className="text-sm">
                  {device.lastSeen ? new Date(device.lastSeen).toLocaleString() : 'Never'}
                </span>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">First Discovered</span>
                <span className="text-sm">
                  {device.firstSeen ? new Date(device.firstSeen).toLocaleString() : 'Unknown'}
                </span>
              </div>
            </div>
          </div>

          <div className="space-y-3">
            <h4 className="text-sm font-semibold text-muted-foreground">System Information</h4>
            
            <div className="space-y-2">
              {device.osInfo && (
                <>
                  {device.osInfo.name && (
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground">Operating System</span>
                      <span className="text-sm">{device.osInfo.name}</span>
                    </div>
                  )}

                  {device.osInfo.version && (
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground">OS Version</span>
                      <span className="text-sm">{device.osInfo.version}</span>
                    </div>
                  )}

                  {device.osInfo.kernel && (
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground">Kernel</span>
                      <span className="text-sm font-mono">{device.osInfo.kernel}</span>
                    </div>
                  )}
                </>
              )}

              {device.vendor && (
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Vendor</span>
                  <span className="text-sm">{device.vendor}</span>
                </div>
              )}

              {device.model && (
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Model</span>
                  <span className="text-sm">{device.model}</span>
                </div>
              )}

              {device.serialNumber && (
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Serial Number</span>
                  <span className="text-sm font-mono">
                    {showSensitive ? device.serialNumber : '••••••••'}
                  </span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Performance Metrics */}
        {(device.uptime || device.loadAverage || device.memoryUsage || device.diskUsage) && (
          <div className="space-y-3">
            <h4 className="text-sm font-semibold text-muted-foreground">Performance Metrics</h4>
            
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {device.uptime && (
                <div className="text-center">
                  <Clock className="h-4 w-4 mx-auto mb-1 text-muted-foreground" />
                  <p className="text-sm font-medium">{formatUptime(device.uptime)}</p>
                  <p className="text-xs text-muted-foreground">Uptime</p>
                </div>
              )}

              {device.loadAverage && (
                <div className="text-center">
                  <Cpu className="h-4 w-4 mx-auto mb-1 text-muted-foreground" />
                  <p className="text-sm font-medium">{device.loadAverage.toFixed(2)}</p>
                  <p className="text-xs text-muted-foreground">Load Average</p>
                </div>
              )}

              {device.memoryUsage && (
                <div className="text-center">
                  <MemoryStick className="h-4 w-4 mx-auto mb-1 text-muted-foreground" />
                  <p className="text-sm font-medium">{Math.round(device.memoryUsage)}%</p>
                  <p className="text-xs text-muted-foreground">Memory Usage</p>
                </div>
              )}

              {device.diskUsage && (
                <div className="text-center">
                  <HardDrive className="h-4 w-4 mx-auto mb-1 text-muted-foreground" />
                  <p className="text-sm font-medium">{Math.round(device.diskUsage)}%</p>
                  <p className="text-xs text-muted-foreground">Disk Usage</p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Security Information */}
        {device.securityRisk && (
          <div className="space-y-3">
            <h4 className="text-sm font-semibold text-muted-foreground">Security Assessment</h4>
            
            <div className="flex items-center space-x-3 p-3 bg-muted/30 rounded-lg">
              <Shield className={cn(
                'h-5 w-5',
                device.securityRisk === 'low' && 'text-green-500',
                device.securityRisk === 'medium' && 'text-yellow-500',
                device.securityRisk === 'high' && 'text-orange-500',
                device.securityRisk === 'critical' && 'text-red-500'
              )} />
              <div>
                <p className="text-sm font-medium capitalize">{device.securityRisk} Risk Level</p>
                <p className="text-xs text-muted-foreground">
                  {device.securityRisk === 'low' && 'Device appears secure with no known vulnerabilities'}
                  {device.securityRisk === 'medium' && 'Some security concerns require attention'}
                  {device.securityRisk === 'high' && 'Multiple security issues detected'}
                  {device.securityRisk === 'critical' && 'Critical vulnerabilities require immediate action'}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Advanced Information */}
        <div className="space-y-3">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowAdvanced(!showAdvanced)}
            className="text-sm text-muted-foreground"
          >
            {showAdvanced ? 'Hide Advanced Information' : 'Show Advanced Information'}
          </Button>

          {showAdvanced && (
            <div className="space-y-4 border-t pt-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                <div className="space-y-2">
                  <h5 className="font-medium text-muted-foreground">Network Details</h5>
                  <div className="space-y-1">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Gateway</span>
                      <span className="font-mono">{device.gateway || 'Unknown'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Subnet</span>
                      <span className="font-mono">{device.subnet || 'Unknown'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">DNS Servers</span>
                      <span className="font-mono">{device.dnsServers?.join(', ') || 'Unknown'}</span>
                    </div>
                  </div>
                </div>

                <div className="space-y-2">
                  <h5 className="font-medium text-muted-foreground">System Details</h5>
                  <div className="space-y-1">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Architecture</span>
                      <span>{device.osInfo?.architecture || 'Unknown'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Total Memory</span>
                      <span>{device.totalMemory ? formatBytes(device.totalMemory) : 'Unknown'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Total Disk</span>
                      <span>{device.totalDisk ? formatBytes(device.totalDisk) : 'Unknown'}</span>
                    </div>
                  </div>
                </div>
              </div>

              {device.fingerprint && (
                <div className="space-y-2">
                  <h5 className="font-medium text-muted-foreground">Device Fingerprint</h5>
                  <div className="flex items-center space-x-2 p-2 bg-muted/20 rounded font-mono text-xs">
                    <Fingerprint className="h-4 w-4 text-muted-foreground" />
                    <span>{showSensitive ? device.fingerprint : '••••••••••••••••••••••••••••••••••••••••'}</span>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Quick Actions */}
        <div className="flex flex-wrap gap-2 pt-4 border-t">
          <Button variant="outline" size="sm">
            <Network className="h-4 w-4 mr-2" />
            Network Scan
          </Button>
          
          <Button variant="outline" size="sm">
            <Activity className="h-4 w-4 mr-2" />
            Ping Test
          </Button>
          
          <Button variant="outline" size="sm">
            <Globe className="h-4 w-4 mr-2" />
            DNS Lookup
          </Button>
          
          <Button variant="outline" size="sm">
            <ExternalLink className="h-4 w-4 mr-2" />
            Web Interface
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}