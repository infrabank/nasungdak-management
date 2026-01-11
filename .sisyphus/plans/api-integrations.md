# 외부 API 연동 설계

## 개요

나성닭강정 매장관리 시스템의 외부 API 연동 상세 설계입니다.

---

## 1. 토스 POS 연동

### 1.1 연동 목적
- 토스 POS에서 발생한 매출 데이터를 자동으로 수집
- 수동 입력 오류 제거 및 실시간 매출 파악
- SKU별 판매량 기반 재고 자동 차감

### 1.2 토스 비즈니스 API 개요

> **참고**: 실제 API 스펙은 토스 비즈니스 파트너 가입 후 확인 필요

**예상 엔드포인트:**
```
Base URL: https://api.tosspayments.com/v1/
인증: Authorization: Bearer {API_KEY}
```

**일별 매출 조회 (예상):**
```http
GET /sales/daily?date=2026-01-11&storeId={TOSS_STORE_ID}

Response:
{
  "date": "2026-01-11",
  "storeId": "TOSS_STORE_001",
  "items": [
    {
      "itemCode": "ITEM001",
      "itemName": "닭강정(중)",
      "quantity": 50,
      "unitPrice": 15000,
      "totalAmount": 750000
    },
    ...
  ],
  "totalSales": 3500000
}
```

### 1.3 환경변수

```env
# .env
TOSS_API_KEY=your_toss_api_key
TOSS_SECRET_KEY=your_toss_secret_key
TOSS_STORE_ID=your_toss_store_id
```

### 1.4 API 클라이언트 설계

**파일: `lib/toss/api.ts`**

```typescript
import { z } from 'zod';

// 응답 스키마
const TossSalesItemSchema = z.object({
  itemCode: z.string(),
  itemName: z.string(),
  quantity: z.number(),
  unitPrice: z.number(),
  totalAmount: z.number(),
});

const TossDailySalesSchema = z.object({
  date: z.string(),
  storeId: z.string(),
  items: z.array(TossSalesItemSchema),
  totalSales: z.number(),
});

export type TossDailySales = z.infer<typeof TossDailySalesSchema>;
export type TossSalesItem = z.infer<typeof TossSalesItemSchema>;

// API 클라이언트
export class TossApiClient {
  private apiKey: string;
  private baseUrl = 'https://api.tosspayments.com/v1';

  constructor() {
    const apiKey = process.env.TOSS_API_KEY;
    if (!apiKey) {
      throw new Error('TOSS_API_KEY is not configured');
    }
    this.apiKey = apiKey;
  }

  private async request<T>(endpoint: string, options?: RequestInit): Promise<T> {
    const response = await fetch(`${this.baseUrl}${endpoint}`, {
      ...options,
      headers: {
        'Authorization': `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json',
        ...options?.headers,
      },
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      throw new TossApiError(response.status, error.message || 'API request failed');
    }

    return response.json();
  }

  async getDailySales(date: string, tossStoreId: string): Promise<TossDailySales> {
    const data = await this.request<unknown>(
      `/sales/daily?date=${date}&storeId=${tossStoreId}`
    );
    return TossDailySalesSchema.parse(data);
  }
}

export class TossApiError extends Error {
  constructor(
    public statusCode: number,
    message: string
  ) {
    super(message);
    this.name = 'TossApiError';
  }
}
```

### 1.5 동기화 서비스 설계

**파일: `lib/toss/sync.ts`**

```typescript
import { db } from '@/lib/db';
import { salesRecords, tossSkuMappings, tossSyncLogs, inventory } from '@/lib/db/schema';
import { TossApiClient, TossDailySales } from './api';
import { eq, and } from 'drizzle-orm';

interface SyncResult {
  success: boolean;
  syncLogId: number;
  totalRecords: number;
  successCount: number;
  failedCount: number;
  unmappedItems: string[];
  errors: string[];
}

export class TossSyncService {
  private apiClient: TossApiClient;

  constructor() {
    this.apiClient = new TossApiClient();
  }

