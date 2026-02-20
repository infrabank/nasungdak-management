'use server'

import { cookies } from 'next/headers'
import { jwtVerify } from 'jose'
import { db } from '@/lib/db'
import {
  userStoreAssignments,
  organizationMembers,
  organizations,
} from '@/lib/db/schema'
import { eq, and, isNull } from 'drizzle-orm'
import { SESSION_SECRET, SESSION_COOKIE_NAME } from '@/lib/auth/constants'
import { logger, errorToContext } from '@/lib/logger'

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
    const token = cookieStore.get(SESSION_COOKIE_NAME)?.value

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

    // 항상 DB에서 최신 storeIds 조회 (JWT 업데이트 지연/실패 대비)
    const assignments = await db.query.userStoreAssignments.findMany({
      where: and(
        eq(userStoreAssignments.userId, jwtPayload.userId),
        isNull(userStoreAssignments.deletedAt)
      ),
    })
    const storeIds = assignments.map((a) => a.storeId)
    let organizationId = jwtPayload.organizationId || null

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
    logger.error('Get user context error', errorToContext(error))
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

/**
 * 사용자의 조직 ID를 반환합니다.
 * 인증되지 않았거나 조직이 없으면 null을 반환합니다.
 */
export async function getOrganizationId(): Promise<string | null> {
  const context = await getUserContext()
  return context.organizationId
}

/**
 * 사용자의 조직 ID를 반환합니다.
 * 조직이 없으면 에러를 throw합니다.
 */
export async function requireOrganizationId(): Promise<string> {
  const orgId = await getOrganizationId()
  if (!orgId) {
    throw new Error('조직 정보가 없습니다. 다시 로그인해주세요.')
  }
  return orgId
}

/**
 * 조직 브랜딩 정보 타입
 */
export interface OrganizationBranding {
  id: string
  name: string
  logoUrl: string | null
}

/**
 * 사용자의 조직 브랜딩 정보 (이름, 로고)를 반환합니다.
 * 인증되지 않았거나 조직이 없으면 null을 반환합니다.
 */
export async function getOrganizationBranding(): Promise<OrganizationBranding | null> {
  const orgId = await getOrganizationId()
  if (!orgId) {
    return null
  }

  try {
    const org = await db.query.organizations.findFirst({
      where: and(eq(organizations.id, orgId), isNull(organizations.deletedAt)),
      columns: {
        id: true,
        name: true,
        logoUrl: true,
      },
    })

    if (!org) {
      return null
    }

    return {
      id: org.id,
      name: org.name,
      logoUrl: org.logoUrl,
    }
  } catch (error) {
    logger.error('Get organization branding error', errorToContext(error))
    return null
  }
}
