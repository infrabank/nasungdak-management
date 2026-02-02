/**
 * Sales Loading Skeleton
 *
 * Shows skeleton table while sales data is loading.
 */

export default function SalesLoading() {
  return (
    <div className="animate-pulse">
      {/* Page Header */}
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="h-8 w-32 border-2 border-brutal-black/20 bg-brutal-black/10" />
          <div className="mt-2 h-4 w-48 border-2 border-brutal-black/20 bg-brutal-black/10" />
        </div>
        <div className="h-10 w-28 border-3 border-brutal-black/30 bg-brutal-green/30" />
      </div>

      {/* Filters */}
      <div className="mb-6 border-3 border-brutal-black/30 bg-brutal-white p-4">
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          {[...Array(4)].map((_, i) => (
            <div key={i}>
              <div className="mb-2 h-4 w-16 bg-brutal-black/10" />
              <div className="h-10 w-full border-2 border-brutal-black/20 bg-brutal-black/10" />
            </div>
          ))}
        </div>
      </div>

      {/* Summary Cards */}
      <div className="mb-6 grid grid-cols-3 gap-4">
        {[...Array(3)].map((_, i) => (
          <div
            key={i}
            className="border-3 border-brutal-black/30 bg-brutal-white p-4"
          >
            <div className="mb-2 h-4 w-16 bg-brutal-black/10" />
            <div className="h-7 w-24 bg-brutal-black/10" />
          </div>
        ))}
      </div>

      {/* Table Skeleton */}
      <div className="overflow-hidden border-3 border-brutal-black/30 bg-brutal-white">
        {/* Table Header */}
        <div className="border-b-3 border-brutal-black/30 bg-brutal-green/30 p-4">
          <div className="grid grid-cols-5 gap-4">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="h-4 bg-brutal-black/10" />
            ))}
          </div>
        </div>
        {/* Table Rows */}
        {[...Array(8)].map((_, i) => (
          <div key={i} className="border-b border-brutal-black/10 p-4">
            <div className="grid grid-cols-5 gap-4">
              {[...Array(5)].map((_, j) => (
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
