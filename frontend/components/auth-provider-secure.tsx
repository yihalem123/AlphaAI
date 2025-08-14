'use client'

/**
 * Secure Authentication Provider - Production Grade
 * 
 * This provider offers comprehensive security and UX features:
 * - Automatic token refresh with queue management
 * - Secure error handling and user feedback
 * - Rate limiting awareness and recovery
 * - Session management and monitoring
 * - Security event logging
 * - Graceful fallbacks for network issues
 * 
 * Author: AI Trading Platform Frontend Team
 * Version: 3.0.0
 */

import React, { 
  createContext, 
  useContext, 
  useState, 
  useEffect, 
  ReactNode, 
  useCallback,
  useRef
} from 'react'
import { 
  authServiceSecure, 
  type User, 
  type LoginCredentials, 
  type RegisterData,
  type SessionInfo,
  SecurityError 
} from '@/lib/auth-service-secure'

interface AuthContextType {
  // User state
  user: User | null
  isLoading: boolean
  isAuthenticated: boolean
  
  // Auth actions
  login: (credentials: LoginCredentials) => Promise<AuthResult>
  register: (userData: RegisterData) => Promise<AuthResult>
  logout: (logoutAll?: boolean) => Promise<void>
  refreshUser: () => Promise<void>
  updateUser: (userData: Partial<User>) => void
  forceRefreshAuth: () => Promise<void>
  
  // Session management
  getUserSessions: () => Promise<SessionInfo[]>
  revokeSession: (sessionId: string) => Promise<void>
  
  // Security features
  lastSecurityEvent: SecurityEvent | null
  clearSecurityEvent: () => void
  
  // Connection state
  isOnline: boolean
  retryConnection: () => Promise<void>
}

interface AuthResult {
  success: boolean
  error?: string
  requiresMfa?: boolean
  accountLocked?: boolean
  rateLimited?: boolean
}

interface SecurityEvent {
  type: 'error' | 'warning' | 'info'
  message: string
  code?: string
  timestamp: Date
  autoHide?: boolean
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProviderSecure')
  }
  return context
}

interface AuthProviderProps {
  children: ReactNode
}

