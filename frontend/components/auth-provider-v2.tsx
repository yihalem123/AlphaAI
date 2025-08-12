'use client'

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react'
import { authServiceV2, type User, type LoginCredentials, type RegisterData } from '@/lib/auth-service-v2'

interface AuthContextType {
  user: User | null
  isLoading: boolean
  isAuthenticated: boolean
  login: (credentials: LoginCredentials) => Promise<{ success: boolean; error?: string }>
  register: (userData: RegisterData) => Promise<{ success: boolean; error?: string }>
  logout: () => Promise<void>
  refreshUser: () => Promise<void>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}

interface AuthProviderProps {
  children: ReactNode
}

export function AuthProviderV2({ children }: AuthProviderProps) {
  const [user, setUser] = useState<User | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  const isAuthenticated = !!user

  // Initialize auth state
  useEffect(() => {
    initializeAuth()
  }, [])

  const initializeAuth = async () => {
    try {
      setIsLoading(true)

      // Check for stored user data first (for immediate UI update)
      const storedUser = authServiceV2.getUserFromToken()
      if (storedUser) {
        setUser(storedUser)
      }

      // Verify authentication with server
      const response = await authServiceV2.getCurrentUser()
      
      if (response.data) {
        // User is authenticated
        setUser(response.data)
        authServiceV2.setUserData(response.data)
      } else if (response.status === 401) {
        // Try to refresh token
        const refreshResponse = await authServiceV2.refreshToken()
        if (refreshResponse.data) {
          setUser(refreshResponse.data.user)
          authServiceV2.setUserData(refreshResponse.data.user)
        } else {
          // No valid session, try development mode
          await tryDevelopmentAuth()
        }
      } else {
        // Other error, try development mode
        await tryDevelopmentAuth()
      }
    } catch (error) {
      console.error('Auth initialization error:', error)
      await tryDevelopmentAuth()
    } finally {
      setIsLoading(false)
    }
  }

  const tryDevelopmentAuth = async () => {
    if (process.env.NODE_ENV === 'development') {
      try {
        console.log('🔧 Attempting development authentication...')
        const devResponse = await authServiceV2.createDevUser()
        
        if (devResponse.data) {
          setUser(devResponse.data.user)
          authServiceV2.setUserData(devResponse.data.user)
          console.log('✅ Development user authenticated')
          return
        }
      } catch (error) {
        console.warn('Development auth failed:', error)
      }
    }
    
    // Clear any invalid data
    setUser(null)
    authServiceV2.clearUserData()
  }

  const login = async (credentials: LoginCredentials) => {
    try {
      const response = await authServiceV2.login(credentials)
      
      if (response.data) {
        setUser(response.data.user)
        authServiceV2.setUserData(response.data.user)
        return { success: true }
      } else {
        return { 
          success: false, 
          error: response.error || 'Login failed' 
        }
      }
    } catch (error) {
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Login failed' 
      }
    }
  }

  const register = async (userData: RegisterData) => {
    try {
      const response = await authServiceV2.register(userData)
      
      if (response.data) {
        setUser(response.data.user)
        authServiceV2.setUserData(response.data.user)
        return { success: true }
      } else {
        return { 
          success: false, 
          error: response.error || 'Registration failed' 
        }
      }
    } catch (error) {
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Registration failed' 
      }
    }
  }

  const logout = async () => {
    try {
      await authServiceV2.logout()
    } catch (error) {
      console.error('Logout error:', error)
    } finally {
      setUser(null)
      authServiceV2.clearUserData()
    }
  }

  const refreshUser = async () => {
    try {
      const response = await authServiceV2.getCurrentUser()
      if (response.data) {
        setUser(response.data)
        authServiceV2.setUserData(response.data)
      }
    } catch (error) {
      console.error('User refresh error:', error)
    }
  }

  const value: AuthContextType = {
    user,
    isLoading,
    isAuthenticated,
    login,
    register,
    logout,
    refreshUser,
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