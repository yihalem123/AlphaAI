import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

// Routes that require authentication
const protectedRoutes = ['/dashboard', '/profile', '/subscription']

// Routes that should redirect authenticated users away
const authRoutes = ['/login', '/register']

// API routes that need CSRF protection
const csrfProtectedRoutes = [
  '/api/auth/v2/login',
  '/api/auth/v2/register', 
  '/api/auth/v2/logout',
  '/api/subscription/upgrade'
]

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl
  const response = NextResponse.next()
  
  // Add security headers
  response.headers.set('X-Content-Type-Options', 'nosniff')
  response.headers.set('X-Frame-Options', 'DENY')
  response.headers.set('X-XSS-Protection', '1; mode=block')
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin')
  
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
      // Try to refresh token if available
      if (refreshToken) {
        try {
          const refreshResponse = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'}/api/auth/v2/refresh`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Cookie': `refresh_token=${refreshToken}`
            },
            body: JSON.stringify({})
          })
          
          if (refreshResponse.ok) {
            const data = await refreshResponse.json()
            
            // Set new tokens in response cookies
            response.cookies.set('access_token', data.access_token, {
              httpOnly: true,
              secure: process.env.NODE_ENV === 'production',
              sameSite: 'lax',
              maxAge: data.expires_in,
              path: '/'
            })
            
            // Extract refresh token from response cookies if provided
            const setCookieHeader = refreshResponse.headers.get('set-cookie')
            if (setCookieHeader) {
              const refreshTokenMatch = setCookieHeader.match(/refresh_token=([^;]+)/)
              if (refreshTokenMatch) {
                response.cookies.set('refresh_token', refreshTokenMatch[1], {
                  httpOnly: true,
                  secure: process.env.NODE_ENV === 'production',
                  sameSite: 'lax',
                  maxAge: 60 * 24 * 60 * 60, // 60 days
                  path: '/api/auth'
                })
              }
            }
            
            return response
          }
        } catch (error) {
          console.error('Token refresh failed:', error)
        }
      }
      
      // Redirect to login if not authenticated
      const loginUrl = new URL('/login', request.url)
      loginUrl.searchParams.set('redirect', pathname)
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