import { useState } from 'react'
import { Button, Badge } from '@/components/ui'
import { cn } from '@/lib/utils'
import {
  Filter,
  X,
  Wifi,
  WifiOff,
  AlertTriangle,
  Shield,
  Monitor,
  Router,
  Smartphone,
  Printer,
  Camera,
  HardDrive
} from 'lucide-react'

interface DeviceFiltersProps {
  currentFilters: {
    isActive?: boolean
    riskLevel?: 'low' | 'medium' | 'high'
    deviceType?: string
    subnet?: string
    searchTerm?: string
  }
  onFilterChange: (filters: Partial<DeviceFiltersProps['currentFilters']>) => void
  onClearFilters: () => void
  deviceStats: {
    total: number
    online: number
    offline: number
    highRisk: number
    mediumRisk: number
    lowRisk: number
  }
  className?: string
}

const DEVICE_TYPES = [
  { value: 'computer', label: 'Computer', icon: Monitor },
  { value: 'router', label: 'Router', icon: Router },
  { value: 'mobile', label: 'Mobile', icon: Smartphone },
  { value: 'printer', label: 'Printer', icon: Printer },
  { value: 'camera', label: 'Camera', icon: Camera },
  { value: 'nas', label: 'NAS', icon: HardDrive },
  { value: 'unknown', label: 'Unknown', icon: Monitor },
]

const COMMON_SUBNETS = [
  '192.168.1.',
  '192.168.0.',
  '10.0.0.',
  '172.16.',
  '192.168.2.',
]

