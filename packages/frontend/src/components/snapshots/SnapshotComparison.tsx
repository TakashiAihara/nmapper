import { Card, CardContent, CardHeader, CardTitle, Badge } from '@/components/ui'
import { DeviceCard } from '@/components/devices'
import { formatDate, cn } from '@/lib/utils'
import { useCompareSnapshots } from '@/hooks/useApi'
import type { Device } from '@nmapper/shared'
import {
  Plus,
  Minus,
  Edit,
  Calendar,
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  CheckCircle,
  ArrowRight
} from 'lucide-react'

interface SnapshotComparisonProps {
  snapshot1Id: string
  snapshot2Id: string
  className?: string
}

// Mock comparison data structure - this would come from the API
interface ComparisonResult {
  snapshot1: {
    id: string
    timestamp: Date
    devices: Device[]
  }
  snapshot2: {
    id: string
    timestamp: Date
    devices: Device[]
  }
  changes: {
    devicesAdded: Device[]
    devicesRemoved: Device[]
    devicesModified: {
      device: Device
      changes: {
        field: string
        oldValue: any
        newValue: any
      }[]
    }[]
    portsAdded: { device: string; ports: any[] }[]
    portsRemoved: { device: string; ports: any[] }[]
    servicesAdded: { device: string; services: any[] }[]
    servicesRemoved: { device: string; services: any[] }[]
    riskChanges: { device: string; oldRisk: string; newRisk: string }[]
  }
  summary: {
    totalChanges: number
    devicesChanged: number
    portsChanged: number
    servicesChanged: number
    riskIncreased: number
    riskDecreased: number
  }
}

