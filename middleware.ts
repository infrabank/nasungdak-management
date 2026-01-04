import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

/**
 * Middleware for authentication and authorization
 *
 * TODO: Implement the following:
 * 1. Check for valid session (using cookies or JWT)
 * 2. Redirect unauthenticated users to /login
 * 3. Allow access to public routes (login, static assets)
 * 4. Optionally implement role-based access control
 *
 * Current implementation: Allows all requests (no authentication)
 */
export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  // Public routes that don't require authentication
  const publicRoutes = ['/login', '/api/auth/logout']
  const isPublicRoute = publicRoutes.some((route) => pathname.startsWith(route))

  if (isPublicRoute) {
    return NextResponse.next()
  }

  // TODO: Check for valid session
  // Example with cookie-based session:
  // const sessionCookie = request.cookies.get('session')
  // if (!sessionCookie) {
  //   const loginUrl = new URL('/login', request.url)
  //   loginUrl.searchParams.set('redirect', pathname)
  //   return NextResponse.redirect(loginUrl)
  // }

  // TODO: Validate session token
  // try {
  //   await validateSession(sessionCookie.value)
  // } catch (error) {
  //   const loginUrl = new URL('/login', request.url)
  //   return NextResponse.redirect(loginUrl)
  // }

  // For now, allow all requests
  return NextResponse.next()
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
