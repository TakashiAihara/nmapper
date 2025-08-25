import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle, Button, Badge } from '@/components/ui'
import { NetworkMap } from '@/components/network/NetworkMap'
import { DeviceDetailsPanel } from './DeviceDetailsPanel'
import { TopologyControls } from './TopologyControls'
import { TopologyFilters } from './TopologyFilters'
import { TopologyLegend } from './TopologyLegend'
import { useNetworkDevices, useNetworkTopology } from '@/hooks'
import { useNetworkStore } from '@/store'
import { LoadingState, ErrorState } from '@/components/common'
import { cn } from '@/lib/utils'
import type { Device } from '@nmapper/shared'
import {
  Network,
  Map,
  Filter,
  Settings,
  Maximize2,
  Minimize2,
  Info,
  Eye,
  EyeOff,
  RefreshCw,
  Download,
  Share2,
  Layers,
  Search
} from 'lucide-react'

interface NetworkTopologyPageProps {
  className?: string
}

export function NetworkTopologyPage({ className }: NetworkTopologyPageProps) {
  const { data: devices = [], isLoading: devicesLoading, error: devicesError } = useNetworkDevices()
  const { data: topologyData, isLoading: topologyLoading, error: topologyError } = useNetworkTopology()
  
  const { selectedNodes } = useNetworkStore()
  
  const [selectedDevice, setSelectedDevice] = useState<Device | null>(null)
  const [showFilters, setShowFilters] = useState(false)
  const [showLegend, setShowLegend] = useState(true)
  const [showControls, setShowControls] = useState(true)
  const [isFullscreen, setIsFullscreen] = useState(false)
  const [sidebarOpen, setSidebarOpen] = useState(false)

  // Handle device selection from topology
  const handleDeviceSelect = (device: Device) => {
    setSelectedDevice(device)
    setSidebarOpen(true)
  }

  const handleDeviceDoubleClick = (deviceId: string) => {
    const device = devices.find(d => d.ip === deviceId)
    if (device) {
      setSelectedDevice(device)
      setSidebarOpen(true)
    }
  }

  const handleExportTopology = () => {
    // This would trigger export functionality
    console.log('Exporting topology...')
  }

  const handleShareTopology = () => {
    // This would trigger share functionality
    console.log('Sharing topology...')
  }

  const toggleFullscreen = () => {
    setIsFullscreen(!isFullscreen)
  }

  const isLoading = devicesLoading || topologyLoading
  const hasError = devicesError || topologyError

  if (hasError) {
    return (
      <div className={cn('h-full', className)}>
        <ErrorState
          type="network"
          title="Network Topology Unavailable"
          description="Unable to load network topology data. Please check your connection and try again."
          onAction={() => window.location.reload()}
        />
      </div>
    )
  }

  if (isLoading) {
    return (
      <div className={cn('h-full', className)}>
        <LoadingState
          type="card"
          icon="network"
          title="Loading Network Topology"
          description="Analyzing network structure and device relationships..."
          size="lg"
        />
      </div>
    )
  }

  return (
    <div className={cn(
      'relative h-full flex flex-col',
      isFullscreen && 'fixed inset-0 z-50 bg-background',
      className
    )}>
      {/* Header */}
      <div className="flex-shrink-0 p-6 border-b">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-3xl font-bold flex items-center space-x-2">
              <Network className="h-8 w-8" />
              <span>Network Topology</span>
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              Interactive visualization of your network infrastructure
            </p>
          </div>

          <div className="flex items-center space-x-2">
            {/* Network Statistics */}
            <div className="hidden md:flex items-center space-x-4 px-4 py-2 bg-muted/50 rounded-lg">
              <div className="text-center">
                <p className="text-sm font-bold">{devices.length}</p>
                <p className="text-xs text-muted-foreground">Devices</p>
              </div>
              <div className="text-center">
                <p className="text-sm font-bold">{topologyData?.edges.length || 0}</p>
                <p className="text-xs text-muted-foreground">Connections</p>
              </div>
              <div className="text-center">
                <p className="text-sm font-bold">{selectedNodes.size}</p>
                <p className="text-xs text-muted-foreground">Selected</p>
              </div>
            </div>

            {/* Action Buttons */}
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowFilters(!showFilters)}
              className={cn(showFilters && 'bg-muted')}
            >
              <Filter className="h-4 w-4 mr-1" />
              Filters
            </Button>

            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowControls(!showControls)}
              className={cn(showControls && 'bg-muted')}
            >
              <Settings className="h-4 w-4 mr-1" />
              Controls
            </Button>

            <Button variant="outline" size="sm" onClick={handleExportTopology}>
              <Download className="h-4 w-4 mr-1" />
              Export
            </Button>

            <Button variant="outline" size="sm" onClick={handleShareTopology}>
              <Share2 className="h-4 w-4 mr-1" />
              Share
            </Button>

            <Button variant="outline" size="sm" onClick={toggleFullscreen}>
              {isFullscreen ? (
                <>
                  <Minimize2 className="h-4 w-4 mr-1" />
                  Exit
                </>
              ) : (
                <>
                  <Maximize2 className="h-4 w-4 mr-1" />
                  Fullscreen
                </>
              )}
            </Button>
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 relative overflow-hidden">
        <div className="h-full flex">
          {/* Sidebar */}
          <div className={cn(
            'transition-all duration-300 border-r bg-background',
            sidebarOpen ? 'w-80' : 'w-0',
            'flex-shrink-0 overflow-hidden'
          )}>
            {sidebarOpen && selectedDevice && (
              <div className="h-full">
                <DeviceDetailsPanel
                  device={selectedDevice}
                  onClose={() => setSidebarOpen(false)}
                />
              </div>
            )}
          </div>

          {/* Main Topology Area */}
          <div className="flex-1 relative">
            {/* Filters Panel */}
            {showFilters && (
              <div className="absolute top-4 left-4 z-20 w-80">
                <TopologyFilters />
              </div>
            )}

            {/* Controls Panel */}
            {showControls && (
              <div className="absolute top-4 right-4 z-20">
                <TopologyControls />
              </div>
            )}

            {/* Legend */}
            {showLegend && (
              <div className="absolute bottom-4 left-4 z-20">
                <TopologyLegend
                  onClose={() => setShowLegend(false)}
                />
              </div>
            )}

            {/* Toggle Buttons */}
            <div className="absolute bottom-4 right-4 z-20 flex flex-col space-y-2">
              <Button
                variant="secondary"
                size="sm"
                onClick={() => setShowLegend(!showLegend)}
                className="shadow-lg"
              >
                {showLegend ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </Button>
              
              {selectedNodes.size > 0 && (
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => setSidebarOpen(!sidebarOpen)}
                  className="shadow-lg"
                >
                  <Info className="h-4 w-4" />
                </Button>
              )}
            </div>

            {/* Search Overlay */}
            <div className="absolute top-4 left-1/2 transform -translate-x-1/2 z-20">
              <div className="flex items-center space-x-2">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <input
                    type="text"
                    placeholder="Search devices..."
                    className="pl-10 pr-4 py-2 bg-background/80 backdrop-blur-sm border rounded-lg text-sm w-64 focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                  />
                </div>
                <Button variant="secondary" size="sm" className="bg-background/80 backdrop-blur-sm">
                  <Search className="h-4 w-4" />
                </Button>
              </div>
            </div>

            {/* Network Map */}
            <div className="h-full">
              <NetworkMap
                onDeviceSelect={handleDeviceSelect}
                onDeviceDoubleClick={handleDeviceDoubleClick}
                showFilters={false} // We have our own filters
                className="h-full"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Status Bar */}
      <div className="flex-shrink-0 px-6 py-3 border-t bg-muted/30">
        <div className="flex items-center justify-between text-sm">
          <div className="flex items-center space-x-4">
            <span className="flex items-center space-x-1">
              <Map className="h-4 w-4" />
              <span>Topology View</span>
            </span>
            
            {topologyData && (
              <>
                <span>{topologyData.nodes.length} nodes</span>
                <span>{topologyData.edges.length} connections</span>
              </>
            )}
            
            {selectedNodes.size > 0 && (
              <Badge variant="default" className="text-xs">
                {selectedNodes.size} selected
              </Badge>
            )}
          </div>

          <div className="flex items-center space-x-4">
            <span className="text-muted-foreground">
              Last updated: {new Date().toLocaleTimeString()}
            </span>
            
            <Button variant="ghost" size="sm" className="text-xs">
              <RefreshCw className="h-3 w-3 mr-1" />
              Refresh
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}