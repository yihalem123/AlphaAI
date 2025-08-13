'use client'

/* eslint-disable @typescript-eslint/no-explicit-any */
/* @ts-nocheck */
import { useState } from 'react'
import { ChatInterface } from './chat-interface'
import { PortfolioView } from './portfolio-view'
import { SignalsView } from './signals-view'
import { MarketOverview } from './market-overview'
import { SubscriptionCard } from './subscription-card'
import { TradingViewChart, ChartSymbolSelector } from './tradingview-chart'
import { useAuth, usePermissions } from '@/components/auth-provider-secure'
import { SubscriptionUpgradeFlow } from '../subscription/subscription-upgrade-flow'

// Custom SVG Icons
const AIIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M9 12l2 2 4-4"/>
    <path d="M21 12c-1 0-2-1-2-2s1-2 2-2 2 1 2 2-1 2-2 2"/>
    <path d="M3 12c1 0 2-1 2-2s-1-2-2-2-2 1-2 2 1 2 2 2"/>
    <path d="M12 3c0 1-1 2-2 2s-2-1-2-2 1-2 2-2 2 1 2 2"/>
    <path d="M12 21c0-1 1-2 2-2s2 1 2 2-1 2-2 2-2-1-2-2"/>
  </svg>
)

const DashboardIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <rect x="3" y="3" width="7" height="7"/>
    <rect x="14" y="3" width="7" height="7"/>
    <rect x="14" y="14" width="7" height="7"/>
    <rect x="3" y="14" width="7" height="7"/>
  </svg>
)

const PortfolioIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M21.21 15.89A10 10 0 1 1 8 2.83"/>
    <path d="M22 12A10 10 0 0 0 12 2v10z"/>
  </svg>
)

const SignalsIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <polyline points="22,12 18,12 15,21 9,3 6,12 2,12"/>
  </svg>
)

const MarketIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M3 3v18h18"/>
    <path d="M18.7 8l-5.1 5.2-2.8-2.7L7 14.3"/>
  </svg>
)

const AnalyticsIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M3 3v18h18"/>
    <path d="M7 16l4-4 4 4 6-6"/>
    <circle cx="9" cy="9" r="2"/>
    <circle cx="15" cy="15" r="2"/>
  </svg>
)

const AlertsIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/>
    <path d="M13.73 21a2 2 0 0 1-3.46 0"/>
  </svg>
)

const SettingsIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <circle cx="12" cy="12" r="3"/>
    <path d="M12 1v6m0 6v6m11-7h-6m-6 0H1"/>
  </svg>
)

const MenuIcon = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <line x1="3" y1="6" x2="21" y2="6"/>
    <line x1="3" y1="12" x2="21" y2="12"/>
    <line x1="3" y1="18" x2="21" y2="18"/>
  </svg>
)

const XIcon = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <line x1="18" y1="6" x2="6" y2="18"/>
    <line x1="6" y1="6" x2="18" y2="18"/>
  </svg>
)

const UserIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
    <circle cx="12" cy="7" r="4"/>
  </svg>
)

const LogoutIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/>
    <polyline points="16,17 21,12 16,7"/>
    <line x1="21" y1="12" x2="9" y2="12"/>
  </svg>
)

const CrownIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M2 20h20l-2-6H4l-2 6z"/>
    <path d="M5 9l3-3 4 4 4-4 3 3"/>
  </svg>
)

const SparklesIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M9.937 15.5A2 2 0 0 0 8.5 14.063l-6.135-1.582a.5.5 0 0 1 0-.962L8.5 9.936A2 2 0 0 0 9.937 8.5l1.582-6.135a.5.5 0 0 1 .962 0L14.063 8.5A2 2 0 0 0 15.5 9.937l6.135 1.582a.5.5 0 0 1 0 .962L15.5 14.063a2 2 0 0 0-1.437 1.437l-1.582 6.135a.5.5 0 0 1-.962 0L9.937 15.5Z"/>
  </svg>
)

