import { create } from 'zustand'
import { subscribeWithSelector } from 'zustand/middleware'
import { immer } from 'zustand/middleware/immer'
import type { Configuration } from '@nmapper/shared'

export interface ConfigState {
  // Configuration data
  currentConfig: Configuration | null
  pendingChanges: Partial<Configuration>
  hasUnsavedChanges: boolean
  
  // UI state for configuration forms
  activeSection: 'scanning' | 'database' | 'network' | 'logging' | 'ui' | 'security'
  isEditing: boolean
  validationErrors: Record<string, string[]>
  
  // Import/Export state
  isImporting: boolean
  isExporting: boolean
  lastExportTime: Date | null
  lastImportTime: Date | null
  
  // Backup and versioning
  configHistory: Array<{
    id: string
    config: Configuration
    timestamp: Date
    description: string
  }>
  maxHistoryEntries: number
  
  // Form state
  formData: Partial<Configuration>
  formErrors: Record<string, string>
  isDirty: boolean
  
  // Actions
  setCurrentConfig: (config: Configuration) => void
  setPendingChanges: (changes: Partial<Configuration>) => void
  applyPendingChanges: () => void
  discardPendingChanges: () => void
  
  setActiveSection: (section: ConfigState['activeSection']) => void
  setIsEditing: (editing: boolean) => void
  setValidationErrors: (errors: Record<string, string[]>) => void
  clearValidationErrors: () => void
  
  setIsImporting: (importing: boolean) => void
  setIsExporting: (exporting: boolean) => void
  updateLastExportTime: () => void
  updateLastImportTime: () => void
  
  addToHistory: (config: Configuration, description?: string) => void
  restoreFromHistory: (historyId: string) => Configuration | null
  clearHistory: () => void
  
  setFormData: (data: Partial<Configuration>) => void
  updateFormField: (field: string, value: any) => void
  setFormErrors: (errors: Record<string, string>) => void
  clearFormErrors: () => void
  validateForm: () => boolean
  resetForm: () => void
  
  reset: () => void
}

const initialState = {
  currentConfig: null,
  pendingChanges: {},
  hasUnsavedChanges: false,
  
  activeSection: 'scanning' as const,
  isEditing: false,
  validationErrors: {},
  
  isImporting: false,
  isExporting: false,
  lastExportTime: null,
  lastImportTime: null,
  
  configHistory: [],
  maxHistoryEntries: 20,
  
  formData: {},
  formErrors: {},
  isDirty: false,
}

