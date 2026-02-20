'use client'

import { useState, useEffect, useCallback, useMemo, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { createMultiplePurchases } from '../actions'
import type { PurchaseEntry } from '../actions'
import { getMenus } from '../../master-data/menus/actions'
import {
  getIngredients,
  lookupByBarcode,
} from '../../master-data/ingredients/actions'
import { getMenuIngredients } from '../../master-data/menu-ingredients/actions'
import { getActiveSuppliers } from '../../master-data/suppliers/actions'
import { Button } from '@/components/ui/button'
import { toast } from '@/components/ui/toast'
import { Input } from '@/components/ui/input'
import { Select } from '@/components/ui/select'
import { Label } from '@/components/ui/label'
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
  barcode: string
  menuId: string
  ingredientId: string
  quantity: string
  totalPrice: string
  notes: string
  isExpanded: boolean
}

function generateId() {
  return Math.random().toString(36).substring(2, 9)
}

function createEmptyRow(): EntryRow {
  return {
    id: generateId(),
    barcode: '',
    menuId: '',
    ingredientId: '',
    quantity: '',
    totalPrice: '',
    notes: '',
    isExpanded: true,
  }
}

type SupplierOption = {
  id: string
  supplierName: string
}

export default function PurchaseForm() {
  const router = useRouter()
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [menus, setMenus] = useState<MenuCategory[]>([])
  const [ingredients, setIngredients] = useState<Ingredient[]>([])
  const [menuIngredients, setMenuIngredients] = useState<
    MenuIngredientMapping[]
  >([])
  const [suppliers, setSuppliers] = useState<SupplierOption[]>([])

  const [transactionDate, setTransactionDate] = useState(
    new Date().toISOString().split('T')[0]
  )
  const [supplierName, setSupplierName] = useState('')
  const [entries, setEntries] = useState<EntryRow[]>([createEmptyRow()])
  const barcodeInputRefs = useRef<Record<string, HTMLInputElement | null>>({})
  const barcodeLookupTimers = useRef<
    Record<string, ReturnType<typeof setTimeout>>
  >({})

  const focusBarcodeInput = useCallback((entryId: string) => {
    requestAnimationFrame(() => {
      barcodeInputRefs.current[entryId]?.focus()
    })
  }, [])

  const processBarcodeLookup = useCallback(
    async (entryId: string, rawBarcode: string) => {
      const barcode = rawBarcode.trim()
      if (!barcode) return

      try {
        const result = await lookupByBarcode(barcode)

        if (result.success && result.ingredient) {
          const mappedMenu = result.menuMappings?.[0]
          const ingredientName = result.ingredient.ingredientName

          setEntries((prev) =>
            prev.map((entry) =>
              entry.id === entryId
                ? {
                    ...entry,
                    barcode: '',
                    menuId: mappedMenu?.menuId || entry.menuId,
                    ingredientId: result.ingredient.id,
                  }
                : entry
            )
          )

          toast.success(
            mappedMenu?.menuName
              ? `${mappedMenu.menuName} - ${ingredientName} 선택됨`
              : `${ingredientName} 선택됨`
          )
        } else {
          setEntries((prev) =>
            prev.map((entry) =>
              entry.id === entryId ? { ...entry, barcode: '' } : entry
            )
          )
          toast.error('등록되지 않은 바코드입니다')
        }
      } catch {
        setEntries((prev) =>
          prev.map((entry) =>
            entry.id === entryId ? { ...entry, barcode: '' } : entry
          )
        )
        toast.error('바코드 조회 중 오류가 발생했습니다')
      } finally {
        focusBarcodeInput(entryId)
      }
    },
    [focusBarcodeInput]
  )

  const handleBarcodeChange = useCallback(
    (entryId: string, value: string) => {
      setEntries((prev) =>
        prev.map((entry) =>
          entry.id === entryId ? { ...entry, barcode: value } : entry
        )
      )

      if (barcodeLookupTimers.current[entryId]) {
        clearTimeout(barcodeLookupTimers.current[entryId])
      }

      const barcode = value.trim()
      if (!barcode) return

      barcodeLookupTimers.current[entryId] = setTimeout(() => {
        void processBarcodeLookup(entryId, barcode)
      }, 120)
    },
    [processBarcodeLookup]
  )

  const handleBarcodeEnter = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>, entryId: string) => {
      if (e.key !== 'Enter') return
      e.preventDefault()

      if (barcodeLookupTimers.current[entryId]) {
        clearTimeout(barcodeLookupTimers.current[entryId])
      }

      const barcode = e.currentTarget.value.trim()
      if (!barcode) return

      void processBarcodeLookup(entryId, barcode)
    },
    [processBarcodeLookup]
  )

  useEffect(() => {
    Promise.all([
      getMenus(),
      getIngredients(),
      getMenuIngredients(),
      getActiveSuppliers(),
    ]).then(([menusData, ingredientsData, mappingsData, suppliersData]) => {
      setMenus(menusData)
      setIngredients(ingredientsData)
      setMenuIngredients(mappingsData)
      setSuppliers(suppliersData)
    })
  }, [])

  const updateEntry = useCallback(
    (id: string, field: keyof EntryRow, value: string | boolean) => {
      setEntries((prev) =>
        prev.map((entry) => {
          if (entry.id !== id) return entry
          if (field === 'menuId') {
            return { ...entry, menuId: value as string, ingredientId: '' }
          }
          return { ...entry, [field]: value }
        })
      )
    },
    []
  )

  const addRow = useCallback(
    () => setEntries((prev) => [...prev, createEmptyRow()]),
    []
  )

  const removeRow = useCallback(
    (id: string) => {
      if (entries.length <= 1) return
      setEntries((prev) => prev.filter((entry) => entry.id !== id))
    },
    [entries.length]
  )

  const calculateUnitPrice = useCallback(
    (quantity: string, totalPrice: string) => {
      const q = parseFloat(quantity) || 0
      const t = parseFloat(totalPrice) || 0
      return q > 0 ? Math.round((t / q) * 100) / 100 : 0
    },
    []
  )

  const calculateGrandTotal = useMemo(() => {
    return entries.reduce((sum, e) => sum + (parseFloat(e.totalPrice) || 0), 0)
  }, [entries])

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    if (!transactionDate) {
      toast.error('거래 날짜를 선택해주세요')
      return
    }
    if (!supplierName.trim()) {
      toast.error('공급업체명을 입력해주세요')
      return
    }

    const validEntries = entries.filter(
      (entry) =>
        entry.menuId && entry.ingredientId && entry.quantity && entry.totalPrice
    )
    if (validEntries.length === 0) {
      toast.error('최소 하나의 항목을 입력해주세요')
      return
    }

    setIsSubmitting(true)
    try {
      const purchaseEntries: PurchaseEntry[] = validEntries.map((entry) => ({
        menuId: entry.menuId,
        ingredientId: entry.ingredientId,
        quantity: entry.quantity,
        unitPrice: calculateUnitPrice(
          entry.quantity,
          entry.totalPrice
        ).toString(),
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
        toast.success(
          `${result.successCount}건 매입이 등록되었습니다. 총 합계: ${totalAmount.toLocaleString()}원 (유효: ${validCount}건 / 무효: ${result.successCount - validCount}건)`
        )
        router.push('/dashboard/purchases')
      } else {
        const errorMsg =
          result.errors && result.errors.length > 0
            ? result.errors.join(', ')
            : result.error || '등록에 실패했습니다'
        toast.error(
          `${result.successCount}건 성공, ${result.failedCount}건 실패: ${errorMsg}`
        )
      }
    } finally {
      setIsSubmitting(false)
    }
  }

  const getFilteredIngredients = useCallback(
    (menuId: string) => {
      if (!menuId) return []
      return menuIngredients
        .filter((mi) => mi.menuId === menuId)
        .map((mapping) => {
          const ingredient = ingredients.find(
            (i) => i.id === mapping.ingredientId
          )
          return ingredient
            ? {
                id: ingredient.id,
                name: ingredient.ingredientName,
                unit: ingredient.unit,
              }
            : null
        })
        .filter(Boolean) as Array<{ id: string; name: string; unit: string }>
    },
    [menuIngredients, ingredients]
  )

  const getEntryDisplayName = useCallback(
    (entry: EntryRow) => {
      const menu = menus.find((m) => m.id === entry.menuId)
      const ingredient = ingredients.find((i) => i.id === entry.ingredientId)
      if (menu && ingredient)
        return `${menu.menuName} - ${ingredient.ingredientName}`
      if (menu) return menu.menuName
      return '새 항목'
    },
    [menus, ingredients]
  )

  return (
    <form onSubmit={handleSubmit} className="pb-32">
      {/* Shared Fields Section */}
      <div className="mb-4 border-3 border-brutal-black bg-brutal-white p-4 shadow-brutal">
        <h3 className="mb-4 text-sm font-black uppercase tracking-wide text-brutal-black">
          공통 정보
        </h3>
        <div className="space-y-4">
          <div>
            <Label htmlFor="transactionDate">📅 거래 날짜</Label>
            <Input
              type="date"
              id="transactionDate"
              required
              value={transactionDate}
              onChange={(e) => setTransactionDate(e.target.value)}
            />
          </div>
          <div>
            <Label htmlFor="supplierName">🏢 공급업체</Label>
            <Select
              id="supplierName"
              required
              value={supplierName}
              onChange={(e) => setSupplierName(e.target.value)}
            >
              <option value="">공급업체를 선택하세요</option>
              {suppliers.map((supplier) => (
                <option key={supplier.id} value={supplier.supplierName}>
                  {supplier.supplierName}
                </option>
              ))}
            </Select>
          </div>
        </div>
      </div>

      {/* Entry Rows Section */}
      <div className="mb-4">
        <div className="mb-3 flex items-center justify-between px-1">
          <h3 className="text-sm font-black uppercase tracking-wide text-brutal-black">
            매입 항목 ({entries.length}건)
          </h3>
        </div>

        <div className="space-y-3">
          {entries.map((entry, index) => {
            const filteredIngredients = getFilteredIngredients(entry.menuId)
            const entryTotal = parseFloat(entry.totalPrice) || 0
            const isComplete =
              entry.menuId &&
              entry.ingredientId &&
              entry.quantity &&
              entry.totalPrice

            return (
              <div
                key={entry.id}
                className={`overflow-hidden border-3 border-brutal-black bg-brutal-white shadow-brutal ${
                  isComplete ? 'border-brutal-green' : ''
                }`}
              >
                {/* Card Header */}
                <div
                  className="flex cursor-pointer items-center justify-between border-b-2 border-brutal-black bg-brutal-yellow/30 p-4"
                  onClick={() =>
                    updateEntry(entry.id, 'isExpanded', !entry.isExpanded)
                  }
                >
                  <div className="flex items-center gap-3">
                    <span className="flex h-7 w-7 items-center justify-center border-2 border-brutal-black bg-brutal-blue text-sm font-black text-brutal-black">
                      {index + 1}
                    </span>
                    <div>
                      <p className="font-bold text-brutal-black">
                        {getEntryDisplayName(entry)}
                      </p>
                      {isComplete && (
                        <p className="text-sm font-bold text-brutal-black">
                          {entryTotal.toLocaleString()}원
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
                        className="border-2 border-brutal-black p-2 text-brutal-black hover:bg-brutal-pink"
                      >
                        <svg
                          className="h-5 w-5"
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                        >
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
                      className={`h-5 w-5 text-brutal-black transition-transform ${
                        entry.isExpanded ? 'rotate-180' : ''
                      }`}
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M19 9l-7 7-7-7"
                      />
                    </svg>
                  </div>
                </div>

                {/* Card Body */}
                {entry.isExpanded && (
                  <div className="space-y-4 p-4">
                    <div className="border-2 border-brutal-black bg-brutal-blue/20 p-3">
                      <Label htmlFor={`barcode-${entry.id}`}>
                        📦 바코드 스캔
                      </Label>
                      <Input
                        id={`barcode-${entry.id}`}
                        type="text"
                        value={entry.barcode}
                        onChange={(e) =>
                          handleBarcodeChange(entry.id, e.target.value)
                        }
                        onKeyDown={(e) => handleBarcodeEnter(e, entry.id)}
                        placeholder="바코드를 스캔하세요"
                        className="mt-2 border-3 border-brutal-black font-bold"
                        ref={(element) => {
                          barcodeInputRefs.current[entry.id] = element
                        }}
                      />
                    </div>

                    <div>
                      <Label>메뉴 *</Label>
                      <Select
                        required
                        value={entry.menuId}
                        onChange={(e) =>
                          updateEntry(entry.id, 'menuId', e.target.value)
                        }
                      >
                        <option value="">메뉴를 선택하세요</option>
                        {menus
                          .filter((m) => m.isActive)
                          .map((menu) => (
                            <option key={menu.id} value={menu.id}>
                              {menu.menuName}
                            </option>
                          ))}
                      </Select>
                    </div>

                    <div>
                      <Label>재료 *</Label>
                      <Select
                        required
                        value={entry.ingredientId}
                        onChange={(e) =>
                          updateEntry(entry.id, 'ingredientId', e.target.value)
                        }
                        disabled={!entry.menuId}
                        className={
                          !entry.menuId
                            ? 'disabled:cursor-not-allowed disabled:bg-brutal-black/10'
                            : ''
                        }
                      >
                        <option value="">
                          {entry.menuId
                            ? '재료를 선택하세요'
                            : '먼저 메뉴를 선택하세요'}
                        </option>
                        {filteredIngredients.map((ing) => (
                          <option key={ing.id} value={ing.id}>
                            {ing.name} ({ing.unit})
                          </option>
                        ))}
                      </Select>
                      {entry.menuId && filteredIngredients.length === 0 && (
                        <p className="mt-2 border-2 border-brutal-black bg-brutal-yellow p-2 text-sm font-bold text-brutal-black">
                          ⚠️ 매핑된 재료가 없습니다
                        </p>
                      )}
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <Label>수량 *</Label>
                        <Input
                          type="number"
                          required
                          inputMode="decimal"
                          step="0.01"
                          min="0.01"
                          value={entry.quantity}
                          onChange={(e) =>
                            updateEntry(entry.id, 'quantity', e.target.value)
                          }
                          placeholder="예: 3"
                        />
                      </div>
                      <div>
                        <Label>총금액 (원) *</Label>
                        <Input
                          type="number"
                          required
                          inputMode="numeric"
                          step="1"
                          min="1"
                          value={entry.totalPrice}
                          onChange={(e) =>
                            updateEntry(entry.id, 'totalPrice', e.target.value)
                          }
                          placeholder="예: 13000"
                        />
                      </div>
                    </div>

                    {entry.quantity && entry.totalPrice && (
                      <div className="border-2 border-brutal-black bg-brutal-green/30 p-3 text-center">
                        <span className="text-sm font-bold text-brutal-black">
                          단가:{' '}
                        </span>
                        <span className="text-lg font-black text-brutal-black">
                          {calculateUnitPrice(
                            entry.quantity,
                            entry.totalPrice
                          ).toLocaleString()}
                          원
                        </span>
                        <span className="ml-1 text-sm font-medium text-brutal-black/60">
                          / 단위
                        </span>
                      </div>
                    )}

                    <div>
                      <Label>비고 (선택)</Label>
                      <Input
                        type="text"
                        value={entry.notes}
                        onChange={(e) =>
                          updateEntry(entry.id, 'notes', e.target.value)
                        }
                        placeholder="메모를 입력하세요"
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
          className="mt-3 w-full border-3 border-dashed border-brutal-black py-4 font-bold text-brutal-black transition-all hover:border-solid hover:bg-brutal-blue"
        >
          + 항목 추가
        </button>
      </div>

      {/* Grand Total - Sticky */}
      <div className="sticky bottom-24 z-10">
        <div className="-mx-4 px-4 pt-4">
          <div className="border-3 border-brutal-black bg-brutal-pink p-4 text-center shadow-brutal">
            <span className="text-sm font-bold text-brutal-black">총 합계</span>
            <p className="text-2xl font-black text-brutal-black">
              {calculateGrandTotal.toLocaleString()}원
            </p>
          </div>
        </div>
      </div>

      {/* Fixed Bottom Action Bar - positioned above bottom nav on mobile */}
      <div className="fixed bottom-14 left-0 right-0 z-20 border-t-3 border-brutal-black bg-brutal-yellow p-4 pb-[calc(1rem+env(safe-area-inset-bottom))] lg:bottom-0 lg:pb-4">
        <div className="mx-auto flex max-w-lg gap-3">
          <Button
            type="button"
            variant="secondary"
            onClick={() => router.back()}
            disabled={isSubmitting}
            className="flex-1 py-3 text-base"
          >
            취소
          </Button>
          <Button
            type="submit"
            disabled={isSubmitting}
            className="flex-1 py-3 text-base"
          >
            {isSubmitting ? '저장 중...' : `${entries.length}건 저장`}
          </Button>
        </div>
      </div>
    </form>
  )
}
