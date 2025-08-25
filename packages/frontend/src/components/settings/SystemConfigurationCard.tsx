import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle, Button, Input, Badge } from '@/components/ui'
import { useSystemConfiguration, useSystemConfigurationUpdate } from '@/hooks'
import { LoadingState } from '@/components/common'
import { cn } from '@/lib/utils'
import {
  Server,
  Database,
  Shield,
  Activity,
  HardDrive,
  Memory,
  Network,
  Clock,
  Save,
  RotateCcw,
  RefreshCw,
  AlertTriangle,
  CheckCircle,
  Info,
  Settings,
  FileText,
  Globe,
  Zap,
  Bell,
  Lock,
  Key,
  Eye,
  EyeOff,
  Trash2,
  Download,
  Upload
} from 'lucide-react'

interface SystemConfig {
  // Database Configuration
  database: {
    host: string
    port: number
    name: string
    username: string
    password: string
    maxConnections: number
    connectionTimeout: number
    queryTimeout: number
    enableSsl: boolean
    backupRetention: number // days
    enableAutoBackup: boolean
    backupSchedule: string // cron expression
  }

  // Performance Settings
  performance: {
    maxConcurrentTasks: number
    taskTimeout: number // seconds
    memoryLimit: number // MB
    cpuThreshold: number // percentage
    diskSpaceThreshold: number // GB
    enableCaching: boolean
    cacheSize: number // MB
    cacheTtl: number // seconds
  }

  // Security Settings
  security: {
    enableAuthentication: boolean
    sessionTimeout: number // minutes
    maxLoginAttempts: number
    lockoutDuration: number // minutes
    enableTwoFactor: boolean
    allowedIpRanges: string[]
    enableAuditLogging: boolean
    auditRetention: number // days
    encryptionAlgorithm: 'AES256' | 'ChaCha20'
    enableRateLimiting: boolean
    rateLimit: number // requests per minute
  }

  // Logging Configuration
  logging: {
    level: 'debug' | 'info' | 'warn' | 'error'
    enableFileLogging: boolean
    logDirectory: string
    maxLogSize: number // MB
    logRetention: number // days
    enableRemoteLogging: boolean
    remoteLogEndpoint: string
    enableStructuredLogging: boolean
  }

  // Network Settings
  network: {
    listenAddress: string
    port: number
    enableHttps: boolean
    sslCertPath: string
    sslKeyPath: string
    enableCors: boolean
    corsOrigins: string[]
    maxRequestSize: number // MB
    requestTimeout: number // seconds
    enableCompression: boolean
  }

  // Monitoring & Alerting
  monitoring: {
    enableHealthChecks: boolean
    healthCheckInterval: number // seconds
    enableMetrics: boolean
    metricsRetention: number // hours
    enableAlerts: boolean
    alertWebhook: string
    alertChannels: ('email' | 'webhook' | 'slack')[]
    criticalThresholds: {
      cpuUsage: number // percentage
      memoryUsage: number // percentage
      diskUsage: number // percentage
      errorRate: number // percentage
    }
  }

  // Backup & Recovery
  backup: {
    enableAutoBackup: boolean
    backupSchedule: string
    backupLocation: string
    compressionEnabled: boolean
    encryptionEnabled: boolean
    retentionPolicy: number // days
    maxBackupSize: number // GB
  }
}

interface SystemConfigurationCardProps {
  onConfigChange?: (config: Partial<SystemConfig>) => void
  className?: string
}

