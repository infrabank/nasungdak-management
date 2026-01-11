'use client'

import { useState } from 'react'
import { createTossMapping, updateTossMapping, deleteTossMapping } from './actions'
import { Button } from '@/components/ui/button'
import type { TossSkuMapping } from '@/lib/db/schema'

interface TossMappingFormProps {
  mapping?: TossSkuMapping
  stores: { id: string; storeName: string; storeCode: string }[]
  skus: { id: string; skuName: string }[]
}

export default function TossMappingForm({ mapping, stores, skus }: TossMappingFormProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setIsSubmitting(true)

    const formData = new FormData(e.currentTarget)

    try {
      const result = mapping
        ? await updateTossMapping(mapping.id, formData)
        : await createTossMapping(formData)

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
      const result = await deleteTossMapping(mapping.id)
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
            ? 'text-blue-600 hover:text-blue-900'
            : 'block rounded-md bg-blue-600 px-3 py-2 text-center text-sm font-semibold text-white shadow-sm hover:bg-blue-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600'
        }
      >
        {mapping ? '수정' : '새 매핑 등록'}
      </button>

      {isOpen && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex min-h-full items-end justify-center p-4 text-center sm:items-center sm:p-0">
            <div
              className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity"
              onClick={() => setIsOpen(false)}
            />

            <div className="relative transform overflow-hidden rounded-lg bg-white px-4 pb-4 pt-5 text-left shadow-xl transition-all sm:my-8 sm:w-full sm:max-w-lg sm:p-6">
              <form onSubmit={handleSubmit}>
                <div>
                  <h3 className="text-lg font-semibold leading-6 text-gray-900 mb-4">
                    {mapping ? '매핑 수정' : '새 매핑 등록'}
                  </h3>

                  <div className="space-y-4">
                    <div>
                      <label htmlFor="storeId" className="block text-sm font-medium text-gray-700">
                        매장 *
                      </label>
                      <select
                        name="storeId"
                        id="storeId"
                        required
                        defaultValue={mapping?.storeId || ''}
                        className="mt-1 block w-full rounded-md border-0 py-1.5 px-3 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-blue-600 sm:text-sm"
                      >
                        <option value="">선택하세요</option>
                        {stores.map((store) => (
                          <option key={store.id} value={store.id}>
                            {store.storeName} ({store.storeCode})
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label htmlFor="tossItemCode" className="block text-sm font-medium text-gray-700">
                        토스 품목 코드 *
                      </label>
                      <input
                        type="text"
                        name="tossItemCode"
                        id="tossItemCode"
                        required
                        defaultValue={mapping?.tossItemCode || ''}
                        placeholder="예: ITEM001"
                        className="mt-1 block w-full rounded-md border-0 py-1.5 px-3 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-blue-600 sm:text-sm"
                      />
                      <p className="mt-1 text-xs text-gray-500">토스 POS에서 확인한 품목 코드를 입력하세요</p>
                    </div>

                    <div>
                      <label htmlFor="tossItemName" className="block text-sm font-medium text-gray-700">
                        토스 품목명
                      </label>
                      <input
                        type="text"
                        name="tossItemName"
                        id="tossItemName"
                        defaultValue={mapping?.tossItemName || ''}
                        placeholder="예: 닭강정(중)"
                        className="mt-1 block w-full rounded-md border-0 py-1.5 px-3 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-blue-600 sm:text-sm"
                      />
                    </div>

                    <div>
                      <label htmlFor="skuId" className="block text-sm font-medium text-gray-700">
                        내부 SKU
                      </label>
                      <select
                        name="skuId"
                        id="skuId"
                        defaultValue={mapping?.skuId || ''}
                        className="mt-1 block w-full rounded-md border-0 py-1.5 px-3 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-blue-600 sm:text-sm"
                      >
                        <option value="">매핑하지 않음</option>
                        {skus.map((sku) => (
                          <option key={sku.id} value={sku.id}>
                            {sku.skuName}
                          </option>
                        ))}
                      </select>
                      <p className="mt-1 text-xs text-gray-500">빈 값이면 미매핑으로 처리됩니다</p>
                    </div>

                    <div className="flex items-center">
                      <input
                        type="checkbox"
                        name="isActive"
                        id="isActive"
                        value="true"
                        defaultChecked={mapping?.isActive ?? true}
                        className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-600"
                      />
                      <label htmlFor="isActive" className="ml-2 block text-sm text-gray-900">
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
