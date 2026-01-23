'use client'

import { useActionState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
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
          <div className="border-3 border-brutal-black shadow-brutal-lg p-4 bg-brutal-yellow">
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

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md px-4">
        <div className="bg-brutal-white px-6 py-8 border-3 border-brutal-black shadow-brutal-lg">
          <form action={formAction} className="space-y-6">
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
                  className="block w-full appearance-none px-4 py-3 text-brutal-black bg-brutal-white border-2 border-brutal-black shadow-brutal-sm placeholder-brutal-black/50 focus:outline-none focus:shadow-brutal focus:-translate-x-0.5 focus:-translate-y-0.5 transition-all duration-150 disabled:cursor-not-allowed disabled:bg-gray-100 disabled:shadow-none sm:text-sm font-medium"
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
                className="flex w-full justify-center px-4 py-3 text-base font-bold text-brutal-black bg-brutal-yellow border-2 border-brutal-black shadow-brutal hover:shadow-brutal-lg hover:-translate-x-1 hover:-translate-y-1 active:shadow-brutal-active active:translate-x-0.5 active:translate-y-0.5 transition-all duration-150 disabled:cursor-not-allowed disabled:bg-brutal-yellow/50 disabled:shadow-none disabled:translate-x-0 disabled:translate-y-0"
                style={{ minHeight: '48px' }}
              >
                {isPending ? '로그인 중...' : '로그인'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}
