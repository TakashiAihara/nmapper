// Core network device interfaces

export interface Device {
  ip: string
  mac?: string
  hostname?: string
  vendor?: string
  deviceType?: string
  osInfo?: OSInfo
  responseTime?: number
  ports?: Port[]
  services?: Service[]
  lastSeen: Date
  uptimeSeconds?: number
  isActive: boolean
  riskLevel?: 'low' | 'medium' | 'high'
  notes?: string
  fingerprint?: string
}

export interface Port {
  number: number
  protocol: 'tcp' | 'udp'
  state: 'open' | 'closed' | 'filtered'
  serviceName?: string
  serviceVersion?: string
  banner?: string
  tunnel?: string
  method?: string
  confidence?: number
}

export interface Service {
  port: number
  name: string
  protocol: 'tcp' | 'udp'
  product?: string
  version?: string
  extraInfo?: string
  confidence?: number
}

export interface OSInfo {
  name?: string
  version?: string
  family?: string
  generation?: string
  type?: string
  vendor?: string
  accuracy?: number
}

// Network topology and mapping
export interface NetworkTopology {
  devices: TopologyDevice[]
  connections: NetworkConnection[]
  subnets: SubnetInfo[]
}

export interface TopologyDevice extends Device {
  position?: { x: number; y: number }
  category: 'server' | 'workstation' | 'mobile' | 'iot' | 'network' | 'unknown'
  riskLevel: 'low' | 'medium' | 'high'
}

export interface NetworkConnection {
  fromDevice: string
  toDevice: string
  connectionType: 'direct' | 'routed'
  latency?: number
}

export interface SubnetInfo {
  network: string
  mask: string
  deviceCount: number
  activeDevices: number
}

// Monitoring service types
export interface MonitoringMetrics {
  uptime: number
  totalScans: number
  totalDevices: number
  activeSchedules: number
  lastScanTime?: number
  scanErrors: number
  averageScanDuration: number
}

export interface HealthStatus {
  status: 'healthy' | 'degraded' | 'unhealthy'
  timestamp: number
  components: ComponentHealth[]
}

export interface ComponentHealth {
  name: string
  healthy: boolean
  status: string
  lastCheck?: number
  message?: string
}

export interface ScanRequest {
  networkRange: string
  scanType?: 'discovery' | 'comprehensive' | 'quick'
  ports?: string
  timeout?: number
}