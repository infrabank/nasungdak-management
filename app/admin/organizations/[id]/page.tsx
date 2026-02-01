import { notFound } from 'next/navigation'
import Link from 'next/link'
import { getOrganizationDetail } from '../../actions'
import OrganizationActions from './organization-actions'
import {
  Building2,
  Store,
  Users,
  CreditCard,
  Calendar,
  Mail,
  FileText,
  ArrowLeft,
  CheckCircle,
  XCircle,
} from 'lucide-react'

interface Props {
  params: Promise<{ id: string }>
}

export default async function OrganizationDetailPage({ params }: Props) {
  const { id } = await params
  const organization = await getOrganizationDetail(id)

  if (!organization) {
    notFound()
  }

  const formatDate = (date: Date | null) => {
    if (!date) return '-'
    return new Date(date).toLocaleDateString('ko-KR', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  const getPlanDisplayName = (plan: string) => {
    const names: Record<string, string> = {
      free: '무료',
      basic: '베이직',
      standard: '스탠다드',
      premium: '프리미엄',
      enterprise: '엔터프라이즈',
    }
    return names[plan] || plan
  }

  return (
    <div className="space-y-8">
      {/* Back Button */}
      <Link
        href="/admin"
        className="inline-flex items-center gap-2 text-brutal-black/70 transition-colors hover:text-brutal-black"
      >
        <ArrowLeft className="h-4 w-4" />
        대시보드로 돌아가기
      </Link>

      {/* Header */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-3xl font-black text-brutal-black">
              {organization.name}
            </h1>
            {organization.isActive ? (
              <span className="inline-flex items-center gap-1 border-2 border-green-300 bg-green-100 px-3 py-1 text-sm font-bold text-green-800">
                <CheckCircle className="h-4 w-4" />
                활성
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 border-2 border-red-300 bg-red-100 px-3 py-1 text-sm font-bold text-red-800">
                <XCircle className="h-4 w-4" />
                비활성
              </span>
            )}
          </div>
          <p className="mt-1 text-brutal-black/70">/{organization.slug}</p>
        </div>

        <OrganizationActions organization={organization} />
      </div>

      {/* Info Grid */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
        <div className="border-3 border-brutal-black bg-brutal-white p-4 shadow-brutal">
          <div className="flex items-center gap-2 text-sm text-brutal-black/70">
            <CreditCard className="h-4 w-4" />
            플랜
          </div>
          <div className="mt-2 text-2xl font-black text-brutal-black">
            {getPlanDisplayName(organization.plan)}
          </div>
          <div className="mt-1 text-sm text-brutal-black/50">
            매장{' '}
            {organization.maxStores === -1
              ? '무제한'
              : `${organization.maxStores}개`}
            {' · '}
            사용자{' '}
            {organization.maxUsers === -1
              ? '무제한'
              : `${organization.maxUsers}명`}
          </div>
        </div>

        <div className="border-3 border-brutal-black bg-brutal-white p-4 shadow-brutal">
          <div className="flex items-center gap-2 text-sm text-brutal-black/70">
            <Store className="h-4 w-4" />
            매장
          </div>
          <div className="mt-2 text-2xl font-black text-brutal-black">
            {organization.stores.length}개
          </div>
          <div className="mt-1 text-sm text-brutal-black/50">
            활성 {organization.stores.filter((s) => s.isActive).length}개
          </div>
        </div>

        <div className="border-3 border-brutal-black bg-brutal-white p-4 shadow-brutal">
          <div className="flex items-center gap-2 text-sm text-brutal-black/70">
            <Users className="h-4 w-4" />
            멤버
          </div>
          <div className="mt-2 text-2xl font-black text-brutal-black">
            {organization.members.length}명
          </div>
          <div className="mt-1 text-sm text-brutal-black/50">
            Owner{' '}
            {organization.members.filter((m) => m.role === 'owner').length}명
          </div>
        </div>

        <div className="border-3 border-brutal-black bg-brutal-white p-4 shadow-brutal">
          <div className="flex items-center gap-2 text-sm text-brutal-black/70">
            <Calendar className="h-4 w-4" />
            체험 종료
          </div>
          <div className="mt-2 text-2xl font-black text-brutal-black">
            {organization.trialEndsAt
              ? new Date(organization.trialEndsAt).toLocaleDateString('ko-KR', {
                  month: 'short',
                  day: 'numeric',
                })
              : '-'}
          </div>
          {organization.trialEndsAt &&
            new Date(organization.trialEndsAt) > new Date() && (
              <div className="mt-1 text-sm font-medium text-yellow-600">
                {Math.ceil(
                  (new Date(organization.trialEndsAt).getTime() - Date.now()) /
                    (1000 * 60 * 60 * 24)
                )}
                일 남음
              </div>
            )}
        </div>
      </div>

      {/* Organization Details */}
      <div className="grid grid-cols-1 gap-8 lg:grid-cols-2">
        {/* Basic Info */}
        <div className="border-3 border-brutal-black bg-brutal-white shadow-brutal">
          <div className="border-b-2 border-brutal-black bg-brutal-yellow/20 px-6 py-4">
            <h2 className="text-lg font-bold text-brutal-black">기본 정보</h2>
          </div>
          <div className="space-y-4 p-6">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <div className="text-sm text-brutal-black/70">조직 ID</div>
                <div className="font-mono text-sm">{organization.id}</div>
              </div>
              <div>
                <div className="text-sm text-brutal-black/70">슬러그</div>
                <div className="font-bold">{organization.slug}</div>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <div className="flex items-center gap-2 text-sm text-brutal-black/70">
                  <FileText className="h-4 w-4" />
                  사업자번호
                </div>
                <div className="font-bold">
                  {organization.businessNumber || '-'}
                </div>
              </div>
              <div>
                <div className="flex items-center gap-2 text-sm text-brutal-black/70">
                  <Mail className="h-4 w-4" />
                  결제 이메일
                </div>
                <div className="font-bold">
                  {organization.billingEmail || '-'}
                </div>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <div className="text-sm text-brutal-black/70">생성일</div>
                <div className="font-bold">
                  {formatDate(organization.createdAt)}
                </div>
              </div>
              <div>
                <div className="text-sm text-brutal-black/70">수정일</div>
                <div className="font-bold">
                  {formatDate(organization.updatedAt)}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Subscription */}
        <div className="border-3 border-brutal-black bg-brutal-white shadow-brutal">
          <div className="border-b-2 border-brutal-black bg-brutal-yellow/20 px-6 py-4">
            <h2 className="text-lg font-bold text-brutal-black">구독 정보</h2>
          </div>
          <div className="p-6">
            {organization.subscription ? (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <div className="text-sm text-brutal-black/70">상태</div>
                    <div className="font-bold capitalize">
                      {organization.subscription.status}
                    </div>
                  </div>
                  <div>
                    <div className="text-sm text-brutal-black/70">플랜</div>
                    <div className="font-bold">
                      {getPlanDisplayName(organization.subscription.plan)}
                    </div>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <div className="text-sm text-brutal-black/70">월 요금</div>
                    <div className="font-bold">
                      ₩{organization.subscription.priceMonthly.toLocaleString()}
                    </div>
                  </div>
                  <div>
                    <div className="text-sm text-brutal-black/70">
                      다음 결제일
                    </div>
                    <div className="font-bold">
                      {organization.subscription.currentPeriodEnd
                        ? new Date(
                            organization.subscription.currentPeriodEnd
                          ).toLocaleDateString('ko-KR')
                        : '-'}
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="py-8 text-center text-brutal-black/50">
                구독 정보가 없습니다 (무료 플랜)
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Stores */}
      <div className="border-3 border-brutal-black bg-brutal-white shadow-brutal">
        <div className="border-b-2 border-brutal-black bg-brutal-yellow/20 px-6 py-4">
          <h2 className="text-lg font-bold text-brutal-black">
            매장 목록 ({organization.stores.length})
          </h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-brutal-bg border-b-2 border-brutal-black">
                <th className="px-4 py-3 text-left text-sm font-bold">
                  매장명
                </th>
                <th className="px-4 py-3 text-left text-sm font-bold">코드</th>
                <th className="px-4 py-3 text-center text-sm font-bold">
                  상태
                </th>
                <th className="px-4 py-3 text-left text-sm font-bold">
                  생성일
                </th>
              </tr>
            </thead>
            <tbody>
              {organization.stores.length === 0 ? (
                <tr>
                  <td
                    colSpan={4}
                    className="px-4 py-8 text-center text-brutal-black/50"
                  >
                    등록된 매장이 없습니다
                  </td>
                </tr>
              ) : (
                organization.stores.map((store) => (
                  <tr
                    key={store.id}
                    className="border-b border-brutal-black/20 hover:bg-brutal-yellow/5"
                  >
                    <td className="px-4 py-3 font-bold">{store.storeName}</td>
                    <td className="px-4 py-3 font-mono text-sm">
                      {store.storeCode}
                    </td>
                    <td className="px-4 py-3 text-center">
                      {store.isActive ? (
                        <span className="inline-block bg-green-100 px-2 py-1 text-xs font-bold text-green-800">
                          활성
                        </span>
                      ) : (
                        <span className="inline-block bg-red-100 px-2 py-1 text-xs font-bold text-red-800">
                          비활성
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-sm text-brutal-black/70">
                      {new Date(store.createdAt).toLocaleDateString('ko-KR')}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Members */}
      <div className="border-3 border-brutal-black bg-brutal-white shadow-brutal">
        <div className="border-b-2 border-brutal-black bg-brutal-yellow/20 px-6 py-4">
          <h2 className="text-lg font-bold text-brutal-black">
            멤버 목록 ({organization.members.length})
          </h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-brutal-bg border-b-2 border-brutal-black">
                <th className="px-4 py-3 text-left text-sm font-bold">이름</th>
                <th className="px-4 py-3 text-left text-sm font-bold">
                  이메일
                </th>
                <th className="px-4 py-3 text-center text-sm font-bold">
                  역할
                </th>
                <th className="px-4 py-3 text-center text-sm font-bold">
                  상태
                </th>
                <th className="px-4 py-3 text-left text-sm font-bold">
                  가입일
                </th>
              </tr>
            </thead>
            <tbody>
              {organization.members.length === 0 ? (
                <tr>
                  <td
                    colSpan={5}
                    className="px-4 py-8 text-center text-brutal-black/50"
                  >
                    등록된 멤버가 없습니다
                  </td>
                </tr>
              ) : (
                organization.members.map((member) => (
                  <tr
                    key={member.id}
                    className="border-b border-brutal-black/20 hover:bg-brutal-yellow/5"
                  >
                    <td className="px-4 py-3 font-bold">{member.user.name}</td>
                    <td className="px-4 py-3 text-sm">{member.user.email}</td>
                    <td className="px-4 py-3 text-center">
                      <span
                        className={`inline-block px-2 py-1 text-xs font-bold uppercase ${
                          member.role === 'owner'
                            ? 'bg-purple-100 text-purple-800'
                            : member.role === 'admin'
                              ? 'bg-blue-100 text-blue-800'
                              : 'bg-gray-100 text-gray-800'
                        }`}
                      >
                        {member.role}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-center">
                      {member.user.isActive ? (
                        <span className="inline-block bg-green-100 px-2 py-1 text-xs font-bold text-green-800">
                          활성
                        </span>
                      ) : (
                        <span className="inline-block bg-red-100 px-2 py-1 text-xs font-bold text-red-800">
                          비활성
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-sm text-brutal-black/70">
                      {member.joinedAt
                        ? new Date(member.joinedAt).toLocaleDateString('ko-KR')
                        : '-'}
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
