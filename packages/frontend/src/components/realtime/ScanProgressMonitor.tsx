import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle, Button, Badge, Progress } from '@/components/ui'
import { useWebSocketEvent } from '@/hooks/useWebSocket'
import { useAppStore } from '@/store'
import { useNotifications } from '@/services/notificationService'
import { formatDuration, cn } from '@/lib/utils'
import {
  Play,
  Square,
  RefreshCw,
  CheckCircle,
  AlertTriangle,
  Activity,
  Clock,
  Target,
  Search,
  Shield,
  Database
} from 'lucide-react'

interface ScanProgressMonitorProps {
  className?: string
}

interface ScanState {
  scanId: string | null
  isScanning: boolean
  progress: number
  stage: string
  startTime: Date | null
  estimatedCompletion: Date | null
  devicesFound: number
  portsScanned: number
  errors: string[]
}

const SCAN_STAGES = {
  'initializing': 'Initializing scan...',
  'discovery': 'Discovering devices...',
  'port_scan': 'Scanning ports...',
  'service_detection': 'Detecting services...',
  'os_detection': 'Identifying operating systems...',
  'vulnerability_scan': 'Checking for vulnerabilities...',
  'finalizing': 'Finalizing results...',
  'completed': 'Scan completed'
}

export function ScanProgressMonitor({ className }: ScanProgressMonitorProps) {
  const [scanState, setScanState] = useState<ScanState>({
    scanId: null,
    isScanning: false,
    progress: 0,
    stage: 'idle',
    startTime: null,
    estimatedCompletion: null,
    devicesFound: 0,
    portsScanned: 0,
    errors: []
  })

  const { setScanning, setScanProgress } = useAppStore()
  const notifications = useNotifications()

  // Listen for scan start
  useWebSocketEvent('scan:started', (data) => {
    setScanState({
      scanId: data.scanId,
      isScanning: true,
      progress: 0,
      stage: 'initializing',
      startTime: new Date(data.timestamp),
      estimatedCompletion: null,
      devicesFound: 0,
      portsScanned: 0,
      errors: []
    })
    
    setScanning(true)
    setScanProgress(0)
  }, [])

  // Listen for scan progress
  useWebSocketEvent('scan:progress', (data) => {
    setScanState(prev => ({
      ...prev,
      progress: data.progress,
      stage: data.stage,
      estimatedCompletion: prev.startTime ? 
        new Date(prev.startTime.getTime() + ((Date.now() - prev.startTime.getTime()) / data.progress * 100)) : 
        null
    }))
    
    setScanProgress(data.progress)
  }, [])

  // Listen for scan completion
  useWebSocketEvent('scan:completed', (data) => {
    setScanState(prev => ({
      ...prev,
      isScanning: false,
      progress: 100,
      stage: 'completed'
    }))
    
    setScanning(false)
    setScanProgress(0)
  }, [])

  // Listen for scan failure
  useWebSocketEvent('scan:failed', (data) => {
    setScanState(prev => ({
      ...prev,
      isScanning: false,
      errors: [...prev.errors, data.error]
    }))
    
    setScanning(false)
    setScanProgress(0)
  }, [])

  // Mock scan statistics updates (would come from WebSocket in real implementation)
  useEffect(() => {
    if (!scanState.isScanning) return

    const interval = setInterval(() => {
      setScanState(prev => ({
        ...prev,
        devicesFound: prev.devicesFound + Math.floor(Math.random() * 3),
        portsScanned: prev.portsScanned + Math.floor(Math.random() * 50) + 10
      }))
    }, 2000)

    return () => clearInterval(interval)
  }, [scanState.isScanning])

  const getStageIcon = (stage: string) => {
    switch (stage) {
      case 'initializing': return RefreshCw
      case 'discovery': return Search
      case 'port_scan': return Target
      case 'service_detection': return Activity
      case 'os_detection': return Shield
      case 'vulnerability_scan': return AlertTriangle
      case 'finalizing': return Database
      case 'completed': return CheckCircle
      default: return Activity
    }
  }

  const getStageColor = (stage: string) => {
    switch (stage) {
      case 'completed': return 'text-green-500'
      case 'vulnerability_scan': return 'text-orange-500'
      case 'finalizing': return 'text-blue-500'
      default: return 'text-primary'
    }
  }

  const getElapsedTime = () => {
    if (!scanState.startTime) return '0s'
    const elapsed = Date.now() - scanState.startTime.getTime()
    return formatDuration(elapsed)
  }

  const getEstimatedTimeRemaining = () => {
    if (!scanState.estimatedCompletion || !scanState.isScanning) return null
    const remaining = scanState.estimatedCompletion.getTime() - Date.now()
    return remaining > 0 ? formatDuration(remaining) : '0s'
  }

  if (!scanState.isScanning && !scanState.scanId) {
    return (
      <Card className={className}>
        <CardContent className="flex items-center justify-center py-8">
          <div className="text-center">
            <Activity className="mx-auto h-8 w-8 text-muted-foreground mb-3" />
            <h3 className="text-lg font-semibold mb-1">No active scan</h3>
            <p className="text-sm text-muted-foreground">
              Start a network scan to monitor progress here
            </p>
          </div>
        </CardContent>
      </Card>
    )
  }

  const StageIcon = getStageIcon(scanState.stage)

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Activity className="h-5 w-5" />
            <span>Scan Progress</span>
          </div>
          
          <div className="flex items-center space-x-2">
            <Badge 
              variant={scanState.isScanning ? "default" : scanState.errors.length > 0 ? "destructive" : "success"}
              className="flex items-center space-x-1"
            >
              {scanState.isScanning ? (
                <RefreshCw className="h-3 w-3 animate-spin" />
              ) : scanState.errors.length > 0 ? (
                <AlertTriangle className="h-3 w-3" />
              ) : (
                <CheckCircle className="h-3 w-3" />
              )}
              <span>
                {scanState.isScanning ? 'Scanning' : scanState.errors.length > 0 ? 'Failed' : 'Completed'}
              </span>
            </Badge>
            
            {scanState.scanId && (
              <Badge variant="outline" className="text-xs font-mono">
                {scanState.scanId.slice(0, 8)}...
              </Badge>
            )}
          </div>
        </CardTitle>
      </CardHeader>
      
      <CardContent className="space-y-6">
        {/* Progress Bar */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <div className="flex items-center space-x-2">
              <StageIcon className={cn('h-4 w-4', getStageColor(scanState.stage))} />
              <span className="font-medium">
                {SCAN_STAGES[scanState.stage as keyof typeof SCAN_STAGES] || scanState.stage}
              </span>
            </div>
            <span className="font-mono">{scanState.progress.toFixed(1)}%</span>
          </div>
          
          <Progress 
            value={scanState.progress} 
            className={cn(
              'h-3 transition-all duration-500',
              scanState.isScanning && 'animate-pulse'
            )}
          />
        </div>

        {/* Statistics Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="text-center p-3 bg-muted/50 rounded-lg">
            <Search className="h-4 w-4 mx-auto mb-1 text-blue-500" />
            <p className="text-sm font-medium">{scanState.devicesFound}</p>
            <p className="text-xs text-muted-foreground">Devices Found</p>
          </div>
          
          <div className="text-center p-3 bg-muted/50 rounded-lg">
            <Target className="h-4 w-4 mx-auto mb-1 text-green-500" />
            <p className="text-sm font-medium">{scanState.portsScanned.toLocaleString()}</p>
            <p className="text-xs text-muted-foreground">Ports Scanned</p>
          </div>
          
          <div className="text-center p-3 bg-muted/50 rounded-lg">
            <Clock className="h-4 w-4 mx-auto mb-1 text-orange-500" />
            <p className="text-sm font-medium">{getElapsedTime()}</p>
            <p className="text-xs text-muted-foreground">Elapsed</p>
          </div>
          
          <div className="text-center p-3 bg-muted/50 rounded-lg">
            <Activity className="h-4 w-4 mx-auto mb-1 text-purple-500" />
            <p className="text-sm font-medium">
              {getEstimatedTimeRemaining() || '--'}
            </p>
            <p className="text-xs text-muted-foreground">Remaining</p>
          </div>
        </div>

        {/* Stage Progress */}
        <div className="space-y-2">
          <h4 className="text-sm font-semibold">Scan Stages</h4>
          <div className="grid grid-cols-1 gap-1">
            {Object.entries(SCAN_STAGES).map(([stage, label]) => {
              const isCurrentStage = scanState.stage === stage
              const isCompletedStage = Object.keys(SCAN_STAGES).indexOf(scanState.stage) > Object.keys(SCAN_STAGES).indexOf(stage)
              const StageIcon = getStageIcon(stage)
              
              return (
                <div
                  key={stage}
                  className={cn(
                    'flex items-center space-x-2 p-2 rounded text-sm transition-colors',
                    isCurrentStage && 'bg-primary/10 text-primary font-medium',
                    isCompletedStage && 'text-muted-foreground',
                    !isCurrentStage && !isCompletedStage && 'text-muted-foreground/60'
                  )}
                >
                  <StageIcon className={cn(
                    'h-3 w-3',
                    isCurrentStage && 'text-primary animate-pulse',
                    isCompletedStage && 'text-green-500',
                    !isCurrentStage && !isCompletedStage && 'text-muted-foreground/60'
                  )} />
                  <span>{label}</span>
                  {isCompletedStage && (
                    <CheckCircle className="h-3 w-3 text-green-500 ml-auto" />
                  )}
                  {isCurrentStage && scanState.isScanning && (
                    <RefreshCw className="h-3 w-3 animate-spin ml-auto" />
                  )}
                </div>
              )
            })}
          </div>
        </div>

        {/* Errors */}
        {scanState.errors.length > 0 && (
          <div className="space-y-2">
            <h4 className="text-sm font-semibold text-red-600">Scan Errors</h4>
            <div className="space-y-1">
              {scanState.errors.map((error, index) => (
                <div key={index} className="flex items-start space-x-2 p-2 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded text-sm">
                  <AlertTriangle className="h-4 w-4 text-red-500 flex-shrink-0 mt-0.5" />
                  <span className="text-red-700 dark:text-red-300">{error}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Real-time Log */}
        {scanState.isScanning && (
          <div className="space-y-2">
            <h4 className="text-sm font-semibold">Live Activity</h4>
            <div className="max-h-32 overflow-y-auto bg-muted/30 rounded p-3 font-mono text-xs space-y-1">
              <div className="text-muted-foreground flex items-center space-x-2">
                <span className="text-blue-500">[{new Date().toLocaleTimeString()}]</span>
                <span>Scanning subnet 192.168.1.0/24...</span>
              </div>
              <div className="text-muted-foreground flex items-center space-x-2">
                <span className="text-green-500">[{new Date().toLocaleTimeString()}]</span>
                <span>Found device: 192.168.1.{100 + scanState.devicesFound}</span>
              </div>
              <div className="text-muted-foreground flex items-center space-x-2">
                <span className="text-orange-500">[{new Date().toLocaleTimeString()}]</span>
                <span>Port scan progress: {scanState.portsScanned} ports checked</span>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}