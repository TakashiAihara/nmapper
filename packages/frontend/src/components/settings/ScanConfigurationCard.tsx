import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle, Button, Input, Badge } from '@/components/ui'
import { useConfiguration, useConfigurationUpdate } from '@/hooks'
import { LoadingState } from '@/components/common'
import { cn } from '@/lib/utils'
import {
  Network,
  Globe,
  Clock,
  Zap,
  Shield,
  Activity,
  RefreshCw,
  Save,
  RotateCcw,
  AlertTriangle,
  CheckCircle,
  Info,
  Settings,
  Target,
  Timer,
  Layers,
  Filter,
  Eye,
  EyeOff
} from 'lucide-react'

interface ScanConfig {
  networkRange: string
  scanInterval: number // minutes
  scanTimeout: number // seconds
  maxConcurrentScans: number
  portRanges: string[]
  scanTypes: {
    quickScan: boolean
    fullScan: boolean
    serviceDetection: boolean
    osDetection: boolean
    vulnerabilityScanning: boolean
  }
  excludeHosts: string[]
  customPorts: string
  scanTechniques: {
    tcpSyn: boolean
    tcpConnect: boolean
    udpScan: boolean
    icmpPing: boolean
    tcpPing: boolean
  }
  timing: 'paranoid' | 'sneaky' | 'polite' | 'normal' | 'aggressive' | 'insane'
  retryAttempts: number
  hostDiscovery: boolean
  scriptScanning: boolean
  outputFormat: 'xml' | 'json' | 'csv'
}

interface ScanConfigurationCardProps {
  onConfigChange?: (config: Partial<ScanConfig>) => void
  className?: string
}

