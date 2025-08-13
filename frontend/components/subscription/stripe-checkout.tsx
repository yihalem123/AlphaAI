'use client'

/**
 * Modern Stripe Checkout Component
 * 
 * Features:
 * - Secure Stripe Checkout Session creation
 * - Loading states and error handling
 * - Mobile-responsive design
 * - Real-time subscription status updates
 * - Success/failure message handling
 * 
 * Author: AI Trading Platform Frontend Team
 * Version: 4.0.0
 */

import React, { useState } from 'react'
import { useAuth } from '@/hooks/use-auth'

interface PricingPlan {
  id: string
  name: string
  price: string
  period: string
  priceId: string
  features: string[]
  popular?: boolean
  color: string
}

interface StripeCheckoutProps {
  plan: PricingPlan
  onClose: () => void
  onSuccess?: () => void
}

export function StripeCheckout({ plan, onClose, onSuccess }: StripeCheckoutProps) {
  const { createCheckoutSession, isAuthenticated } = useAuth()
  const [isProcessing, setIsProcessing] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleCheckout = async () => {
    if (!isAuthenticated) {
      setError('Please sign in to continue with payment')
      return
    }

    setIsProcessing(true)
    setError(null)

    try {
      const result = await createCheckoutSession(plan.priceId)
      
      if (result.sessionId) {
        // Redirect to Stripe Checkout
        const stripe = await import('@stripe/stripe-js').then(module => 
          module.loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY!)
        )
        
        if (stripe) {
          const { error: stripeError } = await stripe.redirectToCheckout({
            sessionId: result.sessionId
          })
          
          if (stripeError) {
            setError(stripeError.message || 'Failed to redirect to payment')
          }
        } else {
          setError('Payment system unavailable')
        }
      } else if (result.error) {
        setError(result.error.message)
      } else {
        setError('Failed to create payment session')
      }
    } catch (error) {
      setError('Network error. Please try again.')
      console.error('Checkout error:', error)
    } finally {
      setIsProcessing(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className="bg-white/10 backdrop-blur-lg rounded-3xl p-8 max-w-md w-full border border-white/20 shadow-2xl">
        {/* Close Button */}
        <button
          onClick={onClose}
          disabled={isProcessing}
          className="absolute top-4 right-4 w-8 h-8 bg-white/10 hover:bg-white/20 rounded-full flex items-center justify-center text-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>

        {/* Header */}
        <div className="text-center mb-8">
          <div className={`w-16 h-16 ${plan.color} rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg`}>
            <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          
          <h2 className="text-2xl font-bold text-white mb-2">
            Complete Your Purchase
          </h2>
          
          <p className="text-gray-300">
            You're about to upgrade to {plan.name}
          </p>
        </div>

        {/* Plan Summary */}
        <div className="bg-white/5 rounded-xl p-6 mb-6 border border-white/10">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-lg font-semibold text-white">{plan.name}</h3>
              <p className="text-gray-400 text-sm">Monthly subscription</p>
            </div>
            <div className="text-right">
              <div className="text-2xl font-bold text-white">{plan.price}</div>
              <div className="text-gray-400 text-sm">per {plan.period}</div>
            </div>
          </div>
          
          <div className="space-y-2">
            {plan.features.slice(0, 3).map((feature, idx) => (
              <div key={idx} className="flex items-center text-sm text-gray-300">
                <svg className="w-4 h-4 text-green-400 mr-2 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                {feature}
              </div>
            ))}
            {plan.features.length > 3 && (
              <div className="text-sm text-gray-400">
                +{plan.features.length - 3} more features
              </div>
            )}
          </div>
        </div>

        {/* Error Message */}
        {error && (
          <div className="bg-red-500/20 border border-red-500/30 rounded-lg p-4 mb-6">
            <div className="flex items-center">
              <svg className="w-5 h-5 text-red-400 mr-2 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <p className="text-red-200 text-sm">{error}</p>
            </div>
          </div>
        )}

        {/* Payment Info */}
        <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-4 mb-6">
          <div className="flex items-start">
            <svg className="w-5 h-5 text-blue-400 mr-2 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <div className="text-blue-200 text-sm">
              <p className="font-medium mb-1">Secure Payment</p>
              <p>Your payment is processed securely by Stripe. You can cancel anytime from your dashboard.</p>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="space-y-3">
          <button
            onClick={handleCheckout}
            disabled={isProcessing}
            className={`w-full ${plan.color} hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold py-4 px-6 rounded-xl transition-all duration-200 flex items-center justify-center space-x-2 shadow-lg`}
          >
            {isProcessing ? (
              <>
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                <span>Processing...</span>
              </>
            ) : (
              <>
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                </svg>
                <span>Pay {plan.price} Securely</span>
              </>
            )}
          </button>
          
          <button
            onClick={onClose}
            disabled={isProcessing}
            className="w-full bg-white/10 hover:bg-white/20 disabled:opacity-50 disabled:cursor-not-allowed text-white font-medium py-3 px-6 rounded-xl transition-colors border border-white/20"
          >
            Cancel
          </button>
        </div>

        {/* Security Badge */}
        <div className="flex items-center justify-center mt-6 text-gray-400 text-xs">
          <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
          </svg>
          256-bit SSL encryption • PCI DSS compliant
        </div>
      </div>
    </div>
  )
}

export default StripeCheckout
