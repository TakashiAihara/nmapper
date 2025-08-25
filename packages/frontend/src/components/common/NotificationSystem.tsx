import React, { createContext, useContext, useReducer, useCallback, useEffect } from 'react'
import { Card, CardContent, Button } from '@/components/ui'
import { cn } from '@/lib/utils'
import {
  CheckCircle,
  AlertTriangle,
  AlertCircle,
  Info,
  X,
  Bell,
  Volume2,
  VolumeX
} from 'lucide-react'

export interface Notification {
  id: string
  type: 'success' | 'error' | 'warning' | 'info'
  title: string
  message?: string
  duration?: number // in milliseconds, 0 for persistent
  persistent?: boolean
  actions?: Array<{
    label: string
    action: () => void
    variant?: 'default' | 'outline' | 'destructive'
  }>
  onDismiss?: () => void
  timestamp: Date
  sound?: boolean
}

interface NotificationState {
  notifications: Notification[]
  soundEnabled: boolean
  maxNotifications: number
}

type NotificationAction =
  | { type: 'ADD_NOTIFICATION'; notification: Notification }
  | { type: 'REMOVE_NOTIFICATION'; id: string }
  | { type: 'CLEAR_ALL' }
  | { type: 'TOGGLE_SOUND' }
  | { type: 'SET_MAX_NOTIFICATIONS'; max: number }

const initialState: NotificationState = {
  notifications: [],
  soundEnabled: true,
  maxNotifications: 5
}

function notificationReducer(state: NotificationState, action: NotificationAction): NotificationState {
  switch (action.type) {
    case 'ADD_NOTIFICATION': {
      const newNotifications = [action.notification, ...state.notifications]
      // Keep only the max number of notifications
      if (newNotifications.length > state.maxNotifications) {
        newNotifications.splice(state.maxNotifications)
      }
      return {
        ...state,
        notifications: newNotifications
      }
    }
    
    case 'REMOVE_NOTIFICATION':
      return {
        ...state,
        notifications: state.notifications.filter(n => n.id !== action.id)
      }
    
    case 'CLEAR_ALL':
      return {
        ...state,
        notifications: []
      }
    
    case 'TOGGLE_SOUND':
      return {
        ...state,
        soundEnabled: !state.soundEnabled
      }
    
    case 'SET_MAX_NOTIFICATIONS':
      return {
        ...state,
        maxNotifications: action.max
      }
    
    default:
      return state
  }
}

interface NotificationContextValue {
  notifications: Notification[]
  addNotification: (notification: Omit<Notification, 'id' | 'timestamp'>) => void
  removeNotification: (id: string) => void
  clearAll: () => void
  showSuccess: (title: string, message?: string, options?: Partial<Notification>) => void
  showError: (title: string, message?: string, options?: Partial<Notification>) => void
  showWarning: (title: string, message?: string, options?: Partial<Notification>) => void
  showInfo: (title: string, message?: string, options?: Partial<Notification>) => void
  soundEnabled: boolean
  toggleSound: () => void
}

const NotificationContext = createContext<NotificationContextValue | undefined>(undefined)

export function useNotifications() {
  const context = useContext(NotificationContext)
  if (!context) {
    throw new Error('useNotifications must be used within a NotificationProvider')
  }
  return context
}

interface NotificationProviderProps {
  children: React.ReactNode
  position?: 'top-right' | 'top-left' | 'bottom-right' | 'bottom-left' | 'top-center' | 'bottom-center'
  defaultDuration?: number
  maxNotifications?: number
}

