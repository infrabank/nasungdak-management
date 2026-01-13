import MenuIngredientForm from './menu-ingredient-form'

interface MenuIngredientCardProps {
  mapping: {
    id: string
    menuId: string
    menuName: string | null
    ingredientId: string
    ingredientName: string | null
    unit: string | null
    requiredQuantity: string
  }
}

export function MenuIngredientCard({ mapping }: MenuIngredientCardProps) {
  return (
    <div className="bg-white rounded-xl shadow-sm ring-1 ring-gray-900/5 p-4">
      <div className="flex items-center justify-between mb-4 pb-4 border-b border-gray-100">
        <div className="flex items-center space-x-2 text-sm font-medium text-gray-900">
          <span>{mapping.menuName}</span>
          <span className="text-gray-400">→</span>
          <span>{mapping.ingredientName}</span>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4 mb-4 text-sm">
        <div>
          <span className="block text-xs text-gray-500 mb-1">🍗 메뉴</span>
          <span className="font-medium text-gray-900">{mapping.menuName}</span>
        </div>
        <div>
          <span className="block text-xs text-gray-500 mb-1">🥬 재료</span>
          <span className="font-medium text-gray-900">{mapping.ingredientName}</span>
        </div>
        <div>
          <span className="block text-xs text-gray-500 mb-1">📊 수량</span>
          <span className="font-medium text-gray-900">
            {Number(mapping.requiredQuantity).toFixed(2)}
          </span>
        </div>
        <div>
          <span className="block text-xs text-gray-500 mb-1">📏 단위</span>
          <span className="font-medium text-gray-900">{mapping.unit}</span>
        </div>
      </div>

      <div className="flex justify-end pt-2 border-t border-gray-50">
        <MenuIngredientForm mapping={mapping} />
      </div>
    </div>
  )
}
