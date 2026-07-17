/**
 * 일회성 정정 (사장님 확인): 포장 개수 재정정
 *  - 왕짧짧: 1봉 = 390개 (기존 200), 개당 8,500.02/390 = 21.79원
 *    재고가 아직 추정치(200 = 기존 '1봉 분량')면 새 1봉 분량(390)으로 갱신
 *  - 비엔나소세지: 1봉 = 110개 (기존 130), 개당 7,545/110 = 68.59원
 * 각각 매입별 원장 재보정 + 현 재고 기준 일괄 보정.
 * 사용: npx tsx scripts/fix-pack-sizes.ts
 */
import { config } from 'dotenv'
config({ path: '.env.local' })

async function main() {
  const { db } = await import('@vercel/postgres')
  const client = await db.connect()

  async function recalibrate(opts: {
    name: string
    factor: number
    unitCost: number
    /** 재고가 이 값(이전 추정치)이면 newEstimate로 갱신 */
    oldEstimate?: number
    newEstimate?: number
  }) {
    const row = await client.query(
      `SELECT i.id, inv.store_id, inv.current_quantity
       FROM ingredients i JOIN inventory inv ON inv.ingredient_id = i.id
       WHERE i.ingredient_name = $1 AND i.deleted_at IS NULL`,
      [opts.name]
    )
    if (row.rows.length !== 1) throw new Error(`${opts.name} 조회 실패`)
    const { id, store_id } = row.rows[0]
    let current = Number(row.rows[0].current_quantity)

    await client.query(
      `UPDATE ingredients SET conversion_factor = $1, unit_cost = $2,
         updated_at = NOW(), updated_by = 'system' WHERE id = $3`,
      [String(opts.factor), String(opts.unitCost), id]
    )

    if (
      opts.oldEstimate != null &&
      opts.newEstimate != null &&
      current === opts.oldEstimate
    ) {
      await client.query(
        `UPDATE inventory SET current_quantity = $1, last_updated = NOW()
         WHERE ingredient_id = $2`,
        [String(opts.newEstimate), id]
      )
      console.log(`${opts.name}: 재고 추정치 ${opts.oldEstimate} -> ${opts.newEstimate} 갱신`)
      current = opts.newEstimate
    }

    const refs = await client.query(
      `SELECT p.id, p.quantity, COALESCE(SUM(e.quantity_change::numeric), 0) AS event_sum
       FROM purchase_transactions p
       JOIN inventory_events e ON e.reference_id = p.id
       WHERE p.ingredient_id = $1 AND p.deleted_at IS NULL
       GROUP BY p.id, p.quantity`,
      [id]
    )
    for (const r of refs.rows) {
      const delta = Number(r.quantity) * opts.factor - Number(r.event_sum)
      if (delta === 0) continue
      await client.query(
        `INSERT INTO inventory_events
           (store_id, ingredient_id, event_type, quantity_change, reason, event_date, reference_id, created_by)
         VALUES ($1, $2, 'adjustment', $3, '포장 개수 재보정 (봉 ${opts.factor}개)', CURRENT_DATE, $4, 'system')`,
        [store_id, id, String(delta), r.id]
      )
    }
    const sum = await client.query(
      `SELECT COALESCE(SUM(quantity_change::numeric), 0) AS s
       FROM inventory_events WHERE ingredient_id = $1`,
      [id]
    )
    const finalDelta = current - Number(sum.rows[0].s)
    if (finalDelta !== 0) {
      await client.query(
        `INSERT INTO inventory_events
           (store_id, ingredient_id, event_type, quantity_change, reason, event_date, created_by)
         VALUES ($1, $2, 'adjustment', $3, '포장 개수 재보정 일괄 (현 재고 기준)', CURRENT_DATE, 'system')`,
        [store_id, id, String(finalDelta)]
      )
    }
    const check = await client.query(
      `SELECT
         (SELECT COALESCE(SUM(quantity_change::numeric), 0) FROM inventory_events WHERE ingredient_id = $1) AS s,
         (SELECT current_quantity::numeric FROM inventory WHERE ingredient_id = $1) AS q`,
      [id]
    )
    if (Number(check.rows[0].s) !== Number(check.rows[0].q)) {
      throw new Error(`${opts.name} 정합성 실패`)
    }
    console.log(`${opts.name}: 계수 ${opts.factor}, 개당 ${opts.unitCost}원, 원장 = 재고 = ${check.rows[0].q}`)
  }

  try {
    await client.sql`BEGIN`
    await recalibrate({
      name: '왕짧짧',
      factor: 390,
      unitCost: 21.79,
      oldEstimate: 200,
      newEstimate: 390,
    })
    await recalibrate({ name: '비엔나소세지', factor: 110, unitCost: 68.59 })
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
