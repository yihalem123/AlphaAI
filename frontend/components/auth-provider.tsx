"use client"

import React, { createContext, useContext, useEffect, useState } from 'react'
import { User } from '@/types/auth'
import { authService } from '@/lib/auth-service-complete'

interface AuthContextType {
  user: User | null
  isLoading: boolean
  login: (email: string, password: string) => Promise<{ success: boolean; error?: string }>
  register: (email: string, password: string, username: string) => Promise<{ success: boolean; error?: string }>
  logout: () => Promise<void>
  updateUser: (userData: Partial<User>) => void
  isAuthenticated: boolean
}

export const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    // Initialize authentication on mount
    const initAuth = async () => {
      try {
        console.log('🔐 Initializing authentication...')
        
        // Check if user is already authenticated
        if (authService.isAuthenticated()) {
          const userData = authService.getCurrentUser()
          if (userData) {
            console.log('✅ User authenticated:', userData.email || userData.username)
            setUser(userData)
            
            // Verify token is still valid with backend
            const verifiedUser = await authService.verifyToken()
            if (verifiedUser) {
              setUser(verifiedUser)
            } else {
              setUser(null)
            }
          } else {
            setUser(null)
          }
        } else {
          console.log('🔓 No valid authentication found')
          setUser(null)
        }
      } catch (error) {
        console.error('Auth initialization error:', error)
        setUser(null)
      } finally {
        setIsLoading(false)
      }
    }

    initAuth()
  }, [])

  const login = async (email: string, password: string) => {
    try {
      console.log('🔐 Attempting login for:', email)
      const response = await authService.login(email, password)
      
      if (response.data) {
        setUser(response.data.user)
        console.log('✅ Login successful:', response.data.user.email)
        return { success: true }
      } else {
        console.log('❌ Login failed:', response.error)
        return { success: false, error: response.error }
      }
    } catch (error) {
      console.error('Login error:', error)
      return { success: false, error: 'Network error occurred' }
    }
  }

  const register = async (email: string, password: string, username: string) => {
    try {
      console.log('🔐 Attempting registration for:', email)
      const response = await authService.register(email, password, username)
      
      if (response.data) {
        setUser(response.data.user)
        console.log('✅ Registration successful:', response.data.user.email)
        return { success: true }
      } else {
        console.log('❌ Registration failed:', response.error)
        return { success: false, error: response.error }
      }
    } catch (error) {
      console.error('Registration error:', error)
      return { success: false, error: 'Network error occurred' }
    }
  }

  const logout = async () => {
    try {
      console.log('🚪 Logging out user...')
      await authService.logout()
      setUser(null)
      console.log('✅ User logged out successfully')
    } catch (error) {
      console.error('Logout error:', error)
      setUser(null)
    }
  }

  // Listen for token expiry events and handle periodic checks
  useEffect(() => {
    // Listen for token expiry events from API service
    const handleTokenExpiry = () => {
      console.log('🔄 Token expiry event received - logging out')
      setUser(null)
    }
    
    // Check token validity periodically (every 5 minutes)
    const checkTokenValidity = async () => {
      if (authService.isAuthenticated()) {
        const verifiedUser = await authService.verifyToken()
        if (!verifiedUser && user) {
          console.log('⚠️ Token validation failed - logging out')
          setUser(null)
        }
      }
    }
    
    const interval = setInterval(checkTokenValidity, 5 * 60 * 1000)
    
    // Also check on window focus
    const handleFocus = () => {
      if (user) checkTokenValidity()
    }
    
    window.addEventListener('auth:token-expired', handleTokenExpiry)
    window.addEventListener('focus', handleFocus)
    
    return () => {
      clearInterval(interval)
      window.removeEventListener('auth:token-expired', handleTokenExpiry)
      window.removeEventListener('focus', handleFocus)
    }
  }, [user])

  const updateUser = (userData: Partial<User>) => {
    if (user) {
      setUser({ ...user, ...userData })
    }
  }

  const value = {
    user,
    isLoading,
    login,
    register,
    logout,
    updateUser,
    isAuthenticated: !!user,
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}