export function Dashboard() {
  const [activeView, setActiveView] = useState('ai-chat')
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [upgradeModalOpen, setUpgradeModalOpen] = useState(false)
  const { user, logout, isLoading } = useAuth()
  const { hasPermission, canAccess } = usePermissions()

  // Show loading state while checking authentication
  if (isLoading) {
    return (
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '100vh',
        background: 'linear-gradient(135deg, #0a0a1a 0%, #1a1a2e 30%, #16213e 70%, #0f0f23 100%)',
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
          <p style={{ color: '#94a3b8', fontSize: '1rem' }}>Loading Dashboard...</p>
        </div>
      </div>
    )
  }

  if (!user) return null

  const navigation = [
    { id: 'ai-chat', name: 'AI Assistant', icon: AIIcon, badge: 'AI' },
    { id: 'overview', name: 'Dashboard', icon: DashboardIcon },
    { id: 'portfolio', name: 'Portfolio', icon: PortfolioIcon },
    { id: 'signals', name: 'Trading Signals', icon: SignalsIcon, badge: 'NEW' },
    { id: 'charts', name: 'Trading Charts', icon: MarketIcon },
    { id: 'market', name: 'Market Data', icon: MarketIcon },
    { id: 'analytics', name: 'Analytics', icon: AnalyticsIcon },
    { id: 'alerts', name: 'Alerts', icon: AlertsIcon },
    { id: 'settings', name: 'Settings', icon: SettingsIcon }
  ]

  const isFreePlan = !user?.subscription_tier || user?.subscription_tier === 'free'
  const currentPage = navigation.find(item => item.id === activeView)

  const renderContent = () => {
    switch (activeView) {
      case 'ai-chat':
        return <EnhancedChatInterface user={user} />
      case 'overview':
        return <OverviewContent user={user} />
      case 'portfolio':
        return <PortfolioView />
      case 'signals':
        return <SignalsView />
      case 'charts':
        return <ChartsContent />
      case 'market':
        return <MarketOverview />
      case 'analytics':
        return <AnalyticsContent />
      case 'alerts':
        return <AlertsContent />
      case 'settings':
        return <SettingsContent user={user} />
      default:
        return <EnhancedChatInterface user={user} />
    }
  }

  return (
    <div style={{
      display: 'flex',
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #0a0a1a 0%, #1a1a2e 30%, #16213e 70%, #0f0f23 100%)',
      color: '#ffffff',
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
      position: 'relative'
    }}>
      {/* Background Decoration */}
      <div style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        background: `
          radial-gradient(circle at 20% 80%, rgba(102, 126, 234, 0.1) 0%, transparent 50%),
          radial-gradient(circle at 80% 20%, rgba(118, 75, 162, 0.1) 0%, transparent 50%),
          radial-gradient(circle at 40% 40%, rgba(67, 56, 202, 0.05) 0%, transparent 50%)
        `,
        pointerEvents: 'none',
        zIndex: -1
      }} />

      {/* Mobile Overlay */}
      {mobileMenuOpen && (
        <div 
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0, 0, 0, 0.7)',
            backdropFilter: 'blur(8px)',
            zIndex: 40
          }}
          onClick={() => setMobileMenuOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside style={{
        position: 'fixed',
        left: 0,
        top: 0,
        height: '100vh',
        width: sidebarCollapsed ? '80px' : '280px',
        background: 'rgba(10, 10, 26, 0.95)',
        backdropFilter: 'blur(30px)',
        borderRight: '1px solid rgba(102, 126, 234, 0.2)',
        display: 'flex',
        flexDirection: 'column',
        zIndex: 50,
        transform: mobileMenuOpen ? 'translateX(0)' : window.innerWidth < 1024 ? 'translateX(-100%)' : 'translateX(0)',
        transition: 'all 0.4s cubic-bezier(0.4, 0, 0.2, 1)',
        boxShadow: '0 0 50px rgba(102, 126, 234, 0.1)'
      }}>
        {/* Sidebar Header */}
        <div style={{
          padding: '1.5rem',
          borderBottom: '1px solid rgba(102, 126, 234, 0.15)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{ position: 'relative' }}>
              <div style={{
                width: '40px',
                height: '40px',
                background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                borderRadius: '12px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '1.2rem',
                boxShadow: '0 8px 25px rgba(102, 126, 234, 0.4)',
                animation: 'aiPulse 3s ease-in-out infinite'
              }}>
                🤖
              </div>
            </div>
            {!sidebarCollapsed && (
              <div style={{ display: 'flex', flexDirection: 'column' }}>
                <span style={{
                  fontSize: '1.1rem',
                  fontWeight: 700,
                  color: '#ffffff',
                  lineHeight: 1.2
                }}>AI Trading</span>
                <span style={{
                  fontSize: '0.8rem',
                  color: '#667eea',
                  lineHeight: 1.2,
                  fontWeight: 600
                }}>Professional</span>
              </div>
            )}
            </div>
            
          {window.innerWidth < 1024 && (
            <button 
              style={{
                background: 'transparent',
                border: 'none',
                color: '#94a3b8',
                cursor: 'pointer',
                padding: '8px',
                borderRadius: '8px',
                transition: 'all 0.2s ease'
              }}
              onClick={() => setMobileMenuOpen(false)}
            >
              <XIcon />
            </button>
          )}
              </div>
              
        {/* Navigation */}
        <nav style={{
          flex: 1,
          padding: '1rem',
          overflowY: 'auto'
        }}>
          {/* AI Tools Section */}
          <div style={{ marginBottom: '2rem' }}>
            <div style={{
              fontSize: '0.7rem',
              fontWeight: 700,
              color: '#667eea',
              textTransform: 'uppercase',
              letterSpacing: '1px',
              marginBottom: '0.75rem',
              padding: '0 1rem',
              display: sidebarCollapsed ? 'none' : 'flex',
              alignItems: 'center',
              gap: '8px'
            }}>
              <div style={{
                width: '12px',
                height: '2px',
                background: 'linear-gradient(90deg, #667eea, transparent)',
                borderRadius: '1px'
              }} />
              AI Tools
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
              {navigation.slice(0, 2).map((item) => (
                <button
                  key={item.id}
                  onClick={() => {
                    setActiveView(item.id)
                    setMobileMenuOpen(false)
                  }}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '12px',
                    padding: sidebarCollapsed ? '12px' : '12px 16px',
                    border: 'none',
                    background: activeView === item.id 
                      ? 'linear-gradient(135deg, rgba(102, 126, 234, 0.25) 0%, rgba(118, 75, 162, 0.25) 100%)'
                      : 'transparent',
                    color: activeView === item.id ? '#a5b4fc' : '#94a3b8',
                    borderRadius: '12px',
                    cursor: 'pointer',
                    transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                    fontSize: '0.95rem',
                    fontWeight: 500,
                    position: 'relative',
                    width: '100%',
                    textAlign: 'left',
                    justifyContent: sidebarCollapsed ? 'center' : 'flex-start',
                    border: activeView === item.id ? '1px solid rgba(102, 126, 234, 0.3)' : '1px solid transparent',
                    transform: activeView === item.id ? 'translateX(4px)' : 'translateX(0)'
                  }}
                  onMouseEnter={(e) => {
                    if (activeView !== item.id) {
                      e.target.style.background = 'rgba(102, 126, 234, 0.1)'
                      e.target.style.color = '#ffffff'
                      e.target.style.transform = 'translateX(4px)'
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (activeView !== item.id) {
                      e.target.style.background = 'transparent'
                      e.target.style.color = '#94a3b8'
                      e.target.style.transform = 'translateX(0)'
                    }
                  }}
                >
                  <item.icon />
                  {!sidebarCollapsed && (
                    <>
                      <span>{item.name}</span>
                      {item.badge && (
                        <span style={{
                          marginLeft: 'auto',
                          padding: '2px 6px',
                          borderRadius: '6px',
                          fontSize: '0.65rem',
                          fontWeight: 700,
                          textTransform: 'uppercase',
                          letterSpacing: '0.5px',
                          background: item.badge === 'AI' 
                            ? 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)'
                            : 'linear-gradient(135deg, #10b981 0%, #34d399 100%)',
                          color: '#ffffff',
                          animation: item.badge === 'AI' ? 'aiPulse 2s ease-in-out infinite' : 'none'
                        }}>
                          {item.badge}
                  </span>
                      )}
                    </>
                  )}
                  {activeView === item.id && (
                    <div style={{
                      position: 'absolute',
                      right: '8px',
                      width: '4px',
                      height: '4px',
                      background: '#667eea',
                      borderRadius: '50%',
                      boxShadow: '0 0 8px #667eea'
                    }} />
                  )}
                </button>
              ))}
                </div>
              </div>

          {/* Trading Section */}
          <div style={{ marginBottom: '2rem' }}>
            <div style={{
              fontSize: '0.7rem',
              fontWeight: 700,
              color: '#667eea',
              textTransform: 'uppercase',
              letterSpacing: '1px',
              marginBottom: '0.75rem',
              padding: '0 1rem',
              display: sidebarCollapsed ? 'none' : 'flex',
              alignItems: 'center',
              gap: '8px'
            }}>
              <div style={{
                width: '12px',
                height: '2px',
                background: 'linear-gradient(90deg, #667eea, transparent)',
                borderRadius: '1px'
              }} />
              Trading
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
              {navigation.slice(2, 7).map((item) => (
                <button
                  key={item.id}
                  onClick={() => {
                    setActiveView(item.id)
                    setMobileMenuOpen(false)
                  }}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '12px',
                    padding: sidebarCollapsed ? '12px' : '12px 16px',
                    border: 'none',
                    background: activeView === item.id 
                      ? 'linear-gradient(135deg, rgba(102, 126, 234, 0.25) 0%, rgba(118, 75, 162, 0.25) 100%)'
                      : 'transparent',
                    color: activeView === item.id ? '#a5b4fc' : '#94a3b8',
                    borderRadius: '12px',
                    cursor: 'pointer',
                    transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                    fontSize: '0.95rem',
                    fontWeight: 500,
                    position: 'relative',
                    width: '100%',
                    textAlign: 'left',
                    justifyContent: sidebarCollapsed ? 'center' : 'flex-start',
                    border: activeView === item.id ? '1px solid rgba(102, 126, 234, 0.3)' : '1px solid transparent',
                    transform: activeView === item.id ? 'translateX(4px)' : 'translateX(0)'
                  }}
                  onMouseEnter={(e) => {
                    if (activeView !== item.id) {
                      e.target.style.background = 'rgba(102, 126, 234, 0.1)'
                      e.target.style.color = '#ffffff'
                      e.target.style.transform = 'translateX(4px)'
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (activeView !== item.id) {
                      e.target.style.background = 'transparent'
                      e.target.style.color = '#94a3b8'
                      e.target.style.transform = 'translateX(0)'
                    }
                  }}
                >
                  <item.icon />
                  {!sidebarCollapsed && (
                    <>
                      <span>{item.name}</span>
                      {item.badge && (
                        <span style={{
                          marginLeft: 'auto',
                          padding: '2px 6px',
                          borderRadius: '6px',
                          fontSize: '0.65rem',
                          fontWeight: 700,
                          textTransform: 'uppercase',
                          letterSpacing: '0.5px',
                          background: item.badge === 'AI' 
                            ? 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)'
                            : 'linear-gradient(135deg, #10b981 0%, #34d399 100%)',
                          color: '#ffffff'
                        }}>
                          {item.badge}
                        </span>
                      )}
                    </>
                  )}
                  {activeView === item.id && (
                    <div style={{
                      position: 'absolute',
                      right: '8px',
                      width: '4px',
                      height: '4px',
                      background: '#667eea',
                      borderRadius: '50%',
                      boxShadow: '0 0 8px #667eea'
                    }} />
                  )}
                </button>
              ))}
          </div>
        </div>

                    {/* System Section */}
                <div>
            <div style={{
              fontSize: '0.7rem',
              fontWeight: 700,
              color: '#667eea',
              textTransform: 'uppercase',
              letterSpacing: '1px',
              marginBottom: '0.75rem',
              padding: '0 1rem',
              display: sidebarCollapsed ? 'none' : 'flex',
              alignItems: 'center',
              gap: '8px'
            }}>
              <div style={{
                width: '12px',
                height: '2px',
                background: 'linear-gradient(90deg, #667eea, transparent)',
                borderRadius: '1px'
              }} />
              System
                </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
              {navigation.slice(7).map((item) => (
                <button
                  key={item.id}
                  onClick={() => {
                    setActiveView(item.id)
                    setMobileMenuOpen(false)
                  }}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '12px',
                    padding: sidebarCollapsed ? '12px' : '12px 16px',
                    border: 'none',
                    background: activeView === item.id 
                      ? 'linear-gradient(135deg, rgba(102, 126, 234, 0.25) 0%, rgba(118, 75, 162, 0.25) 100%)'
                      : 'transparent',
                    color: activeView === item.id ? '#a5b4fc' : '#94a3b8',
                    borderRadius: '12px',
                    cursor: 'pointer',
                    transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                    fontSize: '0.95rem',
                    fontWeight: 500,
                    position: 'relative',
                    width: '100%',
                    textAlign: 'left',
                    justifyContent: sidebarCollapsed ? 'center' : 'flex-start',
                    border: activeView === item.id ? '1px solid rgba(102, 126, 234, 0.3)' : '1px solid transparent',
                    transform: activeView === item.id ? 'translateX(4px)' : 'translateX(0)'
                  }}
                  onMouseEnter={(e) => {
                    if (activeView !== item.id) {
                      e.target.style.background = 'rgba(102, 126, 234, 0.1)'
                      e.target.style.color = '#ffffff'
                      e.target.style.transform = 'translateX(4px)'
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (activeView !== item.id) {
                      e.target.style.background = 'transparent'
                      e.target.style.color = '#94a3b8'
                      e.target.style.transform = 'translateX(0)'
                    }
                  }}
                >
                  <item.icon />
                  {!sidebarCollapsed && <span>{item.name}</span>}
                  {activeView === item.id && (
                    <div style={{
                      position: 'absolute',
                      right: '8px',
                      width: '4px',
                      height: '4px',
                      background: '#667eea',
                      borderRadius: '50%',
                      boxShadow: '0 0 8px #667eea'
                    }} />
                  )}
                </button>
              ))}
                </div>
              </div>
        </nav>

        {/* User Profile */}
        <div style={{
          padding: '1rem',
          borderTop: '1px solid rgba(102, 126, 234, 0.15)',
          display: 'flex',
          flexDirection: 'column',
          gap: '12px'
        }}>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            padding: '12px',
            background: 'rgba(102, 126, 234, 0.08)',
            borderRadius: '12px',
            border: '1px solid rgba(102, 126, 234, 0.2)'
          }}>
            <div style={{
              width: '36px',
              height: '36px',
              background: 'linear-gradient(135deg, #10b981 0%, #34d399 100%)',
              borderRadius: '50%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#ffffff',
              flexShrink: 0,
              boxShadow: '0 4px 15px rgba(16, 185, 129, 0.3)'
            }}>
              <UserIcon />
                </div>
            {!sidebarCollapsed && (
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{
                  fontSize: '0.9rem',
                  fontWeight: 600,
                  color: '#ffffff',
                  lineHeight: 1.2,
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis'
                }}>
                  {user?.username || 'User'}
                </div>
                <div style={{
                  fontSize: '0.75rem',
                  lineHeight: 1.2,
                  fontWeight: 600,
                  color: isFreePlan ? '#94a3b8' : '#fbbf24'
                }}>
                  {user?.subscription_tier || 'Free'} Plan
              </div>
              </div>
            )}
          </div>
          
          <button 
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
              padding: '10px 12px',
              border: 'none',
              background: 'transparent',
              color: '#94a3b8',
              borderRadius: '8px',
              cursor: 'pointer',
              transition: 'all 0.2s ease',
              fontSize: '0.85rem',
              width: '100%',
              justifyContent: sidebarCollapsed ? 'center' : 'flex-start'
            }}
            onClick={logout}
            onMouseEnter={(e) => {
              e.target.style.background = 'rgba(239, 68, 68, 0.15)'
              e.target.style.color = '#ef4444'
            }}
            onMouseLeave={(e) => {
              e.target.style.background = 'transparent'
              e.target.style.color = '#94a3b8'
            }}
          >
            <LogoutIcon />
            {!sidebarCollapsed && <span>Logout</span>}
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main style={{
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        marginLeft: window.innerWidth >= 1024 ? (sidebarCollapsed ? '80px' : '280px') : '0',
        transition: 'margin-left 0.4s cubic-bezier(0.4, 0, 0.2, 1)',
        minWidth: 0,
        width: `calc(100% - ${window.innerWidth >= 1024 ? (sidebarCollapsed ? '80px' : '280px') : '0px'})`
      }}>
        {/* Header */}
        <header style={{
          background: 'rgba(10, 10, 26, 0.95)',
          backdropFilter: 'blur(30px)',
          borderBottom: '1px solid rgba(102, 126, 234, 0.2)',
          padding: '1rem 2rem',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          position: 'relative',
          zIndex: 10,
          gap: '1rem',
          boxShadow: '0 4px 20px rgba(0, 0, 0, 0.1)',
          height: '70px',
          flexShrink: 0
        }}>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '1rem',
            flex: 1,
            minWidth: 0
          }}>
            {window.innerWidth < 1024 && (
              <button 
                style={{
                  background: 'rgba(102, 126, 234, 0.1)',
                  border: '1px solid rgba(102, 126, 234, 0.2)',
                  color: '#94a3b8',
                  cursor: 'pointer',
                  padding: '8px',
                  borderRadius: '8px',
                  transition: 'all 0.2s ease',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0
                }}
                onClick={() => setMobileMenuOpen(true)}
                onMouseEnter={(e) => {
                  e.target.style.background = 'rgba(102, 126, 234, 0.2)'
                  e.target.style.color = '#ffffff'
                }}
                onMouseLeave={(e) => {
                  e.target.style.background = 'rgba(102, 126, 234, 0.1)'
                  e.target.style.color = '#94a3b8'
                }}
              >
                <MenuIcon />
              </button>
            )}
            
            {window.innerWidth >= 1024 && (
              <button 
                style={{
                  background: 'rgba(102, 126, 234, 0.1)',
                  border: '1px solid rgba(102, 126, 234, 0.2)',
                  color: '#94a3b8',
                  cursor: 'pointer',
                  padding: '8px',
                  borderRadius: '8px',
                  transition: 'all 0.2s ease',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0
                }}
                onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
                onMouseEnter={(e) => {
                  e.target.style.background = 'rgba(102, 126, 234, 0.2)'
                  e.target.style.color = '#ffffff'
                }}
                onMouseLeave={(e) => {
                  e.target.style.background = 'rgba(102, 126, 234, 0.1)'
                  e.target.style.color = '#94a3b8'
                }}
              >
                <MenuIcon />
              </button>
            )}

            <div style={{ minWidth: 0, flex: 1 }}>
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                marginBottom: '2px'
              }}>
                <div style={{ color: '#667eea', flexShrink: 0 }}>
                  {currentPage?.icon && <currentPage.icon />}
                </div>
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  minWidth: 0
                }}>
                  <h1 style={{
                    fontSize: '1.4rem',
                    fontWeight: 700,
                    color: '#ffffff',
                    margin: 0,
                    lineHeight: 1.2,
                    whiteSpace: 'nowrap',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis'
                  }}>
                    {currentPage?.name || 'Dashboard'}
                  </h1>
                  {currentPage?.badge && (
                    <span style={{
                      padding: '2px 6px',
                      borderRadius: '6px',
                      fontSize: '0.65rem',
                      fontWeight: 700,
                      textTransform: 'uppercase',
                      letterSpacing: '0.5px',
                      flexShrink: 0,
                      background: currentPage.badge === 'AI' 
                        ? 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)'
                        : 'linear-gradient(135deg, #10b981 0%, #34d399 100%)',
                      color: '#ffffff'
                    }}>
                      {currentPage.badge}
                    </span>
                  )}
                </div>
              </div>
              <p style={{
                fontSize: '0.85rem',
                color: '#94a3b8',
                margin: 0,
                lineHeight: 1.2,
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis'
              }}>
                {activeView === 'ai-chat' ? 'Your intelligent trading assistant is ready to help' : `Welcome back, ${user?.username || 'User'}!`}
                  </p>
                </div>
                </div>

          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '1rem',
            flexShrink: 0
          }}>
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
            
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
              padding: '6px 10px',
              borderRadius: '8px',
              fontSize: '0.8rem',
              fontWeight: 600,
              whiteSpace: 'nowrap',
              background: isFreePlan 
                ? 'rgba(148, 163, 184, 0.2)'
                : 'linear-gradient(135deg, rgba(251, 191, 36, 0.2) 0%, rgba(245, 158, 11, 0.2) 100%)',
              color: isFreePlan ? '#94a3b8' : '#fbbf24',
              border: `1px solid ${isFreePlan ? 'rgba(148, 163, 184, 0.3)' : 'rgba(251, 191, 36, 0.3)'}`
            }}>
              <span>{user?.subscription_tier || 'Free'}</span>
              {!isFreePlan && <CrownIcon />}
            </div>
          </div>
        </header>

        {/* Content Area */}
        <div style={{
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden'
        }}>
          {/* Upgrade Banner for Free Users */}
          {isFreePlan && (
            <div style={{ padding: '1.5rem 2rem 0 2rem' }}>
              <div style={{
                background: 'linear-gradient(135deg, rgba(251, 191, 36, 0.15) 0%, rgba(245, 158, 11, 0.15) 100%)',
                border: '1px solid rgba(251, 191, 36, 0.3)',
                borderRadius: '16px',
                padding: '1.25rem 1.5rem',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: '1rem',
                position: 'relative',
                overflow: 'hidden'
              }}>
                <div style={{
                  position: 'absolute',
                  top: '-50%',
                  left: '-50%',
                  width: '200%',
                  height: '200%',
                  background: 'linear-gradient(45deg, transparent, rgba(251, 191, 36, 0.1), transparent)',
                  animation: 'upgradeShimmer 3s ease-in-out infinite'
                }} />
                
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '1rem',
                  flex: 1,
                  minWidth: 0,
                  position: 'relative',
                  zIndex: 1
                }}>
                  <CrownIcon style={{ color: '#fbbf24', flexShrink: 0 }} />
                <div>
                    <h3 style={{
                      color: '#ffffff',
                      fontSize: '1rem',
                      fontWeight: 700,
                      margin: '0 0 0.25rem 0',
                      lineHeight: 1.2
                    }}>
                      Upgrade to Pro
                    </h3>
                    <p style={{
                      color: '#cbd5e1',
                      fontSize: '0.85rem',
                      margin: 0,
                      lineHeight: 1.3
                    }}>
                      Unlock unlimited AI queries, advanced analytics, and premium features
                  </p>
                </div>
                </div>
                
                <button style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  background: 'linear-gradient(135deg, #fbbf24 0%, #f59e0b 100%)',
                  color: '#000000',
                  border: 'none',
                  borderRadius: '10px',
                  padding: '10px 16px',
                  fontSize: '0.85rem',
                  fontWeight: 600,
                  cursor: 'pointer',
                  transition: 'all 0.2s ease',
                  flexShrink: 0,
                  position: 'relative',
                  zIndex: 1
                }}
                                 onMouseEnter={(e) => {
                   e.target.style.transform = 'translateY(-2px)'
                   e.target.style.boxShadow = '0 8px 25px rgba(251, 191, 36, 0.4)'
                 }}
                 onMouseLeave={(e) => {
                   e.target.style.transform = 'translateY(0)'
                   e.target.style.boxShadow = 'none'
                 }}
                 onClick={() => setUpgradeModalOpen(true)}
                 >
                  <SparklesIcon />
                  <span>Upgrade Now</span>
                </button>
              </div>
        </div>
          )}

          {/* Page Content */}
          <div style={{
            flex: 1,
            padding: '2rem',
            overflow: 'auto',
            maxWidth: '100%',
            paddingTop: '2rem'
          }}>
            {renderContent()}
          </div>
        </div>
      </main>

      {/* Keyframes and animations */}
      <style jsx>{`
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.5; }
        }

        @keyframes aiPulse {
          0%, 100% { 
            box-shadow: 0 8px 25px rgba(102, 126, 234, 0.4);
          }
          50% { 
            box-shadow: 0 8px 35px rgba(102, 126, 234, 0.6);
          }
        }

        @keyframes upgradeShimmer {
          0% { transform: translateX(-100%) translateY(-100%) rotate(45deg); }
          100% { transform: translateX(100%) translateY(100%) rotate(45deg); }
        }
      `}</style>

        {/* Subscription Upgrade Flow */}
        <SubscriptionUpgradeFlow 
          isOpen={upgradeModalOpen}
          onClose={() => setUpgradeModalOpen(false)}
          onSuccess={(subscriptionData) => {
            console.log('Subscription successful:', subscriptionData)
            setUpgradeModalOpen(false)
            // Show success notification or refresh user data
          }}
        />
                </div>
  )
}

