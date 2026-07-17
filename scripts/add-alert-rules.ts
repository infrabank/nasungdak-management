/**
 * 재고 알림 규칙 일괄 등록:
 * 대상 = core 관리 + 활성 + 재고 행 존재 + 레시피 연결(소모 예측 가능) 재료 중
 *        활성 규칙이 없는 것. 기본값: 잔여 3일 이하 알림, 예측 기간 30일, 전체 매장.
 * bag 재료는 규칙 없이 자동 알림(0봉)이므로 제외.
 * 사용: npx tsx scripts/add-alert-rules.ts
 */
import { config } from 'dotenv'
config({ path: '.env.local' })

async function main() {
  const { db } = await import('@vercel/postgres')
  const client = await db.connect()
  try {
    await client.sql`BEGIN`

    // 후보: core + 활성 + 재고 행 + 활성 레시피 존재
    const candidates = await client.sql`
      SELECT DISTINCT i.id, i.ingredient_name, i.organization_id
      FROM ingredients i
      JOIN inventory inv ON inv.ingredient_id = i.id
      JOIN sku_recipes r ON r.ingredient_id = i.id AND r.deleted_at IS NULL
      JOIN skus sk ON sk.id = r.sku_id AND sk.deleted_at IS NULL AND sk.is_active = true
      WHERE i.deleted_at IS NULL AND i.is_active = true
        AND i.management_level = 'core'
      ORDER BY i.ingredient_name
    `
    console.log(`후보 재료: ${candidates.rows.length}종`)

    const existing = await client.sql`
      SELECT DISTINCT ingredient_id FROM inventory_alert_rules
      WHERE deleted_at IS NULL AND is_active = true
    `
    const has = new Set(existing.rows.map((r) => r.ingredient_id))

    let added = 0
    const skipped: string[] = []
    for (const c of candidates.rows) {
      if (has.has(c.id)) {
        skipped.push(c.ingredient_name)
        continue
      }
      await client.sql`
        INSERT INTO inventory_alert_rules
          (store_id, ingredient_id, alert_threshold_days, prediction_period_days, is_active, created_by)
        VALUES (NULL, ${c.id}, 3, 30, true, 'system')
      `
      console.log(`  등록: ${c.ingredient_name}`)
      added++
    }
    if (skipped.length > 0) console.log(`기존 규칙 있어 건너뜀: ${skipped.join(', ')}`)

    // 규칙 등록 불가(레시피 없음) core 재고 재료 안내용 목록
    const noRecipe = await client.sql`
      SELECT i.ingredient_name
      FROM ingredients i
      JOIN inventory inv ON inv.ingredient_id = i.id
      WHERE i.deleted_at IS NULL AND i.is_active = true
        AND i.management_level = 'core'
        AND NOT EXISTS (
          SELECT 1 FROM sku_recipes r
          JOIN skus sk ON sk.id = r.sku_id AND sk.deleted_at IS NULL AND sk.is_active = true
          WHERE r.ingredient_id = i.id AND r.deleted_at IS NULL
        )
      ORDER BY i.ingredient_name
    `
    console.log(
      `레시피 미연결(소모 예측 불가, 규칙 실효 없음): ${noRecipe.rows.map((r) => r.ingredient_name).join(', ') || '없음'}`
    )

    const total = await client.sql`
      SELECT COUNT(*) AS cnt FROM inventory_alert_rules
      WHERE deleted_at IS NULL AND is_active = true
    `
    console.log(`신규 등록 ${added}건, 총 활성 규칙 ${total.rows[0].cnt}건`)

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
