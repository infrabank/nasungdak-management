/**
 * 일회성 정정 (사장님 실측 기준):
 *  - 비엔나소세지: 1봉 = 130개 (기존 100개 -> 정정), 봉당 6,850원 기준 개당 52.69원
 *    레시피(1인분 2개)는 기존과 동일, 원장만 봉x130으로 재보정
 *  - 떡볶이 소스: 컵 기준 17g (기존 레시피 15g -> 17g), 1봉 3kg/46,000원은 기존 설정 유지
 * 사용: npx tsx scripts/fix-sausage-sauce.ts
 */
import { config } from 'dotenv'
config({ path: '.env.local' })

async function main() {
  const { db } = await import('@vercel/postgres')
  const client = await db.connect()
  try {
    await client.sql`BEGIN`

    // ===== 비엔나소세지: 1봉 = 130개 =====
    const v = await client.sql`
      SELECT i.id, inv.store_id, inv.current_quantity
      FROM ingredients i
      JOIN inventory inv ON inv.ingredient_id = i.id
      WHERE i.ingredient_name = '비엔나소세지' AND i.deleted_at IS NULL
    `
    if (v.rows.length !== 1) throw new Error('비엔나소세지 조회 실패')
    const vId = v.rows[0].id
    const vStoreId = v.rows[0].store_id
    const vCurrent = Number(v.rows[0].current_quantity)

    await client.sql`
      UPDATE ingredients
      SET conversion_factor = '130', unit_cost = '52.69',
          updated_at = NOW(), updated_by = 'system'
      WHERE id = ${vId}
    `

    // 매입별 원장 재보정: 기대치 = 봉 수 x 130
    const refs = await client.sql`
      SELECT p.id, p.quantity, COALESCE(SUM(e.quantity_change::numeric), 0) AS event_sum
      FROM purchase_transactions p
      JOIN inventory_events e ON e.reference_id = p.id
      WHERE p.ingredient_id = ${vId} AND p.deleted_at IS NULL
      GROUP BY p.id, p.quantity
    `
    for (const row of refs.rows) {
      const delta = Number(row.quantity) * 130 - Number(row.event_sum)
      if (delta === 0) continue
      await client.sql`
        INSERT INTO inventory_events
          (store_id, ingredient_id, event_type, quantity_change, reason, event_date, reference_id, created_by)
        VALUES (${vStoreId}, ${vId}, 'adjustment', ${String(delta)},
                '단위 재보정 (봉 130개 환산)', CURRENT_DATE, ${row.id}, 'system')
      `
    }
    const vSum = await client.sql`
      SELECT COALESCE(SUM(quantity_change::numeric), 0) AS s
      FROM inventory_events WHERE ingredient_id = ${vId}
    `
    const vDelta = vCurrent - Number(vSum.rows[0].s)
    if (vDelta !== 0) {
      await client.sql`
        INSERT INTO inventory_events
          (store_id, ingredient_id, event_type, quantity_change, reason, event_date, created_by)
        VALUES (${vStoreId}, ${vId}, 'adjustment', ${String(vDelta)},
                '단위 재보정 일괄 (현 재고 기준)', CURRENT_DATE, 'system')
      `
    }
    const vCheck = await client.sql`
      SELECT COALESCE(SUM(quantity_change::numeric), 0) AS s
      FROM inventory_events WHERE ingredient_id = ${vId}
    `
    if (Number(vCheck.rows[0].s) !== vCurrent) throw new Error('비엔나소세지 정합성 실패')
    console.log(`비엔나소세지: 계수 130, 개당 52.69원, 원장 = 재고 = ${vCurrent}`)

    // ===== 떡볶이 소스: 컵 레시피 15g -> 17g =====
    const updated = await client.sql`
      UPDATE sku_recipes r
      SET quantity = '17', updated_at = NOW(), updated_by = 'system'
      FROM skus sk, ingredients i
      WHERE r.sku_id = sk.id AND r.ingredient_id = i.id
        AND i.ingredient_name = '떡볶이 소스' AND i.deleted_at IS NULL
        AND sk.sku_name IN ('떡볶이_컵', '떡볶이_컵(밀)', '떡볶이_컵(쌀)') AND sk.deleted_at IS NULL
        AND r.deleted_at IS NULL AND r.quantity::numeric = 15
      RETURNING sk.sku_name
    `
    console.log(`떡볶이 소스 컵 레시피 17g 변경: ${updated.rows.map((r) => r.sku_name).join(', ')}`)

    await client.sql`COMMIT`
    console.log('COMMIT 완료')
  } catch (e) {
    await client.sql`ROLLBACK`
    console.error('ROLLBACK:', e)
    process.exit(1)
  } finally {
    client.release()
  }
}
main().then(() => process.exit(0))
