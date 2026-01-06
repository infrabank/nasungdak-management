'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createPurchase } from '../actions'
import { getMenus } from '../../master-data/menus/actions'
import { getIngredients } from '../../master-data/ingredients/actions'
import { getMenuIngredients } from '../../master-data/menu-ingredients/actions'
import { Button } from '@/components/ui/button'
import type { MenuCategory, Ingredient } from '@/lib/db/schema'

type MenuIngredientMapping = {
  id: string
  menuId: string
  menuName: string | null
  ingredientId: string
  ingredientName: string | null
  unit: string | null
  requiredQuantity: string
}

export default function PurchaseForm() {
  const router = useRouter()
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [menus, setMenus] = useState<MenuCategory[]>([])
  const [ingredients, setIngredients] = useState<Ingredient[]>([])
  const [menuIngredients, setMenuIngredients] = useState<MenuIngredientMapping[]>([])
  const [selectedMenuId, setSelectedMenuId] = useState<string>('')

  useEffect(() => {
    Promise.all([
      getMenus(),
      getIngredients(),
      getMenuIngredients(),
    ]).then(([menusData, ingredientsData, mappingsData]) => {
      setMenus(menusData)
      setIngredients(ingredientsData)
      setMenuIngredients(mappingsData)
    })
  }, [])

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setIsSubmitting(true)

    const formData = new FormData(e.currentTarget)

    try {
      const result = await createPurchase(formData)

      if (result.success) {
        alert(`매입이 등록되었습니다.\n합계: ${result.data?.totalAmount.toLocaleString()}원\n검증: ${result.data?.isValid ? '유효' : '무효'}`)
        router.push('/dashboard/purchases')
      } else {
        alert(result.error)
      }
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <form onSubmit={handleSubmit}>
      <div className="bg-white shadow-sm ring-1 ring-gray-900/5 sm:rounded-xl">
        <div className="px-4 py-6 sm:p-8">
          <div className="grid max-w-2xl grid-cols-1 gap-x-6 gap-y-8 sm:grid-cols-6">
            <div className="sm:col-span-3">
              <label htmlFor="transactionDate" className="block text-sm font-medium text-gray-900">
                거래 날짜 *
              </label>
              <div className="mt-2">
                <input
                  type="date"
                  name="transactionDate"
                  id="transactionDate"
                  required
                  defaultValue={new Date().toISOString().split('T')[0]}
                  className="block w-full rounded-md border-0 py-1.5 px-3 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-blue-600 sm:text-sm"
                />
              </div>
            </div>

            <div className="sm:col-span-3">
              <label htmlFor="menuId" className="block text-sm font-medium text-gray-900">
                메뉴 *
              </label>
              <div className="mt-2">
                <select
                  id="menuId"
                  name="menuId"
                  required
                  value={selectedMenuId}
                  onChange={(e) => setSelectedMenuId(e.target.value)}
                  className="block w-full rounded-md border-0 py-1.5 px-3 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 focus:ring-2 focus:ring-inset focus:ring-blue-600 sm:text-sm"
                >
                  <option value="">선택하세요</option>
                  {menus.filter(m => m.isActive).map((menu) => (
                    <option key={menu.id} value={menu.id}>
                      {menu.menuName}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="sm:col-span-3">
              <label htmlFor="ingredientId" className="block text-sm font-medium text-gray-900">
                재료 *
              </label>
              <div className="mt-2">
                <select
                  id="ingredientId"
                  name="ingredientId"
                  required
                  disabled={!selectedMenuId}
                  className="block w-full rounded-md border-0 py-1.5 px-3 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 focus:ring-2 focus:ring-inset focus:ring-blue-600 sm:text-sm disabled:bg-gray-100 disabled:cursor-not-allowed"
                >
                  <option value="">{selectedMenuId ? '재료를 선택하세요' : '먼저 메뉴를 선택하세요'}</option>
                  {selectedMenuId && menuIngredients
                    .filter(mi => mi.menuId === selectedMenuId)
                    .map((mapping) => {
                      const ingredient = ingredients.find(i => i.id === mapping.ingredientId)
                      return ingredient ? (
                        <option key={ingredient.id} value={ingredient.id}>
                          {ingredient.ingredientName} ({ingredient.unit})
                        </option>
                      ) : null
                    })}
                </select>
              </div>
              {selectedMenuId && menuIngredients.filter(mi => mi.menuId === selectedMenuId).length === 0 && (
                <p className="mt-2 text-sm text-amber-600">
                  ⚠ 이 메뉴에 매핑된 재료가 없습니다. 기초 데이터에서 메뉴-재료 매핑을 먼저 설정해주세요.
                </p>
              )}
            </div>

            <div className="sm:col-span-3">
              <label htmlFor="supplierName" className="block text-sm font-medium text-gray-900">
                공급업체 *
              </label>
              <div className="mt-2">
                <input
                  type="text"
                  name="supplierName"
                  id="supplierName"
                  required
                  placeholder="공급업체명 입력"
                  className="block w-full rounded-md border-0 py-1.5 px-3 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-blue-600 sm:text-sm"
                />
              </div>
            </div>

            <div className="sm:col-span-3">
              <label htmlFor="quantity" className="block text-sm font-medium text-gray-900">
                수량 *
              </label>
              <div className="mt-2">
                <input
                  type="number"
                  name="quantity"
                  id="quantity"
                  required
                  step="0.01"
                  min="0.01"
                  placeholder="0.00"
                  className="block w-full rounded-md border-0 py-1.5 px-3 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-blue-600 sm:text-sm"
                />
              </div>
            </div>

            <div className="sm:col-span-3">
              <label htmlFor="unitPrice" className="block text-sm font-medium text-gray-900">
                단가 (원) *
              </label>
              <div className="mt-2">
                <input
                  type="number"
                  name="unitPrice"
                  id="unitPrice"
                  required
                  step="0.01"
                  min="0"
                  placeholder="0.00"
                  className="block w-full rounded-md border-0 py-1.5 px-3 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-blue-600 sm:text-sm"
                />
              </div>
            </div>

            <div className="sm:col-span-6">
              <label htmlFor="notes" className="block text-sm font-medium text-gray-900">
                비고
              </label>
              <div className="mt-2">
                <textarea
                  id="notes"
                  name="notes"
                  rows={3}
                  className="block w-full rounded-md border-0 py-1.5 px-3 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-blue-600 sm:text-sm"
                  placeholder="추가 메모 (선택사항)"
                />
              </div>
            </div>
          </div>
        </div>

        <div className="flex items-center justify-end gap-x-6 border-t border-gray-900/10 px-4 py-4 sm:px-8">
          <Button
            type="button"
            variant="secondary"
            onClick={() => router.back()}
            disabled={isSubmitting}
          >
            취소
          </Button>
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting ? '저장 중...' : '저장'}
          </Button>
        </div>
      </div>
    </form>
  )
}
