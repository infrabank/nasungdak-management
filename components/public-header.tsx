import Link from 'next/link'
import Image from 'next/image'
import { LayoutDashboard, LogOut } from 'lucide-react'
import { getUserContext, getOrganizationBranding } from '@/lib/auth-context'

export default async function PublicHeader() {
  const [userContext, branding] = await Promise.all([
    getUserContext(),
    getOrganizationBranding(),
  ])
  const isLoggedIn = userContext.isAuthenticated

  return (
    <nav className="border-b-3 border-brutal-black bg-brutal-yellow">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        {/* Mobile Header */}
        <div className="flex h-14 items-center justify-between lg:hidden">
          <Link
            href={isLoggedIn ? '/dashboard' : '/'}
            className="flex items-center"
          >
            {branding?.logoUrl ? (
              <Image
                src={branding.logoUrl}
                alt={branding.name}
                width={40}
                height={40}
                className="h-9 w-auto"
              />
            ) : (
              <span className="text-lg font-black text-brutal-black">
                {branding?.name || '매장 관리'}
              </span>
            )}
          </Link>
          <div className="flex items-center gap-2">
            {isLoggedIn ? (
              <>
                <Link
                  href="/dashboard"
                  className="flex items-center gap-1.5 border-2 border-brutal-black bg-brutal-white px-3 py-1.5 text-sm font-bold text-brutal-black shadow-brutal-sm"
                >
                  <LayoutDashboard className="h-4 w-4" />
                  대시보드
                </Link>
              </>
            ) : (
              <>
                <Link
                  href="/login"
                  className="px-3 py-1.5 text-sm font-bold text-brutal-black hover:underline"
                >
                  로그인
                </Link>
                <Link
                  href="/signup"
                  className="border-2 border-brutal-black bg-brutal-white px-3 py-1.5 text-sm font-bold text-brutal-black shadow-brutal-sm"
                >
                  시작하기
                </Link>
              </>
            )}
          </div>
        </div>

        {/* Desktop Header */}
        <div className="hidden h-16 items-center justify-between lg:flex">
          <Link
            href={isLoggedIn ? '/dashboard' : '/'}
            className="flex items-center"
          >
            {branding?.logoUrl ? (
              <Image
                src={branding.logoUrl}
                alt={branding.name}
                width={40}
                height={40}
                className="h-10 w-auto"
              />
            ) : (
              <span className="text-xl font-black text-brutal-black">
                {branding?.name || '매장 관리'}
              </span>
            )}
          </Link>
          <div className="flex items-center gap-4">
            {isLoggedIn ? (
              <Link
                href="/dashboard"
                className="flex items-center gap-2 border-2 border-brutal-black bg-brutal-white px-4 py-2 text-sm font-bold text-brutal-black shadow-brutal-sm transition-all hover:-translate-x-0.5 hover:-translate-y-0.5 hover:shadow-brutal"
              >
                <LayoutDashboard className="h-4 w-4" />
                대시보드로 이동
              </Link>
            ) : (
              <>
                <Link
                  href="/login"
                  className="px-4 py-2 text-sm font-bold text-brutal-black hover:underline"
                >
                  로그인
                </Link>
                <Link
                  href="/signup"
                  className="border-2 border-brutal-black bg-brutal-white px-4 py-2 text-sm font-bold text-brutal-black shadow-brutal-sm transition-all hover:-translate-x-0.5 hover:-translate-y-0.5 hover:shadow-brutal"
                >
                  무료로 시작하기
                </Link>
              </>
            )}
          </div>
        </div>
      </div>
    </nav>
  )
}
