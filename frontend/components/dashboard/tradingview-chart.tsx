'use client'

import { useEffect, useRef } from 'react'

interface TradingViewChartProps {
  symbol?: string
  theme?: 'light' | 'dark'
  height?: number
  interval?: string
  container_id?: string
}

export function TradingViewChart({ 
  symbol = 'BINANCE:BTCUSDT',
  theme = 'dark',
  height = 600,
  interval = '15',
  container_id = 'tradingview_chart'
}: TradingViewChartProps) {
  const container = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!container.current) return

    // Clear any existing chart
    container.current.innerHTML = ''

    const script = document.createElement('script')
    script.src = 'https://s3.tradingview.com/external-embedding/embed-widget-advanced-chart.js'
    script.type = 'text/javascript'
    script.async = true
    script.innerHTML = JSON.stringify({
      autosize: true,
      symbol: symbol,
      interval: interval,
      timezone: 'Etc/UTC',
      theme: theme,
      style: '1',
      locale: 'en',
      enable_publishing: false,
      allow_symbol_change: true,
      calendar: false,
      support_host: 'https://www.tradingview.com',
      height: height,
      studies: [
        'Volume@tv-basicstudies',
        'RSI@tv-basicstudies',
        'MACD@tv-basicstudies'
      ],
      show_popup_button: true,
      popup_width: '1000',
      popup_height: '650',
      container_id: container_id
    })

    container.current.appendChild(script)

    // Cleanup function
    return () => {
      if (container.current) {
        container.current.innerHTML = ''
      }
    }
  }, [symbol, theme, height, interval, container_id])

  return (
    <div style={{
      background: 'linear-gradient(135deg, rgba(255, 255, 255, 0.08) 0%, rgba(255, 255, 255, 0.03) 100%)',
      border: '1px solid rgba(255, 255, 255, 0.15)',
      borderRadius: '20px',
      overflow: 'hidden',
      position: 'relative'
    }}>
      {/* Chart Header */}
      <div style={{
        padding: '1.5rem 2rem',
        borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
        background: 'rgba(255, 255, 255, 0.05)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between'
      }}>
        <div>
          <h3 style={{
            fontSize: '1.2rem',
            fontWeight: 700,
            color: '#ffffff',
            margin: '0 0 0.25rem 0',
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem'
          }}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M3 3v18h18"/>
              <path d="M7 16l4-4 4 4 6-6"/>
            </svg>
            Trading Chart
          </h3>
          <p style={{
            color: '#94a3b8',
            margin: 0,
            fontSize: '0.85rem'
          }}>
            {symbol.replace('BINANCE:', '').replace('USDT', '/USDT')} • {interval}m interval
          </p>
        </div>

        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '6px',
          fontSize: '0.8rem',
          color: '#10b981',
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
            animation: 'pulse 2s infinite'
          }} />
          Live
        </div>
      </div>

      {/* TradingView Chart Container */}
      <div 
        ref={container}
        id={container_id}
        style={{
          height: `${height}px`,
          width: '100%',
          background: '#1a1a2e'
        }}
      >
        {/* Loading State */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          height: '100%',
          flexDirection: 'column',
          gap: '1rem',
          background: 'linear-gradient(135deg, #0a0a1a 0%, #1a1a2e 100%)'
        }}>
          <div style={{
            width: '40px',
            height: '40px',
            border: '3px solid rgba(102, 126, 234, 0.2)',
            borderTopColor: '#667eea',
            borderRadius: '50%',
            animation: 'spin 1s linear infinite'
          }} />
          <p style={{ 
            color: '#94a3b8', 
            fontSize: '1rem',
            margin: 0
          }}>
            Loading TradingView Chart...
          </p>
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

// Symbol selector component
export function ChartSymbolSelector({ 
  currentSymbol, 
  onSymbolChange 
}: { 
  currentSymbol: string
  onSymbolChange: (symbol: string) => void 
}) {
  const symbols = [
    { symbol: 'BINANCE:BTCUSDT', name: 'Bitcoin', code: 'BTC' },
    { symbol: 'BINANCE:ETHUSDT', name: 'Ethereum', code: 'ETH' },
    { symbol: 'BINANCE:BNBUSDT', name: 'BNB', code: 'BNB' },
    { symbol: 'BINANCE:ADAUSDT', name: 'Cardano', code: 'ADA' },
    { symbol: 'BINANCE:SOLUSDT', name: 'Solana', code: 'SOL' },
    { symbol: 'BINANCE:XRPUSDT', name: 'XRP', code: 'XRP' },
    { symbol: 'BINANCE:DOTUSDT', name: 'Polkadot', code: 'DOT' },
    { symbol: 'BINANCE:LINKUSDT', name: 'Chainlink', code: 'LINK' }
  ]

  return (
    <div style={{
      background: 'rgba(255, 255, 255, 0.05)',
      border: '1px solid rgba(255, 255, 255, 0.1)',
      borderRadius: '16px',
      padding: '1.5rem'
    }}>
      <h4 style={{
        fontSize: '1rem',
        fontWeight: 600,
        color: '#ffffff',
        margin: '0 0 1rem 0'
      }}>
        Select Trading Pair
      </h4>
      
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))',
        gap: '0.75rem'
      }}>
        {symbols.map((item) => (
          <button
            key={item.symbol}
            onClick={() => onSymbolChange(item.symbol)}
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: '0.5rem',
              background: currentSymbol === item.symbol 
                ? 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)'
                : 'rgba(255, 255, 255, 0.03)',
              border: currentSymbol === item.symbol
                ? '1px solid rgba(102, 126, 234, 0.3)'
                : '1px solid rgba(255, 255, 255, 0.08)',
              borderRadius: '10px',
              padding: '0.75rem',
              color: '#ffffff',
              cursor: 'pointer',
              transition: 'all 0.2s ease',
              fontSize: '0.85rem'
            }}
            onMouseEnter={(e) => {
              if (currentSymbol !== item.symbol) {
                const el = e.target as HTMLElement
                el.style.background = 'rgba(102, 126, 234, 0.1)'
                el.style.borderColor = 'rgba(102, 126, 234, 0.2)'
                el.style.transform = 'translateY(-1px)'
              }
            }}
            onMouseLeave={(e) => {
              if (currentSymbol !== item.symbol) {
                const el = e.target as HTMLElement
                el.style.background = 'rgba(255, 255, 255, 0.03)'
                el.style.borderColor = 'rgba(255, 255, 255, 0.08)'
                el.style.transform = 'translateY(0)'
              }
            }}
          >
            <div style={{
              fontWeight: 700,
              fontSize: '0.9rem'
            }}>
              {item.code}
            </div>
            <div style={{
              fontSize: '0.75rem',
              opacity: 0.8
            }}>
              {item.name}
            </div>
          </button>
        ))}
      </div>
    </div>
  )
}