'use client'

import { useActionState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import Link from 'next/link'
import { login } from './actions'

export default function LoginPage() {
  const router = useRouter()
  const [state, formAction, isPending] = useActionState(login, null)

  useEffect(() => {
    if (state?.success) {
      router.push('/dashboard')
    }
  }, [state, router])

  return (
    <div className="flex min-h-screen flex-col justify-center bg-brutal-white py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <div className="flex justify-center">
          <div className="border-3 border-brutal-black bg-brutal-yellow p-4 shadow-brutal-lg">
            <Image
              src="/images/logo.png"
              alt="나성닭강정 로고"
              width={100}
              height={100}
              className="h-auto w-auto"
              priority
            />
          </div>
        </div>
        <h2 className="mt-8 text-center text-4xl font-bold tracking-tight text-brutal-black">
          로그인
        </h2>
        <p className="mt-3 text-center text-base font-medium text-brutal-black/70">
          나성닭강정 관리 시스템
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
                이메일
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
                  placeholder="이메일을 입력하세요"
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
                비밀번호
              </label>
              <div className="mt-2">
                <input
                  id="password"
                  name="password"
                  type="password"
                  autoComplete="current-password"
                  required
                  disabled={isPending}
                  className="block w-full appearance-none border-2 border-brutal-black bg-brutal-white px-4 py-3 font-medium text-brutal-black placeholder-brutal-black/50 shadow-brutal-sm transition-all duration-150 focus:-translate-x-0.5 focus:-translate-y-0.5 focus:shadow-brutal focus:outline-none disabled:cursor-not-allowed disabled:bg-gray-100 disabled:shadow-none sm:text-sm"
                  placeholder="비밀번호를 입력하세요"
                  style={{ minHeight: '48px', fontSize: '16px' }}
                />
              </div>
            </div>

            {state?.error && (
              <div className="border-2 border-brutal-red bg-brutal-red/10 p-4">
                <div className="flex">
                  <div>
                    <h3 className="text-sm font-bold text-brutal-red">
                      로그인 실패
                    </h3>
                    <div className="mt-2 text-sm font-medium text-brutal-red">
                      <p>{state.error}</p>
                    </div>
                  </div>
                </div>
              </div>
            )}

            <div>
              <button
                type="submit"
                disabled={isPending}
                className="flex w-full justify-center border-2 border-brutal-black bg-brutal-yellow px-4 py-3 text-base font-bold text-brutal-black shadow-brutal transition-all duration-150 hover:-translate-x-1 hover:-translate-y-1 hover:shadow-brutal-lg active:translate-x-0.5 active:translate-y-0.5 active:shadow-brutal-active disabled:translate-x-0 disabled:translate-y-0 disabled:cursor-not-allowed disabled:bg-brutal-yellow/50 disabled:shadow-none"
                style={{ minHeight: '48px' }}
              >
                {isPending ? '로그인 중...' : '로그인'}
              </button>
            </div>
          </form>

          {/* Signup link */}
          <div className="mt-6 text-center">
            <p className="text-sm font-medium text-brutal-black/70">
              계정이 없으신가요?{' '}
              <Link
                href="/signup"
                className="font-bold text-brutal-black underline underline-offset-2 transition-colors hover:text-brutal-yellow"
              >
                회원가입
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
