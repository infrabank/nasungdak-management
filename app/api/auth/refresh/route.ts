import { NextRequest, NextResponse } from 'next/server'
import { refreshSession } from '@/app/(auth)/login/actions'
import { logger, errorToContext } from '@/lib/logger'

export async function GET(request: NextRequest) {
  const rawRedirect =
    request.nextUrl.searchParams.get('redirect') || '/dashboard'
  // 오픈 리다이렉트 방지: 앱 내부 경로(/로 시작, //·/\ 제외)만 허용
  const redirect =
    rawRedirect.startsWith('/') &&
    !rawRedirect.startsWith('//') &&
    !rawRedirect.startsWith('/\\')
      ? rawRedirect
      : '/dashboard'

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
