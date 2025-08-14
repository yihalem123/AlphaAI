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
  description?: string
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
      description: 'Perfect for serious traders and investors',
      price: billingPeriod === 'monthly' ? 29 : 290,
      currency: 'USD',
      billing_period: billingPeriod,
      features: [
        '1,000 API calls per day',
        'Advanced portfolio analytics',
        'Real-time market data',
        'AI-powered trading signals',
        'Technical analysis tools',
        'Priority email support',
        'Mobile app access'
      ],
      popular: true,
      savings: billingPeriod === 'yearly' ? 'Save $58/year' : undefined
    },
    {
      id: 'enterprise',
      name: 'Enterprise',
      description: 'For professional traders and institutions',
      price: billingPeriod === 'monthly' ? 99 : 990,
      currency: 'USD',
      billing_period: billingPeriod,
      features: [
        'Unlimited API calls',
        'Advanced portfolio management',
        'Custom trading strategies',
        'Real-time notifications & alerts',
        'Advanced AI analysis',
        'Custom indicators & tools',
        'White-label solutions',
        'Dedicated account manager',
        'API access & webhooks',
        'Custom integrations'
      ],
      highlighted: true,
      savings: billingPeriod === 'yearly' ? 'Save $198/year' : undefined
    }
  ]

  return (
    <div className="fixed inset-0 z-[99999] flex items-center justify-center p-4 bg-black/70 backdrop-blur-md">
      <div className="bg-slate-900/95 backdrop-blur-sm border border-slate-700/50 rounded-2xl max-w-5xl w-full shadow-2xl relative max-h-[95vh] overflow-y-auto">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-6 right-6 w-10 h-10 bg-slate-800/80 hover:bg-slate-700 rounded-full flex items-center justify-center text-slate-400 hover:text-white transition-all duration-200 z-10"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>

        {/* Header */}
        <div className="text-center px-8 pt-12 pb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-blue-500/20 to-purple-500/20 rounded-2xl mb-6">
            <svg className="w-8 h-8 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
          </div>
          <h2 className="text-4xl font-bold text-white mb-4">
            Unlock AI-Powered Trading
          </h2>
          <p className="text-slate-400 text-xl max-w-2xl mx-auto leading-relaxed">
            Choose the plan that accelerates your trading success with advanced AI insights and professional-grade tools
          </p>
        </div>

        {/* Billing Period Toggle */}
        <div className="flex justify-center mb-10">
          <div className="bg-slate-800/50 backdrop-blur-sm border border-slate-700/50 rounded-xl p-1.5">
            <button
              onClick={() => setBillingPeriod('monthly')}
              className={`px-8 py-3 rounded-lg font-semibold transition-all duration-300 ${
                billingPeriod === 'monthly'
                  ? 'bg-slate-700 text-white shadow-lg'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Monthly
            </button>
            <button
              onClick={() => setBillingPeriod('yearly')}
              className={`px-8 py-3 rounded-lg font-semibold transition-all duration-300 relative ${
                billingPeriod === 'yearly'
                  ? 'bg-slate-700 text-white shadow-lg'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Yearly
              <span className="absolute -top-2 -right-2 bg-green-500 text-white text-xs font-bold px-2 py-1 rounded-full animate-pulse">
                20% OFF
              </span>
            </button>
          </div>
        </div>

        {/* Plans Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 px-8 pb-12">
          {plans.map((plan) => (
            <div
              key={plan.id}
              className={`relative rounded-2xl transition-all duration-500 cursor-pointer group ${
                plan.highlighted
                  ? 'bg-gradient-to-br from-slate-800/80 to-slate-900/80 border-2 border-blue-500/50 shadow-2xl shadow-blue-500/10 scale-[1.02]'
                  : 'bg-slate-800/50 border border-slate-700/50 hover:border-slate-600/70 hover:shadow-xl'
              } backdrop-blur-sm hover:scale-[1.02] hover:-translate-y-1`}
              onClick={() => onSelectPlan(plan)}
            >
              {/* Popular Badge */}
              {plan.popular && !plan.highlighted && (
                <div className="absolute -top-3 left-1/2 transform -translate-x-1/2 z-10">
                  <div className="bg-gradient-to-r from-orange-500 to-red-500 text-white text-sm font-bold px-4 py-2 rounded-full shadow-lg">
                    🔥 Most Popular
                  </div>
                </div>
              )}

              {/* Best Value Badge */}
              {plan.highlighted && (
                <div className="absolute -top-3 left-1/2 transform -translate-x-1/2 z-10">
                  <div className="bg-gradient-to-r from-blue-500 to-purple-500 text-white text-sm font-bold px-4 py-2 rounded-full shadow-lg">
                    ⭐ Best Value
                  </div>
                </div>
              )}

              {/* Glow Effect for Enterprise */}
              {plan.highlighted && (
                <div className="absolute inset-0 bg-gradient-to-br from-blue-500/10 to-purple-500/10 rounded-2xl"></div>
              )}

              {/* Plan Content */}
              <div className="relative p-8">
                {/* Plan Header */}
                <div className="text-center mb-8">
                  <h3 className="text-3xl font-bold text-white mb-2">{plan.name}</h3>
                  <p className="text-slate-400 mb-6">{plan.description}</p>
                  
                  <div className="mb-4">
                    <span className="text-5xl font-bold text-white">${plan.price}</span>
                    <span className="text-slate-400 text-lg ml-2">
                      /{billingPeriod === 'monthly' ? 'month' : 'year'}
                    </span>
                  </div>
                  
                  {plan.savings && (
                    <div className="inline-block bg-green-500/20 border border-green-500/50 text-green-400 font-semibold text-sm px-4 py-2 rounded-full">
                      💰 {plan.savings}
                    </div>
                  )}
                </div>

                {/* Features */}
                <div className="space-y-4 mb-8">
                  <h4 className="text-white font-semibold text-lg mb-4">Everything included:</h4>
                  {plan.features.map((feature, idx) => (
                    <div key={idx} className="flex items-start">
                      <div className="flex-shrink-0 w-5 h-5 bg-gradient-to-br from-green-400 to-emerald-500 rounded-full flex items-center justify-center mr-3 mt-0.5">
                        <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                        </svg>
                      </div>
                      <span className="text-slate-300 leading-relaxed">{feature}</span>
                    </div>
                  ))}
                </div>

                {/* CTA Button */}
                <button
                  onClick={(e) => {
                    e.stopPropagation()
                    onSelectPlan(plan)
                  }}
                  className={`w-full py-4 px-6 rounded-xl font-bold text-lg transition-all duration-300 shadow-lg hover:shadow-xl transform hover:scale-105 ${
                    plan.highlighted
                      ? 'bg-gradient-to-r from-blue-600 to-purple-600 text-white hover:from-blue-700 hover:to-purple-700'
                      : 'bg-gradient-to-r from-slate-700 to-slate-800 text-white hover:from-blue-600 hover:to-purple-600 border border-slate-600/50'
                  }`}
                >
                  {plan.highlighted ? (
                    <>
                      <span>Upgrade to {plan.name}</span>
                      <svg className="w-5 h-5 ml-2 inline" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                      </svg>
                    </>
                  ) : (
                    <>
                      <span>Start with {plan.name}</span>
                      <svg className="w-5 h-5 ml-2 inline" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                      </svg>
                    </>
                  )}
                </button>

                {/* Plan Benefits */}
                <div className="mt-6 text-center">
                  <p className="text-slate-500 text-sm">
                    {plan.highlighted ? 'Perfect for professional traders' : 'Great for getting started'}
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Footer */}
        <div className="border-t border-slate-700/50 px-8 py-8">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-slate-400 text-sm max-w-4xl mx-auto">
            <div className="flex items-center justify-center space-x-3">
              <div className="w-8 h-8 bg-green-500/20 rounded-full flex items-center justify-center">
                <svg className="w-4 h-4 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <span>30-day money back guarantee</span>
            </div>
            <div className="flex items-center justify-center space-x-3">
              <div className="w-8 h-8 bg-blue-500/20 rounded-full flex items-center justify-center">
                <svg className="w-4 h-4 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                </svg>
              </div>
              <span>Secure payment processing</span>
            </div>
            <div className="flex items-center justify-center space-x-3">
              <div className="w-8 h-8 bg-purple-500/20 rounded-full flex items-center justify-center">
                <svg className="w-4 h-4 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                </svg>
              </div>
              <span>Cancel anytime</span>
            </div>
          </div>
          
          <div className="text-center mt-6">
            <p className="text-slate-500 text-sm">
              Join thousands of successful traders already using our AI-powered platform
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}