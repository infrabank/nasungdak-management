/**
 * 일회성 관리자 계정 생성 API
 *
 * 호출: POST /api/setup/seed-admin
 * Headers: Authorization: Bearer YOUR_SETUP_SECRET
 * Body: { email, password, name } (모두 선택적)
 *
 * 환경변수:
 * - SETUP_SECRET: API 접근용 시크릿 키 (필수, 최소 32자)
 *
 * 보안:
 * - POST 메서드만 허용
 * - Authorization 헤더로 시크릿 전달 (URL 노출 방지)
 * - Rate limiting 적용 (15분당 3회)
 * - 하드코딩된 기본 비밀번호 제거
 */

import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import {
  users,
  organizations,
  organizationMembers,
  stores,
  userStoreAssignments,
  roles,
} from '@/lib/db/schema'
import { eq } from 'drizzle-orm'
import bcrypt from 'bcryptjs'
import { rateLimit, getClientIP } from '@/lib/rate-limit'

// Rate limit 설정: 15분당 3회
const RATE_LIMIT_CONFIG = {
  action: 'setup:seed-admin',
  maxRequests: 3,
  windowMs: 15 * 60 * 1000,
}

export async function POST(request: NextRequest) {
  // Rate limiting 체크
  const clientIP = getClientIP(request.headers)
  const rateLimitResult = rateLimit.check(clientIP, RATE_LIMIT_CONFIG.action)

  if (!rateLimitResult.success) {
    const retryAfter = Math.ceil((rateLimitResult.resetAt - Date.now()) / 1000)
    return NextResponse.json(
      {
        error: '요청이 너무 많습니다. 잠시 후 다시 시도해주세요.',
        retryAfter,
      },
      {
        status: 429,
        headers: { 'Retry-After': String(retryAfter) },
      }
    )
  }

  // Authorization 헤더에서 시크릿 추출
  const authHeader = request.headers.get('Authorization')
  const secret = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : null

  const setupSecret = process.env.SETUP_SECRET

  if (!setupSecret) {
    return NextResponse.json(
      { error: 'SETUP_SECRET 환경변수가 설정되지 않았습니다' },
      { status: 500 }
    )
  }

  // 시크릿 최소 길이 검증
  if (setupSecret.length < 32) {
    console.error('SETUP_SECRET must be at least 32 characters')
    return NextResponse.json({ error: '서버 설정 오류' }, { status: 500 })
  }

  if (!secret || secret !== setupSecret) {
    // 타이밍 공격 방지를 위한 일정 시간 대기
    await new Promise((resolve) => setTimeout(resolve, 100))
    return NextResponse.json({ error: '인증 실패' }, { status: 401 })
  }

  // Body에서 자격 증명 추출 (하드코딩된 기본값 제거)
  let body: { email?: string; password?: string; name?: string } = {}
  try {
    body = await request.json()
  } catch {
    // Body가 없으면 빈 객체 사용
  }

  const email = body.email
  const password = body.password
  const name = body.name || '관리자'

  // 필수 필드 검증
  if (!email || !password) {
    return NextResponse.json(
      { error: 'email과 password는 필수입니다' },
      { status: 400 }
    )
  }

  // 이메일 형식 검증
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  if (!emailRegex.test(email)) {
    return NextResponse.json(
      { error: '올바른 이메일 형식이 아닙니다' },
      { status: 400 }
    )
  }

  // 비밀번호 강도 검증
  if (password.length < 8) {
    return NextResponse.json(
      { error: '비밀번호는 최소 8자 이상이어야 합니다' },
      { status: 400 }
    )
  }

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
      const [newOrg] = await db
        .insert(organizations)
        .values({
          name: '나성닭강정',
          slug: 'nasungdak-default',
          plan: 'premium',
          maxStores: 10,
          maxUsers: 50,
        })
        .returning()
      org = newOrg
    }

    // 4. 관리자 역할 가져오기 또는 생성
    let adminRole = await db.query.roles.findFirst({
      where: eq(roles.roleName, 'admin'),
    })

    if (!adminRole) {
      const [newRole] = await db
        .insert(roles)
        .values({
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
        })
        .returning()
      adminRole = newRole
    }

    // 5. 사용자 생성
    const [user] = await db
      .insert(users)
      .values({
        email: email.toLowerCase(),
        name,
        passwordHash,
        isActive: true,
      })
      .returning()

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
        await db
          .update(stores)
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
      { error: '관리자 계정 생성 중 오류가 발생했습니다' },
      { status: 500 }
    )
  }
}

// GET 메서드 명시적 거부
export async function GET() {
  return NextResponse.json(
    { error: 'Method not allowed. Use POST with Authorization header.' },
    { status: 405 }
  )
}
