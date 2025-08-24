import { z } from 'zod'
import { 
  validateIP, 
  validatePortRange, 
  validateNetworkRange,
  NETWORK_CONSTANTS,
  DATABASE_CONSTANTS,
  WEB_UI_CONSTANTS,
  LOGGING_CONSTANTS,
  API_CONSTANTS
} from '@nmapper/shared'

// Database configuration schema
export const DatabaseConfigSchema = z.object({
  host: z.string().min(1).default('localhost'),
  port: z.number().int().min(1).max(65535).default(5432),
  database: z.string().min(1).default('nmapper'),
  username: z.string().min(1).default('nmapper'),
  password: z.string().min(1).default('nmapper'),
  poolSize: z.number().int()
    .min(DATABASE_CONSTANTS.MIN_POOL_SIZE)
    .max(DATABASE_CONSTANTS.MAX_POOL_SIZE)
    .default(DATABASE_CONSTANTS.DEFAULT_POOL_SIZE),
  idleTimeoutMillis: z.number().int().min(1000).default(30000),
  connectionTimeoutMillis: z.number().int().min(1000).default(10000),
  ssl: z.boolean().default(false),
})

// Network scanning configuration schema
export const ScanConfigSchema = z.object({
  interval: z.number().int()
    .min(NETWORK_CONSTANTS.MIN_SCAN_INTERVAL)
    .max(NETWORK_CONSTANTS.MAX_SCAN_INTERVAL)
    .default(NETWORK_CONSTANTS.DEFAULT_SCAN_INTERVAL),
  timeout: z.number().int()
    .min(NETWORK_CONSTANTS.MIN_TIMEOUT)
    .max(NETWORK_CONSTANTS.MAX_TIMEOUT)
    .default(NETWORK_CONSTANTS.DEFAULT_TIMEOUT),
  maxRetries: z.number().int()
    .min(0)
    .max(NETWORK_CONSTANTS.MAX_MAX_RETRIES)
    .default(NETWORK_CONSTANTS.DEFAULT_MAX_RETRIES),
  defaultNetworkRange: z.string()
    .refine(validateNetworkRange, { message: 'Invalid network range' })
    .default('192.168.1.0/24'),
  defaultPortRange: z.string()
    .refine(validatePortRange, { message: 'Invalid port range' })
    .default(NETWORK_CONSTANTS.DEFAULT_PORT_RANGE),
  nmapPath: z.string().default('nmap'),
  maxConcurrentScans: z.number().int().min(1).max(10).default(1),
  enableServiceDetection: z.boolean().default(true),
  enableOSDetection: z.boolean().default(true),
  enableScriptScan: z.boolean().default(false),
  customNmapOptions: z.string().optional(),
})

// Web UI configuration schema
export const WebUIConfigSchema = z.object({
  port: z.number().int()
    .min(WEB_UI_CONSTANTS.MIN_PORT)
    .max(WEB_UI_CONSTANTS.MAX_PORT)
    .default(WEB_UI_CONSTANTS.DEFAULT_PORT),
  apiPort: z.number().int()
    .min(WEB_UI_CONSTANTS.MIN_PORT)
    .max(WEB_UI_CONSTANTS.MAX_PORT)
    .default(WEB_UI_CONSTANTS.DEFAULT_API_PORT),
  refreshInterval: z.number().int()
    .min(WEB_UI_CONSTANTS.MIN_REFRESH_INTERVAL)
    .max(WEB_UI_CONSTANTS.MAX_REFRESH_INTERVAL)
    .default(WEB_UI_CONSTANTS.DEFAULT_REFRESH_INTERVAL),
  pageSize: z.number().int()
    .min(WEB_UI_CONSTANTS.MIN_PAGE_SIZE)
    .max(WEB_UI_CONSTANTS.MAX_PAGE_SIZE)
    .default(WEB_UI_CONSTANTS.DEFAULT_PAGE_SIZE),
  enableAutoRefresh: z.boolean().default(true),
  theme: z.enum(['light', 'dark', 'auto']).default('auto'),
  showAdvancedOptions: z.boolean().default(false),
})

// Logging configuration schema
export const LoggingConfigSchema = z.object({
  level: z.enum(['error', 'warn', 'info', 'debug', 'trace']).default(LOGGING_CONSTANTS.DEFAULT_LEVEL as any),
  enableConsole: z.boolean().default(true),
  enableFile: z.boolean().default(true),
  filePath: z.string().default('./logs/nmapper.log'),
  maxFileSize: z.string().default(LOGGING_CONSTANTS.DEFAULT_MAX_FILE_SIZE),
  maxFiles: z.number().int()
    .min(LOGGING_CONSTANTS.MIN_MAX_FILES)
    .max(LOGGING_CONSTANTS.MAX_MAX_FILES)
    .default(LOGGING_CONSTANTS.DEFAULT_MAX_FILES),
  enableRotation: z.boolean().default(true),
  timestampFormat: z.string().default('YYYY-MM-DD HH:mm:ss'),
})

