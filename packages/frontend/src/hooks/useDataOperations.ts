import { useMemo, useCallback, useEffect, useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { 
  useNetworkDevices, 
  useSnapshots, 
  useRecentChanges,
  useSystemHealth,
  useSystemStatistics,
  queryKeys
} from './useNetworkQueries'
import { useNetworkStore, useSystemStore, useConfigStore, networkSelectors, systemSelectors } from '@/store'
import { useNotifications } from '@/services/notificationService'
import type { Device, NetworkSnapshot } from '@nmapper/shared'

// Custom hook for filtered device operations
export const useFilteredDevices = () => {
  const { 
    deviceFilters, 
    selectedDevices, 
    recentlyChangedDevices,
    setDeviceFilters,
    toggleDeviceSelection,
    clearDeviceSelection
  } = useNetworkStore()
  
  const { data: allDevices = [], isLoading, error } = useNetworkDevices(deviceFilters)
  
  // Memoized filtered devices
  const filteredDevices = useMemo(() => {
    return allDevices.filter(device => {
      if (deviceFilters.isActive !== undefined && device.isActive !== deviceFilters.isActive) {
        return false
      }
      if (deviceFilters.riskLevel && device.riskLevel !== deviceFilters.riskLevel) {
        return false
      }
      if (deviceFilters.deviceType && device.deviceType !== deviceFilters.deviceType) {
        return false
      }
      if (deviceFilters.subnet && !device.ip.startsWith(deviceFilters.subnet)) {
        return false
      }
      if (deviceFilters.searchTerm) {
        const searchLower = deviceFilters.searchTerm.toLowerCase()
        const matchesIp = device.ip.toLowerCase().includes(searchLower)
        const matchesHostname = device.hostname?.toLowerCase().includes(searchLower)
        const matchesMac = device.macAddress?.toLowerCase().includes(searchLower)
        if (!matchesIp && !matchesHostname && !matchesMac) {
          return false
        }
      }
      return true
    })
  }, [allDevices, deviceFilters])

  // Device statistics
  const deviceStats = useMemo(() => {
    const total = filteredDevices.length
    const online = filteredDevices.filter(d => d.isActive).length
    const offline = total - online
    const highRisk = filteredDevices.filter(d => d.riskLevel === 'high').length
    const mediumRisk = filteredDevices.filter(d => d.riskLevel === 'medium').length
    const lowRisk = filteredDevices.filter(d => d.riskLevel === 'low').length
    const recentlyChanged = filteredDevices.filter(d => recentlyChangedDevices.has(d.ip)).length

    return {
      total,
      online,
      offline,
      highRisk,
      mediumRisk,
      lowRisk,
      recentlyChanged,
      onlinePercentage: total > 0 ? Math.round((online / total) * 100) : 0,
    }
  }, [filteredDevices, recentlyChangedDevices])

  // Selected device details
  const selectedDeviceList = useMemo(() => {
    return filteredDevices.filter(device => selectedDevices.has(device.ip))
  }, [filteredDevices, selectedDevices])

  // Search and filter operations
  const searchDevices = useCallback((searchTerm: string) => {
    setDeviceFilters({ searchTerm: searchTerm || undefined })
  }, [setDeviceFilters])

  const filterByRisk = useCallback((riskLevel: 'low' | 'medium' | 'high' | undefined) => {
    setDeviceFilters({ riskLevel })
  }, [setDeviceFilters])

  const filterByStatus = useCallback((isActive: boolean | undefined) => {
    setDeviceFilters({ isActive })
  }, [setDeviceFilters])

  const clearFilters = useCallback(() => {
    setDeviceFilters({
      isActive: undefined,
      riskLevel: undefined,
      deviceType: undefined,
      subnet: undefined,
      searchTerm: undefined
    })
  }, [setDeviceFilters])

  // Bulk operations
  const selectAllFiltered = useCallback(() => {
    const allIps = new Set(filteredDevices.map(d => d.ip))
    useNetworkStore.getState().setSelectedDevices(allIps)
  }, [filteredDevices])

  const selectByRisk = useCallback((riskLevel: 'low' | 'medium' | 'high') => {
    const riskDeviceIps = new Set(
      filteredDevices
        .filter(d => d.riskLevel === riskLevel)
        .map(d => d.ip)
    )
    useNetworkStore.getState().setSelectedDevices(riskDeviceIps)
  }, [filteredDevices])

  return {
    // Data
    devices: filteredDevices,
    allDevices,
    selectedDevices: selectedDeviceList,
    deviceStats,
    
    // State
    isLoading,
    error,
    filters: deviceFilters,
    
    // Operations
    searchDevices,
    filterByRisk,
    filterByStatus,
    clearFilters,
    toggleDeviceSelection,
    clearDeviceSelection,
    selectAllFiltered,
    selectByRisk,
  }
}

// Custom hook for snapshot operations with enhanced functionality
export const useSnapshotOperations = () => {
  const { data: snapshots = [], isLoading } = useSnapshots()
  const { data: recentChanges = [] } = useRecentChanges(50, 24)
  const queryClient = useQueryClient()
  const notifications = useNotifications()
  
  // Snapshot statistics
  const snapshotStats = useMemo(() => {
    const total = snapshots.length
    const today = new Date()
    const last24Hours = new Date(today.getTime() - 24 * 60 * 60 * 1000)
    const lastWeek = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000)
    
    const todayCount = snapshots.filter(s => 
      new Date(s.createdAt).toDateString() === today.toDateString()
    ).length
    
    const last24HoursCount = snapshots.filter(s => 
      new Date(s.createdAt) >= last24Hours
    ).length
    
    const lastWeekCount = snapshots.filter(s => 
      new Date(s.createdAt) >= lastWeek
    ).length

    return {
      total,
      todayCount,
      last24HoursCount,
      lastWeekCount,
      recentChangesCount: recentChanges.length
    }
  }, [snapshots, recentChanges])

  // Get snapshots by date range
  const getSnapshotsByDateRange = useCallback((startDate: Date, endDate: Date) => {
    return snapshots.filter(snapshot => {
      const snapshotDate = new Date(snapshot.createdAt)
      return snapshotDate >= startDate && snapshotDate <= endDate
    })
  }, [snapshots])

  // Find snapshots for comparison
  const getSnapshotsForComparison = useCallback((maxCount: number = 10) => {
    return snapshots
      .slice()
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      .slice(0, maxCount)
  }, [snapshots])

  // Auto-refresh snapshots
  const refreshSnapshots = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: queryKeys.snapshots })
    notifications.show({
      title: 'Snapshots Refreshed',
      description: 'Snapshot data has been updated',
      level: 'info'
    })
  }, [queryClient, notifications])

  return {
    snapshots,
    recentChanges,
    snapshotStats,
    isLoading,
    getSnapshotsByDateRange,
    getSnapshotsForComparison,
    refreshSnapshots
  }
}

