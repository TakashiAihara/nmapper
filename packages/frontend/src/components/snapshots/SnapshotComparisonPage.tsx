import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle, Button } from '@/components/ui'
import { SnapshotSelector } from './SnapshotSelector'
import { SnapshotDiffViewer } from './SnapshotDiffViewer'
import { cn } from '@/lib/utils'
import type { NetworkSnapshot } from '@nmapper/shared'
import {
  ArrowLeft,
  GitCompare,
  Calendar,
  Activity,
  Clock,
  Info,
  Download,
  Share2,
  RefreshCw,
  Home,
  ChevronRight
} from 'lucide-react'

interface SnapshotComparisonPageProps {
  onNavigateBack?: () => void
  className?: string
}

export function SnapshotComparisonPage({ onNavigateBack, className }: SnapshotComparisonPageProps) {
  const [selectedSnapshots, setSelectedSnapshots] = useState<[NetworkSnapshot | null, NetworkSnapshot | null]>([null, null])
  const [comparisonStarted, setComparisonStarted] = useState(false)

  const handleSnapshotSelect = (snapshot: NetworkSnapshot, position: 'left' | 'right') => {
    const newSnapshots = [...selectedSnapshots] as [NetworkSnapshot | null, NetworkSnapshot | null]
    newSnapshots[position === 'left' ? 0 : 1] = snapshot
    setSelectedSnapshots(newSnapshots)
  }

  const handleCompare = () => {
    if (selectedSnapshots[0] && selectedSnapshots[1]) {
      setComparisonStarted(true)
    }
  }

  const handleReset = () => {
    setSelectedSnapshots([null, null])
    setComparisonStarted(false)
  }

  const canCompare = selectedSnapshots[0] && selectedSnapshots[1] && selectedSnapshots[0].id !== selectedSnapshots[1].id

  return (
    <div className={cn('h-full flex flex-col', className)}>
      {/* Header */}
      <div className="flex-shrink-0 p-6 border-b bg-muted/20">
        <div className="flex items-center justify-between">
          <nav className="flex items-center space-x-2 text-sm">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => window.location.href = '/'}
              className="text-muted-foreground hover:text-foreground"
            >
              <Home className="h-4 w-4 mr-1" />
              Home
            </Button>
            
            <ChevronRight className="h-4 w-4 text-muted-foreground" />
            
            <Button
              variant="ghost"
              size="sm"
              onClick={onNavigateBack}
              className="text-muted-foreground hover:text-foreground"
            >
              Network
            </Button>
            
            <ChevronRight className="h-4 w-4 text-muted-foreground" />
            
            <span className="font-medium text-foreground">Snapshot Comparison</span>
          </nav>

          <div className="flex items-center space-x-2">
            {comparisonStarted && (
              <Button
                variant="outline"
                size="sm"
                onClick={handleReset}
              >
                <RefreshCw className="h-4 w-4 mr-1" />
                New Comparison
              </Button>
            )}
            
            <Button
              variant="outline"
              size="sm"
              onClick={() => window.print()}
              disabled={!comparisonStarted}
            >
              <Download className="h-4 w-4 mr-1" />
              Print
            </Button>
            
            <Button
              variant="outline" 
              size="sm"
              onClick={() => {
                if (navigator.share) {
                  navigator.share({
                    title: 'Network Snapshot Comparison',
                    url: window.location.href
                  })
                } else {
                  navigator.clipboard.writeText(window.location.href)
                }
              }}
              disabled={!comparisonStarted}
            >
              <Share2 className="h-4 w-4 mr-1" />
              Share
            </Button>
          </div>
        </div>
      </div>

      {/* Page Header */}
      <div className="flex-shrink-0 p-6 border-b">
        <div className="flex items-start justify-between">
          <div className="flex items-center space-x-4">
            {onNavigateBack && (
              <Button
                variant="outline"
                size="sm"
                onClick={onNavigateBack}
                className="flex-shrink-0"
              >
                <ArrowLeft className="h-4 w-4 mr-1" />
                Back
              </Button>
            )}
            
            <div>
              <h1 className="text-2xl font-bold flex items-center space-x-2">
                <GitCompare className="h-6 w-6" />
                <span>Snapshot Comparison</span>
              </h1>
              <p className="text-sm text-muted-foreground mt-1">
                {comparisonStarted 
                  ? 'Comparing network changes between selected snapshots'
                  : 'Select two network snapshots to analyze changes over time'
                }
              </p>
            </div>
          </div>

          {/* Comparison Status */}
          {comparisonStarted && selectedSnapshots[0] && selectedSnapshots[1] && (
            <Card className="flex-shrink-0 w-80">
              <CardContent className="p-4">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-sm font-medium">Comparison Overview</h3>
                  <GitCompare className="h-4 w-4 text-muted-foreground" />
                </div>
                
                <div className="grid grid-cols-2 gap-3 text-xs">
                  <div className="space-y-1">
                    <p className="text-muted-foreground">Snapshot A</p>
                    <p className="font-mono">{selectedSnapshots[0].id.slice(0, 12)}...</p>
                    <p className="flex items-center text-muted-foreground">
                      <Calendar className="h-3 w-3 mr-1" />
                      {new Date(selectedSnapshots[0].timestamp).toLocaleDateString()}
                    </p>
                  </div>
                  
                  <div className="space-y-1">
                    <p className="text-muted-foreground">Snapshot B</p>
                    <p className="font-mono">{selectedSnapshots[1].id.slice(0, 12)}...</p>
                    <p className="flex items-center text-muted-foreground">
                      <Calendar className="h-3 w-3 mr-1" />
                      {new Date(selectedSnapshots[1].timestamp).toLocaleDateString()}
                    </p>
                  </div>
                </div>
                
                <div className="mt-3 pt-3 border-t">
                  <div className="flex items-center justify-between text-xs">
                    <span className="flex items-center text-muted-foreground">
                      <Clock className="h-3 w-3 mr-1" />
                      Time Span
                    </span>
                    <span className="font-medium">
                      {Math.round((selectedSnapshots[1].timestamp.getTime() - selectedSnapshots[0].timestamp.getTime()) / (1000 * 60 * 60 * 24))} days
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 overflow-auto">
        <div className="p-6">
          {!comparisonStarted ? (
            <SnapshotSelector
              selectedSnapshots={selectedSnapshots}
              onSnapshotSelect={handleSnapshotSelect}
              onCompare={handleCompare}
              showComparisons={true}
            />
          ) : (
            selectedSnapshots[0] && selectedSnapshots[1] && (
              <SnapshotDiffViewer
                snapshotId1={selectedSnapshots[0].id}
                snapshotId2={selectedSnapshots[1].id}
              />
            )
          )}
        </div>
      </div>

      {/* Status Bar */}
      <div className="flex-shrink-0 px-6 py-3 border-t bg-muted/30">
        <div className="flex items-center justify-between text-sm text-muted-foreground">
          <div className="flex items-center space-x-4">
            {comparisonStarted ? (
              <>
                <span className="flex items-center space-x-1">
                  <GitCompare className="h-4 w-4" />
                  <span>Comparison Active</span>
                </span>
                <span>•</span>
                <span>{selectedSnapshots[0]?.id.slice(0, 8)} → {selectedSnapshots[1]?.id.slice(0, 8)}</span>
              </>
            ) : (
              <>
                <span className="flex items-center space-x-1">
                  <Activity className="h-4 w-4" />
                  <span>Selection Mode</span>
                </span>
                {selectedSnapshots[0] && (
                  <>
                    <span>•</span>
                    <span>Snapshot A: {selectedSnapshots[0].id.slice(0, 8)}</span>
                  </>
                )}
                {selectedSnapshots[1] && (
                  <>
                    <span>•</span>
                    <span>Snapshot B: {selectedSnapshots[1].id.slice(0, 8)}</span>
                  </>
                )}
              </>
            )}
          </div>
          
          <div className="flex items-center space-x-2">
            {!comparisonStarted && (
              <Button
                size="sm"
                onClick={handleCompare}
                disabled={!canCompare}
              >
                Compare Snapshots
              </Button>
            )}
            
            <span>Last updated: {new Date().toLocaleTimeString()}</span>
          </div>
        </div>
      </div>
    </div>
  )
}