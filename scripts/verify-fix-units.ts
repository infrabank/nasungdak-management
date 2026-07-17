/**
 * 단위 정정 9종 재검증 + 어긋난 값 복구 (캐시된 옛 값이 폼 저장으로 재기록된 케이스 대응)
 * 사용: npx tsx scripts/verify-fix-units.ts
 */
import { config } from 'dotenv'
config({ path: '.env.local' })

const EXPECTED = [
  { name: '쌀떡볶이', unit: '개', purchaseUnit: '포', factor: 42, unitCost: 202.38 },
  { name: '비엔나소세지', unit: '개', purchaseUnit: '봉', factor: 110, unitCost: 68.59 },
  { name: '떡볶이 소스', unit: 'g', purchaseUnit: '봉', factor: 3000, unitCost: 15.33 },
  { name: '염지닭', unit: 'g', purchaseUnit: '봉', factor: 5000, unitCost: 7.55 },
  { name: '왕짧짧', unit: '개', purchaseUnit: '봉', factor: 390, unitCost: 21.79 },
  { name: '밀떡볶이', unit: '소분봉', purchaseUnit: '봉', factor: 10, unitCost: 210 },
  { name: '소떡소떡', unit: '개', purchaseUnit: '봉', factor: 10, unitCost: 667.7 },
  { name: '상천어묵', unit: '봉', purchaseUnit: '포', factor: 50, unitCost: 103 },
  { name: '대왕김말이', unit: '개', purchaseUnit: '봉', factor: 10, unitCost: 665 },
]

async function main() {
  const { db } = await import('@vercel/postgres')
  const client = await db.connect()
  try {
    await client.sql`BEGIN`
    for (const e of EXPECTED) {
      const cur = await client.query(
        `SELECT id, unit, purchase_unit, conversion_factor, unit_cost, updated_at
         FROM ingredients WHERE ingredient_name = $1 AND deleted_at IS NULL`,
        [e.name]
      )
      if (cur.rows.length !== 1) throw new Error(`${e.name}: ${cur.rows.length}행`)
      const c = cur.rows[0]
      const drift =
        c.unit !== e.unit ||
        c.purchase_unit !== e.purchaseUnit ||
        Number(c.conversion_factor) !== e.factor ||
        Number(c.unit_cost) !== e.unitCost
      if (!drift) {
        console.log(`${e.name}: 정상`)
        continue
      }
      console.log(
        `${e.name}: 복구 필요 (현재 unit=${c.unit}, 구매=${c.purchase_unit}, 계수=${c.conversion_factor}, 단가=${c.unit_cost}, 마지막 수정=${c.updated_at?.toISOString?.() ?? c.updated_at})`
      )
      await client.query(
        `UPDATE ingredients
         SET unit = $1, purchase_unit = $2, conversion_factor = $3, unit_cost = $4,
             updated_at = NOW(), updated_by = 'system'
         WHERE id = $5`,
        [e.unit, e.purchaseUnit, String(e.factor), String(e.unitCost), c.id]
      )
      console.log(`  -> unit=${e.unit}, 구매=${e.purchaseUnit}, 계수=${e.factor}, 단가=${e.unitCost} 복구`)
    }
    await client.sql`COMMIT`
    console.log('COMMIT 완료')
  } catch (err) {
    await client.sql`ROLLBACK`
    console.error('ROLLBACK:', err)
    process.exit(1)
  } finally {
    client.release()
  }
}
main().then(() => process.exit(0))
