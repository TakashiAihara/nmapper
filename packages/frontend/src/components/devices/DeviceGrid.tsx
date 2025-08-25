import { useState, useMemo } from 'react'
import { Card, CardContent, CardHeader, CardTitle, Badge, Button } from '@/components/ui'
import { DeviceCard } from './DeviceCard'
import { DeviceFilters } from './DeviceFilters'
import { DeviceSelection } from './DeviceSelection'
import { useFilteredDevices } from '@/hooks'
import { cn } from '@/lib/utils'
import type { Device } from '@nmapper/shared'
import {
  Grid3x3,
  List,
  Filter,
  Search,
  MoreHorizontal,
  RefreshCw,
  CheckSquare,
  Square,
  Wifi,
  WifiOff,
  AlertTriangle,
  Shield,
  Activity
} from 'lucide-react'

interface DeviceGridProps {
  onDeviceSelect?: (device: Device) => void
  onDeviceEdit?: (device: Device) => void
  onDeviceRemove?: (device: Device) => void
  showFilters?: boolean
  showSelection?: boolean
  className?: string
}

type ViewMode = 'grid' | 'list'
type SortBy = 'ip' | 'hostname' | 'riskLevel' | 'lastSeen' | 'deviceType'
type SortOrder = 'asc' | 'desc'

