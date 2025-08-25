import { useState } from 'react'
import { useParams, useNavigate } from '@tanstack/react-router'
import { Card, CardContent, CardHeader, CardTitle, Button } from '@/components/ui'
import { DeviceInfoCard } from './DeviceInfoCard'
import { DevicePortsCard } from './DevicePortsCard'
import { DeviceHistoryCard } from './DeviceHistoryCard'
import { LoadingState, ErrorState } from '@/components/common'
import { useDeviceDetails } from '@/hooks'
import { cn } from '@/lib/utils'
import {
  ArrowLeft,
  Monitor,
  Network,
  History,
  Shield,
  Settings,
  ExternalLink,
  Edit2,
  Trash2,
  MoreHorizontal,
  Home,
  ChevronRight,
  Activity,
  Share2,
  Download,
  RefreshCw
} from 'lucide-react'

interface DeviceDetailPageProps {
  className?: string
}

export function DeviceDetailPage({ className }: DeviceDetailPageProps) {
  const { deviceId } = useParams({ from: '/device/$deviceId' })
  const navigate = useNavigate()
  const { data: device, isLoading, error, refetch } = useDeviceDetails(deviceId)
  
  const [activeTab, setActiveTab] = useState<'overview' | 'ports' | 'history' | 'security'>('overview')
  const [isRefreshing, setIsRefreshing] = useState(false)

  const tabs = [
    { id: 'overview', label: 'Overview', icon: Monitor },
    { id: 'ports', label: 'Ports & Services', icon: Network },
    { id: 'history', label: 'History', icon: History },
    { id: 'security', label: 'Security', icon: Shield }
  ]

  const handleRefresh = async () => {
    setIsRefreshing(true)
    try {
      await refetch()
    } finally {
      setIsRefreshing(false)
    }
  }

  const handleGoBack = () => {
    navigate({ to: '/network' })
  }

  const handleShare = () => {
    const url = window.location.href
    if (navigator.share) {
      navigator.share({
        title: `Device Details - ${device?.hostname || device?.ip}`,
        url: url
      })
    } else {
      navigator.clipboard.writeText(url)
    }
  }

  const handleExport = () => {
    // Export device information as JSON
    if (device) {
      const dataStr = JSON.stringify(device, null, 2)
      const dataUri = 'data:application/json;charset=utf-8,'+ encodeURIComponent(dataStr)
      
      const exportFileDefaultName = `device-${device.ip}-${new Date().toISOString().split('T')[0]}.json`
      
      const linkElement = document.createElement('a')
      linkElement.setAttribute('href', dataUri)
      linkElement.setAttribute('download', exportFileDefaultName)
      linkElement.click()
    }
  }

  if (isLoading) {
    return (
      <div className={cn('h-full', className)}>
        <LoadingState
          type="page"
          icon="device"
          title="Loading Device Details"
          description="Fetching comprehensive device information..."
          size="lg"
        />
      </div>
    )
  }

  if (error || !device) {
    return (
      <div className={cn('h-full', className)}>
        <ErrorState
          type="device"
          title="Device Not Found"
          description="The requested device could not be found or is no longer accessible on the network."
          onAction={handleGoBack}
          actionLabel="Back to Network"
        />
      </div>
    )
  }

  return (
    <div className={cn('h-full flex flex-col', className)}>
      {/* Breadcrumb Navigation */}
      <div className="flex-shrink-0 p-6 border-b bg-muted/20">
        <div className="flex items-center justify-between">
          <nav className="flex items-center space-x-2 text-sm">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigate({ to: '/' })}
              className="text-muted-foreground hover:text-foreground"
            >
              <Home className="h-4 w-4 mr-1" />
              Home
            </Button>
            
            <ChevronRight className="h-4 w-4 text-muted-foreground" />
            
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigate({ to: '/network' })}
              className="text-muted-foreground hover:text-foreground"
            >
              Network
            </Button>
            
            <ChevronRight className="h-4 w-4 text-muted-foreground" />
            
            <span className="font-medium text-foreground">
              {device.hostname || device.ip}
            </span>
          </nav>

          <div className="flex items-center space-x-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleRefresh}
              disabled={isRefreshing}
            >
              <RefreshCw className={cn('h-4 w-4', isRefreshing && 'animate-spin')} />
            </Button>
            
            <Button
              variant="outline"
              size="sm"
              onClick={handleShare}
            >
              <Share2 className="h-4 w-4" />
            </Button>
            
            <Button
              variant="outline"
              size="sm"
              onClick={handleExport}
            >
              <Download className="h-4 w-4" />
            </Button>
            
            <Button variant="ghost" size="sm">
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>

      {/* Device Header */}
      <div className="flex-shrink-0 p-6 border-b">
        <div className="flex items-start justify-between">
          <div className="flex items-center space-x-4">
            <Button
              variant="outline"
              size="sm"
              onClick={handleGoBack}
              className="flex-shrink-0"
            >
              <ArrowLeft className="h-4 w-4 mr-1" />
              Back
            </Button>
            
            <div>
              <h1 className="text-2xl font-bold">
                {device.hostname || device.ip}
              </h1>
              <div className="flex items-center space-x-4 text-sm text-muted-foreground mt-1">
                <span>IP: {device.ip}</span>
                {device.mac && <span>MAC: {device.mac}</span>}
                {device.vendor && <span>Vendor: {device.vendor}</span>}
                <span className="flex items-center space-x-1">
                  <Activity className="h-3 w-3" />
                  <span>Last seen: {device.lastSeen ? new Date(device.lastSeen).toLocaleString() : 'Never'}</span>
                </span>
              </div>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <Button variant="outline" size="sm">
              <Edit2 className="h-4 w-4 mr-2" />
              Edit Device
            </Button>
            
            <Button variant="outline" size="sm">
              <ExternalLink className="h-4 w-4 mr-2" />
              Quick Connect
            </Button>
            
            <Button variant="destructive" size="sm">
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="flex-shrink-0 px-6 border-b">
        <div className="flex space-x-1">
          {tabs.map((tab) => {
            const Icon = tab.icon
            return (
              <Button
                key={tab.id}
                variant={activeTab === tab.id ? 'default' : 'ghost'}
                size="sm"
                onClick={() => setActiveTab(tab.id as any)}
                className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary"
              >
                <Icon className="h-4 w-4 mr-2" />
                {tab.label}
              </Button>
            )
          })}
        </div>
      </div>

      {/* Tab Content */}
      <div className="flex-1 overflow-auto">
        <div className="p-6">
          {activeTab === 'overview' && (
            <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
              <DeviceInfoCard 
                deviceId={deviceId} 
                onRefresh={handleRefresh}
                className="xl:col-span-2"
              />
            </div>
          )}

          {activeTab === 'ports' && (
            <DevicePortsCard 
              deviceId={deviceId}
            />
          )}

          {activeTab === 'history' && (
            <DeviceHistoryCard 
              deviceId={deviceId}
              timeRange={168} // 1 week
              limit={100}
            />
          )}

          {activeTab === 'security' && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Shield className="h-5 w-5" />
                  <span>Security Assessment</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-center py-12">
                  <Shield className="h-16 w-16 mx-auto mb-4 text-muted-foreground" />
                  <h3 className="text-lg font-semibold mb-2">Security Analysis</h3>
                  <p className="text-muted-foreground mb-4">
                    Comprehensive security assessment for this device
                  </p>
                  <Button>
                    <Shield className="h-4 w-4 mr-2" />
                    Run Security Scan
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      {/* Status Bar */}
      <div className="flex-shrink-0 px-6 py-3 border-t bg-muted/30">
        <div className="flex items-center justify-between text-sm text-muted-foreground">
          <div className="flex items-center space-x-4">
            <span>Device ID: {deviceId}</span>
            <span>•</span>
            <span>Last updated: {new Date().toLocaleString()}</span>
          </div>
          
          <div className="flex items-center space-x-2">
            <span className="flex items-center space-x-1">
              <div className={cn(
                'w-2 h-2 rounded-full',
                device.status === 'online' ? 'bg-green-500' : 'bg-red-500'
              )} />
              <span className="capitalize">{device.status || 'Unknown'}</span>
            </span>
          </div>
        </div>
      </div>
    </div>
  )
}