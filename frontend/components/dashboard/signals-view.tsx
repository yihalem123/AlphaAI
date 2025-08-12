'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '@/hooks/use-auth'
import { authService } from '@/lib/auth-service-complete'

interface Signal {
  id: number
  symbol: string
  signal_type: string
  confidence: number
  price: number
  target_price?: number
  stop_loss?: number
  reasoning: string
  created_at: string
  is_active: boolean
}

// Custom SVG Icons
const TrendingUpIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <polyline points="23 6 13.5 15.5 8.5 10.5 1 18"/>
    <polyline points="17 6 23 6 23 12"/>
  </svg>
)

const TrendingDownIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <polyline points="23 18 13.5 8.5 8.5 13.5 1 6"/>
    <polyline points="17 18 23 18 23 12"/>
  </svg>
)

const TargetIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <circle cx="12" cy="12" r="10"/>
    <circle cx="12" cy="12" r="6"/>
    <circle cx="12" cy="12" r="2"/>
  </svg>
)

const ShieldIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
  </svg>
)

const PlusIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <line x1="12" y1="5" x2="12" y2="19"/>
    <line x1="5" y1="12" x2="19" y2="12"/>
  </svg>
)

const ZapIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <polygon points="13,2 3,14 12,14 11,22 21,10 12,10 13,2"/>
  </svg>
)

const BrainIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M9.5 2A2.5 2.5 0 0 1 12 4.5v15a2.5 2.5 0 0 1-4.96.44 2.5 2.5 0 0 1-2.96-3.08 3 3 0 0 1-.34-5.58 2.5 2.5 0 0 1 1.32-4.24 2.5 2.5 0 0 1 1.98-3A2.5 2.5 0 0 1 9.5 2Z"/>
    <path d="M14.5 2A2.5 2.5 0 0 0 12 4.5v15a2.5 2.5 0 0 0 4.96.44 2.5 2.5 0 0 0 2.96-3.08 3 3 0 0 0 .34-5.58 2.5 2.5 0 0 0-1.32-4.24 2.5 2.5 0 0 0-1.98-3A2.5 2.5 0 0 0 14.5 2Z"/>
  </svg>
)

