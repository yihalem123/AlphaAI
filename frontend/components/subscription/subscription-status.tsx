'use client'

/**
 * Modern Subscription Status Component
 * 
 * Features:
 * - Real-time subscription status display
 * - Visual status indicators
 * - Upgrade/downgrade actions
 * - Usage tracking and limits
 * - Billing cycle information
 * 
 * Author: AI Trading Platform Frontend Team
 * Version: 4.0.0
 */

import React, { useState, useEffect } from 'react'
import { useAuth } from '@/hooks/use-auth'
import StripeCheckout from './stripe-checkout'

interface SubscriptionStatusProps {
  className?: string
  showUpgradeOptions?: boolean
}

const PLANS = [
  {
    id: 'free',
    name: 'Free',
    price: '$0',
    period: 'month',
    priceId: '',
    features: [
      '5 AI signals per day',
      'Basic market analysis',
      'Email notifications',
      'Community support'
    ],
    color: 'bg-gradient-to-r from-gray-600 to-gray-700',
    maxSignals: 5,
    maxPortfolios: 1
  },
  {
    id: 'pro',
    name: 'Pro',
    price: '$29',
    period: 'month',
    priceId: process.env.NEXT_PUBLIC_STRIPE_PRO_PRICE_ID || 'price_pro',
    features: [
      'Unlimited AI signals',
      'Advanced market analysis',
      'Real-time notifications',
      'Portfolio tracking',
      'Risk management tools',
      'Priority support'
    ],
    color: 'bg-gradient-to-r from-purple-600 to-blue-600',
    popular: true,
    maxSignals: -1, // unlimited
    maxPortfolios: 5
  },
  {
    id: 'premium',
    name: 'Premium',
    price: '$99',
    period: 'month',
    priceId: process.env.NEXT_PUBLIC_STRIPE_PREMIUM_PRICE_ID || 'price_premium',
    features: [
      'Everything in Pro',
      'Custom AI models',
      'API access',
      'White-label solutions',
      'Dedicated account manager',
      '24/7 phone support'
    ],
    color: 'bg-gradient-to-r from-amber-500 to-orange-600',
    maxSignals: -1, // unlimited
    maxPortfolios: -1 // unlimited
  }
]