// API configuration schema
export const APIConfigSchema = z.object({
  requestTimeout: z.number().int()
    .min(1000)
    .max(API_CONSTANTS.MAX_REQUEST_TIMEOUT)
    .default(API_CONSTANTS.DEFAULT_REQUEST_TIMEOUT),
  rateLimit: z.number().int()
    .min(1)
    .max(API_CONSTANTS.MAX_RATE_LIMIT)
    .default(API_CONSTANTS.DEFAULT_RATE_LIMIT),
  bodySizeLimit: z.string().default(API_CONSTANTS.DEFAULT_BODY_SIZE_LIMIT),
  cors: z.object({
    enabled: z.boolean().default(true),
    origin: z.union([z.string(), z.array(z.string())]).default('*'),
    methods: z.array(z.string()).default(['GET', 'POST', 'PUT', 'DELETE']),
    allowedHeaders: z.array(z.string()).default(['Content-Type', 'Authorization']),
  }),
  auth: z.object({
    enabled: z.boolean().default(false),
    secretKey: z.string().optional(),
    tokenExpiration: z.number().int().default(24 * 60 * 60 * 1000), // 24 hours
  }),
})

// Monitoring configuration schema
export const MonitoringConfigSchema = z.object({
  snapshotRetentionDays: z.number().int()
    .min(DATABASE_CONSTANTS.MIN_SNAPSHOT_RETENTION_DAYS)
    .max(DATABASE_CONSTANTS.MAX_SNAPSHOT_RETENTION_DAYS)
    .default(DATABASE_CONSTANTS.DEFAULT_SNAPSHOT_RETENTION_DAYS),
  enableChangeNotifications: z.boolean().default(true),
  changeDetectionSensitivity: z.enum(['low', 'medium', 'high']).default('medium'),
  alertThresholds: z.object({
    newDevices: z.number().int().min(1).default(5),
    newPorts: z.number().int().min(1).default(10),
    deviceOffline: z.number().int().min(1).default(3), // consecutive scans
  }),
  autoBackup: z.object({
    enabled: z.boolean().default(true),
    intervalHours: z.number().int()
      .min(DATABASE_CONSTANTS.MIN_BACKUP_INTERVAL_HOURS)
      .max(DATABASE_CONSTANTS.MAX_BACKUP_INTERVAL_HOURS)
      .default(DATABASE_CONSTANTS.DEFAULT_BACKUP_INTERVAL_HOURS),
    path: z.string().default('./backups'),
    maxBackups: z.number().int().min(1).max(100).default(7),
  }),
})

// Notification configuration schema
export const NotificationConfigSchema = z.object({
  enabled: z.boolean().default(false),
  channels: z.object({
    email: z.object({
      enabled: z.boolean().default(false),
      smtp: z.object({
        host: z.string().optional(),
        port: z.number().int().min(1).max(65535).default(587),
        secure: z.boolean().default(false),
        username: z.string().optional(),
        password: z.string().optional(),
      }),
      from: z.string().email().optional(),
      to: z.array(z.string().email()).default([]),
    }),
    webhook: z.object({
      enabled: z.boolean().default(false),
      url: z.string().url().optional(),
      headers: z.record(z.string()).default({}),
      timeout: z.number().int().min(1000).default(5000),
    }),
    slack: z.object({
      enabled: z.boolean().default(false),
      webhookUrl: z.string().url().optional(),
      channel: z.string().optional(),
      username: z.string().default('NMapper Bot'),
    }),
  }),
})

// Main application configuration schema
export const AppConfigSchema = z.object({
  environment: z.enum(['development', 'production', 'test']).default('development'),
  database: DatabaseConfigSchema,
  scan: ScanConfigSchema,
  webUI: WebUIConfigSchema,
  logging: LoggingConfigSchema,
  api: APIConfigSchema,
  monitoring: MonitoringConfigSchema,
  notifications: NotificationConfigSchema,
})

// Export types
export type DatabaseConfig = z.infer<typeof DatabaseConfigSchema>
export type ScanConfig = z.infer<typeof ScanConfigSchema>
export type WebUIConfig = z.infer<typeof WebUIConfigSchema>
export type LoggingConfig = z.infer<typeof LoggingConfigSchema>
export type APIConfig = z.infer<typeof APIConfigSchema>
export type MonitoringConfig = z.infer<typeof MonitoringConfigSchema>
export type NotificationConfig = z.infer<typeof NotificationConfigSchema>
export type AppConfig = z.infer<typeof AppConfigSchema>

// Configuration validation function
export function validateConfig(config: unknown): { success: true; data: AppConfig } | { success: false; errors: z.ZodError } {
  const result = AppConfigSchema.safeParse(config)
  if (result.success) {
    return { success: true, data: result.data }
  }
  return { success: false, errors: result.error }
}

// Default configuration
export const defaultConfig: AppConfig = AppConfigSchema.parse({})

// Environment-based configuration overrides
export function getEnvironmentDefaults(): Partial<AppConfig> {
  const env = process.env.NODE_ENV || 'development'
  
  switch (env) {
    case 'production':
      return {
        environment: 'production' as const,
      }
    
    case 'test':
      return {
        environment: 'test' as const,
      }
    
    default: // development
      return {
        environment: 'development' as const,
      }
  }
}