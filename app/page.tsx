import Link from 'next/link'

export default function HomePage() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-24">
      <div className="max-w-2xl text-center">
        <h1 className="mb-8 text-4xl font-bold">
          매입/판매/원가 관리 시스템
        </h1>
        <p className="mb-8 text-lg text-gray-600">
          나성닭강정 비즈니스 관리 시스템
        </p>
        <div className="flex justify-center">
          <Link
            href="/login"
            className="rounded-lg bg-blue-600 px-6 py-3 text-white hover:bg-blue-700"
          >
            로그인
          </Link>
        </div>
      </div>
    </main>
  )
}
