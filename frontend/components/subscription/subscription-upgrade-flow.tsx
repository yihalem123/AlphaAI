'use client'

import { useState } from 'react'
import { PlanSelectionModal } from './plan-selection-modal'
import { PaymentMethodModal } from './payment-method-modal'
// import { StripePayment } from './stripe-payment'
import { CryptoPayment } from './crypto-payment'
import { useAuth } from '@/components/auth-provider-secure'
import { authServiceSecure } from '@/lib/auth-service-secure'

interface Plan {
  id: string
  name: string
  price: number
  currency: string
  billing_period: 'monthly' | 'yearly'
  features: string[]
}

interface SubscriptionUpgradeFlowProps {
  isOpen: boolean
  onClose: () => void
  onSuccess?: (subscriptionData: any) => void
}

type FlowStep = 'plan-selection' | 'payment-method' | 'stripe-payment' | 'crypto-payment' | 'success'

export function SubscriptionUpgradeFlow({ 
  isOpen, 
  onClose, 
  onSuccess 
}: SubscriptionUpgradeFlowProps) {
  const [currentStep, setCurrentStep] = useState<FlowStep>('plan-selection')
  const [selectedPlan, setSelectedPlan] = useState<Plan | null>(null)
  const [paymentData, setPaymentData] = useState<any>(null)
  const [subscriptionResult, setSubscriptionResult] = useState<any>(null)
  const [error, setError] = useState<string>('')
  const { updateUser, refreshUser } = useAuth()

  const handlePlanSelect = (plan: Plan) => {
    setSelectedPlan(plan)
    setCurrentStep('payment-method')
  }

  const handlePaymentMethodSelect = async (method: 'stripe' | 'crypto', data?: any) => {
    setPaymentData(data)
    if (!selectedPlan) return
    if (method === 'stripe') {
      // Immediately create Checkout Session and redirect (use secure service with cookies)
      try {
        const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'
        // Use backend redirect endpoint for full-page navigation (ensures cookies are sent)
        const params = new URLSearchParams({
          plan_type: selectedPlan.id,
          billing_period: selectedPlan.billing_period || 'monthly',
        })
        window.location.href = `${API_BASE}/api/payment/checkout/redirect?${params.toString()}`
        return
      } catch (e: any) {
        setError(e.message || 'Stripe checkout failed')
      }
    } else {
      setCurrentStep('crypto-payment')
    }
  }

  const handlePaymentSuccess = async (subscriptionData: any) => {
    setSubscriptionResult(subscriptionData)
    setCurrentStep('success')
    
    // Refresh user data from server to get updated subscription info
    await refreshUser()

    // Call success callback if provided
    onSuccess?.(subscriptionData)
  }

  const handlePaymentError = (errorMessage: string) => {
    setError(errorMessage)
    // Could show error modal or return to payment method selection
  }

  const handleClose = () => {
    // Reset all state when closing
    setCurrentStep('plan-selection')
    setSelectedPlan(null)
    setPaymentData(null)
    setSubscriptionResult(null)
    setError('')
    onClose()
  }

  const handleBack = () => {
    switch (currentStep) {
      case 'payment-method':
        setCurrentStep('plan-selection')
        break
      case 'stripe-payment':
      case 'crypto-payment':
        setCurrentStep('payment-method')
        break
      default:
        break
    }
  }

  if (!isOpen) return null

  return (
    <>
      {/* Plan Selection Step */}
      {currentStep === 'plan-selection' && (
        <PlanSelectionModal
          isOpen={true}
          onClose={handleClose}
          onSelectPlan={handlePlanSelect}
        />
      )}

      {/* Payment Method Selection Step */}
      {currentStep === 'payment-method' && selectedPlan && (
        <PaymentMethodModal
          isOpen={true}
          onClose={handleClose}
          onBack={handleBack}
          selectedPlan={selectedPlan}
          onPaymentMethodSelect={handlePaymentMethodSelect}
        />
      )}

      {/* Stripe Payment Step removed; we redirect immediately to Stripe Checkout */}

      {/* Crypto Payment Step */}
      {currentStep === 'crypto-payment' && selectedPlan && paymentData && (
        <CryptoPayment
          isOpen={true}
          onClose={handleClose}
          onBack={handleBack}
          paymentData={paymentData}
          onSuccess={handlePaymentSuccess}
          onError={handlePaymentError}
        />
      )}

      {/* Success Step */}
      {currentStep === 'success' && subscriptionResult && (
        <SuccessModal
          isOpen={true}
          onClose={handleClose}
          subscriptionData={subscriptionResult}
          selectedPlan={selectedPlan!}
        />
      )}

      {/* Error Modal */}
      {error && (
        <ErrorModal
          isOpen={true}
          error={error}
          onClose={() => setError('')}
          onRetry={() => {
            setError('')
            setCurrentStep('payment-method')
          }}
        />
      )}
    </>
  )
}