export function DeviceGrid({
  onDeviceSelect,
  onDeviceEdit,
  onDeviceRemove,
  showFilters = true,
  showSelection = true,
  className
}: DeviceGridProps) {
  const {
    devices,
    deviceStats,
    isLoading,
    error,
    filters,
    searchDevices,
    filterByRisk,
    filterByStatus,
    clearFilters,
    toggleDeviceSelection,
    clearDeviceSelection,
    selectAllFiltered
  } = useFilteredDevices()

  const [viewMode, setViewMode] = useState<ViewMode>('grid')
  const [showFiltersPanel, setShowFiltersPanel] = useState(false)
  const [sortBy, setSortBy] = useState<SortBy>('ip')
  const [sortOrder, setSortOrder] = useState<SortOrder>('asc')
  const [searchTerm, setSearchTerm] = useState('')

  // Sorted and filtered devices
  const sortedDevices = useMemo(() => {
    const sorted = [...devices].sort((a, b) => {
      let aValue: any
      let bValue: any

      switch (sortBy) {
        case 'ip':
          aValue = a.ip.split('.').map(n => parseInt(n).toString().padStart(3, '0')).join('.')
          bValue = b.ip.split('.').map(n => parseInt(n).toString().padStart(3, '0')).join('.')
          break
        case 'hostname':
          aValue = a.hostname || a.ip
          bValue = b.hostname || b.ip
          break
        case 'riskLevel':
          const riskOrder = { low: 1, medium: 2, high: 3 }
          aValue = riskOrder[a.riskLevel || 'low']
          bValue = riskOrder[b.riskLevel || 'low']
          break
        case 'lastSeen':
          aValue = new Date(a.lastSeen).getTime()
          bValue = new Date(b.lastSeen).getTime()
          break
        case 'deviceType':
          aValue = a.deviceType || 'unknown'
          bValue = b.deviceType || 'unknown'
          break
        default:
          aValue = a.ip
          bValue = b.ip
      }

      if (aValue < bValue) return sortOrder === 'asc' ? -1 : 1
      if (aValue > bValue) return sortOrder === 'asc' ? 1 : -1
      return 0
    })

    return sorted
  }, [devices, sortBy, sortOrder])

  const handleSort = (field: SortBy) => {
    if (sortBy === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')
    } else {
      setSortBy(field)
      setSortOrder('asc')
    }
  }

  const handleSearch = (term: string) => {
    setSearchTerm(term)
    searchDevices(term)
  }

  const getSortIcon = (field: SortBy) => {
    if (sortBy !== field) return null
    return sortOrder === 'asc' ? '↑' : '↓'
  }

  if (error) {
    return (
      <Card className={className}>
        <CardContent className="flex items-center justify-center py-12">
          <div className="text-center">
            <AlertTriangle className="mx-auto h-12 w-12 text-red-500 mb-4" />
            <h3 className="text-lg font-semibold text-red-700 mb-2">Failed to Load Devices</h3>
            <p className="text-sm text-muted-foreground mb-4">
              {error instanceof Error ? error.message : 'An unexpected error occurred'}
            </p>
            <Button 
              onClick={() => window.location.reload()} 
              variant="outline"
              size="sm"
            >
              <RefreshCw className="h-4 w-4 mr-2" />
              Retry
            </Button>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className={cn('space-y-6', className)}>
      {/* Header and Controls */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold">Network Devices</h2>
          <p className="text-sm text-muted-foreground">
            {deviceStats.total} devices • {deviceStats.online} online • {deviceStats.offline} offline
          </p>
        </div>

        <div className="flex items-center space-x-2">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search devices..."
              value={searchTerm}
              onChange={(e) => handleSearch(e.target.value)}
              className="pl-10 pr-4 py-2 border rounded-md text-sm w-64 focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
            />
          </div>

          {/* Filters Toggle */}
          {showFilters && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowFiltersPanel(!showFiltersPanel)}
              className={cn(showFiltersPanel && 'bg-muted')}
            >
              <Filter className="h-4 w-4" />
            </Button>
          )}

          {/* View Mode */}
          <div className="flex border rounded-md">
            <Button
              variant={viewMode === 'grid' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setViewMode('grid')}
              className="rounded-r-none"
            >
              <Grid3x3 className="h-4 w-4" />
            </Button>
            <Button
              variant={viewMode === 'list' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setViewMode('list')}
              className="rounded-l-none"
            >
              <List className="h-4 w-4" />
            </Button>
          </div>

          {/* Refresh */}
          <Button
            variant="outline"
            size="sm"
            onClick={() => window.location.reload()}
            disabled={isLoading}
          >
            <RefreshCw className={cn('h-4 w-4', isLoading && 'animate-spin')} />
          </Button>
        </div>
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
        <Card className="p-4">
          <div className="flex items-center space-x-2">
            <Activity className="h-4 w-4 text-blue-500" />
            <div>
              <p className="text-2xl font-bold">{deviceStats.total}</p>
              <p className="text-xs text-muted-foreground">Total</p>
            </div>
          </div>
        </Card>

        <Card className="p-4">
          <div className="flex items-center space-x-2">
            <Wifi className="h-4 w-4 text-green-500" />
            <div>
              <p className="text-2xl font-bold text-green-600">{deviceStats.online}</p>
              <p className="text-xs text-muted-foreground">Online</p>
            </div>
          </div>
        </Card>

        <Card className="p-4">
          <div className="flex items-center space-x-2">
            <WifiOff className="h-4 w-4 text-red-500" />
            <div>
              <p className="text-2xl font-bold text-red-600">{deviceStats.offline}</p>
              <p className="text-xs text-muted-foreground">Offline</p>
            </div>
          </div>
        </Card>

        <Card className="p-4">
          <div className="flex items-center space-x-2">
            <AlertTriangle className="h-4 w-4 text-red-500" />
            <div>
              <p className="text-2xl font-bold text-red-600">{deviceStats.highRisk}</p>
              <p className="text-xs text-muted-foreground">High Risk</p>
            </div>
          </div>
        </Card>

        <Card className="p-4">
          <div className="flex items-center space-x-2">
            <AlertTriangle className="h-4 w-4 text-yellow-500" />
            <div>
              <p className="text-2xl font-bold text-yellow-600">{deviceStats.mediumRisk}</p>
              <p className="text-xs text-muted-foreground">Medium Risk</p>
            </div>
          </div>
        </Card>

        <Card className="p-4">
          <div className="flex items-center space-x-2">
            <Shield className="h-4 w-4 text-green-500" />
            <div>
              <p className="text-2xl font-bold text-green-600">{deviceStats.lowRisk}</p>
              <p className="text-xs text-muted-foreground">Low Risk</p>
            </div>
          </div>
        </Card>
      </div>

      {/* Filters Panel */}
      {showFiltersPanel && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Filters</CardTitle>
          </CardHeader>
          <CardContent>
            <DeviceFilters
              currentFilters={filters}
              onFilterChange={(newFilters) => {
                if (newFilters.isActive !== undefined) filterByStatus(newFilters.isActive)
                if (newFilters.riskLevel !== undefined) filterByRisk(newFilters.riskLevel)
              }}
              onClearFilters={clearFilters}
              deviceStats={deviceStats}
            />
          </CardContent>
        </Card>
      )}

      {/* Selection Panel */}
      {showSelection && (
        <DeviceSelection
          selectedCount={deviceStats.recentlyChanged}
          totalCount={deviceStats.total}
          onSelectAll={selectAllFiltered}
          onClearSelection={clearDeviceSelection}
          onBulkAction={(action) => {
            console.log('Bulk action:', action)
          }}
        />
      )}

      {/* Sort Controls */}
      <div className="flex items-center space-x-4 text-sm">
        <span className="font-medium">Sort by:</span>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => handleSort('ip')}
          className={cn(sortBy === 'ip' && 'bg-muted')}
        >
          IP Address {getSortIcon('ip')}
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => handleSort('hostname')}
          className={cn(sortBy === 'hostname' && 'bg-muted')}
        >
          Hostname {getSortIcon('hostname')}
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => handleSort('riskLevel')}
          className={cn(sortBy === 'riskLevel' && 'bg-muted')}
        >
          Risk Level {getSortIcon('riskLevel')}
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => handleSort('lastSeen')}
          className={cn(sortBy === 'lastSeen' && 'bg-muted')}
        >
          Last Seen {getSortIcon('lastSeen')}
        </Button>
      </div>

      {/* Devices Grid/List */}
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <Card key={i} className="animate-pulse">
              <CardContent className="p-6">
                <div className="space-y-4">
                  <div className="h-4 bg-muted rounded w-3/4"></div>
                  <div className="h-3 bg-muted rounded w-1/2"></div>
                  <div className="h-3 bg-muted rounded w-full"></div>
                  <div className="flex space-x-2">
                    <div className="h-6 bg-muted rounded w-16"></div>
                    <div className="h-6 bg-muted rounded w-20"></div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : sortedDevices.length === 0 ? (
        <Card>
          <CardContent className="flex items-center justify-center py-12">
            <div className="text-center">
              <Search className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-2">No devices found</h3>
              <p className="text-sm text-muted-foreground mb-4">
                {searchTerm || Object.keys(filters).length > 0
                  ? 'Try adjusting your search or filters'
                  : 'No devices have been discovered yet. Start a network scan to find devices.'
                }
              </p>
              {(searchTerm || Object.keys(filters).length > 0) && (
                <Button onClick={clearFilters} variant="outline" size="sm">
                  Clear Filters
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className={cn(
          viewMode === 'grid'
            ? 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4'
            : 'space-y-2'
        )}>
          {sortedDevices.map((device) => (
            <DeviceCard
              key={device.ip}
              device={device}
              onSelect={onDeviceSelect}
              onEdit={onDeviceEdit}
              onRemove={onDeviceRemove}
              onToggleSelection={() => toggleDeviceSelection(device.ip)}
              showSelection={showSelection}
              viewMode={viewMode}
              className={cn(
                'transition-all duration-200',
                'hover:shadow-lg hover:scale-[1.02]',
                viewMode === 'list' && 'hover:bg-muted/50'
              )}
            />
          ))}
        </div>
      )}

      {/* Load More / Pagination (if needed) */}
      {sortedDevices.length > 0 && (
        <div className="flex justify-center pt-6">
          <p className="text-sm text-muted-foreground">
            Showing {sortedDevices.length} of {deviceStats.total} devices
          </p>
        </div>
      )}
    </div>
  )
}