// Enhanced AI Chat Interface
function EnhancedChatInterface({ user }: { user: any }) {
  const [messages, setMessages] = useState([
    {
      role: 'assistant',
      content: "Hello! I'm your AI Trading Assistant. I can help you with market analysis, trading signals, portfolio optimization, and answer any crypto-related questions. What would you like to know?",
      timestamp: new Date()
    }
  ])
  const [inputMessage, setInputMessage] = useState('')
  const [isLoading, setIsLoading] = useState(false)

  const sendMessage = async () => {
    if (!inputMessage.trim() || isLoading) return

    const userMessage = {
      role: 'user',
      content: inputMessage,
      timestamp: new Date()
    }

    setMessages(prev => [...prev, userMessage])
    setInputMessage('')
    setIsLoading(true)

    try {
      const token = localStorage.getItem('auth_token')
      if (!token) {
        throw new Error('Authentication required')
      }

      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'}/api/ai/chat`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          message: userMessage.content,
          context: 'trading_assistant' // Specify that this is for trading assistance
        })
      })

      if (response.ok) {
        const data = await response.json()
        const assistantMessage = {
          role: 'assistant',
          content: data.response || data.message || "I'm here to help with your trading questions!",
          timestamp: new Date()
        }
        setMessages(prev => [...prev, assistantMessage])
      } else if (response.status === 401) {
        localStorage.removeItem('auth_token')
        throw new Error('Session expired. Please login again.')
      } else {
        throw new Error(`Failed to get AI response: ${response.status}`)
      }
    } catch (error) {
      console.error('Failed to send message:', error)
      
      // Fallback to simulated response
      const fallbackResponses = [
        "Based on current market analysis, I'm seeing strong bullish momentum in the crypto market. Bitcoin is showing signs of breaking through the $45,000 resistance level.",
        "The Fear & Greed Index is currently at 76, indicating 'Greed' in the market. This suggests investors are optimistic, but we should watch for potential corrections.",
        "Your portfolio allocation looks well-diversified. Consider taking some profits on your SOL position given its recent 18% gains.",
        "Market volume has increased by 23% in the last 24 hours, indicating strong institutional interest. This is typically a bullish signal.",
        "Based on technical analysis, ETH is forming an ascending triangle pattern. A breakout above $2,700 could signal a move towards $3,000."
      ]
      
      const assistantMessage = {
        role: 'assistant',
        content: fallbackResponses[Math.floor(Math.random() * fallbackResponses.length)] + " (Demo mode - connect to backend for real AI responses)",
        timestamp: new Date()
      }
      
      setMessages(prev => [...prev, assistantMessage])
    } finally {
      setIsLoading(false)
    }
  }

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
  }

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      gap: '1.5rem',
      height: '100%',
      maxWidth: '100%'
    }}>
      {/* AI Header */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: '1.5rem',
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
          animation: 'aiScan 3s ease-in-out infinite'
        }} />

        <div style={{ position: 'relative', flexShrink: 0 }}>
          <div style={{
            width: '60px',
            height: '60px',
            background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
            borderRadius: '20px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '1.8rem',
            boxShadow: '0 8px 25px rgba(102, 126, 234, 0.4)',
            animation: 'aiPulse 3s ease-in-out infinite',
            border: '2px solid rgba(255, 255, 255, 0.1)'
          }}>
            🤖
              </div>
          <div style={{
            position: 'absolute',
            bottom: '4px',
            right: '4px',
            width: '14px',
            height: '14px',
            background: '#10b981',
            borderRadius: '50%',
            border: '3px solid rgba(10, 10, 26, 0.9)',
            animation: 'pulse 2s infinite',
            boxShadow: '0 0 8px #10b981'
          }} />
        </div>

        <div style={{ flex: 1, minWidth: 0 }}>
          <h2 style={{
            fontSize: '1.5rem',
            fontWeight: 700,
            color: '#ffffff',
            margin: '0 0 0.5rem 0',
            background: 'linear-gradient(135deg, #ffffff 0%, #a5b4fc 100%)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            backgroundClip: 'text'
          }}>
            AI Trading Assistant
          </h2>
          <p style={{
            color: '#94a3b8',
            margin: 0,
            fontSize: '0.9rem',
            lineHeight: 1.4
          }}>
            Your intelligent trading companion • Online • Ready to help with analysis, signals, and insights
                  </p>
                </div>

        <div style={{
          display: 'flex',
          gap: '2rem',
          flexShrink: 0
        }}>
          <div style={{ textAlign: 'center' }}>
            <div style={{
              display: 'block',
              fontSize: '1.5rem',
              fontWeight: 800,
              color: '#667eea',
              lineHeight: 1
            }}>
              {user?.api_calls_count || 0}
                </div>
            <div style={{
              display: 'block',
              fontSize: '0.75rem',
              color: '#94a3b8',
              marginTop: '0.25rem',
              textTransform: 'uppercase',
              letterSpacing: '0.5px'
            }}>
              Queries Today
              </div>
          </div>
          <div style={{ textAlign: 'center' }}>
            <div style={{
              display: 'block',
              fontSize: '1.5rem',
              fontWeight: 800,
              color: '#667eea',
              lineHeight: 1
            }}>
              {(user?.daily_limit || 10) - (user?.api_calls_count || 0)}
            </div>
            <div style={{
              display: 'block',
              fontSize: '0.75rem',
              color: '#94a3b8',
              marginTop: '0.25rem',
              textTransform: 'uppercase',
              letterSpacing: '0.5px'
            }}>
              Remaining
            </div>
          </div>
        </div>
        </div>

      {/* Chat Interface */}
      <div style={{
        flex: 1,
        background: 'linear-gradient(135deg, rgba(255, 255, 255, 0.08) 0%, rgba(255, 255, 255, 0.03) 100%)',
        border: '1px solid rgba(255, 255, 255, 0.15)',
        borderRadius: '20px',
        overflow: 'hidden',
        display: 'flex',
        flexDirection: 'column',
        minHeight: '500px'
      }}>
        {/* Chat Header */}
        <div style={{
          padding: '1.5rem 2rem',
          borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
          background: 'rgba(255, 255, 255, 0.05)'
        }}>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between'
          }}>
            <h3 style={{
              fontSize: '1.1rem',
              fontWeight: 700,
              color: '#ffffff',
              margin: 0
            }}>
              AI Chat
            </h3>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              fontSize: '0.8rem',
              color: '#10b981'
            }}>
              <div style={{
                width: '6px',
                height: '6px',
                borderRadius: '50%',
                background: '#10b981',
                animation: 'pulse 2s infinite'
              }} />
              Active
            </div>
          </div>
        </div>

        {/* Messages */}
        <div style={{
          flex: 1,
          padding: '1.5rem 2rem',
          overflowY: 'auto',
          display: 'flex',
          flexDirection: 'column',
          gap: '1.5rem'
        }}>
          {messages.map((message, index) => (
            <div key={index} style={{
              display: 'flex',
              gap: '1rem',
              alignItems: 'flex-start'
            }}>
              {message.role === 'assistant' && (
                <div style={{
                  width: '32px',
                  height: '32px',
                  background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                  borderRadius: '8px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '0.9rem',
                  flexShrink: 0,
                  boxShadow: '0 4px 15px rgba(102, 126, 234, 0.3)'
                }}>
                  🤖
                </div>
              )}
              
              <div style={{
                flex: 1,
                display: 'flex',
                flexDirection: 'column',
                gap: '0.5rem',
                alignItems: message.role === 'user' ? 'flex-end' : 'flex-start'
              }}>
                <div style={{
                  background: message.role === 'user' 
                    ? 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)'
                    : 'rgba(255, 255, 255, 0.08)',
                  color: '#ffffff',
                  padding: '1rem 1.5rem',
                  borderRadius: '16px',
                  maxWidth: '80%',
                  border: message.role === 'assistant' ? '1px solid rgba(255, 255, 255, 0.1)' : 'none',
                  boxShadow: message.role === 'user' ? '0 4px 15px rgba(102, 126, 234, 0.3)' : 'none',
                  fontSize: '0.9rem',
                  lineHeight: 1.6
                }}>
                  {message.content}
                </div>
                <div style={{
                  fontSize: '0.75rem',
                  color: '#94a3b8',
                  paddingLeft: message.role === 'assistant' ? '0.5rem' : '0',
                  paddingRight: message.role === 'user' ? '0.5rem' : '0'
                }}>
                  {formatTime(message.timestamp)}
                </div>
              </div>

              {message.role === 'user' && (
                <div style={{
                  width: '32px',
                  height: '32px',
                  background: 'linear-gradient(135deg, #10b981 0%, #34d399 100%)',
                  borderRadius: '8px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '0.9rem',
                  flexShrink: 0,
                  boxShadow: '0 4px 15px rgba(16, 185, 129, 0.3)'
                }}>
                  👤
                </div>
              )}
            </div>
          ))}

          {isLoading && (
            <div style={{
              display: 'flex',
              gap: '1rem',
              alignItems: 'flex-start'
            }}>
              <div style={{
                width: '32px',
                height: '32px',
                background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                borderRadius: '8px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '0.9rem',
                flexShrink: 0,
                boxShadow: '0 4px 15px rgba(102, 126, 234, 0.3)'
              }}>
                🤖
              </div>
              
              <div style={{
                background: 'rgba(255, 255, 255, 0.08)',
                border: '1px solid rgba(255, 255, 255, 0.1)',
                borderRadius: '16px',
                padding: '1rem 1.5rem',
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem'
              }}>
                <div style={{
                  display: 'flex',
                  gap: '4px'
                }}>
                  {[0, 1, 2].map(i => (
                    <div key={i} style={{
                      width: '6px',
                      height: '6px',
                      borderRadius: '50%',
                      background: '#667eea',
                      animation: `typing 1.4s ease-in-out infinite ${i * 0.2}s`
                    }} />
                  ))}
                </div>
                <span style={{ color: '#94a3b8', fontSize: '0.85rem' }}>AI is thinking...</span>
              </div>
            </div>
          )}
        </div>

        {/* Input */}
        <div style={{
          padding: '1.5rem 2rem',
          borderTop: '1px solid rgba(255, 255, 255, 0.1)',
          background: 'rgba(255, 255, 255, 0.03)'
        }}>
          <div style={{
            display: 'flex',
            gap: '1rem',
            alignItems: 'center'
          }}>
            <input
              type="text"
              value={inputMessage}
              onChange={(e) => setInputMessage(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && sendMessage()}
              placeholder="Ask me about market trends, trading signals, or portfolio advice..."
              style={{
                flex: 1,
                background: 'rgba(255, 255, 255, 0.05)',
                border: '1px solid rgba(255, 255, 255, 0.15)',
                borderRadius: '12px',
                padding: '12px 16px',
                color: '#ffffff',
                fontSize: '0.9rem',
                outline: 'none',
                transition: 'all 0.2s ease'
              }}
              onFocus={(e) => {
                e.target.style.borderColor = 'rgba(102, 126, 234, 0.4)'
                e.target.style.background = 'rgba(255, 255, 255, 0.08)'
              }}
              onBlur={(e) => {
                e.target.style.borderColor = 'rgba(255, 255, 255, 0.15)'
                e.target.style.background = 'rgba(255, 255, 255, 0.05)'
              }}
            />
            <button
              onClick={sendMessage}
              disabled={!inputMessage.trim() || isLoading}
              style={{
                background: inputMessage.trim() && !isLoading
                  ? 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)'
                  : 'rgba(255, 255, 255, 0.1)',
                color: '#ffffff',
                border: 'none',
                borderRadius: '12px',
                padding: '12px 20px',
                fontSize: '0.9rem',
                fontWeight: 600,
                cursor: inputMessage.trim() && !isLoading ? 'pointer' : 'not-allowed',
                transition: 'all 0.2s ease',
                opacity: inputMessage.trim() && !isLoading ? 1 : 0.5
              }}
              onMouseEnter={(e) => {
                if (inputMessage.trim() && !isLoading) {
                  e.target.style.transform = 'translateY(-1px)'
                  e.target.style.boxShadow = '0 6px 20px rgba(102, 126, 234, 0.4)'
                }
              }}
              onMouseLeave={(e) => {
                if (inputMessage.trim() && !isLoading) {
                  e.target.style.transform = 'translateY(0)'
                  e.target.style.boxShadow = 'none'
                }
              }}
            >
              {isLoading ? 'Sending...' : 'Send'}
            </button>
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div style={{
        background: 'rgba(255, 255, 255, 0.05)',
        border: '1px solid rgba(255, 255, 255, 0.1)',
        borderRadius: '16px',
        padding: '1.5rem'
      }}>
        <h3 style={{
          fontSize: '1.1rem',
          fontWeight: 600,
          color: '#ffffff',
          margin: '0 0 1rem 0'
        }}>
          Quick Actions:
        </h3>
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
          gap: '0.75rem'
        }}>
          {[
            { icon: '📊', title: 'Analyze My Portfolio', query: 'Analyze my current portfolio and suggest optimizations' },
            { icon: '🎯', title: 'Generate Trading Signal', query: 'Generate a trading signal for BTC based on current market conditions' },
            { icon: '📈', title: 'Market Outlook', query: 'What is the current market outlook for cryptocurrencies?' },
            { icon: '💡', title: 'Investment Strategy', query: 'Suggest an investment strategy for the current market conditions' }
          ].map((action, index) => (
            <button key={index} 
              onClick={() => setInputMessage(action.query)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.75rem',
                background: 'rgba(255, 255, 255, 0.03)',
                border: '1px solid rgba(255, 255, 255, 0.08)',
                borderRadius: '10px',
                padding: '0.75rem 1rem',
                color: '#ffffff',
                cursor: 'pointer',
                transition: 'all 0.2s ease',
                textAlign: 'left',
                fontSize: '0.85rem'
              }}
              onMouseEnter={(e) => {
                e.target.style.background = 'rgba(102, 126, 234, 0.1)'
                e.target.style.borderColor = 'rgba(102, 126, 234, 0.2)'
                e.target.style.transform = 'translateY(-1px)'
              }}
              onMouseLeave={(e) => {
                e.target.style.background = 'rgba(255, 255, 255, 0.03)'
                e.target.style.borderColor = 'rgba(255, 255, 255, 0.08)'
                e.target.style.transform = 'translateY(0)'
              }}
            >
              <span style={{ fontSize: '1.1rem' }}>{action.icon}</span>
              <span>{action.title}</span>
            </button>
          ))}
        </div>
      </div>

      <style jsx>{`
        @keyframes aiScan {
          0%, 100% { transform: translateX(-100%); opacity: 0; }
          50% { opacity: 1; }
        }

        @keyframes aiPulse {
          0%, 100% { 
            box-shadow: 0 8px 25px rgba(102, 126, 234, 0.4);
          }
          50% { 
            box-shadow: 0 8px 35px rgba(102, 126, 234, 0.6);
          }
        }

        @keyframes typing {
          0%, 60%, 100% { transform: translateY(0); }
          30% { transform: translateY(-10px); }
        }

        input::placeholder {
          color: rgba(148, 163, 184, 0.7);
        }

        @media (max-width: 768px) {
          .ai-header {
            flex-direction: column;
            text-align: center;
            gap: 1rem;
          }
        }
      `}</style>
    </div>
  )
}

