import { useQuery, useMutation, useQueryClient, useInfiniteQuery } from '@tanstack/react-query'
import { networkRPC, snapshotRPC, systemRPC, configRPC, withRetry } from '@/lib/rpc-client'
import { useNotifications } from '@/services/notificationService'
import type { Device, NetworkSnapshot, SnapshotDiff, SystemStatus, Configuration } from '@nmapper/shared'

// Query keys for React Query
export const queryKeys = {
  // Network queries
  network: ['network'] as const,
  networkStatus: () => [...queryKeys.network, 'status'] as const,
  networkDevices: (filters?: any) => [...queryKeys.network, 'devices', filters] as const,
  networkDevice: (ip: string) => [...queryKeys.network, 'device', ip] as const,
  networkTopology: () => [...queryKeys.network, 'topology'] as const,
  networkScanProgress: () => [...queryKeys.network, 'scan-progress'] as const,

  // Snapshot queries
  snapshots: ['snapshots'] as const,
  snapshotsList: (limit?: number, offset?: number) => [...queryKeys.snapshots, 'list', { limit, offset }] as const,
  snapshot: (id: string) => [...queryKeys.snapshots, 'detail', id] as const,
  snapshotComparison: (id1: string, id2: string) => [...queryKeys.snapshots, 'compare', id1, id2] as const,
  recentChanges: (limit?: number, hours?: number) => [...queryKeys.snapshots, 'recent-changes', { limit, hours }] as const,

  // System queries
  system: ['system'] as const,
  systemHealth: () => [...queryKeys.system, 'health'] as const,
  systemLogs: (level?: string, limit?: number) => [...queryKeys.system, 'logs', { level, limit }] as const,
  systemStatistics: () => [...queryKeys.system, 'statistics'] as const,

  // Configuration queries
  config: ['config'] as const,
  configCurrent: () => [...queryKeys.config, 'current'] as const,
}

// Network queries
export const useNetworkStatus = (options?: { 
  refetchInterval?: number 
  enabled?: boolean 
}) => {
  return useQuery({
    queryKey: queryKeys.networkStatus(),
    queryFn: () => withRetry(() => networkRPC.getStatus()),
    refetchInterval: options?.refetchInterval ?? 30000, // 30 seconds default
    enabled: options?.enabled ?? true,
    staleTime: 10000, // 10 seconds
  })
}

export const useNetworkDevices = (
  filters?: {
    isActive?: boolean
    riskLevel?: 'low' | 'medium' | 'high'
    deviceType?: string
    subnet?: string
  },
  options?: {
    refetchInterval?: number
    enabled?: boolean
  }
) => {
  return useQuery({
    queryKey: queryKeys.networkDevices(filters),
    queryFn: () => withRetry(() => networkRPC.getDevices(filters)),
    refetchInterval: options?.refetchInterval ?? 60000, // 1 minute default
    enabled: options?.enabled ?? true,
    staleTime: 30000, // 30 seconds
  })
}

export const useNetworkDevice = (
  ip: string,
  options?: {
    enabled?: boolean
    refetchInterval?: number
  }
) => {
  return useQuery({
    queryKey: queryKeys.networkDevice(ip),
    queryFn: () => withRetry(() => networkRPC.getDevice(ip)),
    enabled: (options?.enabled ?? true) && !!ip,
    refetchInterval: options?.refetchInterval ?? 30000,
    staleTime: 15000,
  })
}

export const useNetworkTopology = (options?: {
  enabled?: boolean
  refetchInterval?: number
}) => {
  return useQuery({
    queryKey: queryKeys.networkTopology(),
    queryFn: () => withRetry(() => networkRPC.getTopology()),
    enabled: options?.enabled ?? true,
    refetchInterval: options?.refetchInterval ?? 120000, // 2 minutes
    staleTime: 60000, // 1 minute
  })
}