// Custom hook for system monitoring with alerts
export const useSystemMonitoring = () => {
  const { data: health } = useSystemHealth({ refetchInterval: 30000 })
  const { data: statistics } = useSystemStatistics({ refetchInterval: 60000 })
  const { 
    alerts, 
    unacknowledgedAlerts, 
    performanceHistory,
    addAlert,
    acknowledgeAlert,
    clearOldAlerts
  } = useSystemStore()

  const [criticalAlerts, setCriticalAlerts] = useState<string[]>([])
  
  // System health assessment
  const systemHealth = useMemo(() => {
    if (!health) return null
    
    return systemSelectors.getSystemHealthStatus(health.services, {
      cpu: health.cpu,
      memory: health.memory,
      disk: health.disk,
      uptime: health.uptime,
      loadAverage: [0, 0, 0], // Simplified
      processes: 0,
      network: { bytesIn: 0, bytesOut: 0, packetsIn: 0, packetsOut: 0 }
    })
  }, [health])

  // Performance trends
  const performanceTrends = useMemo(() => {
    if (performanceHistory.length < 2) return null
    
    const recent = performanceHistory.slice(-10)
    const cpu = recent.map(p => p.cpu)
    const memory = recent.map(p => p.memory)
    const disk = recent.map(p => p.disk)
    
    const calculateTrend = (values: number[]) => {
      if (values.length < 2) return 'stable'
      const last = values[values.length - 1]
      const previous = values[values.length - 2]
      const diff = last - previous
      if (Math.abs(diff) < 5) return 'stable'
      return diff > 0 ? 'increasing' : 'decreasing'
    }
    
    return {
      cpu: calculateTrend(cpu),
      memory: calculateTrend(memory),
      disk: calculateTrend(disk)
    }
  }, [performanceHistory])

  // Monitor for critical conditions
  useEffect(() => {
    if (!health) return
    
    const newCriticalAlerts: string[] = []
    
    // CPU critical threshold
    if (health.cpu.usage > 90) {
      const alertKey = 'cpu-critical'
      if (!criticalAlerts.includes(alertKey)) {
        newCriticalAlerts.push(alertKey)
        addAlert({
          level: 'critical',
          title: 'High CPU Usage',
          message: `CPU usage is critically high at ${health.cpu.usage.toFixed(1)}%`,
          category: 'system'
        })
      }
    }
    
    // Memory critical threshold
    if (health.memory.usage > 95) {
      const alertKey = 'memory-critical'
      if (!criticalAlerts.includes(alertKey)) {
        newCriticalAlerts.push(alertKey)
        addAlert({
          level: 'critical',
          title: 'High Memory Usage',
          message: `Memory usage is critically high at ${health.memory.usage.toFixed(1)}%`,
          category: 'system'
        })
      }
    }
    
    // Disk critical threshold
    if (health.disk.usage > 95) {
      const alertKey = 'disk-critical'
      if (!criticalAlerts.includes(alertKey)) {
        newCriticalAlerts.push(alertKey)
        addAlert({
          level: 'critical',
          title: 'High Disk Usage',
          message: `Disk usage is critically high at ${health.disk.usage.toFixed(1)}%`,
          category: 'system'
        })
      }
    }
    
    // Service critical states
    Object.entries(health.services).forEach(([service, status]) => {
      if (status === 'critical') {
        const alertKey = `service-${service}-critical`
        if (!criticalAlerts.includes(alertKey)) {
          newCriticalAlerts.push(alertKey)
          addAlert({
            level: 'critical',
            title: 'Service Critical',
            message: `${service} service is in critical state`,
            category: 'system'
          })
        }
      }
    })
    
    setCriticalAlerts(prev => [...prev, ...newCriticalAlerts])
  }, [health, criticalAlerts, addAlert])

  // Auto-cleanup old alerts every hour
  useEffect(() => {
    const interval = setInterval(() => {
      clearOldAlerts(24) // Remove alerts older than 24 hours
    }, 60 * 60 * 1000) // Every hour
    
    return () => clearInterval(interval)
  }, [clearOldAlerts])

  const acknowledgeAllCritical = useCallback(() => {
    const criticalAlertIds = systemSelectors.getCriticalAlerts(alerts).map(a => a.id)
    criticalAlertIds.forEach(id => acknowledgeAlert(id))
    setCriticalAlerts([])
  }, [alerts, acknowledgeAlert])

  return {
    health,
    statistics,
    systemHealth,
    performanceTrends,
    alerts,
    unacknowledgedAlerts,
    criticalAlertCount: systemSelectors.getCriticalAlerts(alerts).length,
    acknowledgeAllCritical
  }
}

