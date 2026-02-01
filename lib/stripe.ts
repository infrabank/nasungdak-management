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
import { organizations, subscriptions, invoices } from '@/lib/db/schema'
import { eq } from 'drizzle-orm'
import { PLANS, type PlanType } from '@/lib/features'
import { revalidateTag } from 'next/cache'

// Stripe 클라이언트 (서버 사이드 전용)
export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || '', {
  apiVersion: '2024-12-18.acacia',
  typescript: true,
})

// Stripe Price ID 매핑 (Stripe Dashboard에서 생성 후 설정)
export const STRIPE_PRICE_IDS: Record<PlanType, { monthly?: string; yearly?: string }> = {
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
  const { organizationId, plan, billingCycle, successUrl, cancelUrl, customerEmail } = params

  // Price ID 조회
  const priceId = STRIPE_PRICE_IDS[plan]?.[billingCycle]
  if (!priceId) {
    throw new Error(`플랜 ${plan}의 ${billingCycle} 가격이 설정되지 않았습니다.`)
  }

  // 고객 생성/조회
  const customerId = await getOrCreateStripeCustomer(organizationId, customerEmail)

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
 * 웹훅 이벤트 처리
 */
export async function handleStripeWebhook(
  body: string,
  signature: string
): Promise<{ received: boolean }> {
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

  // 이벤트 타입별 처리
  switch (event.type) {
    case 'checkout.session.completed':
      await handleCheckoutCompleted(event.data.object as Stripe.Checkout.Session)
      break

    case 'customer.subscription.created':
    case 'customer.subscription.updated':
      await handleSubscriptionUpdated(event.data.object as Stripe.Subscription)
      break

    case 'customer.subscription.deleted':
      await handleSubscriptionDeleted(event.data.object as Stripe.Subscription)
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
    where: eq(subscriptions.stripeSubscriptionId, invoice.subscription as string),
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

  // 구독 상태를 past_due로 업데이트
  await db
    .update(subscriptions)
    .set({
      status: 'past_due',
      updatedAt: new Date(),
    })
    .where(eq(subscriptions.stripeSubscriptionId, invoice.subscription as string))

  // TODO: 관리자에게 알림 발송
}
