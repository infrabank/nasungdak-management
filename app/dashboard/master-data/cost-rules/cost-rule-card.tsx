import { formatDate } from '@/lib/utils/format'
import CostRuleForm from './cost-rule-form'

interface CostRuleCardProps {
  rule: {
    id: string
    menuId: string
    menuName: string | null
    ingredientId: string
    ingredientName: string | null
    distributionPercent: string
    effectiveFrom: string
    effectiveTo: string | null
  }
}

export default function CostRuleCard({ rule }: CostRuleCardProps) {
  return (
    <div className="bg-white rounded-xl shadow-sm ring-1 ring-gray-900/5 overflow-hidden">
      {/* Header - Menu & Ingredient */}
      <div className="p-4 space-y-3">
        {/* Menu */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-sm text-gray-500">
            <span>🍗</span>
            <span>메뉴</span>
          </div>
          <span className="font-medium text-gray-900 text-right">
            {rule.menuName}
          </span>
        </div>

        {/* Ingredient */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-sm text-gray-500">
            <span>🥬</span>
            <span>재료</span>
          </div>
          <span className="font-medium text-gray-900 text-right">
            {rule.ingredientName}
          </span>
        </div>

        {/* Divider */}
        <div className="border-t border-gray-100 my-2" />

        {/* Distribution Percent */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-sm text-gray-500">
            <span>📊</span>
            <span>배분 비율</span>
          </div>
          <span className="font-semibold text-blue-600">
            {Number(rule.distributionPercent).toFixed(2)}%
          </span>
        </div>

        {/* Validity Period */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-sm text-gray-500">
            <span>📅</span>
            <span>유효 기간</span>
          </div>
          <div className="text-sm text-gray-900 text-right">
            {formatDate(rule.effectiveFrom, 'yyyy-MM-dd')}
            {rule.effectiveTo && ` ~ ${formatDate(rule.effectiveTo, 'yyyy-MM-dd')}`}
            {!rule.effectiveTo && ' ~ '}
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="px-4 py-3 bg-gray-50 border-t border-gray-100 flex justify-end">
        <CostRuleForm rule={rule} />
      </div>
    </div>
  )
}
