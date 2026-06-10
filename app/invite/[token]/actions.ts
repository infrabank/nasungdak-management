'use server'

import { cookies } from 'next/headers'
import { jwtVerify, SignJWT } from 'jose'
import { db } from '@/lib/db'
import {
  organizationInvitations,
  organizationMembers,
  roles,
  userStoreAssignments,
  stores,
} from '@/lib/db/schema'
import { eq, and, isNull, gte } from 'drizzle-orm'
import { revalidatePath } from 'next/cache'
import { logger, errorToContext } from '@/lib/logger'

import { SESSION_SECRET } from '@/lib/auth/constants'

interface ActionResult {
  success: boolean
  error?: string
}

async function getCurrentUserId(): Promise<string | null> {
  try {
    const cookieStore = await cookies()
    const token = cookieStore.get('session')?.value
    if (!token) return null
    const { payload } = await jwtVerify(token, SESSION_SECRET)
    return (payload as { userId?: string }).userId || null
  } catch {
    return null
  }
}

export async function acceptInvitation(token: string): Promise<ActionResult> {
  try {
    const userId = await getCurrentUserId()
    if (!userId) {
      return { success: false, error: '로그인이 필요합니다' }
    }

    // Find valid invitation
    const invitation = await db.query.organizationInvitations.findFirst({
      where: and(
        eq(organizationInvitations.token, token),
        isNull(organizationInvitations.acceptedAt),
        gte(organizationInvitations.expiresAt, new Date())
      ),
    })

    if (!invitation) {
      return { success: false, error: '유효하지 않은 초대입니다' }
    }

    // Check if already a member
    const existingMembership = await db.query.organizationMembers.findFirst({
      where: and(
        eq(organizationMembers.organizationId, invitation.organizationId),
        eq(organizationMembers.userId, userId),
        isNull(organizationMembers.deletedAt)
      ),
    })

    if (existingMembership) {
      return { success: false, error: '이미 조직의 멤버입니다' }
    }

    // Add user to organization
    await db.insert(organizationMembers).values({
      organizationId: invitation.organizationId,
      userId,
      role: invitation.role,
      invitedBy: invitation.invitedBy,
      invitedAt: invitation.createdAt,
      joinedAt: new Date(),
    })

    // Mark invitation as accepted
    await db
      .update(organizationInvitations)
      .set({ acceptedAt: new Date() })
      .where(eq(organizationInvitations.id, invitation.id))

    // Get organization's stores and assign user to them
    const orgStores = await db.query.stores.findMany({
      where: and(
        eq(stores.organizationId, invitation.organizationId),
        isNull(stores.deletedAt)
      ),
    })

    // Get appropriate role
    const roleName = invitation.role === 'admin' ? 'manager' : 'staff'
    const role = await db.query.roles.findFirst({
      where: eq(roles.roleName, roleName),
    })

    if (role && orgStores.length > 0) {
      // Assign user to all stores with appropriate role
      for (const store of orgStores) {
        await db.insert(userStoreAssignments).values({
          userId,
          storeId: store.id,
          roleId: role.id,
          assignedBy: invitation.invitedBy,
        })
      }
    }

    // Update session to include new stores
    await updateUserSession(userId)

    revalidatePath('/dashboard')
    revalidatePath('/dashboard/settings')

    return { success: true }
  } catch (error) {
    logger.error('Accept invitation error', errorToContext(error))
    return { success: false, error: '초대 수락 중 오류가 발생했습니다' }
  }
}

async function updateUserSession(userId: string): Promise<void> {
  try {
    const cookieStore = await cookies()
    const token = cookieStore.get('session')?.value
    if (!token) return

    const { payload } = await jwtVerify(token, SESSION_SECRET)
    const currentPayload = payload as {
      userId: string
      email: string
      name: string
      storeIds: string[]
      permissions: Record<string, string[]>
    }

    // Get all user's store assignments
    const assignments = await db
      .select({
        storeId: userStoreAssignments.storeId,
        permissions: roles.permissions,
      })
      .from(userStoreAssignments)
      .innerJoin(roles, eq(userStoreAssignments.roleId, roles.id))
      .where(
        and(
          eq(userStoreAssignments.userId, userId),
          isNull(userStoreAssignments.deletedAt)
        )
      )

    const storeIds = [...new Set(assignments.map((a) => a.storeId))]

    // Merge permissions
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

    // Create new token
    const newToken = await new SignJWT({
      userId: currentPayload.userId,
      email: currentPayload.email,
      name: currentPayload.name,
      storeIds,
      permissions: mergedPermissions,
    })
      .setProtectedHeader({ alg: 'HS256' })
      .setIssuedAt()
      .setExpirationTime('7d')
      .sign(SESSION_SECRET)

    cookieStore.set('session', newToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 7 * 24 * 60 * 60,
      path: '/',
    })
  } catch (error) {
    logger.error('Update session error', errorToContext(error))
  }
}
