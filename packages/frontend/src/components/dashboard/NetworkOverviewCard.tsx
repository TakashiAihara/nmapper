import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle, Button, Badge } from '@/components/ui'
import { useNetworkDevices, useNetworkStatus, useScanProgress } from '@/hooks'
import { useNetworkStore } from '@/store'
import { LoadingSpinner, ErrorState } from '@/components/common'
import { cn } from '@/lib/utils'
import {
  Network,
  Wifi,
  WifiOff,
  Activity,
  AlertTriangle,
  Shield,
  Users,
  Search,
  RefreshCw,
  Play,
  Square,
  TrendingUp,
  TrendingDown,
  Minus,
  Eye,
  Settings
} from 'lucide-react'

interface NetworkOverviewCardProps {
  className?: string
}

export function NetworkOverviewCard({ className }: NetworkOverviewCardProps) {
  const { data: devices = [], isLoading: devicesLoading, error: devicesError } = useNetworkDevices()
  const { data: networkStatus, isLoading: statusLoading } = useNetworkStatus({ refetchInterval: 30000 })
  const { data: scanProgress, isLoading: scanLoading } = useScanProgress({ refetchInterval: 5000 })
  const { isScanning, setScanning } = useNetworkStore()

  const [refreshing, setRefreshing] = useState(false)

  // Calculate network statistics
  const networkStats = {
    totalDevices: devices.length,
    onlineDevices: devices.filter(d => d.isActive).length,
    offlineDevices: devices.filter(d => !d.isActive).length,
    highRiskDevices: devices.filter(d => d.riskLevel === 'high').length,
    mediumRiskDevices: devices.filter(d => d.riskLevel === 'medium').length,
    lowRiskDevices: devices.filter(d => d.riskLevel === 'low').length,
    unknownDevices: devices.filter(d => !d.deviceType || d.deviceType === 'unknown').length
  }

  // Calculate percentages and trends
  const onlinePercentage = networkStats.totalDevices > 0 
    ? Math.round((networkStats.onlineDevices / networkStats.totalDevices) * 100)
    : 0

  const riskPercentage = networkStats.totalDevices > 0
    ? Math.round(((networkStats.highRiskDevices + networkStats.mediumRiskDevices) / networkStats.totalDevices) * 100)
    : 0

  const handleRefresh = async () => {
    setRefreshing(true)
    // Trigger refresh of all data
    setTimeout(() => {
      setRefreshing(false)
    }, 2000)
  }

  const handleStartScan = () => {
    setScanning(true)
    // This would trigger the actual scan via mutation
  }

  const handleStopScan = () => {
    setScanning(false)
  }

  if (devicesError) {
    return (
      <Card className={className}>
        <ErrorState
          type="network"
          title="Network Overview Unavailable"
          description="Unable to load network overview data"
          onAction={handleRefresh}
          size="sm"
        />
      </Card>
    )
  }

  const isLoading = devicesLoading || statusLoading || refreshing

  return (
    <Card className={className}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center space-x-2">
            <Network className="h-5 w-5" />
            <span>Network Overview</span>
            {isLoading && <LoadingSpinner size="sm" />}
          </CardTitle>
          
          <div className="flex items-center space-x-2">
            {/* Network Status Indicator */}
            <Badge variant={networkStats.onlineDevices > 0 ? 'success' : 'destructive'}>
              {networkStats.onlineDevices > 0 ? 'Active' : 'No Activity'}
            </Badge>

            {/* Refresh Button */}
            <Button
              variant="ghost"
              size="sm"
              onClick={handleRefresh}
              disabled={isLoading}
            >
              <RefreshCw className={cn('h-4 w-4', (isLoading || refreshing) && 'animate-spin')} />
            </Button>

            {/* Scan Control */}
            {isScanning || scanProgress?.isScanning ? (
              <Button
                variant="destructive"
                size="sm"
                onClick={handleStopScan}
                className="flex items-center space-x-1"
              >
                <Square className="h-3 w-3" />
                <span>Stop</span>
              </Button>
            ) : (
              <Button
                variant="default"
                size="sm"
                onClick={handleStartScan}
                className="flex items-center space-x-1"
              >
                <Play className="h-3 w-3" />
                <span>Scan</span>
              </Button>
            )}
          </div>
        </div>
      </CardHeader>

      <CardContent>
        <div className="space-y-6">
          {/* Key Metrics Grid */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {/* Total Devices */}
            <div className="text-center p-4 bg-muted/30 rounded-lg">
              <div className="flex items-center justify-center space-x-2 mb-2">
                <Users className="h-5 w-5 text-blue-500" />
                <span className="text-2xl font-bold">{networkStats.totalDevices}</span>
              </div>
              <p className="text-sm text-muted-foreground">Total Devices</p>
            </div>

            {/* Online Devices */}
            <div className="text-center p-4 bg-muted/30 rounded-lg">
              <div className="flex items-center justify-center space-x-2 mb-2">
                <Wifi className="h-5 w-5 text-green-500" />
                <span className="text-2xl font-bold text-green-600">{networkStats.onlineDevices}</span>
              </div>
              <p className="text-sm text-muted-foreground">
                Online ({onlinePercentage}%)
              </p>
            </div>

            {/* Offline Devices */}
            <div className="text-center p-4 bg-muted/30 rounded-lg">
              <div className="flex items-center justify-center space-x-2 mb-2">
                <WifiOff className="h-5 w-5 text-red-500" />
                <span className="text-2xl font-bold text-red-600">{networkStats.offlineDevices}</span>
              </div>
              <p className="text-sm text-muted-foreground">Offline</p>
            </div>

            {/* Risk Devices */}
            <div className="text-center p-4 bg-muted/30 rounded-lg">
              <div className="flex items-center justify-center space-x-2 mb-2">
                <AlertTriangle className="h-5 w-5 text-yellow-500" />
                <span className="text-2xl font-bold text-yellow-600">
                  {networkStats.highRiskDevices + networkStats.mediumRiskDevices}
                </span>
              </div>
              <p className="text-sm text-muted-foreground">
                At Risk ({riskPercentage}%)
              </p>
            </div>
          </div>

          {/* Current Scan Status */}
          {(isScanning || scanProgress?.isScanning) && scanProgress && (
            <div className="p-4 border rounded-lg bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center space-x-2">
                  <Search className="h-4 w-4 text-blue-600" />
                  <span className="font-medium text-blue-700 dark:text-blue-300">
                    Network Scan in Progress
                  </span>
                </div>
                <Badge variant="default" className="animate-pulse">
                  {scanProgress.stage}
                </Badge>
              </div>
              
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span>Progress</span>
                  <span>{scanProgress.progress.toFixed(1)}%</span>
                </div>
                <div className="w-full bg-blue-200 rounded-full h-2">
                  <div
                    className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                    style={{ width: `${scanProgress.progress}%` }}
                  />
                </div>
                <div className="grid grid-cols-2 gap-4 text-xs text-blue-700 dark:text-blue-300">
                  <div>Devices Found: {scanProgress.devicesFound}</div>
                  <div>Ports Scanned: {scanProgress.portsScanned}</div>
                </div>
              </div>
            </div>
          )}

          {/* Risk Breakdown */}
          <div className="space-y-3">
            <h4 className="text-sm font-medium flex items-center space-x-2">
              <Shield className="h-4 w-4" />
              <span>Security Risk Analysis</span>
            </h4>
            
            <div className="space-y-2">
              {/* High Risk */}
              <div className="flex items-center justify-between p-2 rounded border-l-4 border-red-500 bg-red-50 dark:bg-red-900/20">
                <div className="flex items-center space-x-2">
                  <AlertTriangle className="h-4 w-4 text-red-600" />
                  <span className="text-sm font-medium text-red-700 dark:text-red-300">High Risk</span>
                </div>
                <div className="flex items-center space-x-2">
                  <span className="text-sm font-bold text-red-700 dark:text-red-300">
                    {networkStats.highRiskDevices}
                  </span>
                  {networkStats.totalDevices > 0 && (
                    <div className="w-16 bg-red-200 rounded-full h-1">
                      <div
                        className="bg-red-600 h-1 rounded-full"
                        style={{ 
                          width: `${(networkStats.highRiskDevices / networkStats.totalDevices) * 100}%` 
                        }}
                      />
                    </div>
                  )}
                </div>
              </div>

              {/* Medium Risk */}
              <div className="flex items-center justify-between p-2 rounded border-l-4 border-yellow-500 bg-yellow-50 dark:bg-yellow-900/20">
                <div className="flex items-center space-x-2">
                  <AlertTriangle className="h-4 w-4 text-yellow-600" />
                  <span className="text-sm font-medium text-yellow-700 dark:text-yellow-300">Medium Risk</span>
                </div>
                <div className="flex items-center space-x-2">
                  <span className="text-sm font-bold text-yellow-700 dark:text-yellow-300">
                    {networkStats.mediumRiskDevices}
                  </span>
                  {networkStats.totalDevices > 0 && (
                    <div className="w-16 bg-yellow-200 rounded-full h-1">
                      <div
                        className="bg-yellow-600 h-1 rounded-full"
                        style={{ 
                          width: `${(networkStats.mediumRiskDevices / networkStats.totalDevices) * 100}%` 
                        }}
                      />
                    </div>
                  )}
                </div>
              </div>

              {/* Low Risk */}
              <div className="flex items-center justify-between p-2 rounded border-l-4 border-green-500 bg-green-50 dark:bg-green-900/20">
                <div className="flex items-center space-x-2">
                  <Shield className="h-4 w-4 text-green-600" />
                  <span className="text-sm font-medium text-green-700 dark:text-green-300">Low Risk</span>
                </div>
                <div className="flex items-center space-x-2">
                  <span className="text-sm font-bold text-green-700 dark:text-green-300">
                    {networkStats.lowRiskDevices}
                  </span>
                  {networkStats.totalDevices > 0 && (
                    <div className="w-16 bg-green-200 rounded-full h-1">
                      <div
                        className="bg-green-600 h-1 rounded-full"
                        style={{ 
                          width: `${(networkStats.lowRiskDevices / networkStats.totalDevices) * 100}%` 
                        }}
                      />
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Network Health Indicators */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Connectivity Health */}
            <div className="text-center p-3 border rounded-lg">
              <div className="flex items-center justify-center mb-2">
                {onlinePercentage >= 80 ? (
                  <TrendingUp className="h-5 w-5 text-green-500" />
                ) : onlinePercentage >= 50 ? (
                  <Minus className="h-5 w-5 text-yellow-500" />
                ) : (
                  <TrendingDown className="h-5 w-5 text-red-500" />
                )}
              </div>
              <p className="text-lg font-bold">{onlinePercentage}%</p>
              <p className="text-xs text-muted-foreground">Connectivity</p>
            </div>

            {/* Security Health */}
            <div className="text-center p-3 border rounded-lg">
              <div className="flex items-center justify-center mb-2">
                {riskPercentage <= 10 ? (
                  <Shield className="h-5 w-5 text-green-500" />
                ) : riskPercentage <= 30 ? (
                  <AlertTriangle className="h-5 w-5 text-yellow-500" />
                ) : (
                  <AlertTriangle className="h-5 w-5 text-red-500" />
                )}
              </div>
              <p className="text-lg font-bold">{100 - riskPercentage}%</p>
              <p className="text-xs text-muted-foreground">Security</p>
            </div>

            {/* Discovery Health */}
            <div className="text-center p-3 border rounded-lg">
              <div className="flex items-center justify-center mb-2">
                {networkStats.unknownDevices <= 2 ? (
                  <Eye className="h-5 w-5 text-green-500" />
                ) : networkStats.unknownDevices <= 5 ? (
                  <Eye className="h-5 w-5 text-yellow-500" />
                ) : (
                  <Eye className="h-5 w-5 text-red-500" />
                )}
              </div>
              <p className="text-lg font-bold">
                {networkStats.totalDevices > 0 
                  ? Math.round(((networkStats.totalDevices - networkStats.unknownDevices) / networkStats.totalDevices) * 100)
                  : 0
                }%
              </p>
              <p className="text-xs text-muted-foreground">Identified</p>
            </div>
          </div>

          {/* Quick Actions */}
          <div className="flex flex-wrap gap-2 pt-2 border-t">
            <Button variant="outline" size="sm" className="flex items-center space-x-1">
              <Eye className="h-3 w-3" />
              <span>View All Devices</span>
            </Button>
            <Button variant="outline" size="sm" className="flex items-center space-x-1">
              <AlertTriangle className="h-3 w-3" />
              <span>View Risks</span>
            </Button>
            <Button variant="outline" size="sm" className="flex items-center space-x-1">
              <Network className="h-3 w-3" />
              <span>Network Map</span>
            </Button>
            <Button variant="outline" size="sm" className="flex items-center space-x-1">
              <Settings className="h-3 w-3" />
              <span>Configure</span>
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}