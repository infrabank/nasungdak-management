/**
 * Maintenance Loading Skeleton
 */

export default function MaintenanceLoading() {
  return (
    <div className="animate-pulse">
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="h-8 w-32 border-2 border-brutal-black/20 bg-brutal-black/10" />
          <div className="mt-2 h-4 w-48 border-2 border-brutal-black/20 bg-brutal-black/10" />
        </div>
        <div className="h-10 w-28 border-3 border-brutal-black/30 bg-brutal-orange/30" />
      </div>

      {/* Stat cards */}
      <div className="mb-4 grid grid-cols-2 gap-3 lg:grid-cols-4">
        {[...Array(4)].map((_, i) => (
          <div
            key={i}
            className="border-3 border-brutal-black/30 bg-brutal-white p-4"
          >
            <div className="h-4 w-2/3 bg-brutal-black/10" />
            <div className="mt-2 h-5 w-1/2 bg-brutal-black/10" />
          </div>
        ))}
      </div>

      <div className="space-y-4 lg:hidden">
        {[...Array(4)].map((_, i) => (
          <div
            key={i}
            className="border-3 border-brutal-black/30 bg-brutal-white p-4"
          >
            <div className="mb-3 flex justify-between">
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

      <div className="hidden overflow-hidden border-3 border-brutal-black/30 bg-brutal-white lg:block">
        <div className="border-b-3 border-brutal-black/30 bg-brutal-orange/30 p-4">
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
                <div key={j} className="h-4 bg-brutal-black/10" />
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
