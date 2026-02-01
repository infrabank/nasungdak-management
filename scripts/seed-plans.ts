/**
 * 플랜 기능 시드 스크립트
 *
 * planFeatures 테이블에 플랜별 기능 설정을 초기화합니다.
 *
 * 실행: npx tsx scripts/seed-plans.ts
 */

import { db } from '../lib/db'
import { planFeatures } from '../lib/db/schema'
import {
  PLANS,
  FEATURES,
  DEFAULT_PLAN_FEATURES,
  type PlanType,
  type FeatureKey,
} from '../lib/features'
import { eq, and } from 'drizzle-orm'

async function seedPlanFeatures() {
  console.log('🌱 Starting plan features seed...\n')

  const plans = Object.keys(PLANS) as PlanType[]
  const allFeatures = Object.keys(FEATURES) as FeatureKey[]

  let insertedCount = 0
  let skippedCount = 0

  for (const plan of plans) {
    const planConfig = DEFAULT_PLAN_FEATURES[plan]
    console.log(`📦 Processing plan: ${PLANS[plan].nameKo} (${plan})`)

    for (const featureKey of allFeatures) {
      const isEnabled = planConfig.features.includes(featureKey)
      const limit = planConfig.limits?.[featureKey] ?? null
      const featureInfo = FEATURES[featureKey]

      // 이미 존재하는지 확인
      const existing = await db.query.planFeatures.findFirst({
        where: and(
          eq(planFeatures.plan, plan),
          eq(planFeatures.featureKey, featureKey)
        ),
      })

      if (existing) {
        console.log(`  ⏭️  ${featureKey}: already exists (skipped)`)
        skippedCount++
        continue
      }

      // 새로 삽입
      await db.insert(planFeatures).values({
        plan,
        featureKey,
        enabled: isEnabled,
        limit,
        description: featureInfo.description,
      })

      const status = isEnabled ? '✅' : '❌'
      const limitText = limit !== null ? ` (limit: ${limit})` : ''
      console.log(`  ${status} ${featureKey}${limitText}`)
      insertedCount++
    }

    console.log()
  }

  console.log('✨ Plan features seed completed!')
  console.log(`   Inserted: ${insertedCount}`)
  console.log(`   Skipped: ${skippedCount}`)
  console.log(`   Total features per plan: ${allFeatures.length}`)
}

async function main() {
  try {
    await seedPlanFeatures()
    process.exit(0)
  } catch (error) {
    console.error('❌ Seed failed:', error)
    process.exit(1)
  }
}

main()
