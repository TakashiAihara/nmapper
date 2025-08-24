import { watch, FSWatcher, WatchEventType } from 'fs'
import { existsSync } from 'fs'
import { EventEmitter } from 'events'
import { ConfigManager } from './manager.js'

export interface FileWatchEvent {
  filename: string
  eventType: WatchEventType
  timestamp: Date
}

export interface ConfigWatchOptions {
  configPath: string
  debounceMs?: number
  persistent?: boolean
  recursive?: boolean
}

export class ConfigWatcher extends EventEmitter {
  private watcher: FSWatcher | null = null
  private configManager: ConfigManager
  private debounceTimer: NodeJS.Timeout | null = null
  private isWatching = false
  private options: ConfigWatchOptions | null = null

  constructor(configManager: ConfigManager) {
    super()
    this.configManager = configManager
  }

  startWatching(options: ConfigWatchOptions): void {
    if (this.isWatching) {
      throw new Error('Already watching configuration file')
    }

    if (!existsSync(options.configPath)) {
      throw new Error(`Configuration file not found: ${options.configPath}`)
    }

    this.options = {
      debounceMs: 1000,
      persistent: true,
      recursive: false,
      ...options
    }

    try {
      this.watcher = watch(
        this.options.configPath,
        {
          persistent: this.options.persistent,
          recursive: this.options.recursive
        },
        this.handleFileChange.bind(this)
      )

      this.isWatching = true
      console.log(`Started watching configuration file: ${this.options.configPath}`)
      this.emit('watch-started', { configPath: this.options.configPath })

    } catch (error) {
      console.error('Failed to start watching configuration file:', error)
      this.emit('watch-error', error)
      throw error
    }
  }

  stopWatching(): void {
    if (!this.isWatching) {
      return
    }

    if (this.debounceTimer) {
      clearTimeout(this.debounceTimer)
      this.debounceTimer = null
    }

    if (this.watcher) {
      this.watcher.close()
      this.watcher = null
    }

    this.isWatching = false
    this.options = null
    
    console.log('Stopped watching configuration file')
    this.emit('watch-stopped')
  }

  isWatchingFile(): boolean {
    return this.isWatching
  }

  getWatchedPath(): string | null {
    return this.options?.configPath || null
  }

  private handleFileChange(eventType: WatchEventType, filename: string | null): void {
    if (!filename || !this.options) {
      return
    }

    const event: FileWatchEvent = {
      filename,
      eventType,
      timestamp: new Date()
    }

    this.emit('file-changed', event)

    // Debounce the reload to avoid multiple reloads for rapid file changes
    if (this.debounceTimer) {
      clearTimeout(this.debounceTimer)
    }

    this.debounceTimer = setTimeout(async () => {
      try {
        console.log(`Configuration file changed (${eventType}), reloading...`)
        
        await this.configManager.reloadConfig({
          configPath: this.options!.configPath,
          throwOnError: false,
          validateSchema: true
        })

        console.log('Configuration reloaded successfully')
        this.emit('config-reloaded', event)

      } catch (error) {
        console.error('Failed to reload configuration after file change:', error)
        this.emit('reload-error', { error, event })
      }
      
      this.debounceTimer = null
    }, this.options.debounceMs)
  }
}

export class RuntimeConfigManager {
  private configManager: ConfigManager
  private watcher: ConfigWatcher
  private runtimeOverrides: Map<string, any> = new Map()

  constructor(configManager: ConfigManager) {
    this.configManager = configManager
    this.watcher = new ConfigWatcher(configManager)
    
    // Set up event listeners
    this.configManager.on('config-changed', this.handleConfigChange.bind(this))
    this.watcher.on('config-reloaded', this.handleFileReload.bind(this))
  }

  async setRuntimeOverride(key: string, value: any, persistent: boolean = false): Promise<void> {
    // Store the override
    this.runtimeOverrides.set(key, value)
    
    // Apply the override to the current configuration
    await this.configManager.updateConfigValue(key, value, persistent)
    
    console.log(`Runtime override applied: ${key} = ${JSON.stringify(value)}`)
  }

