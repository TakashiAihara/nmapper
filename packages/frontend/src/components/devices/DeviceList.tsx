import { useState } from 'react'
import { Input, Button, Badge } from '@/components/ui'
import { DeviceCard } from './DeviceCard'
import { useAppStore } from '@/store'
import { cn } from '@/lib/utils'
import type { Device } from '@nmapper/shared'
import {
  Search,
  Filter,
  Grid3X3,
  List,
  SortAsc,
  SortDesc,
  Wifi,
  WifiOff
} from 'lucide-react'

interface DeviceListProps {
  devices: Device[]
  loading?: boolean
  className?: string
}

type ViewMode = 'grid' | 'list'
type SortField = 'hostname' | 'ip' | 'lastSeen' | 'riskLevel' | 'responseTime'
type SortDirection = 'asc' | 'desc'

export function DeviceList({ devices, loading, className }: DeviceListProps) {
  const {
    deviceFilter,
    setDeviceFilter,
    selectedDevices,
    addSelectedDevice,
    removeSelectedDevice,
    clearSelectedDevices
  } = useAppStore()

  const [viewMode, setViewMode] = useState<ViewMode>('grid')
  const [sortField, setSortField] = useState<SortField>('lastSeen')
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc')

  // Filter devices based on current filters
  const filteredDevices = devices.filter(device => {
    // Search filter
    if (deviceFilter.search) {
      const search = deviceFilter.search.toLowerCase()
      const matchesSearch = 
        device.hostname?.toLowerCase().includes(search) ||
        device.ip.includes(search) ||
        device.vendor?.toLowerCase().includes(search) ||
        device.deviceType?.toLowerCase().includes(search)
      
      if (!matchesSearch) return false
    }

    // Status filter
    if (deviceFilter.status !== 'all') {
      if (deviceFilter.status === 'up' && !device.isActive) return false
      if (deviceFilter.status === 'down' && device.isActive) return false
    }

    // Risk level filter
    if (deviceFilter.riskLevel !== 'all' && device.riskLevel !== deviceFilter.riskLevel) {
      return false
    }

    // Device type filter
    if (deviceFilter.deviceType !== 'all' && device.deviceType !== deviceFilter.deviceType) {
      return false
    }

    return true
  })

  // Sort devices
  const sortedDevices = [...filteredDevices].sort((a, b) => {
    let aVal: any = a[sortField]
    let bVal: any = b[sortField]

    // Handle special cases
    if (sortField === 'lastSeen') {
      aVal = new Date(a.lastSeen).getTime()
      bVal = new Date(b.lastSeen).getTime()
    } else if (sortField === 'riskLevel') {
      const riskOrder = { low: 1, medium: 2, high: 3 }
      aVal = riskOrder[a.riskLevel as keyof typeof riskOrder] || 0
      bVal = riskOrder[b.riskLevel as keyof typeof riskOrder] || 0
    }

    // Handle nullish values
    if (aVal == null && bVal == null) return 0
    if (aVal == null) return sortDirection === 'asc' ? -1 : 1
    if (bVal == null) return sortDirection === 'asc' ? 1 : -1

    const comparison = aVal < bVal ? -1 : aVal > bVal ? 1 : 0
    return sortDirection === 'asc' ? comparison : -comparison
  })

  const handleDeviceSelect = (device: Device) => {
    if (selectedDevices.includes(device.ip)) {
      removeSelectedDevice(device.ip)
    } else {
      addSelectedDevice(device.ip)
    }
  }

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc')
    } else {
      setSortField(field)
      setSortDirection('desc')
    }
  }

  const activeCount = devices.filter(d => d.isActive).length
  const totalCount = devices.length

  if (loading) {
    return (
      <div className={cn('space-y-4', className)}>
        <div className="flex justify-between items-center">
          <div className="h-8 bg-muted rounded w-32 animate-pulse" />
          <div className="h-8 bg-muted rounded w-24 animate-pulse" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="h-48 bg-muted rounded-lg animate-pulse" />
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className={cn('space-y-4', className)}>
      {/* Header with stats and controls */}
      <div className="flex flex-col sm:flex-row gap-4 justify-between items-start sm:items-center">
        <div className="flex items-center space-x-4">
          <div className="flex items-center space-x-2">
            <Wifi className="h-5 w-5 text-green-500" />
            <Badge variant="success">{activeCount} online</Badge>
          </div>
          <div className="flex items-center space-x-2">
            <WifiOff className="h-5 w-5 text-red-500" />
            <Badge variant="secondary">{totalCount - activeCount} offline</Badge>
          </div>
          <Badge variant="outline">{totalCount} total</Badge>
        </div>

        <div className="flex items-center space-x-2">
          <Button
            variant={viewMode === 'grid' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setViewMode('grid')}
          >
            <Grid3X3 className="h-4 w-4" />
          </Button>
          <Button
            variant={viewMode === 'list' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setViewMode('list')}
          >
            <List className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="flex-1">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search devices..."
              value={deviceFilter.search}
              onChange={(e) => setDeviceFilter({ search: e.target.value })}
              className="pl-10"
            />
          </div>
        </div>

        <div className="flex space-x-2">
          <select
            value={deviceFilter.status}
            onChange={(e) => setDeviceFilter({ status: e.target.value as any })}
            className="px-3 py-2 border border-input rounded-md bg-background text-sm"
          >
            <option value="all">All Status</option>
            <option value="up">Online</option>
            <option value="down">Offline</option>
          </select>

          <select
            value={deviceFilter.riskLevel}
            onChange={(e) => setDeviceFilter({ riskLevel: e.target.value as any })}
            className="px-3 py-2 border border-input rounded-md bg-background text-sm"
          >
            <option value="all">All Risk Levels</option>
            <option value="low">Low Risk</option>
            <option value="medium">Medium Risk</option>
            <option value="high">High Risk</option>
          </select>
        </div>
      </div>

      {/* Sort controls */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <Filter className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm text-muted-foreground">Sort by:</span>
          <div className="flex space-x-1">
            {[
              { field: 'hostname', label: 'Name' },
              { field: 'ip', label: 'IP' },
              { field: 'lastSeen', label: 'Last Seen' },
              { field: 'riskLevel', label: 'Risk' },
              { field: 'responseTime', label: 'Response' }
            ].map(({ field, label }) => (
              <Button
                key={field}
                variant={sortField === field ? 'default' : 'ghost'}
                size="sm"
                onClick={() => handleSort(field as SortField)}
                className="text-xs"
              >
                {label}
                {sortField === field && (
                  sortDirection === 'asc' ? 
                    <SortAsc className="ml-1 h-3 w-3" /> : 
                    <SortDesc className="ml-1 h-3 w-3" />
                )}
              </Button>
            ))}
          </div>
        </div>

        {selectedDevices.length > 0 && (
          <div className="flex items-center space-x-2">
            <Badge variant="secondary">{selectedDevices.length} selected</Badge>
            <Button variant="outline" size="sm" onClick={clearSelectedDevices}>
              Clear
            </Button>
          </div>
        )}
      </div>

      {/* Device Grid/List */}
      {sortedDevices.length === 0 ? (
        <div className="text-center py-12">
          <Search className="mx-auto h-12 w-12 text-muted-foreground" />
          <h3 className="mt-4 text-lg font-semibold">No devices found</h3>
          <p className="text-muted-foreground">
            Try adjusting your search or filter criteria
          </p>
        </div>
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
              selected={selectedDevices.includes(device.ip)}
              onSelect={handleDeviceSelect}
              className={viewMode === 'list' ? 'max-w-none' : ''}
            />
          ))}
        </div>
      )}
    </div>
  )
}