export function SubscriptionStatus({ className = '', showUpgradeOptions = true }: SubscriptionStatusProps) {
  const { user, subscriptionStatus, refreshSubscription, isAuthenticated } = useAuth()
  const [showCheckout, setShowCheckout] = useState(false)
  const [selectedPlan, setSelectedPlan] = useState<typeof PLANS[0] | null>(null)
  const [usage, setUsage] = useState({
    signalsUsed: 0,
    portfoliosUsed: 0
  })

  // Get current plan
  const currentPlan = PLANS.find(plan => plan.id === (user?.subscription_tier || 'free')) || PLANS[0]
  
  // Get status info
  const getStatusInfo = () => {
    if (!subscriptionStatus) {
      return {
        status: 'inactive',
        color: 'text-gray-400',
        bgColor: 'bg-gray-500/20',
        icon: '⚪',
        label: 'No subscription'
      }
    }

    switch (subscriptionStatus.status) {
      case 'active':
        return {
          status: 'active',
          color: 'text-green-400',
          bgColor: 'bg-green-500/20',
          icon: '✅',
          label: 'Active'
        }
      case 'trialing':
        return {
          status: 'trialing',
          color: 'text-blue-400',
          bgColor: 'bg-blue-500/20',
          icon: '🆓',
          label: 'Free Trial'
        }
      case 'past_due':
        return {
          status: 'past_due',
          color: 'text-yellow-400',
          bgColor: 'bg-yellow-500/20',
          icon: '⚠️',
          label: 'Payment Due'
        }
      case 'canceled':
        return {
          status: 'canceled',
          color: 'text-red-400',
          bgColor: 'bg-red-500/20',
          icon: '❌',
          label: 'Canceled'
        }
      case 'unpaid':
        return {
          status: 'unpaid',
          color: 'text-red-400',
          bgColor: 'bg-red-500/20',
          icon: '💳',
          label: 'Payment Failed'
        }
      default:
        return {
          status: 'unknown',
          color: 'text-gray-400',
          bgColor: 'bg-gray-500/20',
          icon: '❓',
          label: 'Unknown'
        }
    }
  }

  const statusInfo = getStatusInfo()

  // Format expiry date
  const formatExpiryDate = (dateString?: string) => {
    if (!dateString) return null
    
    try {
      const date = new Date(dateString)
      return date.toLocaleDateString('en-US', { 
        year: 'numeric', 
        month: 'long', 
        day: 'numeric' 
      })
    } catch {
      return null
    }
  }

  // Get days until expiry
  const getDaysUntilExpiry = (dateString?: string) => {
    if (!dateString) return null
    
    try {
      const expiryDate = new Date(dateString)
      const today = new Date()
      const diffTime = expiryDate.getTime() - today.getTime()
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
      return diffDays
    } catch {
      return null
    }
  }

  const daysUntilExpiry = getDaysUntilExpiry(subscriptionStatus?.current_period_end)

  // Handle upgrade
  const handleUpgrade = (plan: typeof PLANS[0]) => {
    setSelectedPlan(plan)
    setShowCheckout(true)
  }

  // Load usage data (mock for now)
  useEffect(() => {
    // In a real app, this would come from an API
    setUsage({
      signalsUsed: Math.floor(Math.random() * (currentPlan.maxSignals || 5)),
      portfoliosUsed: Math.floor(Math.random() * (currentPlan.maxPortfolios || 1))
    })
  }, [currentPlan])

  if (!isAuthenticated) {
    return null
  }

  return (
    <>
      <div className={`bg-white/5 backdrop-blur-lg rounded-2xl p-6 border border-white/10 ${className}`}>
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-xl font-bold text-white">Subscription Status</h3>
          <button
            onClick={() => refreshSubscription()}
            className="p-2 hover:bg-white/10 rounded-lg transition-colors"
            title="Refresh status"
          >
            <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
          </button>
        </div>

        {/* Current Plan */}
        <div className="mb-6">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center space-x-3">
              <div className={`w-12 h-12 ${currentPlan.color} rounded-xl flex items-center justify-center text-white font-bold`}>
                {currentPlan.name.charAt(0)}
              </div>
              <div>
                <h4 className="text-lg font-semibold text-white">{currentPlan.name} Plan</h4>
                <p className="text-gray-400 text-sm">{currentPlan.price}/{currentPlan.period}</p>
              </div>
            </div>
            
            <div className={`px-3 py-1 rounded-full text-xs font-medium ${statusInfo.bgColor} ${statusInfo.color} flex items-center space-x-1`}>
              <span>{statusInfo.icon}</span>
              <span>{statusInfo.label}</span>
            </div>
          </div>

          {/* Expiry Info */}
          {subscriptionStatus?.current_period_end && (
            <div className="text-sm text-gray-400">
              {daysUntilExpiry !== null && daysUntilExpiry > 0 ? (
                <span>Renews on {formatExpiryDate(subscriptionStatus.current_period_end)} ({daysUntilExpiry} days)</span>
              ) : daysUntilExpiry !== null && daysUntilExpiry <= 0 ? (
                <span className="text-yellow-400">Expired on {formatExpiryDate(subscriptionStatus.current_period_end)}</span>
              ) : (
                <span>Next billing: {formatExpiryDate(subscriptionStatus.current_period_end)}</span>
              )}
            </div>
          )}
        </div>

        {/* Usage Stats */}
        <div className="space-y-4 mb-6">
          {/* Signals Usage */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-gray-300">AI Signals</span>
              <span className="text-sm text-gray-400">
                {currentPlan.maxSignals === -1 ? `${usage.signalsUsed} used` : `${usage.signalsUsed}/${currentPlan.maxSignals}`}
              </span>
            </div>
            {currentPlan.maxSignals !== -1 && (
              <div className="w-full bg-gray-700 rounded-full h-2">
                <div 
                  className="bg-gradient-to-r from-purple-600 to-blue-600 h-2 rounded-full transition-all duration-300"
                  style={{ width: `${Math.min((usage.signalsUsed / currentPlan.maxSignals) * 100, 100)}%` }}
                ></div>
              </div>
            )}
          </div>

          {/* Portfolios Usage */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-gray-300">Portfolios</span>
              <span className="text-sm text-gray-400">
                {currentPlan.maxPortfolios === -1 ? `${usage.portfoliosUsed} created` : `${usage.portfoliosUsed}/${currentPlan.maxPortfolios}`}
              </span>
            </div>
            {currentPlan.maxPortfolios !== -1 && (
              <div className="w-full bg-gray-700 rounded-full h-2">
                <div 
                  className="bg-gradient-to-r from-green-600 to-emerald-600 h-2 rounded-full transition-all duration-300"
                  style={{ width: `${Math.min((usage.portfoliosUsed / currentPlan.maxPortfolios) * 100, 100)}%` }}
                ></div>
              </div>
            )}
          </div>
        </div>

        {/* Upgrade Options */}
        {showUpgradeOptions && currentPlan.id !== 'premium' && (
          <div className="space-y-3">
            {PLANS.filter(plan => plan.id !== currentPlan.id && plan.id !== 'free').map(plan => (
              <div key={plan.id} className="flex items-center justify-between p-3 bg-white/5 rounded-lg border border-white/10">
                <div className="flex items-center space-x-3">
                  <div className={`w-8 h-8 ${plan.color} rounded-lg flex items-center justify-center text-white text-sm font-bold`}>
                    {plan.name.charAt(0)}
                  </div>
                  <div>
                    <h5 className="font-medium text-white">{plan.name}</h5>
                    <p className="text-xs text-gray-400">{plan.price}/{plan.period}</p>
                  </div>
                </div>
                <button
                  onClick={() => handleUpgrade(plan)}
                  className={`px-4 py-2 ${plan.color} text-white text-sm font-medium rounded-lg hover:opacity-90 transition-opacity`}
                >
                  Upgrade
                </button>
              </div>
            ))}
          </div>
        )}

        {/* Action Buttons */}
        {(statusInfo.status === 'past_due' || statusInfo.status === 'unpaid') && (
          <div className="mt-6">
            <button className="w-full bg-gradient-to-r from-red-600 to-red-700 text-white font-semibold py-3 px-4 rounded-lg hover:from-red-700 hover:to-red-800 transition-all duration-200">
              Update Payment Method
            </button>
          </div>
        )}
      </div>

      {/* Stripe Checkout Modal */}
      {showCheckout && selectedPlan && (
        <StripeCheckout
          plan={selectedPlan}
          onClose={() => {
            setShowCheckout(false)
            setSelectedPlan(null)
          }}
          onSuccess={() => {
            setShowCheckout(false)
            setSelectedPlan(null)
            refreshSubscription()
          }}
        />
      )}
    </>
  )
}

export default SubscriptionStatus
