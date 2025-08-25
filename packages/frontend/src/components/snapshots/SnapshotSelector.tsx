import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle, Button, Badge } from '@/components/ui'
import { formatDate, formatRelativeTime, cn } from '@/lib/utils'
import { useSnapshots } from '@/hooks/useApi'
import { useAppStore } from '@/store'
import { Calendar, Clock, CheckCircle, Circle, ArrowRight } from 'lucide-react'

interface SnapshotSelectorProps {
  onCompare?: (snapshot1Id: string, snapshot2Id: string) => void
  className?: string
}

export function SnapshotSelector({ onCompare, className }: SnapshotSelectorProps) {
  const { data: snapshots = [], isLoading } = useSnapshots(50)
  const { comparisonSnapshots, setComparisonSnapshots } = useAppStore()
  
  const [selectedSnapshots, setSelectedSnapshots] = useState<[string | null, string | null]>(comparisonSnapshots)

  const handleSnapshotSelect = (snapshotId: string) => {
    if (selectedSnapshots[0] === snapshotId) {
      // Deselect first snapshot
      setSelectedSnapshots([null, selectedSnapshots[1]])
    } else if (selectedSnapshots[1] === snapshotId) {
      // Deselect second snapshot
      setSelectedSnapshots([selectedSnapshots[0], null])
    } else if (selectedSnapshots[0] === null) {
      // Select as first snapshot
      setSelectedSnapshots([snapshotId, selectedSnapshots[1]])
    } else if (selectedSnapshots[1] === null) {
      // Select as second snapshot
      setSelectedSnapshots([selectedSnapshots[0], snapshotId])
    } else {
      // Replace second snapshot
      setSelectedSnapshots([selectedSnapshots[0], snapshotId])
    }
  }

  const handleCompare = () => {
    if (selectedSnapshots[0] && selectedSnapshots[1]) {
      setComparisonSnapshots(selectedSnapshots)
      onCompare?.(selectedSnapshots[0], selectedSnapshots[1])
    }
  }

  const isSelected = (snapshotId: string) => {
    return selectedSnapshots[0] === snapshotId || selectedSnapshots[1] === snapshotId
  }

  const getSelectionOrder = (snapshotId: string) => {
    if (selectedSnapshots[0] === snapshotId) return 1
    if (selectedSnapshots[1] === snapshotId) return 2
    return null
  }

  if (isLoading) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle>Select Snapshots to Compare</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {Array.from({ length: 5 }).map((_, i) => (
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
          <CardTitle>Select Snapshots to Compare</CardTitle>
          <Button
            onClick={handleCompare}
            disabled={!selectedSnapshots[0] || !selectedSnapshots[1]}
            className="flex items-center space-x-2"
          >
            <span>Compare</span>
            <ArrowRight className="h-4 w-4" />
          </Button>
        </div>
        <p className="text-sm text-muted-foreground">
          Select two snapshots to compare changes in your network
        </p>
      </CardHeader>
      
      <CardContent>
        {snapshots.length === 0 ? (
          <div className="text-center py-8">
            <Calendar className="mx-auto h-12 w-12 text-muted-foreground" />
            <h3 className="mt-4 text-lg font-semibold">No snapshots available</h3>
            <p className="text-muted-foreground">
              Run a network scan to create your first snapshot
            </p>
          </div>
        ) : (
          <div className="space-y-2 max-h-96 overflow-y-auto">
            {snapshots.map((snapshot) => {
              const selected = isSelected(snapshot.id)
              const order = getSelectionOrder(snapshot.id)
              
              return (
                <div
                  key={snapshot.id}
                  className={cn(
                    'flex items-center justify-between p-3 rounded-lg border cursor-pointer transition-all',
                    selected 
                      ? 'border-primary bg-primary/5 shadow-sm' 
                      : 'hover:border-muted-foreground/50 hover:bg-muted/50'
                  )}
                  onClick={() => handleSnapshotSelect(snapshot.id)}
                >
                  <div className="flex items-center space-x-3">
                    <div className="relative">
                      {selected ? (
                        <CheckCircle className="h-5 w-5 text-primary" />
                      ) : (
                        <Circle className="h-5 w-5 text-muted-foreground" />
                      )}
                      {order && (
                        <Badge 
                          className="absolute -top-2 -right-2 h-4 w-4 p-0 flex items-center justify-center text-xs"
                          variant={order === 1 ? "default" : "secondary"}
                        >
                          {order}
                        </Badge>
                      )}
                    </div>
                    
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center space-x-2">
                        <span className="text-sm font-medium">
                          Snapshot {snapshot.id.slice(0, 8)}...
                        </span>
                        <Badge variant="outline" className="text-xs">
                          {snapshot.devices.length} devices
                        </Badge>
                      </div>
                      
                      <div className="flex items-center space-x-4 mt-1">
                        <div className="flex items-center space-x-1 text-xs text-muted-foreground">
                          <Calendar className="h-3 w-3" />
                          <span>{formatDate(snapshot.timestamp)}</span>
                        </div>
                        
                        <div className="flex items-center space-x-1 text-xs text-muted-foreground">
                          <Clock className="h-3 w-3" />
                          <span>{formatRelativeTime(snapshot.timestamp)}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </CardContent>
    </Card>
  )
}