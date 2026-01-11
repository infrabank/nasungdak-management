# 데이터 모델 변경 상세 설계

## 개요

나성닭강정 매장관리 10배 개선을 위한 데이터베이스 스키마 변경 사항을 정의합니다.

---

## 1. 신규 테이블

### 1.1 stores (매장)

매장 정보를 관리하는 테이블입니다.

| 컬럼명 | 타입 | 제약조건 | 설명 |
|--------|------|----------|------|
| id | SERIAL | PK | 매장 고유 ID |
| store_name | VARCHAR(100) | NOT NULL | 매장명 |
| store_code | VARCHAR(20) | UNIQUE, NOT NULL | 매장 코드 (예: STORE001) |
| address | TEXT | | 매장 주소 |
| phone | VARCHAR(20) | | 매장 연락처 |
| manager_phone | VARCHAR(20) | | 관리자 연락처 (알림 수신) |
| is_active | BOOLEAN | DEFAULT true | 활성 상태 |
| created_at | TIMESTAMP | DEFAULT NOW() | 생성일시 |
| created_by | VARCHAR(50) | | 생성자 |
| updated_at | TIMESTAMP | | 수정일시 |
| updated_by | VARCHAR(50) | | 수정자 |
| deleted_at | TIMESTAMP | | 삭제일시 (soft delete) |
| deleted_by | VARCHAR(50) | | 삭제자 |

**Drizzle 스키마:**
```typescript
export const stores = pgTable('stores', {
  id: serial('id').primaryKey(),
  storeName: varchar('store_name', { length: 100 }).notNull(),
  storeCode: varchar('store_code', { length: 20 }).unique().notNull(),
  address: text('address'),
  phone: varchar('phone', { length: 20 }),
  managerPhone: varchar('manager_phone', { length: 20 }),
  isActive: boolean('is_active').default(true),
  createdAt: timestamp('created_at').defaultNow(),
  createdBy: varchar('created_by', { length: 50 }),
  updatedAt: timestamp('updated_at'),
  updatedBy: varchar('updated_by', { length: 50 }),
  deletedAt: timestamp('deleted_at'),
  deletedBy: varchar('deleted_by', { length: 50 }),
});
```

---

### 1.2 toss_sku_mappings (토스 SKU 매핑)

토스 POS 품목과 내부 SKU를 매핑하는 테이블입니다.

| 컬럼명 | 타입 | 제약조건 | 설명 |
|--------|------|----------|------|
| id | SERIAL | PK | 매핑 고유 ID |
| store_id | INTEGER | FK(stores.id), NOT NULL | 매장 ID |
| toss_item_code | VARCHAR(50) | NOT NULL | 토스 품목 코드 |
| toss_item_name | VARCHAR(100) | | 토스 품목명 |
| sku_id | INTEGER | FK(skus.id) | 내부 SKU ID (NULL이면 미매핑) |
| is_active | BOOLEAN | DEFAULT true | 활성 상태 |
| created_at | TIMESTAMP | DEFAULT NOW() | 생성일시 |
| created_by | VARCHAR(50) | | 생성자 |
| updated_at | TIMESTAMP | | 수정일시 |
| updated_by | VARCHAR(50) | | 수정자 |

**복합 유니크:** (store_id, toss_item_code)

**Drizzle 스키마:**
```typescript
export const tossSkuMappings = pgTable('toss_sku_mappings', {
  id: serial('id').primaryKey(),
  storeId: integer('store_id').notNull().references(() => stores.id),
  tossItemCode: varchar('toss_item_code', { length: 50 }).notNull(),
  tossItemName: varchar('toss_item_name', { length: 100 }),
  skuId: integer('sku_id').references(() => skus.id),
  isActive: boolean('is_active').default(true),
  createdAt: timestamp('created_at').defaultNow(),
  createdBy: varchar('created_by', { length: 50 }),
  updatedAt: timestamp('updated_at'),
  updatedBy: varchar('updated_by', { length: 50 }),
}, (table) => ({
  uniqueStoreItem: unique().on(table.storeId, table.tossItemCode),
}));
```

