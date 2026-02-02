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
    <div className="overflow-hidden border-3 border-brutal-black bg-brutal-white shadow-brutal">
      {/* Header - Menu & Ingredient */}
      <div className="space-y-3 p-4">
        {/* Menu */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-sm font-medium text-brutal-black/70">
            <span>🍗</span>
            <span>메뉴</span>
          </div>
          <span className="text-right font-bold text-brutal-black">
            {rule.menuName}
          </span>
        </div>

        {/* Ingredient */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-sm font-medium text-brutal-black/70">
            <span>🥬</span>
            <span>재료</span>
          </div>
          <span className="text-right font-bold text-brutal-black">
            {rule.ingredientName}
          </span>
        </div>

        {/* Divider */}
        <div className="my-2 border-t-2 border-brutal-black/20" />

        {/* Distribution Percent */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-sm font-medium text-brutal-black/70">
            <span>📊</span>
            <span>배분 비율</span>
          </div>
          <span className="font-black text-brutal-black">
            {Number(rule.distributionPercent).toFixed(2)}%
          </span>
        </div>

        {/* Validity Period */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-sm font-medium text-brutal-black/70">
            <span>📅</span>
            <span>유효 기간</span>
          </div>
          <div className="text-right text-sm font-bold text-brutal-black">
            {formatDate(rule.effectiveFrom, 'yyyy-MM-dd')}
            {rule.effectiveTo &&
              ` ~ ${formatDate(rule.effectiveTo, 'yyyy-MM-dd')}`}
            {!rule.effectiveTo && ' ~ '}
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="flex justify-end border-t-2 border-brutal-black bg-brutal-yellow/30 px-4 py-3">
        <CostRuleForm rule={rule} />
      </div>
    </div>
  )
}
