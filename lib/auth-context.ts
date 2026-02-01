'use server'

import { cookies } from 'next/headers'
import { jwtVerify } from 'jose'
import { db } from '@/lib/db'
import { userStoreAssignments, organizationMembers } from '@/lib/db/schema'
import { eq, and, isNull } from 'drizzle-orm'

const SESSION_SECRET = new TextEncoder().encode(
  process.env.SESSION_SECRET || 'default-secret-key-change-in-production'
)

export interface UserContext {
  userId: string
  email: string
  name: string
  organizationId: string | null
  storeIds: string[]
  isAuthenticated: boolean
}

/**
 * 현재 로그인한 사용자의 컨텍스트를 가져옵니다.
 * 인증되지 않았거나 조직/매장이 없으면 빈 storeIds를 반환합니다.
 */
export async function getUserContext(): Promise<UserContext> {
  const defaultContext: UserContext = {
    userId: '',
    email: '',
    name: '',
    organizationId: null,
    storeIds: [],
    isAuthenticated: false,
  }

  try {
    const cookieStore = await cookies()
    const token = cookieStore.get('session')?.value

    if (!token) {
      return defaultContext
    }

    const { payload } = await jwtVerify(token, SESSION_SECRET)
    const jwtPayload = payload as {
      userId?: string
      email?: string
      name?: string
      organizationId?: string
      storeIds?: string[]
    }

    if (!jwtPayload.userId) {
      return defaultContext
    }

    // JWT에 storeIds가 있으면 사용, 없으면 DB에서 조회
    let storeIds = jwtPayload.storeIds || []
    let organizationId = jwtPayload.organizationId || null

    // DB에서 최신 정보 조회 (JWT가 오래된 경우 대비)
    if (storeIds.length === 0) {
      const assignments = await db.query.userStoreAssignments.findMany({
        where: and(
          eq(userStoreAssignments.userId, jwtPayload.userId),
          isNull(userStoreAssignments.deletedAt)
        ),
      })
      storeIds = assignments.map((a) => a.storeId)
    }

    if (!organizationId) {
      const membership = await db.query.organizationMembers.findFirst({
        where: and(
          eq(organizationMembers.userId, jwtPayload.userId),
          isNull(organizationMembers.deletedAt)
        ),
      })
      organizationId = membership?.organizationId || null
    }

    return {
      userId: jwtPayload.userId,
      email: jwtPayload.email || '',
      name: jwtPayload.name || '',
      organizationId,
      storeIds,
      isAuthenticated: true,
    }
  } catch (error) {
    console.error('Get user context error:', error)
    return defaultContext
  }
}

/**
 * 사용자가 특정 매장에 접근 권한이 있는지 확인합니다.
 */
export async function canAccessStore(storeId: string): Promise<boolean> {
  const context = await getUserContext()
  if (!context.isAuthenticated) return false
  if (context.storeIds.length === 0) return false
  return context.storeIds.includes(storeId)
}

/**
 * 사용자의 허용된 storeIds를 반환합니다.
 * 인증되지 않았거나 권한이 없으면 빈 배열을 반환합니다.
 */
export async function getAuthorizedStoreIds(): Promise<string[]> {
  const context = await getUserContext()
  return context.storeIds
}
