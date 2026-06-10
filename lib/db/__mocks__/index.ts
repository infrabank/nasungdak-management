/**
 * Mock Drizzle DB for unit testing Server Actions
 *
 * Usage in tests:
 * vi.mock('@/lib/db', () => import('@/lib/db/__mocks__'))
 */

import { vi } from 'vitest'

export const createMockQueryResult = <T>(data: T | null) => ({
  findFirst: vi.fn().mockResolvedValue(data),
  findMany: vi.fn().mockResolvedValue(data ? [data] : []),
})

export const createMockDb = () => ({
  insert: vi.fn().mockReturnThis(),
  values: vi.fn().mockReturnThis(),
  returning: vi.fn().mockResolvedValue([{ id: 'mock-id' }]),
  update: vi.fn().mockReturnThis(),
  set: vi.fn().mockReturnThis(),
  where: vi.fn().mockReturnThis(),
  delete: vi.fn().mockReturnThis(),
  select: vi.fn().mockReturnThis(),
  from: vi.fn().mockReturnThis(),
  leftJoin: vi.fn().mockReturnThis(),
  innerJoin: vi.fn().mockReturnThis(),
  orderBy: vi.fn().mockReturnThis(),
  limit: vi.fn().mockReturnThis(),
  offset: vi.fn().mockReturnThis(),
  transaction: vi.fn(async (callback: (tx: any) => Promise<any>) => {
    return callback(createMockDb())
  }),
  query: {
    purchaseTransactions: createMockQueryResult(null),
    salesRecords: createMockQueryResult(null),
    menuCategories: createMockQueryResult(null),
    ingredients: createMockQueryResult(null),
    skus: createMockQueryResult(null),
    stores: createMockQueryResult(null),
    suppliers: createMockQueryResult(null),
    oilChangeHistory: createMockQueryResult(null),
    fixedCosts: createMockQueryResult(null),
    inventory: createMockQueryResult(null),
    inventoryEvents: createMockQueryResult(null),
    inventoryAlertRules: createMockQueryResult(null),
    tossSkuMappings: createMockQueryResult(null),
  },
})

export const db = createMockDb()

export const resetMockDb = () => {
  vi.clearAllMocks()
}
