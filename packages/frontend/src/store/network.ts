import { create } from 'zustand'
import { subscribeWithSelector } from 'zustand/middleware'
import { immer } from 'zustand/middleware/immer'
import type { Device } from '@nmapper/shared'

export interface NetworkState {
  // Device management
  selectedDevices: Set<string>
  deviceFilters: {
    isActive?: boolean
    riskLevel?: 'low' | 'medium' | 'high'
    deviceType?: string
    subnet?: string
    searchTerm?: string
  }
  
  // Scan state
  isScanning: boolean
  scanProgress: number
  scanStage: string
  currentScanId: string | null
  scanErrors: string[]
  
  // Network topology
  topologyLayout: 'force' | 'grid' | 'circle' | 'tree'
  topologyZoom: number
  topologyCenter: { x: number; y: number }
  selectedNodes: Set<string>
  
  // Real-time state
  liveUpdates: boolean
  lastUpdateTime: Date | null
  recentlyChangedDevices: Set<string>
  
  // Actions
  setSelectedDevices: (devices: Set<string>) => void
  toggleDeviceSelection: (deviceIp: string) => void
  clearDeviceSelection: () => void
  setDeviceFilters: (filters: Partial<NetworkState['deviceFilters']>) => void
  resetDeviceFilters: () => void
  
  setScanning: (isScanning: boolean) => void
  setScanProgress: (progress: number) => void
  setScanStage: (stage: string) => void
  setScanId: (scanId: string | null) => void
  addScanError: (error: string) => void
  clearScanErrors: () => void
  
  setTopologyLayout: (layout: NetworkState['topologyLayout']) => void
  setTopologyZoom: (zoom: number) => void
  setTopologyCenter: (center: { x: number; y: number }) => void
  setSelectedNodes: (nodes: Set<string>) => void
  toggleNodeSelection: (nodeId: string) => void
  
  setLiveUpdates: (enabled: boolean) => void
  markDeviceChanged: (deviceIp: string) => void
  clearRecentChanges: () => void
  
  reset: () => void
}

const initialState = {
  selectedDevices: new Set<string>(),
  deviceFilters: {},
  
  isScanning: false,
  scanProgress: 0,
  scanStage: 'idle',
  currentScanId: null,
  scanErrors: [],
  
  topologyLayout: 'force' as const,
  topologyZoom: 1,
  topologyCenter: { x: 0, y: 0 },
  selectedNodes: new Set<string>(),
  
  liveUpdates: true,
  lastUpdateTime: null,
  recentlyChangedDevices: new Set<string>(),
}

export const useNetworkStore = create<NetworkState>()(
  subscribeWithSelector(
    immer((set, get) => ({
      ...initialState,

      // Device management actions
      setSelectedDevices: (devices) =>
        set((state) => {
          state.selectedDevices = devices
        }),

      toggleDeviceSelection: (deviceIp) =>
        set((state) => {
          if (state.selectedDevices.has(deviceIp)) {
            state.selectedDevices.delete(deviceIp)
          } else {
            state.selectedDevices.add(deviceIp)
          }
        }),

      clearDeviceSelection: () =>
        set((state) => {
          state.selectedDevices.clear()
        }),

      setDeviceFilters: (filters) =>
        set((state) => {
          state.deviceFilters = { ...state.deviceFilters, ...filters }
        }),

      resetDeviceFilters: () =>
        set((state) => {
          state.deviceFilters = {}
        }),

      // Scan state actions
      setScanning: (isScanning) =>
        set((state) => {
          state.isScanning = isScanning
          if (!isScanning) {
            state.scanProgress = 0
            state.scanStage = 'idle'
          }
        }),

      setScanProgress: (progress) =>
        set((state) => {
          state.scanProgress = progress
          state.lastUpdateTime = new Date()
        }),

      setScanStage: (stage) =>
        set((state) => {
          state.scanStage = stage
          state.lastUpdateTime = new Date()
        }),

      setScanId: (scanId) =>
        set((state) => {
          state.currentScanId = scanId
        }),

      addScanError: (error) =>
        set((state) => {
          state.scanErrors.push(error)
        }),

      clearScanErrors: () =>
        set((state) => {
          state.scanErrors = []
        }),

      // Topology actions
      setTopologyLayout: (layout) =>
        set((state) => {
          state.topologyLayout = layout
        }),

      setTopologyZoom: (zoom) =>
        set((state) => {
          state.topologyZoom = Math.max(0.1, Math.min(3, zoom))
        }),

      setTopologyCenter: (center) =>
        set((state) => {
          state.topologyCenter = center
        }),

      setSelectedNodes: (nodes) =>
        set((state) => {
          state.selectedNodes = nodes
        }),

      toggleNodeSelection: (nodeId) =>
        set((state) => {
          if (state.selectedNodes.has(nodeId)) {
            state.selectedNodes.delete(nodeId)
          } else {
            state.selectedNodes.add(nodeId)
          }
        }),

      // Real-time actions
      setLiveUpdates: (enabled) =>
        set((state) => {
          state.liveUpdates = enabled
          if (enabled) {
            state.lastUpdateTime = new Date()
          }
        }),

      markDeviceChanged: (deviceIp) =>
        set((state) => {
          state.recentlyChangedDevices.add(deviceIp)
          state.lastUpdateTime = new Date()
        }),

      clearRecentChanges: () =>
        set((state) => {
          state.recentlyChangedDevices.clear()
        }),

      reset: () =>
        set((state) => {
          Object.assign(state, {
            ...initialState,
            selectedDevices: new Set(),
            selectedNodes: new Set(),
            recentlyChangedDevices: new Set(),
          })
        }),
    }))
  )
)

