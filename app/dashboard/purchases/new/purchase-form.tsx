'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createMultiplePurchases } from '../actions'
import type { PurchaseEntry } from '../actions'
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

type EntryRow = {
  id: string
  menuId: string
  ingredientId: string
  quantity: string
  unitPrice: string
  notes: string
}

function generateId() {
  return Math.random().toString(36).substring(2, 9)
}

function createEmptyRow(): EntryRow {
  return {
    id: generateId(),
    menuId: '',
    ingredientId: '',
    quantity: '',
    unitPrice: '',
    notes: '',
  }
}

export default function PurchaseForm() {
  const router = useRouter()
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [menus, setMenus] = useState<MenuCategory[]>([])
  const [ingredients, setIngredients] = useState<Ingredient[]>([])
  const [menuIngredients, setMenuIngredients] = useState<MenuIngredientMapping[]>([])

  // Shared fields
  const [transactionDate, setTransactionDate] = useState(
    new Date().toISOString().split('T')[0]
  )
  const [supplierName, setSupplierName] = useState('')

  // Multiple entry rows
  const [entries, setEntries] = useState<EntryRow[]>([createEmptyRow()])

  useEffect(() => {
    Promise.all([getMenus(), getIngredients(), getMenuIngredients()]).then(
      ([menusData, ingredientsData, mappingsData]) => {
        setMenus(menusData)
        setIngredients(ingredientsData)
        setMenuIngredients(mappingsData)
      }
    )
  }, [])

  const updateEntry = (id: string, field: keyof EntryRow, value: string) => {
    setEntries((prev) =>
      prev.map((entry) => {
        if (entry.id !== id) return entry
        // Reset ingredientId when menu changes
        if (field === 'menuId') {
          return { ...entry, menuId: value, ingredientId: '' }
        }
        return { ...entry, [field]: value }
      })
    )
  }

  const addRow = () => {
    setEntries((prev) => [...prev, createEmptyRow()])
  }

  const removeRow = (id: string) => {
    if (entries.length <= 1) return
    setEntries((prev) => prev.filter((entry) => entry.id !== id))
  }

  const calculateRowTotal = (quantity: string, unitPrice: string) => {
    const qty = parseFloat(quantity) || 0
    const price = parseFloat(unitPrice) || 0
    return qty * price
  }

  const calculateGrandTotal = () => {
    return entries.reduce(
      (sum, entry) => sum + calculateRowTotal(entry.quantity, entry.unitPrice),
      0
    )
  }

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()

    // Validate shared fields
    if (!transactionDate) {
      alert('거래 날짜를 선택해주세요')
      return
    }
    if (!supplierName.trim()) {
      alert('공급업체명을 입력해주세요')
      return
    }

    // Validate entries
    const validEntries = entries.filter(
      (entry) =>
        entry.menuId && entry.ingredientId && entry.quantity && entry.unitPrice
    )

    if (validEntries.length === 0) {
      alert('최소 하나의 항목을 입력해주세요')
      return
    }

    setIsSubmitting(true)

    try {
      const purchaseEntries: PurchaseEntry[] = validEntries.map((entry) => ({
        menuId: entry.menuId,
        ingredientId: entry.ingredientId,
        quantity: entry.quantity,
        unitPrice: entry.unitPrice,
        notes: entry.notes || null,
      }))

      const result = await createMultiplePurchases(
        transactionDate,
        supplierName.trim(),
        purchaseEntries
      )

      if (result.success) {
        const totalAmount = result.results.reduce(
          (sum, r) => sum + r.totalAmount,
          0
        )
        const validCount = result.results.filter((r) => r.isValid).length
        alert(
          `${result.successCount}건 매입이 등록되었습니다.\n` +
            `총 합계: ${totalAmount.toLocaleString()}원\n` +
            `유효: ${validCount}건 / 무효: ${result.successCount - validCount}건`
        )
        router.push('/dashboard/purchases')
      } else {
        const errorMsg =
          result.errors?.length > 0
            ? result.errors.join('\n')
            : result.error || '등록에 실패했습니다'
        alert(
          `${result.successCount}건 성공, ${result.failedCount}건 실패\n\n${errorMsg}`
        )
      }
    } finally {
      setIsSubmitting(false)
    }
  }

  const getFilteredIngredients = (menuId: string) => {
    if (!menuId) return []
    return menuIngredients
      .filter((mi) => mi.menuId === menuId)
      .map((mapping) => {
        const ingredient = ingredients.find((i) => i.id === mapping.ingredientId)
        return ingredient
          ? { id: ingredient.id, name: ingredient.ingredientName, unit: ingredient.unit }
          : null
      })
      .filter(Boolean) as Array<{ id: string; name: string; unit: string }>
  }

  const inputClass =
    'block w-full rounded-md border-0 py-1.5 px-3 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-blue-600 sm:text-sm'

  return (
    <form onSubmit={handleSubmit}>
      <div className="bg-white shadow-sm ring-1 ring-gray-900/5 sm:rounded-xl">
        {/* Shared Fields Section */}
        <div className="border-b border-gray-200 px-4 py-6 sm:p-8">
          <h3 className="mb-4 text-base font-semibold text-gray-900">
            공통 정보
          </h3>
          <div className="grid max-w-2xl grid-cols-1 gap-x-6 gap-y-4 sm:grid-cols-6">
            <div className="sm:col-span-3">
              <label
                htmlFor="transactionDate"
                className="block text-sm font-medium text-gray-900"
              >
                거래 날짜 *
              </label>
              <div className="mt-2">
                <input
                  type="date"
                  id="transactionDate"
                  required
                  value={transactionDate}
                  onChange={(e) => setTransactionDate(e.target.value)}
                  className={inputClass}
                />
              </div>
            </div>

            <div className="sm:col-span-3">
              <label
                htmlFor="supplierName"
                className="block text-sm font-medium text-gray-900"
              >
                공급업체 *
              </label>
              <div className="mt-2">
                <input
                  type="text"
                  id="supplierName"
                  required
                  value={supplierName}
                  onChange={(e) => setSupplierName(e.target.value)}
                  placeholder="공급업체명 입력"
                  className={inputClass}
                />
              </div>
            </div>
          </div>
        </div>

        {/* Entry Rows Section */}
        <div className="px-4 py-6 sm:p-8">
          <div className="mb-4 flex items-center justify-between">
            <h3 className="text-base font-semibold text-gray-900">
              매입 항목 ({entries.length}건)
            </h3>
            <Button type="button" variant="outline" size="sm" onClick={addRow}>
              + 항목 추가
            </Button>
          </div>

          <div className="space-y-4">
            {entries.map((entry, index) => {
              const filteredIngredients = getFilteredIngredients(entry.menuId)
              const rowTotal = calculateRowTotal(entry.quantity, entry.unitPrice)

              return (
                <div
                  key={entry.id}
                  className="rounded-lg border border-gray-200 bg-gray-50 p-4"
                >
                  <div className="mb-3 flex items-center justify-between">
                    <span className="text-sm font-medium text-gray-700">
                      #{index + 1}
                    </span>
                    {entries.length > 1 && (
                      <button
                        type="button"
                        onClick={() => removeRow(entry.id)}
                        className="text-sm text-red-600 hover:text-red-500"
                      >
                        삭제
                      </button>
                    )}
                  </div>

                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-12">
                    {/* Menu */}
                    <div className="sm:col-span-3">
                      <label className="block text-xs font-medium text-gray-700">
                        메뉴 *
                      </label>
                      <select
                        required
                        value={entry.menuId}
                        onChange={(e) =>
                          updateEntry(entry.id, 'menuId', e.target.value)
                        }
                        className={`mt-1 ${inputClass}`}
                      >
                        <option value="">선택</option>
                        {menus
                          .filter((m) => m.isActive)
                          .map((menu) => (
                            <option key={menu.id} value={menu.id}>
                              {menu.menuName}
                            </option>
                          ))}
                      </select>
                    </div>

                    {/* Ingredient */}
                    <div className="sm:col-span-3">
                      <label className="block text-xs font-medium text-gray-700">
                        재료 *
                      </label>
                      <select
                        required
                        value={entry.ingredientId}
                        onChange={(e) =>
                          updateEntry(entry.id, 'ingredientId', e.target.value)
                        }
                        disabled={!entry.menuId}
                        className={`mt-1 ${inputClass} disabled:cursor-not-allowed disabled:bg-gray-100`}
                      >
                        <option value="">
                          {entry.menuId ? '선택' : '메뉴 먼저 선택'}
                        </option>
                        {filteredIngredients.map((ing) => (
                          <option key={ing.id} value={ing.id}>
                            {ing.name} ({ing.unit})
                          </option>
                        ))}
                      </select>
                      {entry.menuId && filteredIngredients.length === 0 && (
                        <p className="mt-1 text-xs text-amber-600">
                          매핑된 재료 없음
                        </p>
                      )}
                    </div>

                    {/* Quantity */}
                    <div className="sm:col-span-2">
                      <label className="block text-xs font-medium text-gray-700">
                        수량 *
                      </label>
                      <input
                        type="number"
                        required
                        step="0.01"
                        min="0.01"
                        value={entry.quantity}
                        onChange={(e) =>
                          updateEntry(entry.id, 'quantity', e.target.value)
                        }
                        placeholder="0.00"
                        className={`mt-1 ${inputClass}`}
                      />
                    </div>

                    {/* Unit Price */}
                    <div className="sm:col-span-2">
                      <label className="block text-xs font-medium text-gray-700">
                        단가 (원) *
                      </label>
                      <input
                        type="number"
                        required
                        step="1"
                        min="0"
                        value={entry.unitPrice}
                        onChange={(e) =>
                          updateEntry(entry.id, 'unitPrice', e.target.value)
                        }
                        placeholder="0"
                        className={`mt-1 ${inputClass}`}
                      />
                    </div>

                    {/* Row Total */}
                    <div className="sm:col-span-2">
                      <label className="block text-xs font-medium text-gray-700">
                        소계
                      </label>
                      <div className="mt-1 rounded-md bg-gray-100 py-1.5 px-3 text-sm font-medium text-gray-900">
                        {rowTotal.toLocaleString()}원
                      </div>
                    </div>
                  </div>

                  {/* Notes (collapsible or compact) */}
                  <div className="mt-3">
                    <label className="block text-xs font-medium text-gray-700">
                      비고
                    </label>
                    <input
                      type="text"
                      value={entry.notes}
                      onChange={(e) =>
                        updateEntry(entry.id, 'notes', e.target.value)
                      }
                      placeholder="메모 (선택)"
                      className={`mt-1 ${inputClass}`}
                    />
                  </div>
                </div>
              )
            })}
          </div>

          {/* Grand Total */}
          <div className="mt-6 flex justify-end border-t border-gray-200 pt-4">
            <div className="text-right">
              <span className="text-sm text-gray-600">총 합계: </span>
              <span className="text-lg font-bold text-gray-900">
                {calculateGrandTotal().toLocaleString()}원
              </span>
            </div>
          </div>
        </div>

        {/* Form Actions */}
        <div className="flex items-center justify-between gap-x-6 border-t border-gray-900/10 px-4 py-4 sm:px-8">
          <Button type="button" variant="outline" size="sm" onClick={addRow}>
            + 항목 추가
          </Button>

          <div className="flex gap-x-3">
            <Button
              type="button"
              variant="secondary"
              onClick={() => router.back()}
              disabled={isSubmitting}
            >
              취소
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting
                ? '저장 중...'
                : `${entries.length}건 저장`}
            </Button>
          </div>
        </div>
      </div>
    </form>
  )
}
