import { db } from '@/lib/db'
import { alertHistory } from '@/lib/db/schema'
import { logger, errorToContext } from '@/lib/logger'

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
 * 재고 부족 알림 목록을 전송하고 `alert_history`에 발송 이력을 기록합니다.
 * 발송 채널이 구성되지 않은 환경에서도 안전하게 동작합니다(이력만 기록).
 */
export async function recordAndDispatchAlerts(
  alerts: InventoryAlertItem[]
): Promise<{ total: number; sent: number; failed: number; pending: number }> {
  let sent = 0
  let failed = 0
  let pending = 0

  for (const alert of alerts) {
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

  return { total: alerts.length, sent, failed, pending }
}
