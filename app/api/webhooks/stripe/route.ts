import { NextRequest, NextResponse } from 'next/server'
import { handleStripeWebhook } from '@/lib/stripe'
import { logger } from '@/lib/logger'

/**
 * Stripe 웹훅 엔드포인트
 *
 * Stripe Dashboard에서 웹훅 URL 설정:
 * - Production: https://your-domain.com/api/webhooks/stripe
 * - Development: Stripe CLI 사용 (`stripe listen --forward-to localhost:3000/api/webhooks/stripe`)
 *
 * 필요한 이벤트:
 * - checkout.session.completed
 * - customer.subscription.created
 * - customer.subscription.updated
 * - customer.subscription.deleted
 * - invoice.paid
 * - invoice.payment_failed
 */
export async function POST(request: NextRequest) {
  const startTime = Date.now()

  try {
    // Raw body 읽기 (서명 검증에 필요)
    const body = await request.text()
    const signature = request.headers.get('stripe-signature')

    if (!signature) {
      logger.warn('Stripe webhook: Missing signature header')
      return NextResponse.json(
        { error: 'Missing stripe-signature header' },
        { status: 400 }
      )
    }

    // 웹훅 처리
    const result = await handleStripeWebhook(body, signature)

    const duration = Date.now() - startTime
    logger.info('Stripe webhook processed', {
      duration,
      received: result.received,
    })

    return NextResponse.json(result, { status: 200 })
  } catch (error) {
    const duration = Date.now() - startTime
    const errorMessage =
      error instanceof Error ? error.message : 'Unknown error'

    logger.error('Stripe webhook error', {
      error: errorMessage,
      duration,
    })

    // 서명 검증 실패는 400, 그 외는 500
    const isSignatureError = errorMessage.includes('서명 검증')
    return NextResponse.json(
      { error: errorMessage },
      { status: isSignatureError ? 400 : 500 }
    )
  }
}

// Stripe 웹훅은 raw body가 필요하므로 body parsing 비활성화
export const config = {
  api: {
    bodyParser: false,
  },
}
