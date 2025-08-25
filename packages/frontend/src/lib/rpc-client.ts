import type { 
  Device, 
  NetworkSnapshot, 
  SnapshotDiff, 
  SystemStatus,
  Configuration 
} from '@nmapper/shared'

// Base RPC client configuration
const RPC_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001'

// Error classes for RPC operations
export class RPCError extends Error {
  constructor(
    message: string,
    public status?: number,
    public code?: string,
    public details?: any
  ) {
    super(message)
    this.name = 'RPCError'
  }
}

export class NetworkError extends RPCError {
  constructor(message: string = 'Network connection failed') {
    super(message, 0, 'NETWORK_ERROR')
    this.name = 'NetworkError'
  }
}

export class ValidationError extends RPCError {
  constructor(message: string, details?: any) {
    super(message, 400, 'VALIDATION_ERROR', details)
    this.name = 'ValidationError'
  }
}

// RPC request/response types
interface RPCRequest {
  method: string
  params?: any
  id: string | number
}

interface RPCResponse<T = any> {
  id: string | number
  result?: T
  error?: {
    code: number
    message: string
    data?: any
  }
}

interface RPCBatchResponse<T = any> {
  responses: RPCResponse<T>[]
}

// Generic RPC client
class RPCClient {
  private baseUrl: string
  private timeout: number
  private defaultHeaders: Record<string, string>

  constructor(baseUrl: string = RPC_BASE_URL, timeout: number = 30000) {
    this.baseUrl = baseUrl.replace(/\/+$/, '') // Remove trailing slashes
    this.timeout = timeout
    this.defaultHeaders = {
      'Content-Type': 'application/json',
      'Accept': 'application/json'
    }
  }

  // Single RPC call
  async call<T = any>(method: string, params?: any): Promise<T> {
    const id = Date.now() + Math.random()
    
    const request: RPCRequest = {
      method,
      params,
      id
    }

    try {
      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), this.timeout)

      const response = await fetch(`${this.baseUrl}/rpc`, {
        method: 'POST',
        headers: this.defaultHeaders,
        body: JSON.stringify(request),
        signal: controller.signal
      })

      clearTimeout(timeoutId)

      if (!response.ok) {
        throw new RPCError(
          `HTTP ${response.status}: ${response.statusText}`,
          response.status
        )
      }

      const rpcResponse: RPCResponse<T> = await response.json()

      if (rpcResponse.error) {
        throw new RPCError(
          rpcResponse.error.message,
          rpcResponse.error.code,
          'RPC_ERROR',
          rpcResponse.error.data
        )
      }

      return rpcResponse.result!
    } catch (error) {
      if (error instanceof RPCError) {
        throw error
      }
      
      if (error instanceof TypeError || error.name === 'AbortError') {
        throw new NetworkError('Failed to connect to server')
      }

      throw new RPCError(
        error instanceof Error ? error.message : 'Unknown RPC error',
        500,
        'UNKNOWN_ERROR'
      )
    }
  }

  // Batch RPC calls
  async batchCall<T = any>(calls: Array<{ method: string; params?: any }>): Promise<T[]> {
    const requests: RPCRequest[] = calls.map((call, index) => ({
      method: call.method,
      params: call.params,
      id: `batch_${Date.now()}_${index}`
    }))

    try {
      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), this.timeout)

      const response = await fetch(`${this.baseUrl}/rpc/batch`, {
        method: 'POST',
        headers: this.defaultHeaders,
        body: JSON.stringify(requests),
        signal: controller.signal
      })

      clearTimeout(timeoutId)

      if (!response.ok) {
        throw new RPCError(
          `HTTP ${response.status}: ${response.statusText}`,
          response.status
        )
      }

      const batchResponse: RPCBatchResponse<T> = await response.json()
      const results: T[] = []

      for (const rpcResponse of batchResponse.responses) {
        if (rpcResponse.error) {
          throw new RPCError(
            rpcResponse.error.message,
            rpcResponse.error.code,
            'RPC_ERROR',
            rpcResponse.error.data
          )
        }
        results.push(rpcResponse.result!)
      }

      return results
    } catch (error) {
      if (error instanceof RPCError) {
        throw error
      }
      
      if (error instanceof TypeError || error.name === 'AbortError') {
        throw new NetworkError('Failed to connect to server')
      }

      throw new RPCError(
        error instanceof Error ? error.message : 'Unknown batch RPC error',
        500,
        'UNKNOWN_ERROR'
      )
    }
  }

  // REST-style GET requests
  async get<T = any>(path: string, params?: Record<string, any>): Promise<T> {
    const url = new URL(`${this.baseUrl}/api${path}`)
    
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          url.searchParams.set(key, String(value))
        }
      })
    }

    try {
      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), this.timeout)

      const response = await fetch(url.toString(), {
        method: 'GET',
        headers: { ...this.defaultHeaders, 'Content-Type': 'application/json' },
        signal: controller.signal
      })

      clearTimeout(timeoutId)

      if (!response.ok) {
        throw new RPCError(
          `HTTP ${response.status}: ${response.statusText}`,
          response.status
        )
      }

      return await response.json()
    } catch (error) {
      if (error instanceof RPCError) {
        throw error
      }
      
      if (error instanceof TypeError || error.name === 'AbortError') {
        throw new NetworkError('Failed to connect to server')
      }

      throw new RPCError(
        error instanceof Error ? error.message : 'Unknown GET error',
        500,
        'UNKNOWN_ERROR'
      )
    }
  }

  // REST-style POST requests
  async post<T = any>(path: string, data?: any): Promise<T> {
    try {
      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), this.timeout)

      const response = await fetch(`${this.baseUrl}/api${path}`, {
        method: 'POST',
        headers: this.defaultHeaders,
        body: data ? JSON.stringify(data) : undefined,
        signal: controller.signal
      })

      clearTimeout(timeoutId)

      if (!response.ok) {
        throw new RPCError(
          `HTTP ${response.status}: ${response.statusText}`,
          response.status
        )
      }

      return await response.json()
    } catch (error) {
      if (error instanceof RPCError) {
        throw error
      }
      
      if (error instanceof TypeError || error.name === 'AbortError') {
        throw new NetworkError('Failed to connect to server')
      }

      throw new RPCError(
        error instanceof Error ? error.message : 'Unknown POST error',
        500,
        'UNKNOWN_ERROR'
      )
    }
  }
}

