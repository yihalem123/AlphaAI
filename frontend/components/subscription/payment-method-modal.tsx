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

  if (!isOpen) return null

  const handleStripePayment = async () => {
    setIsProcessing(true)
    try {
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
      onPaymentMethodSelect('crypto', {
        plan_id: selectedPlan.id,
        billing_period: selectedPlan.billing_period,
        crypto_type: 'bitcoin'
      })
    } catch (error) {
      console.error('Crypto payment error:', error)
    } finally {
      setIsProcessing(false)
    }
  }

  const paymentMethods = [
    {
      id: 'stripe',
      name: 'Credit Card',
      description: 'Pay securely with your credit or debit card',
      icon: '💳',
      badges: ['Instant', 'Secure'],
      popular: true,
      onClick: handleStripePayment
    },
    {
      id: 'crypto',
      name: 'Cryptocurrency',
      description: 'Pay with Bitcoin, Ethereum, or USDT',
      icon: '₿',
      badges: ['Anonymous', 'Decentralized'],
      popular: false,
      onClick: handleCryptoPayment
    }
  ]

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className="bg-gradient-to-br from-slate-900 to-slate-800 rounded-3xl p-8 max-w-2xl w-full shadow-2xl border border-slate-700/50 relative">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center space-x-4">
            <button
              onClick={onBack}
              className="w-10 h-10 bg-slate-800 hover:bg-slate-700 rounded-full flex items-center justify-center text-white transition-colors"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>
            <div>
              <h2 className="text-2xl font-bold text-white">Payment Method</h2>
              <p className="text-slate-400">Choose how you'd like to pay</p>
            </div>
          </div>
          
          <button
            onClick={onClose}
            className="w-10 h-10 bg-slate-800 hover:bg-slate-700 rounded-full flex items-center justify-center text-white transition-colors"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Plan Summary */}
        <div className="bg-slate-800/50 rounded-2xl p-6 mb-8 border border-slate-600/50">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-semibold text-white">{selectedPlan.name} Plan</h3>
              <p className="text-slate-400 capitalize">{selectedPlan.billing_period} billing</p>
            </div>
            <div className="text-right">
              <div className="text-2xl font-bold text-white">${selectedPlan.price}</div>
              <div className="text-slate-400 text-sm">
                /{selectedPlan.billing_period === 'monthly' ? 'month' : 'year'}
              </div>
            </div>
          </div>
        </div>

        {/* Payment Methods */}
        <div className="space-y-4 mb-8">
          {paymentMethods.map((method) => (
            <div
              key={method.id}
              className={`relative rounded-2xl border transition-all duration-300 cursor-pointer group ${
                selectedMethod === method.id
                  ? 'border-blue-500 bg-blue-500/10 shadow-lg shadow-blue-500/20'
                  : 'border-slate-600/50 bg-slate-800/30 hover:border-blue-500/50 hover:bg-slate-800/50'
              }`}
              onClick={() => setSelectedMethod(method.id as 'stripe' | 'crypto')}
            >
              {/* Popular Badge */}
              {method.popular && (
                <div className="absolute -top-2 left-4">
                  <span className="bg-gradient-to-r from-green-500 to-emerald-500 text-white text-xs font-bold px-3 py-1 rounded-full">
                    Recommended
                  </span>
                </div>
              )}

              <div className="p-6">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-4">
                    <div className="text-3xl">{method.icon}</div>
                    <div>
                      <h3 className="text-lg font-semibold text-white">{method.name}</h3>
                      <p className="text-slate-400 text-sm">{method.description}</p>
                      <div className="flex space-x-2 mt-2">
                        {method.badges.map((badge, idx) => (
                          <span
                            key={idx}
                            className="px-2 py-1 bg-slate-700 text-slate-300 text-xs rounded-full"
                          >
                            {badge}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>
                  
                  <div className={`w-6 h-6 rounded-full border-2 transition-all ${
                    selectedMethod === method.id
                      ? 'border-blue-500 bg-blue-500'
                      : 'border-slate-500 group-hover:border-blue-400'
                  }`}>
                    {selectedMethod === method.id && (
                      <svg className="w-4 h-4 text-white m-0.5" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                      </svg>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Continue Button */}
        <button
          onClick={selectedMethod === 'stripe' ? handleStripePayment : handleCryptoPayment}
          disabled={!selectedMethod || isProcessing}
          className="w-full py-4 px-6 bg-gradient-to-r from-blue-600 to-purple-600 text-white font-semibold rounded-xl transition-all duration-300 hover:from-blue-700 hover:to-purple-700 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg hover:shadow-xl flex items-center justify-center space-x-2"
        >
          {isProcessing ? (
            <>
              <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
              <span>Processing...</span>
            </>
          ) : (
            <>
              <span>Continue with {selectedMethod === 'stripe' ? 'Credit Card' : 'Cryptocurrency'}</span>
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </>
          )}
        </button>

        {/* Security Notice */}
        <div className="mt-6 text-center">
          <div className="flex items-center justify-center space-x-2 text-slate-400 text-sm">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
            </svg>
            <span>Your payment information is encrypted and secure</span>
          </div>
        </div>
      </div>
    </div>
  )
}