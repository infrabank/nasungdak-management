# SaaS 마이그레이션 가이드

## 구현 완료 항목

### 1. 데이터베이스 스키마 (lib/db/schema.ts)

새로 추가된 테이블:

```typescript
// users - 사용자 계정
users {
  id, email, passwordHash, name, phone,
  isActive, lastLoginAt, createdAt, updatedAt, deletedAt
}

// roles - 역할 정의
roles {
  id, roleName, description, permissions (JSONB),
  isSystem, createdAt, updatedAt
}

// user_store_assignments - 사용자-매장 매핑
userStoreAssignments {
  id, userId, storeId, roleId,
  assignedAt, assignedBy, deletedAt
}

// audit_logs - 감사 로그
auditLogs {
  id, storeId, userId, tableName, recordId,
  action, oldValues, newValues, ipAddress, userAgent, createdAt
}
```

### 2. 인증 유틸리티 (lib/auth.ts)

새로 추가된 함수:

```typescript
// 인증 컨텍스트 조회
getAuthContext(): Promise<AuthContext>

// 매장 접근 권한 확인
hasStoreAccess(storeId: string): Promise<boolean>

// 리소스 권한 확인
hasPermission(resource: string, action: string): Promise<boolean>

// 권한 검증 (없으면 에러)
requireStoreAccess(storeId: string): Promise<AuthContext>

// 사용자 인증
authenticateUser(email: string, password: string): Promise<{success, error?}>

// 비밀번호 해시
hashPassword(password: string): Promise<string>

// 필터링된 매장 ID 조회
getFilteredStoreIds(requestedStoreId: string): Promise<string[]>
```

### 3. 보안 헤더 (vercel.json)

```json
{
  "headers": [
    "X-Content-Type-Options: nosniff",
    "X-Frame-Options: DENY",
    "X-XSS-Protection: 1; mode=block",
    "Referrer-Policy: strict-origin-when-cross-origin",
    "Permissions-Policy: camera=(), microphone=(), geolocation=()"
  ]
}
```

### 4. 기본 역할 시드 (scripts/seed-roles.ts)

| 역할        | 설명               |
| ----------- | ------------------ |
| super_admin | 시스템 전체 관리자 |
| store_owner | 매장 오너          |
| manager     | 매장 매니저        |
| staff       | 매장 직원          |
| viewer      | 읽기 전용          |

---

## 마이그레이션 순서

### Step 1: 데이터베이스 마이그레이션

```bash
# 마이그레이션 생성
npm run db:generate

# 마이그레이션 실행
npm run db:migrate

# 기본 역할 시드
npx tsx scripts/seed-roles.ts
```

### Step 2: 기존 인증에서 새 인증으로 전환

**현재 인증 (단일 비밀번호):**

```typescript
// app/(auth)/login/actions.ts
const passwordHash = process.env.AUTH_PASSWORD_HASH
const isValid = await bcrypt.compare(password, passwordHash)
```

**새 인증 (사용자 계정):**

```typescript
// lib/auth.ts
import { authenticateUser } from '@/lib/auth'
const result = await authenticateUser(email, password)
```

**점진적 전환 방법:**

1. 환경변수로 인증 모드 전환:

```env
AUTH_MODE=legacy  # 기존 단일 비밀번호
AUTH_MODE=users   # 새 사용자 계정
```

2. 로그인 액션 수정:

```typescript
export async function login(formData: FormData) {
  const authMode = process.env.AUTH_MODE || 'legacy'

  if (authMode === 'users') {
    // 새 인증
    const email = formData.get('email') as string
    const password = formData.get('password') as string
    return authenticateUser(email, password)
  } else {
    // 기존 인증
    const password = formData.get('password') as string
    // ... 기존 로직
  }
}
```

### Step 3: Server Actions에 권한 검증 추가

**Before (현재):**

```typescript
export async function getPurchases(storeId?: string) {
  // storeId를 클라이언트에서 받아 그대로 사용
  if (storeId !== 'all') {
    conditions.push(eq(purchaseTransactions.storeId, storeId))
  }
}
```

**After (권한 검증 추가):**

```typescript
import { requireStoreAccess, getFilteredStoreIds } from '@/lib/auth'

export async function getPurchases(storeId?: string) {
  // 권한 검증
  const auth = await requireStoreAccess(storeId || 'all')

  // 접근 가능한 매장으로 필터링
  const allowedStoreIds = await getFilteredStoreIds(storeId || 'all')

  if (allowedStoreIds.length === 0) {
    return { items: [], hasMore: false, page: 1 }
  }

  // 단일 매장
  if (allowedStoreIds.length === 1) {
    conditions.push(eq(purchaseTransactions.storeId, allowedStoreIds[0]))
  }
  // 다중 매장
  else {
    conditions.push(inArray(purchaseTransactions.storeId, allowedStoreIds))
  }
}
```

### Step 4: 로그인 UI 수정

**Before (비밀번호만):**

```tsx
<input type="password" name="password" />
```

**After (이메일 + 비밀번호):**

```tsx
<input type="email" name="email" placeholder="이메일" />
<input type="password" name="password" placeholder="비밀번호" />
```

---

## 권한 시스템 사용법

### 권한 정의 (permissions JSONB)

```json
{
  "purchases": ["read", "write", "delete"],
  "sales": ["read", "write"],
  "inventory": ["read"],
  "master-data": ["read"]
}
```

### 권한 체크 예시

```typescript
import { hasPermission, hasStoreAccess } from '@/lib/auth'

// 특정 기능 권한 체크
if (await hasPermission('purchases', 'write')) {
  // 매입 등록 가능
}

// 매장 접근 권한 체크
if (await hasStoreAccess(storeId)) {
  // 해당 매장 데이터 접근 가능
}
```

### 에러 처리

```typescript
import { requireStoreAccess } from '@/lib/auth'

try {
  const auth = await requireStoreAccess(storeId)
  // 정상 처리
} catch (error) {
  if (error.message === '로그인이 필요합니다') {
    // 로그인 페이지로 리다이렉트
  }
  if (error.message === '해당 매장에 대한 접근 권한이 없습니다') {
    // 권한 없음 메시지
  }
}
```

---

## 테스트 계정

마이그레이션 후 테스트용 계정:

```
이메일: admin@nasungdak.com
비밀번호: test1234
역할: super_admin
```

---

## 롤백 절차

문제 발생 시:

1. `AUTH_MODE=legacy`로 환경변수 변경
2. 기존 로그인 페이지 복원
3. JWT payload를 기존 형식으로 복원

---

## 다음 단계

1. [ ] npm run db:generate 실행
2. [ ] npm run db:migrate 실행
3. [ ] npx tsx scripts/seed-roles.ts 실행
4. [ ] 로그인 페이지 수정 (이메일 입력 추가)
5. [ ] 각 Server Action에 권한 검증 추가
6. [ ] 테스트 및 검증
