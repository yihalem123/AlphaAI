'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { LoadingSpinner } from '@/components/ui/loading-spinner'
import { useAuth } from '@/hooks/use-auth'
import { authService } from '@/lib/auth-service'
import { Wallet, MessageCircle, AlertCircle, Mail } from 'lucide-react'

interface LoginDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function LoginDialog({ open, onOpenChange }: LoginDialogProps) {
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')
  const [walletAddress, setWalletAddress] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [name, setName] = useState('')
  const [isSignup, setIsSignup] = useState(false)
  const { login } = useAuth()

  const handleEmailAuth = async () => {
    try {
      setIsLoading(true)
      setError('')

      if (!email || !password) {
        throw new Error('Please enter email and password')
      }

      if (isSignup && !name) {
        throw new Error('Please enter your name')
      }

      let response
      if (isSignup) {
        response = await authService.signupWithEmail({
          email,
          password,
          name,
          plan: 'free'
        })
      } else {
        response = await authService.loginWithEmail({
          email,
          password
        })
      }

      login(response.access_token, response.user)
      onOpenChange(false)
    } catch (err: any) {
      setError(err.message || 'Authentication failed')
    } finally {
      setIsLoading(false)
    }
  }

  const handleTelegramLogin = async () => {
    try {
      setIsLoading(true)
      setError('')

      // Check if Telegram WebApp is available
      if (typeof window !== 'undefined' && (window as any).Telegram?.WebApp) {
        const tg = (window as any).Telegram.WebApp
        const user = tg.initDataUnsafe?.user

        if (user) {
          const authData = {
            id: user.id,
            first_name: user.first_name,
            last_name: user.last_name,
            username: user.username,
            photo_url: user.photo_url,
            auth_date: Math.floor(Date.now() / 1000),
            hash: 'demo_hash' // In production, use proper Telegram auth hash
          }

          const response = await authService.loginWithTelegram(authData)
          login(response.access_token, response.user)
          onOpenChange(false)
        } else {
          throw new Error('Telegram user data not available')
        }
      } else {
        // Demo login for development
        const demoAuthData = {
          id: 123456789,
          first_name: 'Demo',
          last_name: 'User',
          username: 'demo_user',
          auth_date: Math.floor(Date.now() / 1000),
          hash: 'demo_hash'
        }

        const response = await authService.loginWithTelegram(demoAuthData)
        login(response.access_token, response.user)
        onOpenChange(false)
      }
    } catch (err: any) {
      setError(err.message || 'Telegram login failed')
    } finally {
      setIsLoading(false)
    }
  }

  const handleWalletLogin = async () => {
    try {
      setIsLoading(true)
      setError('')

      if (!walletAddress) {
        throw new Error('Please enter a wallet address')
      }

      // In production, this would use WalletConnect or MetaMask to sign a message
      const message = `Sign this message to authenticate with AI Trading Assistant: ${Date.now()}`
      const signature = 'demo_signature_' + Math.random().toString(36).substr(2, 9)

      const authData = {
        address: walletAddress,
        signature,
        message
      }

      const response = await authService.loginWithWallet(authData)
      login(response.access_token, response.user)
      onOpenChange(false)
    } catch (err: any) {
      setError(err.message || 'Wallet login failed')
    } finally {
      setIsLoading(false)
    }
  }

  const connectMetaMask = async () => {
    try {
      if (typeof window !== 'undefined' && (window as any).ethereum) {
        const accounts = await (window as any).ethereum.request({ 
          method: 'eth_requestAccounts' 
        })
        
        if (accounts.length > 0) {
          setWalletAddress(accounts[0])
        }
      } else {
        throw new Error('MetaMask not detected. Please install MetaMask.')
      }
    } catch (err: any) {
      setError(err.message || 'Failed to connect MetaMask')
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-2xl text-center">Welcome Back</DialogTitle>
          <DialogDescription className="text-center">
            Choose your preferred way to sign in to AI Trading Assistant
          </DialogDescription>
        </DialogHeader>

        <Tabs defaultValue="email" className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="email" className="flex items-center gap-2">
              <Mail className="w-4 h-4" />
              Email
            </TabsTrigger>
            <TabsTrigger value="telegram" className="flex items-center gap-2">
              <MessageCircle className="w-4 h-4" />
              Telegram
            </TabsTrigger>
            <TabsTrigger value="wallet" className="flex items-center gap-2">
              <Wallet className="w-4 h-4" />
              Wallet
            </TabsTrigger>
          </TabsList>

          <TabsContent value="email" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Mail className="w-5 h-5 text-primary" />
                  {isSignup ? 'Create Account' : 'Email Login'}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  {isSignup && (
                    <Input
                      type="text"
                      placeholder="Your name"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                    />
                  )}
                  <Input
                    type="email"
                    placeholder="Email address"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                  />
                  <Input
                    type="password"
                    placeholder="Password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                  />
                </div>
                
                <Button 
                  onClick={handleEmailAuth}
                  disabled={isLoading}
                  className="w-full"
                >
                  {isLoading ? (
                    <LoadingSpinner size="sm" />
                  ) : (
                    <>
                      <Mail className="w-4 h-4 mr-2" />
                      {isSignup ? 'Create Account' : 'Sign In'}
                    </>
                  )}
                </Button>

                <div className="text-center">
                  <button
                    type="button"
                    onClick={() => setIsSignup(!isSignup)}
                    className="text-sm text-primary hover:underline"
                  >
                    {isSignup ? 'Already have an account? Sign in' : "Don't have an account? Sign up"}
                  </button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="telegram" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <MessageCircle className="w-5 h-5 text-primary" />
                  Telegram Login
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-sm text-muted-foreground">
                  Sign in with your Telegram account to sync your bot experience with the web app.
                </p>
                
                <Button 
                  onClick={handleTelegramLogin}
                  disabled={isLoading}
                  className="w-full"
                >
                  {isLoading ? (
                    <LoadingSpinner size="sm" />
                  ) : (
                    <>
                      <MessageCircle className="w-4 h-4 mr-2" />
                      Continue with Telegram
                    </>
                  )}
                </Button>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="wallet" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Wallet className="w-5 h-5 text-primary" />
                  Crypto Wallet Login
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-sm text-muted-foreground">
                  Connect your crypto wallet to access portfolio features and premium subscriptions.
                </p>
                
                <div className="space-y-2">
                  <div className="flex gap-2">
                    <Input
                      placeholder="Enter wallet address or connect MetaMask"
                      value={walletAddress}
                      onChange={(e) => setWalletAddress(e.target.value)}
                      className="flex-1"
                    />
                    <Button 
                      onClick={connectMetaMask}
                      variant="outline"
                      size="sm"
                    >
                      MetaMask
                    </Button>
                  </div>
                  
                  <Button 
                    onClick={handleWalletLogin}
                    disabled={isLoading || !walletAddress}
                    className="w-full"
                  >
                    {isLoading ? (
                      <LoadingSpinner size="sm" />
                    ) : (
                      <>
                        <Wallet className="w-4 h-4 mr-2" />
                        Sign Message & Login
                      </>
                    )}
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {error && (
          <div className="flex items-center gap-2 p-3 rounded-md bg-destructive/10 text-destructive border border-destructive/20">
            <AlertCircle className="w-4 h-4" />
            <span className="text-sm">{error}</span>
          </div>
        )}

        <div className="text-center text-xs text-muted-foreground">
          By signing in, you agree to our Terms of Service and Privacy Policy
        </div>
      </DialogContent>
    </Dialog>
  )
}