  async syncDailySales(
    storeId: number,
    tossStoreId: string,
    date: string,
    syncType: 'auto' | 'manual' = 'auto'
  ): Promise<SyncResult> {
    const startedAt = new Date();
    const errors: string[] = [];
    const unmappedItems: string[] = [];
    let successCount = 0;
    let failedCount = 0;

    // 1. 동기화 로그 시작
    const [syncLog] = await db.insert(tossSyncLogs).values({
      storeId,
      syncDate: date,
      syncType,
      status: 'running',
      startedAt,
      createdBy: 'system',
    }).returning();

    try {
      // 2. 토스 API에서 매출 데이터 조회
      const salesData = await this.apiClient.getDailySales(date, tossStoreId);

      // 3. SKU 매핑 조회
      const mappings = await db.select()
        .from(tossSkuMappings)
        .where(and(
          eq(tossSkuMappings.storeId, storeId),
          eq(tossSkuMappings.isActive, true)
        ));

      const mappingMap = new Map(
        mappings.map(m => [m.tossItemCode, m.skuId])
      );

      // 4. 각 품목 처리
      for (const item of salesData.items) {
        const skuId = mappingMap.get(item.itemCode);

        if (!skuId) {
          // 미매핑 품목
          unmappedItems.push(`${item.itemCode}: ${item.itemName}`);
          failedCount++;
          continue;
        }

        try {
          // 판매 기록 생성
          await db.insert(salesRecords).values({
            storeId,
            skuId,
            saleDate: date,
            quantitySold: item.quantity,
            tossSyncId: syncLog.id,
            createdBy: 'toss_sync',
          });

          // TODO: 재고 차감 로직 (Phase 3에서 구현)

          successCount++;
        } catch (error) {
          errors.push(`Failed to process ${item.itemCode}: ${error}`);
          failedCount++;
        }
      }

      // 5. 동기화 로그 완료
      const status = failedCount === 0 ? 'success' : 
                     successCount === 0 ? 'failed' : 'partial';

      await db.update(tossSyncLogs)
        .set({
          status,
          totalRecords: salesData.items.length,
          successCount,
          failedCount,
          errorDetails: { errors, unmappedItems },
          completedAt: new Date(),
        })
        .where(eq(tossSyncLogs.id, syncLog.id));

      return {
        success: failedCount === 0,
        syncLogId: syncLog.id,
        totalRecords: salesData.items.length,
        successCount,
        failedCount,
        unmappedItems,
        errors,
      };

    } catch (error) {
      // API 오류 등 전체 실패
      await db.update(tossSyncLogs)
        .set({
          status: 'failed',
          errorDetails: { error: String(error) },
          completedAt: new Date(),
        })
        .where(eq(tossSyncLogs.id, syncLog.id));

      throw error;
    }
  }
}
```

### 1.6 동기화 스크립트

**파일: `scripts/sync-toss.ts`**

```typescript
import { TossSyncService } from '@/lib/toss/sync';
import { db } from '@/lib/db';
import { stores } from '@/lib/db/schema';
import { eq, isNull } from 'drizzle-orm';
import { subDays, format } from 'date-fns';

async function main() {
  const syncService = new TossSyncService();
  const targetDate = format(subDays(new Date(), 1), 'yyyy-MM-dd');

  console.log(`Starting Toss sync for date: ${targetDate}`);

  // 모든 활성 매장 조회
  const activeStores = await db.select()
    .from(stores)
    .where(and(
      eq(stores.isActive, true),
      isNull(stores.deletedAt)
    ));

  for (const store of activeStores) {
    console.log(`Syncing store: ${store.storeName}`);

    try {
      const result = await syncService.syncDailySales(
        store.id,
        store.tossStoreId!, // 토스 매장 ID 필드 필요
        targetDate,
        'auto'
      );

      console.log(`  Success: ${result.successCount}, Failed: ${result.failedCount}`);

      if (result.unmappedItems.length > 0) {
        console.log(`  Unmapped items: ${result.unmappedItems.join(', ')}`);
        // TODO: 관리자 알림 발송
      }
    } catch (error) {
      console.error(`  Error syncing store ${store.storeName}:`, error);
      // TODO: 관리자 알림 발송
    }
  }

  console.log('Toss sync completed');
}