export const useScanProgress = (options?: {
  enabled?: boolean
  refetchInterval?: number
}) => {
  return useQuery({
    queryKey: queryKeys.networkScanProgress(),
    queryFn: () => withRetry(() => networkRPC.getScanProgress()),
    enabled: options?.enabled ?? true,
    refetchInterval: options?.refetchInterval ?? 5000, // 5 seconds when scanning
    staleTime: 2000,
  })
}

// Network mutations
export const useStartScan = () => {
  const queryClient = useQueryClient()
  const notifications = useNotifications()

  return useMutation({
    mutationFn: (options?: {
      targets?: string[]
      scanType?: 'quick' | 'comprehensive' | 'custom'
      ports?: string
      timing?: 'paranoid' | 'sneaky' | 'polite' | 'normal' | 'aggressive' | 'insane'
    }) => networkRPC.startScan(options),
    onSuccess: (data) => {
      // Invalidate scan progress to start polling
      queryClient.invalidateQueries({ queryKey: queryKeys.networkScanProgress() })
      notifications.show({
        title: 'Scan Started',
        description: `Network scan initiated with ID: ${data.scanId.slice(0, 8)}...`,
        level: 'success'
      })
    },
    onError: (error) => {
      notifications.show({
        title: 'Scan Failed',
        description: error instanceof Error ? error.message : 'Failed to start network scan',
        level: 'error'
      })
    }
  })
}

export const useStopScan = () => {
  const queryClient = useQueryClient()
  const notifications = useNotifications()

  return useMutation({
    mutationFn: () => networkRPC.stopScan(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.networkScanProgress() })
      notifications.show({
        title: 'Scan Stopped',
        description: 'Network scan has been stopped successfully',
        level: 'info'
      })
    },
    onError: (error) => {
      notifications.show({
        title: 'Stop Scan Failed',
        description: error instanceof Error ? error.message : 'Failed to stop network scan',
        level: 'error'
      })
    }
  })
}

export const useUpdateDevice = () => {
  const queryClient = useQueryClient()
  const notifications = useNotifications()

  return useMutation({
    mutationFn: ({ ip, updates }: { ip: string; updates: Partial<Device> }) => 
      networkRPC.updateDevice(ip, updates),
    onSuccess: (updatedDevice) => {
      // Update device in cache
      queryClient.setQueryData(
        queryKeys.networkDevice(updatedDevice.ip),
        updatedDevice
      )
      
      // Invalidate devices list to refresh
      queryClient.invalidateQueries({ queryKey: queryKeys.networkDevices() })
      
      notifications.show({
        title: 'Device Updated',
        description: `Successfully updated ${updatedDevice.hostname || updatedDevice.ip}`,
        level: 'success'
      })
    },
    onError: (error) => {
      notifications.show({
        title: 'Update Failed',
        description: error instanceof Error ? error.message : 'Failed to update device',
        level: 'error'
      })
    }
  })
}

export const useRemoveDevice = () => {
  const queryClient = useQueryClient()
  const notifications = useNotifications()

  return useMutation({
    mutationFn: (ip: string) => networkRPC.removeDevice(ip),
    onSuccess: (_, ip) => {
      // Remove from cache
      queryClient.removeQueries({ queryKey: queryKeys.networkDevice(ip) })
      
      // Invalidate devices list
      queryClient.invalidateQueries({ queryKey: queryKeys.networkDevices() })
      
      notifications.show({
        title: 'Device Removed',
        description: `Device ${ip} has been removed from monitoring`,
        level: 'info'
      })
    },
    onError: (error) => {
      notifications.show({
        title: 'Remove Failed',
        description: error instanceof Error ? error.message : 'Failed to remove device',
        level: 'error'
      })
    }
  })
}

// Snapshot queries
export const useSnapshots = (
  limit?: number,
  offset?: number,
  options?: { enabled?: boolean }
) => {
  return useQuery({
    queryKey: queryKeys.snapshotsList(limit, offset),
    queryFn: () => withRetry(() => snapshotRPC.getSnapshots(limit, offset)),
    enabled: options?.enabled ?? true,
    staleTime: 60000, // 1 minute
  })
}

