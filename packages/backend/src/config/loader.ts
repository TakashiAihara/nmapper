import { readFile } from 'fs/promises'
import { existsSync } from 'fs'
import { join } from 'path'
import { AppConfig, AppConfigSchema, getEnvironmentDefaults } from './schema.js'
import { createValidator, formatValidationErrors } from '@nmapper/shared'

export interface ConfigLoadOptions {
  configPath?: string
  envPrefix?: string
  throwOnError?: boolean
  validateSchema?: boolean
}

export class ConfigLoader {
  private static instance: ConfigLoader | null = null
  private config: AppConfig | null = null
  private loadedFrom: string[] = []

  private constructor() {}

  static getInstance(): ConfigLoader {
    if (!ConfigLoader.instance) {
      ConfigLoader.instance = new ConfigLoader()
    }
    return ConfigLoader.instance
  }

  async loadConfig(options: ConfigLoadOptions = {}): Promise<AppConfig> {
    const {
      configPath,
      envPrefix = 'NMAPPER_',
      throwOnError = true,
      validateSchema = true,
    } = options

    try {
      let config: any = {}
      this.loadedFrom = []

      // 1. Load default configuration
      config = { ...getEnvironmentDefaults() }
      this.loadedFrom.push('environment defaults')

      // 2. Load from configuration file if provided
      if (configPath && existsSync(configPath)) {
        const fileConfig = await this.loadConfigFile(configPath)
        config = this.deepMerge(config, fileConfig)
        this.loadedFrom.push(`file: ${configPath}`)
      }

      // 3. Load from environment variables
      const envConfig = this.loadFromEnvironment(envPrefix)
      if (Object.keys(envConfig).length > 0) {
        config = this.deepMerge(config, envConfig)
        this.loadedFrom.push('environment variables')
      }

      // 4. Validate configuration if enabled
      if (validateSchema) {
        const validator = createValidator(AppConfigSchema)
        const result = validator(config)
        
        if (!result.success) {
          const errorMessage = `Configuration validation failed:\n${JSON.stringify(formatValidationErrors(result.errors), null, 2)}`
          
          if (throwOnError) {
            throw new Error(errorMessage)
          } else {
            console.warn(errorMessage)
            // Use default config with partial overrides
            config = AppConfigSchema.parse({})
          }
        } else {
          config = result.data
        }
      }

      this.config = config
      console.log(`Configuration loaded from: ${this.loadedFrom.join(', ')}`)
      
      return config
    } catch (error) {
      if (throwOnError) {
        throw new Error(`Failed to load configuration: ${error}`)
      }
      
      console.error('Configuration loading failed, using defaults:', error)
      this.config = AppConfigSchema.parse({})
      this.loadedFrom = ['defaults (error fallback)']
      return this.config
    }
  }

  private async loadConfigFile(filePath: string): Promise<any> {
    const content = await readFile(filePath, 'utf-8')
    const ext = filePath.split('.').pop()?.toLowerCase()

    switch (ext) {
      case 'json':
        return JSON.parse(content)
      
      case 'yml':
      case 'yaml':
        // Dynamic import to handle optional dependency
        try {
          const yaml = await import('yaml')
          return yaml.parse(content)
        } catch (error) {
          throw new Error('YAML support requires the "yaml" package. Install with: npm install yaml')
        }
      
      default:
        throw new Error(`Unsupported configuration file format: ${ext}`)
    }
  }

