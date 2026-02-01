import Link from 'next/link'
import { getAdminStats, getOrganizations } from './actions'
import {
  Building2,
  Store,
  Users,
  CreditCard,
  Clock,
  CheckCircle,
  XCircle,
  AlertCircle,
} from 'lucide-react'

export default async function AdminDashboardPage() {
  const [stats, organizations] = await Promise.all([
    getAdminStats(),
    getOrganizations(),
  ])

  if (!stats) {
    return (
      <div className="py-12 text-center">
        <p className="text-brutal-black/70">접근 권한이 없습니다</p>
      </div>
    )
  }

  const formatDate = (date: Date | null) => {
    if (!date) return '-'
    return new Date(date).toLocaleDateString('ko-KR', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    })
  }

  const getPlanBadgeColor = (plan: string) => {
    switch (plan) {
      case 'free':
        return 'bg-gray-100 text-gray-800'
      case 'basic':
        return 'bg-blue-100 text-blue-800'
      case 'standard':
        return 'bg-green-100 text-green-800'
      case 'premium':
        return 'bg-purple-100 text-purple-800'
      case 'enterprise':
        return 'bg-yellow-100 text-yellow-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  const getStatusBadge = (
    isActive: boolean,
    subscriptionStatus: string | null
  ) => {
    if (!isActive) {
      return (
        <span className="inline-flex items-center gap-1 border border-red-300 bg-red-100 px-2 py-1 text-xs font-bold text-red-800">
          <XCircle className="h-3 w-3" />
          비활성
        </span>
      )
    }
    if (subscriptionStatus === 'active') {
      return (
        <span className="inline-flex items-center gap-1 border border-green-300 bg-green-100 px-2 py-1 text-xs font-bold text-green-800">
          <CheckCircle className="h-3 w-3" />
          구독중
        </span>
      )
    }
    return (
      <span className="inline-flex items-center gap-1 border border-yellow-300 bg-yellow-100 px-2 py-1 text-xs font-bold text-yellow-800">
        <Clock className="h-3 w-3" />
        체험중
      </span>
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

      {/* Organizations Table */}
      <div className="border-3 border-brutal-black bg-brutal-white shadow-brutal">
        <div className="border-b-2 border-brutal-black bg-brutal-yellow/20 px-6 py-4">
          <h2 className="text-lg font-bold text-brutal-black">
            조직 목록 ({organizations.length})
          </h2>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-brutal-bg border-b-2 border-brutal-black">
                <th className="px-4 py-3 text-left text-sm font-bold text-brutal-black">
                  조직명
                </th>
                <th className="px-4 py-3 text-left text-sm font-bold text-brutal-black">
                  플랜
                </th>
                <th className="px-4 py-3 text-left text-sm font-bold text-brutal-black">
                  상태
                </th>
                <th className="px-4 py-3 text-center text-sm font-bold text-brutal-black">
                  매장
                </th>
                <th className="px-4 py-3 text-center text-sm font-bold text-brutal-black">
                  멤버
                </th>
                <th className="px-4 py-3 text-left text-sm font-bold text-brutal-black">
                  체험 종료
                </th>
                <th className="px-4 py-3 text-left text-sm font-bold text-brutal-black">
                  가입일
                </th>
                <th className="px-4 py-3 text-center text-sm font-bold text-brutal-black">
                  관리
                </th>
              </tr>
            </thead>
            <tbody>
              {organizations.length === 0 ? (
                <tr>
                  <td
                    colSpan={8}
                    className="px-4 py-8 text-center text-brutal-black/50"
                  >
                    등록된 조직이 없습니다
                  </td>
                </tr>
              ) : (
                organizations.map((org) => (
                  <tr
                    key={org.id}
                    className="border-b border-brutal-black/20 transition-colors hover:bg-brutal-yellow/5"
                  >
                    <td className="px-4 py-3">
                      <div>
                        <div className="font-bold text-brutal-black">
                          {org.name}
                        </div>
                        <div className="text-xs text-brutal-black/50">
                          {org.slug}
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`inline-block px-2 py-1 text-xs font-bold uppercase ${getPlanBadgeColor(org.plan)}`}
                      >
                        {org.plan}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      {getStatusBadge(org.isActive, org.subscriptionStatus)}
                    </td>
                    <td className="px-4 py-3 text-center font-bold">
                      {org.storeCount}
                    </td>
                    <td className="px-4 py-3 text-center font-bold">
                      {org.memberCount}
                    </td>
                    <td className="px-4 py-3 text-sm text-brutal-black/70">
                      {org.trialEndsAt &&
                      new Date(org.trialEndsAt) > new Date() ? (
                        <span className="font-medium text-yellow-600">
                          {formatDate(org.trialEndsAt)}
                        </span>
                      ) : (
                        '-'
                      )}
                    </td>
                    <td className="px-4 py-3 text-sm text-brutal-black/70">
                      {formatDate(org.createdAt)}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <Link
                        href={`/admin/organizations/${org.id}`}
                        className="inline-block border-2 border-brutal-black bg-brutal-yellow px-3 py-1 text-sm font-bold text-brutal-black shadow-brutal transition-all hover:shadow-brutal-lg"
                      >
                        상세
                      </Link>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
