export default function AnalysisPage() {
  return (
    <div>
      <div className="mb-6">
        <h1 className="text-3xl font-bold">기간 분석</h1>
        <p className="mt-2 text-sm text-gray-700">
          판매 원가 및 마진율 분석
        </p>
      </div>

      {/* Date Range Filter */}
      <div className="bg-white shadow-sm ring-1 ring-gray-900/5 sm:rounded-xl p-6 mb-6">
        <div className="grid grid-cols-1 gap-x-6 gap-y-4 sm:grid-cols-6">
          <div className="sm:col-span-2">
            <label htmlFor="start-date" className="block text-sm font-medium text-gray-900">
              시작 날짜
            </label>
            <div className="mt-2">
              <input
                type="date"
                name="start-date"
                id="start-date"
                className="block w-full rounded-md border-0 py-1.5 px-3 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 focus:ring-2 focus:ring-inset focus:ring-blue-600 sm:text-sm"
              />
            </div>
          </div>

          <div className="sm:col-span-2">
            <label htmlFor="end-date" className="block text-sm font-medium text-gray-900">
              종료 날짜
            </label>
            <div className="mt-2">
              <input
                type="date"
                name="end-date"
                id="end-date"
                className="block w-full rounded-md border-0 py-1.5 px-3 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 focus:ring-2 focus:ring-inset focus:ring-blue-600 sm:text-sm"
              />
            </div>
          </div>

          <div className="sm:col-span-2 flex items-end">
            <button
              type="button"
              className="w-full rounded-md bg-blue-600 px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-blue-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600"
            >
              조회
            </button>
          </div>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4 mb-6">
        {/* TODO: Implement summary metrics */}
        <div className="bg-white shadow-sm ring-1 ring-gray-900/5 sm:rounded-xl p-6">
          <div className="text-sm font-medium text-gray-500">총 매출</div>
          <div className="mt-2 text-3xl font-bold text-gray-900">-</div>
        </div>

        <div className="bg-white shadow-sm ring-1 ring-gray-900/5 sm:rounded-xl p-6">
          <div className="text-sm font-medium text-gray-500">총 원가</div>
          <div className="mt-2 text-3xl font-bold text-gray-900">-</div>
        </div>

        <div className="bg-white shadow-sm ring-1 ring-gray-900/5 sm:rounded-xl p-6">
          <div className="text-sm font-medium text-gray-500">순이익</div>
          <div className="mt-2 text-3xl font-bold text-gray-900">-</div>
        </div>

        <div className="bg-white shadow-sm ring-1 ring-gray-900/5 sm:rounded-xl p-6">
          <div className="text-sm font-medium text-gray-500">마진율</div>
          <div className="mt-2 text-3xl font-bold text-gray-900">-</div>
        </div>
      </div>

      {/* SKU Analysis Table */}
      <div className="bg-white shadow-sm ring-1 ring-gray-900/5 sm:rounded-xl">
        <div className="px-4 py-5 sm:p-6">
          <h3 className="text-base font-semibold text-gray-900 mb-4">SKU별 분석</h3>

          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-300">
              <thead>
                <tr>
                  <th scope="col" className="py-3.5 pl-4 pr-3 text-left text-sm font-semibold text-gray-900 sm:pl-0">
                    SKU
                  </th>
                  <th scope="col" className="px-3 py-3.5 text-right text-sm font-semibold text-gray-900">
                    판매량
                  </th>
                  <th scope="col" className="px-3 py-3.5 text-right text-sm font-semibold text-gray-900">
                    매출액
                  </th>
                  <th scope="col" className="px-3 py-3.5 text-right text-sm font-semibold text-gray-900">
                    원가
                  </th>
                  <th scope="col" className="px-3 py-3.5 text-right text-sm font-semibold text-gray-900">
                    순이익
                  </th>
                  <th scope="col" className="px-3 py-3.5 text-right text-sm font-semibold text-gray-900">
                    마진율
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {/* TODO: Implement SKU-level margin analysis query */}
                {/* Query should calculate: revenue, cost, profit, margin% per SKU */}
                <tr>
                  <td colSpan={6} className="py-10 text-center text-sm text-gray-500">
                    기간을 선택하고 조회 버튼을 클릭하세요
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* TODO: Add charts using Recharts or similar library */}
      {/* - Revenue vs Cost trend line chart */}
      {/* - SKU composition pie chart */}
      {/* - Margin trend over time */}
    </div>
  )
}
