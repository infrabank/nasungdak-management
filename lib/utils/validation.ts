import { z } from 'zod'

/**
 * Validation schemas for forms
 * Add more schemas as needed for each form
 */

// =====================
// Auth / Password Validation
// =====================

/**
 * Password strength requirements:
 * - 최소 8자
 * - 대문자 1개 이상
 * - 소문자 1개 이상
 * - 숫자 1개 이상
 * - 특수문자 1개 이상 (!@#$%^&*(),.?":{}|<>)
 */
export const passwordSchema = z
  .string()
  .min(8, '비밀번호는 최소 8자 이상이어야 합니다')
  .max(100, '비밀번호는 100자를 초과할 수 없습니다')
  .refine((val) => /[A-Z]/.test(val), {
    message: '비밀번호에 대문자가 최소 1개 포함되어야 합니다',
  })
  .refine((val) => /[a-z]/.test(val), {
    message: '비밀번호에 소문자가 최소 1개 포함되어야 합니다',
  })
  .refine((val) => /[0-9]/.test(val), {
    message: '비밀번호에 숫자가 최소 1개 포함되어야 합니다',
  })
  .refine((val) => /[!@#$%^&*(),.?":{}|<>]/.test(val), {
    message:
      '비밀번호에 특수문자가 최소 1개 포함되어야 합니다 (!@#$%^&*(),.?":{}|<>)',
  })

/**
 * 비밀번호 강도 점수 계산 (0-100)
 */
export function calculatePasswordStrength(password: string): {
  score: number
  level: 'weak' | 'fair' | 'good' | 'strong'
  feedback: string[]
} {
  let score = 0
  const feedback: string[] = []

  // Length scoring
  if (password.length >= 8) score += 20
  else feedback.push('8자 이상 입력하세요')

  if (password.length >= 12) score += 10
  if (password.length >= 16) score += 10

  // Character type scoring
  if (/[A-Z]/.test(password)) score += 15
  else feedback.push('대문자를 추가하세요')

  if (/[a-z]/.test(password)) score += 15
  else feedback.push('소문자를 추가하세요')

  if (/[0-9]/.test(password)) score += 15
  else feedback.push('숫자를 추가하세요')

  if (/[!@#$%^&*(),.?":{}|<>]/.test(password)) score += 15
  else feedback.push('특수문자를 추가하세요')

  // Determine level
  let level: 'weak' | 'fair' | 'good' | 'strong'
  if (score < 40) level = 'weak'
  else if (score < 60) level = 'fair'
  else if (score < 80) level = 'good'
  else level = 'strong'

  return { score: Math.min(score, 100), level, feedback }
}

/**
 * 이메일 유효성 검사
 */
export const emailSchema = z
  .string()
  .email('유효한 이메일 주소를 입력해주세요')
  .max(255, '이메일은 255자를 초과할 수 없습니다')
  .transform((val) => val.toLowerCase().trim())

// =====================
// Business Validation Schemas
// =====================

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
    if (isNaN(num)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: '유효한 단가를 입력해주세요',
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
  fryerType: z.enum(['초벌', '재벌'], {
    required_error: '튀김기 종류를 선택해주세요',
  }),
  notes: z.string().optional().nullable(),
})

export type OilChangeFormData = z.infer<typeof oilChangeSchema>

// Store validation
export const storeSchema = z.object({
  storeName: z
    .string()
    .min(1, '매장명을 입력해주세요')
    .max(100, '매장명은 100자 이내로 입력해주세요'),
  storeCode: z
    .string()
    .min(1, '매장 코드를 입력해주세요')
    .max(20, '매장 코드는 20자 이내로 입력해주세요')
    .regex(
      /^[A-Z0-9_-]+$/i,
      '매장 코드는 영문, 숫자, 하이픈, 언더스코어만 사용할 수 있습니다'
    ),
  address: z.string().max(500).optional().nullable(),
  phone: z.string().max(20).optional().nullable(),
  managerPhone: z.string().max(20).optional().nullable(),
  isActive: z.boolean().default(true),
})

export type StoreFormData = z.infer<typeof storeSchema>

// Inventory Alert Rule validation
export const inventoryAlertRuleSchema = z.object({
  storeId: z.string().uuid().nullable().optional(),
  ingredientId: z.string().uuid('유효한 재료를 선택해주세요'),
  alertThresholdDays: z.coerce
    .number()
    .int()
    .min(1, '알림 임계값은 1일 이상이어야 합니다')
    .default(3),
  predictionPeriodDays: z.coerce
    .number()
    .int()
    .min(7, '예측 기간은 7일 이상이어야 합니다')
    .max(90, '예측 기간은 90일 이하여야 합니다')
    .default(30),
  isActive: z.boolean().default(true),
})

export type InventoryAlertRuleFormData = z.infer<
  typeof inventoryAlertRuleSchema
>

// Inventory validation
export const inventorySchema = z.object({
  storeId: z.string().uuid('유효한 매장을 선택해주세요'),
  ingredientId: z.string().uuid('유효한 재료를 선택해주세요'),
  currentQuantity: z.coerce.string().transform((val, ctx) => {
    const num = parseFloat(val)
    if (isNaN(num) || num < 0) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: '재고량은 0 이상이어야 합니다',
      })
      return z.NEVER
    }
    return val
  }),
  unit: z.string().max(20).optional(),
})

export type InventoryFormData = z.infer<typeof inventorySchema>

