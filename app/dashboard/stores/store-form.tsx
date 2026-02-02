'use client'

import { useState } from 'react'
import { createStore, updateStore, deleteStore } from './actions'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
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

    if (
      !confirm(
        '정말 삭제하시겠습니까? 매장에 연결된 데이터가 있으면 문제가 발생할 수 있습니다.'
      )
    )
      return

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
            ? 'px-1 font-bold text-brutal-black underline underline-offset-2 transition-all hover:bg-brutal-black hover:text-brutal-yellow'
            : 'border-2 border-brutal-black bg-brutal-yellow px-3 py-2 text-sm font-bold text-brutal-black shadow-brutal transition-all hover:-translate-x-0.5 hover:-translate-y-0.5 hover:shadow-brutal-lg'
        }
      >
        {store ? '수정' : '새 매장 등록'}
      </button>

      {isOpen && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex min-h-full items-end justify-center p-4 text-center sm:items-center sm:p-0">
            <div
              className="fixed inset-0 bg-brutal-black/50 transition-opacity"
              onClick={() => setIsOpen(false)}
            />

            <div className="relative transform overflow-hidden border-3 border-brutal-black bg-brutal-white px-4 pb-4 pt-5 text-left shadow-brutal-lg transition-all sm:my-8 sm:w-full sm:max-w-lg sm:p-6">
              <form onSubmit={handleSubmit}>
                <div>
                  <h3 className="mb-4 text-lg font-semibold leading-6 text-brutal-black">
                    {store ? '매장 수정' : '새 매장 등록'}
                  </h3>

                  <div className="space-y-4">
                    <div>
                      <Label htmlFor="storeName">매장명 *</Label>
                      <Input
                        type="text"
                        name="storeName"
                        id="storeName"
                        required
                        defaultValue={store?.storeName}
                        placeholder="예: 나성닭강정 본점"
                        className="mt-1"
                      />
                    </div>

                    <div>
                      <Label htmlFor="storeCode">매장 코드 *</Label>
                      <Input
                        type="text"
                        name="storeCode"
                        id="storeCode"
                        required
                        defaultValue={store?.storeCode}
                        placeholder="예: MAIN, BRANCH01"
                        className="mt-1 uppercase"
                      />
                      <p className="mt-1 text-xs text-brutal-black/70">
                        영문, 숫자, 하이픈, 언더스코어만 사용 가능
                      </p>
                    </div>

                    <div>
                      <Label htmlFor="address">주소</Label>
                      <Textarea
                        name="address"
                        id="address"
                        rows={2}
                        defaultValue={store?.address || ''}
                        placeholder="매장 주소"
                        className="mt-1"
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="phone">매장 연락처</Label>
                        <Input
                          type="tel"
                          name="phone"
                          id="phone"
                          defaultValue={store?.phone || ''}
                          placeholder="02-1234-5678"
                          className="mt-1"
                        />
                      </div>

                      <div>
                        <Label htmlFor="managerPhone">관리자 연락처</Label>
                        <Input
                          type="tel"
                          name="managerPhone"
                          id="managerPhone"
                          defaultValue={store?.managerPhone || ''}
                          placeholder="010-1234-5678"
                          className="mt-1"
                        />
                        <p className="mt-1 text-xs text-brutal-black/70">
                          알림 수신용
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center">
                      <input
                        type="checkbox"
                        name="isActive"
                        id="isActive"
                        value="true"
                        defaultChecked={store?.isActive ?? true}
                        className="h-4 w-4 border-brutal-black text-brutal-black"
                      />
                      <label
                        htmlFor="isActive"
                        className="ml-2 block text-sm text-brutal-black"
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
