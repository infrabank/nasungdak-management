'use client'

import { useActionState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { signup, type SignupState } from './actions'

export default function SignupPage() {
  const router = useRouter()
  const [state, formAction, isPending] = useActionState<
    SignupState | null,
    FormData
  >(signup, null)

  useEffect(() => {
    if (state?.success) {
      router.push('/onboarding')
    }
  }, [state, router])

  return (
    <div className="flex min-h-screen flex-col justify-center bg-brutal-white py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <h2 className="text-center text-4xl font-bold tracking-tight text-brutal-black">
          회원가입
        </h2>
        <p className="mt-3 text-center text-base font-medium text-brutal-black/70">
          사장북을 시작하세요
        </p>
      </div>

      <div className="mt-8 px-4 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="border-3 border-brutal-black bg-brutal-white px-6 py-8 shadow-brutal-lg">
          <form action={formAction} className="space-y-5">
            {/* Email */}
            <div>
              <label
                htmlFor="email"
                className="block text-sm font-bold text-brutal-black"
              >
                이메일 <span className="text-brutal-red">*</span>
              </label>
              <div className="mt-2">
                <input
                  id="email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  required
                  disabled={isPending}
                  className="block w-full appearance-none border-2 border-brutal-black bg-brutal-white px-4 py-3 font-medium text-brutal-black placeholder-brutal-black/50 shadow-brutal-sm transition-all duration-150 focus:-translate-x-0.5 focus:-translate-y-0.5 focus:shadow-brutal focus:outline-none disabled:cursor-not-allowed disabled:bg-gray-100 disabled:shadow-none sm:text-sm"
                  placeholder="example@email.com"
                  style={{ minHeight: '48px', fontSize: '16px' }}
                />
              </div>
              {state?.fieldErrors?.email && (
                <p className="mt-1 text-sm font-medium text-brutal-red">
                  {state.fieldErrors.email}
                </p>
              )}
            </div>

            {/* Name */}
            <div>
              <label
                htmlFor="name"
                className="block text-sm font-bold text-brutal-black"
              >
                이름 <span className="text-brutal-red">*</span>
              </label>
              <div className="mt-2">
                <input
                  id="name"
                  name="name"
                  type="text"
                  autoComplete="name"
                  required
                  disabled={isPending}
                  className="block w-full appearance-none border-2 border-brutal-black bg-brutal-white px-4 py-3 font-medium text-brutal-black placeholder-brutal-black/50 shadow-brutal-sm transition-all duration-150 focus:-translate-x-0.5 focus:-translate-y-0.5 focus:shadow-brutal focus:outline-none disabled:cursor-not-allowed disabled:bg-gray-100 disabled:shadow-none sm:text-sm"
                  placeholder="홍길동"
                  style={{ minHeight: '48px', fontSize: '16px' }}
                />
              </div>
              {state?.fieldErrors?.name && (
                <p className="mt-1 text-sm font-medium text-brutal-red">
                  {state.fieldErrors.name}
                </p>
              )}
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
                  autoComplete="tel"
                  disabled={isPending}
                  className="block w-full appearance-none border-2 border-brutal-black bg-brutal-white px-4 py-3 font-medium text-brutal-black placeholder-brutal-black/50 shadow-brutal-sm transition-all duration-150 focus:-translate-x-0.5 focus:-translate-y-0.5 focus:shadow-brutal focus:outline-none disabled:cursor-not-allowed disabled:bg-gray-100 disabled:shadow-none sm:text-sm"
                  placeholder="010-1234-5678"
                  style={{ minHeight: '48px', fontSize: '16px' }}
                />
              </div>
            </div>

            {/* Password */}
            <div>
              <label
                htmlFor="password"
                className="block text-sm font-bold text-brutal-black"
              >
                비밀번호 <span className="text-brutal-red">*</span>
              </label>
              <div className="mt-2">
                <input
                  id="password"
                  name="password"
                  type="password"
                  autoComplete="new-password"
                  required
                  minLength={8}
                  disabled={isPending}
                  className="block w-full appearance-none border-2 border-brutal-black bg-brutal-white px-4 py-3 font-medium text-brutal-black placeholder-brutal-black/50 shadow-brutal-sm transition-all duration-150 focus:-translate-x-0.5 focus:-translate-y-0.5 focus:shadow-brutal focus:outline-none disabled:cursor-not-allowed disabled:bg-gray-100 disabled:shadow-none sm:text-sm"
                  placeholder="8자 이상 입력"
                  style={{ minHeight: '48px', fontSize: '16px' }}
                />
              </div>
              {state?.fieldErrors?.password && (
                <p className="mt-1 text-sm font-medium text-brutal-red">
                  {state.fieldErrors.password}
                </p>
              )}
            </div>

            {/* Confirm Password */}
            <div>
              <label
                htmlFor="confirmPassword"
                className="block text-sm font-bold text-brutal-black"
              >
                비밀번호 확인 <span className="text-brutal-red">*</span>
              </label>
              <div className="mt-2">
                <input
                  id="confirmPassword"
                  name="confirmPassword"
                  type="password"
                  autoComplete="new-password"
                  required
                  disabled={isPending}
                  className="block w-full appearance-none border-2 border-brutal-black bg-brutal-white px-4 py-3 font-medium text-brutal-black placeholder-brutal-black/50 shadow-brutal-sm transition-all duration-150 focus:-translate-x-0.5 focus:-translate-y-0.5 focus:shadow-brutal focus:outline-none disabled:cursor-not-allowed disabled:bg-gray-100 disabled:shadow-none sm:text-sm"
                  placeholder="비밀번호를 다시 입력"
                  style={{ minHeight: '48px', fontSize: '16px' }}
                />
              </div>
              {state?.fieldErrors?.confirmPassword && (
                <p className="mt-1 text-sm font-medium text-brutal-red">
                  {state.fieldErrors.confirmPassword}
                </p>
              )}
            </div>

            {/* Error message */}
            {state?.error && !state.fieldErrors && (
              <div className="border-2 border-brutal-red bg-brutal-red/10 p-4">
                <div className="flex">
                  <div>
                    <h3 className="text-sm font-bold text-brutal-red">
                      회원가입 실패
                    </h3>
                    <div className="mt-2 text-sm font-medium text-brutal-red">
                      <p>{state.error}</p>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Submit button */}
            <div>
              <button
                type="submit"
                disabled={isPending}
                className="flex w-full justify-center border-2 border-brutal-black bg-brutal-yellow px-4 py-3 text-base font-bold text-brutal-black shadow-brutal transition-all duration-150 hover:-translate-x-1 hover:-translate-y-1 hover:shadow-brutal-lg active:translate-x-0.5 active:translate-y-0.5 active:shadow-brutal-active disabled:translate-x-0 disabled:translate-y-0 disabled:cursor-not-allowed disabled:bg-brutal-yellow/50 disabled:shadow-none"
                style={{ minHeight: '48px' }}
              >
                {isPending ? '가입 중...' : '가입하기'}
              </button>
            </div>
          </form>

          {/* Login link */}
          <div className="mt-6 text-center">
            <p className="text-sm font-medium text-brutal-black/70">
              이미 계정이 있으신가요?{' '}
              <Link
                href="/login"
                className="font-bold text-brutal-black underline underline-offset-2 transition-colors hover:text-brutal-yellow"
              >
                로그인
              </Link>
            </p>
          </div>

          {/* Guide link */}
          <div className="mt-4 text-center">
            <Link
              href="/guide"
              className="text-sm font-medium text-brutal-black/50 underline underline-offset-2 transition-colors hover:text-brutal-black"
            >
              처음이신가요? 설정 가이드 보기
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}