---

### 1.3 toss_sync_logs (토스 동기화 로그)

토스 POS 동기화 이력을 기록하는 테이블입니다.

| 컬럼명 | 타입 | 제약조건 | 설명 |
|--------|------|----------|------|
| id | SERIAL | PK | 로그 고유 ID |
| store_id | INTEGER | FK(stores.id), NOT NULL | 매장 ID |
| sync_date | DATE | NOT NULL | 동기화 대상 날짜 |
| sync_type | VARCHAR(20) | NOT NULL | 동기화 유형 (auto/manual) |
| status | VARCHAR(20) | NOT NULL | 상태 (success/partial/failed) |
| total_records | INTEGER | | 전체 레코드 수 |
| success_count | INTEGER | | 성공 건수 |
| failed_count | INTEGER | | 실패 건수 |
| error_details | JSONB | | 에러 상세 (실패 항목 목록) |
| started_at | TIMESTAMP | | 시작 시각 |
| completed_at | TIMESTAMP | | 완료 시각 |
| created_by | VARCHAR(50) | | 실행자 |

**Drizzle 스키마:**
```typescript
export const tossSyncLogs = pgTable('toss_sync_logs', {
  id: serial('id').primaryKey(),
  storeId: integer('store_id').notNull().references(() => stores.id),
  syncDate: date('sync_date').notNull(),
  syncType: varchar('sync_type', { length: 20 }).notNull(), // 'auto' | 'manual'
  status: varchar('status', { length: 20 }).notNull(), // 'success' | 'partial' | 'failed'
  totalRecords: integer('total_records'),
  successCount: integer('success_count'),
  failedCount: integer('failed_count'),
  errorDetails: jsonb('error_details'),
  startedAt: timestamp('started_at'),
  completedAt: timestamp('completed_at'),
  createdBy: varchar('created_by', { length: 50 }),
});
```

---

### 1.4 inventory (재고)

매장별 현재 재고를 관리하는 테이블입니다.

| 컬럼명 | 타입 | 제약조건 | 설명 |
|--------|------|----------|------|
| id | SERIAL | PK | 재고 고유 ID |
| store_id | INTEGER | FK(stores.id), NOT NULL | 매장 ID |
| ingredient_id | INTEGER | FK(ingredients.id), NOT NULL | 재료 ID |
| current_quantity | DECIMAL(10,2) | NOT NULL, DEFAULT 0 | 현재 재고량 |
| unit | VARCHAR(20) | | 단위 (재료 테이블과 동기화) |
| last_updated | TIMESTAMP | DEFAULT NOW() | 마지막 갱신 시각 |

**복합 유니크:** (store_id, ingredient_id)

**Drizzle 스키마:**
```typescript
export const inventory = pgTable('inventory', {
  id: serial('id').primaryKey(),
  storeId: integer('store_id').notNull().references(() => stores.id),
  ingredientId: integer('ingredient_id').notNull().references(() => ingredients.id),
  currentQuantity: decimal('current_quantity', { precision: 10, scale: 2 }).notNull().default('0'),
  unit: varchar('unit', { length: 20 }),
  lastUpdated: timestamp('last_updated').defaultNow(),
}, (table) => ({
  uniqueStoreIngredient: unique().on(table.storeId, table.ingredientId),
}));
```

---

### 1.5 inventory_alert_rules (재고 알림 규칙)

품목별 재고 알림 임계값을 설정하는 테이블입니다.

