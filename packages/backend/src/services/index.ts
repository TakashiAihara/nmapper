export * from './monitor.js'
export * from './scheduler.js'

// Re-export main classes
export { NetworkMonitoringService } from './monitor.js'
export { MonitoringScheduler } from './scheduler.js'

// Import classes for factory function
import { NetworkMonitoringService } from './monitor.js'
import { MonitoringScheduler } from './scheduler.js'

// Convenience factory function
export function createMonitoringService(config?: {
  dataDir?: string
  scanConfig?: any
  schedulerConfig?: any
}) {
  // Convert the generic config to MonitoringServiceConfig
  const serviceConfig: import('./monitor.js').MonitoringServiceConfig = {
    autoStart: true,
    gracefulShutdownTimeout: 30000,
    healthCheckInterval: 60000,
    metricsEnabled: true,
    notificationsEnabled: false
  }
  
  const monitorService = new NetworkMonitoringService(serviceConfig)
  
  return {
    service: monitorService,
    scheduler: monitorService.getScheduler(),
    
    // Convenience methods
    async start() {
      await monitorService.initialize()
      await monitorService.start()
    },
    
    async stop() {
      await monitorService.stop()
    },
    
    getMetrics() {
      return monitorService.getMetrics()
    },
    
    getHealth() {
      return monitorService.getHealthStatus()
    }
  }
}