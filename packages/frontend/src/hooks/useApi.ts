import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { apiClient } from '../lib/api'

// Query keys for consistent cache management
export const queryKeys = {
  network: {
    current: ['network', 'current'] as const,
    history: (limit?: number) => ['network', 'history', limit] as const,
    devices: ['network', 'devices'] as const,
    device: (ip: string) => ['network', 'device', ip] as const,
    topology: ['network', 'topology'] as const,
    stats: ['network', 'stats'] as const,
  },
  snapshots: {
    all: (limit?: number) => ['snapshots', limit] as const,
    detail: (id: string) => ['snapshots', id] as const,
    compare: (id1: string, id2: string) => ['snapshots', 'compare', id1, id2] as const,
  },
  system: {
    status: ['system', 'status'] as const,
    health: ['system', 'health'] as const,
    metrics: ['system', 'metrics'] as const,
  },
  config: {
    current: ['config'] as const,
  },
} as const

// Network hooks
export function useCurrentNetwork() {
  return useQuery({
    queryKey: queryKeys.network.current,
    queryFn: () => apiClient.getCurrentNetwork(),
    refetchInterval: 30000, // Refresh every 30 seconds
  })
}

export function useNetworkHistory(limit?: number) {
  return useQuery({
    queryKey: queryKeys.network.history(limit),
    queryFn: () => apiClient.getNetworkHistory(limit),
  })
}

export function useDevices() {
  return useQuery({
    queryKey: queryKeys.network.devices,
    queryFn: () => apiClient.getDevices(),
    refetchInterval: 60000, // Refresh every minute
  })
}

export function useDevice(ip: string) {
  return useQuery({
    queryKey: queryKeys.network.device(ip),
    queryFn: () => apiClient.getDevice(ip),
    enabled: !!ip,
  })
}

export function useNetworkTopology() {
  return useQuery({
    queryKey: queryKeys.network.topology,
    queryFn: () => apiClient.getNetworkTopology(),
  })
}

export function useNetworkStats() {
  return useQuery({
    queryKey: queryKeys.network.stats,
    queryFn: () => apiClient.getNetworkStats(),
    refetchInterval: 30000,
  })
}

// Snapshot hooks
export function useSnapshots(limit?: number) {
  return useQuery({
    queryKey: queryKeys.snapshots.all(limit),
    queryFn: () => apiClient.getSnapshots(limit),
  })
}

export function useSnapshot(id: string) {
  return useQuery({
    queryKey: queryKeys.snapshots.detail(id),
    queryFn: () => apiClient.getSnapshot(id),
    enabled: !!id,
  })
}

export function useCompareSnapshots(id1: string, id2: string) {
  return useQuery({
    queryKey: queryKeys.snapshots.compare(id1, id2),
    queryFn: () => apiClient.compareSnapshots(id1, id2),
    enabled: !!(id1 && id2),
  })
}

export function useDeleteSnapshot() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (id: string) => apiClient.deleteSnapshot(id),
    onSuccess: () => {
      // Invalidate and refetch snapshots
      queryClient.invalidateQueries({ queryKey: ['snapshots'] })
    },
  })
}

// System hooks
export function useSystemStatus() {
  return useQuery({
    queryKey: queryKeys.system.status,
    queryFn: () => apiClient.getSystemStatus(),
    refetchInterval: 10000, // Refresh every 10 seconds
  })
}

export function useSystemHealth() {
  return useQuery({
    queryKey: queryKeys.system.health,
    queryFn: () => apiClient.getSystemHealth(),
    refetchInterval: 30000,
  })
}

export function useSystemMetrics() {
  return useQuery({
    queryKey: queryKeys.system.metrics,
    queryFn: () => apiClient.getSystemMetrics(),
    refetchInterval: 15000,
  })
}

// Scan operations
export function useStartScan() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: () => apiClient.startScan(),
    onSuccess: () => {
      // Invalidate network and system data after scan starts
      queryClient.invalidateQueries({ queryKey: ['network'] })
      queryClient.invalidateQueries({ queryKey: ['system'] })
    },
  })
}

export function useStopScan() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: () => apiClient.stopScan(),
    onSuccess: () => {
      // Invalidate system data after scan stops
      queryClient.invalidateQueries({ queryKey: ['system'] })
    },
  })
}

// Config hooks
export function useConfig() {
  return useQuery({
    queryKey: queryKeys.config.current,
    queryFn: () => apiClient.getConfig(),
  })
}

export function useUpdateConfig() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (config: any) => apiClient.updateConfig(config),
    onSuccess: () => {
      // Invalidate config after update
      queryClient.invalidateQueries({ queryKey: queryKeys.config.current })
    },
  })
}

export function useResetConfig() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: () => apiClient.resetConfig(),
    onSuccess: () => {
      // Invalidate config after reset
      queryClient.invalidateQueries({ queryKey: queryKeys.config.current })
    },
  })
}

// Export snapshot functionality
export function useExportSnapshot() {
  return useMutation({
    mutationFn: ({ id, format }: { id: string; format: 'json' | 'csv' }) =>
      apiClient.exportSnapshot(id, format),
    onSuccess: (blob, { format }) => {
      // Download the exported file
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `snapshot-export.${format}`
      document.body.appendChild(a)
      a.click()
      window.URL.revokeObjectURL(url)
      document.body.removeChild(a)
    },
  })
}