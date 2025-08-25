import { useState, useMemo } from 'react'
import { Card, CardContent, CardHeader, CardTitle, Button, Badge, Input } from '@/components/ui'
import { useSnapshots } from '@/hooks'
import { LoadingState } from '@/components/common'
import { cn } from '@/lib/utils'
import type { NetworkSnapshot } from '@nmapper/shared'
import {
  Calendar,
  Clock,
  Search,
  Filter,
  ArrowLeftRight,
  CheckCircle,
  AlertTriangle,
  Info,
  Network,
  Activity,
  Zap,
  Layers,
  RefreshCw,
  ChevronDown,
  ChevronUp,
  Eye,
  Compare
} from 'lucide-react'

interface SnapshotSelectorProps {
  selectedSnapshots?: [NetworkSnapshot | null, NetworkSnapshot | null]
  onSnapshotSelect?: (snapshot: NetworkSnapshot, position: 'left' | 'right') => void
  onCompare?: () => void
  showComparisons?: boolean
  className?: string
}

export function SnapshotSelector({
  selectedSnapshots = [null, null],
  onSnapshotSelect,
  onCompare,
  showComparisons = true,
  className
}: SnapshotSelectorProps) {
  const { data: snapshots = [], isLoading, error, refetch } = useSnapshots()
  
  const [searchQuery, setSearchQuery] = useState('')
  const [dateFilter, setDateFilter] = useState<'today' | 'week' | 'month' | 'all'>('all')
  const [statusFilter, setStatusFilter] = useState<'all' | 'success' | 'partial' | 'failed'>('all')
  const [expandedSnapshot, setExpandedSnapshot] = useState<string | null>(null)
  const [viewMode, setViewMode] = useState<'list' | 'grid'>('list')

  // Mock snapshots for demonstration
  const mockSnapshots: NetworkSnapshot[] = [
    {
      id: 'snapshot-1',
      timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000),
      devices: 15,
      changes: 3,
      status: 'success',
      checksum: 'abc123def456',
      metadata: {
        scanDuration: 120,
        scanType: 'full',
        networkRange: '192.168.1.0/24',
        deviceTypes: ['computer', 'router', 'printer']
      }
    },
    {
      id: 'snapshot-2',
      timestamp: new Date(Date.now() - 6 * 60 * 60 * 1000),
      devices: 12,
      changes: 0,
      status: 'success',
      checksum: 'def456ghi789',
      metadata: {
        scanDuration: 95,
        scanType: 'full',
        networkRange: '192.168.1.0/24',
        deviceTypes: ['computer', 'router']
      }
    },
    {
      id: 'snapshot-3',
      timestamp: new Date(Date.now() - 24 * 60 * 60 * 1000),
      devices: 14,
      changes: 7,
      status: 'partial',
      checksum: 'ghi789jkl012',
      metadata: {
        scanDuration: 180,
        scanType: 'partial',
        networkRange: '192.168.1.0/24',
        deviceTypes: ['computer', 'router', 'printer', 'phone']
      }
    },
    {
      id: 'snapshot-4',
      timestamp: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000),
      devices: 11,
      changes: 2,
      status: 'success',
      checksum: 'jkl012mno345',
      metadata: {
        scanDuration: 110,
        scanType: 'full',
        networkRange: '192.168.1.0/24',
        deviceTypes: ['computer', 'router']
      }
    },
    {
      id: 'snapshot-5',
      timestamp: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
      devices: 13,
      changes: 5,
      status: 'failed',
      checksum: 'mno345pqr678',
      metadata: {
        scanDuration: 45,
        scanType: 'quick',
        networkRange: '192.168.1.0/24',
        deviceTypes: ['computer']
      }
    }
  ]

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'success': return CheckCircle
      case 'partial': return AlertTriangle
      case 'failed': return AlertTriangle
      default: return Info
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'success': return 'text-green-500'
      case 'partial': return 'text-yellow-500'
      case 'failed': return 'text-red-500'
      default: return 'text-gray-500'
    }
  }

  const getStatusBadgeColor = (status: string) => {
    switch (status) {
      case 'success': return 'bg-green-100 text-green-800 dark:bg-green-950 dark:text-green-300'
      case 'partial': return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-950 dark:text-yellow-300'
      case 'failed': return 'bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-300'
      default: return 'bg-gray-100 text-gray-800 dark:bg-gray-950 dark:text-gray-300'
    }
  }

  const formatTimeAgo = (date: Date) => {
    const now = new Date()
    const diff = now.getTime() - date.getTime()
    
    const minutes = Math.floor(diff / 60000)
    const hours = Math.floor(diff / 3600000)
    const days = Math.floor(diff / 86400000)
    
    if (days > 0) return `${days}d ago`
    if (hours > 0) return `${hours}h ago`
    if (minutes > 0) return `${minutes}m ago`
    return 'Just now'
  }

  const formatDuration = (seconds: number) => {
    const minutes = Math.floor(seconds / 60)
    const remainingSeconds = seconds % 60
    return `${minutes}m ${remainingSeconds}s`
  }

  const filteredSnapshots = useMemo(() => {
    return mockSnapshots.filter(snapshot => {
      // Date filter
      if (dateFilter !== 'all') {
        const now = new Date()
        const snapshotDate = snapshot.timestamp
        const diffHours = (now.getTime() - snapshotDate.getTime()) / (1000 * 60 * 60)
        
        switch (dateFilter) {
          case 'today':
            if (diffHours > 24) return false
            break
          case 'week':
            if (diffHours > 168) return false // 7 days
            break
          case 'month':
            if (diffHours > 720) return false // 30 days
            break
        }
      }

      // Status filter
      if (statusFilter !== 'all' && snapshot.status !== statusFilter) {
        return false
      }

      // Search filter
      if (searchQuery) {
        const query = searchQuery.toLowerCase()
        return (
          snapshot.id.toLowerCase().includes(query) ||
          snapshot.checksum.toLowerCase().includes(query) ||
          snapshot.metadata?.networkRange?.toLowerCase().includes(query)
        )
      }

      return true
    })
  }, [mockSnapshots, dateFilter, statusFilter, searchQuery])

  const isSelected = (snapshot: NetworkSnapshot, position: 'left' | 'right') => {
    return selectedSnapshots[position === 'left' ? 0 : 1]?.id === snapshot.id
  }

  const canCompare = selectedSnapshots[0] && selectedSnapshots[1] && selectedSnapshots[0].id !== selectedSnapshots[1].id

  if (isLoading) {
    return (
      <Card className={cn('h-full', className)}>
        <LoadingState
          type="card"
          icon="snapshot"
          title="Loading Snapshots"
          description="Retrieving network snapshots..."
        />
      </Card>
    )
  }

  return (
    <div className={cn('space-y-6', className)}>
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold flex items-center space-x-2">
            <Layers className="h-6 w-6" />
            <span>Snapshot Comparison</span>
          </h2>
          <p className="text-sm text-muted-foreground mt-1">
            Select two network snapshots to compare changes over time
          </p>
        </div>

        <div className="flex items-center space-x-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setViewMode(viewMode === 'list' ? 'grid' : 'list')}
          >
            <Layers className="h-4 w-4" />
          </Button>
          
          <Button
            variant="outline"
            size="sm"
            onClick={() => refetch()}
          >
            <RefreshCw className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Selected Snapshots */}
      {showComparisons && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center space-x-2">
              <Compare className="h-5 w-5" />
              <span>Selected for Comparison</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Left Selection */}
              <div className="space-y-2">
                <label className="text-sm font-medium text-muted-foreground">Snapshot A (Before)</label>
                {selectedSnapshots[0] ? (
                  <div className="p-3 border rounded-lg bg-blue-50 dark:bg-blue-950/20">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-medium">{selectedSnapshots[0].id}</p>
                        <p className="text-xs text-muted-foreground">
                          {formatTimeAgo(selectedSnapshots[0].timestamp)} • {selectedSnapshots[0].devices} devices
                        </p>
                      </div>
                      <Badge className={getStatusBadgeColor(selectedSnapshots[0].status)}>
                        {selectedSnapshots[0].status}
                      </Badge>
                    </div>
                  </div>
                ) : (
                  <div className="p-6 border-2 border-dashed rounded-lg text-center text-muted-foreground">
                    <Calendar className="h-8 w-8 mx-auto mb-2" />
                    <p className="text-sm">Select first snapshot</p>
                  </div>
                )}
              </div>

              {/* Right Selection */}
              <div className="space-y-2">
                <label className="text-sm font-medium text-muted-foreground">Snapshot B (After)</label>
                {selectedSnapshots[1] ? (
                  <div className="p-3 border rounded-lg bg-green-50 dark:bg-green-950/20">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-medium">{selectedSnapshots[1].id}</p>
                        <p className="text-xs text-muted-foreground">
                          {formatTimeAgo(selectedSnapshots[1].timestamp)} • {selectedSnapshots[1].devices} devices
                        </p>
                      </div>
                      <Badge className={getStatusBadgeColor(selectedSnapshots[1].status)}>
                        {selectedSnapshots[1].status}
                      </Badge>
                    </div>
                  </div>
                ) : (
                  <div className="p-6 border-2 border-dashed rounded-lg text-center text-muted-foreground">
                    <Calendar className="h-8 w-8 mx-auto mb-2" />
                    <p className="text-sm">Select second snapshot</p>
                  </div>
                )}
              </div>
            </div>

            {/* Compare Button */}
            <div className="flex justify-center mt-4">
              <Button
                onClick={onCompare}
                disabled={!canCompare}
                className="flex items-center space-x-2"
              >
                <ArrowLeftRight className="h-4 w-4" />
                <span>Compare Snapshots</span>
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search snapshots by ID, checksum, or network range..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
            
            <div className="flex space-x-2">
              <select
                value={dateFilter}
                onChange={(e) => setDateFilter(e.target.value as any)}
                className="px-3 py-2 text-sm border rounded-md bg-background"
              >
                <option value="all">All Time</option>
                <option value="today">Today</option>
                <option value="week">This Week</option>
                <option value="month">This Month</option>
              </select>
              
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value as any)}
                className="px-3 py-2 text-sm border rounded-md bg-background"
              >
                <option value="all">All Status</option>
                <option value="success">Success</option>
                <option value="partial">Partial</option>
                <option value="failed">Failed</option>
              </select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Snapshots List */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg">Available Snapshots</CardTitle>
            <span className="text-sm text-muted-foreground">
              {filteredSnapshots.length} snapshots
            </span>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-3 max-h-96 overflow-y-auto">
            {filteredSnapshots.length === 0 ? (
              <div className="text-center py-8">
                <Layers className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
                <p className="text-sm text-muted-foreground">No snapshots found matching your criteria</p>
              </div>
            ) : (
              filteredSnapshots.map((snapshot) => {
                const StatusIcon = getStatusIcon(snapshot.status)
                const isExpanded = expandedSnapshot === snapshot.id
                const isSelectedLeft = isSelected(snapshot, 'left')
                const isSelectedRight = isSelected(snapshot, 'right')
                
                return (
                  <div
                    key={snapshot.id}
                    className={cn(
                      'border rounded-lg p-4 transition-all',
                      (isSelectedLeft || isSelectedRight) && 'ring-2 ring-primary',
                      isSelectedLeft && 'bg-blue-50 dark:bg-blue-950/20',
                      isSelectedRight && 'bg-green-50 dark:bg-green-950/20'
                    )}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        <StatusIcon className={cn('h-5 w-5', getStatusColor(snapshot.status))} />
                        <div>
                          <div className="flex items-center space-x-2">
                            <h4 className="font-medium">{snapshot.id}</h4>
                            <Badge className={cn('text-xs', getStatusBadgeColor(snapshot.status))}>
                              {snapshot.status}
                            </Badge>
                          </div>
                          <p className="text-sm text-muted-foreground">
                            {snapshot.timestamp.toLocaleString()} • {formatTimeAgo(snapshot.timestamp)}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center space-x-2">
                        {/* Selection Buttons */}
                        <div className="flex space-x-1">
                          <Button
                            variant={isSelectedLeft ? 'default' : 'outline'}
                            size="sm"
                            onClick={() => onSnapshotSelect?.(snapshot, 'left')}
                            className="text-xs"
                          >
                            A
                          </Button>
                          <Button
                            variant={isSelectedRight ? 'default' : 'outline'}
                            size="sm"
                            onClick={() => onSnapshotSelect?.(snapshot, 'right')}
                            className="text-xs"
                          >
                            B
                          </Button>
                        </div>
                        
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setExpandedSnapshot(isExpanded ? null : snapshot.id)}
                        >
                          {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                        </Button>
                      </div>
                    </div>

                    {/* Summary Stats */}
                    <div className="grid grid-cols-3 gap-4 mt-3">
                      <div className="text-center">
                        <p className="text-lg font-bold text-blue-600">{snapshot.devices}</p>
                        <p className="text-xs text-muted-foreground">Devices</p>
                      </div>
                      <div className="text-center">
                        <p className="text-lg font-bold text-green-600">{snapshot.changes}</p>
                        <p className="text-xs text-muted-foreground">Changes</p>
                      </div>
                      <div className="text-center">
                        <p className="text-lg font-bold text-purple-600">
                          {snapshot.metadata?.scanDuration ? formatDuration(snapshot.metadata.scanDuration) : 'N/A'}
                        </p>
                        <p className="text-xs text-muted-foreground">Duration</p>
                      </div>
                    </div>

                    {/* Extended Details */}
                    {isExpanded && (
                      <div className="mt-4 pt-4 border-t space-y-3">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                          <div>
                            <h5 className="font-medium text-muted-foreground mb-2">Scan Details</h5>
                            <div className="space-y-1">
                              <div className="flex justify-between">
                                <span className="text-muted-foreground">Checksum:</span>
                                <span className="font-mono text-xs">{snapshot.checksum}</span>
                              </div>
                              <div className="flex justify-between">
                                <span className="text-muted-foreground">Scan Type:</span>
                                <span className="capitalize">{snapshot.metadata?.scanType}</span>
                              </div>
                              <div className="flex justify-between">
                                <span className="text-muted-foreground">Network Range:</span>
                                <span className="font-mono text-xs">{snapshot.metadata?.networkRange}</span>
                              </div>
                            </div>
                          </div>
                          
                          <div>
                            <h5 className="font-medium text-muted-foreground mb-2">Device Types</h5>
                            <div className="flex flex-wrap gap-1">
                              {snapshot.metadata?.deviceTypes?.map(type => (
                                <Badge key={type} variant="outline" className="text-xs">
                                  {type}
                                </Badge>
                              ))}
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center justify-between pt-2 border-t">
                          <span className="text-xs text-muted-foreground">
                            Created: {snapshot.timestamp.toLocaleString()}
                          </span>
                          <div className="flex space-x-2">
                            <Button variant="outline" size="sm">
                              <Eye className="h-3 w-3 mr-1" />
                              View
                            </Button>
                            <Button variant="outline" size="sm">
                              <Activity className="h-3 w-3 mr-1" />
                              Details
                            </Button>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                )
              })
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}