  getRuntimeOverride(key: string): any {
    return this.runtimeOverrides.get(key)
  }

  clearRuntimeOverride(key: string): void {
    this.runtimeOverrides.delete(key)
    console.log(`Runtime override cleared: ${key}`)
  }

  clearAllRuntimeOverrides(): void {
    const keys = Array.from(this.runtimeOverrides.keys())
    this.runtimeOverrides.clear()
    console.log(`All runtime overrides cleared: ${keys.join(', ')}`)
  }

  getRuntimeOverrides(): Record<string, any> {
    return Object.fromEntries(this.runtimeOverrides)
  }

  async enableFileWatching(configPath: string, options?: Partial<ConfigWatchOptions>): Promise<void> {
    this.watcher.startWatching({
      configPath,
      ...options
    })
  }

  disableFileWatching(): void {
    this.watcher.stopWatching()
  }

  isFileWatchingEnabled(): boolean {
    return this.watcher.isWatchingFile()
  }

  getWatchedFilePath(): string | null {
    return this.watcher.getWatchedPath()
  }

  async scheduleConfigUpdate(key: string, value: any, delayMs: number, persistent: boolean = false): Promise<NodeJS.Timeout> {
    return setTimeout(async () => {
      try {
        await this.setRuntimeOverride(key, value, persistent)
        console.log(`Scheduled config update applied: ${key}`)
      } catch (error) {
        console.error(`Failed to apply scheduled config update for ${key}:`, error)
      }
    }, delayMs)
  }

  async createConfigSnapshot(): Promise<{
    config: any
    runtimeOverrides: Record<string, any>
    timestamp: Date
    source: string[]
  }> {
    const config = await this.configManager.getConfig()
    
    return {
      config: JSON.parse(JSON.stringify(config)), // Deep clone
      runtimeOverrides: this.getRuntimeOverrides(),
      timestamp: new Date(),
      source: this.configManager.getLoadedFrom()
    }
  }

  async restoreFromSnapshot(snapshot: {
    config: any
    runtimeOverrides: Record<string, any>
  }): Promise<void> {
    // Clear current overrides
    this.clearAllRuntimeOverrides()
    
    // Update configuration
    await this.configManager.updateConfig(snapshot.config, false)
    
    // Restore runtime overrides
    for (const [key, value] of Object.entries(snapshot.runtimeOverrides)) {
      this.runtimeOverrides.set(key, value)
    }
    
    console.log('Configuration restored from snapshot')
  }

  // Event handlers
  private handleConfigChange(event: any): void {
    // Check if this change matches any runtime overrides
    if (this.runtimeOverrides.has(event.key)) {
      const overrideValue = this.runtimeOverrides.get(event.key)
      if (event.newValue !== overrideValue) {
        // The configuration changed externally, remove the runtime override
        console.log(`External config change detected for ${event.key}, clearing runtime override`)
        this.clearRuntimeOverride(event.key)
      }
    }
  }

  private handleFileReload(event: FileWatchEvent): void {
    // Reapply runtime overrides after file reload
    const reappliedOverrides = Array.from(this.runtimeOverrides.entries())
    
    if (reappliedOverrides.length > 0) {
      console.log(`Reapplying ${reappliedOverrides.length} runtime overrides after file reload`)
      
      // Reapply each override
      Promise.all(
        reappliedOverrides.map(([key, value]) =>
          this.configManager.updateConfigValue(key, value, false)
        )
      ).then(() => {
        console.log('Runtime overrides reapplied successfully')
      }).catch(error => {
        console.error('Failed to reapply runtime overrides:', error)
      })
    }
  }

  // Cleanup
  destroy(): void {
    this.watcher.stopWatching()
    this.clearAllRuntimeOverrides()
    this.configManager.removeAllListeners()
    this.watcher.removeAllListeners()
  }
}

export function createRuntimeConfigManager(configManager: ConfigManager): RuntimeConfigManager {
  return new RuntimeConfigManager(configManager)
}