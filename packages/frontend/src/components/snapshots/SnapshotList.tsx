import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle, Button, Badge, Input } from '@/components/ui'
import { formatDate, formatRelativeTime, cn } from '@/lib/utils'
import { useSnapshots, useDeleteSnapshot, useExportSnapshot } from '@/hooks/useApi'
import { useAppStore } from '@/store'
import {
  Calendar,
  Clock,
  Search,
  Download,
  Trash2,
  Eye,
  MoreHorizontal,
  Filter,
  SortAsc,
  SortDesc
} from 'lucide-react'

interface SnapshotListProps {
  onSnapshotSelect?: (snapshotId: string) => void
  onCompareSelect?: (snapshotId: string) => void
  className?: string
}

type SortField = 'timestamp' | 'devices'
type SortDirection = 'asc' | 'desc'

export function SnapshotList({ onSnapshotSelect, onCompareSelect, className }: SnapshotListProps) {
  const { data: snapshots = [], isLoading } = useSnapshots()
  const { mutate: deleteSnapshot } = useDeleteSnapshot()
  const { mutate: exportSnapshot } = useExportSnapshot()
  const { snapshotFilter, setSnapshotFilter } = useAppStore()

  const [sortField, setSortField] = useState<SortField>('timestamp')
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc')

  // Filter snapshots
  const filteredSnapshots = snapshots.filter(snapshot => {
    // Search filter
    if (snapshotFilter.search) {
      const search = snapshotFilter.search.toLowerCase()
      const matchesSearch = 
        snapshot.id.toLowerCase().includes(search) ||
        formatDate(snapshot.timestamp).toLowerCase().includes(search)
      
      if (!matchesSearch) return false
    }

    // Date range filter
    if (snapshotFilter.dateRange.start || snapshotFilter.dateRange.end) {
      const snapshotDate = new Date(snapshot.timestamp)
      
      if (snapshotFilter.dateRange.start && snapshotDate < snapshotFilter.dateRange.start) {
        return false
      }
      
      if (snapshotFilter.dateRange.end && snapshotDate > snapshotFilter.dateRange.end) {
        return false
      }
    }

    return true
  })

  // Sort snapshots
  const sortedSnapshots = [...filteredSnapshots].sort((a, b) => {
    let aVal: any, bVal: any

    switch (sortField) {
      case 'timestamp':
        aVal = new Date(a.timestamp).getTime()
        bVal = new Date(b.timestamp).getTime()
        break
      case 'devices':
        aVal = a.devices.length
        bVal = b.devices.length
        break
      default:
        return 0
    }

    const comparison = aVal < bVal ? -1 : aVal > bVal ? 1 : 0
    return sortDirection === 'asc' ? comparison : -comparison
  })

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc')
    } else {
      setSortField(field)
      setSortDirection('desc')
    }
  }

  const handleDelete = (snapshotId: string, event: React.MouseEvent) => {
    event.stopPropagation()
    if (confirm('Are you sure you want to delete this snapshot?')) {
      deleteSnapshot(snapshotId)
    }
  }

  const handleExport = (snapshotId: string, format: 'json' | 'csv', event: React.MouseEvent) => {
    event.stopPropagation()
    exportSnapshot({ id: snapshotId, format })
  }

  if (isLoading) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle>Network Snapshots</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="h-16 bg-muted rounded animate-pulse" />
            ))}
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className={className}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center space-x-2">
            <Calendar className="h-5 w-5" />
            <span>Network Snapshots ({filteredSnapshots.length})</span>
          </CardTitle>
        </div>
        
        {/* Filters and Search */}
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="flex-1">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search snapshots..."
                value={snapshotFilter.search}
                onChange={(e) => setSnapshotFilter({ search: e.target.value })}
                className="pl-10"
              />
            </div>
          </div>

          <div className="flex space-x-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleSort('timestamp')}
              className="flex items-center space-x-1"
            >
              <Clock className="h-4 w-4" />
              <span>Date</span>
              {sortField === 'timestamp' && (
                sortDirection === 'asc' ? 
                  <SortAsc className="h-3 w-3" /> : 
                  <SortDesc className="h-3 w-3" />
              )}
            </Button>
            
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleSort('devices')}
              className="flex items-center space-x-1"
            >
              <Filter className="h-4 w-4" />
              <span>Devices</span>
              {sortField === 'devices' && (
                sortDirection === 'asc' ? 
                  <SortAsc className="h-3 w-3" /> : 
                  <SortDesc className="h-3 w-3" />
              )}
            </Button>
          </div>
        </div>
      </CardHeader>
      
      <CardContent>
        {sortedSnapshots.length === 0 ? (
          <div className="text-center py-8">
            <Calendar className="mx-auto h-12 w-12 text-muted-foreground" />
            <h3 className="mt-4 text-lg font-semibold">No snapshots found</h3>
            <p className="text-muted-foreground">
              {snapshotFilter.search ? 
                'Try adjusting your search criteria' : 
                'Run a network scan to create your first snapshot'
              }
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {sortedSnapshots.map((snapshot) => (
              <div
                key={snapshot.id}
                className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 cursor-pointer transition-colors"
                onClick={() => onSnapshotSelect?.(snapshot.id)}
              >
                <div className="flex items-center space-x-4 flex-1 min-w-0">
                  <div className="flex-shrink-0">
                    <Calendar className="h-8 w-8 text-muted-foreground" />
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center space-x-2 mb-1">
                      <span className="font-medium truncate">
                        Snapshot {snapshot.id.slice(0, 8)}...
                      </span>
                      <Badge variant="outline" className="text-xs flex-shrink-0">
                        {snapshot.devices.length} devices
                      </Badge>
                    </div>
                    
                    <div className="flex items-center space-x-4 text-sm text-muted-foreground">
                      <div className="flex items-center space-x-1">
                        <Clock className="h-3 w-3" />
                        <span>{formatDate(snapshot.timestamp)}</span>
                      </div>
                      
                      <span>•</span>
                      
                      <span>{formatRelativeTime(snapshot.timestamp)}</span>
                    </div>
                    
                    {snapshot.metadata && (
                      <div className="mt-1">
                        <div className="flex items-center space-x-2">
                          {snapshot.metadata.scanType && (
                            <Badge variant="secondary" className="text-xs">
                              {snapshot.metadata.scanType}
                            </Badge>
                          )}
                          {snapshot.metadata.networkRange && (
                            <span className="text-xs text-muted-foreground">
                              {snapshot.metadata.networkRange}
                            </span>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                <div className="flex items-center space-x-2 flex-shrink-0">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={(e) => {
                      e.stopPropagation()
                      onSnapshotSelect?.(snapshot.id)
                    }}
                    className="text-xs"
                  >
                    <Eye className="h-4 w-4" />
                  </Button>
                  
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={(e) => {
                      e.stopPropagation()
                      onCompareSelect?.(snapshot.id)
                    }}
                    className="text-xs"
                  >
                    Compare
                  </Button>

                  <div className="relative group">
                    <Button variant="ghost" size="sm" className="text-xs">
                      <MoreHorizontal className="h-4 w-4" />
                    </Button>
                    
                    <div className="absolute right-0 top-full mt-1 bg-background border rounded-lg shadow-lg py-1 opacity-0 group-hover:opacity-100 transition-opacity z-10">
                      <button
                        className="w-full px-3 py-2 text-left text-xs hover:bg-muted flex items-center space-x-2"
                        onClick={(e) => handleExport(snapshot.id, 'json', e)}
                      >
                        <Download className="h-3 w-3" />
                        <span>Export JSON</span>
                      </button>
                      
                      <button
                        className="w-full px-3 py-2 text-left text-xs hover:bg-muted flex items-center space-x-2"
                        onClick={(e) => handleExport(snapshot.id, 'csv', e)}
                      >
                        <Download className="h-3 w-3" />
                        <span>Export CSV</span>
                      </button>
                      
                      <button
                        className="w-full px-3 py-2 text-left text-xs hover:bg-muted text-red-600 flex items-center space-x-2"
                        onClick={(e) => handleDelete(snapshot.id, e)}
                      >
                        <Trash2 className="h-3 w-3" />
                        <span>Delete</span>
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}