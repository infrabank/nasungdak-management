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
    <div className="bg-brutal-white border-3 border-brutal-black shadow-brutal p-4">
      <div className="flex items-center justify-between mb-4 pb-4 border-b-2 border-brutal-black">
        <div className="flex items-center space-x-2 text-sm font-bold text-brutal-black">
          <span>{mapping.menuName}</span>
          <span className="text-brutal-black/50">→</span>
          <span>{mapping.ingredientName}</span>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4 mb-4 text-sm">
        <div>
          <span className="block text-xs font-bold text-brutal-black/70 mb-1">🍗 메뉴</span>
          <span className="font-bold text-brutal-black">{mapping.menuName}</span>
        </div>
        <div>
          <span className="block text-xs font-bold text-brutal-black/70 mb-1">🥬 재료</span>
          <span className="font-bold text-brutal-black">{mapping.ingredientName}</span>
        </div>
        <div>
          <span className="block text-xs font-bold text-brutal-black/70 mb-1">📊 수량</span>
          <span className="font-bold text-brutal-black">
            {Number(mapping.requiredQuantity).toFixed(2)}
          </span>
        </div>
        <div>
          <span className="block text-xs font-bold text-brutal-black/70 mb-1">📏 단위</span>
          <span className="font-bold text-brutal-black">{mapping.unit}</span>
        </div>
      </div>

      <div className="flex justify-end pt-2 border-t-2 border-brutal-black">
        <MenuIngredientForm mapping={mapping} />
      </div>
    </div>
  )
}
