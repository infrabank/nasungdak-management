'use client'

import { useState } from 'react'
import { createStore, updateStore, deleteStore } from './actions'
import { Button } from '@/components/ui/button'
import type { Store } from '@/lib/db/schema'

interface StoreFormProps {
  store?: Store
}

export default function StoreForm({ store }: StoreFormProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setIsSubmitting(true)

    const formData = new FormData(e.currentTarget)

    try {
      const result = store
        ? await updateStore(store.id, formData)
        : await createStore(formData)

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
    if (!store) return

    if (!confirm('정말 삭제하시겠습니까? 매장에 연결된 데이터가 있으면 문제가 발생할 수 있습니다.')) return

    setIsSubmitting(true)
    try {
      const result = await deleteStore(store.id)
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
          store
            ? 'font-bold text-brutal-black underline underline-offset-2 hover:text-brutal-yellow hover:bg-brutal-black px-1 transition-all'
            : 'px-3 py-2 text-sm font-bold text-brutal-black bg-brutal-yellow border-2 border-brutal-black shadow-brutal hover:shadow-brutal-lg hover:-translate-x-0.5 hover:-translate-y-0.5 transition-all'
        }
      >
        {store ? '수정' : '새 매장 등록'}
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
                    {store ? '매장 수정' : '새 매장 등록'}
                  </h3>

                  <div className="space-y-4">
                    <div>
                      <label htmlFor="storeName" className="block text-sm font-medium text-gray-700">
                        매장명 *
                      </label>
                      <input
                        type="text"
                        name="storeName"
                        id="storeName"
                        required
                        defaultValue={store?.storeName}
                        placeholder="예: 나성닭강정 본점"
                        className="mt-1 block w-full rounded-md border-0 py-1.5 px-3 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-blue-600 sm:text-sm"
                      />
                    </div>

                    <div>
                      <label htmlFor="storeCode" className="block text-sm font-medium text-gray-700">
                        매장 코드 *
                      </label>
                      <input
                        type="text"
                        name="storeCode"
                        id="storeCode"
                        required
                        defaultValue={store?.storeCode}
                        placeholder="예: MAIN, BRANCH01"
                        className="mt-1 block w-full rounded-md border-0 py-1.5 px-3 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-blue-600 sm:text-sm uppercase"
                      />
                      <p className="mt-1 text-xs text-gray-500">영문, 숫자, 하이픈, 언더스코어만 사용 가능</p>
                    </div>

                    <div>
                      <label htmlFor="address" className="block text-sm font-medium text-gray-700">
                        주소
                      </label>
                      <textarea
                        name="address"
                        id="address"
                        rows={2}
                        defaultValue={store?.address || ''}
                        placeholder="매장 주소"
                        className="mt-1 block w-full rounded-md border-0 py-1.5 px-3 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-blue-600 sm:text-sm"
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label htmlFor="phone" className="block text-sm font-medium text-gray-700">
                          매장 연락처
                        </label>
                        <input
                          type="tel"
                          name="phone"
                          id="phone"
                          defaultValue={store?.phone || ''}
                          placeholder="02-1234-5678"
                          className="mt-1 block w-full rounded-md border-0 py-1.5 px-3 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-blue-600 sm:text-sm"
                        />
                      </div>

                      <div>
                        <label htmlFor="managerPhone" className="block text-sm font-medium text-gray-700">
                          관리자 연락처
                        </label>
                        <input
                          type="tel"
                          name="managerPhone"
                          id="managerPhone"
                          defaultValue={store?.managerPhone || ''}
                          placeholder="010-1234-5678"
                          className="mt-1 block w-full rounded-md border-0 py-1.5 px-3 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-blue-600 sm:text-sm"
                        />
                        <p className="mt-1 text-xs text-gray-500">알림 수신용</p>
                      </div>
                    </div>

                    <div>
                      <label htmlFor="tossStoreId" className="block text-sm font-medium text-gray-700">
                        토스 매장 ID
                      </label>
                      <input
                        type="text"
                        name="tossStoreId"
                        id="tossStoreId"
                        defaultValue={store?.tossStoreId || ''}
                        placeholder="토스 POS 연동용 매장 ID"
                        className="mt-1 block w-full rounded-md border-0 py-1.5 px-3 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-blue-600 sm:text-sm"
                      />
                      <p className="mt-1 text-xs text-gray-500">토스 POS 연동 시 필요</p>
                    </div>

                    <div className="flex items-center">
                      <input
                        type="checkbox"
                        name="isActive"
                        id="isActive"
                        value="true"
                        defaultChecked={store?.isActive ?? true}
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

                {store && (
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
