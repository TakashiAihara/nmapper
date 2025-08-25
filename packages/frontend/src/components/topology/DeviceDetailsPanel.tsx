import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle, Button, Badge } from '@/components/ui'
import { useNetworkDevice } from '@/hooks'
import { LoadingSpinner } from '@/components/common'
import { cn } from '@/lib/utils'
import type { Device } from '@nmapper/shared'
import {
  X,
  Monitor,
  Wifi,
  WifiOff,
  Activity,
  Shield,
  AlertTriangle,
  Clock,
  Hash,
  Network,
  MapPin,
  Zap,
  Database,
  Settings,
  Edit,
  Eye,
  ExternalLink,
  Copy,
  CheckCircle
} from 'lucide-react'

interface DeviceDetailsPanelProps {
  device: Device
  onClose: () => void
  className?: string
}

export function DeviceDetailsPanel({ 
  device, 
  onClose, 
  className 
}: DeviceDetailsPanelProps) {
  const { data: deviceDetails, isLoading } = useNetworkDevice(device.ip)
  const [activeTab, setActiveTab] = useState<'overview' | 'ports' | 'history' | 'security'>('overview')
  const [copiedField, setCopiedField] = useState<string | null>(null)

  const currentDevice = deviceDetails || device

  const copyToClipboard = async (text: string, field: string) => {
    try {
      await navigator.clipboard.writeText(text)
      setCopiedField(field)
      setTimeout(() => setCopiedField(null), 2000)
    } catch (error) {
      console.error('Failed to copy to clipboard:', error)
    }
  }

  const getRiskBadge = (riskLevel: string) => {
    switch (riskLevel) {
      case 'high':
        return { variant: 'destructive' as const, icon: AlertTriangle, color: 'text-red-500' }
      case 'medium':
        return { variant: 'warning' as const, icon: AlertTriangle, color: 'text-yellow-500' }
      case 'low':
        return { variant: 'success' as const, icon: Shield, color: 'text-green-500' }
      default:
        return { variant: 'secondary' as const, icon: Shield, color: 'text-gray-500' }
    }
  }

  const getStatusBadge = (isActive: boolean) => {
    return isActive 
      ? { variant: 'success' as const, icon: Wifi, color: 'text-green-500', label: 'Online' }
      : { variant: 'destructive' as const, icon: WifiOff, color: 'text-red-500', label: 'Offline' }
  }

  const formatLastSeen = (lastSeen: Date) => {
    const now = new Date()
    const diff = now.getTime() - new Date(lastSeen).getTime()
    const minutes = Math.floor(diff / 60000)
    const hours = Math.floor(minutes / 60)
    const days = Math.floor(hours / 24)

    if (days > 0) return `${days} day${days > 1 ? 's' : ''} ago`
    if (hours > 0) return `${hours} hour${hours > 1 ? 's' : ''} ago`
    if (minutes > 0) return `${minutes} minute${minutes > 1 ? 's' : ''} ago`
    return 'Just now'
  }

  const riskBadge = getRiskBadge(currentDevice.riskLevel || 'low')
  const statusBadge = getStatusBadge(currentDevice.isActive)
  const RiskIcon = riskBadge.icon
  const StatusIcon = statusBadge.icon

  return (
    <div className={cn('h-full flex flex-col bg-background', className)}>
      {/* Header */}
      <div className="flex-shrink-0 p-4 border-b">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Monitor className="h-5 w-5 text-muted-foreground" />
            <div>
              <h2 className="text-lg font-semibold">
                {currentDevice.hostname || currentDevice.ip}
              </h2>
              <p className="text-sm text-muted-foreground">
                {currentDevice.hostname && currentDevice.ip}
              </p>
            </div>
          </div>
          
          <Button variant="ghost" size="sm" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        </div>

        {/* Status Badges */}
        <div className="flex items-center space-x-2 mt-3">
          <Badge variant={statusBadge.variant}>
            <StatusIcon className="h-3 w-3 mr-1" />
            {statusBadge.label}
          </Badge>
          <Badge variant={riskBadge.variant}>
            <RiskIcon className="h-3 w-3 mr-1" />
            {currentDevice.riskLevel || 'Unknown'} Risk
          </Badge>
          {currentDevice.deviceType && (
            <Badge variant="outline" className="text-xs">
              {currentDevice.deviceType}
            </Badge>
          )}
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="flex-shrink-0 px-4 py-2 border-b">
        <div className="flex space-x-1">
          {[
            { key: 'overview', label: 'Overview', icon: Eye },
            { key: 'ports', label: 'Ports', icon: Activity },
            { key: 'history', label: 'History', icon: Clock },
            { key: 'security', label: 'Security', icon: Shield }
          ].map(({ key, label, icon: Icon }) => (
            <Button
              key={key}
              variant={activeTab === key ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setActiveTab(key as any)}
              className="text-xs"
            >
              <Icon className="h-3 w-3 mr-1" />
              {label}
            </Button>
          ))}
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {isLoading && (
          <div className="flex items-center justify-center py-8">
            <LoadingSpinner size="md" text="Loading device details..." />
          </div>
        )}

        {/* Overview Tab */}
        {activeTab === 'overview' && (
          <div className="space-y-4">
            {/* Basic Information */}
            <Card>
              <CardHeader>
                <CardTitle className="text-sm flex items-center space-x-2">
                  <Monitor className="h-4 w-4" />
                  <span>Basic Information</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="grid grid-cols-1 gap-3 text-sm">
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">IP Address</span>
                    <div className="flex items-center space-x-2">
                      <code className="font-mono">{currentDevice.ip}</code>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => copyToClipboard(currentDevice.ip, 'ip')}
                        className="h-6 w-6 p-0"
                      >
                        {copiedField === 'ip' ? (
                          <CheckCircle className="h-3 w-3 text-green-500" />
                        ) : (
                          <Copy className="h-3 w-3" />
                        )}
                      </Button>
                    </div>
                  </div>

                  {currentDevice.macAddress && (
                    <div className="flex items-center justify-between">
                      <span className="text-muted-foreground">MAC Address</span>
                      <div className="flex items-center space-x-2">
                        <code className="font-mono text-xs">{currentDevice.macAddress}</code>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => copyToClipboard(currentDevice.macAddress!, 'mac')}
                          className="h-6 w-6 p-0"
                        >
                          {copiedField === 'mac' ? (
                            <CheckCircle className="h-3 w-3 text-green-500" />
                          ) : (
                            <Copy className="h-3 w-3" />
                          )}
                        </Button>
                      </div>
                    </div>
                  )}

                  {currentDevice.hostname && (
                    <div className="flex items-center justify-between">
                      <span className="text-muted-foreground">Hostname</span>
                      <span className="font-mono">{currentDevice.hostname}</span>
                    </div>
                  )}

                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">Device Type</span>
                    <span className="capitalize">{currentDevice.deviceType || 'Unknown'}</span>
                  </div>

                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">Last Seen</span>
                    <span>{formatLastSeen(currentDevice.lastSeen)}</span>
                  </div>

                  {currentDevice.responseTime && (
                    <div className="flex items-center justify-between">
                      <span className="text-muted-foreground">Response Time</span>
                      <span>{currentDevice.responseTime}ms</span>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Operating System */}
            {currentDevice.osInfo && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-sm flex items-center space-x-2">
                    <Settings className="h-4 w-4" />
                    <span>Operating System</span>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="grid grid-cols-1 gap-3 text-sm">
                    <div className="flex items-center justify-between">
                      <span className="text-muted-foreground">OS Name</span>
                      <span>{currentDevice.osInfo.name}</span>
                    </div>
                    
                    {currentDevice.osInfo.version && (
                      <div className="flex items-center justify-between">
                        <span className="text-muted-foreground">Version</span>
                        <span>{currentDevice.osInfo.version}</span>
                      </div>
                    )}
                    
                    <div className="flex items-center justify-between">
                      <span className="text-muted-foreground">Accuracy</span>
                      <span>{currentDevice.osInfo.accuracy}%</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Network Information */}
            <Card>
              <CardHeader>
                <CardTitle className="text-sm flex items-center space-x-2">
                  <Network className="h-4 w-4" />
                  <span>Network Information</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="grid grid-cols-1 gap-3 text-sm">
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">Status</span>
                    <Badge variant={statusBadge.variant} className="text-xs">
                      <StatusIcon className="h-3 w-3 mr-1" />
                      {statusBadge.label}
                    </Badge>
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">Risk Level</span>
                    <Badge variant={riskBadge.variant} className="text-xs">
                      <RiskIcon className="h-3 w-3 mr-1" />
                      {currentDevice.riskLevel || 'Unknown'}
                    </Badge>
                  </div>

                  {currentDevice.ports && currentDevice.ports.length > 0 && (
                    <div className="flex items-center justify-between">
                      <span className="text-muted-foreground">Open Ports</span>
                      <span>{currentDevice.ports.filter(p => p.state === 'open').length}</span>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Quick Actions */}
            <div className="flex flex-wrap gap-2">
              <Button variant="outline" size="sm" className="text-xs">
                <Edit className="h-3 w-3 mr-1" />
                Edit Device
              </Button>
              <Button variant="outline" size="sm" className="text-xs">
                <Activity className="h-3 w-3 mr-1" />
                Run Scan
              </Button>
              <Button variant="outline" size="sm" className="text-xs">
                <ExternalLink className="h-3 w-3 mr-1" />
                Open in Browser
              </Button>
            </div>
          </div>
        )}

        {/* Ports Tab */}
        {activeTab === 'ports' && (
          <div className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-sm flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <Activity className="h-4 w-4" />
                    <span>Open Ports</span>
                  </div>
                  <Badge variant="outline">
                    {currentDevice.ports?.filter(p => p.state === 'open').length || 0}
                  </Badge>
                </CardTitle>
              </CardHeader>
              <CardContent>
                {currentDevice.ports && currentDevice.ports.length > 0 ? (
                  <div className="space-y-2">
                    {currentDevice.ports
                      .filter(port => port.state === 'open')
                      .map((port, index) => (
                        <div key={index} className="flex items-center justify-between p-2 border rounded">
                          <div className="flex items-center space-x-3">
                            <div className="w-2 h-2 bg-green-500 rounded-full" />
                            <div>
                              <p className="font-medium">Port {port.number}</p>
                              <p className="text-xs text-muted-foreground">
                                {port.protocol?.toUpperCase()} • {port.service || 'Unknown service'}
                              </p>
                            </div>
                          </div>
                          <div className="text-right">
                            <Badge variant="success" className="text-xs">
                              {port.state}
                            </Badge>
                            {port.version && (
                              <p className="text-xs text-muted-foreground mt-1">
                                {port.version}
                              </p>
                            )}
                          </div>
                        </div>
                      ))}
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <Activity className="mx-auto h-8 w-8 text-muted-foreground mb-2" />
                    <p className="text-sm text-muted-foreground">No open ports detected</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        )}

        {/* History Tab */}
        {activeTab === 'history' && (
          <div className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-sm flex items-center space-x-2">
                  <Clock className="h-4 w-4" />
                  <span>Recent Activity</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-center py-8">
                  <Clock className="mx-auto h-8 w-8 text-muted-foreground mb-2" />
                  <p className="text-sm text-muted-foreground">No recent activity</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Historical data will appear here
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Security Tab */}
        {activeTab === 'security' && (
          <div className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-sm flex items-center space-x-2">
                  <Shield className="h-4 w-4" />
                  <span>Security Assessment</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between p-3 border rounded">
                  <div className="flex items-center space-x-3">
                    <RiskIcon className={cn('h-5 w-5', riskBadge.color)} />
                    <div>
                      <p className="font-medium">Overall Risk Level</p>
                      <p className="text-xs text-muted-foreground">
                        Based on open ports and services
                      </p>
                    </div>
                  </div>
                  <Badge variant={riskBadge.variant}>
                    {currentDevice.riskLevel || 'Unknown'}
                  </Badge>
                </div>

                <div className="space-y-2">
                  <h4 className="text-sm font-medium">Security Recommendations</h4>
                  <div className="space-y-2 text-sm">
                    <div className="flex items-start space-x-2 p-2 bg-yellow-50 dark:bg-yellow-900/20 rounded">
                      <AlertTriangle className="h-4 w-4 text-yellow-600 flex-shrink-0 mt-0.5" />
                      <div>
                        <p className="font-medium">Regular Security Scans</p>
                        <p className="text-xs text-muted-foreground">
                          Schedule regular vulnerability scans for this device
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </div>

      {/* Footer Actions */}
      <div className="flex-shrink-0 p-4 border-t">
        <div className="flex justify-between items-center">
          <Button variant="outline" size="sm" onClick={onClose}>
            Close
          </Button>
          <div className="flex space-x-2">
            <Button variant="outline" size="sm">
              <Database className="h-3 w-3 mr-1" />
              View History
            </Button>
            <Button variant="default" size="sm">
              <Zap className="h-3 w-3 mr-1" />
              Quick Scan
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}