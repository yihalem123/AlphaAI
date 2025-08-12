'use client'

import { useState } from 'react'

interface Plan {
  id: string
  name: string
  price: number
  currency: string
  billing_period: 'monthly' | 'yearly'
}

interface PaymentMethodModalProps {
  isOpen: boolean
  onClose: () => void
  onBack: () => void
  selectedPlan: Plan
  onPaymentMethodSelect: (method: 'stripe' | 'crypto', paymentData?: any) => void
}

export function PaymentMethodModal({ 
  isOpen, 
  onClose, 
  onBack, 
  selectedPlan, 
  onPaymentMethodSelect 
}: PaymentMethodModalProps) {
  const [selectedMethod, setSelectedMethod] = useState<'stripe' | 'crypto' | null>(null)
  const [isProcessing, setIsProcessing] = useState(false)
  const [cryptoType, setCryptoType] = useState<'bitcoin' | 'ethereum' | 'usdt'>('bitcoin')

  if (!isOpen) return null

  const handleStripePayment = async () => {
    setIsProcessing(true)
    try {
      // Redirect flow: immediately request Checkout Session and let parent handle redirect
      onPaymentMethodSelect('stripe', {
        plan_id: selectedPlan.id,
        billing_period: selectedPlan.billing_period
      })
    } catch (error) {
      console.error('Stripe payment error:', error)
    } finally {
      setIsProcessing(false)
    }
  }

  const handleCryptoPayment = async () => {
    setIsProcessing(true)
    try {
      // Initialize crypto payment
      const paymentData = {
        plan_id: selectedPlan.id,
        amount: selectedPlan.price,
        currency: selectedPlan.currency,
        billing_period: selectedPlan.billing_period,
        crypto_type: cryptoType
      }
      onPaymentMethodSelect('crypto', paymentData)
    } catch (error) {
      console.error('Crypto payment error:', error)
    } finally {
      setIsProcessing(false)
    }
  }

  const cryptoOptions = [
    {
      id: 'bitcoin',
      name: 'Bitcoin',
      symbol: 'BTC',
      icon: '₿',
      network: 'Bitcoin Network'
    },
    {
      id: 'ethereum',
      name: 'Ethereum',
      symbol: 'ETH',
      icon: 'Ξ',
      network: 'Ethereum Network'
    },
    {
      id: 'usdt',
      name: 'Tether',
      symbol: 'USDT',
      icon: '₮',
      network: 'ERC-20 / TRC-20'
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
        maxWidth: '600px',
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
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <button
              onClick={onBack}
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
                <path d="M19 12H5M12 19l-7-7 7-7"/>
              </svg>
            </button>

            <div>
              <h2 style={{
                fontSize: '1.8rem',
                fontWeight: 700,
                color: '#ffffff',
                margin: '0 0 0.25rem 0',
                background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent'
              }}>
                Payment Method
              </h2>
              <p style={{
                color: '#94a3b8',
                margin: 0,
                fontSize: '0.9rem'
              }}>
                {selectedPlan.name} Plan - ${selectedPlan.price}/{selectedPlan.billing_period === 'monthly' ? 'mo' : 'yr'}
              </p>
            </div>
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

        {/* Content */}
        <div style={{ padding: '2rem' }}>
          {/* Payment Methods */}
          <div style={{ marginBottom: '2rem' }}>
            <h3 style={{
              fontSize: '1.2rem',
              fontWeight: 600,
              color: '#ffffff',
              margin: '0 0 1.5rem 0'
            }}>
              Choose Payment Method
            </h3>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              {/* Stripe Option */}
              <div
                onClick={() => setSelectedMethod('stripe')}
                style={{
                  background: selectedMethod === 'stripe' 
                    ? 'linear-gradient(135deg, rgba(102, 126, 234, 0.15) 0%, rgba(118, 75, 162, 0.15) 100%)'
                    : 'linear-gradient(135deg, rgba(255, 255, 255, 0.08) 0%, rgba(255, 255, 255, 0.03) 100%)',
                  border: selectedMethod === 'stripe'
                    ? '2px solid rgba(102, 126, 234, 0.4)'
                    : '1px solid rgba(255, 255, 255, 0.1)',
                  borderRadius: '16px',
                  padding: '1.5rem',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease'
                }}
                onMouseEnter={(e) => {
                  if (selectedMethod !== 'stripe') {
                    e.target.style.borderColor = 'rgba(102, 126, 234, 0.3)'
                  }
                }}
                onMouseLeave={(e) => {
                  if (selectedMethod !== 'stripe') {
                    e.target.style.borderColor = 'rgba(255, 255, 255, 0.1)'
                  }
                }}
              >
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '1rem',
                  marginBottom: '0.75rem'
                }}>
                  <div style={{
                    width: '48px',
                    height: '48px',
                    background: 'linear-gradient(135deg, #635bff 0%, #4f46e5 100%)',
                    borderRadius: '12px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '1.5rem',
                    fontWeight: 700,
                    color: '#ffffff'
                  }}>
                    S
                  </div>
                  <div>
                    <h4 style={{
                      fontSize: '1.1rem',
                      fontWeight: 600,
                      color: '#ffffff',
                      margin: '0 0 0.25rem 0'
                    }}>
                      Credit Card (Stripe)
                    </h4>
                    <p style={{
                      color: '#94a3b8',
                      margin: 0,
                      fontSize: '0.85rem'
                    }}>
                      Visa, Mastercard, American Express
                    </p>
                  </div>
                </div>
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                  fontSize: '0.8rem',
                  color: '#10b981'
                }}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M9 12l2 2 4-4"/>
                    <circle cx="12" cy="12" r="9"/>
                  </svg>
                  Instant processing • Secure payments
                </div>
              </div>

              {/* Crypto Option */}
              <div
                onClick={() => setSelectedMethod('crypto')}
                style={{
                  background: selectedMethod === 'crypto' 
                    ? 'linear-gradient(135deg, rgba(102, 126, 234, 0.15) 0%, rgba(118, 75, 162, 0.15) 100%)'
                    : 'linear-gradient(135deg, rgba(255, 255, 255, 0.08) 0%, rgba(255, 255, 255, 0.03) 100%)',
                  border: selectedMethod === 'crypto'
                    ? '2px solid rgba(102, 126, 234, 0.4)'
                    : '1px solid rgba(255, 255, 255, 0.1)',
                  borderRadius: '16px',
                  padding: '1.5rem',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease'
                }}
                onMouseEnter={(e) => {
                  if (selectedMethod !== 'crypto') {
                    e.target.style.borderColor = 'rgba(102, 126, 234, 0.3)'
                  }
                }}
                onMouseLeave={(e) => {
                  if (selectedMethod !== 'crypto') {
                    e.target.style.borderColor = 'rgba(255, 255, 255, 0.1)'
                  }
                }}
              >
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '1rem',
                  marginBottom: '0.75rem'
                }}>
                  <div style={{
                    width: '48px',
                    height: '48px',
                    background: 'linear-gradient(135deg, #f7931a 0%, #ff9500 100%)',
                    borderRadius: '12px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '1.5rem',
                    color: '#ffffff'
                  }}>
                    ₿
                  </div>
                  <div>
                    <h4 style={{
                      fontSize: '1.1rem',
                      fontWeight: 600,
                      color: '#ffffff',
                      margin: '0 0 0.25rem 0'
                    }}>
                      Cryptocurrency
                    </h4>
                    <p style={{
                      color: '#94a3b8',
                      margin: 0,
                      fontSize: '0.85rem'
                    }}>
                      Bitcoin, Ethereum, USDT
                    </p>
                  </div>
                </div>
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                  fontSize: '0.8rem',
                  color: '#10b981'
                }}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M9 12l2 2 4-4"/>
                    <circle cx="12" cy="12" r="9"/>
                  </svg>
                  Decentralized • Anonymous • Low fees
                </div>
              </div>
            </div>
          </div>

          {/* Crypto Selection */}
          {selectedMethod === 'crypto' && (
            <div style={{ marginBottom: '2rem' }}>
              <h4 style={{
                fontSize: '1rem',
                fontWeight: 600,
                color: '#ffffff',
                margin: '0 0 1rem 0'
              }}>
                Select Cryptocurrency
              </h4>
              <div style={{ display: 'flex', gap: '0.75rem' }}>
                {cryptoOptions.map((option) => (
                  <button
                    key={option.id}
                    onClick={() => setCryptoType(option.id as any)}
                    style={{
                      background: cryptoType === option.id
                        ? 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)'
                        : 'rgba(255, 255, 255, 0.05)',
                      border: cryptoType === option.id
                        ? '1px solid rgba(102, 126, 234, 0.4)'
                        : '1px solid rgba(255, 255, 255, 0.1)',
                      borderRadius: '12px',
                      padding: '0.75rem 1rem',
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      gap: '0.25rem',
                      cursor: 'pointer',
                      transition: 'all 0.2s ease',
                      color: '#ffffff',
                      fontSize: '0.8rem',
                      minWidth: '80px'
                    }}
                  >
                    <div style={{ fontSize: '1.2rem' }}>{option.icon}</div>
                    <div style={{ fontWeight: 600 }}>{option.symbol}</div>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Action Buttons */}
          <div style={{ display: 'flex', gap: '1rem' }}>
            <button
              onClick={selectedMethod === 'stripe' ? handleStripePayment : handleCryptoPayment}
              disabled={!selectedMethod || isProcessing}
              style={{
                flex: 1,
                background: !selectedMethod || isProcessing
                  ? 'rgba(255, 255, 255, 0.1)'
                  : 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                border: 'none',
                borderRadius: '12px',
                padding: '1rem',
                color: '#ffffff',
                fontSize: '1rem',
                fontWeight: 600,
                cursor: !selectedMethod || isProcessing ? 'not-allowed' : 'pointer',
                transition: 'all 0.2s ease',
                opacity: !selectedMethod || isProcessing ? 0.6 : 1,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '0.5rem'
              }}
              onMouseEnter={(e) => {
                if (selectedMethod && !isProcessing) {
                  e.target.style.transform = 'translateY(-2px)'
                  e.target.style.boxShadow = '0 8px 25px rgba(102, 126, 234, 0.4)'
                }
              }}
              onMouseLeave={(e) => {
                if (selectedMethod && !isProcessing) {
                  e.target.style.transform = 'translateY(0)'
                  e.target.style.boxShadow = 'none'
                }
              }}
            >
              {isProcessing && (
                <div style={{
                  width: '16px',
                  height: '16px',
                  border: '2px solid rgba(255, 255, 255, 0.3)',
                  borderTopColor: '#ffffff',
                  borderRadius: '50%',
                  animation: 'spin 1s linear infinite'
                }} />
              )}
              {isProcessing ? 'Processing...' : `Pay with ${selectedMethod === 'stripe' ? 'Card' : 'Crypto'}`}
            </button>
          </div>

          {/* Security Note */}
          <div style={{
            marginTop: '1.5rem',
            padding: '1rem',
            background: 'rgba(16, 185, 129, 0.1)',
            border: '1px solid rgba(16, 185, 129, 0.2)',
            borderRadius: '12px',
            display: 'flex',
            alignItems: 'center',
            gap: '0.75rem'
          }}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#10b981" strokeWidth="2">
              <path d="M9 12l2 2 4-4"/>
              <path d="M21 12c-1 0-3-1-3-3s2-3 3-3 3 1 3 3-2 3-3 3"/>
              <path d="M3 12c1 0 3-1 3-3s-2-3-3-3-3 1-3 3 2 3 3 3"/>
              <path d="M13 12h1"/>
            </svg>
            <div>
              <p style={{
                color: '#10b981',
                margin: 0,
                fontSize: '0.85rem',
                fontWeight: 600
              }}>
                Secure Payment
              </p>
              <p style={{
                color: '#6ee7b7',
                margin: 0,
                fontSize: '0.75rem'
              }}>
                All payments are encrypted and processed securely. Cancel anytime.
              </p>
            </div>
          </div>
        </div>

        <style jsx>{`
          @keyframes spin {
            to { transform: rotate(360deg); }
          }
        `}</style>
      </div>
    </div>
  )
}