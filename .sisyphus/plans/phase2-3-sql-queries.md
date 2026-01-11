# Phase 2 & 3 SQL 쿼리

이 SQL 쿼리는 Phase 2 (토스 POS 연동)와 Phase 3 (재고 관리 & 알림)에서 추가된 테이블과 관련된 작업용입니다.

Neon SQL Editor 또는 터미널에서 순서대로 실행하세요.

---

## Phase 2: 토스 POS 연동

### 1. 토스 SKU 매핑 테이블 생성

```sql
CREATE TABLE IF NOT EXISTS toss_sku_mappings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id UUID NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
  toss_item_code VARCHAR(50) NOT NULL,
  toss_item_name VARCHAR(100),
  sku_id UUID REFERENCES skus(id) ON DELETE SET NULL,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
  created_by VARCHAR(100),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW(),  -- Fix duplicate column name
  updated_by VARCHAR(100),
  deleted_at TIMESTAMP,
  deleted_by VARCHAR(100),
  CONSTRAINT unique_store_toss_code UNIQUE(store_id, toss_item_code)
);
```

### 2. 토스 동기화 로그 테이블 생성

```sql
CREATE TABLE IF NOT EXISTS toss_sync_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id UUID NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
  sync_date DATE NOT NULL,
  sync_type VARCHAR(20) NOT NULL CHECK (sync_type IN ('auto', 'manual')),
  status VARCHAR(20) NOT NULL CHECK (status IN ('success', 'partial', 'failed')),
  total_records INTEGER,
  success_count INTEGER,
  failed_count INTEGER,
  error_details JSONB,
  started_at TIMESTAMP,
  completed_at TIMESTAMP,
  created_by VARCHAR(100)
);
```

### 3. sales_records에 toss_sync_id 컬럼 추가

```sql
ALTER TABLE sales_records ADD COLUMN IF NOT EXISTS toss_sync_id UUID REFERENCES toss_sync_logs(id);
```

---

## Phase 3: 재고 관리 & 알림

### 4. 재고 테이블 생성 (매장별 현재 재고)

```sql
CREATE TABLE IF NOT EXISTS inventory (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id UUID NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
  ingredient_id UUID NOT NULL REFERENCES ingredients(id) ON DELETE CASCADE,
  current_quantity DECIMAL(10,2) NOT NULL DEFAULT 0,
  unit VARCHAR(20),
  last_updated TIMESTAMP NOT NULL DEFAULT NOW(),
  CONSTRAINT unique_store_ingredient UNIQUE(store_id, ingredient_id)
);
```

### 5. 재고 알림 규칙 테이블 생성

```sql
CREATE TABLE IF NOT EXISTS inventory_alert_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id UUID REFERENCES stores(id) ON DELETE SET NULL,
  ingredient_id UUID NOT NULL REFERENCES ingredients(id) ON DELETE CASCADE,
  alert_threshold_days INTEGER NOT NULL DEFAULT 3 CHECK (alert_threshold_days >= 1),
  prediction_period_days INTEGER NOT NULL DEFAULT 30 CHECK (prediction_period_days >= 7 AND prediction_period_days <= 90),
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
  created_by VARCHAR(100),
  updated_by VARCHAR(100),
  deleted_at TIMESTAMP,
  deleted_by VARCHAR(100)
);
```

### 6. 재고 이벤트 테이블 생성 (폐기/실사/조정)

```sql
CREATE TABLE IF NOT EXISTS inventory_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id UUID NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
  ingredient_id UUID NOT NULL REFERENCES ingredients(id) ON DELETE CASCADE,
  event_type VARCHAR(20) NOT NULL CHECK (event_type IN ('purchase', 'sale', 'waste', 'audit', 'adjustment')),
  quantity_change DECIMAL(10,2) NOT NULL CHECK (quantity_change != 0),
  reason TEXT,
  event_date DATE NOT NULL,
  reference_id UUID,  -- 매입/판매 ID 참조
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  created_by VARCHAR(100)
);
```

### 7. 알림 발송 이력 테이블 생성

```sql
CREATE TABLE IF NOT EXISTS alert_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id UUID REFERENCES stores(id) ON DELETE SET NULL,
  alert_type VARCHAR(30) NOT NULL CHECK (alert_type IN ('inventory_low', 'sync_failed')),
  ingredient_id UUID REFERENCES ingredients(id) ON DELETE SET NULL,
  message TEXT,
  channel VARCHAR(20) NOT NULL DEFAULT 'kakao',
  recipient VARCHAR(50),
  status VARCHAR(20), -- 'sent', 'failed', 'logged'
  external_id VARCHAR(100),  -- 카카오 메시지 ID
  sent_at TIMESTAMP,
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);
```

---

## 인덱스 생성 (성능 최적화)

```sql
-- 토스 매핑 인덱스
CREATE INDEX IF NOT EXISTS idx_toss_mapping_store ON toss_sku_mappings(store_id);
CREATE INDEX IF NOT EXISTS idx_toss_mapping_sku ON toss_sku_mappings(sku_id);
CREATE INDEX IF NOT EXISTS idx_toss_mapping_active ON toss_sku_mappings(is_active);

-- 재고 인덱스
CREATE INDEX IF NOT EXISTS idx_inventory_store ON inventory(store_id);
CREATE INDEX IF NOT EXISTS idx_inventory_ingredient ON inventory(ingredient_id);
CREATE INDEX IF NOT EXISTS idx_inventory_updated ON inventory(last_updated);

-- 재고 이벤트 인덱스
CREATE INDEX IF NOT EXISTS idx_inventory_events_store_date ON inventory_events(store_id, event_date);
CREATE INDEX IF NOT EXISTS idx_inventory_events_ingredient ON inventory_events(ingredient_id);

-- 알림 규칙 인덱스
CREATE INDEX IF NOT EXISTS idx_alert_rules_store ON inventory_alert_rules(store_id);
CREATE INDEX IF NOT EXISTS idx_alert_rules_ingredient ON inventory_alert_rules(ingredient_id);
CREATE INDEX IF NOT EXISTS idx_alert_rules_active ON inventory_alert_rules(is_active);

-- 알림 이력 인덱스
CREATE INDEX IF NOT EXISTS idx_alert_history_store_type ON alert_history(store_id, alert_type);
CREATE INDEX IF NOT EXISTS idx_alert_history_created ON alert_history(created_at);
```

---

## 초기 데이터 설정 (선택사항)

### 기본 매장 확인
```sql
SELECT id, store_name, store_code FROM stores WHERE store_code = 'MAIN';
```

### 인덱스 확인
```sql
SELECT indexname, indexdef 
FROM pg_indexes 
WHERE tablename = 'inventory';
```

### 재고 초기화 (필요시)

```sql
-- 모든 재고를 0으로 초기화 (주의: 사용 시 주의!)
UPDATE inventory 
SET current_quantity = 0,
    last_updated = NOW()
WHERE deleted_at IS NULL;
```

---

## 실행 순서

1. Phase 2 테이블 생성 (순서대로)
2. Phase 3 테이블 생성 (순서대로)
3. 인덱스 생성 (순서대로)
4. (선택) 재고 초기화 또는 초기 데이터 입력
5. 애플리케이션에서 기능 테스트

---

## 트러블슈팅 (문제 발생 시)

```sql
-- 문제가 있으면 롤백
ROLLBACK;

-- 특정 테이블 삭제
-- DROP TABLE IF EXISTS inventory CASCADE;
```

---

*생성일: 2026-01-11*
*버전: 1.0*
