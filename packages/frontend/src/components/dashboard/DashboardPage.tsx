import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle, Button } from '@/components/ui'
import { NetworkOverviewCard } from './NetworkOverviewCard'
import { RecentChangesCard } from './RecentChangesCard'
import { SystemHealthCard } from './SystemHealthCard'
import { useWebSocketEvent } from '@/hooks/useWebSocket'
import { useNotifications } from '@/services/notificationService'
import { LoadingSpinner } from '@/components/common'
import { cn } from '@/lib/utils'
import {
  LayoutDashboard,
  RefreshCw,
  Settings,
  Maximize2,
  Minimize2,
  Activity,
  Zap,
  AlertTriangle,
  CheckCircle,
  TrendingUp
} from 'lucide-react'

interface DashboardPageProps {
  className?: string
}

export function DashboardPage({ className }: DashboardPageProps) {
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [lastRefreshTime, setLastRefreshTime] = useState<Date>(new Date())
  const [autoRefresh, setAutoRefresh] = useState(true)
  const [refreshInterval, setRefreshInterval] = useState(30) // seconds
  const [expandedCard, setExpandedCard] = useState<string | null>(null)
  const [liveUpdates, setLiveUpdates] = useState({
    devices: 0,
    changes: 0,
    alerts: 0,
    lastActivity: new Date()
  })

  const notifications = useNotifications()

  // Auto-refresh functionality
  useEffect(() => {
    if (!autoRefresh) return

    const interval = setInterval(() => {
      handleRefresh()
    }, refreshInterval * 1000)

    return () => clearInterval(interval)
  }, [autoRefresh, refreshInterval])

  // Real-time WebSocket event handlers
  useWebSocketEvent('device:discovered', (data) => {
    setLiveUpdates(prev => ({
      ...prev,
      devices: prev.devices + 1,
      lastActivity: new Date()
    }))
    
    notifications.show({
      title: 'New Device Discovered',
      description: `${data.device.hostname || data.device.ip} joined the network`,
      level: 'info'
    })
  }, [])

  useWebSocketEvent('device:removed', (data) => {
    setLiveUpdates(prev => ({
      ...prev,
      devices: prev.devices - 1,
      lastActivity: new Date()
    }))
    
    notifications.show({
      title: 'Device Disconnected',
      description: `Device ${data.deviceId} left the network`,
      level: 'warning'
    })
  }, [])

  useWebSocketEvent('device:status_changed', (data) => {
    setLiveUpdates(prev => ({
      ...prev,
      changes: prev.changes + 1,
      lastActivity: new Date()
    }))
  }, [])

  useWebSocketEvent('system:alert', (data) => {
    setLiveUpdates(prev => ({
      ...prev,
      alerts: prev.alerts + 1,
      lastActivity: new Date()
    }))
    
    if (data.level === 'critical') {
      notifications.show({
        title: 'Critical System Alert',
        description: data.message,
        level: 'error',
        persistent: true
      })
    }
  }, [])

  useWebSocketEvent('network:anomaly_detected', (data) => {
    setLiveUpdates(prev => ({
      ...prev,
      alerts: prev.alerts + 1,
      lastActivity: new Date()
    }))
    
    notifications.show({
      title: 'Network Anomaly Detected',
      description: data.description || 'Unusual network activity detected',
      level: 'warning',
      persistent: true
    })
  }, [])

  // Handle manual refresh
  const handleRefresh = async () => {
    setIsRefreshing(true)
    setLastRefreshTime(new Date())
    
    // Simulate refresh delay
    setTimeout(() => {
      setIsRefreshing(false)
    }, 1500)
    
    notifications.show({
      title: 'Dashboard Refreshed',
      description: 'All dashboard data has been updated',
      level: 'success'
    })
  }

  // Handle card expansion
  const toggleCardExpansion = (cardId: string) => {
    setExpandedCard(expandedCard === cardId ? null : cardId)
  }

  // Calculate time since last activity
  const getTimeSinceLastActivity = () => {
    const diff = Date.now() - liveUpdates.lastActivity.getTime()
    const minutes = Math.floor(diff / 60000)
    const seconds = Math.floor((diff % 60000) / 1000)
    
    if (minutes > 0) return `${minutes}m ago`
    return `${seconds}s ago`
  }

  return (
    <div className={cn('space-y-6', className)}>
      {/* Dashboard Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold flex items-center space-x-2">
            <LayoutDashboard className="h-8 w-8" />
            <span>Network Dashboard</span>
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Real-time network monitoring and system overview
          </p>
        </div>

        <div className="flex items-center space-x-3">
          {/* Live Activity Indicator */}
          <div className="flex items-center space-x-2 px-3 py-1 bg-muted/50 rounded-lg">
            <div className={cn(
              'w-2 h-2 rounded-full',
              Date.now() - liveUpdates.lastActivity.getTime() < 30000 
                ? 'bg-green-500 animate-pulse' 
                : 'bg-gray-400'
            )} />
            <span className="text-xs text-muted-foreground">
              Last activity: {getTimeSinceLastActivity()}
            </span>
          </div>

          {/* Auto-refresh Toggle */}
          <Button
            variant={autoRefresh ? 'default' : 'outline'}
            size="sm"
            onClick={() => setAutoRefresh(!autoRefresh)}
            className="flex items-center space-x-1"
          >
            <Activity className={cn('h-3 w-3', autoRefresh && 'animate-pulse')} />
            <span>{autoRefresh ? 'Auto' : 'Manual'}</span>
          </Button>

          {/* Refresh Button */}
          <Button
            variant="outline"
            size="sm"
            onClick={handleRefresh}
            disabled={isRefreshing}
            className="flex items-center space-x-1"
          >
            <RefreshCw className={cn('h-4 w-4', isRefreshing && 'animate-spin')} />
            <span>Refresh</span>
          </Button>

          {/* Settings */}
          <Button variant="ghost" size="sm">
            <Settings className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Real-time Statistics Banner */}
      <Card>
        <CardContent className="py-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center">
              <div className="flex items-center justify-center space-x-2 mb-1">
                <Activity className="h-4 w-4 text-blue-500" />
                <span className="text-xl font-bold text-blue-600">
                  {liveUpdates.devices}
                </span>
              </div>
              <p className="text-xs text-muted-foreground">Device Updates</p>
            </div>

            <div className="text-center">
              <div className="flex items-center justify-center space-x-2 mb-1">
                <TrendingUp className="h-4 w-4 text-green-500" />
                <span className="text-xl font-bold text-green-600">
                  {liveUpdates.changes}
                </span>
              </div>
              <p className="text-xs text-muted-foreground">Network Changes</p>
            </div>

            <div className="text-center">
              <div className="flex items-center justify-center space-x-2 mb-1">
                <AlertTriangle className="h-4 w-4 text-yellow-500" />
                <span className="text-xl font-bold text-yellow-600">
                  {liveUpdates.alerts}
                </span>
              </div>
              <p className="text-xs text-muted-foreground">System Alerts</p>
            </div>

            <div className="text-center">
              <div className="flex items-center justify-center space-x-2 mb-1">
                <CheckCircle className="h-4 w-4 text-green-500" />
                <span className="text-xl font-bold">
                  {autoRefresh ? refreshInterval : '∞'}
                </span>
              </div>
              <p className="text-xs text-muted-foreground">
                {autoRefresh ? 'Refresh (s)' : 'Manual Mode'}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Dashboard Grid */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        {/* Network Overview - Takes full width on smaller screens */}
        <div className={cn(
          'xl:col-span-2',
          expandedCard === 'network' && 'xl:col-span-3'
        )}>
          <div className="relative">
            <NetworkOverviewCard />
            <Button
              variant="ghost"
              size="sm"
              className="absolute top-4 right-16"
              onClick={() => toggleCardExpansion('network')}
            >
              {expandedCard === 'network' ? (
                <Minimize2 className="h-4 w-4" />
              ) : (
                <Maximize2 className="h-4 w-4" />
              )}
            </Button>
          </div>
        </div>

        {/* System Health */}
        {expandedCard !== 'network' && expandedCard !== 'changes' && (
          <div className={cn(
            expandedCard === 'health' && 'xl:col-span-3'
          )}>
            <div className="relative">
              <SystemHealthCard showDetails={expandedCard === 'health'} />
              <Button
                variant="ghost"
                size="sm"
                className="absolute top-4 right-16"
                onClick={() => toggleCardExpansion('health')}
              >
                {expandedCard === 'health' ? (
                  <Minimize2 className="h-4 w-4" />
                ) : (
                  <Maximize2 className="h-4 w-4" />
                )}
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* Recent Changes - Full width row */}
      {expandedCard !== 'network' && expandedCard !== 'health' && (
        <div className={cn(
          expandedCard === 'changes' && 'xl:col-span-3'
        )}>
          <div className="relative">
            <RecentChangesCard 
              timeRange={24}
              limit={expandedCard === 'changes' ? 50 : 20}
              showFilters={expandedCard === 'changes'}
            />
            <Button
              variant="ghost"
              size="sm"
              className="absolute top-4 right-16"
              onClick={() => toggleCardExpansion('changes')}
            >
              {expandedCard === 'changes' ? (
                <Minimize2 className="h-4 w-4" />
              ) : (
                <Maximize2 className="h-4 w-4" />
              )}
            </Button>
          </div>
        </div>
      )}

      {/* Dashboard Settings Panel */}
      <Card className="border-dashed">
        <CardHeader>
          <CardTitle className="text-sm flex items-center space-x-2">
            <Settings className="h-4 w-4" />
            <span>Dashboard Settings</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Auto-refresh Settings */}
            <div className="space-y-2">
              <label className="text-xs font-medium">Auto-refresh Interval</label>
              <div className="flex space-x-2">
                {[15, 30, 60, 300].map((seconds) => (
                  <Button
                    key={seconds}
                    variant={refreshInterval === seconds ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setRefreshInterval(seconds)}
                    className="text-xs"
                  >
                    {seconds >= 60 ? `${seconds / 60}m` : `${seconds}s`}
                  </Button>
                ))}
              </div>
            </div>

            {/* Live Updates */}
            <div className="space-y-2">
              <label className="text-xs font-medium">Live Updates</label>
              <div className="flex items-center space-x-2">
                <Button
                  variant={autoRefresh ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setAutoRefresh(!autoRefresh)}
                  className="text-xs"
                >
                  <Zap className="h-3 w-3 mr-1" />
                  {autoRefresh ? 'Enabled' : 'Disabled'}
                </Button>
                {isRefreshing && <LoadingSpinner size="sm" />}
              </div>
            </div>

            {/* Last Refresh */}
            <div className="space-y-2">
              <label className="text-xs font-medium">Last Refresh</label>
              <p className="text-xs text-muted-foreground">
                {lastRefreshTime.toLocaleTimeString()}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}