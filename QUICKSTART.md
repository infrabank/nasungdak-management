# 빠른 시작 가이드 ⚡

5분 안에 프로젝트를 실행하고 첫 데이터를 입력해보세요!

## 📋 사전 요구사항

- Node.js 18+ 
- npm 9+
- Vercel 또는 Neon 계정 (데이터베이스)

## 🚀 설치 및 실행

### Step 1: 프로젝트 클론 및 설치

```bash
git clone https://github.com/infrabank/nasungdak-management.git
cd nasungdak-management
npm install
```

### Step 2: 환경 변수 설정

**옵션 A: Vercel CLI 사용**
```bash
npm i -g vercel
vercel link
vercel env pull .env.local
```

**옵션 B: 직접 생성**
```bash
# .env.local 파일 생성
cat > .env.local << EOF
POSTGRES_URL="postgresql://user:password@host:5432/database?sslmode=require"
AUTH_PASSWORD="your-login-password"
JWT_SECRET="your-random-secret-key-32-chars-min"
EOF
```

### Step 3: 데이터베이스 마이그레이션

```bash
# 마이그레이션 실행
npm run db:migrate

# 샘플 데이터 추가 (권장)
npm run db:seed
```

### Step 4: 개발 서버 시작

```bash
npm run dev
```

🌐 **http://localhost:3000** 에서 확인!

---

## ✅ 첫 사용 가이드

### 1. 로그인

- URL: http://localhost:3000/login
- 비밀번호: `.env.local`의 `AUTH_PASSWORD` 값

### 2. 매장 설정 (다매장인 경우)

1. 사이드바 → **매장 관리**
2. **매장 추가** 클릭
3. 매장명, 코드 입력 → 저장

### 3. 기초 데이터 확인

`npm run db:seed` 실행 시 자동 생성됨:

| 카테고리 | 데이터 |
|----------|--------|
| 메뉴 | 닭강정, 순살치킨, 양념치킨 |
| 재료 | 닭고기, 튀김가루, 소스, 식용유, 마늘 |
| SKU | 각 메뉴별 소/중/대 |

추가 필요 시: **기초 데이터** 메뉴에서 등록

### 4. 매입 등록

1. **매입 관리** → **새 매입 등록**
2. 정보 입력:
   - 거래 날짜
   - 공급업체명
   - 메뉴 → 재료 선택
   - 수량, 단가
3. **+ 추가**로 여러 항목 입력 가능
4. **저장** 클릭

### 5. 판매 입력

1. **판매 관리** → **일일 판매 입력**
2. 판매 날짜 선택
3. 각 SKU별 판매량 입력
4. **저장** 클릭

💡 **팁**: CSV 파일로 일괄 업로드 가능!

### 6. 고정비용 등록

1. **고정비용** → **비용 추가**
2. 날짜, 유형 (인건비/임대료/관리비/기타), 금액 입력
3. **저장**

### 7. 기름 교체 기록

1. **기름 교체** → **교체 기록 추가**
2. 날짜, 튀김기 유형 (초벌/재벌), 수량, 단가 입력
3. **저장**

---

## 🔧 유용한 명령어

```bash
# 개발
npm run dev              # 개발 서버 (http://localhost:3000)
npm run build            # 프로덕션 빌드

# 데이터베이스
npm run db:studio        # Drizzle Studio (DB GUI)
npm run db:seed          # 샘플 데이터 추가
npm run db:migrate       # 마이그레이션 실행

# 코드 품질
npm run type-check       # TypeScript 검사
npm run lint             # ESLint 실행
```

---

## ❓ 문제 해결

### 데이터베이스 연결 오류

```bash
# 환경 변수 확인
cat .env.local

# Vercel에서 다시 다운로드
vercel env pull .env.local
```

### 포트 충돌

```bash
# 다른 포트로 실행
PORT=3001 npm run dev
```

### TypeScript 에러

```bash
# 타입 확인
npm run type-check

# VS Code에서 TS 서버 재시작
# Ctrl+Shift+P → "TypeScript: Restart TS Server"
```

### 마이그레이션 에러

```bash
# 마이그레이션 재생성
npm run db:generate

# 마이그레이션 실행
npm run db:migrate
```

---

## 📚 다음 단계

- 📖 [전체 README](./README.md) - 프로젝트 개요
- 📋 [구현 가이드](./IMPLEMENTATION_GUIDE.md) - 상세 구현 가이드
- 🗄️ [데이터 모델](./specs/1-purchase-sales-management/data-model.md) - DB 구조
- 🔌 [API 스펙](./specs/1-purchase-sales-management/contracts/api-spec.md) - Server Actions

---

## 🚢 배포

```bash
# Vercel 배포
vercel --prod

# 프로덕션 DB 마이그레이션
vercel env pull .env.production.local
npm run db:migrate
```

---

**도움이 필요하신가요?** [이슈 등록](https://github.com/infrabank/nasungdak-management/issues)
