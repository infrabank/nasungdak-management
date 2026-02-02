/**
 * Fixed Costs Loading Skeleton
 */

export default function FixedCostsLoading() {
  return (
    <div className="animate-pulse">
      {/* Page Header */}
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="h-8 w-32 border-2 border-brutal-black/20 bg-brutal-black/10" />
          <div className="mt-2 h-4 w-48 border-2 border-brutal-black/20 bg-brutal-black/10" />
        </div>
        <div className="h-10 w-28 border-3 border-brutal-black/30 bg-brutal-yellow/30" />
      </div>

      {/* Table Skeleton */}
      <div className="overflow-hidden border-3 border-brutal-black/30 bg-brutal-white">
        <div className="border-b-3 border-brutal-black/30 bg-brutal-yellow/30 p-4">
          <div className="grid grid-cols-5 gap-4">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="h-4 bg-brutal-black/10" />
            ))}
          </div>
        </div>
        {[...Array(6)].map((_, i) => (
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
