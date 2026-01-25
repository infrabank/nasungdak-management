/**
 * Validation Schema Tests
 *
 * Tests for Zod validation schemas used across Server Actions.
 * Ensures input validation works correctly before data reaches the database.
 */

import { describe, it, expect } from 'vitest'
import {
  purchaseSchema,
  storeSchema,
  oilChangeSchema,
  inventorySchema,
  inventoryEventSchema,
} from '../utils/validation'

describe('purchaseSchema', () => {
  const validData = {
    transactionDate: '2024-01-15',
    menuId: '123e4567-e89b-12d3-a456-426614174000',
    ingredientId: '123e4567-e89b-12d3-a456-426614174001',
    supplierName: '테스트 공급업체',
    quantity: '10.5',
    unitPrice: '5000',
  }

  it('accepts valid purchase data', () => {
    const result = purchaseSchema.safeParse(validData)
    expect(result.success).toBe(true)
  })

  it('rejects missing transactionDate', () => {
    const result = purchaseSchema.safeParse({
      ...validData,
      transactionDate: '',
    })
    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error.errors[0].message).toBe('날짜를 선택해주세요')
    }
  })

  it('rejects invalid menuId (not UUID)', () => {
    const result = purchaseSchema.safeParse({
      ...validData,
      menuId: 'not-a-uuid',
    })
    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error.errors[0].message).toBe('유효한 메뉴를 선택해주세요')
    }
  })

  it('rejects zero quantity', () => {
    const result = purchaseSchema.safeParse({
      ...validData,
      quantity: '0',
    })
    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error.errors[0].message).toBe('수량은 0보다 커야 합니다')
    }
  })

  it('rejects negative quantity', () => {
    const result = purchaseSchema.safeParse({
      ...validData,
      quantity: '-5',
    })
    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error.errors[0].message).toBe('수량은 0보다 커야 합니다')
    }
  })

  it('accepts decimal quantity', () => {
    const result = purchaseSchema.safeParse({
      ...validData,
      quantity: '2.5',
    })
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.quantity).toBe('2.5')
    }
  })

  it('rejects empty supplierName', () => {
    const result = purchaseSchema.safeParse({
      ...validData,
      supplierName: '',
    })
    expect(result.success).toBe(false)
  })

  it('accepts optional notes as null', () => {
    const result = purchaseSchema.safeParse({
      ...validData,
      notes: null,
    })
    expect(result.success).toBe(true)
  })
})

describe('storeSchema', () => {
  const validData = {
    storeName: '나성닭강정 강남점',
    storeCode: 'GANGNAM-01',
    isActive: true,
  }

  it('accepts valid store data', () => {
    const result = storeSchema.safeParse(validData)
    expect(result.success).toBe(true)
  })

  it('rejects empty storeName', () => {
    const result = storeSchema.safeParse({
      ...validData,
      storeName: '',
    })
    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error.errors[0].message).toBe('매장명을 입력해주세요')
    }
  })

  it('rejects invalid storeCode format', () => {
    const result = storeSchema.safeParse({
      ...validData,
      storeCode: '강남점!@#', // Contains invalid characters
    })
    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error.errors[0].message).toContain('영문, 숫자')
    }
  })

  it('accepts valid storeCode with hyphen and underscore', () => {
    const result = storeSchema.safeParse({
      ...validData,
      storeCode: 'STORE_01-A',
    })
    expect(result.success).toBe(true)
  })

  it('accepts optional fields as null', () => {
    const result = storeSchema.safeParse({
      ...validData,
      address: null,
      phone: null,
      managerPhone: null,
    })
    expect(result.success).toBe(true)
  })
})

describe('oilChangeSchema', () => {
  it('accepts valid 초벌 fryer type', () => {
    const result = oilChangeSchema.safeParse({
      changeDate: '2024-01-15',
      fryerType: '초벌',
    })
    expect(result.success).toBe(true)
  })

  it('accepts valid 재벌 fryer type', () => {
    const result = oilChangeSchema.safeParse({
      changeDate: '2024-01-15',
      fryerType: '재벌',
    })
    expect(result.success).toBe(true)
  })

  it('rejects invalid fryer type', () => {
    const result = oilChangeSchema.safeParse({
      changeDate: '2024-01-15',
      fryerType: '삼벌', // Invalid
    })
    expect(result.success).toBe(false)
  })

  it('rejects missing changeDate', () => {
    const result = oilChangeSchema.safeParse({
      changeDate: '',
      fryerType: '초벌',
    })
    expect(result.success).toBe(false)
  })
})

describe('inventorySchema', () => {
  const validData = {
    storeId: '123e4567-e89b-12d3-a456-426614174000',
    ingredientId: '123e4567-e89b-12d3-a456-426614174001',
    currentQuantity: '100',
  }

  it('accepts valid inventory data', () => {
    const result = inventorySchema.safeParse(validData)
    expect(result.success).toBe(true)
  })

  it('accepts zero quantity (valid for empty stock)', () => {
    const result = inventorySchema.safeParse({
      ...validData,
      currentQuantity: '0',
    })
    expect(result.success).toBe(true)
  })

  it('rejects negative quantity', () => {
    const result = inventorySchema.safeParse({
      ...validData,
      currentQuantity: '-10',
    })
    expect(result.success).toBe(false)
  })

  it('rejects invalid storeId', () => {
    const result = inventorySchema.safeParse({
      ...validData,
      storeId: 'invalid',
    })
    expect(result.success).toBe(false)
  })
})

describe('inventoryEventSchema', () => {
  const validData = {
    storeId: '123e4567-e89b-12d3-a456-426614174000',
    ingredientId: '123e4567-e89b-12d3-a456-426614174001',
    eventType: 'purchase' as const,
    quantityChange: '50',
    eventDate: '2024-01-15',
  }

  it('accepts valid purchase event', () => {
    const result = inventoryEventSchema.safeParse(validData)
    expect(result.success).toBe(true)
  })

  it('accepts negative quantityChange for waste event', () => {
    const result = inventoryEventSchema.safeParse({
      ...validData,
      eventType: 'waste',
      quantityChange: '-10',
    })
    expect(result.success).toBe(true)
  })

  it('rejects zero quantityChange', () => {
    const result = inventoryEventSchema.safeParse({
      ...validData,
      quantityChange: '0',
    })
    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error.errors[0].message).toBe('수량 변동은 0이 아니어야 합니다')
    }
  })

  it('accepts all valid event types', () => {
    const eventTypes = ['purchase', 'sale', 'waste', 'audit', 'adjustment'] as const
    
    for (const eventType of eventTypes) {
      const result = inventoryEventSchema.safeParse({
        ...validData,
        eventType,
      })
      expect(result.success).toBe(true)
    }
  })

  it('rejects invalid event type', () => {
    const result = inventoryEventSchema.safeParse({
      ...validData,
      eventType: 'invalid',
    })
    expect(result.success).toBe(false)
  })
})