// Selectors for computed values
export const networkSelectors = {
  getFilteredDeviceCount: (devices: Device[], filters: NetworkState['deviceFilters']) => {
    return devices.filter(device => {
      if (filters.isActive !== undefined && device.isActive !== filters.isActive) {
        return false
      }
      if (filters.riskLevel && device.riskLevel !== filters.riskLevel) {
        return false
      }
      if (filters.deviceType && device.deviceType !== filters.deviceType) {
        return false
      }
      if (filters.subnet && !device.ip.startsWith(filters.subnet)) {
        return false
      }
      if (filters.searchTerm) {
        const searchLower = filters.searchTerm.toLowerCase()
        const matchesIp = device.ip.toLowerCase().includes(searchLower)
        const matchesHostname = device.hostname?.toLowerCase().includes(searchLower)
        const matchesMac = device.macAddress?.toLowerCase().includes(searchLower)
        if (!matchesIp && !matchesHostname && !matchesMac) {
          return false
        }
      }
      return true
    }).length
  },

  getSelectedDeviceIps: (state: NetworkState) => {
    return Array.from(state.selectedDevices)
  },

  getSelectedNodeIds: (state: NetworkState) => {
    return Array.from(state.selectedNodes)
  },

  getRecentlyChangedDeviceIps: (state: NetworkState) => {
    return Array.from(state.recentlyChangedDevices)
  },

  getScanStatusText: (state: NetworkState) => {
    if (!state.isScanning) {
      return state.currentScanId ? 'Scan completed' : 'No active scan'
    }
    
    const stageTexts: Record<string, string> = {
      'idle': 'Idle',
      'initializing': 'Initializing...',
      'discovery': 'Discovering devices...',
      'port_scan': 'Scanning ports...',
      'service_detection': 'Detecting services...',
      'os_detection': 'Identifying OS...',
      'vulnerability_scan': 'Checking vulnerabilities...',
      'finalizing': 'Finalizing results...',
    }
    
    return stageTexts[state.scanStage] || state.scanStage
  },

  getTopologyTransform: (state: NetworkState) => {
    return `translate(${state.topologyCenter.x}, ${state.topologyCenter.y}) scale(${state.topologyZoom})`
  }
}

// Subscriptions for side effects
useNetworkStore.subscribe(
  (state) => state.recentlyChangedDevices.size,
  (size, previousSize) => {
    // Clear recent changes after 5 minutes
    if (size > 0 && size !== previousSize) {
      setTimeout(() => {
        const currentSize = useNetworkStore.getState().recentlyChangedDevices.size
        if (currentSize === size) {
          useNetworkStore.getState().clearRecentChanges()
        }
      }, 5 * 60 * 1000) // 5 minutes
    }
  }
)

useNetworkStore.subscribe(
  (state) => state.scanErrors.length,
  (errorCount) => {
    // Clear scan errors after scan completion
    if (errorCount > 0 && !useNetworkStore.getState().isScanning) {
      setTimeout(() => {
        if (!useNetworkStore.getState().isScanning) {
          useNetworkStore.getState().clearScanErrors()
        }
      }, 30000) // 30 seconds
    }
  }
)