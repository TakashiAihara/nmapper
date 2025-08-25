import { useState, useMemo } from 'react'
import { Card, CardContent, CardHeader, CardTitle, Button, Badge } from '@/components/ui'
import { useSnapshotComparison } from '@/hooks'
import { cn } from '@/lib/utils'
import type { SnapshotDiff, Device, Port } from '@nmapper/shared'
import {
  GitCompare,
  Plus,
  Minus,
  Edit,
  ArrowRight,
  Filter,
  Download,
  Eye,
  EyeOff,
  Calendar,
  Clock,
  Activity,
  AlertTriangle,
  CheckCircle,
  Info,
  Hash,
  Network,
  Shield,
  Zap
} from 'lucide-react'

interface SnapshotDiffViewerProps {
  snapshotId1: string
  snapshotId2: string
  className?: string
}

interface DiffFilters {
  showAdded: boolean
  showRemoved: boolean
  showModified: boolean
  changeType: 'all' | 'devices' | 'ports' | 'services'
  severity: 'all' | 'low' | 'medium' | 'high'
}

const CHANGE_TYPE_ICONS = {
  added: Plus,
  removed: Minus,
  modified: Edit,
} as const

const CHANGE_TYPE_COLORS = {
  added: 'text-green-600 bg-green-50 border-green-200',
  removed: 'text-red-600 bg-red-50 border-red-200',
  modified: 'text-blue-600 bg-blue-50 border-blue-200',
} as const

const SEVERITY_COLORS = {
  low: 'text-gray-600',
  medium: 'text-yellow-600',
  high: 'text-red-600'
} as const

