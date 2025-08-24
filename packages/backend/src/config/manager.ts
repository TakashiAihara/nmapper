import { EventEmitter } from 'events'
import { writeFile, mkdir } from 'fs/promises'
import { dirname, join } from 'path'
import { existsSync } from 'fs'
import { AppConfig, AppConfigSchema, validateConfig } from './schema.js'
import { ConfigLoader, ConfigLoadOptions } from './loader.js'
import { generateConfigFile, generateEnvironmentTemplate } from './templates.js'
import { database, db } from '../database/index.js'

export interface ConfigChangeEvent {
  key: string
  oldValue: any
  newValue: any
  timestamp: Date
}

export interface ConfigValidationError {
  path: string
  message: string
}

export class ConfigManager extends EventEmitter {
  private static instance: ConfigManager | null = null
  private loader: ConfigLoader
  private config: AppConfig | null = null
  private isInitialized = false
  private watchMode = false
  private databaseEnabled = false

  private constructor() {
    super()
    this.loader = ConfigLoader.getInstance()
  }

  static getInstance(): ConfigManager {
    if (!ConfigManager.instance) {
      ConfigManager.instance = new ConfigManager()
    }
    return ConfigManager.instance
  }

  async initialize(options: ConfigLoadOptions = {}): Promise<AppConfig> {
    if (this.isInitialized) {
      throw new Error('ConfigManager already initialized')
    }

    try {
      this.config = await this.loader.loadConfig(options)
      this.isInitialized = true

      // Try to enable database configuration storage if database is available
      try {
        if (database.isInitialized()) {
          await this.enableDatabaseStorage()
        }
      } catch (error) {
        console.warn('Database configuration storage not available:', error)
      }

      this.emit('initialized', this.config)
      console.log('ConfigManager initialized successfully')
      
      return this.config
    } catch (error) {
      console.error('Failed to initialize ConfigManager:', error)
      throw error
    }
  }

  private async enableDatabaseStorage(): Promise<void> {
    try {
      // Load configuration from database and merge with current config
      const dbConfig = await this.loadConfigFromDatabase()
      if (dbConfig && Object.keys(dbConfig).length > 0) {
        this.config = this.mergeConfigs(this.config!, dbConfig)
        this.emit('database-config-loaded', dbConfig)
      }
      
      this.databaseEnabled = true
      console.log('Database configuration storage enabled')
    } catch (error) {
      console.warn('Failed to enable database storage:', error)
    }
  }

  async getConfig(): Promise<AppConfig> {
    if (!this.isInitialized || !this.config) {
      throw new Error('ConfigManager not initialized. Call initialize() first.')
    }
    return { ...this.config }
  }

  async updateConfig(updates: Partial<AppConfig>, persistent: boolean = true): Promise<AppConfig> {
    if (!this.isInitialized || !this.config) {
      throw new Error('ConfigManager not initialized')
    }

    const oldConfig = { ...this.config }
    const newConfig = this.mergeConfigs(this.config, updates)

    // Validate the new configuration
    const validation = validateConfig(newConfig)
    if (!validation.success) {
      const errors = this.formatValidationErrors(validation.errors)
      throw new Error(`Configuration validation failed: ${JSON.stringify(errors)}`)
    }

    this.config = validation.data

    // Save to database if enabled and persistent
    if (persistent && this.databaseEnabled) {
      await this.saveConfigToDatabase(updates)
    }

    // Emit change events for each updated key
    this.emitConfigChanges(oldConfig, this.config)
    
    this.emit('config-updated', {
      oldConfig,
      newConfig: this.config,
      updates,
      persistent
    })

    return { ...this.config }
  }

  async updateConfigValue(key: string, value: any, persistent: boolean = true): Promise<void> {
    const updates = this.setNestedValue({}, key, value)
    await this.updateConfig(updates, persistent)
  }

  async getConfigValue<T = any>(key: string, defaultValue?: T): Promise<T> {
    const config = await this.getConfig()
    return this.getNestedValue(config, key, defaultValue)
  }

  async reloadConfig(options?: ConfigLoadOptions): Promise<AppConfig> {
    if (!this.isInitialized) {
      throw new Error('ConfigManager not initialized')
    }

    const oldConfig = { ...this.config! }
    this.config = await this.loader.reloadConfig(options)

    // Reload database config if enabled
    if (this.databaseEnabled) {
      const dbConfig = await this.loadConfigFromDatabase()
      if (dbConfig && Object.keys(dbConfig).length > 0) {
        this.config = this.mergeConfigs(this.config, dbConfig)
      }
    }

    this.emitConfigChanges(oldConfig, this.config)
    this.emit('config-reloaded', {
      oldConfig,
      newConfig: this.config
    })

    return { ...this.config }
  }

  async validateCurrentConfig(): Promise<{ isValid: boolean; errors: ConfigValidationError[] }> {
    if (!this.config) {
      return {
        isValid: false,
        errors: [{ path: 'root', message: 'Configuration not loaded' }]
      }
    }

    const validation = validateConfig(this.config)
    if (validation.success) {
      return { isValid: true, errors: [] }
    }

    return {
      isValid: false,
      errors: this.formatValidationErrors(validation.errors)
    }
  }

  async exportConfig(filePath: string, format: 'json' | 'yaml' = 'json'): Promise<void> {
    if (!this.config) {
      throw new Error('No configuration to export')
    }

    const content = generateConfigFile(this.config, format)
    const dir = dirname(filePath)
    
    if (!existsSync(dir)) {
      await mkdir(dir, { recursive: true })
    }

    await writeFile(filePath, content, 'utf-8')
    console.log(`Configuration exported to: ${filePath}`)
  }

