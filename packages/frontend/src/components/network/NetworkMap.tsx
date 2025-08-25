import { useState, useMemo } from 'react'
import { Card, CardContent, CardHeader, CardTitle, Button, Badge } from '@/components/ui'
import { TopologyCanvas } from './TopologyCanvas'
import { useNetworkTopology, useNetworkDevices } from '@/hooks'
import { cn } from '@/lib/utils'
import type { Device } from '@nmapper/shared'
import {
  Network,
  Filter,
  Eye,
  EyeOff,
  Settings,
  RefreshCw,
  Layers,
  MapPin,
  Activity,
  AlertTriangle,
  Wifi,
  WifiOff
} from 'lucide-react'

interface NetworkMapProps {
  onDeviceSelect?: (device: Device) => void
  onDeviceDoubleClick?: (deviceId: string) => void
  showFilters?: boolean
  className?: string
}

interface MapFilters {
  showOffline: boolean
  showLowRisk: boolean
  showMediumRisk: boolean
  showHighRisk: boolean
  showGateways: boolean
  showDevices: boolean
  showConnections: boolean
  riskThreshold: 'all' | 'medium' | 'high'
}

export function NetworkMap({
  onDeviceSelect,
  onDeviceDoubleClick,
  showFilters = true,
  className
}: NetworkMapProps) {
  const { data: topologyData, isLoading: topologyLoading, error: topologyError } = useNetworkTopology()
  const { data: devices = [], isLoading: devicesLoading } = useNetworkDevices()
  
  const [filters, setFilters] = useState<MapFilters>({
    showOffline: true,
    showLowRisk: true,
    showMediumRisk: true,
    showHighRisk: true,
    showGateways: true,
    showDevices: true,
    showConnections: true,
    riskThreshold: 'all'
  })
  
  const [showSettings, setShowSettings] = useState(false)
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null)

  // Process topology data with filters applied
  const { filteredNodes, filteredEdges, stats } = useMemo(() => {
    if (!topologyData) {
      return { filteredNodes: [], filteredEdges: [], stats: { total: 0, online: 0, offline: 0, high: 0, medium: 0, low: 0 } }
    }

    // Filter nodes based on current filters
    const nodes = topologyData.nodes.filter(node => {
      // Status filters
      if (!filters.showOffline && node.status === 'offline') return false
      if (node.status === 'online' && (
        (!filters.showLowRisk && node.riskLevel === 'low') ||
        (!filters.showMediumRisk && node.riskLevel === 'medium') ||
        (!filters.showHighRisk && node.riskLevel === 'high')
      )) return false

      // Type filters
      if (!filters.showGateways && node.type === 'gateway') return false
      if (!filters.showDevices && node.type === 'device') return false

      // Risk threshold filter
      if (filters.riskThreshold === 'medium' && node.riskLevel === 'low') return false
      if (filters.riskThreshold === 'high' && (node.riskLevel === 'low' || node.riskLevel === 'medium')) return false

      return true
    })

    // Filter edges based on node visibility and connection filter
    const nodeIds = new Set(nodes.map(n => n.id))
    const edges = filters.showConnections ? topologyData.edges.filter(edge => 
      nodeIds.has(edge.source) && nodeIds.has(edge.target)
    ) : []

    // Calculate stats
    const stats = {
      total: nodes.length,
      online: nodes.filter(n => n.status === 'online').length,
      offline: nodes.filter(n => n.status === 'offline').length,
      high: nodes.filter(n => n.riskLevel === 'high').length,
      medium: nodes.filter(n => n.riskLevel === 'medium').length,
      low: nodes.filter(n => n.riskLevel === 'low').length
    }

    return { filteredNodes: nodes, filteredEdges: edges, stats }
  }, [topologyData, filters])

  // Handle node selection
  const handleNodeSelect = (nodeId: string) => {
    setSelectedNodeId(nodeId)
    
    // Find corresponding device
    const device = devices.find(d => d.ip === nodeId)
    if (device && onDeviceSelect) {
      onDeviceSelect(device)
    }
  }

  // Handle node double click
  const handleNodeDoubleClick = (nodeId: string) => {
    if (onDeviceDoubleClick) {
      onDeviceDoubleClick(nodeId)
    }
  }

  // Filter controls
  const toggleFilter = (key: keyof MapFilters, value?: any) => {
    setFilters(prev => ({
      ...prev,
      [key]: value !== undefined ? value : !prev[key]
    }))
  }

  const resetFilters = () => {
    setFilters({
      showOffline: true,
      showLowRisk: true,
      showMediumRisk: true,
      showHighRisk: true,
      showGateways: true,
      showDevices: true,
      showConnections: true,
      riskThreshold: 'all'
    })
  }

  if (topologyError) {
    return (
      <Card className={className}>
        <CardContent className="flex items-center justify-center py-12">
          <div className="text-center">
            <Network className="mx-auto h-12 w-12 text-red-500 mb-4" />
            <h3 className="text-lg font-semibold text-red-700 mb-2">Failed to Load Network Map</h3>
            <p className="text-sm text-muted-foreground mb-4">
              {topologyError instanceof Error ? topologyError.message : 'Unable to load network topology'}
            </p>
            <Button onClick={() => window.location.reload()} variant="outline" size="sm">
              <RefreshCw className="h-4 w-4 mr-2" />
              Retry
            </Button>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className={cn('space-y-4', className)}>
      {/* Network Statistics */}
      <div className="grid grid-cols-2 md:grid-cols-6 gap-4">
        <Card className="p-4">
          <div className="flex items-center space-x-2">
            <MapPin className="h-4 w-4 text-blue-500" />
            <div>
              <p className="text-lg font-bold">{stats.total}</p>
              <p className="text-xs text-muted-foreground">Total Nodes</p>
            </div>
          </div>
        </Card>

        <Card className="p-4">
          <div className="flex items-center space-x-2">
            <Wifi className="h-4 w-4 text-green-500" />
            <div>
              <p className="text-lg font-bold text-green-600">{stats.online}</p>
              <p className="text-xs text-muted-foreground">Online</p>
            </div>
          </div>
        </Card>

        <Card className="p-4">
          <div className="flex items-center space-x-2">
            <WifiOff className="h-4 w-4 text-red-500" />
            <div>
              <p className="text-lg font-bold text-red-600">{stats.offline}</p>
              <p className="text-xs text-muted-foreground">Offline</p>
            </div>
          </div>
        </Card>

        <Card className="p-4">
          <div className="flex items-center space-x-2">
            <AlertTriangle className="h-4 w-4 text-red-500" />
            <div>
              <p className="text-lg font-bold text-red-600">{stats.high}</p>
              <p className="text-xs text-muted-foreground">High Risk</p>
            </div>
          </div>
        </Card>

        <Card className="p-4">
          <div className="flex items-center space-x-2">
            <AlertTriangle className="h-4 w-4 text-yellow-500" />
            <div>
              <p className="text-lg font-bold text-yellow-600">{stats.medium}</p>
              <p className="text-xs text-muted-foreground">Medium Risk</p>
            </div>
          </div>
        </Card>

        <Card className="p-4">
          <div className="flex items-center space-x-2">
            <Activity className="h-4 w-4 text-green-500" />
            <div>
              <p className="text-lg font-bold text-green-600">{filteredEdges.length}</p>
              <p className="text-xs text-muted-foreground">Connections</p>
            </div>
          </div>
        </Card>
      </div>

      {/* Filters Panel */}
      {showFilters && (
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg flex items-center space-x-2">
                <Filter className="h-4 w-4" />
                <span>Map Filters</span>
              </CardTitle>
              <div className="flex items-center space-x-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={resetFilters}
                  className="text-muted-foreground hover:text-foreground"
                >
                  Reset
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowSettings(!showSettings)}
                >
                  <Settings className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </CardHeader>

          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {/* Visibility Controls */}
              <div>
                <h4 className="text-sm font-medium mb-3 flex items-center space-x-2">
                  <Eye className="h-4 w-4" />
                  <span>Visibility</span>
                </h4>
                <div className="space-y-2">
                  <div className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      id="show-devices"
                      checked={filters.showDevices}
                      onChange={() => toggleFilter('showDevices')}
                      className="rounded"
                    />
                    <label htmlFor="show-devices" className="text-sm">Show Devices</label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      id="show-gateways"
                      checked={filters.showGateways}
                      onChange={() => toggleFilter('showGateways')}
                      className="rounded"
                    />
                    <label htmlFor="show-gateways" className="text-sm">Show Gateways</label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      id="show-connections"
                      checked={filters.showConnections}
                      onChange={() => toggleFilter('showConnections')}
                      className="rounded"
                    />
                    <label htmlFor="show-connections" className="text-sm">Show Connections</label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      id="show-offline"
                      checked={filters.showOffline}
                      onChange={() => toggleFilter('showOffline')}
                      className="rounded"
                    />
                    <label htmlFor="show-offline" className="text-sm">Show Offline Devices</label>
                  </div>
                </div>
              </div>

              {/* Risk Level Controls */}
              <div>
                <h4 className="text-sm font-medium mb-3 flex items-center space-x-2">
                  <AlertTriangle className="h-4 w-4" />
                  <span>Risk Levels</span>
                </h4>
                <div className="space-y-2">
                  <div className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      id="show-high-risk"
                      checked={filters.showHighRisk}
                      onChange={() => toggleFilter('showHighRisk')}
                      className="rounded"
                    />
                    <label htmlFor="show-high-risk" className="text-sm text-red-600">High Risk ({stats.high})</label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      id="show-medium-risk"
                      checked={filters.showMediumRisk}
                      onChange={() => toggleFilter('showMediumRisk')}
                      className="rounded"
                    />
                    <label htmlFor="show-medium-risk" className="text-sm text-yellow-600">Medium Risk ({stats.medium})</label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      id="show-low-risk"
                      checked={filters.showLowRisk}
                      onChange={() => toggleFilter('showLowRisk')}
                      className="rounded"
                    />
                    <label htmlFor="show-low-risk" className="text-sm text-green-600">Low Risk ({stats.low})</label>
                  </div>
                </div>
              </div>

              {/* Risk Threshold */}
              <div>
                <h4 className="text-sm font-medium mb-3 flex items-center space-x-2">
                  <Layers className="h-4 w-4" />
                  <span>Display Threshold</span>
                </h4>
                <div className="space-y-2">
                  <div className="flex items-center space-x-2">
                    <input
                      type="radio"
                      id="threshold-all"
                      name="threshold"
                      checked={filters.riskThreshold === 'all'}
                      onChange={() => toggleFilter('riskThreshold', 'all')}
                    />
                    <label htmlFor="threshold-all" className="text-sm">Show All</label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <input
                      type="radio"
                      id="threshold-medium"
                      name="threshold"
                      checked={filters.riskThreshold === 'medium'}
                      onChange={() => toggleFilter('riskThreshold', 'medium')}
                    />
                    <label htmlFor="threshold-medium" className="text-sm">Medium+ Risk Only</label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <input
                      type="radio"
                      id="threshold-high"
                      name="threshold"
                      checked={filters.riskThreshold === 'high'}
                      onChange={() => toggleFilter('riskThreshold', 'high')}
                    />
                    <label htmlFor="threshold-high" className="text-sm">High Risk Only</label>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Topology Canvas */}
      {topologyLoading || devicesLoading ? (
        <Card>
          <CardContent className="flex items-center justify-center py-12">
            <div className="text-center">
              <RefreshCw className="mx-auto h-8 w-8 text-blue-500 animate-spin mb-4" />
              <h3 className="text-lg font-semibold mb-2">Loading Network Map</h3>
              <p className="text-sm text-muted-foreground">
                Discovering network topology and device relationships...
              </p>
            </div>
          </CardContent>
        </Card>
      ) : filteredNodes.length === 0 ? (
        <Card>
          <CardContent className="flex items-center justify-center py-12">
            <div className="text-center">
              <Network className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-2">No Network Nodes</h3>
              <p className="text-sm text-muted-foreground mb-4">
                {Object.values(filters).some(f => f === false) 
                  ? 'Try adjusting the filters to show more devices'
                  : 'No devices found on the network. Start a scan to discover devices.'}
              </p>
              {Object.values(filters).some(f => f === false) && (
                <Button onClick={resetFilters} variant="outline" size="sm">
                  Reset Filters
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      ) : (
        <TopologyCanvas
          nodes={filteredNodes}
          edges={filteredEdges}
          onNodeSelect={handleNodeSelect}
          onNodeDoubleClick={handleNodeDoubleClick}
        />
      )}

      {/* Selected Node Details */}
      {selectedNodeId && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Selected Node Details</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {(() => {
                const node = filteredNodes.find(n => n.id === selectedNodeId)
                const device = devices.find(d => d.ip === selectedNodeId)
                
                if (!node) return <p>Node not found</p>
                
                return (
                  <>
                    <div>
                      <p className="text-sm font-medium">Node ID</p>
                      <p className="text-sm text-muted-foreground font-mono">{node.id}</p>
                    </div>
                    <div>
                      <p className="text-sm font-medium">Label</p>
                      <p className="text-sm text-muted-foreground">{node.label}</p>
                    </div>
                    <div>
                      <p className="text-sm font-medium">Type</p>
                      <Badge variant="outline" className="text-xs">
                        {node.type}
                      </Badge>
                    </div>
                    <div>
                      <p className="text-sm font-medium">Status</p>
                      <Badge variant={node.status === 'online' ? 'success' : 'destructive'} className="text-xs">
                        {node.status}
                      </Badge>
                    </div>
                    <div>
                      <p className="text-sm font-medium">Risk Level</p>
                      <Badge 
                        variant={
                          node.riskLevel === 'high' ? 'destructive' :
                          node.riskLevel === 'medium' ? 'warning' : 'success'
                        } 
                        className="text-xs"
                      >
                        {node.riskLevel}
                      </Badge>
                    </div>
                    {device && (
                      <>
                        <div>
                          <p className="text-sm font-medium">MAC Address</p>
                          <p className="text-sm text-muted-foreground font-mono">{device.macAddress || 'Unknown'}</p>
                        </div>
                        <div>
                          <p className="text-sm font-medium">Device Type</p>
                          <p className="text-sm text-muted-foreground">{device.deviceType || 'Unknown'}</p>
                        </div>
                        <div>
                          <p className="text-sm font-medium">Last Seen</p>
                          <p className="text-sm text-muted-foreground">
                            {new Date(device.lastSeen).toLocaleString()}
                          </p>
                        </div>
                      </>
                    )}
                  </>
                )
              })()}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}