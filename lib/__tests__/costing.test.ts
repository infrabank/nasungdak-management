import { describe, it, expect } from 'vitest'
import {
  getRecipeToIngredientFactor,
  calculateRecipeLineCost,
  validateRecipeUnit,
  RECIPE_QTY_IN_INGREDIENT_UNIT_SQL,
} from '@/lib/costing'

describe('getRecipeToIngredientFactor', () => {
  it('같은 단위는 1', () => {
    expect(getRecipeToIngredientFactor('g', 'g')).toBe(1)
    expect(getRecipeToIngredientFactor('EA', 'ea')).toBe(1)
  })

  it('kg/g, l/ml 표준 환산', () => {
    // recipeUnit, ingredientUnit
    expect(getRecipeToIngredientFactor('g', 'kg')).toBe(1 / 1000)
    expect(getRecipeToIngredientFactor('kg', 'g')).toBe(1000)
    expect(getRecipeToIngredientFactor('ml', 'l')).toBe(1 / 1000)
    expect(getRecipeToIngredientFactor('l', 'ml')).toBe(1000)
  })

  it('mg 환산 (양방향)', () => {
    expect(getRecipeToIngredientFactor('mg', 'g')).toBe(1 / 1000)
    expect(getRecipeToIngredientFactor('mg', 'kg')).toBe(1 / 1_000_000)
    expect(getRecipeToIngredientFactor('g', 'mg')).toBe(1000)
    expect(getRecipeToIngredientFactor('kg', 'mg')).toBe(1_000_000)
  })

  it('호환 불가 조합은 null', () => {
    expect(getRecipeToIngredientFactor('g', 'ml')).toBeNull()
    expect(getRecipeToIngredientFactor('ea', 'g')).toBeNull()
  })

  it('빈 값은 1(보수적)', () => {
    expect(getRecipeToIngredientFactor(null, 'g')).toBe(1)
    expect(getRecipeToIngredientFactor('g', undefined)).toBe(1)
  })
})

describe('calculateRecipeLineCost', () => {
  it('mg 레시피 원가는 1000배 과대계상되지 않는다', () => {
    // 소금 5원/g, 레시피 500mg -> 실제 0.5g -> 2.5원
    expect(calculateRecipeLineCost(5, 'g', 500, 'mg')).toBeCloseTo(2.5, 6)
  })

  it('kg 재료 + g 레시피', () => {
    // 10000원/kg, 200g -> 0.2kg -> 2000원
    expect(calculateRecipeLineCost(10000, 'kg', 200, 'g')).toBeCloseTo(2000, 6)
  })
})

describe('RECIPE_QTY_IN_INGREDIENT_UNIT_SQL (TS-SQL 일치성)', () => {
  it('mg 분기가 SQL에 포함된다 (TS 경로와 드리프트 방지)', () => {
    const sql = RECIPE_QTY_IN_INGREDIENT_UNIT_SQL.toLowerCase()
    // ingredient=g, recipe=mg 조합이 SQL CASE에 존재해야 한다
    expect(sql).toContain("lower(ing.unit) = 'g' and lower(rec.unit) = 'mg'")
    expect(sql).toContain("lower(ing.unit) = 'kg' and lower(rec.unit) = 'mg'")
  })

  it('표준 kg/g, l/ml 분기도 존재', () => {
    const sql = RECIPE_QTY_IN_INGREDIENT_UNIT_SQL.toLowerCase()
    expect(sql).toContain("lower(ing.unit) = 'kg' and lower(rec.unit) = 'g'")
    expect(sql).toContain("lower(ing.unit) = 'l' and lower(rec.unit) = 'ml'")
  })
})

describe('validateRecipeUnit', () => {
  it('환산 가능한 조합은 통과(null)', () => {
    expect(validateRecipeUnit('mg', 'g')).toBeNull()
    expect(validateRecipeUnit('g', 'kg')).toBeNull()
  })

  it('표준 단위가 섞인 호환 불가 조합은 에러 메시지', () => {
    expect(validateRecipeUnit('g', 'ml')).not.toBeNull()
  })

  it('자유 단위끼리는 허용', () => {
    expect(validateRecipeUnit('개', 'ea')).toBeNull()
  })
})