export function DeviceFilters({
  currentFilters,
  onFilterChange,
  onClearFilters,
  deviceStats,
  className
}: DeviceFiltersProps) {
  const [isExpanded, setIsExpanded] = useState(false)

  const activeFiltersCount = Object.keys(currentFilters).filter(
    key => currentFilters[key as keyof typeof currentFilters] !== undefined
  ).length

  const handleStatusFilter = (isActive?: boolean) => {
    onFilterChange({ 
      isActive: currentFilters.isActive === isActive ? undefined : isActive 
    })
  }

  const handleRiskFilter = (riskLevel?: 'low' | 'medium' | 'high') => {
    onFilterChange({ 
      riskLevel: currentFilters.riskLevel === riskLevel ? undefined : riskLevel 
    })
  }

  const handleDeviceTypeFilter = (deviceType?: string) => {
    onFilterChange({ 
      deviceType: currentFilters.deviceType === deviceType ? undefined : deviceType 
    })
  }

  const handleSubnetFilter = (subnet?: string) => {
    onFilterChange({ 
      subnet: currentFilters.subnet === subnet ? undefined : subnet 
    })
  }

  return (
    <div className={cn('space-y-4', className)}>
      {/* Quick Filters Row */}
      <div className="flex items-center flex-wrap gap-2">
        <div className="flex items-center space-x-2 mr-4">
          <Filter className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm font-medium">Quick Filters:</span>
          {activeFiltersCount > 0 && (
            <Badge variant="secondary" className="text-xs">
              {activeFiltersCount}
            </Badge>
          )}
        </div>

        {/* Status Filters */}
        <Button
          variant={currentFilters.isActive === true ? 'default' : 'outline'}
          size="sm"
          onClick={() => handleStatusFilter(true)}
          className="flex items-center space-x-1"
        >
          <Wifi className="h-3 w-3" />
          <span>Online ({deviceStats.online})</span>
        </Button>

        <Button
          variant={currentFilters.isActive === false ? 'default' : 'outline'}
          size="sm"
          onClick={() => handleStatusFilter(false)}
          className="flex items-center space-x-1"
        >
          <WifiOff className="h-3 w-3" />
          <span>Offline ({deviceStats.offline})</span>
        </Button>

        {/* Risk Level Filters */}
        <Button
          variant={currentFilters.riskLevel === 'high' ? 'destructive' : 'outline'}
          size="sm"
          onClick={() => handleRiskFilter('high')}
          className="flex items-center space-x-1"
        >
          <AlertTriangle className="h-3 w-3" />
          <span>High Risk ({deviceStats.highRisk})</span>
        </Button>

        <Button
          variant={currentFilters.riskLevel === 'medium' ? 'default' : 'outline'}
          size="sm"
          onClick={() => handleRiskFilter('medium')}
          className="flex items-center space-x-1"
        >
          <AlertTriangle className="h-3 w-3" />
          <span>Medium Risk ({deviceStats.mediumRisk})</span>
        </Button>

        <Button
          variant={currentFilters.riskLevel === 'low' ? 'default' : 'outline'}
          size="sm"
          onClick={() => handleRiskFilter('low')}
          className="flex items-center space-x-1"
        >
          <Shield className="h-3 w-3" />
          <span>Low Risk ({deviceStats.lowRisk})</span>
        </Button>

        {/* Clear Filters */}
        {activeFiltersCount > 0 && (
          <Button
            variant="ghost"
            size="sm"
            onClick={onClearFilters}
            className="flex items-center space-x-1 text-muted-foreground hover:text-foreground"
          >
            <X className="h-3 w-3" />
            <span>Clear All</span>
          </Button>
        )}

        {/* Expand/Collapse Advanced Filters */}
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setIsExpanded(!isExpanded)}
          className="ml-auto"
        >
          {isExpanded ? 'Less Filters' : 'More Filters'}
        </Button>
      </div>

      {/* Advanced Filters (Expandable) */}
      {isExpanded && (
        <div className="space-y-4 pt-4 border-t">
          {/* Device Type Filters */}
          <div>
            <h4 className="text-sm font-medium mb-2 flex items-center space-x-2">
              <Monitor className="h-4 w-4" />
              <span>Device Type</span>
            </h4>
            <div className="flex flex-wrap gap-2">
              {DEVICE_TYPES.map((type) => {
                const Icon = type.icon
                return (
                  <Button
                    key={type.value}
                    variant={currentFilters.deviceType === type.value ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => handleDeviceTypeFilter(type.value)}
                    className="flex items-center space-x-1"
                  >
                    <Icon className="h-3 w-3" />
                    <span>{type.label}</span>
                  </Button>
                )
              })}
            </div>
          </div>

          {/* Subnet Filters */}
          <div>
            <h4 className="text-sm font-medium mb-2 flex items-center space-x-2">
              <Router className="h-4 w-4" />
              <span>Network Subnet</span>
            </h4>
            <div className="flex flex-wrap gap-2">
              {COMMON_SUBNETS.map((subnet) => (
                <Button
                  key={subnet}
                  variant={currentFilters.subnet === subnet ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => handleSubnetFilter(subnet)}
                  className="font-mono text-xs"
                >
                  {subnet}x
                </Button>
              ))}
            </div>
          </div>

          {/* Custom Subnet Input */}
          <div>
            <h4 className="text-sm font-medium mb-2">Custom Subnet Filter</h4>
            <div className="flex items-center space-x-2">
              <input
                type="text"
                placeholder="e.g., 192.168.100."
                value={currentFilters.subnet && !COMMON_SUBNETS.includes(currentFilters.subnet) 
                  ? currentFilters.subnet 
                  : ''
                }
                onChange={(e) => onFilterChange({ subnet: e.target.value || undefined })}
                className="flex-1 px-3 py-1 border rounded text-sm font-mono focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
              />
              {currentFilters.subnet && !COMMON_SUBNETS.includes(currentFilters.subnet) && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => onFilterChange({ subnet: undefined })}
                >
                  <X className="h-3 w-3" />
                </Button>
              )}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Enter a partial IP address to filter by subnet (e.g., "192.168.1." or "10.0.")
            </p>
          </div>
        </div>
      )}

      {/* Active Filters Summary */}
      {activeFiltersCount > 0 && (
        <div className="flex flex-wrap items-center gap-2 pt-2 border-t">
          <span className="text-xs font-medium text-muted-foreground">Active filters:</span>
          
          {currentFilters.isActive !== undefined && (
            <Badge variant="secondary" className="flex items-center space-x-1">
              {currentFilters.isActive ? (
                <Wifi className="h-3 w-3" />
              ) : (
                <WifiOff className="h-3 w-3" />
              )}
              <span>{currentFilters.isActive ? 'Online' : 'Offline'}</span>
              <button
                onClick={() => onFilterChange({ isActive: undefined })}
                className="ml-1 hover:bg-muted rounded-full p-0.5"
              >
                <X className="h-2 w-2" />
              </button>
            </Badge>
          )}

          {currentFilters.riskLevel && (
            <Badge 
              variant={
                currentFilters.riskLevel === 'high' ? 'destructive' :
                currentFilters.riskLevel === 'medium' ? 'warning' : 'success'
              }
              className="flex items-center space-x-1"
            >
              {currentFilters.riskLevel === 'low' ? (
                <Shield className="h-3 w-3" />
              ) : (
                <AlertTriangle className="h-3 w-3" />
              )}
              <span>{currentFilters.riskLevel} risk</span>
              <button
                onClick={() => onFilterChange({ riskLevel: undefined })}
                className="ml-1 hover:bg-muted rounded-full p-0.5"
              >
                <X className="h-2 w-2" />
              </button>
            </Badge>
          )}

          {currentFilters.deviceType && (
            <Badge variant="outline" className="flex items-center space-x-1">
              {(() => {
                const type = DEVICE_TYPES.find(t => t.value === currentFilters.deviceType)
                const Icon = type?.icon || Monitor
                return <Icon className="h-3 w-3" />
              })()}
              <span>{DEVICE_TYPES.find(t => t.value === currentFilters.deviceType)?.label || currentFilters.deviceType}</span>
              <button
                onClick={() => onFilterChange({ deviceType: undefined })}
                className="ml-1 hover:bg-muted rounded-full p-0.5"
              >
                <X className="h-2 w-2" />
              </button>
            </Badge>
          )}

          {currentFilters.subnet && (
            <Badge variant="outline" className="flex items-center space-x-1 font-mono text-xs">
              <Router className="h-3 w-3" />
              <span>{currentFilters.subnet}*</span>
              <button
                onClick={() => onFilterChange({ subnet: undefined })}
                className="ml-1 hover:bg-muted rounded-full p-0.5"
              >
                <X className="h-2 w-2" />
              </button>
            </Badge>
          )}

          {currentFilters.searchTerm && (
            <Badge variant="outline" className="flex items-center space-x-1">
              <span>"{currentFilters.searchTerm}"</span>
              <button
                onClick={() => onFilterChange({ searchTerm: undefined })}
                className="ml-1 hover:bg-muted rounded-full p-0.5"
              >
                <X className="h-2 w-2" />
              </button>
            </Badge>
          )}
        </div>
      )}
    </div>
  )
}