| 컬럼명 | 타입 | 제약조건 | 설명 |
|--------|------|----------|------|
| id | SERIAL | PK | 규칙 고유 ID |
| store_id | INTEGER | FK(stores.id) | 매장 ID (NULL이면 전체 적용) |
| ingredient_id | INTEGER | FK(ingredients.id), NOT NULL | 재료 ID |
| alert_threshold_days | INTEGER | DEFAULT 3 | 알림 임계값 (잔여일) |
| prediction_period_days | INTEGER | DEFAULT 14 | 예측 기간 (일) |
| is_active | BOOLEAN | DEFAULT true | 활성 상태 |
| created_at | TIMESTAMP | DEFAULT NOW() | 생성일시 |
| created_by | VARCHAR(50) | | 생성자 |
| updated_at | TIMESTAMP | | 수정일시 |
| updated_by | VARCHAR(50) | | 수정자 |

**복합 유니크:** (store_id, ingredient_id)

**Drizzle 스키마:**
```typescript
export const inventoryAlertRules = pgTable('inventory_alert_rules', {
  id: serial('id').primaryKey(),
  storeId: integer('store_id').references(() => stores.id),
  ingredientId: integer('ingredient_id').notNull().references(() => ingredients.id),
  alertThresholdDays: integer('alert_threshold_days').default(3),
  predictionPeriodDays: integer('prediction_period_days').default(14),
  isActive: boolean('is_active').default(true),
  createdAt: timestamp('created_at').defaultNow(),
  createdBy: varchar('created_by', { length: 50 }),
  updatedAt: timestamp('updated_at'),
  updatedBy: varchar('updated_by', { length: 50 }),
}, (table) => ({
  uniqueStoreIngredient: unique().on(table.storeId, table.ingredientId),
}));
```

---

### 1.6 inventory_events (재고 이벤트)

폐기, 실사, 조정 등 재고 변동 이벤트를 기록하는 테이블입니다.

| 컬럼명 | 타입 | 제약조건 | 설명 |
|--------|------|----------|------|
| id | SERIAL | PK | 이벤트 고유 ID |
| store_id | INTEGER | FK(stores.id), NOT NULL | 매장 ID |
| ingredient_id | INTEGER | FK(ingredients.id), NOT NULL | 재료 ID |
| event_type | VARCHAR(20) | NOT NULL | 이벤트 유형 (waste/audit/adjustment) |
| quantity_change | DECIMAL(10,2) | NOT NULL | 변동량 (음수: 감소, 양수: 증가) |
| reason | TEXT | | 사유 |
| event_date | DATE | NOT NULL | 이벤트 날짜 |
| created_at | TIMESTAMP | DEFAULT NOW() | 생성일시 |
| created_by | VARCHAR(50) | | 생성자 |

**Drizzle 스키마:**
```typescript
export const inventoryEvents = pgTable('inventory_events', {
  id: serial('id').primaryKey(),
  storeId: integer('store_id').notNull().references(() => stores.id),
  ingredientId: integer('ingredient_id').notNull().references(() => ingredients.id),
  eventType: varchar('event_type', { length: 20 }).notNull(), // 'waste' | 'audit' | 'adjustment'
  quantityChange: decimal('quantity_change', { precision: 10, scale: 2 }).notNull(),
  reason: text('reason'),
  eventDate: date('event_date').notNull(),
  createdAt: timestamp('created_at').defaultNow(),
  createdBy: varchar('created_by', { length: 50 }),
});
```

---

### 1.7 alert_history (알림 발송 이력)

알림 발송 이력을 기록하는 테이블입니다.

| 컬럼명 | 타입 | 제약조건 | 설명 |
|--------|------|----------|------|
| id | SERIAL | PK | 이력 고유 ID |
| store_id | INTEGER | FK(stores.id) | 매장 ID |
| alert_type | VARCHAR(30) | NOT NULL | 알림 유형 (inventory_low/sync_failed) |
| ingredient_id | INTEGER | FK(ingredients.id) | 재료 ID (재고 알림인 경우) |
| message | TEXT | | 알림 메시지 |
| channel | VARCHAR(20) | DEFAULT 'kakao' | 발송 채널 |
| recipient | VARCHAR(50) | | 수신자 (전화번호) |
| status | VARCHAR(20) | | 발송 상태 (sent/failed) |
| external_id | VARCHAR(100) | | 외부 시스템 ID (카카오 메시지 ID) |
| sent_at | TIMESTAMP | | 발송 시각 |
| created_at | TIMESTAMP | DEFAULT NOW() | 생성일시 |

