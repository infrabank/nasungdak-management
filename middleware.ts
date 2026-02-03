import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { jwtVerify } from 'jose'

// 환경 변수에서 직접 읽기 (middleware는 Edge Runtime에서 실행)
const SESSION_SECRET = new TextEncoder().encode(
  process.env.SESSION_SECRET || 'default-secret-key-change-in-production'
)

// Constants (lib/auth/constants.ts와 동일하게 유지)
const SESSION_COOKIE_NAME = 'session'
const REFRESH_COOKIE_NAME = 'refresh_token'
const TOKEN_REFRESH_THRESHOLD = 5 * 60 * 1000 // 5분

// Public routes that don't require authentication
const PUBLIC_ROUTES = [
  '/login',
  '/signup',
  '/onboarding',
  '/pricing',
  '/guide',
  '/invite',
  '/api/webhooks',
  '/api/health',
  '/api/setup',
  '/api/auth/refresh', // Refresh endpoint
]

// Exact match public routes (not prefix match)
const PUBLIC_ROUTES_EXACT = [
  '/', // Home page
]

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  // Allow access to public routes (prefix match)
  if (PUBLIC_ROUTES.some((route) => pathname.startsWith(route))) {
    return NextResponse.next()
  }

  // Allow access to exact match public routes
  if (PUBLIC_ROUTES_EXACT.includes(pathname)) {
    return NextResponse.next()
  }

  // Check for session token
  const accessToken = request.cookies.get(SESSION_COOKIE_NAME)?.value
  const refreshToken = request.cookies.get(REFRESH_COOKIE_NAME)?.value

  // No tokens at all - redirect to login
  if (!accessToken && !refreshToken) {
    const loginUrl = new URL('/login', request.url)
    return NextResponse.redirect(loginUrl)
  }

  // Try to verify access token
  if (accessToken) {
    try {
      const verified = await jwtVerify(accessToken, SESSION_SECRET)

      // Check if token is about to expire (within threshold)
      const exp = verified.payload.exp
      if (exp) {
        const expiresAt = exp * 1000
        const now = Date.now()
        const timeUntilExpiry = expiresAt - now

        // If token expires soon and we have refresh token, trigger background refresh
        if (timeUntilExpiry < TOKEN_REFRESH_THRESHOLD && refreshToken) {
          // Token still valid but will expire soon
          // Let request proceed and set header to trigger client-side refresh
          const response = NextResponse.next()
          response.headers.set('X-Token-Refresh-Needed', 'true')
          return response
        }
      }

      return NextResponse.next()
    } catch (error) {
      // Access token invalid/expired, check refresh token
      if (!refreshToken) {
        console.error('Token verification failed, no refresh token:', error)
        const loginUrl = new URL('/login', request.url)
        const response = NextResponse.redirect(loginUrl)
        response.cookies.delete(SESSION_COOKIE_NAME)
        return response
      }

      // Has refresh token - redirect to refresh endpoint
      // For Edge Runtime, we can't access DB directly, so redirect to API
      const refreshUrl = new URL('/api/auth/refresh', request.url)
      refreshUrl.searchParams.set('redirect', pathname)
      return NextResponse.redirect(refreshUrl)
    }
  }

  // No access token but has refresh token - redirect to refresh
  if (refreshToken) {
    const refreshUrl = new URL('/api/auth/refresh', request.url)
    refreshUrl.searchParams.set('redirect', pathname)
    return NextResponse.redirect(refreshUrl)
  }

  // Fallback - redirect to login
  const loginUrl = new URL('/login', request.url)
  return NextResponse.redirect(loginUrl)
}

export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public folder
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
