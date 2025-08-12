export interface User {
  id: number
  telegram_id?: number
  wallet_address?: string
  email?: string
  username?: string
  subscription_tier: 'free' | 'pro' | 'premium'
  subscription_expires?: string
  api_calls_count: number
  daily_limit: number
  preferences: Record<string, any>
  created_at: string
  is_active: boolean
}

export interface LoginResponse {
  access_token: string
  token_type: string
  expires_in: number
  user: User
}

export interface TelegramAuthData {
  id: number
  first_name: string
  last_name?: string
  username?: string
  photo_url?: string
  auth_date: number
  hash: string
}

export interface WalletAuthData {
  address: string
  signature: string
  message: string
}