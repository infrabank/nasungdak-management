import { sql } from 'drizzle-orm'

/**
 * 원가 계산 단일 소스.
 * - 재료 단가 기준: ingredients.unit_cost (원/재료 기준단위)
 * - 레시피 수량(rec.quantity, rec.unit)을 재료 기준단위로 환산해 곱한다.
 * 모든 분석/마진/리포트 화면은 반드시 이 모듈을 사용한다.
 */

// (재료 기준단위 -> 레시피 단위) 쌍의 환산 계수. 레시피 수량 x 계수 = 재료 기준단위 수량
const RECIPE_TO_INGREDIENT_FACTORS: Record<string, number> = {
  'kg:g': 1 / 1000,
  'l:ml': 1 / 1000,
  'g:kg': 1000,
  'ml:l': 1000,
  'g:mg': 1 / 1000,
  'kg:mg': 1 / 1_000_000,
}

const STANDARD_UNITS = new Set(['g', 'kg', 'mg', 'ml', 'l'])

/**
 * 레시피 단위 -> 재료 기준단위 환산 계수.
 * 같은 단위면 1, 표에 없는 조합이면 null (호환 불가).
 */
export function getRecipeToIngredientFactor(
  recipeUnit: string | null | undefined,
  ingredientUnit: string | null | undefined
): number | null {
  if (!recipeUnit || !ingredientUnit) return 1
  const r = recipeUnit.trim().toLowerCase()
  const i = ingredientUnit.trim().toLowerCase()
  if (r === i) return 1
  return RECIPE_TO_INGREDIENT_FACTORS[`${i}:${r}`] ?? null
}

/**
 * 레시피 1줄의 원가 = 재료 단가 x 사용량(재료 기준단위 환산).
 * 호환 불가 조합은 기존 데이터 보호를 위해 1:1로 계산한다 (신규 입력은 validateRecipeUnit으로 차단).
 */
export function calculateRecipeLineCost(
  ingredientUnitCost: number,
  ingredientUnit: string | null | undefined,
  recipeQuantity: number,
  recipeUnit: string | null | undefined
): number {
  const factor = getRecipeToIngredientFactor(recipeUnit, ingredientUnit) ?? 1
  return ingredientUnitCost * recipeQuantity * factor
}

/**
 * 레시피 입력 시 단위 호환성 검증. 문제 없으면 null, 문제 있으면 에러 메시지 반환.
 * 표준 질량/부피 단위가 끼어 있는데 환산이 불가능하면 차단한다.
 * (자유 단위끼리는 1:1로 허용 - 예: '개' vs 'ea')
 */
export function validateRecipeUnit(
  recipeUnit: string,
  ingredientUnit: string
): string | null {
  if (getRecipeToIngredientFactor(recipeUnit, ingredientUnit) !== null) {
    return null
  }
  const r = recipeUnit.trim().toLowerCase()
  const i = ingredientUnit.trim().toLowerCase()
  if (STANDARD_UNITS.has(r) || STANDARD_UNITS.has(i)) {
    return `레시피 단위(${recipeUnit})를 재료 기준 단위(${ingredientUnit})로 환산할 수 없습니다. 재료 단위와 호환되는 단위(g/kg, ml/L 등)를 사용해주세요.`
  }
  return null
}

/**
 * SQL: 레시피 수량을 재료 기준단위로 환산하는 CASE 식.
 * rec = sku_recipes, ing = ingredients alias 기준.
 */
export const RECIPE_QTY_IN_INGREDIENT_UNIT_SQL = `CASE
      WHEN LOWER(ing.unit) = LOWER(rec.unit) THEN rec.quantity
      WHEN LOWER(ing.unit) = 'kg' AND LOWER(rec.unit) = 'g' THEN rec.quantity / 1000
      WHEN LOWER(ing.unit) = 'l' AND LOWER(rec.unit) = 'ml' THEN rec.quantity / 1000
      WHEN LOWER(ing.unit) = 'g' AND LOWER(rec.unit) = 'kg' THEN rec.quantity * 1000
      WHEN LOWER(ing.unit) = 'ml' AND LOWER(rec.unit) = 'l' THEN rec.quantity * 1000
      ELSE rec.quantity
    END`

/**
 * SQL: SKU 1개당 BOM 원가 CTE.
 * `WITH ${bomUnitCostCte(orgId)} SELECT ... JOIN bom_unit_cost buc ON ...` 형태로 사용.
 */
export function bomUnitCostCte(organizationId?: string | null) {
  const orgFilter = organizationId
    ? sql` AND rec.organization_id = ${organizationId}`
    : sql``
  return sql`bom_unit_cost AS (
    SELECT
      rec.sku_id,
      SUM(COALESCE(ing.unit_cost, 0) * ${sql.raw(RECIPE_QTY_IN_INGREDIENT_UNIT_SQL)}) AS cost_per_unit
    FROM sku_recipes rec
    JOIN ingredients ing ON rec.ingredient_id = ing.id
    WHERE rec.deleted_at IS NULL
      AND ing.deleted_at IS NULL${orgFilter}
    GROUP BY rec.sku_id
  )`
}
