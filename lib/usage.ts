'use server'

import { db } from '@/lib/db'
import {
  usageMetrics,
  organizations,
  stores,
  organizationMembers,
} from '@/lib/db/schema'
import { eq, and, gte, lte, isNull, sql } from 'drizzle-orm'
import {
  PLANS,
  DEFAULT_PLAN_FEATURES,
  type PlanType,
  type FeatureKey,
} from '@/lib/features'

/**
 * Usage tracking and limit enforcement utilities
 */

// Metric types
export type MetricType = 'purchases' | 'sales' | 'stores' | 'users'

interface UsageResult {
  allowed: boolean
  current: number
  limit: number | null
  reason?: string
}

/**
 * Get organization ID from store ID
 */
async function getOrganizationIdFromStore(
  storeId: string
): Promise<string | null> {
  const store = await db.query.stores.findFirst({
    where: and(eq(stores.id, storeId), isNull(stores.deletedAt)),
    columns: { organizationId: true },
  })
  return store?.organizationId || null
}

/**
 * Get current period (month) start and end dates
 */
function getCurrentPeriod(): { start: Date; end: Date } {
  const now = new Date()
  const start = new Date(now.getFullYear(), now.getMonth(), 1)
  const end = new Date(
    now.getFullYear(),
    now.getMonth() + 1,
    0,
    23,
    59,
    59,
    999
  )
  return { start, end }
}

/**
 * Get current usage for a metric
 */
export async function getCurrentUsage(
  organizationId: string,
  metricType: MetricType
): Promise<number> {
  const { start, end } = getCurrentPeriod()

  const result = await db
    .select({
      total: sql<number>`COALESCE(SUM(${usageMetrics.metricValue}), 0)`.as(
        'total'
      ),
    })
    .from(usageMetrics)
    .where(
      and(
        eq(usageMetrics.organizationId, organizationId),
        eq(usageMetrics.metricType, metricType),
        gte(usageMetrics.periodStart, start),
        lte(usageMetrics.periodEnd, end)
      )
    )

  return Number(result[0]?.total || 0)
}

/**
 * Get limit for a metric based on plan
 */
export function getMetricLimit(
  plan: PlanType,
  metricType: MetricType
): number | null {
  const planConfig = DEFAULT_PLAN_FEATURES[plan]

  // For stores and users, use organization limits
  if (metricType === 'stores') {
    return PLANS[plan].maxStores === -1 ? null : PLANS[plan].maxStores
  }
  if (metricType === 'users') {
    return PLANS[plan].maxUsers === -1 ? null : PLANS[plan].maxUsers
  }

  // For purchases and sales, use feature limits
  return planConfig.limits?.[metricType as FeatureKey] ?? null
}

/**
 * Check if usage is within limits
 */
export async function checkUsageLimit(
  organizationId: string,
  metricType: MetricType,
  increment: number = 1
): Promise<UsageResult> {
  // Get organization plan
  const org = await db.query.organizations.findFirst({
    where: and(
      eq(organizations.id, organizationId),
      isNull(organizations.deletedAt)
    ),
    columns: { plan: true },
  })

  if (!org) {
    return {
      allowed: false,
      current: 0,
      limit: 0,
      reason: '조직을 찾을 수 없습니다',
    }
  }

  const plan = org.plan as PlanType
  const limit = getMetricLimit(plan, metricType)

  // No limit
  if (limit === null) {
    return { allowed: true, current: 0, limit: null }
  }

  // Get current usage
  const current = await getCurrentUsage(organizationId, metricType)

  // Check if within limit
  const allowed = current + increment <= limit

  if (!allowed) {
    const planInfo = PLANS[plan]
    const metricNames: Record<MetricType, string> = {
      purchases: '매입',
      sales: '판매',
      stores: '매장',
      users: '사용자',
    }
    return {
      allowed: false,
      current,
      limit,
      reason: `${planInfo.nameKo} 플랜의 월 ${metricNames[metricType]} 한도(${limit}건)에 도달했습니다. 플랜을 업그레이드하세요.`,
    }
  }

  return { allowed: true, current, limit }
}

/**
 * Check store limit for organization
 */
