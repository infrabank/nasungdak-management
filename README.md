# 나성닭강정 관리 시스템

치킨 프랜차이즈를 위한 올인원 매장 관리 웹 애플리케이션입니다.

![Next.js](https://img.shields.io/badge/Next.js-15-black?style=flat-square&logo=next.js)
![React](https://img.shields.io/badge/React-19-61DAFB?style=flat-square&logo=react)
![TypeScript](https://img.shields.io/badge/TypeScript-5.7-3178C6?style=flat-square&logo=typescript)
![Tailwind CSS](https://img.shields.io/badge/Tailwind-3.4-06B6D4?style=flat-square&logo=tailwindcss)
![Drizzle](https://img.shields.io/badge/Drizzle-ORM-C5F74F?style=flat-square)

## ✨ 주요 기능

### 핵심 기능

| 기능                  | 설명                                                 |
| --------------------- | ---------------------------------------------------- |
| 📦 **매입 관리**      | 원재료 매입 기록, 공급업체 관리, 메뉴-재료 자동 검증 |
| 💰 **판매 관리**      | 일일 판매량 기록, 매출 자동 계산, CSV 일괄 업로드    |
| 🏪 **다매장 지원**    | 매장별 데이터 분리, 매장 선택 필터링                 |
| 🛢️ **기름 교체 관리** | 초벌/재벌 기름 교체 이력, 비용 추적                  |
| 💵 **고정비용 관리**  | 인건비, 임대료, 관리비 등 월별 비용 관리             |
| 📊 **기초 데이터**    | 메뉴, 재료, SKU, 공급업체 마스터 관리                |

### 확장 기능

| 기능             | 설명                             | 상태      |
| ---------------- | -------------------------------- | --------- |
| 📦 **재고 관리** | 실시간 재고 추적, 폐기/조정 기록 | 🔧 준비됨 |
| 🔔 **재고 알림** | 재고 부족 예측 및 카카오 알림    | 🔧 준비됨 |

### UI/UX

- 🎨 **Neo-Brutalism 디자인** - 대담하고 직관적인 UI
- ✨ **Framer Motion 애니메이션** - 부드러운 로딩 전환
- 📱 **반응형 디자인** - 모바일, 태블릿, 데스크톱 완벽 지원
- 🔐 **JWT 인증** - 비밀번호 기반 보안 접근

## 🚀 빠른 시작

### 1. 설치

```bash
git clone https://github.com/infrabank/nasungdak-management.git
cd nasungdak-management
npm install
```

### 2. 환경 변수 설정

```bash
# Vercel CLI로 환경 변수 다운로드
vercel link
vercel env pull .env.local

# 또는 .env.local 직접 생성
cp .env.example .env.local
```

필수 환경 변수:

```env
POSTGRES_URL="postgresql://..."
AUTH_PASSWORD="your-password"
JWT_SECRET="your-jwt-secret"
```

### 3. 데이터베이스 설정

```bash
# 마이그레이션 실행
npm run db:migrate

# 샘플 데이터 추가 (선택)
npm run db:seed
```

### 4. 개발 서버 실행

```bash
npm run dev
```

🌐 http://localhost:3000 에서 확인!

## 🛠️ 기술 스택

### Frontend

| 기술          | 버전 | 용도                       |
| ------------- | ---- | -------------------------- |
| Next.js       | 15   | App Router, Server Actions |
| React         | 19   | UI 라이브러리              |
| TypeScript    | 5.7  | 타입 안전성                |
| Tailwind CSS  | 3.4  | Neo-Brutalism 스타일링     |
| Framer Motion | 11   | 애니메이션                 |
| Lucide React  | -    | 아이콘                     |

### Backend

| 기술                   | 용도                    |
| ---------------------- | ----------------------- |
| Next.js Server Actions | 서버리스 API            |
| Drizzle ORM            | 타입 안전 ORM           |
| Vercel Postgres / Neon | PostgreSQL 데이터베이스 |
| Zod                    | 스키마 검증             |
| Jose                   | JWT 인증                |

## 📁 프로젝트 구조

```
├── app/
│   ├── (auth)/login/           # 로그인 페이지
│   └── dashboard/              # 대시보드
│       ├── purchases/          # 매입 관리
│       ├── sales/              # 판매 관리
│       ├── stores/             # 매장 관리
│       ├── fixed-costs/        # 고정비용
│       ├── oil-changes/        # 기름 교체
│       ├── inventory/          # 재고 관리
│       └── master-data/        # 기초 데이터
│           ├── menus/
│           ├── ingredients/
│           ├── skus/
│           ├── suppliers/
│           ├── menu-ingredients/
│           └── cost-rules/
├── components/ui/              # 재사용 UI 컴포넌트
├── lib/
│   ├── db/schema.ts           # Drizzle 스키마 (13개 테이블)
│   ├── utils/validation.ts    # Zod 스키마
│   └── animations.ts          # Framer Motion 변형
└── specs/                      # 프로젝트 문서
```

## 📊 데이터베이스 스키마

### 핵심 테이블 (Phase 1)

| 테이블                    | 설명            | 인덱스 |
| ------------------------- | --------------- | ------ |
| `stores`                  | 매장 정보       | -      |
| `suppliers`               | 공급업체        | -      |
| `menu_categories`         | 메뉴 카테고리   | -      |
| `ingredients`             | 재료            | -      |
| `skus`                    | 판매 단위 (SKU) | 2개    |
| `menu_ingredients`        | 메뉴-재료 매핑  | 2개    |
| `purchase_transactions`   | 매입 거래       | 6개    |
| `sales_records`           | 판매 기록       | 5개    |
| `fixed_costs`             | 고정비용        | 3개    |
| `oil_change_history`      | 기름 교체       | 3개    |
| `cost_distribution_rules` | 원가 배분       | -      |

### 확장 테이블 (Phase 2-3)

| 테이블                  | 설명           |
| ----------------------- | -------------- |
| `inventory`             | 재고 현황      |
| `inventory_events`      | 재고 이벤트    |
| `inventory_alert_rules` | 재고 알림 규칙 |
| `alert_history`         | 알림 발송 이력 |

## 🔧 개발 명령어

```bash
# 개발
npm run dev              # 개발 서버 (localhost:3000)
npm run build            # 프로덕션 빌드
npm run start            # 프로덕션 서버

# 코드 품질
npm run type-check       # TypeScript 검사
npm run lint             # ESLint
npm run format           # Prettier

# 데이터베이스
npm run db:generate      # 마이그레이션 생성
npm run db:migrate       # 마이그레이션 실행
npm run db:studio        # Drizzle Studio (DB GUI)
npm run db:seed          # 시드 데이터

# 테스트
npm run test             # Vitest 단위 테스트
npm run test:e2e         # Playwright E2E 테스트
```

## 🚢 배포

### Vercel 배포

```bash
# 첫 배포
vercel

# 프로덕션 배포
vercel --prod
```

### Neon 데이터베이스

1. [Neon Console](https://console.neon.tech) 접속
2. 프로젝트 생성 또는 선택
3. Connection string을 `POSTGRES_URL`에 설정
4. SQL Editor에서 인덱스 생성 (별도 SQL 파일 참조)

## 📖 문서

| 문서                                                                  | 설명              |
| --------------------------------------------------------------------- | ----------------- |
| [빠른 시작](./QUICKSTART.md)                                          | 5분 안에 시작하기 |
| [구현 가이드](./IMPLEMENTATION_GUIDE.md)                              | 상세 구현 가이드  |
| [기능 명세](./specs/1-purchase-sales-management/spec.md)              | 전체 요구사항     |
| [데이터 모델](./specs/1-purchase-sales-management/data-model.md)      | DB 설계           |
| [API 스펙](./specs/1-purchase-sales-management/contracts/api-spec.md) | Server Actions    |
| [코딩 가이드](./AGENTS.md)                                            | 개발 규칙         |

## 🎯 사용 시나리오

### 일일 운영 플로우

```
1. 로그인 → 대시보드
2. 매장 선택 (다매장인 경우)
3. 매입 등록: 당일 입고된 재료 기록
4. 판매 입력: 일일 판매량 기록 (또는 CSV 업로드)
5. 고정비용: 월별 비용 등록
6. 기름 교체: 교체 시 기록
```

### CSV 일괄 업로드

- **판매 데이터**: 날짜, SKU, 수량 형식
- **매입 데이터**: 날짜, 메뉴, 재료, 수량, 단가 형식
- **전치 형식 지원**: 날짜가 열, SKU가 행인 형식

## 🔐 인증

- 단일 비밀번호 인증 방식
- JWT 토큰 (7일 만료)
- HTTP-Only 쿠키 저장
- 모든 `/dashboard/*` 라우트 보호

## 📄 라이센스

MIT License

---

**Made with ❤️ for 나성닭강정**
