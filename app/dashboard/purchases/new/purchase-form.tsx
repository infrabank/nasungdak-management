'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { createMultiplePurchases } from '../actions'
import type { PurchaseEntry } from '../actions'
import { getMenus } from '../../master-data/menus/actions'
import { getIngredients } from '../../master-data/ingredients/actions'
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

type SupplierOption = {
  id: string
  supplierName: string
}

export default function PurchaseForm() {
  const router = useRouter()
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [menus, setMenus] = useState<MenuCategory[]>([])
  const [ingredients, setIngredients] = useState<Ingredient[]>([])
  const [menuIngredients, setMenuIngredients] = useState<MenuIngredientMapping[]>([])
  const [suppliers, setSuppliers] = useState<SupplierOption[]>([])

  const [transactionDate, setTransactionDate] = useState(
    new Date().toISOString().split('T')[0]
  )
  const [supplierName, setSupplierName] = useState('')
  const [entries, setEntries] = useState<EntryRow[]>([createEmptyRow()])

  useEffect(() => {
    Promise.all([getMenus(), getIngredients(), getMenuIngredients(), getActiveSuppliers()]).then(
      ([menusData, ingredientsData, mappingsData, suppliersData]) => {
        setMenus(menusData)
        setIngredients(ingredientsData)
        setMenuIngredients(mappingsData)
        setSuppliers(suppliersData)
      }
    )
  }, [])

   const updateEntry = useCallback((id: string, field: keyof EntryRow, value: string | boolean) => {
     setEntries((prev) =>
       prev.map((entry) => {
         if (entry.id !== id) return entry
         if (field === 'menuId') {
           return { ...entry, menuId: value as string, ingredientId: '' }
         }
         return { ...entry, [field]: value }
       })
     )
   }, [])

   const addRow = useCallback(() => setEntries((prev) => [...prev, createEmptyRow()]), [])
   
   const removeRow = useCallback((id: string) => {
     if (entries.length <= 1) return
     setEntries((prev) => prev.filter((entry) => entry.id !== id))
   }, [entries.length])

   const calculateRowTotal = useCallback((quantity: string, unitPrice: string) => {
     return (parseFloat(quantity) || 0) * (parseFloat(unitPrice) || 0)
   }, [])

   const calculateGrandTotal = useMemo(() => {
     return entries.reduce((sum, e) => sum + calculateRowTotal(e.quantity, e.unitPrice), 0)
   }, [entries, calculateRowTotal])

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
       (entry) => entry.menuId && entry.ingredientId && entry.quantity && entry.unitPrice
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
        unitPrice: entry.unitPrice,
        notes: entry.notes || null,
      }))

       const result = await createMultiplePurchases(transactionDate, supplierName.trim(), purchaseEntries)

       if (result.success) {
         const totalAmount = result.results.reduce((sum, r) => sum + r.totalAmount, 0)
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
         toast.error(`${result.successCount}건 성공, ${result.failedCount}건 실패: ${errorMsg}`)
       }
    } finally {
      setIsSubmitting(false)
    }
  }

   const getFilteredIngredients = useCallback((menuId: string) => {
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
   }, [menuIngredients, ingredients])

   const getEntryDisplayName = useCallback((entry: EntryRow) => {
     const menu = menus.find((m) => m.id === entry.menuId)
     const ingredient = ingredients.find((i) => i.id === entry.ingredientId)
     if (menu && ingredient) return `${menu.menuName} - ${ingredient.ingredientName}`
     if (menu) return menu.menuName
     return '새 항목'
   }, [menus, ingredients])

   return (
    <form onSubmit={handleSubmit} className="pb-32">
      {/* Shared Fields Section */}
      <div className="bg-brutal-white border-3 border-brutal-black shadow-brutal p-4 mb-4">
        <h3 className="text-sm font-black text-brutal-black uppercase tracking-wide mb-4">
          공통 정보
        </h3>
         <div className="space-y-4">
           <div>
             <Label htmlFor="transactionDate">
               📅 거래 날짜
             </Label>
             <Input
               type="date"
               id="transactionDate"
               required
               value={transactionDate}
               onChange={(e) => setTransactionDate(e.target.value)}
             />
           </div>
           <div>
             <Label htmlFor="supplierName">
               🏢 공급업체
             </Label>
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
        <div className="flex items-center justify-between mb-3 px-1">
          <h3 className="text-sm font-black text-brutal-black uppercase tracking-wide">
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
                className={`bg-brutal-white border-3 border-brutal-black shadow-brutal overflow-hidden ${
                  isComplete ? 'border-brutal-green' : ''
                }`}
              >
                {/* Card Header */}
                <div
                  className="flex items-center justify-between p-4 bg-brutal-yellow/30 cursor-pointer border-b-2 border-brutal-black"
                  onClick={() => updateEntry(entry.id, 'isExpanded', !entry.isExpanded)}
                >
                  <div className="flex items-center gap-3">
                    <span className="flex items-center justify-center w-7 h-7 bg-brutal-blue border-2 border-brutal-black text-brutal-black text-sm font-black">
                      {index + 1}
                    </span>
                    <div>
                      <p className="font-bold text-brutal-black">{getEntryDisplayName(entry)}</p>
                      {isComplete && (
                        <p className="text-sm text-brutal-black font-bold">
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
                        className="p-2 text-brutal-black hover:bg-brutal-pink border-2 border-brutal-black"
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
                      className={`w-5 h-5 text-brutal-black transition-transform ${
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
                       <Label>메뉴 *</Label>
                       <Select
                         required
                         value={entry.menuId}
                         onChange={(e) => updateEntry(entry.id, 'menuId', e.target.value)}
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
                         onChange={(e) => updateEntry(entry.id, 'ingredientId', e.target.value)}
                         disabled={!entry.menuId}
                         className={!entry.menuId ? 'disabled:bg-brutal-black/10 disabled:cursor-not-allowed' : ''}
                       >
                         <option value="">
                           {entry.menuId ? '재료를 선택하세요' : '먼저 메뉴를 선택하세요'}
                         </option>
                         {filteredIngredients.map((ing) => (
                           <option key={ing.id} value={ing.id}>
                             {ing.name} ({ing.unit})
                           </option>
                         ))}
                       </Select>
                       {entry.menuId && filteredIngredients.length === 0 && (
                         <p className="mt-2 text-sm font-bold text-brutal-black bg-brutal-yellow border-2 border-brutal-black p-2">⚠️ 매핑된 재료가 없습니다</p>
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
                           onChange={(e) => updateEntry(entry.id, 'quantity', e.target.value)}
                           placeholder="0"
                         />
                       </div>
                       <div>
                         <Label>단가 (원) *</Label>
                         <Input
                           type="number"
                           required
                           inputMode="numeric"
                           step="1"
                           value={entry.unitPrice}
                           onChange={(e) => updateEntry(entry.id, 'unitPrice', e.target.value)}
                           placeholder="0"
                         />
                       </div>
                     </div>

                     {(entry.quantity || entry.unitPrice) && (
                       <div className="bg-brutal-green/30 border-2 border-brutal-black p-3 text-center">
                         <span className="text-sm font-bold text-brutal-black">소계: </span>
                         <span className="text-lg font-black text-brutal-black">
                           {rowTotal.toLocaleString()}원
                         </span>
                       </div>
                     )}

                     <div>
                       <Label>비고 (선택)</Label>
                       <Input
                         type="text"
                         value={entry.notes}
                         onChange={(e) => updateEntry(entry.id, 'notes', e.target.value)}
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
          className="w-full mt-3 py-4 border-3 border-dashed border-brutal-black text-brutal-black font-bold hover:border-solid hover:bg-brutal-blue transition-all"
        >
          + 항목 추가
        </button>
      </div>

       {/* Grand Total - Sticky */}
       <div className="sticky bottom-24 z-10">
         <div className="pt-4 -mx-4 px-4">
           <div className="bg-brutal-pink border-3 border-brutal-black shadow-brutal p-4 text-center">
             <span className="text-sm font-bold text-brutal-black">총 합계</span>
             <p className="text-2xl font-black text-brutal-black">
               {calculateGrandTotal.toLocaleString()}원
             </p>
           </div>
         </div>
       </div>

      {/* Fixed Bottom Action Bar - positioned above bottom nav on mobile */}
      <div className="fixed bottom-14 lg:bottom-0 left-0 right-0 bg-brutal-yellow border-t-3 border-brutal-black p-4 pb-[calc(1rem+env(safe-area-inset-bottom))] lg:pb-4 z-20">
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
