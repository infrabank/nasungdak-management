import Link from 'next/link'
import Image from 'next/image'
import { Suspense } from 'react'
import { Settings, HelpCircle } from 'lucide-react'
import { getUserContext, getOrganizationBranding } from '@/lib/auth-context'
import AccordionMenu from '@/app/dashboard/accordion-menu'
import LogoutButton from '@/app/dashboard/logout-button'
import StoreSelector from '@/app/dashboard/store-selector'
import { getActiveStores } from '@/app/dashboard/stores/actions'

// Public navigation links for non-logged-in users
const publicLinks = [
  { label: '기능', href: '/pricing' },
  { label: '가이드', href: '/guide' },
]

export default async function PublicHeader() {
  const [userContext, branding] = await Promise.all([
    getUserContext(),
    getOrganizationBranding(),
  ])
  const isLoggedIn = userContext.isAuthenticated

  // Only fetch stores if logged in
  const stores = isLoggedIn ? await getActiveStores() : []

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
                <Suspense
                  fallback={
                    <div className="h-8 w-24 animate-pulse border-2 border-brutal-black bg-brutal-white" />
                  }
                >
                  <StoreSelector stores={stores} mobile />
                </Suspense>
                <Link
                  href="/guide"
                  className="border-2 border-brutal-black bg-brutal-white p-1.5 text-brutal-black shadow-brutal-sm"
                  title="설정 가이드"
                >
                  <HelpCircle className="h-5 w-5" />
                </Link>
                <Link
                  href="/dashboard/settings"
                  className="border-2 border-brutal-black bg-brutal-white p-1.5 text-brutal-black shadow-brutal-sm"
                  title="설정"
                >
                  <Settings className="h-5 w-5" />
                </Link>
                <LogoutButton variant="compact" />
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
          <div className="flex items-center">
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
            {/* Navigation Menu */}
            <div className="ml-10 flex items-center">
              {isLoggedIn ? (
                <AccordionMenu />
              ) : (
                <div className="flex space-x-2">
                  {publicLinks.map((link) => (
                    <Link
                      key={link.href}
                      href={link.href}
                      className="border-2 border-brutal-black bg-brutal-white px-3 py-2 text-sm font-bold text-brutal-black shadow-brutal-sm transition-all hover:-translate-x-0.5 hover:-translate-y-0.5 hover:shadow-brutal"
                    >
                      {link.label}
                    </Link>
                  ))}
                </div>
              )}
            </div>
          </div>
          <div className="flex items-center gap-4">
            {isLoggedIn ? (
              <>
                <Suspense
                  fallback={
                    <div className="h-8 w-32 animate-pulse border-2 border-brutal-black bg-brutal-white" />
                  }
                >
                  <StoreSelector stores={stores} />
                </Suspense>
                <Link
                  href="/guide"
                  className="border-2 border-brutal-black bg-brutal-white p-2 text-brutal-black shadow-brutal-sm transition-all hover:-translate-x-0.5 hover:-translate-y-0.5 hover:shadow-brutal"
                  title="설정 가이드"
                >
                  <HelpCircle className="h-5 w-5" />
                </Link>
                <Link
                  href="/dashboard/settings"
                  className="border-2 border-brutal-black bg-brutal-white p-2 text-brutal-black shadow-brutal-sm transition-all hover:-translate-x-0.5 hover:-translate-y-0.5 hover:shadow-brutal"
                  title="설정"
                >
                  <Settings className="h-5 w-5" />
                </Link>
                <LogoutButton />
              </>
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
