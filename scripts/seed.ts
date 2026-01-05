import { db } from '../lib/db'
import { menuCategories, ingredients, skus, menuIngredients } from '../lib/db/schema'

async function seed() {
  console.log('🌱 데이터베이스 시드 시작...')

  try {
    // 1. 메뉴 카테고리 생성
    console.log('📋 메뉴 카테고리 생성 중...')
    const [menu1, menu2, menu3] = await db
      .insert(menuCategories)
      .values([
        {
          menuName: '닭강정',
          description: '대표 메뉴 - 달콤매콤한 닭강정',
          isActive: true,
          createdBy: 'system',
        },
        {
          menuName: '순살치킨',
          description: '뼈 없는 순살치킨',
          isActive: true,
          createdBy: 'system',
        },
        {
          menuName: '양념치킨',
          description: '매콤달콤 양념치킨',
          isActive: true,
          createdBy: 'system',
        },
      ])
      .returning()

    console.log(`✅ 메뉴 3개 생성 완료`)

    // 2. 재료 생성
    console.log('🥬 재료 생성 중...')
    const [chicken, flour, sauce, oil, garlic] = await db
      .insert(ingredients)
      .values([
        {
          ingredientName: '닭고기',
          unit: 'kg',
          description: '신선한 국내산 닭고기',
          isActive: true,
          createdBy: 'system',
        },
        {
          ingredientName: '튀김가루',
          unit: 'kg',
          description: '프리미엄 튀김가루',
          isActive: true,
          createdBy: 'system',
        },
        {
          ingredientName: '소스',
          unit: 'L',
          description: '특제 양념 소스',
          isActive: true,
          createdBy: 'system',
        },
        {
          ingredientName: '식용유',
          unit: 'L',
          description: '튀김용 식용유',
          isActive: true,
          createdBy: 'system',
        },
        {
          ingredientName: '마늘',
          unit: 'kg',
          description: '국내산 생마늘',
          isActive: true,
          createdBy: 'system',
        },
      ])
      .returning()

    console.log(`✅ 재료 5개 생성 완료`)

    // 3. SKU 생성
    console.log('📦 SKU 생성 중...')
    const skuData = await db
      .insert(skus)
      .values([
        {
          skuName: '닭강정 (소)',
          menuId: menu1.id,
          unitPrice: '12000',
          description: '1인분 (500g)',
          isActive: true,
          createdBy: 'system',
        },
        {
          skuName: '닭강정 (중)',
          menuId: menu1.id,
          unitPrice: '15000',
          description: '2인분 (800g)',
          isActive: true,
          createdBy: 'system',
        },
        {
          skuName: '닭강정 (대)',
          menuId: menu1.id,
          unitPrice: '18000',
          description: '3인분 (1.2kg)',
          isActive: true,
          createdBy: 'system',
        },
        {
          skuName: '순살치킨 (중)',
          menuId: menu2.id,
          unitPrice: '16000',
          description: '2인분',
          isActive: true,
          createdBy: 'system',
        },
        {
          skuName: '순살치킨 (대)',
          menuId: menu2.id,
          unitPrice: '20000',
          description: '3인분',
          isActive: true,
          createdBy: 'system',
        },
        {
          skuName: '양념치킨 (중)',
          menuId: menu3.id,
          unitPrice: '17000',
          description: '2인분',
          isActive: true,
          createdBy: 'system',
        },
      ])
      .returning()

    console.log(`✅ SKU 6개 생성 완료`)

    // 4. 메뉴-재료 매핑 생성
    console.log('🔗 메뉴-재료 매핑 생성 중...')
    await db.insert(menuIngredients).values([
      // 닭강정
      {
        menuId: menu1.id,
        ingredientId: chicken.id,
        requiredQuantity: '1.0',
        createdBy: 'system',
      },
      {
        menuId: menu1.id,
        ingredientId: flour.id,
        requiredQuantity: '0.2',
        createdBy: 'system',
      },
      {
        menuId: menu1.id,
        ingredientId: sauce.id,
        requiredQuantity: '0.15',
        createdBy: 'system',
      },
      {
        menuId: menu1.id,
        ingredientId: oil.id,
        requiredQuantity: '0.5',
        createdBy: 'system',
      },
      // 순살치킨
      {
        menuId: menu2.id,
        ingredientId: chicken.id,
        requiredQuantity: '1.0',
        createdBy: 'system',
      },
      {
        menuId: menu2.id,
        ingredientId: flour.id,
        requiredQuantity: '0.25',
        createdBy: 'system',
      },
      {
        menuId: menu2.id,
        ingredientId: oil.id,
        requiredQuantity: '0.5',
        createdBy: 'system',
      },
      // 양념치킨
      {
        menuId: menu3.id,
        ingredientId: chicken.id,
        requiredQuantity: '1.0',
        createdBy: 'system',
      },
      {
        menuId: menu3.id,
        ingredientId: flour.id,
        requiredQuantity: '0.2',
        createdBy: 'system',
      },
      {
        menuId: menu3.id,
        ingredientId: sauce.id,
        requiredQuantity: '0.2',
        createdBy: 'system',
        },
      {
        menuId: menu3.id,
        ingredientId: oil.id,
        requiredQuantity: '0.5',
        createdBy: 'system',
      },
      {
        menuId: menu3.id,
        ingredientId: garlic.id,
        requiredQuantity: '0.05',
        createdBy: 'system',
      },
    ])

    console.log(`✅ 메뉴-재료 매핑 12개 생성 완료`)

    console.log('\n✨ 시드 데이터 생성 완료!')
    console.log('\n📊 생성된 데이터:')
    console.log(`  - 메뉴 카테고리: 3개`)
    console.log(`  - 재료: 5개`)
    console.log(`  - SKU: 6개`)
    console.log(`  - 메뉴-재료 매핑: 12개`)
    console.log('\n🎉 이제 애플리케이션을 사용할 준비가 되었습니다!')
    console.log('   다음 단계:')
    console.log('   1. npm run dev - 개발 서버 시작')
    console.log('   2. http://localhost:3000 접속')
    console.log('   3. 대시보드에서 매입/판매 데이터 입력 시작')
  } catch (error) {
    console.error('❌ 시드 실패:', error)
    throw error
  }
}

seed()
  .then(() => {
    console.log('\n👋 시드 스크립트 종료')
    process.exit(0)
  })
  .catch((error) => {
    console.error('💥 치명적 오류:', error)
    process.exit(1)
  })
