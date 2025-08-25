import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle, Button, Badge, Input, Checkbox } from '@/components/ui'
import { cn } from '@/lib/utils'
import {
  Filter,
  Search,
  X,
  ChevronDown,
  ChevronRight,
  Monitor,
  Smartphone,
  Router,
  Server,
  Printer,
  Wifi,
  Shield,
  AlertTriangle,
  CheckCircle,
  Clock,
  Eye,
  EyeOff,
  RotateCcw,
  Settings2,
  Minimize2
} from 'lucide-react'

interface TopologyFiltersProps {
  onDeviceTypeFilter?: (types: string[]) => void
  onStatusFilter?: (statuses: string[]) => void
  onPortFilter?: (ports: number[]) => void
  onServiceFilter?: (services: string[]) => void
  onSecurityFilter?: (levels: string[]) => void
  onSearchFilter?: (query: string) => void
  onVisibilityFilter?: (options: { [key: string]: boolean }) => void
  onReset?: () => void
  onClose?: () => void
  activeFilters?: {
    deviceTypes: string[]
    statuses: string[]
    ports: number[]
    services: string[]
    securityLevels: string[]
    searchQuery: string
    visibility: { [key: string]: boolean }
  }
  availableDeviceTypes?: string[]
  availableServices?: string[]
  className?: string
}

