# 개발환경 표준 (DEV_ENV.md)

> 집/회사 어디서든 동일하게 개발하기 위한 환경 표준 문서

## 필수 런타임 버전

| 도구     | 버전           | 확인 명령어          |
| -------- | -------------- | -------------------- |
| Node.js  | `22.19.0` 이상 | `node -v`            |
| npm      | `11.7.0` 이상  | `npm -v`             |
| opencode | 최신           | `opencode --version` |

### 버전 관리 (권장)

```bash
# nvm 사용 시 (권장)
nvm install 22.19.0
nvm use 22.19.0

# 또는 .nvmrc 파일로 자동화
echo "22.19.0" > .nvmrc
nvm use  # .nvmrc 자동 인식
```

---

## 로컬 개발 시작 순서

### 1. 최초 설정 (한 번만)

```bash
# 1. 저장소 클론
git clone <repo-url>
cd 매입_판매_원가

# 2. 의존성 설치
npm install

# 3. 환경변수 설정
cp .env.example .env
# .env 파일 편집하여 필요한 값 입력

# 4. 데이터베이스 마이그레이션 (Vercel Postgres 연결 필요)
npm run db:migrate
```

### 2. 일일 개발 시작

```bash
# 1. 원격 변경사항 동기화
git pull origin <current-branch>

# 2. 의존성 변경 확인 (package-lock.json 변경 시)
npm install

# 3. opencode 실행
opencode

# 4. 개발 서버 시작 (별도 터미널 또는 opencode 내에서)
npm run dev
```

---

## 집/회사 전환 시 Git 규칙

### 절대 원칙

| 규칙               | 설명                                      |
| ------------------ | ----------------------------------------- |
| **떠나기 전 커밋** | 작업 중단 전 반드시 WIP 커밋이라도 남긴다 |
| **떠나기 전 푸시** | 커밋 후 반드시 원격에 푸시한다            |
| **시작 전 풀**     | 작업 시작 전 반드시 `git pull`로 동기화   |
| **충돌 즉시 해결** | 충돌 발생 시 즉시 해결, 미루지 않는다     |

### 장소 전환 체크리스트

**[ 떠날 때 ]**

```bash
# 1. 변경사항 확인
git status

# 2. 타입체크 통과 확인
npm run type-check

# 3. 스테이징 및 커밋
git add .
git commit -m "WIP: <작업 내용 요약>"

# 4. 푸시
git push origin <branch>
```

**[ 도착했을 때 ]**

```bash
# 1. 최신 상태로 동기화
git pull origin <branch>

# 2. 의존성 동기화
npm install

# 3. 개발 재개
opencode
```

---

## 커밋/푸시 최소 단위 원칙

### 커밋 단위

| 구분          | 커밋 시점                | 예시                         |
| ------------- | ------------------------ | ---------------------------- |
| **기능 단위** | 하나의 기능이 완성되면   | "feat: 매입 등록 폼 추가"    |
| **수정 단위** | 버그 하나를 수정하면     | "fix: 금액 계산 오류 수정"   |
| **리팩토링**  | 동작 변경 없는 코드 개선 | "refactor: 유효성 검증 분리" |
| **WIP**       | 장소 이동 시 미완성 작업 | "WIP: 판매 분석 차트 진행중" |

### 커밋 메시지 형식

```
<type>: <요약> (한글, 50자 이내)

[선택] 본문 - 변경 이유나 상세 설명
```

| type       | 용도                      |
| ---------- | ------------------------- |
| `feat`     | 새 기능                   |
| `fix`      | 버그 수정                 |
| `refactor` | 리팩토링                  |
| `style`    | 포맷팅, 세미콜론 등       |
| `docs`     | 문서 수정                 |
| `test`     | 테스트 추가/수정          |
| `chore`    | 빌드, 설정 변경           |
| `WIP`      | 미완성 작업 (장소 이동용) |

### 푸시 원칙

- **최소 단위**: 타입체크(`npm run type-check`) 통과하는 상태
- **예외**: WIP 커밋은 타입체크 실패해도 푸시 가능 (단, 반드시 다음 세션에서 수정)

---

## 환경 변수 관리

### 파일 구조

| 파일           | 용도                   | Git    |
| -------------- | ---------------------- | ------ |
| `.env.example` | 환경변수 템플릿        | 커밋 O |
| `.env`         | 실제 환경변수 (비밀값) | 커밋 X |
| `.env.local`   | 로컬 오버라이드        | 커밋 X |

