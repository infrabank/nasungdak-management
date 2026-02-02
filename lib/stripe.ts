/**
 * Stripe 결제 연동 유틸리티
 *
 * 설치 필요: npm install stripe
 *
 * 환경변수:
 * - STRIPE_SECRET_KEY: Stripe 시크릿 키
 * - STRIPE_WEBHOOK_SECRET: 웹훅 시크릿
 * - NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY: 퍼블릭 키
 */

import Stripe from 'stripe'
import { db } from '@/lib/db'
import {
  organizations,
  subscriptions,
  invoices,
  alertHistory,
  organizationMembers,
  users,
  stores,
  webhookEvents,
} from '@/lib/db/schema'
import { eq, and, isNull, sql } from 'drizzle-orm'
import { PLANS, type PlanType } from '@/lib/features'
import { revalidateTag } from 'next/cache'

// Stripe 클라이언트 (서버 사이드 전용, lazy initialization)
let _stripe: Stripe | null = null

export function getStripe(): Stripe {
  if (!_stripe) {
    const secretKey = process.env.STRIPE_SECRET_KEY
    if (!secretKey) {
      throw new Error('STRIPE_SECRET_KEY 환경변수가 설정되지 않았습니다')
    }
    _stripe = new Stripe(secretKey, {
      apiVersion: '2025-02-24.acacia',
      typescript: true,
    })
  }
  return _stripe
}

// Legacy export for backward compatibility (lazy getter)
export const stripe = new Proxy({} as Stripe, {
  get(_, prop) {
    return (getStripe() as unknown as Record<string | symbol, unknown>)[prop]
  },
})

// Stripe Price ID 매핑 (Stripe Dashboard에서 생성 후 설정)
export const STRIPE_PRICE_IDS: Record<
  PlanType,
  { monthly?: string; yearly?: string }
> = {
  free: {},
  basic: {
    monthly: process.env.STRIPE_PRICE_BASIC_MONTHLY,
    yearly: process.env.STRIPE_PRICE_BASIC_YEARLY,
  },
  standard: {
    monthly: process.env.STRIPE_PRICE_STANDARD_MONTHLY,
    yearly: process.env.STRIPE_PRICE_STANDARD_YEARLY,
  },
  premium: {
    monthly: process.env.STRIPE_PRICE_PREMIUM_MONTHLY,
    yearly: process.env.STRIPE_PRICE_PREMIUM_YEARLY,
  },
  enterprise: {}, // 협의
}

/**
 * Stripe 고객 생성 또는 조회
 */
export async function getOrCreateStripeCustomer(
  organizationId: string,
  email: string,
  name?: string
): Promise<string> {
  // 기존 고객 ID 확인
  const org = await db.query.organizations.findFirst({
    where: eq(organizations.id, organizationId),
    columns: { stripeCustomerId: true, name: true },
  })

  if (org?.stripeCustomerId) {
    return org.stripeCustomerId
  }

  // 새 고객 생성
  const customer = await stripe.customers.create({
    email,
    name: name || org?.name,
    metadata: {
      organizationId,
    },
  })

  // DB 업데이트
  await db
    .update(organizations)
    .set({ stripeCustomerId: customer.id, updatedAt: new Date() })
    .where(eq(organizations.id, organizationId))

  revalidateTag(`org:${organizationId}`)

  return customer.id
}

/**
 * Checkout 세션 생성 (구독 결제 페이지)
 */
