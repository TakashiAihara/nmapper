import { hc } from 'hono/client'
import type { NetworkStatus, Device, SystemStatus } from '@nmapper/shared'

// Define basic Snapshot type since it's not exported from shared
interface Snapshot {
  id: string
  timestamp: Date
  devices: Device[]
  metadata?: Record<string, unknown>
}

// API base URL - will be proxied through Vite dev server
const API_BASE_URL = '/api'

// HTTP client for REST endpoints
class ApiClient {
  private baseUrl: string

  constructor(baseUrl: string = API_BASE_URL) {
    this.baseUrl = baseUrl
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    const url = `${this.baseUrl}${endpoint}`
    
    const response = await fetch(url, {
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
      ...options,
    })

    if (!response.ok) {
      const error = await response.json().catch(() => ({}))
      throw new Error(error.message || `HTTP ${response.status}: ${response.statusText}`)
    }

    return response.json()
  }

  // Network endpoints
  async getCurrentNetwork(): Promise<NetworkStatus> {
    return this.request<NetworkStatus>('/network/current')
  }

  async getNetworkHistory(limit?: number): Promise<Snapshot[]> {
    const params = limit ? `?limit=${limit}` : ''
    return this.request<Snapshot[]>(`/network/history${params}`)
  }

  async getDevices(): Promise<Device[]> {
    return this.request<Device[]>('/network/devices')
  }

  async getDevice(ip: string): Promise<Device> {
    return this.request<Device>(`/network/devices/${encodeURIComponent(ip)}`)
  }

  async getNetworkTopology(): Promise<any> {
    return this.request('/network/topology')
  }

  async getNetworkStats(): Promise<any> {
    return this.request('/network/stats')
  }

  // Snapshot endpoints
  async getSnapshots(limit?: number): Promise<Snapshot[]> {
    const params = limit ? `?limit=${limit}` : ''
    return this.request<Snapshot[]>(`/snapshots${params}`)
  }

  async getSnapshot(id: string): Promise<Snapshot> {
    return this.request<Snapshot>(`/snapshots/${id}`)
  }

  async deleteSnapshot(id: string): Promise<void> {
    await this.request(`/snapshots/${id}`, { method: 'DELETE' })
  }

  async compareSnapshots(snapshot1Id: string, snapshot2Id: string): Promise<any> {
    return this.request(`/snapshots/compare?snapshot1=${snapshot1Id}&snapshot2=${snapshot2Id}`)
  }

  async exportSnapshot(id: string, format: 'json' | 'csv'): Promise<Blob> {
    const response = await fetch(`${this.baseUrl}/snapshots/${id}/export?format=${format}`)
    if (!response.ok) {
      throw new Error(`Failed to export snapshot: ${response.statusText}`)
    }
    return response.blob()
  }

  // System endpoints
  async getSystemStatus(): Promise<SystemStatus> {
    return this.request<SystemStatus>('/system/status')
  }

  async getSystemHealth(): Promise<any> {
    return this.request('/system/health')
  }

  async getSystemMetrics(): Promise<any> {
    return this.request('/system/metrics')
  }

  async startScan(): Promise<{ success: boolean; snapshotId?: string }> {
    return this.request('/system/scan', { method: 'POST' })
  }

  async stopScan(): Promise<{ success: boolean }> {
    return this.request('/system/scan', { method: 'DELETE' })
  }

  // Config endpoints
  async getConfig(): Promise<any> {
    return this.request('/config')
  }

  async updateConfig(config: any): Promise<any> {
    return this.request('/config', {
      method: 'PUT',
      body: JSON.stringify(config),
    })
  }

  async resetConfig(): Promise<any> {
    return this.request('/config/reset', { method: 'POST' })
  }
}

// Create API client instance
export const apiClient = new ApiClient()

// RPC client setup for batch operations
export const rpcClient = hc<any>(API_BASE_URL)