export * from './schema.js'
export * from './loader.js'
export * from './manager.js'
export * from './watcher.js'
export * from './templates.js'

// Re-export main classes and functions
export { ConfigManager, configManager } from './manager.js'
export { ConfigLoader, configLoader } from './loader.js'
export { ConfigWatcher, RuntimeConfigManager, createRuntimeConfigManager } from './watcher.js'

// Re-export convenience functions
export {
  initializeConfig,
  getAppConfig,
  updateAppConfig,
  getConfigValue,
  setConfigValue
} from './manager.js'

export {
  loadConfig,
  getConfig,
  findConfigFile
} from './loader.js'

// Import configManager
import { configManager } from './manager.js'

// Factory function for convenience
export function createConfiguration(options?: { configPath?: string }) {
  return configManager
}