import { getCostRules } from './actions'
import CostRuleForm from './cost-rule-form'
import CostRuleCard from './cost-rule-card'
import { formatDate } from '@/lib/utils/format'

export default async function CostRulesPage() {
  const rules = await getCostRules()

  return (
    <div>
      <div className="sm:flex sm:items-center">
        <div className="sm:flex-auto">
          <h1 className="text-3xl font-black text-brutal-black">
            원가 배분 규칙
          </h1>
          <p className="mt-2 text-sm font-medium text-brutal-black/70">
            재료별 원가 배분 비율 설정
          </p>
        </div>
        <div className="mt-4 sm:ml-16 sm:mt-0 sm:flex-none">
          <CostRuleForm />
        </div>
      </div>

      <div className="mt-8 flow-root">
        {/* Mobile View - Cards */}
        <div className="space-y-4 md:hidden">
          {rules.length === 0 ? (
            <div className="border-3 border-dashed border-brutal-black bg-brutal-white py-10 text-center font-medium text-brutal-black">
              등록된 원가 배분 규칙이 없습니다
            </div>
          ) : (
            rules.map((rule) => <CostRuleCard key={rule.id} rule={rule} />)
          )}
        </div>

        {/* Desktop View - Table */}
        <div className="hidden md:block">
          <div className="overflow-hidden border-3 border-brutal-black shadow-brutal">
            <table className="min-w-full">
              <thead className="border-b-3 border-brutal-black bg-brutal-yellow">
                <tr>
                  <th
                    scope="col"
                    className="py-3.5 pl-6 pr-3 text-left text-sm font-black text-brutal-black"
                  >
                    메뉴
                  </th>
                  <th
                    scope="col"
                    className="px-3 py-3.5 text-left text-sm font-black text-brutal-black"
                  >
                    재료
                  </th>
                  <th
                    scope="col"
                    className="px-3 py-3.5 text-right text-sm font-black text-brutal-black"
                  >
                    배분 비율 (%)
                  </th>
                  <th
                    scope="col"
                    className="px-3 py-3.5 text-left text-sm font-black text-brutal-black"
                  >
                    유효 기간
                  </th>
                  <th scope="col" className="relative py-3.5 pl-3 pr-6">
                    <span className="sr-only">작업</span>
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y-2 divide-brutal-black/20 bg-brutal-white">
                {rules.length === 0 ? (
                  <tr>
                    <td
                      colSpan={5}
                      className="py-10 text-center text-sm font-medium text-brutal-black"
                    >
                      등록된 원가 배분 규칙이 없습니다
                    </td>
                  </tr>
                ) : (
                  rules.map((rule) => (
                    <tr key={rule.id}>
                      <td className="whitespace-nowrap py-4 pl-6 pr-3 text-sm font-medium text-brutal-black">
                        {rule.menuName}
                      </td>
                      <td className="whitespace-nowrap px-3 py-4 text-sm text-brutal-black">
                        {rule.ingredientName}
                      </td>
                      <td className="whitespace-nowrap px-3 py-4 text-right text-sm font-bold text-brutal-black">
                        {Number(rule.distributionPercent).toFixed(2)}%
                      </td>
                      <td className="whitespace-nowrap px-3 py-4 text-sm text-brutal-black/70">
                        {formatDate(rule.effectiveFrom, 'yy-MM-dd(EEE)')}
                        {rule.effectiveTo &&
                          ` ~ ${formatDate(rule.effectiveTo, 'yy-MM-dd(EEE)')}`}
                        {!rule.effectiveTo && ' ~ '}
                      </td>
                      <td className="relative whitespace-nowrap py-4 pl-3 pr-6 text-right text-sm font-medium">
                        <CostRuleForm rule={rule} />
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  )
}
