/**
 * 일회성 정정: 쌀떡볶이 단위 체계 통일 (기준: 매입 수량 = 포 수, 재고/레시피 = 개)
 *
 * 1. 재료 마스터 unit '봉' -> '개' (1포 = 42개, 환산계수 42 유지)
 * 2. 과거 매입 정규화: 봉 단가(1600원)/개 단가(190~202원) 입력분을 포 단위로 환산
 * 3. 매입별 재고 이벤트 보정: 이벤트 합계 = 매입 포 수 x 42가 되도록 adjustment 추가
 *    (이후 매입 수정/삭제 시 원복이 올바른 수량으로 동작)
 * 4. 전체 원장 보정: sum(이벤트) = 현재 실사 재고가 되도록 최종 adjustment 추가
 *
 * 사용: npx tsx scripts/fix-rice-tteok-units.ts
 */
import { config } from 'dotenv'
config({ path: '.env.local' })

async function main() {
  const { db } = await import('@vercel/postgres')
  const client = await db.connect()

  try {
    await client.sql`BEGIN`

    const ing = await client.sql`
      SELECT i.id, i.unit, i.conversion_factor
      FROM ingredients i
      WHERE i.ingredient_name = '쌀떡볶이' AND i.deleted_at IS NULL
    `
    if (ing.rows.length !== 1) throw new Error('쌀떡볶이 재료를 찾을 수 없습니다')
    const ingId = ing.rows[0].id
    if (Number(ing.rows[0].conversion_factor) !== 42) {
      throw new Error(`환산계수가 42가 아닙니다: ${ing.rows[0].conversion_factor}`)
    }

    // 1. 마스터: 사용 단위 '개' (레시피 소모/재고 카운트 단위)
    await client.sql`
      UPDATE ingredients
      SET unit = '개', updated_at = NOW(), updated_by = 'system'
      WHERE id = ${ingId}
    `
    await client.sql`
      UPDATE inventory SET unit = '개', last_updated = NOW()
      WHERE ingredient_id = ${ingId}
    `

    // 2a. 봉 단가 입력분 (5봉 x 1600원 = 1포): 포 단위로 환산
    const bagRows = await client.sql`
      UPDATE purchase_transactions
      SET quantity = quantity / 5, unit_price = unit_price * 5,
          updated_at = NOW(), updated_by = 'system'
      WHERE ingredient_id = ${ingId} AND deleted_at IS NULL
        AND unit_price::numeric = 1600
      RETURNING transaction_date, quantity, unit_price
    `
    console.log(`봉 단가 정규화: ${bagRows.rows.length}건`)

    // 2b. 개 단가 입력분 (42개 x 190~202원 = 1포): 포 단위로 환산
    const pieceRows = await client.sql`
      UPDATE purchase_transactions
      SET quantity = quantity / 42, unit_price = unit_price * 42,
          updated_at = NOW(), updated_by = 'system'
      WHERE ingredient_id = ${ingId} AND deleted_at IS NULL
        AND unit_price::numeric < 1000
      RETURNING transaction_date, quantity, unit_price
    `
    console.log(`개 단가 정규화: ${pieceRows.rows.length}건`)

    // 정규화 결과 검증: 수량은 정수(포 수), 단가는 5000원 이상이어야 한다
    const invalid = await client.sql`
      SELECT id, transaction_date, quantity, unit_price
      FROM purchase_transactions
      WHERE ingredient_id = ${ingId} AND deleted_at IS NULL
        AND (quantity::numeric % 1 != 0 OR unit_price::numeric < 5000)
    `
    if (invalid.rows.length > 0) {
      console.error(invalid.rows)
      throw new Error('정규화 결과가 포 단위 규칙에 맞지 않는 매입이 있습니다')
    }

    // 3. 매입별 이벤트 보정: 이벤트가 있는 매입의 합계를 (포 수 x 42)개로 맞춘다
    const storeRow = await client.sql`
      SELECT store_id FROM inventory WHERE ingredient_id = ${ingId} LIMIT 1
    `
    const storeId = storeRow.rows[0].store_id

    const refSums = await client.sql`
      SELECT p.id, p.quantity, COALESCE(SUM(e.quantity_change::numeric), 0) AS event_sum
      FROM purchase_transactions p
      JOIN inventory_events e ON e.reference_id = p.id
      WHERE p.ingredient_id = ${ingId} AND p.deleted_at IS NULL
      GROUP BY p.id, p.quantity
    `
    let compensated = 0
    for (const row of refSums.rows) {
      const expected = Number(row.quantity) * 42
      const delta = expected - Number(row.event_sum)
      if (delta === 0) continue
      await client.sql`
        INSERT INTO inventory_events
          (store_id, ingredient_id, event_type, quantity_change, reason, event_date, reference_id, created_by)
        VALUES
          (${storeId}, ${ingId}, 'adjustment', ${String(delta)},
           '단위 정정 보정 (매입 포->개 환산)', CURRENT_DATE, ${row.id}, 'system')
      `
      compensated++
    }
    console.log(`매입별 이벤트 보정: ${compensated}건`)

    // 4. 전체 원장 보정: sum(이벤트) = 현재 재고(실사값)
    const sums = await client.sql`
      SELECT
        (SELECT COALESCE(SUM(quantity_change::numeric), 0)
         FROM inventory_events WHERE ingredient_id = ${ingId}) AS event_sum,
        (SELECT current_quantity::numeric
         FROM inventory WHERE ingredient_id = ${ingId}) AS current_qty
    `
    const finalDelta =
      Number(sums.rows[0].current_qty) - Number(sums.rows[0].event_sum)
    if (finalDelta !== 0) {
      await client.sql`
        INSERT INTO inventory_events
          (store_id, ingredient_id, event_type, quantity_change, reason, event_date, created_by)
        VALUES
          (${storeId}, ${ingId}, 'adjustment', ${String(finalDelta)},
           '단위 정정 일괄 보정 (현 재고 기준)', CURRENT_DATE, 'system')
      `
    }
    console.log(`전체 원장 보정: ${finalDelta}`)

    // 최종 검증
    const check = await client.sql`
      SELECT
        (SELECT COALESCE(SUM(quantity_change::numeric), 0)
         FROM inventory_events WHERE ingredient_id = ${ingId}) AS event_sum,
        (SELECT current_quantity::numeric
         FROM inventory WHERE ingredient_id = ${ingId}) AS current_qty
    `
    console.log('검증 (이벤트 합계 = 현재 재고):', check.rows[0])
    if (Number(check.rows[0].event_sum) !== Number(check.rows[0].current_qty)) {
      throw new Error('최종 정합성 검증 실패')
    }

    const finalPurchases = await client.sql`
      SELECT transaction_date, quantity, unit_price, total_amount
      FROM purchase_transactions
      WHERE ingredient_id = ${ingId} AND deleted_at IS NULL
      ORDER BY transaction_date ASC
    `
    console.log('정규화된 매입 이력 (포 단위):')
    console.table(
      finalPurchases.rows.map((r) => ({
        date: String(r.transaction_date).slice(0, 15),
        qty: r.quantity,
        price: r.unit_price,
        total: r.total_amount,
      }))
    )

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
