import Link from 'next/link'
import Image from 'next/image'
import { Suspense } from 'react'
import AccordionMenu from './accordion-menu'
import LogoutButton from './logout-button'
import StoreSelector from './store-selector'
import MobileBottomNav from './mobile-bottom-nav'
import { getActiveStores } from './stores/actions'

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const stores = await getActiveStores()

  return (
    <div className="min-h-screen bg-brutal-white pb-[env(safe-area-inset-bottom)] lg:pb-0">
      <nav className="border-b-3 border-brutal-black bg-brutal-yellow">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          {/* Mobile Header */}
          <div className="flex h-14 items-center justify-between lg:hidden">
            <Link href="/dashboard" className="flex items-center">
              <Image
                src="/images/logo.png"
                alt="로고"
                width={40}
                height={40}
                className="h-9 w-auto"
              />
            </Link>
            <Suspense
              fallback={
                <div className="h-8 w-24 animate-pulse border-2 border-brutal-black bg-brutal-white" />
              }
            >
              <StoreSelector stores={stores} mobile />
            </Suspense>
          </div>

          <div className="hidden h-16 justify-between lg:flex">
            <div className="flex">
              <Link href="/dashboard" className="flex items-center">
                <Image
                  src="/images/logo.png"
                  alt="로고"
                  width={40}
                  height={40}
                  className="h-10 w-auto"
                />
              </Link>
              <div className="ml-10 flex items-center">
                <AccordionMenu />
              </div>
            </div>
            <div className="flex items-center gap-4">
              <Suspense
                fallback={
                  <div className="h-8 w-32 animate-pulse border-2 border-brutal-black bg-brutal-white" />
                }
              >
                <StoreSelector stores={stores} />
              </Suspense>
              <LogoutButton />
            </div>
          </div>
        </div>
      </nav>

      <main className="mb-14 py-10 lg:mb-0">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">{children}</div>
      </main>

      <MobileBottomNav />
    </div>
  )
}
