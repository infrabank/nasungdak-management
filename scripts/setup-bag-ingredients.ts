/**
 * 일회성 전환: 소스·파우더류를 봉 단위 관리(managementLevel='bag')로 전환.
 * - 기존 재료 5종: 등급만 bag으로 변경 (unit/unitCost/레시피는 원가 분석용으로 유지)
 * - 신규 재료 2종 생성 (몬스터 허니강정소스, 고추장양념소스(꼬치용))
 * - 본점 재고를 봉 수 기준으로 실사 설정 + inventory_events 감사 기록
 * 사용: npx tsx scripts/setup-bag-ingredients.ts
 */
import { config } from 'dotenv'
config({ path: '.env.local' })

const ORG_ID = '4d6dcbd0-9908-40c3-a0d1-1faa53f637ec' // 나성닭강정 본점 조직
const STORE_ID = '396886d9-49ab-4bc0-9abc-274b1ee19cfc' // 나성닭강정 본점

// [DB상 재료명, 목표 봉 수, 신규 생성 여부]
const TARGETS: Array<{ name: string; count: number; create?: boolean }> = [
  { name: '떡볶이 소스', count: 0 },
  { name: '몬스터 강정파우더', count: 1 },
  { name: '몬스터 골드강정소스(골드간장)', count: 2 },
  { name: '몬스터 허니강정소스', count: 0, create: true },
  { name: '비쉐프 만능강정소스(매콤달콤)', count: 5 },
  { name: '청우꼬치소스(순한맛)', count: 3 },
  { name: '고추장양념소스(꼬치용)', count: 2, create: true },
]

async function main() {
  const { sql } = await import('@vercel/postgres')
  const today = new Date().toISOString().slice(0, 10)

  for (const t of TARGETS) {
    // 1. 재료 조회 또는 생성
    let row = (
      await sql.query(
        `SELECT id, management_level FROM ingredients
         WHERE ingredient_name = $1 AND organization_id = $2 AND deleted_at IS NULL
         LIMIT 1`,
        [t.name, ORG_ID]
      )
    ).rows[0]

    if (!row && t.create) {
      row = (
        await sql.query(
          `INSERT INTO ingredients (ingredient_name, unit, management_level, organization_id, is_active, created_by)
           VALUES ($1, '봉', 'bag', $2, true, 'setup-bag-script')
           RETURNING id, management_level`,
          [t.name, ORG_ID]
        )
      ).rows[0]
      console.log(`+ 재료 생성: ${t.name}`)
    }
    if (!row) {
      console.error(`! 재료 없음(건너뜀): ${t.name}`)
      continue
    }

    // 2. 등급을 bag으로 전환
    if (row.management_level !== 'bag') {
      await sql.query(
        `UPDATE ingredients SET management_level = 'bag', updated_at = NOW(), updated_by = 'setup-bag-script'
         WHERE id = $1`,
        [row.id]
      )
      console.log(`~ 등급 전환(bag): ${t.name}`)
    }

    // 3. 재고 실사 설정 (봉 수) + 감사 이벤트
    const inv = (
      await sql.query(
        `SELECT id, current_quantity FROM inventory WHERE store_id = $1 AND ingredient_id = $2`,
        [STORE_ID, row.id]
      )
    ).rows[0]
    const current = inv ? Number(inv.current_quantity) : 0
    const delta = t.count - current

    if (inv) {
      await sql.query(
        `UPDATE inventory SET current_quantity = $1, unit = '봉', last_updated = NOW() WHERE id = $2`,
        [String(t.count), inv.id]
      )
    } else {
      await sql.query(
        `INSERT INTO inventory (store_id, ingredient_id, current_quantity, unit, last_updated)
         VALUES ($1, $2, $3, '봉', NOW())`,
        [STORE_ID, row.id, String(t.count)]
      )
    }
    // quantity_change != 0 체크 제약이 있으므로 변화 없으면 이벤트 생략
    if (delta !== 0) {
      await sql.query(
        `INSERT INTO inventory_events (store_id, ingredient_id, event_type, quantity_change, reason, event_date, created_by)
         VALUES ($1, $2, 'audit', $3, $4, $5, 'setup-bag-script')`,
        [
          STORE_ID,
          row.id,
          String(delta),
          `봉 단위 관리 전환 실사 (측정값 ${t.count}봉)`,
          today,
        ]
      )
    }
    console.log(`= 재고 설정: ${t.name} -> ${t.count}봉 (이전 ${current})`)
  }

  console.log('완료')
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
