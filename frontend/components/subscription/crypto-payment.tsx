'use client'

import { useState, useEffect } from 'react'

interface CryptoPaymentProps {
  isOpen: boolean
  onClose: () => void
  onBack: () => void
  paymentData: {
    plan_id: string
    amount: number
    currency: string
    billing_period: string
    crypto_type: 'bitcoin' | 'ethereum' | 'usdt'
  }
  onSuccess: (subscriptionData: any) => void
  onError: (error: string) => void
}

export function CryptoPayment({ 
  isOpen, 
  onClose, 
  onBack, 
  paymentData, 
  onSuccess, 
  onError 
}: CryptoPaymentProps) {
  const [isProcessing, setIsProcessing] = useState(false)
  const [paymentInfo, setPaymentInfo] = useState<{
    wallet_address: string
    amount_crypto: number
    crypto_symbol: string
    qr_code?: string
    payment_id: string
    expires_at: string
  } | null>(null)
  const [timeRemaining, setTimeRemaining] = useState<number>(0)
  const [paymentStatus, setPaymentStatus] = useState<'pending' | 'confirming' | 'completed' | 'expired'>('pending')

  const cryptoDetails = {
    bitcoin: {
      name: 'Bitcoin',
      symbol: 'BTC',
      icon: '₿',
      color: '#f7931a',
      network: 'Bitcoin Network',
      confirmations: 3
    },
    ethereum: {
      name: 'Ethereum',
      symbol: 'ETH',
      icon: 'Ξ',
      color: '#627eea',
      network: 'Ethereum Network',
      confirmations: 12
    },
    usdt: {
      name: 'Tether',
      symbol: 'USDT',
      icon: '₮',
      color: '#26a17b',
      network: 'ERC-20',
      confirmations: 12
    }
  }

  const currentCrypto = cryptoDetails[paymentData.crypto_type]

  useEffect(() => {
    if (isOpen && !paymentInfo) {
      initiateCryptoPayment()
    }
  }, [isOpen])

  useEffect(() => {
    let interval: NodeJS.Timeout | null = null

    if (paymentInfo && timeRemaining > 0) {
      interval = setInterval(() => {
        setTimeRemaining(prev => {
          if (prev <= 1) {
            setPaymentStatus('expired')
            return 0
          }
          return prev - 1
        })
      }, 1000)
    }

    return () => {
      if (interval) clearInterval(interval)
    }
  }, [paymentInfo, timeRemaining])

  useEffect(() => {
    let statusInterval: NodeJS.Timeout | null = null

    if (paymentInfo && paymentStatus === 'pending') {
      // Check payment status every 10 seconds
      statusInterval = setInterval(() => {
        checkPaymentStatus()
      }, 10000)
    }

    return () => {
      if (statusInterval) clearInterval(statusInterval)
    }
  }, [paymentInfo, paymentStatus])

  const initiateCryptoPayment = async () => {
    setIsProcessing(true)

    try {
      const { apiService } = await import('@/lib/api-service')
      const response = await apiService.createCryptoPayment({
        plan_id: paymentData.plan_id,
        amount: paymentData.amount,
        currency: paymentData.currency,
        billing_period: paymentData.billing_period,
        crypto_type: paymentData.crypto_type
      })

      if (response.data) {
        const result = response.data
        setPaymentInfo(result)
        
        // Calculate time remaining (30 minutes from creation)
        const expiresAt = new Date(result.expires_at).getTime()
        const now = new Date().getTime()
        const remaining = Math.max(0, Math.floor((expiresAt - now) / 1000))
        setTimeRemaining(remaining)
      } else {
        throw new Error(response.error || 'Failed to create crypto payment')
      }
    } catch (error: any) {
      console.error('Crypto payment error:', error)
      onError(error.message || 'Failed to initialize crypto payment')
    } finally {
      setIsProcessing(false)
    }
  }

  const checkPaymentStatus = async () => {
    if (!paymentInfo) return

    try {
      const { apiService } = await import('@/lib/api-service')
      const response = await apiService.checkCryptoPaymentStatus(paymentInfo.payment_id)

      if (response.data) {
        const result = response.data
        
        if (result.status === 'completed') {
          setPaymentStatus('completed')
          onSuccess({
            subscription_id: result.subscription_id,
            status: 'active',
            plan: paymentData.plan_id,
            payment_method: 'crypto',
            crypto_type: paymentData.crypto_type
          })
        } else if (result.status === 'confirming') {
          setPaymentStatus('confirming')
        }
      }
    } catch (error) {
      console.error('Error checking payment status:', error)
    }
  }

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text).then(() => {
      // Could add a toast notification here
      console.log('Copied to clipboard')
    })
  }

  const formatTime = (seconds: number) => {
    const minutes = Math.floor(seconds / 60)
    const remainingSeconds = seconds % 60
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`
  }

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
                Crypto Payment
              </h2>
              <p style={{
                color: '#94a3b8',
                margin: 0,
                fontSize: '0.9rem'
              }}>
                Pay with {currentCrypto.name} ({currentCrypto.symbol})
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

        {/* Content */}
        <div style={{ padding: '2rem' }}>
          {isProcessing ? (
            <div style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: '1rem',
              padding: '3rem 0'
            }}>
              <div style={{
                width: '48px',
                height: '48px',
                border: '4px solid rgba(102, 126, 234, 0.2)',
                borderTopColor: '#667eea',
                borderRadius: '50%',
                animation: 'spin 1s linear infinite'
              }} />
              <p style={{ color: '#ffffff', fontSize: '1rem' }}>
                Generating payment address...
              </p>
            </div>
          ) : paymentInfo ? (
            <>
              {/* Payment Status */}
              <div style={{
                background: paymentStatus === 'completed' 
                  ? 'rgba(16, 185, 129, 0.1)'
                  : paymentStatus === 'confirming'
                    ? 'rgba(245, 158, 11, 0.1)'
                    : paymentStatus === 'expired'
                      ? 'rgba(239, 68, 68, 0.1)'
                      : 'rgba(59, 130, 246, 0.1)',
                border: `1px solid ${
                  paymentStatus === 'completed' 
                    ? 'rgba(16, 185, 129, 0.2)'
                    : paymentStatus === 'confirming'
                      ? 'rgba(245, 158, 11, 0.2)'
                      : paymentStatus === 'expired'
                        ? 'rgba(239, 68, 68, 0.2)'
                        : 'rgba(59, 130, 246, 0.2)'
                }`,
                borderRadius: '12px',
                padding: '1rem',
                marginBottom: '1.5rem',
                display: 'flex',
                alignItems: 'center',
                gap: '0.75rem'
              }}>
                <div style={{
                  width: '20px',
                  height: '20px',
                  borderRadius: '50%',
                  background: paymentStatus === 'completed' 
                    ? '#10b981'
                    : paymentStatus === 'confirming'
                      ? '#f59e0b'
                      : paymentStatus === 'expired'
                        ? '#ef4444'
                        : '#3b82f6',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}>
                  {paymentStatus === 'completed' ? (
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3">
                      <path d="M9 12l2 2 4-4"/>
                    </svg>
                  ) : paymentStatus === 'expired' ? (
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3">
                      <path d="M18 6L6 18M6 6l12 12"/>
                    </svg>
                  ) : (
                    <div style={{
                      width: '8px',
                      height: '8px',
                      background: 'white',
                      borderRadius: '50%',
                      animation: paymentStatus === 'confirming' ? 'pulse 2s infinite' : 'none'
                    }} />
                  )}
                </div>
                <div>
                  <p style={{
                    color: paymentStatus === 'completed' 
                      ? '#10b981'
                      : paymentStatus === 'confirming'
                        ? '#f59e0b'
                        : paymentStatus === 'expired'
                          ? '#ef4444'
                          : '#3b82f6',
                    margin: 0,
                    fontSize: '0.9rem',
                    fontWeight: 600
                  }}>
                    {paymentStatus === 'completed' && 'Payment Completed!'}
                    {paymentStatus === 'confirming' && 'Payment Confirming...'}
                    {paymentStatus === 'expired' && 'Payment Expired'}
                    {paymentStatus === 'pending' && 'Waiting for Payment'}
                  </p>
                  <p style={{
                    color: '#94a3b8',
                    margin: 0,
                    fontSize: '0.8rem'
                  }}>
                    {paymentStatus === 'completed' && 'Your subscription has been activated'}
                    {paymentStatus === 'confirming' && `Awaiting ${currentCrypto.confirmations} confirmations`}
                    {paymentStatus === 'expired' && 'Please generate a new payment address'}
                    {paymentStatus === 'pending' && `Send exactly ${paymentInfo.amount_crypto} ${currentCrypto.symbol}`}
                  </p>
                </div>
              </div>

              {/* Timer */}
              {paymentStatus === 'pending' && timeRemaining > 0 && (
                <div style={{
                  textAlign: 'center',
                  marginBottom: '1.5rem'
                }}>
                  <p style={{
                    color: '#ffffff',
                    fontSize: '1.2rem',
                    fontWeight: 600,
                    margin: '0 0 0.25rem 0'
                  }}>
                    Time Remaining: {formatTime(timeRemaining)}
                  </p>
                  <p style={{
                    color: '#94a3b8',
                    fontSize: '0.8rem',
                    margin: 0
                  }}>
                    Payment will expire after this time
                  </p>
                </div>
              )}

              {/* Payment Amount */}
              <div style={{
                background: 'rgba(255, 255, 255, 0.05)',
                border: '1px solid rgba(255, 255, 255, 0.1)',
                borderRadius: '16px',
                padding: '1.5rem',
                marginBottom: '1.5rem',
                textAlign: 'center'
              }}>
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '0.5rem',
                  marginBottom: '0.5rem'
                }}>
                  <div style={{
                    fontSize: '2rem',
                    color: currentCrypto.color
                  }}>
                    {currentCrypto.icon}
                  </div>
                  <div>
                    <p style={{
                      color: '#ffffff',
                      fontSize: '2rem',
                      fontWeight: 700,
                      margin: 0
                    }}>
                      {paymentInfo.amount_crypto}
                    </p>
                    <p style={{
                      color: '#94a3b8',
                      fontSize: '0.9rem',
                      margin: 0
                    }}>
                      {currentCrypto.symbol}
                    </p>
                  </div>
                </div>
                <p style={{
                  color: '#94a3b8',
                  fontSize: '0.8rem',
                  margin: 0
                }}>
                  ≈ ${paymentData.amount} USD
                </p>
              </div>

              {/* Wallet Address */}
              <div style={{
                background: 'rgba(255, 255, 255, 0.05)',
                border: '1px solid rgba(255, 255, 255, 0.1)',
                borderRadius: '16px',
                padding: '1.5rem',
                marginBottom: '1.5rem'
              }}>
                <h4 style={{
                  color: '#ffffff',
                  fontSize: '1rem',
                  fontWeight: 600,
                  margin: '0 0 1rem 0'
                }}>
                  Send {currentCrypto.symbol} to this address:
                </h4>

                <div style={{
                  background: 'rgba(0, 0, 0, 0.3)',
                  border: '1px solid rgba(255, 255, 255, 0.1)',
                  borderRadius: '12px',
                  padding: '1rem',
                  marginBottom: '1rem'
                }}>
                  <p style={{
                    color: '#ffffff',
                    fontSize: '0.9rem',
                    fontFamily: 'monospace',
                    wordBreak: 'break-all',
                    margin: '0 0 0.75rem 0'
                  }}>
                    {paymentInfo.wallet_address}
                  </p>
                  <button
                    onClick={() => copyToClipboard(paymentInfo.wallet_address)}
                    style={{
                      background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                      border: 'none',
                      borderRadius: '8px',
                      padding: '0.5rem 1rem',
                      color: '#ffffff',
                      fontSize: '0.8rem',
                      fontWeight: 600,
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.5rem'
                    }}
                  >
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <rect x="9" y="9" width="13" height="13" rx="2" ry="2"/>
                      <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/>
                    </svg>
                    Copy Address
                  </button>
                </div>

                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                  fontSize: '0.8rem',
                  color: '#94a3b8'
                }}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <circle cx="12" cy="12" r="10"/>
                    <path d="M12 6v6l4 2"/>
                  </svg>
                  Network: {currentCrypto.network}
                </div>
              </div>

              {/* QR Code (if available) */}
              {paymentInfo.qr_code && (
                <div style={{
                  background: 'rgba(255, 255, 255, 0.05)',
                  border: '1px solid rgba(255, 255, 255, 0.1)',
                  borderRadius: '16px',
                  padding: '1.5rem',
                  textAlign: 'center',
                  marginBottom: '1.5rem'
                }}>
                  <h4 style={{
                    color: '#ffffff',
                    fontSize: '1rem',
                    fontWeight: 600,
                    margin: '0 0 1rem 0'
                  }}>
                    Scan QR Code
                  </h4>
                  <img 
                    src={paymentInfo.qr_code} 
                    alt="Payment QR Code"
                    style={{
                      maxWidth: '200px',
                      width: '100%',
                      height: 'auto',
                      borderRadius: '8px'
                    }}
                  />
                </div>
              )}

              {/* Important Notes */}
              <div style={{
                background: 'rgba(245, 158, 11, 0.1)',
                border: '1px solid rgba(245, 158, 11, 0.2)',
                borderRadius: '12px',
                padding: '1rem'
              }}>
                <div style={{
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: '0.75rem'
                }}>
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#f59e0b" strokeWidth="2">
                    <path d="M12 9v4M12 17h.01M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z"/>
                  </svg>
                  <div>
                    <p style={{
                      color: '#f59e0b',
                      margin: '0 0 0.5rem 0',
                      fontSize: '0.9rem',
                      fontWeight: 600
                    }}>
                      Important Instructions:
                    </p>
                    <ul style={{
                      color: '#fbbf24',
                      fontSize: '0.8rem',
                      margin: 0,
                      paddingLeft: '1rem'
                    }}>
                      <li>Send exactly {paymentInfo.amount_crypto} {currentCrypto.symbol}</li>
                      <li>Use only the {currentCrypto.network}</li>
                      <li>Payment expires in {formatTime(timeRemaining)}</li>
                      <li>Confirmations required: {currentCrypto.confirmations}</li>
                      <li>Do not send from exchange accounts</li>
                    </ul>
                  </div>
                </div>
              </div>

              {/* Refresh Button */}
              {paymentStatus === 'pending' && (
                <div style={{ textAlign: 'center', marginTop: '1.5rem' }}>
                  <button
                    onClick={checkPaymentStatus}
                    style={{
                      background: 'rgba(255, 255, 255, 0.1)',
                      border: '1px solid rgba(255, 255, 255, 0.2)',
                      borderRadius: '12px',
                      padding: '0.75rem 1.5rem',
                      color: '#ffffff',
                      fontSize: '0.9rem',
                      fontWeight: 600,
                      cursor: 'pointer',
                      transition: 'all 0.2s ease',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.5rem',
                      margin: '0 auto'
                    }}
                  >
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8"/>
                      <path d="M21 3v5h-5"/>
                      <path d="M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16"/>
                      <path d="M3 21v-5h5"/>
                    </svg>
                    Check Payment Status
                  </button>
                </div>
              )}
            </>
          ) : (
            <div style={{
              textAlign: 'center',
              padding: '3rem 0'
            }}>
              <p style={{ color: '#ef4444', fontSize: '1rem' }}>
                Failed to generate payment address. Please try again.
              </p>
              <button
                onClick={initiateCryptoPayment}
                style={{
                  background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                  border: 'none',
                  borderRadius: '12px',
                  padding: '0.75rem 1.5rem',
                  color: '#ffffff',
                  fontSize: '0.9rem',
                  fontWeight: 600,
                  cursor: 'pointer',
                  marginTop: '1rem'
                }}
              >
                Try Again
              </button>
            </div>
          )}
        </div>

        <style jsx>{`
          @keyframes spin {
            to { transform: rotate(360deg); }
          }
          
          @keyframes pulse {
            0%, 100% { opacity: 1; }
            50% { opacity: 0.5; }
          }
        `}</style>
      </div>
    </div>
  )
}