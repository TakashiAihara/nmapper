import { z } from 'zod'

// Network range validation helper
const networkRangeSchema = z.string().refine((val) => {
  // CIDR notation (e.g., 192.168.1.0/24)
  const cidrRegex = /^(\d{1,3}\.){3}\d{1,3}\/\d{1,2}$/
  if (cidrRegex.test(val)) {
    const [ip, prefix] = val.split('/')
    const prefixNum = parseInt(prefix, 10)
    return isValidIP(ip) && prefixNum >= 0 && prefixNum <= 32
  }
  
  // Range notation (e.g., 192.168.1.1-192.168.1.254)
  const rangeRegex = /^(\d{1,3}\.){3}\d{1,3}-(\d{1,3}\.){3}\d{1,3}$/
  if (rangeRegex.test(val)) {
    const [startIP, endIP] = val.split('-')
    return isValidIP(startIP) && isValidIP(endIP)
  }
  
  // Single IP
  return isValidIP(val)
}, {
  message: "Invalid network range format"
})

// IP validation helper
function isValidIP(ip: string): boolean {
  const parts = ip.split('.')
  if (parts.length !== 4) return false
  
  return parts.every(part => {
    const num = parseInt(part, 10)
    return !isNaN(num) && num >= 0 && num <= 255
  })
}

// Port range validation helper
const portRangeSchema = z.string().refine((val) => {
  // Single port (e.g., "80")
  if (/^\d+$/.test(val)) {
    const port = parseInt(val, 10)
    return port >= 1 && port <= 65535
  }
  
  // Port range (e.g., "1-1000")
  if (/^\d+-\d+$/.test(val)) {
    const [start, end] = val.split('-').map(p => parseInt(p, 10))
    return start >= 1 && end <= 65535 && start <= end
  }
  
  // Comma-separated ports (e.g., "22,80,443,8080")
  if (val.includes(',')) {
    const ports = val.split(',').map(p => p.trim())
    return ports.every(port => {
      if (/^\d+$/.test(port)) {
        const portNum = parseInt(port, 10)
        return portNum >= 1 && portNum <= 65535
      }
      return false
    })
  }
  
  return false
}, {
  message: "Invalid port range format"
})

// Nmap configuration schema
export const NmapConfigSchema = z.object({
  portRange: portRangeSchema,
  scanType: z.enum(['syn', 'connect', 'udp', 'comprehensive']),
  serviceDetection: z.boolean(),
  osDetection: z.boolean(),
  aggressiveMode: z.boolean(),
  timeouts: z.object({
    hostTimeout: z.number().min(1000), // minimum 1 second
    scanDelay: z.number().min(0),
    maxRetries: z.number().int().min(0).max(10)
  })
})

// Database configuration schemas
export const PostgreSQLConfigSchema = z.object({
  host: z.string().min(1),
  port: z.number().int().min(1).max(65535),
  database: z.string().min(1),
  username: z.string().min(1),
  password: z.string().min(1),
  ssl: z.boolean().optional(),
  poolSize: z.number().int().positive().optional()
})

export const MongoDBConfigSchema = z.object({
  uri: z.string().url(),
  database: z.string().min(1),
  options: z.object({
    maxPoolSize: z.number().int().positive().optional(),
    serverSelectionTimeoutMS: z.number().positive().optional()
  }).optional()
})

export const DatabaseConfigSchema = z.object({
  type: z.enum(['postgresql', 'mongodb']),
  postgresql: PostgreSQLConfigSchema.optional(),
  mongodb: MongoDBConfigSchema.optional(),
  maxSnapshotAge: z.number().int().positive(),
  compressionEnabled: z.boolean(),
  backupEnabled: z.boolean(),
  backupInterval: z.number().int().positive()
}).refine((data) => {
  // Ensure the correct config is provided based on type
  if (data.type === 'postgresql') {
    return !!data.postgresql
  }
  if (data.type === 'mongodb') {
    return !!data.mongodb
  }
  return false
}, {
  message: "Database configuration must match the selected type"
})

// Web UI configuration schema
export const WebUIConfigSchema = z.object({
  port: z.number().int().min(1).max(65535),
  host: z.string().min(1),
  enableAuth: z.boolean(),
  refreshInterval: z.number().min(1000) // minimum 1 second
})

// Logging configuration schema
export const LoggingConfigSchema = z.object({
  level: z.enum(['error', 'warn', 'info', 'debug', 'trace']),
  maxFileSize: z.string().regex(/^\d+[KMGT]?B?$/i, "Invalid file size format"),
  maxFiles: z.number().int().positive()
})

// Main monitor configuration schema
export const MonitorConfigSchema = z.object({
  scanInterval: z.number().positive(),
  networkRanges: z.array(networkRangeSchema).min(1),
  nmap: NmapConfigSchema,
  database: DatabaseConfigSchema,
  webUI: WebUIConfigSchema,
  logging: LoggingConfigSchema
})

// Scan configuration schema (runtime)
export const ScanConfigSchema = z.object({
  networkRanges: z.array(networkRangeSchema).min(1),
  portRange: portRangeSchema.optional(),
  scanType: z.string().optional(),
  serviceDetection: z.boolean().optional(),
  osDetection: z.boolean().optional(),
  timeout: z.number().positive().optional(),
  fallbackToBasicScan: z.boolean().optional()
})

// Schema-inferred types (for internal use only, main types exported from types/)