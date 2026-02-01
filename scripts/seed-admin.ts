/**
 * 초기 관리자 계정 생성 스크립트
 * 
 * 사용법: npx tsx scripts/seed-admin.ts
 * 
 * 환경변수:
 * - ADMIN_EMAIL: 관리자 이메일 (기본값: admin@nasungdak.com)
 * - ADMIN_PASSWORD: 관리자 비밀번호 (기본값: admin123!)
 * - ADMIN_NAME: 관리자 이름 (기본값: 관리자)
 */

import 'dotenv/config'
import { db } from '../lib/db'
import { users, organizations, organizationMembers, stores, userStoreAssignments, roles } from '../lib/db/schema'
import { eq } from 'drizzle-orm'
import bcrypt from 'bcryptjs'

async function seedAdmin() {
  const email = process.env.ADMIN_EMAIL || 'admin@nasungdak.com'
  const password = process.env.ADMIN_PASSWORD || 'admin123!'
  const name = process.env.ADMIN_NAME || '관리자'

  console.log('🔧 초기 관리자 계정 생성 시작...')
  console.log(`   이메일: ${email}`)

  try {
    // 1. 이미 존재하는지 확인
    const existingUser = await db.query.users.findFirst({
      where: eq(users.email, email.toLowerCase()),
    })

    if (existingUser) {
      console.log('⚠️  이미 해당 이메일로 등록된 계정이 있습니다.')
      console.log(`   User ID: ${existingUser.id}`)
      process.exit(0)
      return
    }

    // 2. 비밀번호 해시
    const passwordHash = await bcrypt.hash(password, 12)

    // 3. 기본 조직 생성 (없으면)
    let org = await db.query.organizations.findFirst({
      where: eq(organizations.slug, 'nasungdak-default'),
    })

    if (!org) {
      console.log('📦 기본 조직 생성 중...')
      const [newOrg] = await db.insert(organizations).values({
        name: '나성닭강정',
        slug: 'nasungdak-default',
        plan: 'premium',
        maxStores: 10,
        maxUsers: 50,
      }).returning()
      org = newOrg
      console.log(`   조직 ID: ${org.id}`)
    }

    // 4. 관리자 역할 가져오기 또는 생성
    let adminRole = await db.query.roles.findFirst({
      where: eq(roles.roleName, 'admin'),
    })

    if (!adminRole) {
      console.log('🔑 관리자 역할 생성 중...')
      const [newRole] = await db.insert(roles).values({
        roleName: 'admin',
        description: '시스템 관리자 - 모든 권한',
        permissions: {
          purchases: ['read', 'write', 'delete'],
          sales: ['read', 'write', 'delete'],
          stores: ['read', 'write', 'delete'],
          inventory: ['read', 'write', 'delete'],
          reports: ['read', 'write'],
          settings: ['read', 'write'],
          users: ['read', 'write', 'delete'],
        },
        isSystem: true,
      }).returning()
      adminRole = newRole
      console.log(`   Role ID: ${adminRole.id}`)
    }

    // 5. 사용자 생성
    console.log('👤 관리자 계정 생성 중...')
    const [user] = await db.insert(users).values({
      email: email.toLowerCase(),
      name,
      passwordHash,
      isActive: true,
    }).returning()
    console.log(`   User ID: ${user.id}`)

    // 6. 조직 멤버십 생성 (owner 권한)
    console.log('🔗 조직 멤버십 설정 중...')
    await db.insert(organizationMembers).values({
      organizationId: org.id,
      userId: user.id,
      role: 'owner',
      joinedAt: new Date(),
    })

    // 7. 기존 매장들에 대한 접근 권한 부여
    const existingStores = await db.select().from(stores)
    
    if (existingStores.length > 0) {
      console.log(`🏪 ${existingStores.length}개 매장에 대한 접근 권한 부여 중...`)
      
      for (const store of existingStores) {
        // 매장에 organizationId 설정 (없으면)
        if (!store.organizationId) {
          await db.update(stores)
            .set({ organizationId: org.id })
            .where(eq(stores.id, store.id))
        }

        // 사용자-매장 할당 (roleId 필수)
        await db.insert(userStoreAssignments).values({
          userId: user.id,
          storeId: store.id,
          roleId: adminRole.id,
        })
      }
    }

    console.log('')
    console.log('✅ 관리자 계정 생성 완료!')
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
    console.log(`   이메일: ${email}`)
    console.log(`   비밀번호: ${password}`)
    console.log(`   권한: owner (최고 관리자)`)
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
    console.log('')
    console.log('⚠️  보안을 위해 로그인 후 비밀번호를 변경하세요!')

  } catch (error) {
    console.error('❌ 오류 발생:', error)
    process.exit(1)
  }

  process.exit(0)
}

seedAdmin()
