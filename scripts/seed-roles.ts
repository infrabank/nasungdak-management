import { db } from '../lib/db'
import { roles, users, stores, userStoreAssignments } from '../lib/db/schema'
import bcrypt from 'bcryptjs'
import { eq } from 'drizzle-orm'

/**
 * SaaS 전환을 위한 기본 역할 및 테스트 사용자 시드
 */
async function seedRolesAndUsers() {
  console.log('🔐 역할 및 사용자 시드 시작...')

  try {
    // 1. 기본 역할 생성
    console.log('👥 기본 역할 생성 중...')
    
    const roleDefinitions = [
      {
        roleName: 'super_admin',
        description: '시스템 전체 관리자 - 모든 매장, 모든 기능 접근',
        permissions: {
          stores: ['read', 'write', 'delete'],
          users: ['read', 'write', 'delete'],
          purchases: ['read', 'write', 'delete'],
          sales: ['read', 'write', 'delete'],
          inventory: ['read', 'write', 'delete'],
          employees: ['read', 'write', 'delete'],
          attendance: ['read', 'write', 'delete'],
          'fixed-costs': ['read', 'write', 'delete'],
          'oil-changes': ['read', 'write', 'delete'],
          'master-data': ['read', 'write', 'delete'],
          analysis: ['read'],
          settings: ['read', 'write'],
        },
        isSystem: true,
      },
      {
        roleName: 'store_owner',
        description: '매장 오너 - 소속 매장의 모든 기능 접근',
        permissions: {
          purchases: ['read', 'write', 'delete'],
          sales: ['read', 'write', 'delete'],
          inventory: ['read', 'write', 'delete'],
          employees: ['read', 'write', 'delete'],
          attendance: ['read', 'write', 'delete'],
          'fixed-costs': ['read', 'write', 'delete'],
          'oil-changes': ['read', 'write', 'delete'],
          'master-data': ['read', 'write'],
          analysis: ['read'],
          settings: ['read', 'write'],
        },
        isSystem: true,
      },
      {
        roleName: 'manager',
        description: '매장 매니저 - 일상 운영 관리',
        permissions: {
          purchases: ['read', 'write'],
          sales: ['read', 'write'],
          inventory: ['read', 'write'],
          employees: ['read'],
          attendance: ['read', 'write'],
          'fixed-costs': ['read'],
          'oil-changes': ['read', 'write'],
          'master-data': ['read'],
          analysis: ['read'],
        },
        isSystem: true,
      },
      {
        roleName: 'staff',
        description: '매장 직원 - 기본 입력 기능만',
        permissions: {
          purchases: ['read', 'write'],
          sales: ['read', 'write'],
          inventory: ['read'],
          attendance: ['read'],
          'master-data': ['read'],
        },
        isSystem: true,
      },
      {
        roleName: 'viewer',
        description: '뷰어 - 읽기 전용',
        permissions: {
          purchases: ['read'],
          sales: ['read'],
          inventory: ['read'],
          employees: ['read'],
          attendance: ['read'],
          'fixed-costs': ['read'],
          'oil-changes': ['read'],
          'master-data': ['read'],
          analysis: ['read'],
        },
        isSystem: true,
      },
    ]

    const createdRoles = await db
      .insert(roles)
      .values(roleDefinitions)
      .onConflictDoNothing()
      .returning()

    console.log(`✅ 역할 ${createdRoles.length}개 생성 완료`)

    // 2. 기존 매장 조회
    const existingStores = await db.select().from(stores).limit(1)
    
    if (existingStores.length === 0) {
      console.log('⚠️ 매장이 없습니다. 테스트 매장을 먼저 생성하세요.')
      return
    }

    // 3. 테스트 사용자 생성 (개발/테스트용)
    console.log('👤 테스트 사용자 생성 중...')
    
    const testPassword = await bcrypt.hash('test1234', 12)
    
    const [testUser] = await db
      .insert(users)
      .values({
        email: 'admin@nasungdak.com',
        passwordHash: testPassword,
        name: '관리자',
        phone: '010-0000-0000',
        isActive: true,
      })
      .onConflictDoNothing()
      .returning()

    if (testUser) {
      console.log(`✅ 테스트 사용자 생성: ${testUser.email}`)

      // 4. 사용자-매장 할당
      const superAdminRole = await db.query.roles.findFirst({
        where: eq(roles.roleName, 'super_admin'),
      })

      if (superAdminRole && existingStores[0]) {
        await db
          .insert(userStoreAssignments)
          .values({
            userId: testUser.id,
            storeId: existingStores[0].id,
            roleId: superAdminRole.id,
          })
          .onConflictDoNothing()

        console.log(`✅ 사용자 매장 할당 완료: ${testUser.email} → ${existingStores[0].storeName}`)
      }
    } else {
      console.log('ℹ️ 테스트 사용자가 이미 존재합니다.')
    }

    console.log('')
    console.log('🎉 역할 및 사용자 시드 완료!')
    console.log('')
    console.log('테스트 로그인 정보:')
    console.log('  이메일: admin@nasungdak.com')
    console.log('  비밀번호: test1234')
    console.log('')

  } catch (error) {
    console.error('❌ 시드 실패:', error)
    throw error
  }
}

seedRolesAndUsers()
  .then(() => process.exit(0))
  .catch(() => process.exit(1))
