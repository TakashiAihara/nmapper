import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle, Button, Input, Badge } from '@/components/ui'
import { useConfig, useUpdateConfig, useResetConfig } from '@/hooks/useApi'
import { cn } from '@/lib/utils'
import {
  Settings,
  Save,
  RefreshCw,
  RotateCcw,
  Network,
  Clock,
  Database,
  Shield,
  AlertTriangle,
  CheckCircle
} from 'lucide-react'

interface ConfigurationFormProps {
  className?: string
}

// Mock configuration structure
interface Configuration {
  scanning: {
    networkRange: string
    defaultPorts: string
    scanInterval: number
    timeout: number
    maxConcurrent: number
    nmapArgs: string
  }
  database: {
    retentionDays: number
    maxSnapshots: number
    autoCleanup: boolean
    backupEnabled: boolean
  }
  monitoring: {
    healthCheckInterval: number
    metricsRetentionHours: number
    alertThresholds: {
      cpuUsage: number
      memoryUsage: number
      diskUsage: number
    }
  }
  security: {
    riskAssessment: boolean
    portScanDetection: boolean
    anomalyDetection: boolean
    alertOnNewDevices: boolean
  }
}

export function ConfigurationForm({ className }: ConfigurationFormProps) {
  const { data: config, isLoading } = useConfig()
  const { mutate: updateConfig, isPending: isUpdating } = useUpdateConfig()
  const { mutate: resetConfig, isPending: isResetting } = useResetConfig()

  // Mock configuration data
  const mockConfig: Configuration = {
    scanning: {
      networkRange: '192.168.1.0/24',
      defaultPorts: '1-1000',
      scanInterval: 3600,
      timeout: 30,
      maxConcurrent: 50,
      nmapArgs: '-sS -O'
    },
    database: {
      retentionDays: 30,
      maxSnapshots: 100,
      autoCleanup: true,
      backupEnabled: false
    },
    monitoring: {
      healthCheckInterval: 60,
      metricsRetentionHours: 168,
      alertThresholds: {
        cpuUsage: 80,
        memoryUsage: 85,
        diskUsage: 90
      }
    },
    security: {
      riskAssessment: true,
      portScanDetection: true,
      anomalyDetection: false,
      alertOnNewDevices: true
    }
  }

  const [formConfig, setFormConfig] = useState<Configuration>(config || mockConfig)
  const [hasChanges, setHasChanges] = useState(false)

  const handleInputChange = (section: keyof Configuration, field: string, value: any) => {
    setFormConfig(prev => ({
      ...prev,
      [section]: {
        ...prev[section],
        [field]: value
      }
    }))
    setHasChanges(true)
  }

  const handleNestedChange = (section: keyof Configuration, nested: string, field: string, value: any) => {
    setFormConfig(prev => ({
      ...prev,
      [section]: {
        ...prev[section],
        [nested]: {
          ...(prev[section] as any)[nested],
          [field]: value
        }
      }
    }))
    setHasChanges(true)
  }

  const handleSave = () => {
    updateConfig(formConfig, {
      onSuccess: () => {
        setHasChanges(false)
      }
    })
  }

  const handleReset = () => {
    if (confirm('Are you sure you want to reset all settings to defaults?')) {
      resetConfig(undefined, {
        onSuccess: () => {
          setHasChanges(false)
        }
      })
    }
  }

  if (isLoading) {
    return (
      <div className={cn('space-y-6', className)}>
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="h-64 bg-muted rounded-lg animate-pulse" />
        ))}
      </div>
    )
  }

  return (
    <div className={cn('space-y-6', className)}>
      {/* Header */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center space-x-2">
              <Settings className="h-5 w-5" />
              <span>System Configuration</span>
            </CardTitle>
            
            <div className="flex items-center space-x-2">
              {hasChanges && (
                <Badge variant="warning" className="flex items-center space-x-1">
                  <AlertTriangle className="h-3 w-3" />
                  <span>Unsaved changes</span>
                </Badge>
              )}
              
              <Button
                onClick={handleReset}
                disabled={isResetting}
                variant="outline"
                size="sm"
              >
                {isResetting ? (
                  <RefreshCw className="h-4 w-4 animate-spin mr-2" />
                ) : (
                  <RotateCcw className="h-4 w-4 mr-2" />
                )}
                Reset to Defaults
              </Button>
              
              <Button
                onClick={handleSave}
                disabled={!hasChanges || isUpdating}
                size="sm"
              >
                {isUpdating ? (
                  <RefreshCw className="h-4 w-4 animate-spin mr-2" />
                ) : (
                  <Save className="h-4 w-4 mr-2" />
                )}
                Save Changes
              </Button>
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* Scanning Configuration */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Network className="h-5 w-5" />
            <span>Network Scanning</span>
          </CardTitle>
        </CardHeader>
        
        <CardContent className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <label className="text-sm font-medium">Network Range</label>
              <Input
                value={formConfig.scanning.networkRange}
                onChange={(e) => handleInputChange('scanning', 'networkRange', e.target.value)}
                placeholder="192.168.1.0/24"
              />
              <p className="text-xs text-muted-foreground">
                CIDR notation for the network range to scan
              </p>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Default Ports</label>
              <Input
                value={formConfig.scanning.defaultPorts}
                onChange={(e) => handleInputChange('scanning', 'defaultPorts', e.target.value)}
                placeholder="1-1000"
              />
              <p className="text-xs text-muted-foreground">
                Port range or specific ports to scan
              </p>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Scan Interval (seconds)</label>
              <Input
                type="number"
                value={formConfig.scanning.scanInterval}
                onChange={(e) => handleInputChange('scanning', 'scanInterval', parseInt(e.target.value))}
                min="60"
                max="86400"
              />
              <p className="text-xs text-muted-foreground">
                Time between automatic scans (60 - 86400 seconds)
              </p>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Timeout (seconds)</label>
              <Input
                type="number"
                value={formConfig.scanning.timeout}
                onChange={(e) => handleInputChange('scanning', 'timeout', parseInt(e.target.value))}
                min="5"
                max="300"
              />
              <p className="text-xs text-muted-foreground">
                Maximum time to wait for scan completion
              </p>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Max Concurrent Scans</label>
              <Input
                type="number"
                value={formConfig.scanning.maxConcurrent}
                onChange={(e) => handleInputChange('scanning', 'maxConcurrent', parseInt(e.target.value))}
                min="1"
                max="100"
              />
              <p className="text-xs text-muted-foreground">
                Maximum number of concurrent scan processes
              </p>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Nmap Arguments</label>
              <Input
                value={formConfig.scanning.nmapArgs}
                onChange={(e) => handleInputChange('scanning', 'nmapArgs', e.target.value)}
                placeholder="-sS -O"
              />
              <p className="text-xs text-muted-foreground">
                Additional nmap command line arguments
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Database Configuration */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Database className="h-5 w-5" />
            <span>Database & Storage</span>
          </CardTitle>
        </CardHeader>
        
        <CardContent className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <label className="text-sm font-medium">Retention Period (days)</label>
              <Input
                type="number"
                value={formConfig.database.retentionDays}
                onChange={(e) => handleInputChange('database', 'retentionDays', parseInt(e.target.value))}
                min="1"
                max="365"
              />
              <p className="text-xs text-muted-foreground">
                How long to keep snapshot data
              </p>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Max Snapshots</label>
              <Input
                type="number"
                value={formConfig.database.maxSnapshots}
                onChange={(e) => handleInputChange('database', 'maxSnapshots', parseInt(e.target.value))}
                min="10"
                max="1000"
              />
              <p className="text-xs text-muted-foreground">
                Maximum number of snapshots to retain
              </p>
            </div>
          </div>

          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <label className="text-sm font-medium">Auto Cleanup</label>
                <p className="text-xs text-muted-foreground">
                  Automatically delete old snapshots when limits are reached
                </p>
              </div>
              <input
                type="checkbox"
                checked={formConfig.database.autoCleanup}
                onChange={(e) => handleInputChange('database', 'autoCleanup', e.target.checked)}
                className="rounded border-gray-300"
              />
            </div>

            <div className="flex items-center justify-between">
              <div>
                <label className="text-sm font-medium">Backup Enabled</label>
                <p className="text-xs text-muted-foreground">
                  Enable automatic database backups
                </p>
              </div>
              <input
                type="checkbox"
                checked={formConfig.database.backupEnabled}
                onChange={(e) => handleInputChange('database', 'backupEnabled', e.target.checked)}
                className="rounded border-gray-300"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Monitoring Configuration */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Clock className="h-5 w-5" />
            <span>Monitoring & Alerts</span>
          </CardTitle>
        </CardHeader>
        
        <CardContent className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <label className="text-sm font-medium">Health Check Interval (seconds)</label>
              <Input
                type="number"
                value={formConfig.monitoring.healthCheckInterval}
                onChange={(e) => handleInputChange('monitoring', 'healthCheckInterval', parseInt(e.target.value))}
                min="30"
                max="3600"
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Metrics Retention (hours)</label>
              <Input
                type="number"
                value={formConfig.monitoring.metricsRetentionHours}
                onChange={(e) => handleInputChange('monitoring', 'metricsRetentionHours', parseInt(e.target.value))}
                min="24"
                max="8760"
              />
            </div>
          </div>

          <div>
            <h4 className="text-sm font-medium mb-4">Alert Thresholds (%)</h4>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="space-y-2">
                <label className="text-sm font-medium">CPU Usage</label>
                <Input
                  type="number"
                  value={formConfig.monitoring.alertThresholds.cpuUsage}
                  onChange={(e) => handleNestedChange('monitoring', 'alertThresholds', 'cpuUsage', parseInt(e.target.value))}
                  min="50"
                  max="95"
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Memory Usage</label>
                <Input
                  type="number"
                  value={formConfig.monitoring.alertThresholds.memoryUsage}
                  onChange={(e) => handleNestedChange('monitoring', 'alertThresholds', 'memoryUsage', parseInt(e.target.value))}
                  min="50"
                  max="95"
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Disk Usage</label>
                <Input
                  type="number"
                  value={formConfig.monitoring.alertThresholds.diskUsage}
                  onChange={(e) => handleNestedChange('monitoring', 'alertThresholds', 'diskUsage', parseInt(e.target.value))}
                  min="70"
                  max="95"
                />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Security Configuration */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Shield className="h-5 w-5" />
            <span>Security & Detection</span>
          </CardTitle>
        </CardHeader>
        
        <CardContent>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <label className="text-sm font-medium">Risk Assessment</label>
                <p className="text-xs text-muted-foreground">
                  Automatically assess device security risks
                </p>
              </div>
              <input
                type="checkbox"
                checked={formConfig.security.riskAssessment}
                onChange={(e) => handleInputChange('security', 'riskAssessment', e.target.checked)}
                className="rounded border-gray-300"
              />
            </div>

            <div className="flex items-center justify-between">
              <div>
                <label className="text-sm font-medium">Port Scan Detection</label>
                <p className="text-xs text-muted-foreground">
                  Monitor for potential port scanning activity
                </p>
              </div>
              <input
                type="checkbox"
                checked={formConfig.security.portScanDetection}
                onChange={(e) => handleInputChange('security', 'portScanDetection', e.target.checked)}
                className="rounded border-gray-300"
              />
            </div>

            <div className="flex items-center justify-between">
              <div>
                <label className="text-sm font-medium">Anomaly Detection</label>
                <p className="text-xs text-muted-foreground">
                  Detect unusual network behavior patterns
                </p>
              </div>
              <input
                type="checkbox"
                checked={formConfig.security.anomalyDetection}
                onChange={(e) => handleInputChange('security', 'anomalyDetection', e.target.checked)}
                className="rounded border-gray-300"
              />
            </div>

            <div className="flex items-center justify-between">
              <div>
                <label className="text-sm font-medium">Alert on New Devices</label>
                <p className="text-xs text-muted-foreground">
                  Send notifications when new devices are discovered
                </p>
              </div>
              <input
                type="checkbox"
                checked={formConfig.security.alertOnNewDevices}
                onChange={(e) => handleInputChange('security', 'alertOnNewDevices', e.target.checked)}
                className="rounded border-gray-300"
              />
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}