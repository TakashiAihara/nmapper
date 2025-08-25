import { create } from 'zustand'
import { devtools } from 'zustand/middleware'

export interface AppState {
  // Network scanning state
  isScanning: boolean
  scanProgress: number
  lastScanTime: Date | null
  
  // Selected entities
  selectedDevices: string[] // IP addresses
  selectedSnapshot: string | null
  
  // Filtering and search
  deviceFilter: {
    search: string
    status: 'all' | 'up' | 'down' | 'unknown'
    riskLevel: 'all' | 'low' | 'medium' | 'high'
    deviceType: 'all' | string
  }
  
  snapshotFilter: {
    search: string
    dateRange: {
      start: Date | null
      end: Date | null
    }
  }
  
  // Comparison state
  comparisonMode: boolean
  comparisonSnapshots: [string | null, string | null]
  
  // Real-time updates
  realTimeUpdates: boolean
  
  // Actions
  setScanning: (scanning: boolean) => void
  setScanProgress: (progress: number) => void
  setLastScanTime: (time: Date) => void
  
  setSelectedDevices: (devices: string[]) => void
  addSelectedDevice: (device: string) => void
  removeSelectedDevice: (device: string) => void
  clearSelectedDevices: () => void
  
  setSelectedSnapshot: (snapshot: string | null) => void
  
  setDeviceFilter: (filter: Partial<AppState['deviceFilter']>) => void
  resetDeviceFilter: () => void
  
  setSnapshotFilter: (filter: Partial<AppState['snapshotFilter']>) => void
  resetSnapshotFilter: () => void
  
  setComparisonMode: (enabled: boolean) => void
  setComparisonSnapshots: (snapshots: [string | null, string | null]) => void
  
  setRealTimeUpdates: (enabled: boolean) => void
  
  reset: () => void
}

const initialDeviceFilter = {
  search: '',
  status: 'all' as const,
  riskLevel: 'all' as const,
  deviceType: 'all' as const,
}

const initialSnapshotFilter = {
  search: '',
  dateRange: {
    start: null,
    end: null,
  },
}

const initialState = {
  isScanning: false,
  scanProgress: 0,
  lastScanTime: null,
  selectedDevices: [],
  selectedSnapshot: null,
  deviceFilter: initialDeviceFilter,
  snapshotFilter: initialSnapshotFilter,
  comparisonMode: false,
  comparisonSnapshots: [null, null] as [string | null, string | null],
  realTimeUpdates: true,
}

export const useAppStore = create<AppState>()(
  devtools(
    (set, get) => ({
      ...initialState,
      
      setScanning: (scanning) => set({ isScanning: scanning }),
      
      setScanProgress: (progress) => set({ scanProgress: Math.max(0, Math.min(100, progress)) }),
      
      setLastScanTime: (time) => set({ lastScanTime: time }),
      
      setSelectedDevices: (devices) => set({ selectedDevices: devices }),
      
      addSelectedDevice: (device) =>
        set((state) => ({
          selectedDevices: state.selectedDevices.includes(device)
            ? state.selectedDevices
            : [...state.selectedDevices, device],
        })),
      
      removeSelectedDevice: (device) =>
        set((state) => ({
          selectedDevices: state.selectedDevices.filter((d) => d !== device),
        })),
      
      clearSelectedDevices: () => set({ selectedDevices: [] }),
      
      setSelectedSnapshot: (snapshot) => set({ selectedSnapshot: snapshot }),
      
      setDeviceFilter: (filter) =>
        set((state) => ({
          deviceFilter: { ...state.deviceFilter, ...filter },
        })),
      
      resetDeviceFilter: () => set({ deviceFilter: initialDeviceFilter }),
      
      setSnapshotFilter: (filter) =>
        set((state) => ({
          snapshotFilter: {
            ...state.snapshotFilter,
            ...filter,
            dateRange: filter.dateRange
              ? { ...state.snapshotFilter.dateRange, ...filter.dateRange }
              : state.snapshotFilter.dateRange,
          },
        })),
      
      resetSnapshotFilter: () => set({ snapshotFilter: initialSnapshotFilter }),
      
      setComparisonMode: (enabled) =>
        set({
          comparisonMode: enabled,
          comparisonSnapshots: enabled ? get().comparisonSnapshots : [null, null],
        }),
      
      setComparisonSnapshots: (snapshots) => set({ comparisonSnapshots: snapshots }),
      
      setRealTimeUpdates: (enabled) => set({ realTimeUpdates: enabled }),
      
      reset: () => set(initialState),
    }),
    {
      name: 'App Store',
    }
  )
)