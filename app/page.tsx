import Link from 'next/link'
import { redirect } from 'next/navigation'
import { getUserContext } from '@/lib/auth-context'

export default async function HomePage() {
  const userContext = await getUserContext()

  // 로그인된 사용자는 대시보드로 리다이렉트
  if (userContext.isAuthenticated) {
    redirect('/dashboard')
  }

  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-brutal-white p-24">
      <div className="max-w-2xl text-center">
        <h1 className="mb-8 text-4xl font-black text-brutal-black">
          매장 관리 시스템
        </h1>
        <p className="mb-8 text-lg font-medium text-brutal-black/70">
          매입, 판매, 원가를 한 곳에서 관리하세요
        </p>
        <div className="flex justify-center">
          <Link
            href="/login"
            className="border-2 border-brutal-black bg-brutal-yellow px-6 py-3 font-bold text-brutal-black shadow-brutal transition-all hover:-translate-x-1 hover:-translate-y-1 hover:shadow-brutal-lg"
          >
            로그인
          </Link>
        </div>
      </div>
    </main>
  )
}
