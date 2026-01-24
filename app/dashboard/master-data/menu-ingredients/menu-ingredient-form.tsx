'use client'

import { useState, useEffect } from 'react'
import { createMenuIngredient, updateMenuIngredient, deleteMenuIngredient, getMenus, getIngredients } from './actions'
import { Button } from '@/components/ui/button'

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
        alert(result.error)
      }
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleDelete = async () => {
    if (!mapping) return

    if (!confirm('정말 삭제하시겠습니까?')) return

    setIsSubmitting(true)
    try {
      const result = await deleteMenuIngredient(mapping.id)
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
                      <label htmlFor="menuId" className="block text-sm font-medium text-gray-700">
                        메뉴 *
                      </label>
                      <select
                        name="menuId"
                        id="menuId"
                        required
                        defaultValue={mapping?.menuId}
                        disabled={!!mapping}
                        className="mt-1 block w-full py-2 px-3 text-brutal-black bg-brutal-white border-2 border-brutal-black shadow-brutal-sm focus:outline-none focus:shadow-brutal focus:-translate-x-0.5 focus:-translate-y-0.5 transition-all sm:text-sm font-medium disabled:bg-gray-100 disabled:cursor-not-allowed disabled:shadow-none"
                      >
                        <option value="">선택하세요</option>
                        {menus.map((menu) => (
                          <option key={menu.id} value={menu.id}>
                            {menu.menuName}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label htmlFor="ingredientId" className="block text-sm font-medium text-gray-700">
                        재료 *
                      </label>
                      <select
                        name="ingredientId"
                        id="ingredientId"
                        required
                        defaultValue={mapping?.ingredientId}
                        disabled={!!mapping}
                        className="mt-1 block w-full py-2 px-3 text-brutal-black bg-brutal-white border-2 border-brutal-black shadow-brutal-sm focus:outline-none focus:shadow-brutal focus:-translate-x-0.5 focus:-translate-y-0.5 transition-all sm:text-sm font-medium disabled:bg-gray-100 disabled:cursor-not-allowed disabled:shadow-none"
                      >
                        <option value="">선택하세요</option>
                        {ingredientsList.map((ingredient) => (
                          <option key={ingredient.id} value={ingredient.id}>
                            {ingredient.ingredientName} ({ingredient.unit})
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label htmlFor="requiredQuantity" className="block text-sm font-medium text-gray-700">
                        필요 수량 *
                      </label>
                      <input
                        type="number"
                        name="requiredQuantity"
                        id="requiredQuantity"
                        required
                        step="0.01"
                        min="0.01"
                        defaultValue={mapping?.requiredQuantity}
                        className="mt-1 block w-full py-2 px-3 text-brutal-black bg-brutal-white border-2 border-brutal-black shadow-brutal-sm placeholder:text-brutal-black/50 focus:outline-none focus:shadow-brutal focus:-translate-x-0.5 focus:-translate-y-0.5 transition-all sm:text-sm font-medium"
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
