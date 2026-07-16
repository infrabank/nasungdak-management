/**
 * 일회성 진단: 매입 단가가 재료별로 크게 널뛴(단위 혼용 의심) 재료 스캔 (읽기 전용)
 * 사용: npx tsx scripts/scan-price-regime.ts
 */
import { config } from 'dotenv'
config({ path: '.env.local' })

async function main() {
  const { sql } = await import('@vercel/postgres')

  const suspects = await sql`
    SELECT i.ingredient_name, i.unit, i.purchase_unit, i.conversion_factor,
           COUNT(*) AS purchase_count,
           MIN(p.unit_price::numeric) AS min_price,
           MAX(p.unit_price::numeric) AS max_price,
           ROUND(MAX(p.unit_price::numeric) / NULLIF(MIN(p.unit_price::numeric), 0), 1) AS ratio
    FROM purchase_transactions p
    JOIN ingredients i ON i.id = p.ingredient_id AND i.deleted_at IS NULL
    WHERE p.deleted_at IS NULL
    GROUP BY i.id, i.ingredient_name, i.unit, i.purchase_unit, i.conversion_factor
    HAVING MAX(p.unit_price::numeric) / NULLIF(MIN(p.unit_price::numeric), 0) >= 3
    ORDER BY ratio DESC
  `
  console.log('=== 단가 최대/최소 3배 이상 (단위 혼용 의심) ===')
  console.log(suspects.rows.length === 0 ? '없음' : suspects.rows)
}

main().then(() => process.exit(0)).catch((e) => {
  console.error(e)
  process.exit(1)
})