// Custom hook for configuration management
export const useConfigurationManagement = () => {
  const {
    currentConfig,
    pendingChanges,
    hasUnsavedChanges,
    formData,
    formErrors,
    isDirty,
    configHistory,
    activeSection,
    applyPendingChanges,
    discardPendingChanges,
    setFormData,
    validateForm,
    resetForm,
    setActiveSection
  } = useConfigStore()

  // Configuration validation
  const validationStatus = useMemo(() => {
    if (!isDirty) return { isValid: true, errorCount: 0 }
    
    const errorCount = Object.keys(formErrors).length
    return {
      isValid: errorCount === 0,
      errorCount
    }
  }, [formErrors, isDirty])

  // Configuration sections
  const configSections = useMemo(() => {
    const sections = [
      { key: 'scanning', label: 'Network Scanning', icon: 'Activity' },
      { key: 'database', label: 'Database', icon: 'Database' },
      { key: 'network', label: 'Network Settings', icon: 'Network' },
      { key: 'logging', label: 'Logging', icon: 'FileText' },
      { key: 'ui', label: 'User Interface', icon: 'Settings' },
      { key: 'security', label: 'Security', icon: 'Shield' },
    ] as const
    
    return sections.map(section => ({
      ...section,
      hasChanges: currentConfig ? 
        JSON.stringify((currentConfig as any)[section.key]) !== JSON.stringify((formData as any)[section.key]) :
        false,
      hasErrors: Object.keys(formErrors).some(key => key.startsWith(`${section.key}.`))
    }))
  }, [currentConfig, formData, formErrors])

  // Save configuration
  const saveConfiguration = useCallback(async () => {
    if (validateForm()) {
      applyPendingChanges()
      return true
    }
    return false
  }, [validateForm, applyPendingChanges])

  // Quick actions
  const resetToDefaults = useCallback(() => {
    resetForm()
    discardPendingChanges()
  }, [resetForm, discardPendingChanges])

  const navigateToSection = useCallback((section: string) => {
    setActiveSection(section as any)
  }, [setActiveSection])

  return {
    currentConfig,
    formData,
    pendingChanges,
    hasUnsavedChanges,
    isDirty,
    validationStatus,
    configSections,
    configHistory,
    activeSection,
    
    // Actions
    saveConfiguration,
    resetToDefaults,
    setFormData,
    navigateToSection,
    applyPendingChanges,
    discardPendingChanges
  }
}

