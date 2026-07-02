import { getSkuMarginAnalysis } from './actions'
import { formatCurrency } from '@/lib/utils/format'
import Link from 'next/link'

export default async function MarginAnalysisPage() {
  const { skus, summary } = await getSkuMarginAnalysis()

  return (
    <div>
      <div className="sm:flex sm:items-center">
        <div className="sm:flex-auto">
          <h1 className="text-3xl font-bold text-brutal-black">
            SKU 마진 분석
          </h1>
          <p className="mt-2 text-sm text-brutal-black/70">
            SKU별 원가 구성과 마진율을 분석합니다
          </p>
        </div>
        <div className="mt-4 sm:ml-16 sm:mt-0 sm:flex-none">
          <Link
            href="/dashboard/master-data/sku-recipes"
            className="border-2 border-brutal-black bg-brutal-yellow px-3 py-2 text-sm font-bold text-brutal-black shadow-brutal transition-all hover:-translate-x-0.5 hover:-translate-y-0.5 hover:shadow-brutal-lg"
          >
            레시피 관리
          </Link>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="border-3 border-brutal-black bg-brutal-white p-4 shadow-brutal">
          <p className="text-sm font-medium text-brutal-black/70">총 SKU</p>
          <p className="mt-1 text-2xl font-black text-brutal-black">
            {summary.totalSkus}개
          </p>
          {summary.noBomSkus > 0 && (
            <p className="mt-1 text-xs font-medium text-brutal-black/50">
              레시피 미등록 {summary.noBomSkus}개는 통계에서 제외
            </p>
          )}
        </div>
        <div className="border-3 border-brutal-black bg-brutal-white p-4 shadow-brutal">
          <p className="text-sm font-medium text-brutal-black/70">
            평균 마진율
          </p>
          <p className="mt-1 text-2xl font-black text-brutal-black">
            {summary.avgMarginPercent.toFixed(1)}%
          </p>
        </div>
        <div className="border-3 border-brutal-black bg-brutal-green p-4 shadow-brutal">
          <p className="text-sm font-medium text-brutal-black/70">
            건전 마진 (30%+)
          </p>
          <p className="mt-1 text-2xl font-black text-brutal-black">
            {summary.healthyMarginSkus}개
          </p>
        </div>
        <div className="border-3 border-brutal-black bg-brutal-pink p-4 shadow-brutal">
          <p className="text-sm font-medium text-brutal-black/70">
            저마진 주의 (&lt;30%)
          </p>
          <p className="mt-1 text-2xl font-black text-brutal-black">
            {summary.lowMarginSkus}개
          </p>
        </div>
      </div>

      {/* SKU Margin Table */}
      <div className="mt-8">
        <div className="overflow-hidden border-3 border-brutal-black shadow-brutal">
          <table className="min-w-full">
            <thead className="border-b-3 border-brutal-black bg-brutal-yellow">
              <tr>
                <th className="py-3.5 pl-6 pr-3 text-left text-sm font-black text-brutal-black">
                  SKU
                </th>
                <th className="px-3 py-3.5 text-right text-sm font-black text-brutal-black">
                  판매가
                </th>
                <th className="px-3 py-3.5 text-right text-sm font-black text-brutal-black">
                  원가
                </th>
                <th className="px-3 py-3.5 text-right text-sm font-black text-brutal-black">
                  마진
                </th>
                <th className="px-3 py-3.5 text-right text-sm font-black text-brutal-black">
                  마진율
                </th>
                <th className="px-3 py-3.5 text-left text-sm font-black text-brutal-black">
                  원가 구성
                </th>
              </tr>
            </thead>
            <tbody className="divide-y-2 divide-brutal-black/20 bg-brutal-white">
              {skus.length === 0 ? (
                <tr>
                  <td
                    colSpan={6}
                    className="py-10 text-center text-sm font-medium text-brutal-black"
                  >
                    레시피가 등록된 SKU가 없습니다.{' '}
                    <Link
                      href="/dashboard/master-data/sku-recipes"
                      className="text-blue-600 underline"
                    >
                      레시피 등록하기
                    </Link>
                  </td>
                </tr>
              ) : (
                skus.map((sku) => (
                  <tr
                    key={sku.id}
                    className={sku.marginPercent < 30 ? 'bg-red-50' : ''}
                  >
                    <td className="py-4 pl-6 pr-3">
                      <div className="text-sm font-medium text-brutal-black">
                        {sku.skuName}
                      </div>
                      <div className="text-xs text-brutal-black/50">
                        {sku.menuName}
                      </div>
                    </td>
                    <td className="whitespace-nowrap px-3 py-4 text-right text-sm font-bold text-brutal-black">
                      {formatCurrency(sku.unitPrice)}
                    </td>
                    <td className="whitespace-nowrap px-3 py-4 text-right text-sm text-brutal-black">
                      {formatCurrency(sku.totalCost)}
                    </td>
                    <td className="whitespace-nowrap px-3 py-4 text-right text-sm font-bold text-brutal-black">
                      {formatCurrency(sku.margin)}
                    </td>
                    <td className="whitespace-nowrap px-3 py-4 text-right">
                      <span
                        className={`inline-flex border-2 px-2 py-1 text-xs font-bold ${
                          sku.marginPercent >= 50
                            ? 'border-brutal-black bg-brutal-green text-brutal-black'
                            : sku.marginPercent >= 30
                              ? 'border-brutal-black bg-brutal-yellow text-brutal-black'
                              : 'border-brutal-black bg-brutal-pink text-brutal-black'
                        }`}
                      >
                        {sku.marginPercent.toFixed(1)}%
                      </span>
                    </td>
                    <td className="px-3 py-4">
                      {sku.recipes.length === 0 ? (
                        <span className="text-xs text-brutal-black/40">
                          레시피 미등록
                        </span>
                      ) : (
                        <div className="space-y-1">
                          {sku.recipes.map((recipe, idx) => (
                            <div
                              key={idx}
                              className="flex items-center text-xs"
                            >
                              <span className="w-20 truncate text-brutal-black/70">
                                {recipe.ingredientName}
                              </span>
                              <div
                                className="ml-2 h-2 bg-brutal-blue"
                                style={{
                                  width: `${Math.min(recipe.costPercent, 100)}px`,
                                }}
                              />
                              <span className="ml-1 text-brutal-black/50">
                                {recipe.costPercent.toFixed(0)}%
                              </span>
                            </div>
                          ))}
                        </div>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Insights */}
      {summary.totalSkus > 0 && (
        <div className="mt-6 grid gap-4 sm:grid-cols-2">
          <div className="border-3 border-brutal-black bg-brutal-white p-4 shadow-brutal">
            <h3 className="font-bold text-brutal-black">최고 마진 SKU</h3>
            <p className="mt-1 text-lg font-black text-green-600">
              {summary.highestMarginSku || '-'}
            </p>
          </div>
          <div className="border-3 border-brutal-black bg-brutal-white p-4 shadow-brutal">
            <h3 className="font-bold text-brutal-black">최저 마진 SKU</h3>
            <p className="mt-1 text-lg font-black text-red-600">
              {summary.lowestMarginSku || '-'}
            </p>
            <p className="mt-1 text-xs text-brutal-black/50">
              원가 절감 또는 가격 조정 검토 필요
            </p>
          </div>
        </div>
      )}
    </div>
  )
}
