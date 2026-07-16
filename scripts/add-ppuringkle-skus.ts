/**
 * 일회성 등록: 뿌링클 닭강정 SKU 3종 추가 (추가금 반영) + 기본 닭강정 레시피 복사
 *  - 닭강정_컵(뿌링클) 5,000원 (기본 4,000 + 1,000)
 *  - 닭강정_소(뿌링클) 11,900원 (기본 9,900 + 2,000)
 *  - 닭강정_중(뿌링클) 17,900원 (기본 15,900 + 2,000)
 * 레시피는 기본 SKU 것을 그대로 복사 (뿌링클소스 사용량 확인되면 추후 조정)
 *
 * 사용: npx tsx scripts/add-ppuringkle-skus.ts
 */
import { config } from 'dotenv'
config({ path: '.env.local' })

const NEW_SKUS = [
  { base: '닭강정_컵', name: '닭강정_컵(뿌링클)', price: 5000 },
  { base: '닭강정_소', name: '닭강정_소(뿌링클)', price: 11900 },
  { base: '닭강정_중', name: '닭강정_중(뿌링클)', price: 17900 },
]

async function main() {
  const { db } = await import('@vercel/postgres')
  const client = await db.connect()

  try {
    await client.sql`BEGIN`

    for (const def of NEW_SKUS) {
      const base = await client.query(
        `SELECT id, organization_id, menu_id, description
         FROM skus WHERE sku_name = $1 AND deleted_at IS NULL`,
        [def.base]
      )
      if (base.rows.length !== 1) {
        throw new Error(`${def.base}: 기준 SKU 조회 실패 (${base.rows.length}건)`)
      }
      const b = base.rows[0]

      const dup = await client.query(
        `SELECT 1 FROM skus WHERE sku_name = $1 AND deleted_at IS NULL`,
        [def.name]
      )
      if (dup.rows.length > 0) {
        console.log(`${def.name}: 이미 존재, 건너뜀`)
        continue
      }

      const inserted = await client.query(
        `INSERT INTO skus (organization_id, sku_name, menu_id, unit_price, description, is_active, created_by)
         VALUES ($1, $2, $3, $4, $5, true, 'system')
         RETURNING id`,
        [
          b.organization_id,
          def.name,
          b.menu_id,
          String(def.price),
          '뿌링클 옵션 (추가금 반영)',
        ]
      )
      const newSkuId = inserted.rows[0].id

      const copied = await client.query(
        `INSERT INTO sku_recipes (organization_id, sku_id, ingredient_id, quantity, unit, notes, created_by)
         SELECT organization_id, $1, ingredient_id, quantity, unit, notes, 'system'
         FROM sku_recipes
         WHERE sku_id = $2 AND deleted_at IS NULL
         RETURNING id`,
        [newSkuId, b.id]
      )
      console.log(`${def.name} (${def.price.toLocaleString()}원) 등록, 레시피 ${copied.rows.length}줄 복사`)
    }

    // 검증: 신규 SKU와 레시피 수 확인
    const check = await client.query(
      `SELECT sk.sku_name, sk.unit_price,
              (SELECT COUNT(*) FROM sku_recipes r
               WHERE r.sku_id = sk.id AND r.deleted_at IS NULL) AS recipe_count
       FROM skus sk
       WHERE sk.sku_name LIKE '%뿌링클%' AND sk.deleted_at IS NULL
       ORDER BY sk.sku_name`
    )
    console.log('검증:')
    console.table(check.rows)

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
