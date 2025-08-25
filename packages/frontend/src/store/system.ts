import { create } from 'zustand'
import { subscribeWithSelector } from 'zustand/middleware'
import { immer } from 'zustand/middleware/immer'

export interface SystemAlert {
  id: string
  level: 'info' | 'warning' | 'critical'
  title: string
  message: string
  timestamp: Date
  acknowledged: boolean
  category: 'system' | 'network' | 'security' | 'performance'
}

export interface SystemMetrics {
  cpu: {
    usage: number
    temperature?: number
    cores: number
    frequency?: number
  }
  memory: {
    used: number
    total: number
    usage: number
    available: number
  }
  disk: {
    used: number
    total: number
    usage: number
    available: number
  }
  network: {
    bytesIn: number
    bytesOut: number
    packetsIn: number
    packetsOut: number
  }
  uptime: number
  loadAverage: number[]
  processes: number
}

export interface ServiceStatus {
  database: 'healthy' | 'warning' | 'critical'
  scanner: 'healthy' | 'warning' | 'critical'
  websocket: 'healthy' | 'warning' | 'critical'
  api: 'healthy' | 'warning' | 'critical'
}

export interface SystemState {
  // System health
  overallHealth: 'healthy' | 'warning' | 'critical'
  metrics: SystemMetrics | null
  services: ServiceStatus
  lastHealthCheck: Date | null
  
  // Alerts and notifications
  alerts: SystemAlert[]
  unacknowledgedAlerts: number
  notificationsEnabled: boolean
  alertFilters: {
    level?: 'info' | 'warning' | 'critical'
    category?: 'system' | 'network' | 'security' | 'performance'
    acknowledged?: boolean
  }
  
  // Performance monitoring
  isMonitoring: boolean
  monitoringInterval: number // seconds
  performanceHistory: Array<{
    timestamp: Date
    cpu: number
    memory: number
    disk: number
  }>
  maxHistoryEntries: number
  
  // System logs
  logLevel: 'debug' | 'info' | 'warn' | 'error'
  showLogs: boolean
  
  // UI state
  sidebarCollapsed: boolean
  activeTab: 'overview' | 'alerts' | 'logs' | 'performance'
  
  // Actions
  setOverallHealth: (health: SystemState['overallHealth']) => void
  setMetrics: (metrics: SystemMetrics) => void
  setServiceStatus: (service: keyof ServiceStatus, status: ServiceStatus[keyof ServiceStatus]) => void
  updateLastHealthCheck: () => void
  
  addAlert: (alert: Omit<SystemAlert, 'id' | 'timestamp'>) => void
  acknowledgeAlert: (alertId: string) => void
  acknowledgeAllAlerts: () => void
  removeAlert: (alertId: string) => void
  clearOldAlerts: (maxAge: number) => void // in hours
  setAlertFilters: (filters: Partial<SystemState['alertFilters']>) => void
  
  setMonitoring: (enabled: boolean) => void
  setMonitoringInterval: (interval: number) => void
  addPerformanceEntry: (entry: { cpu: number; memory: number; disk: number }) => void
  clearPerformanceHistory: () => void
  
  setNotificationsEnabled: (enabled: boolean) => void
  setLogLevel: (level: SystemState['logLevel']) => void
  setShowLogs: (show: boolean) => void
  
  setSidebarCollapsed: (collapsed: boolean) => void
  setActiveTab: (tab: SystemState['activeTab']) => void
  
  reset: () => void
}

const initialState = {
  overallHealth: 'healthy' as const,
  metrics: null,
  services: {
    database: 'healthy' as const,
    scanner: 'healthy' as const,
    websocket: 'healthy' as const,
    api: 'healthy' as const,
  },
  lastHealthCheck: null,
  
  alerts: [],
  unacknowledgedAlerts: 0,
  notificationsEnabled: true,
  alertFilters: {},
  
  isMonitoring: true,
  monitoringInterval: 30, // 30 seconds
  performanceHistory: [],
  maxHistoryEntries: 288, // 24 hours at 5min intervals
  
  logLevel: 'info' as const,
  showLogs: false,
  
  sidebarCollapsed: false,
  activeTab: 'overview' as const,
}