// Charts Content Component
function ChartsContent() {
  const [selectedSymbol, setSelectedSymbol] = useState('BINANCE:BTCUSDT')

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      gap: '2rem',
      maxWidth: '100%'
    }}>
      {/* Charts Header */}
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
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M3 3v18h18"/>
              <path d="M7 16l4-4 4 4 6-6"/>
            </svg>
            Professional Trading Charts
          </h2>
          <p style={{
            color: '#94a3b8',
            margin: 0,
            fontSize: '0.9rem'
          }}>
            Advanced technical analysis with TradingView integration
          </p>
            </div>
          </div>

      {/* Chart Symbol Selector */}
      <ChartSymbolSelector 
        currentSymbol={selectedSymbol}
        onSymbolChange={setSelectedSymbol}
      />

      {/* Main Trading Chart */}
      <TradingViewChart 
        symbol={selectedSymbol}
        height={600}
        theme="dark"
      />

      {/* Additional Charts Row */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: window.innerWidth >= 1024 ? '1fr 1fr' : '1fr',
        gap: '1.5rem'
      }}>
        <TradingViewChart 
          symbol="BINANCE:ETHUSDT"
          height={300}
          theme="dark"
          container_id="chart_eth"
        />
        <TradingViewChart 
          symbol="BINANCE:BNBUSDT"
          height={300}
          theme="dark"
          container_id="chart_bnb"
        />
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

