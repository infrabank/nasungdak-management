/**
 * 일회성 정정: 왕짧짧 개수 관리 전환 + 닭강정 레시피 연결, 대왕김말이 단위 정정
 * 사장님 확인 사항:
 *  - 왕짧짧 1봉 = 200개. 소분봉 대신 개수로 관리. 닭강정 컵 2개 / 소 6개 / 중 8개 사용
 *  - 대왕김말이 1봉 = 10개
 *
 * 사용: npx tsx scripts/fix-wang-kimmari.ts
 */
import { config } from 'dotenv'
config({ path: '.env.local' })

async function main() {
  const { db } = await import('@vercel/postgres')
  const client = await db.connect()

  try {
    await client.sql`BEGIN`

    // ===== 왕짧짧: 소분봉(6) -> 개(200) 관리 전환 =====
    const wang = await client.sql`
      SELECT i.id, i.organization_id, inv.store_id, inv.current_quantity
      FROM ingredients i
      JOIN inventory inv ON inv.ingredient_id = i.id
      WHERE i.ingredient_name = '왕짧짧' AND i.deleted_at IS NULL
    `
    if (wang.rows.length !== 1) throw new Error('왕짧짧 조회 실패')
    const wangId = wang.rows[0].id
    const wangStoreId = wang.rows[0].store_id
    if (Number(wang.rows[0].current_quantity) !== 6) {
      throw new Error(`왕짧짧 재고가 6이 아닙니다: ${wang.rows[0].current_quantity}`)
    }

    await client.sql`
      UPDATE ingredients
      SET unit = '개', purchase_unit = '봉', conversion_factor = '200',
          unit_cost = '42.50', updated_at = NOW(), updated_by = 'system'
      WHERE id = ${wangId}
    `
    // 재고 환산: 소분 6봉 = 1봉 분량 = 200개 (추정치, 실사로 보정 권장)
    await client.sql`
      UPDATE inventory SET current_quantity = '200', unit = '개', last_updated = NOW()
      WHERE ingredient_id = ${wangId}
    `
    console.log('왕짧짧 마스터/재고 전환 완료 (6소분봉 -> 200개)')

    // 매입별 원장 보정: 기대치 = 봉 수 x 200
    const wangRefs = await client.sql`
      SELECT p.id, p.quantity, COALESCE(SUM(e.quantity_change::numeric), 0) AS event_sum
      FROM purchase_transactions p
      JOIN inventory_events e ON e.reference_id = p.id
      WHERE p.ingredient_id = ${wangId} AND p.deleted_at IS NULL
      GROUP BY p.id, p.quantity
    `
    for (const row of wangRefs.rows) {
      const delta = Number(row.quantity) * 200 - Number(row.event_sum)
      if (delta === 0) continue
      await client.sql`
        INSERT INTO inventory_events
          (store_id, ingredient_id, event_type, quantity_change, reason, event_date, reference_id, created_by)
        VALUES (${wangStoreId}, ${wangId}, 'adjustment', ${String(delta)},
                '단위 정정 보정 (봉 200개 환산)', CURRENT_DATE, ${row.id}, 'system')
      `
    }
    // 전체 원장 보정: sum = 200
    const wangSum = await client.sql`
      SELECT COALESCE(SUM(quantity_change::numeric), 0) AS s
      FROM inventory_events WHERE ingredient_id = ${wangId}
    `
    const wangDelta = 200 - Number(wangSum.rows[0].s)
    if (wangDelta !== 0) {
      await client.sql`
        INSERT INTO inventory_events
          (store_id, ingredient_id, event_type, quantity_change, reason, event_date, created_by)
        VALUES (${wangStoreId}, ${wangId}, 'adjustment', ${String(wangDelta)},
                '개수 관리 전환 보정 (현 재고 200개 기준)', CURRENT_DATE, 'system')
      `
    }
    console.log(`왕짧짧 원장 보정 완료 (매입별 ${wangRefs.rows.length}건 검사, 최종 ${wangDelta})`)

    // 닭강정 레시피 연결: 컵 2개 / 소 6개 / 중 8개
    const RECIPE_QTY: Record<string, number> = {
      닭강정_컵: 2,
      닭강정_소: 6,
      닭강정_중: 8,
    }
    const skus = await client.sql`
      SELECT id, sku_name, organization_id FROM skus
      WHERE sku_name IN ('닭강정_컵', '닭강정_소', '닭강정_중') AND deleted_at IS NULL
    `
    if (skus.rows.length !== 3) throw new Error(`닭강정 SKU ${skus.rows.length}건 (3건 필요)`)
    for (const sku of skus.rows) {
      const dup = await client.sql`
        SELECT 1 FROM sku_recipes
        WHERE sku_id = ${sku.id} AND ingredient_id = ${wangId} AND deleted_at IS NULL
      `
      if (dup.rows.length > 0) {
        console.log(`  ${sku.sku_name}: 이미 레시피 존재, 건너뜀`)
        continue
      }
      await client.sql`
        INSERT INTO sku_recipes
          (organization_id, sku_id, ingredient_id, quantity, unit, created_by)
        VALUES (${sku.organization_id}, ${sku.id}, ${wangId},
                ${String(RECIPE_QTY[sku.sku_name])}, 'ea', 'system')
      `
      console.log(`  레시피 추가: ${sku.sku_name} = 왕짧짧 ${RECIPE_QTY[sku.sku_name]}개`)
    }

    // ===== 대왕김말이: 봉(10개) 단위 정정 =====
    const kim = await client.sql`
      SELECT i.id, inv.store_id, inv.current_quantity
      FROM ingredients i
      JOIN inventory inv ON inv.ingredient_id = i.id
      WHERE i.ingredient_name = '대왕김말이' AND i.deleted_at IS NULL
    `
    if (kim.rows.length !== 1) throw new Error('대왕김말이 조회 실패')
    const kimId = kim.rows[0].id
    const kimStoreId = kim.rows[0].store_id
    const kimCurrent = Number(kim.rows[0].current_quantity)

    await client.sql`
      UPDATE ingredients
      SET purchase_unit = '봉', conversion_factor = '10', unit_cost = '665',
          updated_at = NOW(), updated_by = 'system'
      WHERE id = ${kimId}
    `
    // 매입 정규화: 1/26(10봉 총액 입력) -> 10 x 7,205 / 7/14(개 수 입력) -> 5 x 6,650
    await client.sql`
      UPDATE purchase_transactions
      SET quantity = 10, unit_price = 7205, updated_at = NOW(), updated_by = 'system'
      WHERE ingredient_id = ${kimId} AND deleted_at IS NULL AND unit_price::numeric = 72050
    `
    await client.sql`
      UPDATE purchase_transactions
      SET quantity = 5, unit_price = 6650, updated_at = NOW(), updated_by = 'system'
      WHERE ingredient_id = ${kimId} AND deleted_at IS NULL AND unit_price::numeric = 665
    `
    const kimPurchases = await client.sql`
      SELECT transaction_date, quantity, unit_price, total_amount
      FROM purchase_transactions
      WHERE ingredient_id = ${kimId} AND deleted_at IS NULL
      ORDER BY transaction_date
    `
    console.log('대왕김말이 매입 정규화 (봉 단위):')
    console.table(
      kimPurchases.rows.map((r) => ({
        date: String(r.transaction_date).slice(4, 15),
        qty: r.quantity,
        price: r.unit_price,
        total: r.total_amount,
      }))
    )

    // 매입별 원장 보정 (이벤트 있는 매입: 기대치 = 봉 수 x 10)
    const kimRefs = await client.sql`
      SELECT p.id, p.quantity, COALESCE(SUM(e.quantity_change::numeric), 0) AS event_sum
      FROM purchase_transactions p
      JOIN inventory_events e ON e.reference_id = p.id
      WHERE p.ingredient_id = ${kimId} AND p.deleted_at IS NULL
      GROUP BY p.id, p.quantity
    `
    for (const row of kimRefs.rows) {
      const delta = Number(row.quantity) * 10 - Number(row.event_sum)
      if (delta === 0) continue
      await client.sql`
        INSERT INTO inventory_events
          (store_id, ingredient_id, event_type, quantity_change, reason, event_date, reference_id, created_by)
        VALUES (${kimStoreId}, ${kimId}, 'adjustment', ${String(delta)},
                '단위 정정 보정 (봉 10개 환산)', CURRENT_DATE, ${row.id}, 'system')
      `
    }
    const kimSum = await client.sql`
      SELECT COALESCE(SUM(quantity_change::numeric), 0) AS s
      FROM inventory_events WHERE ingredient_id = ${kimId}
    `
    const kimDelta = kimCurrent - Number(kimSum.rows[0].s)
    if (kimDelta !== 0) {
      await client.sql`
        INSERT INTO inventory_events
          (store_id, ingredient_id, event_type, quantity_change, reason, event_date, created_by)
        VALUES (${kimStoreId}, ${kimId}, 'adjustment', ${String(kimDelta)},
                '단위 정정 일괄 보정 (현 재고 기준)', CURRENT_DATE, 'system')
      `
    }
    console.log(`대왕김말이 원장 보정 완료 (매입별 ${kimRefs.rows.length}건 검사, 최종 ${kimDelta})`)

    // ===== 최종 검증 =====
    for (const [name, id, expectQty] of [
      ['왕짧짧', wangId, 200],
      ['대왕김말이', kimId, kimCurrent],
    ] as const) {
      const check = await client.sql`
        SELECT
          (SELECT COALESCE(SUM(quantity_change::numeric), 0)
           FROM inventory_events WHERE ingredient_id = ${id}) AS event_sum,
          (SELECT current_quantity::numeric FROM inventory WHERE ingredient_id = ${id}) AS current_qty
      `
      console.log(`${name} 검증:`, check.rows[0])
      if (
        Number(check.rows[0].event_sum) !== Number(check.rows[0].current_qty) ||
        Number(check.rows[0].current_qty) !== expectQty
      ) {
        throw new Error(`${name}: 최종 정합성 검증 실패`)
      }
    }

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
