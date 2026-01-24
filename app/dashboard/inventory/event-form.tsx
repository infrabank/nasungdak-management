'use client'

import { useState } from 'react'
import { createInventoryEvent } from './actions'
import { Button } from '@/components/ui/button'

export default function EventForm() {
  const [isOpen, setIsOpen] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setIsSubmitting(true)

    const formData = new FormData(e.currentTarget)

    try {
      const result = await createInventoryEvent(formData)

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
        className="px-3 py-2 text-sm font-bold text-brutal-black bg-brutal-orange border-2 border-brutal-black shadow-brutal hover:shadow-brutal-lg hover:-translate-x-0.5 hover:-translate-y-0.5 transition-all"
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

            <div className="relative transform overflow-hidden bg-brutal-white border-3 border-brutal-black shadow-brutal-lg px-4 pb-4 pt-5 text-left transition-all sm:my-8 sm:w-full sm:max-w-lg sm:p-6">
              <form onSubmit={handleSubmit}>
                <div>
                  <h3 className="text-lg font-semibold leading-6 text-gray-900 mb-4">
                    재고 이벤트 등록
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
                        placeholder="매장 ID"
                        className="mt-1 block w-full py-2 px-3 text-brutal-black bg-brutal-white border-2 border-brutal-black shadow-brutal-sm placeholder:text-brutal-black/50 focus:outline-none focus:shadow-brutal focus:-translate-x-0.5 focus:-translate-y-0.5 transition-all sm:text-sm font-medium"
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
                        placeholder="재료 ID"
                        className="mt-1 block w-full py-2 px-3 text-brutal-black bg-brutal-white border-2 border-brutal-black shadow-brutal-sm placeholder:text-brutal-black/50 focus:outline-none focus:shadow-brutal focus:-translate-x-0.5 focus:-translate-y-0.5 transition-all sm:text-sm font-medium"
                      />
                    </div>

                    <div>
                      <label htmlFor="eventType" className="block text-sm font-medium text-gray-700">
                        이벤트 유형 *
                      </label>
                      <select
                        name="eventType"
                        id="eventType"
                        required
                        className="mt-1 block w-full py-2 px-3 text-brutal-black bg-brutal-white border-2 border-brutal-black shadow-brutal-sm focus:outline-none focus:shadow-brutal focus:-translate-x-0.5 focus:-translate-y-0.5 transition-all sm:text-sm font-medium"
                      >
                        <option value="">선택하세요</option>
                        <option value="purchase">매입 (재고 증가)</option>
                        <option value="sale">판매 (재고 감소)</option>
                        <option value="waste">폐기 (손실)</option>
                        <option value="audit">실사 (조정)</option>
                        <option value="adjustment">조정</option>
                      </select>
                    </div>

                    <div>
                      <label htmlFor="quantityChange" className="block text-sm font-medium text-gray-700">
                        수량 변동 *
                      </label>
                      <input
                        type="number"
                        name="quantityChange"
                        id="quantityChange"
                        required
                        step="0.01"
                        placeholder="양수: 증가, 음수: 감소"
                        className="mt-1 block w-full py-2 px-3 text-brutal-black bg-brutal-white border-2 border-brutal-black shadow-brutal-sm placeholder:text-brutal-black/50 focus:outline-none focus:shadow-brutal focus:-translate-x-0.5 focus:-translate-y-0.5 transition-all sm:text-sm font-medium"
                      />
                    </div>

                    <div>
                      <label htmlFor="eventDate" className="block text-sm font-medium text-gray-700">
                        이벤트 날짜 *
                      </label>
                      <input
                        type="date"
                        name="eventDate"
                        id="eventDate"
                        required
                        className="mt-1 block w-full py-2 px-3 text-brutal-black bg-brutal-white border-2 border-brutal-black shadow-brutal-sm placeholder:text-brutal-black/50 focus:outline-none focus:shadow-brutal focus:-translate-x-0.5 focus:-translate-y-0.5 transition-all sm:text-sm font-medium"
                      />
                    </div>

                    <div>
                      <label htmlFor="reason" className="block text-sm font-medium text-gray-700">
                        사유
                      </label>
                      <textarea
                        name="reason"
                        id="reason"
                        rows={3}
                        placeholder="사유를 입력하세요 (선택사항)"
                        className="mt-1 block w-full py-2 px-3 text-brutal-black bg-brutal-white border-2 border-brutal-black shadow-brutal-sm placeholder:text-brutal-black/50 focus:outline-none focus:shadow-brutal focus:-translate-x-0.5 focus:-translate-y-0.5 transition-all sm:text-sm font-medium"
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
