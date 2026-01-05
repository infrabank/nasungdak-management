'use server'

import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import bcrypt from 'bcryptjs'
import { SignJWT, jwtVerify } from 'jose'

const SESSION_SECRET = new TextEncoder().encode(
  process.env.SESSION_SECRET || 'default-secret-key-change-in-production'
)
const SESSION_DURATION = 7 * 24 * 60 * 60 * 1000 // 7 days

export async function login(formData: FormData) {
  try {
    const password = formData.get('password') as string

    if (!password) {
      return {
        success: false,
        error: '비밀번호를 입력해주세요',
      }
    }

    // Get password hash from environment variable
    const passwordHash = process.env.AUTH_PASSWORD_HASH

    if (!passwordHash) {
      console.error('AUTH_PASSWORD_HASH is not set')
      return {
        success: false,
        error: '서버 설정 오류가 발생했습니다',
      }
    }

    // Verify password
    const isValid = await bcrypt.compare(password, passwordHash)

    if (!isValid) {
      return {
        success: false,
        error: '비밀번호가 올바르지 않습니다',
      }
    }

    // Create session token
    const token = await new SignJWT({ authenticated: true })
      .setProtectedHeader({ alg: 'HS256' })
      .setIssuedAt()
      .setExpirationTime('7d')
      .sign(SESSION_SECRET)

    // Set session cookie
    const cookieStore = await cookies()
    cookieStore.set('session', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: SESSION_DURATION / 1000,
      path: '/',
    })

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
  cookieStore.delete('session')
  redirect('/login')
}

export async function verifySession() {
  const cookieStore = await cookies()
  const token = cookieStore.get('session')?.value

  if (!token) {
    return { authenticated: false }
  }

  try {
    const verified = await jwtVerify(token, SESSION_SECRET)
    return { authenticated: true, payload: verified.payload }
  } catch (error) {
    console.error('Session verification error:', error)
    return { authenticated: false }
  }
}