export const useInfiniteSnapshots = (pageSize: number = 20) => {
  return useInfiniteQuery({
    queryKey: [...queryKeys.snapshots, 'infinite'],
    queryFn: ({ pageParam = 0 }) => 
      withRetry(() => snapshotRPC.getSnapshots(pageSize, pageParam * pageSize)),
    initialPageParam: 0,
    getNextPageParam: (lastPage, allPages) => {
      return lastPage.length === pageSize ? allPages.length : undefined
    },
    staleTime: 60000,
  })
}

export const useSnapshot = (
  id: string,
  options?: { enabled?: boolean }
) => {
  return useQuery({
    queryKey: queryKeys.snapshot(id),
    queryFn: () => withRetry(() => snapshotRPC.getSnapshot(id)),
    enabled: (options?.enabled ?? true) && !!id,
    staleTime: 300000, // 5 minutes - snapshots don't change
  })
}

export const useSnapshotComparison = (
  snapshotId1: string,
  snapshotId2: string,
  options?: { enabled?: boolean }
) => {
  return useQuery({
    queryKey: queryKeys.snapshotComparison(snapshotId1, snapshotId2),
    queryFn: () => withRetry(() => snapshotRPC.compareSnapshots(snapshotId1, snapshotId2)),
    enabled: (options?.enabled ?? true) && !!snapshotId1 && !!snapshotId2,
    staleTime: 300000, // 5 minutes
  })
}

export const useRecentChanges = (
  limit?: number,
  hours?: number,
  options?: { 
    enabled?: boolean
    refetchInterval?: number 
  }
) => {
  return useQuery({
    queryKey: queryKeys.recentChanges(limit, hours),
    queryFn: () => withRetry(() => snapshotRPC.getRecentChanges(limit, hours)),
    enabled: options?.enabled ?? true,
    refetchInterval: options?.refetchInterval ?? 60000, // 1 minute
    staleTime: 30000,
  })
}

// Snapshot mutations
export const useCreateSnapshot = () => {
  const queryClient = useQueryClient()
  const notifications = useNotifications()

  return useMutation({
    mutationFn: (description?: string) => snapshotRPC.createSnapshot(description),
    onSuccess: (newSnapshot) => {
      // Invalidate snapshots list
      queryClient.invalidateQueries({ queryKey: queryKeys.snapshots })
      
      notifications.show({
        title: 'Snapshot Created',
        description: `Successfully created snapshot: ${newSnapshot.description || 'Unnamed'}`,
        level: 'success'
      })
    },
    onError: (error) => {
      notifications.show({
        title: 'Snapshot Failed',
        description: error instanceof Error ? error.message : 'Failed to create snapshot',
        level: 'error'
      })
    }
  })
}

export const useDeleteSnapshot = () => {
  const queryClient = useQueryClient()
  const notifications = useNotifications()

  return useMutation({
    mutationFn: (id: string) => snapshotRPC.deleteSnapshot(id),
    onSuccess: (_, id) => {
      // Remove from cache
      queryClient.removeQueries({ queryKey: queryKeys.snapshot(id) })
      
      // Invalidate snapshots list
      queryClient.invalidateQueries({ queryKey: queryKeys.snapshots })
      
      notifications.show({
        title: 'Snapshot Deleted',
        description: 'Snapshot has been successfully deleted',
        level: 'info'
      })
    },
    onError: (error) => {
      notifications.show({
        title: 'Delete Failed',
        description: error instanceof Error ? error.message : 'Failed to delete snapshot',
        level: 'error'
      })
    }
  })
}

// System queries
export const useSystemHealth = (options?: {
  enabled?: boolean
  refetchInterval?: number
}) => {
  return useQuery({
    queryKey: queryKeys.systemHealth(),
    queryFn: () => withRetry(() => systemRPC.getHealth()),
    enabled: options?.enabled ?? true,
    refetchInterval: options?.refetchInterval ?? 30000, // 30 seconds
    staleTime: 10000,
  })
}

