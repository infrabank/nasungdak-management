import { cookies } from 'next/headers'
import { unstable_rethrow } from 'next/navigation'
import { jwtVerify } from 'jose'
import { db } from '@/lib/db'
import { users, roles, userStoreAssignments } from '@/lib/db/schema'
import { eq, and, isNull } from 'drizzle-orm'
import { SESSION_SECRET, SESSION_COOKIE_NAME } from '@/lib/auth/constants'
import { logger, errorToContext } from '@/lib/logger'

export interface AdminContext {
  userId: string
  email: string
  name: string
  isSuperAdmin: boolean
  isAuthenticated: boolean
}

/**
 * 현재 사용자가 슈퍼 관리자인지 확인
 * super_admin 역할을 가진 사용자만 접근 가능
 */
export async function getAdminContext(): Promise<AdminContext> {
  const defaultContext: AdminContext = {
    userId: '',
    email: '',
    name: '',
    isSuperAdmin: false,
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
    }

    if (!jwtPayload.userId) {
      return defaultContext
    }

    // super_admin 역할 확인
    const superAdminRole = await db.query.roles.findFirst({
      where: eq(roles.roleName, 'super_admin'),
    })

    if (!superAdminRole) {
      return {
        ...defaultContext,
        userId: jwtPayload.userId,
        email: jwtPayload.email || '',
        name: jwtPayload.name || '',
        isAuthenticated: true,
      }
    }

    // 사용자가 super_admin 역할을 가지고 있는지 확인
    const adminAssignment = await db.query.userStoreAssignments.findFirst({
      where: and(
        eq(userStoreAssignments.userId, jwtPayload.userId),
        eq(userStoreAssignments.roleId, superAdminRole.id),
        isNull(userStoreAssignments.deletedAt)
      ),
    })

    return {
      userId: jwtPayload.userId,
      email: jwtPayload.email || '',
      name: jwtPayload.name || '',
      isSuperAdmin: !!adminAssignment,
      isAuthenticated: true,
    }
  } catch (error) {
    unstable_rethrow(error)
    logger.error('Admin context error', errorToContext(error))
    return defaultContext
  }
}

/**
 * 슈퍼 관리자 권한 확인 (throw if not admin)
 */
export async function requireSuperAdmin(): Promise<AdminContext> {
  const context = await getAdminContext()

  if (!context.isAuthenticated) {
    throw new Error('로그인이 필요합니다')
  }

  if (!context.isSuperAdmin) {
    throw new Error('슈퍼 관리자 권한이 필요합니다')
  }

  return context
}
