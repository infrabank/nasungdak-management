import { getIngredients } from './actions'
import IngredientForm from './ingredient-form'
import CSVUpload from './csv-upload'

export const dynamic = 'force-dynamic'

export default async function IngredientsPage() {
  const ingredients = await getIngredients()

  return (
    <div>
      <div className="sm:flex sm:items-center">
        <div className="sm:flex-auto">
          <h1 className="text-3xl font-bold">재료 관리</h1>
          <p className="mt-2 text-sm text-gray-700">
            재료 등록 및 관리
          </p>
        </div>
        <div className="mt-4 sm:ml-16 sm:mt-0 sm:flex-none sm:flex sm:gap-3">
          <CSVUpload />
          <IngredientForm />
        </div>
      </div>

      <div className="mt-8 flow-root">
        <div className="-mx-4 -my-2 overflow-x-auto sm:-mx-6 lg:-mx-8">
          <div className="inline-block min-w-full py-2 align-middle sm:px-6 lg:px-8">
            <table className="min-w-full divide-y divide-gray-300">
              <thead>
                <tr>
                  <th scope="col" className="py-3.5 pl-4 pr-3 text-left text-sm font-semibold text-gray-900 sm:pl-0">
                    재료명
                  </th>
                  <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">
                    단위
                  </th>
                  <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">
                    설명
                  </th>
                  <th scope="col" className="px-3 py-3.5 text-center text-sm font-semibold text-gray-900">
                    활성
                  </th>
                  <th scope="col" className="relative py-3.5 pl-3 pr-4 sm:pr-0">
                    <span className="sr-only">작업</span>
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {ingredients.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="py-10 text-center text-sm text-gray-500">
                      등록된 재료가 없습니다
                    </td>
                  </tr>
                ) : (
                  ingredients.map((ingredient) => (
                    <tr key={ingredient.id}>
                      <td className="whitespace-nowrap py-4 pl-4 pr-3 text-sm font-medium text-gray-900 sm:pl-0">
                        {ingredient.ingredientName}
                      </td>
                      <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">
                        {ingredient.unit}
                      </td>
                      <td className="px-3 py-4 text-sm text-gray-500">
                        {ingredient.description}
                      </td>
                      <td className="whitespace-nowrap px-3 py-4 text-sm text-center">
                        <span
                          className={`inline-flex rounded-full px-2 text-xs font-semibold leading-5 ${
                            ingredient.isActive
                              ? 'bg-green-100 text-green-800'
                              : 'bg-gray-100 text-gray-800'
                          }`}
                        >
                          {ingredient.isActive ? '활성' : '비활성'}
                        </span>
                      </td>
                      <td className="relative whitespace-nowrap py-4 pl-3 pr-4 text-right text-sm font-medium sm:pr-0">
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
