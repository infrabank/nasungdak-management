# 빠른 시작 가이드 ⚡

이 가이드는 프로젝트를 5분 안에 실행할 수 있도록 도와줍니다.

## 📋 사전 요구사항

- Node.js 18+ 설치
- npm 또는 yarn 설치
- Vercel 계정 (데이터베이스용)

## 🚀 1단계: 데이터베이스 설정 (Vercel Postgres)

### 옵션 A: Vercel 웹 대시보드에서 설정

1. [Vercel 대시보드](https://vercel.com/dashboard) 로그인
2. "Storage" 탭 클릭
3. "Create Database" → "Postgres" 선택
4. 데이터베이스 이름 입력 (예: `nasungdak-db`)
5. 리전 선택 (Singapore 권장)
6. "Create" 클릭

### 옵션 B: Vercel CLI로 설정

```bash
# Vercel CLI 설치 (아직 없다면)
npm i -g vercel

# 프로젝트 연결
vercel link

# 환경 변수 다운로드
vercel env pull .env
```

## 📦 2단계: 의존성 설치

```bash
npm install
```

## 🗄️ 3단계: 데이터베이스 마이그레이션

```bash
# 마이그레이션 파일 생성
npm run db:generate

# 마이그레이션 실행
npm run db:migrate

# 시드 데이터 추가 (테스트용 샘플 데이터)
npm run db:seed
```

## 🎯 4단계: 개발 서버 시작

```bash
npm run dev
```

브라우저에서 http://localhost:3000 접속!

## ✅ 5단계: 첫 데이터 입력

### 1. 기초 데이터 설정 (선택사항 - 시드로 자동 생성됨)

이미 `npm run db:seed`를 실행했다면 다음 데이터가 준비되어 있습니다:
- 메뉴: 닭강정, 순살치킨, 양념치킨
- 재료: 닭고기, 튀김가루, 소스, 식용유, 마늘
- SKU: 각 메뉴별 사이즈 (소/중/대)

추가 메뉴나 재료가 필요하면:
- **메뉴 등록**: `/dashboard/master-data/menus`
- **재료 등록**: `/dashboard/master-data/ingredients`
- **SKU 등록**: `/dashboard/master-data/skus`

### 2. 매입 데이터 입력

1. "매입 관리" 메뉴 클릭
2. "새 매입 등록" 버튼 클릭
3. 정보 입력:
   - 거래 날짜: 오늘 날짜
   - 메뉴: 닭강정
   - 재료: 닭고기
   - 공급업체: 예) "신선식품"
   - 수량: 10 (kg)
   - 단가: 5000 (원/kg)
4. "저장" 클릭

### 3. 판매 데이터 입력

1. "판매 관리" 메뉴 클릭
2. "일일 판매 입력" 버튼 클릭
3. 정보 입력:
   - 판매 날짜: 오늘 날짜
   - SKU: 닭강정 (중)
   - 판매량: 20 (개)
4. "저장" 클릭

## 🎉 완료!

이제 다음 기능들을 사용할 수 있습니다:

- ✅ **매입 관리**: 원재료 매입 기록 및 자동 검증
- ✅ **판매 관리**: 일일 판매 기록
- ✅ **기초 데이터**: 메뉴, 재료, SKU 관리
- ⏳ **기간 분석**: (추후 구현 예정)

## 🔧 주요 명령어

```bash
# 개발 서버
npm run dev

# 프로덕션 빌드
npm run build

# 빌드 실행
npm start

# 데이터베이스 마이그레이션 생성
npm run db:generate

# 마이그레이션 실행
npm run db:migrate

# 시드 데이터 추가
npm run db:seed

# Drizzle Studio (DB GUI)
npm run db:studio
```

## 📚 다음 단계

- 📖 [전체 구현 가이드](./IMPLEMENTATION_GUIDE.md) - 상세한 구현 가이드
- 📋 [기능 명세](./specs/1-purchase-sales-management/spec.md) - 전체 기능 요구사항
- 🗄️ [데이터 모델](./specs/1-purchase-sales-management/data-model.md) - 데이터베이스 구조

## ❓ 문제 해결

### 데이터베이스 연결 오류

``bash
# 환경 변수 확인
cat .env

# Vercel에서 환경 변수 다시 다운로드
vercel env pull .env
```

### 타입 에러

```bash
# 타입 재생성
npm run db:generate

# TypeScript 서버 재시작 (VSCode)
Ctrl+Shift+P → "TypeScript: Restart TS Server"
```

### 포트 이미 사용 중

```bash
# 다른 포트로 실행
PORT=3001 npm run dev
```

## 🌐 배포 (Vercel)

```bash
# 프로젝트 배포
vercel

# 프로덕션 배포
vercel --prod
```

배포 후 자동으로 환경 변수가 설정되며, 데이터베이스 마이그레이션은 Vercel CLI로 실행:

```bash
vercel env pull .env.production
npm run db:migrate
```

---

**도움이 필요하신가요?**

- 📝 [전체 문서](./IMPLEMENTATION_GUIDE.md)
- 🐛 [이슈 리포트](https://github.com/your-repo/issues)
