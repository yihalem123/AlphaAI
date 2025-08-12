'use client'

import { useState, useEffect } from 'react'

interface StripePaymentProps {
  isOpen: boolean
  onClose: () => void
  onBack: () => void
  paymentData: {
    plan_id: string
    amount: number
    currency: string
    billing_period: string
  }
  onSuccess: (subscriptionData: any) => void
  onError: (error: string) => void
}

export function StripePayment({ 
  isOpen, 
  onClose, 
  onBack, 
  paymentData, 
  onSuccess, 
  onError 
}: StripePaymentProps) {
  const [isProcessing, setIsProcessing] = useState(false)
  const [cardData, setCardData] = useState({
    cardNumber: '',
    expiryDate: '',
    cvv: '',
    cardholderName: '',
    email: '',
    address: {
      line1: '',
      city: '',
      state: '',
      postal_code: '',
      country: 'US'
    }
  })
  const [errors, setErrors] = useState<Record<string, string>>({})

  if (!isOpen) return null

  const formatCardNumber = (value: string) => {
    const v = value.replace(/\s+/g, '').replace(/[^0-9]/gi, '')
    const matches = v.match(/\d{4,16}/g)
    const match = matches && matches[0] || ''
    const parts = []
    for (let i = 0, len = match.length; i < len; i += 4) {
      parts.push(match.substring(i, i + 4))
    }
    if (parts.length) {
      return parts.join(' ')
    } else {
      return v
    }
  }

  const formatExpiryDate = (value: string) => {
    const v = value.replace(/\s+/g, '').replace(/[^0-9]/gi, '')
    if (v.length >= 2) {
      return v.substring(0, 2) + '/' + v.substring(2, 4)
    }
    return v
  }

  const validateForm = () => {
    const newErrors: Record<string, string> = {}

    if (!cardData.cardholderName.trim()) {
      newErrors.cardholderName = 'Cardholder name is required'
    }

    if (!cardData.email.trim()) {
      newErrors.email = 'Email is required'
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cardData.email)) {
      newErrors.email = 'Invalid email format'
    }

    if (!cardData.cardNumber.replace(/\s/g, '')) {
      newErrors.cardNumber = 'Card number is required'
    } else if (cardData.cardNumber.replace(/\s/g, '').length < 13) {
      newErrors.cardNumber = 'Invalid card number'
    }

    if (!cardData.expiryDate) {
      newErrors.expiryDate = 'Expiry date is required'
    } else if (!/^\d{2}\/\d{2}$/.test(cardData.expiryDate)) {
      newErrors.expiryDate = 'Invalid expiry date (MM/YY)'
    }

    if (!cardData.cvv) {
      newErrors.cvv = 'CVV is required'
    } else if (cardData.cvv.length < 3) {
      newErrors.cvv = 'Invalid CVV'
    }

    if (!cardData.address.line1.trim()) {
      newErrors.address_line1 = 'Address is required'
    }

    if (!cardData.address.city.trim()) {
      newErrors.address_city = 'City is required'
    }

    if (!cardData.address.postal_code.trim()) {
      newErrors.address_postal_code = 'Postal code is required'
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!validateForm()) {
      return
    }

    setIsProcessing(true)

    try {
      // Prepare payment data for backend
      const paymentRequestData = {
        plan_id: paymentData.plan_id,
        amount: paymentData.amount,
        currency: paymentData.currency,
        billing_period: paymentData.billing_period,
        payment_method: 'stripe',
        card: {
          number: cardData.cardNumber.replace(/\s/g, ''),
          exp_month: parseInt(cardData.expiryDate.split('/')[0]),
          exp_year: parseInt('20' + cardData.expiryDate.split('/')[1]),
          cvc: cardData.cvv,
          name: cardData.cardholderName
        },
        billing_details: {
          email: cardData.email,
          address: cardData.address
        }
      }

      // Call backend API using API service
      const { apiService } = await import('@/lib/api-service')
      const response = await apiService.upgradeSubscription(paymentRequestData)

      if (response.data) {
        const result = response.data
        
        // Handle different response scenarios
        if (result.requires_action) {
          // 3D Secure or similar authentication required
          window.location.href = result.payment_url
        } else if (result.success) {
          // Payment successful
          onSuccess({
            subscription_id: result.subscription_id,
            status: result.status,
            plan: paymentData.plan_id
          })
        } else {
          throw new Error('Payment failed')
        }
      } else {
        throw new Error(response.error || 'Payment processing failed')
      }

    } catch (error: any) {
      console.error('Payment error:', error)
      onError(error.message || 'Payment failed. Please try again.')
    } finally {
      setIsProcessing(false)
    }
  }

  const updateCardData = (field: string, value: string) => {
    setCardData(prev => ({
      ...prev,
      [field]: value
    }))
    
    // Clear error when user starts typing
    if (errors[field]) {
      setErrors(prev => ({
        ...prev,
        [field]: ''
      }))
    }
  }

  const updateAddressData = (field: string, value: string) => {
    setCardData(prev => ({
      ...prev,
      address: {
        ...prev.address,
        [field]: value
      }
    }))
    
    // Clear error when user starts typing
    const errorKey = `address_${field}`
    if (errors[errorKey]) {
      setErrors(prev => ({
        ...prev,
        [errorKey]: ''
      }))
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
                Payment Details
              </h2>
              <p style={{
                color: '#94a3b8',
                margin: 0,
                fontSize: '0.9rem'
              }}>
                ${paymentData.amount}/{paymentData.billing_period === 'monthly' ? 'mo' : 'yr'}
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
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M18 6L6 18M6 6l12 12"/>
            </svg>
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} style={{ padding: '2rem' }}>
          {/* Personal Information */}
          <div style={{ marginBottom: '2rem' }}>
            <h3 style={{
              fontSize: '1.1rem',
              fontWeight: 600,
              color: '#ffffff',
              margin: '0 0 1rem 0'
            }}>
              Personal Information
            </h3>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
              <div>
                <label style={{
                  display: 'block',
                  fontSize: '0.9rem',
                  fontWeight: 500,
                  color: '#e2e8f0',
                  marginBottom: '0.5rem'
                }}>
                  Cardholder Name
                </label>
                <input
                  type="text"
                  value={cardData.cardholderName}
                  onChange={(e) => updateCardData('cardholderName', e.target.value)}
                  placeholder="John Doe"
                  style={{
                    width: '100%',
                    background: 'rgba(255, 255, 255, 0.05)',
                    border: errors.cardholderName ? '1px solid #ef4444' : '1px solid rgba(255, 255, 255, 0.1)',
                    borderRadius: '12px',
                    padding: '0.75rem 1rem',
                    color: '#ffffff',
                    fontSize: '0.9rem',
                    boxSizing: 'border-box'
                  }}
                />
                {errors.cardholderName && (
                  <p style={{ color: '#ef4444', fontSize: '0.8rem', margin: '0.25rem 0 0 0' }}>
                    {errors.cardholderName}
                  </p>
                )}
              </div>

              <div>
                <label style={{
                  display: 'block',
                  fontSize: '0.9rem',
                  fontWeight: 500,
                  color: '#e2e8f0',
                  marginBottom: '0.5rem'
                }}>
                  Email
                </label>
                <input
                  type="email"
                  value={cardData.email}
                  onChange={(e) => updateCardData('email', e.target.value)}
                  placeholder="john@example.com"
                  style={{
                    width: '100%',
                    background: 'rgba(255, 255, 255, 0.05)',
                    border: errors.email ? '1px solid #ef4444' : '1px solid rgba(255, 255, 255, 0.1)',
                    borderRadius: '12px',
                    padding: '0.75rem 1rem',
                    color: '#ffffff',
                    fontSize: '0.9rem',
                    boxSizing: 'border-box'
                  }}
                />
                {errors.email && (
                  <p style={{ color: '#ef4444', fontSize: '0.8rem', margin: '0.25rem 0 0 0' }}>
                    {errors.email}
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* Card Information */}
          <div style={{ marginBottom: '2rem' }}>
            <h3 style={{
              fontSize: '1.1rem',
              fontWeight: 600,
              color: '#ffffff',
              margin: '0 0 1rem 0'
            }}>
              Card Information
            </h3>

            <div style={{ marginBottom: '1rem' }}>
              <label style={{
                display: 'block',
                fontSize: '0.9rem',
                fontWeight: 500,
                color: '#e2e8f0',
                marginBottom: '0.5rem'
              }}>
                Card Number
              </label>
              <input
                type="text"
                value={cardData.cardNumber}
                onChange={(e) => updateCardData('cardNumber', formatCardNumber(e.target.value))}
                placeholder="1234 5678 9012 3456"
                maxLength={19}
                style={{
                  width: '100%',
                  background: 'rgba(255, 255, 255, 0.05)',
                  border: errors.cardNumber ? '1px solid #ef4444' : '1px solid rgba(255, 255, 255, 0.1)',
                  borderRadius: '12px',
                  padding: '0.75rem 1rem',
                  color: '#ffffff',
                  fontSize: '0.9rem',
                  boxSizing: 'border-box'
                }}
              />
              {errors.cardNumber && (
                <p style={{ color: '#ef4444', fontSize: '0.8rem', margin: '0.25rem 0 0 0' }}>
                  {errors.cardNumber}
                </p>
              )}
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
              <div>
                <label style={{
                  display: 'block',
                  fontSize: '0.9rem',
                  fontWeight: 500,
                  color: '#e2e8f0',
                  marginBottom: '0.5rem'
                }}>
                  Expiry Date
                </label>
                <input
                  type="text"
                  value={cardData.expiryDate}
                  onChange={(e) => updateCardData('expiryDate', formatExpiryDate(e.target.value))}
                  placeholder="MM/YY"
                  maxLength={5}
                  style={{
                    width: '100%',
                    background: 'rgba(255, 255, 255, 0.05)',
                    border: errors.expiryDate ? '1px solid #ef4444' : '1px solid rgba(255, 255, 255, 0.1)',
                    borderRadius: '12px',
                    padding: '0.75rem 1rem',
                    color: '#ffffff',
                    fontSize: '0.9rem',
                    boxSizing: 'border-box'
                  }}
                />
                {errors.expiryDate && (
                  <p style={{ color: '#ef4444', fontSize: '0.8rem', margin: '0.25rem 0 0 0' }}>
                    {errors.expiryDate}
                  </p>
                )}
              </div>

              <div>
                <label style={{
                  display: 'block',
                  fontSize: '0.9rem',
                  fontWeight: 500,
                  color: '#e2e8f0',
                  marginBottom: '0.5rem'
                }}>
                  CVV
                </label>
                <input
                  type="text"
                  value={cardData.cvv}
                  onChange={(e) => updateCardData('cvv', e.target.value.replace(/\D/g, '').substring(0, 4))}
                  placeholder="123"
                  maxLength={4}
                  style={{
                    width: '100%',
                    background: 'rgba(255, 255, 255, 0.05)',
                    border: errors.cvv ? '1px solid #ef4444' : '1px solid rgba(255, 255, 255, 0.1)',
                    borderRadius: '12px',
                    padding: '0.75rem 1rem',
                    color: '#ffffff',
                    fontSize: '0.9rem',
                    boxSizing: 'border-box'
                  }}
                />
                {errors.cvv && (
                  <p style={{ color: '#ef4444', fontSize: '0.8rem', margin: '0.25rem 0 0 0' }}>
                    {errors.cvv}
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* Billing Address */}
          <div style={{ marginBottom: '2rem' }}>
            <h3 style={{
              fontSize: '1.1rem',
              fontWeight: 600,
              color: '#ffffff',
              margin: '0 0 1rem 0'
            }}>
              Billing Address
            </h3>

            <div style={{ marginBottom: '1rem' }}>
              <label style={{
                display: 'block',
                fontSize: '0.9rem',
                fontWeight: 500,
                color: '#e2e8f0',
                marginBottom: '0.5rem'
              }}>
                Address Line 1
              </label>
              <input
                type="text"
                value={cardData.address.line1}
                onChange={(e) => updateAddressData('line1', e.target.value)}
                placeholder="123 Main Street"
                style={{
                  width: '100%',
                  background: 'rgba(255, 255, 255, 0.05)',
                  border: errors.address_line1 ? '1px solid #ef4444' : '1px solid rgba(255, 255, 255, 0.1)',
                  borderRadius: '12px',
                  padding: '0.75rem 1rem',
                  color: '#ffffff',
                  fontSize: '0.9rem',
                  boxSizing: 'border-box'
                }}
              />
              {errors.address_line1 && (
                <p style={{ color: '#ef4444', fontSize: '0.8rem', margin: '0.25rem 0 0 0' }}>
                  {errors.address_line1}
                </p>
              )}
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '1rem' }}>
              <div>
                <label style={{
                  display: 'block',
                  fontSize: '0.9rem',
                  fontWeight: 500,
                  color: '#e2e8f0',
                  marginBottom: '0.5rem'
                }}>
                  City
                </label>
                <input
                  type="text"
                  value={cardData.address.city}
                  onChange={(e) => updateAddressData('city', e.target.value)}
                  placeholder="New York"
                  style={{
                    width: '100%',
                    background: 'rgba(255, 255, 255, 0.05)',
                    border: errors.address_city ? '1px solid #ef4444' : '1px solid rgba(255, 255, 255, 0.1)',
                    borderRadius: '12px',
                    padding: '0.75rem 1rem',
                    color: '#ffffff',
                    fontSize: '0.9rem',
                    boxSizing: 'border-box'
                  }}
                />
                {errors.address_city && (
                  <p style={{ color: '#ef4444', fontSize: '0.8rem', margin: '0.25rem 0 0 0' }}>
                    {errors.address_city}
                  </p>
                )}
              </div>

              <div>
                <label style={{
                  display: 'block',
                  fontSize: '0.9rem',
                  fontWeight: 500,
                  color: '#e2e8f0',
                  marginBottom: '0.5rem'
                }}>
                  State
                </label>
                <input
                  type="text"
                  value={cardData.address.state}
                  onChange={(e) => updateAddressData('state', e.target.value)}
                  placeholder="NY"
                  style={{
                    width: '100%',
                    background: 'rgba(255, 255, 255, 0.05)',
                    border: '1px solid rgba(255, 255, 255, 0.1)',
                    borderRadius: '12px',
                    padding: '0.75rem 1rem',
                    color: '#ffffff',
                    fontSize: '0.9rem',
                    boxSizing: 'border-box'
                  }}
                />
              </div>

              <div>
                <label style={{
                  display: 'block',
                  fontSize: '0.9rem',
                  fontWeight: 500,
                  color: '#e2e8f0',
                  marginBottom: '0.5rem'
                }}>
                  Postal Code
                </label>
                <input
                  type="text"
                  value={cardData.address.postal_code}
                  onChange={(e) => updateAddressData('postal_code', e.target.value)}
                  placeholder="10001"
                  style={{
                    width: '100%',
                    background: 'rgba(255, 255, 255, 0.05)',
                    border: errors.address_postal_code ? '1px solid #ef4444' : '1px solid rgba(255, 255, 255, 0.1)',
                    borderRadius: '12px',
                    padding: '0.75rem 1rem',
                    color: '#ffffff',
                    fontSize: '0.9rem',
                    boxSizing: 'border-box'
                  }}
                />
                {errors.address_postal_code && (
                  <p style={{ color: '#ef4444', fontSize: '0.8rem', margin: '0.25rem 0 0 0' }}>
                    {errors.address_postal_code}
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={isProcessing}
            style={{
              width: '100%',
              background: isProcessing
                ? 'rgba(255, 255, 255, 0.1)'
                : 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
              border: 'none',
              borderRadius: '12px',
              padding: '1rem',
              color: '#ffffff',
              fontSize: '1rem',
              fontWeight: 600,
              cursor: isProcessing ? 'not-allowed' : 'pointer',
              transition: 'all 0.2s ease',
              opacity: isProcessing ? 0.6 : 1,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '0.5rem'
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
            {isProcessing ? 'Processing Payment...' : `Pay $${paymentData.amount}`}
          </button>

          {/* Security Notice */}
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
              <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
              <circle cx="12" cy="16" r="1"/>
              <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
            </svg>
            <div>
              <p style={{
                color: '#10b981',
                margin: 0,
                fontSize: '0.8rem'
              }}>
                Your payment information is encrypted and secure. Powered by Stripe.
              </p>
            </div>
          </div>
        </form>

        <style jsx>{`
          @keyframes spin {
            to { transform: rotate(360deg); }
          }
        `}</style>
      </div>
    </div>
  )
}