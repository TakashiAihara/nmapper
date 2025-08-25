// Re-export all stores
export { useUIStore, type UIState } from './ui'
export { useAppStore, type AppState } from './app'
export { useNetworkStore, type NetworkState } from './network'
export { useSystemStore, type SystemState } from './system'
export { useConfigStore, type ConfigState } from './config'

// Store utilities
import { useUIStore } from './ui'
import { useAppStore } from './app'
import { useNetworkStore } from './network'
import { useSystemStore } from './system'
import { useConfigStore } from './config'

export const resetAllStores = () => {
  const { reset: resetUI } = useUIStore.getState()
  const { reset: resetApp } = useAppStore.getState()
  const { reset: resetNetwork } = useNetworkStore.getState()
  const { reset: resetSystem } = useSystemStore.getState()
  const { reset: resetConfig } = useConfigStore.getState()
  
  resetUI()
  resetApp()
  resetNetwork()
  resetSystem()
  resetConfig()
}