  private loadFromEnvironment(prefix: string): Partial<AppConfig> {
    const config: any = {}

    // Database configuration
    this.setNestedValue(config, 'database.host', process.env[`${prefix}DB_HOST`])
    this.setNestedValue(config, 'database.port', this.parseNumber(process.env[`${prefix}DB_PORT`]))
    this.setNestedValue(config, 'database.database', process.env[`${prefix}DB_NAME`])
    this.setNestedValue(config, 'database.username', process.env[`${prefix}DB_USER`])
    this.setNestedValue(config, 'database.password', process.env[`${prefix}DB_PASSWORD`])
    this.setNestedValue(config, 'database.poolSize', this.parseNumber(process.env[`${prefix}DB_POOL_SIZE`]))
    this.setNestedValue(config, 'database.ssl', this.parseBoolean(process.env[`${prefix}DB_SSL`]))

    // Scan configuration
    this.setNestedValue(config, 'scan.interval', this.parseNumber(process.env[`${prefix}SCAN_INTERVAL`]))
    this.setNestedValue(config, 'scan.timeout', this.parseNumber(process.env[`${prefix}SCAN_TIMEOUT`]))
    this.setNestedValue(config, 'scan.maxRetries', this.parseNumber(process.env[`${prefix}SCAN_MAX_RETRIES`]))
    this.setNestedValue(config, 'scan.defaultNetworkRange', process.env[`${prefix}DEFAULT_NETWORK_RANGE`])
    this.setNestedValue(config, 'scan.defaultPortRange', process.env[`${prefix}DEFAULT_PORT_RANGE`])
    this.setNestedValue(config, 'scan.nmapPath', process.env[`${prefix}NMAP_PATH`])
    this.setNestedValue(config, 'scan.maxConcurrentScans', this.parseNumber(process.env[`${prefix}MAX_CONCURRENT_SCANS`]))
    this.setNestedValue(config, 'scan.enableServiceDetection', this.parseBoolean(process.env[`${prefix}ENABLE_SERVICE_DETECTION`]))
    this.setNestedValue(config, 'scan.enableOSDetection', this.parseBoolean(process.env[`${prefix}ENABLE_OS_DETECTION`]))
    this.setNestedValue(config, 'scan.enableScriptScan', this.parseBoolean(process.env[`${prefix}ENABLE_SCRIPT_SCAN`]))
    this.setNestedValue(config, 'scan.customNmapOptions', process.env[`${prefix}CUSTOM_NMAP_OPTIONS`])

    // Web UI configuration
    this.setNestedValue(config, 'webUI.port', this.parseNumber(process.env[`${prefix}WEB_PORT`]))
    this.setNestedValue(config, 'webUI.apiPort', this.parseNumber(process.env[`${prefix}API_PORT`]))
    this.setNestedValue(config, 'webUI.refreshInterval', this.parseNumber(process.env[`${prefix}REFRESH_INTERVAL`]))
    this.setNestedValue(config, 'webUI.pageSize', this.parseNumber(process.env[`${prefix}PAGE_SIZE`]))
    this.setNestedValue(config, 'webUI.enableAutoRefresh', this.parseBoolean(process.env[`${prefix}ENABLE_AUTO_REFRESH`]))
    this.setNestedValue(config, 'webUI.theme', process.env[`${prefix}THEME`])
    this.setNestedValue(config, 'webUI.showAdvancedOptions', this.parseBoolean(process.env[`${prefix}SHOW_ADVANCED_OPTIONS`]))

    // Logging configuration
    this.setNestedValue(config, 'logging.level', process.env[`${prefix}LOG_LEVEL`])
    this.setNestedValue(config, 'logging.enableConsole', this.parseBoolean(process.env[`${prefix}LOG_CONSOLE`]))
    this.setNestedValue(config, 'logging.enableFile', this.parseBoolean(process.env[`${prefix}LOG_FILE`]))
    this.setNestedValue(config, 'logging.filePath', process.env[`${prefix}LOG_FILE_PATH`])
    this.setNestedValue(config, 'logging.maxFileSize', process.env[`${prefix}LOG_MAX_FILE_SIZE`])
    this.setNestedValue(config, 'logging.maxFiles', this.parseNumber(process.env[`${prefix}LOG_MAX_FILES`]))
    this.setNestedValue(config, 'logging.enableRotation', this.parseBoolean(process.env[`${prefix}LOG_ROTATION`]))

    // API configuration
    this.setNestedValue(config, 'api.requestTimeout', this.parseNumber(process.env[`${prefix}API_REQUEST_TIMEOUT`]))
    this.setNestedValue(config, 'api.rateLimit', this.parseNumber(process.env[`${prefix}API_RATE_LIMIT`]))
    this.setNestedValue(config, 'api.bodySizeLimit', process.env[`${prefix}API_BODY_SIZE_LIMIT`])
    this.setNestedValue(config, 'api.cors.enabled', this.parseBoolean(process.env[`${prefix}API_CORS_ENABLED`]))
    this.setNestedValue(config, 'api.cors.origin', this.parseStringArray(process.env[`${prefix}API_CORS_ORIGIN`]))
    this.setNestedValue(config, 'api.auth.enabled', this.parseBoolean(process.env[`${prefix}API_AUTH_ENABLED`]))
    this.setNestedValue(config, 'api.auth.secretKey', process.env[`${prefix}API_AUTH_SECRET`])

    // Monitoring configuration
    this.setNestedValue(config, 'monitoring.snapshotRetentionDays', this.parseNumber(process.env[`${prefix}SNAPSHOT_RETENTION_DAYS`]))
    this.setNestedValue(config, 'monitoring.enableChangeNotifications', this.parseBoolean(process.env[`${prefix}ENABLE_CHANGE_NOTIFICATIONS`]))
    this.setNestedValue(config, 'monitoring.changeDetectionSensitivity', process.env[`${prefix}CHANGE_DETECTION_SENSITIVITY`])
    this.setNestedValue(config, 'monitoring.autoBackup.enabled', this.parseBoolean(process.env[`${prefix}AUTO_BACKUP_ENABLED`]))
    this.setNestedValue(config, 'monitoring.autoBackup.intervalHours', this.parseNumber(process.env[`${prefix}AUTO_BACKUP_INTERVAL`]))
    this.setNestedValue(config, 'monitoring.autoBackup.path', process.env[`${prefix}BACKUP_PATH`])

    // Notification configuration
    this.setNestedValue(config, 'notifications.enabled', this.parseBoolean(process.env[`${prefix}NOTIFICATIONS_ENABLED`]))
    this.setNestedValue(config, 'notifications.channels.email.enabled', this.parseBoolean(process.env[`${prefix}EMAIL_ENABLED`]))
    this.setNestedValue(config, 'notifications.channels.email.smtp.host', process.env[`${prefix}SMTP_HOST`])
    this.setNestedValue(config, 'notifications.channels.email.smtp.port', this.parseNumber(process.env[`${prefix}SMTP_PORT`]))
    this.setNestedValue(config, 'notifications.channels.email.smtp.username', process.env[`${prefix}SMTP_USER`])
    this.setNestedValue(config, 'notifications.channels.email.smtp.password', process.env[`${prefix}SMTP_PASSWORD`])
    this.setNestedValue(config, 'notifications.channels.email.from', process.env[`${prefix}EMAIL_FROM`])
    this.setNestedValue(config, 'notifications.channels.email.to', this.parseStringArray(process.env[`${prefix}EMAIL_TO`]))
    this.setNestedValue(config, 'notifications.channels.webhook.enabled', this.parseBoolean(process.env[`${prefix}WEBHOOK_ENABLED`]))
    this.setNestedValue(config, 'notifications.channels.webhook.url', process.env[`${prefix}WEBHOOK_URL`])
    this.setNestedValue(config, 'notifications.channels.slack.enabled', this.parseBoolean(process.env[`${prefix}SLACK_ENABLED`]))
    this.setNestedValue(config, 'notifications.channels.slack.webhookUrl', process.env[`${prefix}SLACK_WEBHOOK_URL`])
    this.setNestedValue(config, 'notifications.channels.slack.channel', process.env[`${prefix}SLACK_CHANNEL`])

    return config
  }

