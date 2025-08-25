import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle, Button, Badge, Input } from '@/components/ui'
import { useDeviceDetails, usePortScan } from '@/hooks'
import { LoadingState, DataTable } from '@/components/common'
import { cn } from '@/lib/utils'
import type { Device, Port, Service } from '@nmapper/shared'
import {
  Network,
  Shield,
  AlertTriangle,
  CheckCircle,
  Clock,
  Search,
  Filter,
  RefreshCw,
  Globe,
  Lock,
  Unlock,
  Eye,
  EyeOff,
  ExternalLink,
  Play,
  Pause,
  Square,
  Info,
  Activity,
  Zap,
  Server,
  Database,
  Mail,
  FileText,
  Monitor
} from 'lucide-react'

interface DevicePortsCardProps {
  deviceId: string
  onServiceClick?: (service: Service) => void
  className?: string
}

export function DevicePortsCard({ deviceId, onServiceClick, className }: DevicePortsCardProps) {
  const { data: device, isLoading, error } = useDeviceDetails(deviceId)
  const { scanPorts, isScanning } = usePortScan()
  
  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [protocolFilter, setProtocolFilter] = useState<string>('all')
  const [showOnlyOpen, setShowOnlyOpen] = useState(false)
  const [sortField, setSortField] = useState<'port' | 'service' | 'status'>('port')
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc')

  const serviceIcons = {
    http: Globe,
    https: Lock,
    ssh: Shield,
    ftp: FileText,
    smtp: Mail,
    dns: Server,
    dhcp: Network,
    snmp: Activity,
    mysql: Database,
    postgres: Database,
    redis: Database,
    mongodb: Database,
    vnc: Monitor,
    rdp: Monitor
  }

  const getServiceIcon = (serviceName: string) => {
    const key = serviceName.toLowerCase()
    return serviceIcons[key as keyof typeof serviceIcons] || Network
  }

  const getStatusColor = (status: string) => {
    switch (status?.toLowerCase()) {
      case 'open': return 'text-green-500'
      case 'closed': return 'text-red-500'
      case 'filtered': return 'text-yellow-500'
      default: return 'text-gray-500'
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status?.toLowerCase()) {
      case 'open': return CheckCircle
      case 'closed': return Square
      case 'filtered': return AlertTriangle
      default: return Clock
    }
  }

  const getSecurityLevel = (port: Port): 'low' | 'medium' | 'high' | 'critical' => {
    // Common vulnerable services
    const criticalPorts = [23, 513, 514, 515, 111, 135] // telnet, rsh, rcp, lpd, rpcbind, msrpc
    const highRiskPorts = [21, 25, 53, 80, 110, 143, 993, 995] // ftp, smtp, dns, http, pop3, imap
    const mediumRiskPorts = [22, 443, 587, 3389, 5900] // ssh, https, smtp-ssl, rdp, vnc
    
    if (criticalPorts.includes(port.number)) return 'critical'
    if (highRiskPorts.includes(port.number)) return 'high'
    if (mediumRiskPorts.includes(port.number)) return 'medium'
    return 'low'
  }

  const getSecurityColor = (level: string) => {
    switch (level) {
      case 'critical': return 'bg-red-600'
      case 'high': return 'bg-orange-500'
      case 'medium': return 'bg-yellow-500'
      case 'low': return 'bg-green-500'
      default: return 'bg-gray-500'
    }
  }

  const handlePortScan = async () => {
    if (!device) return
    await scanPorts(device.ip)
  }

  const filteredPorts = device?.ports?.filter(port => {
    if (showOnlyOpen && port.state !== 'open') return false
    if (statusFilter !== 'all' && port.state !== statusFilter) return false
    if (protocolFilter !== 'all' && port.protocol !== protocolFilter) return false
    
    if (searchQuery) {
      const query = searchQuery.toLowerCase()
      return (
        port.number.toString().includes(query) ||
        port.service?.name?.toLowerCase().includes(query) ||
        port.service?.product?.toLowerCase().includes(query) ||
        port.service?.version?.toLowerCase().includes(query)
      )
    }
    
    return true
  }) || []

  const sortedPorts = [...filteredPorts].sort((a, b) => {
    let aVal, bVal
    
    switch (sortField) {
      case 'port':
        aVal = a.number
        bVal = b.number
        break
      case 'service':
        aVal = a.service?.name || ''
        bVal = b.service?.name || ''
        break
      case 'status':
        aVal = a.state
        bVal = b.state
        break
      default:
        aVal = a.number
        bVal = b.number
    }
    
    if (sortOrder === 'asc') {
      return aVal < bVal ? -1 : aVal > bVal ? 1 : 0
    } else {
      return aVal > bVal ? -1 : aVal < bVal ? 1 : 0
    }
  })

  const openPorts = device?.ports?.filter(p => p.state === 'open') || []
  const closedPorts = device?.ports?.filter(p => p.state === 'closed') || []
  const filteredPortsCount = device?.ports?.filter(p => p.state === 'filtered') || []

  const columns = [
    {
      key: 'port',
      title: 'Port',
      render: (port: Port) => (
        <div className="flex items-center space-x-2">
          <span className="font-mono font-medium">{port.number}</span>
          <span className="text-xs text-muted-foreground uppercase">{port.protocol}</span>
        </div>
      ),
      sortable: true
    },
    {
      key: 'status',
      title: 'Status',
      render: (port: Port) => {
        const StatusIcon = getStatusIcon(port.state)
        return (
          <div className="flex items-center space-x-2">
            <StatusIcon className={cn('h-4 w-4', getStatusColor(port.state))} />
            <span className="capitalize text-sm">{port.state}</span>
          </div>
        )
      },
      sortable: true
    },
    {
      key: 'service',
      title: 'Service',
      render: (port: Port) => {
        if (!port.service) {
          return <span className="text-sm text-muted-foreground">Unknown</span>
        }
        
        const ServiceIcon = getServiceIcon(port.service.name)
        return (
          <div className="flex items-center space-x-2">
            <ServiceIcon className="h-4 w-4 text-muted-foreground" />
            <div>
              <p className="text-sm font-medium">{port.service.name}</p>
              {port.service.product && (
                <p className="text-xs text-muted-foreground">
                  {port.service.product} {port.service.version}
                </p>
              )}
            </div>
          </div>
        )
      },
      sortable: true
    },
    {
      key: 'security',
      title: 'Security',
      render: (port: Port) => {
        const level = getSecurityLevel(port)
        return (
          <div className="flex items-center space-x-2">
            <div className={cn('w-2 h-2 rounded-full', getSecurityColor(level))} />
            <span className="text-xs capitalize">{level}</span>
          </div>
        )
      }
    },
    {
      key: 'actions',
      title: 'Actions',
      render: (port: Port) => (
        <div className="flex items-center space-x-1">
          {port.service && onServiceClick && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onServiceClick(port.service!)}
              className="h-7 w-7 p-0"
            >
              <Info className="h-3 w-3" />
            </Button>
          )}
          
          {port.state === 'open' && ['http', 'https'].includes(port.service?.name || '') && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => window.open(`${port.service?.name}://${device?.ip}:${port.number}`, '_blank')}
              className="h-7 w-7 p-0"
            >
              <ExternalLink className="h-3 w-3" />
            </Button>
          )}
        </div>
      )
    }
  ]

  if (isLoading) {
    return (
      <Card className={cn('h-full', className)}>
        <LoadingState
          type="card"
          icon="network"
          title="Loading Port Information"
          description="Scanning device ports and services..."
        />
      </Card>
    )
  }

  if (error || !device) {
    return (
      <Card className={cn('h-full', className)}>
        <CardContent className="flex items-center justify-center h-48">
          <div className="text-center">
            <Network className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
            <p className="text-sm text-muted-foreground">Unable to load port information</p>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className={cn('h-full', className)}>
      <CardHeader className="pb-4">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg flex items-center space-x-2">
            <Network className="h-5 w-5" />
            <span>Ports & Services</span>
          </CardTitle>
          
          <div className="flex items-center space-x-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handlePortScan}
              disabled={isScanning}
            >
              <RefreshCw className={cn('h-4 w-4', isScanning && 'animate-spin')} />
            </Button>
          </div>
        </div>

        {/* Summary Statistics */}
        <div className="grid grid-cols-3 gap-4 mt-4">
          <div className="text-center p-3 bg-green-50 dark:bg-green-950/20 rounded-lg">
            <p className="text-2xl font-bold text-green-600">{openPorts.length}</p>
            <p className="text-xs text-muted-foreground">Open Ports</p>
          </div>
          <div className="text-center p-3 bg-red-50 dark:bg-red-950/20 rounded-lg">
            <p className="text-2xl font-bold text-red-600">{closedPorts.length}</p>
            <p className="text-xs text-muted-foreground">Closed Ports</p>
          </div>
          <div className="text-center p-3 bg-yellow-50 dark:bg-yellow-950/20 rounded-lg">
            <p className="text-2xl font-bold text-yellow-600">{filteredPortsCount.length}</p>
            <p className="text-xs text-muted-foreground">Filtered Ports</p>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Search and Filters */}
        <div className="flex flex-col sm:flex-row gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search ports, services, versions..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
          
          <div className="flex space-x-2">
            <Button
              variant={showOnlyOpen ? 'default' : 'outline'}
              size="sm"
              onClick={() => setShowOnlyOpen(!showOnlyOpen)}
            >
              {showOnlyOpen ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
            </Button>
            
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-3 py-2 text-sm border rounded-md bg-background"
            >
              <option value="all">All Status</option>
              <option value="open">Open</option>
              <option value="closed">Closed</option>
              <option value="filtered">Filtered</option>
            </select>
            
            <select
              value={protocolFilter}
              onChange={(e) => setProtocolFilter(e.target.value)}
              className="px-3 py-2 text-sm border rounded-md bg-background"
            >
              <option value="all">All Protocols</option>
              <option value="tcp">TCP</option>
              <option value="udp">UDP</option>
            </select>
          </div>
        </div>

        {/* Results Count */}
        <div className="flex items-center justify-between text-sm text-muted-foreground">
          <span>
            Showing {sortedPorts.length} of {device.ports?.length || 0} ports
          </span>
          
          <div className="flex items-center space-x-2">
            <span>Sort by:</span>
            <select
              value={sortField}
              onChange={(e) => setSortField(e.target.value as any)}
              className="text-xs border rounded px-2 py-1 bg-background"
            >
              <option value="port">Port</option>
              <option value="service">Service</option>
              <option value="status">Status</option>
            </select>
            
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
              className="h-6 w-6 p-0"
            >
              {sortOrder === 'asc' ? '↑' : '↓'}
            </Button>
          </div>
        </div>

        {/* Ports Table */}
        <div className="border rounded-lg overflow-hidden">
          <DataTable
            data={sortedPorts}
            columns={columns}
            emptyMessage="No ports found matching your criteria"
            className="h-96"
          />
        </div>

        {/* Common Services Quick Actions */}
        {openPorts.length > 0 && (
          <div className="space-y-2">
            <h4 className="text-sm font-medium text-muted-foreground">Quick Actions</h4>
            <div className="flex flex-wrap gap-2">
              {openPorts
                .filter(port => ['http', 'https', 'ftp', 'ssh'].includes(port.service?.name || ''))
                .slice(0, 4)
                .map(port => {
                  const ServiceIcon = getServiceIcon(port.service?.name || '')
                  return (
                    <Button
                      key={`${port.protocol}-${port.number}`}
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        if (port.service?.name === 'http' || port.service?.name === 'https') {
                          window.open(`${port.service.name}://${device.ip}:${port.number}`, '_blank')
                        }
                      }}
                    >
                      <ServiceIcon className="h-4 w-4 mr-2" />
                      {port.service?.name?.toUpperCase()} ({port.number})
                    </Button>
                  )
                })}
            </div>
          </div>
        )}

        {/* Security Summary */}
        <div className="space-y-2">
          <h4 className="text-sm font-medium text-muted-foreground">Security Assessment</h4>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {(['critical', 'high', 'medium', 'low'] as const).map(level => {
              const count = openPorts.filter(port => getSecurityLevel(port) === level).length
              return (
                <div key={level} className="flex items-center space-x-2 p-2 border rounded">
                  <div className={cn('w-2 h-2 rounded-full', getSecurityColor(level))} />
                  <span className="text-xs capitalize">{level}</span>
                  <Badge variant="secondary" className="text-xs ml-auto">
                    {count}
                  </Badge>
                </div>
              )
            })}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}