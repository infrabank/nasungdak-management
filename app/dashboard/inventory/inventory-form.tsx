'use client'

import { useState } from 'react'
import { createInventory } from './actions'
import { Button } from '@/components/ui/button'
import type { Inventory } from '@/lib/db/schema'

interface InventoryFormProps {
  inventory?: Inventory
}

export default function InventoryForm({ inventory }: InventoryFormProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setIsSubmitting(true)

    const formData = new FormData(e.currentTarget)

    try {
      const result = await createInventory(formData)

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

  return (
    <>
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        className="block rounded-md bg-blue-600 px-3 py-2 text-center text-sm font-semibold text-white shadow-sm hover:bg-blue-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600"
      >
        재고 조정
      </button>

      {isOpen && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div
            className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity"
            onClick={() => setIsOpen(false)}
          />

          <div className="relative transform overflow-hidden rounded-lg bg-white px-4 pb-4 pt-5 text-left shadow-xl transition-all sm:my-8 sm:w-full sm:max-w-lg sm:p-6">
            <form onSubmit={handleSubmit}>
              <div>
                <h3 className="text-lg font-semibold leading-6 text-gray-900 mb-4">
                  재고 조정
                </h3>

                <div className="space-y-4">
                  <div>
                    <label htmlFor="storeId" className="block text-sm font-medium text-gray-700">
                      매장 *
                    </label>
                    <input
                      type="text"
                      name="storeId"
                      id="storeId"
                      required
                      defaultValue={inventory?.storeId || ''}
                      placeholder="매장 ID"
                      className="mt-1 block w-full rounded-md border-0 py-1.5 px-3 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-blue-600 sm:text-sm"
                    />
                  </div>

                  <div>
                    <label htmlFor="ingredientId" className="block text-sm font-medium text-gray-700">
                      재료 *
                    </label>
                    <input
                      type="text"
                      name="ingredientId"
                      id="ingredientId"
                      required
                      defaultValue={inventory?.ingredientId || ''}
                      placeholder="재료 ID"
                      className="mt-1 block w-full rounded-md border-0 py-1.5 px-3 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-blue-600 sm:text-sm"
                    />
                  </div>

                  <div>
                    <label htmlFor="currentQuantity" className="block text-sm font-medium text-gray-700">
                      현재 재고량 *
                    </label>
                    <input
                      type="number"
                      name="currentQuantity"
                      id="currentQuantity"
                      required
                      min="0"
                      step="0.01"
                      defaultValue={inventory?.currentQuantity ? String(inventory.currentQuantity) : ''}
                      placeholder="0.00"
                      className="mt-1 block w-full rounded-md border-0 py-1.5 px-3 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-blue-600 sm:text-sm"
                    />
                  </div>

                  <div>
                    <label htmlFor="unit" className="block text-sm font-medium text-gray-700">
                      단위
                    </label>
                    <input
                      type="text"
                      name="unit"
                      id="unit"
                      defaultValue={inventory?.unit || ''}
                      placeholder="kg, 개"
                      className="mt-1 block w-full rounded-md border-0 py-1.5 px-3 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-blue-600 sm:text-sm"
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
            </form>
          </div>
        </div>
      )}
    </>
  )
}