export function ScanConfigurationCard({ onConfigChange, className }: ScanConfigurationCardProps) {
  const { data: currentConfig, isLoading, error } = useConfiguration()
  const { updateConfiguration, isUpdating } = useConfigurationUpdate()
  
  const [config, setConfig] = useState<ScanConfig>({
    networkRange: '192.168.1.0/24',
    scanInterval: 30,
    scanTimeout: 300,
    maxConcurrentScans: 5,
    portRanges: ['1-1000', '1433', '3389', '5432', '8080', '8443'],
    scanTypes: {
      quickScan: true,
      fullScan: false,
      serviceDetection: true,
      osDetection: false,
      vulnerabilityScanning: false
    },
    excludeHosts: [],
    customPorts: '',
    scanTechniques: {
      tcpSyn: true,
      tcpConnect: false,
      udpScan: false,
      icmpPing: true,
      tcpPing: true
    },
    timing: 'normal',
    retryAttempts: 2,
    hostDiscovery: true,
    scriptScanning: false,
    outputFormat: 'json'
  })

  const [hasChanges, setHasChanges] = useState(false)
  const [validationErrors, setValidationErrors] = useState<{ [key: string]: string }>({})
  const [showAdvanced, setShowAdvanced] = useState(false)

  useEffect(() => {
    if (currentConfig?.scan) {
      setConfig(prev => ({ ...prev, ...currentConfig.scan }))
    }
  }, [currentConfig])

  const validateConfig = (newConfig: ScanConfig): { [key: string]: string } => {
    const errors: { [key: string]: string } = {}

    // Network range validation
    if (!newConfig.networkRange.match(/^\d+\.\d+\.\d+\.\d+\/\d+$/)) {
      errors.networkRange = 'Invalid CIDR notation (e.g., 192.168.1.0/24)'
    }

    // Scan interval validation
    if (newConfig.scanInterval < 1 || newConfig.scanInterval > 1440) {
      errors.scanInterval = 'Scan interval must be between 1 and 1440 minutes'
    }

    // Scan timeout validation
    if (newConfig.scanTimeout < 30 || newConfig.scanTimeout > 3600) {
      errors.scanTimeout = 'Scan timeout must be between 30 and 3600 seconds'
    }

    // Max concurrent scans validation
    if (newConfig.maxConcurrentScans < 1 || newConfig.maxConcurrentScans > 20) {
      errors.maxConcurrentScans = 'Max concurrent scans must be between 1 and 20'
    }

    // Port ranges validation
    newConfig.portRanges.forEach((range, index) => {
      if (!range.match(/^\d+(-\d+)?$/) && !range.match(/^\d+(,\d+)*$/)) {
        errors[`portRange-${index}`] = 'Invalid port range format'
      }
    })

    // Custom ports validation
    if (newConfig.customPorts && !newConfig.customPorts.match(/^\d+(,\d+)*$/)) {
      errors.customPorts = 'Invalid port list format (comma-separated numbers)'
    }

    // Exclude hosts validation
    newConfig.excludeHosts.forEach((host, index) => {
      if (!host.match(/^\d+\.\d+\.\d+\.\d+$/) && !host.match(/^[\w\.-]+$/)) {
        errors[`excludeHost-${index}`] = 'Invalid host format'
      }
    })

    return errors
  }

  const handleConfigChange = (key: string, value: any) => {
    const newConfig = { ...config, [key]: value }
    setConfig(newConfig)
    setHasChanges(true)
    
    const errors = validateConfig(newConfig)
    setValidationErrors(errors)
    
    onConfigChange?.(newConfig)
  }

  const handleNestedConfigChange = (section: string, key: string, value: any) => {
    const newConfig = {
      ...config,
      [section]: {
        ...config[section as keyof ScanConfig],
        [key]: value
      }
    }
    setConfig(newConfig)
    setHasChanges(true)
    
    const errors = validateConfig(newConfig)
    setValidationErrors(errors)
    
    onConfigChange?.(newConfig)
  }

  const handlePortRangeChange = (index: number, value: string) => {
    const newPortRanges = [...config.portRanges]
    newPortRanges[index] = value
    handleConfigChange('portRanges', newPortRanges)
  }

  const addPortRange = () => {
    handleConfigChange('portRanges', [...config.portRanges, ''])
  }

  const removePortRange = (index: number) => {
    const newPortRanges = config.portRanges.filter((_, i) => i !== index)
    handleConfigChange('portRanges', newPortRanges)
  }

  const handleExcludeHostChange = (index: number, value: string) => {
    const newExcludeHosts = [...config.excludeHosts]
    newExcludeHosts[index] = value
    handleConfigChange('excludeHosts', newExcludeHosts)
  }

  const addExcludeHost = () => {
    handleConfigChange('excludeHosts', [...config.excludeHosts, ''])
  }

  const removeExcludeHost = (index: number) => {
    const newExcludeHosts = config.excludeHosts.filter((_, i) => i !== index)
    handleConfigChange('excludeHosts', newExcludeHosts)
  }

  const handleSave = async () => {
    const errors = validateConfig(config)
    setValidationErrors(errors)
    
    if (Object.keys(errors).length > 0) return
    
    try {
      await updateConfiguration({ scan: config })
      setHasChanges(false)
    } catch (error) {
      console.error('Failed to save configuration:', error)
    }
  }

  const handleReset = () => {
    if (currentConfig?.scan) {
      setConfig(prev => ({ ...prev, ...currentConfig.scan }))
      setHasChanges(false)
      setValidationErrors({})
    }
  }

  const timingOptions = [
    { value: 'paranoid', label: 'Paranoid (T0)', description: 'Very slow, stealthy' },
    { value: 'sneaky', label: 'Sneaky (T1)', description: 'Slow, less detectable' },
    { value: 'polite', label: 'Polite (T2)', description: 'Slower, bandwidth friendly' },
    { value: 'normal', label: 'Normal (T3)', description: 'Default timing' },
    { value: 'aggressive', label: 'Aggressive (T4)', description: 'Fast, assumes fast network' },
    { value: 'insane', label: 'Insane (T5)', description: 'Very fast, may miss results' }
  ]

  if (isLoading) {
    return (
      <Card className={cn('h-full', className)}>
        <LoadingState
          type="card"
          icon="settings"
          title="Loading Scan Configuration"
          description="Retrieving network scanning settings..."
        />
      </Card>
    )
  }

  return (
    <Card className={cn('h-full', className)}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg flex items-center space-x-2">
            <Network className="h-5 w-5" />
            <span>Network Scan Configuration</span>
          </CardTitle>
          
          <div className="flex items-center space-x-2">
            {hasChanges && (
              <Badge variant="secondary" className="text-xs">
                <AlertTriangle className="h-3 w-3 mr-1" />
                Unsaved Changes
              </Badge>
            )}
            
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowAdvanced(!showAdvanced)}
            >
              {showAdvanced ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </Button>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-6 max-h-96 overflow-y-auto">
        {/* Basic Configuration */}
        <div className="space-y-4">
          <h4 className="text-sm font-semibold text-muted-foreground flex items-center space-x-2">
            <Globe className="h-4 w-4" />
            <span>Basic Settings</span>
          </h4>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Network Range</label>
              <Input
                value={config.networkRange}
                onChange={(e) => handleConfigChange('networkRange', e.target.value)}
                placeholder="192.168.1.0/24"
                className={cn(validationErrors.networkRange && 'border-red-500')}
              />
              {validationErrors.networkRange && (
                <p className="text-xs text-red-500">{validationErrors.networkRange}</p>
              )}
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Scan Interval (minutes)</label>
              <Input
                type="number"
                value={config.scanInterval}
                onChange={(e) => handleConfigChange('scanInterval', parseInt(e.target.value))}
                min="1"
                max="1440"
                className={cn(validationErrors.scanInterval && 'border-red-500')}
              />
              {validationErrors.scanInterval && (
                <p className="text-xs text-red-500">{validationErrors.scanInterval}</p>
              )}
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Scan Timeout (seconds)</label>
              <Input
                type="number"
                value={config.scanTimeout}
                onChange={(e) => handleConfigChange('scanTimeout', parseInt(e.target.value))}
                min="30"
                max="3600"
                className={cn(validationErrors.scanTimeout && 'border-red-500')}
              />
              {validationErrors.scanTimeout && (
                <p className="text-xs text-red-500">{validationErrors.scanTimeout}</p>
              )}
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Max Concurrent Scans</label>
              <Input
                type="number"
                value={config.maxConcurrentScans}
                onChange={(e) => handleConfigChange('maxConcurrentScans', parseInt(e.target.value))}
                min="1"
                max="20"
                className={cn(validationErrors.maxConcurrentScans && 'border-red-500')}
              />
              {validationErrors.maxConcurrentScans && (
                <p className="text-xs text-red-500">{validationErrors.maxConcurrentScans}</p>
              )}
            </div>
          </div>
        </div>

        {/* Scan Types */}
        <div className="space-y-4">
          <h4 className="text-sm font-semibold text-muted-foreground flex items-center space-x-2">
            <Target className="h-4 w-4" />
            <span>Scan Types</span>
          </h4>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {Object.entries(config.scanTypes).map(([key, enabled]) => (
              <div key={key} className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  id={`scanType-${key}`}
                  checked={enabled}
                  onChange={(e) => handleNestedConfigChange('scanTypes', key, e.target.checked)}
                />
                <label htmlFor={`scanType-${key}`} className="text-sm capitalize">
                  {key.replace(/([A-Z])/g, ' $1').trim()}
                </label>
              </div>
            ))}
          </div>
        </div>

        {/* Port Configuration */}
        <div className="space-y-4">
          <h4 className="text-sm font-semibold text-muted-foreground flex items-center space-x-2">
            <Activity className="h-4 w-4" />
            <span>Port Configuration</span>
          </h4>

          <div className="space-y-3">
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-sm font-medium">Port Ranges</label>
                <Button variant="outline" size="sm" onClick={addPortRange}>
                  Add Range
                </Button>
              </div>
              <div className="space-y-2">
                {config.portRanges.map((range, index) => (
                  <div key={index} className="flex items-center space-x-2">
                    <Input
                      value={range}
                      onChange={(e) => handlePortRangeChange(index, e.target.value)}
                      placeholder="1-1000 or 80,443"
                      className={cn(validationErrors[`portRange-${index}`] && 'border-red-500')}
                    />
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => removePortRange(index)}
                      className="text-red-500 hover:text-red-700"
                    >
                      ×
                    </Button>
                  </div>
                ))}
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Additional Custom Ports</label>
              <Input
                value={config.customPorts}
                onChange={(e) => handleConfigChange('customPorts', e.target.value)}
                placeholder="8080,9090,3000"
                className={cn(validationErrors.customPorts && 'border-red-500')}
              />
              {validationErrors.customPorts && (
                <p className="text-xs text-red-500">{validationErrors.customPorts}</p>
              )}
              <p className="text-xs text-muted-foreground">
                Comma-separated list of additional ports to scan
              </p>
            </div>
          </div>
        </div>

        {/* Advanced Settings */}
        {showAdvanced && (
          <>
            {/* Scan Techniques */}
            <div className="space-y-4">
              <h4 className="text-sm font-semibold text-muted-foreground flex items-center space-x-2">
                <Shield className="h-4 w-4" />
                <span>Scan Techniques</span>
              </h4>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {Object.entries(config.scanTechniques).map(([key, enabled]) => (
                  <div key={key} className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      id={`technique-${key}`}
                      checked={enabled}
                      onChange={(e) => handleNestedConfigChange('scanTechniques', key, e.target.checked)}
                    />
                    <label htmlFor={`technique-${key}`} className="text-sm">
                      {key.replace(/([A-Z])/g, ' $1').trim().toUpperCase()}
                    </label>
                  </div>
                ))}
              </div>
            </div>

            {/* Timing and Performance */}
            <div className="space-y-4">
              <h4 className="text-sm font-semibold text-muted-foreground flex items-center space-x-2">
                <Timer className="h-4 w-4" />
                <span>Timing & Performance</span>
              </h4>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Timing Template</label>
                  <select
                    value={config.timing}
                    onChange={(e) => handleConfigChange('timing', e.target.value)}
                    className="w-full px-3 py-2 text-sm border rounded-md bg-background"
                  >
                    {timingOptions.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                  <p className="text-xs text-muted-foreground">
                    {timingOptions.find(o => o.value === config.timing)?.description}
                  </p>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium">Retry Attempts</label>
                  <Input
                    type="number"
                    value={config.retryAttempts}
                    onChange={(e) => handleConfigChange('retryAttempts', parseInt(e.target.value))}
                    min="0"
                    max="10"
                  />
                </div>
              </div>

              <div className="space-y-3">
                <div className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    id="hostDiscovery"
                    checked={config.hostDiscovery}
                    onChange={(e) => handleConfigChange('hostDiscovery', e.target.checked)}
                  />
                  <label htmlFor="hostDiscovery" className="text-sm">Enable Host Discovery</label>
                </div>

                <div className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    id="scriptScanning"
                    checked={config.scriptScanning}
                    onChange={(e) => handleConfigChange('scriptScanning', e.target.checked)}
                  />
                  <label htmlFor="scriptScanning" className="text-sm">Enable Script Scanning</label>
                </div>
              </div>
            </div>

            {/* Exclusions */}
            <div className="space-y-4">
              <h4 className="text-sm font-semibold text-muted-foreground flex items-center space-x-2">
                <Filter className="h-4 w-4" />
                <span>Exclusions</span>
              </h4>

              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-sm font-medium">Exclude Hosts</label>
                  <Button variant="outline" size="sm" onClick={addExcludeHost}>
                    Add Host
                  </Button>
                </div>
                <div className="space-y-2">
                  {config.excludeHosts.map((host, index) => (
                    <div key={index} className="flex items-center space-x-2">
                      <Input
                        value={host}
                        onChange={(e) => handleExcludeHostChange(index, e.target.value)}
                        placeholder="192.168.1.1 or hostname"
                        className={cn(validationErrors[`excludeHost-${index}`] && 'border-red-500')}
                      />
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => removeExcludeHost(index)}
                        className="text-red-500 hover:text-red-700"
                      >
                        ×
                      </Button>
                    </div>
                  ))}
                  {config.excludeHosts.length === 0 && (
                    <p className="text-xs text-muted-foreground">No hosts excluded</p>
                  )}
                </div>
              </div>
            </div>

            {/* Output Format */}
            <div className="space-y-4">
              <h4 className="text-sm font-semibold text-muted-foreground flex items-center space-x-2">
                <Layers className="h-4 w-4" />
                <span>Output Configuration</span>
              </h4>

              <div className="space-y-2">
                <label className="text-sm font-medium">Output Format</label>
                <select
                  value={config.outputFormat}
                  onChange={(e) => handleConfigChange('outputFormat', e.target.value)}
                  className="w-full px-3 py-2 text-sm border rounded-md bg-background"
                >
                  <option value="json">JSON</option>
                  <option value="xml">XML</option>
                  <option value="csv">CSV</option>
                </select>
              </div>
            </div>
          </>
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