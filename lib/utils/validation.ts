import { z } from 'zod'

/**
 * Validation schemas for forms
 * Add more schemas as needed for each form
 */

// Purchase transaction validation
export const purchaseSchema = z.object({
  transactionDate: z.string().min(1, '날짜를 선택해주세요'),
  menuId: z.string().uuid('유효한 메뉴를 선택해주세요'),
  ingredientId: z.string().uuid('유효한 재료를 선택해주세요'),
  supplierName: z.string().min(1, '공급업체명을 입력해주세요').max(200),
  quantity: z.coerce.string().transform((val, ctx) => {
    const num = Number(val)
    if (isNaN(num) || num <= 0) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: '수량은 0보다 커야 합니다',
      })
      return z.NEVER
    }
    return val
  }),
  unitPrice: z.coerce.string().transform((val, ctx) => {
    const num = Number(val)
    if (isNaN(num) || num < 0) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: '단가는 0 이상이어야 합니다',
      })
      return z.NEVER
    }
    return val
  }),
  unitDescription: z.string().max(100).optional().nullable(),
  notes: z.string().optional().nullable(),
})

export type PurchaseFormData = z.infer<typeof purchaseSchema>

// Oil change history validation
export const oilChangeSchema = z.object({
  changeDate: z.string().min(1, '날짜를 선택해주세요'),
  fryerType: z.enum(['초벌', '재벌'], { required_error: '튀김기 종류를 선택해주세요' }),
  notes: z.string().optional().nullable(),
})

export type OilChangeFormData = z.infer<typeof oilChangeSchema>

// Store validation
export const storeSchema = z.object({
  storeName: z.string().min(1, '매장명을 입력해주세요').max(100, '매장명은 100자 이내로 입력해주세요'),
  storeCode: z.string().min(1, '매장 코드를 입력해주세요').max(20, '매장 코드는 20자 이내로 입력해주세요')
    .regex(/^[A-Z0-9_-]+$/i, '매장 코드는 영문, 숫자, 하이픈, 언더스코어만 사용할 수 있습니다'),
  address: z.string().max(500).optional().nullable(),
  phone: z.string().max(20).optional().nullable(),
  managerPhone: z.string().max(20).optional().nullable(),
  tossStoreId: z.string().max(50).optional().nullable(),
  isActive: z.boolean().default(true),
})

export type StoreFormData = z.infer<typeof storeSchema>

// Add more schemas here:
// - salesSchema
// - menuSchema
// - ingredientSchema
// - skuSchema
// - costDistributionSchema
