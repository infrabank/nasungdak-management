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
            ? 'px-1 font-bold text-brutal-black underline underline-offset-2 transition-all hover:bg-brutal-black hover:text-brutal-yellow'
            : 'border-2 border-brutal-black bg-brutal-yellow px-3 py-2 text-sm font-bold text-brutal-black shadow-brutal transition-all hover:-translate-x-0.5 hover:-translate-y-0.5 hover:shadow-brutal-lg'
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

            <div className="relative transform overflow-hidden border-3 border-brutal-black bg-brutal-white px-4 pb-4 pt-5 text-left shadow-brutal-lg transition-all sm:my-8 sm:w-full sm:max-w-lg sm:p-6">
              <form onSubmit={handleSubmit}>
                <div>
                  <h3 className="mb-4 text-lg font-semibold leading-6 text-brutal-black">
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
                      <Label htmlFor="barcode">바코드</Label>
                      <Input
                        type="text"
                        name="barcode"
                        id="barcode"
                        defaultValue={ingredient?.barcode || ''}
                        placeholder="바코드를 입력하세요 (선택)"
                      />
                    </div>

                    <div>
                      <Label htmlFor="managementLevel">관리 등급 *</Label>
                      <select
                        name="managementLevel"
                        id="managementLevel"
                        defaultValue={ingredient?.managementLevel ?? 'core'}
                        className="block w-full border-2 border-brutal-black bg-brutal-white px-3 py-2 text-sm font-medium text-brutal-black"
                      >
                        <option value="core">핵심 (재고+원가 관리)</option>
                        <option value="simple">보조 (매입 기록만)</option>
                        <option value="expense">비용 (매입비 집계만)</option>
                      </select>
                      <p className="mt-1 text-xs text-brutal-black/60">
                        핵심 재료만 재고 화면에 기본 표시됩니다
                      </p>
                    </div>

                    <div>
                      <Label htmlFor="unit">사용 단위 *</Label>
                      <Input
                        type="text"
                        name="unit"
                        id="unit"
                        required
                        defaultValue={ingredient?.unit}
                        placeholder="예: g, ml, 개 (레시피/재고 기준)"
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <Label htmlFor="purchaseUnit">구매 단위</Label>
                        <Input
                          type="text"
                          name="purchaseUnit"
                          id="purchaseUnit"
                          defaultValue={ingredient?.purchaseUnit || ''}
                          placeholder="예: box, 포"
                        />
                      </div>
                      <div>
                        <Label htmlFor="conversionFactor">변환 계수</Label>
                        <Input
                          type="number"
                          name="conversionFactor"
                          id="conversionFactor"
                          min="0"
                          step="any"
                          defaultValue={
                            ingredient?.conversionFactor
                              ? Number(ingredient.conversionFactor)
                              : ''
                          }
                          placeholder="구매 1 = 사용 N"
                        />
                      </div>
                      <p className="col-span-2 -mt-2 text-xs text-brutal-black/60">
                        예: 1박스 = 10000g이면 구매 단위 box, 변환 계수 10000.
                        비워두면 매입 수량이 그대로 재고에 반영됩니다
                      </p>
                    </div>

                    <div>
                      <Label htmlFor="unitCost">단위당 원가 (원)</Label>
                      <Input
                        type="number"
                        name="unitCost"
                        id="unitCost"
                        min="0"
                        step="0.01"
                        defaultValue={ingredient?.unitCost || ''}
                        placeholder="예: 3000 (단위당 원가)"
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
                      <label
                        htmlFor="isActive"
                        className="ml-2 block text-sm text-brutal-black"
                      >
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
