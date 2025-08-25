import { Card, CardContent, CardHeader, CardTitle, Badge } from '@/components/ui'
import { formatRelativeTime, cn } from '@/lib/utils'
import type { Device } from '@nmapper/shared'
import {
  Laptop,
  Smartphone,
  Server,
  Router,
  Monitor,
  HardDrive,
  Wifi,
  Clock,
  Activity,
  Shield,
  AlertTriangle,
  CheckCircle,
  XCircle
} from 'lucide-react'

interface DeviceCardProps {
  device: Device
  selected?: boolean
  onSelect?: (device: Device) => void
  className?: string
}

function getDeviceIcon(device: Device) {
  const deviceType = device.deviceType?.toLowerCase() || ''
  const osName = device.osInfo?.name?.toLowerCase() || ''
  
  if (deviceType.includes('server') || deviceType.includes('linux')) return Server
  if (deviceType.includes('router') || deviceType.includes('gateway')) return Router
  if (deviceType.includes('mobile') || deviceType.includes('phone')) return Smartphone
  if (deviceType.includes('iot') || deviceType.includes('embedded')) return Wifi
  if (osName.includes('windows')) return Monitor
  if (osName.includes('mac') || osName.includes('apple')) return Laptop
  if (osName.includes('linux')) return HardDrive
  
  return Monitor // Default
}

function getDeviceTypeColor(deviceType?: string): string {
  if (!deviceType) return 'bg-gray-100 text-gray-800'
  
  const type = deviceType.toLowerCase()
  if (type.includes('server')) return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-100'
  if (type.includes('router') || type.includes('network')) return 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-100'
  if (type.includes('mobile') || type.includes('phone')) return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-100'
  if (type.includes('iot')) return 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-100'
  
  return 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-100'
}

function getRiskLevelVariant(riskLevel?: string) {
  switch (riskLevel) {
    case 'high': return 'destructive'
    case 'medium': return 'warning'
    case 'low': return 'success'
    default: return 'secondary'
  }
}

export function DeviceCard({ device, selected, onSelect, className }: DeviceCardProps) {
  const DeviceIcon = getDeviceIcon(device)
  const openPorts = device.ports?.filter(port => port.state === 'open').length || 0
  const servicesCount = device.services?.length || 0

  return (
    <Card
      className={cn(
        'cursor-pointer transition-all hover:shadow-md',
        selected && 'ring-2 ring-primary',
        className
      )}
      onClick={() => onSelect?.(device)}
    >
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex items-center space-x-3">
            <div className={cn(
              'p-2 rounded-lg',
              device.isActive ? 'bg-green-100 dark:bg-green-900' : 'bg-gray-100 dark:bg-gray-800'
            )}>
              <DeviceIcon className={cn(
                'h-5 w-5',
                device.isActive ? 'text-green-600 dark:text-green-400' : 'text-gray-600 dark:text-gray-400'
              )} />
            </div>
            <div className="flex-1 min-w-0">
              <CardTitle className="text-base truncate">
                {device.hostname || device.ip}
              </CardTitle>
              {device.hostname && (
                <p className="text-sm text-muted-foreground truncate">{device.ip}</p>
              )}
            </div>
          </div>
          
          <div className="flex items-center space-x-1">
            {device.isActive ? (
              <CheckCircle className="h-4 w-4 text-green-500" />
            ) : (
              <XCircle className="h-4 w-4 text-red-500" />
            )}
            {device.riskLevel && (
              <Badge variant={getRiskLevelVariant(device.riskLevel)} className="text-xs">
                {device.riskLevel}
              </Badge>
            )}
          </div>
        </div>
      </CardHeader>
      
      <CardContent className="pt-0">
        <div className="space-y-3">
          {/* Device Info */}
          <div className="grid grid-cols-2 gap-3 text-sm">
            {device.vendor && (
              <div>
                <span className="text-muted-foreground">Vendor:</span>
                <p className="truncate font-medium">{device.vendor}</p>
              </div>
            )}
            
            {device.mac && (
              <div>
                <span className="text-muted-foreground">MAC:</span>
                <p className="font-mono text-xs truncate">{device.mac}</p>
              </div>
            )}
            
            {device.responseTime && (
              <div className="flex items-center space-x-1">
                <Clock className="h-3 w-3 text-muted-foreground" />
                <span className="text-xs text-muted-foreground">
                  {device.responseTime}ms
                </span>
              </div>
            )}
            
            <div className="flex items-center space-x-1">
              <Activity className="h-3 w-3 text-muted-foreground" />
              <span className="text-xs text-muted-foreground">
                {formatRelativeTime(device.lastSeen)}
              </span>
            </div>
          </div>

          {/* OS Info */}
          {device.osInfo?.name && (
            <div className="flex items-center space-x-2">
              <Badge variant="outline" className="text-xs">
                {device.osInfo.name}
                {device.osInfo.version && ` ${device.osInfo.version}`}
              </Badge>
            </div>
          )}

          {/* Device Type */}
          {device.deviceType && (
            <div>
              <Badge className={cn('text-xs', getDeviceTypeColor(device.deviceType))}>
                {device.deviceType}
              </Badge>
            </div>
          )}

          {/* Network Services */}
          <div className="grid grid-cols-2 gap-3 text-xs">
            <div className="flex items-center space-x-1">
              <Shield className="h-3 w-3 text-muted-foreground" />
              <span className="text-muted-foreground">
                {openPorts} open ports
              </span>
            </div>
            
            <div className="flex items-center space-x-1">
              <Server className="h-3 w-3 text-muted-foreground" />
              <span className="text-muted-foreground">
                {servicesCount} services
              </span>
            </div>
          </div>

          {/* Risk Indicators */}
          {device.riskLevel === 'high' && (
            <div className="flex items-center space-x-1 text-red-600 dark:text-red-400">
              <AlertTriangle className="h-3 w-3" />
              <span className="text-xs">High risk device</span>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )
}