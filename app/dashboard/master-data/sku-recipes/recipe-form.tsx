'use client'
import { useState, useRef } from 'react'
import { createSkuRecipe, updateSkuRecipe, deleteSkuRecipe } from './actions'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { toast } from '@/components/ui/toast'

interface RecipeFormProps {
  recipe?: {
    id: string
    skuId: string
    ingredientId: string
    quantity: string | null
    unit: string
    notes: string | null
  }
  skus: { id: string; skuName: string }[]
  ingredients: {
    id: string
    ingredientName: string
    unit: string
    unitCost: string | null
  }[]
  defaultSkuId?: string
  buttonText?: string
}

export default function RecipeForm({
  recipe,
  skus,
  ingredients,
  defaultSkuId,
  buttonText,
}: RecipeFormProps) {
  const formRef = useRef<HTMLFormElement>(null)
  const [isOpen, setIsOpen] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [selectedIngredient, setSelectedIngredient] = useState<string>(
    recipe?.ingredientId || ''
  )
  const selectedIngredientData = ingredients.find(
    (i) => i.id === selectedIngredient
  )

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setIsSubmitting(true)
    const formData = new FormData(e.currentTarget)
    try {
      const result = recipe
        ? await updateSkuRecipe(recipe.id, formData)
        : await createSkuRecipe(formData)
      if (result.success) {
        setIsOpen(false)
        toast.success(
          recipe ? '레시피가 수정되었습니다' : '레시피가 등록되었습니다'
        )
        if (!recipe) {
          formRef.current?.reset()
          setSelectedIngredient('')
        }
      } else {
        toast.error(result.error || '오류가 발생했습니다')
      }
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleDelete = async () => {
    if (!recipe) return
    if (!confirm('정말 삭제하시겠습니까?')) return
    setIsSubmitting(true)
    try {
      const result = await deleteSkuRecipe(recipe.id)
      if (result.success) {
        setIsOpen(false)
        toast.success('레시피가 삭제되었습니다')
      } else {
        toast.error(result.error || '오류가 발생했습니다')
      }
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        className={
          recipe
            ? 'px-1 font-bold text-brutal-black underline'
            : 'border-2 border-brutal-black bg-brutal-yellow px-3 py-2 text-sm font-bold'
        }
      >
        {recipe ? '수정' : buttonText || '새 레시피 등록'}
      </button>
      {isOpen && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex min-h-full items-end justify-center p-4 sm:items-center sm:p-0">
            <div
              className="fixed inset-0 bg-brutal-black/50"
              onClick={() => setIsOpen(false)}
            />
            <div className="relative transform overflow-hidden border-3 border-brutal-black bg-brutal-white px-4 pb-4 pt-5 text-left shadow-brutal-lg sm:my-8 sm:w-full sm:max-w-lg sm:p-6">
              <form ref={formRef} onSubmit={handleSubmit}>
                <h3 className="mb-4 text-lg font-semibold text-brutal-black">
                  {recipe ? '레시피 수정' : '새 레시피 등록'}
                </h3>
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="skuId">SKU *</Label>
                    {/* Hidden input to ensure skuId is submitted when select is disabled */}
                    {defaultSkuId && (
                      <input type="hidden" name="skuId" value={defaultSkuId} />
                    )}
                    <select
                      name={defaultSkuId ? undefined : 'skuId'}
                      id="skuId"
                      required
                      defaultValue={recipe?.skuId || defaultSkuId || ''}
                      disabled={!!defaultSkuId}
                      className="w-full border-2 border-brutal-black bg-brutal-white px-3 py-2 text-sm font-medium"
                    >
                      <option value="">SKU 선택</option>
                      {skus.map((sku) => (
                        <option key={sku.id} value={sku.id}>
                          {sku.skuName}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <Label htmlFor="ingredientId">원재료 *</Label>
                    <select
                      name="ingredientId"
                      id="ingredientId"
                      required
                      value={selectedIngredient}
                      onChange={(e) => setSelectedIngredient(e.target.value)}
                      className="w-full border-2 border-brutal-black bg-brutal-white px-3 py-2 text-sm font-medium"
                    >
                      <option value="">원재료 선택</option>
                      {ingredients.map((ing) => (
                        <option key={ing.id} value={ing.id}>
                          {ing.ingredientName} ({ing.unit})
                          {ing.unitCost &&
                            ` - ${Number(ing.unitCost).toLocaleString()}원/${ing.unit}`}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="quantity">사용량 *</Label>
                      <Input
                        type="number"
                        name="quantity"
                        id="quantity"
                        required
                        min="0.0001"
                        step="0.0001"
                        defaultValue={recipe?.quantity || ''}
                        placeholder="예: 50"
                      />
                    </div>
                    <div>
                      <Label htmlFor="unit">단위 *</Label>
                      <select
                        name="unit"
                        id="unit"
                        required
                        defaultValue={
                          recipe?.unit || selectedIngredientData?.unit || ''
                        }
                        className="w-full border-2 border-brutal-black bg-brutal-white px-3 py-2 text-sm font-medium"
                      >
                        <option value="">단위 선택</option>
                        <option value="g">g (그램)</option>
                        <option value="kg">kg (킬로그램)</option>
                        <option value="ml">ml (밀리리터)</option>
                        <option value="L">L (리터)</option>
                        <option value="ea">개</option>
                      </select>
                    </div>
                  </div>
                  <div>
                    <Label htmlFor="notes">메모</Label>
                    <Input
                      type="text"
                      name="notes"
                      id="notes"
                      defaultValue={recipe?.notes || ''}
                      placeholder="예: 반죽에 추가"
                    />
                  </div>
                </div>
                <div className="mt-5 sm:mt-6 sm:grid sm:grid-flow-row-dense sm:grid-cols-2 sm:gap-3">
                  <Button
                    type="submit"
                    disabled={isSubmitting}
                    className="w-full sm:col-start-2"
                  >
                    {isSubmitting ? '저장 중...' : '저장'}
                  </Button>
                  <Button
                    type="button"
                    variant="secondary"
                    onClick={() => setIsOpen(false)}
                    disabled={isSubmitting}
                    className="mt-3 w-full sm:col-start-1 sm:mt-0"
                  >
                    취소
                  </Button>
                  {recipe && (
                    <Button
                      type="button"
                      variant="danger"
                      onClick={handleDelete}
                      disabled={isSubmitting}
                      className="mt-3 w-full sm:col-start-1"
                    >
                      삭제
                    </Button>
                  )}
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
