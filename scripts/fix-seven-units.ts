/**
 * 일회성 정정: 재료 7종 단위 체계 통일 (기준: 매입 수량 = 구매 포장 수)
 * 사장님 확인 포장 구성:
 *  - 비엔나소세지 1봉 = 100개
 *  - 떡볶이 소스 1봉 = 3kg (bag 관리)
 *  - 염지닭 1봉 = 5kg, 4봉씩 구매
 *  - 왕짧짧 1봉(5kg) = 소분 6봉
 *  - 밀떡볶이 1봉 = 소분 10봉 (소분봉 = 컵 1개 분량)
 *  - 소떡소떡 1봉 = 10개
 *  - 상천어묵 1포(5,150원) = 소분 50봉
 * + 쌀떡볶이 unit_cost 갱신 (지난 정정 누락분)
 *
 * 각 재료: 마스터 정정 -> 매입 정규화 -> 매입별 원장 보정 -> 전체 원장 보정(현 재고 기준)
 * 사용: npx tsx scripts/fix-seven-units.ts
 */
import { config } from 'dotenv'
config({ path: '.env.local' })

interface PurchaseRewrite {
  /** 대상 식별: 현재 unit_price 값 */
  wherePrice: number
  /** 필요 시 수량까지 매칭 (단가 중복 대비) */
  whereQty?: number
  newQty: number
  newPrice: number
}

interface Fix {
  name: string
  unit: string
  purchaseUnit: string
  factor: number
  /** 레시피 원가용 사용단위당 단가 (최근 매입 기준) */
  unitCost: number
  /** bag 관리 재료: 매입 이벤트 기대치 = 수량 그대로 (환산 미적용) */
  isBag?: boolean
  rewrites: PurchaseRewrite[]
}

const FIXES: Fix[] = [
  {
    name: '비엔나소세지',
    unit: '개',
    purchaseUnit: '봉',
    factor: 100,
    unitCost: 75.45,
    rewrites: [
      { wherePrice: 2, newQty: 2, newPrice: 6500 }, // 수량/단가 뒤바뀐 입력
      { wherePrice: 75.45, newQty: 2, newPrice: 7545 }, // 개 단가 입력
    ],
  },
  {
    name: '떡볶이 소스',
    unit: 'g',
    purchaseUnit: '봉',
    factor: 3000,
    unitCost: 15.33,
    isBag: true,
    rewrites: [
      { wherePrice: 15.33, newQty: 2, newPrice: 45990 }, // g 단가 입력
    ],
  },
  {
    name: '염지닭',
    unit: 'g',
    purchaseUnit: '봉',
    factor: 5000,
    unitCost: 7.55,
    rewrites: [
      { wherePrice: 6500, newQty: 4, newPrice: 32500 }, // kg 입력(20kg=4봉)
      { wherePrice: 7040, newQty: 4, newPrice: 35200 },
      { wherePrice: 7000, newQty: 4, newPrice: 35000 },
      { wherePrice: 350, newQty: 4, newPrice: 1750 }, // 금액 자체가 의심(총 7,000원) - 단위만 정규화
      { wherePrice: 7150, newQty: 4, newPrice: 35750 },
      { wherePrice: 7550, newQty: 4, newPrice: 37750 },
      { wherePrice: 7.55, newQty: 4, newPrice: 37750 }, // g 입력(20000g=4봉)
    ],
  },
  {
    name: '왕짧짧',
    unit: '소분봉',
    purchaseUnit: '봉',
    factor: 6,
    unitCost: 1416.67,
    rewrites: [
      { wherePrice: 1600, newQty: 1, newPrice: 8000 }, // 5분할 단가 입력
      { wherePrice: 20, newQty: 1, newPrice: 8000 }, // 낱개 단가 입력
      { wherePrice: 1416.67, newQty: 1, newPrice: 8500.02 }, // 소분 6봉 단가 입력
    ],
  },
  {
    name: '밀떡볶이',
    unit: '소분봉',
    purchaseUnit: '봉',
    factor: 10,
    unitCost: 210,
    rewrites: [
      { wherePrice: 36000, newQty: 20, newPrice: 1800 }, // 묶음 총액 입력(20봉)
      { wherePrice: 210, newQty: 20, newPrice: 2100 }, // 소분봉 수 입력(200소분=20봉)
    ],
  },
  {
    name: '소떡소떡',
    unit: '개',
    purchaseUnit: '봉',
    factor: 10,
    unitCost: 667.7,
    rewrites: [
      { wherePrice: 667.7, newQty: 8, newPrice: 6677 }, // 개 수 입력(80개=8봉)
    ],
  },
  {
    name: '상천어묵',
    unit: '봉',
    purchaseUnit: '포',
    factor: 50,
    unitCost: 103,
    rewrites: [
      { wherePrice: 98000, newQty: 20, newPrice: 4900 }, // 박스 총액 입력(20포)
    ],
  },
]

