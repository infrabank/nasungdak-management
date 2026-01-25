import { getIngredients } from './actions'
import IngredientForm from './ingredient-form'
import CSVUpload from './csv-upload'
import IngredientCard from './ingredient-card'

export default async function IngredientsPage() {
  const ingredients = await getIngredients()

  return (
    <div>
      <div className="sm:flex sm:items-center">
        <div className="sm:flex-auto">
           <h1 className="text-3xl font-bold text-brutal-black">재료 관리</h1>
           <p className="mt-2 text-sm text-brutal-black/70">
             재료 등록 및 관리
           </p>
        </div>
        <div className="mt-4 flex flex-col gap-2 sm:ml-16 sm:mt-0 sm:flex-none sm:flex-row sm:gap-3">
          <CSVUpload />
          <IngredientForm />
        </div>
      </div>

      <div className="mt-8 flow-root">
        {/* Mobile View - Cards */}
        <div className="md:hidden space-y-4">
          {ingredients.length === 0 ? (
            <div className="text-center py-10 bg-brutal-white border-3 border-dashed border-brutal-black">
              <p className="font-medium text-brutal-black/70">등록된 재료가 없습니다</p>
            </div>
          ) : (
            ingredients.map((ingredient) => (
              <IngredientCard key={ingredient.id} ingredient={ingredient} />
            ))
          )}
        </div>

        {/* Desktop View - Table */}
        <div className="hidden md:block -mx-4 -my-2 overflow-x-auto sm:-mx-6 lg:-mx-8">
          <div className="inline-block min-w-full py-2 align-middle sm:px-6 lg:px-8">
             <table className="min-w-full divide-y divide-brutal-black border-2 border-brutal-black">
              <thead>
                <tr>
                   <th scope="col" className="py-3.5 pl-4 pr-3 text-left text-sm font-semibold text-brutal-black sm:pl-0">
                     재료명
                   </th>
                   <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-brutal-black">
                     단위
                   </th>
                   <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-brutal-black">
                     설명
                   </th>
                   <th scope="col" className="px-3 py-3.5 text-center text-sm font-semibold text-brutal-black">
                     활성
                   </th>
                  <th scope="col" className="relative py-3.5 pl-3 pr-4 sm:pr-0">
                    <span className="sr-only">작업</span>
                  </th>
                </tr>
              </thead>
               <tbody className="divide-y divide-brutal-black">
                {ingredients.length === 0 ? (
                  <tr>
                     <td colSpan={5} className="py-10 text-center text-sm text-brutal-black/70">
                       등록된 재료가 없습니다
                     </td>
                  </tr>
                ) : (
                  ingredients.map((ingredient) => (
                    <tr key={ingredient.id}>
                       <td className="whitespace-nowrap py-4 pl-4 pr-3 text-sm font-medium text-brutal-black sm:pl-0">
                         {ingredient.ingredientName}
                       </td>
                       <td className="whitespace-nowrap px-3 py-4 text-sm text-brutal-black">
                         {ingredient.unit}
                       </td>
                       <td className="px-3 py-4 text-sm text-brutal-black">
                         {ingredient.description}
                       </td>
                      <td className="whitespace-nowrap px-3 py-4 text-sm text-center">
                        <span
                          className={`inline-flex px-2 text-xs font-semibold leading-5 border-2 ${
                             ingredient.isActive
                               ? 'bg-brutal-green border-brutal-green text-brutal-black'
                               : 'bg-brutal-white border-brutal-black text-brutal-black'
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
