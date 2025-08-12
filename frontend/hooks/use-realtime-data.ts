import { useEffect, useRef, useState } from 'react'

interface UseRealtimeDataOptions {
  endpoint?: string
  reconnectInterval?: number
  maxReconnectAttempts?: number
  onConnect?: () => void
  onDisconnect?: () => void
  onError?: (error: Event) => void
}

interface RealtimeData {
  type: string
  data: any
  timestamp: string
}

export function useRealtimeData<T = any>(
  options: UseRealtimeDataOptions = {}
) {
  const {
    endpoint = '/ws',
    reconnectInterval = 5000,
    maxReconnectAttempts = 5,
    onConnect,
    onDisconnect,
    onError
  } = options

  const [data, setData] = useState<T | null>(null)
  const [isConnected, setIsConnected] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [reconnectAttempts, setReconnectAttempts] = useState(0)

  const wsRef = useRef<WebSocket | null>(null)
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null)

  const connect = () => {
    try {
      const wsUrl = `${process.env.NEXT_PUBLIC_WS_URL || 'ws://localhost:8000'}${endpoint}`
      const token = localStorage.getItem('auth_token')
      
      if (!token) {
        setError('Authentication required for real-time data')
        return
      }

      // Add auth token to WebSocket URL
      const wsUrlWithAuth = `${wsUrl}?token=${encodeURIComponent(token)}`
      
      wsRef.current = new WebSocket(wsUrlWithAuth)

      wsRef.current.onopen = () => {
        console.log('WebSocket connected')
        setIsConnected(true)
        setError(null)
        setReconnectAttempts(0)
        onConnect?.()
      }

      wsRef.current.onmessage = (event) => {
        try {
          const message: RealtimeData = JSON.parse(event.data)
          setData(message.data)
        } catch (err) {
          console.error('Failed to parse WebSocket message:', err)
        }
      }

      wsRef.current.onclose = (event) => {
        console.log('WebSocket disconnected:', event.code, event.reason)
        setIsConnected(false)
        onDisconnect?.()

        // Attempt to reconnect if not manually closed
        if (event.code !== 1000 && reconnectAttempts < maxReconnectAttempts) {
          setReconnectAttempts(prev => prev + 1)
          reconnectTimeoutRef.current = setTimeout(() => {
            console.log(`Attempting to reconnect... (${reconnectAttempts + 1}/${maxReconnectAttempts})`)
            connect()
          }, reconnectInterval)
        } else if (reconnectAttempts >= maxReconnectAttempts) {
          setError('Failed to establish real-time connection after multiple attempts')
        }
      }

      wsRef.current.onerror = (event) => {
        console.error('WebSocket error:', event)
        setError('Real-time connection error')
        onError?.(event)
      }

    } catch (err) {
      console.error('Failed to create WebSocket connection:', err)
      setError('Failed to establish real-time connection')
    }
  }

  const disconnect = () => {
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current)
      reconnectTimeoutRef.current = null
    }

    if (wsRef.current) {
      wsRef.current.close(1000, 'Manual disconnect')
      wsRef.current = null
    }
    
    setIsConnected(false)
    setData(null)
  }

  const sendMessage = (message: any) => {
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify(message))
      return true
    }
    return false
  }

  useEffect(() => {
    // Only connect if we have authentication
    if (localStorage.getItem('auth_token')) {
      connect()
    }

    // Cleanup on unmount
    return () => {
      disconnect()
    }
  }, [endpoint])

  return {
    data,
    isConnected,
    error,
    connect,
    disconnect,
    sendMessage,
    reconnectAttempts
  }
}

// Specific hooks for different data types
export function usePortfolioUpdates() {
  return useRealtimeData<{
    total_value_usd: number
    total_change_24h: number
    assets: Record<string, any>
  }>({
    endpoint: '/ws/portfolio'
  })
}

export function useMarketUpdates() {
  return useRealtimeData<{
    symbol: string
    price: number
    change_24h: number
    volume_24h: number
  }>({
    endpoint: '/ws/market'
  })
}

export function useSignalUpdates() {
  return useRealtimeData<{
    id: number
    symbol: string
    signal_type: string
    confidence: number
    created_at: string
  }>({
    endpoint: '/ws/signals'
  })
}

export function usePriceUpdates(symbols: string[]) {
  const [prices, setPrices] = useState<Record<string, number>>({})
  
  const { data, isConnected } = useRealtimeData<{
    symbol: string
    price: number
    timestamp: string
  }>({
    endpoint: `/ws/prices?symbols=${symbols.join(',')}`
  })

  useEffect(() => {
    if (data) {
      setPrices(prev => ({
        ...prev,
        [data.symbol]: data.price
      }))
    }
  }, [data])

  return {
    prices,
    isConnected,
    lastUpdate: data?.timestamp
  }
}