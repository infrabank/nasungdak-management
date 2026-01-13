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
  isExpanded: boolean
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
    isExpanded: true,
  }
}

export default function PurchaseForm() {
  const router = useRouter()
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [menus, setMenus] = useState<MenuCategory[]>([])
  const [ingredients, setIngredients] = useState<Ingredient[]>([])
  const [menuIngredients, setMenuIngredients] = useState<MenuIngredientMapping[]>([])

  const [transactionDate, setTransactionDate] = useState(
    new Date().toISOString().split('T')[0]
  )
  const [supplierName, setSupplierName] = useState('')
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

  const updateEntry = (id: string, field: keyof EntryRow, value: string | boolean) => {
    setEntries((prev) =>
      prev.map((entry) => {
        if (entry.id !== id) return entry
        if (field === 'menuId') {
          return { ...entry, menuId: value as string, ingredientId: '' }
        }
        return { ...entry, [field]: value }
      })
    )
  }

  const addRow = () => setEntries((prev) => [...prev, createEmptyRow()])
  
  const removeRow = (id: string) => {
    if (entries.length <= 1) return
    setEntries((prev) => prev.filter((entry) => entry.id !== id))
  }

  const calculateRowTotal = (quantity: string, unitPrice: string) => {
    return (parseFloat(quantity) || 0) * (parseFloat(unitPrice) || 0)
  }

  const calculateGrandTotal = () => {
    return entries.reduce((sum, e) => sum + calculateRowTotal(e.quantity, e.unitPrice), 0)
  }

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    if (!transactionDate) {
      alert('거래 날짜를 선택해주세요')
      return
    }
    if (!supplierName.trim()) {
      alert('공급업체명을 입력해주세요')
      return
    }

    const validEntries = entries.filter(
      (entry) => entry.menuId && entry.ingredientId && entry.quantity && entry.unitPrice
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

      const result = await createMultiplePurchases(transactionDate, supplierName.trim(), purchaseEntries)

      if (result.success) {
        const totalAmount = result.results.reduce((sum, r) => sum + r.totalAmount, 0)
        const validCount = result.results.filter((r) => r.isValid).length
        alert(
          `${result.successCount}건 매입이 등록되었습니다.\n` +
          `총 합계: ${totalAmount.toLocaleString()}원\n` +
          `유효: ${validCount}건 / 무효: ${result.successCount - validCount}건`
        )
        router.push('/dashboard/purchases')
      } else {
        const errorMsg =
          result.errors && result.errors.length > 0
            ? result.errors.join('\n')
            : result.error || '등록에 실패했습니다'
        alert(`${result.successCount}건 성공, ${result.failedCount}건 실패\n\n${errorMsg}`)
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

  const getEntryDisplayName = (entry: EntryRow) => {
    const menu = menus.find((m) => m.id === entry.menuId)
    const ingredient = ingredients.find((i) => i.id === entry.ingredientId)
    if (menu && ingredient) return `${menu.menuName} - ${ingredient.ingredientName}`
    if (menu) return menu.menuName
    return '새 항목'
  }

  const inputClass =
    'block w-full rounded-lg border-0 py-3 px-4 text-base text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-blue-600'
  const selectClass =
    'block w-full rounded-lg border-0 py-3 px-4 text-base text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 focus:ring-2 focus:ring-inset focus:ring-blue-600 appearance-none bg-white'
  const labelClass = 'block text-sm font-medium text-gray-700 mb-2'

  return (
    <form onSubmit={handleSubmit} className="pb-32">
      {/* Shared Fields Section */}
      <div className="bg-white rounded-xl shadow-sm ring-1 ring-gray-900/5 p-4 mb-4">
        <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-4">
          공통 정보
        </h3>
        <div className="space-y-4">
          <div>
            <label htmlFor="transactionDate" className={labelClass}>
              📅 거래 날짜
            </label>
            <input
              type="date"
              id="transactionDate"
              required
              value={transactionDate}
              onChange={(e) => setTransactionDate(e.target.value)}
              className={inputClass}
            />
          </div>
          <div>
            <label htmlFor="supplierName" className={labelClass}>
              🏢 공급업체
            </label>
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

      {/* Entry Rows Section */}
      <div className="mb-4">
        <div className="flex items-center justify-between mb-3 px-1">
          <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wide">
            매입 항목 ({entries.length}건)
          </h3>
        </div>

        <div className="space-y-3">
          {entries.map((entry, index) => {
            const filteredIngredients = getFilteredIngredients(entry.menuId)
            const rowTotal = calculateRowTotal(entry.quantity, entry.unitPrice)
            const isComplete =
              entry.menuId && entry.ingredientId && entry.quantity && entry.unitPrice

            return (
              <div
                key={entry.id}
                className={`bg-white rounded-xl shadow-sm ring-1 ring-gray-900/5 overflow-hidden ${
                  isComplete ? 'ring-green-200' : ''
                }`}
              >
                {/* Card Header */}
                <div
                  className="flex items-center justify-between p-4 bg-gray-50 cursor-pointer"
                  onClick={() => updateEntry(entry.id, 'isExpanded', !entry.isExpanded)}
                >
                  <div className="flex items-center gap-3">
                    <span className="flex items-center justify-center w-7 h-7 rounded-full bg-blue-100 text-blue-600 text-sm font-bold">
                      {index + 1}
                    </span>
                    <div>
                      <p className="font-medium text-gray-900">{getEntryDisplayName(entry)}</p>
                      {isComplete && (
                        <p className="text-sm text-green-600 font-medium">
                          {rowTotal.toLocaleString()}원
                        </p>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {entries.length > 1 && (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation()
                          removeRow(entry.id)
                        }}
                        className="p-2 text-red-500 hover:bg-red-50 rounded-lg"
                      >
                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                          />
                        </svg>
                      </button>
                    )}
                    <svg
                      className={`w-5 h-5 text-gray-400 transition-transform ${
                        entry.isExpanded ? 'rotate-180' : ''
                      }`}
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </div>
                </div>

                {/* Card Body */}
                {entry.isExpanded && (
                  <div className="p-4 space-y-4">
                    <div>
                      <label className={labelClass}>메뉴 *</label>
                      <div className="relative">
                        <select
                          required
                          value={entry.menuId}
                          onChange={(e) => updateEntry(entry.id, 'menuId', e.target.value)}
                          className={selectClass}
                        >
                          <option value="">메뉴를 선택하세요</option>
                          {menus
                            .filter((m) => m.isActive)
                            .map((menu) => (
                              <option key={menu.id} value={menu.id}>
                                {menu.menuName}
                              </option>
                            ))}
                        </select>
                        <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-4">
                          <svg className="h-5 w-5 text-gray-400" viewBox="0 0 20 20" fill="currentColor">
                            <path
                              fillRule="evenodd"
                              d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z"
                              clipRule="evenodd"
                            />
                          </svg>
                        </div>
                      </div>
                    </div>

                    <div>
                      <label className={labelClass}>재료 *</label>
                      <div className="relative">
                        <select
                          required
                          value={entry.ingredientId}
                          onChange={(e) => updateEntry(entry.id, 'ingredientId', e.target.value)}
                          disabled={!entry.menuId}
                          className={`${selectClass} disabled:bg-gray-100 disabled:cursor-not-allowed`}
                        >
                          <option value="">
                            {entry.menuId ? '재료를 선택하세요' : '먼저 메뉴를 선택하세요'}
                          </option>
                          {filteredIngredients.map((ing) => (
                            <option key={ing.id} value={ing.id}>
                              {ing.name} ({ing.unit})
                            </option>
                          ))}
                        </select>
                        <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-4">
                          <svg className="h-5 w-5 text-gray-400" viewBox="0 0 20 20" fill="currentColor">
                            <path
                              fillRule="evenodd"
                              d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z"
                              clipRule="evenodd"
                            />
                          </svg>
                        </div>
                      </div>
                      {entry.menuId && filteredIngredients.length === 0 && (
                        <p className="mt-2 text-sm text-amber-600">⚠️ 매핑된 재료가 없습니다</p>
                      )}
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className={labelClass}>수량 *</label>
                        <input
                          type="number"
                          required
                          inputMode="decimal"
                          step="0.01"
                          min="0.01"
                          value={entry.quantity}
                          onChange={(e) => updateEntry(entry.id, 'quantity', e.target.value)}
                          placeholder="0"
                          className={inputClass}
                        />
                      </div>
                      <div>
                        <label className={labelClass}>단가 (원) *</label>
                        <input
                          type="number"
                          required
                          inputMode="numeric"
                          step="1"
                          min="0"
                          value={entry.unitPrice}
                          onChange={(e) => updateEntry(entry.id, 'unitPrice', e.target.value)}
                          placeholder="0"
                          className={inputClass}
                        />
                      </div>
                    </div>

                    {(entry.quantity || entry.unitPrice) && (
                      <div className="bg-gray-50 rounded-lg p-3 text-center">
                        <span className="text-sm text-gray-500">소계: </span>
                        <span className="text-lg font-bold text-gray-900">
                          {rowTotal.toLocaleString()}원
                        </span>
                      </div>
                    )}

                    <div>
                      <label className={labelClass}>비고 (선택)</label>
                      <input
                        type="text"
                        value={entry.notes}
                        onChange={(e) => updateEntry(entry.id, 'notes', e.target.value)}
                        placeholder="메모를 입력하세요"
                        className={inputClass}
                      />
                    </div>
                  </div>
                )}
              </div>
            )
          })}
        </div>

        <button
          type="button"
          onClick={addRow}
          className="w-full mt-3 py-4 border-2 border-dashed border-gray-300 rounded-xl text-gray-500 font-medium hover:border-blue-400 hover:text-blue-500 hover:bg-blue-50 transition-colors"
        >
          + 항목 추가
        </button>
      </div>

      {/* Grand Total - Sticky */}
      <div className="sticky bottom-24 z-10">
        <div className="bg-gradient-to-t from-gray-50 via-gray-50 to-transparent pt-4 -mx-4 px-4">
          <div className="bg-red-50 rounded-xl p-4 text-center shadow-sm">
            <span className="text-sm text-red-600">총 합계</span>
            <p className="text-2xl font-bold text-red-700">
              {calculateGrandTotal().toLocaleString()}원
            </p>
          </div>
        </div>
      </div>

      {/* Fixed Bottom Action Bar */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 p-4 z-20">
        <div className="flex gap-3 max-w-lg mx-auto">
          <Button
            type="button"
            variant="secondary"
            onClick={() => router.back()}
            disabled={isSubmitting}
            className="flex-1 py-3 text-base"
          >
            취소
          </Button>
          <Button type="submit" disabled={isSubmitting} className="flex-1 py-3 text-base">
            {isSubmitting ? '저장 중...' : `${entries.length}건 저장`}
          </Button>
        </div>
      </div>
    </form>
  )
}
