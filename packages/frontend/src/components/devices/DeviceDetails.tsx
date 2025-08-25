import { Card, CardContent, CardHeader, CardTitle, Badge } from '@/components/ui'
import { formatRelativeTime, formatDuration, cn } from '@/lib/utils'
import type { Device, Port, Service } from '@nmapper/shared'
import {
  Monitor,
  Wifi,
  Shield,
  Clock,
  Activity,
  Server,
  Network,
  Eye,
  EyeOff,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Copy
} from 'lucide-react'

interface DeviceDetailsProps {
  device: Device
  className?: string
}

function getPortStateIcon(state: string) {
  switch (state) {
    case 'open': return CheckCircle
    case 'closed': return XCircle
    case 'filtered': return EyeOff
    default: return Eye
  }
}

function getPortStateColor(state: string) {
  switch (state) {
    case 'open': return 'text-green-500'
    case 'closed': return 'text-red-500'
    case 'filtered': return 'text-yellow-500'
    default: return 'text-gray-500'
  }
}

export function DeviceDetails({ device, className }: DeviceDetailsProps) {
  const openPorts = device.ports?.filter(port => port.state === 'open') || []
  const closedPorts = device.ports?.filter(port => port.state === 'closed') || []
  const filteredPorts = device.ports?.filter(port => port.state === 'filtered') || []

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text)
  }

  return (
    <div className={cn('space-y-6', className)}>
      {/* Device Overview */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <Monitor className="h-6 w-6" />
              <span>{device.hostname || device.ip}</span>
            </div>
            <div className="flex items-center space-x-2">
              {device.isActive ? (
                <Badge variant="success" className="flex items-center space-x-1">
                  <CheckCircle className="h-3 w-3" />
                  <span>Online</span>
                </Badge>
              ) : (
                <Badge variant="destructive" className="flex items-center space-x-1">
                  <XCircle className="h-3 w-3" />
                  <span>Offline</span>
                </Badge>
              )}
              {device.riskLevel && (
                <Badge 
                  variant={device.riskLevel === 'high' ? 'destructive' : 
                           device.riskLevel === 'medium' ? 'warning' : 'success'}
                >
                  {device.riskLevel} risk
                </Badge>
              )}
            </div>
          </CardTitle>
        </CardHeader>
        
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {/* Basic Info */}
            <div className="space-y-3">
              <h3 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide">
                Basic Information
              </h3>
              
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm">IP Address:</span>
                  <div className="flex items-center space-x-1">
                    <code className="text-sm font-mono">{device.ip}</code>
                    <button 
                      onClick={() => copyToClipboard(device.ip)}
                      className="p-1 hover:bg-muted rounded"
                    >
                      <Copy className="h-3 w-3" />
                    </button>
                  </div>
                </div>
                
                {device.hostname && (
                  <div className="flex items-center justify-between">
                    <span className="text-sm">Hostname:</span>
                    <div className="flex items-center space-x-1">
                      <span className="text-sm font-medium">{device.hostname}</span>
                      <button 
                        onClick={() => copyToClipboard(device.hostname!)}
                        className="p-1 hover:bg-muted rounded"
                      >
                        <Copy className="h-3 w-3" />
                      </button>
                    </div>
                  </div>
                )}
                
                {device.mac && (
                  <div className="flex items-center justify-between">
                    <span className="text-sm">MAC Address:</span>
                    <code className="text-sm font-mono">{device.mac}</code>
                  </div>
                )}
                
                {device.vendor && (
                  <div className="flex items-center justify-between">
                    <span className="text-sm">Vendor:</span>
                    <span className="text-sm font-medium">{device.vendor}</span>
                  </div>
                )}
              </div>
            </div>

            {/* System Info */}
            {device.osInfo && (
              <div className="space-y-3">
                <h3 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide">
                  System Information
                </h3>
                
                <div className="space-y-2">
                  {device.osInfo.name && (
                    <div className="flex items-center justify-between">
                      <span className="text-sm">OS Name:</span>
                      <span className="text-sm font-medium">{device.osInfo.name}</span>
                    </div>
                  )}
                  
                  {device.osInfo.version && (
                    <div className="flex items-center justify-between">
                      <span className="text-sm">Version:</span>
                      <span className="text-sm font-medium">{device.osInfo.version}</span>
                    </div>
                  )}
                  
                  {device.osInfo.family && (
                    <div className="flex items-center justify-between">
                      <span className="text-sm">Family:</span>
                      <span className="text-sm font-medium">{device.osInfo.family}</span>
                    </div>
                  )}
                  
                  {device.osInfo.accuracy && (
                    <div className="flex items-center justify-between">
                      <span className="text-sm">Accuracy:</span>
                      <Badge variant="outline">{device.osInfo.accuracy}%</Badge>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Status Info */}
            <div className="space-y-3">
              <h3 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide">
                Status & Performance
              </h3>
              
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm flex items-center space-x-1">
                    <Clock className="h-3 w-3" />
                    <span>Last Seen:</span>
                  </span>
                  <span className="text-sm">{formatRelativeTime(device.lastSeen)}</span>
                </div>
                
                {device.responseTime && (
                  <div className="flex items-center justify-between">
                    <span className="text-sm flex items-center space-x-1">
                      <Activity className="h-3 w-3" />
                      <span>Response Time:</span>
                    </span>
                    <Badge variant="outline">{device.responseTime}ms</Badge>
                  </div>
                )}
                
                {device.uptimeSeconds && (
                  <div className="flex items-center justify-between">
                    <span className="text-sm">Uptime:</span>
                    <span className="text-sm">{formatDuration(device.uptimeSeconds * 1000)}</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Ports and Services */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Ports */}
        {device.ports && device.ports.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Shield className="h-5 w-5" />
                <span>Ports ({device.ports.length})</span>
              </CardTitle>
            </CardHeader>
            
            <CardContent>
              <div className="space-y-4">
                {/* Port Summary */}
                <div className="flex space-x-4">
                  <Badge variant="success" className="flex items-center space-x-1">
                    <CheckCircle className="h-3 w-3" />
                    <span>{openPorts.length} open</span>
                  </Badge>
                  <Badge variant="secondary" className="flex items-center space-x-1">
                    <XCircle className="h-3 w-3" />
                    <span>{closedPorts.length} closed</span>
                  </Badge>
                  {filteredPorts.length > 0 && (
                    <Badge variant="warning" className="flex items-center space-x-1">
                      <EyeOff className="h-3 w-3" />
                      <span>{filteredPorts.length} filtered</span>
                    </Badge>
                  )}
                </div>

                {/* Port List */}
                <div className="space-y-2 max-h-60 overflow-y-auto">
                  {device.ports.map((port: Port, index: number) => {
                    const StateIcon = getPortStateIcon(port.state)
                    return (
                      <div key={`${port.number}-${port.protocol}-${index}`} 
                           className="flex items-center justify-between p-2 rounded border">
                        <div className="flex items-center space-x-2">
                          <StateIcon className={cn('h-4 w-4', getPortStateColor(port.state))} />
                          <span className="font-mono text-sm">
                            {port.number}/{port.protocol}
                          </span>
                          {port.serviceName && (
                            <Badge variant="outline" className="text-xs">
                              {port.serviceName}
                            </Badge>
                          )}
                        </div>
                        <Badge 
                          variant={port.state === 'open' ? 'success' : 
                                   port.state === 'closed' ? 'secondary' : 'warning'}
                          className="text-xs"
                        >
                          {port.state}
                        </Badge>
                      </div>
                    )
                  })}
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Services */}
        {device.services && device.services.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Server className="h-5 w-5" />
                <span>Services ({device.services.length})</span>
              </CardTitle>
            </CardHeader>
            
            <CardContent>
              <div className="space-y-2 max-h-60 overflow-y-auto">
                {device.services.map((service: Service, index: number) => (
                  <div key={`${service.port}-${service.protocol}-${index}`} 
                       className="flex items-center justify-between p-2 rounded border">
                    <div className="space-y-1">
                      <div className="flex items-center space-x-2">
                        <span className="font-medium text-sm">{service.name}</span>
                        <span className="font-mono text-xs text-muted-foreground">
                          :{service.port}
                        </span>
                      </div>
                      {service.product && (
                        <div className="flex items-center space-x-1 text-xs text-muted-foreground">
                          <span>{service.product}</span>
                          {service.version && <span>v{service.version}</span>}
                        </div>
                      )}
                    </div>
                    {service.confidence && (
                      <Badge variant="outline" className="text-xs">
                        {service.confidence}% confident
                      </Badge>
                    )}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Notes and Additional Info */}
      {(device.notes || device.fingerprint) && (
        <Card>
          <CardHeader>
            <CardTitle>Additional Information</CardTitle>
          </CardHeader>
          
          <CardContent className="space-y-4">
            {device.notes && (
              <div>
                <h4 className="text-sm font-semibold mb-2">Notes</h4>
                <p className="text-sm text-muted-foreground">{device.notes}</p>
              </div>
            )}
            
            {device.fingerprint && (
              <div>
                <h4 className="text-sm font-semibold mb-2">Device Fingerprint</h4>
                <code className="text-xs bg-muted p-2 rounded block overflow-x-auto">
                  {device.fingerprint}
                </code>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  )
}