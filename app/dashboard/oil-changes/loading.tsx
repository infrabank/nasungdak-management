/**
 * Oil Changes Loading Skeleton
 */

export default function OilChangesLoading() {
  return (
    <div className="animate-pulse">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <div>
          <div className="h-8 w-32 bg-brutal-black/10 border-2 border-brutal-black/20" />
          <div className="mt-2 h-4 w-48 bg-brutal-black/10 border-2 border-brutal-black/20" />
        </div>
        <div className="h-10 w-28 bg-brutal-orange/30 border-3 border-brutal-black/30" />
      </div>

      {/* Cards Grid (Mobile) / Table (Desktop) */}
      <div className="space-y-4 lg:hidden">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="bg-brutal-white border-3 border-brutal-black/30 p-4">
            <div className="flex justify-between mb-3">
              <div className="h-5 w-24 bg-brutal-black/10" />
              <div className="h-5 w-16 bg-brutal-orange/30" />
            </div>
            <div className="space-y-2">
              <div className="h-4 w-full bg-brutal-black/10" />
              <div className="h-4 w-2/3 bg-brutal-black/10" />
            </div>
          </div>
        ))}
      </div>

      {/* Table Skeleton (Desktop) */}
      <div className="hidden lg:block bg-brutal-white border-3 border-brutal-black/30 overflow-hidden">
        <div className="bg-brutal-orange/30 border-b-3 border-brutal-black/30 p-4">
          <div className="grid grid-cols-6 gap-4">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="h-4 bg-brutal-black/10" />
            ))}
          </div>
        </div>
        {[...Array(6)].map((_, i) => (
          <div key={i} className="p-4 border-b border-brutal-black/10">
            <div className="grid grid-cols-6 gap-4">
              {[...Array(6)].map((_, j) => (
                <div key={j} className="h-4 bg-brutal-black/10" style={{ width: `${60 + Math.random() * 40}%` }} />
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
