'use client'

import { useActionState, useState, useEffect, useRef } from 'react'
import { updateBranding } from './actions'
import { toast } from 'sonner'
import Image from 'next/image'
import { Upload, X, Link as LinkIcon } from 'lucide-react'

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
  const [isUploading, setIsUploading] = useState(false)
  const [isDragging, setIsDragging] = useState(false)
  const [inputMode, setInputMode] = useState<'upload' | 'url'>('upload')
  const fileInputRef = useRef<HTMLInputElement>(null)

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

  const handleClearLogo = async () => {
    // If it's a Vercel Blob URL, delete it
    if (logoUrl && logoUrl.includes('vercel-storage.com')) {
      try {
        await fetch('/api/upload', {
          method: 'DELETE',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ url: logoUrl }),
        })
      } catch (error) {
        console.error('Failed to delete old logo:', error)
      }
    }
    setLogoUrl('')
    setPreviewError(false)
  }

  const handleFileUpload = async (file: File) => {
    if (!canEdit) return

    // Validate file type
    const allowedTypes = [
      'image/png',
      'image/jpeg',
      'image/gif',
      'image/svg+xml',
      'image/webp',
    ]
    if (!allowedTypes.includes(file.type)) {
      toast.error('PNG, JPG, GIF, SVG, WebP 파일만 업로드할 수 있습니다')
      return
    }

    // Validate file size (max 2MB)
    const maxSize = 2 * 1024 * 1024
    if (file.size > maxSize) {
      toast.error('파일 크기는 2MB 이하여야 합니다')
      return
    }

    setIsUploading(true)

    try {
      // Delete old logo if it's a Vercel Blob URL
      if (logoUrl && logoUrl.includes('vercel-storage.com')) {
        await fetch('/api/upload', {
          method: 'DELETE',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ url: logoUrl }),
        })
      }

      const formData = new FormData()
      formData.append('file', file)

      const response = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || '업로드 실패')
      }

      setLogoUrl(data.url)
      setPreviewError(false)
      toast.success('로고가 업로드되었습니다')
    } catch (error) {
      console.error('Upload error:', error)
      toast.error(
        error instanceof Error ? error.message : '업로드 중 오류가 발생했습니다'
      )
    } finally {
      setIsUploading(false)
    }
  }

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      handleFileUpload(file)
    }
  }

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    if (canEdit && !isUploading) {
      setIsDragging(true)
    }
  }

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)

    if (!canEdit || isUploading) return

    const file = e.dataTransfer.files?.[0]
    if (file) {
      handleFileUpload(file)
    }
  }

  return (
    <form action={formAction} className="space-y-6">
      {/* Mode Tabs */}
      <div className="flex gap-2">
        <button
          type="button"
          onClick={() => setInputMode('upload')}
          className={`flex items-center gap-2 border-2 border-brutal-black px-4 py-2 text-sm font-bold transition-all ${
            inputMode === 'upload'
              ? 'bg-brutal-yellow shadow-brutal-sm'
              : 'bg-brutal-white hover:bg-gray-50'
          }`}
        >
          <Upload className="h-4 w-4" />
          파일 업로드
        </button>
        <button
          type="button"
          onClick={() => setInputMode('url')}
          className={`flex items-center gap-2 border-2 border-brutal-black px-4 py-2 text-sm font-bold transition-all ${
            inputMode === 'url'
              ? 'bg-brutal-yellow shadow-brutal-sm'
              : 'bg-brutal-white hover:bg-gray-50'
          }`}
        >
          <LinkIcon className="h-4 w-4" />
          URL 입력
        </button>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Upload / URL Input */}
        <div className="space-y-4">
          {inputMode === 'upload' ? (
            <div>
              <label className="block text-sm font-bold text-brutal-black">
                로고 파일
              </label>
              <div
                onClick={() =>
                  canEdit && !isUploading && fileInputRef.current?.click()
                }
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                className={`mt-2 flex min-h-[120px] cursor-pointer flex-col items-center justify-center border-2 border-dashed transition-all ${
                  isDragging
                    ? 'border-brutal-yellow bg-brutal-yellow/10'
                    : 'border-brutal-black/30 bg-brutal-white hover:border-brutal-black/50'
                } ${!canEdit || isUploading ? 'cursor-not-allowed opacity-50' : ''}`}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/png,image/jpeg,image/gif,image/svg+xml,image/webp"
                  onChange={handleFileInputChange}
                  disabled={!canEdit || isUploading}
                  className="hidden"
                />
                {isUploading ? (
                  <div className="flex flex-col items-center gap-2 p-4">
                    <div className="h-8 w-8 animate-spin rounded-full border-4 border-brutal-black/20 border-t-brutal-black" />
                    <span className="text-sm font-medium text-brutal-black/70">
                      업로드 중...
                    </span>
                  </div>
                ) : (
                  <div className="flex flex-col items-center gap-2 p-4">
                    <Upload className="h-8 w-8 text-brutal-black/40" />
                    <span className="text-sm font-medium text-brutal-black/70">
                      클릭하거나 파일을 드래그하세요
                    </span>
                    <span className="text-xs text-brutal-black/50">
                      PNG, JPG, GIF, SVG, WebP (최대 2MB)
                    </span>
                  </div>
                )}
              </div>
            </div>
          ) : (
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
                외부 이미지 URL을 입력하세요
              </p>
            </div>
          )}

          {/* Hidden input for form submission */}
          {inputMode === 'upload' && (
            <input type="hidden" name="logoUrl" value={logoUrl} />
          )}

          {logoUrl && (
            <button
              type="button"
              onClick={handleClearLogo}
              disabled={!canEdit || isPending || isUploading}
              className="flex items-center gap-1 text-sm font-medium text-red-600 underline hover:text-red-800 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <X className="h-4 w-4" />
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
            disabled={isPending || isUploading}
            className="border-2 border-brutal-black bg-brutal-yellow px-6 py-3 text-sm font-bold text-brutal-black shadow-brutal transition-all hover:-translate-x-0.5 hover:-translate-y-0.5 hover:shadow-brutal-lg active:translate-x-0.5 active:translate-y-0.5 active:shadow-brutal-active disabled:translate-x-0 disabled:translate-y-0 disabled:cursor-not-allowed disabled:opacity-50 disabled:shadow-none"
          >
            {isPending ? '저장 중...' : '로고 저장'}
          </button>
        </div>
      )}
    </form>
  )
}
