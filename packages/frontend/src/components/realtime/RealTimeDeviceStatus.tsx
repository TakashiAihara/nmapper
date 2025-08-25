import { useState, useEffect } from 'react'
import { Badge } from '@/components/ui'
import { useWebSocketEvent } from '@/hooks/useWebSocket'
import { cn } from '@/lib/utils'
import type { Device } from '@nmapper/shared'
import {
  Wifi,
  WifiOff,
  Activity,
  AlertTriangle,
  CheckCircle,
  Clock
} from 'lucide-react'

interface RealTimeDeviceStatusProps {
  device: Device
  showDetails?: boolean
  className?: string
}

interface DeviceStatusUpdate {
  deviceId: string
  status: 'online' | 'offline'
  timestamp: Date
  responseTime?: number
  lastSeen?: Date
}

export function RealTimeDeviceStatus({ 
  device, 
  showDetails = false, 
  className 
}: RealTimeDeviceStatusProps) {
  const [currentStatus, setCurrentStatus] = useState({
    isActive: device.isActive,
    responseTime: device.responseTime,
    lastSeen: device.lastSeen,
    riskLevel: device.riskLevel
  })
  
  const [statusHistory, setStatusHistory] = useState<DeviceStatusUpdate[]>([])
  const [isUpdating, setIsUpdating] = useState(false)

  // Listen for device status changes
  useWebSocketEvent('device:status_changed', (data) => {
    if (data.deviceId === device.ip) {
      setIsUpdating(true)
      
      const update: DeviceStatusUpdate = {
        deviceId: data.deviceId,
        status: data.status,
        timestamp: new Date()
      }

      setCurrentStatus(prev => ({
        ...prev,
        isActive: data.status === 'online',
        lastSeen: new Date()
      }))

      setStatusHistory(prev => [update, ...prev.slice(0, 9)]) // Keep last 10 updates

      // Reset updating state after animation
      setTimeout(() => setIsUpdating(false), 1000)
    }
  }, [device.ip])

  // Listen for device updates
  useWebSocketEvent('device:updated', (data) => {
    if (data.device.ip === device.ip) {
      setCurrentStatus(prev => ({
        ...prev,
        responseTime: data.device.responseTime || prev.responseTime,
        riskLevel: data.device.riskLevel || prev.riskLevel
      }))
    }
  }, [device.ip])

  // Listen for risk level changes
  useWebSocketEvent('network:device_risk_changed', (data) => {
    if (data.deviceId === device.ip) {
      setCurrentStatus(prev => ({
        ...prev,
        riskLevel: data.newRisk as any
      }))
    }
  }, [device.ip])

  const getStatusIcon = () => {
    if (currentStatus.isActive) {
      return <Wifi className="h-4 w-4 text-green-500" />
    } else {
      return <WifiOff className="h-4 w-4 text-red-500" />
    }
  }

  const getStatusBadge = () => {
    if (currentStatus.isActive) {
      return (
        <Badge variant="success" className={cn(
          'transition-all duration-300',
          isUpdating && 'scale-110 shadow-lg'
        )}>
          <CheckCircle className="h-3 w-3 mr-1" />
          Online
        </Badge>
      )
    } else {
      return (
        <Badge variant="destructive" className={cn(
          'transition-all duration-300',
          isUpdating && 'scale-110 shadow-lg'
        )}>
          <AlertTriangle className="h-3 w-3 mr-1" />
          Offline
        </Badge>
      )
    }
  }

  const getRiskBadge = () => {
    if (!currentStatus.riskLevel) return null

    const variants = {
      low: 'success',
      medium: 'warning',
      high: 'destructive'
    } as const

    return (
      <Badge variant={variants[currentStatus.riskLevel]} className="text-xs">
        {currentStatus.riskLevel} risk
      </Badge>
    )
  }

  return (
    <div className={cn(
      'flex items-center space-x-2 transition-all duration-300',
      isUpdating && 'bg-primary/10 rounded-md p-1',
      className
    )}>
      <div className="flex items-center space-x-2">
        {getStatusIcon()}
        {getStatusBadge()}
        {getRiskBadge()}
      </div>

      {showDetails && (
        <div className="flex items-center space-x-4 text-xs text-muted-foreground">
          {currentStatus.responseTime && (
            <div className="flex items-center space-x-1">
              <Activity className="h-3 w-3" />
              <span>{currentStatus.responseTime}ms</span>
            </div>
          )}
          
          <div className="flex items-center space-x-1">
            <Clock className="h-3 w-3" />
            <span>
              {new Date(currentStatus.lastSeen).toLocaleTimeString([], { 
                hour: '2-digit', 
                minute: '2-digit' 
              })}
            </span>
          </div>
        </div>
      )}

      {/* Status update indicator */}
      {isUpdating && (
        <div className="flex items-center space-x-1">
          <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse" />
          <span className="text-xs text-blue-600 dark:text-blue-400">
            Updated
          </span>
        </div>
      )}

      {/* Recent status history tooltip */}
      {statusHistory.length > 0 && showDetails && (
        <div className="relative group">
          <div className="w-2 h-2 bg-muted-foreground/50 rounded-full cursor-help" />
          
          <div className="absolute bottom-full right-0 mb-2 p-2 bg-background border rounded-lg shadow-lg opacity-0 group-hover:opacity-100 transition-opacity z-10 min-w-[200px]">
            <h4 className="text-xs font-semibold mb-2">Recent Status Changes</h4>
            <div className="space-y-1 max-h-32 overflow-y-auto">
              {statusHistory.slice(0, 5).map((update, index) => (
                <div key={index} className="text-xs flex items-center justify-between">
                  <div className="flex items-center space-x-1">
                    {update.status === 'online' ? (
                      <CheckCircle className="h-2 w-2 text-green-500" />
                    ) : (
                      <AlertTriangle className="h-2 w-2 text-red-500" />
                    )}
                    <span className={
                      update.status === 'online' ? 'text-green-600' : 'text-red-600'
                    }>
                      {update.status}
                    </span>
                  </div>
                  <span className="text-muted-foreground">
                    {update.timestamp.toLocaleTimeString([], { 
                      hour: '2-digit', 
                      minute: '2-digit' 
                    })}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}