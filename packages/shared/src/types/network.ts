// Core network device interfaces

export interface Device {
  ip: string
  mac: string
  hostname?: string
  vendor?: string
  osInfo?: OSInfo
  responseTime?: number
  ports: Port[]
  services: Service[]
  lastSeen: Date
  isActive: boolean
}

export interface Port {
  number: number
  protocol: 'tcp' | 'udp'
  state: 'open' | 'closed' | 'filtered'
  service?: string
  version?: string
  product?: string
}

export interface Service {
  port: number
  name: string
  product?: string
  version?: string
  extraInfo?: string
  confidence: number
}

export interface OSInfo {
  name?: string
  family?: string
  generation?: string
  type?: string
  vendor?: string
  accuracy: number
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