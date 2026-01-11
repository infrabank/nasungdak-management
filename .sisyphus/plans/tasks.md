# 나성닭강정 매장관리 개선 - 작업 목록 (Tasks)

## Phase 1: 다매장 기반 구조 (2~3주)

### 1.1 데이터베이스 스키마
- [ ] `stores` 테이블 스키마 정의 (lib/db/schema.ts)
- [ ] `stores` 마이그레이션 생성 및 적용
- [ ] `purchase_transactions` 테이블에 `store_id` 컬럼 추가
- [ ] `sales_records` 테이블에 `store_id` 컬럼 추가
- [ ] 기존 데이터에 기본 매장(id=1) 할당 마이그레이션

### 1.2 매장 관리 기능
- [ ] 매장 Zod 스키마 정의 (lib/utils/validation.ts)
- [ ] 매장 CRUD Server Actions (app/dashboard/stores/actions.ts)
  - [ ] createStore
  - [ ] updateStore
  - [ ] deleteStore (soft delete)
  - [ ] getStores
- [ ] 매장 목록 페이지 (app/dashboard/stores/page.tsx)
- [ ] 매장 등록/수정 폼 (app/dashboard/stores/store-form.tsx)
- [ ] 매장 행 컴포넌트 (app/dashboard/stores/store-row.tsx)

### 1.3 매장별 필터 적용
- [ ] 대시보드 레이아웃에 매장 선택 드롭다운 추가
- [ ] 매장 컨텍스트/상태 관리 (선택된 매장 유지)
- [ ] 매입 목록 쿼리에 store_id 필터 적용
- [ ] 판매 목록 쿼리에 store_id 필터 적용
- [ ] 분석 페이지 쿼리에 store_id 필터 적용

---

## Phase 2: 토스 POS 연동 (3~5주)

### 2.1 데이터베이스 스키마
- [ ] `toss_sku_mappings` 테이블 스키마 정의
- [ ] `toss_sync_logs` 테이블 스키마 정의
- [ ] `sales_records`에 `toss_sync_id` 컬럼 추가
- [ ] 마이그레이션 생성 및 적용

### 2.2 SKU 매핑 관리
- [ ] SKU 매핑 Zod 스키마 정의
- [ ] SKU 매핑 CRUD Server Actions (app/dashboard/toss-mappings/actions.ts)
  - [ ] createMapping
  - [ ] updateMapping
  - [ ] deleteMapping
  - [ ] getMappings
  - [ ] getUnmappedItems
- [ ] SKU 매핑 목록 페이지 (app/dashboard/toss-mappings/page.tsx)
- [ ] SKU 매핑 등록/수정 폼
- [ ] 미매핑 항목 알림 표시

### 2.3 토스 API 연동
- [ ] 토스 API 클라이언트 모듈 (lib/toss/api.ts)
  - [ ] 인증 처리
  - [ ] 매출 데이터 조회
  - [ ] 에러 핸들링
- [ ] 환경변수 설정 (TOSS_API_KEY, TOSS_SECRET)

### 2.4 동기화 로직
- [ ] 동기화 서비스 (lib/toss/sync.ts)
  - [ ] 매출 데이터 수집
  - [ ] SKU 매핑 검증
  - [ ] sales_records 생성
  - [ ] 실패 기록 저장
- [ ] 동기화 스크립트 (scripts/sync-toss.ts)
- [ ] 수동 동기화 Server Action
- [ ] 동기화 로그 조회 페이지 (app/dashboard/toss-sync/page.tsx)

### 2.5 스케줄링
- [ ] 자동 동기화 cron job 설정 (vercel.json 또는 외부 스케줄러)
- [ ] 재시도 로직 구현

---

## Phase 3: 소진 예측 & 알림 (4~6주)

### 3.1 데이터베이스 스키마
- [ ] `inventory` 테이블 스키마 정의
- [ ] `inventory_alert_rules` 테이블 스키마 정의
- [ ] `inventory_events` 테이블 스키마 정의
- [ ] `alert_history` 테이블 스키마 정의
- [ ] 마이그레이션 생성 및 적용

### 3.2 재고 관리 기능
- [ ] 재고 Zod 스키마 정의
- [ ] 재고 현황 조회 Server Action
- [ ] 재고 조정 Server Action (폐기/실사/조정)
- [ ] 재고 현황 페이지 (app/dashboard/inventory/page.tsx)
- [ ] 재고 조정 폼

