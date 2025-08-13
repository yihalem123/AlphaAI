"use client"

import React, { useState, useEffect } from 'react'
import { Pricing } from '@/components/landing/pricing'
import { Dashboard } from '@/components/dashboard/dashboard'
import { authServiceSecure } from '@/lib/auth-service-secure'
import { useAuth, useSecurityNotification } from '@/components/auth-provider-secure'

// Error Message Component
function ErrorMessage({ message, onClose }: { message: string; onClose: () => void }) {
  return (
    <div style={{
      position: 'fixed',
      top: '20px',
      right: '20px',
      background: 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)',
      color: '#ffffff',
      padding: '1rem 1.5rem',
      borderRadius: '12px',
      boxShadow: '0 10px 25px rgba(239, 68, 68, 0.3)',
      zIndex: 3000,
      maxWidth: '400px',
      display: 'flex',
      alignItems: 'center',
      gap: '1rem',
      animation: 'slideInRight 0.3s ease-out'
    }}>
      <div style={{ flex: 1 }}>
        <div style={{ fontWeight: '600', marginBottom: '0.25rem' }}>Error</div>
        <div style={{ fontSize: '0.9rem', opacity: 0.9 }}>{message}</div>
      </div>
      <button
        onClick={onClose}
        style={{
          background: 'transparent',
          border: 'none',
          color: '#ffffff',
          cursor: 'pointer',
          fontSize: '1.2rem',
          padding: '0.25rem',
          borderRadius: '4px',
          transition: 'background 0.2s ease'
        }}
        onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(255, 255, 255, 0.2)'}
        onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
      >
        ×
      </button>
    </div>
  )
}

// Success Message Component
function SuccessMessage({ message, onClose }: { message: string; onClose: () => void }) {
  return (
    <div style={{
      position: 'fixed',
      top: '20px',
      right: '20px',
      background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
      color: '#ffffff',
      padding: '1rem 1.5rem',
      borderRadius: '12px',
      boxShadow: '0 10px 25px rgba(16, 185, 129, 0.3)',
      zIndex: 3000,
      maxWidth: '400px',
      display: 'flex',
      alignItems: 'center',
      gap: '1rem',
      animation: 'slideInRight 0.3s ease-out'
    }}>
      <div style={{ flex: 1 }}>
        <div style={{ fontWeight: '600', marginBottom: '0.25rem' }}>Success</div>
        <div style={{ fontSize: '0.9rem', opacity: 0.9 }}>{message}</div>
      </div>
      <button
        onClick={onClose}
        style={{
          background: 'transparent',
          border: 'none',
          color: '#ffffff',
          cursor: 'pointer',
          fontSize: '1.2rem',
          padding: '0.25rem',
          borderRadius: '4px',
          transition: 'background 0.2s ease'
        }}
        onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(255, 255, 255, 0.2)'}
        onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
      >
        ×
      </button>
    </div>
  )
}

// Legacy PlanSelection removed; use themed Pricing component instead

// Payment Modal Component
function PaymentModal({ plan, onClose, onSuccess }: {
  plan: any
  onClose: () => void
  onSuccess: () => void
}) {
  const [isLoading, setIsLoading] = useState(false)
  const [paymentMethod, setPaymentMethod] = useState('stripe')
  const { isAuthenticated } = useAuth()

  const handlePayment = async () => {
    setIsLoading(true)
    try {
      // Require authentication
      if (!isAuthenticated) {
        alert('Authentication required. Please log in to continue.')
        setIsLoading(false)
        return
      }

      // New flow: Create Stripe Checkout Session on backend and redirect to session URL
      const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'
      const response = await fetch(`${API_BASE_URL}/api/payment/create-checkout-session`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        credentials: 'include',
        body: JSON.stringify({
          plan_type: plan.id,
          billing_period: 'monthly',
          success_url: `${window.location.origin}?checkout=success`,
          cancel_url: `${window.location.origin}?checkout=cancel`
        })
      })

      if (response.ok) {
        const data = await response.json()
        if (data?.url) {
          window.location.href = data.url
          return
        } else {
          alert('Payment error: invalid session URL')
        }
      } else {
        const error = await response.json()
        alert('Payment failed: ' + error.detail)
      }
    } catch (error) {
      alert('Payment failed: ' + error)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      background: 'rgba(0, 0, 0, 0.8)',
      backdropFilter: 'blur(10px)',
      zIndex: 2000,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '2rem'
    }}>
      <div style={{
        background: 'rgba(15, 15, 25, 0.95)',
        borderRadius: '20px',
        padding: '3rem',
        maxWidth: '600px',
        width: '100%',
        maxHeight: '80vh',
        overflowY: 'auto'
      }}>
        <button
          onClick={onClose}
          style={{
            position: 'absolute',
            top: '1rem',
            right: '1rem',
            background: 'transparent',
            border: 'none',
            color: '#94a3b8',
            fontSize: '1.5rem',
            cursor: 'pointer',
            width: '40px',
            height: '40px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            borderRadius: '50%'
          }}
        >
          ×
        </button>

        <h2 style={{ fontSize: '2rem', fontWeight: '700', marginBottom: '1rem', color: '#ffffff' }}>
          Complete Payment
        </h2>
        
        <div style={{ marginBottom: '2rem' }}>
          <h3 style={{ fontSize: '1.25rem', fontWeight: '600', marginBottom: '0.5rem', color: '#ffffff' }}>
            {plan.name} Plan
          </h3>
          <p style={{ color: '#94a3b8', fontSize: '1.1rem' }}>
            {plan.price}/{plan.period}
          </p>
        </div>

        <div style={{ marginBottom: '2rem' }}>
          <h4 style={{ fontSize: '1.1rem', fontWeight: '600', marginBottom: '1rem', color: '#ffffff' }}>
            Payment Method
          </h4>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', cursor: 'pointer' }}>
              <input
                type="radio"
                name="paymentMethod"
                value="stripe"
                checked={paymentMethod === 'stripe'}
                onChange={(e) => setPaymentMethod(e.target.value)}
                style={{ width: '16px', height: '16px' }}
              />
              <span style={{ color: '#e2e8f0' }}>💳 Credit Card (Stripe)</span>
            </label>
            <label style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', cursor: 'pointer' }}>
              <input
                type="radio"
                name="paymentMethod"
                value="crypto"
                checked={paymentMethod === 'crypto'}
                onChange={(e) => setPaymentMethod(e.target.value)}
                style={{ width: '16px', height: '16px' }}
              />
              <span style={{ color: '#e2e8f0' }}>₿ Cryptocurrency</span>
            </label>
          </div>
        </div>

        <button
          onClick={handlePayment}
          disabled={isLoading}
          style={{
            width: '100%',
            background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
            color: '#ffffff',
            border: 'none',
            borderRadius: '12px',
            padding: '16px 24px',
            fontSize: '1.1rem',
            fontWeight: '600',
            cursor: isLoading ? 'not-allowed' : 'pointer',
            opacity: isLoading ? 0.7 : 1,
            transition: 'all 0.2s ease'
          }}
        >
          {isLoading ? 'Processing...' : `Pay ${plan.price}`}
        </button>
      </div>
    </div>
  )
}

