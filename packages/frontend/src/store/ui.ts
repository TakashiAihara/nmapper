import { create } from 'zustand'
import { devtools, persist } from 'zustand/middleware'

export interface UIState {
  // Theme and appearance
  theme: 'light' | 'dark' | 'system'
  sidebarCollapsed: boolean
  
  // Layout and panels
  showDevtools: boolean
  activePanel: string | null
  
  // Table and list preferences
  pageSize: number
  sortPreferences: Record<string, { column: string; direction: 'asc' | 'desc' }>
  
  // Notification preferences
  showNotifications: boolean
  notificationPosition: 'top-right' | 'top-left' | 'bottom-right' | 'bottom-left'
  
  // Actions
  setTheme: (theme: 'light' | 'dark' | 'system') => void
  toggleSidebar: () => void
  setSidebarCollapsed: (collapsed: boolean) => void
  setShowDevtools: (show: boolean) => void
  setActivePanel: (panel: string | null) => void
  setPageSize: (size: number) => void
  setSortPreference: (table: string, column: string, direction: 'asc' | 'desc') => void
  setShowNotifications: (show: boolean) => void
  setNotificationPosition: (position: 'top-right' | 'top-left' | 'bottom-right' | 'bottom-left') => void
  reset: () => void
}

const initialState = {
  theme: 'system' as const,
  sidebarCollapsed: false,
  showDevtools: process.env.NODE_ENV === 'development',
  activePanel: null,
  pageSize: 25,
  sortPreferences: {},
  showNotifications: true,
  notificationPosition: 'top-right' as const,
}

export const useUIStore = create<UIState>()(
  devtools(
    persist(
      (set) => ({
        ...initialState,
        
        setTheme: (theme) => set({ theme }),
        
        toggleSidebar: () => set((state) => ({ sidebarCollapsed: !state.sidebarCollapsed })),
        
        setSidebarCollapsed: (collapsed) => set({ sidebarCollapsed: collapsed }),
        
        setShowDevtools: (show) => set({ showDevtools: show }),
        
        setActivePanel: (panel) => set({ activePanel: panel }),
        
        setPageSize: (size) => set({ pageSize: size }),
        
        setSortPreference: (table, column, direction) =>
          set((state) => ({
            sortPreferences: {
              ...state.sortPreferences,
              [table]: { column, direction },
            },
          })),
        
        setShowNotifications: (show) => set({ showNotifications: show }),
        
        setNotificationPosition: (position) => set({ notificationPosition: position }),
        
        reset: () => set(initialState),
      }),
      {
        name: 'nmapper-ui-store',
        partialize: (state) => ({
          theme: state.theme,
          sidebarCollapsed: state.sidebarCollapsed,
          pageSize: state.pageSize,
          sortPreferences: state.sortPreferences,
          showNotifications: state.showNotifications,
          notificationPosition: state.notificationPosition,
        }),
      }
    ),
    {
      name: 'UI Store',
    }
  )
)