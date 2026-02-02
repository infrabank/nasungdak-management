'use server'

import { cookies, headers } from 'next/headers'
import { redirect } from 'next/navigation'
import bcrypt from 'bcryptjs'
import { SignJWT, jwtVerify } from 'jose'
import { db } from '@/lib/db'
import {
  users,
  organizationMembers,
  userStoreAssignments,
} from '@/lib/db/schema'
import { eq, and, isNull } from 'drizzle-orm'
import {
  SESSION_SECRET,
  SESSION_DURATION,
  JWT_EXPIRATION,
  SESSION_COOKIE_NAME,
} from '@/lib/auth/constants'
import { rateLimit, getClientIP } from '@/lib/rate-limit'

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

    // Create session token
    const payload: JWTPayload = {
      userId: user.id,
      email: user.email,
      name: user.name,
      organizationId: membership?.organizationId,
      storeIds,
    }

    const token = await new SignJWT(payload)
      .setProtectedHeader({ alg: 'HS256' })
      .setIssuedAt()
      .setExpirationTime(JWT_EXPIRATION)
      .sign(SESSION_SECRET)

    // Set session cookie
    const cookieStore = await cookies()
    cookieStore.set(SESSION_COOKIE_NAME, token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: SESSION_DURATION / 1000,
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
    console.error('Login error:', error)
    return {
      success: false,
      error: '로그인 중 오류가 발생했습니다',
    }
  }
}

export async function logout() {
  const cookieStore = await cookies()
  cookieStore.delete(SESSION_COOKIE_NAME)
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
    console.error('Session verification error:', error)
    return { authenticated: false }
  }
}