export function SnapshotDiffViewer({
  snapshotId1,
  snapshotId2,
  className
}: SnapshotDiffViewerProps) {
  const { 
    data: diffData, 
    isLoading, 
    error 
  } = useSnapshotComparison(snapshotId1, snapshotId2)

  const [filters, setFilters] = useState<DiffFilters>({
    showAdded: true,
    showRemoved: true,
    showModified: true,
    changeType: 'all',
    severity: 'all'
  })

  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set())
  const [selectedChange, setSelectedChange] = useState<string | null>(null)

  // Process and filter changes
  const { filteredChanges, statistics } = useMemo(() => {
    if (!diffData) return { filteredChanges: [], statistics: {} }

    const allChanges = [
      ...(diffData.deviceChanges || []).map(change => ({ 
        ...change, 
        category: 'device' as const,
        id: `device-${change.deviceId || Math.random()}`,
      })),
      ...(diffData.portChanges || []).map(change => ({ 
        ...change, 
        category: 'port' as const,
        id: `port-${change.deviceId}-${change.port || Math.random()}`,
      })),
      ...(diffData.serviceChanges || []).map(change => ({ 
        ...change, 
        category: 'service' as const,
        id: `service-${change.deviceId}-${change.port}-${change.service || Math.random()}`,
      }))
    ]

    // Apply filters
    const filtered = allChanges.filter(change => {
      // Change type filter
      if (!filters.showAdded && change.changeType === 'added') return false
      if (!filters.showRemoved && change.changeType === 'removed') return false
      if (!filters.showModified && change.changeType === 'modified') return false

      // Category filter
      if (filters.changeType !== 'all') {
        const categoryMap = { devices: 'device', ports: 'port', services: 'service' }
        if (change.category !== categoryMap[filters.changeType as keyof typeof categoryMap]) return false
      }

      // Severity filter
      if (filters.severity !== 'all' && change.severity !== filters.severity) return false

      return true
    })

    // Calculate statistics
    const stats = {
      total: allChanges.length,
      added: allChanges.filter(c => c.changeType === 'added').length,
      removed: allChanges.filter(c => c.changeType === 'removed').length,
      modified: allChanges.filter(c => c.changeType === 'modified').length,
      devices: allChanges.filter(c => c.category === 'device').length,
      ports: allChanges.filter(c => c.category === 'port').length,
      services: allChanges.filter(c => c.category === 'service').length,
      high: allChanges.filter(c => c.severity === 'high').length,
      medium: allChanges.filter(c => c.severity === 'medium').length,
      low: allChanges.filter(c => c.severity === 'low').length,
    }

    return { filteredChanges: filtered, statistics: stats }
  }, [diffData, filters])

  // Group changes by device
  const groupedChanges = useMemo(() => {
    const groups: Record<string, any[]> = {}
    
    filteredChanges.forEach(change => {
      const deviceId = change.deviceId || 'unknown'
      if (!groups[deviceId]) {
        groups[deviceId] = []
      }
      groups[deviceId].push(change)
    })

    return groups
  }, [filteredChanges])

  const toggleSection = (sectionId: string) => {
    setExpandedSections(prev => {
      const newSet = new Set(prev)
      if (newSet.has(sectionId)) {
        newSet.delete(sectionId)
      } else {
        newSet.add(sectionId)
      }
      return newSet
    })
  }

  const toggleFilter = (key: keyof DiffFilters, value?: any) => {
    setFilters(prev => ({
      ...prev,
      [key]: value !== undefined ? value : !prev[key]
    }))
  }

  const exportDiff = () => {
    if (!diffData) return

    const exportData = {
      comparison: {
        snapshot1: snapshotId1,
        snapshot2: snapshotId2,
        timestamp: new Date().toISOString(),
      },
      summary: diffData.summary,
      statistics,
      changes: filteredChanges
    }

    const blob = new Blob([JSON.stringify(exportData, null, 2)], { 
      type: 'application/json' 
    })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `snapshot-diff-${snapshotId1.slice(0,8)}-${snapshotId2.slice(0,8)}.json`
    link.click()
    URL.revokeObjectURL(url)
  }

  if (error) {
    return (
      <Card className={className}>
        <CardContent className="flex items-center justify-center py-12">
          <div className="text-center">
            <GitCompare className="mx-auto h-12 w-12 text-red-500 mb-4" />
            <h3 className="text-lg font-semibold text-red-700 mb-2">Comparison Failed</h3>
            <p className="text-sm text-muted-foreground">
              {error instanceof Error ? error.message : 'Unable to compare snapshots'}
            </p>
          </div>
        </CardContent>
      </Card>
    )
  }

  if (isLoading) {
    return (
      <Card className={className}>
        <CardContent className="flex items-center justify-center py-12">
          <div className="text-center">
            <GitCompare className="mx-auto h-8 w-8 text-blue-500 animate-spin mb-4" />
            <h3 className="text-lg font-semibold mb-2">Comparing Snapshots</h3>
            <p className="text-sm text-muted-foreground">
              Analyzing differences between network snapshots...
            </p>
          </div>
        </CardContent>
      </Card>
    )
  }

  if (!diffData) {
    return (
      <Card className={className}>
        <CardContent className="flex items-center justify-center py-12">
          <div className="text-center">
            <Info className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">No Comparison Data</h3>
            <p className="text-sm text-muted-foreground">
              Unable to load snapshot comparison data
            </p>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className={cn('space-y-6', className)}>
      {/* Comparison Header */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center space-x-2">
              <GitCompare className="h-5 w-5" />
              <span>Snapshot Comparison</span>
            </CardTitle>
            <div className="flex items-center space-x-2">
              <Badge variant="outline" className="font-mono text-xs">
                {snapshotId1.slice(0, 8)} → {snapshotId2.slice(0, 8)}
              </Badge>
              <Button variant="outline" size="sm" onClick={exportDiff}>
                <Download className="h-4 w-4 mr-1" />
                Export
              </Button>
            </div>
          </div>
        </CardHeader>

        <CardContent>
          {/* Comparison Summary */}
          {diffData.summary && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
              <div>
                <h4 className="text-sm font-medium mb-2 flex items-center space-x-2">
                  <Calendar className="h-4 w-4" />
                  <span>Snapshot 1</span>
                </h4>
                <div className="text-sm text-muted-foreground space-y-1">
                  <p>ID: <code className="font-mono">{snapshotId1.slice(0, 12)}...</code></p>
                  <p>Created: {new Date(diffData.summary.snapshot1CreatedAt || '').toLocaleString()}</p>
                  <p>Devices: {diffData.summary.snapshot1DeviceCount || 0}</p>
                </div>
              </div>
              <div>
                <h4 className="text-sm font-medium mb-2 flex items-center space-x-2">
                  <Calendar className="h-4 w-4" />
                  <span>Snapshot 2</span>
                </h4>
                <div className="text-sm text-muted-foreground space-y-1">
                  <p>ID: <code className="font-mono">{snapshotId2.slice(0, 12)}...</code></p>
                  <p>Created: {new Date(diffData.summary.snapshot2CreatedAt || '').toLocaleString()}</p>
                  <p>Devices: {diffData.summary.snapshot2DeviceCount || 0}</p>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Statistics */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-4">
        <Card className="p-4">
          <div className="flex items-center space-x-2">
            <Hash className="h-4 w-4 text-blue-500" />
            <div>
              <p className="text-lg font-bold">{statistics.total}</p>
              <p className="text-xs text-muted-foreground">Total Changes</p>
            </div>
          </div>
        </Card>

        <Card className="p-4">
          <div className="flex items-center space-x-2">
            <Plus className="h-4 w-4 text-green-500" />
            <div>
              <p className="text-lg font-bold text-green-600">{statistics.added}</p>
              <p className="text-xs text-muted-foreground">Added</p>
            </div>
          </div>
        </Card>

        <Card className="p-4">
          <div className="flex items-center space-x-2">
            <Minus className="h-4 w-4 text-red-500" />
            <div>
              <p className="text-lg font-bold text-red-600">{statistics.removed}</p>
              <p className="text-xs text-muted-foreground">Removed</p>
            </div>
          </div>
        </Card>

        <Card className="p-4">
          <div className="flex items-center space-x-2">
            <Edit className="h-4 w-4 text-blue-500" />
            <div>
              <p className="text-lg font-bold text-blue-600">{statistics.modified}</p>
              <p className="text-xs text-muted-foreground">Modified</p>
            </div>
          </div>
        </Card>

        <Card className="p-4">
          <div className="flex items-center space-x-2">
            <Network className="h-4 w-4 text-purple-500" />
            <div>
              <p className="text-lg font-bold">{statistics.devices}</p>
              <p className="text-xs text-muted-foreground">Devices</p>
            </div>
          </div>
        </Card>

        <Card className="p-4">
          <div className="flex items-center space-x-2">
            <Activity className="h-4 w-4 text-orange-500" />
            <div>
              <p className="text-lg font-bold">{statistics.ports}</p>
              <p className="text-xs text-muted-foreground">Ports</p>
            </div>
          </div>
        </Card>

        <Card className="p-4">
          <div className="flex items-center space-x-2">
            <Zap className="h-4 w-4 text-cyan-500" />
            <div>
              <p className="text-lg font-bold">{statistics.services}</p>
              <p className="text-xs text-muted-foreground">Services</p>
            </div>
          </div>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center space-x-2">
            <Filter className="h-4 w-4" />
            <span>Change Filters</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Change Type Filters */}
            <div>
              <h4 className="text-sm font-medium mb-3">Change Types</h4>
              <div className="space-y-2">
                <div className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    id="show-added"
                    checked={filters.showAdded}
                    onChange={() => toggleFilter('showAdded')}
                  />
                  <label htmlFor="show-added" className="text-sm text-green-600">
                    Added ({statistics.added})
                  </label>
                </div>
                <div className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    id="show-removed"
                    checked={filters.showRemoved}
                    onChange={() => toggleFilter('showRemoved')}
                  />
                  <label htmlFor="show-removed" className="text-sm text-red-600">
                    Removed ({statistics.removed})
                  </label>
                </div>
                <div className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    id="show-modified"
                    checked={filters.showModified}
                    onChange={() => toggleFilter('showModified')}
                  />
                  <label htmlFor="show-modified" className="text-sm text-blue-600">
                    Modified ({statistics.modified})
                  </label>
                </div>
              </div>
            </div>

            {/* Category Filters */}
            <div>
              <h4 className="text-sm font-medium mb-3">Categories</h4>
              <div className="space-y-2">
                <div className="flex items-center space-x-2">
                  <input
                    type="radio"
                    id="cat-all"
                    name="category"
                    checked={filters.changeType === 'all'}
                    onChange={() => toggleFilter('changeType', 'all')}
                  />
                  <label htmlFor="cat-all" className="text-sm">All</label>
                </div>
                <div className="flex items-center space-x-2">
                  <input
                    type="radio"
                    id="cat-devices"
                    name="category"
                    checked={filters.changeType === 'devices'}
                    onChange={() => toggleFilter('changeType', 'devices')}
                  />
                  <label htmlFor="cat-devices" className="text-sm">Devices ({statistics.devices})</label>
                </div>
                <div className="flex items-center space-x-2">
                  <input
                    type="radio"
                    id="cat-ports"
                    name="category"
                    checked={filters.changeType === 'ports'}
                    onChange={() => toggleFilter('changeType', 'ports')}
                  />
                  <label htmlFor="cat-ports" className="text-sm">Ports ({statistics.ports})</label>
                </div>
                <div className="flex items-center space-x-2">
                  <input
                    type="radio"
                    id="cat-services"
                    name="category"
                    checked={filters.changeType === 'services'}
                    onChange={() => toggleFilter('changeType', 'services')}
                  />
                  <label htmlFor="cat-services" className="text-sm">Services ({statistics.services})</label>
                </div>
              </div>
            </div>

            {/* Severity Filters */}
            <div>
              <h4 className="text-sm font-medium mb-3">Severity</h4>
              <div className="space-y-2">
                <div className="flex items-center space-x-2">
                  <input
                    type="radio"
                    id="sev-all"
                    name="severity"
                    checked={filters.severity === 'all'}
                    onChange={() => toggleFilter('severity', 'all')}
                  />
                  <label htmlFor="sev-all" className="text-sm">All</label>
                </div>
                <div className="flex items-center space-x-2">
                  <input
                    type="radio"
                    id="sev-high"
                    name="severity"
                    checked={filters.severity === 'high'}
                    onChange={() => toggleFilter('severity', 'high')}
                  />
                  <label htmlFor="sev-high" className="text-sm text-red-600">High ({statistics.high})</label>
                </div>
                <div className="flex items-center space-x-2">
                  <input
                    type="radio"
                    id="sev-medium"
                    name="severity"
                    checked={filters.severity === 'medium'}
                    onChange={() => toggleFilter('severity', 'medium')}
                  />
                  <label htmlFor="sev-medium" className="text-sm text-yellow-600">Medium ({statistics.medium})</label>
                </div>
                <div className="flex items-center space-x-2">
                  <input
                    type="radio"
                    id="sev-low"
                    name="severity"
                    checked={filters.severity === 'low'}
                    onChange={() => toggleFilter('severity', 'low')}
                  />
                  <label htmlFor="sev-low" className="text-sm text-gray-600">Low ({statistics.low})</label>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Changes List */}
      {filteredChanges.length === 0 ? (
        <Card>
          <CardContent className="flex items-center justify-center py-12">
            <div className="text-center">
              <CheckCircle className="mx-auto h-12 w-12 text-green-500 mb-4" />
              <h3 className="text-lg font-semibold mb-2">No Changes Found</h3>
              <p className="text-sm text-muted-foreground">
                {Object.values(filters).some(f => f === false)
                  ? 'Try adjusting the filters to see more changes'
                  : 'The snapshots are identical'
                }
              </p>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {Object.entries(groupedChanges).map(([deviceId, changes]) => (
            <Card key={deviceId}>
              <CardHeader 
                className="cursor-pointer hover:bg-muted/50"
                onClick={() => toggleSection(deviceId)}
              >
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg flex items-center space-x-2">
                    <Network className="h-4 w-4" />
                    <span>Device: {deviceId}</span>
                    <Badge variant="outline">{changes.length} changes</Badge>
                  </CardTitle>
                  <Button variant="ghost" size="sm">
                    {expandedSections.has(deviceId) ? (
                      <EyeOff className="h-4 w-4" />
                    ) : (
                      <Eye className="h-4 w-4" />
                    )}
                  </Button>
                </div>
              </CardHeader>

              {expandedSections.has(deviceId) && (
                <CardContent>
                  <div className="space-y-3">
                    {changes.map((change, index) => {
                      const ChangeIcon = CHANGE_TYPE_ICONS[change.changeType as keyof typeof CHANGE_TYPE_ICONS]
                      const changeColors = CHANGE_TYPE_COLORS[change.changeType as keyof typeof CHANGE_TYPE_COLORS]
                      const severityColor = SEVERITY_COLORS[change.severity as keyof typeof SEVERITY_COLORS]
                      
                      return (
                        <div
                          key={change.id || index}
                          className={cn(
                            'flex items-start space-x-3 p-3 border rounded-lg transition-colors',
                            changeColors,
                            selectedChange === change.id && 'ring-2 ring-primary ring-offset-1'
                          )}
                          onClick={() => setSelectedChange(change.id || null)}
                        >
                          <div className="flex-shrink-0">
                            <ChangeIcon className="h-4 w-4 mt-0.5" />
                          </div>
                          
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center space-x-2 mb-1">
                              <Badge variant="outline" className="text-xs capitalize">
                                {change.category}
                              </Badge>
                              <Badge 
                                variant={
                                  change.severity === 'high' ? 'destructive' :
                                  change.severity === 'medium' ? 'warning' : 'secondary'
                                }
                                className="text-xs"
                              >
                                {change.severity}
                              </Badge>
                              <span className="text-xs text-muted-foreground">
                                {change.changeType}
                              </span>
                            </div>
                            
                            <p className="text-sm font-medium mb-1">
                              {change.description || `${change.changeType} ${change.category}`}
                            </p>
                            
                            {change.oldValue !== undefined && change.newValue !== undefined && (
                              <div className="flex items-center space-x-2 text-xs">
                                <code className="bg-red-100 text-red-700 px-1 rounded">
                                  {String(change.oldValue)}
                                </code>
                                <ArrowRight className="h-3 w-3 text-muted-foreground" />
                                <code className="bg-green-100 text-green-700 px-1 rounded">
                                  {String(change.newValue)}
                                </code>
                              </div>
                            )}
                            
                            {change.details && (
                              <p className="text-xs text-muted-foreground mt-1">
                                {change.details}
                              </p>
                            )}
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </CardContent>
              )}
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}