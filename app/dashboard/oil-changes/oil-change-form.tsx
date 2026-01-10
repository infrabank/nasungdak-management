'use client'

import { useActionState } from 'react'
import { useRouter } from 'next/navigation'
import { createOilChange } from './actions'
import Link from 'next/link'

export default function OilChangeForm() {
  const router = useRouter()
  const [state, formAction, isPending] = useActionState(createOilChange, null)

  // Redirect on success
  if (state?.success) {
    router.push('/dashboard/oil-changes')
  }

  return (
    <div className="max-w-2xl mx-auto">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold text-gray-900">새 기름 교체 이력 등록</h1>
        <Link
          href="/dashboard/oil-changes"
          className="text-gray-600 hover:text-gray-900"
        >
          목록으로 돌아가기
        </Link>
      </div>

      <div className="bg-white rounded-lg shadow-sm border p-6">
        <form action={formAction} className="space-y-6">
          {/* Error Message */}
          {state?.error && (
            <div className="rounded-md bg-red-50 p-4">
              <p className="text-sm text-red-800">{state.error}</p>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                교체일 <span className="text-red-500">*</span>
              </label>
              <input
                type="date"
                name="changeDate"
                required
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                튀김기 종류 <span className="text-red-500">*</span>
              </label>
              <select
                name="fryerType"
                required
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">선택하세요</option>
                <option value="초벌">초벌</option>
                <option value="재벌">재벌</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                기름 종류 <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                name="oilType"
                defaultValue="해바라기씨유"
                required
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                수량 (L) <span className="text-red-500">*</span>
              </label>
              <input
                type="number"
                name="quantity"
                step="0.1"
                min="0.1"
                required
                placeholder="예: 20"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                공급업체명 <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                name="supplierName"
                required
                placeholder="예: (주)대한식용유"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                단가 (원/L) <span className="text-red-500">*</span>
              </label>
              <input
                type="number"
                name="unitPrice"
                step="10"
                min="0"
                required
                placeholder="예: 2500"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                이전 기름 사용량 (L)
              </label>
              <input
                type="number"
                name="previousOilUsage"
                step="0.1"
                min="0"
                placeholder="예: 18.5"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                사용 기간 (일)
              </label>
              <input
                type="number"
                name="usageDays"
                min="0"
                placeholder="예: 7"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <p className="text-xs text-gray-500 mt-1">
                미입력 시 자동으로 계산됩니다
              </p>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              비고
            </label>
            <textarea
              name="notes"
              rows={3}
              placeholder="특이사항을 입력하세요"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div className="flex justify-end space-x-4">
            <Link
              href="/dashboard/oil-changes"
              className="px-6 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50 transition-colors"
            >
              취소
            </Link>
            <button
              type="submit"
              disabled={isPending}
              className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isPending ? '등록 중...' : '등록'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}