// TradingView Chart Component
function TradingViewChart({ symbol }: { symbol: string }) {
  useEffect(() => {
    // Load TradingView widget
    const script = document.createElement('script')
    script.src = 'https://s3.tradingview.com/tv.js'
    script.async = true
    script.onload = () => {
      if ((window as any).TradingView) {
        new (window as any).TradingView.widget({
          "width": "100%",
          "height": 400,
          "symbol": `${symbol}USD`,
          "interval": "D",
          "timezone": "Etc/UTC",
          "theme": "dark",
          "style": "1",
          "locale": "en",
          "toolbar_bg": "#f1f3f6",
          "enable_publishing": false,
          "allow_symbol_change": true,
          "container_id": `tradingview_${symbol}`
        })
      }
    }
    document.head.appendChild(script)

    return () => {
      const existingScript = document.querySelector('script[src="https://s3.tradingview.com/tv.js"]')
      if (existingScript) {
        existingScript.remove()
      }
    }
  }, [symbol])

  return (
    <div style={{
      background: 'rgba(255, 255, 255, 0.05)',
      borderRadius: '12px',
      padding: '1rem',
      border: '1px solid rgba(255, 255, 255, 0.1)',
      marginTop: '1rem'
    }}>
      <h4 style={{ fontSize: '1.1rem', fontWeight: '600', marginBottom: '1rem', color: '#ffffff' }}>
        📊 {symbol}/USD Chart
      </h4>
      <div id={`tradingview_${symbol}`} style={{ height: '400px' }}></div>
    </div>
  )
}

