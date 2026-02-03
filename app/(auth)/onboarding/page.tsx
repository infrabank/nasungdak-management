'use client'

import { useActionState, useEffect, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import {
  createOrganization,
  createFirstStore,
  checkSlugAvailability,
  type OnboardingState,
} from './actions'

type Step = 'organization' | 'store'

export default function OnboardingPage() {
  const router = useRouter()
  const [step, setStep] = useState<Step>('organization')
  const [organizationId, setOrganizationId] = useState<string | null>(null)
  const [slugChecking, setSlugChecking] = useState(false)
  const [slugAvailable, setSlugAvailable] = useState<boolean | null>(null)

  // Step 1: Organization form
  const [orgState, orgAction, orgPending] = useActionState<
    OnboardingState | null,
    FormData
  >(createOrganization, null)

  // Step 2: Store form
  const [storeState, storeAction, storePending] = useActionState<
    OnboardingState | null,
    FormData
  >(createFirstStore, null)

  // Handle organization creation success
  useEffect(() => {
    if (orgState?.success && orgState.organizationId) {
      setOrganizationId(orgState.organizationId)
      setStep('store')
    }
  }, [orgState])

  // Handle store creation success
  useEffect(() => {
    if (storeState?.success) {
      router.push('/dashboard')
    }
  }, [storeState, router])

  // Debounced slug check
  const handleSlugChange = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const slug = e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '')
      e.target.value = slug

      if (slug.length >= 3) {
        setSlugChecking(true)
        const result = await checkSlugAvailability(slug)
        setSlugAvailable(result.available)
        setSlugChecking(false)
      } else {
        setSlugAvailable(null)
      }
    },
    []
  )

  // Auto-generate store code from name
  const handleStoreNameChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const name = e.target.value
      const codeInput = document.getElementById('storeCode') as HTMLInputElement
      if (codeInput && !codeInput.dataset.touched) {
        // Generate code: First 3 chars uppercase + random number
        const prefix = name
          .substring(0, 3)
          .toUpperCase()
          .replace(/[^A-Z]/g, '')
        const suffix = Math.floor(Math.random() * 100)
          .toString()
          .padStart(2, '0')
        codeInput.value = prefix ? `${prefix}-${suffix}` : ''
      }
    },
    []
  )

  return (
    <div className="flex min-h-screen flex-col justify-center bg-brutal-white py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-lg">
        <div className="flex justify-center">
          <div className="border-3 border-brutal-black bg-brutal-yellow p-4 shadow-brutal-lg">
            <Image
              src="/images/logo.png"
              alt="로고"
              width={80}
              height={80}
              className="h-auto w-auto"
              priority
            />
          </div>
        </div>
        <h2 className="mt-8 text-center text-3xl font-bold tracking-tight text-brutal-black">
          {step === 'organization' ? '조직 생성' : '첫 번째 매장 등록'}
        </h2>
        <p className="mt-3 text-center text-base font-medium text-brutal-black/70">
          {step === 'organization'
            ? '비즈니스 정보를 입력해주세요'
            : '관리할 매장 정보를 입력해주세요'}
        </p>

        {/* Progress indicator */}
        <div className="mt-6 flex justify-center gap-3">
          <div
            className={`h-3 w-3 border-2 border-brutal-black ${
              step === 'organization' ? 'bg-brutal-yellow' : 'bg-brutal-black'
            }`}
          />
          <div
            className={`h-3 w-3 border-2 border-brutal-black ${
              step === 'store' ? 'bg-brutal-yellow' : 'bg-brutal-white'
            }`}
          />
        </div>
      </div>

      <div className="mt-8 px-4 sm:mx-auto sm:w-full sm:max-w-lg">
        <div className="border-3 border-brutal-black bg-brutal-white px-6 py-8 shadow-brutal-lg">
          {step === 'organization' ? (
            /* Step 1: Organization Form */
            <form action={orgAction} className="space-y-5">
              {/* Organization Name */}
              <div>
                <label
                  htmlFor="name"
                  className="block text-sm font-bold text-brutal-black"
                >
                  조직명 <span className="text-brutal-red">*</span>
                </label>
                <div className="mt-2">
                  <input
                    id="name"
                    name="name"
                    type="text"
                    required
                    disabled={orgPending}
                    className="block w-full appearance-none border-2 border-brutal-black bg-brutal-white px-4 py-3 font-medium text-brutal-black placeholder-brutal-black/50 shadow-brutal-sm transition-all duration-150 focus:-translate-x-0.5 focus:-translate-y-0.5 focus:shadow-brutal focus:outline-none disabled:cursor-not-allowed disabled:bg-gray-100 disabled:shadow-none sm:text-sm"
                    placeholder="예: 우리회사"
                    style={{ minHeight: '48px', fontSize: '16px' }}
                  />
                </div>
                {orgState?.fieldErrors?.name && (
                  <p className="mt-1 text-sm font-medium text-brutal-red">
                    {orgState.fieldErrors.name}
                  </p>
                )}
              </div>

              {/* Slug */}
              <div>
                <label
                  htmlFor="slug"
                  className="block text-sm font-bold text-brutal-black"
                >
                  URL 슬러그 <span className="text-brutal-red">*</span>
                </label>
                <div className="relative mt-2">
                  <input
                    id="slug"
                    name="slug"
                    type="text"
                    required
                    disabled={orgPending}
                    onChange={handleSlugChange}
                    className="block w-full appearance-none border-2 border-brutal-black bg-brutal-white px-4 py-3 font-medium text-brutal-black placeholder-brutal-black/50 shadow-brutal-sm transition-all duration-150 focus:-translate-x-0.5 focus:-translate-y-0.5 focus:shadow-brutal focus:outline-none disabled:cursor-not-allowed disabled:bg-gray-100 disabled:shadow-none sm:text-sm"
                    placeholder="my-company"
                    style={{ minHeight: '48px', fontSize: '16px' }}
                  />
                  {slugChecking && (
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-brutal-black/50">
                      확인 중...
                    </span>
                  )}
                  {!slugChecking && slugAvailable === true && (
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm font-bold text-green-600">
                      ✓ 사용 가능
                    </span>
                  )}
                  {!slugChecking && slugAvailable === false && (
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm font-bold text-brutal-red">
                      ✗ 사용 불가
                    </span>
                  )}
                </div>
                <p className="mt-1 text-xs text-brutal-black/50">
                  영문 소문자, 숫자, 하이픈만 사용 가능
                </p>
                {orgState?.fieldErrors?.slug && (
                  <p className="mt-1 text-sm font-medium text-brutal-red">
                    {orgState.fieldErrors.slug}
                  </p>
                )}
              </div>

              {/* Business Number */}
              <div>
                <label
                  htmlFor="businessNumber"
                  className="block text-sm font-bold text-brutal-black"
                >
                  사업자등록번호{' '}
                  <span className="text-brutal-black/50">(선택)</span>
                </label>
                <div className="mt-2">
                  <input
                    id="businessNumber"
                    name="businessNumber"
                    type="text"
                    disabled={orgPending}
                    className="block w-full appearance-none border-2 border-brutal-black bg-brutal-white px-4 py-3 font-medium text-brutal-black placeholder-brutal-black/50 shadow-brutal-sm transition-all duration-150 focus:-translate-x-0.5 focus:-translate-y-0.5 focus:shadow-brutal focus:outline-none disabled:cursor-not-allowed disabled:bg-gray-100 disabled:shadow-none sm:text-sm"
                    placeholder="123-45-67890"
                    style={{ minHeight: '48px', fontSize: '16px' }}
                  />
                </div>
              </div>

              {/* Billing Email */}
              <div>
                <label
                  htmlFor="billingEmail"
                  className="block text-sm font-bold text-brutal-black"
                >
                  결제 이메일{' '}
                  <span className="text-brutal-black/50">(선택)</span>
                </label>
                <div className="mt-2">
                  <input
                    id="billingEmail"
                    name="billingEmail"
                    type="email"
                    disabled={orgPending}
                    className="block w-full appearance-none border-2 border-brutal-black bg-brutal-white px-4 py-3 font-medium text-brutal-black placeholder-brutal-black/50 shadow-brutal-sm transition-all duration-150 focus:-translate-x-0.5 focus:-translate-y-0.5 focus:shadow-brutal focus:outline-none disabled:cursor-not-allowed disabled:bg-gray-100 disabled:shadow-none sm:text-sm"
                    placeholder="billing@example.com"
                    style={{ minHeight: '48px', fontSize: '16px' }}
                  />
                </div>
                {orgState?.fieldErrors?.billingEmail && (
                  <p className="mt-1 text-sm font-medium text-brutal-red">
                    {orgState.fieldErrors.billingEmail}
                  </p>
                )}
              </div>

              {/* Error */}
              {orgState?.error && !orgState.fieldErrors && (
                <div className="border-2 border-brutal-red bg-brutal-red/10 p-4">
                  <p className="text-sm font-medium text-brutal-red">
                    {orgState.error}
                  </p>
                </div>
              )}

              {/* Submit */}
              <div>
                <button
                  type="submit"
                  disabled={orgPending || slugAvailable === false}
                  className="flex w-full justify-center border-2 border-brutal-black bg-brutal-yellow px-4 py-3 text-base font-bold text-brutal-black shadow-brutal transition-all duration-150 hover:-translate-x-1 hover:-translate-y-1 hover:shadow-brutal-lg active:translate-x-0.5 active:translate-y-0.5 active:shadow-brutal-active disabled:translate-x-0 disabled:translate-y-0 disabled:cursor-not-allowed disabled:bg-brutal-yellow/50 disabled:shadow-none"
                  style={{ minHeight: '48px' }}
                >
                  {orgPending ? '생성 중...' : '다음 단계로'}
                </button>
              </div>
            </form>
          ) : (
            /* Step 2: Store Form */
            <form action={storeAction} className="space-y-5">
              <input
                type="hidden"
                name="organizationId"
                value={organizationId || ''}
              />

              {/* Store Name */}
              <div>
                <label
                  htmlFor="storeName"
                  className="block text-sm font-bold text-brutal-black"
                >
                  매장명 <span className="text-brutal-red">*</span>
                </label>
                <div className="mt-2">
                  <input
                    id="storeName"
                    name="storeName"
                    type="text"
                    required
                    disabled={storePending}
                    onChange={handleStoreNameChange}
                    className="block w-full appearance-none border-2 border-brutal-black bg-brutal-white px-4 py-3 font-medium text-brutal-black placeholder-brutal-black/50 shadow-brutal-sm transition-all duration-150 focus:-translate-x-0.5 focus:-translate-y-0.5 focus:shadow-brutal focus:outline-none disabled:cursor-not-allowed disabled:bg-gray-100 disabled:shadow-none sm:text-sm"
                    placeholder="예: 강남점"
                    style={{ minHeight: '48px', fontSize: '16px' }}
                  />
                </div>
                {storeState?.fieldErrors?.storeName && (
                  <p className="mt-1 text-sm font-medium text-brutal-red">
                    {storeState.fieldErrors.storeName}
                  </p>
                )}
              </div>

              {/* Store Code */}
              <div>
                <label
                  htmlFor="storeCode"
                  className="block text-sm font-bold text-brutal-black"
                >
                  매장 코드 <span className="text-brutal-red">*</span>
                </label>
                <div className="mt-2">
                  <input
                    id="storeCode"
                    name="storeCode"
                    type="text"
                    required
                    disabled={storePending}
                    onFocus={(e) => (e.target.dataset.touched = 'true')}
                    className="block w-full appearance-none border-2 border-brutal-black bg-brutal-white px-4 py-3 font-medium uppercase text-brutal-black placeholder-brutal-black/50 shadow-brutal-sm transition-all duration-150 focus:-translate-x-0.5 focus:-translate-y-0.5 focus:shadow-brutal focus:outline-none disabled:cursor-not-allowed disabled:bg-gray-100 disabled:shadow-none sm:text-sm"
                    placeholder="GN-01"
                    style={{ minHeight: '48px', fontSize: '16px' }}
                  />
                </div>
                <p className="mt-1 text-xs text-brutal-black/50">
                  영문 대문자, 숫자, 하이픈만 사용 가능
                </p>
                {storeState?.fieldErrors?.storeCode && (
                  <p className="mt-1 text-sm font-medium text-brutal-red">
                    {storeState.fieldErrors.storeCode}
                  </p>
                )}
              </div>

              {/* Address */}
              <div>
                <label
                  htmlFor="address"
                  className="block text-sm font-bold text-brutal-black"
                >
                  주소 <span className="text-brutal-black/50">(선택)</span>
                </label>
                <div className="mt-2">
                  <input
                    id="address"
                    name="address"
                    type="text"
                    disabled={storePending}
                    className="block w-full appearance-none border-2 border-brutal-black bg-brutal-white px-4 py-3 font-medium text-brutal-black placeholder-brutal-black/50 shadow-brutal-sm transition-all duration-150 focus:-translate-x-0.5 focus:-translate-y-0.5 focus:shadow-brutal focus:outline-none disabled:cursor-not-allowed disabled:bg-gray-100 disabled:shadow-none sm:text-sm"
                    placeholder="서울시 강남구 테헤란로 123"
                    style={{ minHeight: '48px', fontSize: '16px' }}
                  />
                </div>
              </div>

              {/* Phone */}
              <div>
                <label
                  htmlFor="phone"
                  className="block text-sm font-bold text-brutal-black"
                >
                  연락처 <span className="text-brutal-black/50">(선택)</span>
                </label>
                <div className="mt-2">
                  <input
                    id="phone"
                    name="phone"
                    type="tel"
                    disabled={storePending}
                    className="block w-full appearance-none border-2 border-brutal-black bg-brutal-white px-4 py-3 font-medium text-brutal-black placeholder-brutal-black/50 shadow-brutal-sm transition-all duration-150 focus:-translate-x-0.5 focus:-translate-y-0.5 focus:shadow-brutal focus:outline-none disabled:cursor-not-allowed disabled:bg-gray-100 disabled:shadow-none sm:text-sm"
                    placeholder="02-1234-5678"
                    style={{ minHeight: '48px', fontSize: '16px' }}
                  />
                </div>
              </div>

              {/* Error */}
              {storeState?.error && !storeState.fieldErrors && (
                <div className="border-2 border-brutal-red bg-brutal-red/10 p-4">
                  <p className="text-sm font-medium text-brutal-red">
                    {storeState.error}
                  </p>
                </div>
              )}

              {/* Buttons */}
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => setStep('organization')}
                  disabled={storePending}
                  className="flex-1 border-2 border-brutal-black bg-brutal-white px-4 py-3 text-base font-bold text-brutal-black shadow-brutal transition-all duration-150 hover:-translate-x-1 hover:-translate-y-1 hover:shadow-brutal-lg disabled:cursor-not-allowed disabled:opacity-50"
                  style={{ minHeight: '48px' }}
                >
                  이전
                </button>
                <button
                  type="submit"
                  disabled={storePending}
                  className="flex-1 border-2 border-brutal-black bg-brutal-yellow px-4 py-3 text-base font-bold text-brutal-black shadow-brutal transition-all duration-150 hover:-translate-x-1 hover:-translate-y-1 hover:shadow-brutal-lg active:translate-x-0.5 active:translate-y-0.5 active:shadow-brutal-active disabled:translate-x-0 disabled:translate-y-0 disabled:cursor-not-allowed disabled:bg-brutal-yellow/50 disabled:shadow-none"
                  style={{ minHeight: '48px' }}
                >
                  {storePending ? '생성 중...' : '완료'}
                </button>
              </div>
            </form>
          )}

          {/* Trial info */}
          <div className="mt-6 border-2 border-brutal-black bg-brutal-yellow/20 p-4">
            <p className="text-sm font-medium text-brutal-black">
              🎉 <strong>14일 무료 체험</strong>이 시작됩니다!
              <br />
              <span className="text-brutal-black/70">
                모든 기능을 무료로 사용해보세요.
              </span>
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
