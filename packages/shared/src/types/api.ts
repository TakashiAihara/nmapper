import type { NetworkSnapshot, SnapshotDiff, DeviceHistoryEntry } from './snapshot.js'
import type { Device } from './network.js'

// API response and request types

export interface TimeRange {
  start: Date
  end: Date
}

export interface ScanResult {
  snapshotId: string
  startTime: Date
  endTime?: Date
  devicesFound: Device[]
  totalPorts: number
  diff?: SnapshotDiff
  errors: string[]
  status: 'completed' | 'failed' | 'in_progress'
}

export interface NetworkStatus {
  currentSnapshot: NetworkSnapshot
  totalDevices: number
  activeDevices: number
  totalOpenPorts: number
  lastScanTime: Date
  recentChanges: SnapshotDiff[]
  systemHealth: {
    uptime: number
    lastError?: string
    scanFrequency: number
  }
}

export interface SystemStatus {
  isScanning: boolean
  nextScanTime: Date
  totalSnapshots: number
  databaseSize: number
  nmapVersion?: string
  uptime: number
  memoryUsage: NodeJS.MemoryUsage
}

// RPC method types
export interface RPCMethods {
  // Network data methods
  getCurrentNetwork: () => Promise<NetworkSnapshot | null>
  getNetworkHistory: (params: { timeRange?: TimeRange; limit?: number }) => Promise<NetworkSnapshot[]>
  getDevice: (params: { ip: string }) => Promise<Device | null>
  getDeviceHistory: (params: { ip: string }) => Promise<DeviceHistoryEntry[]>
  
  // Snapshot comparison methods
  compareSnapshots: (params: { snapshot1: string; snapshot2: string }) => Promise<SnapshotDiff>
  getRecentChanges: (params: { hours?: number }) => Promise<SnapshotDiff[]>
  
  // System control methods
  triggerScan: () => Promise<ScanResult>
  getSystemStatus: () => Promise<SystemStatus>
  
  // Configuration methods
  getConfig: () => Promise<any>
  updateConfig: (params: { config: any }) => Promise<void>
}

// Error types
export interface APIError {
  code: string
  message: string
  details?: Record<string, unknown>
}

export interface ValidationError extends APIError {
  code: 'VALIDATION_ERROR'
  fieldErrors: Record<string, string[]>
}

// Pagination types
export interface PaginationParams {
  page?: number
  limit?: number
  sortBy?: string
  sortOrder?: 'asc' | 'desc'
}

export interface PaginatedResponse<T> {
  data: T[]
  pagination: {
    page: number
    limit: number
    total: number
    totalPages: number
    hasNext: boolean
    hasPrev: boolean
  }
}

// Filter types for queries
export interface DeviceFilters {
  isActive?: boolean
  hasOpenPorts?: boolean
  osFamily?: string
  vendor?: string
  ipRange?: string
}

export interface SnapshotFilters {
  dateFrom?: Date
  dateTo?: Date
  minDevices?: number
  maxDevices?: number
}