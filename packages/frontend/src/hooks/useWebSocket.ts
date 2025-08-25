import { useEffect, useState, useCallback } from 'react'
import { wsManager, type WebSocketEvents } from '@/lib/websocket'

export function useWebSocketConnection() {
  const [isConnected, setIsConnected] = useState(wsManager.isConnected)

  useEffect(() => {
    wsManager.setConnectionChangeHandler(setIsConnected)
    
    // Connect if not already connected
    if (!wsManager.isConnected) {
      wsManager.connect()
    }

    return () => {
      // Don't disconnect on unmount as other components might be using it
      // wsManager.disconnect()
    }
  }, [])

  const send = useCallback((event: string, data?: any) => {
    wsManager.send(event, data)
  }, [])

  return {
    isConnected,
    send,
    connect: wsManager.connect.bind(wsManager),
    disconnect: wsManager.disconnect.bind(wsManager)
  }
}

export function useWebSocketEvent<T extends keyof WebSocketEvents>(
  event: T,
  handler: (data: WebSocketEvents[T]) => void,
  deps: React.DependencyList = []
) {
  useEffect(() => {
    const unsubscribe = wsManager.on(event, handler)
    return unsubscribe
  }, deps)
}

export function useWebSocketEvents<T extends keyof WebSocketEvents>(
  events: { [K in T]: (data: WebSocketEvents[K]) => void }
) {
  useEffect(() => {
    const unsubscribes = Object.entries(events).map(([event, handler]) => {
      return wsManager.on(event as T, handler as any)
    })

    return () => {
      unsubscribes.forEach(unsubscribe => unsubscribe())
    }
  }, [events])
}