### 환경변수 추가 시

1. `.env.example`에 키와 설명 추가
2. `.env`에 실제 값 입력
3. 팀원에게 새 환경변수 안내

---

## 프로젝트 디렉토리 구조

### 구조 원칙: 자동 생성물 vs 수동 코드 분리

```
매입_판매_원가/
├── [자동 생성물 - AI/도구가 생성]
│   ├── specs/                    # 기능 명세서 (opencode/speckit 생성)
│   │   └── {feature}/
│   │       ├── spec.md
│   │       ├── plan.md
│   │       └── tasks.md
│   ├── .sisyphus/plans/          # 작업 계획 (AI 생성)
│   ├── .specify/                 # 명세 템플릿/스크립트
│   └── drizzle/*.sql             # DB 마이그레이션 (drizzle-kit 생성)
│
├── [수동 코드 - 개발자가 작성]
│   ├── app/                      # Next.js App Router
│   │   ├── (auth)/               # 인증 관련 페이지
│   │   ├── dashboard/            # 대시보드 기능들
│   │   │   ├── purchases/        # 매입 관리
│   │   │   ├── sales/            # 판매 관리
│   │   │   ├── inventory/        # 재고 관리
│   │   │   ├── analysis/         # 분석
│   │   │   └── master-data/      # 마스터 데이터
│   │   ├── admin/                # 관리자 페이지
│   │   └── api/                  # API 라우트
│   ├── lib/                      # 유틸리티 및 공통 로직
│   │   ├── db/                   # 데이터베이스 (schema, helpers)
│   │   ├── utils/                # 유틸리티 함수
│   │   └── auth.ts               # 인증 로직
│   ├── components/               # 재사용 UI 컴포넌트
│   │   └── ui/                   # 기본 UI (Button, Input 등)
│   └── scripts/                  # 스크립트 (seed, migration 등)
│
├── [문서]
│   ├── AGENTS.md                 # AI 에이전트 가이드
│   ├── DEV_ENV.md                # 개발환경 표준 (이 문서)
│   ├── README.md                 # 프로젝트 소개
│   └── QUICKSTART.md             # 빠른 시작
│
├── [설정]
│   ├── opencode.config.json      # opencode 설정
│   ├── opencode.json             # opencode 플러그인
│   ├── package.json              # npm 의존성
│   ├── tsconfig.json             # TypeScript 설정
│   ├── drizzle.config.ts         # Drizzle ORM 설정
│   └── .env.example              # 환경변수 템플릿
│
└── [Git 제외]
    ├── node_modules/             # 의존성
    ├── .next/                    # Next.js 빌드
    ├── .env                      # 환경변수 (비밀)
    └── .vercel/                  # Vercel 설정
```

### 파일 생성 규칙

| 작업 | 생성 위치 | 생성 주체 |
|------|----------|----------|
| 기능 명세 작성 | `specs/{feature}/` | opencode (speckit) |
| 작업 계획 | `.sisyphus/plans/` | opencode (AI) |
| 페이지/라우트 추가 | `app/` | 개발자 |
| 유틸리티 함수 | `lib/utils/` | 개발자 |
| UI 컴포넌트 | `components/ui/` | 개발자 |
| DB 스키마 변경 | `lib/db/schema.ts` | 개발자 |
| DB 마이그레이션 | `drizzle/` | drizzle-kit (자동) |

### 기능 추가 시 파일 배치

```
새 기능: "정산 관리"

1. [명세] specs/settlement/spec.md, plan.md, tasks.md
2. [페이지] app/dashboard/settlement/page.tsx
3. [액션] app/dashboard/settlement/actions.ts
4. [폼] app/dashboard/settlement/settlement-form.tsx
5. [스키마] lib/db/schema.ts에 settlements 테이블 추가
6. [마이그레이션] npm run db:generate → drizzle/xxxx_add_settlements.sql
```

---

## 문제 해결

### 일반적인 문제

| 문제                   | 해결                                                   |
| ---------------------- | ------------------------------------------------------ |
| `npm install` 실패     | `rm -rf node_modules package-lock.json && npm install` |
| 타입 에러 다수         | `npm run type-check` 후 하나씩 수정                    |
| 데이터베이스 연결 실패 | `.env`의 `DATABASE_URL` 확인                           |
| opencode 명령어 없음   | `npm install -g opencode`                              |

### 의존성 충돌