// Success Modal Component
function SuccessModal({ 
  isOpen, 
  onClose, 
  subscriptionData, 
  selectedPlan 
}: { 
  isOpen: boolean
  onClose: () => void
  subscriptionData: any
  selectedPlan: Plan
}) {
  if (!isOpen) return null

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
        border: '1px solid rgba(16, 185, 129, 0.3)',
        borderRadius: '24px',
        maxWidth: '500px',
        width: '100%',
        position: 'relative',
        textAlign: 'center',
        padding: '3rem 2rem 2rem 2rem'
      }}>
        {/* Success Animation */}
        <div style={{
          width: '80px',
          height: '80px',
          background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
          borderRadius: '50%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          margin: '0 auto 2rem auto',
          animation: 'successPulse 2s ease-in-out infinite'
        }}>
          <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3">
            <path d="M9 12l2 2 4-4"/>
            <circle cx="12" cy="12" r="9"/>
          </svg>
        </div>

        <h2 style={{
          fontSize: '2rem',
          fontWeight: 700,
          color: '#ffffff',
          margin: '0 0 1rem 0',
          background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent'
        }}>
          Welcome to {selectedPlan.name}!
        </h2>

        <p style={{
          color: '#94a3b8',
          fontSize: '1.1rem',
          margin: '0 0 2rem 0',
          lineHeight: 1.6
        }}>
          Your subscription has been activated successfully. You now have access to all {selectedPlan.name} features and can start using our advanced AI trading tools.
        </p>

        {/* Subscription Details */}
        <div style={{
          background: 'rgba(16, 185, 129, 0.1)',
          border: '1px solid rgba(16, 185, 129, 0.2)',
          borderRadius: '16px',
          padding: '1.5rem',
          marginBottom: '2rem'
        }}>
          <div style={{
            display: 'grid',
            gridTemplateColumns: '1fr 1fr',
            gap: '1rem',
            fontSize: '0.9rem'
          }}>
            <div>
              <p style={{
                color: '#6ee7b7',
                margin: '0 0 0.25rem 0',
                fontWeight: 600
              }}>
                Plan
              </p>
              <p style={{
                color: '#ffffff',
                margin: 0,
                fontWeight: 700
              }}>
                {selectedPlan.name}
              </p>
            </div>
            <div>
              <p style={{
                color: '#6ee7b7',
                margin: '0 0 0.25rem 0',
                fontWeight: 600
              }}>
                Billing
              </p>
              <p style={{
                color: '#ffffff',
                margin: 0,
                fontWeight: 700
              }}>
                ${selectedPlan.price}/{selectedPlan.billing_period === 'monthly' ? 'month' : 'year'}
              </p>
            </div>
            <div>
              <p style={{
                color: '#6ee7b7',
                margin: '0 0 0.25rem 0',
                fontWeight: 600
              }}>
                Status
              </p>
              <p style={{
                color: '#ffffff',
                margin: 0,
                fontWeight: 700
              }}>
                Active
              </p>
            </div>
            <div>
              <p style={{
                color: '#6ee7b7',
                margin: '0 0 0.25rem 0',
                fontWeight: 600
              }}>
                Subscription ID
              </p>
              <p style={{
                color: '#ffffff',
                margin: 0,
                fontWeight: 700,
                fontSize: '0.8rem',
                fontFamily: 'monospace'
              }}>
                {subscriptionData.subscription_id}
              </p>
            </div>
          </div>
        </div>

        {/* Next Steps */}
        <div style={{
          background: 'rgba(59, 130, 246, 0.1)',
          border: '1px solid rgba(59, 130, 246, 0.2)',
          borderRadius: '16px',
          padding: '1.5rem',
          marginBottom: '2rem',
          textAlign: 'left'
        }}>
          <h4 style={{
            color: '#60a5fa',
            fontSize: '1rem',
            fontWeight: 600,
            margin: '0 0 1rem 0'
          }}>
            What's Next?
          </h4>
          <ul style={{
            color: '#bfdbfe',
            fontSize: '0.9rem',
            margin: 0,
            paddingLeft: '1.25rem'
          }}>
            <li style={{ marginBottom: '0.5rem' }}>
              Access unlimited AI trading signals
            </li>
            <li style={{ marginBottom: '0.5rem' }}>
              Use advanced portfolio analytics
            </li>
            <li style={{ marginBottom: '0.5rem' }}>
              Get real-time market insights
            </li>
            <li>
              Explore professional trading tools
            </li>
          </ul>
        </div>

        <button
          onClick={onClose}
          style={{
            width: '100%',
            background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
            border: 'none',
            borderRadius: '12px',
            padding: '1rem',
            color: '#ffffff',
            fontSize: '1rem',
            fontWeight: 600,
            cursor: 'pointer',
            transition: 'all 0.2s ease'
          }}
          onMouseEnter={(e) => {
            const target = e.target as HTMLElement
            target.style.transform = 'translateY(-2px)'
            target.style.boxShadow = '0 8px 25px rgba(16, 185, 129, 0.4)'
          }}
          onMouseLeave={(e) => {
            const target = e.target as HTMLElement
            target.style.transform = 'translateY(0)'
            target.style.boxShadow = 'none'
          }}
        >
          Start Using {selectedPlan.name}
        </button>

        <style jsx>{`
          @keyframes successPulse {
            0%, 100% { 
              transform: scale(1);
              box-shadow: 0 0 0 0 rgba(16, 185, 129, 0.4);
            }
            50% { 
              transform: scale(1.05);
              box-shadow: 0 0 0 20px rgba(16, 185, 129, 0);
            }
          }
        `}</style>
      </div>
    </div>
  )
}

