"use client"

import React from 'react'
import { ProtectedRouteSecure } from './protected-route-secure'

// Wrapper component for backward compatibility
interface ProtectedRouteProps {
  children: React.ReactNode
  requireAuth?: boolean
  requiredPermissions?: string[]
  requiredTier?: 'free' | 'basic' | 'pro' | 'enterprise'
}

export function ProtectedRoute({ 
  children, 
  requireAuth = true, 
  requiredPermissions = ['read'],
  requiredTier = 'free'
}: ProtectedRouteProps) {
    return (
    <ProtectedRouteSecure
      requireAuth={requireAuth}
      requiredPermissions={requiredPermissions}
      requiredTier={requiredTier}
    >
      {children}
    </ProtectedRouteSecure>
  )
}