```bash
# 완전 초기화 후 재설치
rm -rf node_modules
rm package-lock.json
npm install
```

---

## 관련 문서

- [AGENTS.md](./AGENTS.md) - AI 에이전트 가이드
- [QUICKSTART.md](./QUICKSTART.md) - 빠른 시작 가이드
- [opencode.config.json](./opencode.config.json) - opencode 설정
- [SYNC_PROMPT.md](./SYNC_PROMPT.md) - 회사 opencode 실행용 프롬프트

---

## Dev Container 사용 방법 (선택사항)

> Dev Container는 **선택사항**입니다. 로컬 환경에서도 동일하게 개발 가능합니다.

### Dev Container란?

Docker 컨테이너 안에서 개발 환경을 실행하여, 어느 컴퓨터에서든 동일한 환경을 보장합니다.

### 사전 요구사항

| 도구 | 설치 방법 |
|------|----------|
| Docker Desktop | https://www.docker.com/products/docker-desktop/ |
| VS Code | https://code.visualstudio.com/ |
| Dev Containers 확장 | VS Code 마켓플레이스에서 "Dev Containers" 설치 |

### 시작 방법

```bash
# 1. VS Code로 프로젝트 열기
code .

# 2. 명령 팔레트 (Ctrl+Shift+P / Cmd+Shift+P)
> Dev Containers: Reopen in Container

# 3. 자동으로 컨테이너 빌드 및 시작 (최초 5-10분 소요)
# 이후 opencode 및 npm run dev 바로 사용 가능
```

### 컨테이너 내부 환경

| 항목 | 값 |
|------|------|
| Base Image | Node 20 LTS (Debian Bookworm) |
| 작업 경로 | `/workspaces/store-management-saas` |
| opencode | 전역 설치됨 |
| npm | 포함됨 |
| git | 포함됨 |
| 쉘 | bash |

### Dev Container vs 로컬 개발 비교

| 항목 | Dev Container | 로컬 개발 |
|------|--------------|----------|
| **환경 일관성** | 완벽히 동일 | Node/npm 버전 수동 관리 필요 |
| **초기 설정** | Docker 설치만 필요 | Node, npm, opencode 각각 설치 |
| **시작 속도** | 첫 빌드 5-10분, 이후 즉시 | 즉시 |
| **리소스 사용** | Docker 메모리 사용 | 네이티브 성능 |
| **권장 상황** | 환경 충돌 방지, 새 컴퓨터 셋업 | 이미 환경 구성됨, 가벼운 작업 |

### 장소 전환 시 Dev Container 권장 흐름

**[ 집에서 떠날 때 - 로컬/컨테이너 무관 ]**

```bash
# 동일하게 커밋 & 푸시
git add .
git commit -m "WIP: 작업 내용"
git push origin <branch>
```

**[ 회사 도착 - Dev Container 사용 ]**

```bash
# 1. VS Code로 프로젝트 열기
code .

# 2. Dev Container로 열기 (명령 팔레트)
> Dev Containers: Reopen in Container

# 3. 터미널에서 동기화
git pull origin <branch>
npm install  # package-lock.json 변경 시

# 4. 개발 시작
opencode
npm run dev  # 별도 터미널
```

### 주의사항

1. **specs/ 디렉토리는 Docker Volume으로 유지됨**
   - 컨테이너 삭제해도 specs/ 내용 보존
   - 다른 브랜치 전환 시에도 유지

2. **node_modules도 Volume으로 분리됨**
   - 컨테이너 재빌드 시 npm install 다시 필요 없음
   - 호스트와 컨테이너 간 node_modules 충돌 방지

3. **.env 파일은 수동 복사 필요**
   - 보안상 자동 복사하지 않음
   - 컨테이너 내부에서 `.env` 파일 직접 생성

### 문제 해결

| 문제 | 해결 |
|------|------|
| 컨테이너 빌드 실패 | Docker Desktop 재시작 후 재시도 |
| opencode 명령 없음 | 컨테이너 내에서 `npm install -g @anthropics/claude-code` |
| 포트 3000 연결 안 됨 | VS Code 하단 "Ports" 탭에서 3000 포트 포워딩 확인 |
| 파일 권한 문제 | `sudo chown -R node:node /workspaces/store-management-saas` |

### Dev Container 없이 개발하기

Dev Container 없이도 DEV_ENV.md의 "로컬 개발 시작 순서"를 따르면 동일하게 개발 가능합니다.