export function SignalsView() {
  const { user, isLoading: authLoading } = useAuth()
  const [signals, setSignals] = useState<Signal[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState('')
  const [isGenerating, setIsGenerating] = useState(false)

  useEffect(() => {
    if (user && !authLoading) {
      console.log('🔐 User authenticated, fetching signals for:', user.email)
      fetchSignals()
    } else if (!authLoading && !user) {
      console.log('⚠️ No user authenticated, cannot fetch signals')
      setError('Please log in to view trading signals')
      setIsLoading(false)
    }
  }, [user, authLoading])

  const fetchSignals = async () => {
    try {
      setIsLoading(true)
      setError('')
      
      console.log('📡 Fetching trading signals...')
      const response = await authService.getSignals()
      
      if (response.data) {
        console.log('✅ Signals data received:', response.data)
        const signalsData = Array.isArray(response.data) ? response.data : response.data.signals || []
        setSignals(signalsData)
      } else {
        console.log('❌ Signals fetch failed:', response.error)
        throw new Error(response.error || 'Failed to fetch signals')
      }
    } catch (error: any) {
      console.error('Signals fetch error:', error)
      setError(error.message)
      // Fallback to mock data for demo
      setSignals([
        {
          id: 1,
          symbol: 'BTC',
          signal_type: 'BUY',
          confidence: 87,
          price: 43250.00,
          target_price: 48000.00,
          stop_loss: 41000.00,
          reasoning: 'Strong bullish momentum with RSI oversold conditions and breaking key resistance levels. Volume surge indicates institutional interest.',
          created_at: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
          is_active: true
        },
        {
          id: 2,
          symbol: 'ETH',
          signal_type: 'BUY',
          confidence: 92,
          price: 2650.00,
          target_price: 2950.00,
          stop_loss: 2450.00,
          reasoning: 'Ethereum showing strong fundamentals with upcoming network upgrades. Technical analysis indicates breakout from ascending triangle pattern.',
          created_at: new Date(Date.now() - 4 * 60 * 60 * 1000).toISOString(),
          is_active: true
        },
        {
          id: 3,
          symbol: 'ADA',
          signal_type: 'SELL',
          confidence: 75,
          price: 0.85,
          target_price: 0.72,
          stop_loss: 0.92,
          reasoning: 'Bearish divergence on daily chart with decreasing volume. Price approaching major resistance level with weak momentum.',
          created_at: new Date(Date.now() - 6 * 60 * 60 * 1000).toISOString(),
          is_active: false
        },
        {
          id: 4,
          symbol: 'SOL',
          signal_type: 'BUY',
          confidence: 83,
          price: 98.50,
          target_price: 115.00,
          stop_loss: 88.00,
          reasoning: 'Solana ecosystem growth accelerating with new DeFi protocols. Price consolidation complete, ready for next leg up.',
          created_at: new Date(Date.now() - 8 * 60 * 60 * 1000).toISOString(),
          is_active: true
        }
      ])
    } finally {
      setIsLoading(false)
    }
  }

  const generateSignal = async () => {
    setIsGenerating(true)
    try {
      const token = localStorage.getItem('auth_token')
      if (!token) {
        console.warn('No auth token found')
        return
      }

      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'}/api/signals/generate`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          symbols: ['BTC', 'ETH', 'ADA', 'SOL'], // Default symbols to analyze
          timeframe: '4h' // 4-hour timeframe for analysis
        })
      })

      if (response.ok) {
        const result = await response.json()
        console.log('Signal generation result:', result)
        await fetchSignals() // Refresh signals list
      } else if (response.status === 401) {
        localStorage.removeItem('auth_token')
        console.warn('Authentication expired')
      } else {
        const errorText = await response.text()
        console.error('Failed to generate signal:', errorText)
      }
    } catch (error) {
      console.error('Failed to generate signal:', error)
      // Show user-friendly error message
      alert('Failed to generate signal. Please try again.')
    } finally {
      setIsGenerating(false)
    }
  }

  const formatPrice = (price: number) => {
    return price.toLocaleString('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: price < 1 ? 6 : 2
    })
  }

  const formatTimeAgo = (dateString: string) => {
    const date = new Date(dateString)
    const now = new Date()
    const diffInMinutes = Math.floor((now.getTime() - date.getTime()) / (1000 * 60))
    
    if (diffInMinutes < 60) {
      return `${diffInMinutes}m ago`
    } else if (diffInMinutes < 1440) {
      return `${Math.floor(diffInMinutes / 60)}h ago`
    } else {
      return `${Math.floor(diffInMinutes / 1440)}d ago`
    }
  }

  const getSignalColor = (signalType: string) => {
    return signalType === 'BUY' ? '#10b981' : '#ef4444'
  }

  const getSignalIcon = (signalType: string) => {
    return signalType === 'BUY' ? <TrendingUpIcon /> : <TrendingDownIcon />
  }

  const getConfidenceColor = (confidence: number) => {
    if (confidence >= 80) return '#10b981'
    if (confidence >= 60) return '#f59e0b'
    return '#ef4444'
  }

  if (isLoading) {
    return (
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        height: '400px',
        flexDirection: 'column',
        gap: '1rem'
      }}>
        <div style={{
          width: '40px',
          height: '40px',
          border: '3px solid rgba(102, 126, 234, 0.2)',
          borderTopColor: '#667eea',
          borderRadius: '50%',
          animation: 'spin 1s linear infinite'
        }} />
        <p style={{ color: '#94a3b8', fontSize: '1rem' }}>Loading trading signals...</p>
        
        <style jsx>{`
          @keyframes spin {
            to { transform: rotate(360deg); }
          }
        `}</style>
      </div>
    )
  }

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      gap: '2rem',
      maxWidth: '100%'
    }}>
      {/* Signals Header */}
      <div style={{
        background: 'linear-gradient(135deg, rgba(102, 126, 234, 0.1) 0%, rgba(118, 75, 162, 0.1) 100%)',
        border: '1px solid rgba(102, 126, 234, 0.2)',
        borderRadius: '20px',
        padding: '2rem',
        position: 'relative',
        overflow: 'hidden'
      }}>
        <div style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          height: '2px',
          background: 'linear-gradient(90deg, transparent, #667eea, transparent)',
          animation: 'pulse 3s ease-in-out infinite'
        }} />

        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: '2rem',
          flexWrap: 'wrap',
          gap: '1rem'
        }}>
        <div>
            <h2 style={{
              fontSize: '1.5rem',
              fontWeight: 700,
              color: '#ffffff',
              margin: '0 0 0.5rem 0',
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem'
            }}>
              <ZapIcon />
              AI Trading Signals
            </h2>
            <p style={{
              color: '#94a3b8',
              margin: 0,
              fontSize: '0.9rem'
            }}>
              AI-powered trading recommendations with confidence scores
            </p>
        </div>

          <button 
            onClick={generateSignal}
            disabled={isGenerating}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              background: isGenerating 
                ? 'rgba(102, 126, 234, 0.5)' 
                : 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
              color: '#ffffff',
              border: 'none',
              borderRadius: '12px',
              padding: '12px 20px',
              fontSize: '0.9rem',
              fontWeight: 600,
              cursor: isGenerating ? 'not-allowed' : 'pointer',
              transition: 'all 0.2s ease',
              opacity: isGenerating ? 0.7 : 1
            }}
            onMouseEnter={(e) => {
              if (!isGenerating) {
                e.target.style.transform = 'translateY(-2px)'
                e.target.style.boxShadow = '0 8px 25px rgba(102, 126, 234, 0.4)'
              }
            }}
            onMouseLeave={(e) => {
              if (!isGenerating) {
                e.target.style.transform = 'translateY(0)'
                e.target.style.boxShadow = 'none'
              }
            }}
          >
          {isGenerating ? (
              <>
                <div style={{
                  width: '16px',
                  height: '16px',
                  border: '2px solid rgba(255, 255, 255, 0.3)',
                  borderTopColor: '#ffffff',
                  borderRadius: '50%',
                  animation: 'spin 1s linear infinite'
                }} />
                Generating...
              </>
            ) : (
              <>
                <BrainIcon />
                Generate Signal
              </>
            )}
          </button>
      </div>

        {/* Signal Stats */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
          gap: '1.5rem'
        }}>
          <div style={{
            background: 'rgba(255, 255, 255, 0.05)',
            borderRadius: '16px',
            padding: '1.5rem',
            border: '1px solid rgba(255, 255, 255, 0.1)'
          }}>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              marginBottom: '0.5rem'
            }}>
              <ZapIcon style={{ color: '#667eea' }} />
              <span style={{
                fontSize: '0.8rem',
                color: '#94a3b8',
                fontWeight: 600,
                textTransform: 'uppercase',
                letterSpacing: '0.5px'
              }}>
                Active Signals
              </span>
            </div>
            <div style={{
              fontSize: '2rem',
              fontWeight: 800,
              color: '#ffffff',
              marginBottom: '0.5rem'
            }}>
              {signals.filter(s => s.is_active).length}
              </div>
            <div style={{
              color: '#10b981',
              fontSize: '0.9rem',
              fontWeight: 600
            }}>
              Live recommendations
            </div>
          </div>

          <div style={{
            background: 'rgba(255, 255, 255, 0.05)',
            borderRadius: '16px',
            padding: '1.5rem',
            border: '1px solid rgba(255, 255, 255, 0.1)'
          }}>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              marginBottom: '0.5rem'
            }}>
              <TargetIcon style={{ color: '#667eea' }} />
              <span style={{
                fontSize: '0.8rem',
                color: '#94a3b8',
                fontWeight: 600,
                textTransform: 'uppercase',
                letterSpacing: '0.5px'
              }}>
                Avg Confidence
              </span>
            </div>
            <div style={{
              fontSize: '2rem',
              fontWeight: 800,
              color: '#ffffff',
              marginBottom: '0.5rem'
            }}>
              {signals.length > 0 ? Math.round(signals.reduce((acc, s) => acc + s.confidence, 0) / signals.length) : 0}%
              </div>
            <div style={{
              color: '#f59e0b',
              fontSize: '0.9rem',
              fontWeight: 600
            }}>
              AI accuracy score
            </div>
          </div>

          <div style={{
            background: 'rgba(255, 255, 255, 0.05)',
            borderRadius: '16px',
            padding: '1.5rem',
            border: '1px solid rgba(255, 255, 255, 0.1)'
          }}>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              marginBottom: '0.5rem'
            }}>
              <TrendingUpIcon style={{ color: '#667eea' }} />
              <span style={{
                fontSize: '0.8rem',
                color: '#94a3b8',
                fontWeight: 600,
                textTransform: 'uppercase',
                letterSpacing: '0.5px'
              }}>
                Buy Signals
              </span>
            </div>
            <div style={{
              fontSize: '2rem',
              fontWeight: 800,
              color: '#ffffff',
              marginBottom: '0.5rem'
            }}>
              {signals.filter(s => s.signal_type === 'BUY').length}
              </div>
            <div style={{
              color: '#10b981',
              fontSize: '0.9rem',
              fontWeight: 600
            }}>
              Bullish opportunities
            </div>
          </div>
        </div>
      </div>

      {/* Signals List */}
      <div style={{
        background: 'linear-gradient(135deg, rgba(255, 255, 255, 0.08) 0%, rgba(255, 255, 255, 0.03) 100%)',
        border: '1px solid rgba(255, 255, 255, 0.15)',
        borderRadius: '20px',
        overflow: 'hidden'
      }}>
        <div style={{
          padding: '1.5rem 2rem',
          borderBottom: '1px solid rgba(255, 255, 255, 0.1)'
        }}>
          <h3 style={{
            fontSize: '1.2rem',
            fontWeight: 700,
            color: '#ffffff',
            margin: 0
          }}>
            Recent Signals
          </h3>
        </div>

        <div style={{ padding: '0' }}>
          {signals.length === 0 ? (
            <div style={{
              padding: '3rem 2rem',
              textAlign: 'center'
            }}>
              <div style={{ fontSize: '3rem', marginBottom: '1rem', opacity: 0.7 }}>🎯</div>
              <h3 style={{
                fontSize: '1.2rem',
                fontWeight: 600,
                color: '#ffffff',
                margin: '0 0 0.5rem 0'
              }}>
                No signals available
              </h3>
              <p style={{
                color: '#94a3b8',
                margin: 0,
                fontSize: '0.9rem'
              }}>
                Generate your first AI trading signal to get started
              </p>
            </div>
          ) : (
            signals.map((signal, index) => (
              <div key={signal.id} style={{
                padding: '2rem',
                borderBottom: index < signals.length - 1 ? '1px solid rgba(255, 255, 255, 0.1)' : 'none',
                transition: 'all 0.2s ease',
                cursor: 'pointer'
              }}
              onMouseEnter={(e) => {
                e.target.style.background = 'rgba(102, 126, 234, 0.05)'
              }}
              onMouseLeave={(e) => {
                e.target.style.background = 'transparent'
              }}
              >
                <div style={{
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: '1.5rem'
                }}>
                  {/* Signal Icon */}
                  <div style={{
                    width: '60px',
                    height: '60px',
                    background: `linear-gradient(135deg, ${
                      signal.symbol === 'BTC' ? '#f7931a, #ffb74d' :
                      signal.symbol === 'ETH' ? '#627eea, #9c88ff' :
                      signal.symbol === 'ADA' ? '#0033ad, #3d4ed8' :
                      '#667eea, #764ba2'
                    })`,
                    borderRadius: '16px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: '#ffffff',
                    fontWeight: 700,
                    fontSize: '1rem',
                    flexShrink: 0,
                    boxShadow: '0 8px 25px rgba(0, 0, 0, 0.2)'
                  }}>
                    {signal.symbol}
                  </div>

                  {/* Signal Content */}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    {/* Header */}
                    <div style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      marginBottom: '1rem',
                      flexWrap: 'wrap',
                      gap: '1rem'
                    }}>
                      <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '1rem'
                      }}>
                        <h4 style={{
                          fontSize: '1.3rem',
                          fontWeight: 700,
                          color: '#ffffff',
                          margin: 0
                        }}>
                          {signal.symbol}
                        </h4>
                        
                        <div style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '6px',
                          background: getSignalColor(signal.signal_type) + '20',
                          color: getSignalColor(signal.signal_type),
                          padding: '6px 12px',
                          borderRadius: '8px',
                          fontSize: '0.8rem',
                          fontWeight: 700,
                          border: `1px solid ${getSignalColor(signal.signal_type)}30`
                        }}>
                          {getSignalIcon(signal.signal_type)}
                        {signal.signal_type}
                        </div>

                        <div style={{
                          background: getConfidenceColor(signal.confidence) + '20',
                          color: getConfidenceColor(signal.confidence),
                          padding: '6px 12px',
                          borderRadius: '8px',
                          fontSize: '0.8rem',
                          fontWeight: 700,
                          border: `1px solid ${getConfidenceColor(signal.confidence)}30`
                        }}>
                          {signal.confidence}% confidence
                        </div>
                      </div>

                      <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '1rem'
                      }}>
                        <div style={{
                          fontSize: '0.8rem',
                          color: '#94a3b8'
                        }}>
                          {formatTimeAgo(signal.created_at)}
                    </div>
                        
                        <div style={{
                          width: '8px',
                          height: '8px',
                          borderRadius: '50%',
                          background: signal.is_active ? '#10b981' : '#64748b',
                          boxShadow: signal.is_active ? '0 0 8px #10b981' : 'none'
                        }} />
                    </div>
                  </div>

                    {/* Price Info */}
                    <div style={{
                      display: 'grid',
                      gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))',
                      gap: '1rem',
                      marginBottom: '1rem',
                      padding: '1rem',
                      background: 'rgba(255, 255, 255, 0.03)',
                      borderRadius: '12px',
                      border: '1px solid rgba(255, 255, 255, 0.08)'
                    }}>
                      <div style={{ textAlign: 'center' }}>
                        <div style={{
                          fontSize: '0.75rem',
                          color: '#94a3b8',
                          marginBottom: '0.25rem',
                          textTransform: 'uppercase',
                          letterSpacing: '0.5px'
                        }}>
                          Entry Price
                    </div>
                        <div style={{
                          fontSize: '1.1rem',
                          fontWeight: 700,
                          color: '#ffffff'
                        }}>
                          {formatPrice(signal.price)}
                        </div>
                      </div>

                      {signal.target_price && (
                        <div style={{ textAlign: 'center' }}>
                          <div style={{
                            fontSize: '0.75rem',
                            color: '#94a3b8',
                            marginBottom: '0.25rem',
                            textTransform: 'uppercase',
                            letterSpacing: '0.5px'
                          }}>
                            Target
                          </div>
                          <div style={{
                            fontSize: '1.1rem',
                            fontWeight: 700,
                            color: '#10b981'
                          }}>
                            {formatPrice(signal.target_price)}
                        </div>
                      </div>
                    )}

                    {signal.stop_loss && (
                        <div style={{ textAlign: 'center' }}>
                          <div style={{
                            fontSize: '0.75rem',
                            color: '#94a3b8',
                            marginBottom: '0.25rem',
                            textTransform: 'uppercase',
                            letterSpacing: '0.5px'
                          }}>
                            Stop Loss
                          </div>
                          <div style={{
                            fontSize: '1.1rem',
                            fontWeight: 700,
                            color: '#ef4444'
                          }}>
                            {formatPrice(signal.stop_loss)}
                          </div>
                        </div>
                      )}

                      {signal.target_price && (
                        <div style={{ textAlign: 'center' }}>
                          <div style={{
                            fontSize: '0.75rem',
                            color: '#94a3b8',
                            marginBottom: '0.25rem',
                            textTransform: 'uppercase',
                            letterSpacing: '0.5px'
                          }}>
                            Potential
                          </div>
                          <div style={{
                            fontSize: '1.1rem',
                            fontWeight: 700,
                            color: signal.signal_type === 'BUY' ? '#10b981' : '#ef4444'
                          }}>
                            {signal.signal_type === 'BUY' 
                              ? `+${((signal.target_price - signal.price) / signal.price * 100).toFixed(1)}%`
                              : `${((signal.target_price - signal.price) / signal.price * 100).toFixed(1)}%`
                            }
                        </div>
                      </div>
                    )}
                  </div>

                    {/* Reasoning */}
                    <div style={{
                      background: 'rgba(102, 126, 234, 0.05)',
                      border: '1px solid rgba(102, 126, 234, 0.15)',
                      borderRadius: '12px',
                      padding: '1rem'
                    }}>
                      <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px',
                        marginBottom: '0.5rem'
                      }}>
                        <BrainIcon style={{ color: '#667eea' }} />
                        <span style={{
                          fontSize: '0.8rem',
                          color: '#667eea',
                          fontWeight: 600,
                          textTransform: 'uppercase',
                          letterSpacing: '0.5px'
                        }}>
                          AI Analysis
                        </span>
                      </div>
                      <p style={{
                        color: '#cbd5e1',
                        fontSize: '0.9rem',
                        lineHeight: 1.6,
                        margin: 0
                      }}>
                        {signal.reasoning}
                      </p>
                    </div>
                  </div>
                </div>
            </div>
            ))
          )}
        </div>
      </div>

      <style jsx>{`
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.5; }
        }

        @keyframes spin {
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  )
}