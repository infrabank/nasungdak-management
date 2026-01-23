import Link from 'next/link'

export default function HomePage() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-24 bg-brutal-white">
      <div className="max-w-2xl text-center">
        <h1 className="mb-8 text-4xl font-black text-brutal-black">
          나성닭강정 관리 시스템
        </h1>
        <p className="mb-8 text-lg font-medium text-brutal-black/70">
          나성닭강정 비즈니스 관리 시스템
        </p>
        <div className="flex justify-center">
          <Link
            href="/login"
            className="px-6 py-3 text-brutal-black bg-brutal-yellow border-2 border-brutal-black font-bold shadow-brutal hover:shadow-brutal-lg hover:-translate-x-1 hover:-translate-y-1 transition-all"
          >
            로그인
          </Link>
        </div>
      </div>
    </main>
  )
}
