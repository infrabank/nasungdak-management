import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { organizations, stores } from '@/lib/db/schema'
import {
  revalidateIngredientData,
  revalidateSkuData,
  revalidateMenuData,
  revalidateSalesMenuData,
  revalidateSupplierData,
  revalidateInventoryData,
  revalidateSalesData,
  revalidatePurchaseData,
  revalidateAlertRuleData,
  revalidateStoresData,
} from '@/lib/cache-tags'
import { logger, errorToContext } from '@/lib/logger'

export const dynamic = 'force-dynamic'

/**
 * 전체 데이터 캐시 무효화 (CRON_SECRET Bearer 인증).
 * 스크립트로 DB를 직접 정정하면 unstable_cache 태그가 무효화되지 않아
 * 화면이 옛 값을 계속 보여준다. 정정 후 이 엔드포인트를 한 번 호출한다.
 *
 * 사용: curl -X POST -H "Authorization: Bearer $CRON_SECRET" https://<host>/api/admin/revalidate
 */
export async function POST(request: Request) {
  const secret = process.env.CRON_SECRET
  const authHeader = request.headers.get('authorization')

  if (!secret || authHeader !== `Bearer ${secret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const orgRows = await db.select({ id: organizations.id }).from(organizations)
    const storeRows = await db.select({ id: stores.id }).from(stores)

    // 조직 스코프 태그: 실제 orgId별 + 'all' 폴백까지 전부 턴다
    for (const orgId of [...orgRows.map((r) => r.id), null]) {
      revalidateIngredientData(orgId) // 레시피/마진 파생 캐시 포함
      revalidateSkuData(orgId)
      revalidateMenuData(orgId)
      revalidateSalesMenuData(orgId)
      revalidateSupplierData(orgId)
    }
    // 매장 스코프 태그
    for (const storeId of [...storeRows.map((r) => r.id), null]) {
      revalidateInventoryData(storeId)
      revalidateSalesData(storeId) // 재고 파생 캐시 포함
      revalidatePurchaseData(storeId)
      revalidateAlertRuleData(storeId)
    }
    revalidateStoresData()

    logger.info('Admin cache revalidation completed', {
      orgs: orgRows.length,
      stores: storeRows.length,
    })
    return NextResponse.json({
      success: true,
      orgs: orgRows.length,
      stores: storeRows.length,
    })
  } catch (error) {
    logger.error('Admin cache revalidation failed', errorToContext(error))
    return NextResponse.json(
      { success: false, error: 'internal_error' },
      { status: 500 }
    )
  }
}