export async function checkStoreLimit(
  organizationId: string
): Promise<UsageResult> {
  const org = await db.query.organizations.findFirst({
    where: and(
      eq(organizations.id, organizationId),
      isNull(organizations.deletedAt)
    ),
    columns: { plan: true, maxStores: true },
  })

  if (!org) {
    return {
      allowed: false,
      current: 0,
      limit: 0,
      reason: '조직을 찾을 수 없습니다',
    }
  }

  const limit = org.maxStores
  if (limit === -1 || limit === 999) {
    return { allowed: true, current: 0, limit: null }
  }

  const storeCount = await db
    .select({ count: sql<number>`COUNT(*)`.as('count') })
    .from(stores)
    .where(
      and(eq(stores.organizationId, organizationId), isNull(stores.deletedAt))
    )

  const current = Number(storeCount[0]?.count || 0)
  const allowed = current < limit

  if (!allowed) {
    return {
      allowed: false,
      current,
      limit,
      reason: `현재 플랜은 최대 ${limit}개 매장까지 지원합니다. 플랜을 업그레이드하세요.`,
    }
  }

  return { allowed: true, current, limit }
}

/**
 * Check user limit for organization
 */
export async function checkUserLimit(
  organizationId: string
): Promise<UsageResult> {
  const org = await db.query.organizations.findFirst({
    where: and(
      eq(organizations.id, organizationId),
      isNull(organizations.deletedAt)
    ),
    columns: { plan: true, maxUsers: true },
  })

  if (!org) {
    return {
      allowed: false,
      current: 0,
      limit: 0,
      reason: '조직을 찾을 수 없습니다',
    }
  }

  const limit = org.maxUsers
  if (limit === -1 || limit === 999) {
    return { allowed: true, current: 0, limit: null }
  }

  const userCount = await db
    .select({ count: sql<number>`COUNT(*)`.as('count') })
    .from(organizationMembers)
    .where(
      and(
        eq(organizationMembers.organizationId, organizationId),
        isNull(organizationMembers.deletedAt)
      )
    )

  const current = Number(userCount[0]?.count || 0)
  const allowed = current < limit

  if (!allowed) {
    return {
      allowed: false,
      current,
      limit,
      reason: `현재 플랜은 최대 ${limit}명 사용자까지 지원합니다. 플랜을 업그레이드하세요.`,
    }
  }

  return { allowed: true, current, limit }
}

/**
 * Record usage metric
 */
export async function recordUsage(
  organizationId: string,
  metricType: MetricType,
  value: number = 1
): Promise<void> {
  const { start, end } = getCurrentPeriod()

  // Check if entry exists for this period
  const existing = await db.query.usageMetrics.findFirst({
    where: and(
      eq(usageMetrics.organizationId, organizationId),
      eq(usageMetrics.metricType, metricType),
      gte(usageMetrics.periodStart, start),
      lte(usageMetrics.periodEnd, end)
    ),
  })

  if (existing) {
    // Update existing
    await db
      .update(usageMetrics)
      .set({
        metricValue: existing.metricValue + value,
      })
      .where(eq(usageMetrics.id, existing.id))
  } else {
    // Create new
    await db.insert(usageMetrics).values({
      organizationId,
      metricType,
      metricValue: value,
      periodStart: start,
      periodEnd: end,
    })
  }
}

/**
 * Enforce usage limit before action (use in Server Actions)
 * Returns the organization ID if allowed, throws error if not
 */
export async function enforceUsageLimit(
  storeId: string,
  metricType: MetricType,
  increment: number = 1
): Promise<string> {
  const organizationId = await getOrganizationIdFromStore(storeId)

  if (!organizationId) {
    throw new Error('매장의 조직 정보를 찾을 수 없습니다')
  }

  const result = await checkUsageLimit(organizationId, metricType, increment)

  if (!result.allowed) {
    throw new Error(result.reason || '사용량 한도를 초과했습니다')
  }

  return organizationId
}

/**
 * Wrapper for Server Actions that need usage tracking
 */
export function withUsageTracking<T extends unknown[], R>(
  metricType: MetricType,
  action: (
    ...args: T
  ) => Promise<{ success: boolean; storeId?: string; error?: string } & R>
) {
  return async (
    ...args: T
  ): Promise<{ success: boolean; error?: string } & Partial<R>> => {
    const result = await action(...args)

    // If successful and we have a storeId, record usage
    if (result.success && result.storeId) {
      try {
        const organizationId = await getOrganizationIdFromStore(result.storeId)
        if (organizationId) {
          await recordUsage(organizationId, metricType)
        }
      } catch (error) {
        console.error('Failed to record usage:', error)
        // Don't fail the action if usage recording fails
      }
    }

    return result
  }
}
