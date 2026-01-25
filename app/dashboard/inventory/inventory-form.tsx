'use client'

import { useState } from 'react'
import { createInventory } from './actions'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
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
        className="px-3 py-2 text-sm font-bold text-brutal-black bg-brutal-yellow border-2 border-brutal-black shadow-brutal hover:shadow-brutal-lg hover:-translate-x-0.5 hover:-translate-y-0.5 transition-all"
      >
        재고 조정
      </button>

      {isOpen && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div
            className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity"
            onClick={() => setIsOpen(false)}
          />

          <div className="relative transform overflow-hidden bg-brutal-white border-3 border-brutal-black shadow-brutal-lg px-4 pb-4 pt-5 text-left transition-all sm:my-8 sm:w-full sm:max-w-lg sm:p-6">
            <form onSubmit={handleSubmit}>
              <div>
                <h3 className="text-lg font-semibold leading-6 text-gray-900 mb-4">
                  재고 조정
                </h3>

                <div className="space-y-4">
                  <div>
                    <Label htmlFor="storeId">매장 *</Label>
                    <Input
                      type="text"
                      name="storeId"
                      id="storeId"
                      required
                      defaultValue={inventory?.storeId || ''}
                      placeholder="매장 ID"
                    />
                  </div>

                  <div>
                    <Label htmlFor="ingredientId">재료 *</Label>
                    <Input
                      type="text"
                      name="ingredientId"
                      id="ingredientId"
                      required
                      defaultValue={inventory?.ingredientId || ''}
                      placeholder="재료 ID"
                    />
                  </div>

                  <div>
                    <Label htmlFor="currentQuantity">현재 재고량 *</Label>
                    <Input
                      type="number"
                      name="currentQuantity"
                      id="currentQuantity"
                      required
                      min="0"
                      step="0.01"
                      defaultValue={inventory?.currentQuantity ? String(inventory.currentQuantity) : ''}
                      placeholder="0.00"
                    />
                  </div>

                  <div>
                    <Label htmlFor="unit">단위</Label>
                    <Input
                      type="text"
                      name="unit"
                      id="unit"
                      defaultValue={inventory?.unit || ''}
                      placeholder="kg, 개"
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
