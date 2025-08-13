'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '@/components/auth-provider-secure'
import { authServiceSecure } from '@/lib/auth-service-secure'

interface Asset {
  symbol: string
  amount: number
  price: number
  value: number
  change_24h: number
  allocation_percentage: number
}

interface PortfolioData {
  total_value_usd: number
  total_change_24h: number
  total_change_percentage_24h: number
  assets: Record<string, Asset>
  asset_count: number
  last_updated: string
}

// Custom SVG Icons
const PieChartIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M21.21 15.89A10 10 0 1 1 8 2.83"/>
    <path d="M22 12A10 10 0 0 0 12 2v10z"/>
  </svg>
)

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

const PlusIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <line x1="12" y1="5" x2="12" y2="19"/>
    <line x1="5" y1="12" x2="19" y2="12"/>
  </svg>
)

const ActivityIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <polyline points="22,12 18,12 15,21 9,3 6,12 2,12"/>
  </svg>
)

const DollarSignIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <line x1="12" y1="1" x2="12" y2="23"/>
    <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/>
  </svg>
)

export function PortfolioView() {
  const { user, isLoading: authLoading } = useAuth()
  const [portfolio, setPortfolio] = useState<PortfolioData | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    // Only fetch portfolio if user is authenticated and auth is not loading
    if (user && !authLoading) {
      console.log('🔐 User authenticated, fetching portfolio for:', user.email)
      fetchPortfolio()
    } else if (!authLoading && !user) {
      console.log('⚠️ No user authenticated, cannot fetch portfolio')
      setError('Please log in to view your portfolio')
      setIsLoading(false)
    }
  }, [user, authLoading])

  const fetchPortfolio = async () => {
    try {
      setIsLoading(true)
      setError('')
      
      console.log('📡 Fetching portfolio data...')
      const response = await authServiceSecure.getPortfolio()
      
      if (response.data) {
        console.log('✅ Portfolio data received:', response.data)
        setPortfolio(response.data)
      } else {
        console.log('❌ Portfolio fetch failed:', response.error)
        throw new Error(response.error || 'Failed to fetch portfolio')
      }
    } catch (error: any) {
      console.error('Portfolio fetch error:', error)
      setError(error.message)
      
      // Fallback to mock data for demo
      setPortfolio({
        total_value_usd: 45231.89,
        total_change_24h: 5654.32,
        total_change_percentage_24h: 14.5,
        assets: {
          'BTC': {
            symbol: 'BTC',
            amount: 1.5,
            price: 43250.00,
            value: 64875.00,
            change_24h: 12.5,
            allocation_percentage: 45.2
          },
          'ETH': {
            symbol: 'ETH',
            amount: 15.8,
            price: 2650.00,
            value: 41870.00,
            change_24h: 8.7,
            allocation_percentage: 29.1
          },
          'ADA': {
            symbol: 'ADA',
            amount: 12000,
            price: 0.85,
            value: 10200.00,
            change_24h: -3.2,
            allocation_percentage: 15.3
          },
          'SOL': {
            symbol: 'SOL',
            amount: 85,
            price: 98.50,
            value: 8372.50,
            change_24h: 18.9,
            allocation_percentage: 10.4
          }
        },
        asset_count: 4,
        last_updated: new Date().toISOString()
      })
    } finally {
      setIsLoading(false)
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

  const formatPercentage = (percentage: number) => {
    return `${percentage >= 0 ? '+' : ''}${percentage.toFixed(2)}%`
  }

  const getPriceChangeColor = (change: number) => {
    return change >= 0 ? '#10b981' : '#ef4444'
  }

  const getPriceChangeIcon = (change: number) => {
    return change >= 0 ? <TrendingUpIcon /> : <TrendingDownIcon />
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
        <p style={{ color: '#94a3b8', fontSize: '1rem' }}>Loading portfolio...</p>
        
        <style jsx>{`
          @keyframes spin {
            to { transform: rotate(360deg); }
          }
        `}</style>
      </div>
    )
  }

  if (error && !portfolio) {
    return (
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        height: '400px',
        flexDirection: 'column',
        gap: '1rem',
        textAlign: 'center'
      }}>
        <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>⚠️</div>
        <h3 style={{
          fontSize: '1.2rem',
          fontWeight: 600,
          color: '#ffffff',
          margin: '0 0 0.5rem 0'
        }}>
          Unable to load portfolio
        </h3>
        <p style={{ color: '#94a3b8', margin: 0 }}>
          Using demo data for visualization
        </p>
        <button
          onClick={fetchPortfolio}
          style={{
            background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
            color: '#ffffff',
            border: 'none',
            borderRadius: '8px',
            padding: '10px 20px',
            fontSize: '0.9rem',
            fontWeight: 600,
            cursor: 'pointer',
            transition: 'all 0.2s ease',
            marginTop: '1rem'
          }}
          onMouseEnter={(e) => {
            e.target.style.transform = 'translateY(-2px)'
            e.target.style.boxShadow = '0 8px 25px rgba(102, 126, 234, 0.4)'
          }}
          onMouseLeave={(e) => {
            e.target.style.transform = 'translateY(0)'
            e.target.style.boxShadow = 'none'
          }}
        >
          Retry
        </button>
        </div>
    )
  }

  if (!portfolio) {
    return null
  }

  const assetsArray = Object.values(portfolio.assets)

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      gap: '2rem',
      maxWidth: '100%'
    }}>
      {/* Portfolio Summary */}
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
              <PieChartIcon />
              Portfolio Overview
            </h2>
            <p style={{
              color: '#94a3b8',
              margin: 0,
              fontSize: '0.9rem'
            }}>
              Real-time portfolio tracking and analytics
                </p>
              </div>

          <button style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            background: 'linear-gradient(135deg, #10b981 0%, #34d399 100%)',
            color: '#ffffff',
            border: 'none',
            borderRadius: '12px',
            padding: '12px 20px',
            fontSize: '0.9rem',
            fontWeight: 600,
            cursor: 'pointer',
            transition: 'all 0.2s ease'
          }}
          onMouseEnter={(e) => {
            e.target.style.transform = 'translateY(-2px)'
            e.target.style.boxShadow = '0 8px 25px rgba(16, 185, 129, 0.4)'
          }}
          onMouseLeave={(e) => {
            e.target.style.transform = 'translateY(0)'
            e.target.style.boxShadow = 'none'
          }}
          >
            <PlusIcon />
            Add Asset
          </button>
        </div>

        {/* Portfolio Stats */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
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
              <DollarSignIcon style={{ color: '#667eea' }} />
              <span style={{
                fontSize: '0.8rem',
                color: '#94a3b8',
                fontWeight: 600,
                textTransform: 'uppercase',
                letterSpacing: '0.5px'
              }}>
                Total Value
              </span>
            </div>
            <div style={{
              fontSize: '2rem',
              fontWeight: 800,
              color: '#ffffff',
              marginBottom: '0.5rem'
            }}>
              {formatPrice(portfolio.total_value_usd)}
            </div>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
              color: getPriceChangeColor(portfolio.total_change_percentage_24h),
              fontSize: '0.9rem',
              fontWeight: 600
            }}>
              {getPriceChangeIcon(portfolio.total_change_percentage_24h)}
              {formatPercentage(portfolio.total_change_percentage_24h)} ({formatPrice(portfolio.total_change_24h)})
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
              <ActivityIcon style={{ color: '#667eea' }} />
              <span style={{
                fontSize: '0.8rem',
                color: '#94a3b8',
                fontWeight: 600,
                textTransform: 'uppercase',
                letterSpacing: '0.5px'
              }}>
                Assets
              </span>
            </div>
            <div style={{
              fontSize: '2rem',
              fontWeight: 800,
              color: '#ffffff',
              marginBottom: '0.5rem'
            }}>
              {portfolio.asset_count}
              </div>
            <div style={{
              color: '#94a3b8',
              fontSize: '0.9rem'
            }}>
              Diversified holdings
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
                Best Performer
              </span>
            </div>
            <div style={{
              fontSize: '1.3rem',
              fontWeight: 700,
              color: '#ffffff',
              marginBottom: '0.5rem'
            }}>
              {assetsArray.sort((a, b) => b.change_24h - a.change_24h)[0]?.symbol || 'N/A'}
              </div>
            <div style={{
              color: '#10b981',
              fontSize: '0.9rem',
              fontWeight: 600
            }}>
              +{assetsArray.sort((a, b) => b.change_24h - a.change_24h)[0]?.change_24h.toFixed(2) || '0'}%
            </div>
          </div>
        </div>
      </div>

      {/* Assets List */}
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
            Holdings
          </h3>
        </div>

        <div style={{ padding: '0' }}>
          {assetsArray.map((asset, index) => (
            <div key={asset.symbol} style={{
              padding: '1.5rem 2rem',
              borderBottom: index < assetsArray.length - 1 ? '1px solid rgba(255, 255, 255, 0.1)' : 'none',
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
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: '1rem'
              }}>
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '1rem',
                  flex: 1
                }}>
                  <div style={{
                    width: '50px',
                    height: '50px',
                    background: `linear-gradient(135deg, ${
                      asset.symbol === 'BTC' ? '#f7931a, #ffb74d' :
                      asset.symbol === 'ETH' ? '#627eea, #9c88ff' :
                      asset.symbol === 'ADA' ? '#0033ad, #3d4ed8' :
                      '#667eea, #764ba2'
                    })`,
                    borderRadius: '12px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: '#ffffff',
                    fontWeight: 700,
                    fontSize: '0.9rem',
                    flexShrink: 0
                  }}>
                    {asset.symbol}
                  </div>

                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{
                      fontSize: '1.1rem',
                      fontWeight: 700,
                      color: '#ffffff',
                      marginBottom: '0.25rem'
                    }}>
                      {asset.symbol}
                    </div>
                    <div style={{
                      fontSize: '0.85rem',
                      color: '#94a3b8'
                    }}>
                      {asset.amount.toLocaleString()} {asset.symbol}
                    </div>
                  </div>
                </div>

                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '2rem',
                  flexShrink: 0
                }}>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{
                      fontSize: '1rem',
                      fontWeight: 600,
                      color: '#ffffff',
                      marginBottom: '0.25rem'
                    }}>
                      {formatPrice(asset.price)}
                </div>
                    <div style={{
                      fontSize: '0.85rem',
                      color: '#94a3b8'
                    }}>
                      Price
                </div>
              </div>

                  <div style={{ textAlign: 'right' }}>
                    <div style={{
                      fontSize: '1rem',
                      fontWeight: 600,
                      color: '#ffffff',
                      marginBottom: '0.25rem'
                    }}>
                      {formatPrice(asset.value)}
                      </div>
                    <div style={{
                      fontSize: '0.85rem',
                      color: '#94a3b8'
                    }}>
                        {asset.allocation_percentage.toFixed(1)}%
                    </div>
                  </div>

                  <div style={{
                    textAlign: 'right',
                    minWidth: '80px'
                  }}>
                    <div style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'flex-end',
                      gap: '4px',
                      color: getPriceChangeColor(asset.change_24h),
                      fontSize: '0.9rem',
                      fontWeight: 600,
                      marginBottom: '0.25rem'
                    }}>
                      {getPriceChangeIcon(asset.change_24h)}
                      {formatPercentage(asset.change_24h)}
                    </div>
                    <div style={{
                      fontSize: '0.75rem',
                      color: '#94a3b8'
                    }}>
                      24h Change
              </div>
            </div>
                </div>
              </div>
            </div>
          ))}
            </div>
          </div>

      <style jsx>{`
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.5; }
        }
      `}</style>
    </div>
  )
}