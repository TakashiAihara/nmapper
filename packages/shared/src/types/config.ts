// Configuration interfaces for the monitoring system

export interface MonitorConfig {
  scanInterval: number // milliseconds
  networkRanges: string[]
  nmap: NmapConfig
  database: DatabaseConfig
  webUI: WebUIConfig
  logging: LoggingConfig
}

export interface NmapConfig {
  portRange: string // e.g., "1-1000" or "22,80,443,8080"
  scanType: 'syn' | 'connect' | 'udp' | 'comprehensive'
  serviceDetection: boolean
  osDetection: boolean
  aggressiveMode: boolean
  timeouts: {
    hostTimeout: number
    scanDelay: number
    maxRetries: number
  }
}

export interface DatabaseConfig {
  type: 'postgresql' | 'mongodb'
  postgresql?: {
    host: string
    port: number
    database: string
    username: string
    password: string
    ssl?: boolean
    poolSize?: number
  }
  mongodb?: {
    uri: string
    database: string
    options?: {
      maxPoolSize?: number
      serverSelectionTimeoutMS?: number
    }
  }
  maxSnapshotAge: number // days
  compressionEnabled: boolean
  backupEnabled: boolean
  backupInterval: number // hours
}

export interface WebUIConfig {
  port: number
  host: string
  enableAuth: boolean
  refreshInterval: number // milliseconds
}

export interface LoggingConfig {
  level: 'error' | 'warn' | 'info' | 'debug' | 'trace'
  maxFileSize: string
  maxFiles: number
}

// Scan configuration for runtime
export interface ScanConfig {
  networkRanges: string[]
  portRange?: string
  scanType?: string
  serviceDetection?: boolean
  osDetection?: boolean
  timeout?: number
  fallbackToBasicScan?: boolean
}