export function AuthProviderSecure({ children }: AuthProviderProps) {
  const [user, setUser] = useState<User | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [lastSecurityEvent, setLastSecurityEvent] = useState<SecurityEvent | null>(null)
  const [isOnline, setIsOnline] = useState(true)
  
  const initializationRef = useRef(false)
  const securityEventTimeoutRef = useRef<NodeJS.Timeout>()

  const isAuthenticated = !!user

  // Monitor online status
  useEffect(() => {
    const handleOnline = () => setIsOnline(true)
    const handleOffline = () => setIsOnline(false)

    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)

    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
    }
  }, [])

  // Security event management
  const addSecurityEvent = useCallback((event: Omit<SecurityEvent, 'timestamp'>) => {
    const securityEvent: SecurityEvent = {
      ...event,
      timestamp: new Date()
    }
    
    setLastSecurityEvent(securityEvent)
    
    // Auto-hide certain events
    if (event.autoHide !== false) {
      if (securityEventTimeoutRef.current) {
        clearTimeout(securityEventTimeoutRef.current)
      }
      
      securityEventTimeoutRef.current = setTimeout(() => {
        setLastSecurityEvent(null)
      }, event.type === 'error' ? 10000 : 5000) // Errors stay longer
    }
  }, [])

  const clearSecurityEvent = useCallback(() => {
    setLastSecurityEvent(null)
    if (securityEventTimeoutRef.current) {
      clearTimeout(securityEventTimeoutRef.current)
    }
  }, [])

  // Initialize authentication
  const initializeAuth = useCallback(async () => {
    if (initializationRef.current) return
    initializationRef.current = true

    try {
      setIsLoading(true)

      // Check for stored user data first (immediate UI update)
      const storedUser = authServiceSecure.getUserFromStorage()
      if (storedUser) {
        setUser(storedUser)
        console.log('📱 Loaded stored user data:', storedUser.email)
      }

      // Verify authentication with server
      console.log('🔍 Verifying authentication with server...')
      const response = await authServiceSecure.getCurrentUser()
      
      if (response.data) {
        // User is authenticated
        setUser(response.data)
        authServiceSecure.setUserData(response.data)
        console.log('✅ Server confirmed authentication:', response.data.email, response.data.subscription_tier)
        
        addSecurityEvent({
          type: 'info',
          message: 'Successfully authenticated',
          autoHide: true
        })
      } else if (response.status === 401) {
        console.log('❌ Server says not authenticated (401)')
        // Not authenticated, try development mode in dev environment
        await tryDevelopmentAuth()
      } else if (response.status === 0) {
        // Network error
        console.log('🌐 Network error - working offline')
        addSecurityEvent({
          type: 'warning',
          message: 'Unable to connect to server. Working in offline mode.',
          autoHide: false
        })
        setIsOnline(false)
      } else {
        console.log('⚠️ Other auth error:', response.status)
        // Other error
        await tryDevelopmentAuth()
      }
    } catch (error) {
      console.error('Auth initialization error:', error)
      
      if (error instanceof SecurityError) {
        addSecurityEvent({
          type: 'error',
          message: error.message,
          code: error.code
        })
      } else {
        addSecurityEvent({
          type: 'error',
          message: 'Authentication initialization failed'
        })
      }
      
      await tryDevelopmentAuth()
    } finally {
      setIsLoading(false)
    }
  }, [addSecurityEvent])

  const tryDevelopmentAuth = useCallback(async () => {
    // Development authentication disabled for normal user testing
    console.log('🔐 Development auth disabled - testing normal authentication flow')
    
    // Clear any invalid data
    setUser(null)
    authServiceSecure.clearUserData()
    
    addSecurityEvent({
      type: 'info',
      message: 'Please sign in to continue',
      autoHide: true
    })
  }, [addSecurityEvent])

  // Initialize on mount
  useEffect(() => {
    initializeAuth()
  }, [initializeAuth])

  // Auth actions
  const login = useCallback(async (credentials: LoginCredentials): Promise<AuthResult> => {
    try {
      const response = await authServiceSecure.login(credentials)
      
      if (response.data) {
        setUser(response.data.user)
        authServiceSecure.setUserData(response.data.user)
        
        addSecurityEvent({
          type: 'info',
          message: 'Login successful',
          autoHide: true
        })
        
        return { success: true }
      } else {
        const result: AuthResult = { success: false, error: response.error }
        
        // Handle specific error types
        if (response.status === 429) {
          result.rateLimited = true
          addSecurityEvent({
            type: 'warning',
            message: 'Too many login attempts. Please wait before trying again.',
            code: 'RATE_LIMITED'
          })
        } else if (response.status === 423) {
          result.accountLocked = true
          addSecurityEvent({
            type: 'error',
            message: 'Account temporarily locked due to failed attempts.',
            code: 'ACCOUNT_LOCKED'
          })
        } else {
          addSecurityEvent({
            type: 'error',
            message: response.error || 'Login failed',
            autoHide: true
          })
        }
        
        return result
      }
    } catch (error) {
      if (error instanceof SecurityError) {
        if (error.code === 'MFA_REQUIRED') {
          addSecurityEvent({
            type: 'info',
            message: 'Please enter your MFA code',
            code: 'MFA_REQUIRED'
          })
          return { success: false, requiresMfa: true }
        }
        
        addSecurityEvent({
          type: 'error',
          message: error.message,
          code: error.code
        })
        
        return { success: false, error: error.message }
      }
      
      addSecurityEvent({
        type: 'error',
        message: 'Login failed due to network error'
      })
      
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Login failed' 
      }
    }
  }, [addSecurityEvent])

  const register = useCallback(async (userData: RegisterData): Promise<AuthResult> => {
    try {
      const response = await authServiceSecure.register(userData)
      
      if (response.data) {
        setUser(response.data.user)
        authServiceSecure.setUserData(response.data.user)
        
        addSecurityEvent({
          type: 'info',
          message: 'Registration successful! Welcome to the platform.',
          autoHide: true
        })
        
        return { success: true }
      } else {
        const result: AuthResult = { success: false, error: response.error }
        
        if (response.status === 429) {
          result.rateLimited = true
          addSecurityEvent({
            type: 'warning',
            message: 'Too many registration attempts. Please wait before trying again.',
            code: 'RATE_LIMITED'
          })
        } else {
          addSecurityEvent({
            type: 'error',
            message: response.error || 'Registration failed',
            autoHide: true
          })
        }
        
        return result
      }
    } catch (error) {
      if (error instanceof SecurityError) {
        addSecurityEvent({
          type: 'error',
          message: error.message,
          code: error.code
        })
        
        return { success: false, error: error.message }
      }
      
      addSecurityEvent({
        type: 'error',
        message: 'Registration failed due to network error'
      })
      
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Registration failed' 
      }
    }
  }, [addSecurityEvent])

  const logout = useCallback(async (logoutAll: boolean = false) => {
    try {
      await authServiceSecure.logout(logoutAll)
      
      addSecurityEvent({
        type: 'info',
        message: logoutAll ? 'Logged out from all devices' : 'Successfully logged out',
        autoHide: true
      })
    } catch (error) {
      console.error('Logout error:', error)
      
      addSecurityEvent({
        type: 'warning',
        message: 'Logout completed (with errors)',
        autoHide: true
      })
    } finally {
      setUser(null)
      authServiceSecure.clearUserData()
    }
  }, [addSecurityEvent])

  const refreshUser = useCallback(async () => {
    try {
      console.log('🔄 Refreshing user data...')
      const response = await authServiceSecure.getCurrentUser()
      if (response.data) {
        setUser(response.data)
        authServiceSecure.setUserData(response.data)
        console.log('✅ User data refreshed:', response.data.subscription_tier)
      } else if (response.status === 401) {
        // Session expired
        setUser(null)
        authServiceSecure.clearUserData()
        
        addSecurityEvent({
          type: 'warning',
          message: 'Session expired. Please log in again.',
          code: 'SESSION_EXPIRED'
        })
      }
    } catch (error) {
      console.error('User refresh error:', error)
      
      if (error instanceof SecurityError) {
        addSecurityEvent({
          type: 'error',
          message: error.message,
          code: error.code
        })
      }
    }
  }, [addSecurityEvent])

  // Update user data (for subscription changes)
  const updateUser = useCallback((userData: Partial<User>) => {
    if (user) {
      const updatedUser = { ...user, ...userData }
      setUser(updatedUser)
      authServiceSecure.setUserData(updatedUser)
    }
  }, [user])

  // Force re-initialize authentication (for payment flow issues)
  const forceRefreshAuth = useCallback(async () => {
    console.log('🔄 Force refreshing authentication...')
    initializationRef.current = false
    await initializeAuth()
  }, [initializeAuth])

  // Session management
  const getUserSessions = useCallback(async (): Promise<SessionInfo[]> => {
    try {
      const response = await authServiceSecure.getUserSessions()
      return response.data || []
    } catch (error) {
      console.error('Failed to get user sessions:', error)
      
      addSecurityEvent({
        type: 'error',
        message: 'Failed to load session information'
      })
      
      return []
    }
  }, [addSecurityEvent])

  const revokeSession = useCallback(async (sessionId: string) => {
    try {
      await authServiceSecure.revokeSession(sessionId)
      
      addSecurityEvent({
        type: 'info',
        message: 'Session revoked successfully',
        autoHide: true
      })
    } catch (error) {
      console.error('Failed to revoke session:', error)
      
      addSecurityEvent({
        type: 'error',
        message: 'Failed to revoke session'
      })
    }
  }, [addSecurityEvent])

  // Connection retry
  const retryConnection = useCallback(async () => {
    try {
      setIsLoading(true)
      const response = await authServiceSecure.healthCheck()
      
      if (response.status === 200) {
        setIsOnline(true)
        await refreshUser()
        
        addSecurityEvent({
          type: 'info',
          message: 'Connection restored',
          autoHide: true
        })
      } else {
        throw new Error('Health check failed')
      }
    } catch (error) {
      addSecurityEvent({
        type: 'error',
        message: 'Unable to restore connection'
      })
    } finally {
      setIsLoading(false)
    }
  }, [refreshUser, addSecurityEvent])

  // Cleanup timeouts on unmount
  useEffect(() => {
    return () => {
      if (securityEventTimeoutRef.current) {
        clearTimeout(securityEventTimeoutRef.current)
      }
    }
  }, [])

  const value: AuthContextType = {
    // User state
    user,
    isLoading,
    isAuthenticated,
    
    // Auth actions
    login,
    register,
    logout,
    refreshUser,
    updateUser,
    forceRefreshAuth,
    
    // Session management
    getUserSessions,
    revokeSession,
    
    // Security features
    lastSecurityEvent,
    clearSecurityEvent,
    
    // Connection state
    isOnline,
    retryConnection
  }

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  )
}

// Hook for optional auth (doesn't throw error if not in provider)
export function useAuthOptional() {
  return useContext(AuthContext)
}

// Security event notification hook
export function useSecurityNotification() {
  const { lastSecurityEvent, clearSecurityEvent } = useAuth()
  
  return {
    event: lastSecurityEvent,
    dismiss: clearSecurityEvent
  }
}

/**
 * Hook to check user permissions and subscription access
 */
export function usePermissions() {
  const { user } = useAuth()
  
  const hasPermission = (permission: string): boolean => {
    // Basic permission check - in a real app this would be more sophisticated
    return !!user // If user is logged in, they have basic permissions
  }
  
  const canAccess = (tier: string): boolean => {
    if (!user) return false
    
    const userTier = user.subscription_tier || 'free'
    const tierHierarchy = { free: 0, basic: 1, pro: 2, enterprise: 3 }
    
    return (tierHierarchy[userTier as keyof typeof tierHierarchy] || 0) >= 
           (tierHierarchy[tier as keyof typeof tierHierarchy] || 0)
  }
  
  return { hasPermission, canAccess }
}
