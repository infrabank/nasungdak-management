'use client'

import { useMemo, useState } from 'react'
import { createAlertRule } from './actions'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Combobox, type ComboboxOption } from '@/components/ui/combobox'
import type { InventoryAlertRule } from '@/lib/db/schema'
import type { StoreOption, IngredientOption } from './inventory-form'

interface AlertRuleFormProps {
  rule?: InventoryAlertRule
  stores: StoreOption[]
  ingredients: IngredientOption[]
}

export default function AlertRuleForm({
  rule,
  stores,
  ingredients,
}: AlertRuleFormProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)

  // 빈 storeId = 전체 매장
  const [storeId, setStoreId] = useState(rule?.storeId || '')
  const [ingredientId, setIngredientId] = useState(rule?.ingredientId || '')

  const storeOptions: ComboboxOption[] = useMemo(
    () => [
      { value: '', label: '전체 매장' },
      ...stores.map((s) => ({
        value: s.id,
        label: s.storeName,
        sublabel: s.storeCode,
      })),
    ],
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
      const result = await createAlertRule(formData)

      if (result.success) {
        setIsOpen(false)
        form.reset()
        setStoreId(rule?.storeId || '')
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
        className="border-2 border-brutal-black bg-brutal-green px-3 py-2 text-sm font-bold text-brutal-black shadow-brutal transition-all hover:-translate-x-0.5 hover:-translate-y-0.5 hover:shadow-brutal-lg"
      >
        알림 규칙 설정
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
                    재고 알림 규칙 설정
                  </h3>

                  <div className="space-y-4">
                    <div>
                      <Label htmlFor="storeId">매장</Label>
                      <Combobox
                        id="storeId"
                        options={storeOptions}
                        value={storeId}
                        onChange={setStoreId}
                        placeholder="전체 매장"
                      />
                      <p className="mt-1 text-xs text-gray-500">
                        전체 매장을 선택하면 모든 매장에 적용됩니다
                      </p>
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
                      <Label htmlFor="alertThresholdDays">
                        알림 임계값 (잔여일) *
                      </Label>
                      <Input
                        type="number"
                        name="alertThresholdDays"
                        id="alertThresholdDays"
                        required
                        inputMode="numeric"
                        min="1"
                        defaultValue={rule?.alertThresholdDays || 3}
                      />
                      <p className="mt-1 text-xs text-gray-500">
                        잔여일이 이 값 이하면 알림 발송 (기본: 3일)
                      </p>
                    </div>

                    <div>
                      <Label htmlFor="predictionPeriodDays">
                        예측 기간 (일) *
                      </Label>
                      <Input
                        type="number"
                        name="predictionPeriodDays"
                        id="predictionPeriodDays"
                        required
                        inputMode="numeric"
                        min="7"
                        max="90"
                        defaultValue={rule?.predictionPeriodDays || 30}
                      />
                      <p className="mt-1 text-xs text-gray-500">
                        최근 N일간의 판매량으로 평균을 계산 (기본: 30일)
                      </p>
                    </div>

                    <div className="flex items-center">
                      <input
                        type="checkbox"
                        name="isActive"
                        id="isActive"
                        value="true"
                        defaultChecked={rule?.isActive ?? true}
                        className="h-4 w-4 rounded border-gray-300 text-green-600 focus:ring-green-600"
                      />
                      <label
                        htmlFor="isActive"
                        className="ml-2 block text-sm text-gray-900"
                      >
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
              </form>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
