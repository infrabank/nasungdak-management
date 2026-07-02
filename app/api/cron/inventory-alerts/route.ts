import { NextResponse } from 'next/server'
import { evaluateLowStockForAllOrgs } from '@/lib/inventory/alert-service'
import { recordAndDispatchAlerts } from '@/lib/notifications/inventory-alert'
import { logger, errorToContext } from '@/lib/logger'

export const dynamic = 'force-dynamic'
export const maxDuration = 60

/**
 * 재고 부족 자동 점검 크론 (vercel.json crons에서 매일 호출).
 * CRON_SECRET 환경변수와 일치하는 Bearer 토큰이 있어야 실행됩니다.
 * 최근 24시간 내 발송 이력이 있는 (매장, 재료)는 자동으로 건너뜁니다.
 */
export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET
  const authHeader = request.headers.get('authorization')

  if (!secret || authHeader !== `Bearer ${secret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const alerts = await evaluateLowStockForAllOrgs()
    const result = await recordAndDispatchAlerts(alerts)

    logger.info('Inventory alert cron completed', { ...result })

    return NextResponse.json({ success: true, ...result })
  } catch (error) {
    logger.error('Inventory alert cron failed', errorToContext(error))
    return NextResponse.json(
      { success: false, error: 'internal_error' },
      { status: 500 }
    )
  }
}
