'use client'

import { useActionState } from 'react'
import { updateOrganization } from './actions'
import { toast } from 'sonner'
import { useEffect } from 'react'

interface Props {
  organization: {
    id: string
    name: string
    slug: string
    businessNumber: string | null
    billingEmail: string | null
    billingName: string | null
  }
  isOwner: boolean
}

export default function GeneralForm({ organization, isOwner }: Props) {
  const [state, formAction, isPending] = useActionState(updateOrganization, null)

  useEffect(() => {
    if (state?.success) {
      toast.success('저장되었습니다')
    } else if (state?.error) {
      toast.error(state.error)
    }
  }, [state])

  const canEdit = isOwner

  return (
    <form action={formAction} className="space-y-6">
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
        {/* Organization Name */}
        <div>
          <label
            htmlFor="name"
            className="block text-sm font-bold text-brutal-black"
          >
            조직명
          </label>
          <input
            id="name"
            name="name"
            type="text"
            defaultValue={organization.name}
            disabled={!canEdit || isPending}
            className="mt-2 block w-full px-4 py-3 text-brutal-black bg-brutal-white border-2 border-brutal-black shadow-brutal-sm focus:outline-none focus:shadow-brutal transition-all disabled:bg-gray-100 disabled:cursor-not-allowed sm:text-sm font-medium"
          />
        </div>

        {/* Slug (read-only) */}
        <div>
          <label
            htmlFor="slug"
            className="block text-sm font-bold text-brutal-black"
          >
            URL 슬러그
          </label>
          <input
            id="slug"
            type="text"
            value={organization.slug}
            disabled
            className="mt-2 block w-full px-4 py-3 text-brutal-black/50 bg-gray-100 border-2 border-brutal-black/50 sm:text-sm font-medium cursor-not-allowed"
          />
          <p className="mt-1 text-xs text-brutal-black/50">
            슬러그는 변경할 수 없습니다
          </p>
        </div>

        {/* Business Number */}
        <div>
          <label
            htmlFor="businessNumber"
            className="block text-sm font-bold text-brutal-black"
          >
            사업자등록번호
          </label>
          <input
            id="businessNumber"
            name="businessNumber"
            type="text"
            defaultValue={organization.businessNumber || ''}
            disabled={!canEdit || isPending}
            placeholder="123-45-67890"
            className="mt-2 block w-full px-4 py-3 text-brutal-black bg-brutal-white border-2 border-brutal-black shadow-brutal-sm focus:outline-none focus:shadow-brutal transition-all disabled:bg-gray-100 disabled:cursor-not-allowed sm:text-sm font-medium"
          />
        </div>

        {/* Billing Name */}
        <div>
          <label
            htmlFor="billingName"
            className="block text-sm font-bold text-brutal-black"
          >
            결제 담당자
          </label>
          <input
            id="billingName"
            name="billingName"
            type="text"
            defaultValue={organization.billingName || ''}
            disabled={!canEdit || isPending}
            placeholder="홍길동"
            className="mt-2 block w-full px-4 py-3 text-brutal-black bg-brutal-white border-2 border-brutal-black shadow-brutal-sm focus:outline-none focus:shadow-brutal transition-all disabled:bg-gray-100 disabled:cursor-not-allowed sm:text-sm font-medium"
          />
        </div>

        {/* Billing Email */}
        <div className="sm:col-span-2">
          <label
            htmlFor="billingEmail"
            className="block text-sm font-bold text-brutal-black"
          >
            결제 이메일
          </label>
          <input
            id="billingEmail"
            name="billingEmail"
            type="email"
            defaultValue={organization.billingEmail || ''}
            disabled={!canEdit || isPending}
            placeholder="billing@example.com"
            className="mt-2 block w-full px-4 py-3 text-brutal-black bg-brutal-white border-2 border-brutal-black shadow-brutal-sm focus:outline-none focus:shadow-brutal transition-all disabled:bg-gray-100 disabled:cursor-not-allowed sm:text-sm font-medium"
          />
          <p className="mt-1 text-xs text-brutal-black/50">
            청구서 및 결제 관련 알림이 발송됩니다
          </p>
        </div>
      </div>

      {canEdit && (
        <div className="flex justify-end">
          <button
            type="submit"
            disabled={isPending}
            className="px-6 py-3 text-sm font-bold text-brutal-black bg-brutal-yellow border-2 border-brutal-black shadow-brutal hover:shadow-brutal-lg hover:-translate-x-0.5 hover:-translate-y-0.5 active:shadow-brutal-active active:translate-x-0.5 active:translate-y-0.5 transition-all disabled:opacity-50 disabled:cursor-not-allowed disabled:shadow-none disabled:translate-x-0 disabled:translate-y-0"
          >
            {isPending ? '저장 중...' : '저장'}
          </button>
        </div>
      )}
    </form>
  )
}