export const useConfigStore = create<ConfigState>()(
  subscribeWithSelector(
    immer((set, get) => ({
      ...initialState,

      // Configuration management actions
      setCurrentConfig: (config) =>
        set((state) => {
          state.currentConfig = config
          state.formData = { ...config }
          state.hasUnsavedChanges = false
          state.isDirty = false
        }),

      setPendingChanges: (changes) =>
        set((state) => {
          state.pendingChanges = { ...state.pendingChanges, ...changes }
          state.hasUnsavedChanges = Object.keys(state.pendingChanges).length > 0
        }),

      applyPendingChanges: () =>
        set((state) => {
          if (state.currentConfig) {
            const newConfig = { ...state.currentConfig, ...state.pendingChanges }
            state.currentConfig = newConfig
            state.formData = { ...newConfig }
            
            // Add to history
            const historyEntry = {
              id: `config_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
              config: { ...state.currentConfig },
              timestamp: new Date(),
              description: 'Configuration updated',
            }
            
            state.configHistory.unshift(historyEntry)
            
            if (state.configHistory.length > state.maxHistoryEntries) {
              state.configHistory = state.configHistory.slice(0, state.maxHistoryEntries)
            }
          }
          
          state.pendingChanges = {}
          state.hasUnsavedChanges = false
          state.isDirty = false
        }),

      discardPendingChanges: () =>
        set((state) => {
          state.pendingChanges = {}
          state.hasUnsavedChanges = false
          state.formData = state.currentConfig ? { ...state.currentConfig } : {}
          state.isDirty = false
          state.formErrors = {}
        }),

      // UI state actions
      setActiveSection: (section) =>
        set((state) => {
          state.activeSection = section
        }),

      setIsEditing: (editing) =>
        set((state) => {
          state.isEditing = editing
          if (!editing) {
            state.formErrors = {}
            state.validationErrors = {}
          }
        }),

      setValidationErrors: (errors) =>
        set((state) => {
          state.validationErrors = errors
        }),

      clearValidationErrors: () =>
        set((state) => {
          state.validationErrors = {}
        }),

      // Import/Export actions
      setIsImporting: (importing) =>
        set((state) => {
          state.isImporting = importing
        }),

      setIsExporting: (exporting) =>
        set((state) => {
          state.isExporting = exporting
        }),

      updateLastExportTime: () =>
        set((state) => {
          state.lastExportTime = new Date()
        }),

      updateLastImportTime: () =>
        set((state) => {
          state.lastImportTime = new Date()
        }),

      // History management actions
      addToHistory: (config, description = 'Manual save') =>
        set((state) => {
          const historyEntry = {
            id: `config_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            config: { ...config },
            timestamp: new Date(),
            description,
          }
          
          state.configHistory.unshift(historyEntry)
          
          if (state.configHistory.length > state.maxHistoryEntries) {
            state.configHistory = state.configHistory.slice(0, state.maxHistoryEntries)
          }
        }),

      restoreFromHistory: (historyId) => {
        const state = get()
        const historyEntry = state.configHistory.find(entry => entry.id === historyId)
        
        if (historyEntry) {
          set((state) => {
            state.currentConfig = { ...historyEntry.config }
            state.formData = { ...historyEntry.config }
            state.pendingChanges = {}
            state.hasUnsavedChanges = false
            state.isDirty = false
          })
          
          return historyEntry.config
        }
        
        return null
      },

      clearHistory: () =>
        set((state) => {
          state.configHistory = []
        }),

      // Form management actions
      setFormData: (data) =>
        set((state) => {
          state.formData = { ...state.formData, ...data }
          state.isDirty = true
          
          // Clear related form errors
          Object.keys(data).forEach(key => {
            delete state.formErrors[key]
          })
        }),

      updateFormField: (field, value) =>
        set((state) => {
          // Handle nested field updates (e.g., "scanning.ports")
          const keys = field.split('.')
          let current = state.formData as any
          
          for (let i = 0; i < keys.length - 1; i++) {
            const key = keys[i]
            if (!current[key]) {
              current[key] = {}
            }
            current = current[key]
          }
          
          current[keys[keys.length - 1]] = value
          state.isDirty = true
          
          // Clear field error
          delete state.formErrors[field]
        }),

      setFormErrors: (errors) =>
        set((state) => {
          state.formErrors = errors
        }),

      clearFormErrors: () =>
        set((state) => {
          state.formErrors = {}
        }),

      validateForm: () => {
        const state = get()
        const errors: Record<string, string> = {}
        
        // Basic validation - extend as needed
        if (state.formData.scanning) {
          const scanning = state.formData.scanning
          
          if (scanning.defaultPorts && typeof scanning.defaultPorts !== 'string') {
            errors['scanning.defaultPorts'] = 'Ports must be a string'
          }
          
          if (scanning.timeout !== undefined && (scanning.timeout < 1 || scanning.timeout > 300)) {
            errors['scanning.timeout'] = 'Timeout must be between 1 and 300 seconds'
          }
          
          if (scanning.maxConcurrentScans !== undefined && (scanning.maxConcurrentScans < 1 || scanning.maxConcurrentScans > 100)) {
            errors['scanning.maxConcurrentScans'] = 'Concurrent scans must be between 1 and 100'
          }
        }
        
        if (state.formData.database) {
          const database = state.formData.database
          
          if (database.port !== undefined && (database.port < 1 || database.port > 65535)) {
            errors['database.port'] = 'Port must be between 1 and 65535'
          }
          
          if (database.maxConnections !== undefined && (database.maxConnections < 1 || database.maxConnections > 1000)) {
            errors['database.maxConnections'] = 'Max connections must be between 1 and 1000'
          }
        }
        
        set((state) => {
          state.formErrors = errors
        })
        
        return Object.keys(errors).length === 0
      },

      resetForm: () =>
        set((state) => {
          state.formData = state.currentConfig ? { ...state.currentConfig } : {}
          state.formErrors = {}
          state.isDirty = false
        }),

      reset: () =>
        set((state) => {
          Object.assign(state, {
            ...initialState,
            configHistory: [],
          })
        }),
    }))
  )
)

// Selectors for computed values
export const configSelectors = {
  getFormField: (formData: Partial<Configuration>, field: string) => {
    const keys = field.split('.')
    let current = formData as any
    
    for (const key of keys) {
      if (current && typeof current === 'object' && key in current) {
        current = current[key]
      } else {
        return undefined
      }
    }
    
    return current
  },

  getNestedError: (errors: Record<string, string>, field: string) => {
    return errors[field]
  },

  hasChangesInSection: (currentConfig: Configuration | null, formData: Partial<Configuration>, section: string) => {
    if (!currentConfig) return false
    
    const currentSection = (currentConfig as any)[section]
    const formSection = (formData as any)[section]
    
    return JSON.stringify(currentSection) !== JSON.stringify(formSection)
  },

  getRecentHistory: (history: ConfigState['configHistory'], limit: number = 5) => {
    return history.slice(0, limit)
  },

  formatConfigSize: (config: Configuration) => {
    const configString = JSON.stringify(config)
    const bytes = new Blob([configString]).size
    
    if (bytes < 1024) {
      return `${bytes} B`
    } else if (bytes < 1024 * 1024) {
      return `${(bytes / 1024).toFixed(1)} KB`
    } else {
      return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
    }
  },

  getConfigDiff: (config1: Configuration, config2: Configuration) => {
    const diff: Record<string, { old: any; new: any }> = {}
    
    const compareObjects = (obj1: any, obj2: any, path = '') => {
      const keys = new Set([...Object.keys(obj1), ...Object.keys(obj2)])
      
      for (const key of keys) {
        const currentPath = path ? `${path}.${key}` : key
        const val1 = obj1[key]
        const val2 = obj2[key]
        
        if (typeof val1 === 'object' && typeof val2 === 'object' && val1 !== null && val2 !== null) {
          compareObjects(val1, val2, currentPath)
        } else if (val1 !== val2) {
          diff[currentPath] = { old: val1, new: val2 }
        }
      }
    }
    
    compareObjects(config1, config2)
    return diff
  },
}

// Subscriptions for side effects
useConfigStore.subscribe(
  (state) => state.formData,
  (formData, previousFormData) => {
    // Auto-save form data to pending changes after 2 seconds of inactivity
    if (JSON.stringify(formData) !== JSON.stringify(previousFormData)) {
      const timeoutId = setTimeout(() => {
        const currentState = useConfigStore.getState()
        if (currentState.isDirty) {
          currentState.setPendingChanges(formData)
        }
      }, 2000)
      
      // Store timeout ID for potential cleanup
      ;(globalThis as any).__configAutoSaveTimeout = timeoutId
    }
  },
  { fireImmediately: false }
)

useConfigStore.subscribe(
  (state) => state.currentConfig,
  (currentConfig) => {
    // Clear pending changes when config changes externally
    if (currentConfig) {
      const state = useConfigStore.getState()
      if (Object.keys(state.pendingChanges).length > 0) {
        state.discardPendingChanges()
      }
    }
  }
)