// Authentication Form Component
function AuthForm({ 
  mode, 
  onSubmit, 
  onModeChange
}: { 
  mode: 'login' | 'signup'
  onSubmit: (email: string, password: string, name?: string) => void
  onModeChange: (mode: 'login' | 'signup') => void
}) {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [name, setName] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [errors, setErrors] = useState<{[key: string]: string}>({})
  const [isDarkTheme, setIsDarkTheme] = useState(true)

  // Theme colors
  const theme = {
    dark: {
      background: 'rgba(15, 15, 25, 0.95)',
      surface: 'rgba(255, 255, 255, 0.05)',
      border: 'rgba(255, 255, 255, 0.1)',
      text: '#ffffff',
      textSecondary: '#94a3b8',
      textMuted: '#64748b',
      inputBg: 'rgba(255, 255, 255, 0.08)',
      inputBorder: 'rgba(255, 255, 255, 0.2)',
      inputFocus: 'rgba(102, 126, 234, 0.6)',
      error: '#ef4444',
      success: '#10b981',
      primary: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
      shadow: '0 20px 60px rgba(0, 0, 0, 0.3)',
      backdrop: 'blur(20px)'
    },
    light: {
      background: 'rgba(255, 255, 255, 0.95)',
      surface: '#f9fafb',
      border: 'rgba(0, 0, 0, 0.1)',
      text: '#1f2937',
      textSecondary: '#6b7280',
      textMuted: '#9ca3af',
      inputBg: '#f9fafb',
      inputBorder: '#d1d5db',
      inputFocus: '#667eea',
      error: '#ef4444',
      success: '#10b981',
      primary: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
      shadow: '0 20px 60px rgba(0, 0, 0, 0.15)',
      backdrop: 'blur(20px)'
    }
  }

  const currentTheme = isDarkTheme ? theme.dark : theme.light

  const validateForm = () => {
    const newErrors: {[key: string]: string} = {}
    
    if (!email) {
      newErrors.email = 'Email is required'
    } else if (!/\S+@\S+\.\S+/.test(email)) {
      newErrors.email = 'Please enter a valid email address'
    }
    
    if (!password) {
      newErrors.password = 'Password is required'
    } else if (password.length < 6) {
      newErrors.password = 'Password must be at least 6 characters'
    }
    
    if (mode === 'signup' && !name) {
      newErrors.name = 'Full name is required'
    }
    
    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!validateForm()) return
    
    setIsLoading(true)
    setErrors({})
    
    try {
      await onSubmit(email, password, name)
    } catch (error) {
      console.error('Authentication error:', error)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div style={{
      background: currentTheme.background,
      borderRadius: '16px',
      padding: '2.5rem',
      maxWidth: '400px',
      width: '100%',
      boxShadow: currentTheme.shadow,
      backdropFilter: currentTheme.backdrop,
      border: `1px solid ${currentTheme.border}`,
      position: 'relative'
    }}>
      {/* Theme Toggle */}
      <button
        onClick={() => setIsDarkTheme(!isDarkTheme)}
        style={{
          position: 'absolute',
          top: '1rem',
          right: '1rem',
          background: currentTheme.surface,
          border: `1px solid ${currentTheme.border}`,
          borderRadius: '8px',
          padding: '0.5rem',
          cursor: 'pointer',
          transition: 'all 0.2s ease',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center'
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.background = isDarkTheme ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.05)'
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.background = currentTheme.surface
        }}
      >
        {isDarkTheme ? (
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ color: currentTheme.text }}>
            <circle cx="12" cy="12" r="5"></circle>
            <line x1="12" y1="1" x2="12" y2="3"></line>
            <line x1="12" y1="21" x2="12" y2="23"></line>
            <line x1="4.22" y1="4.22" x2="5.64" y2="5.64"></line>
            <line x1="18.36" y1="18.36" x2="19.78" y2="19.78"></line>
            <line x1="1" y1="12" x2="3" y2="12"></line>
            <line x1="21" y1="12" x2="23" y2="12"></line>
            <line x1="4.22" y1="19.78" x2="5.64" y2="18.36"></line>
            <line x1="18.36" y1="5.64" x2="19.78" y2="4.22"></line>
          </svg>
        ) : (
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ color: currentTheme.text }}>
            <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"></path>
          </svg>
        )}
      </button>

      {/* Header */}
      <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
        <div style={{
          width: '60px',
          height: '60px',
          background: currentTheme.primary,
          borderRadius: '16px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          margin: '0 auto 1rem auto',
          boxShadow: '0 8px 32px rgba(102, 126, 234, 0.3)'
        }}>
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ color: '#ffffff' }}>
            <path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4"></path>
            <polyline points="10,17 15,12 10,7"></polyline>
            <line x1="15" y1="12" x2="3" y2="12"></line>
          </svg>
        </div>
        
        <h2 style={{ 
          fontSize: '1.75rem', 
          fontWeight: '700', 
          marginBottom: '0.5rem', 
          color: currentTheme.text,
          letterSpacing: '-0.025em'
        }}>
          {mode === 'login' ? 'Welcome back' : 'Create account'}
      </h2>
      
        <p style={{ 
          color: currentTheme.textSecondary, 
          fontSize: '0.95rem',
          lineHeight: '1.5'
        }}>
          {mode === 'login' 
            ? 'Sign in to your account to continue' 
            : 'Join thousands of traders using AI intelligence'
          }
        </p>
      </div>
      
      {/* Form */}
      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
        {mode === 'signup' && (
          <div>
            <label style={{ 
              display: 'block', 
              marginBottom: '0.5rem', 
              color: currentTheme.text, 
              fontSize: '0.875rem',
              fontWeight: '600'
            }}>
              Full Name
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Enter your full name"
              required
              style={{
                width: '100%',
                padding: '0.875rem 1rem',
                background: currentTheme.inputBg,
                border: errors.name ? `2px solid ${currentTheme.error}` : `1px solid ${currentTheme.inputBorder}`,
                borderRadius: '8px',
                color: currentTheme.text,
                fontSize: '0.95rem',
                transition: 'all 0.2s ease',
                boxSizing: 'border-box'
              }}
              onFocus={(e) => {
                e.target.style.border = `2px solid ${currentTheme.inputFocus}`
                e.target.style.background = isDarkTheme ? 'rgba(255, 255, 255, 0.12)' : '#ffffff'
                e.target.style.boxShadow = `0 0 0 3px ${isDarkTheme ? 'rgba(102, 126, 234, 0.2)' : 'rgba(102, 126, 234, 0.1)'}`
              }}
              onBlur={(e) => {
                e.target.style.border = errors.name ? `2px solid ${currentTheme.error}` : `1px solid ${currentTheme.inputBorder}`
                e.target.style.background = currentTheme.inputBg
                e.target.style.boxShadow = 'none'
              }}
            />
            {errors.name && (
              <p style={{ color: currentTheme.error, fontSize: '0.8rem', marginTop: '0.25rem', fontWeight: '500' }}>
                {errors.name}
              </p>
            )}
          </div>
        )}
        
        <div>
          <label style={{ 
            display: 'block', 
            marginBottom: '0.5rem', 
            color: currentTheme.text, 
            fontSize: '0.875rem',
            fontWeight: '600'
          }}>
            Email Address
          </label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="Enter your email address"
            required
            style={{
              width: '100%',
              padding: '0.875rem 1rem',
              background: currentTheme.inputBg,
              border: errors.email ? `2px solid ${currentTheme.error}` : `1px solid ${currentTheme.inputBorder}`,
              borderRadius: '8px',
              color: currentTheme.text,
              fontSize: '0.95rem',
              transition: 'all 0.2s ease',
              boxSizing: 'border-box'
            }}
            onFocus={(e) => {
              e.target.style.border = `2px solid ${currentTheme.inputFocus}`
              e.target.style.background = isDarkTheme ? 'rgba(255, 255, 255, 0.12)' : '#ffffff'
              e.target.style.boxShadow = `0 0 0 3px ${isDarkTheme ? 'rgba(102, 126, 234, 0.2)' : 'rgba(102, 126, 234, 0.1)'}`
            }}
            onBlur={(e) => {
              e.target.style.border = errors.email ? `2px solid ${currentTheme.error}` : `1px solid ${currentTheme.inputBorder}`
              e.target.style.background = currentTheme.inputBg
              e.target.style.boxShadow = 'none'
            }}
          />
          {errors.email && (
            <p style={{ color: currentTheme.error, fontSize: '0.8rem', marginTop: '0.25rem', fontWeight: '500' }}>
              {errors.email}
            </p>
          )}
        </div>
        
        <div>
          <label style={{ 
            display: 'block', 
            marginBottom: '0.5rem', 
            color: currentTheme.text, 
            fontSize: '0.875rem',
            fontWeight: '600'
          }}>
            Password
          </label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Enter your password"
            required
            style={{
              width: '100%',
              padding: '0.875rem 1rem',
              background: currentTheme.inputBg,
              border: errors.password ? `2px solid ${currentTheme.error}` : `1px solid ${currentTheme.inputBorder}`,
              borderRadius: '8px',
              color: currentTheme.text,
              fontSize: '0.95rem',
              transition: 'all 0.2s ease',
              boxSizing: 'border-box'
            }}
            onFocus={(e) => {
              e.target.style.border = `2px solid ${currentTheme.inputFocus}`
              e.target.style.background = isDarkTheme ? 'rgba(255, 255, 255, 0.12)' : '#ffffff'
              e.target.style.boxShadow = `0 0 0 3px ${isDarkTheme ? 'rgba(102, 126, 234, 0.2)' : 'rgba(102, 126, 234, 0.1)'}`
            }}
            onBlur={(e) => {
              e.target.style.border = errors.password ? `2px solid ${currentTheme.error}` : `1px solid ${currentTheme.inputBorder}`
              e.target.style.background = currentTheme.inputBg
              e.target.style.boxShadow = 'none'
            }}
          />
          {errors.password && (
            <p style={{ color: currentTheme.error, fontSize: '0.8rem', marginTop: '0.25rem', fontWeight: '500' }}>
              {errors.password}
            </p>
          )}
        </div>

        <button
          type="submit"
          disabled={isLoading}
          style={{
            background: isLoading 
              ? (isDarkTheme ? '#374151' : '#9ca3af')
              : currentTheme.primary,
            color: '#ffffff',
            border: 'none',
            borderRadius: '8px',
            padding: '0.875rem 1rem',
            fontSize: '0.95rem',
            fontWeight: '600',
            cursor: isLoading ? 'not-allowed' : 'pointer',
            opacity: isLoading ? 0.7 : 1,
            transition: 'all 0.2s ease',
            marginTop: '0.5rem',
            boxShadow: isLoading ? 'none' : '0 4px 12px rgba(102, 126, 234, 0.3)'
          }}
          onMouseEnter={(e) => {
            if (!isLoading) {
              e.currentTarget.style.transform = 'translateY(-1px)'
              e.currentTarget.style.boxShadow = '0 6px 20px rgba(102, 126, 234, 0.4)'
            }
          }}
          onMouseLeave={(e) => {
            if (!isLoading) {
              e.currentTarget.style.transform = 'translateY(0)'
              e.currentTarget.style.boxShadow = '0 4px 12px rgba(102, 126, 234, 0.3)'
            }
          }}
        >
          {isLoading ? (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}>
              <div style={{
                width: '16px',
                height: '16px',
                border: '2px solid rgba(255, 255, 255, 0.3)',
                borderTop: '2px solid #ffffff',
                borderRadius: '50%',
                animation: 'spin 1s linear infinite'
              }}></div>
              {mode === 'login' ? 'Signing in...' : 'Creating account...'}
            </div>
          ) : (
            mode === 'login' ? 'Sign In' : 'Create Account'
          )}
        </button>

        {/* Divider */}
        <div style={{ 
          display: 'flex', 
          alignItems: 'center', 
          margin: '1.5rem 0',
          color: currentTheme.textMuted,
          fontSize: '0.875rem'
        }}>
          <div style={{ flex: 1, height: '1px', background: currentTheme.border }}></div>
          <span style={{ padding: '0 1rem' }}>or</span>
          <div style={{ flex: 1, height: '1px', background: currentTheme.border }}></div>
        </div>

        {/* Mode Toggle */}
        <div style={{ textAlign: 'center' }}>
          <p style={{ color: currentTheme.textSecondary, fontSize: '0.875rem' }}>
            {mode === 'login' ? "Don't have an account?" : "Already have an account?"}
            <button
              type="button"
              onClick={() => {
                onModeChange(mode === 'login' ? 'signup' : 'login')
                setErrors({})
                setEmail('')
                setPassword('')
                setName('')
              }}
              style={{
                background: 'transparent',
                border: 'none',
                color: '#667eea',
                cursor: 'pointer',
                fontSize: '0.875rem',
                fontWeight: '600',
                marginLeft: '0.5rem',
                textDecoration: 'underline',
                transition: 'color 0.2s ease'
              }}
              onMouseEnter={(e) => e.currentTarget.style.color = '#5a67d8'}
              onMouseLeave={(e) => e.currentTarget.style.color = '#667eea'}
            >
              {mode === 'login' ? 'Sign up' : 'Sign in'}
            </button>
          </p>
        </div>
      </form>
    </div>
  )
}

