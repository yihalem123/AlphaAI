'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { 
  Bot, 
  TrendingUp, 
  MessageSquare, 
  PieChart, 
  Zap, 
  Shield,
  Smartphone,
  Globe,
  Brain
} from 'lucide-react'

export function Features() {
  const features = [
    {
      title: "AI Trading Assistant",
      description: "Natural language chat interface powered by advanced AI models. Ask questions, get insights, and receive personalized trading advice.",
      icon: Bot,
      color: "text-primary",
      bgColor: "bg-primary/10"
    },
    {
      title: "Smart Signal Generation", 
      description: "AI-generated buy/sell/hold signals with confidence scores based on technical analysis and market sentiment.",
      icon: TrendingUp,
      color: "text-bull",
      bgColor: "bg-bull/10"
    },
    {
      title: "Portfolio Analytics",
      description: "Comprehensive portfolio tracking with AI-powered insights, risk assessment, and optimization recommendations.",
      icon: PieChart,
      color: "text-bear",
      bgColor: "bg-bear/10"
    },
    {
      title: "Real-time Market Data",
      description: "Live cryptocurrency prices, market sentiment analysis, and trending coins with comprehensive market overview.",
      icon: Zap,
      color: "text-primary",
      bgColor: "bg-primary/10"
    },
    {
      title: "Risk Management",
      description: "Built-in risk assessment tools with position sizing recommendations and portfolio diversification analysis.",
      icon: Shield,
      color: "text-bull",
      bgColor: "bg-bull/10"
    },
    {
      title: "Dual Platform Access",
      description: "Available on both web and Telegram with seamless synchronization. Trade and monitor from anywhere.",
      icon: Smartphone,
      color: "text-bear",
      bgColor: "bg-bear/10"
    },
    {
      title: "24/7 Market Monitoring",
      description: "Continuous market surveillance with instant alerts for significant price movements and trading opportunities.",
      icon: Globe,
      color: "text-primary",
      bgColor: "bg-primary/10"
    },
    {
      title: "Advanced Analytics",
      description: "Deep market analysis using machine learning algorithms to identify patterns and predict market movements.",
      icon: Brain,
      color: "text-bull",
      bgColor: "bg-bull/10"
    },
    {
      title: "Interactive Chat",
      description: "Conversational AI that learns your trading preferences and provides personalized recommendations over time.",
      icon: MessageSquare,
      color: "text-bear",
      bgColor: "bg-bear/10"
    }
  ]

  return (
    <section className="py-24 bg-muted/30">
      <div className="container px-4 mx-auto">
        <div className="text-center mb-16">
          <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold mb-4">
            Everything You Need to
            <span className="block bg-gradient-to-r from-primary to-bull bg-clip-text text-transparent">
              Trade Like a Pro
            </span>
          </h2>
          <p className="text-xl text-muted-foreground max-w-3xl mx-auto">
            Our AI-powered platform combines advanced market analysis, intelligent signals, 
            and comprehensive portfolio management in one seamless experience.
          </p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8 max-w-7xl mx-auto">
          {features.map((feature, index) => {
            const Icon = feature.icon
            return (
              <Card 
                key={index} 
                className="border-0 shadow-lg hover:shadow-xl transition-all duration-300 hover:-translate-y-1 bg-background/50 backdrop-blur-sm"
              >
                <CardHeader>
                  <div className={`inline-flex items-center justify-center w-12 h-12 rounded-lg ${feature.bgColor} ${feature.color} mb-4`}>
                    <Icon className="w-6 h-6" />
                  </div>
                  <CardTitle className="text-lg">{feature.title}</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground leading-relaxed">
                    {feature.description}
                  </p>
                </CardContent>
              </Card>
            )
          })}
        </div>

        {/* Testimonial Section */}
        <div className="mt-24 text-center">
          <div className="max-w-4xl mx-auto">
            <blockquote className="text-2xl md:text-3xl font-medium text-foreground mb-6">
              "The AI Trading Assistant has completely transformed how I approach cryptocurrency trading. 
              The insights are incredibly accurate and the chat interface makes complex analysis accessible."
            </blockquote>
            <div className="flex items-center justify-center gap-4">
              <div className="w-12 h-12 rounded-full bg-gradient-to-r from-primary to-bull" />
              <div className="text-left">
                <div className="font-semibold">Alex Chen</div>
                <div className="text-sm text-muted-foreground">Professional Crypto Trader</div>
              </div>
            </div>
          </div>
        </div>

        {/* CTA Section */}
        <div className="mt-24 text-center">
          <div className="max-w-2xl mx-auto p-8 rounded-2xl bg-gradient-to-r from-primary/10 to-bull/10 border border-primary/20">
            <h3 className="text-2xl md:text-3xl font-bold mb-4">
              Ready to Start Trading Smarter?
            </h3>
            <p className="text-muted-foreground mb-6">
              Join thousands of traders who are already using AI to make better trading decisions.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <div className="text-sm text-muted-foreground">
                ✓ Free tier available  ✓ No credit card required  ✓ Start in 30 seconds
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}