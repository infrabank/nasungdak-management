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
  quantity: z.coerce.string().refine((val) => !isNaN(Number(val)) && Number(val) > 0, {
    message: '수량은 0보다 커야 합니다',
  }),
  unitPrice: z.coerce.string().refine((val) => !isNaN(Number(val)) && Number(val) >= 0, {
    message: '단가는 0 이상이어야 합니다',
  }),
  unitDescription: z.string().max(100).optional(),
  notes: z.string().optional(),
})

export type PurchaseFormData = z.infer<typeof purchaseSchema>

// Add more schemas here:
// - salesSchema
// - menuSchema
// - ingredientSchema
// - skuSchema
// - costDistributionSchema
