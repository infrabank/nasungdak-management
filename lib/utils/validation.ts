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
  isActive: z.boolean().default(true),
})

export type StoreFormData = z.infer<typeof storeSchema>

// Inventory Alert Rule validation
export const inventoryAlertRuleSchema = z.object({
  storeId: z.string().uuid().nullable().optional(),
  ingredientId: z.string().uuid('유효한 재료를 선택해주세요'),
  alertThresholdDays: z.coerce.number().int().min(1, '알림 임계값은 1일 이상이어야 합니다').default(3),
  predictionPeriodDays: z.coerce.number().int().min(7, '예측 기간은 7일 이상이어야 합니다').max(90, '예측 기간은 90일 이하여야 합니다').default(30),
  isActive: z.boolean().default(true),
})

export type InventoryAlertRuleFormData = z.infer<typeof inventoryAlertRuleSchema>

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
  eventType: z.enum(['purchase', 'sale', 'waste', 'audit', 'adjustment'], { required_error: '이벤트 유형을 선택해주세요' }),
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
  employeeName: z.string().min(1, '직원명을 입력해주세요').max(100, '직원명은 100자 이내로 입력해주세요'),
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
  totalPay: z.coerce.string().optional().transform((val, ctx) => {
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