**Drizzle 스키마:**
```typescript
export const alertHistory = pgTable('alert_history', {
  id: serial('id').primaryKey(),
  storeId: integer('store_id').references(() => stores.id),
  alertType: varchar('alert_type', { length: 30 }).notNull(),
  ingredientId: integer('ingredient_id').references(() => ingredients.id),
  message: text('message'),
  channel: varchar('channel', { length: 20 }).default('kakao'),
  recipient: varchar('recipient', { length: 50 }),
  status: varchar('status', { length: 20 }),
  externalId: varchar('external_id', { length: 100 }),
  sentAt: timestamp('sent_at'),
  createdAt: timestamp('created_at').defaultNow(),
});
```

---

## 2. 기존 테이블 수정

### 2.1 purchase_transactions

| 변경 | 컬럼명 | 타입 | 설명 |
|------|--------|------|------|
| ADD | store_id | INTEGER FK(stores.id) | 매장 ID |

```typescript
// 스키마 수정
storeId: integer('store_id').references(() => stores.id),
```

### 2.2 sales_records

| 변경 | 컬럼명 | 타입 | 설명 |
|------|--------|------|------|
| ADD | store_id | INTEGER FK(stores.id) | 매장 ID |
| ADD | toss_sync_id | INTEGER FK(toss_sync_logs.id) | 토스 동기화 ID |

```typescript
// 스키마 수정
storeId: integer('store_id').references(() => stores.id),
tossSyncId: integer('toss_sync_id').references(() => tossSyncLogs.id),
```

---

## 3. 마이그레이션 순서

1. `stores` 테이블 생성
2. `purchase_transactions`에 `store_id` 추가 (nullable)
3. `sales_records`에 `store_id` 추가 (nullable)
4. 기존 데이터에 기본 매장(id=1) 할당
5. `store_id` NOT NULL 제약 추가
6. `toss_sku_mappings` 테이블 생성
7. `toss_sync_logs` 테이블 생성
8. `sales_records`에 `toss_sync_id` 추가
9. `inventory` 테이블 생성
10. `inventory_alert_rules` 테이블 생성
11. `inventory_events` 테이블 생성
12. `alert_history` 테이블 생성

---

## 4. 인덱스 권장

```sql
-- 자주 사용되는 조회 패턴에 대한 인덱스
CREATE INDEX idx_purchase_store_date ON purchase_transactions(store_id, transaction_date);
CREATE INDEX idx_sales_store_date ON sales_records(store_id, sale_date);
CREATE INDEX idx_inventory_store ON inventory(store_id);
CREATE INDEX idx_toss_sync_store_date ON toss_sync_logs(store_id, sync_date);
CREATE INDEX idx_alert_history_store_type ON alert_history(store_id, alert_type, created_at);
```

---

## 5. 관계도 (ERD 요약)

```
stores
  │
  ├── purchase_transactions (store_id)
  ├── sales_records (store_id, toss_sync_id)
  ├── toss_sku_mappings (store_id)
  ├── toss_sync_logs (store_id)
  ├── inventory (store_id)
  ├── inventory_alert_rules (store_id)
  ├── inventory_events (store_id)
  └── alert_history (store_id)

skus
  └── toss_sku_mappings (sku_id)

ingredients
  ├── inventory (ingredient_id)
  ├── inventory_alert_rules (ingredient_id)
  ├── inventory_events (ingredient_id)
  └── alert_history (ingredient_id)

toss_sync_logs
  └── sales_records (toss_sync_id)
```

---

*작성일: 2026-01-11*
*버전: 1.0*