  private setNestedValue(obj: any, path: string, value: any): void {
    if (value === undefined) return

    const keys = path.split('.')
    let current = obj

    for (let i = 0; i < keys.length - 1; i++) {
      const key = keys[i]
      if (!(key in current)) {
        current[key] = {}
      }
      current = current[key]
    }

    current[keys[keys.length - 1]] = value
  }

  private parseNumber(value: string | undefined): number | undefined {
    if (value === undefined) return undefined
    const parsed = Number(value)
    return isNaN(parsed) ? undefined : parsed
  }

  private parseBoolean(value: string | undefined): boolean | undefined {
    if (value === undefined) return undefined
    return value.toLowerCase() === 'true'
  }

  private parseStringArray(value: string | undefined): string[] | string | undefined {
    if (value === undefined) return undefined
    if (value.includes(',')) {
      return value.split(',').map(s => s.trim()).filter(s => s.length > 0)
    }
    return value
  }

  private deepMerge(target: any, source: any): any {
    const result = { ...target }

    for (const key in source) {
      if (source[key] && typeof source[key] === 'object' && !Array.isArray(source[key])) {
        result[key] = this.deepMerge(result[key] || {}, source[key])
      } else {
        result[key] = source[key]
      }
    }

    return result
  }

  getConfig(): AppConfig | null {
    return this.config
  }

  getLoadedFrom(): string[] {
    return [...this.loadedFrom]
  }

  async reloadConfig(options?: ConfigLoadOptions): Promise<AppConfig> {
    this.config = null
    this.loadedFrom = []
    return this.loadConfig(options)
  }
}

// Convenience functions
export const configLoader = ConfigLoader.getInstance()

export async function loadConfig(options?: ConfigLoadOptions): Promise<AppConfig> {
  return configLoader.loadConfig(options)
}

export function getConfig(): AppConfig {
  const config = configLoader.getConfig()
  if (!config) {
    throw new Error('Configuration not loaded. Call loadConfig() first.')
  }
  return config
}

export async function findConfigFile(searchPaths?: string[]): Promise<string | null> {
  const defaultPaths = [
    './nmapper.config.json',
    './nmapper.config.yml',
    './nmapper.config.yaml',
    './config/nmapper.json',
    './config/nmapper.yml',
    './config/nmapper.yaml',
    '~/.nmapper/config.json',
    '~/.nmapper/config.yml',
    '/etc/nmapper/config.json',
    '/etc/nmapper/config.yml',
  ]

  const paths = searchPaths || defaultPaths

  for (const path of paths) {
    if (existsSync(path)) {
      return path
    }
  }

  return null
}