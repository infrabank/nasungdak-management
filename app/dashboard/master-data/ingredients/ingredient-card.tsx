import type { Ingredient } from '@/lib/db/schema'
import IngredientForm from './ingredient-form'

interface IngredientCardProps {
  ingredient: Ingredient
}

export default function IngredientCard({ ingredient }: IngredientCardProps) {
  return (
    <div className="bg-white rounded-xl shadow-sm ring-1 ring-gray-900/5 overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between p-4 bg-gray-50 border-b border-gray-100">
        <div className="flex items-center gap-2">
          <span className="text-xl">🥬</span>
          <span className="font-semibold text-gray-900">{ingredient.ingredientName}</span>
        </div>
        <span
          className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ${
            ingredient.isActive
              ? 'bg-green-100 text-green-800'
              : 'bg-gray-100 text-gray-800'
          }`}
        >
          {ingredient.isActive ? '활성' : '비활성'}
        </span>
      </div>

      {/* Body */}
      <div className="p-4 space-y-3">
        {/* Unit */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-sm text-gray-500">
            <span>📏</span>
            <span>단위</span>
          </div>
          <span className="text-sm font-medium text-gray-900">
            {ingredient.unit}
          </span>
        </div>

        {/* Description */}
        <div className="flex gap-2">
          <span className="text-sm shrink-0">📝</span>
          <p className="text-sm text-gray-900 line-clamp-2">
            {ingredient.description || '-'}
          </p>
        </div>
      </div>

      {/* Footer */}
      <div className="px-4 py-3 bg-gray-50 border-t border-gray-100 flex justify-end">
        <IngredientForm ingredient={ingredient} />
      </div>
    </div>
  )
}
