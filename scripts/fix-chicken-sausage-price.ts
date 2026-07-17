/**
 * 일회성 정정 (사장님 확인):
 *  - 염지닭 2026-03-10 매입: 총 7,000원(오기) -> 140,000원 (4봉 x 35,000원, 당시 시세)
 *  - 비엔나소세지 개당 원가: 봉당 7,545원 기준 -> 58.04원/개 (7545/130)
 * 사용: npx tsx scripts/fix-chicken-sausage-price.ts
 */
import { config } from 'dotenv'
config({ path: '.env.local' })

async function main() {
  const { db } = await import('@vercel/postgres')
  const client = await db.connect()
  try {
    await client.sql`BEGIN`

    const chicken = await client.sql`
      UPDATE purchase_transactions p
      SET unit_price = 35000, updated_at = NOW(), updated_by = 'system'
      FROM ingredients i
      WHERE p.ingredient_id = i.id AND i.ingredient_name = '염지닭' AND i.deleted_at IS NULL
        AND p.deleted_at IS NULL AND p.unit_price::numeric = 1750
      RETURNING p.transaction_date, p.quantity, p.unit_price, p.total_amount
    `
    if (chicken.rows.length !== 1) throw new Error(`염지닭 대상 매입 ${chicken.rows.length}건 (1건이어야 함)`)
    console.log('염지닭 매입 정정:', chicken.rows[0])

    await client.sql`
      UPDATE ingredients
      SET unit_cost = '58.04', updated_at = NOW(), updated_by = 'system'
      WHERE ingredient_name = '비엔나소세지' AND deleted_at IS NULL
    `
    console.log('비엔나소세지 unit_cost -> 58.04 (7,545원/130개)')

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