// Other content components...
function OverviewContent({ user }: { user: any }) {
  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      gap: '1.5rem',
      maxWidth: '100%'
    }}>
      {/* Stats Grid */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
        gap: '1.5rem'
      }}>
        <StatCard
          title="Portfolio Value"
          value="$45,231.89"
          change="+20.1%"
          changeType="positive"
          icon="💰"
        />
        <StatCard
          title="24h P&L"
          value="+$5,654.32"
          change="+12.5%"
          changeType="positive"
          icon="📈"
        />
        <StatCard
          title="API Calls Today"
          value={user?.api_calls_count || 0}
          change={`${(user?.daily_limit || 10) - (user?.api_calls_count || 0)} remaining`}
          changeType="neutral"
          icon="⚡"
        />
        <StatCard
          title="Win Rate"
          value="87.3%"
          change="Last 30 days"
          changeType="positive"
          icon="🎯"
        />
      </div>

      {/* Main Grid */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: window.innerWidth >= 1024 ? '2fr 1fr' : '1fr',
        gap: '1.5rem'
      }}>
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          gap: '1.5rem'
        }}>
          <ChartCard />
          <RecentActivity />
        </div>
        
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          gap: '1.5rem'
        }}>
              <SubscriptionCard />
          <QuickActions />
          <MarketPulse />
        </div>
      </div>
    </div>
  )
}