export const useSystemLogs = (
  level?: 'debug' | 'info' | 'warn' | 'error',
  limit?: number,
  options?: { enabled?: boolean }
) => {
  return useQuery({
    queryKey: queryKeys.systemLogs(level, limit),
    queryFn: () => withRetry(() => systemRPC.getLogs(level, limit)),
    enabled: options?.enabled ?? true,
    refetchInterval: 60000, // 1 minute
    staleTime: 30000,
  })
}

export const useSystemStatistics = (options?: {
  enabled?: boolean
  refetchInterval?: number
}) => {
  return useQuery({
    queryKey: queryKeys.systemStatistics(),
    queryFn: () => withRetry(() => systemRPC.getStatistics()),
    enabled: options?.enabled ?? true,
    refetchInterval: options?.refetchInterval ?? 60000, // 1 minute
    staleTime: 30000,
  })
}

// Configuration queries
export const useConfiguration = (options?: {
  enabled?: boolean
}) => {
  return useQuery({
    queryKey: queryKeys.configCurrent(),
    queryFn: () => withRetry(() => configRPC.getConfig()),
    enabled: options?.enabled ?? true,
    staleTime: 300000, // 5 minutes - config doesn't change often
  })
}

// Configuration mutations
export const useUpdateConfiguration = () => {
  const queryClient = useQueryClient()
  const notifications = useNotifications()

  return useMutation({
    mutationFn: (updates: Partial<Configuration>) => configRPC.updateConfig(updates),
    onSuccess: (updatedConfig) => {
      // Update config in cache
      queryClient.setQueryData(queryKeys.configCurrent(), updatedConfig)
      
      notifications.show({
        title: 'Configuration Updated',
        description: 'System configuration has been successfully updated',
        level: 'success'
      })
    },
    onError: (error) => {
      notifications.show({
        title: 'Configuration Update Failed',
        description: error instanceof Error ? error.message : 'Failed to update configuration',
        level: 'error'
      })
    }
  })
}

export const useResetConfiguration = () => {
  const queryClient = useQueryClient()
  const notifications = useNotifications()

  return useMutation({
    mutationFn: () => configRPC.resetConfig(),
    onSuccess: (resetConfig) => {
      // Update config in cache
      queryClient.setQueryData(queryKeys.configCurrent(), resetConfig)
      
      notifications.show({
        title: 'Configuration Reset',
        description: 'Configuration has been reset to defaults',
        level: 'info'
      })
    },
    onError: (error) => {
      notifications.show({
        title: 'Reset Failed',
        description: error instanceof Error ? error.message : 'Failed to reset configuration',
        level: 'error'
      })
    }
  })
}

export const useValidateConfiguration = () => {
  return useMutation({
    mutationFn: (config: Partial<Configuration>) => configRPC.validateConfig(config),
  })
}

export const useImportConfiguration = () => {
  const queryClient = useQueryClient()
  const notifications = useNotifications()

  return useMutation({
    mutationFn: (config: Configuration) => configRPC.importConfig(config),
    onSuccess: (importedConfig) => {
      // Update config in cache
      queryClient.setQueryData(queryKeys.configCurrent(), importedConfig)
      
      notifications.show({
        title: 'Configuration Imported',
        description: 'Configuration has been successfully imported',
        level: 'success'
      })
    },
    onError: (error) => {
      notifications.show({
        title: 'Import Failed',
        description: error instanceof Error ? error.message : 'Failed to import configuration',
        level: 'error'
      })
    }
  })
}

export const useExportConfiguration = () => {
  const notifications = useNotifications()

  return useMutation({
    mutationFn: () => configRPC.exportConfig(),
    onSuccess: () => {
      notifications.show({
        title: 'Configuration Exported',
        description: 'Configuration has been successfully exported',
        level: 'success'
      })
    },
    onError: (error) => {
      notifications.show({
        title: 'Export Failed',
        description: error instanceof Error ? error.message : 'Failed to export configuration',
        level: 'error'
      })
    }
  })
}