// Error Modal Component
function ErrorModal({ 
  isOpen, 
  error, 
  onClose, 
  onRetry 
}: { 
  isOpen: boolean
  error: string
  onClose: () => void
  onRetry: () => void
}) {
  if (!isOpen) return null

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
        border: '1px solid rgba(239, 68, 68, 0.3)',
        borderRadius: '24px',
        maxWidth: '400px',
        width: '100%',
        position: 'relative',
        textAlign: 'center',
        padding: '2rem'
      }}>
        {/* Error Icon */}
        <div style={{
          width: '60px',
          height: '60px',
          background: 'rgba(239, 68, 68, 0.1)',
          border: '2px solid rgba(239, 68, 68, 0.3)',
          borderRadius: '50%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          margin: '0 auto 1.5rem auto'
        }}>
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#ef4444" strokeWidth="2">
            <circle cx="12" cy="12" r="10"/>
            <path d="M15 9l-6 6M9 9l6 6"/>
          </svg>
        </div>

        <h3 style={{
          fontSize: '1.5rem',
          fontWeight: 700,
          color: '#ffffff',
          margin: '0 0 1rem 0'
        }}>
          Payment Failed
        </h3>

        <p style={{
          color: '#94a3b8',
          fontSize: '0.9rem',
          margin: '0 0 2rem 0',
          lineHeight: 1.6
        }}>
          {error}
        </p>

        <div style={{
          display: 'flex',
          gap: '1rem'
        }}>
          <button
            onClick={onClose}
            style={{
              flex: 1,
              background: 'rgba(255, 255, 255, 0.1)',
              border: '1px solid rgba(255, 255, 255, 0.2)',
              borderRadius: '12px',
              padding: '0.75rem',
              color: '#ffffff',
              fontSize: '0.9rem',
              fontWeight: 600,
              cursor: 'pointer'
            }}
          >
            Cancel
          </button>
          <button
            onClick={onRetry}
            style={{
              flex: 1,
              background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
              border: 'none',
              borderRadius: '12px',
              padding: '0.75rem',
              color: '#ffffff',
              fontSize: '0.9rem',
              fontWeight: 600,
              cursor: 'pointer'
            }}
          >
            Try Again
          </button>
        </div>
      </div>
    </div>
  )
}