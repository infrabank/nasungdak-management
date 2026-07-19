import { and, desc, eq, isNull } from 'drizzle-orm'
import { db } from '@/lib/db'
import { maintenanceLogs, oilChangeHistory } from '@/lib/db/schema'

/**
 * 튀김기 청소와 기름 교체는 현장에서 항상 함께 진행된다.
 * 한쪽 등록 시 다른 쪽도 자동 기록하기 위한 매핑/헬퍼.
 */
export const CLEANING_TASK_TO_FRYER: Record<string, string> = {
  '튀김 초벌기 청소': '초벌',
  '튀김 재벌기 청소': '재벌',
}

export const FRYER_TO_CLEANING_TASK: Record<string, string> = {
  초벌: '튀김 초벌기 청소',
  재벌: '튀김 재벌기 청소',
}

/** 직전 교체 이력 기준 기름 사용 일수 계산 */
export async function computeOilUsageDays(
  storeId: string | null,
  fryerType: string,
  changeDate: string
): Promise<number> {
  const conditions = [
    eq(oilChangeHistory.fryerType, fryerType),
    isNull(oilChangeHistory.deletedAt),
  ]
  if (storeId) {
    conditions.push(eq(oilChangeHistory.storeId, storeId))
  }
  const lastChange = await db.query.oilChangeHistory.findFirst({
    where: and(...conditions),
    orderBy: [desc(oilChangeHistory.changeDate)],
  })
  if (!lastChange?.changeDate) return 0
  const daysDiff = Math.floor(
    (new Date(changeDate).getTime() -
      new Date(lastChange.changeDate).getTime()) /
      (1000 * 60 * 60 * 24)
  )
  return Math.max(0, daysDiff)
}

/** 같은 (매장, 날짜, 튀김기) 기름 교체가 없을 때만 등록. 등록 여부 반환 */
export async function insertOilChangeIfMissing(
  storeId: string | null,
  changeDate: string,
  fryerType: string,
  notes: string | null
): Promise<boolean> {
  const dup = await db.query.oilChangeHistory.findFirst({
    where: and(
      eq(oilChangeHistory.changeDate, changeDate),
      eq(oilChangeHistory.fryerType, fryerType),
      isNull(oilChangeHistory.deletedAt),
      storeId
        ? eq(oilChangeHistory.storeId, storeId)
        : isNull(oilChangeHistory.storeId)
    ),
    columns: { id: true },
  })
  if (dup) return false

  const usageDays = await computeOilUsageDays(storeId, fryerType, changeDate)
  await db.insert(oilChangeHistory).values({
    storeId,
    changeDate,
    fryerType,
    oilType: '해바라기씨유',
    quantity: '0',
    supplierName: '자동 기록',
    unitPrice: '0',
    previousOilUsage: null,
    usageDays,
    notes,
  })
  return true
}

/** 같은 (매장, 날짜, 항목) 청소 기록이 없을 때만 등록. 등록 여부 반환 */
export async function insertCleaningLogIfMissing(
  storeId: string | null,
  performedDate: string,
  taskType: string,
  notes: string | null
): Promise<boolean> {
  const dup = await db.query.maintenanceLogs.findFirst({
    where: and(
      eq(maintenanceLogs.performedDate, performedDate),
      eq(maintenanceLogs.taskType, taskType),
      isNull(maintenanceLogs.deletedAt),
      storeId
        ? eq(maintenanceLogs.storeId, storeId)
        : isNull(maintenanceLogs.storeId)
    ),
    columns: { id: true },
  })
  if (dup) return false

  await db.insert(maintenanceLogs).values({
    storeId,
    taskType,
    performedDate,
    notes,
  })
  return true
}