export function SnapshotComparison({ snapshot1Id, snapshot2Id, className }: SnapshotComparisonProps) {
  const { data: comparison, isLoading, error } = useCompareSnapshots(snapshot1Id, snapshot2Id)

  if (isLoading) {
    return (
      <div className={cn('space-y-6', className)}>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="h-24 bg-muted rounded-lg animate-pulse" />
          ))}
        </div>
        <div className="h-96 bg-muted rounded-lg animate-pulse" />
      </div>
    )
  }

  if (error || !comparison) {
    return (
      <Card className={className}>
        <CardContent className="flex items-center justify-center py-12">
          <div className="text-center">
            <AlertTriangle className="mx-auto h-12 w-12 text-red-500" />
            <h3 className="mt-4 text-lg font-semibold">Comparison failed</h3>
            <p className="text-muted-foreground">
              Unable to load snapshot comparison
            </p>
          </div>
        </CardContent>
      </Card>
    )
  }

  // Mock data for demonstration
  const mockComparison: ComparisonResult = {
    snapshot1: {
      id: snapshot1Id,
      timestamp: new Date(Date.now() - 24 * 60 * 60 * 1000), // Yesterday
      devices: []
    },
    snapshot2: {
      id: snapshot2Id,
      timestamp: new Date(), // Now
      devices: []
    },
    changes: {
      devicesAdded: [],
      devicesRemoved: [],
      devicesModified: [],
      portsAdded: [],
      portsRemoved: [],
      servicesAdded: [],
      servicesRemoved: [],
      riskChanges: []
    },
    summary: {
      totalChanges: 12,
      devicesChanged: 3,
      portsChanged: 5,
      servicesChanged: 2,
      riskIncreased: 1,
      riskDecreased: 0
    }
  }

  const comp = mockComparison

  return (
    <div className={cn('space-y-6', className)}>
      {/* Comparison Header */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>Snapshot Comparison</span>
            <div className="flex items-center space-x-2 text-sm text-muted-foreground">
              <span>{snapshot1Id.slice(0, 8)}...</span>
              <ArrowRight className="h-4 w-4" />
              <span>{snapshot2Id.slice(0, 8)}...</span>
            </div>
          </CardTitle>
        </CardHeader>
        
        <CardContent>
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <div className="text-center">
                <p className="text-sm text-muted-foreground">From</p>
                <p className="font-medium">{formatDate(comp.snapshot1.timestamp)}</p>
              </div>
              <ArrowRight className="h-4 w-4 text-muted-foreground" />
              <div className="text-center">
                <p className="text-sm text-muted-foreground">To</p>
                <p className="font-medium">{formatDate(comp.snapshot2.timestamp)}</p>
              </div>
            </div>
            
            <Badge variant={comp.summary.totalChanges > 0 ? "default" : "outline"}>
              {comp.summary.totalChanges} changes detected
            </Badge>
          </div>
        </CardContent>
      </Card>

      {/* Summary Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Devices</p>
                <p className="text-xl font-bold">{comp.summary.devicesChanged}</p>
              </div>
              <Edit className="h-6 w-6 text-blue-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Ports</p>
                <p className="text-xl font-bold">{comp.summary.portsChanged}</p>
              </div>
              <TrendingUp className="h-6 w-6 text-green-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Services</p>
                <p className="text-xl font-bold">{comp.summary.servicesChanged}</p>
              </div>
              <TrendingDown className="h-6 w-6 text-orange-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Risk Changes</p>
                <p className="text-xl font-bold">
                  {comp.summary.riskIncreased + comp.summary.riskDecreased}
                </p>
              </div>
              {comp.summary.riskIncreased > 0 ? (
                <AlertTriangle className="h-6 w-6 text-red-500" />
              ) : (
                <CheckCircle className="h-6 w-6 text-green-500" />
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Changes Detail */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Devices Added */}
        {comp.changes.devicesAdded.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Plus className="h-5 w-5 text-green-500" />
                <span>Devices Added ({comp.changes.devicesAdded.length})</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {comp.changes.devicesAdded.map((device) => (
                  <div key={device.ip} className="p-3 border border-green-200 bg-green-50 dark:bg-green-900/20 dark:border-green-800 rounded-lg">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-medium">{device.hostname || device.ip}</p>
                        <p className="text-sm text-muted-foreground">{device.ip}</p>
                      </div>
                      <Badge variant="success" className="text-xs">New</Badge>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Devices Removed */}
        {comp.changes.devicesRemoved.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Minus className="h-5 w-5 text-red-500" />
                <span>Devices Removed ({comp.changes.devicesRemoved.length})</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {comp.changes.devicesRemoved.map((device) => (
                  <div key={device.ip} className="p-3 border border-red-200 bg-red-50 dark:bg-red-900/20 dark:border-red-800 rounded-lg">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-medium">{device.hostname || device.ip}</p>
                        <p className="text-sm text-muted-foreground">{device.ip}</p>
                      </div>
                      <Badge variant="destructive" className="text-xs">Removed</Badge>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Device Changes */}
        {comp.changes.devicesModified.length > 0 && (
          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Edit className="h-5 w-5 text-blue-500" />
                <span>Device Changes ({comp.changes.devicesModified.length})</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {comp.changes.devicesModified.map((item) => (
                  <div key={item.device.ip} className="p-4 border rounded-lg">
                    <div className="flex items-center justify-between mb-3">
                      <div>
                        <p className="font-medium">{item.device.hostname || item.device.ip}</p>
                        <p className="text-sm text-muted-foreground">{item.device.ip}</p>
                      </div>
                      <Badge variant="secondary" className="text-xs">
                        {item.changes.length} changes
                      </Badge>
                    </div>
                    
                    <div className="space-y-2">
                      {item.changes.map((change, index) => (
                        <div key={index} className="text-sm p-2 bg-muted/50 rounded">
                          <div className="flex items-center justify-between">
                            <span className="font-medium capitalize">{change.field}:</span>
                            <div className="flex items-center space-x-2">
                              <span className="text-red-600 line-through">
                                {String(change.oldValue)}
                              </span>
                              <ArrowRight className="h-3 w-3" />
                              <span className="text-green-600">
                                {String(change.newValue)}
                              </span>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Risk Changes */}
        {comp.changes.riskChanges.length > 0 && (
          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <AlertTriangle className="h-5 w-5 text-orange-500" />
                <span>Risk Level Changes ({comp.changes.riskChanges.length})</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {comp.changes.riskChanges.map((change, index) => (
                  <div key={index} className="p-3 border rounded-lg">
                    <div className="flex items-center justify-between">
                      <span className="font-medium">{change.device}</span>
                      <div className="flex items-center space-x-2">
                        <Badge 
                          variant={change.oldRisk === 'high' ? 'destructive' : 
                                   change.oldRisk === 'medium' ? 'warning' : 'success'}
                          className="text-xs line-through"
                        >
                          {change.oldRisk}
                        </Badge>
                        <ArrowRight className="h-3 w-3" />
                        <Badge 
                          variant={change.newRisk === 'high' ? 'destructive' : 
                                   change.newRisk === 'medium' ? 'warning' : 'success'}
                          className="text-xs"
                        >
                          {change.newRisk}
                        </Badge>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {/* No Changes */}
      {comp.summary.totalChanges === 0 && (
        <Card>
          <CardContent className="flex items-center justify-center py-12">
            <div className="text-center">
              <CheckCircle className="mx-auto h-12 w-12 text-green-500" />
              <h3 className="mt-4 text-lg font-semibold">No changes detected</h3>
              <p className="text-muted-foreground">
                Your network remained stable between these snapshots
              </p>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}