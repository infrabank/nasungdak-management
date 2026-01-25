/**
 * Purchases Loading Skeleton
 * 
 * Shows skeleton table while purchase data is loading.
 */

export default function PurchasesLoading() {
  return (
    <div className="animate-pulse">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <div>
          <div className="h-8 w-32 bg-brutal-black/10 border-2 border-brutal-black/20" />
          <div className="mt-2 h-4 w-48 bg-brutal-black/10 border-2 border-brutal-black/20" />
        </div>
        <div className="h-10 w-28 bg-brutal-blue/30 border-3 border-brutal-black/30" />
      </div>

      {/* Filters */}
      <div className="bg-brutal-white border-3 border-brutal-black/30 p-4 mb-6">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <div key={i}>
              <div className="h-4 w-16 bg-brutal-black/10 mb-2" />
              <div className="h-10 w-full bg-brutal-black/10 border-2 border-brutal-black/20" />
            </div>
          ))}
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        {[...Array(3)].map((_, i) => (
          <div
            key={i}
            className="bg-brutal-white border-3 border-brutal-black/30 p-4"
          >
            <div className="h-4 w-16 bg-brutal-black/10 mb-2" />
            <div className="h-7 w-24 bg-brutal-black/10" />
          </div>
        ))}
      </div>

      {/* Table Skeleton */}
      <div className="bg-brutal-white border-3 border-brutal-black/30 overflow-hidden">
        {/* Table Header */}
        <div className="bg-brutal-yellow/30 border-b-3 border-brutal-black/30 p-4">
          <div className="grid grid-cols-6 gap-4">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="h-4 bg-brutal-black/10" />
            ))}
          </div>
        </div>
        {/* Table Rows */}
        {[...Array(8)].map((_, i) => (
          <div
            key={i}
            className="p-4 border-b border-brutal-black/10"
          >
            <div className="grid grid-cols-6 gap-4">
              {[...Array(6)].map((_, j) => (
                <div
                  key={j}
                  className="h-4 bg-brutal-black/10"
                  style={{ width: `${60 + Math.random() * 40}%` }}
                />
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