export const useSystemStore = create<SystemState>()(
  subscribeWithSelector(
    immer((set, get) => ({
      ...initialState,

      // System health actions
      setOverallHealth: (health) =>
        set((state) => {
          state.overallHealth = health
        }),

      setMetrics: (metrics) =>
        set((state) => {
          state.metrics = metrics
          state.lastHealthCheck = new Date()
          
          // Add to performance history
          if (state.isMonitoring) {
            const entry = {
              timestamp: new Date(),
              cpu: metrics.cpu.usage,
              memory: metrics.memory.usage,
              disk: metrics.disk.usage,
            }
            
            state.performanceHistory.push(entry)
            
            // Keep only the last maxHistoryEntries
            if (state.performanceHistory.length > state.maxHistoryEntries) {
              state.performanceHistory = state.performanceHistory.slice(-state.maxHistoryEntries)
            }
          }
        }),

      setServiceStatus: (service, status) =>
        set((state) => {
          state.services[service] = status
          state.lastHealthCheck = new Date()
        }),

      updateLastHealthCheck: () =>
        set((state) => {
          state.lastHealthCheck = new Date()
        }),

      // Alert management actions
      addAlert: (alertData) =>
        set((state) => {
          const alert: SystemAlert = {
            id: `alert_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            timestamp: new Date(),
            acknowledged: false,
            ...alertData,
          }
          
          state.alerts.unshift(alert) // Add to beginning
          
          if (!alert.acknowledged) {
            state.unacknowledgedAlerts += 1
          }
          
          // Keep only last 1000 alerts
          if (state.alerts.length > 1000) {
            const removedAlert = state.alerts.pop()
            if (removedAlert && !removedAlert.acknowledged) {
              state.unacknowledgedAlerts -= 1
            }
          }
        }),

      acknowledgeAlert: (alertId) =>
        set((state) => {
          const alert = state.alerts.find(a => a.id === alertId)
          if (alert && !alert.acknowledged) {
            alert.acknowledged = true
            state.unacknowledgedAlerts -= 1
          }
        }),

      acknowledgeAllAlerts: () =>
        set((state) => {
          state.alerts.forEach(alert => {
            alert.acknowledged = true
          })
          state.unacknowledgedAlerts = 0
        }),

      removeAlert: (alertId) =>
        set((state) => {
          const alertIndex = state.alerts.findIndex(a => a.id === alertId)
          if (alertIndex !== -1) {
            const alert = state.alerts[alertIndex]
            if (!alert.acknowledged) {
              state.unacknowledgedAlerts -= 1
            }
            state.alerts.splice(alertIndex, 1)
          }
        }),

      clearOldAlerts: (maxAge) =>
        set((state) => {
          const cutoffTime = new Date(Date.now() - maxAge * 60 * 60 * 1000)
          const removedAlerts = state.alerts.filter(alert => alert.timestamp < cutoffTime)
          
          state.alerts = state.alerts.filter(alert => alert.timestamp >= cutoffTime)
          
          // Update unacknowledged count
          const removedUnacknowledged = removedAlerts.filter(a => !a.acknowledged).length
          state.unacknowledgedAlerts -= removedUnacknowledged
        }),

      setAlertFilters: (filters) =>
        set((state) => {
          state.alertFilters = { ...state.alertFilters, ...filters }
        }),

      // Performance monitoring actions
      setMonitoring: (enabled) =>
        set((state) => {
          state.isMonitoring = enabled
        }),

      setMonitoringInterval: (interval) =>
        set((state) => {
          state.monitoringInterval = Math.max(5, Math.min(300, interval)) // 5s to 5min
        }),

      addPerformanceEntry: (entry) =>
        set((state) => {
          const perfEntry = {
            timestamp: new Date(),
            ...entry,
          }
          
          state.performanceHistory.push(perfEntry)
          
          if (state.performanceHistory.length > state.maxHistoryEntries) {
            state.performanceHistory = state.performanceHistory.slice(-state.maxHistoryEntries)
          }
        }),

      clearPerformanceHistory: () =>
        set((state) => {
          state.performanceHistory = []
        }),

      // Notification and logging actions
      setNotificationsEnabled: (enabled) =>
        set((state) => {
          state.notificationsEnabled = enabled
        }),

      setLogLevel: (level) =>
        set((state) => {
          state.logLevel = level
        }),

      setShowLogs: (show) =>
        set((state) => {
          state.showLogs = show
        }),

      // UI state actions
      setSidebarCollapsed: (collapsed) =>
        set((state) => {
          state.sidebarCollapsed = collapsed
        }),

      setActiveTab: (tab) =>
        set((state) => {
          state.activeTab = tab
        }),

      reset: () =>
        set((state) => {
          Object.assign(state, {
            ...initialState,
            alerts: [],
            performanceHistory: [],
          })
        }),
    }))
  )
)

// Selectors for computed values
export const systemSelectors = {
  getFilteredAlerts: (alerts: SystemAlert[], filters: SystemState['alertFilters']) => {
    return alerts.filter(alert => {
      if (filters.level && alert.level !== filters.level) {
        return false
      }
      if (filters.category && alert.category !== filters.category) {
        return false
      }
      if (filters.acknowledged !== undefined && alert.acknowledged !== filters.acknowledged) {
        return false
      }
      return true
    })
  },

  getCriticalAlerts: (alerts: SystemAlert[]) => {
    return alerts.filter(alert => alert.level === 'critical' && !alert.acknowledged)
  },

  getRecentPerformanceData: (history: SystemState['performanceHistory'], minutes: number = 60) => {
    const cutoffTime = new Date(Date.now() - minutes * 60 * 1000)
    return history.filter(entry => entry.timestamp >= cutoffTime)
  },

  getSystemHealthStatus: (services: ServiceStatus, metrics: SystemMetrics | null) => {
    const serviceStatuses = Object.values(services)
    const hasCriticalService = serviceStatuses.includes('critical')
    const hasWarningService = serviceStatuses.includes('warning')
    
    if (hasCriticalService) {
      return 'critical'
    }
    
    if (metrics) {
      const highCpu = metrics.cpu.usage > 90
      const highMemory = metrics.memory.usage > 95
      const highDisk = metrics.disk.usage > 95
      
      if (highCpu || highMemory || highDisk) {
        return 'critical'
      }
      
      const warningCpu = metrics.cpu.usage > 75
      const warningMemory = metrics.memory.usage > 80
      const warningDisk = metrics.disk.usage > 85
      
      if (hasWarningService || warningCpu || warningMemory || warningDisk) {
        return 'warning'
      }
    }
    
    return hasWarningService ? 'warning' : 'healthy'
  },

  formatUptime: (uptime: number) => {
    const days = Math.floor(uptime / 86400)
    const hours = Math.floor((uptime % 86400) / 3600)
    const minutes = Math.floor((uptime % 3600) / 60)
    
    if (days > 0) {
      return `${days}d ${hours}h ${minutes}m`
    } else if (hours > 0) {
      return `${hours}h ${minutes}m`
    } else {
      return `${minutes}m`
    }
  },
}

// Subscriptions for automatic cleanup
useSystemStore.subscribe(
  (state) => state.alerts.length,
  (alertCount) => {
    // Auto-cleanup old alerts every hour
    if (alertCount > 100) {
      setTimeout(() => {
        const store = useSystemStore.getState()
        if (store.alerts.length > 100) {
          store.clearOldAlerts(24) // Remove alerts older than 24 hours
        }
      }, 60 * 60 * 1000) // 1 hour
    }
  }
)

useSystemStore.subscribe(
  (state) => state.performanceHistory.length,
  (historyLength, previousLength) => {
    // Auto-update overall health when metrics change
    const state = useSystemStore.getState()
    if (historyLength > previousLength && state.metrics) {
      const newHealth = systemSelectors.getSystemHealthStatus(state.services, state.metrics)
      if (newHealth !== state.overallHealth) {
        state.setOverallHealth(newHealth)
      }
    }
  }
)