// Continue with other components with proper spacing...
function StatCard({ title, value, change, changeType, icon }: {
  title: string
  value: string | number
  change: string
  changeType: 'positive' | 'negative' | 'neutral'
  icon: string
}) {
  const getChangeColor = () => {
    switch (changeType) {
      case 'positive': return '#10b981'
      case 'negative': return '#ef4444'
      default: return '#94a3b8'
    }
  }

  return (
    <div style={{
      background: 'linear-gradient(135deg, rgba(255, 255, 255, 0.08) 0%, rgba(255, 255, 255, 0.03) 100%)',
      border: '1px solid rgba(255, 255, 255, 0.15)',
      borderRadius: '16px',
      padding: '1.5rem',
      transition: 'all 0.3s ease',
      position: 'relative',
      overflow: 'hidden',
      cursor: 'pointer'
    }}
    onMouseEnter={(e) => {
      e.target.style.background = 'linear-gradient(135deg, rgba(102, 126, 234, 0.1) 0%, rgba(118, 75, 162, 0.1) 100%)'
      e.target.style.transform = 'translateY(-4px)'
      e.target.style.boxShadow = '0 15px 35px rgba(102, 126, 234, 0.2)'
    }}
    onMouseLeave={(e) => {
      e.target.style.background = 'linear-gradient(135deg, rgba(255, 255, 255, 0.08) 0%, rgba(255, 255, 255, 0.03) 100%)'
      e.target.style.transform = 'translateY(0)'
      e.target.style.boxShadow = 'none'
    }}
    >
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: '1rem'
      }}>
        <h3 style={{
          fontSize: '0.85rem',
          color: '#94a3b8',
          fontWeight: 600,
          margin: 0,
          textTransform: 'uppercase',
          letterSpacing: '0.5px'
        }}>
          {title}
        </h3>
        <span style={{
          fontSize: '1.5rem',
          opacity: 0.8
        }}>
          {icon}
        </span>
                    </div>

      <div style={{
        fontSize: '1.8rem',
        fontWeight: 800,
        color: '#ffffff',
        marginBottom: '0.5rem',
        lineHeight: 1
      }}>
        {value}
                    </div>

      <div style={{
        fontSize: '0.85rem',
        fontWeight: 600,
        margin: 0,
        color: getChangeColor()
      }}>
        {change}
      </div>
    </div>
  )
}

