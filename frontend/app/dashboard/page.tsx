"use client"

import React from 'react'
import { ProtectedRouteSecure } from '@/components/protected-route-secure'
import { Dashboard } from '@/components/dashboard/dashboard'

export default function DashboardPage() {
  return (
    <ProtectedRouteSecure
      requireAuth={true}
      requiredPermissions={['read']}
      requiredTier="free"
    >
      <Dashboard />
    </ProtectedRouteSecure>
  )
}
