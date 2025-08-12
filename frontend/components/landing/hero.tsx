'use client'

import { Button } from '@/components/ui/button'
import { ArrowRight, Bot, TrendingUp, Shield } from 'lucide-react'

interface HeroProps {
  onGetStarted: () => void
}

export function Hero({ onGetStarted }: HeroProps) {
  return (
    <section className="relative overflow-hidden bg-gradient-to-br from-background via-background to-primary/5">
      <div className="absolute inset-0 bg-grid-pattern opacity-5" />
      
      <div className="container relative px-4 py-24 mx-auto text-center">
        <div className="max-w-4xl mx-auto">
          {/* Badge */}
          <div className="inline-flex items-center px-4 py-2 mb-8 rounded-full bg-primary/10 text-primary border border-primary/20">
            <Bot className="w-4 h-4 mr-2" />
            <span className="text-sm font-medium">AI-Powered Trading Assistant</span>
          </div>

          {/* Main Heading */}
          <h1 className="text-4xl md:text-6xl lg:text-7xl font-bold tracking-tight mb-6">
            Trade Smarter with
            <span className="block bg-gradient-to-r from-primary to-bull bg-clip-text text-transparent">
              AI Insights
            </span>
          </h1>

          {/* Subtitle */}
          <p className="text-xl md:text-2xl text-muted-foreground mb-8 max-w-3xl mx-auto">
            Your personal AI trading companion that analyzes markets, provides intelligent signals, 
            and helps you make informed cryptocurrency trading decisions.
          </p>

          {/* CTA Buttons */}
          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center mb-12">
            <Button 
              size="lg" 
              className="text-lg px-8 py-6 h-auto bg-gradient-to-r from-primary to-bull hover:from-primary/90 hover:to-bull/90 shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105"
              onClick={onGetStarted}
            >
              🚀 Start Trading Smarter
              <ArrowRight className="w-5 h-5 ml-2" />
            </Button>
            
            <Button 
              variant="outline" 
              size="lg" 
              className="text-lg px-8 py-6 h-auto border-2 border-primary/30 hover:border-primary/60 bg-background/50 backdrop-blur-sm hover:bg-background/70 transition-all duration-300"
            >
              📹 Watch Demo
            </Button>
          </div>

          {/* Trust Indicators */}
          <div className="flex flex-wrap justify-center items-center gap-6 mb-12 text-sm text-muted-foreground">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
              <span>Free tier available</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
              <span>No credit card required</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 bg-purple-500 rounded-full"></div>
              <span>Start in 30 seconds</span>
            </div>
          </div>

          {/* Features Grid */}
          <div className="grid md:grid-cols-3 gap-8 max-w-4xl mx-auto">
            <div className="text-center">
              <div className="inline-flex items-center justify-center w-12 h-12 rounded-lg bg-bull/10 text-bull mb-4">
                <TrendingUp className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-semibold mb-2">Smart Analysis</h3>
              <p className="text-muted-foreground">
                AI-powered market sentiment and technical analysis for better trading decisions
              </p>
            </div>

            <div className="text-center">
              <div className="inline-flex items-center justify-center w-12 h-12 rounded-lg bg-primary/10 text-primary mb-4">
                <Bot className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-semibold mb-2">24/7 Assistant</h3>
              <p className="text-muted-foreground">
                Chat-based AI assistant available anytime via Telegram or web app
              </p>
            </div>

            <div className="text-center">
              <div className="inline-flex items-center justify-center w-12 h-12 rounded-lg bg-bear/10 text-bear mb-4">
                <Shield className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-semibold mb-2">Risk Management</h3>
              <p className="text-muted-foreground">
                Built-in risk assessment and portfolio optimization recommendations
              </p>
            </div>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 max-w-2xl mx-auto mt-16 pt-16 border-t border-border">
            <div className="text-center">
              <div className="text-2xl md:text-3xl font-bold text-bull">95%</div>
              <div className="text-sm text-muted-foreground">Signal Accuracy</div>
            </div>
            <div className="text-center">
              <div className="text-2xl md:text-3xl font-bold text-primary">24/7</div>
              <div className="text-sm text-muted-foreground">AI Monitoring</div>
            </div>
            <div className="text-center">
              <div className="text-2xl md:text-3xl font-bold text-bull">100+</div>
              <div className="text-sm text-muted-foreground">Crypto Assets</div>
            </div>
            <div className="text-center">
              <div className="text-2xl md:text-3xl font-bold text-primary">1M+</div>
              <div className="text-sm text-muted-foreground">Analysis Points</div>
            </div>
          </div>
        </div>
      </div>

      {/* Background Elements */}
      <div className="absolute top-1/4 left-1/4 w-72 h-72 bg-primary/10 rounded-full blur-3xl opacity-20 animate-float" />
      <div className="absolute bottom-1/4 right-1/4 w-72 h-72 bg-bull/10 rounded-full blur-3xl opacity-20 animate-float" style={{ animationDelay: '2s' }} />
    </section>
  )
}