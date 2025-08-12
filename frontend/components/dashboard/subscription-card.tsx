'use client'

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { useAuth } from '@/hooks/use-auth'
import { Crown, Zap, ArrowUp, Loader2 } from 'lucide-react'

export function SubscriptionCard() {
  const { user, updateUser } = useAuth()
  const [isUpgrading, setIsUpgrading] = useState(false)
  const [error, setError] = useState('')

  if (!user) return null

  const handleUpgrade = async () => {
    try {
      setIsUpgrading(true)
      setError('')
      
      const token = localStorage.getItem('auth_token')
      const response = await fetch('http://localhost:8000/api/auth/upgrade', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      })

      if (!response.ok) {
        throw new Error('Upgrade failed')
      }

      const data = await response.json()
      
      // Update user data with new subscription tier
      updateUser({ 
        subscription_tier: data.plan,
        daily_limit: data.queries_limit
      })
      
    } catch (err: any) {
      setError(err.message || 'Upgrade failed')
    } finally {
      setIsUpgrading(false)
    }
  }

  const getSubscriptionIcon = () => {
    switch (user.subscription_tier) {
      case 'premium':
        return <Crown className="w-5 h-5 text-yellow-500" />
      case 'pro':
        return <Zap className="w-5 h-5 text-blue-500" />
      default:
        return <ArrowUp className="w-5 h-5 text-gray-500" />
    }
  }

  const getUpgradeText = () => {
    switch (user.subscription_tier) {
      case 'free':
        return 'Upgrade to Pro for unlimited AI queries and advanced features'
      case 'pro':
        return 'Upgrade to Premium for priority support and exclusive features'
      default:
        return 'You have the ultimate trading experience!'
    }
  }

  const getFeatures = () => {
    switch (user.subscription_tier) {
      case 'free':
        return [
          '10 AI queries per day',
          'Basic market data',
          'Signal viewing',
          'Portfolio tracking'
        ]
      case 'pro':
        return [
          '100 AI queries per day',
          'Advanced analysis',
          'Signal generation',
          'Market alerts'
        ]
      case 'premium':
        return [
          '1000 AI queries per day',
          'Priority AI responses',
          'Custom strategies',
          '24/7 priority support'
        ]
      default:
        return []
    }
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2">
          {getSubscriptionIcon()}
          Current Plan
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center justify-between">
          <Badge 
            variant={user.subscription_tier === 'free' ? 'secondary' : 'default'}
            className="capitalize text-sm"
          >
            {user.subscription_tier}
          </Badge>
          
          {user.subscription_expires && (
            <div className="text-xs text-muted-foreground">
              Expires: {new Date(user.subscription_expires).toLocaleDateString()}
            </div>
          )}
        </div>

        <div className="space-y-2">
          <h4 className="font-semibold text-sm">Features:</h4>
          <ul className="space-y-1">
            {getFeatures().map((feature, index) => (
              <li key={index} className="text-xs text-muted-foreground flex items-center gap-2">
                <div className="w-1 h-1 bg-primary rounded-full" />
                {feature}
              </li>
            ))}
          </ul>
        </div>

        {user.subscription_tier !== 'premium' && (
          <div className="pt-3 border-t space-y-3">
            <p className="text-xs text-muted-foreground">
              {getUpgradeText()}
            </p>
            {error && (
              <p className="text-xs text-red-500">{error}</p>
            )}
            <Button 
              size="sm" 
              className="w-full" 
              onClick={handleUpgrade}
              disabled={isUpgrading}
            >
              {isUpgrading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Upgrading...
                </>
              ) : (
                'Upgrade Now'
              )}
            </Button>
          </div>
        )}

        {/* Usage Progress */}
        <div className="pt-3 border-t space-y-2">
          <div className="flex justify-between text-xs">
            <span className="text-muted-foreground">Daily Usage</span>
            <span>{user.api_calls_count}/{user.daily_limit}</span>
          </div>
          <div className="w-full bg-muted rounded-full h-2">
            <div 
              className="bg-primary h-2 rounded-full transition-all duration-300"
              style={{ 
                width: `${Math.min(100, (user.api_calls_count / user.daily_limit) * 100)}%` 
              }}
            />
          </div>
          {user.api_calls_count >= user.daily_limit && (
            <p className="text-xs text-bear">
              Daily limit reached. Upgrade for more queries.
            </p>
          )}
        </div>
      </CardContent>
    </Card>
  )
}