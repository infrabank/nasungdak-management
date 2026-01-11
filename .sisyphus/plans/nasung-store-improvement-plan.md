# 나성닭강정 매장관리 10배 개선안 (계획서)

## 1. 목표
- 분기 기준 원가율 3%p 개선
- 재고 부족 사전 예측 + 카카오톡 알림 자동화
- 토스 POS 매출 연동 기반의 실시간 재고/원가 정확도 향상
- 다매장 확장 가능한 데이터/운영 구조 확립

## 2. 범위
- 다매장 확장 구조 설계
- 토스 POS 매출 동기화 설계
- 소진 예측 기반 재고 알람 설계
- 원가율 개선 대시보드 및 분석 기능 설계

## 3. 전제/조건
- POS 연동: 토스
- 알림 채널: 카카오톡
- 재고 부족 기준: 기간 소진 예측
- 다매장 간 재고 이동 기능: 제외
- 원가율 개선 목표 기간: 분기

---

## 4. 핵심 개선안 요약

### 4.1 다매장 구조
- `stores` 테이블: 매장 메타정보 (이름, 주소, 연락처, 활성 상태)
- 핵심 테이블에 `store_id` FK 추가 (purchase_transactions, sales_records, inventory 등)
- 공통 마스터(메뉴/재료/SKU)는 전체 공유, 매장별 재고/매출/매입은 분리

### 4.2 토스 POS 연동
- `toss_sku_mappings` 테이블: 토스 품목코드 <-> 내부 SKU ID 매핑
- `toss_sync_logs` 테이블: 동기화 이력 및 실패 기록
- 동기화 방식: 일별 배치 + 수동 재동기화 버튼
- 오류 대응: 미매핑 SKU 감지 -> 관리자 알림 -> 재처리 큐

### 4.3 소진 예측 & 알림
- 예측 공식: `현재재고 / 최근평균일판매량`
- 예측 기간: 기본 14일 (설정 가능)
- 알림 기준: 잔여일 <= 3일 (품목별 조정 가능)
- 알림 채널: 카카오톡 알림톡 (템플릿 메시지)
- 알림 빈도: 임계치 진입 시 1회 발송

### 4.4 원가율 개선 분석
- 분기 원가율 KPI 대시보드 (매장별/전체)
- 메뉴별 원가율 변화 추적
- 악화 요인 진단: 재료 단가 상승, 폐기/조정 증가, 판매 믹스 변화

---

## 5. 데이터 모델 변경

### 5.1 신규 테이블

```sql
-- 매장 테이블
CREATE TABLE stores (
  id SERIAL PRIMARY KEY,
  store_name VARCHAR(100) NOT NULL,
  store_code VARCHAR(20) UNIQUE NOT NULL,
  address TEXT,
  phone VARCHAR(20),
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT NOW(),
  created_by VARCHAR(50),
  updated_at TIMESTAMP,
  updated_by VARCHAR(50),
  deleted_at TIMESTAMP,
  deleted_by VARCHAR(50)
);

-- 토스 SKU 매핑 테이블
CREATE TABLE toss_sku_mappings (
  id SERIAL PRIMARY KEY,
  store_id INTEGER REFERENCES stores(id),
  toss_item_code VARCHAR(50) NOT NULL,
  toss_item_name VARCHAR(100),
  sku_id INTEGER REFERENCES skus(id),
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT NOW(),
  created_by VARCHAR(50),
  updated_at TIMESTAMP,
  updated_by VARCHAR(50),
  UNIQUE(store_id, toss_item_code)
);

-- 토스 동기화 로그 테이블
CREATE TABLE toss_sync_logs (
  id SERIAL PRIMARY KEY,
  store_id INTEGER REFERENCES stores(id),
  sync_date DATE NOT NULL,
  sync_type VARCHAR(20) NOT NULL, -- 'auto', 'manual'
  status VARCHAR(20) NOT NULL, -- 'success', 'partial', 'failed'
  total_records INTEGER,
  success_count INTEGER,
  failed_count INTEGER,
  error_details JSONB,
  started_at TIMESTAMP,
  completed_at TIMESTAMP,
  created_by VARCHAR(50)
);

-- 재고 테이블 (매장별 현재 재고)
CREATE TABLE inventory (
  id SERIAL PRIMARY KEY,
  store_id INTEGER REFERENCES stores(id) NOT NULL,
  ingredient_id INTEGER REFERENCES ingredients(id) NOT NULL,
  current_quantity DECIMAL(10,2) NOT NULL DEFAULT 0,
  unit VARCHAR(20),
  last_updated TIMESTAMP DEFAULT NOW(),
  UNIQUE(store_id, ingredient_id)
);

-- 재고 알림 규칙 테이블
CREATE TABLE inventory_alert_rules (
  id SERIAL PRIMARY KEY,
  store_id INTEGER REFERENCES stores(id),
  ingredient_id INTEGER REFERENCES ingredients(id),
  alert_threshold_days INTEGER DEFAULT 3,
  prediction_period_days INTEGER DEFAULT 14,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT NOW(),
  created_by VARCHAR(50),
  updated_at TIMESTAMP,
  updated_by VARCHAR(50),
  UNIQUE(store_id, ingredient_id)
);

-- 재고 이벤트 테이블 (폐기/실사/조정)
CREATE TABLE inventory_events (
  id SERIAL PRIMARY KEY,
  store_id INTEGER REFERENCES stores(id) NOT NULL,
  ingredient_id INTEGER REFERENCES ingredients(id) NOT NULL,
  event_type VARCHAR(20) NOT NULL, -- 'waste', 'audit', 'adjustment'
  quantity_change DECIMAL(10,2) NOT NULL,
  reason TEXT,
  event_date DATE NOT NULL,
  created_at TIMESTAMP DEFAULT NOW(),
  created_by VARCHAR(50)
);

-- 알림 발송 이력 테이블
CREATE TABLE alert_history (
  id SERIAL PRIMARY KEY,
  store_id INTEGER REFERENCES stores(id),
  alert_type VARCHAR(30) NOT NULL, -- 'inventory_low', 'sync_failed'
  ingredient_id INTEGER REFERENCES ingredients(id),
  message TEXT,
  channel VARCHAR(20) DEFAULT 'kakao',
  status VARCHAR(20), -- 'sent', 'failed'
  sent_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW()
);
```

