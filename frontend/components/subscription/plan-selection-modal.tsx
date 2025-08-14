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
        'Technical analysis tools',
        'Priority support'
      ],
      popular: true,
      savings: billingPeriod === 'yearly' ? 'Save $58/year' : undefined
    },
    {
      id: 'enterprise',
      name: 'Enterprise',
      price: billingPeriod === 'monthly' ? 99 : 990,
      currency: 'USD',
      billing_period: billingPeriod,
      features: [
        'Unlimited API calls',
        'Advanced portfolio management',
        'Custom trading strategies',
        'Real-time notifications',
        'Advanced AI analysis',
        'Custom indicators',
        'White-label solutions',
        'Dedicated support',
        'API access & webhooks'
      ],
      highlighted: true,
      savings: billingPeriod === 'yearly' ? 'Save $198/year' : undefined
    }
  ]

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="bg-white rounded-2xl max-w-4xl w-full shadow-xl relative">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 w-8 h-8 bg-gray-100 hover:bg-gray-200 rounded-full flex items-center justify-center text-gray-600 transition-colors"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>

        {/* Header */}
        <div className="text-center px-8 pt-8 pb-6">
          <h2 className="text-3xl font-semibold text-gray-900 mb-3">
            Choose Your Plan
          </h2>
          <p className="text-gray-600 text-lg">
            Select the plan that best fits your trading needs
          </p>
        </div>

        {/* Billing Period Toggle */}
        <div className="flex justify-center mb-8">
          <div className="bg-gray-100 rounded-lg p-1">
            <button
              onClick={() => setBillingPeriod('monthly')}
              className={`px-6 py-2 rounded-md font-medium transition-all ${
                billingPeriod === 'monthly'
                  ? 'bg-white text-gray-900 shadow-sm'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              Monthly
            </button>
            <button
              onClick={() => setBillingPeriod('yearly')}
              className={`px-6 py-2 rounded-md font-medium transition-all relative ${
                billingPeriod === 'yearly'
                  ? 'bg-white text-gray-900 shadow-sm'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              Yearly
              {billingPeriod === 'yearly' && (
                <span className="absolute -top-2 -right-2 bg-green-500 text-white text-xs px-2 py-0.5 rounded-full">
                  Save
                </span>
              )}
            </button>
          </div>
        </div>

        {/* Plans Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 px-8 pb-8">
          {plans.map((plan) => (
            <div
              key={plan.id}
              className={`relative rounded-xl border-2 transition-all duration-300 cursor-pointer group ${
                plan.highlighted
                  ? 'border-gray-900 bg-gray-50'
                  : 'border-gray-200 hover:border-gray-300 bg-white'
              }`}
              onClick={() => onSelectPlan(plan)}
            >
              {/* Popular Badge */}
              {plan.popular && !plan.highlighted && (
                <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
                  <span className="bg-gray-900 text-white text-sm font-medium px-3 py-1 rounded-full">
                    Most Popular
                  </span>
                </div>
              )}

              {/* Best Value Badge */}
              {plan.highlighted && (
                <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
                  <span className="bg-gray-900 text-white text-sm font-medium px-3 py-1 rounded-full">
                    Best Value
                  </span>
                </div>
              )}

              {/* Plan Content */}
              <div className="p-8">
                {/* Plan Header */}
                <div className="text-center mb-8">
                  <h3 className="text-2xl font-semibold text-gray-900 mb-2">{plan.name}</h3>
                  <div className="mb-3">
                    <span className="text-4xl font-bold text-gray-900">${plan.price}</span>
                    <span className="text-gray-600 ml-1">
                      /{billingPeriod === 'monthly' ? 'month' : 'year'}
                    </span>
                  </div>
                  {plan.savings && (
                    <div className="text-green-600 font-medium text-sm">
                      {plan.savings}
                    </div>
                  )}
                </div>

                {/* Features */}
                <div className="space-y-4 mb-8">
                  {plan.features.map((feature, idx) => (
                    <div key={idx} className="flex items-start">
                      <svg className="w-5 h-5 text-green-500 mr-3 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                      <span className="text-gray-700">{feature}</span>
                    </div>
                  ))}
                </div>

                {/* CTA Button */}
                <button
                  onClick={() => onSelectPlan(plan)}
                  className={`w-full py-3 px-6 rounded-lg font-medium transition-all duration-300 ${
                    plan.highlighted
                      ? 'bg-gray-900 text-white hover:bg-gray-800'
                      : 'bg-gray-900 text-white hover:bg-gray-800'
                  }`}
                >
                  Get Started with {plan.name}
                </button>
              </div>
            </div>
          ))}
        </div>

        {/* Footer */}
        <div className="text-center px-8 pb-8">
          <div className="border-t border-gray-200 pt-6">
            <div className="flex items-center justify-center space-x-8 text-gray-500 text-sm">
              <div className="flex items-center space-x-2">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span>30-day money back guarantee</span>
              </div>
              <div className="flex items-center space-x-2">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                </svg>
                <span>Secure payment</span>
              </div>
              <div className="flex items-center space-x-2">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                </svg>
                <span>Cancel anytime</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}