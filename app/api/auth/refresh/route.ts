import { NextRequest, NextResponse } from 'next/server'
import { refreshSession } from '@/app/(auth)/login/actions'
import { logger, errorToContext } from '@/lib/logger'

export async function GET(request: NextRequest) {
  const redirect = request.nextUrl.searchParams.get('redirect') || '/dashboard'

  try {
    const result = await refreshSession()

    if (result.success) {
      // Token refreshed successfully, redirect to original destination
      return NextResponse.redirect(new URL(redirect, request.url))
    } else {
      // Refresh failed, redirect to login
      logger.error('Token refresh failed', { error: result.error || 'unknown' })
      const loginUrl = new URL('/login', request.url)
      const response = NextResponse.redirect(loginUrl)

      // Clear cookies
      response.cookies.delete('session')
      response.cookies.delete('refresh_token')

      return response
    }
  } catch (error) {
    logger.error('Refresh endpoint error', errorToContext(error))
    const loginUrl = new URL('/login', request.url)
    return NextResponse.redirect(loginUrl)
  }
}
