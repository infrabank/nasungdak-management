import { getIngredients } from './actions'
import IngredientForm from './ingredient-form'
import CSVUpload from './csv-upload'
import IngredientCard from './ingredient-card'
import { formatCurrency } from '@/lib/utils/format'

export default async function IngredientsPage() {
  const ingredients = await getIngredients()

  return (
    <div>
      <div className="sm:flex sm:items-center">
        <div className="sm:flex-auto">
          <h1 className="text-3xl font-bold text-brutal-black">재료 관리</h1>
          <p className="mt-2 text-sm text-brutal-black/70">
            재료 등록 및 단위당 원가 관리
          </p>
        </div>
        <div className="mt-4 flex flex-col gap-2 sm:ml-16 sm:mt-0 sm:flex-none sm:flex-row sm:gap-3">
          <CSVUpload />
          <IngredientForm />
        </div>
      </div>

      <div className="mt-8 flow-root">
        {/* Mobile View - Cards */}
        <div className="space-y-4 md:hidden">
          {ingredients.length === 0 ? (
            <div className="border-3 border-dashed border-brutal-black bg-brutal-white py-10 text-center">
              <p className="font-medium text-brutal-black/70">
                등록된 재료가 없습니다
              </p>
            </div>
          ) : (
            ingredients.map((ingredient) => (
              <IngredientCard key={ingredient.id} ingredient={ingredient} />
            ))
          )}
        </div>

        {/* Desktop View - Table */}
        <div className="hidden md:block">
          <div className="overflow-hidden border-3 border-brutal-black shadow-brutal">
            <table className="min-w-full">
              <thead className="border-b-3 border-brutal-black bg-brutal-yellow">
                <tr>
                  <th
                    scope="col"
                    className="py-3.5 pl-6 pr-3 text-left text-sm font-black text-brutal-black"
                  >
                    재료명
                  </th>
                  <th
                    scope="col"
                    className="px-3 py-3.5 text-left text-sm font-black text-brutal-black"
                  >
                    단위
                  </th>
                  <th
                    scope="col"
                    className="px-3 py-3.5 text-right text-sm font-black text-brutal-black"
                  >
                    단위당 원가
                  </th>
                  <th
                    scope="col"
                    className="px-3 py-3.5 text-left text-sm font-black text-brutal-black"
                  >
                    설명
                  </th>
                  <th
                    scope="col"
                    className="px-3 py-3.5 text-center text-sm font-black text-brutal-black"
                  >
                    활성
                  </th>
                  <th scope="col" className="relative py-3.5 pl-3 pr-6">
                    <span className="sr-only">작업</span>
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y-2 divide-brutal-black/20 bg-brutal-white">
                {ingredients.length === 0 ? (
                  <tr>
                    <td
                      colSpan={6}
                      className="py-10 text-center text-sm font-medium text-brutal-black"
                    >
                      등록된 재료가 없습니다
                    </td>
                  </tr>
                ) : (
                  ingredients.map((ingredient) => (
                    <tr key={ingredient.id}>
                      <td className="whitespace-nowrap py-4 pl-6 pr-3 text-sm font-medium text-brutal-black">
                        {ingredient.ingredientName}
                      </td>
                      <td className="whitespace-nowrap px-3 py-4 text-sm text-brutal-black">
                        {ingredient.unit}
                      </td>
                      <td className="whitespace-nowrap px-3 py-4 text-right text-sm font-bold text-brutal-black">
                        {ingredient.unitCost
                          ? `${formatCurrency(Number(ingredient.unitCost))}/${ingredient.unit}`
                          : '-'}
                      </td>
                      <td className="px-3 py-4 text-sm text-brutal-black/70">
                        {ingredient.description}
                      </td>
                      <td className="whitespace-nowrap px-3 py-4 text-center text-sm">
                        <span
                          className={`inline-flex border-2 px-2 py-1 text-xs font-bold ${
                            ingredient.isActive
                              ? 'border-brutal-black bg-brutal-green text-brutal-black'
                              : 'border-brutal-black bg-brutal-white text-brutal-black'
                          }`}
                        >
                          {ingredient.isActive ? '활성' : '비활성'}
                        </span>
                      </td>
                      <td className="relative whitespace-nowrap py-4 pl-3 pr-6 text-right text-sm font-medium">
                        <IngredientForm ingredient={ingredient} />
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  )
}
