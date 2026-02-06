'use client'

import { useState } from 'react'
import {
  createSalesMenu,
  updateSalesMenu,
  deleteSalesMenu,
  addMenuItemToBundle,
  removeMenuItemFromBundle,
} from './actions'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { formatCurrency } from '@/lib/utils/format'

interface MenuItem {
  id: string
  salesMenuId: string
  skuId: string
  skuName: string | null
  quantity: number
  isRequired: boolean
}

interface MenuFormProps {
  menu?: {
    id: string
    menuName: string
    menuType: string
    basePrice: string
    description: string | null
    isActive: boolean
    sortOrder: number
    items: MenuItem[]
  }
  skus: { id: string; skuName: string; unitPrice: string }[]
}

export default function MenuForm({ menu, skus }: MenuFormProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [menuType, setMenuType] = useState<'single' | 'bundle'>(
    (menu?.menuType as 'single' | 'bundle') || 'single'
  )
  const [bundleItems, setBundleItems] = useState<
    { skuId: string; quantity: number }[]
  >(
    menu?.items.map((item) => ({
      skuId: item.skuId,
      quantity: item.quantity,
    })) || []
  )

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setIsSubmitting(true)

    const formData = new FormData(e.currentTarget)

    try {
      const result = menu
        ? await updateSalesMenu(menu.id, formData)
        : await createSalesMenu(formData)

      if (result.success) {
        // For bundles, handle items
        if (menuType === 'bundle' && result.data) {
          // Add new items for bundle
          for (const item of bundleItems) {
            await addMenuItemToBundle(result.data.id, item.skuId, item.quantity)
          }
        }

        setIsOpen(false)
        if (!menu) {
          e.currentTarget.reset()
          setBundleItems([])
        }
      } else {
        alert(result.error)
      }
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleDelete = async () => {
    if (!menu) return
    if (!confirm('정말 삭제하시겠습니까?')) return

    setIsSubmitting(true)
    try {
      const result = await deleteSalesMenu(menu.id)
      if (result.success) {
        setIsOpen(false)
      } else {
        alert(result.error)
      }
    } finally {
      setIsSubmitting(false)
    }
  }

  const addBundleItem = () => {
    setBundleItems([...bundleItems, { skuId: '', quantity: 1 }])
  }

  const removeBundleItem = (index: number) => {
    setBundleItems(bundleItems.filter((_, i) => i !== index))
  }

  const updateBundleItem = (
    index: number,
    field: 'skuId' | 'quantity',
    value: string | number
  ) => {
    const updated = [...bundleItems]
    updated[index] = { ...updated[index], [field]: value }
    setBundleItems(updated)
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        className={
          menu
            ? 'px-1 font-bold text-brutal-black underline underline-offset-2 transition-all hover:bg-brutal-black hover:text-brutal-yellow'
            : 'border-2 border-brutal-black bg-brutal-yellow px-3 py-2 text-sm font-bold text-brutal-black shadow-brutal transition-all hover:-translate-x-0.5 hover:-translate-y-0.5 hover:shadow-brutal-lg'
        }
      >
        {menu ? '수정' : '새 메뉴 등록'}
      </button>

      {isOpen && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex min-h-full items-end justify-center p-4 text-center sm:items-center sm:p-0">
            <div
              className="fixed inset-0 bg-brutal-black/50 transition-opacity"
              onClick={() => setIsOpen(false)}
            />

            <div className="relative max-h-[90vh] transform overflow-y-auto border-3 border-brutal-black bg-brutal-white px-4 pb-4 pt-5 text-left shadow-brutal-lg transition-all sm:my-8 sm:w-full sm:max-w-lg sm:p-6">
              <form onSubmit={handleSubmit}>
                <div>
                  <h3 className="mb-4 text-lg font-semibold leading-6 text-brutal-black">
                    {menu ? '메뉴 수정' : '새 메뉴 등록'}
                  </h3>

                  <div className="space-y-4">
                    <div>
                      <Label htmlFor="menuName">메뉴명 *</Label>
                      <Input
                        type="text"
                        name="menuName"
                        id="menuName"
                        required
                        defaultValue={menu?.menuName}
                        placeholder="예: 붕어빵 3개 세트"
                      />
                    </div>

                    <div>
                      <Label>메뉴 유형 *</Label>
                      <div className="mt-2 flex gap-4">
                        <label className="flex items-center">
                          <input
                            type="radio"
                            name="menuType"
                            value="single"
                            checked={menuType === 'single'}
                            onChange={() => setMenuType('single')}
                            className="mr-2"
                          />
                          단품
                        </label>
                        <label className="flex items-center">
                          <input
                            type="radio"
                            name="menuType"
                            value="bundle"
                            checked={menuType === 'bundle'}
                            onChange={() => setMenuType('bundle')}
                            className="mr-2"
                          />
                          세트
                        </label>
                      </div>
                    </div>

                    <div>
                      <Label htmlFor="basePrice">판매가 (원) *</Label>
                      <Input
                        type="number"
                        name="basePrice"
                        id="basePrice"
                        required
                        min="0"
                        defaultValue={menu?.basePrice || ''}
                        placeholder="예: 2000"
                      />
                    </div>

                    {menuType === 'single' && (
                      <div>
                        <Label htmlFor="skuId">연결 SKU *</Label>
                        <select
                          name="skuId"
                          id="skuId"
                          required={menuType === 'single'}
                          defaultValue={menu?.items[0]?.skuId || ''}
                          className="w-full border-2 border-brutal-black bg-brutal-white px-3 py-2 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-brutal-black"
                        >
                          <option value="">SKU 선택</option>
                          {skus.map((sku) => (
                            <option key={sku.id} value={sku.id}>
                              {sku.skuName} (
                              {formatCurrency(Number(sku.unitPrice))})
                            </option>
                          ))}
                        </select>
                      </div>
                    )}

                    {menuType === 'bundle' && (
                      <div>
                        <Label>세트 구성</Label>
                        <div className="mt-2 space-y-2">
                          {bundleItems.map((item, index) => (
                            <div key={index} className="flex gap-2">
                              <select
                                value={item.skuId}
                                onChange={(e) =>
                                  updateBundleItem(
                                    index,
                                    'skuId',
                                    e.target.value
                                  )
                                }
                                className="flex-1 border-2 border-brutal-black bg-brutal-white px-2 py-1 text-sm"
                              >
                                <option value="">SKU 선택</option>
                                {skus.map((sku) => (
                                  <option key={sku.id} value={sku.id}>
                                    {sku.skuName}
                                  </option>
                                ))}
                              </select>
                              <input
                                type="number"
                                value={item.quantity}
                                onChange={(e) =>
                                  updateBundleItem(
                                    index,
                                    'quantity',
                                    parseInt(e.target.value) || 1
                                  )
                                }
                                min="1"
                                className="w-16 border-2 border-brutal-black px-2 py-1 text-sm"
                              />
                              <button
                                type="button"
                                onClick={() => removeBundleItem(index)}
                                className="border-2 border-brutal-black bg-red-100 px-2 text-sm font-bold hover:bg-red-200"
                              >
                                ×
                              </button>
                            </div>
                          ))}
                          <button
                            type="button"
                            onClick={addBundleItem}
                            className="w-full border-2 border-dashed border-brutal-black bg-brutal-white py-2 text-sm font-medium hover:bg-brutal-yellow/20"
                          >
                            + 구성 추가
                          </button>
                        </div>
                      </div>
                    )}

                    <div>
                      <Label htmlFor="description">설명</Label>
                      <Textarea
                        name="description"
                        id="description"
                        rows={2}
                        defaultValue={menu?.description || ''}
                      />
                    </div>

                    <div className="flex items-center">
                      <input
                        type="checkbox"
                        name="isActive"
                        id="isActive"
                        value="true"
                        defaultChecked={menu?.isActive ?? true}
                        className="h-4 w-4 border-brutal-black text-brutal-black"
                      />
                      <label
                        htmlFor="isActive"
                        className="ml-2 block text-sm text-brutal-black"
                      >
                        활성
                      </label>
                    </div>

                    <input
                      type="hidden"
                      name="sortOrder"
                      value={menu?.sortOrder || 0}
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
                </div>

                {menu && (
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
