# 나성닭강정 관리 시스템

나성닭강정을 위한 관리 웹 애플리케이션입니다.

## ✨ 주요 기능

- 📦 **매입 관리**: 원재료 매입 기록 및 자동 검증
- 💰 **판매 관리**: 일일 판매량 기록 및 매출 자동 계산
- 📊 **기초 데이터 관리**: 메뉴, 재료, SKU 설정
- 🔄 **메뉴-재료 매핑**: 메뉴별 필요 재료 자동 검증
- 📱 **반응형 디자인**: 모바일, 태블릿, 데스크톱 지원

## 🚀 빠른 시작

### 1. 설치

```bash
npm install
```

### 2. 데이터베이스 설정

Vercel Postgres 데이터베이스 생성:

```bash
# Vercel CLI 설치
npm i -g vercel

# 프로젝트 연결
vercel link

# 환경 변수 다운로드
vercel env pull .env
```

### 3. 마이그레이션 및 시드

```bash
# 마이그레이션 생성
npm run db:generate

# 마이그레이션 실행
npm run db:migrate

# 샘플 데이터 추가
npm run db:seed
```

### 4. 개발 서버 실행

```bash
npm run dev
```

http://localhost:3000 에서 확인하세요!

📖 **상세한 가이드는 [QUICKSTART.md](./QUICKSTART.md)를 참조하세요.**

## 🛠️ 기술 스택

### Frontend
- **Next.js 15** - React 프레임워크 (App Router)
- **React 19** - UI 라이브러리
- **Tailwind CSS** - 유틸리티 CSS 프레임워크
- **TypeScript** - 타입 안전성

### Backend
- **Next.js Server Actions** - 서버리스 API
- **Vercel Postgres** - PostgreSQL 데이터베이스
- **Drizzle ORM** - 타입 안전 ORM

### 검증 및 폼
- **Zod** - 스키마 검증
- **React Hook Form** - 폼 관리

### 배포
- **Vercel** - 서버리스 플랫폼

## 📁 프로젝트 구조

```
매입_판매_원가/
├── app/                          # Next.js App Router
│   ├── (auth)/                   # 인증 페이지
│   ├── (dashboard)/              # 대시보드 페이지
│   │   ├── purchases/            # 매입 관리
│   │   ├── sales/                # 판매 관리
│   │   ├── analysis/             # 기간 분석
│   │   └── master-data/          # 기초 데이터
│   ├── layout.tsx
│   └── page.tsx
├── components/
│   └── ui/                       # 재사용 UI 컴포넌트
├── lib/
│   ├── db/                       # 데이터베이스
│   │   ├── index.ts              # DB 클라이언트
│   │   └── schema.ts             # Drizzle 스키마
│   └── utils/                    # 유틸리티
├── scripts/
│   └── seed.ts                   # 시드 스크립트
├── specs/                        # 프로젝트 문서
│   └── 1-purchase-sales-management/
│       ├── spec.md               # 기능 명세
│       ├── data-model.md         # 데이터 모델
│       ├── plan.md               # 구현 계획
│       └── tasks.md              # 작업 목록
├── QUICKSTART.md                 # 빠른 시작 가이드
├── IMPLEMENTATION_GUIDE.md       # 구현 가이드
└── README.md                     # 이 파일
```

## 📊 데이터베이스 스키마

7개의 주요 테이블:

1. **menu_categories** - 메뉴 카테고리
2. **ingredients** - 재료
3. **skus** - 판매 단위 (SKU)
4. **menu_ingredients** - 메뉴-재료 매핑
5. **purchase_transactions** - 매입 거래
6. **sales_records** - 판매 기록
7. **cost_distribution_rules** - 원가 배분 규칙

## 🎯 사용 시나리오

### 1. 매입 등록
1. "매입 관리" → "새 매입 등록"
2. 메뉴와 재료 선택
3. 수량, 단가 입력
4. 저장 → 자동으로 유효성 검증 (메뉴-재료 매핑 확인)

### 2. 판매 등록
1. "판매 관리" → "일일 판매 입력"
2. SKU 선택 및 판매량 입력
3. 저장 → 매출액 자동 계산

### 3. 기초 데이터 설정
1. "기초 데이터" 메뉴 진입
2. 메뉴, 재료, SKU 등록
3. 메뉴-재료 매핑 설정

## 🔧 개발 명령어

```bash
# 개발
npm run dev              # 개발 서버
npm run build            # 프로덕션 빌드
npm start                # 프로덕션 서버

# 데이터베이스
npm run db:generate      # 마이그레이션 파일 생성
npm run db:migrate       # 마이그레이션 실행
npm run db:seed          # 시드 데이터 추가
npm run db:studio        # Drizzle Studio (DB GUI)

# 코드 품질
npm run lint             # ESLint 실행
npm run format           # Prettier 실행
```

## 📖 문서

- 📋 [빠른 시작 가이드](./QUICKSTART.md) - 5분 안에 시작하기
- 📚 [구현 가이드](./IMPLEMENTATION_GUIDE.md) - 상세한 구현 가이드
- 📝 [기능 명세](./specs/1-purchase-sales-management/spec.md) - 전체 기능 요구사항
- 🗄️ [데이터 모델](./specs/1-purchase-sales-management/data-model.md) - 데이터베이스 설계
- 🔌 [API 스펙](./specs/1-purchase-sales-management/contracts/api-spec.md) - Server Actions API
- 📋 [작업 목록](./specs/1-purchase-sales-management/tasks.md) - 구현 작업 목록

## 🚢 배포

### Vercel 배포

```bash
# 첫 배포
vercel

# 프로덕션 배포
vercel --prod
```

배포 후 프로덕션 데이터베이스 마이그레이션:

```bash
vercel env pull .env.production
npm run db:migrate
```

## 🤝 기여

프로젝트 개선을 위한 기여를 환영합니다!

1. Fork the Project
2. Create your Feature Branch (`git checkout -b feature/AmazingFeature`)
3. Commit your Changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the Branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## 📄 라이센스

이 프로젝트는 MIT 라이센스를 따릅니다.

## 💬 문의

프로젝트에 대한 질문이나 제안이 있으시면 이슈를 생성해주세요.

---

**Made with ❤️ for 나성닭강정**
