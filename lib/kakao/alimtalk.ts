// 카카오 알림톡 연동 모듈
// 토스 POS 연동 Phase 2, 재고 알림 Phase 3

/**
 * 알림 발송 이력을 DB에 저장하고 카카오 알림톡으로 전송합니다.
 * 현재는 템플릿 등록 전이므로 로깅만 수행합니다.
 * 카카오 비즈메시지 센터에서 템플릿 등록 후 실제 발송 기능을 활성화하세요.
 */

import { db } from '@/lib/db'
import { alertHistory } from '@/lib/db/schema'
import { sql } from 'drizzle-orm'

interface AlimtalkParams {
  templateCode: string
  recipientPhone: string
  templateParams: Record<string, string>
}

interface AlimtalkResult {
  success: boolean
  messageId?: string
  error?: string
}

export class KakaoAlimtalkClient {
  // TODO: 카카오 비즈메시지 API 키 설정 필요
  // .env: KAKAO_REST_API_KEY, KAKAO_SENDER_KEY
  // 카카오 비즈메시지 센터: https://business.kakao.com/
   // 템플릿 등록:
   //   - INVENTORY_LOW_ALERT: 재고 부족 알림
   //   - SYNC_FAILED_ALERT: 동기화 실패 알림

  async sendAlimtalk(params: AlimtalkParams): Promise<any> {
    try {
      // TODO: 실제 카카오 API 호출 구현
      // const response = await fetch('https://api.kakaowork.com/v1/send', {
      //   method: 'POST',
      //   headers: {
      //     'Authorization': `KakaoAK ${process.env.KAKAO_REST_API_KEY}`,
      //     'Content-Type': 'application/json',
      //   },
      //   body: JSON.stringify({
      //     sender_key: process.env.KAKAO_SENDER_KEY,
      //     template_code: params.templateCode,
      //     receiver_phone: params.recipientPhone,
      //     template_parameter: params.templateParams,
      //   }),
      // })

      // if (!response.ok) {
      //   const error = await response.json()
      //   return {
      //     success: false,
      //     error: error.message || '알림 발송 실패',
      //   }
      // }

      // const data = await response.json()
      // return {
      //   success: true,
      //   messageId: data.message_id,
      // }

      // 임시: 로깅만 수행
      console.log('[KAKAO 알림톡] 템플릿:', params.templateCode)
      console.log('[KAKAO 알림톡] 수신자:', params.recipientPhone)
      console.log('[KAKAO 알림톡] 파라미터:', params.templateParams)
      console.log('[KAKAO 알림톡] 템플릿 등록 및 API 키 설정 후 실제 발송됩니다')

      return {
        success: true,
        messageId: 'SIMULATED-' + Date.now(),
      }
    } catch (error) {
      console.error('[KAKAO 알림톡] 발송 실패:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : '알림 발송 실패',
      }
    }
  }
}

// 재고 부족 알림 발송 (30일 예측 기준)
export async function sendInventoryLowAlert(params: {
  storeId: string
  storeName: string
  ingredientId: string
  ingredientName: string
  currentQuantity: number
  unit: string
  daysRemaining: number
  avgDailySales: number
  recipientPhone: string
}): Promise<boolean> {
  const client = new KakaoAlimtalkClient()

  const message = `[나성닭강정] 재고 부족 알림

매장: ${params.storeName}
재료: ${params.ingredientName}
현재 재고: ${params.currentQuantity}${params.unit}
예상 소진일: ${params.daysRemaining}일

발주를 검토해 주세요.`

예측 기간: 30일
평균 일판매량: ${params.avgDailySales.toFixed(2)}${params.unit}`

참고: 이 알림은 30일 예측 기준입니다.`

(이 알림은 로깅만 수행됩니다. 카카오 비즈메시지 센터에서 템플릿 등록 후 실제 발송 기능을 활성화하세요.)`

  const templateParams = {
    store_name: params.storeName,
    ingredient_name: params.ingredientName,
    current_quantity: String(params.currentQuantity),
    unit: params.unit,
    days_remaining: String(params.daysRemaining),
    prediction_period: '30',
    avg_daily_sales: params.avgDailySales.toFixed(2),
  }

  // 이력 저장
  await db.insert(alertHistory).values({
    storeId: params.storeId,
    alertType: 'inventory_low',
    ingredientId: params.ingredientId,
    message,
    channel: 'kakao',
    recipient: params.recipientPhone,
    status: 'logged', // 로깅만 수행 상태
    sentAt: null,
  })

  // 알림 발송 (현재는 로깅만)
  const result = await client.sendAlimtalk({
    templateCode: 'INVENTORY_LOW_ALERT',
    recipientPhone: params.recipientPhone,
    templateParams,
  })

  // 실제 발송 상태로 업데이트
  await db.update(alertHistory)
    .set({
      status: result.success ? 'logged' : 'failed',
      externalId: result.messageId,
      sentAt: result.success ? new Date() : null,
    })
    .where(sql`id = (
      SELECT id FROM alert_history 
      WHERE store_id = ${params.storeId} 
        AND alert_type = 'inventory_low' 
        AND ingredient_id = ${params.ingredientId} 
        AND created_at = (
          SELECT MAX(created_at) FROM alert_history 
          WHERE store_id = ${params.storeId} 
            AND alert_type = 'inventory_low' 
            AND ingredient_id = ${params.ingredientId}
        )
    )`)

  return result.success
}

// 동기화 실패 알림 발송
export async function sendSyncFailedAlert(params: {
  storeId: string
  storeName: string
  syncDate: string
  failedCount: number
  recipientPhone: string
}): Promise<boolean> {
  const client = new KakaoAlimtalkClient()

  const message = `[나성닭강정] 매출 동기화 실패

매장: ${params.storeName}
날짜: ${params.syncDate}
실패 건수: ${params.failedCount}건

관리자 페이지에서 확인해 주세요.

(이 알림은 로깅만 수행됩니다. 카카오 비즈메시지 센터에서 템플릿 등록 후 실제 발송 기능을 활성화하세요.)`

  const templateParams = {
    store_name: params.storeName,
    sync_date: params.syncDate,
    failed_count: String(params.failedCount),
  }

  // 이력 저장
  await db.insert(alertHistory).values({
    storeId: params.storeId,
    alertType: 'sync_failed',
    message,
    channel: 'kakao',
    recipient: params.recipientPhone,
    status: 'logged',
    sentAt: null,
  })

  // 알림 발송 (현재는 로깅만)
  const result = await client.sendAlimtalk({
    templateCode: 'SYNC_FAILED_ALERT',
    recipientPhone: params.recipientPhone,
    templateParams,
  })

  // 실제 발송 상태로 업데이트
  await db.update(alertHistory)
    .set({
      status: result.success ? 'logged' : 'failed',
      externalId: result.messageId,
      sentAt: result.success ? new Date() : null,
    })
    .where(sql`id = (
      SELECT id FROM alert_history 
      WHERE store_id = ${params.storeId} 
        AND alert_type = 'sync_failed' 
        AND created_at = (
          SELECT MAX(created_at) FROM alert_history 
          WHERE store_id = ${params.storeId} 
            AND alert_type = 'sync_failed'
        )
    )`)

  return result.success
}