export function SystemConfigurationCard({ onConfigChange, className }: SystemConfigurationCardProps) {
  const { data: currentConfig, isLoading, error } = useSystemConfiguration()
  const { updateConfiguration, isUpdating } = useSystemConfigurationUpdate()
  
  const [config, setConfig] = useState<SystemConfig>({
    database: {
      host: 'localhost',
      port: 5432,
      name: 'nmapper',
      username: 'nmapper_user',
      password: '',
      maxConnections: 100,
      connectionTimeout: 30,
      queryTimeout: 60,
      enableSsl: false,
      backupRetention: 30,
      enableAutoBackup: true,
      backupSchedule: '0 2 * * *'
    },
    performance: {
      maxConcurrentTasks: 10,
      taskTimeout: 300,
      memoryLimit: 2048,
      cpuThreshold: 80,
      diskSpaceThreshold: 10,
      enableCaching: true,
      cacheSize: 512,
      cacheTtl: 3600
    },
    security: {
      enableAuthentication: true,
      sessionTimeout: 60,
      maxLoginAttempts: 5,
      lockoutDuration: 15,
      enableTwoFactor: false,
      allowedIpRanges: ['0.0.0.0/0'],
      enableAuditLogging: true,
      auditRetention: 90,
      encryptionAlgorithm: 'AES256',
      enableRateLimiting: true,
      rateLimit: 100
    },
    logging: {
      level: 'info',
      enableFileLogging: true,
      logDirectory: '/var/log/nmapper',
      maxLogSize: 100,
      logRetention: 30,
      enableRemoteLogging: false,
      remoteLogEndpoint: '',
      enableStructuredLogging: true
    },
    network: {
      listenAddress: '0.0.0.0',
      port: 3000,
      enableHttps: false,
      sslCertPath: '',
      sslKeyPath: '',
      enableCors: true,
      corsOrigins: ['*'],
      maxRequestSize: 10,
      requestTimeout: 30,
      enableCompression: true
    },
    monitoring: {
      enableHealthChecks: true,
      healthCheckInterval: 30,
      enableMetrics: true,
      metricsRetention: 24,
      enableAlerts: true,
      alertWebhook: '',
      alertChannels: ['email'],
      criticalThresholds: {
        cpuUsage: 90,
        memoryUsage: 85,
        diskUsage: 90,
        errorRate: 5
      }
    },
    backup: {
      enableAutoBackup: true,
      backupSchedule: '0 1 * * *',
      backupLocation: '/var/backups/nmapper',
      compressionEnabled: true,
      encryptionEnabled: false,
      retentionPolicy: 7,
      maxBackupSize: 5
    }
  })

  const [hasChanges, setHasChanges] = useState(false)
  const [validationErrors, setValidationErrors] = useState<{ [key: string]: string }>({})
  const [activeSection, setActiveSection] = useState<'database' | 'performance' | 'security' | 'logging' | 'network' | 'monitoring' | 'backup'>('database')
  const [showSensitive, setShowSensitive] = useState(false)

  useEffect(() => {
    if (currentConfig) {
      setConfig(prev => ({ ...prev, ...currentConfig }))
    }
  }, [currentConfig])

  const validateConfig = (newConfig: SystemConfig): { [key: string]: string } => {
    const errors: { [key: string]: string } = {}

    // Database validation
    if (!newConfig.database.host) errors['database.host'] = 'Host is required'
    if (newConfig.database.port < 1 || newConfig.database.port > 65535) {
      errors['database.port'] = 'Port must be between 1 and 65535'
    }
    if (!newConfig.database.name) errors['database.name'] = 'Database name is required'
    if (!newConfig.database.username) errors['database.username'] = 'Username is required'

    // Performance validation
    if (newConfig.performance.maxConcurrentTasks < 1) {
      errors['performance.maxConcurrentTasks'] = 'Must be at least 1'
    }
    if (newConfig.performance.memoryLimit < 512) {
      errors['performance.memoryLimit'] = 'Memory limit must be at least 512 MB'
    }

    // Security validation
    newConfig.security.allowedIpRanges.forEach((range, index) => {
      if (!range.match(/^\d+\.\d+\.\d+\.\d+\/\d+$/) && range !== '0.0.0.0/0') {
        errors[`security.allowedIpRanges.${index}`] = 'Invalid IP range format'
      }
    })

    // Network validation
    if (!newConfig.network.listenAddress) errors['network.listenAddress'] = 'Listen address is required'
    if (newConfig.network.port < 1 || newConfig.network.port > 65535) {
      errors['network.port'] = 'Port must be between 1 and 65535'
    }

    return errors
  }

  const handleConfigChange = (section: string, key: string, value: any) => {
    const newConfig = {
      ...config,
      [section]: {
        ...config[section as keyof SystemConfig],
        [key]: value
      }
    }
    setConfig(newConfig)
    setHasChanges(true)
    
    const errors = validateConfig(newConfig)
    setValidationErrors(errors)
    
    onConfigChange?.(newConfig)
  }

  const handleArrayChange = (section: string, key: string, index: number, value: string) => {
    const currentArray = (config[section as keyof SystemConfig] as any)[key] || []
    const newArray = [...currentArray]
    newArray[index] = value
    handleConfigChange(section, key, newArray)
  }

  const addArrayItem = (section: string, key: string) => {
    const currentArray = (config[section as keyof SystemConfig] as any)[key] || []
    handleConfigChange(section, key, [...currentArray, ''])
  }

  const removeArrayItem = (section: string, key: string, index: number) => {
    const currentArray = (config[section as keyof SystemConfig] as any)[key] || []
    const newArray = currentArray.filter((_: any, i: number) => i !== index)
    handleConfigChange(section, key, newArray)
  }

  const handleSave = async () => {
    const errors = validateConfig(config)
    setValidationErrors(errors)
    
    if (Object.keys(errors).length > 0) return
    
    try {
      await updateConfiguration(config)
      setHasChanges(false)
    } catch (error) {
      console.error('Failed to save configuration:', error)
    }
  }

  const handleReset = () => {
    if (currentConfig) {
      setConfig(prev => ({ ...prev, ...currentConfig }))
      setHasChanges(false)
      setValidationErrors({})
    }
  }

  const exportConfig = () => {
    const sanitizedConfig = { ...config }
    // Remove sensitive data for export
    sanitizedConfig.database.password = '***'
    
    const dataStr = JSON.stringify(sanitizedConfig, null, 2)
    const dataUri = 'data:application/json;charset=utf-8,'+ encodeURIComponent(dataStr)
    
    const exportFileDefaultName = `nmapper-config-${new Date().toISOString().split('T')[0]}.json`
    
    const linkElement = document.createElement('a')
    linkElement.setAttribute('href', dataUri)
    linkElement.setAttribute('download', exportFileDefaultName)
    linkElement.click()
  }

  const sections = [
    { id: 'database', label: 'Database', icon: Database },
    { id: 'performance', label: 'Performance', icon: Zap },
    { id: 'security', label: 'Security', icon: Shield },
    { id: 'logging', label: 'Logging', icon: FileText },
    { id: 'network', label: 'Network', icon: Globe },
    { id: 'monitoring', label: 'Monitoring', icon: Activity },
    { id: 'backup', label: 'Backup', icon: HardDrive }
  ]

  if (isLoading) {
    return (
      <Card className={cn('h-full', className)}>
        <LoadingState
          type="card"
          icon="settings"
          title="Loading System Configuration"
          description="Retrieving system settings..."
        />
      </Card>
    )
  }

  return (
    <Card className={cn('h-full', className)}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg flex items-center space-x-2">
            <Server className="h-5 w-5" />
            <span>System Configuration</span>
          </CardTitle>
          
          <div className="flex items-center space-x-2">
            {hasChanges && (
              <Badge variant="secondary" className="text-xs">
                <AlertTriangle className="h-3 w-3 mr-1" />
                Unsaved Changes
              </Badge>
            )}
            
            <Button variant="outline" size="sm" onClick={exportConfig}>
              <Download className="h-4 w-4" />
            </Button>
            
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowSensitive(!showSensitive)}
            >
              {showSensitive ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </Button>
          </div>
        </div>

        {/* Section Tabs */}
        <div className="flex flex-wrap gap-1 mt-4">
          {sections.map((section) => {
            const Icon = section.icon
            return (
              <Button
                key={section.id}
                variant={activeSection === section.id ? 'default' : 'ghost'}
                size="sm"
                onClick={() => setActiveSection(section.id as any)}
                className="text-xs"
              >
                <Icon className="h-3 w-3 mr-1" />
                {section.label}
              </Button>
            )
          })}
        </div>
      </CardHeader>

      <CardContent className="space-y-6 max-h-96 overflow-y-auto">
        {/* Database Settings */}
        {activeSection === 'database' && (
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Host</label>
                <Input
                  value={config.database.host}
                  onChange={(e) => handleConfigChange('database', 'host', e.target.value)}
                  className={cn(validationErrors['database.host'] && 'border-red-500')}
                />
                {validationErrors['database.host'] && (
                  <p className="text-xs text-red-500">{validationErrors['database.host']}</p>
                )}
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Port</label>
                <Input
                  type="number"
                  value={config.database.port}
                  onChange={(e) => handleConfigChange('database', 'port', parseInt(e.target.value))}
                  className={cn(validationErrors['database.port'] && 'border-red-500')}
                />
                {validationErrors['database.port'] && (
                  <p className="text-xs text-red-500">{validationErrors['database.port']}</p>
                )}
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Database Name</label>
                <Input
                  value={config.database.name}
                  onChange={(e) => handleConfigChange('database', 'name', e.target.value)}
                  className={cn(validationErrors['database.name'] && 'border-red-500')}
                />
                {validationErrors['database.name'] && (
                  <p className="text-xs text-red-500">{validationErrors['database.name']}</p>
                )}
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Username</label>
                <Input
                  value={config.database.username}
                  onChange={(e) => handleConfigChange('database', 'username', e.target.value)}
                  className={cn(validationErrors['database.username'] && 'border-red-500')}
                />
                {validationErrors['database.username'] && (
                  <p className="text-xs text-red-500">{validationErrors['database.username']}</p>
                )}
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Password</label>
                <div className="relative">
                  <Input
                    type={showSensitive ? 'text' : 'password'}
                    value={config.database.password}
                    onChange={(e) => handleConfigChange('database', 'password', e.target.value)}
                    placeholder="Enter database password"
                  />
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setShowSensitive(!showSensitive)}
                    className="absolute right-1 top-1/2 transform -translate-y-1/2 h-6 w-6 p-0"
                  >
                    {showSensitive ? <EyeOff className="h-3 w-3" /> : <Eye className="h-3 w-3" />}
                  </Button>
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Max Connections</label>
                <Input
                  type="number"
                  value={config.database.maxConnections}
                  onChange={(e) => handleConfigChange('database', 'maxConnections', parseInt(e.target.value))}
                />
              </div>
            </div>

            <div className="space-y-3">
              <div className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  id="database.enableSsl"
                  checked={config.database.enableSsl}
                  onChange={(e) => handleConfigChange('database', 'enableSsl', e.target.checked)}
                />
                <label htmlFor="database.enableSsl" className="text-sm">Enable SSL</label>
              </div>

              <div className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  id="database.enableAutoBackup"
                  checked={config.database.enableAutoBackup}
                  onChange={(e) => handleConfigChange('database', 'enableAutoBackup', e.target.checked)}
                />
                <label htmlFor="database.enableAutoBackup" className="text-sm">Enable Auto Backup</label>
              </div>
            </div>
          </div>
        )}

        {/* Performance Settings */}
        {activeSection === 'performance' && (
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Max Concurrent Tasks</label>
                <Input
                  type="number"
                  value={config.performance.maxConcurrentTasks}
                  onChange={(e) => handleConfigChange('performance', 'maxConcurrentTasks', parseInt(e.target.value))}
                  min="1"
                  className={cn(validationErrors['performance.maxConcurrentTasks'] && 'border-red-500')}
                />
                {validationErrors['performance.maxConcurrentTasks'] && (
                  <p className="text-xs text-red-500">{validationErrors['performance.maxConcurrentTasks']}</p>
                )}
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Memory Limit (MB)</label>
                <Input
                  type="number"
                  value={config.performance.memoryLimit}
                  onChange={(e) => handleConfigChange('performance', 'memoryLimit', parseInt(e.target.value))}
                  min="512"
                  className={cn(validationErrors['performance.memoryLimit'] && 'border-red-500')}
                />
                {validationErrors['performance.memoryLimit'] && (
                  <p className="text-xs text-red-500">{validationErrors['performance.memoryLimit']}</p>
                )}
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">CPU Threshold (%)</label>
                <Input
                  type="number"
                  value={config.performance.cpuThreshold}
                  onChange={(e) => handleConfigChange('performance', 'cpuThreshold', parseInt(e.target.value))}
                  min="0"
                  max="100"
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Cache Size (MB)</label>
                <Input
                  type="number"
                  value={config.performance.cacheSize}
                  onChange={(e) => handleConfigChange('performance', 'cacheSize', parseInt(e.target.value))}
                  disabled={!config.performance.enableCaching}
                />
              </div>
            </div>

            <div className="flex items-center space-x-2">
              <input
                type="checkbox"
                id="performance.enableCaching"
                checked={config.performance.enableCaching}
                onChange={(e) => handleConfigChange('performance', 'enableCaching', e.target.checked)}
              />
              <label htmlFor="performance.enableCaching" className="text-sm">Enable Caching</label>
            </div>
          </div>
        )}

        {/* Continue with other sections... */}
        {/* For brevity, showing structure for remaining sections */}
        {activeSection === 'security' && (
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">Security configuration options...</p>
            {/* Security settings implementation */}
          </div>
        )}

        {activeSection === 'logging' && (
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">Logging configuration options...</p>
            {/* Logging settings implementation */}
          </div>
        )}

        {activeSection === 'network' && (
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">Network configuration options...</p>
            {/* Network settings implementation */}
          </div>
        )}

        {activeSection === 'monitoring' && (
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">Monitoring configuration options...</p>
            {/* Monitoring settings implementation */}
          </div>
        )}

        {activeSection === 'backup' && (
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">Backup configuration options...</p>
            {/* Backup settings implementation */}
          </div>
        )}
      </CardContent>

      {/* Actions */}
      <div className="px-6 py-4 border-t bg-muted/20">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2 text-sm text-muted-foreground">
            {Object.keys(validationErrors).length > 0 ? (
              <>
                <AlertTriangle className="h-4 w-4 text-red-500" />
                <span className="text-red-500">Please fix validation errors</span>
              </>
            ) : hasChanges ? (
              <>
                <Info className="h-4 w-4" />
                <span>Configuration has unsaved changes</span>
              </>
            ) : (
              <>
                <CheckCircle className="h-4 w-4 text-green-500" />
                <span className="text-green-500">Configuration saved</span>
              </>
            )}
          </div>
          
          <div className="flex items-center space-x-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleReset}
              disabled={!hasChanges}
            >
              <RotateCcw className="h-4 w-4 mr-1" />
              Reset
            </Button>
            
            <Button
              size="sm"
              onClick={handleSave}
              disabled={!hasChanges || Object.keys(validationErrors).length > 0 || isUpdating}
            >
              {isUpdating ? (
                <RefreshCw className="h-4 w-4 mr-1 animate-spin" />
              ) : (
                <Save className="h-4 w-4 mr-1" />
              )}
              Save Changes
            </Button>
          </div>
        </div>
      </div>
    </Card>
  )
}