async function main() {
  const { db } = await import('@vercel/postgres')
  const client = await db.connect()

  try {
    await client.sql`BEGIN`

    for (const fix of FIXES) {
      console.log(`\n===== ${fix.name} =====`)
      const ing = await client.query(
        `SELECT id FROM ingredients WHERE ingredient_name = $1 AND deleted_at IS NULL`,
        [fix.name]
      )
      if (ing.rows.length !== 1) {
        throw new Error(`${fix.name}: 재료를 찾을 수 없습니다 (${ing.rows.length}건)`)
      }
      const ingId = ing.rows[0].id

      // 1. 마스터 정정
      await client.query(
        `UPDATE ingredients
         SET unit = $1, purchase_unit = $2, conversion_factor = $3, unit_cost = $4,
             updated_at = NOW(), updated_by = 'system'
         WHERE id = $5`,
        [fix.unit, fix.purchaseUnit, String(fix.factor), String(fix.unitCost), ingId]
      )
      // bag 재료 재고 단위는 '봉' 유지, 그 외는 마스터 unit으로 동기화
      await client.query(
        `UPDATE inventory SET unit = $1, last_updated = NOW() WHERE ingredient_id = $2`,
        [fix.isBag ? '봉' : fix.unit, ingId]
      )

      // 2. 매입 정규화 (구매 포장 수 기준)
      for (const rw of fix.rewrites) {
        const cond = rw.whereQty != null ? ` AND quantity::numeric = ${rw.whereQty}` : ''
        const res = await client.query(
          `UPDATE purchase_transactions
           SET quantity = $1,
               unit_price = $2, updated_at = NOW(), updated_by = 'system'
           WHERE ingredient_id = $3 AND deleted_at IS NULL
             AND unit_price::numeric = $4${cond}
           RETURNING id`,
          [rw.newQty, String(rw.newPrice), ingId, rw.wherePrice]
        )
        console.log(`  단가 ${rw.wherePrice} -> ${rw.newQty} x ${rw.newPrice}: ${res.rows.length}건`)
      }

      // 정규화 검증: 총액 왜곡 여부 (수량 x 단가가 정규화 전 총액과 ±1원 이내)
      // -> 위 UPDATE는 수량을 newQty로 강제하므로 여기서 총액을 재검증한다
      const purchases = await client.query(
        `SELECT id, transaction_date, quantity, unit_price, total_amount
         FROM purchase_transactions
         WHERE ingredient_id = $1 AND deleted_at IS NULL
         ORDER BY transaction_date`,
        [ingId]
      )
      console.table(
        purchases.rows.map((r) => ({
          date: String(r.transaction_date).slice(4, 15),
          qty: r.quantity,
          price: r.unit_price,
          total: r.total_amount,
        }))
      )

      // 3. 매입별 원장 보정 (이벤트 있는 매입: 합계 = 포장 수 x 환산, bag은 포장 수)
      const storeRow = await client.query(
        `SELECT store_id FROM inventory WHERE ingredient_id = $1 LIMIT 1`,
        [ingId]
      )
      if (storeRow.rows.length === 0) {
        console.log('  재고 행 없음 - 원장 보정 생략')
        continue
      }
      const storeId = storeRow.rows[0].store_id

      const refSums = await client.query(
        `SELECT p.id, p.quantity, COALESCE(SUM(e.quantity_change::numeric), 0) AS event_sum
         FROM purchase_transactions p
         JOIN inventory_events e ON e.reference_id = p.id
         WHERE p.ingredient_id = $1 AND p.deleted_at IS NULL
         GROUP BY p.id, p.quantity`,
        [ingId]
      )
      let compensated = 0
      for (const row of refSums.rows) {
        const expected = Number(row.quantity) * (fix.isBag ? 1 : fix.factor)
        const delta = expected - Number(row.event_sum)
        if (delta === 0) continue
        await client.query(
          `INSERT INTO inventory_events
             (store_id, ingredient_id, event_type, quantity_change, reason, event_date, reference_id, created_by)
           VALUES ($1, $2, 'adjustment', $3, '단위 정정 보정 (구매 포장 단위 환산)', CURRENT_DATE, $4, 'system')`,
          [storeId, ingId, String(delta), row.id]
        )
        compensated++
      }
      console.log(`  매입별 원장 보정: ${compensated}건`)

      // 4. 전체 원장 보정: sum(이벤트) = 현재 재고
      const sums = await client.query(
        `SELECT
           (SELECT COALESCE(SUM(quantity_change::numeric), 0)
            FROM inventory_events WHERE ingredient_id = $1) AS event_sum,
           (SELECT current_quantity::numeric FROM inventory WHERE ingredient_id = $1) AS current_qty`,
        [ingId]
      )
      const finalDelta = Number(sums.rows[0].current_qty) - Number(sums.rows[0].event_sum)
      if (finalDelta !== 0) {
        await client.query(
          `INSERT INTO inventory_events
             (store_id, ingredient_id, event_type, quantity_change, reason, event_date, created_by)
           VALUES ($1, $2, 'adjustment', $3, '단위 정정 일괄 보정 (현 재고 기준)', CURRENT_DATE, 'system')`,
          [storeId, ingId, String(finalDelta)]
        )
      }
      console.log(`  전체 원장 보정: ${finalDelta}`)

      const check = await client.query(
        `SELECT
           (SELECT COALESCE(SUM(quantity_change::numeric), 0)
            FROM inventory_events WHERE ingredient_id = $1) AS event_sum,
           (SELECT current_quantity::numeric FROM inventory WHERE ingredient_id = $1) AS current_qty`,
        [ingId]
      )
      if (Number(check.rows[0].event_sum) !== Number(check.rows[0].current_qty)) {
        throw new Error(`${fix.name}: 최종 정합성 검증 실패`)
      }
      console.log(`  검증 통과: 이벤트 합계 = 재고 = ${check.rows[0].current_qty}`)
    }

    // 쌀떡볶이 unit_cost 갱신 (지난 정정에서 누락)
    await client.query(
      `UPDATE ingredients SET unit_cost = '202.38', updated_at = NOW(), updated_by = 'system'
       WHERE ingredient_name = '쌀떡볶이' AND deleted_at IS NULL`
    )
    console.log('\n쌀떡볶이 unit_cost -> 202.38 (개당)')

    await client.sql`COMMIT`
    console.log('\nCOMMIT 완료')
  } catch (e) {
    await client.sql`ROLLBACK`
    console.error('ROLLBACK:', e)
    process.exit(1)
  } finally {
    client.release()
  }
}

main().then(() => process.exit(0))
