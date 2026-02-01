'use server'

import { db } from '@/lib/db'
import { auditLogs } from '@/lib/db/schema'
import { headers } from 'next/headers'
import { getAuthContext } from '@/lib/auth'

type AuditAction = 'CREATE' | 'UPDATE' | 'DELETE'

interface AuditLogParams {
  tableName: string
  recordId: string
  action: AuditAction
  oldValues?: Record<string, unknown> | null
  newValues?: Record<string, unknown> | null
  storeId?: string | null
}

/**
 * 감사 로그 기록
 * 
 * 사용법:
 * ```typescript
 * import { logAudit } from '@/lib/audit'
 * 
 * // 생성 시
 * await logAudit({
 *   tableName: 'purchase_transactions',
 *   recordId: newRecord.id,
 *   action: 'CREATE',
 *   newValues: newRecord,
 *   storeId: newRecord.storeId,
 * })
 * 
 * // 수정 시
 * await logAudit({
 *   tableName: 'purchase_transactions',
 *   recordId: record.id,
 *   action: 'UPDATE',
 *   oldValues: oldRecord,
 *   newValues: newRecord,
 *   storeId: record.storeId,
 * })
 * 
 * // 삭제 시
 * await logAudit({
 *   tableName: 'purchase_transactions',
 *   recordId: record.id,
 *   action: 'DELETE',
 *   oldValues: oldRecord,
 *   storeId: record.storeId,
 * })
 * ```
 */
export async function logAudit(params: AuditLogParams): Promise<void> {
  try {
    // 사용자 컨텍스트 가져오기 (실패해도 계속 진행)
    let userId: string | null = null
    try {
      const auth = await getAuthContext()
      if (auth.isAuthenticated) {
        userId = auth.userId
      }
    } catch {
      // 인증 컨텍스트를 가져올 수 없어도 감사 로그는 기록
    }

    // 요청 헤더에서 IP와 User-Agent 추출
    let ipAddress: string | null = null
    let userAgent: string | null = null
    try {
      const headersList = await headers()
      ipAddress = headersList.get('x-forwarded-for')?.split(',')[0]?.trim() 
        || headersList.get('x-real-ip')
        || null
      userAgent = headersList.get('user-agent')
    } catch {
      // 헤더를 가져올 수 없어도 계속 진행
    }

    // 민감한 필드 마스킹
    const sanitizedOldValues = params.oldValues 
      ? sanitizeValues(params.oldValues) 
      : null
    const sanitizedNewValues = params.newValues 
      ? sanitizeValues(params.newValues) 
      : null

    await db.insert(auditLogs).values({
      storeId: params.storeId,
      userId,
      tableName: params.tableName,
      recordId: params.recordId,
      action: params.action,
      oldValues: sanitizedOldValues,
      newValues: sanitizedNewValues,
      ipAddress,
      userAgent,
    })
  } catch (error) {
    // 감사 로그 실패는 주 기능에 영향을 주지 않도록 함
    console.error('Audit log failed:', error)
  }
}

/**
 * 민감한 필드 마스킹
 */
function sanitizeValues(values: Record<string, unknown>): Record<string, unknown> {
  const sensitiveFields = [
    'passwordHash',
    'password_hash',
    'password',
    'token',
    'secret',
    'apiKey',
    'api_key',
  ]

  const sanitized = { ...values }

  for (const field of sensitiveFields) {
    if (field in sanitized) {
      sanitized[field] = '[REDACTED]'
    }
  }

  return sanitized
}

/**
 * 변경된 필드만 추출
 */
export function getChangedFields(
  oldValues: Record<string, unknown>,
  newValues: Record<string, unknown>
): { field: string; oldValue: unknown; newValue: unknown }[] {
  const changes: { field: string; oldValue: unknown; newValue: unknown }[] = []

  for (const key of Object.keys(newValues)) {
    if (JSON.stringify(oldValues[key]) !== JSON.stringify(newValues[key])) {
      changes.push({
        field: key,
        oldValue: oldValues[key],
        newValue: newValues[key],
      })
    }
  }

  return changes
}

/**
 * 벌크 작업용 감사 로그
 */
export async function logBulkAudit(
  tableName: string,
  action: AuditAction,
  records: { id: string; storeId?: string | null }[],
  description?: string
): Promise<void> {
  try {
    let userId: string | null = null
    try {
      const auth = await getAuthContext()
      if (auth.isAuthenticated) {
        userId = auth.userId
      }
    } catch {
      // 인증 컨텍스트를 가져올 수 없어도 계속 진행
    }

    let ipAddress: string | null = null
    let userAgent: string | null = null
    try {
      const headersList = await headers()
      ipAddress = headersList.get('x-forwarded-for')?.split(',')[0]?.trim() 
        || headersList.get('x-real-ip')
        || null
      userAgent = headersList.get('user-agent')
    } catch {
      // 헤더를 가져올 수 없어도 계속 진행
    }

    // 벌크 로그 (최대 100개까지만 개별 기록)
    const recordsToLog = records.slice(0, 100)

    await db.insert(auditLogs).values(
      recordsToLog.map((record) => ({
        storeId: record.storeId,
        userId,
        tableName,
        recordId: record.id,
        action,
        newValues: description ? { _bulkOperation: description, _totalCount: records.length } : null,
        ipAddress,
        userAgent,
      }))
    )

    // 100개 초과 시 요약 로그 추가
    if (records.length > 100) {
      await db.insert(auditLogs).values({
        storeId: records[0]?.storeId,
        userId,
        tableName,
        recordId: null,
        action,
        newValues: {
          _bulkOperation: description || 'bulk operation',
          _totalCount: records.length,
          _logged: 100,
          _remaining: records.length - 100,
        },
        ipAddress,
        userAgent,
      })
    }
  } catch (error) {
    console.error('Bulk audit log failed:', error)
  }
}

/**
 * 감사 로그 래퍼 - Server Action에서 사용
 * 
 * @example
 * ```typescript
 * export async function updatePurchase(id: string, formData: FormData) {
 *   return withAudit(
 *     'purchase_transactions',
 *     id,
 *     async () => {
 *       // 기존 레코드 조회
 *       const oldRecord = await db.query.purchaseTransactions.findFirst(...)
 *       
 *       // 업데이트 실행
 *       const [newRecord] = await db.update(purchaseTransactions)...
 *       
 *       return {
 *         success: true,
 *         data: newRecord,
 *         _audit: { oldValues: oldRecord, newValues: newRecord, storeId: newRecord.storeId }
 *       }
 *     }
 *   )
 * }
 * ```
 */
export async function withAudit<T extends { 
  success: boolean
  _audit?: { 
    oldValues?: Record<string, unknown>
    newValues?: Record<string, unknown>
    storeId?: string | null 
  } 
}>(
  tableName: string,
  recordId: string,
  fn: () => Promise<T>
): Promise<Omit<T, '_audit'>> {
  const result = await fn()

  if (result.success && result._audit) {
    const action: AuditAction = result._audit.oldValues
      ? result._audit.newValues
        ? 'UPDATE'
        : 'DELETE'
      : 'CREATE'

    await logAudit({
      tableName,
      recordId,
      action,
      oldValues: result._audit.oldValues,
      newValues: result._audit.newValues,
      storeId: result._audit.storeId,
    })
  }

  // _audit 필드 제거 후 반환
  const { _audit, ...rest } = result
  return rest as Omit<T, '_audit'>
}
