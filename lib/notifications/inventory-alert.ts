import { and, eq, gt, inArray, ne } from 'drizzle-orm'
import { db } from '@/lib/db'
import { alertHistory } from '@/lib/db/schema'
import { logger, errorToContext } from '@/lib/logger'

// 같은 (매장, 재료) 알림의 재발송 억제 시간
const ALERT_SUPPRESSION_HOURS = 24

/**
 * 재고 부족 알림 1건의 정보
 */
export interface InventoryAlertItem {
  storeId: string
  storeName: string
  managerPhone: string
  ingredientId: string
  ingredientName: string
  daysRemaining: number
  thresholdDays: number
}

type DeliveryStatus = 'sent' | 'failed' | 'pending'

/**
 * 알림 메시지를 외부 채널로 전송합니다.
 *
 * 운영 시크릿은 코드에 두지 않습니다. 환경변수 `ALERT_WEBHOOK_URL`이 설정된 경우에만
 * 해당 엔드포인트(카카오 알림톡 릴레이/Slack 등)로 POST 합니다.
 * 미설정 시에는 전송을 건너뛰고 이력만 'pending'으로 기록합니다.
 */
async function deliver(
  message: string,
  recipient: string | null
): Promise<{ status: DeliveryStatus; channel: string }> {
  const url = process.env.ALERT_WEBHOOK_URL

  if (!url) {
    // 채널 미구성: 발송하지 않고 대기 상태로 기록만 남김
    return { status: 'pending', channel: 'log' }
  }

  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text: message, recipient }),
    })
    return { status: res.ok ? 'sent' : 'failed', channel: 'webhook' }
  } catch (error) {
    logger.error('Inventory alert delivery failed', errorToContext(error))
    return { status: 'failed', channel: 'webhook' }
  }
}

/**
 * 최근 억제 시간 내에 발송/기록된 (매장, 재료) 조합을 조회합니다.
 * 실패(failed) 이력은 재시도할 수 있도록 억제하지 않습니다.
 */
async function getRecentlyAlertedKeys(
  alerts: InventoryAlertItem[]
): Promise<Set<string>> {
  if (alerts.length === 0) return new Set()

  const since = new Date(Date.now() - ALERT_SUPPRESSION_HOURS * 60 * 60 * 1000)
  const storeIds = [...new Set(alerts.map((a) => a.storeId))]
  const ingredientIds = [...new Set(alerts.map((a) => a.ingredientId))]

  try {
    const rows = await db
      .select({
        storeId: alertHistory.storeId,
        ingredientId: alertHistory.ingredientId,
      })
      .from(alertHistory)
      .where(
        and(
          eq(alertHistory.alertType, 'inventory_low'),
          gt(alertHistory.createdAt, since),
          ne(alertHistory.status, 'failed'),
          inArray(alertHistory.storeId, storeIds),
          inArray(alertHistory.ingredientId, ingredientIds)
        )
      )
    return new Set(rows.map((r) => `${r.storeId}:${r.ingredientId}`))
  } catch (error) {
    logger.error(
      'Failed to load recent alert history',
      errorToContext(error)
    )
    return new Set()
  }
}

/**
 * 재고 부족 알림 목록을 전송하고 `alert_history`에 발송 이력을 기록합니다.
 * - 최근 24시간 내 같은 (매장, 재료) 알림이 있으면 건너뜁니다 (중복 발송 방지)
 * - 발송 채널이 구성되지 않은 환경에서도 안전하게 동작합니다(이력만 기록)
 */
export async function recordAndDispatchAlerts(
  alerts: InventoryAlertItem[]
): Promise<{
  total: number
  sent: number
  failed: number
  pending: number
  skipped: number
}> {
  let sent = 0
  let failed = 0
  let pending = 0
  let skipped = 0

  const recentKeys = await getRecentlyAlertedKeys(alerts)

  for (const alert of alerts) {
    if (recentKeys.has(`${alert.storeId}:${alert.ingredientId}`)) {
      skipped++
      continue
    }
    const message = `[재고 부족] ${alert.storeName} · ${alert.ingredientName} 잔여 약 ${alert.daysRemaining}일 (임계값 ${alert.thresholdDays}일)`
    const { status, channel } = await deliver(message, alert.managerPhone || null)

    try {
      await db.insert(alertHistory).values({
        storeId: alert.storeId,
        alertType: 'inventory_low',
        ingredientId: alert.ingredientId,
        message,
        channel,
        recipient: alert.managerPhone || null,
        status,
        sentAt: status === 'sent' ? new Date() : null,
      })
    } catch (error) {
      logger.error('Failed to record alert history', errorToContext(error))
    }

    if (status === 'sent') sent++
    else if (status === 'failed') failed++
    else pending++
  }

  return { total: alerts.length, sent, failed, pending, skipped }
}
