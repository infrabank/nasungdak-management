import { getSkusWithRecipes, getSkus, getIngredients } from './actions'
import RecipeForm from './recipe-form'
import { formatCurrency } from '@/lib/utils/format'

export default async function SkuRecipesPage() {
  const [skusWithRecipes, skuOptions, ingredientOptions] = await Promise.all([
    getSkusWithRecipes(),
    getSkus(),
    getIngredients(),
  ])

  return (
    <div>
      <div className="sm:flex sm:items-center">
        <div className="sm:flex-auto">
          <h1 className="text-3xl font-bold text-brutal-black">
            SKU 레시피 관리 (BOM)
          </h1>
          <p className="mt-2 text-sm text-brutal-black/70">
            SKU별 원재료 구성과 원가를 관리합니다
          </p>
        </div>
        <div className="mt-4 sm:ml-16 sm:mt-0 sm:flex-none">
          <RecipeForm skus={skuOptions} ingredients={ingredientOptions} />
        </div>
      </div>

      <div className="mt-8 space-y-6">
        {skusWithRecipes.length === 0 ? (
          <div className="border-3 border-dashed border-brutal-black bg-brutal-white py-10 text-center">
            <p className="font-medium text-brutal-black/70">
              등록된 SKU가 없습니다
            </p>
          </div>
        ) : (
          skusWithRecipes.map((sku) => (
            <div
              key={sku.id}
              className="border-3 border-brutal-black bg-brutal-white shadow-brutal"
            >
              {/* SKU Header */}
              <div className="flex items-center justify-between border-b-3 border-brutal-black bg-brutal-yellow p-4">
                <div>
                  <h3 className="text-lg font-bold text-brutal-black">
                    {sku.skuName}
                  </h3>
                  <p className="text-sm text-brutal-black/70">{sku.menuName}</p>
                </div>
                <div className="text-right">
                  <p className="text-lg font-bold text-brutal-black">
                    판매가: {formatCurrency(Number(sku.unitPrice))}
                  </p>
                  <p className="text-sm">
                    원가:{' '}
                    <span className="font-bold">
                      {formatCurrency(sku.totalCost)}
                    </span>{' '}
                    | 마진:{' '}
                    <span
                      className={`font-bold ${sku.marginPercent >= 30 ? 'text-green-600' : sku.marginPercent >= 15 ? 'text-yellow-600' : 'text-red-600'}`}
                    >
                      {formatCurrency(sku.margin)} ({sku.marginPercent.toFixed(1)}%)
                    </span>
                  </p>
                </div>
              </div>

              {/* Recipe List */}
              <div className="p-4">
                {sku.recipes.length === 0 ? (
                  <p className="text-center text-sm text-brutal-black/50">
                    등록된 레시피가 없습니다
                  </p>
                ) : (
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b-2 border-brutal-black/20">
                        <th className="py-2 text-left font-bold">원재료</th>
                        <th className="py-2 text-right font-bold">사용량</th>
                        <th className="py-2 text-right font-bold">단가</th>
                        <th className="py-2 text-right font-bold">소계</th>
                        <th className="py-2 text-right font-bold">작업</th>
                      </tr>
                    </thead>
                    <tbody>
                      {sku.recipes.map((recipe) => (
                        <tr
                          key={recipe.id}
                          className="border-b border-brutal-black/10"
                        >
                          <td className="py-2">{recipe.ingredientName}</td>
                          <td className="py-2 text-right">
                            {recipe.quantity}
                            {recipe.unit}
                          </td>
                          <td className="py-2 text-right text-brutal-black/70">
                            {formatCurrency(recipe.costPerUnit)}/{recipe.unit}
                          </td>
                          <td className="py-2 text-right font-bold">
                            {formatCurrency(recipe.subtotal)}
                          </td>
                          <td className="py-2 text-right">
                            <RecipeForm
                              recipe={{
                                id: recipe.id,
                                skuId: sku.id,
                                ingredientId: recipe.ingredientId,
                                quantity: recipe.quantity,
                                unit: recipe.unit,
                                notes: recipe.notes,
                              }}
                              skus={skuOptions}
                              ingredients={ingredientOptions}
                            />
                          </td>
                        </tr>
                      ))}
                      <tr className="border-t-2 border-brutal-black">
                        <td colSpan={3} className="py-2 font-bold">
                          총 원가
                        </td>
                        <td className="py-2 text-right font-bold text-brutal-black">
                          {formatCurrency(sku.totalCost)}
                        </td>
                        <td></td>
                      </tr>
                    </tbody>
                  </table>
                )}

                <div className="mt-4">
                  <RecipeForm
                    defaultSkuId={sku.id}
                    skus={skuOptions}
                    ingredients={ingredientOptions}
                    buttonText="원재료 추가"
                  />
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  )
}
