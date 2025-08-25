import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle, Button } from '@/components/ui'
import { cn } from '@/lib/utils'
import {
  Info,
  Monitor,
  Router,
  Server,
  Printer,
  Smartphone,
  Wifi,
  Shield,
  Zap,
  AlertTriangle,
  CheckCircle,
  Clock,
  X,
  Eye,
  EyeOff,
  Minimize2,
  ChevronDown,
  ChevronRight,
  Circle,
  Square,
  Triangle,
  Diamond,
  Hexagon,
  Minus
} from 'lucide-react'

interface TopologyLegendProps {
  onClose?: () => void
  showConnections?: boolean
  showDeviceTypes?: boolean
  showStatus?: boolean
  showSecurity?: boolean
  className?: string
}

export function TopologyLegend({
  onClose,
  showConnections = true,
  showDeviceTypes = true,
  showStatus = true,
  showSecurity = true,
  className
}: TopologyLegendProps) {
  const [isMinimized, setIsMinimized] = useState(false)
  const [expandedSections, setExpandedSections] = useState<{[key: string]: boolean}>({
    devices: true,
    status: true,
    connections: false,
    security: false
  })

  const deviceTypes = [
    { 
      id: 'computer', 
      name: 'Computer/Workstation', 
      icon: Monitor, 
      color: 'bg-blue-500',
      shape: 'circle',
      description: 'Desktop computers, laptops, workstations'
    },
    { 
      id: 'router', 
      name: 'Router', 
      icon: Router, 
      color: 'bg-green-600',
      shape: 'square',
      description: 'Network routers and gateways'
    },
    { 
      id: 'switch', 
      name: 'Switch/Hub', 
      icon: Wifi, 
      color: 'bg-green-500',
      shape: 'hexagon',
      description: 'Network switches and hubs'
    },
    { 
      id: 'server', 
      name: 'Server', 
      icon: Server, 
      color: 'bg-purple-600',
      shape: 'square',
      description: 'Servers and network appliances'
    },
    { 
      id: 'printer', 
      name: 'Printer/Scanner', 
      icon: Printer, 
      color: 'bg-orange-500',
      shape: 'triangle',
      description: 'Printers, scanners, and MFPs'
    },
    { 
      id: 'phone', 
      name: 'Mobile Device', 
      icon: Smartphone, 
      color: 'bg-cyan-500',
      shape: 'circle',
      description: 'Phones, tablets, IoT devices'
    }
  ]

  const statusTypes = [
    {
      id: 'online',
      name: 'Online',
      icon: CheckCircle,
      color: 'text-green-500',
      borderColor: 'border-green-500',
      description: 'Device is reachable and responding'
    },
    {
      id: 'offline',
      name: 'Offline',
      icon: X,
      color: 'text-red-500',
      borderColor: 'border-red-500',
      description: 'Device is not responding'
    },
    {
      id: 'warning',
      name: 'Warning',
      icon: AlertTriangle,
      color: 'text-yellow-500',
      borderColor: 'border-yellow-500',
      description: 'Device has issues or anomalies'
    },
    {
      id: 'unknown',
      name: 'Unknown',
      icon: Clock,
      color: 'text-gray-500',
      borderColor: 'border-gray-500',
      description: 'Status is being determined'
    }
  ]

  const connectionTypes = [
    {
      id: 'ethernet',
      name: 'Ethernet',
      style: 'solid',
      color: 'border-blue-500',
      width: '2px',
      description: 'Wired ethernet connection'
    },
    {
      id: 'wireless',
      name: 'Wireless',
      style: 'dashed',
      color: 'border-green-500',
      width: '2px',
      description: 'WiFi or wireless connection'
    },
    {
      id: 'vpn',
      name: 'VPN Tunnel',
      style: 'dotted',
      color: 'border-purple-500',
      width: '3px',
      description: 'VPN or encrypted tunnel'
    },
    {
      id: 'slow',
      name: 'Slow Connection',
      style: 'solid',
      color: 'border-yellow-500',
      width: '1px',
      description: 'Connection with high latency'
    },
    {
      id: 'blocked',
      name: 'Blocked/Firewalled',
      style: 'solid',
      color: 'border-red-500',
      width: '2px',
      description: 'Connection blocked by firewall'
    }
  ]

  const securityLevels = [
    {
      id: 'low',
      name: 'Low Risk',
      color: 'bg-green-500',
      icon: Shield,
      description: 'Secure device with no known vulnerabilities'
    },
    {
      id: 'medium',
      name: 'Medium Risk',
      color: 'bg-yellow-500',
      icon: AlertTriangle,
      description: 'Some security concerns or outdated software'
    },
    {
      id: 'high',
      name: 'High Risk',
      color: 'bg-orange-500',
      icon: AlertTriangle,
      description: 'Known vulnerabilities or security issues'
    },
    {
      id: 'critical',
      name: 'Critical Risk',
      color: 'bg-red-600',
      icon: AlertTriangle,
      description: 'Critical security vulnerabilities present'
    }
  ]

  const shapes = {
    circle: Circle,
    square: Square,
    triangle: Triangle,
    diamond: Diamond,
    hexagon: Hexagon
  }

  const toggleSection = (section: string) => {
    setExpandedSections(prev => ({
      ...prev,
      [section]: !prev[section]
    }))
  }

  if (isMinimized) {
    return (
      <div className={cn('flex space-x-1', className)}>
        <Button
          variant="secondary"
          size="sm"
          onClick={() => setIsMinimized(false)}
          className="shadow-lg"
          title="Show legend"
        >
          <Info className="h-4 w-4" />
        </Button>
      </div>
    )
  }

  return (
    <Card className={cn('w-72 shadow-lg max-h-[70vh] overflow-y-auto', className)}>
      <CardHeader className="pb-3">
        <CardTitle className="text-sm flex items-center justify-between">
          <span className="flex items-center space-x-2">
            <Info className="h-4 w-4" />
            <span>Network Legend</span>
          </span>
          <div className="flex items-center space-x-1">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsMinimized(true)}
              className="h-6 w-6 p-0"
              title="Minimize legend"
            >
              <Minimize2 className="h-3 w-3" />
            </Button>
            {onClose && (
              <Button
                variant="ghost"
                size="sm"
                onClick={onClose}
                className="h-6 w-6 p-0"
                title="Close legend"
              >
                <X className="h-3 w-3" />
              </Button>
            )}
          </div>
        </CardTitle>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Device Types */}
        {showDeviceTypes && (
          <div className="space-y-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => toggleSection('devices')}
              className="w-full justify-start h-7 text-xs font-medium text-muted-foreground"
            >
              {expandedSections.devices ? (
                <ChevronDown className="h-3 w-3 mr-1" />
              ) : (
                <ChevronRight className="h-3 w-3 mr-1" />
              )}
              Device Types
            </Button>

            {expandedSections.devices && (
              <div className="space-y-2 pl-4">
                {deviceTypes.map((device) => {
                  const ShapeIcon = shapes[device.shape as keyof typeof shapes]
                  
                  return (
                    <div key={device.id} className="flex items-center space-x-3">
                      <div className="relative">
                        <ShapeIcon className={cn('h-4 w-4', device.color.replace('bg-', 'text-'))} />
                        <device.icon className="h-2 w-2 absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 text-white" />
                      </div>
                      <div className="flex-1">
                        <p className="text-xs font-medium">{device.name}</p>
                        <p className="text-xs text-muted-foreground">{device.description}</p>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        )}

        {/* Connection Status */}
        {showStatus && (
          <div className="space-y-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => toggleSection('status')}
              className="w-full justify-start h-7 text-xs font-medium text-muted-foreground"
            >
              {expandedSections.status ? (
                <ChevronDown className="h-3 w-3 mr-1" />
              ) : (
                <ChevronRight className="h-3 w-3 mr-1" />
              )}
              Connection Status
            </Button>

            {expandedSections.status && (
              <div className="space-y-2 pl-4">
                {statusTypes.map((status) => (
                  <div key={status.id} className="flex items-center space-x-3">
                    <div className={cn('w-4 h-4 rounded border-2 flex items-center justify-center', status.borderColor)}>
                      <status.icon className={cn('h-2 w-2', status.color)} />
                    </div>
                    <div className="flex-1">
                      <p className="text-xs font-medium">{status.name}</p>
                      <p className="text-xs text-muted-foreground">{status.description}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Connection Types */}
        {showConnections && (
          <div className="space-y-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => toggleSection('connections')}
              className="w-full justify-start h-7 text-xs font-medium text-muted-foreground"
            >
              {expandedSections.connections ? (
                <ChevronDown className="h-3 w-3 mr-1" />
              ) : (
                <ChevronRight className="h-3 w-3 mr-1" />
              )}
              Connections
            </Button>

            {expandedSections.connections && (
              <div className="space-y-2 pl-4">
                {connectionTypes.map((connection) => (
                  <div key={connection.id} className="flex items-center space-x-3">
                    <div className="w-8 h-4 flex items-center">
                      <div 
                        className={cn(
                          'h-0 w-full',
                          connection.color,
                          connection.style === 'dashed' && 'border-dashed',
                          connection.style === 'dotted' && 'border-dotted',
                          connection.style === 'solid' && 'border-solid'
                        )}
                        style={{ borderTopWidth: connection.width }}
                      />
                    </div>
                    <div className="flex-1">
                      <p className="text-xs font-medium">{connection.name}</p>
                      <p className="text-xs text-muted-foreground">{connection.description}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Security Levels */}
        {showSecurity && (
          <div className="space-y-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => toggleSection('security')}
              className="w-full justify-start h-7 text-xs font-medium text-muted-foreground"
            >
              {expandedSections.security ? (
                <ChevronDown className="h-3 w-3 mr-1" />
              ) : (
                <ChevronRight className="h-3 w-3 mr-1" />
              )}
              Security Indicators
            </Button>

            {expandedSections.security && (
              <div className="space-y-2 pl-4">
                {securityLevels.map((level) => (
                  <div key={level.id} className="flex items-center space-x-3">
                    <div className={cn('w-3 h-3 rounded-full', level.color)} />
                    <level.icon className="h-3 w-3 text-muted-foreground" />
                    <div className="flex-1">
                      <p className="text-xs font-medium">{level.name}</p>
                      <p className="text-xs text-muted-foreground">{level.description}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Interactive Help */}
        <div className="space-y-2 border-t pt-3">
          <div className="text-xs font-medium text-muted-foreground mb-2">
            Interaction Tips
          </div>
          <div className="space-y-1 text-xs text-muted-foreground">
            <p>• Click nodes to select and view details</p>
            <p>• Double-click to open device information</p>
            <p>• Drag to pan the network view</p>
            <p>• Mouse wheel to zoom in/out</p>
            <p>• Hold Ctrl and drag to select multiple nodes</p>
          </div>
        </div>

        {/* Legend Controls */}
        <div className="space-y-2 border-t pt-3">
          <div className="text-xs font-medium text-muted-foreground mb-2">
            Legend Options
          </div>
          <div className="grid grid-cols-2 gap-2">
            <Button
              variant="outline"
              size="sm"
              className="text-xs h-7"
              onClick={() => {
                setExpandedSections({
                  devices: true,
                  status: true,
                  connections: true,
                  security: true
                })
              }}
            >
              <Eye className="h-3 w-3 mr-1" />
              Show All
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="text-xs h-7"
              onClick={() => {
                setExpandedSections({
                  devices: false,
                  status: false,
                  connections: false,
                  security: false
                })
              }}
            >
              <EyeOff className="h-3 w-3 mr-1" />
              Hide All
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}