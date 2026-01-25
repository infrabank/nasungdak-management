'use client'

import { useState, useEffect } from 'react'
import { createMenuIngredient, updateMenuIngredient, deleteMenuIngredient, getMenus, getIngredients } from './actions'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select } from '@/components/ui/select'
import { Label } from '@/components/ui/label'
import { toast } from '@/components/ui/toast'
import { useConfirm } from '@/components/ui/confirm-dialog'

interface MenuIngredientFormProps {
  mapping?: {
    id: string
    menuId: string
    menuName: string | null
    ingredientId: string
    ingredientName: string | null
    unit: string | null
    requiredQuantity: string
  }
}

export default function MenuIngredientForm({ mapping }: MenuIngredientFormProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [menus, setMenus] = useState<Array<{ id: string; menuName: string }>>([])
  const [ingredientsList, setIngredientsList] = useState<Array<{ id: string; ingredientName: string; unit: string }>>([])
  const confirm = useConfirm()

  useEffect(() => {
    if (isOpen) {
      Promise.all([getMenus(), getIngredients()]).then(([menusData, ingredientsData]) => {
        setMenus(menusData)
        setIngredientsList(ingredientsData)
      })
    }
  }, [isOpen])

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setIsSubmitting(true)

    const formData = new FormData(e.currentTarget)

    try {
      const result = mapping
        ? await updateMenuIngredient(mapping.id, formData)
        : await createMenuIngredient(formData)

      if (result.success) {
        setIsOpen(false)
        e.currentTarget.reset()
      } else {
        toast.error(result.error || '저장 중 오류가 발생했습니다')
      }
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleDelete = async () => {
    if (!mapping) return

    if (!(await confirm({ title: '확인', description: '정말 삭제하시겠습니까?', variant: 'danger' }))) return

    setIsSubmitting(true)
    try {
      const result = await deleteMenuIngredient(mapping.id)
      if (result.success) {
        setIsOpen(false)
      } else {
        toast.error(result.error || '삭제 중 오류가 발생했습니다')
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
          mapping
            ? 'font-bold text-brutal-black underline underline-offset-2 hover:text-brutal-yellow hover:bg-brutal-black px-1 transition-all'
            : 'px-3 py-2 text-sm font-bold text-brutal-black bg-brutal-yellow border-2 border-brutal-black shadow-brutal hover:shadow-brutal-lg hover:-translate-x-0.5 hover:-translate-y-0.5 transition-all'
        }
      >
        {mapping ? '수정' : '매핑 추가'}
      </button>

      {isOpen && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex min-h-full items-end justify-center p-4 text-center sm:items-center sm:p-0">
            <div
              className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity"
              onClick={() => setIsOpen(false)}
            />

            <div className="relative transform overflow-hidden bg-brutal-white border-3 border-brutal-black shadow-brutal-lg px-4 pb-4 pt-5 text-left transition-all sm:my-8 sm:w-full sm:max-w-lg sm:p-6">
              <form onSubmit={handleSubmit}>
                <div>
                  <h3 className="text-lg font-semibold leading-6 text-gray-900 mb-4">
                    {mapping ? '매핑 수정' : '메뉴-재료 매핑 추가'}
                  </h3>

                  <div className="space-y-4">
                    <div>
                      <Label htmlFor="menuId">메뉴 *</Label>
                      <Select
                        name="menuId"
                        id="menuId"
                        required
                        defaultValue={mapping?.menuId}
                        disabled={!!mapping}
                      >
                        <option value="">선택하세요</option>
                        {menus.map((menu) => (
                          <option key={menu.id} value={menu.id}>
                            {menu.menuName}
                          </option>
                        ))}
                      </Select>
                    </div>

                    <div>
                      <Label htmlFor="ingredientId">재료 *</Label>
                      <Select
                        name="ingredientId"
                        id="ingredientId"
                        required
                        defaultValue={mapping?.ingredientId}
                        disabled={!!mapping}
                      >
                        <option value="">선택하세요</option>
                        {ingredientsList.map((ingredient) => (
                          <option key={ingredient.id} value={ingredient.id}>
                            {ingredient.ingredientName} ({ingredient.unit})
                          </option>
                        ))}
                      </Select>
                    </div>

                    <div>
                      <Label htmlFor="requiredQuantity">필요 수량 *</Label>
                      <Input
                        type="number"
                        name="requiredQuantity"
                        id="requiredQuantity"
                        required
                        step="0.01"
                        min="0.01"
                        defaultValue={mapping?.requiredQuantity}
                      />
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

                {mapping && (
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
