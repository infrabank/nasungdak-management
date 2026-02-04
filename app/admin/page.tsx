import Link from 'next/link'
import { getAdminStats } from './actions'
import {
  Building2,
  Store,
  Users,
  CreditCard,
  Clock,
  CheckCircle,
  ArrowRight,
} from 'lucide-react'

export default async function AdminDashboardPage() {
  const stats = await getAdminStats()

  if (!stats) {
    return (
      <div className="py-12 text-center">
        <p className="text-brutal-black/70">접근 권한이 없습니다</p>
      </div>
    )
  }

  return (
    <div className="space-y-8">
      {/* Page Header */}
      <div>
        <h1 className="text-3xl font-black text-brutal-black">
          관리자 대시보드
        </h1>
        <p className="mt-2 text-brutal-black/70">
          전체 SaaS 서비스 현황을 관리합니다
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-6">
        <div className="border-3 border-brutal-black bg-brutal-white p-4 shadow-brutal">
          <div className="flex items-center gap-2 text-sm text-brutal-black/70">
            <Building2 className="h-4 w-4" />
            전체 조직
          </div>
          <div className="mt-2 text-3xl font-black text-brutal-black">
            {stats.totalOrganizations}
          </div>
        </div>

        <div className="border-3 border-brutal-black bg-brutal-white p-4 shadow-brutal">
          <div className="flex items-center gap-2 text-sm text-brutal-black/70">
            <CheckCircle className="h-4 w-4 text-green-600" />
            활성 조직
          </div>
          <div className="mt-2 text-3xl font-black text-green-600">
            {stats.activeOrganizations}
          </div>
        </div>

        <div className="border-3 border-brutal-black bg-brutal-white p-4 shadow-brutal">
          <div className="flex items-center gap-2 text-sm text-brutal-black/70">
            <Store className="h-4 w-4" />
            전체 매장
          </div>
          <div className="mt-2 text-3xl font-black text-brutal-black">
            {stats.totalStores}
          </div>
        </div>

        <div className="border-3 border-brutal-black bg-brutal-white p-4 shadow-brutal">
          <div className="flex items-center gap-2 text-sm text-brutal-black/70">
            <Users className="h-4 w-4" />
            전체 사용자
          </div>
          <div className="mt-2 text-3xl font-black text-brutal-black">
            {stats.totalUsers}
          </div>
        </div>

        <div className="border-3 border-brutal-black bg-brutal-white p-4 shadow-brutal">
          <div className="flex items-center gap-2 text-sm text-brutal-black/70">
            <Clock className="h-4 w-4 text-yellow-600" />
            체험중
          </div>
          <div className="mt-2 text-3xl font-black text-yellow-600">
            {stats.trialOrganizations}
          </div>
        </div>

        <div className="border-3 border-brutal-black bg-brutal-white p-4 shadow-brutal">
          <div className="flex items-center gap-2 text-sm text-brutal-black/70">
            <CreditCard className="h-4 w-4 text-blue-600" />
            유료 구독
          </div>
          <div className="mt-2 text-3xl font-black text-blue-600">
            {stats.paidOrganizations}
          </div>
        </div>
      </div>

      {/* Quick Links */}
      <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
        <Link
          href="/admin/organizations"
          className="group border-3 border-brutal-black bg-brutal-white p-6 shadow-brutal transition-all hover:-translate-x-1 hover:-translate-y-1 hover:shadow-brutal-lg"
        >
          <div className="flex items-center justify-between">
            <div>
              <div className="flex items-center gap-3">
                <div className="flex h-12 w-12 items-center justify-center border-2 border-brutal-black bg-brutal-yellow">
                  <Building2 className="h-6 w-6" />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-brutal-black">
                    조직 관리
                  </h3>
                  <p className="text-sm text-brutal-black/70">
                    {stats.totalOrganizations}개 조직 ·{' '}
                    {stats.activeOrganizations}개 활성
                  </p>
                </div>
              </div>
            </div>
            <ArrowRight className="h-6 w-6 text-brutal-black/50 transition-transform group-hover:translate-x-1" />
          </div>
        </Link>

        <Link
          href="/admin/users"
          className="group border-3 border-brutal-black bg-brutal-white p-6 shadow-brutal transition-all hover:-translate-x-1 hover:-translate-y-1 hover:shadow-brutal-lg"
        >
          <div className="flex items-center justify-between">
            <div>
              <div className="flex items-center gap-3">
                <div className="flex h-12 w-12 items-center justify-center border-2 border-brutal-black bg-brutal-pink">
                  <Users className="h-6 w-6" />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-brutal-black">
                    사용자 관리
                  </h3>
                  <p className="text-sm text-brutal-black/70">
                    {stats.totalUsers}명 사용자
                  </p>
                </div>
              </div>
            </div>
            <ArrowRight className="h-6 w-6 text-brutal-black/50 transition-transform group-hover:translate-x-1" />
          </div>
        </Link>
      </div>
    </div>
  )
}
