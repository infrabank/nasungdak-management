'use server'

import { cookies, headers } from 'next/headers'
import { redirect } from 'next/navigation'
import bcrypt from 'bcryptjs'
import { SignJWT, jwtVerify } from 'jose'
import { randomBytes } from 'crypto'
import { db } from '@/lib/db'
import {
  users,
  organizationMembers,
  userStoreAssignments,
  userSessions,
} from '@/lib/db/schema'
import { eq, and, isNull, lt } from 'drizzle-orm'
import {
  SESSION_SECRET,
  ACCESS_TOKEN_EXPIRATION,
  ACCESS_TOKEN_DURATION,
  REFRESH_TOKEN_DURATION,
  SESSION_COOKIE_NAME,
  REFRESH_COOKIE_NAME,
} from '@/lib/auth/constants'
import { rateLimit, getClientIP } from '@/lib/rate-limit'
import { logger, errorToContext } from '@/lib/logger'

// JWT Payload 타입
interface JWTPayload {
  userId: string
  email: string
  name: string
  organizationId?: string
  storeIds: string[]
  [key: string]: unknown
}

type LoginState = {
  success: boolean
  error?: string
} | null

export async function login(
  prevState: LoginState,
  formData: FormData
): Promise<LoginState> {
  try {
    // Rate limiting 체크 (15분당 5회)
    const headersList = await headers()
    const clientIP = getClientIP(headersList)
    const rateLimitResult = rateLimit.check(clientIP, 'auth:login')

    if (!rateLimitResult.success) {
      const retryAfter = Math.ceil(
        (rateLimitResult.resetAt - Date.now()) / 1000 / 60
      )
      return {
        success: false,
        error: `로그인 시도가 너무 많습니다. ${retryAfter}분 후에 다시 시도해주세요.`,
      }
    }

    const email = formData.get('email') as string
    const password = formData.get('password') as string

    if (!email) {
      return {
        success: false,
        error: '이메일을 입력해주세요',
      }
    }

    if (!password) {
      return {
        success: false,
        error: '비밀번호를 입력해주세요',
      }
    }

    // Find user by email
    const user = await db.query.users.findFirst({
      where: and(eq(users.email, email.toLowerCase()), isNull(users.deletedAt)),
    })

    if (!user) {
      return {
        success: false,
        error: '이메일 또는 비밀번호가 올바르지 않습니다',
      }
    }

    // Check if user is active
    if (!user.isActive) {
      return {
        success: false,
        error: '비활성화된 계정입니다. 관리자에게 문의하세요.',
      }
    }

    // Verify password
    const isValid = await bcrypt.compare(password, user.passwordHash)

    if (!isValid) {
      return {
        success: false,
        error: '이메일 또는 비밀번호가 올바르지 않습니다',
      }
    }

    // Get user's organization membership
    const membership = await db.query.organizationMembers.findFirst({
      where: and(
        eq(organizationMembers.userId, user.id),
        isNull(organizationMembers.deletedAt)
      ),
    })

    // Get user's store assignments
    const storeAssignments = await db.query.userStoreAssignments.findMany({
      where: eq(userStoreAssignments.userId, user.id),
    })
    const storeIds = storeAssignments.map((sa) => sa.storeId)

    // Create access token (short-lived)
    const payload: JWTPayload = {
      userId: user.id,
      email: user.email,
      name: user.name,
      organizationId: membership?.organizationId,
      storeIds,
    }

    const accessToken = await new SignJWT(payload)
      .setProtectedHeader({ alg: 'HS256' })
      .setIssuedAt()
      .setExpirationTime(ACCESS_TOKEN_EXPIRATION)
      .sign(SESSION_SECRET)

    // Create refresh token (long-lived, stored in DB)
    const refreshToken = randomBytes(64).toString('hex')
    const refreshExpiresAt = new Date(Date.now() + REFRESH_TOKEN_DURATION)

    // Get device info for session tracking
    const userAgent = headersList.get('user-agent') || 'unknown'

    // Store refresh token in database
    await db.insert(userSessions).values({
      userId: user.id,
      refreshToken,
      deviceInfo: userAgent.substring(0, 255),
      ipAddress: clientIP,
      expiresAt: refreshExpiresAt,
      lastUsedAt: new Date(),
    })

    // Clean up expired sessions for this user (keep max 5 active sessions)
    const expiredSessions = await db
      .delete(userSessions)
      .where(
        and(
          eq(userSessions.userId, user.id),
          lt(userSessions.expiresAt, new Date())
        )
      )

    // Set cookies
    const cookieStore = await cookies()

    // Access token cookie (short-lived)
    cookieStore.set(SESSION_COOKIE_NAME, accessToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: ACCESS_TOKEN_DURATION / 1000,
      path: '/',
    })

    // Refresh token cookie (long-lived)
    cookieStore.set(REFRESH_COOKIE_NAME, refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: REFRESH_TOKEN_DURATION / 1000,
      path: '/',
    })

    // Update last login time
    await db
      .update(users)
      .set({ lastLoginAt: new Date() })
      .where(eq(users.id, user.id))

    return {
      success: true,
    }
  } catch (error) {
    logger.error('Login error', errorToContext(error))
    return {
      success: false,
      error: '로그인 중 오류가 발생했습니다',
    }
  }
}

