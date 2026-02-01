# SaaS 전환 구현 상태

> 최종 업데이트: 2026-01-31

## 완료된 구현

### Phase 1: 보안 강화 ✅

| 항목 | 파일 | 상태 |
|------|------|------|
| 사용자 관리 스키마 | `lib/db/schema.ts` | ✅ 완료 |
| 인증 유틸리티 | `lib/auth.ts` | ✅ 완료 |
| 보안 헤더 | `vercel.json` | ✅ 완료 |
| 역할 시드 | `scripts/seed-roles.ts` | ✅ 완료 |
| 마이그레이션 가이드 | `specs/saas-conversion/migration-guide.md` | ✅ 완료 |

### Phase 2: 운영 인프라 ✅

| 항목 | 파일 | 상태 |
|------|------|------|
| Sentry 설정 | `sentry.*.config.ts` | ✅ 완료 |
| Next.js + Sentry | `next.config.js` | ✅ 완료 |
| 로깅 시스템 | `lib/logger.ts` | ✅ 완료 |
| Rate Limiting | `lib/rate-limit.ts` | ✅ 완료 |
| 헬스체크 | `app/api/health/route.ts` | ✅ 완료 |
| 감사 로깅 | `lib/audit.ts` | ✅ 완료 |
| 환경변수 | `.env.example` | ✅ 완료 |

---

## 생성된 파일 목록

### 새 파일 (14개)
```
specs/saas-conversion/
├── analysis.md              # SaaS 전환 종합 분석
├── roadmap.md               # 구현 로드맵
├── migration-guide.md       # 마이그레이션 가이드
└── implementation-status.md # 이 파일

lib/
├── auth.ts                  # 인증 유틸리티
├── logger.ts                # 구조화된 로깅
├── rate-limit.ts            # Rate Limiting
└── audit.ts                 # 감사 로깅

app/api/health/
└── route.ts                 # 헬스체크 엔드포인트

scripts/
└── seed-roles.ts            # 역할 시드 스크립트

sentry.client.config.ts      # Sentry 클라이언트 설정
sentry.server.config.ts      # Sentry 서버 설정
sentry.edge.config.ts        # Sentry Edge 설정
vercel.json                  # 배포 설정 + 보안 헤더
```

### 수정된 파일 (2개)
```
lib/db/schema.ts             # users, roles, userStoreAssignments, auditLogs 추가
next.config.js               # Sentry 통합
.env.example                 # 새 환경변수 추가
```

---

## 필요한 패키지 설치

```bash
# Sentry (에러 트래킹)
npm install @sentry/nextjs

# (선택) Upstash Redis (Rate Limiting 고급)
npm install @upstash/redis @upstash/ratelimit
```

---

## 다음 실행 단계

### 1. 패키지 설치
```bash
npm install @sentry/nextjs
```

### 2. 데이터베이스 마이그레이션
```bash
npm run db:generate
npm run db:migrate
```

### 3. 기본 역할 시드
```bash
npx tsx scripts/seed-roles.ts
```

### 4. 환경변수 설정
`.env.local`에 다음 변수 추가:
```env
# Sentry
SENTRY_DSN=https://xxx@xxx.ingest.sentry.io/xxx
NEXT_PUBLIC_SENTRY_DSN=https://xxx@xxx.ingest.sentry.io/xxx

# (선택) 새 인증 모드
AUTH_MODE=users
```

### 5. 로컬 테스트
```bash
npm run dev
# http://localhost:3000/api/health 접속하여 확인
```

---

## Phase 3: SaaS 기능 (대기 중)

| 항목 | 설명 | 상태 |
|------|------|------|
| 조직 스키마 | organizations 테이블 | ⏳ 대기 |
| 구독 시스템 | subscriptions 테이블 | ⏳ 대기 |
| 결제 연동 | Stripe/토스 | ⏳ 대기 |
| 기능 플래그 | 플랜별 기능 제한 | ⏳ 대기 |
| 온보딩 플로우 | 회원가입 프로세스 | ⏳ 대기 |

---

## 유틸리티 사용법 요약

### 인증 (lib/auth.ts)
```typescript
import { getAuthContext, requireStoreAccess, hasPermission } from '@/lib/auth'

// 현재 사용자 정보
const auth = await getAuthContext()

// 매장 접근 권한 검증
const auth = await requireStoreAccess(storeId)

// 권한 체크
if (await hasPermission('purchases', 'write')) { ... }
```

### 로깅 (lib/logger.ts)
```typescript
import { logger, createActionLogger } from '@/lib/logger'

logger.info('작업 완료', { userId, storeId })
logger.error('에러 발생', { error: err.message })

const log = createActionLogger('createPurchase', storeId, userId)
log.info('매입 생성')
```

### Rate Limiting (lib/rate-limit.ts)
```typescript
import { rateLimit, withRateLimit, getClientIP } from '@/lib/rate-limit'

// 직접 체크
const result = rateLimit.check(ip, 'purchases:create')
if (!result.success) { return { error: '요청이 너무 많습니다' } }

// 래퍼 사용
return withRateLimit(ip, 'purchases:create', async () => {
  // 실제 로직
})
```

### 감사 로깅 (lib/audit.ts)
```typescript
import { logAudit, withAudit } from '@/lib/audit'

// 직접 호출
await logAudit({
  tableName: 'purchase_transactions',
  recordId: record.id,
  action: 'CREATE',
  newValues: record,
  storeId: record.storeId,
})

// 래퍼 사용
return withAudit('purchase_transactions', id, async () => {
  const old = await db.query...
  const [updated] = await db.update...
  return {
    success: true,
    data: updated,
    _audit: { oldValues: old, newValues: updated, storeId }
  }
})
```
