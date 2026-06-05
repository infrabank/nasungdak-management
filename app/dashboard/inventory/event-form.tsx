'use client'

import { useMemo, useState } from 'react'
import { createInventoryEvent } from './actions'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select } from '@/components/ui/select'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Combobox, type ComboboxOption } from '@/components/ui/combobox'
import type { StoreOption, IngredientOption } from './inventory-form'

interface EventFormProps {
  stores: StoreOption[]
  ingredients: IngredientOption[]
}

export default function EventForm({ stores, ingredients }: EventFormProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const defaultStoreId = stores.length === 1 ? stores[0].id : ''
  const [storeId, setStoreId] = useState(defaultStoreId)
  const [ingredientId, setIngredientId] = useState('')

  const storeOptions: ComboboxOption[] = useMemo(
    () =>
      stores.map((s) => ({
        value: s.id,
        label: s.storeName,
        sublabel: s.storeCode,
      })),
    [stores]
  )

  const ingredientOptions: ComboboxOption[] = useMemo(
    () =>
      ingredients.map((i) => ({
        value: i.id,
        label: i.ingredientName,
        sublabel: i.unit,
      })),
    [ingredients]
  )

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setIsSubmitting(true)

    const form = e.currentTarget
    const formData = new FormData(form)

    try {
      const result = await createInventoryEvent(formData)

      if (result.success) {
        setIsOpen(false)
        form.reset()
        setStoreId(defaultStoreId)
        setIngredientId('')
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
        className="border-2 border-brutal-black bg-brutal-orange px-3 py-2 text-sm font-bold text-brutal-black shadow-brutal transition-all hover:-translate-x-0.5 hover:-translate-y-0.5 hover:shadow-brutal-lg"
      >
        + 폐기/조정
      </button>

      {isOpen && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex min-h-full items-end justify-center p-4 text-center sm:items-center sm:p-0">
            <div
              className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity"
              onClick={() => setIsOpen(false)}
            />

            <div className="relative w-full transform border-3 border-brutal-black bg-brutal-white px-4 pb-4 pt-5 text-left shadow-brutal-lg transition-all sm:my-8 sm:max-w-lg sm:p-6">
              <form onSubmit={handleSubmit}>
                <input type="hidden" name="storeId" value={storeId} />
                <input
                  type="hidden"
                  name="ingredientId"
                  value={ingredientId}
                />

                <div>
                  <h3 className="mb-4 text-lg font-semibold leading-6 text-gray-900">
                    재고 이벤트 등록
                  </h3>

                  <div className="space-y-4">
                    <div>
                      <Label htmlFor="storeId">매장 *</Label>
                      <Combobox
                        id="storeId"
                        options={storeOptions}
                        value={storeId}
                        onChange={setStoreId}
                        placeholder="매장을 선택하세요"
                        required
                      />
                    </div>

                    <div>
                      <Label htmlFor="ingredientId">재료 *</Label>
                      <Combobox
                        id="ingredientId"
                        options={ingredientOptions}
                        value={ingredientId}
                        onChange={setIngredientId}
                        placeholder="재료를 검색하세요"
                        required
                      />
                    </div>

                    <div>
                      <Label htmlFor="eventType">이벤트 유형 *</Label>
                      <Select name="eventType" id="eventType" required>
                        <option value="">선택하세요</option>
                        <option value="purchase">매입 (재고 증가)</option>
                        <option value="sale">판매 (재고 감소)</option>
                        <option value="waste">폐기 (손실)</option>
                        <option value="audit">실사 (조정)</option>
                        <option value="adjustment">조정</option>
                      </Select>
                    </div>

                    <div>
                      <Label htmlFor="quantityChange">수량 변동 *</Label>
                      <Input
                        type="number"
                        name="quantityChange"
                        id="quantityChange"
                        required
                        inputMode="decimal"
                        step="0.01"
                        placeholder="양수: 증가, 음수: 감소"
                      />
                    </div>

                    <div>
                      <Label htmlFor="eventDate">이벤트 날짜 *</Label>
                      <Input
                        type="date"
                        name="eventDate"
                        id="eventDate"
                        required
                      />
                    </div>

                    <div>
                      <Label htmlFor="reason">사유</Label>
                      <Textarea
                        name="reason"
                        id="reason"
                        rows={3}
                        placeholder="사유를 입력하세요 (선택사항)"
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
        </div>
      )}
    </>
  )
}
