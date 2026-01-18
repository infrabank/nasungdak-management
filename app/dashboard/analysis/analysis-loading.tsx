/**
 * Loading skeleton for Analysis detailed content
 * Shown while SKU analysis and monthly data are being fetched
 */

export default function AnalysisLoading() {
  return (
    <div className="animate-pulse">
      {/* Tabs skeleton */}
      <div className="border-b border-gray-200 mb-6">
        <div className="flex gap-4">
          <div className="h-10 w-24 bg-gray-200 rounded" />
          <div className="h-10 w-24 bg-gray-200 rounded" />
        </div>
      </div>

      {/* Table skeleton */}
      <div className="bg-white rounded-xl shadow-sm ring-1 ring-gray-900/5 overflow-hidden">
        <div className="p-4 border-b border-gray-100">
          <div className="h-6 w-32 bg-gray-200 rounded" />
        </div>
        <div className="divide-y divide-gray-100">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="p-4 flex gap-4">
              <div className="h-5 w-1/4 bg-gray-200 rounded" />
              <div className="h-5 w-1/6 bg-gray-200 rounded" />
              <div className="h-5 w-1/6 bg-gray-200 rounded" />
              <div className="h-5 w-1/6 bg-gray-200 rounded" />
              <div className="h-5 w-1/6 bg-gray-200 rounded" />
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
