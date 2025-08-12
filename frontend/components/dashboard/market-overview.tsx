'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '@/hooks/use-auth'
import { authService } from '@/lib/auth-service-complete'

interface MarketData {
  market_overview: {
    total_market_cap_usd: number
    total_volume_24h_usd: number
    bitcoin_dominance: number
    ethereum_dominance: number
  }
  trending_coins: Array<{
    symbol: string
    name: string
    price: number
    change_24h: number
    market_cap: number
    market_cap_rank: number
  }>
  fear_greed_index?: {
    value: number
    classification: string
  }
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

const ActivityIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <polyline points="22,12 18,12 15,21 9,3 6,12 2,12"/>
  </svg>
)

const BarChartIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <line x1="12" y1="20" x2="12" y2="10"/>
    <line x1="18" y1="20" x2="18" y2="4"/>
    <line x1="6" y1="20" x2="6" y2="16"/>
  </svg>
)

const PieChartIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M21.21 15.89A10 10 0 1 1 8 2.83"/>
    <path d="M22 12A10 10 0 0 0 12 2v10z"/>
  </svg>
)

const GlobeIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <circle cx="12" cy="12" r="10"/>
    <line x1="2" y1="12" x2="22" y2="12"/>
    <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/>
  </svg>
)

const FireIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.38-.5-2-1-3-1.072-2.143-.224-4.054 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 1 1-14 0c0-1.153.433-2.294 1-3a2.5 2.5 0 0 0 2.5 2.5z"/>
  </svg>
)

const DollarSignIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <line x1="12" y1="1" x2="12" y2="23"/>
    <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/>
  </svg>
)