// Inventory Event validation
export const inventoryEventSchema = z.object({
  storeId: z.string().uuid('유효한 매장을 선택해주세요'),
  ingredientId: z.string().uuid('유효한 재료를 선택해주세요'),
  eventType: z.enum(['purchase', 'sale', 'waste', 'audit', 'adjustment'], {
    required_error: '이벤트 유형을 선택해주세요',
  }),
  quantityChange: z.coerce.string().transform((val, ctx) => {
    const num = parseFloat(val)
    if (isNaN(num)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: '유효한 수량을 입력해주세요',
      })
      return z.NEVER
    }
    if (num === 0) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: '수량 변동은 0이 아니어야 합니다',
      })
      return z.NEVER
    }
    return val
  }),
  reason: z.string().optional().nullable(),
  eventDate: z.string().min(1, '날짜를 선택해주세요'),
})

export type InventoryEventData = z.infer<typeof inventoryEventSchema>

// Employee validation (storeId is validated in actions, not here)
export const employeeSchema = z.object({
  employeeName: z
    .string()
    .min(1, '직원명을 입력해주세요')
    .max(100, '직원명은 100자 이내로 입력해주세요'),
  hourlyRate: z.coerce.string().transform((val, ctx) => {
    const num = Number(val)
    if (isNaN(num) || num <= 0) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: '시급은 0보다 커야 합니다',
      })
      return z.NEVER
    }
    return val
  }),
  phone: z.string().max(20).optional().nullable(),
  hireDate: z.string().optional().nullable(),
  isActive: z.coerce.boolean().optional().default(true),
})

export type EmployeeFormData = z.infer<typeof employeeSchema>

// Attendance record validation (storeId is set from employee, not validated here)
export const attendanceSchema = z.object({
  employeeId: z.string().uuid('직원을 선택해주세요'),
  workDate: z.string().min(1, '근무일을 선택해주세요'),
  workHours: z.coerce.string().transform((val, ctx) => {
    const num = Number(val)
    if (isNaN(num) || num <= 0) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: '근무시간은 0보다 커야 합니다',
      })
      return z.NEVER
    }
    if (num > 24) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: '24시간을 초과할 수 없습니다',
      })
      return z.NEVER
    }
    return val
  }),
  hourlyRate: z.coerce.string().transform((val, ctx) => {
    const num = Number(val)
    if (isNaN(num) || num <= 0) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: '시급은 0보다 커야 합니다',
      })
      return z.NEVER
    }
    return val
  }),
  // totalPay: optional - if undefined, server calculates Math.round(workHours * hourlyRate)
  totalPay: z.coerce
    .string()
    .optional()
    .transform((val, ctx) => {
      if (!val || val === '') return undefined // Missing → server calculates
      const num = Number(val)
      if (isNaN(num) || num < 0) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: '지급액은 0 이상이어야 합니다',
        })
        return z.NEVER
      }
      if (!Number.isInteger(num)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: '지급액은 정수여야 합니다',
        })
        return z.NEVER
      }
      return val
    }),
  notes: z.string().optional().nullable(),
})

export type AttendanceFormData = z.infer<typeof attendanceSchema>

// Add more schemas here:
// - salesSchema
// - menuSchema
// - ingredientSchema
// - skuSchema
// - costDistributionSchema

// =====================
// BOM / Recipe Validation Schemas
// =====================

// Ingredient validation (with unitCost)
export const ingredientSchema = z.object({
  ingredientName: z
    .string()
    .min(1, '원재료명을 입력해주세요')
    .max(100, '원재료명은 100자 이내로 입력해주세요'),
  unit: z
    .string()
    .min(1, '단위를 입력해주세요')
    .max(20, '단위는 20자 이내로 입력해주세요'),
  unitCost: z.coerce
    .string()
    .optional()
    .transform((val, ctx) => {
      if (!val || val === '') return undefined
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
  description: z.string().max(500).optional().nullable(),
  isActive: z.coerce.boolean().optional().default(true),
})
export type IngredientFormData = z.infer<typeof ingredientSchema>

// SKU Recipe validation
export const skuRecipeSchema = z.object({
  skuId: z.string().uuid('SKU를 선택해주세요'),
  ingredientId: z.string().uuid('원재료를 선택해주세요'),
  quantity: z.coerce.string().transform((val, ctx) => {
    const num = Number(val)
    if (isNaN(num) || num <= 0) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: '사용량은 0보다 커야 합니다',
      })
      return z.NEVER
    }
    return val
  }),
  unit: z
    .string()
    .min(1, '단위를 입력해주세요')
    .max(20, '단위는 20자 이내로 입력해주세요'),
  notes: z.string().optional().nullable(),
})
export type SkuRecipeFormData = z.infer<typeof skuRecipeSchema>

// Sales Menu validation
export const salesMenuSchema = z.object({
  menuName: z
    .string()
    .min(1, '메뉴명을 입력해주세요')
    .max(100, '메뉴명은 100자 이내로 입력해주세요'),
  menuType: z.enum(['single', 'bundle'], {
    required_error: '메뉴 유형을 선택해주세요',
  }),
  basePrice: z.coerce.string().transform((val, ctx) => {
    const num = Number(val)
    if (isNaN(num) || num < 0) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: '가격은 0 이상이어야 합니다',
      })
      return z.NEVER
    }
    return val
  }),
  description: z.string().max(500).optional().nullable(),
  isActive: z.coerce.boolean().optional().default(true),
  sortOrder: z.coerce.number().int().optional().default(0),
})
export type SalesMenuFormData = z.infer<typeof salesMenuSchema>

// Sales Menu Item validation
export const salesMenuItemSchema = z.object({
  salesMenuId: z.string().uuid('판매 메뉴를 선택해주세요'),
  skuId: z.string().uuid('SKU를 선택해주세요'),
  quantity: z.coerce.number().int().min(1, '수량은 1 이상이어야 합니다'),
  isRequired: z.coerce.boolean().optional().default(true),
})
export type SalesMenuItemFormData = z.infer<typeof salesMenuItemSchema>
