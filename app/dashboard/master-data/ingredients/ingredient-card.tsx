import type { Ingredient } from '@/lib/db/schema'
import IngredientForm from './ingredient-form'

interface IngredientCardProps {
  ingredient: Ingredient
}

export default function IngredientCard({ ingredient }: IngredientCardProps) {
  return (
    <div className="overflow-hidden border-3 border-brutal-black bg-brutal-white shadow-brutal">
      {/* Header */}
      <div className="flex items-center justify-between border-b-2 border-brutal-black bg-brutal-green/30 p-4">
        <div className="flex items-center gap-2">
          <span className="text-xl">🥬</span>
          <span className="font-bold text-brutal-black">
            {ingredient.ingredientName}
          </span>
        </div>
        <span
          className={`inline-flex border-2 border-brutal-black px-2.5 py-0.5 text-xs font-bold ${
            ingredient.isActive
              ? 'bg-brutal-green text-brutal-black'
              : 'bg-brutal-white text-brutal-black'
          }`}
        >
          {ingredient.isActive ? '활성' : '비활성'}
        </span>
      </div>

      {/* Body */}
      <div className="space-y-3 p-4">
        {/* Unit */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-sm font-medium text-brutal-black/70">
            <span>📏</span>
            <span>단위</span>
          </div>
          <span className="text-sm font-bold text-brutal-black">
            {ingredient.unit}
          </span>
        </div>

        {/* Description */}
        <div className="flex gap-2">
          <span className="shrink-0 text-sm">📝</span>
          <p className="line-clamp-2 text-sm font-medium text-brutal-black">
            {ingredient.description || '-'}
          </p>
        </div>
      </div>

      {/* Footer */}
      <div className="flex justify-end border-t-2 border-brutal-black bg-brutal-yellow/30 px-4 py-3">
        <IngredientForm ingredient={ingredient} />
      </div>
    </div>
  )
}
