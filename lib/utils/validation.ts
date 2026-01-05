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

// Add more schemas here:
// - salesSchema
// - menuSchema
// - ingredientSchema
// - skuSchema
// - costDistributionSchema