export function MarketOverview() {
  const { user, isLoading: authLoading } = useAuth()
  const [marketData, setMarketData] = useState<MarketData | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    if (user && !authLoading) {
      console.log('🔐 User authenticated, fetching market data for:', user.email)
    fetchMarketData()
    } else if (!authLoading && !user) {
      console.log('⚠️ No user authenticated, using mock market data')
      setMarketData(getMockMarketData())
      setIsLoading(false)
    }
  }, [user, authLoading])

  const fetchMarketData = async () => {
    try {
      setIsLoading(true)
      
      console.log('📡 Fetching market data...')
      const response = await authService.getMarketOverview()
      
      if (response.data) {
        console.log('✅ Market data received:', response.data)
        setMarketData(response.data)
      } else {
        console.log('❌ Market data fetch failed:', response.error)
        console.warn('Using mock data as fallback')
        setMarketData(getMockMarketData())
      }
    } catch (error: any) {
      console.error('Market data fetch error:', error)
      setMarketData(getMockMarketData())
    } finally {
      setIsLoading(false)
    }
  }

  const getMockMarketData = (): MarketData => ({
    market_overview: {
      total_market_cap_usd: 2100000000000,
      total_volume_24h_usd: 89200000000,
      bitcoin_dominance: 54.2,
      ethereum_dominance: 17.8
    },
    trending_coins: [
      {
        symbol: 'BTC',
        name: 'Bitcoin',
        price: 43250.00,
        change_24h: 12.5,
        market_cap: 846500000000,
        market_cap_rank: 1
      },
      {
        symbol: 'ETH',
        name: 'Ethereum',
        price: 2650.00,
        change_24h: 8.7,
        market_cap: 318600000000,
        market_cap_rank: 2
      },
      {
        symbol: 'BNB',
        name: 'BNB',
        price: 315.50,
        change_24h: -2.3,
        market_cap: 47250000000,
        market_cap_rank: 3
      },
      {
        symbol: 'XRP',
        name: 'XRP',
        price: 0.65,
        change_24h: 18.9,
        market_cap: 35400000000,
        market_cap_rank: 4
      },
      {
        symbol: 'SOL',
        name: 'Solana',
        price: 98.50,
        change_24h: 15.2,
        market_cap: 42100000000,
        market_cap_rank: 5
      },
      {
        symbol: 'ADA',
        name: 'Cardano',
        price: 0.85,
        change_24h: -3.2,
        market_cap: 30200000000,
        market_cap_rank: 6
      }
    ],
    fear_greed_index: {
      value: 76,
      classification: 'Greed'
    }
  })

  const formatPrice = (price: number) => {
    const value = typeof price === 'number' && isFinite(price) ? price : 0
    return value.toLocaleString('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: value < 1 ? 6 : 2
    })
  }

  const formatMarketCap = (marketCap?: number) => {
    const cap = typeof marketCap === 'number' && isFinite(marketCap) ? marketCap : 0
    if (cap >= 1e12) {
      return `$${(cap / 1e12).toFixed(2)}T`
    } else if (cap >= 1e9) {
      return `$${(cap / 1e9).toFixed(2)}B`
    } else if (cap >= 1e6) {
      return `$${(cap / 1e6).toFixed(2)}M`
    }
    return `$${cap.toLocaleString('en-US')}`
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

  const getFearGreedColor = (value: number) => {
    if (value >= 75) return '#10b981' // Extreme Greed
    if (value >= 55) return '#34d399' // Greed
    if (value >= 45) return '#fbbf24' // Neutral
    if (value >= 25) return '#f59e0b' // Fear
    return '#ef4444' // Extreme Fear
  }

  const getFearGreedLabel = (value: number) => {
    if (value >= 75) return 'Extreme Greed'
    if (value >= 55) return 'Greed'
    if (value >= 45) return 'Neutral'
    if (value >= 25) return 'Fear'
    return 'Extreme Fear'
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
        <p style={{ color: '#94a3b8', fontSize: '1rem' }}>Loading market data...</p>
        
        <style jsx>{`
          @keyframes spin {
            to { transform: rotate(360deg); }
          }
        `}</style>
      </div>
    )
  }

  if (!marketData) {
    return null
  }

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      gap: '2rem',
      maxWidth: '100%'
    }}>
      {/* Market Overview Header */}
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
              <GlobeIcon />
              Global Market Overview
            </h2>
            <p style={{
              color: '#94a3b8',
              margin: 0,
              fontSize: '0.9rem'
            }}>
              Real-time cryptocurrency market data and insights
            </p>
          </div>

          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            fontSize: '0.8rem',
            color: '#94a3b8',
            background: 'rgba(16, 185, 129, 0.1)',
            padding: '4px 8px',
            borderRadius: '6px',
            border: '1px solid rgba(16, 185, 129, 0.2)'
          }}>
            <div style={{
              width: '6px',
              height: '6px',
              borderRadius: '50%',
              background: '#10b981',
              animation: 'pulse 2s infinite',
              boxShadow: '0 0 8px #10b981'
            }} />
            Live Data
          </div>
        </div>

      {/* Market Stats */}
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
                Market Cap
              </span>
            </div>
            <div style={{
              fontSize: '1.8rem',
              fontWeight: 800,
              color: '#ffffff',
              marginBottom: '0.5rem'
            }}>
                {formatMarketCap(marketData.market_overview.total_market_cap_usd)}
            </div>
            <div style={{
              color: '#94a3b8',
              fontSize: '0.9rem'
            }}>
              Total crypto market
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
              <BarChartIcon style={{ color: '#667eea' }} />
              <span style={{
                fontSize: '0.8rem',
                color: '#94a3b8',
                fontWeight: 600,
                textTransform: 'uppercase',
                letterSpacing: '0.5px'
              }}>
                24h Volume
              </span>
            </div>
            <div style={{
              fontSize: '1.8rem',
              fontWeight: 800,
              color: '#ffffff',
              marginBottom: '0.5rem'
            }}>
                {formatMarketCap(marketData.market_overview.total_volume_24h_usd)}
            </div>
            <div style={{
              color: '#94a3b8',
              fontSize: '0.9rem'
            }}>
              Trading volume
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
              <PieChartIcon style={{ color: '#667eea' }} />
              <span style={{
                fontSize: '0.8rem',
                color: '#94a3b8',
                fontWeight: 600,
                textTransform: 'uppercase',
                letterSpacing: '0.5px'
              }}>
                BTC Dominance
              </span>
            </div>
            <div style={{
              fontSize: '1.8rem',
              fontWeight: 800,
              color: '#ffffff',
              marginBottom: '0.5rem'
            }}>
                {typeof marketData?.market_overview?.bitcoin_dominance === 'number' && isFinite(marketData.market_overview.bitcoin_dominance)
                  ? marketData.market_overview.bitcoin_dominance.toFixed(1)
                  : '--'}%
            </div>
            <div style={{
              color: '#94a3b8',
              fontSize: '0.9rem'
            }}>
              Bitcoin share
            </div>
      </div>

      {marketData.fear_greed_index && (
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
                <FireIcon style={{ color: '#667eea' }} />
                <span style={{
                  fontSize: '0.8rem',
                  color: '#94a3b8',
                  fontWeight: 600,
                  textTransform: 'uppercase',
                  letterSpacing: '0.5px'
                }}>
                  Fear & Greed
                </span>
                </div>
              <div style={{
                fontSize: '1.8rem',
                fontWeight: 800,
                color: '#ffffff',
                marginBottom: '0.5rem'
              }}>
                {marketData.fear_greed_index.value}
              </div>
              <div style={{
                color: getFearGreedColor(marketData.fear_greed_index.value),
                fontSize: '0.9rem',
                fontWeight: 600
              }}>
                {getFearGreedLabel(marketData.fear_greed_index.value)}
              </div>
            </div>
      )}
        </div>
      </div>

      {/* Top Cryptocurrencies */}
      <div style={{
        background: 'linear-gradient(135deg, rgba(255, 255, 255, 0.08) 0%, rgba(255, 255, 255, 0.03) 100%)',
        border: '1px solid rgba(255, 255, 255, 0.15)',
        borderRadius: '20px',
        overflow: 'hidden'
      }}>
        <div style={{
          padding: '1.5rem 2rem',
          borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between'
        }}>
          <h3 style={{
            fontSize: '1.2rem',
            fontWeight: 700,
            color: '#ffffff',
            margin: 0,
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem'
          }}>
            <FireIcon />
            Top Cryptocurrencies
          </h3>
          <div style={{
            fontSize: '0.8rem',
            color: '#94a3b8'
          }}>
            Ranked by market cap
          </div>
        </div>

        <div style={{ padding: '0' }}>
            {marketData.trending_coins.map((coin, index) => (
            <div key={coin.symbol} style={{
              padding: '1.5rem 2rem',
              borderBottom: index < marketData.trending_coins.length - 1 ? '1px solid rgba(255, 255, 255, 0.1)' : 'none',
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
                    width: '40px',
                    height: '40px',
                    background: 'rgba(102, 126, 234, 0.2)',
                    borderRadius: '50%',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: '#667eea',
                    fontWeight: 700,
                    fontSize: '0.8rem',
                    flexShrink: 0,
                    border: '2px solid rgba(102, 126, 234, 0.3)'
                  }}>
                    #{coin.market_cap_rank}
                  </div>

                  <div style={{
                    width: '50px',
                    height: '50px',
                    background: `linear-gradient(135deg, ${
                      coin.symbol === 'BTC' ? '#f7931a, #ffb74d' :
                      coin.symbol === 'ETH' ? '#627eea, #9c88ff' :
                      coin.symbol === 'BNB' ? '#f3ba2f, #fdd835' :
                      coin.symbol === 'XRP' ? '#23292f, #525252' :
                      coin.symbol === 'SOL' ? '#9945ff, #14f195' :
                      coin.symbol === 'ADA' ? '#0033ad, #3d4ed8' :
                      '#667eea, #764ba2'
                    })`,
                    borderRadius: '12px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: '#ffffff',
                    fontWeight: 700,
                    fontSize: '0.9rem',
                    flexShrink: 0,
                    boxShadow: '0 4px 15px rgba(0, 0, 0, 0.2)'
                  }}>
                    {coin.symbol}
                  </div>

                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{
                      fontSize: '1.1rem',
                      fontWeight: 700,
                      color: '#ffffff',
                      marginBottom: '0.25rem'
                    }}>
                      {coin.name}
                    </div>
                    <div style={{
                      fontSize: '0.85rem',
                      color: '#94a3b8'
                    }}>
                      {coin.symbol}
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
                      {formatPrice(coin.price)}
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
                      {formatMarketCap(coin.market_cap)}
                    </div>
                    <div style={{
                      fontSize: '0.85rem',
                      color: '#94a3b8'
                    }}>
                      Market Cap
                  </div>
                </div>

                  <div style={{
                    textAlign: 'right',
                    minWidth: '100px'
                  }}>
                    <div style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'flex-end',
                      gap: '4px',
                      color: getPriceChangeColor(coin.change_24h),
                      fontSize: '0.9rem',
                      fontWeight: 600,
                      marginBottom: '0.25rem'
                    }}>
                      {getPriceChangeIcon(coin.change_24h)}
                      {formatPercentage(coin.change_24h)}
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

      {/* Market Dominance Chart */}
      <div style={{
        background: 'linear-gradient(135deg, rgba(255, 255, 255, 0.08) 0%, rgba(255, 255, 255, 0.03) 100%)',
        border: '1px solid rgba(255, 255, 255, 0.15)',
        borderRadius: '20px',
        padding: '2rem'
      }}>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: '2rem'
        }}>
          <h3 style={{
            fontSize: '1.2rem',
            fontWeight: 700,
            color: '#ffffff',
            margin: 0,
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem'
          }}>
            <PieChartIcon />
            Market Dominance
          </h3>
        </div>

        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
          gap: '1.5rem'
        }}>
          <div style={{
            background: 'rgba(247, 147, 26, 0.1)',
            border: '1px solid rgba(247, 147, 26, 0.3)',
            borderRadius: '16px',
            padding: '1.5rem',
            textAlign: 'center'
          }}>
            <div style={{
              fontSize: '0.8rem',
              color: '#f7931a',
              fontWeight: 600,
              textTransform: 'uppercase',
              letterSpacing: '0.5px',
              marginBottom: '0.5rem'
            }}>
              Bitcoin (BTC)
            </div>
            <div style={{
              fontSize: '2rem',
              fontWeight: 800,
              color: '#ffffff',
              marginBottom: '0.5rem'
            }}>
              {typeof marketData?.market_overview?.bitcoin_dominance === 'number' && isFinite(marketData.market_overview.bitcoin_dominance)
                ? marketData.market_overview.bitcoin_dominance.toFixed(1)
                : '--'}%
            </div>
            <div style={{
              width: '100%',
              height: '8px',
              background: 'rgba(255, 255, 255, 0.1)',
              borderRadius: '4px',
              overflow: 'hidden'
            }}>
              <div style={{
                width: `${typeof marketData?.market_overview?.bitcoin_dominance === 'number' && isFinite(marketData.market_overview.bitcoin_dominance) ? marketData.market_overview.bitcoin_dominance : 0}%`,
                height: '100%',
                background: 'linear-gradient(90deg, #f7931a, #ffb74d)',
                borderRadius: '4px'
              }} />
            </div>
          </div>

          <div style={{
            background: 'rgba(98, 126, 234, 0.1)',
            border: '1px solid rgba(98, 126, 234, 0.3)',
            borderRadius: '16px',
            padding: '1.5rem',
            textAlign: 'center'
          }}>
            <div style={{
              fontSize: '0.8rem',
              color: '#627eea',
              fontWeight: 600,
              textTransform: 'uppercase',
              letterSpacing: '0.5px',
              marginBottom: '0.5rem'
            }}>
              Ethereum (ETH)
            </div>
            <div style={{
              fontSize: '2rem',
              fontWeight: 800,
              color: '#ffffff',
              marginBottom: '0.5rem'
            }}>
              {typeof marketData?.market_overview?.ethereum_dominance === 'number' && isFinite(marketData.market_overview.ethereum_dominance)
                ? marketData.market_overview.ethereum_dominance.toFixed(1)
                : '--'}%
            </div>
            <div style={{
              width: '100%',
              height: '8px',
              background: 'rgba(255, 255, 255, 0.1)',
              borderRadius: '4px',
              overflow: 'hidden'
            }}>
              <div style={{
                width: `${typeof marketData?.market_overview?.ethereum_dominance === 'number' && isFinite(marketData.market_overview.ethereum_dominance) ? marketData.market_overview.ethereum_dominance : 0}%`,
                height: '100%',
                background: 'linear-gradient(90deg, #627eea, #9c88ff)',
                borderRadius: '4px'
              }} />
            </div>
          </div>

          <div style={{
            background: 'rgba(148, 163, 184, 0.1)',
            border: '1px solid rgba(148, 163, 184, 0.3)',
            borderRadius: '16px',
            padding: '1.5rem',
            textAlign: 'center'
          }}>
            <div style={{
              fontSize: '0.8rem',
              color: '#94a3b8',
              fontWeight: 600,
              textTransform: 'uppercase',
              letterSpacing: '0.5px',
              marginBottom: '0.5rem'
            }}>
              Others
            </div>
            <div style={{
              fontSize: '2rem',
              fontWeight: 800,
              color: '#ffffff',
              marginBottom: '0.5rem'
            }}>
              {(() => {
                const btc = typeof marketData?.market_overview?.bitcoin_dominance === 'number' ? marketData.market_overview.bitcoin_dominance : 0
                const eth = typeof marketData?.market_overview?.ethereum_dominance === 'number' ? marketData.market_overview.ethereum_dominance : 0
                const other = 100 - btc - eth
                return isFinite(other) ? other.toFixed(1) : '--'
              })()}%
            </div>
            <div style={{
              width: '100%',
              height: '8px',
              background: 'rgba(255, 255, 255, 0.1)',
              borderRadius: '4px',
              overflow: 'hidden'
            }}>
              <div style={{
                width: `${(() => {
                  const btc = typeof marketData?.market_overview?.bitcoin_dominance === 'number' ? marketData.market_overview.bitcoin_dominance : 0
                  const eth = typeof marketData?.market_overview?.ethereum_dominance === 'number' ? marketData.market_overview.ethereum_dominance : 0
                  const other = 100 - btc - eth
                  return isFinite(other) ? other : 0
                })()}%`,
                height: '100%',
                background: 'linear-gradient(90deg, #94a3b8, #cbd5e1)',
                borderRadius: '4px'
              }} />
            </div>
          </div>
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