// Add placeholder components for the other views...
function ChartCard() {
  return (
    <div style={{
      background: 'linear-gradient(135deg, rgba(255, 255, 255, 0.08) 0%, rgba(255, 255, 255, 0.03) 100%)',
      border: '1px solid rgba(255, 255, 255, 0.15)',
      borderRadius: '16px',
      padding: '1.5rem'
    }}>
      <h3 style={{
        fontSize: '1.2rem',
        fontWeight: 700,
        color: '#ffffff',
        margin: '0 0 1rem 0'
      }}>
        Portfolio Performance
      </h3>
      <div style={{ height: '300px' }}>
        <div style={{
          height: '100%',
          background: 'rgba(255, 255, 255, 0.03)',
          borderRadius: '12px',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          border: '1px solid rgba(255, 255, 255, 0.08)'
        }}>
          <div style={{
            fontSize: '3rem',
            marginBottom: '1rem',
            opacity: 0.7
          }}>
            📊
          </div>
          <p style={{
            fontSize: '1.1rem',
            fontWeight: 600,
            color: '#ffffff',
            margin: '0 0 0.5rem 0'
          }}>
            Portfolio Chart
          </p>
          <span style={{
            fontSize: '0.9rem',
            color: '#94a3b8'
          }}>
            Real-time performance tracking
          </span>
        </div>
      </div>
    </div>
  )
}

function RecentActivity() {
  const activities = [
    { action: 'BTC Signal Triggered', time: '2 minutes ago', type: 'signal' },
    { action: 'Portfolio Rebalanced', time: '1 hour ago', type: 'portfolio' },
    { action: 'AI Analysis Complete', time: '3 hours ago', type: 'ai' },
    { action: 'New Market Alert', time: '5 hours ago', type: 'alert' },
    { action: 'ETH Signal Generated', time: '6 hours ago', type: 'signal' }
  ]

  return (
    <div style={{
      background: 'linear-gradient(135deg, rgba(255, 255, 255, 0.08) 0%, rgba(255, 255, 255, 0.03) 100%)',
      border: '1px solid rgba(255, 255, 255, 0.15)',
      borderRadius: '16px',
      padding: '1.5rem'
    }}>
      <h3 style={{
        fontSize: '1.2rem',
        fontWeight: 700,
        color: '#ffffff',
        margin: '0 0 1rem 0'
      }}>
        Recent Activity
      </h3>
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        gap: '1rem',
        maxHeight: '300px',
        overflowY: 'auto'
      }}>
        {activities.map((activity, index) => (
          <div key={index} style={{
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            padding: '1rem',
            background: 'rgba(255, 255, 255, 0.03)',
            borderRadius: '10px',
            transition: 'all 0.2s ease',
            cursor: 'pointer'
          }}
          onMouseEnter={(e) => {
            e.target.style.background = 'rgba(102, 126, 234, 0.1)'
            e.target.style.transform = 'translateX(4px)'
          }}
          onMouseLeave={(e) => {
            e.target.style.background = 'rgba(255, 255, 255, 0.03)'
            e.target.style.transform = 'translateX(0)'
          }}
          >
            <div style={{
              width: '8px',
              height: '8px',
              borderRadius: '50%',
              flexShrink: 0,
              boxShadow: '0 0 8px currentColor',
              background: activity.type === 'signal' ? '#10b981' : 
                          activity.type === 'portfolio' ? '#3b82f6' :
                          activity.type === 'ai' ? '#8b5cf6' : '#f59e0b',
              color: activity.type === 'signal' ? '#10b981' : 
                     activity.type === 'portfolio' ? '#3b82f6' :
                     activity.type === 'ai' ? '#8b5cf6' : '#f59e0b'
            }} />

            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{
                fontSize: '0.9rem',
                color: '#ffffff',
                fontWeight: 500,
                lineHeight: 1.3,
                marginBottom: '0.25rem'
              }}>
                {activity.action}
                    </div>
              <div style={{
                fontSize: '0.75rem',
                color: '#94a3b8',
                lineHeight: 1.2
              }}>
                {activity.time}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

function QuickActions() {
  const actions = [
    { label: 'Generate Signal', icon: '🎯', description: 'AI-powered trading signals' },
    { label: 'Analyze Market', icon: '📊', description: 'Real-time market analysis' },
    { label: 'Chat with AI', icon: '🤖', description: 'Get trading insights' },
    { label: 'View Portfolio', icon: '💼', description: 'Track your investments' }
  ]

  return (
    <div style={{
      background: 'linear-gradient(135deg, rgba(255, 255, 255, 0.08) 0%, rgba(255, 255, 255, 0.03) 100%)',
      border: '1px solid rgba(255, 255, 255, 0.15)',
      borderRadius: '16px',
      padding: '1.5rem'
    }}>
      <h3 style={{
        fontSize: '1.2rem',
        fontWeight: 700,
        color: '#ffffff',
        margin: '0 0 1rem 0'
      }}>
        Quick Actions
      </h3>
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        gap: '8px'
      }}>
        {actions.map((action, index) => (
          <button key={index} style={{
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            padding: '1rem',
            background: 'rgba(255, 255, 255, 0.03)',
            border: '1px solid rgba(255, 255, 255, 0.1)',
            borderRadius: '10px',
            color: '#94a3b8',
            cursor: 'pointer',
            transition: 'all 0.3s ease',
            textAlign: 'left',
            width: '100%'
          }}
          onMouseEnter={(e) => {
            e.target.style.background = 'linear-gradient(135deg, rgba(102, 126, 234, 0.15) 0%, rgba(118, 75, 162, 0.15) 100%)'
            e.target.style.borderColor = 'rgba(102, 126, 234, 0.3)'
            e.target.style.color = '#ffffff'
            e.target.style.transform = 'translateX(4px)'
          }}
          onMouseLeave={(e) => {
            e.target.style.background = 'rgba(255, 255, 255, 0.03)'
            e.target.style.borderColor = 'rgba(255, 255, 255, 0.1)'
            e.target.style.color = '#94a3b8'
            e.target.style.transform = 'translateX(0)'
          }}
          >
            <span style={{
              fontSize: '1.2rem',
              flexShrink: 0
            }}>
              {action.icon}
            </span>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{
                fontWeight: 600,
                marginBottom: '2px',
                lineHeight: 1.2,
                fontSize: '0.9rem'
              }}>
                {action.label}
                    </div>
              <div style={{
                fontSize: '0.75rem',
                opacity: 0.8,
                lineHeight: 1.2
              }}>
                {action.description}
              </div>
            </div>
          </button>
        ))}
      </div>
    </div>
  )
}

