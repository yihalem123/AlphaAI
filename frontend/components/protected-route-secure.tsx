"use client"

/**
 * Enhanced Protected Route Component - Production Grade
 * 
 * This component provides comprehensive route protection with:
 * - Multiple authentication checks
 * - Graceful loading states
 * - Security monitoring
 * - Offline support
 * - Permission-based access control
 * - Automatic redirects
 * 
 * Author: AI Trading Platform Frontend Team
 * Version: 3.0.0
 */

import React, { useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useAuth, useSecurityNotification } from './auth-provider-secure'

interface ProtectedRouteProps {
  children: React.ReactNode
  fallback?: React.ReactNode
  requireAuth?: boolean
  requiredPermissions?: string[]
  requiredTier?: 'free' | 'pro' | 'premium'
  showOfflineMessage?: boolean
}

export function ProtectedRouteSecure({ 
  children, 
  fallback, 
  requireAuth = true,
  requiredPermissions = [],
  requiredTier = 'free',
  showOfflineMessage = true
}: ProtectedRouteProps) {
  const { 
    user, 
    isLoading, 
    isAuthenticated, 
    isOnline, 
    retryConnection 
  } = useAuth()
  const { event: securityEvent } = useSecurityNotification()
  const router = useRouter()
  const searchParams = useSearchParams()
  const [showRetry, setShowRetry] = useState(false)

  // Auto-retry connection after 30 seconds offline
  useEffect(() => {
    if (!isOnline) {
      const timer = setTimeout(() => {
        setShowRetry(true)
      }, 30000)
      
      return () => clearTimeout(timer)
    } else {
      setShowRetry(false)
    }
  }, [isOnline])

  // Handle authentication redirects
  useEffect(() => {
    if (!isLoading && requireAuth && !isAuthenticated) {
      const redirectUrl = searchParams.get('redirect') || '/dashboard'
      localStorage.setItem('auth_redirect', redirectUrl)
      router.push('/')
    }
  }, [isLoading, requireAuth, isAuthenticated, router, searchParams])

  // Permission check
  const hasRequiredPermissions = React.useMemo(() => {
    if (!user || requiredPermissions.length === 0) return true
    
    return requiredPermissions.every(permission => 
      user.permissions?.includes(permission)
    )
  }, [user, requiredPermissions])

  // Tier check
  const hasRequiredTier = React.useMemo(() => {
    if (!user) return false
    
    const tierLevels = { free: 0, pro: 1, premium: 2 }
    const userLevel = tierLevels[user.subscription_tier as keyof typeof tierLevels] ?? 0
    const requiredLevel = tierLevels[requiredTier]
    
    return userLevel >= requiredLevel
  }, [user, requiredTier])

  // Show loading state
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900">
        <div className="text-center space-y-4">
          <div className="relative">
            <div className="w-16 h-16 border-4 border-purple-200 border-t-purple-600 rounded-full animate-spin mx-auto"></div>
            <div className="absolute inset-0 w-16 h-16 border-4 border-transparent border-t-purple-400 rounded-full animate-spin mx-auto" style={{animationDirection: 'reverse', animationDuration: '0.8s'}}></div>
          </div>
          <div className="space-y-2">
            <h3 className="text-xl font-semibold text-white">Authenticating...</h3>
            <p className="text-purple-200">Please wait while we verify your credentials</p>
          </div>
        </div>
      </div>
    )
  }

  // Show offline message
  if (!isOnline && showOfflineMessage) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 via-red-900 to-slate-900 p-4">
        <div className="max-w-md w-full bg-white/10 backdrop-blur-lg rounded-2xl p-8 text-center space-y-6 border border-red-300/20">
          <div className="w-20 h-20 bg-red-500/20 rounded-full flex items-center justify-center mx-auto">
            <svg className="w-10 h-10 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
            </svg>
          </div>
          
          <div className="space-y-2">
            <h2 className="text-2xl font-bold text-white">Connection Lost</h2>
            <p className="text-red-200">Unable to connect to our servers. Please check your internet connection.</p>
          </div>
          
          {showRetry && (
            <button
              onClick={retryConnection}
              className="w-full bg-red-600 hover:bg-red-700 text-white font-semibold py-3 px-4 rounded-lg transition-colors duration-200 focus:ring-2 focus:ring-red-400 focus:outline-none"
            >
              Try Again
            </button>
          )}
          
          <div className="text-sm text-red-300">
            Working in offline mode with limited functionality
          </div>
        </div>
      </div>
    )
  }

  // Show security event notification
  if (securityEvent && securityEvent.type === 'error') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 via-orange-900 to-slate-900 p-4">
        <div className="max-w-md w-full bg-white/10 backdrop-blur-lg rounded-2xl p-8 text-center space-y-6 border border-orange-300/20">
          <div className="w-20 h-20 bg-orange-500/20 rounded-full flex items-center justify-center mx-auto">
            <svg className="w-10 h-10 text-orange-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
            </svg>
          </div>
          
          <div className="space-y-2">
            <h2 className="text-2xl font-bold text-white">Security Alert</h2>
            <p className="text-orange-200">{securityEvent.message}</p>
            {securityEvent.code && (
              <p className="text-sm text-orange-300">Error Code: {securityEvent.code}</p>
            )}
          </div>
          
          <button
            onClick={() => router.push('/')}
            className="w-full bg-orange-600 hover:bg-orange-700 text-white font-semibold py-3 px-4 rounded-lg transition-colors duration-200 focus:ring-2 focus:ring-orange-400 focus:outline-none"
          >
            Return to Home
          </button>
        </div>
      </div>
    )
  }

  // Check authentication requirement
  if (requireAuth && !isAuthenticated) {
    return fallback || (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 p-4">
        <div className="max-w-md w-full bg-white/10 backdrop-blur-lg rounded-2xl p-8 text-center space-y-6 border border-purple-300/20">
          <div className="w-20 h-20 bg-purple-500/20 rounded-full flex items-center justify-center mx-auto">
            <svg className="w-10 h-10 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m0 0v2m0-2h2m-2 0h-2m-3-2l-.707-.707a1 1 0 01-.282-.703V9a5 5 0 0110 0v2.293c0 .252-.105.495-.282.703L15 12m-3 0" />
            </svg>
          </div>
          
          <div className="space-y-2">
            <h2 className="text-2xl font-bold text-white">Authentication Required</h2>
            <p className="text-purple-200">Please sign in to access this page</p>
          </div>
          
          <div className="space-y-3">
            <button
              onClick={() => router.push('/')}
              className="w-full bg-purple-600 hover:bg-purple-700 text-white font-semibold py-3 px-4 rounded-lg transition-colors duration-200 focus:ring-2 focus:ring-purple-400 focus:outline-none"
            >
              Go to Sign In
            </button>
            
            <div className="flex items-center justify-center space-x-2 text-purple-300">
              <div className="w-4 h-4 border-2 border-purple-400 border-t-transparent rounded-full animate-spin"></div>
              <span className="text-sm">Redirecting...</span>
            </div>
          </div>
        </div>
      </div>
    )
  }

  // Check permissions
  if (user && !hasRequiredPermissions) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 via-red-900 to-slate-900 p-4">
        <div className="max-w-md w-full bg-white/10 backdrop-blur-lg rounded-2xl p-8 text-center space-y-6 border border-red-300/20">
          <div className="w-20 h-20 bg-red-500/20 rounded-full flex items-center justify-center mx-auto">
            <svg className="w-10 h-10 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728L5.636 5.636m12.728 12.728L18.364 5.636M5.636 18.364l12.728-12.728" />
            </svg>
          </div>
          
          <div className="space-y-2">
            <h2 className="text-2xl font-bold text-white">Access Denied</h2>
            <p className="text-red-200">You don't have permission to access this page</p>
            <p className="text-sm text-red-300">
              Required permissions: {requiredPermissions.join(', ')}
            </p>
          </div>
          
          <button
            onClick={() => router.push('/dashboard')}
            className="w-full bg-red-600 hover:bg-red-700 text-white font-semibold py-3 px-4 rounded-lg transition-colors duration-200 focus:ring-2 focus:ring-red-400 focus:outline-none"
          >
            Return to Dashboard
          </button>
        </div>
      </div>
    )
  }

  // Check subscription tier
  if (user && !hasRequiredTier) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 via-yellow-900 to-slate-900 p-4">
        <div className="max-w-md w-full bg-white/10 backdrop-blur-lg rounded-2xl p-8 text-center space-y-6 border border-yellow-300/20">
          <div className="w-20 h-20 bg-yellow-500/20 rounded-full flex items-center justify-center mx-auto">
            <svg className="w-10 h-10 text-yellow-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m0 0v2m0-2h2m-2 0h-2m-3-2l-.707-.707a1 1 0 01-.282-.703V9a5 5 0 0110 0v2.293c0 .252-.105.495-.282.703L15 12m-3 0" />
            </svg>
          </div>
          
          <div className="space-y-2">
            <h2 className="text-2xl font-bold text-white">Upgrade Required</h2>
            <p className="text-yellow-200">This feature requires a {requiredTier} subscription</p>
            <p className="text-sm text-yellow-300">
              Current plan: {user.subscription_tier}
            </p>
          </div>
          
          <div className="space-y-3">
            <button
              onClick={() => router.push('/subscription')}
              className="w-full bg-yellow-600 hover:bg-yellow-700 text-white font-semibold py-3 px-4 rounded-lg transition-colors duration-200 focus:ring-2 focus:ring-yellow-400 focus:outline-none"
            >
              Upgrade Now
            </button>
            
            <button
              onClick={() => router.push('/dashboard')}
              className="w-full border border-yellow-600 text-yellow-200 hover:bg-yellow-600/10 font-semibold py-3 px-4 rounded-lg transition-colors duration-200 focus:ring-2 focus:ring-yellow-400 focus:outline-none"
            >
              Return to Dashboard
            </button>
          </div>
        </div>
      </div>
    )
  }

  // All checks passed - render protected content
  return <>{children}</>
}

// Hook for checking permissions
export function usePermissions() {
  const { user } = useAuth()
  
  const hasPermission = React.useCallback((permission: string) => {
    return user?.permissions?.includes(permission) ?? false
  }, [user])
  
  const hasAnyPermission = React.useCallback((permissions: string[]) => {
    return permissions.some(permission => hasPermission(permission))
  }, [hasPermission])
  
  const hasAllPermissions = React.useCallback((permissions: string[]) => {
    return permissions.every(permission => hasPermission(permission))
  }, [hasPermission])
  
  const hasTier = React.useCallback((tier: 'free' | 'pro' | 'premium') => {
    if (!user) return false
    
    const tierLevels = { free: 0, pro: 1, premium: 2 }
    const userLevel = tierLevels[user.subscription_tier as keyof typeof tierLevels] ?? 0
    const requiredLevel = tierLevels[tier]
    
    return userLevel >= requiredLevel
  }, [user])
  
  return {
    user,
    hasPermission,
    hasAnyPermission,
    hasAllPermissions,
    hasTier,
    permissions: user?.permissions ?? [],
    tier: user?.subscription_tier ?? 'free'
  }
}