// Custom hook for batch operations
export const useBatchOperations = () => {
  const queryClient = useQueryClient()
  const notifications = useNotifications()
  const { selectedDevices } = useNetworkStore()
  
  const [isProcessing, setIsProcessing] = useState(false)
  const [progress, setProgress] = useState(0)

  const processBatch = useCallback(async <T,>(
    items: T[],
    operation: (item: T) => Promise<any>,
    options?: {
      batchSize?: number
      onProgress?: (completed: number, total: number) => void
      onSuccess?: (results: any[]) => void
      onError?: (error: Error, item: T) => void
    }
  ) => {
    const batchSize = options?.batchSize || 5
    const results: any[] = []
    const errors: Array<{ item: T; error: Error }> = []
    
    setIsProcessing(true)
    setProgress(0)
    
    try {
      for (let i = 0; i < items.length; i += batchSize) {
        const batch = items.slice(i, i + batchSize)
        
        const batchPromises = batch.map(async item => {
          try {
            const result = await operation(item)
            results.push(result)
            return { success: true, result, item }
          } catch (error) {
            const err = error instanceof Error ? error : new Error(String(error))
            errors.push({ item, error: err })
            options?.onError?.(err, item)
            return { success: false, error: err, item }
          }
        })
        
        await Promise.all(batchPromises)
        
        const completed = Math.min(i + batchSize, items.length)
        setProgress((completed / items.length) * 100)
        options?.onProgress?.(completed, items.length)
      }
      
      options?.onSuccess?.(results)
      
      if (errors.length === 0) {
        notifications.show({
          title: 'Batch Operation Complete',
          description: `Successfully processed ${items.length} items`,
          level: 'success'
        })
      } else {
        notifications.show({
          title: 'Batch Operation Completed with Errors',
          description: `Processed ${results.length}/${items.length} items successfully`,
          level: 'warning'
        })
      }
      
    } finally {
      setIsProcessing(false)
      setProgress(0)
    }
    
    return { results, errors }
  }, [notifications])

  const refreshAllData = useCallback(async () => {
    await queryClient.invalidateQueries()
    notifications.show({
      title: 'Data Refreshed',
      description: 'All data has been refreshed from the server',
      level: 'success'
    })
  }, [queryClient, notifications])

  return {
    isProcessing,
    progress,
    selectedDeviceCount: selectedDevices.size,
    processBatch,
    refreshAllData
  }
}