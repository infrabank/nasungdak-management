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
    <div className="flex min-h-screen flex-col justify-center bg-gray-50 py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <div className="flex justify-center">
          <Image
            src="/images/logo.png"
            alt="나성닭강정 로고"
            width={100}
            height={100}
            className="h-auto w-auto"
            priority
          />
        </div>
        <h2 className="mt-6 text-center text-3xl font-bold tracking-tight text-gray-900">
          로그인
        </h2>
        <p className="mt-2 text-center text-sm text-gray-600">
          나성닭강정 관리 시스템
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white px-4 py-8 shadow sm:rounded-lg sm:px-10">
          <form action={formAction} className="space-y-6">
            <div>
              <label
                htmlFor="password"
                className="block text-sm font-medium text-gray-700"
              >
                비밀번호
              </label>
              <div className="mt-1">
                <input
                  id="password"
                  name="password"
                  type="password"
                  autoComplete="current-password"
                  required
                  disabled={isPending}
                  className="block w-full appearance-none rounded-md border border-gray-300 px-3 py-3 placeholder-gray-400 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-blue-500 disabled:cursor-not-allowed disabled:bg-gray-100 sm:text-sm"
                  placeholder="비밀번호를 입력하세요"
                  style={{ minHeight: '48px', fontSize: '16px' }}
                />
              </div>
            </div>

            {state?.error && (
              <div className="rounded-md bg-red-50 p-4">
                <div className="flex">
                  <div className="ml-3">
                    <h3 className="text-sm font-medium text-red-800">
                      로그인 실패
                    </h3>
                    <div className="mt-2 text-sm text-red-700">
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
                className="flex w-full justify-center rounded-md border border-transparent bg-blue-600 px-4 py-3 text-sm font-medium text-white shadow-sm hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:cursor-not-allowed disabled:bg-blue-400"
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