function MarketPulse() {
  return (
    <div style={{
      background: 'linear-gradient(135deg, rgba(255, 255, 255, 0.08) 0%, rgba(255, 255, 255, 0.03) 100%)',
      border: '1px solid rgba(255, 255, 255, 0.15)',
      borderRadius: '16px',
      padding: '1.5rem'
    }}>
      <h3 style={{
        fontSize: '1.2rem',
        fontWeight: 700,
        color: '#ffffff',
        margin: '0 0 1rem 0'
      }}>
        Market Pulse
      </h3>
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        gap: '0.75rem'
      }}>
        {[
          { label: 'Fear & Greed Index', value: 'Greed 76', positive: true },
          { label: 'BTC Dominance', value: '54.2%' },
          { label: 'Total Market Cap', value: '$2.1T' },
          { label: '24h Volume', value: '$89.2B' },
          { label: 'Active Cryptocurrencies', value: '2.4M+' }
        ].map((item, index) => (
          <div key={index} style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            padding: '0.75rem',
            background: 'rgba(255, 255, 255, 0.03)',
            borderRadius: '8px',
            transition: 'all 0.2s ease',
            cursor: 'pointer'
          }}
          onMouseEnter={(e) => {
            e.target.style.background = 'rgba(102, 126, 234, 0.1)'
          }}
          onMouseLeave={(e) => {
            e.target.style.background = 'rgba(255, 255, 255, 0.03)'
          }}
          >
            <span style={{
              color: '#94a3b8',
              fontSize: '0.85rem',
              fontWeight: 500
            }}>
              {item.label}
            </span>
            <span style={{
              color: item.positive ? '#10b981' : '#ffffff',
              fontSize: '0.85rem',
              fontWeight: 600,
              background: item.positive ? 'rgba(16, 185, 129, 0.15)' : 'transparent',
              padding: item.positive ? '4px 8px' : '0',
              borderRadius: item.positive ? '6px' : '0',
              fontWeight: item.positive ? 700 : 600
            }}>
              {item.value}
            </span>
                        </div>
        ))}
                      </div>
    </div>
  )
}

// Placeholder components for other views
function AnalyticsContent() {
  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      gap: '1.5rem',
      maxWidth: '100%'
    }}>
      <div>
        <h2 style={{
          fontSize: '1.5rem',
          fontWeight: 700,
          color: '#ffffff',
          margin: '0 0 0.5rem 0'
        }}>
          Advanced Analytics
        </h2>
        <p style={{
          color: '#94a3b8',
          margin: 0,
          fontSize: '1rem'
        }}>
          Deep insights into your trading performance and market trends.
        </p>
                      </div>
      
      <div style={{
        background: 'linear-gradient(135deg, rgba(255, 255, 255, 0.08) 0%, rgba(255, 255, 255, 0.03) 100%)',
        border: '1px solid rgba(255, 255, 255, 0.15)',
        borderRadius: '16px',
        padding: '3rem',
        textAlign: 'center'
      }}>
        <div style={{ fontSize: '4rem', marginBottom: '1rem', opacity: 0.7 }}>📈</div>
        <h3 style={{
          fontSize: '1.5rem',
          fontWeight: 700,
          color: '#ffffff',
          margin: '0 0 0.5rem 0'
        }}>
          Analytics Dashboard Coming Soon
        </h3>
        <p style={{
          color: '#94a3b8',
          fontSize: '1rem',
          margin: 0
        }}>
          Advanced charts, performance metrics, and trading insights will be available here.
        </p>
                    </div>
    </div>
  )
}

function AlertsContent() {
  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      gap: '1.5rem',
      maxWidth: '100%'
    }}>
      <div>
        <h2 style={{
          fontSize: '1.5rem',
          fontWeight: 700,
          color: '#ffffff',
          margin: '0 0 0.5rem 0'
        }}>
          Alerts & Notifications
        </h2>
        <p style={{
          color: '#94a3b8',
          margin: 0,
          fontSize: '1rem'
        }}>
          Stay updated with real-time market alerts and trading signals.
                        </p>
                      </div>
      
      <div style={{
        background: 'linear-gradient(135deg, rgba(255, 255, 255, 0.08) 0%, rgba(255, 255, 255, 0.03) 100%)',
        border: '1px solid rgba(255, 255, 255, 0.15)',
        borderRadius: '16px',
        padding: '3rem',
        textAlign: 'center'
      }}>
        <div style={{ fontSize: '4rem', marginBottom: '1rem', opacity: 0.7 }}>🔔</div>
        <h3 style={{
          fontSize: '1.5rem',
          fontWeight: 700,
          color: '#ffffff',
          margin: '0 0 0.5rem 0'
        }}>
          Alert System Coming Soon
        </h3>
        <p style={{
          color: '#94a3b8',
          fontSize: '1rem',
          margin: 0
        }}>
          Configure custom alerts for price movements, signals, and market conditions.
        </p>
                  </div>
            </div>
  )
}

function SettingsContent({ user }: { user: any }) {
  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      gap: '1.5rem',
      maxWidth: '900px'
    }}>
      <div>
        <h2 style={{
          fontSize: '1.5rem',
          fontWeight: 700,
          color: '#ffffff',
          margin: '0 0 0.5rem 0'
        }}>
          Settings
        </h2>
        <p style={{
          color: '#94a3b8',
          margin: 0,
          fontSize: '1rem'
        }}>
          Manage your account settings and trading preferences.
        </p>
          </div>
      
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        gap: '1.5rem'
      }}>
        <div style={{
          background: 'linear-gradient(135deg, rgba(255, 255, 255, 0.08) 0%, rgba(255, 255, 255, 0.03) 100%)',
          border: '1px solid rgba(255, 255, 255, 0.15)',
          borderRadius: '16px',
          padding: '1.5rem'
        }}>
          <h3 style={{
            fontSize: '1.1rem',
            fontWeight: 600,
            color: '#ffffff',
            margin: '0 0 1rem 0'
          }}>
            Account Information
          </h3>
          <div style={{
            display: 'flex',
            flexDirection: 'column',
            gap: '0.75rem'
          }}>
            {[
              { title: 'Username', value: user?.username || 'Not set', description: 'Your display name' },
              { title: 'Email', value: user?.email || 'Not set', description: 'Account email address' },
              { title: 'Subscription', value: user?.subscription_tier || 'Free', description: 'Current plan' }
            ].map((item, index) => (
              <div key={index} style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                padding: '1rem',
                background: 'rgba(255, 255, 255, 0.03)',
                border: '1px solid rgba(255, 255, 255, 0.08)',
                borderRadius: '10px',
                cursor: 'pointer',
                transition: 'all 0.3s ease'
              }}
              onMouseEnter={(e) => {
                e.target.style.background = 'rgba(102, 126, 234, 0.1)'
                e.target.style.borderColor = 'rgba(102, 126, 234, 0.2)'
                e.target.style.transform = 'translateX(4px)'
              }}
              onMouseLeave={(e) => {
                e.target.style.background = 'rgba(255, 255, 255, 0.03)'
                e.target.style.borderColor = 'rgba(255, 255, 255, 0.08)'
                e.target.style.transform = 'translateX(0)'
              }}
              >
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{
                    color: '#ffffff',
                    fontWeight: 600,
                    marginBottom: '0.25rem',
                    fontSize: '0.9rem'
                  }}>
                    {item.title}
                  </div>
                  <div style={{
                    color: '#94a3b8',
                    fontSize: '0.8rem',
                    lineHeight: 1.2
                  }}>
                    {item.description}
                  </div>
                </div>
                <div style={{
                  color: '#a5b4fc',
                  fontWeight: 600,
                  flexShrink: 0,
                  marginLeft: '1rem',
                  fontSize: '0.85rem'
                }}>
                  {item.value}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}