// Create singleton RPC client instance
export const rpcClient = new RPCClient()

// Network operations
export const networkRPC = {
  // Get current network status
  getStatus: (): Promise<SystemStatus> => 
    rpcClient.call('network.getStatus'),

  // Start network scan
  startScan: (options?: { 
    targets?: string[]
    scanType?: 'quick' | 'comprehensive' | 'custom'
    ports?: string
    timing?: 'paranoid' | 'sneaky' | 'polite' | 'normal' | 'aggressive' | 'insane'
  }): Promise<{ scanId: string }> => 
    rpcClient.call('network.startScan', options),

  // Stop current scan
  stopScan: (): Promise<{ success: boolean }> => 
    rpcClient.call('network.stopScan'),

  // Get scan progress
  getScanProgress: (): Promise<{
    scanId: string | null
    isScanning: boolean
    progress: number
    stage: string
    devicesFound: number
    portsScanned: number
    errors: string[]
  }> => 
    rpcClient.call('network.getScanProgress'),

  // Get discovered devices
  getDevices: (filters?: {
    isActive?: boolean
    riskLevel?: 'low' | 'medium' | 'high'
    deviceType?: string
    subnet?: string
  }): Promise<Device[]> => 
    rpcClient.call('network.getDevices', filters),

  // Get specific device details
  getDevice: (ip: string): Promise<Device | null> => 
    rpcClient.call('network.getDevice', { ip }),

  // Update device information
  updateDevice: (ip: string, updates: Partial<Device>): Promise<Device> => 
    rpcClient.call('network.updateDevice', { ip, updates }),

  // Remove device from monitoring
  removeDevice: (ip: string): Promise<{ success: boolean }> => 
    rpcClient.call('network.removeDevice', { ip }),

  // Get network topology data
  getTopology: (): Promise<{
    nodes: Array<{
      id: string
      label: string
      type: 'device' | 'network' | 'gateway'
      status: 'online' | 'offline' | 'unknown'
      riskLevel: 'low' | 'medium' | 'high'
      x?: number
      y?: number
    }>
    edges: Array<{
      source: string
      target: string
      type: 'connection' | 'route'
      strength: number
    }>
  }> => 
    rpcClient.call('network.getTopology')
}

// Snapshot operations  
export const snapshotRPC = {
  // Get all snapshots
  getSnapshots: (limit?: number, offset?: number): Promise<NetworkSnapshot[]> => 
    rpcClient.call('snapshots.getSnapshots', { limit, offset }),

  // Get specific snapshot
  getSnapshot: (id: string): Promise<NetworkSnapshot | null> => 
    rpcClient.call('snapshots.getSnapshot', { id }),

  // Create new snapshot
  createSnapshot: (description?: string): Promise<NetworkSnapshot> => 
    rpcClient.call('snapshots.createSnapshot', { description }),

  // Delete snapshot
  deleteSnapshot: (id: string): Promise<{ success: boolean }> => 
    rpcClient.call('snapshots.deleteSnapshot', { id }),

  // Compare two snapshots
  compareSnapshots: (snapshotId1: string, snapshotId2: string): Promise<SnapshotDiff> => 
    rpcClient.call('snapshots.compareSnapshots', { snapshotId1, snapshotId2 }),

  // Get recent changes
  getRecentChanges: (limit?: number, hours?: number): Promise<Array<{
    timestamp: Date
    changeType: 'device_added' | 'device_removed' | 'device_updated' | 'port_changed' | 'service_changed'
    deviceId: string
    description: string
    severity: 'low' | 'medium' | 'high'
  }>> => 
    rpcClient.call('snapshots.getRecentChanges', { limit, hours })
}

