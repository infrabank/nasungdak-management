'use client'

import { useState } from 'react'
import { createIngredient, updateIngredient, deleteIngredient } from './actions'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { toast } from '@/components/ui/toast'
import { useConfirm } from '@/components/ui/confirm-dialog'
import type { Ingredient } from '@/lib/db/schema'

interface IngredientFormProps {
  ingredient?: Ingredient
}

export default function IngredientForm({ ingredient }: IngredientFormProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setIsSubmitting(true)

    const formData = new FormData(e.currentTarget)

    try {
      const result = ingredient
        ? await updateIngredient(ingredient.id, formData)
        : await createIngredient(formData)

      if (result.success) {
        setIsOpen(false)
        e.currentTarget.reset()
      } else {
        alert(result.error)
      }
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleDelete = async () => {
    if (!ingredient) return

    if (!confirm('정말 삭제하시겠습니까?')) return

    setIsSubmitting(true)
    try {
      const result = await deleteIngredient(ingredient.id)
      if (result.success) {
        setIsOpen(false)
      } else {
        alert(result.error)
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
          ingredient
            ? 'font-bold text-brutal-black underline underline-offset-2 hover:text-brutal-yellow hover:bg-brutal-black px-1 transition-all'
            : 'px-3 py-2 text-sm font-bold text-brutal-black bg-brutal-yellow border-2 border-brutal-black shadow-brutal hover:shadow-brutal-lg hover:-translate-x-0.5 hover:-translate-y-0.5 transition-all'
        }
      >
        {ingredient ? '수정' : '새 재료 등록'}
      </button>

      {isOpen && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex min-h-full items-end justify-center p-4 text-center sm:items-center sm:p-0">
             <div
               className="fixed inset-0 bg-brutal-black/50 transition-opacity"
               onClick={() => setIsOpen(false)}
             />

            <div className="relative transform overflow-hidden bg-brutal-white border-3 border-brutal-black shadow-brutal-lg px-4 pb-4 pt-5 text-left transition-all sm:my-8 sm:w-full sm:max-w-lg sm:p-6">
              <form onSubmit={handleSubmit}>
                <div>
                   <h3 className="text-lg font-semibold leading-6 text-brutal-black mb-4">
                     {ingredient ? '재료 수정' : '새 재료 등록'}
                   </h3>

                  <div className="space-y-4">
                    <div>
                      <Label htmlFor="ingredientName">재료명 *</Label>
                      <Input
                        type="text"
                        name="ingredientName"
                        id="ingredientName"
                        required
                        defaultValue={ingredient?.ingredientName}
                      />
                    </div>

                    <div>
                      <Label htmlFor="unit">단위 *</Label>
                      <Input
                        type="text"
                        name="unit"
                        id="unit"
                        required
                        defaultValue={ingredient?.unit}
                        placeholder="예: kg, g, L, ml, 개"
                      />
                    </div>

                    <div>
                      <Label htmlFor="description">설명</Label>
                      <Textarea
                        name="description"
                        id="description"
                        rows={3}
                        defaultValue={ingredient?.description || ''}
                      />
                    </div>

                     <div className="flex items-center">
                       <input
                         type="checkbox"
                         name="isActive"
                         id="isActive"
                         value="true"
                         defaultChecked={ingredient?.isActive ?? true}
                         className="h-4 w-4 border-brutal-black text-brutal-black"
                       />
                       <label htmlFor="isActive" className="ml-2 block text-sm text-brutal-black">
                         활성
                       </label>
                     </div>
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
                </div>

                {ingredient && (
                  <div className="mt-3">
                    <Button
                      type="button"
                      variant="danger"
                      onClick={handleDelete}
                      disabled={isSubmitting}
                      className="w-full"
                      size="sm"
                    >
                      삭제
                    </Button>
                  </div>
                )}
              </form>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