export async function createCheckoutSession(params: {
  organizationId: string
  plan: PlanType
  billingCycle: 'monthly' | 'yearly'
  successUrl: string
  cancelUrl: string
  customerEmail: string
}): Promise<{ url: string | null }> {
  const {
    organizationId,
    plan,
    billingCycle,
    successUrl,
    cancelUrl,
    customerEmail,
  } = params

  // Price ID 조회
  const priceId = STRIPE_PRICE_IDS[plan]?.[billingCycle]
  if (!priceId) {
    throw new Error(
      `플랜 ${plan}의 ${billingCycle} 가격이 설정되지 않았습니다.`
    )
  }

  // 고객 생성/조회
  const customerId = await getOrCreateStripeCustomer(
    organizationId,
    customerEmail
  )

  // Checkout 세션 생성
  const session = await stripe.checkout.sessions.create({
    customer: customerId,
    mode: 'subscription',
    payment_method_types: ['card'],
    line_items: [
      {
        price: priceId,
        quantity: 1,
      },
    ],
    success_url: `${successUrl}?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: cancelUrl,
    metadata: {
      organizationId,
      plan,
      billingCycle,
    },
    subscription_data: {
      metadata: {
        organizationId,
        plan,
      },
    },
    allow_promotion_codes: true,
    billing_address_collection: 'required',
    locale: 'ko',
  })

  return { url: session.url }
}

/**
 * Customer Portal 세션 생성 (구독 관리)
 */
export async function createBillingPortalSession(
  organizationId: string,
  returnUrl: string
): Promise<{ url: string }> {
  const org = await db.query.organizations.findFirst({
    where: eq(organizations.id, organizationId),
    columns: { stripeCustomerId: true },
  })

  if (!org?.stripeCustomerId) {
    throw new Error('Stripe 고객 정보가 없습니다.')
  }

  const session = await stripe.billingPortal.sessions.create({
    customer: org.stripeCustomerId,
    return_url: returnUrl,
  })

  return { url: session.url }
}

/**
 * 조직의 현재 사용량 조회
 */
export async function getOrganizationUsage(
  organizationId: string
): Promise<{ stores: number; users: number }> {
  const [storeCount, userCount] = await Promise.all([
    db
      .select({ count: sql<number>`count(*)` })
      .from(stores)
      .where(
        and(eq(stores.organizationId, organizationId), isNull(stores.deletedAt))
      )
      .then((r) => Number(r[0]?.count || 0)),
    db
      .select({ count: sql<number>`count(*)` })
      .from(organizationMembers)
      .where(
        and(
          eq(organizationMembers.organizationId, organizationId),
          isNull(organizationMembers.deletedAt)
        )
      )
      .then((r) => Number(r[0]?.count || 0)),
  ])

  return { stores: storeCount, users: userCount }
}

/**
 * 플랜 다운그레이드 검증 및 실행
 */
export async function downgradePlan(params: {
  organizationId: string
  targetPlan: PlanType
  billingCycle?: 'monthly' | 'yearly'
}): Promise<{
  success: boolean
  error?: string
  details?: {
    stores: number
    users: number
    maxStores: number
    maxUsers: number
  }
}> {
  const { organizationId, targetPlan, billingCycle = 'monthly' } = params

  // 현재 조직 및 구독 정보 조회
  const org = await db.query.organizations.findFirst({
    where: eq(organizations.id, organizationId),
  })

  if (!org) {
    return { success: false, error: '조직을 찾을 수 없습니다.' }
  }

  const currentPlan = org.plan as PlanType

  // 같은 플랜이면 에러
  if (currentPlan === targetPlan) {
    return { success: false, error: '이미 해당 플랜을 사용 중입니다.' }
  }

  // 업그레이드는 이 함수가 아닌 createCheckoutSession 사용
  const planOrder: PlanType[] = [
    'free',
    'basic',
    'standard',
    'premium',
    'enterprise',
  ]
  if (planOrder.indexOf(targetPlan) > planOrder.indexOf(currentPlan)) {
    return { success: false, error: '업그레이드는 결제 페이지를 이용해주세요.' }
  }

  // 현재 사용량 확인
  const usage = await getOrganizationUsage(organizationId)
  const targetConfig = PLANS[targetPlan]

  // 다운그레이드 가능 여부 확인
  if (targetConfig.maxStores !== -1 && usage.stores > targetConfig.maxStores) {
    return {
      success: false,
      error: `${targetConfig.nameKo} 플랜은 최대 ${targetConfig.maxStores}개 매장만 지원합니다. 다운그레이드 전에 매장을 ${usage.stores - targetConfig.maxStores}개 삭제해주세요.`,
      details: {
        stores: usage.stores,
        users: usage.users,
        maxStores: targetConfig.maxStores as number,
        maxUsers:
          (targetConfig.maxUsers as number) === -1
            ? 999
            : (targetConfig.maxUsers as number),
      },
    }
  }

  if (
    (targetConfig.maxUsers as number) !== -1 &&
    usage.users > targetConfig.maxUsers
  ) {
    return {
      success: false,
      error: `${targetConfig.nameKo} 플랜은 최대 ${targetConfig.maxUsers}명 사용자만 지원합니다. 다운그레이드 전에 사용자를 ${usage.users - targetConfig.maxUsers}명 삭제해주세요.`,
      details: {
        stores: usage.stores,
        users: usage.users,
        maxStores:
          (targetConfig.maxStores as number) === -1
            ? 999
            : (targetConfig.maxStores as number),
        maxUsers: targetConfig.maxUsers as number,
      },
    }
  }

  // Free 플랜으로 다운그레이드 - 구독 취소
  if (targetPlan === 'free') {
    const sub = await db.query.subscriptions.findFirst({
      where: and(
        eq(subscriptions.organizationId, organizationId),
        eq(subscriptions.status, 'active')
      ),
    })

    if (sub?.stripeSubscriptionId) {
      // Stripe 구독 취소 (기간 종료 시)
      await stripe.subscriptions.update(sub.stripeSubscriptionId, {
        cancel_at_period_end: true,
      })

      await db
        .update(subscriptions)
        .set({ cancelAtPeriodEnd: true, updatedAt: new Date() })
        .where(eq(subscriptions.id, sub.id))
    }

    // 조직 플랜 업데이트는 웹훅에서 처리 (기간 종료 시)
    return { success: true }
  }

  // 유료 플랜 간 다운그레이드 - Stripe 구독 변경
  const priceId = STRIPE_PRICE_IDS[targetPlan]?.[billingCycle]
  if (!priceId) {
    return {
      success: false,
      error: `${targetPlan} 플랜의 가격 정보가 없습니다.`,
    }
  }

  const sub = await db.query.subscriptions.findFirst({
    where: and(
      eq(subscriptions.organizationId, organizationId),
      eq(subscriptions.status, 'active')
    ),
  })

  if (!sub?.stripeSubscriptionId) {
    return { success: false, error: '활성 구독이 없습니다.' }
  }

  // Stripe 구독 업데이트
  const stripeSubscription = await stripe.subscriptions.retrieve(
    sub.stripeSubscriptionId
  )
  const itemId = stripeSubscription.items.data[0]?.id

  if (!itemId) {
    return { success: false, error: 'Stripe 구독 항목을 찾을 수 없습니다.' }
  }

  await stripe.subscriptions.update(sub.stripeSubscriptionId, {
    items: [{ id: itemId, price: priceId }],
    proration_behavior: 'create_prorations', // 비례 계산
    metadata: { plan: targetPlan },
  })

  // DB 업데이트
  await Promise.all([
    db
      .update(organizations)
      .set({
        plan: targetPlan,
        maxStores: targetConfig.maxStores === -1 ? 999 : targetConfig.maxStores,
        maxUsers: targetConfig.maxUsers === -1 ? 999 : targetConfig.maxUsers,
        updatedAt: new Date(),
      })
      .where(eq(organizations.id, organizationId)),
    db
      .update(subscriptions)
      .set({
        plan: targetPlan,
        stripePriceId: priceId,
        priceMonthly: targetConfig.priceMonthly,
        updatedAt: new Date(),
      })
      .where(eq(subscriptions.id, sub.id)),
  ])

  revalidateTag(`org:${organizationId}`)
  revalidateTag('plans')

  return { success: true }
}

/**
 * 구독 취소
 */
export async function cancelSubscription(
  subscriptionId: string,
  cancelAtPeriodEnd: boolean = true
): Promise<void> {
  const sub = await db.query.subscriptions.findFirst({
    where: eq(subscriptions.id, subscriptionId),
  })

  if (!sub?.stripeSubscriptionId) {
    throw new Error('Stripe 구독 정보가 없습니다.')
  }

  if (cancelAtPeriodEnd) {
    // 기간 종료 시 취소
    await stripe.subscriptions.update(sub.stripeSubscriptionId, {
      cancel_at_period_end: true,
    })
  } else {
    // 즉시 취소
    await stripe.subscriptions.cancel(sub.stripeSubscriptionId)
  }

  // DB 업데이트
  await db
    .update(subscriptions)
    .set({
      cancelAtPeriodEnd,
      canceledAt: cancelAtPeriodEnd ? null : new Date(),
      updatedAt: new Date(),
    })
    .where(eq(subscriptions.id, subscriptionId))
}

/**
 * 웹훅 이벤트 처리 (멱등성 보장)
 */
export async function handleStripeWebhook(
  body: string,
  signature: string
): Promise<{ received: boolean; duplicate?: boolean }> {
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET

  if (!webhookSecret) {
    throw new Error('STRIPE_WEBHOOK_SECRET이 설정되지 않았습니다.')
  }

  let event: Stripe.Event

  try {
    event = stripe.webhooks.constructEvent(body, signature, webhookSecret)
  } catch (err) {
    throw new Error(`웹훅 서명 검증 실패: ${err}`)
  }

  // 멱등성 체크: 이미 처리된 이벤트인지 확인
  const existingEvent = await db.query.webhookEvents.findFirst({
    where: eq(webhookEvents.eventId, event.id),
  })

  if (existingEvent) {
    console.log(`Duplicate webhook event skipped: ${event.id} (${event.type})`)
    return { received: true, duplicate: true }
  }

  // 이벤트 처리 시작 전에 기록 (처리 중 상태)
  try {
    await db.insert(webhookEvents).values({
      eventId: event.id,
      eventType: event.type,
      status: 'processing',
      payload: event.data.object as unknown as Record<string, unknown>,
    })
  } catch (insertError) {
    // 동시에 같은 이벤트가 들어온 경우 (race condition)
    // unique constraint 에러면 중복으로 간주
    console.log(`Concurrent webhook event, skipping: ${event.id}`)
    return { received: true, duplicate: true }
  }

  // 이벤트 타입별 처리
  try {
    switch (event.type) {
      case 'checkout.session.completed':
        await handleCheckoutCompleted(
          event.data.object as Stripe.Checkout.Session
        )
        break

      case 'customer.subscription.created':
      case 'customer.subscription.updated':
        await handleSubscriptionUpdated(
          event.data.object as Stripe.Subscription
        )
        break

      case 'customer.subscription.deleted':
        await handleSubscriptionDeleted(
          event.data.object as Stripe.Subscription
        )
        break

      case 'invoice.paid':
        await handleInvoicePaid(event.data.object as Stripe.Invoice)
        break

      case 'invoice.payment_failed':
        await handleInvoicePaymentFailed(event.data.object as Stripe.Invoice)
        break

      default:
        console.log(`Unhandled event type: ${event.type}`)
    }

    // 처리 완료 상태로 업데이트
    await db
      .update(webhookEvents)
      .set({ status: 'processed', processedAt: new Date() })
      .where(eq(webhookEvents.eventId, event.id))
  } catch (processingError) {
    // 처리 실패 기록
    await db
      .update(webhookEvents)
      .set({
        status: 'failed',
        errorMessage:
          processingError instanceof Error
            ? processingError.message
            : String(processingError),
        retryCount: sql`${webhookEvents.retryCount} + 1`,
      })
      .where(eq(webhookEvents.eventId, event.id))

    throw processingError // 에러 재발생 (Stripe가 재시도하도록)
  }

  return { received: true }
}

/**
 * Checkout 완료 처리
 */
async function handleCheckoutCompleted(session: Stripe.Checkout.Session) {
  const organizationId = session.metadata?.organizationId
  const plan = session.metadata?.plan as PlanType
  const billingCycle = session.metadata?.billingCycle as 'monthly' | 'yearly'

  if (!organizationId || !plan) {
    console.error('Missing metadata in checkout session')
    return
  }

  // 조직 플랜 업데이트
  const planConfig = PLANS[plan]
  await db
    .update(organizations)
    .set({
      plan,
      maxStores: planConfig.maxStores === -1 ? 999 : planConfig.maxStores,
      maxUsers: planConfig.maxUsers === -1 ? 999 : planConfig.maxUsers,
      updatedAt: new Date(),
    })
    .where(eq(organizations.id, organizationId))

  revalidateTag(`org:${organizationId}`)
  revalidateTag('plans')
}

/**
 * 구독 업데이트 처리
 */
async function handleSubscriptionUpdated(subscription: Stripe.Subscription) {
  const organizationId = subscription.metadata?.organizationId
  if (!organizationId) return

  const plan = subscription.metadata?.plan as PlanType
  const priceId = subscription.items.data[0]?.price.id

  // 구독 정보 업데이트 또는 생성
  const existingSub = await db.query.subscriptions.findFirst({
    where: eq(subscriptions.stripeSubscriptionId, subscription.id),
  })

  const subData = {
    organizationId,
    plan: plan || 'basic',
    status: subscription.status,
    stripeSubscriptionId: subscription.id,
    stripePriceId: priceId,
    currentPeriodStart: new Date(subscription.current_period_start * 1000),
    currentPeriodEnd: new Date(subscription.current_period_end * 1000),
    cancelAtPeriodEnd: subscription.cancel_at_period_end,
    priceMonthly: PLANS[plan || 'basic'].priceMonthly,
    updatedAt: new Date(),
  }

  if (existingSub) {
    await db
      .update(subscriptions)
      .set(subData)
      .where(eq(subscriptions.id, existingSub.id))
  } else {
    await db.insert(subscriptions).values({
      ...subData,
      billingCycle: 'monthly', // TODO: Stripe에서 확인
    })
  }

  revalidateTag(`org:${organizationId}`)
}

/**
 * 구독 삭제 처리
 */
async function handleSubscriptionDeleted(subscription: Stripe.Subscription) {
  const organizationId = subscription.metadata?.organizationId
  if (!organizationId) return

  // 조직을 무료 플랜으로 다운그레이드
  await db
    .update(organizations)
    .set({
      plan: 'free',
      maxStores: PLANS.free.maxStores,
      maxUsers: PLANS.free.maxUsers,
      updatedAt: new Date(),
    })
    .where(eq(organizations.id, organizationId))

  // 구독 상태 업데이트
  await db
    .update(subscriptions)
    .set({
      status: 'canceled',
      canceledAt: new Date(),
      updatedAt: new Date(),
    })
    .where(eq(subscriptions.stripeSubscriptionId, subscription.id))

  revalidateTag(`org:${organizationId}`)
  revalidateTag('plans')
}

/**
 * 청구서 결제 완료 처리
 */
async function handleInvoicePaid(invoice: Stripe.Invoice) {
  if (!invoice.subscription) return

  const sub = await db.query.subscriptions.findFirst({
    where: eq(
      subscriptions.stripeSubscriptionId,
      invoice.subscription as string
    ),
  })

  if (!sub) return

  // 청구서 기록
  const invoiceNumber = `INV-${Date.now()}`
  await db.insert(invoices).values({
    organizationId: sub.organizationId,
    subscriptionId: sub.id,
    invoiceNumber,
    status: 'paid',
    amount: invoice.amount_paid,
    tax: invoice.tax || 0,
    total: invoice.total,
    currency: invoice.currency.toUpperCase(),
    stripeInvoiceId: invoice.id,
    paidAt: new Date(),
    invoiceUrl: invoice.hosted_invoice_url || undefined,
    pdfUrl: invoice.invoice_pdf || undefined,
  })
}

/**
 * 청구서 결제 실패 처리
 */
async function handleInvoicePaymentFailed(invoice: Stripe.Invoice) {
  if (!invoice.subscription) return

  // 구독 정보 조회
  const sub = await db.query.subscriptions.findFirst({
    where: eq(
      subscriptions.stripeSubscriptionId,
      invoice.subscription as string
    ),
  })

  if (!sub) {
    console.error(`Subscription not found for invoice: ${invoice.id}`)
    return
  }

  // 구독 상태를 past_due로 업데이트
  await db
    .update(subscriptions)
    .set({
      status: 'past_due',
      updatedAt: new Date(),
    })
    .where(
      eq(subscriptions.stripeSubscriptionId, invoice.subscription as string)
    )

  // 조직의 관리자 목록 조회
  const orgAdmins = await db
    .select({
      userId: organizationMembers.userId,
      email: users.email,
      name: users.name,
    })
    .from(organizationMembers)
    .innerJoin(users, eq(organizationMembers.userId, users.id))
    .where(
      and(
        eq(organizationMembers.organizationId, sub.organizationId),
        eq(organizationMembers.role, 'owner'),
        isNull(organizationMembers.deletedAt),
        isNull(users.deletedAt)
      )
    )

  // 결제 실패 알림 기록 생성
  const failureMessage = `결제 실패: ${invoice.amount_due ? `₩${(invoice.amount_due / 100).toLocaleString()}` : '금액 미상'} - ${invoice.billing_reason || '정기 결제'}`

  await db.insert(alertHistory).values({
    alertType: 'payment_failed',
    message: failureMessage,
    channel: 'system',
    recipient: orgAdmins.map((a) => a.email).join(', ') || 'unknown',
    status: 'pending',
    externalId: invoice.id,
    sentAt: null,
  })

  // 콘솔에 경고 로그 (프로덕션에서는 이메일/슬랙 등으로 대체)
  console.warn(`[PAYMENT FAILED] Organization: ${sub.organizationId}`)
  console.warn(`  Invoice ID: ${invoice.id}`)
  console.warn(
    `  Amount: ₩${invoice.amount_due ? (invoice.amount_due / 100).toLocaleString() : 'N/A'}`
  )
  console.warn(
    `  Admins to notify: ${orgAdmins.map((a) => a.email).join(', ') || 'none found'}`
  )

  // TODO: 실제 이메일/슬랙 알림 통합 시 아래 코드 활성화
  // await sendPaymentFailureEmail(orgAdmins, invoice)
  // await sendSlackNotification(failureMessage)
}