### 3.3 소진 예측 로직
- [ ] 예측 계산 모듈 (lib/inventory/prediction.ts)
  - [ ] 평균 일판매량 계산
  - [ ] 잔여일 계산
  - [ ] 이상치 제외 로직
- [ ] 예측 결과 표시 (재고 현황 페이지에 통합)

### 3.4 알림 규칙 관리
- [ ] 알림 규칙 Zod 스키마 정의
- [ ] 알림 규칙 CRUD Server Actions
- [ ] 알림 규칙 설정 페이지 (app/dashboard/inventory/alerts/page.tsx)

### 3.5 카카오 알림톡 연동
- [ ] 카카오 비즈메시지 API 클라이언트 (lib/kakao/alimtalk.ts)
  - [ ] 인증 처리
  - [ ] 템플릿 메시지 발송
  - [ ] 발송 결과 처리
- [ ] 환경변수 설정 (KAKAO_API_KEY 등)
- [ ] 알림 템플릿 등록 (카카오 비즈니스 센터)

### 3.6 알림 스케줄러
- [ ] 재고 체크 스크립트 (scripts/check-inventory.ts)
  - [ ] 모든 매장/품목 순회
  - [ ] 소진 예측 실행
  - [ ] 임계값 비교
  - [ ] 알림 발송 (중복 방지)
- [ ] cron job 설정 (매일 오전 8시)

---

## Phase 4: 원가율 분석 (4~6주)

### 4.1 원가율 계산 로직
- [ ] 원가율 계산 모듈 (lib/analysis/cost-rate.ts)
  - [ ] 기간별 매출 집계
  - [ ] 기간별 원가 집계
  - [ ] 원가율 계산
  - [ ] 전기 대비 변동 계산

### 4.2 분기 분석 대시보드
- [ ] 분기 선택 UI 컴포넌트
- [ ] 분기 KPI 요약 카드 컴포넌트
  - [ ] 총 매출액
  - [ ] 총 매출원가
  - [ ] 원가율 (전분기 대비)
  - [ ] 목표 달성률
- [ ] 분기 분석 페이지 (app/dashboard/analysis/quarterly/page.tsx)

### 4.3 매장별 원가율 비교
- [ ] 매장별 원가율 조회 Server Action
- [ ] 매장별 원가율 막대 차트 컴포넌트
- [ ] 신호등 표시 (목표 대비 상태)

### 4.4 메뉴별 원가율 분석
- [ ] 메뉴별 원가율 조회 Server Action
- [ ] 메뉴별 원가율 테이블 컴포넌트
  - [ ] 정렬 기능 (원가율 순)
  - [ ] 전분기 대비 증감 표시
- [ ] 고원가/저원가 메뉴 하이라이트

### 4.5 원가 변동 요인 분석
- [ ] 변동 요인 계산 로직
  - [ ] 재료 단가 변동 영향
  - [ ] 폐기/손실 영향
  - [ ] 판매 믹스 변화 영향
- [ ] 요인별 영향도 차트 컴포넌트

---

## 공통 작업

### 테스트
- [ ] Phase 1 통합 테스트
- [ ] Phase 2 통합 테스트 (토스 API 모킹)
- [ ] Phase 3 통합 테스트 (카카오 API 모킹)
- [ ] Phase 4 통합 테스트

### 문서화
- [ ] API 문서 업데이트 (토스/카카오 연동)
- [ ] 사용자 가이드 작성 (다매장/알림 설정)
- [ ] 운영 가이드 작성 (동기화/알림 모니터링)

### 배포
- [ ] 환경변수 설정 (Vercel)
- [ ] cron job 설정
- [ ] 모니터링 설정

---

## 우선순위 및 의존성

```
Phase 1 (다매장) ─────┬────> Phase 2 (토스 연동)
                      │
                      └────> Phase 3 (재고 알림) ────> Phase 4 (원가 분석)
```

- Phase 2, 3은 Phase 1 완료 후 병렬 진행 가능
- Phase 4는 Phase 3 완료 후 진행 (재고 데이터 필요)

---

*작성일: 2026-01-11*
*버전: 1.0*
