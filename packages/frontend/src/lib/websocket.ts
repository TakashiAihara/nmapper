import { queryClient } from './queryClient'

// WebSocket event types
export interface WebSocketEvents {
  // Device events
  'device:discovered': { device: any }
  'device:updated': { device: any }
  'device:removed': { deviceId: string }
  'device:status_changed': { deviceId: string; status: 'online' | 'offline' }
  
  // Scan events
  'scan:started': { scanId: string; timestamp: Date }
  'scan:progress': { scanId: string; progress: number; stage: string }
  'scan:completed': { scanId: string; snapshotId: string; timestamp: Date }
  'scan:failed': { scanId: string; error: string; timestamp: Date }
  
  // System events
  'system:health_changed': { status: 'healthy' | 'degraded' | 'unhealthy'; components: any[] }
  'system:alert': { level: 'info' | 'warning' | 'error'; message: string; timestamp: Date }
  'system:metrics': { cpu: number; memory: number; disk: number }
  
  // Network events
  'network:topology_changed': { devices: any[]; connections: any[] }
  'network:new_device': { device: any }
  'network:device_risk_changed': { deviceId: string; oldRisk: string; newRisk: string }
  
  // Snapshot events
  'snapshot:created': { snapshotId: string; timestamp: Date }
  'snapshot:deleted': { snapshotId: string }
}

type EventHandler<T extends keyof WebSocketEvents> = (data: WebSocketEvents[T]) => void
type AnyEventHandler = (event: string, data: any) => void

class WebSocketManager {
  private ws: WebSocket | null = null
  private reconnectAttempts = 0
  private maxReconnectAttempts = 5
  private reconnectDelay = 1000
  private eventHandlers = new Map<string, Set<AnyEventHandler>>()
  private isConnecting = false
  private url: string
  private onConnectionChange?: (connected: boolean) => void

  constructor(url: string = '/api/ws') {
    // Convert HTTP URL to WebSocket URL
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:'
    const host = window.location.host
    this.url = `${protocol}//${host}${url}`
  }

  connect(): void {
    if (this.ws?.readyState === WebSocket.OPEN || this.isConnecting) {
      return
    }

    this.isConnecting = true

    try {
      this.ws = new WebSocket(this.url)
      this.setupEventListeners()
    } catch (error) {
      console.error('WebSocket connection failed:', error)
      this.handleReconnect()
    }
  }

  disconnect(): void {
    this.reconnectAttempts = this.maxReconnectAttempts // Prevent reconnection
    if (this.ws) {
      this.ws.close()
      this.ws = null
    }
  }

  private setupEventListeners(): void {
    if (!this.ws) return

    this.ws.onopen = () => {
      console.log('WebSocket connected')
      this.isConnecting = false
      this.reconnectAttempts = 0
      this.reconnectDelay = 1000
      this.onConnectionChange?.(true)
    }

    this.ws.onclose = (event) => {
      console.log('WebSocket disconnected:', event.code, event.reason)
      this.isConnecting = false
      this.onConnectionChange?.(false)
      
      if (this.reconnectAttempts < this.maxReconnectAttempts) {
        this.handleReconnect()
      }
    }

    this.ws.onerror = (error) => {
      console.error('WebSocket error:', error)
      this.isConnecting = false
    }

    this.ws.onmessage = (event) => {
      try {
        const message = JSON.parse(event.data)
        this.handleMessage(message)
      } catch (error) {
        console.error('Failed to parse WebSocket message:', error)
      }
    }
  }

  private handleMessage(message: any): void {
    const { event, data } = message

    if (!event) {
      console.warn('Received message without event type:', message)
      return
    }

    // Trigger specific event handlers
    const handlers = this.eventHandlers.get(event)
    if (handlers) {
      handlers.forEach(handler => {
        try {
          handler(event, data)
        } catch (error) {
          console.error(`Error handling WebSocket event ${event}:`, error)
        }
      })
    }

    // Handle React Query cache invalidation
    this.handleQueryInvalidation(event, data)
  }

  private handleQueryInvalidation(event: string, data: any): void {
    switch (event) {
      case 'device:discovered':
      case 'device:updated':
      case 'device:removed':
      case 'device:status_changed':
        queryClient.invalidateQueries({ queryKey: ['network', 'devices'] })
        queryClient.invalidateQueries({ queryKey: ['network', 'current'] })
        break

      case 'scan:completed':
        queryClient.invalidateQueries({ queryKey: ['snapshots'] })
        queryClient.invalidateQueries({ queryKey: ['network'] })
        break

      case 'snapshot:created':
      case 'snapshot:deleted':
        queryClient.invalidateQueries({ queryKey: ['snapshots'] })
        break

      case 'system:health_changed':
        queryClient.invalidateQueries({ queryKey: ['system', 'health'] })
        break

      case 'system:metrics':
        queryClient.invalidateQueries({ queryKey: ['system', 'metrics'] })
        break

      case 'network:topology_changed':
        queryClient.invalidateQueries({ queryKey: ['network', 'topology'] })
        break
    }
  }

  private handleReconnect(): void {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.error('Max reconnection attempts reached')
      return
    }

    this.reconnectAttempts++
    const delay = this.reconnectDelay * Math.pow(2, this.reconnectAttempts - 1)
    
    console.log(`Attempting to reconnect in ${delay}ms (attempt ${this.reconnectAttempts})`)
    
    setTimeout(() => {
      this.connect()
    }, delay)
  }

  // Event subscription methods
  on<T extends keyof WebSocketEvents>(event: T, handler: EventHandler<T>): () => void {
    const eventStr = event as string
    
    if (!this.eventHandlers.has(eventStr)) {
      this.eventHandlers.set(eventStr, new Set())
    }
    
    const wrappedHandler: AnyEventHandler = (eventType, data) => {
      if (eventType === eventStr) {
        handler(data)
      }
    }
    
    this.eventHandlers.get(eventStr)!.add(wrappedHandler)
    
    // Return unsubscribe function
    return () => {
      this.eventHandlers.get(eventStr)?.delete(wrappedHandler)
    }
  }

  off(event: string, handler?: AnyEventHandler): void {
    if (handler) {
      this.eventHandlers.get(event)?.delete(handler)
    } else {
      this.eventHandlers.delete(event)
    }
  }

  // Send message to server
  send(event: string, data?: any): void {
    if (this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify({ event, data }))
    } else {
      console.warn('WebSocket not connected, cannot send message:', event)
    }
  }

  // Connection status
  get isConnected(): boolean {
    return this.ws?.readyState === WebSocket.OPEN
  }

  setConnectionChangeHandler(handler: (connected: boolean) => void): void {
    this.onConnectionChange = handler
  }
}

// Create singleton instance
export const wsManager = new WebSocketManager()

// React hooks for WebSocket functionality
export function useWebSocket() {
  return {
    connect: () => wsManager.connect(),
    disconnect: () => wsManager.disconnect(),
    send: (event: string, data?: any) => wsManager.send(event, data),
    isConnected: wsManager.isConnected
  }
}

export function useWebSocketEvent<T extends keyof WebSocketEvents>(
  event: T,
  handler: EventHandler<T>,
  deps: React.DependencyList = []
) {
  React.useEffect(() => {
    const unsubscribe = wsManager.on(event, handler)
    return unsubscribe
  }, deps)
}

// Auto-connect when the module loads
if (typeof window !== 'undefined') {
  wsManager.connect()
}