'use client'

import { useState } from 'react'

interface Plan {
  id: string
  name: string
  price: number
  currency: string
  billing_period: 'monthly' | 'yearly'
  features: string[]
  highlighted?: boolean
  popular?: boolean
  savings?: string
}

interface PlanSelectionModalProps {
  isOpen: boolean
  onClose: () => void
  onSelectPlan: (plan: Plan) => void
}

export function PlanSelectionModal({ isOpen, onClose, onSelectPlan }: PlanSelectionModalProps) {
  const [billingPeriod, setBillingPeriod] = useState<'monthly' | 'yearly'>('monthly')

  if (!isOpen) return null

  const plans: Plan[] = [
    {
      id: 'free',
      name: 'Free',
      price: 0,
      currency: 'USD',
      billing_period: billingPeriod,
      features: [
        '10 API calls per day',
        'Basic portfolio tracking',
        'Limited trading signals',
        'Basic market data',
        'Community support'
      ]
    },
    {
      id: 'pro',
      name: 'Pro',
      price: billingPeriod === 'monthly' ? 29 : 290,
      currency: 'USD',
      billing_period: billingPeriod,
      features: [
        '1,000 API calls per day',
        'Advanced portfolio analytics',
        'Unlimited trading signals',
        'Real-time market data',
        'AI-powered insights',
        'Technical analysis tools',
        'Priority support'
      ],
      popular: true,
      savings: billingPeriod === 'yearly' ? 'Save $58/year' : undefined
    },
    {
      id: 'premium',
      name: 'Premium',
      price: billingPeriod === 'monthly' ? 99 : 990,
      currency: 'USD',
      billing_period: billingPeriod,
      features: [
        'Unlimited API calls',
        'Advanced portfolio management',
        'Custom trading strategies',
        'Real-time notifications',
        'Advanced AI analysis',
        'Custom indicators',
        'White-label solutions',
        'Dedicated support',
        'API access'
      ],
      highlighted: true,
      savings: billingPeriod === 'yearly' ? 'Save $198/year' : undefined
    }
  ]

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      background: 'rgba(0, 0, 0, 0.8)',
      backdropFilter: 'blur(10px)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 1000,
      padding: '2rem'
    }}>
      <div style={{
        background: 'linear-gradient(135deg, #0a0a1a 0%, #1a1a2e 100%)',
        border: '1px solid rgba(102, 126, 234, 0.2)',
        borderRadius: '24px',
        maxWidth: '1200px',
        width: '100%',
        maxHeight: '90vh',
        overflow: 'auto',
        position: 'relative'
      }}>
        {/* Header */}
        <div style={{
          padding: '2rem 2rem 1rem 2rem',
          borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between'
        }}>
          <div>
            <h2 style={{
              fontSize: '1.8rem',
              fontWeight: 700,
              color: '#ffffff',
              margin: '0 0 0.5rem 0',
              background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent'
            }}>
              Choose Your Plan
            </h2>
            <p style={{
              color: '#94a3b8',
              margin: 0,
              fontSize: '1rem'
            }}>
              Unlock the full power of AI trading
            </p>
          </div>

          <button
            onClick={onClose}
            style={{
              background: 'rgba(255, 255, 255, 0.1)',
              border: '1px solid rgba(255, 255, 255, 0.2)',
              borderRadius: '12px',
              width: '40px',
              height: '40px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#ffffff',
              cursor: 'pointer',
              transition: 'all 0.2s ease'
            }}
            onMouseEnter={(e) => {
              e.target.style.background = 'rgba(255, 255, 255, 0.2)'
            }}
            onMouseLeave={(e) => {
              e.target.style.background = 'rgba(255, 255, 255, 0.1)'
            }}
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M18 6L6 18M6 6l12 12"/>
            </svg>
          </button>
        </div>

        {/* Billing Period Toggle */}
        <div style={{
          padding: '1.5rem 2rem',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center'
        }}>
          <div style={{
            background: 'rgba(255, 255, 255, 0.05)',
            border: '1px solid rgba(255, 255, 255, 0.1)',
            borderRadius: '12px',
            padding: '6px',
            display: 'flex',
            gap: '6px'
          }}>
            <button
              onClick={() => setBillingPeriod('monthly')}
              style={{
                background: billingPeriod === 'monthly' 
                  ? 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)'
                  : 'transparent',
                border: 'none',
                borderRadius: '8px',
                padding: '0.75rem 1.5rem',
                color: '#ffffff',
                cursor: 'pointer',
                transition: 'all 0.2s ease',
                fontSize: '0.9rem',
                fontWeight: 600
              }}
            >
              Monthly
            </button>
            <button
              onClick={() => setBillingPeriod('yearly')}
              style={{
                background: billingPeriod === 'yearly' 
                  ? 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)'
                  : 'transparent',
                border: 'none',
                borderRadius: '8px',
                padding: '0.75rem 1.5rem',
                color: '#ffffff',
                cursor: 'pointer',
                transition: 'all 0.2s ease',
                fontSize: '0.9rem',
                fontWeight: 600,
                position: 'relative'
              }}
            >
              Yearly
              {billingPeriod === 'yearly' && (
                <div style={{
                  position: 'absolute',
                  top: '-8px',
                  right: '-8px',
                  background: '#10b981',
                  color: '#ffffff',
                  fontSize: '0.7rem',
                  padding: '2px 6px',
                  borderRadius: '6px',
                  fontWeight: 700
                }}>
                  SAVE
                </div>
              )}
            </button>
          </div>
        </div>

        {/* Plans Grid */}
        <div style={{
          padding: '1rem 2rem 2rem 2rem',
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
          gap: '1.5rem'
        }}>
          {plans.map((plan) => (
            <div
              key={plan.id}
              style={{
                background: plan.highlighted 
                  ? 'linear-gradient(135deg, rgba(102, 126, 234, 0.15) 0%, rgba(118, 75, 162, 0.15) 100%)'
                  : 'linear-gradient(135deg, rgba(255, 255, 255, 0.08) 0%, rgba(255, 255, 255, 0.03) 100%)',
                border: plan.highlighted 
                  ? '2px solid rgba(102, 126, 234, 0.4)'
                  : '1px solid rgba(255, 255, 255, 0.1)',
                borderRadius: '20px',
                padding: '2rem',
                position: 'relative',
                transition: 'all 0.3s ease',
                cursor: plan.id !== 'free' ? 'pointer' : 'default',
                transform: plan.highlighted ? 'scale(1.05)' : 'scale(1)'
              }}
              onMouseEnter={(e) => {
                if (plan.id !== 'free') {
                  e.target.style.transform = plan.highlighted ? 'scale(1.08)' : 'scale(1.03)'
                  e.target.style.borderColor = 'rgba(102, 126, 234, 0.6)'
                }
              }}
              onMouseLeave={(e) => {
                if (plan.id !== 'free') {
                  e.target.style.transform = plan.highlighted ? 'scale(1.05)' : 'scale(1)'
                  e.target.style.borderColor = plan.highlighted 
                    ? 'rgba(102, 126, 234, 0.4)'
                    : 'rgba(255, 255, 255, 0.1)'
                }
              }}
              onClick={() => {
                if (plan.id !== 'free') {
                  onSelectPlan(plan)
                }
              }}
            >
              {/* Popular Badge */}
              {plan.popular && (
                <div style={{
                  position: 'absolute',
                  top: '-12px',
                  left: '50%',
                  transform: 'translateX(-50%)',
                  background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                  color: '#ffffff',
                  padding: '6px 16px',
                  borderRadius: '20px',
                  fontSize: '0.8rem',
                  fontWeight: 700,
                  boxShadow: '0 4px 20px rgba(102, 126, 234, 0.4)'
                }}>
                  MOST POPULAR
                </div>
              )}

              {/* Plan Header */}
              <div style={{ textAlign: 'center', marginBottom: '1.5rem' }}>
                <h3 style={{
                  fontSize: '1.5rem',
                  fontWeight: 700,
                  color: '#ffffff',
                  margin: '0 0 0.5rem 0'
                }}>
                  {plan.name}
                </h3>

                <div style={{
                  display: 'flex',
                  alignItems: 'baseline',
                  justifyContent: 'center',
                  gap: '0.25rem',
                  marginBottom: '0.5rem'
                }}>
                  <span style={{
                    fontSize: '3rem',
                    fontWeight: 800,
                    color: '#ffffff'
                  }}>
                    ${plan.price}
                  </span>
                  <span style={{
                    fontSize: '1rem',
                    color: '#94a3b8'
                  }}>
                    /{billingPeriod === 'monthly' ? 'mo' : 'yr'}
                  </span>
                </div>

                {plan.savings && (
                  <div style={{
                    background: 'rgba(16, 185, 129, 0.1)',
                    border: '1px solid rgba(16, 185, 129, 0.2)',
                    borderRadius: '8px',
                    padding: '4px 8px',
                    fontSize: '0.8rem',
                    color: '#10b981',
                    fontWeight: 600,
                    display: 'inline-block'
                  }}>
                    {plan.savings}
                  </div>
                )}
              </div>

              {/* Features List */}
              <div style={{ marginBottom: '2rem' }}>
                {plan.features.map((feature, index) => (
                  <div
                    key={index}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.75rem',
                      marginBottom: '0.75rem',
                      color: '#e2e8f0',
                      fontSize: '0.9rem'
                    }}
                  >
                    <div style={{
                      width: '16px',
                      height: '16px',
                      borderRadius: '50%',
                      background: plan.highlighted 
                        ? 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)'
                        : '#10b981',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      flexShrink: 0
                    }}>
                      <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3">
                        <path d="M9 12l2 2 4-4"/>
                      </svg>
                    </div>
                    {feature}
                  </div>
                ))}
              </div>

              {/* Action Button */}
              <button
                disabled={plan.id === 'free'}
                style={{
                  width: '100%',
                  background: plan.id === 'free'
                    ? 'rgba(255, 255, 255, 0.1)'
                    : plan.highlighted
                      ? 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)'
                      : 'linear-gradient(135deg, rgba(102, 126, 234, 0.8) 0%, rgba(118, 75, 162, 0.8) 100%)',
                  border: 'none',
                  borderRadius: '12px',
                  padding: '1rem',
                  color: '#ffffff',
                  fontSize: '1rem',
                  fontWeight: 600,
                  cursor: plan.id === 'free' ? 'not-allowed' : 'pointer',
                  transition: 'all 0.2s ease',
                  opacity: plan.id === 'free' ? 0.6 : 1
                }}
                onMouseEnter={(e) => {
                  if (plan.id !== 'free') {
                    e.target.style.transform = 'translateY(-2px)'
                    e.target.style.boxShadow = '0 8px 25px rgba(102, 126, 234, 0.4)'
                  }
                }}
                onMouseLeave={(e) => {
                  if (plan.id !== 'free') {
                    e.target.style.transform = 'translateY(0)'
                    e.target.style.boxShadow = 'none'
                  }
                }}
              >
                {plan.id === 'free' ? 'Current Plan' : 'Select Plan'}
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}