import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

// Routes that require authentication
const protectedRoutes = ['/dashboard', '/profile', '/subscription', '/admin']

// Routes that should redirect authenticated users away
const authRoutes = ['/login', '/register']

// API routes that need CSRF protection
const csrfProtectedRoutes = [
  '/api/auth/register',
  '/api/auth/login', 
  '/api/auth/logout',
  '/api/subscription/upgrade'
]

// Rate limiting (basic client-side)
const rateLimitMap = new Map<string, { requests: number[]; lastReset: number }>()

function isRateLimited(ip: string, maxRequests = 100, windowMs = 60000): boolean {
  const now = Date.now()
  const userLimits = rateLimitMap.get(ip) || { requests: [], lastReset: now }
  
  // Reset window if needed
  if (now - userLimits.lastReset > windowMs) {
    userLimits.requests = []
    userLimits.lastReset = now
  }
  
  // Clean old requests
  userLimits.requests = userLimits.requests.filter(time => now - time < windowMs)
  
  // Check limit
  if (userLimits.requests.length >= maxRequests) {
    return true
  }
  
  // Add current request
  userLimits.requests.push(now)
  rateLimitMap.set(ip, userLimits)
  
  return false
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl
  const response = NextResponse.next()
  
  // Get client IP
  const ip = request.ip || request.headers.get('x-forwarded-for') || 'unknown'
  
  // Rate limiting
  if (isRateLimited(ip)) {
    return new NextResponse(
      JSON.stringify({ error: 'Too Many Requests' }),
      {
        status: 429,
        headers: {
          'Content-Type': 'application/json',
          'Retry-After': '60'
        }
      }
    )
  }
  
  // Enhanced security headers
  response.headers.set('X-Content-Type-Options', 'nosniff')
  response.headers.set('X-Frame-Options', 'DENY')
  response.headers.set('X-XSS-Protection', '1; mode=block')
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin')
  response.headers.set('X-DNS-Prefetch-Control', 'off')
  response.headers.set('X-Download-Options', 'noopen')
  response.headers.set('X-Permitted-Cross-Domain-Policies', 'none')
  
  // Strict Transport Security (HTTPS only)
  if (request.nextUrl.protocol === 'https:') {
    response.headers.set('Strict-Transport-Security', 'max-age=31536000; includeSubDomains; preload')
  }
  
  // Content Security Policy
  const csp = [
    "default-src 'self'",
    "script-src 'self' 'unsafe-eval' 'unsafe-inline'", // Next.js requires unsafe-eval and unsafe-inline in dev
    "style-src 'self' 'unsafe-inline'", // Styled-components require unsafe-inline
    "img-src 'self' data: https: blob:",
    "font-src 'self' data:",
    "connect-src 'self' " + (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'),
    "media-src 'self'",
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "frame-ancestors 'none'",
    "upgrade-insecure-requests"
  ].join('; ')
  
  response.headers.set('Content-Security-Policy', csp)
  
  // Handle CSRF protection for API routes
  if (csrfProtectedRoutes.some(route => pathname.startsWith(route))) {
    const csrfToken = request.headers.get('X-CSRF-Token')
    if (!csrfToken && request.method !== 'GET') {
      return new NextResponse(
        JSON.stringify({ error: 'CSRF token required' }),
        { 
          status: 403, 
          headers: { 'Content-Type': 'application/json' } 
        }
      )
    }
  }
  
  // Get tokens from cookies
  const accessToken = request.cookies.get('access_token')?.value
  const refreshToken = request.cookies.get('refresh_token')?.value
  
  // Check if user is authenticated
  const isAuthenticated = !!accessToken
  
  // Handle protected routes
  if (protectedRoutes.some(route => pathname.startsWith(route))) {
    if (!isAuthenticated) {
      // Clear any invalid cookies
      if (refreshToken) {
        response.cookies.delete('access_token')
        response.cookies.delete('refresh_token')
      }
      
      // Redirect to login with return URL
      const loginUrl = new URL('/', request.url) // Redirect to landing page instead
      if (pathname !== '/') {
        loginUrl.searchParams.set('redirect', pathname)
      }
      return NextResponse.redirect(loginUrl)
    }
  }
  
  // Handle auth routes (redirect away if already authenticated)
  if (authRoutes.some(route => pathname.startsWith(route))) {
    if (isAuthenticated) {
      const dashboardUrl = new URL('/dashboard', request.url)
      return NextResponse.redirect(dashboardUrl)
    }
  }
  
  // Security logging for suspicious activity
  const userAgent = request.headers.get('user-agent') || ''
  const suspiciousPatterns = [
    /bot/i, /crawler/i, /spider/i, /scraper/i,
    /sql/i, /script/i, /union/i, /select/i,
    /<script/i, /javascript:/i, /vbscript:/i
  ]
  
  if (suspiciousPatterns.some(pattern => pattern.test(userAgent + pathname))) {
    console.warn(`Suspicious request detected: IP=${ip}, UA=${userAgent}, Path=${pathname}`)
    
    // For now, just log. In production, you might want to block or rate limit more aggressively
  }
  
  return response
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api (API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public folder
     */
    '/((?!_next/static|_next/image|favicon.ico|public/).*)',
  ],
}