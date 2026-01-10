import Link from 'next/link'
import { getOilChanges, getOilChangeStats } from './actions'
import OilChangeRow from './oil-change-row'
import { formatDate, formatCurrency } from '@/lib/utils/format'

export const dynamic = 'force-dynamic'

interface SearchParams {
  startDate?: string
  endDate?: string
  fryerType?: string
}

export default async function OilChangesPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>
}) {
  const params = await searchParams

  // Default to last 30 days
  const today = new Date()
  const thirtyDaysAgo = new Date(today)
  thirtyDaysAgo.setDate(today.getDate() - 30)

  const startDate = params.startDate || formatDate(thirtyDaysAgo, 'yyyy-MM-dd')
  const endDate = params.endDate || formatDate(today, 'yyyy-MM-dd')
  const fryerType = params.fryerType || ''

  const [oilChanges, stats] = await Promise.all([
    getOilChanges({ startDate, endDate, fryerType }),
    getOilChangeStats(),
  ])

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">기름 교체 이력</h1>
          <p className="text-gray-600 mt-2">초벌용 및 재벌용 튀김기 기름 교체 기록을 관리합니다</p>
        </div>
        <Link
          href="/dashboard/oil-changes/new"
          className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
        >
          새 교체 이력 등록
        </Link>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white p-6 rounded-lg shadow-sm border">
          <h3 className="text-sm font-medium text-gray-500">최근 30일 교체 횟수</h3>
          <p className="text-2xl font-bold text-gray-900 mt-2">{stats.recentChanges.count}회</p>
        </div>
        <div className="bg-white p-6 rounded-lg shadow-sm border">
          <h3 className="text-sm font-medium text-gray-500">최근 30일 총 비용</h3>
          <p className="text-2xl font-bold text-gray-900 mt-2">
            {formatCurrency(stats.recentChanges.totalCost)}
          </p>
        </div>
        <div className="bg-white p-6 rounded-lg shadow-sm border">
          <h3 className="text-sm font-medium text-gray-500">초벌용 마지막 교체일</h3>
          <p className="text-2xl font-bold text-gray-900 mt-2">
            {stats.lastChangeByFryer['초벌']
              ? formatDate(new Date(stats.lastChangeByFryer['초벌'].changeDate), 'yyyy-MM-dd')
              : '기록 없음'}
          </p>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white p-6 rounded-lg shadow-sm border">
        <form className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              시작일
            </label>
            <input
              type="date"
              name="startDate"
              defaultValue={startDate}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              종료일
            </label>
            <input
              type="date"
              name="endDate"
              defaultValue={endDate}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              튀김기 종류
            </label>
            <select
              name="fryerType"
              defaultValue={fryerType}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">전체</option>
              <option value="초벌">초벌</option>
              <option value="재벌">재벌</option>
            </select>
          </div>
          <div className="flex items-end">
            <button
              type="submit"
              className="w-full bg-gray-600 text-white px-4 py-2 rounded-md hover:bg-gray-700 transition-colors"
            >
              필터 적용
            </button>
          </div>
        </form>
      </div>

      {/* Oil Changes List */}
      <div className="bg-white rounded-lg shadow-sm border">
        <div className="px-6 py-4 border-b">
          <h2 className="text-lg font-semibold text-gray-900">교체 이력 목록</h2>
        </div>
        {oilChanges.length === 0 ? (
          <div className="p-8 text-center text-gray-500">
            <p>등록된 기름 교체 이력이 없습니다</p>
            <Link
              href="/dashboard/oil-changes/new"
              className="mt-4 inline-block text-blue-600 hover:text-blue-700"
            >
              첫 교체 이력 등록하기 →
            </Link>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    교체일
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    튀김기
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    기름 종류
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    수량 (L)
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    단가 (원/L)
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    총비용
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    사용 기간
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    공급업체
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    비고
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    관리
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {oilChanges.map((oilChange) => (
                  <OilChangeRow key={oilChange.id} oilChange={oilChange} />
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}