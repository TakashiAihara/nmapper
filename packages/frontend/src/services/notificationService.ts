import { toast } from '@/hooks/useToast'
import { wsManager, type WebSocketEvents } from '@/lib/websocket'
import { formatRelativeTime } from '@/lib/utils'
import {
  CheckCircle,
  AlertTriangle,
  Info,
  XCircle,
  Wifi,
  WifiOff,
  Shield,
  Activity,
  Server,
  Camera
} from 'lucide-react'

export type NotificationLevel = 'info' | 'success' | 'warning' | 'error'

export interface NotificationOptions {
  title: string
  description?: string
  level?: NotificationLevel
  duration?: number
  persistent?: boolean
  action?: {
    label: string
    onClick: () => void
  }
}

class NotificationService {
  private enabled = true

  constructor() {
    this.setupWebSocketEventHandlers()
  }

  setEnabled(enabled: boolean) {
    this.enabled = enabled
  }

  show({ title, description, level = 'info', duration = 5000, persistent = false, action }: NotificationOptions) {
    if (!this.enabled) return

    const variant = this.getToastVariant(level)
    const icon = this.getIcon(level)

    toast({
      title: (
        <div className="flex items-center space-x-2">
          {icon && <icon className="h-4 w-4" />}
          <span>{title}</span>
        </div>
      ),
      description,
      variant,
      duration: persistent ? Infinity : duration,
      action: action ? {
        altText: action.label,
        onClick: action.onClick,
        children: action.label
      } : undefined
    })
  }

  success(title: string, description?: string, options?: Partial<NotificationOptions>) {
    this.show({ title, description, level: 'success', ...options })
  }

  error(title: string, description?: string, options?: Partial<NotificationOptions>) {
    this.show({ title, description, level: 'error', ...options })
  }

  warning(title: string, description?: string, options?: Partial<NotificationOptions>) {
    this.show({ title, description, level: 'warning', ...options })
  }

  info(title: string, description?: string, options?: Partial<NotificationOptions>) {
    this.show({ title, description, level: 'info', ...options })
  }

  private getToastVariant(level: NotificationLevel) {
    switch (level) {
      case 'success': return 'success'
      case 'warning': return 'warning'
      case 'error': return 'destructive'
      case 'info': 
      default: return 'info'
    }
  }

  private getIcon(level: NotificationLevel) {
    switch (level) {
      case 'success': return CheckCircle
      case 'warning': return AlertTriangle
      case 'error': return XCircle
      case 'info': 
      default: return Info
    }
  }

  private setupWebSocketEventHandlers() {
    // Device events
    wsManager.on('device:discovered', (data) => {
      this.info(
        'New device discovered',
        `${data.device.hostname || data.device.ip} has been detected on the network`,
        {
          action: {
            label: 'View Details',
            onClick: () => {
              // Navigate to device details
              console.log('Navigate to device:', data.device.ip)
            }
          }
        }
      )
    })

    wsManager.on('device:status_changed', (data) => {
      const isOnline = data.status === 'online'
      
      if (isOnline) {
        this.success(
          'Device came online',
          `${data.deviceId} is now reachable`,
          { duration: 3000 }
        )
      } else {
        this.warning(
          'Device went offline',
          `${data.deviceId} is no longer reachable`,
          { duration: 4000 }
        )
      }
    })

    wsManager.on('network:device_risk_changed', (data) => {
      const riskIncreased = this.getRiskLevel(data.newRisk) > this.getRiskLevel(data.oldRisk)
      
      if (riskIncreased) {
        this.warning(
          'Device risk level increased',
          `${data.deviceId} risk changed from ${data.oldRisk} to ${data.newRisk}`,
          {
            action: {
              label: 'Investigate',
              onClick: () => {
                console.log('Navigate to device:', data.deviceId)
              }
            }
          }
        )
      } else {
        this.success(
          'Device risk level decreased',
          `${data.deviceId} risk changed from ${data.oldRisk} to ${data.newRisk}`,
          { duration: 3000 }
        )
      }
    })

    // Scan events
    wsManager.on('scan:started', (data) => {
      this.info(
        'Network scan started',
        `Scan ${data.scanId.slice(0, 8)}... initiated at ${formatRelativeTime(data.timestamp)}`,
        { duration: 3000 }
      )
    })

    wsManager.on('scan:completed', (data) => {
      this.success(
        'Network scan completed',
        `Scan finished successfully. Snapshot ${data.snapshotId.slice(0, 8)}... created`,
        {
          action: {
            label: 'View Results',
            onClick: () => {
              console.log('Navigate to snapshot:', data.snapshotId)
            }
          }
        }
      )
    })

    wsManager.on('scan:failed', (data) => {
      this.error(
        'Network scan failed',
        `Scan ${data.scanId.slice(0, 8)}... failed: ${data.error}`,
        {
          persistent: true,
          action: {
            label: 'View Logs',
            onClick: () => {
              console.log('View scan logs for:', data.scanId)
            }
          }
        }
      )
    })

    // System events
    wsManager.on('system:health_changed', (data) => {
      const isHealthy = data.status === 'healthy'
      
      if (isHealthy) {
        this.success(
          'System health restored',
          'All system components are now healthy',
          { duration: 4000 }
        )
      } else {
        const level = data.status === 'unhealthy' ? 'error' : 'warning'
        this.show({
          title: 'System health degraded',
          description: `System status: ${data.status}. Check system components.`,
          level,
          persistent: data.status === 'unhealthy',
          action: {
            label: 'View Status',
            onClick: () => {
              console.log('Navigate to system status')
            }
          }
        })
      }
    })

    wsManager.on('system:alert', (data) => {
      this.show({
        title: 'System Alert',
        description: data.message,
        level: data.level === 'error' ? 'error' : data.level === 'warning' ? 'warning' : 'info',
        duration: data.level === 'error' ? 10000 : 5000
      })
    })

    // Snapshot events
    wsManager.on('snapshot:created', (data) => {
      this.success(
        'Snapshot created',
        `New network snapshot saved: ${data.snapshotId.slice(0, 8)}...`,
        {
          action: {
            label: 'View Snapshot',
            onClick: () => {
              console.log('Navigate to snapshot:', data.snapshotId)
            }
          }
        }
      )
    })

    wsManager.on('snapshot:deleted', (data) => {
      this.info(
        'Snapshot deleted',
        `Snapshot ${data.snapshotId.slice(0, 8)}... has been removed`,
        { duration: 3000 }
      )
    })

    // Network topology events
    wsManager.on('network:topology_changed', (data) => {
      this.info(
        'Network topology updated',
        `Network map updated with ${data.devices.length} devices and ${data.connections.length} connections`,
        {
          action: {
            label: 'View Topology',
            onClick: () => {
              console.log('Navigate to network topology')
            }
          }
        }
      )
    })
  }

  private getRiskLevel(risk: string): number {
    switch (risk) {
      case 'low': return 1
      case 'medium': return 2
      case 'high': return 3
      default: return 0
    }
  }
}

export const notificationService = new NotificationService()

// React hook for using notification service
export function useNotifications() {
  return {
    show: notificationService.show.bind(notificationService),
    success: notificationService.success.bind(notificationService),
    error: notificationService.error.bind(notificationService),
    warning: notificationService.warning.bind(notificationService),
    info: notificationService.info.bind(notificationService),
    setEnabled: notificationService.setEnabled.bind(notificationService)
  }
}