/**
 * 일회성 관리자 계정 생성 API
 * 
 * 호출: GET /api/setup/seed-admin?secret=YOUR_SETUP_SECRET
 * 
 * 환경변수:
 * - SETUP_SECRET: API 접근용 시크릿 키
 * - ADMIN_EMAIL: 관리자 이메일 (기본값: admin@nasungdak.com)
 * - ADMIN_PASSWORD: 관리자 비밀번호 (기본값: admin123!)
 */

import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { users, organizations, organizationMembers, stores, userStoreAssignments, roles } from '@/lib/db/schema'
import { eq } from 'drizzle-orm'
import bcrypt from 'bcryptjs'

export async function GET(request: NextRequest) {
  // 시크릿 키 검증
  const secret = request.nextUrl.searchParams.get('secret')
  const setupSecret = process.env.SETUP_SECRET
  
  if (!setupSecret) {
    return NextResponse.json(
      { error: 'SETUP_SECRET 환경변수가 설정되지 않았습니다' },
      { status: 500 }
    )
  }
  
  if (secret !== setupSecret) {
    return NextResponse.json(
      { error: '잘못된 시크릿 키입니다' },
      { status: 401 }
    )
  }

  const email = process.env.ADMIN_EMAIL || 'admin@nasungdak.com'
  const password = process.env.ADMIN_PASSWORD || 'admin123!'
  const name = process.env.ADMIN_NAME || '관리자'

  try {
    // 1. 이미 존재하는지 확인
    const existingUser = await db.query.users.findFirst({
      where: eq(users.email, email.toLowerCase()),
    })

    if (existingUser) {
      return NextResponse.json({
        success: false,
        message: '이미 해당 이메일로 등록된 계정이 있습니다',
        userId: existingUser.id,
      })
    }

    // 2. 비밀번호 해시
    const passwordHash = await bcrypt.hash(password, 12)

    // 3. 기본 조직 생성 (없으면)
    let org = await db.query.organizations.findFirst({
      where: eq(organizations.slug, 'nasungdak-default'),
    })

    if (!org) {
      const [newOrg] = await db.insert(organizations).values({
        name: '나성닭강정',
        slug: 'nasungdak-default',
        plan: 'premium',
        maxStores: 10,
        maxUsers: 50,
      }).returning()
      org = newOrg
    }

    // 4. 관리자 역할 가져오기 또는 생성
    let adminRole = await db.query.roles.findFirst({
      where: eq(roles.roleName, 'admin'),
    })

    if (!adminRole) {
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
    }

    // 5. 사용자 생성
    const [user] = await db.insert(users).values({
      email: email.toLowerCase(),
      name,
      passwordHash,
      isActive: true,
    }).returning()

    // 6. 조직 멤버십 생성 (owner 권한)
    await db.insert(organizationMembers).values({
      organizationId: org.id,
      userId: user.id,
      role: 'owner',
      joinedAt: new Date(),
    })

    // 7. 기존 매장들에 대한 접근 권한 부여
    const existingStores = await db.select().from(stores)
    
    for (const store of existingStores) {
      // 매장에 organizationId 설정 (없으면)
      if (!store.organizationId) {
        await db.update(stores)
          .set({ organizationId: org.id })
          .where(eq(stores.id, store.id))
      }

      // 사용자-매장 할당
      await db.insert(userStoreAssignments).values({
        userId: user.id,
        storeId: store.id,
        roleId: adminRole.id,
      })
    }

    return NextResponse.json({
      success: true,
      message: '관리자 계정 생성 완료',
      data: {
        userId: user.id,
        email: email,
        organizationId: org.id,
        storesAssigned: existingStores.length,
      },
    })

  } catch (error) {
    console.error('Seed admin error:', error)
    return NextResponse.json(
      { error: '관리자 계정 생성 중 오류가 발생했습니다', details: String(error) },
      { status: 500 }
    )
  }
}
