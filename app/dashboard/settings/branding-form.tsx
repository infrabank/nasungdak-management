'use client'

import { useActionState, useState, useEffect } from 'react'
import { updateBranding } from './actions'
import { toast } from 'sonner'
import Image from 'next/image'

interface Props {
  organization: {
    id: string
    name: string
    logoUrl: string | null
  }
  isOwner: boolean
}

export default function BrandingForm({ organization, isOwner }: Props) {
  const [state, formAction, isPending] = useActionState(updateBranding, null)
  const [logoUrl, setLogoUrl] = useState(organization.logoUrl || '')
  const [previewError, setPreviewError] = useState(false)

  useEffect(() => {
    if (state?.success) {
      toast.success('로고가 저장되었습니다')
    } else if (state?.error) {
      toast.error(state.error)
    }
  }, [state])

  const canEdit = isOwner

  const handleLogoUrlChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setLogoUrl(e.target.value)
    setPreviewError(false)
  }

  const handleClearLogo = () => {
    setLogoUrl('')
    setPreviewError(false)
  }

  return (
    <form action={formAction} className="space-y-6">
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Logo URL Input */}
        <div className="space-y-4">
          <div>
            <label
              htmlFor="logoUrl"
              className="block text-sm font-bold text-brutal-black"
            >
              로고 URL
            </label>
            <input
              id="logoUrl"
              name="logoUrl"
              type="url"
              value={logoUrl}
              onChange={handleLogoUrlChange}
              disabled={!canEdit || isPending}
              placeholder="https://example.com/logo.png"
              className="mt-2 block w-full border-2 border-brutal-black bg-brutal-white px-4 py-3 font-medium text-brutal-black shadow-brutal-sm transition-all focus:shadow-brutal focus:outline-none disabled:cursor-not-allowed disabled:bg-gray-100 sm:text-sm"
            />
            <p className="mt-1 text-xs text-brutal-black/50">
              외부 이미지 URL을 입력하세요 (PNG, JPG, SVG 권장)
            </p>
          </div>

          {logoUrl && (
            <button
              type="button"
              onClick={handleClearLogo}
              disabled={!canEdit || isPending}
              className="text-sm font-medium text-red-600 underline hover:text-red-800 disabled:cursor-not-allowed disabled:opacity-50"
            >
              로고 제거
            </button>
          )}
        </div>

        {/* Logo Preview */}
        <div>
          <p className="block text-sm font-bold text-brutal-black">미리보기</p>
          <div className="mt-2 flex h-24 w-24 items-center justify-center border-2 border-dashed border-brutal-black/30 bg-brutal-white">
            {logoUrl && !previewError ? (
              <Image
                src={logoUrl}
                alt="로고 미리보기"
                width={80}
                height={80}
                className="h-20 w-20 object-contain"
                onError={() => setPreviewError(true)}
                unoptimized
              />
            ) : previewError ? (
              <span className="text-center text-xs text-red-500">
                이미지를
                <br />
                불러올 수 없음
              </span>
            ) : (
              <span className="text-center text-xs text-brutal-black/40">
                로고 없음
              </span>
            )}
          </div>
          <p className="mt-2 text-xs text-brutal-black/50">
            헤더에 표시될 로고입니다
          </p>
        </div>
      </div>

      {/* Display Name Info */}
      <div className="border-t-2 border-brutal-black/10 pt-4">
        <p className="text-sm text-brutal-black/70">
          <span className="font-bold">조직명:</span> {organization.name}
        </p>
        <p className="mt-1 text-xs text-brutal-black/50">
          로고가 없으면 헤더에 조직명이 텍스트로 표시됩니다. 조직명은 &quot;기본
          정보&quot; 섹션에서 변경할 수 있습니다.
        </p>
      </div>

      {canEdit && (
        <div className="flex justify-end">
          <button
            type="submit"
            disabled={isPending}
            className="border-2 border-brutal-black bg-brutal-yellow px-6 py-3 text-sm font-bold text-brutal-black shadow-brutal transition-all hover:-translate-x-0.5 hover:-translate-y-0.5 hover:shadow-brutal-lg active:translate-x-0.5 active:translate-y-0.5 active:shadow-brutal-active disabled:translate-x-0 disabled:translate-y-0 disabled:cursor-not-allowed disabled:opacity-50 disabled:shadow-none"
          >
            {isPending ? '저장 중...' : '로고 저장'}
          </button>
        </div>
      )}
    </form>
  )
}
