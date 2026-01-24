'use client'

import { useState } from 'react'
import { createMenu, updateMenu, deleteMenu } from './actions'
import { Button } from '@/components/ui/button'
import type { MenuCategory } from '@/lib/db/schema'

interface MenuFormProps {
  menu?: MenuCategory
}

export default function MenuForm({ menu }: MenuFormProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setIsSubmitting(true)

    const formData = new FormData(e.currentTarget)

    try {
      const result = menu
        ? await updateMenu(menu.id, formData)
        : await createMenu(formData)

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
    if (!menu) return

    if (!confirm('정말 삭제하시겠습니까?')) return

    setIsSubmitting(true)
    try {
      const result = await deleteMenu(menu.id)
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
          menu
            ? 'font-bold text-brutal-black underline underline-offset-2 hover:text-brutal-yellow hover:bg-brutal-black px-1 transition-all'
            : 'px-3 py-2 text-sm font-bold text-brutal-black bg-brutal-yellow border-2 border-brutal-black shadow-brutal hover:shadow-brutal-lg hover:-translate-x-0.5 hover:-translate-y-0.5 transition-all'
        }
      >
        {menu ? '수정' : '새 메뉴 등록'}
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
                    {menu ? '메뉴 수정' : '새 메뉴 등록'}
                  </h3>

                  <div className="space-y-4">
                    <div>
                      <label htmlFor="menuName" className="block text-sm font-medium text-gray-700">
                        메뉴명 *
                      </label>
                      <input
                        type="text"
                        name="menuName"
                        id="menuName"
                        required
                        defaultValue={menu?.menuName}
                        className="mt-1 block w-full py-2 px-3 text-brutal-black bg-brutal-white border-2 border-brutal-black shadow-brutal-sm placeholder:text-brutal-black/50 focus:outline-none focus:shadow-brutal focus:-translate-x-0.5 focus:-translate-y-0.5 transition-all sm:text-sm font-medium"
                      />
                    </div>

                    <div>
                      <label htmlFor="description" className="block text-sm font-medium text-gray-700">
                        설명
                      </label>
                      <textarea
                        name="description"
                        id="description"
                        rows={3}
                        defaultValue={menu?.description || ''}
                        className="mt-1 block w-full py-2 px-3 text-brutal-black bg-brutal-white border-2 border-brutal-black shadow-brutal-sm placeholder:text-brutal-black/50 focus:outline-none focus:shadow-brutal focus:-translate-x-0.5 focus:-translate-y-0.5 transition-all sm:text-sm font-medium"
                      />
                    </div>

                    <div className="flex items-center">
                      <input
                        type="checkbox"
                        name="isActive"
                        id="isActive"
                        value="true"
                        defaultChecked={menu?.isActive ?? true}
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