// System operations
export const systemRPC = {
  // Get system health
  getHealth: (): Promise<{
    status: 'healthy' | 'warning' | 'critical'
    uptime: number
    cpu: { usage: number; temperature?: number; cores: number }
    memory: { used: number; total: number; usage: number }
    disk: { used: number; total: number; usage: number }
    services: {
      database: 'healthy' | 'warning' | 'critical'
      scanner: 'healthy' | 'warning' | 'critical'
      websocket: 'healthy' | 'warning' | 'critical'
      api: 'healthy' | 'warning' | 'critical'
    }
  }> => 
    rpcClient.call('system.getHealth'),

  // Get system logs
  getLogs: (level?: 'debug' | 'info' | 'warn' | 'error', limit?: number): Promise<Array<{
    timestamp: Date
    level: 'debug' | 'info' | 'warn' | 'error'
    message: string
    module: string
    metadata?: any
  }>> => 
    rpcClient.call('system.getLogs', { level, limit }),

  // Get system statistics
  getStatistics: (): Promise<{
    totalDevices: number
    activeDevices: number
    totalScans: number
    lastScanTime: Date | null
    totalSnapshots: number
    databaseSize: number
    networkUtilization: number
    alertCount: number
  }> => 
    rpcClient.call('system.getStatistics')
}

// Configuration operations
export const configRPC = {
  // Get current configuration
  getConfig: (): Promise<Configuration> => 
    rpcClient.call('config.getConfig'),

  // Update configuration
  updateConfig: (updates: Partial<Configuration>): Promise<Configuration> => 
    rpcClient.call('config.updateConfig', { updates }),

  // Reset configuration to defaults
  resetConfig: (): Promise<Configuration> => 
    rpcClient.call('config.resetConfig'),

  // Validate configuration
  validateConfig: (config: Partial<Configuration>): Promise<{
    isValid: boolean
    errors: Array<{
      field: string
      message: string
    }>
  }> => 
    rpcClient.call('config.validateConfig', { config }),

  // Export configuration
  exportConfig: (): Promise<{ config: Configuration; exportedAt: Date }> => 
    rpcClient.call('config.exportConfig'),

  // Import configuration
  importConfig: (config: Configuration): Promise<Configuration> => 
    rpcClient.call('config.importConfig', { config })
}

// Utility functions for error handling
export const isRPCError = (error: unknown): error is RPCError => {
  return error instanceof RPCError
}

export const isNetworkError = (error: unknown): error is NetworkError => {
  return error instanceof NetworkError
}

export const isValidationError = (error: unknown): error is ValidationError => {
  return error instanceof ValidationError
}

// Helper to retry RPC calls
export const withRetry = async <T>(
  operation: () => Promise<T>,
  maxRetries: number = 3,
  delayMs: number = 1000
): Promise<T> => {
  let lastError: Error

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await operation()
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error))
      
      // Don't retry validation errors
      if (isValidationError(error)) {
        throw error
      }

      // If this is the last attempt, throw the error
      if (attempt === maxRetries) {
        break
      }

      // Wait before retrying
      await new Promise(resolve => setTimeout(resolve, delayMs * attempt))
    }
  }

  throw lastError!
}

// Batch operations helper
export const batchNetworkOperations = {
  // Get devices and system status in one call
  getOverview: (): Promise<[Device[], SystemStatus]> => 
    rpcClient.batchCall([
      { method: 'network.getDevices' },
      { method: 'network.getStatus' }
    ]),

  // Get snapshots and recent changes
  getSnapshotOverview: (): Promise<[NetworkSnapshot[], SnapshotDiff[]]> => 
    rpcClient.batchCall([
      { method: 'snapshots.getSnapshots', params: { limit: 10 } },
      { method: 'snapshots.getRecentChanges', params: { limit: 20 } }
    ]),

  // Get system health and statistics
  getSystemOverview: (): Promise<[SystemStatus, any]> => 
    rpcClient.batchCall([
      { method: 'system.getHealth' },
      { method: 'system.getStatistics' }
    ])
}