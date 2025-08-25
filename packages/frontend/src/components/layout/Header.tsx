import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { useAppStore } from '@/store'
import { useSystemStatus } from '@/hooks/useApi'
import { Wifi, WifiOff, Play, Square, RefreshCw } from 'lucide-react'

export function Header() {
  const { isScanning, scanProgress } = useAppStore()
  const { data: systemStatus } = useSystemStatus()

  const isOnline = systemStatus && !systemStatus.isScanning

  return (
    <header className="h-16 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="flex items-center justify-between h-full px-6">
        {/* Status indicators */}
        <div className="flex items-center space-x-4">
          <div className="flex items-center space-x-2">
            {isOnline ? (
              <Wifi className="h-5 w-5 text-green-500" />
            ) : (
              <WifiOff className="h-5 w-5 text-red-500" />
            )}
            <Badge variant={isOnline ? 'success' : 'destructive'}>
              {isOnline ? 'Online' : 'Offline'}
            </Badge>
          </div>

          {/* Scan status */}
          {isScanning && (
            <div className="flex items-center space-x-3">
              <RefreshCw className="h-4 w-4 animate-spin" />
              <div className="flex items-center space-x-2 min-w-[120px]">
                <Progress value={scanProgress} className="h-2" />
                <span className="text-sm text-muted-foreground">
                  {scanProgress}%
                </span>
              </div>
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="flex items-center space-x-2">
          <Button
            variant={isScanning ? 'destructive' : 'default'}
            size="sm"
            disabled={!isOnline}
          >
            {isScanning ? (
              <>
                <Square className="h-4 w-4 mr-2" />
                Stop Scan
              </>
            ) : (
              <>
                <Play className="h-4 w-4 mr-2" />
                Start Scan
              </>
            )}
          </Button>
        </div>
      </div>
    </header>
  )
}