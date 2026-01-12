import Link from 'next/link'
import { Suspense } from 'react'
import AccordionMenu from './accordion-menu'
import LogoutButton from './logout-button'
import StoreSelector from './store-selector'
import { getActiveStores } from './stores/actions'

export const dynamic = 'force-dynamic'

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const stores = await getActiveStores()

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Navigation */}
      <nav className="bg-white shadow">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex h-16 justify-between">
            <div className="flex">
              <Link href="/dashboard" className="flex items-center">
                <span className="text-xl font-bold text-red-600">나성닭강정</span>
              </Link>
              <div className="ml-10 flex items-center">
                <AccordionMenu />
              </div>
            </div>
            <div className="flex items-center gap-4">
              <Suspense fallback={<div className="h-8 w-32 animate-pulse bg-gray-200 rounded" />}>
                <StoreSelector stores={stores} />
              </Suspense>
              <LogoutButton />
            </div>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <main className="py-10">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          {children}
        </div>
      </main>
    </div>
  )
}