export function NotificationProvider({
  children,
  position = 'top-right',
  defaultDuration = 5000,
  maxNotifications = 5
}: NotificationProviderProps) {
  const [state, dispatch] = useReducer(notificationReducer, {
    ...initialState,
    maxNotifications
  })

  // Audio context for notification sounds
  const playNotificationSound = useCallback((type: Notification['type']) => {
    if (!state.soundEnabled) return
    
    try {
      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)()
      const oscillator = audioContext.createOscillator()
      const gainNode = audioContext.createGain()

      oscillator.connect(gainNode)
      gainNode.connect(audioContext.destination)

      // Different tones for different notification types
      const frequencies = {
        success: 800,
        info: 600,
        warning: 400,
        error: 300
      }

      oscillator.frequency.value = frequencies[type]
      oscillator.type = 'sine'
      
      gainNode.gain.setValueAtTime(0.3, audioContext.currentTime)
      gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.3)

      oscillator.start(audioContext.currentTime)
      oscillator.stop(audioContext.currentTime + 0.3)
    } catch (error) {
      console.warn('Failed to play notification sound:', error)
    }
  }, [state.soundEnabled])

  const addNotification = useCallback((notification: Omit<Notification, 'id' | 'timestamp'>) => {
    const id = `notification-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
    const fullNotification: Notification = {
      ...notification,
      id,
      timestamp: new Date(),
      duration: notification.duration ?? (notification.persistent ? 0 : defaultDuration)
    }

    dispatch({ type: 'ADD_NOTIFICATION', notification: fullNotification })

    // Play sound if enabled
    if (notification.sound !== false) {
      playNotificationSound(notification.type)
    }

    // Auto-dismiss after duration
    if (fullNotification.duration && fullNotification.duration > 0) {
      setTimeout(() => {
        dispatch({ type: 'REMOVE_NOTIFICATION', id })
      }, fullNotification.duration)
    }
  }, [defaultDuration, playNotificationSound])

  const removeNotification = useCallback((id: string) => {
    const notification = state.notifications.find(n => n.id === id)
    if (notification?.onDismiss) {
      notification.onDismiss()
    }
    dispatch({ type: 'REMOVE_NOTIFICATION', id })
  }, [state.notifications])

  const clearAll = useCallback(() => {
    dispatch({ type: 'CLEAR_ALL' })
  }, [])

  const showSuccess = useCallback((title: string, message?: string, options?: Partial<Notification>) => {
    addNotification({ type: 'success', title, message, ...options })
  }, [addNotification])

  const showError = useCallback((title: string, message?: string, options?: Partial<Notification>) => {
    addNotification({ type: 'error', title, message, persistent: true, ...options })
  }, [addNotification])

  const showWarning = useCallback((title: string, message?: string, options?: Partial<Notification>) => {
    addNotification({ type: 'warning', title, message, ...options })
  }, [addNotification])

  const showInfo = useCallback((title: string, message?: string, options?: Partial<Notification>) => {
    addNotification({ type: 'info', title, message, ...options })
  }, [addNotification])

  const toggleSound = useCallback(() => {
    dispatch({ type: 'TOGGLE_SOUND' })
  }, [])

  const contextValue: NotificationContextValue = {
    notifications: state.notifications,
    addNotification,
    removeNotification,
    clearAll,
    showSuccess,
    showError,
    showWarning,
    showInfo,
    soundEnabled: state.soundEnabled,
    toggleSound
  }

  const positionClasses = {
    'top-right': 'top-4 right-4',
    'top-left': 'top-4 left-4',
    'bottom-right': 'bottom-4 right-4',
    'bottom-left': 'bottom-4 left-4',
    'top-center': 'top-4 left-1/2 transform -translate-x-1/2',
    'bottom-center': 'bottom-4 left-1/2 transform -translate-x-1/2'
  }

  return (
    <NotificationContext.Provider value={contextValue}>
      {children}
      
      {/* Notification Container */}
      <div className={cn('fixed z-50 flex flex-col space-y-2 w-96 max-w-[calc(100vw-2rem)]', positionClasses[position])}>
        {state.notifications.map((notification) => (
          <NotificationCard
            key={notification.id}
            notification={notification}
            onDismiss={() => removeNotification(notification.id)}
          />
        ))}
        
        {/* Sound Control */}
        {state.notifications.length > 0 && (
          <div className="flex justify-end">
            <Button
              variant="ghost"
              size="sm"
              onClick={toggleSound}
              className="h-8 w-8 p-0 bg-background/80 backdrop-blur-sm border"
            >
              {state.soundEnabled ? (
                <Volume2 className="h-4 w-4" />
              ) : (
                <VolumeX className="h-4 w-4" />
              )}
            </Button>
          </div>
        )}
      </div>
    </NotificationContext.Provider>
  )
}

interface NotificationCardProps {
  notification: Notification
  onDismiss: () => void
}

function NotificationCard({ notification, onDismiss }: NotificationCardProps) {
  const [isVisible, setIsVisible] = React.useState(false)
  const [isExiting, setIsExiting] = React.useState(false)

  useEffect(() => {
    // Animate in
    requestAnimationFrame(() => {
      setIsVisible(true)
    })
  }, [])

  const handleDismiss = () => {
    setIsExiting(true)
    setTimeout(() => {
      onDismiss()
    }, 300) // Match transition duration
  }

  const icons = {
    success: CheckCircle,
    error: AlertCircle,
    warning: AlertTriangle,
    info: Info
  }

  const colors = {
    success: {
      bg: 'bg-green-50 dark:bg-green-900/20',
      border: 'border-green-200 dark:border-green-800',
      icon: 'text-green-600 dark:text-green-400',
      title: 'text-green-800 dark:text-green-200'
    },
    error: {
      bg: 'bg-red-50 dark:bg-red-900/20',
      border: 'border-red-200 dark:border-red-800',
      icon: 'text-red-600 dark:text-red-400',
      title: 'text-red-800 dark:text-red-200'
    },
    warning: {
      bg: 'bg-yellow-50 dark:bg-yellow-900/20',
      border: 'border-yellow-200 dark:border-yellow-800',
      icon: 'text-yellow-600 dark:text-yellow-400',
      title: 'text-yellow-800 dark:text-yellow-200'
    },
    info: {
      bg: 'bg-blue-50 dark:bg-blue-900/20',
      border: 'border-blue-200 dark:border-blue-800',
      icon: 'text-blue-600 dark:text-blue-400',
      title: 'text-blue-800 dark:text-blue-200'
    }
  }

  const Icon = icons[notification.type]
  const colorScheme = colors[notification.type]

  return (
    <Card
      className={cn(
        'transition-all duration-300 ease-in-out shadow-lg',
        colorScheme.bg,
        colorScheme.border,
        isVisible && !isExiting ? 'translate-x-0 opacity-100' : 'translate-x-full opacity-0',
        isExiting && '-translate-x-full opacity-0'
      )}
    >
      <CardContent className="p-4">
        <div className="flex items-start space-x-3">
          <Icon className={cn('h-5 w-5 flex-shrink-0 mt-0.5', colorScheme.icon)} />
          
          <div className="flex-1 min-w-0">
            <h4 className={cn('text-sm font-semibold', colorScheme.title)}>
              {notification.title}
            </h4>
            
            {notification.message && (
              <p className="text-sm text-muted-foreground mt-1">
                {notification.message}
              </p>
            )}
            
            {notification.actions && notification.actions.length > 0 && (
              <div className="flex space-x-2 mt-3">
                {notification.actions.map((action, index) => (
                  <Button
                    key={index}
                    variant={action.variant || 'outline'}
                    size="sm"
                    onClick={() => {
                      action.action()
                      handleDismiss()
                    }}
                    className="h-7 text-xs"
                  >
                    {action.label}
                  </Button>
                ))}
              </div>
            )}
            
            <div className="flex items-center justify-between mt-2">
              <span className="text-xs text-muted-foreground">
                {notification.timestamp.toLocaleTimeString()}
              </span>
              
              {!notification.persistent && notification.duration && notification.duration > 0 && (
                <div className="w-16 h-1 bg-muted rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-primary rounded-full transition-all ease-linear"
                    style={{
                      animation: `shrink ${notification.duration}ms linear forwards`
                    }}
                  />
                </div>
              )}
            </div>
          </div>
          
          <Button
            variant="ghost"
            size="sm"
            onClick={handleDismiss}
            className="h-6 w-6 p-0 hover:bg-background/50"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      </CardContent>
      
      <style jsx>{`
        @keyframes shrink {
          from { width: 100%; }
          to { width: 0%; }
        }
      `}</style>
    </Card>
  )
}

// Utility function for error notifications with retry
export function createRetryNotification(
  title: string,
  message: string,
  retryAction: () => void,
  maxRetries = 3
) {
  let retryCount = 0
  
  return {
    type: 'error' as const,
    title,
    message,
    persistent: true,
    actions: [
      {
        label: `Retry${retryCount > 0 ? ` (${maxRetries - retryCount} left)` : ''}`,
        action: () => {
          retryCount++
          if (retryCount <= maxRetries) {
            retryAction()
          }
        },
        variant: 'default' as const
      }
    ]
  }
}