export function TopologyFilters({
  onDeviceTypeFilter,
  onStatusFilter,
  onPortFilter,
  onServiceFilter,
  onSecurityFilter,
  onSearchFilter,
  onVisibilityFilter,
  onReset,
  onClose,
  activeFilters = {
    deviceTypes: [],
    statuses: [],
    ports: [],
    services: [],
    securityLevels: [],
    searchQuery: '',
    visibility: {}
  },
  availableDeviceTypes = ['computer', 'router', 'switch', 'printer', 'phone', 'server'],
  availableServices = ['http', 'https', 'ssh', 'ftp', 'smtp', 'dns', 'dhcp', 'snmp'],
  className
}: TopologyFiltersProps) {
  const [searchQuery, setSearchQuery] = useState(activeFilters.searchQuery || '')
  const [expandedSections, setExpandedSections] = useState<{[key: string]: boolean}>({
    deviceTypes: true,
    status: true,
    services: false,
    security: false,
    visibility: false,
    advanced: false
  })

  const deviceTypeIcons = {
    computer: Monitor,
    router: Router,
    switch: Wifi,
    printer: Printer,
    phone: Smartphone,
    server: Server
  }

  const statusOptions = [
    { id: 'online', label: 'Online', icon: CheckCircle, color: 'text-green-500' },
    { id: 'offline', label: 'Offline', icon: X, color: 'text-red-500' },
    { id: 'warning', label: 'Warning', icon: AlertTriangle, color: 'text-yellow-500' },
    { id: 'unknown', label: 'Unknown', icon: Clock, color: 'text-gray-500' }
  ]

  const securityLevels = [
    { id: 'low', label: 'Low Risk', color: 'bg-green-500' },
    { id: 'medium', label: 'Medium Risk', color: 'bg-yellow-500' },
    { id: 'high', label: 'High Risk', color: 'bg-red-500' },
    { id: 'critical', label: 'Critical', color: 'bg-red-700' }
  ]

  const visibilityOptions = [
    { id: 'labels', label: 'Device Labels', icon: Eye },
    { id: 'connections', label: 'Connection Lines', icon: Eye },
    { id: 'ports', label: 'Port Numbers', icon: Eye },
    { id: 'services', label: 'Service Icons', icon: Eye },
    { id: 'security', label: 'Security Indicators', icon: Shield }
  ]

  const toggleSection = (section: string) => {
    setExpandedSections(prev => ({
      ...prev,
      [section]: !prev[section]
    }))
  }

  const handleDeviceTypeToggle = (type: string) => {
    const newTypes = activeFilters.deviceTypes.includes(type)
      ? activeFilters.deviceTypes.filter(t => t !== type)
      : [...activeFilters.deviceTypes, type]
    onDeviceTypeFilter?.(newTypes)
  }

  const handleStatusToggle = (status: string) => {
    const newStatuses = activeFilters.statuses.includes(status)
      ? activeFilters.statuses.filter(s => s !== status)
      : [...activeFilters.statuses, status]
    onStatusFilter?.(newStatuses)
  }

  const handleServiceToggle = (service: string) => {
    const newServices = activeFilters.services.includes(service)
      ? activeFilters.services.filter(s => s !== service)
      : [...activeFilters.services, service]
    onServiceFilter?.(newServices)
  }

  const handleSecurityToggle = (level: string) => {
    const newLevels = activeFilters.securityLevels.includes(level)
      ? activeFilters.securityLevels.filter(l => l !== level)
      : [...activeFilters.securityLevels, level]
    onSecurityFilter?.(newLevels)
  }

  const handleVisibilityToggle = (option: string) => {
    const newVisibility = {
      ...activeFilters.visibility,
      [option]: !activeFilters.visibility[option]
    }
    onVisibilityFilter?.(newVisibility)
  }

  const handleSearchChange = (value: string) => {
    setSearchQuery(value)
    onSearchFilter?.(value)
  }

  const getActiveFilterCount = () => {
    return (
      activeFilters.deviceTypes.length +
      activeFilters.statuses.length +
      activeFilters.services.length +
      activeFilters.securityLevels.length +
      (activeFilters.searchQuery ? 1 : 0)
    )
  }

  return (
    <Card className={cn('w-80 shadow-lg max-h-[80vh] overflow-y-auto', className)}>
      <CardHeader className="pb-3">
        <CardTitle className="text-sm flex items-center justify-between">
          <span className="flex items-center space-x-2">
            <Filter className="h-4 w-4" />
            <span>Topology Filters</span>
            {getActiveFilterCount() > 0 && (
              <Badge variant="secondary" className="text-xs">
                {getActiveFilterCount()}
              </Badge>
            )}
          </span>
          <div className="flex items-center space-x-1">
            <Button
              variant="ghost"
              size="sm"
              onClick={onReset}
              className="h-6 w-6 p-0"
              title="Reset all filters"
            >
              <RotateCcw className="h-3 w-3" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={onClose}
              className="h-6 w-6 p-0"
            >
              <Minimize2 className="h-3 w-3" />
            </Button>
          </div>
        </CardTitle>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Search Filter */}
        <div className="space-y-2">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search devices, IPs, hostnames..."
              value={searchQuery}
              onChange={(e) => handleSearchChange(e.target.value)}
              className="pl-10 text-sm h-8"
            />
            {searchQuery && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => handleSearchChange('')}
                className="absolute right-1 top-1/2 transform -translate-y-1/2 h-6 w-6 p-0"
              >
                <X className="h-3 w-3" />
              </Button>
            )}
          </div>
        </div>

        {/* Device Types */}
        <div className="space-y-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => toggleSection('deviceTypes')}
            className="w-full justify-start h-7 text-xs font-medium text-muted-foreground"
          >
            {expandedSections.deviceTypes ? (
              <ChevronDown className="h-3 w-3 mr-1" />
            ) : (
              <ChevronRight className="h-3 w-3 mr-1" />
            )}
            Device Types
            {activeFilters.deviceTypes.length > 0 && (
              <Badge variant="secondary" className="ml-auto text-xs">
                {activeFilters.deviceTypes.length}
              </Badge>
            )}
          </Button>

          {expandedSections.deviceTypes && (
            <div className="grid grid-cols-2 gap-1 pl-4">
              {availableDeviceTypes.map((type) => {
                const Icon = deviceTypeIcons[type as keyof typeof deviceTypeIcons] || Monitor
                const isSelected = activeFilters.deviceTypes.includes(type)
                
                return (
                  <Button
                    key={type}
                    variant={isSelected ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => handleDeviceTypeToggle(type)}
                    className="justify-start h-8 text-xs"
                  >
                    <Icon className="h-3 w-3 mr-1" />
                    <span className="capitalize">{type}</span>
                  </Button>
                )
              })}
            </div>
          )}
        </div>

        {/* Status Filter */}
        <div className="space-y-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => toggleSection('status')}
            className="w-full justify-start h-7 text-xs font-medium text-muted-foreground"
          >
            {expandedSections.status ? (
              <ChevronDown className="h-3 w-3 mr-1" />
            ) : (
              <ChevronRight className="h-3 w-3 mr-1" />
            )}
            Connection Status
            {activeFilters.statuses.length > 0 && (
              <Badge variant="secondary" className="ml-auto text-xs">
                {activeFilters.statuses.length}
              </Badge>
            )}
          </Button>

          {expandedSections.status && (
            <div className="space-y-1 pl-4">
              {statusOptions.map((status) => {
                const isSelected = activeFilters.statuses.includes(status.id)
                
                return (
                  <div key={status.id} className="flex items-center space-x-2">
                    <Checkbox
                      checked={isSelected}
                      onCheckedChange={() => handleStatusToggle(status.id)}
                    />
                    <status.icon className={cn('h-3 w-3', status.color)} />
                    <span className="text-xs">{status.label}</span>
                  </div>
                )
              })}
            </div>
          )}
        </div>

        {/* Services Filter */}
        <div className="space-y-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => toggleSection('services')}
            className="w-full justify-start h-7 text-xs font-medium text-muted-foreground"
          >
            {expandedSections.services ? (
              <ChevronDown className="h-3 w-3 mr-1" />
            ) : (
              <ChevronRight className="h-3 w-3 mr-1" />
            )}
            Services
            {activeFilters.services.length > 0 && (
              <Badge variant="secondary" className="ml-auto text-xs">
                {activeFilters.services.length}
              </Badge>
            )}
          </Button>

          {expandedSections.services && (
            <div className="grid grid-cols-2 gap-1 pl-4">
              {availableServices.map((service) => {
                const isSelected = activeFilters.services.includes(service)
                
                return (
                  <Button
                    key={service}
                    variant={isSelected ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => handleServiceToggle(service)}
                    className="justify-center h-7 text-xs"
                  >
                    {service.toUpperCase()}
                  </Button>
                )
              })}
            </div>
          )}
        </div>

        {/* Security Level Filter */}
        <div className="space-y-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => toggleSection('security')}
            className="w-full justify-start h-7 text-xs font-medium text-muted-foreground"
          >
            {expandedSections.security ? (
              <ChevronDown className="h-3 w-3 mr-1" />
            ) : (
              <ChevronRight className="h-3 w-3 mr-1" />
            )}
            Security Risk
            {activeFilters.securityLevels.length > 0 && (
              <Badge variant="secondary" className="ml-auto text-xs">
                {activeFilters.securityLevels.length}
              </Badge>
            )}
          </Button>

          {expandedSections.security && (
            <div className="space-y-1 pl-4">
              {securityLevels.map((level) => {
                const isSelected = activeFilters.securityLevels.includes(level.id)
                
                return (
                  <div key={level.id} className="flex items-center space-x-2">
                    <Checkbox
                      checked={isSelected}
                      onCheckedChange={() => handleSecurityToggle(level.id)}
                    />
                    <div className={cn('w-3 h-3 rounded-full', level.color)} />
                    <span className="text-xs">{level.label}</span>
                  </div>
                )
              })}
            </div>
          )}
        </div>

        {/* Visibility Options */}
        <div className="space-y-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => toggleSection('visibility')}
            className="w-full justify-start h-7 text-xs font-medium text-muted-foreground"
          >
            {expandedSections.visibility ? (
              <ChevronDown className="h-3 w-3 mr-1" />
            ) : (
              <ChevronRight className="h-3 w-3 mr-1" />
            )}
            Visibility Options
          </Button>

          {expandedSections.visibility && (
            <div className="space-y-1 pl-4">
              {visibilityOptions.map((option) => {
                const isVisible = activeFilters.visibility[option.id] !== false
                
                return (
                  <div key={option.id} className="flex items-center space-x-2">
                    <Checkbox
                      checked={isVisible}
                      onCheckedChange={() => handleVisibilityToggle(option.id)}
                    />
                    <option.icon className="h-3 w-3" />
                    <span className="text-xs">{option.label}</span>
                  </div>
                )
              })}
            </div>
          )}
        </div>

        {/* Advanced Filters */}
        <div className="space-y-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => toggleSection('advanced')}
            className="w-full justify-start h-7 text-xs font-medium text-muted-foreground"
          >
            {expandedSections.advanced ? (
              <ChevronDown className="h-3 w-3 mr-1" />
            ) : (
              <ChevronRight className="h-3 w-3 mr-1" />
            )}
            Advanced
          </Button>

          {expandedSections.advanced && (
            <div className="space-y-2 pl-4">
              <div className="space-y-1">
                <label className="text-xs text-muted-foreground">Port Range</label>
                <div className="flex space-x-1">
                  <Input
                    type="number"
                    placeholder="From"
                    className="text-xs h-7"
                  />
                  <Input
                    type="number"
                    placeholder="To"
                    className="text-xs h-7"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-xs text-muted-foreground">MAC Address</label>
                <Input
                  placeholder="xx:xx:xx:xx:xx:xx"
                  className="text-xs h-7"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs text-muted-foreground">IP Range</label>
                <Input
                  placeholder="192.168.1.0/24"
                  className="text-xs h-7"
                />
              </div>
            </div>
          )}
        </div>

        {/* Active Filters Summary */}
        {getActiveFilterCount() > 0 && (
          <div className="space-y-2 border-t pt-3">
            <div className="flex items-center justify-between">
              <label className="text-xs font-medium text-muted-foreground">Active Filters</label>
              <Button
                variant="ghost"
                size="sm"
                onClick={onReset}
                className="text-xs h-6"
              >
                Clear All
              </Button>
            </div>
            
            <div className="flex flex-wrap gap-1">
              {activeFilters.deviceTypes.map((type) => (
                <Badge key={`type-${type}`} variant="secondary" className="text-xs">
                  {type}
                  <X
                    className="h-2 w-2 ml-1 cursor-pointer"
                    onClick={() => handleDeviceTypeToggle(type)}
                  />
                </Badge>
              ))}
              
              {activeFilters.statuses.map((status) => (
                <Badge key={`status-${status}`} variant="secondary" className="text-xs">
                  {status}
                  <X
                    className="h-2 w-2 ml-1 cursor-pointer"
                    onClick={() => handleStatusToggle(status)}
                  />
                </Badge>
              ))}
              
              {activeFilters.services.map((service) => (
                <Badge key={`service-${service}`} variant="secondary" className="text-xs">
                  {service}
                  <X
                    className="h-2 w-2 ml-1 cursor-pointer"
                    onClick={() => handleServiceToggle(service)}
                  />
                </Badge>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}