  async exportEnvironmentTemplate(filePath: string): Promise<void> {
    const content = generateEnvironmentTemplate()
    const dir = dirname(filePath)
    
    if (!existsSync(dir)) {
      await mkdir(dir, { recursive: true })
    }

    await writeFile(filePath, content, 'utf-8')
    console.log(`Environment template exported to: ${filePath}`)
  }

  async resetToDefaults(): Promise<AppConfig> {
    const defaultConfig = AppConfigSchema.parse({})
    
    if (this.databaseEnabled) {
      // Clear database configuration
      await this.clearConfigFromDatabase()
    }

    const oldConfig = { ...this.config! }
    this.config = defaultConfig

    this.emitConfigChanges(oldConfig, this.config)
    this.emit('config-reset', {
      oldConfig,
      newConfig: this.config
    })

    return { ...this.config }
  }

  getLoadedFrom(): string[] {
    return this.loader.getLoadedFrom()
  }

  isDatabaseEnabled(): boolean {
    return this.databaseEnabled
  }

  isWatchModeEnabled(): boolean {
    return this.watchMode
  }

  private async loadConfigFromDatabase(): Promise<Partial<AppConfig> | null> {
    try {
      const configs = await db.findMany<{ key: string; value: any }>('configuration')
      
      if (configs.length === 0) {
        return null
      }

      const dbConfig: any = {}
      
      for (const config of configs) {
        try {
          const value = typeof config.value === 'string' 
            ? JSON.parse(config.value)
            : config.value
          this.setNestedValue(dbConfig, config.key, value)
        } catch (error) {
          console.warn(`Failed to parse config value for key ${config.key}:`, error)
        }
      }

      return dbConfig
    } catch (error) {
      console.error('Failed to load configuration from database:', error)
      return null
    }
  }

  private async saveConfigToDatabase(config: Partial<AppConfig>): Promise<void> {
    try {
      const flattened = this.flattenObject(config)
      
      for (const [key, value] of Object.entries(flattened)) {
        await db.upsertRecord(
          'configuration',
          {
            key,
            value: JSON.stringify(value),
            description: `Configuration value for ${key}`,
            updated_at: new Date()
          },
          ['key']
        )
      }
    } catch (error) {
      console.error('Failed to save configuration to database:', error)
      throw error
    }
  }

  private async clearConfigFromDatabase(): Promise<void> {
    try {
      await database.query('DELETE FROM configuration')
      console.log('Database configuration cleared')
    } catch (error) {
      console.error('Failed to clear database configuration:', error)
      throw error
    }
  }

  private mergeConfigs(target: AppConfig, source: Partial<AppConfig>): AppConfig {
    const result = { ...target }

    for (const key in source) {
      const sourceValue = source[key as keyof AppConfig]
      if (sourceValue && typeof sourceValue === 'object' && !Array.isArray(sourceValue)) {
        result[key as keyof AppConfig] = {
          ...(result[key as keyof AppConfig] as any),
          ...sourceValue
        } as any
      } else {
        result[key as keyof AppConfig] = sourceValue as any
      }
    }

    return result
  }

  private setNestedValue(obj: any, path: string, value: any): any {
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
    return obj
  }

  private getNestedValue(obj: any, path: string, defaultValue?: any): any {
    const keys = path.split('.')
    let current = obj

    for (const key of keys) {
      if (current && typeof current === 'object' && key in current) {
        current = current[key]
      } else {
        return defaultValue
      }
    }

    return current
  }

  private flattenObject(obj: any, prefix = ''): Record<string, any> {
    const flattened: Record<string, any> = {}

    for (const key in obj) {
      const value = obj[key]
      const newKey = prefix ? `${prefix}.${key}` : key

      if (value && typeof value === 'object' && !Array.isArray(value)) {
        Object.assign(flattened, this.flattenObject(value, newKey))
      } else {
        flattened[newKey] = value
      }
    }

    return flattened
  }

  private emitConfigChanges(oldConfig: AppConfig, newConfig: AppConfig): void {
    const oldFlat = this.flattenObject(oldConfig)
    const newFlat = this.flattenObject(newConfig)

    for (const key in newFlat) {
      if (oldFlat[key] !== newFlat[key]) {
        const changeEvent: ConfigChangeEvent = {
          key,
          oldValue: oldFlat[key],
          newValue: newFlat[key],
          timestamp: new Date()
        }
        
        this.emit('config-changed', changeEvent)
        this.emit(`config-changed:${key}`, changeEvent)
      }
    }
  }

  private formatValidationErrors(zodError: any): ConfigValidationError[] {
    return zodError.errors.map((error: any) => ({
      path: error.path.join('.'),
      message: error.message
    }))
  }
}

// Singleton instance
export const configManager = ConfigManager.getInstance()

// Convenience functions
export async function initializeConfig(options?: ConfigLoadOptions): Promise<AppConfig> {
  return configManager.initialize(options)
}

export async function getAppConfig(): Promise<AppConfig> {
  return configManager.getConfig()
}

export async function updateAppConfig(updates: Partial<AppConfig>, persistent?: boolean): Promise<AppConfig> {
  return configManager.updateConfig(updates, persistent)
}

export async function getConfigValue<T>(key: string, defaultValue?: T): Promise<T> {
  return configManager.getConfigValue(key, defaultValue)
}

export async function setConfigValue(key: string, value: any, persistent?: boolean): Promise<void> {
  return configManager.updateConfigValue(key, value, persistent)
}