import { redirect } from 'next/navigation'
import Link from 'next/link'
import { getAdminContext } from '@/lib/admin-auth'
import {
  LayoutDashboard,
  Building2,
  Users,
  CreditCard,
  Settings,
  LogOut,
  Shield,
} from 'lucide-react'

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const context = await getAdminContext()

  if (!context.isAuthenticated) {
    redirect('/login')
  }

  if (!context.isSuperAdmin) {
    redirect('/dashboard')
  }

  return (
    <div className="bg-brutal-bg min-h-screen">
      {/* Header */}
      <header className="sticky top-0 z-50 border-b-3 border-brutal-black bg-brutal-red">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex h-16 items-center justify-between">
            <div className="flex items-center gap-3">
              <Shield className="h-8 w-8 text-brutal-white" />
              <span className="text-xl font-black text-brutal-white">
                슈퍼 관리자
              </span>
            </div>
            <div className="flex items-center gap-4">
              <span className="text-sm text-brutal-white/80">
                {context.name} ({context.email})
              </span>
              <Link
                href="/dashboard"
                className="border-2 border-brutal-black bg-brutal-white px-4 py-2 text-sm font-bold text-brutal-red shadow-brutal transition-all hover:shadow-brutal-lg"
              >
                대시보드로
              </Link>
            </div>
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        {/* Navigation */}
        <nav className="mb-8">
          <ul className="flex flex-wrap gap-2">
            <li>
              <Link
                href="/admin"
                className="inline-flex items-center gap-2 border-2 border-brutal-black bg-brutal-white px-4 py-2 text-sm font-bold text-brutal-black shadow-brutal transition-colors hover:bg-brutal-yellow"
              >
                <LayoutDashboard className="h-4 w-4" />
                대시보드
              </Link>
            </li>
            <li>
              <Link
                href="/admin/organizations"
                className="inline-flex items-center gap-2 border-2 border-brutal-black bg-brutal-white px-4 py-2 text-sm font-bold text-brutal-black shadow-brutal transition-colors hover:bg-brutal-yellow"
              >
                <Building2 className="h-4 w-4" />
                조직 관리
              </Link>
            </li>
          </ul>
        </nav>

        {/* Main Content */}
        <main>{children}</main>
      </div>
    </div>
  )
}
