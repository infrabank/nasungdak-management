export default function CostRulesPage() {
  return (
    <div>
      <div className="sm:flex sm:items-center">
        <div className="sm:flex-auto">
          <h1 className="text-3xl font-bold">원가 배분 규칙</h1>
          <p className="mt-2 text-sm text-gray-700">
            재료별 원가 배분 비율 설정
          </p>
        </div>
        <div className="mt-4 sm:ml-16 sm:mt-0 sm:flex-none">
          <button
            type="button"
            className="block rounded-md bg-blue-600 px-3 py-2 text-center text-sm font-semibold text-white shadow-sm hover:bg-blue-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600"
          >
            규칙 추가
          </button>
        </div>
      </div>

      <div className="mt-8 flow-root">
        <div className="-mx-4 -my-2 overflow-x-auto sm:-mx-6 lg:-mx-8">
          <div className="inline-block min-w-full py-2 align-middle sm:px-6 lg:px-8">
            <table className="min-w-full divide-y divide-gray-300">
              <thead>
                <tr>
                  <th scope="col" className="py-3.5 pl-4 pr-3 text-left text-sm font-semibold text-gray-900 sm:pl-0">
                    메뉴
                  </th>
                  <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">
                    재료
                  </th>
                  <th scope="col" className="px-3 py-3.5 text-right text-sm font-semibold text-gray-900">
                    배분 비율 (%)
                  </th>
                  <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">
                    유효 기간
                  </th>
                  <th scope="col" className="relative py-3.5 pl-3 pr-4 sm:pr-0">
                    <span className="sr-only">작업</span>
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {/* TODO: Implement cost_distribution_rules query with menu and ingredient joins */}
                <tr>
                  <td colSpan={5} className="py-10 text-center text-sm text-gray-500">
                    등록된 원가 배분 규칙이 없습니다
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* TODO: Add modal/drawer for create/edit cost distribution rule */}
      {/* Fields: menuId, ingredientId, distributionPercent, effectiveFrom, effectiveTo */}
      {/* Validation: Sum of distribution_percent for same menu + effective date should be 100% */}
    </div>
  )
}
