'use server'

import { cookies } from 'next/headers'
import { jwtVerify, SignJWT } from 'jose'
import { db } from '@/lib/db'
import { users, userStoreAssignments, roles } from '@/lib/db/schema'
import { eq, and, isNull } from 'drizzle-orm'
import bcrypt from 'bcryptjs'

const SESSION_SECRET = new TextEncoder().encode(
  process.env.SESSION_SECRET || 'default-secret-key-change-in-production'
)
const SESSION_DURATION = 7 * 24 * 60 * 60 * 1000 // 7 days

// 인증 컨텍스트 타입
export interface AuthContext {
  userId: string
  email: string
  name: string
  storeIds: string[]
  permissions: Record<string, string[]>
  isAuthenticated: boolean
}

// JWT Payload 타입
interface JWTPayload {
  userId: string
  email: string
  name: string
  storeIds: string[]
  permissions: Record<string, string[]>
  iat?: number
  exp?: number
  [key: string]: unknown // Required for jose JWTPayload compatibility
}

/**
 * 현재 세션의 인증 컨텍스트를 가져옵니다.
 * 인증되지 않은 경우 isAuthenticated: false를 반환합니다.
 */
export async function getAuthContext(): Promise<AuthContext> {
  try {
    const cookieStore = await cookies()
    const token = cookieStore.get('session')?.value

    if (!token) {
      return {
        userId: '',
        email: '',
        name: '',
        storeIds: [],
        permissions: {},
        isAuthenticated: false,
      }
    }

    const { payload } = await jwtVerify(token, SESSION_SECRET)
    const jwtPayload = payload as unknown as JWTPayload

    return {
      userId: jwtPayload.userId,
      email: jwtPayload.email,
      name: jwtPayload.name,
      storeIds: jwtPayload.storeIds || [],
      permissions: jwtPayload.permissions || {},
      isAuthenticated: true,
    }
  } catch (error) {
    console.error('Auth context error:', error)
    return {
      userId: '',
      email: '',
      name: '',
      storeIds: [],
      permissions: {},
      isAuthenticated: false,
    }
  }
}

/**
 * 특정 매장에 대한 접근 권한이 있는지 확인합니다.
 */
export async function hasStoreAccess(storeId: string): Promise<boolean> {
  const auth = await getAuthContext()
  if (!auth.isAuthenticated) return false
  
  // 'all'은 모든 접근 가능한 매장을 의미
  if (storeId === 'all') return auth.storeIds.length > 0
  
  return auth.storeIds.includes(storeId)
}

/**
 * 특정 리소스에 대한 권한이 있는지 확인합니다.
 */
export async function hasPermission(
  resource: string,
  action: 'read' | 'write' | 'delete'
): Promise<boolean> {
  const auth = await getAuthContext()
  if (!auth.isAuthenticated) return false
  
  const resourcePermissions = auth.permissions[resource]
  if (!resourcePermissions) return false
  
  return resourcePermissions.includes(action)
}

/**
 * 매장 접근 권한을 검증하고 없으면 에러를 throw합니다.
 */
export async function requireStoreAccess(storeId: string): Promise<AuthContext> {
  const auth = await getAuthContext()
  
  if (!auth.isAuthenticated) {
    throw new Error('로그인이 필요합니다')
  }
  
  if (storeId !== 'all' && !auth.storeIds.includes(storeId)) {
    throw new Error('해당 매장에 대한 접근 권한이 없습니다')
  }
  
  return auth
}

/**
 * 사용자를 인증하고 JWT 토큰을 생성합니다.
 */
export async function authenticateUser(
  email: string,
  password: string
): Promise<{ success: boolean; error?: string }> {
  try {
    // 사용자 조회
    const user = await db.query.users.findFirst({
      where: and(
        eq(users.email, email.toLowerCase()),
        eq(users.isActive, true),
        isNull(users.deletedAt)
      ),
    })

    if (!user) {
      return { success: false, error: '이메일 또는 비밀번호가 올바르지 않습니다' }
    }

    // 비밀번호 검증
    const isValid = await bcrypt.compare(password, user.passwordHash)
    if (!isValid) {
      return { success: false, error: '이메일 또는 비밀번호가 올바르지 않습니다' }
    }

    // 사용자의 매장 할당 및 역할 조회
    const assignments = await db
      .select({
        storeId: userStoreAssignments.storeId,
        permissions: roles.permissions,
      })
      .from(userStoreAssignments)
      .innerJoin(roles, eq(userStoreAssignments.roleId, roles.id))
      .where(
        and(
          eq(userStoreAssignments.userId, user.id),
          isNull(userStoreAssignments.deletedAt)
        )
      )

    const storeIds = assignments.map(a => a.storeId)
    
    // 권한 병합 (여러 역할이 있을 경우)
    const mergedPermissions: Record<string, string[]> = {}
    for (const assignment of assignments) {
      const perms = assignment.permissions as Record<string, string[]>
      for (const [resource, actions] of Object.entries(perms)) {
        if (!mergedPermissions[resource]) {
          mergedPermissions[resource] = []
        }
        for (const action of actions) {
          if (!mergedPermissions[resource].includes(action)) {
            mergedPermissions[resource].push(action)
          }
        }
      }
    }

    // JWT 토큰 생성
    const token = await new SignJWT({
      userId: user.id,
      email: user.email,
      name: user.name,
      storeIds,
      permissions: mergedPermissions,
    } as JWTPayload)
      .setProtectedHeader({ alg: 'HS256' })
      .setIssuedAt()
      .setExpirationTime('7d')
      .sign(SESSION_SECRET)

    // 세션 쿠키 설정
    const cookieStore = await cookies()
    cookieStore.set('session', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: SESSION_DURATION / 1000,
      path: '/',
    })

    // 마지막 로그인 시간 업데이트
    await db
      .update(users)
      .set({ lastLoginAt: new Date() })
      .where(eq(users.id, user.id))

    return { success: true }
  } catch (error) {
    console.error('Authentication error:', error)
    return { success: false, error: '로그인 중 오류가 발생했습니다' }
  }
}

/**
 * 비밀번호를 해시합니다.
 */
export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 12)
}

/**
 * 사용자 ID로 접근 가능한 매장 ID 목록을 가져옵니다.
 */
export async function getUserStoreIds(userId: string): Promise<string[]> {
  const assignments = await db
    .select({ storeId: userStoreAssignments.storeId })
    .from(userStoreAssignments)
    .where(
      and(
        eq(userStoreAssignments.userId, userId),
        isNull(userStoreAssignments.deletedAt)
      )
    )
  
  return assignments.map(a => a.storeId)
}

/**
 * storeId 필터를 적용할 때 사용자의 접근 가능한 매장으로 제한합니다.
 * 'all'인 경우 사용자의 모든 매장 ID를 반환합니다.
 */
export async function getFilteredStoreIds(requestedStoreId: string): Promise<string[]> {
  const auth = await getAuthContext()
  
  if (!auth.isAuthenticated) {
    return []
  }
  
  if (requestedStoreId === 'all') {
    return auth.storeIds
  }
  
  if (auth.storeIds.includes(requestedStoreId)) {
    return [requestedStoreId]
  }
  
  return [] // 권한 없음
}
