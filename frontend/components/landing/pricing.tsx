'use client'

import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { useAuth } from '@/hooks/use-auth'
import { Check, Star, Zap, Crown, Rocket } from 'lucide-react'

interface PricingProps {
  onAuthRequired?: () => void
}

export function Pricing({ onAuthRequired }: PricingProps) {
  const { user } = useAuth()

  const plans = [
    {
      id: 'free',
      name: 'Free',
      price: '$0',
      period: 'forever',
      description: 'Perfect for getting started with AI trading insights',
      icon: Rocket,
      color: 'text-green-500',
      bgColor: 'bg-green-500/10',
      borderColor: 'border-green-500/20',
      features: [
        '5 AI queries per day',
        'Basic market data',
        'Portfolio tracking',
        'Email support',
        'Community access'
      ],
      popular: false,
      buttonText: user ? 'Current Plan' : 'Get Started Free',
      buttonVariant: 'outline' as const
    },
    {
      id: 'pro',
      name: 'Pro',
      price: '$29',
      period: 'per month',
      description: 'For serious traders who need powerful AI insights',
      icon: Zap,
      color: 'text-blue-500',
      bgColor: 'bg-blue-500/10',
      borderColor: 'border-blue-500/20',
      features: [
        '1000 AI queries per day',
        'Real-time signals',
        'Advanced analytics',
        'Priority support',
        'API access',
        'Custom alerts',
        'Portfolio optimization'
      ],
      popular: true,
      buttonText: user ? 'Upgrade to Pro' : 'Start Pro Trial',
      buttonVariant: 'default' as const
    },
    {
      id: 'enterprise',
      name: 'Enterprise',
      price: '$99',
      period: 'per month',
      description: 'For professional trading teams and institutions',
      icon: Crown,
      color: 'text-purple-500',
      bgColor: 'bg-purple-500/10',
      borderColor: 'border-purple-500/20',
      features: [
        '10000 AI queries per day',
        'Team collaboration',
        'Custom integrations',
        '24/7 phone support',
        'Dedicated account manager',
        'White-label solutions',
        'Custom AI models',
        'Advanced compliance'
      ],
      popular: false,
      buttonText: user ? 'Contact Sales' : 'Contact Sales',
      buttonVariant: 'outline' as const
    }
  ]

  const handlePlanSelect = (planId: string) => {
    if (!user) {
      // User not authenticated, show auth popup
      onAuthRequired?.()
      return
    }

    // User is authenticated, handle upgrade
    if (planId === 'enterprise') {
      // Handle enterprise contact
      window.open('mailto:sales@aitradingassistant.com?subject=Enterprise Plan Inquiry', '_blank')
    } else if (planId === 'pro') {
      // Handle pro upgrade
      console.log('Upgrading to Pro plan...')
    }
  }

  return (
    <section className="py-24 bg-gradient-to-br from-background via-background to-primary/5">
      <div className="container px-4 mx-auto">
        <div className="text-center mb-16">
          <Badge variant="outline" className="mb-6 text-primary border-primary/30">
            💎 Pricing Plans
          </Badge>
          <h2 className="text-4xl md:text-5xl lg:text-6xl font-bold mb-6">
            Choose Your
            <span className="block bg-gradient-to-r from-primary to-bull bg-clip-text text-transparent">
              Trading Edge
            </span>
          </h2>
          <p className="text-xl text-muted-foreground max-w-3xl mx-auto">
            Start free and upgrade as you grow. No hidden fees, cancel anytime.
            Join thousands of traders making smarter decisions with AI.
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-8 max-w-6xl mx-auto">
          {plans.map((plan) => {
            const Icon = plan.icon
            return (
              <Card 
                key={plan.id}
                className={`relative border-2 ${plan.borderColor} ${plan.bgColor} backdrop-blur-sm transition-all duration-300 hover:scale-105 hover:shadow-2xl ${
                  plan.popular ? 'ring-2 ring-primary/20 shadow-xl scale-105' : 'hover:border-primary/30'
                }`}
              >
                {plan.popular && (
                  <div className="absolute -top-4 left-1/2 transform -translate-x-1/2">
                    <Badge className="bg-gradient-to-r from-primary to-bull px-4 py-2 text-white font-semibold shadow-lg">
                      <Star className="w-4 h-4 mr-1" />
                      Most Popular
                    </Badge>
                  </div>
                )}

                <CardHeader className="text-center pb-4">
                  <div className={`inline-flex items-center justify-center w-16 h-16 rounded-2xl ${plan.bgColor} ${plan.color} mb-4 mx-auto`}>
                    <Icon className="w-8 h-8" />
                  </div>
                  <CardTitle className="text-2xl font-bold">{plan.name}</CardTitle>
                  <p className="text-muted-foreground text-sm">{plan.description}</p>
                  <div className="mt-4">
                    <span className="text-4xl font-bold">{plan.price}</span>
                    <span className="text-muted-foreground ml-2">/{plan.period}</span>
                  </div>
                </CardHeader>

                <CardContent className="space-y-6">
                  <ul className="space-y-3">
                    {plan.features.map((feature, index) => (
                      <li key={index} className="flex items-start gap-3">
                        <Check className="w-5 h-5 text-green-500 mt-0.5 flex-shrink-0" />
                        <span className="text-sm">{feature}</span>
                      </li>
                    ))}
                  </ul>

                  <Button
                    variant={plan.buttonVariant}
                    className={`w-full h-12 text-base font-semibold transition-all duration-300 ${
                      plan.popular 
                        ? 'bg-gradient-to-r from-primary to-bull hover:from-primary/90 hover:to-bull/90 shadow-lg hover:shadow-xl' 
                        : ''
                    }`}
                    onClick={() => handlePlanSelect(plan.id)}
                  >
                    {plan.buttonText}
                  </Button>
                </CardContent>
              </Card>
            )
          })}
        </div>

        {/* Trust Indicators */}
        <div className="mt-16 text-center">
          <div className="flex flex-wrap justify-center items-center gap-8 text-sm text-muted-foreground">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
              <span>✓ 30-day money-back guarantee</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
              <span>✓ Cancel anytime</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 bg-purple-500 rounded-full"></div>
              <span>✓ 24/7 support</span>
            </div>
          </div>
        </div>

        {/* FAQ Section */}
        <div className="mt-24 max-w-4xl mx-auto">
          <h3 className="text-2xl font-bold text-center mb-12">Frequently Asked Questions</h3>
          <div className="grid md:grid-cols-2 gap-8">
            <div className="space-y-4">
              <h4 className="font-semibold">Can I upgrade or downgrade anytime?</h4>
              <p className="text-muted-foreground text-sm">
                Yes! You can upgrade, downgrade, or cancel your subscription at any time. 
                Changes take effect immediately.
              </p>
            </div>
            <div className="space-y-4">
              <h4 className="font-semibold">What payment methods do you accept?</h4>
              <p className="text-muted-foreground text-sm">
                We accept all major credit cards, PayPal, and cryptocurrency payments for your convenience.
              </p>
            </div>
            <div className="space-y-4">
              <h4 className="font-semibold">Is there a free trial?</h4>
              <p className="text-muted-foreground text-sm">
                Our Free plan gives you 5 AI queries per day forever. Pro plan comes with a 7-day free trial.
              </p>
            </div>
            <div className="space-y-4">
              <h4 className="font-semibold">Do you offer enterprise solutions?</h4>
              <p className="text-muted-foreground text-sm">
                Yes! Our Enterprise plan includes custom integrations, dedicated support, and white-label solutions.
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}