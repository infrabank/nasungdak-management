# 사장북(sajangbook.com) SaaS 전환 종합 분석 보고서

> 분석일: 2026-01-31
> 분석 대상: Next.js 15 + Drizzle ORM 매장 관리 시스템

## Executive Summary

| 항목                 | 현재 상태          | SaaS 준비도 |
| -------------------- | ------------------ | ----------- |
| **전체 SaaS 준비도** | 개인용/단일 회사용 | **35/100**  |
| **데이터베이스**     | 부분적 멀티테넌시  | 6/10        |
| **인증/보안**        | 단일 비밀번호      | 3/10        |
| **API 격리**         | URL 파라미터 기반  | 4/10        |
| **배포/운영**        | 최소 구성          | 3/10        |

---

## 1. 현재 아키텍처 분석

### 1.1 기술 스택

- **Frontend**: Next.js 15 (App Router), React 19, Tailwind CSS
- **Backend**: Next.js Server Actions
- **Database**: Vercel Postgres + Drizzle ORM
- **Auth**: JWT (jose) + bcrypt
- **Validation**: Zod

### 1.2 데이터베이스 스키마 (17 테이블)

#### 테넌트 격리 상태

| 테이블                      | storeId           | 상태         |
| --------------------------- | ----------------- | ------------ |
| stores                      | N/A (테넌트 루트) | ✅           |
| purchase_transactions       | ✅ 있음           | ✅           |
| sales_records               | ✅ 있음           | ✅           |
| fixed_costs                 | ✅ 있음           | ✅           |
| oil_change_history          | ✅ 있음           | ✅           |
| employees                   | ✅ 있음           | ✅           |
| attendance_records          | ✅ 있음           | ✅           |
| inventory                   | ✅ 있음           | ✅           |
| inventory_events            | ✅ 있음           | ✅           |
| **suppliers**               | ❌ 없음           | 🔴 격리 실패 |
| **menu_categories**         | ❌ 없음           | 🔴 격리 실패 |
| **ingredients**             | ❌ 없음           | 🔴 격리 실패 |
| **skus**                    | ❌ 없음           | 🔴 격리 실패 |
| **menu_ingredients**        | ❌ 없음           | 🔴 격리 실패 |
| **cost_distribution_rules** | ❌ 없음           | 🔴 격리 실패 |
| inventory_alert_rules       | ⚠️ Nullable       | ⚠️ 부분      |
| alert_history               | ⚠️ Nullable       | ⚠️ 부분      |

### 1.3 인증 시스템

**현재 구현:**

```typescript
// 단일 비밀번호 인증
const passwordHash = process.env.AUTH_PASSWORD_HASH
const isValid = await bcrypt.compare(password, passwordHash)

// JWT 페이로드 (최소한의 정보)
const token = await new SignJWT({ authenticated: true })
  .setExpirationTime('7d')
  .sign(SESSION_SECRET)
```

**문제점:**

- 사용자 계정 없음 (users 테이블 없음)
- 역할(Role) 시스템 없음
- JWT에 사용자/매장 정보 없음
- 모든 인증된 사용자가 동일한 권한

### 1.4 API 보안

**현재 구현:**

```typescript
// Server Action에서 storeId가 URL 파라미터로 전달됨
export async function getPurchases(
  startDate?: string,
  storeId?: string // 클라이언트가 제공
) {
  if (storeId !== 'all') {
    conditions.push(eq(purchaseTransactions.storeId, storeId))
  }
  // ❌ 권한 검증 없음!
}
```

**취약점:**

- storeId가 클라이언트 제어
- 다른 매장 데이터 접근 가능
- 서버사이드 권한 검증 없음

---

## 2. CRITICAL GAPS (즉시 해결 필요)

### 2.1 사용자 관리 시스템 부재

**필요한 테이블:**

```sql
-- users: 사용자 계정
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  name VARCHAR(100) NOT NULL,
  phone VARCHAR(20),
  is_active BOOLEAN DEFAULT true,
  last_login_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- roles: 역할 정의
CREATE TABLE roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  role_name VARCHAR(50) NOT NULL,
  permissions JSONB NOT NULL,
  created_at TIMESTAMP DEFAULT NOW()
);

-- user_store_assignments: 사용자-매장 매핑
CREATE TABLE user_store_assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id),
  store_id UUID REFERENCES stores(id),
  role_id UUID REFERENCES roles(id),
  assigned_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(user_id, store_id)
);
```

### 2.2 테넌트 격리 보안 취약점

**해결 방법:**

```typescript
// 1. JWT에 사용자 정보 포함
const token = await new SignJWT({
  userId: user.id,
  storeIds: user.allowedStores,
  role: user.role,
}).sign(SECRET)

// 2. 권한 검증 유틸리티
export async function getAuthContext() {
  const cookieStore = await cookies()
  const token = cookieStore.get('session')?.value
  const { payload } = await jwtVerify(token, SESSION_SECRET)
  return payload as AuthContext
}

// 3. Server Action에서 권한 검증
export async function getPurchases(storeId: string) {
  const { storeIds } = await getAuthContext()
  if (!storeIds.includes(storeId)) {
    throw new Error('접근 권한이 없습니다')
  }
  // 데이터 조회...
}
```