### 5.2 기존 테이블 수정

```sql
-- purchase_transactions에 store_id 추가
ALTER TABLE purchase_transactions ADD COLUMN store_id INTEGER REFERENCES stores(id);

-- sales_records에 store_id 추가
ALTER TABLE sales_records ADD COLUMN store_id INTEGER REFERENCES stores(id);

-- sales_records에 toss_sync_id 추가 (토스 연동 추적용)
ALTER TABLE sales_records ADD COLUMN toss_sync_id INTEGER REFERENCES toss_sync_logs(id);
```

---

## 6. 토스 POS 연동 설계

### 6.1 동기화 흐름
```
[토스 POS] --> [매출 데이터 수집] --> [SKU 매핑 검증]
                                          |
                    +---------------------+---------------------+
                    |                                           |
              [매핑 성공]                                  [매핑 실패]
                    |                                           |
          [sales_records 생성]                      [미매핑 목록 저장]
          [inventory 차감]                          [관리자 알림 발송]
                    |                                           |
              [sync_log 성공]                          [sync_log 부분실패]
```

### 6.2 동기화 정책
- 자동 동기화: 매일 오전 6시 (전일 매출)
- 수동 동기화: 관리자 버튼 클릭
- 재시도: 실패 시 3회까지 자동 재시도 (10분 간격)
- 중복 방지: sync_date + store_id + toss_item_code 조합으로 중복 체크

### 6.3 토스 API 연동 (예상)
- 엔드포인트: 토스 비즈니스 API (매출 조회)
- 인증: API Key + Secret
- 데이터: 일별 품목별 판매량, 매출액

---

## 7. 소진 예측 & 알림 설계

### 7.1 예측 로직
```typescript
// 소진 예측 계산
function calculateDaysRemaining(
  currentStock: number,
  salesHistory: { date: Date; quantity: number }[],
  periodDays: number = 14
): number {
  const recentSales = salesHistory.filter(
    s => s.date >= subDays(new Date(), periodDays)
  );
  
  const totalSold = recentSales.reduce((sum, s) => sum + s.quantity, 0);
  const avgDailySales = totalSold / periodDays;
  
  if (avgDailySales <= 0) return Infinity; // 판매 없음
  
  return Math.floor(currentStock / avgDailySales);
}
```

### 7.2 알림 정책
- 체크 주기: 매일 오전 8시
- 알림 조건: 예측 잔여일 <= 임계값 (기본 3일)
- 알림 빈도: 임계치 진입 시 1회 (재진입 시 재발송)
- 알림 내용:
  ```
  [나성닭강정] 재고 부족 알림
  
  매장: {store_name}
  재료: {ingredient_name}
  현재 재고: {current_quantity}{unit}
  예상 소진일: {days_remaining}일
  
  발주를 검토해 주세요.
  ```

### 7.3 카카오톡 알림톡 연동
- 서비스: 카카오 비즈메시지 API
- 템플릿: 사전 등록 필요
- 수신자: 매장 관리자 전화번호

---

## 8. 원가율 개선 분석 설계

### 8.1 KPI 계산식
```
매출총이익 = 매출액 - 매출원가(COGS)
매출총이익률(%) = (매출총이익 / 매출액) * 100
원가율(%) = (매출원가 / 매출액) * 100

목표: 원가율 3%p 개선 (예: 35% -> 32%)
```

### 8.2 대시보드 구성
1. **분기 요약 카드**
   - 총 매출액
   - 총 매출원가
   - 원가율 (전분기 대비 증감)
   - 목표 달성률

