'use client'

import { useState } from 'react'

interface Plan {
  id: string
  name: string
  price: number
  currency: string
  billing_period: 'monthly' | 'yearly'
  features: string[]
  highlighted?: boolean
  popular?: boolean
  savings?: string
}

interface PlanSelectionModalProps {
  isOpen: boolean
  onClose: () => void
  onSelectPlan: (plan: Plan) => void
}

export function PlanSelectionModal({ isOpen, onClose, onSelectPlan }: PlanSelectionModalProps) {
  const [billingPeriod, setBillingPeriod] = useState<'monthly' | 'yearly'>('monthly')

  if (!isOpen) return null

  const plans: Plan[] = [
    {
      id: 'pro',
      name: 'Pro',
      price: billingPeriod === 'monthly' ? 29 : 290,
      currency: 'USD',
      billing_period: billingPeriod,
      features: [
        '1,000 API calls per day',
        'Advanced portfolio analytics',
        'Real-time market data',
        'AI-powered insights',
        'Priority support'
      ],
      popular: true,
      savings: billingPeriod === 'yearly' ? '2 months free' : undefined
    },
    {
      id: 'premium',
      name: 'Premium',
      price: billingPeriod === 'monthly' ? 99 : 990,
      currency: 'USD',
      billing_period: billingPeriod,
      features: [
        'Unlimited API calls',
        'Advanced portfolio management',
        'Custom trading strategies',
        'Real-time notifications',
        'Dedicated support',
        'API access'
      ],
      highlighted: true,
      savings: billingPeriod === 'yearly' ? '2 months free' : undefined
    }
  ]

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className="bg-gradient-to-br from-slate-900 to-slate-800 rounded-3xl p-8 max-w-4xl w-full shadow-2xl border border-slate-700/50 relative">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-6 right-6 w-10 h-10 bg-slate-800 hover:bg-slate-700 rounded-full flex items-center justify-center text-white transition-colors"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>

        {/* Header */}
        <div className="text-center mb-8">
          <h2 className="text-3xl font-bold text-white mb-3">
            Choose Your Plan
          </h2>
          <p className="text-slate-400 text-lg max-w-2xl mx-auto">
            Unlock powerful AI trading features and take your portfolio to the next level
          </p>
        </div>

        {/* Billing Period Toggle */}
        <div className="flex justify-center mb-10">
          <div className="bg-slate-800 rounded-full p-1 border border-slate-600">
            <button
              onClick={() => setBillingPeriod('monthly')}
              className={`px-6 py-3 rounded-full font-medium transition-all ${
                billingPeriod === 'monthly'
                  ? 'bg-blue-600 text-white shadow-lg'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Monthly
            </button>
            <button
              onClick={() => setBillingPeriod('yearly')}
              className={`px-6 py-3 rounded-full font-medium transition-all relative ${
                billingPeriod === 'yearly'
                  ? 'bg-blue-600 text-white shadow-lg'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Yearly
              {billingPeriod === 'yearly' && (
                <span className="absolute -top-2 -right-2 bg-green-500 text-white text-xs px-2 py-1 rounded-full">
                  Save 20%
                </span>
              )}
            </button>
          </div>
        </div>

        {/* Plans Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-3xl mx-auto">
          {plans.map((plan) => (
            <div
              key={plan.id}
              className={`relative rounded-2xl p-8 transition-all duration-300 cursor-pointer group ${
                plan.highlighted
                  ? 'bg-gradient-to-br from-blue-600/20 to-purple-600/20 border-2 border-blue-500/50 shadow-xl shadow-blue-500/10 scale-105'
                  : 'bg-slate-800/50 border border-slate-600/50 hover:border-blue-500/50 hover:shadow-lg hover:shadow-blue-500/5'
              }`}
              onClick={() => onSelectPlan(plan)}
            >
              {/* Popular Badge */}
              {plan.popular && (
                <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
                  <span className="bg-gradient-to-r from-orange-500 to-red-500 text-white text-sm font-bold px-4 py-1 rounded-full shadow-lg">
                    Most Popular
                  </span>
                </div>
              )}

              {/* Best Value Badge */}
              {plan.highlighted && (
                <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
                  <span className="bg-gradient-to-r from-purple-500 to-blue-500 text-white text-sm font-bold px-4 py-1 rounded-full shadow-lg">
                    Best Value
                  </span>
                </div>
              )}

              {/* Plan Content */}
              <div className="text-center mb-6">
                <h3 className="text-2xl font-bold text-white mb-2">{plan.name}</h3>
                <div className="mb-4">
                  <span className="text-4xl font-bold text-white">${plan.price}</span>
                  <span className="text-slate-400 ml-2">
                    /{billingPeriod === 'monthly' ? 'month' : 'year'}
                  </span>
                </div>
                {plan.savings && (
                  <div className="text-green-400 font-semibold text-sm">
                    {plan.savings}
                  </div>
                )}
              </div>

              {/* Features */}
              <div className="space-y-4 mb-8">
                {plan.features.map((feature, idx) => (
                  <div key={idx} className="flex items-center">
                    <svg className="w-5 h-5 text-green-400 mr-3 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    <span className="text-slate-300">{feature}</span>
                  </div>
                ))}
              </div>

              {/* CTA Button */}
              <button
                onClick={() => onSelectPlan(plan)}
                className={`w-full py-4 px-6 rounded-xl font-semibold transition-all duration-300 ${
                  plan.highlighted
                    ? 'bg-gradient-to-r from-blue-600 to-purple-600 text-white hover:from-blue-700 hover:to-purple-700 shadow-lg hover:shadow-xl'
                    : 'bg-blue-600 text-white hover:bg-blue-700 shadow-lg hover:shadow-xl'
                }`}
              >
                Get Started with {plan.name}
              </button>
            </div>
          ))}
        </div>

        {/* Footer */}
        <div className="text-center mt-10 pt-6 border-t border-slate-700">
          <p className="text-slate-400 text-sm">
            All plans include 30-day money back guarantee • Cancel anytime
          </p>
        </div>
      </div>
    </div>
  )
}