// Legacy PricingPage removed; using themed Pricing component

export default function Home() {
  // Use the secure AuthProvider context
  const { user, isLoading, login, register, logout, isAuthenticated } = useAuth()
  const { event: securityEvent, dismiss: dismissSecurityEvent } = useSecurityNotification()

  const [showAuth, setShowAuth] = useState(false)
  const [authMode, setAuthMode] = useState<'login' | 'signup'>('login')
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [showPayment, setShowPayment] = useState(false)
  const [selectedPaymentPlan, setSelectedPaymentPlan] = useState<any>(null)

  // Handle authentication form submission
  const handleAuth = async (email: string, password: string, name?: string) => {
    try {
      setError('')
      setSuccess('')
      
      let result
      if (authMode === 'signup') {
        const username = name || email.split('@')[0]
        console.log(`🔐 Attempting registration for ${email}...`)
        result = await register({
          email,
          password,
          confirm_password: password,
          username,
          terms_accepted: true
        })
      } else {
        console.log(`🔐 Attempting login for ${email}...`)
        result = await login({
          email,
          password,
          remember_me: true
        })
      }
      
      if (result.success) {
        setShowAuth(false)
        setError('')
        setSuccess(`${authMode === 'signup' ? 'Registration' : 'Login'} successful! Welcome to AI Trading Assistant.`)
        console.log(`🎉 ${authMode === 'signup' ? 'Registration' : 'Login'} successful!`)
      } else {
        if (result.requiresMfa) {
          setError('Please enter your MFA code to continue.')
        } else if (result.accountLocked) {
          setError('Account temporarily locked due to too many failed attempts. Please try again later.')
        } else if (result.rateLimited) {
          setError('Too many attempts. Please wait before trying again.')
        } else {
          // Handle error properly - it might be an object or string
          const errorMessage = typeof result.error === 'string' 
            ? result.error 
            : result.error?.message || result.error?.detail || 'Authentication failed. Please try again.'
          setError(errorMessage)
        }
      }
    } catch (error) {
      console.error('Authentication error:', error)
      setError('Network error. Please check your connection and try again.')
    }
  }

  const handleLogout = async () => {
    try {
      await logout()
      setShowAuth(false)
    } catch (error) {
      console.error('Logout error:', error)
    }
  }

  const handleUpgrade = (plan: any) => {
    setSelectedPaymentPlan(plan)
    setShowPayment(true)
  }

  const handlePaymentSuccess = () => {
    setShowPayment(false)
    setSelectedPaymentPlan(null)
    // In a real app, you would refresh the user data from the AuthProvider
    console.log('Payment successful - would refresh user subscription data')
  }

  // Show loading spinner while auth is initializing
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
      </div>
    )
  }



  // Landing Page Component
  const LandingPage = () => (
    <div style={{ paddingTop: '60px', minHeight: '100vh' }}>
      {/* Hero Section */}
      <section style={{ 
        paddingTop: '80px', 
        paddingBottom: '120px', 
        position: 'relative', 
        overflow: 'hidden',
        background: 'linear-gradient(135deg, #0f0f23 0%, #1a1a2e 50%, #16213e 100%)'
      }}>
        {/* Animated Background */}
        <div style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: `
            radial-gradient(circle at 20% 80%, rgba(102, 126, 234, 0.15) 0%, transparent 50%), 
            radial-gradient(circle at 80% 20%, rgba(118, 75, 162, 0.15) 0%, transparent 50%),
            radial-gradient(circle at 40% 40%, rgba(67, 56, 202, 0.1) 0%, transparent 50%)
          `,
          animation: 'float 6s ease-in-out infinite'
        }}></div>
        
        {/* Floating Elements */}
        <div style={{
          position: 'absolute',
          top: '20%',
          left: '10%',
          width: '100px',
          height: '100px',
          background: 'rgba(102, 126, 234, 0.1)',
          borderRadius: '50%',
          animation: 'float 8s ease-in-out infinite'
        }}></div>
        <div style={{
          position: 'absolute',
          top: '60%',
          right: '15%',
          width: '150px',
          height: '150px',
          background: 'rgba(118, 75, 162, 0.1)',
          borderRadius: '50%',
          animation: 'float 10s ease-in-out infinite reverse'
        }}></div>
        
        <div style={{ maxWidth: '1400px', margin: '0 auto', padding: '0 2rem', position: 'relative', zIndex: 1 }}>
          <div style={{ textAlign: 'center', maxWidth: '900px', margin: '0 auto' }}>
            {/* Animated Badge */}
            <div style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '8px',
              background: 'rgba(102, 126, 234, 0.15)',
              border: '1px solid rgba(102, 126, 234, 0.3)',
              borderRadius: '50px',
              padding: '12px 24px',
              marginBottom: '2rem',
              fontSize: '0.95rem',
              color: '#a5b4fc',
              animation: 'slideInDown 1s ease-out',
              backdropFilter: 'blur(10px)'
            }}>
              <div style={{ 
                width: '8px', 
                height: '8px', 
                background: '#10b981', 
                borderRadius: '50%', 
                animation: 'pulse 2s infinite' 
              }}></div>
              Live AI-Powered Trading Insights
            </div>
            
            {/* Main Headline */}
            <h1 style={{
              fontSize: 'clamp(3.5rem, 7vw, 6rem)',
              fontWeight: '900',
              lineHeight: '1.1',
              marginBottom: '2rem',
              background: 'linear-gradient(135deg, #ffffff 0%, #a5b4fc 50%, #c7d2fe 100%)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              backgroundClip: 'text',
              letterSpacing: '-3px',
              animation: 'fadeInUp 1s ease-out 0.3s both'
            }}>
              Trade Smarter with<br />
              <span style={{
                background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                backgroundClip: 'text',
                animation: 'glow 2s ease-in-out infinite alternate'
              }}>AI Intelligence</span>
            </h1>
            
            {/* Subtitle */}
            <p style={{
              fontSize: '1.35rem',
              color: '#cbd5e1',
              marginBottom: '3rem',
              lineHeight: '1.7',
              maxWidth: '700px',
              margin: '0 auto 3rem auto',
              animation: 'fadeInUp 1s ease-out 0.6s both',
              fontWeight: '400'
            }}>
              Get real-time market analysis, AI-generated trading signals, and portfolio insights 
              that help you make profitable decisions in the cryptocurrency market with 95% accuracy.
            </p>

            {/* CTA Buttons */}
            <div style={{ 
              display: 'flex', 
              gap: '1.5rem', 
              justifyContent: 'center', 
              flexWrap: 'wrap',
              animation: 'fadeInUp 1s ease-out 0.9s both'
            }}>
              <button 
                onClick={() => setShowAuth(true)}
                style={{
                  background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                  color: '#ffffff',
                  border: 'none',
                  borderRadius: '16px',
                  padding: '18px 36px',
                  fontSize: '1.2rem',
                  fontWeight: '700',
                  cursor: 'pointer',
                  boxShadow: '0 15px 50px rgba(102, 126, 234, 0.4)',
                  transition: 'all 0.3s ease',
                  position: 'relative',
                  overflow: 'hidden'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.transform = 'translateY(-3px) scale(1.05)'
                  e.currentTarget.style.boxShadow = '0 25px 70px rgba(102, 126, 234, 0.5)'
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = 'translateY(0) scale(1)'
                  e.currentTarget.style.boxShadow = '0 15px 50px rgba(102, 126, 234, 0.4)'
                }}
              >
                Get Started Free
              </button>
              <button 
                onClick={() => setShowAuth(true)}
                style={{
                  background: 'rgba(255, 255, 255, 0.1)',
                  color: '#e2e8f0',
                  border: '2px solid rgba(255, 255, 255, 0.2)',
                  borderRadius: '16px',
                  padding: '18px 36px',
                  fontSize: '1.2rem',
                  fontWeight: '600',
                  cursor: 'pointer',
                  transition: 'all 0.3s ease',
                  backdropFilter: 'blur(10px)'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = 'rgba(255, 255, 255, 0.15)'
                  e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.3)'
                  e.currentTarget.style.transform = 'translateY(-2px)'
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = 'rgba(255, 255, 255, 0.1)'
                  e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.2)'
                  e.currentTarget.style.transform = 'translateY(0)'
                }}
              >
                Try Demo
              </button>
            </div>

            {/* Social Proof */}
            <div style={{ 
              marginTop: '5rem', 
              textAlign: 'center',
              animation: 'fadeInUp 1s ease-out 1.2s both'
            }}>
              <p style={{ color: '#64748b', fontSize: '1rem', marginBottom: '2.5rem', fontWeight: '500' }}>
                Trusted by 10,000+ crypto traders worldwide
              </p>
              <div style={{
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center',
                gap: '4rem',
                flexWrap: 'wrap',
                opacity: 0.7
              }}>
                {[
                  { icon: '⭐⭐⭐⭐⭐', text: '4.9/5 Rating', delay: '0s' },
                  { icon: '🚀', text: '95% Win Rate', delay: '0.1s' },
                  { icon: '📈', text: '$2M+ Profits', delay: '0.2s' },
                  { icon: '👥', text: '24/7 Support', delay: '0.3s' }
                ].map((stat, idx) => (
                  <div key={idx} style={{ 
                    fontSize: '1.1rem', 
                    fontWeight: '600',
                    animation: `fadeInUp 0.6s ease-out ${1.5 + idx * 0.1}s both`,
                    padding: '1rem 1.5rem',
                    background: 'rgba(255, 255, 255, 0.05)',
                    borderRadius: '12px',
                    backdropFilter: 'blur(10px)'
                  }}>
                    {stat.icon} {stat.text}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Statistics Section */}
      <section style={{ padding: '4rem 0', background: 'rgba(0, 0, 0, 0.4)' }}>
        <div style={{ maxWidth: '1400px', margin: '0 auto', padding: '0 2rem' }}>
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
            gap: '3rem',
            textAlign: 'center'
          }}>
            {[
              { number: '24/7', label: 'AI Monitoring', icon: '🤖' },
              { number: '10,000+', label: 'Active Traders', icon: '👥' },
              { number: '$2B+', label: 'Trading Volume', icon: '📊' },
              { number: '95%', label: 'Win Rate', icon: '🎯' },
              { number: '99.9%', label: 'Uptime', icon: '⚡' }
            ].map((stat, idx) => (
              <div key={idx} style={{
                animation: `fadeInUp 0.8s ease-out ${0.3 + idx * 0.1}s both`
              }}>
                <div style={{
                  fontSize: '3rem',
                  marginBottom: '0.5rem',
                  background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                  backgroundClip: 'text',
                  fontWeight: '800'
                }}>
                  {stat.icon}
                </div>
                <div style={{
                  fontSize: '2.5rem',
                  fontWeight: '800',
                  color: '#ffffff',
                  marginBottom: '0.5rem'
                }}>
                  {stat.number}
                </div>
                <div style={{
                  color: '#94a3b8',
                  fontSize: '1rem',
                  fontWeight: '500'
                }}>
                  {stat.label}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" style={{ padding: '5rem 0', background: 'rgba(0, 0, 0, 0.3)', position: 'relative' }}>
        <div style={{ maxWidth: '1400px', margin: '0 auto', padding: '0 2rem' }}>
          <div style={{ textAlign: 'center', marginBottom: '4rem' }}>
            <h2 style={{
              fontSize: 'clamp(2.5rem, 4vw, 4rem)',
              fontWeight: '800',
              marginBottom: '1rem',
              background: 'linear-gradient(135deg, #ffffff 0%, #a5b4fc 100%)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              backgroundClip: 'text'
            }}>
              Powerful AI Features
            </h2>
            <p style={{ fontSize: '1.2rem', color: '#cbd5e1', maxWidth: '600px', margin: '0 auto' }}>
              Everything you need to trade cryptocurrency with confidence and intelligence
            </p>
          </div>

          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(350px, 1fr))',
            gap: '2rem'
          }}>
            {[
              {
                icon: (
                  <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                    <path d="M9 12l2 2 4-4"></path>
                    <path d="M21 12c-1 0-2-1-2-2s1-2 2-2 2 1 2 2-1 2-2 2z"></path>
                    <path d="M3 12c1 0 2-1 2-2s-1-2-2-2-2 1-2 2 1 2 2 2z"></path>
                    <path d="M12 3c0 1-1 2-2 2s-2-1-2-2 1-2 2-2 2 1 2 2z"></path>
                    <path d="M12 21c0-1 1-2 2-2s2 1 2 2-1 2-2 2-2-1-2-2z"></path>
                    <path d="M19.777 4.223a6 6 0 0 1 0 8.486"></path>
                    <path d="M4.223 4.223a6 6 0 0 0 0 8.486"></path>
                  </svg>
                ),
                title: 'AI Market Analysis',
                description: 'Advanced sentiment analysis using news, social media, and technical indicators to predict market movements with 95% accuracy.',
                features: ['Real-time news sentiment analysis', 'Social media trend monitoring', 'Technical pattern recognition', 'Market correlation analysis'],
                color: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)'
              },
              {
                icon: (
                  <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                    <path d="M3 3v18h18"></path>
                    <path d="M18.7 8l-5.1 5.2-2.8-2.7L7 14.3"></path>
                    <circle cx="7" cy="7" r="1"></circle>
                  </svg>
                ),
                title: 'Smart Trading Signals',
                description: 'AI-generated buy/sell recommendations with confidence scores and risk assessments for optimal entry and exit points.',
                features: ['High-confidence trading signals', 'Risk/reward ratio analysis', 'Precise entry and exit points', 'Stop-loss recommendations'],
                color: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)'
              },
              {
                icon: (
                  <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                    <rect x="2" y="3" width="20" height="14" rx="2" ry="2"></rect>
                    <line x1="8" y1="21" x2="16" y2="21"></line>
                    <line x1="12" y1="17" x2="12" y2="21"></line>
                  </svg>
                ),
                title: 'Portfolio Intelligence',
                description: 'Track your holdings across multiple wallets with AI-powered insights and automated rebalancing recommendations.',
                features: ['Multi-wallet portfolio tracking', 'Performance analytics dashboard', 'Automated rebalancing suggestions', 'Tax optimization strategies'],
                color: 'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)'
              },
              {
                icon: (
                  <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                    <polygon points="13,2 3,14 12,14 11,22 21,10 12,10 13,2"></polygon>
                  </svg>
                ),
                title: 'Real-time Alerts',
                description: 'Never miss important market movements with intelligent notifications and customizable alert systems.',
                features: ['Price movement alerts', 'Signal notifications', 'Market event alerts', 'Portfolio performance updates'],
                color: 'linear-gradient(135deg, #43e97b 0%, #38f9d7 100%)'
              },
              {
                icon: (
                  <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                    <path d="M3 3v18h18"></path>
                    <path d="M18.7 8l-5.1 5.2-2.8-2.7L7 14.3"></path>
                    <path d="M9 9h1v6h-1z"></path>
                    <path d="M14 9h1v6h-1z"></path>
                  </svg>
                ),
                title: 'Advanced Analytics',
                description: 'Deep market insights with charts, trends, and predictive analytics powered by machine learning algorithms.',
                features: ['Predictive modeling', 'Trend analysis', 'Volume indicators', 'Market heat maps'],
                color: 'linear-gradient(135deg, #fa709a 0%, #fee140 100%)'
              },
              {
                icon: (
                  <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path>
                    <path d="M9 12l2 2 4-4"></path>
                  </svg>
                ),
                title: 'Risk Management',
                description: 'AI-powered risk assessment and management tools to protect your investments and maximize returns.',
                features: ['Risk scoring system', 'Position sizing recommendations', 'Drawdown protection', 'Volatility analysis'],
                color: 'linear-gradient(135deg, #a8edea 0%, #fed6e3 100%)'
              }
            ].map((feature, idx) => (
              <div key={idx} style={{
                background: 'rgba(255, 255, 255, 0.05)',
                backdropFilter: 'blur(20px)',
                borderRadius: '20px',
                padding: '2.5rem',
                border: '1px solid rgba(255, 255, 255, 0.1)',
                transition: 'all 0.3s ease',
                animation: `fadeInUp 0.8s ease-out ${0.5 + idx * 0.1}s both`,
                cursor: 'pointer'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = 'translateY(-10px)'
                e.currentTarget.style.boxShadow = '0 20px 40px rgba(0, 0, 0, 0.3)'
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = 'translateY(0)'
                e.currentTarget.style.boxShadow = 'none'
              }}
              >
                <div style={{
                  marginBottom: '1.5rem',
                  background: feature.color,
                  width: '80px',
                  height: '80px',
                  borderRadius: '16px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  animation: 'bounce 2s infinite',
                  color: '#ffffff'
                }}>
                  {feature.icon}
                </div>
                <h3 style={{
                  fontSize: '1.5rem',
                  fontWeight: '700',
                  marginBottom: '1rem',
                  color: '#ffffff'
                }}>
                  {feature.title}
                </h3>
                <p style={{
                  color: '#cbd5e1',
                  marginBottom: '1.5rem',
                  lineHeight: '1.6',
                  fontSize: '1.05rem'
                }}>
                  {feature.description}
                </p>
                <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
                  {feature.features.map((item, i) => (
                    <li key={i} style={{
                      color: '#94a3b8',
                      fontSize: '0.95rem',
                      marginBottom: '0.75rem',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.75rem'
                    }}>
                      <div style={{
                        width: '6px',
                        height: '6px',
                        background: feature.color,
                        borderRadius: '50%'
                      }}></div>
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing Section */}
      <Pricing onAuthRequired={() => setShowAuth(true)} />

      {/* Footer */}
      <footer style={{ 
        background: 'rgba(0, 0, 0, 0.8)', 
        borderTop: '1px solid rgba(255, 255, 255, 0.1)',
        padding: '4rem 0 2rem 0'
      }}>
        <div style={{ maxWidth: '1400px', margin: '0 auto', padding: '0 2rem' }}>
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
            gap: '3rem',
            marginBottom: '3rem'
          }}>
            {/* Company Info */}
            <div>
              <h3 style={{ 
                fontSize: '1.5rem', 
                fontWeight: '700', 
                color: '#ffffff', 
                marginBottom: '1rem' 
              }}>
                AI Trading Assistant
              </h3>
              <p style={{ 
                color: '#94a3b8', 
                lineHeight: '1.6', 
                marginBottom: '1.5rem',
                fontSize: '0.95rem'
              }}>
                Empowering traders with AI-driven insights, real-time signals, and advanced analytics 
                to make smarter investment decisions in the cryptocurrency market.
              </p>
              <div style={{ display: 'flex', gap: '1rem' }}>
                <a href="#" style={{ color: '#667eea', fontSize: '1.5rem' }}>📧</a>
                <a href="#" style={{ color: '#667eea', fontSize: '1.5rem' }}>🐦</a>
                <a href="#" style={{ color: '#667eea', fontSize: '1.5rem' }}>💼</a>
                <a href="#" style={{ color: '#667eea', fontSize: '1.5rem' }}>📘</a>
              </div>
            </div>

            {/* Product */}
            <div>
              <h4 style={{ 
                fontSize: '1.1rem', 
                fontWeight: '600', 
                color: '#ffffff', 
                marginBottom: '1rem' 
              }}>
                Product
              </h4>
              <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
                {[
                  'AI Trading Signals',
                  'Market Analysis',
                  'Portfolio Tracking',
                  'Risk Management',
                  'Real-time Alerts',
                  'Advanced Analytics'
                ].map((item, idx) => (
                  <li key={idx} style={{ marginBottom: '0.5rem' }}>
                    <a href="#" style={{ 
                      color: '#94a3b8', 
                      textDecoration: 'none',
                      fontSize: '0.9rem',
                      transition: 'color 0.2s ease'
                    }}
                    onMouseEnter={(e) => (e.target as HTMLElement).style.color = '#667eea'}
                    onMouseLeave={(e) => (e.target as HTMLElement).style.color = '#94a3b8'}
                    >
                      {item}
                    </a>
                  </li>
                ))}
              </ul>
            </div>

            {/* Company */}
            <div>
              <h4 style={{ 
                fontSize: '1.1rem', 
                fontWeight: '600', 
                color: '#ffffff', 
                marginBottom: '1rem' 
              }}>
                Company
              </h4>
              <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
                {[
                  'About Us',
                  'Careers',
                  'Press',
                  'Blog',
                  'Contact',
                  'Support'
                ].map((item, idx) => (
                  <li key={idx} style={{ marginBottom: '0.5rem' }}>
                    <a href="#" style={{ 
                      color: '#94a3b8', 
                      textDecoration: 'none',
                      fontSize: '0.9rem',
                      transition: 'color 0.2s ease'
                    }}
                    onMouseEnter={(e) => (e.target as HTMLElement).style.color = '#667eea'}
                    onMouseLeave={(e) => (e.target as HTMLElement).style.color = '#94a3b8'}
                    >
                      {item}
                    </a>
                  </li>
                ))}
              </ul>
            </div>

            {/* Resources */}
            <div>
              <h4 style={{ 
                fontSize: '1.1rem', 
                fontWeight: '600', 
                color: '#ffffff', 
                marginBottom: '1rem' 
              }}>
                Resources
              </h4>
              <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
                {[
                  'Documentation',
                  'API Reference',
                  'Trading Guides',
                  'Market Research',
                  'Community Forum',
                  'Help Center'
                ].map((item, idx) => (
                  <li key={idx} style={{ marginBottom: '0.5rem' }}>
                    <a href="#" style={{ 
                      color: '#94a3b8', 
                      textDecoration: 'none',
                      fontSize: '0.9rem',
                      transition: 'color 0.2s ease'
                    }}
                    onMouseEnter={(e) => (e.target as HTMLElement).style.color = '#667eea'}
                    onMouseLeave={(e) => (e.target as HTMLElement).style.color = '#94a3b8'}
                    >
                      {item}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          </div>

          {/* Bottom Footer */}
          <div style={{ 
            borderTop: '1px solid rgba(255, 255, 255, 0.1)', 
            paddingTop: '2rem',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: '1rem'
          }}>
            <p style={{ color: '#64748b', fontSize: '0.9rem' }}>
              © 2024 AI Trading Assistant. All rights reserved.
            </p>
            <div style={{ display: 'flex', gap: '2rem', flexWrap: 'wrap' }}>
              <a href="#" style={{ color: '#64748b', fontSize: '0.9rem', textDecoration: 'none' }}>
                Privacy Policy
              </a>
              <a href="#" style={{ color: '#64748b', fontSize: '0.9rem', textDecoration: 'none' }}>
                Terms of Service
              </a>
              <a href="#" style={{ color: '#64748b', fontSize: '0.9rem', textDecoration: 'none' }}>
                Cookie Policy
              </a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  )

  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #050510 0%, #0f0f1a 50%, #1a0f2e 100%)',
      color: '#ffffff',
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", sans-serif'
    }}>
      {/* Error Message */}
      {error && (
        <ErrorMessage 
          message={error} 
          onClose={() => setError('')} 
        />
      )}

      {/* Success Message */}
      {success && (
        <SuccessMessage 
          message={success} 
          onClose={() => setSuccess('')} 
        />
      )}

      {/* Security Event Notifications */}
      {securityEvent && (
        <div style={{
          position: 'fixed',
          top: '20px',
          right: '20px',
          background: securityEvent.type === 'error' 
            ? 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)'
            : securityEvent.type === 'warning'
            ? 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)'
            : 'linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%)',
          color: '#ffffff',
          padding: '1rem 1.5rem',
          borderRadius: '12px',
          boxShadow: '0 10px 25px rgba(0, 0, 0, 0.3)',
          zIndex: 3000,
          maxWidth: '400px',
          display: 'flex',
          alignItems: 'center',
          gap: '1rem',
          animation: 'slideInRight 0.3s ease-out'
        }}>
          <div style={{ flex: 1 }}>
            <div style={{ fontWeight: '600', marginBottom: '0.25rem' }}>
              {securityEvent.type === 'error' ? '🚨 Security Alert' : 
               securityEvent.type === 'warning' ? '⚠️ Warning' : 'ℹ️ Info'}
            </div>
            <div style={{ fontSize: '0.9rem', opacity: 0.9 }}>{securityEvent.message}</div>
            {securityEvent.code && (
              <div style={{ fontSize: '0.8rem', opacity: 0.7, marginTop: '0.25rem' }}>
                Code: {securityEvent.code}
              </div>
            )}
          </div>
          <button
            onClick={dismissSecurityEvent}
            style={{
              background: 'transparent',
              border: 'none',
              color: '#ffffff',
              cursor: 'pointer',
              fontSize: '1.2rem',
              padding: '0.25rem',
              borderRadius: '4px',
              transition: 'background 0.2s ease'
            }}
            onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(255, 255, 255, 0.2)'}
            onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
          >
            ×
          </button>
        </div>
      )}
      
      {/* Navigation */}
      <nav style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        zIndex: 1000,
        background: 'rgba(5, 5, 16, 0.95)',
        backdropFilter: 'blur(20px)',
        borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
        padding: '1rem 0'
      }}>
        <div style={{ maxWidth: '1400px', margin: '0 auto', padding: '0 2rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
              <div style={{
                width: '48px',
                height: '48px',
                background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                borderRadius: '12px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '1.5rem'
              }}>
                🤖
              </div>
              <span style={{ fontSize: '1.5rem', fontWeight: '700', letterSpacing: '-0.5px' }}>
                AI Trading Assistant
              </span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '2rem' }}>
              {!isAuthenticated ? (
                <>
                  <a href="#features" style={{ color: '#e2e8f0', textDecoration: 'none', fontWeight: '500' }}>Features</a>
                  <a href="#how-it-works" style={{ color: '#e2e8f0', textDecoration: 'none', fontWeight: '500' }}>How it Works</a>
                  <a href="#pricing" style={{ color: '#e2e8f0', textDecoration: 'none', fontWeight: '500' }}>Pricing</a>
                  <button
                    onClick={() => setShowAuth(true)}
                    style={{
                      background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                      color: '#ffffff',
                      border: 'none',
                      borderRadius: '8px',
                      padding: '12px 24px',
                      fontWeight: '600',
                      cursor: 'pointer',
                      fontSize: '0.95rem',
                      transition: 'all 0.2s ease'
                    }}
                  >
                    Sign In
                  </button>
                </>
              ) : (
                <>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                    <div style={{
                      background: 'rgba(102, 126, 234, 0.2)',
                      padding: '8px 12px',
                      borderRadius: '8px',
                      fontSize: '0.9rem',
                      color: '#a5b4fc'
                    }}>
                      {user?.subscription_tier || 'Free'} Plan
                    </div>
                    <span style={{ color: '#e2e8f0', fontSize: '0.95rem' }}>
                      Welcome, {user?.username || user?.email || 'User'}
                    </span>
                  </div>
                  <button
                    onClick={handleLogout}
                    style={{
                      background: 'transparent',
                      color: '#e2e8f0',
                      border: '1px solid rgba(255, 255, 255, 0.2)',
                      borderRadius: '8px',
                      padding: '8px 16px',
                      fontWeight: '500',
                      cursor: 'pointer',
                      fontSize: '0.9rem',
                      transition: 'all 0.2s ease'
                    }}
                  >
                    Sign Out
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      </nav>

      {/* Authentication Modal */}
      {showAuth && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0, 0, 0, 0.6)',
          backdropFilter: 'blur(8px)',
          zIndex: 2000,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '2rem'
        }}>
          <div style={{
            background: 'transparent',
            borderRadius: '20px',
            padding: '0',
            maxWidth: '500px',
            width: '100%',
            position: 'relative'
          }}>
            <button
              onClick={() => {
                setShowAuth(false)
              }}
              style={{
                position: 'absolute',
                top: '-40px',
                right: '0',
                background: 'rgba(255, 255, 255, 0.1)',
                border: 'none',
                color: '#ffffff',
                fontSize: '1.5rem',
                cursor: 'pointer',
                width: '40px',
                height: '40px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                borderRadius: '50%',
                transition: 'all 0.2s ease',
                backdropFilter: 'blur(10px)'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = 'rgba(255, 255, 255, 0.2)'
                e.currentTarget.style.transform = 'scale(1.1)'
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = 'rgba(255, 255, 255, 0.1)'
                e.currentTarget.style.transform = 'scale(1)'
              }}
            >
              ×
            </button>

            <AuthForm
              mode={authMode}
              onSubmit={handleAuth}
              onModeChange={(mode) => {
                setAuthMode(mode)
              }}
            />
          </div>
        </div>
      )}

      {/* Payment Modal */}
      {showPayment && selectedPaymentPlan && (
        <PaymentModal
          plan={selectedPaymentPlan}
          onClose={() => {
            setShowPayment(false)
            setSelectedPaymentPlan(null)
          }}
          onSuccess={handlePaymentSuccess}
        />
      )}

      {/* Main Content */}
      {isAuthenticated ? (
        <div style={{ paddingTop: '80px' }}>
          <Dashboard />
        </div>
      ) : (
        <LandingPage />
      )}

      <style jsx>{`
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.5; }
        }
        
        @keyframes fadeInUp {
          from {
            opacity: 0;
            transform: translateY(30px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        
        @keyframes slideInDown {
          from {
            opacity: 0;
            transform: translateY(-30px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        
        @keyframes float {
          0%, 100% { transform: translateY(0px); }
          50% { transform: translateY(-20px); }
        }
        
        @keyframes glow {
          from { filter: brightness(1); }
          to { filter: brightness(1.2); }
        }
        
        @keyframes bounce {
          0%, 20%, 53%, 80%, 100% { transform: translate3d(0,0,0); }
          40%, 43% { transform: translate3d(0, -30px, 0); }
          70% { transform: translate3d(0, -15px, 0); }
          90% { transform: translate3d(0, -4px, 0); }
        }
        
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
        
        input::placeholder {
          color: rgba(255, 255, 255, 0.6);
        }
        
        input:focus {
          outline: none;
          box-shadow: 0 0 0 2px rgba(102, 126, 234, 0.5);
        }
        
        button:hover {
          transform: translateY(-2px);
          box-shadow: 0 10px 40px rgba(0, 0, 0, 0.3);
        }
        
        a:hover {
          color: #667eea;
        }
        
        @media (max-width: 768px) {
          nav div div:last-child {
            display: none;
          }
          
          [style*="gridTemplateColumns: 2fr 1fr"] {
            grid-template-columns: 1fr !important;
          }
        }
      `}</style>
    </div>
  )
}