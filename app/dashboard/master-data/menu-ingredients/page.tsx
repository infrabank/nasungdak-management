import { getMenuIngredients } from './actions'
import MenuIngredientForm from './menu-ingredient-form'
import { MenuIngredientCard } from './menu-ingredient-card'

export default async function MenuIngredientsPage() {
  const mappings = await getMenuIngredients()

  return (
    <div>
      <div className="sm:flex sm:items-center">
        <div className="sm:flex-auto">
          <h1 className="text-3xl font-black text-brutal-black">
            메뉴-재료 매핑
          </h1>
          <p className="mt-2 text-sm font-medium text-brutal-black/70">
            메뉴별 필요 재료 및 수량 설정
          </p>
        </div>
        <div className="mt-4 sm:ml-16 sm:mt-0 sm:flex-none">
          <MenuIngredientForm />
        </div>
      </div>

      <div className="mt-8 flow-root">
        {/* Mobile View */}
        <div className="mb-6 space-y-4 md:hidden">
          {mappings.length === 0 ? (
            <div className="border-3 border-brutal-black bg-brutal-white py-10 text-center shadow-brutal">
              <p className="text-sm font-bold text-brutal-black">
                등록된 매핑이 없습니다
              </p>
            </div>
          ) : (
            mappings.map((mapping) => (
              <MenuIngredientCard key={mapping.id} mapping={mapping} />
            ))
          )}
        </div>

        {/* Desktop View */}
        <div className="hidden md:block">
          <div className="overflow-hidden border-3 border-brutal-black shadow-brutal">
            <table className="min-w-full">
              <thead className="border-b-3 border-brutal-black bg-brutal-yellow">
                <tr>
                  <th
                    scope="col"
                    className="py-3.5 pl-6 pr-3 text-left text-sm font-black text-brutal-black"
                  >
                    메뉴
                  </th>
                  <th
                    scope="col"
                    className="px-3 py-3.5 text-left text-sm font-black text-brutal-black"
                  >
                    재료
                  </th>
                  <th
                    scope="col"
                    className="px-3 py-3.5 text-right text-sm font-black text-brutal-black"
                  >
                    필요 수량
                  </th>
                  <th
                    scope="col"
                    className="px-3 py-3.5 text-left text-sm font-black text-brutal-black"
                  >
                    단위
                  </th>
                  <th scope="col" className="relative py-3.5 pl-3 pr-6">
                    <span className="sr-only">작업</span>
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y-2 divide-brutal-black/20 bg-brutal-white">
                {mappings.length === 0 ? (
                  <tr>
                    <td
                      colSpan={5}
                      className="py-10 text-center text-sm font-medium text-brutal-black"
                    >
                      등록된 매핑이 없습니다
                    </td>
                  </tr>
                ) : (
                  mappings.map((mapping) => (
                    <tr key={mapping.id}>
                      <td className="whitespace-nowrap py-4 pl-6 pr-3 text-sm font-medium text-brutal-black">
                        {mapping.menuName}
                      </td>
                      <td className="whitespace-nowrap px-3 py-4 text-sm text-brutal-black">
                        {mapping.ingredientName}
                      </td>
                      <td className="whitespace-nowrap px-3 py-4 text-right text-sm font-bold text-brutal-black">
                        {Number(mapping.requiredQuantity).toFixed(2)}
                      </td>
                      <td className="whitespace-nowrap px-3 py-4 text-sm text-brutal-black/70">
                        {mapping.unit}
                      </td>
                      <td className="relative whitespace-nowrap py-4 pl-3 pr-6 text-right text-sm font-medium">
                        <MenuIngredientForm mapping={mapping} />
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
