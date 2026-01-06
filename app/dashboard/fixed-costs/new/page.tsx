import FixedCostForm from '../fixed-cost-form'

export default function NewFixedCostPage() {
  return (
    <div>
      <div className="mb-6">
        <h1 className="text-3xl font-bold">새 고정비 등록</h1>
        <p className="mt-2 text-sm text-gray-700">
          인건비, 임대료, 관리비 등 고정비용을 등록합니다
        </p>
      </div>

      <FixedCostForm />
    </div>
  )
}
