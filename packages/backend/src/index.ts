// Backend entry point for NMapper
export * from './services/index.js'

// Export config without conflicts
export { 
  ConfigManager, configManager, ConfigLoader, configLoader, ConfigWatcher,
  RuntimeConfigManager, createRuntimeConfigManager, initializeConfig,
  getAppConfig, updateAppConfig, getConfigValue, setConfigValue,
  loadConfig, getConfig, findConfigFile, createConfiguration
} from './config/index.js'

// Export database without conflicts  
export { database, db, createDatabaseInstance } from './database/index.js'

// Export other modules
export * from './scanning/index.js'
export * from './snapshots/index.js'

// Main entry point for the backend service
import { createMonitoringService } from './services/index.js'

export { createMonitoringService }

// Re-export the CLI
export { NetworkMonitorCLI } from './cli.js'