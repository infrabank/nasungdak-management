'use client'

import { useState } from 'react'
import { createAlertRule } from './actions'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import type { InventoryAlertRule } from '@/lib/db/schema'

interface AlertRuleFormProps {
  rule?: InventoryAlertRule
}

export default function AlertRuleForm({ rule }: AlertRuleFormProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setIsSubmitting(true)

    const formData = new FormData(e.currentTarget)

    try {
      const result = await createAlertRule(formData)

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
        className="border-2 border-brutal-black bg-brutal-green px-3 py-2 text-sm font-bold text-brutal-black shadow-brutal transition-all hover:-translate-x-0.5 hover:-translate-y-0.5 hover:shadow-brutal-lg"
      >
        알림 규칙 설정
      </button>

      {isOpen && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div
            className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity"
            onClick={() => setIsOpen(false)}
          />

          <div className="relative transform overflow-hidden border-3 border-brutal-black bg-brutal-white px-4 pb-4 pt-5 text-left shadow-brutal-lg transition-all sm:my-8 sm:w-full sm:max-w-lg sm:p-6">
            <form onSubmit={handleSubmit}>
              <div>
                <h3 className="mb-4 text-lg font-semibold leading-6 text-gray-900">
                  재고 알림 규칙 설정
                </h3>

                <div className="space-y-4">
                  <div>
                    <Label htmlFor="storeId">매장</Label>
                    <Input
                      type="text"
                      name="storeId"
                      id="storeId"
                      defaultValue={rule?.storeId || ''}
                      placeholder="매장 ID"
                    />
                    <p className="mt-1 text-xs text-gray-500">
                      빈 값이면 전체 매장에 적용됩니다
                    </p>
                  </div>

                  <div>
                    <Label htmlFor="ingredientId">재료 *</Label>
                    <Input
                      type="text"
                      name="ingredientId"
                      id="ingredientId"
                      required
                      defaultValue={rule?.ingredientId || ''}
                      placeholder="재료 ID"
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
      )}
    </>
  )
}