### 2.3 마스터 데이터 테넌시

**옵션:**
| 옵션 | 설명 | 적합한 경우 |
|------|------|------------|
| A. storeId 추가 | 각 테이블에 storeId 추가 | 매장별 완전 독립 |
| B. organizationId | 조직 레벨 테넌시 | 프랜차이즈 모델 |
| C. 하이브리드 | 공용 + 커스텀 | 본사 기본값 + 가맹점 커스텀 |

---

## 3. HIGH PRIORITY (런칭 전 필요)

### 3.1 구독/결제 시스템

**필요한 테이블:**

```sql
CREATE TABLE organizations (
  id UUID PRIMARY KEY,
  name VARCHAR(200) NOT NULL,
  plan VARCHAR(50) DEFAULT 'free',
  max_stores INTEGER DEFAULT 1,
  stripe_customer_id VARCHAR(255),
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE subscriptions (
  id UUID PRIMARY KEY,
  organization_id UUID REFERENCES organizations(id),
  plan VARCHAR(50) NOT NULL,
  status VARCHAR(20) NOT NULL,
  stripe_subscription_id VARCHAR(255),
  current_period_start TIMESTAMP,
  current_period_end TIMESTAMP
);
```

### 3.2 에러 트래킹/모니터링

**현재:** `console.error()` 만 사용

**필요:**

- Sentry (에러 트래킹)
- 구조화된 로깅 (Pino)
- APM (Datadog/Vercel Analytics)
- 알림 (Slack/PagerDuty)

### 3.3 보안 헤더

**필요한 vercel.json:**

```json
{
  "headers": [
    {
      "source": "/(.*)",
      "headers": [
        { "key": "X-Content-Type-Options", "value": "nosniff" },
        { "key": "X-Frame-Options", "value": "DENY" },
        { "key": "X-XSS-Protection", "value": "1; mode=block" },
        { "key": "Referrer-Policy", "value": "strict-origin-when-cross-origin" }
      ]
    }
  ]
}
```

### 3.4 Rate Limiting

**필요:**

- API 요청 제한
- 테넌트별 quota
- DDoS 방어

---

## 4. MEDIUM PRIORITY (런칭 후)

### 4.1 감사 로깅

```sql
CREATE TABLE audit_logs (
  id UUID PRIMARY KEY,
  store_id UUID,
  user_id UUID,
  table_name VARCHAR(100),
  record_id UUID,
  action VARCHAR(20),
  old_values JSONB,
  new_values JSONB,
  ip_address VARCHAR(45),
  created_at TIMESTAMP DEFAULT NOW()
);
```

### 4.2 기능 플래그

```typescript
const features = {
  BASIC: ['purchases', 'sales'],
  STANDARD: ['purchases', 'sales', 'inventory', 'employees'],
  PREMIUM: [
    'purchases',
    'sales',
    'inventory',
    'employees',
    'analytics',
    'alerts',
  ],
}
```

---

## 5. 현재 강점 (유지해야 할 것)

| 강점                  | 설명                          |
| --------------------- | ----------------------------- |
| Next.js 15 App Router | 최신 아키텍처, Server Actions |
| Drizzle ORM           | 타입 안전성, 성능             |
| Soft Delete 패턴      | 모든 테이블에 deletedAt       |
| Decimal 정밀도        | 재무 데이터 정확성            |
| 인덱스 최적화         | 30+ 인덱스 설정               |
| Zod 검증              | 강력한 입력 검증              |
| 캐싱 전략             | unstable_cache + 태그 기반    |
| 반응형 UI             | 모바일/태블릿 지원            |

---

## 6. 구현 로드맵

### Phase 1: 보안 강화 (2주)

- [ ] 사용자 테이블 생성
- [ ] JWT에 사용자 정보 포함
- [ ] Server Actions 권한 검증
- [ ] 역할 기반 접근 제어
- [ ] 보안 헤더 추가

### Phase 2: 운영 인프라 (2주)

- [ ] Sentry 에러 트래킹
- [ ] 구조화된 로깅
- [ ] Rate Limiting
- [ ] 감사 로깅
- [ ] 헬스체크 엔드포인트

### Phase 3: SaaS 기능 (3주)

- [ ] 조직/구독 스키마
- [ ] 결제 연동 (Stripe/토스)
- [ ] 기능 플래그 시스템
- [ ] 마스터 데이터 테넌시
- [ ] 온보딩 플로우

### Phase 4: 고급 기능 (지속)

- [ ] 화이트 라벨링
- [ ] API 키 발급
- [ ] 웹훅 시스템
- [ ] 멀티 리전

---

## 7. SaaS 요금제 제안

| 플랜       | 가격        | 매장 수 | 사용자 | 기능               |
| ---------- | ----------- | ------- | ------ | ------------------ |
| Free       | ₩0          | 1       | 1      | 매입/판매 기본     |
| Basic      | ₩29,000/월  | 1       | 3      | + 재고관리, 분석   |
| Standard   | ₩79,000/월  | 3       | 10     | + 직원관리, 알림   |
| Premium    | ₩199,000/월 | 무제한  | 무제한 | + API, 맞춤 리포트 |
| Enterprise | 협의        | 맞춤    | 맞춤   | + 화이트라벨, SLA  |