2. **매장별 원가율 비교**
   - 막대 차트: 매장별 원가율
   - 신호등 표시: 목표 대비 상태

3. **메뉴별 원가율 분석**
   - 테이블: 메뉴, 매출, 원가, 원가율, 전분기 대비
   - 정렬: 원가율 악화 순

4. **원가율 변동 요인 분석**
   - 재료 단가 변동 영향
   - 폐기/손실 영향
   - 판매 믹스 변화 영향

### 8.3 알림 (선택)
- 월간 원가율 목표 초과 시 관리자 알림

---

## 9. 단계별 실행 로드맵

### Phase 1: 다매장 기반 구조 (2~3주)
| 작업 | 산출물 | 검수 기준 |
|------|--------|-----------|
| stores 테이블 생성 | 마이그레이션 | DB 반영 완료 |
| 기존 테이블 store_id 추가 | 마이그레이션 | 기존 데이터 기본 매장 할당 |
| 매장 관리 CRUD | 페이지 + actions | 등록/수정/삭제/목록 동작 |
| 매장별 필터 적용 | 대시보드 수정 | 매장 선택 시 데이터 분리 |

### Phase 2: 토스 POS 연동 (3~5주)
| 작업 | 산출물 | 검수 기준 |
|------|--------|-----------|
| toss_sku_mappings 테이블 | 마이그레이션 | DB 반영 완료 |
| SKU 매핑 관리 UI | 페이지 + actions | 매핑 등록/수정/삭제 |
| 토스 API 연동 모듈 | lib/toss/api.ts | 매출 데이터 수집 성공 |
| 동기화 로직 | scripts/sync-toss.ts | 자동/수동 동기화 동작 |
| 동기화 로그 UI | 페이지 | 이력 조회 가능 |

### Phase 3: 소진 예측 & 알림 (4~6주)
| 작업 | 산출물 | 검수 기준 |
|------|--------|-----------|
| inventory 테이블 | 마이그레이션 | DB 반영 완료 |
| 재고 현황 페이지 | 페이지 | 매장별 재고 조회 |
| 소진 예측 로직 | lib/inventory/prediction.ts | 잔여일 계산 정확 |
| 알림 규칙 관리 | 페이지 + actions | 품목별 임계값 설정 |
| 카카오 알림톡 연동 | lib/kakao/alimtalk.ts | 테스트 발송 성공 |
| 알림 스케줄러 | scripts/check-inventory.ts | 조건 충족 시 발송 |

### Phase 4: 원가율 분석 (4~6주)
| 작업 | 산출물 | 검수 기준 |
|------|--------|-----------|
| 분기 KPI 계산 로직 | lib/analysis/cost-rate.ts | 계산 정확성 검증 |
| 분기 분석 대시보드 | 페이지 | 매장별/전체 KPI 표시 |
| 메뉴별 원가율 분석 | 컴포넌트 | 정렬/필터 동작 |
| 원가 변동 요인 분석 | 컴포넌트 | 요인별 영향도 표시 |

---

## 10. 성공 지표

| 지표 | 현재 (추정) | 목표 | 측정 방법 |
|------|-------------|------|-----------|
| 분기 원가율 | 35% | 32% (-3%p) | 분기 분석 리포트 |
| 재고 부족 발생 | 월 N회 | 50% 감소 | 알림 이력 / 긴급 발주 건수 |
| 매출 누락 | 수동 입력 오류 | 0% | 토스 동기화 정합성 |
| 다매장 KPI 비교 | 불가 | 가능 | 대시보드 기능 |

---

## 11. 리스크 및 대응

| 리스크 | 영향 | 대응 방안 |
|--------|------|-----------|
| 토스 API 변경/제한 | 동기화 실패 | API 버전 모니터링, 수동 입력 fallback |
| SKU 매핑 누락 | 매출 누락 | 미매핑 감지 알림, 재처리 큐 |
| 예측 오차 (판매 급변) | 잘못된 알림 | 기준 기간 조정, 이상치 제외 로직 |
| 카카오 알림톡 발송 실패 | 알림 누락 | 재시도 로직, 이메일 fallback |
| 다매장 데이터 혼합 | 잘못된 분석 | store_id 필수 필터 정책 강제 |

---

## 12. 정책 확정 사항

- **예측 기간**: 기본 14일 (품목별 조정 가능)
- **알림 빈도**: 임계치 진입 시 1회 발송
- **마스터 데이터**: 공통 + 매장별 재고/매출/매입 분리
- **동기화 주기**: 일 1회 자동 + 수동 트리거

---

## 13. 다음 단계

1. Phase 1 작업 착수 (다매장 구조)
2. 토스 API 문서 확보 및 연동 테스트
3. 카카오 알림톡 템플릿 등록 신청
4. 기존 데이터 기본 매장 마이그레이션 계획

---

*작성일: 2026-01-11*
*버전: 1.0*