main()
  .catch(console.error)
  .finally(() => process.exit());
```

---

## 2. 카카오 알림톡 연동

### 2.1 연동 목적
- 재고 부족 알림 자동 발송
- 동기화 실패 알림 발송
- 관리자에게 실시간 알림 제공

### 2.2 카카오 비즈메시지 API 개요

**API 문서**: https://developers.kakao.com/docs/latest/ko/message/rest-api

**엔드포인트:**
```
Base URL: https://kapi.kakao.com/v2/api/talk/memo/send
인증: Authorization: KakaoAK {REST_API_KEY}
```

### 2.3 환경변수

```env
# .env
KAKAO_REST_API_KEY=your_kakao_rest_api_key
KAKAO_ALIMTALK_SENDER_KEY=your_sender_key
KAKAO_ALIMTALK_TEMPLATE_CODE=INVENTORY_LOW_ALERT
```

### 2.4 알림톡 템플릿

**템플릿 코드: INVENTORY_LOW_ALERT**

```
[나성닭강정] 재고 부족 알림

매장: #{store_name}
재료: #{ingredient_name}
현재 재고: #{current_quantity}#{unit}
예상 소진일: #{days_remaining}일

발주를 검토해 주세요.
```

**템플릿 코드: SYNC_FAILED_ALERT**

```
[나성닭강정] 매출 동기화 실패

매장: #{store_name}
날짜: #{sync_date}
실패 건수: #{failed_count}건

관리자 페이지에서 확인해 주세요.
```

### 2.5 API 클라이언트 설계

**파일: `lib/kakao/alimtalk.ts`**

```typescript
import { db } from '@/lib/db';
import { alertHistory } from '@/lib/db/schema';

interface AlimtalkParams {
  templateCode: string;
  recipientPhone: string;
  templateParams: Record<string, string>;
}

interface AlimtalkResult {
  success: boolean;
  messageId?: string;
  error?: string;
}

export class KakaoAlimtalkClient {
  private apiKey: string;
  private senderKey: string;
  private baseUrl = 'https://kapi.kakao.com';

  constructor() {
    const apiKey = process.env.KAKAO_REST_API_KEY;
    const senderKey = process.env.KAKAO_ALIMTALK_SENDER_KEY;

    if (!apiKey || !senderKey) {
      throw new Error('Kakao API credentials not configured');
    }

    this.apiKey = apiKey;
    this.senderKey = senderKey;
  }

