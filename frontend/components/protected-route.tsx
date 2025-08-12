"use client"

import React from 'react'
import { useAuth } from '@/hooks/use-auth'

interface ProtectedRouteProps {
  children: React.ReactNode
  fallback?: React.ReactNode
  requireAuth?: boolean
}

export function ProtectedRoute({ 
  children, 
  fallback = null, 
  requireAuth = true 
}: ProtectedRouteProps) {
  const { user, isLoading } = useAuth()

  // Show loading spinner while auth is being determined
  if (isLoading) {
    return (
      <div style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'linear-gradient(135deg, #050510 0%, #0f0f1a 50%, #1a0f2e 100%)',
        color: '#ffffff'
      }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{
            width: '40px',
            height: '40px',
            border: '3px solid rgba(102, 126, 234, 0.3)',
            borderTop: '3px solid #667eea',
            borderRadius: '50%',
            animation: 'spin 1s linear infinite',
            margin: '0 auto 1rem auto'
          }}></div>
          <p style={{ color: '#94a3b8', fontSize: '1rem' }}>Loading...</p>
        </div>
        <style jsx>{`
          @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
          }
        `}</style>
      </div>
    )
  }

  // If authentication is required but user is not authenticated
  if (requireAuth && !user) {
    return fallback || (
      <div style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'linear-gradient(135deg, #050510 0%, #0f0f1a 50%, #1a0f2e 100%)',
        color: '#ffffff',
        textAlign: 'center',
        padding: '2rem'
      }}>
        <div>
          <div style={{
            width: '80px',
            height: '80px',
            background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
            borderRadius: '20px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            margin: '0 auto 2rem auto',
            fontSize: '2rem'
          }}>
            🔒
          </div>
          <h2 style={{ 
            fontSize: '2rem', 
            fontWeight: '700', 
            marginBottom: '1rem',
            background: 'linear-gradient(135deg, #ffffff 0%, #a5b4fc 100%)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            backgroundClip: 'text'
          }}>
            Authentication Required
          </h2>
          <p style={{ 
            color: '#94a3b8', 
            fontSize: '1.1rem', 
            marginBottom: '2rem',
            maxWidth: '400px',
            lineHeight: '1.6'
          }}>
            Please sign in to access this page. You'll be redirected to the login page automatically.
          </p>
          <div style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '0.5rem',
            color: '#667eea',
            fontSize: '0.95rem'
          }}>
            <div style={{
              width: '16px',
              height: '16px',
              border: '2px solid rgba(102, 126, 234, 0.3)',
              borderTop: '2px solid #667eea',
              borderRadius: '50%',
              animation: 'spin 1s linear infinite'
            }}></div>
            Redirecting...
          </div>
        </div>
        <style jsx>{`
          @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
          }
        `}</style>
      </div>
    )
  }

  // If no authentication is required, or user is authenticated, show children
  return <>{children}</>
}

// Hook to check if user has specific subscription tier
export function useRequireSubscription(requiredTier: 'free' | 'pro' | 'premium' = 'free') {
  const { user } = useAuth()
  
  const tierLevels = {
    free: 0,
    pro: 1,
    premium: 2
  }
  
  const userTierLevel = tierLevels[user?.subscription_tier as keyof typeof tierLevels] ?? 0
  const requiredTierLevel = tierLevels[requiredTier]
  
  return {
    hasAccess: userTierLevel >= requiredTierLevel,
    userTier: user?.subscription_tier || 'free',
    requiredTier
  }
}

// Component to show upgrade prompt for insufficient subscription
export function SubscriptionGate({ 
  requiredTier, 
  children, 
  onUpgrade 
}: { 
  requiredTier: 'pro' | 'premium'
  children: React.ReactNode
  onUpgrade?: () => void
}) {
  const { hasAccess, userTier } = useRequireSubscription(requiredTier)
  
  if (hasAccess) {
    return <>{children}</>
  }
  
  return (
    <div style={{
      background: 'rgba(255, 255, 255, 0.05)',
      borderRadius: '16px',
      padding: '3rem 2rem',
      textAlign: 'center',
      border: '1px solid rgba(255, 255, 255, 0.1)',
      backdropFilter: 'blur(10px)'
    }}>
      <div style={{
        width: '60px',
        height: '60px',
        background: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)',
        borderRadius: '16px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        margin: '0 auto 1.5rem auto',
        fontSize: '1.5rem'
      }}>
        ⭐
      </div>
      <h3 style={{
        fontSize: '1.5rem',
        fontWeight: '700',
        marginBottom: '1rem',
        color: '#ffffff'
      }}>
        {requiredTier === 'pro' ? 'Pro' : 'Premium'} Feature
      </h3>
      <p style={{
        color: '#94a3b8',
        marginBottom: '2rem',
        fontSize: '1.05rem',
        lineHeight: '1.6'
      }}>
        This feature requires a {requiredTier} subscription. Your current plan: <strong>{userTier}</strong>
      </p>
      {onUpgrade && (
        <button
          onClick={onUpgrade}
          style={{
            background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
            color: '#ffffff',
            border: 'none',
            borderRadius: '12px',
            padding: '12px 24px',
            fontSize: '1rem',
            fontWeight: '600',
            cursor: 'pointer',
            transition: 'all 0.2s ease',
            boxShadow: '0 4px 15px rgba(102, 126, 234, 0.3)'
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.transform = 'translateY(-2px)'
            e.currentTarget.style.boxShadow = '0 6px 20px rgba(102, 126, 234, 0.4)'
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.transform = 'translateY(0)'
            e.currentTarget.style.boxShadow = '0 4px 15px rgba(102, 126, 234, 0.3)'
          }}
        >
          Upgrade to {requiredTier === 'pro' ? 'Pro' : 'Premium'}
        </button>
      )}
    </div>
  )
}