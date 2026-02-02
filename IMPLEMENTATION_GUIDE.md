# 구현 가이드 (Implementation Guide)

이 문서는 프로젝트 스켈레톤이 생성된 후 개발자가 비즈니스 로직을 구현하는 방법을 안내합니다.

## 목차

1. [프로젝트 개요](#프로젝트-개요)
2. [개발 환경 설정](#개발-환경-설정)
3. [데이터베이스 설정](#데이터베이스-설정)
4. [개발 워크플로우](#개발-워크플로우)
5. [비즈니스 로직 구현 가이드](#비즈니스-로직-구현-가이드)
6. [인증 구현](#인증-구현)
7. [배포](#배포)

---

## 프로젝트 개요

### 기술 스택

- **Frontend**: Next.js 15 (App Router), React 19, Tailwind CSS, Framer Motion
- **Backend**: Next.js Server Actions (서버리스)
- **Database**: Vercel Postgres (PostgreSQL)
- **ORM**: Drizzle ORM
- **Validation**: Zod
- **Forms**: React Hook Form
- **Deployment**: Vercel

### 프로젝트 구조

```
매입_판매_원가/
├── app/                        # Next.js App Router
│   ├── (auth)/                 # 인증 관련 페이지
│   │   └── login/
│   ├── (dashboard)/            # 대시보드 페이지
│   │   ├── purchases/          # 매입 관리
│   │   ├── sales/              # 판매 관리
│   │   ├── analysis/           # 기간 분석
│   │   └── master-data/        # 기초 데이터 관리
│   ├── layout.tsx              # 루트 레이아웃
│   ├── page.tsx                # 홈 페이지
│   └── globals.css             # 전역 스타일
├── components/
│   └── ui/                     # 재사용 가능한 UI 컴포넌트
├── lib/
│   ├── db/                     # 데이터베이스 설정 및 스키마
│   │   ├── index.ts            # DB 클라이언트
│   │   └── schema.ts           # Drizzle 스키마 정의
│   └── utils/                  # 유틸리티 함수
│       ├── cn.ts               # className 유틸리티
│       ├── format.ts           # 날짜/통화 포맷팅
│       └── validation.ts       # Zod 스키마
├── middleware.ts               # Next.js 미들웨어 (인증)
├── drizzle.config.ts           # Drizzle 설정
└── package.json
```

---

## 개발 환경 설정

### 1. 의존성 설치

```bash
npm install
```

### 2. 환경 변수 설정

`.env.example`을 복사하여 `.env` 파일을 생성하고 필요한 값을 입력합니다:

```bash
cp .env.example .env
```

`.env` 파일 예시:

```env
# Vercel Postgres (Vercel 대시보드에서 생성 후 자동으로 제공됨)
POSTGRES_URL="postgres://..."
POSTGRES_PRISMA_URL="postgres://..."
POSTGRES_URL_NO_SSL="postgres://..."
POSTGRES_URL_NON_POOLING="postgres://..."
POSTGRES_USER="..."
POSTGRES_HOST="..."
POSTGRES_PASSWORD="..."
POSTGRES_DATABASE="..."

# 세션 암호화 키 (임의의 강력한 문자열)
SESSION_SECRET="your-secret-key-here-change-in-production"
```

### 3. 개발 서버 실행

```bash
npm run dev
```

브라우저에서 [http://localhost:3000](http://localhost:3000)에 접속합니다.

---

## 데이터베이스 설정

### 1. Vercel Postgres 생성

#### Vercel 대시보드에서 설정

1. [Vercel 대시보드](https://vercel.com/dashboard)에 로그인
2. 프로젝트 선택 또는 새 프로젝트 생성
3. "Storage" 탭으로 이동
4. "Create Database" 클릭
5. "Postgres" 선택
6. 데이터베이스 이름 입력 (예: `nasungdak-db`)
7. 리전 선택 (한국 사용자의 경우 Singapore 권장)
8. "Create" 클릭

#### 환경 변수 자동 설정

Vercel은 자동으로 프로젝트에 환경 변수를 주입합니다. 로컬 개발을 위해서는:

```bash
# Vercel CLI 설치 (없는 경우)
npm i -g vercel

# 프로젝트 연결
vercel link

# 환경 변수 다운로드
vercel env pull .env
```

### 2. 데이터베이스 마이그레이션

스키마는 이미 `lib/db/schema.ts`에 정의되어 있습니다.

```bash
# 마이그레이션 파일 생성
npm run db:generate

# 마이그레이션 실행
npm run db:migrate
```

### 3. 시드 데이터 추가 (선택사항)

초기 테스트 데이터를 추가하려면:

```bash
npm run db:seed
```

**참고**: `scripts/seed.ts` 파일을 먼저 구현해야 합니다 (아래 예시 참조).

#### `scripts/seed.ts` 예시

```typescript
import { db } from '@/lib/db'
import { menuCategories, ingredients, skus } from '@/lib/db/schema'

async function seed() {
  console.log('Seeding database...')

  // 메뉴 카테고리 추가
  const [menu] = await db
    .insert(menuCategories)
    .values({
      menuName: '닭강정',
      description: '대표 메뉴',
      isActive: true,
      createdBy: 'system',
    })
    .returning()

  console.log('Created menu:', menu)

  // 재료 추가
  const [ingredient] = await db
    .insert(ingredients)
    .values({
      ingredientName: '닭고기',
      unit: 'kg',
      description: '신선한 닭고기',
      isActive: true,
      createdBy: 'system',
    })
    .returning()

  console.log('Created ingredient:', ingredient)

  // SKU 추가
  const [sku] = await db
    .insert(skus)
    .values({
      skuName: '닭강정 (중)',
      menuId: menu.id,
      unitPrice: 15000,
      description: '중간 사이즈',
      isActive: true,
      createdBy: 'system',
    })
    .returning()

  console.log('Created SKU:', sku)

  console.log('Seeding completed!')
}

seed()
  .catch((error) => {
    console.error('Seeding failed:', error)
    process.exit(1)
  })
  .finally(() => {
    process.exit(0)
  })
```

---

## 개발 워크플로우

### 1. 기능 개발 순서 (권장)

프로젝트 스펙에 정의된 우선순위에 따라 개발합니다:

#### Phase 1: 기초 데이터 관리 (US4 - P1)

1. **메뉴 카테고리 관리**
   - CRUD 구현: `app/(dashboard)/master-data/menus/`
   - Server Actions: 별도 `actions.ts` 파일 생성
   - 폼 검증: `lib/utils/validation.ts`에 스키마 추가

2. **재료 관리**
   - CRUD 구현: `app/(dashboard)/master-data/ingredients/`

3. **SKU 관리**
   - CRUD 구현: `app/(dashboard)/master-data/skus/`

4. **메뉴-재료 매핑**
   - CRUD 구현: `app/(dashboard)/master-data/menu-ingredients/`

5. **원가 배분 규칙**
   - CRUD 구현: `app/(dashboard)/master-data/cost-rules/`
   - 검증: 같은 메뉴+기간의 합계가 100%인지 확인

#### Phase 2: 매입 관리 (US1 - P1)

1. **매입 등록**
   - 폼 구현: `app/(dashboard)/purchases/new/page.tsx`
   - Server Action 구현: `app/(dashboard)/purchases/actions.ts`의 `createPurchase`
   - 자동 검증 로직 추가

2. **매입 목록 조회**
   - 목록 페이지: `app/(dashboard)/purchases/page.tsx`
   - 페이지네이션 및 필터 추가
   - 검증 상태 토글 기능

#### Phase 3: 판매 관리 (US2 - P1)

1. **일일 판매 입력**
   - 폼 구현: `app/(dashboard)/sales/daily/page.tsx`
   - Server Action: `app/(dashboard)/sales/actions.ts`의 `createDailySales`
   - 동적 SKU 입력 필드 구현

2. **판매 목록 조회**
   - 목록 페이지: `app/(dashboard)/sales/page.tsx`

#### Phase 4: 분석 기능 (US3 - P2)

1. **기간별 분석**
   - 분석 페이지: `app/(dashboard)/analysis/page.tsx`
   - 복잡한 쿼리 구현 (원가 계산 로직)
   - 차트 라이브러리 추가 (Recharts 등)

### 2. Git 워크플로우

```bash
# 기능 브랜치 생성
git checkout -b feature/menu-management

# 변경사항 커밋
git add .
git commit -m "feat: implement menu CRUD operations"

# 메인 브랜치에 병합
git checkout main
git merge feature/menu-management
```

---

## 비즈니스 로직 구현 가이드

### Server Actions 구현 예시

#### 1. 매입 등록 (`createPurchase`)

**파일**: `app/(dashboard)/purchases/actions.ts`

```typescript
'use server'

import { revalidatePath } from 'next/cache'
import { purchaseSchema } from '@/lib/utils/validation'
import { db } from '@/lib/db'
import {
  purchaseTransactions,
  menuCategories,
  ingredients,
} from '@/lib/db/schema'
import { eq, and } from 'drizzle-orm'

export async function createPurchase(formData: FormData) {
  try {
    // 1. 데이터 추출 및 검증
    const rawData = {
      transactionDate: formData.get('transactionDate'),
      menuId: formData.get('menuId'),
      ingredientId: formData.get('ingredientId'),
      supplierName: formData.get('supplierName'),
      quantity: formData.get('quantity'),
      unitPrice: formData.get('unitPrice'),
      notes: formData.get('notes') || '',
    }

    const validatedData = purchaseSchema.parse(rawData)

    // 2. 자동 검증: 메뉴와 재료가 연결되어 있는지 확인
    const menuIngredient = await db.query.menuIngredients.findFirst({
      where: and(
        eq(menuIngredients.menuId, validatedData.menuId),
        eq(menuIngredients.ingredientId, validatedData.ingredientId),
        eq(menuIngredients.deletedAt, null)
      ),
    })

    const isValid = !!menuIngredient

    // 3. 데이터베이스에 삽입
    const [transaction] = await db
      .insert(purchaseTransactions)
      .values({
        ...validatedData,
        isValid,
        createdBy: 'system', // TODO: 세션에서 사용자 ID 가져오기
      })
      .returning()

    // 4. 캐시 재검증
    revalidatePath('/dashboard/purchases')

    return {
      success: true,
      data: {
        id: transaction.id,
        totalAmount: Number(transaction.totalAmount),
        isValid: transaction.isValid,
      },
    }
  } catch (error) {
    console.error('Failed to create purchase:', error)

    if (error instanceof z.ZodError) {
      return {
        success: false,
        error: error.errors[0].message,
      }
    }

    return {
      success: false,
      error: '매입 등록에 실패했습니다',
    }
  }
}
```

#### 2. 페이지네이션된 목록 조회

**파일**: `app/(dashboard)/purchases/page.tsx`

```typescript
import { db } from '@/lib/db'
import { purchaseTransactions, menuCategories, ingredients } from '@/lib/db/schema'
import { eq, desc, and, isNull } from 'drizzle-orm'
import { formatCurrency, formatDate } from '@/lib/utils/format'

export default async function PurchasesPage({
  searchParams,
}: {
  searchParams: { page?: string }
}) {
  const page = Number(searchParams.page) || 1
  const limit = 20
  const offset = (page - 1) * limit

  // 매입 목록 조회 (JOIN 포함)
  const purchases = await db
    .select({
      id: purchaseTransactions.id,
      transactionDate: purchaseTransactions.transactionDate,
      menuName: menuCategories.menuName,
      ingredientName: ingredients.ingredientName,
      supplierName: purchaseTransactions.supplierName,
      quantity: purchaseTransactions.quantity,
      unitPrice: purchaseTransactions.unitPrice,
      totalAmount: purchaseTransactions.totalAmount,
      isValid: purchaseTransactions.isValid,
    })
    .from(purchaseTransactions)
    .leftJoin(menuCategories, eq(purchaseTransactions.menuId, menuCategories.id))
    .leftJoin(ingredients, eq(purchaseTransactions.ingredientId, ingredients.id))
    .where(isNull(purchaseTransactions.deletedAt))
    .orderBy(desc(purchaseTransactions.transactionDate))
    .limit(limit)
    .offset(offset)

  return (
    <div>
      {/* 헤더 생략 */}
      <table className="min-w-full divide-y divide-gray-300">
        <thead>{/* 테이블 헤더 생략 */}</thead>
        <tbody className="divide-y divide-gray-200">
          {purchases.map((purchase) => (
            <tr key={purchase.id}>
              <td className="whitespace-nowrap py-4 pl-4 pr-3 text-sm font-medium text-gray-900">
                {formatDate(purchase.transactionDate, 'yyyy-MM-dd')}
              </td>
              <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">
                {purchase.menuName}
              </td>
              <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">
                {purchase.ingredientName}
              </td>
              <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">
                {purchase.supplierName}
              </td>
              <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500 text-right">
                {Number(purchase.quantity).toFixed(2)}
              </td>
              <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500 text-right">
                {formatCurrency(Number(purchase.unitPrice))}
              </td>
              <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500 text-right">
                {formatCurrency(Number(purchase.totalAmount))}
              </td>
              <td className="whitespace-nowrap px-3 py-4 text-sm text-center">
                <span
                  className={`inline-flex rounded-full px-2 text-xs font-semibold leading-5 ${
                    purchase.isValid
                      ? 'bg-green-100 text-green-800'
                      : 'bg-red-100 text-red-800'
                  }`}
                >
                  {purchase.isValid ? '유효' : '무효'}
                </span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
```

#### 3. 복잡한 쿼리: 마진 분석

**파일**: `app/(dashboard)/analysis/page.tsx` (Server Component)

```typescript
import { db } from '@/lib/db'
import { sql } from 'drizzle-orm'

export default async function AnalysisPage({
  searchParams,
}: {
  searchParams: { startDate?: string; endDate?: string }
}) {
  const startDate = searchParams.startDate || '2024-01-01'
  const endDate = searchParams.endDate || '2024-12-31'

  // SKU별 마진 분석 쿼리 (복잡한 집계)
  const marginAnalysis = await db.execute(sql`
    WITH sales_summary AS (
      SELECT
        sku_id,
        SUM(quantity_sold) AS total_quantity,
        SUM(quantity_sold * unit_price) AS total_revenue
      FROM sales_records sr
      JOIN skus s ON sr.sku_id = s.id
      WHERE sr.sale_date BETWEEN ${startDate} AND ${endDate}
        AND sr.deleted_at IS NULL
      GROUP BY sku_id
    ),
    cost_summary AS (
      SELECT
        s.id AS sku_id,
        SUM(
          pt.total_amount * cdr.distribution_percent / 100
        ) AS total_cost
      FROM skus s
      JOIN menu_categories mc ON s.menu_id = mc.id
      JOIN cost_distribution_rules cdr ON mc.id = cdr.menu_id
      JOIN purchase_transactions pt ON cdr.ingredient_id = pt.ingredient_id
      WHERE pt.transaction_date BETWEEN ${startDate} AND ${endDate}
        AND pt.deleted_at IS NULL
        AND pt.is_valid = true
        AND ${startDate} BETWEEN cdr.effective_from AND COALESCE(cdr.effective_to, '9999-12-31')
      GROUP BY s.id
    )
    SELECT
      s.sku_name,
      COALESCE(ss.total_quantity, 0) AS quantity_sold,
      COALESCE(ss.total_revenue, 0) AS revenue,
      COALESCE(cs.total_cost, 0) AS cost,
      COALESCE(ss.total_revenue, 0) - COALESCE(cs.total_cost, 0) AS profit,
      CASE
        WHEN COALESCE(ss.total_revenue, 0) > 0
        THEN ((COALESCE(ss.total_revenue, 0) - COALESCE(cs.total_cost, 0)) / ss.total_revenue * 100)
        ELSE 0
      END AS margin_percent
    FROM skus s
    LEFT JOIN sales_summary ss ON s.id = ss.sku_id
    LEFT JOIN cost_summary cs ON s.id = cs.sku_id
    WHERE s.deleted_at IS NULL
    ORDER BY revenue DESC
  `)

  return (
    <div>
      {/* 날짜 필터 폼 */}
      {/* 요약 카드 */}
      {/* 분석 테이블 */}
      <table>
        {/* marginAnalysis.rows를 매핑하여 렌더링 */}
      </table>
    </div>
  )
}
```

### React Hook Form 통합

**파일**: `app/(dashboard)/purchases/new/page.tsx` (Client Component)

```typescript
'use client'

import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { purchaseSchema } from '@/lib/utils/validation'
import { createPurchase } from './actions'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select } from '@/components/ui/select'
import { useRouter } from 'next/navigation'
import { useState } from 'react'

export default function NewPurchasePage() {
  const router = useRouter()
  const [menus, setMenus] = useState([]) // TODO: Load from server
  const [ingredients, setIngredients] = useState([]) // TODO: Load from server

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm({
    resolver: zodResolver(purchaseSchema),
  })

  const onSubmit = async (data: any) => {
    const formData = new FormData()
    Object.entries(data).forEach(([key, value]) => {
      formData.append(key, String(value))
    })

    const result = await createPurchase(formData)

    if (result.success) {
      router.push('/dashboard/purchases')
    } else {
      alert(result.error)
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)}>
      <div className="grid grid-cols-1 gap-6">
        <div>
          <label htmlFor="transactionDate">거래 날짜 *</label>
          <Input
            type="date"
            id="transactionDate"
            {...register('transactionDate')}
            error={errors.transactionDate?.message}
          />
        </div>

        <div>
          <label htmlFor="menuId">메뉴 *</label>
          <Select id="menuId" {...register('menuId')} error={errors.menuId?.message}>
            <option value="">선택하세요</option>
            {menus.map((menu) => (
              <option key={menu.id} value={menu.id}>
                {menu.menuName}
              </option>
            ))}
          </Select>
        </div>

        {/* 나머지 필드 생략 */}

        <div className="flex justify-end gap-4">
          <Button type="button" variant="secondary" onClick={() => router.back()}>
            취소
          </Button>
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting ? '저장 중...' : '저장'}
          </Button>
        </div>
      </div>
    </form>
  )
}
```

---

## 인증 구현

현재 `middleware.ts`는 모든 요청을 허용합니다. 실제 인증을 구현하려면:

### 옵션 1: NextAuth.js 사용

```bash
npm install next-auth
```

**파일**: `app/api/auth/[...nextauth]/route.ts`

```typescript
import NextAuth from 'next-auth'
import CredentialsProvider from 'next-auth/providers/credentials'

const handler = NextAuth({
  providers: [
    CredentialsProvider({
      name: 'Credentials',
      credentials: {
        username: { label: 'Username', type: 'text' },
        password: { label: 'Password', type: 'password' },
      },
      async authorize(credentials) {
        // TODO: 데이터베이스에서 사용자 확인
        if (
          credentials?.username === 'admin' &&
          credentials?.password === 'password'
        ) {
          return { id: '1', name: 'Admin', email: 'admin@example.com' }
        }
        return null
      },
    }),
  ],
  pages: {
    signIn: '/login',
  },
  session: {
    strategy: 'jwt',
  },
})

export { handler as GET, handler as POST }
```

**미들웨어 업데이트**: `middleware.ts`

```typescript
export { default } from 'next-auth/middleware'

export const config = {
  matcher: ['/dashboard/:path*'],
}
```

### 옵션 2: 커스텀 세션 관리

쿠키 기반 세션을 직접 구현하려면 `jose` 라이브러리를 사용합니다.

---

## 배포

### Vercel 배포

1. **GitHub 저장소와 연결**

```bash
git init
git add .
git commit -m "Initial commit"
git remote add origin <your-repo-url>
git push -u origin main
```

2. **Vercel에서 프로젝트 생성**
   - [Vercel 대시보드](https://vercel.com/dashboard)에서 "New Project" 클릭
   - GitHub 저장소 선택
   - 환경 변수는 자동으로 설정됨 (Vercel Postgres 연결 시)
   - "Deploy" 클릭

3. **마이그레이션 실행**

배포 후 Vercel CLI로 프로덕션 데이터베이스에 마이그레이션 실행:

```bash
vercel env pull .env.production
npm run db:migrate
```

---

## 추가 리소스

### 문서

- [Next.js 공식 문서](https://nextjs.org/docs)
- [Drizzle ORM 문서](https://orm.drizzle.team/docs/overview)
- [Vercel Postgres 가이드](https://vercel.com/docs/storage/vercel-postgres)
- [Tailwind CSS 문서](https://tailwindcss.com/docs)
- [React Hook Form 문서](https://react-hook-form.com/)
- [Zod 문서](https://zod.dev/)

### 프로젝트 문서

- **기능 명세**: `specs/1-purchase-sales-management/spec.md`
- **데이터 모델**: `specs/1-purchase-sales-management/data-model.md`
- **API 스펙**: `specs/1-purchase-sales-management/contracts/api-spec.md`
- **구현 계획**: `specs/1-purchase-sales-management/plan.md`
- **작업 목록**: `specs/1-purchase-sales-management/tasks.md`

---

## 문제 해결

### 자주 발생하는 오류

1. **Database connection error**
   - `.env` 파일의 `POSTGRES_URL` 확인
   - Vercel Postgres가 생성되었는지 확인

2. **Migration fails**
   - `drizzle.config.ts`의 데이터베이스 URL 확인
   - 데이터베이스에 연결 권한이 있는지 확인

3. **Type errors in schema**
   - `npm run db:generate` 실행하여 타입 재생성
   - TypeScript 서버 재시작

---

## 다음 단계

1. **개발 환경 설정 완료** (위 가이드 참조)
2. **기초 데이터 관리 구현** (US4 - P1)
   - 메뉴, 재료, SKU CRUD
3. **매입 관리 구현** (US1 - P1)
4. **판매 관리 구현** (US2 - P1)
5. **분석 기능 구현** (US3 - P2)
6. **테스트 작성**
7. **배포 및 모니터링**

상세한 작업 목록은 `specs/1-purchase-sales-management/tasks.md`를 참조하세요.
