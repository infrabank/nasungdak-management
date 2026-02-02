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
    <div className="border-3 border-brutal-black bg-brutal-white p-4 shadow-brutal">
      <div className="mb-4 flex items-center justify-between border-b-2 border-brutal-black pb-4">
        <div className="flex items-center space-x-2 text-sm font-bold text-brutal-black">
          <span>{mapping.menuName}</span>
          <span className="text-brutal-black/50">→</span>
          <span>{mapping.ingredientName}</span>
        </div>
      </div>

      <div className="mb-4 grid grid-cols-2 gap-4 text-sm">
        <div>
          <span className="mb-1 block text-xs font-bold text-brutal-black/70">
            🍗 메뉴
          </span>
          <span className="font-bold text-brutal-black">
            {mapping.menuName}
          </span>
        </div>
        <div>
          <span className="mb-1 block text-xs font-bold text-brutal-black/70">
            🥬 재료
          </span>
          <span className="font-bold text-brutal-black">
            {mapping.ingredientName}
          </span>
        </div>
        <div>
          <span className="mb-1 block text-xs font-bold text-brutal-black/70">
            📊 수량
          </span>
          <span className="font-bold text-brutal-black">
            {Number(mapping.requiredQuantity).toFixed(2)}
          </span>
        </div>
        <div>
          <span className="mb-1 block text-xs font-bold text-brutal-black/70">
            📏 단위
          </span>
          <span className="font-bold text-brutal-black">{mapping.unit}</span>
        </div>
      </div>

      <div className="flex justify-end border-t-2 border-brutal-black pt-2">
        <MenuIngredientForm mapping={mapping} />
      </div>
    </div>
  )
}
