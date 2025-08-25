import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle, Button } from '@/components/ui'
import { ScanConfigurationCard } from './ScanConfigurationCard'
import { UIPreferencesCard } from './UIPreferencesCard'
import { SystemConfigurationCard } from './SystemConfigurationCard'
import { cn } from '@/lib/utils'
import {
  ArrowLeft,
  Settings,
  Network,
  Palette,
  Server,
  Save,
  Download,
  Upload,
  RefreshCw,
  Home,
  ChevronRight,
  AlertTriangle,
  CheckCircle,
  Info,
  Shield,
  Activity,
  FileText,
  Globe
} from 'lucide-react'

interface SettingsPageProps {
  onNavigateBack?: () => void
  className?: string
}

export function SettingsPage({ onNavigateBack, className }: SettingsPageProps) {
  const [activeTab, setActiveTab] = useState<'scan' | 'ui' | 'system'>('scan')
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false)
  const [isExporting, setIsExporting] = useState(false)
  const [importStatus, setImportStatus] = useState<'idle' | 'success' | 'error'>('idle')

  const tabs = [
    {
      id: 'scan',
      label: 'Network Scanning',
      icon: Network,
      description: 'Configure network scanning parameters and schedules'
    },
    {
      id: 'ui',
      label: 'User Interface',
      icon: Palette,
      description: 'Customize appearance and behavior preferences'
    },
    {
      id: 'system',
      label: 'System Configuration',
      icon: Server,
      description: 'Manage system-level settings and resources'
    }
  ]

  const handleConfigChange = () => {
    setHasUnsavedChanges(true)
  }

  const handleExportSettings = async () => {
    setIsExporting(true)
    try {
      // Simulate export process
      await new Promise(resolve => setTimeout(resolve, 2000))
      
      const settings = {
        scan: {}, // Get from scan config
        ui: {}, // Get from UI preferences
        system: {}, // Get from system config
        exported: new Date().toISOString()
      }
      
      const dataStr = JSON.stringify(settings, null, 2)
      const dataUri = 'data:application/json;charset=utf-8,'+ encodeURIComponent(dataStr)
      
      const exportFileDefaultName = `nmapper-settings-${new Date().toISOString().split('T')[0]}.json`
      
      const linkElement = document.createElement('a')
      linkElement.setAttribute('href', dataUri)
      linkElement.setAttribute('download', exportFileDefaultName)
      linkElement.click()
    } finally {
      setIsExporting(false)
    }
  }

  const handleImportSettings = () => {
    const input = document.createElement('input')
    input.type = 'file'
    input.accept = '.json'
    
    input.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0]
      if (!file) return
      
      try {
        const text = await file.text()
        const settings = JSON.parse(text)
        
        // Validate and apply settings
        console.log('Imported settings:', settings)
        setImportStatus('success')
        setTimeout(() => setImportStatus('idle'), 3000)
      } catch (error) {
        console.error('Failed to import settings:', error)
        setImportStatus('error')
        setTimeout(() => setImportStatus('idle'), 3000)
      }
    }
    
    input.click()
  }

  const handleResetAll = () => {
    if (confirm('Are you sure you want to reset all settings to defaults? This cannot be undone.')) {
      // Reset all configurations
      setHasUnsavedChanges(false)
      window.location.reload()
    }
  }

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
            
            <span className="font-medium text-foreground">Settings</span>
          </nav>

          <div className="flex items-center space-x-2">
            {importStatus === 'success' && (
              <div className="flex items-center space-x-1 text-green-600 text-sm">
                <CheckCircle className="h-4 w-4" />
                <span>Settings imported</span>
              </div>
            )}
            
            {importStatus === 'error' && (
              <div className="flex items-center space-x-1 text-red-600 text-sm">
                <AlertTriangle className="h-4 w-4" />
                <span>Import failed</span>
              </div>
            )}
            
            <Button
              variant="outline"
              size="sm"
              onClick={handleImportSettings}
            >
              <Upload className="h-4 w-4 mr-1" />
              Import
            </Button>
            
            <Button
              variant="outline"
              size="sm"
              onClick={handleExportSettings}
              disabled={isExporting}
            >
              {isExporting ? (
                <RefreshCw className="h-4 w-4 mr-1 animate-spin" />
              ) : (
                <Download className="h-4 w-4 mr-1" />
              )}
              Export
            </Button>
            
            <Button
              variant="destructive"
              size="sm"
              onClick={handleResetAll}
            >
              Reset All
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
                <Settings className="h-6 w-6" />
                <span>Settings</span>
              </h1>
              <p className="text-sm text-muted-foreground mt-1">
                Configure network scanning, user interface, and system settings
              </p>
            </div>
          </div>

          {/* Status Indicator */}
          {hasUnsavedChanges && (
            <Card className="flex-shrink-0">
              <CardContent className="p-3">
                <div className="flex items-center space-x-2 text-sm">
                  <AlertTriangle className="h-4 w-4 text-yellow-500" />
                  <span className="text-yellow-600">Unsaved changes</span>
                  <Button size="sm" className="ml-2">
                    <Save className="h-4 w-4 mr-1" />
                    Save All
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="flex-shrink-0 px-6 border-b">
        <div className="flex space-x-1">
          {tabs.map((tab) => {
            const Icon = tab.icon
            return (
              <div key={tab.id} className="relative">
                <Button
                  variant={activeTab === tab.id ? 'default' : 'ghost'}
                  size="sm"
                  onClick={() => setActiveTab(tab.id as any)}
                  className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary"
                >
                  <Icon className="h-4 w-4 mr-2" />
                  {tab.label}
                </Button>
                
                {activeTab === tab.id && (
                  <div className="absolute top-full left-0 right-0 p-3 bg-muted/50 text-xs text-muted-foreground border-b">
                    {tab.description}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </div>

      {/* Tab Content */}
      <div className="flex-1 overflow-auto">
        <div className="p-6">
          {activeTab === 'scan' && (
            <ScanConfigurationCard
              onConfigChange={handleConfigChange}
            />
          )}

          {activeTab === 'ui' && (
            <UIPreferencesCard
              onPreferencesChange={handleConfigChange}
            />
          )}

          {activeTab === 'system' && (
            <SystemConfigurationCard
              onConfigChange={handleConfigChange}
            />
          )}
        </div>
      </div>

      {/* Status Bar */}
      <div className="flex-shrink-0 px-6 py-3 border-t bg-muted/30">
        <div className="flex items-center justify-between text-sm text-muted-foreground">
          <div className="flex items-center space-x-4">
            <span className="flex items-center space-x-1">
              <Settings className="h-4 w-4" />
              <span>Configuration: {tabs.find(t => t.id === activeTab)?.label}</span>
            </span>
            
            {hasUnsavedChanges && (
              <>
                <span>•</span>
                <span className="flex items-center space-x-1 text-yellow-600">
                  <AlertTriangle className="h-4 w-4" />
                  <span>Unsaved changes pending</span>
                </span>
              </>
            )}
          </div>
          
          <div className="flex items-center space-x-4">
            <span>Last updated: {new Date().toLocaleTimeString()}</span>
            
            <div className="flex items-center space-x-2">
              <Button variant="ghost" size="sm" className="text-xs">
                <RefreshCw className="h-3 w-3 mr-1" />
                Reload
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Quick Actions Panel */}
      <Card className="mx-6 mb-6 border-dashed">
        <CardHeader>
          <CardTitle className="text-sm flex items-center space-x-2">
            <Activity className="h-4 w-4" />
            <span>Quick Actions</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 text-sm">
            <Button variant="outline" size="sm" className="justify-start">
              <Network className="h-4 w-4 mr-2" />
              Test Network Scan
            </Button>
            
            <Button variant="outline" size="sm" className="justify-start">
              <Shield className="h-4 w-4 mr-2" />
              Security Check
            </Button>
            
            <Button variant="outline" size="sm" className="justify-start">
              <FileText className="h-4 w-4 mr-2" />
              View Logs
            </Button>
            
            <Button variant="outline" size="sm" className="justify-start">
              <Globe className="h-4 w-4 mr-2" />
              Network Status
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}