export async function logout() {
  const cookieStore = await cookies()
  const refreshToken = cookieStore.get(REFRESH_COOKIE_NAME)?.value

  // Revoke refresh token in DB
  if (refreshToken) {
    await db
      .update(userSessions)
      .set({ revokedAt: new Date() })
      .where(eq(userSessions.refreshToken, refreshToken))
  }

  // Clear both cookies
  cookieStore.delete(SESSION_COOKIE_NAME)
  cookieStore.delete(REFRESH_COOKIE_NAME)
  redirect('/login')
}

export async function verifySession() {
  const cookieStore = await cookies()
  const token = cookieStore.get(SESSION_COOKIE_NAME)?.value

  if (!token) {
    return { authenticated: false }
  }

  try {
    const verified = await jwtVerify(token, SESSION_SECRET)
    return { authenticated: true, payload: verified.payload as JWTPayload }
  } catch (error) {
    logger.error('Session verification error', errorToContext(error))
    return { authenticated: false }
  }
}

/**
 * Refresh token을 사용하여 새 access token 발급
 * 미들웨어나 클라이언트에서 호출
 */
export async function refreshSession(): Promise<{
  success: boolean
  error?: string
}> {
  try {
    const cookieStore = await cookies()
    const refreshToken = cookieStore.get(REFRESH_COOKIE_NAME)?.value

    if (!refreshToken) {
      return { success: false, error: 'Refresh token not found' }
    }

    // Find valid session in DB
    const session = await db.query.userSessions.findFirst({
      where: and(
        eq(userSessions.refreshToken, refreshToken),
        isNull(userSessions.revokedAt)
      ),
    })

    if (!session) {
      return { success: false, error: 'Invalid refresh token' }
    }

    // Check if session is expired
    if (new Date() > session.expiresAt) {
      // Revoke expired session
      await db
        .update(userSessions)
        .set({ revokedAt: new Date() })
        .where(eq(userSessions.id, session.id))
      return { success: false, error: 'Refresh token expired' }
    }

    // Get user data
    const user = await db.query.users.findFirst({
      where: and(eq(users.id, session.userId), isNull(users.deletedAt)),
    })

    if (!user || !user.isActive) {
      return { success: false, error: 'User not found or inactive' }
    }

    // Get organization membership
    const membership = await db.query.organizationMembers.findFirst({
      where: and(
        eq(organizationMembers.userId, user.id),
        isNull(organizationMembers.deletedAt)
      ),
    })

    // Get store assignments
    const storeAssignments = await db.query.userStoreAssignments.findMany({
      where: eq(userStoreAssignments.userId, user.id),
    })
    const storeIds = storeAssignments.map((sa) => sa.storeId)

    // Create new access token
    const payload: JWTPayload = {
      userId: user.id,
      email: user.email,
      name: user.name,
      organizationId: membership?.organizationId,
      storeIds,
    }

    const accessToken = await new SignJWT(payload)
      .setProtectedHeader({ alg: 'HS256' })
      .setIssuedAt()
      .setExpirationTime(ACCESS_TOKEN_EXPIRATION)
      .sign(SESSION_SECRET)

    // Update session last used time
    await db
      .update(userSessions)
      .set({ lastUsedAt: new Date() })
      .where(eq(userSessions.id, session.id))

    // Set new access token cookie
    cookieStore.set(SESSION_COOKIE_NAME, accessToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: ACCESS_TOKEN_DURATION / 1000,
      path: '/',
    })

    return { success: true }
  } catch (error) {
    logger.error('Refresh session error', errorToContext(error))
    return { success: false, error: 'Failed to refresh session' }
  }
}

/**
 * 모든 세션 로그아웃 (다른 기기 포함)
 */
export async function logoutAllSessions() {
  const cookieStore = await cookies()
  const token = cookieStore.get(SESSION_COOKIE_NAME)?.value

  if (token) {
    try {
      const verified = await jwtVerify(token, SESSION_SECRET)
      const payload = verified.payload as JWTPayload

      // Revoke all sessions for this user
      await db
        .update(userSessions)
        .set({ revokedAt: new Date() })
        .where(eq(userSessions.userId, payload.userId))
    } catch {
      // Token invalid, just clear cookies
    }
  }

  cookieStore.delete(SESSION_COOKIE_NAME)
  cookieStore.delete(REFRESH_COOKIE_NAME)
  redirect('/login')
}
