/**
 * 일회성 진단: 재고 단위/마스터 단위 불일치, 음수 재고, 환산계수 미설정 스캔 (읽기 전용)
 * 사용: npx tsx scripts/scan-unit-mismatch.ts
 */
import { config } from 'dotenv'
config({ path: '.env.local' })

async function main() {
  const { sql } = await import('@vercel/postgres')

  const mismatch = await sql`
    SELECT s.store_name, i.ingredient_name,
           i.unit AS master_unit, inv.unit AS inventory_unit,
           i.conversion_factor, inv.current_quantity, inv.last_updated
    FROM inventory inv
    JOIN ingredients i ON i.id = inv.ingredient_id AND i.deleted_at IS NULL
    JOIN stores s ON s.id = inv.store_id
    WHERE inv.unit IS DISTINCT FROM i.unit
    ORDER BY s.store_name, i.ingredient_name
  `
  console.log('=== 1. 재고 단위 != 마스터 단위 ===')
  console.log(mismatch.rows.length === 0 ? '없음' : mismatch.rows)

  const negative = await sql`
    SELECT s.store_name, i.ingredient_name, i.unit AS master_unit,
           inv.current_quantity, inv.last_updated
    FROM inventory inv
    JOIN ingredients i ON i.id = inv.ingredient_id AND i.deleted_at IS NULL
    JOIN stores s ON s.id = inv.store_id
    WHERE inv.current_quantity::numeric < 0
    ORDER BY inv.current_quantity::numeric
  `
  console.log('=== 2. 음수 재고 ===')
  console.log(negative.rows.length === 0 ? '없음' : negative.rows)

  // 레시피 단위와 재료 단위가 다른데 표준 환산(kg/g, L/ml)이 아닌 조합
  const recipeUnit = await sql`
    SELECT DISTINCT i.ingredient_name, r.unit AS recipe_unit, i.unit AS master_unit
    FROM sku_recipes r
    JOIN ingredients i ON i.id = r.ingredient_id AND i.deleted_at IS NULL
    WHERE r.deleted_at IS NULL
      AND LOWER(r.unit) != LOWER(i.unit)
      AND NOT (
        (LOWER(r.unit), LOWER(i.unit)) IN (('kg','g'),('g','kg'),('l','ml'),('ml','l'))
      )
    ORDER BY i.ingredient_name
  `
  console.log('=== 3. 레시피 단위 != 재료 단위 (환산 불가, 1:1로 처리 중) ===')
  console.log(recipeUnit.rows.length === 0 ? '없음' : recipeUnit.rows)

  // 재고 관리 중(재고 행 존재)인데 환산계수가 없는 재료의 최근 매입 단위 확인용
  const noFactor = await sql`
    SELECT DISTINCT i.ingredient_name, i.unit AS master_unit, i.conversion_factor,
           i.purchase_unit
    FROM ingredients i
    JOIN inventory inv ON inv.ingredient_id = i.id
    WHERE i.deleted_at IS NULL
      AND (i.conversion_factor IS NULL OR i.conversion_factor::numeric = 1)
    ORDER BY i.ingredient_name
  `
  console.log('=== 4. 재고 관리 중인데 매입 환산계수 미설정(=1) ===')
  console.log(noFactor.rows.length === 0 ? '없음' : noFactor.rows)
}

main().then(() => process.exit(0))