  async sendAlimtalk(params: AlimtalkParams): Promise<AlimtalkResult> {
    try {
      const response = await fetch(`${this.baseUrl}/v2/api/talk/memo/send`, {
        method: 'POST',
        headers: {
          'Authorization': `KakaoAK ${this.apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          sender_key: this.senderKey,
          template_code: params.templateCode,
          receiver_phone: params.recipientPhone,
          template_parameter: params.templateParams,
        }),
      });

      if (!response.ok) {
        const error = await response.json().catch(() => ({}));
        return {
          success: false,
          error: error.message || `HTTP ${response.status}`,
        };
      }

      const data = await response.json();
      return {
        success: true,
        messageId: data.message_id,
      };
    } catch (error) {
      return {
        success: false,
        error: String(error),
      };
    }
  }
}

// 알림 발송 및 이력 저장
export async function sendInventoryLowAlert(params: {
  storeId: number;
  storeName: string;
  ingredientId: number;
  ingredientName: string;
  currentQuantity: number;
  unit: string;
  daysRemaining: number;
  recipientPhone: string;
}): Promise<boolean> {
  const client = new KakaoAlimtalkClient();

  const templateParams = {
    store_name: params.storeName,
    ingredient_name: params.ingredientName,
    current_quantity: String(params.currentQuantity),
    unit: params.unit,
    days_remaining: String(params.daysRemaining),
  };

  const message = `[나성닭강정] 재고 부족 알림\n매장: ${params.storeName}\n재료: ${params.ingredientName}\n현재 재고: ${params.currentQuantity}${params.unit}\n예상 소진일: ${params.daysRemaining}일`;

  const result = await client.sendAlimtalk({
    templateCode: process.env.KAKAO_ALIMTALK_TEMPLATE_CODE || 'INVENTORY_LOW_ALERT',
    recipientPhone: params.recipientPhone,
    templateParams,
  });

  // 이력 저장
  await db.insert(alertHistory).values({
    storeId: params.storeId,
    alertType: 'inventory_low',
    ingredientId: params.ingredientId,
    message,
    channel: 'kakao',
    recipient: params.recipientPhone,
    status: result.success ? 'sent' : 'failed',
    externalId: result.messageId,
    sentAt: result.success ? new Date() : null,
  });

  return result.success;
}

export async function sendSyncFailedAlert(params: {
  storeId: number;
  storeName: string;
  syncDate: string;
  failedCount: number;
  recipientPhone: string;
}): Promise<boolean> {
  const client = new KakaoAlimtalkClient();

  const templateParams = {
    store_name: params.storeName,
    sync_date: params.syncDate,
    failed_count: String(params.failedCount),
  };

  const message = `[나성닭강정] 매출 동기화 실패\n매장: ${params.storeName}\n날짜: ${params.syncDate}\n실패 건수: ${params.failedCount}건`;

  const result = await client.sendAlimtalk({
    templateCode: 'SYNC_FAILED_ALERT',
    recipientPhone: params.recipientPhone,
    templateParams,
  });

  // 이력 저장
  await db.insert(alertHistory).values({
    storeId: params.storeId,
    alertType: 'sync_failed',
    message,
    channel: 'kakao',
    recipient: params.recipientPhone,
    status: result.success ? 'sent' : 'failed',
    externalId: result.messageId,
    sentAt: result.success ? new Date() : null,
  });

  return result.success;
}
```

---

## 3. 재고 체크 스케줄러

**파일: `scripts/check-inventory.ts`**

```typescript
import { db } from '@/lib/db';
import { 
  stores, 
  inventory, 
  ingredients,
  inventoryAlertRules,
  salesRecords,
  alertHistory,
} from '@/lib/db/schema';
import { sendInventoryLowAlert } from '@/lib/kakao/alimtalk';
import { eq, and, isNull, gte, desc } from 'drizzle-orm';
import { subDays, format, startOfDay } from 'date-fns';

interface InventoryCheck {
  storeId: number;
  storeName: string;
  managerPhone: string;
  ingredientId: number;
  ingredientName: string;
  unit: string;
  currentQuantity: number;
  alertThresholdDays: number;
  predictionPeriodDays: number;
}

async function calculateDaysRemaining(
  storeId: number,
  ingredientId: number,
  currentQuantity: number,
  periodDays: number
): Promise<number> {
  const startDate = format(subDays(new Date(), periodDays), 'yyyy-MM-dd');

  // 최근 N일간 해당 재료가 포함된 메뉴의 판매량 조회
  // (실제로는 메뉴-재료 매핑과 레시피 기반 계산 필요)
  const sales = await db.select({
    totalQuantity: sql<number>`SUM(quantity_sold)`,
  })
    .from(salesRecords)
    .where(and(
      eq(salesRecords.storeId, storeId),
      gte(salesRecords.saleDate, startDate),
      isNull(salesRecords.deletedAt)
    ));

  const totalSold = sales[0]?.totalQuantity || 0;
  const avgDailySales = totalSold / periodDays;

  if (avgDailySales <= 0) {
    return Infinity; // 판매 없음
  }

  return Math.floor(currentQuantity / avgDailySales);
}

async function hasRecentAlert(
  storeId: number,
  ingredientId: number,
  withinHours: number = 24
): Promise<boolean> {
  const cutoff = subDays(new Date(), withinHours / 24);

  const recent = await db.select()
    .from(alertHistory)
    .where(and(
      eq(alertHistory.storeId, storeId),
      eq(alertHistory.ingredientId, ingredientId),
      eq(alertHistory.alertType, 'inventory_low'),
      eq(alertHistory.status, 'sent'),
      gte(alertHistory.sentAt, cutoff)
    ))
    .limit(1);

  return recent.length > 0;
}

async function main() {
  console.log('Starting inventory check...');

  // 1. 활성 매장 및 재고/알림 규칙 조회
  const checks = await db.select({
    storeId: stores.id,
    storeName: stores.storeName,
    managerPhone: stores.managerPhone,
    ingredientId: inventory.ingredientId,
    ingredientName: ingredients.ingredientName,
    unit: ingredients.unit,
    currentQuantity: inventory.currentQuantity,
    alertThresholdDays: inventoryAlertRules.alertThresholdDays,
    predictionPeriodDays: inventoryAlertRules.predictionPeriodDays,
  })
    .from(stores)
    .innerJoin(inventory, eq(stores.id, inventory.storeId))
    .innerJoin(ingredients, eq(inventory.ingredientId, ingredients.id))
    .leftJoin(inventoryAlertRules, and(
      eq(inventoryAlertRules.storeId, stores.id),
      eq(inventoryAlertRules.ingredientId, inventory.ingredientId),
      eq(inventoryAlertRules.isActive, true)
    ))
    .where(and(
      eq(stores.isActive, true),
      isNull(stores.deletedAt)
    ));

  let alertsSent = 0;
  let alertsSkipped = 0;

  for (const check of checks) {
    const thresholdDays = check.alertThresholdDays || 3;
    const periodDays = check.predictionPeriodDays || 14;

    // 2. 소진 예측
    const daysRemaining = await calculateDaysRemaining(
      check.storeId,
      check.ingredientId,
      Number(check.currentQuantity),
      periodDays
    );

    // 3. 임계값 확인
    if (daysRemaining <= thresholdDays && daysRemaining !== Infinity) {
      // 4. 중복 알림 확인
      const hasRecent = await hasRecentAlert(check.storeId, check.ingredientId);

      if (hasRecent) {
        console.log(`  Skipping ${check.ingredientName} (recent alert exists)`);
        alertsSkipped++;
        continue;
      }

      // 5. 알림 발송
      if (check.managerPhone) {
        console.log(`  Sending alert for ${check.storeName} - ${check.ingredientName}`);

        const success = await sendInventoryLowAlert({
          storeId: check.storeId,
          storeName: check.storeName,
          ingredientId: check.ingredientId,
          ingredientName: check.ingredientName,
          currentQuantity: Number(check.currentQuantity),
          unit: check.unit || '',
          daysRemaining,
          recipientPhone: check.managerPhone,
        });

        if (success) {
          alertsSent++;
        }
      } else {
        console.log(`  No manager phone for ${check.storeName}`);
      }
    }
  }

  console.log(`Inventory check completed. Alerts sent: ${alertsSent}, Skipped: ${alertsSkipped}`);
}

main()
  .catch(console.error)
  .finally(() => process.exit());
```

---

## 4. Cron Job 설정

**vercel.json (Vercel Cron):**

```json
{
  "crons": [
    {
      "path": "/api/cron/sync-toss",
      "schedule": "0 6 * * *"
    },
    {
      "path": "/api/cron/check-inventory",
      "schedule": "0 8 * * *"
    }
  ]
}
```

**API Route: `app/api/cron/sync-toss/route.ts`**

```typescript
import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  // Vercel Cron 인증 확인
  const authHeader = request.headers.get('authorization');
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // 동기화 실행
  // ... (sync-toss.ts 로직)

  return NextResponse.json({ success: true });
}
```

---

*작성일: 2026-01-11*
*버전: 1.0*
