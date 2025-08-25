import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle, Badge } from '@/components/ui'
import { DeviceCard } from '@/components/devices'
import { RealTimeDeviceStatus } from './RealTimeDeviceStatus'
import { useWebSocketEvent } from '@/hooks/useWebSocket'
import { useNotifications } from '@/services/notificationService'
import { cn } from '@/lib/utils'
import type { Device } from '@nmapper/shared'
import {
  Activity,
  Plus,
  Minus,
  RefreshCw,
  Wifi,
  WifiOff,
  AlertTriangle
} from 'lucide-react'

interface RealTimeDeviceListProps {
  initialDevices: Device[]
  onDeviceSelect?: (device: Device) => void
  className?: string
}

export function RealTimeDeviceList({ 
  initialDevices, 
  onDeviceSelect, 
  className 
}: RealTimeDeviceListProps) {
  const [devices, setDevices] = useState<Device[]>(initialDevices)
  const [recentUpdates, setRecentUpdates] = useState<string[]>([])
  const notifications = useNotifications()

  // Listen for new devices
  useWebSocketEvent('device:discovered', (data) => {
    setDevices(prev => {
      const exists = prev.some(d => d.ip === data.device.ip)
      if (exists) return prev
      
      // Add highlight for new device
      setRecentUpdates(prev => [...prev, data.device.ip])
      setTimeout(() => {
        setRecentUpdates(prev => prev.filter(ip => ip !== data.device.ip))
      }, 3000)

      return [...prev, data.device]
    })
  }, [])

  // Listen for device updates
  useWebSocketEvent('device:updated', (data) => {
    setDevices(prev => prev.map(device => 
      device.ip === data.device.ip 
        ? { ...device, ...data.device }
        : device
    ))
    
    // Highlight updated device
    setRecentUpdates(prev => [...prev, data.device.ip])
    setTimeout(() => {
      setRecentUpdates(prev => prev.filter(ip => ip !== data.device.ip))
    }, 2000)
  }, [])

  // Listen for device removal
  useWebSocketEvent('device:removed', (data) => {
    setDevices(prev => prev.filter(device => device.ip !== data.deviceId))
  }, [])

  // Listen for status changes
  useWebSocketEvent('device:status_changed', (data) => {
    setDevices(prev => prev.map(device => 
      device.ip === data.deviceId 
        ? { ...device, isActive: data.status === 'online', lastSeen: new Date() }
        : device
    ))
    
    // Highlight status change
    setRecentUpdates(prev => [...prev, data.deviceId])
    setTimeout(() => {
      setRecentUpdates(prev => prev.filter(ip => ip !== data.deviceId))
    }, 2000)
  }, [])

  // Listen for risk changes
  useWebSocketEvent('network:device_risk_changed', (data) => {
    setDevices(prev => prev.map(device => 
      device.ip === data.deviceId 
        ? { ...device, riskLevel: data.newRisk as any }
        : device
    ))
    
    // Highlight risk change
    setRecentUpdates(prev => [...prev, data.deviceId])
    setTimeout(() => {
      setRecentUpdates(prev => prev.filter(ip => ip !== data.deviceId))
    }, 2000)
  }, [])

  const stats = {
    total: devices.length,
    online: devices.filter(d => d.isActive).length,
    offline: devices.filter(d => !d.isActive).length,
    highRisk: devices.filter(d => d.riskLevel === 'high').length,
    mediumRisk: devices.filter(d => d.riskLevel === 'medium').length,
    recentUpdates: recentUpdates.length
  }

  return (
    <div className={cn('space-y-6', className)}>
      {/* Real-time Statistics */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Activity className="h-5 w-5" />
              <span>Live Network Status</span>
            </div>
            
            <div className="flex items-center space-x-2">
              {recentUpdates.length > 0 && (
                <Badge variant="default" className="animate-pulse">
                  <RefreshCw className="h-3 w-3 mr-1" />
                  {recentUpdates.length} updating
                </Badge>
              )}
            </div>
          </CardTitle>
        </CardHeader>
        
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
            <div className="text-center">
              <div className="flex items-center justify-center space-x-1 mb-1">
                <Activity className="h-4 w-4 text-muted-foreground" />
                <span className="text-2xl font-bold">{stats.total}</span>
              </div>
              <p className="text-xs text-muted-foreground">Total Devices</p>
            </div>

            <div className="text-center">
              <div className="flex items-center justify-center space-x-1 mb-1">
                <Wifi className="h-4 w-4 text-green-500" />
                <span className="text-2xl font-bold text-green-600">{stats.online}</span>
              </div>
              <p className="text-xs text-muted-foreground">Online</p>
            </div>

            <div className="text-center">
              <div className="flex items-center justify-center space-x-1 mb-1">
                <WifiOff className="h-4 w-4 text-red-500" />
                <span className="text-2xl font-bold text-red-600">{stats.offline}</span>
              </div>
              <p className="text-xs text-muted-foreground">Offline</p>
            </div>

            <div className="text-center">
              <div className="flex items-center justify-center space-x-1 mb-1">
                <AlertTriangle className="h-4 w-4 text-red-500" />
                <span className="text-2xl font-bold text-red-600">{stats.highRisk}</span>
              </div>
              <p className="text-xs text-muted-foreground">High Risk</p>
            </div>

            <div className="text-center">
              <div className="flex items-center justify-center space-x-1 mb-1">
                <AlertTriangle className="h-4 w-4 text-yellow-500" />
                <span className="text-2xl font-bold text-yellow-600">{stats.mediumRisk}</span>
              </div>
              <p className="text-xs text-muted-foreground">Medium Risk</p>
            </div>

            <div className="text-center">
              <div className="flex items-center justify-center space-x-1 mb-1">
                <RefreshCw className="h-4 w-4 text-blue-500" />
                <span className="text-2xl font-bold text-blue-600">{stats.recentUpdates}</span>
              </div>
              <p className="text-xs text-muted-foreground">Live Updates</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Device Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {devices.map((device) => (
          <div
            key={device.ip}
            className={cn(
              'transition-all duration-300',
              recentUpdates.includes(device.ip) && 'ring-2 ring-primary ring-offset-2 ring-offset-background'
            )}
          >
            <DeviceCard
              device={device}
              onSelect={onDeviceSelect}
              className="h-full relative"
            >
              {/* Real-time status overlay */}
              <div className="absolute top-2 right-2">
                <RealTimeDeviceStatus device={device} />
              </div>
              
              {/* Update indicator */}
              {recentUpdates.includes(device.ip) && (
                <div className="absolute bottom-2 right-2">
                  <div className="flex items-center space-x-1 px-2 py-1 bg-primary/20 backdrop-blur-sm rounded-full">
                    <div className="w-2 h-2 bg-primary rounded-full animate-pulse" />
                    <span className="text-xs text-primary font-medium">Live</span>
                  </div>
                </div>
              )}
            </DeviceCard>
          </div>
        ))}
      </div>

      {/* Empty State */}
      {devices.length === 0 && (
        <Card>
          <CardContent className="flex items-center justify-center py-12">
            <div className="text-center">
              <Activity className="mx-auto h-12 w-12 text-muted-foreground" />
              <h3 className="mt-4 text-lg font-semibold">No devices found</h3>
              <p className="text-muted-foreground">
                Start a network scan to discover devices
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Activity Feed */}
      {recentUpdates.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <RefreshCw className="h-5 w-5 animate-spin" />
              <span>Live Activity</span>
            </CardTitle>
          </CardHeader>
          
          <CardContent>
            <div className="space-y-2">
              {recentUpdates.slice(0, 5).map((deviceIp, index) => {
                const device = devices.find(d => d.ip === deviceIp)
                return (
                  <div key={`${deviceIp}-${index}`} className="flex items-center justify-between p-2 bg-muted/50 rounded-lg">
                    <div className="flex items-center space-x-3">
                      <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse" />
                      <span className="text-sm font-medium">
                        {device?.hostname || deviceIp}
                      </span>
                      <Badge variant="outline" className="text-xs">
                        {device?.isActive ? 'Online' : 'Offline'}
                      </Badge>
                    </div>
                    
                    <span className="text-xs text-muted-foreground">
                      Just now
                    </span>
                  </div>
                )
              })}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}