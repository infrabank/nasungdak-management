/**
 * Master Data Loading Skeleton
 *
 * Shows skeleton cards while master data is loading.
 */

export default function MasterDataLoading() {
  return (
    <div className="animate-pulse">
      {/* Page Header */}
      <div className="mb-6">
        <div className="h-8 w-40 border-2 border-brutal-black/20 bg-brutal-black/10" />
        <div className="mt-2 h-4 w-64 border-2 border-brutal-black/20 bg-brutal-black/10" />
      </div>

      {/* Category Cards */}
      <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
        {[
          { color: 'bg-brutal-yellow/30' },
          { color: 'bg-brutal-green/30' },
          { color: 'bg-brutal-blue/30' },
          { color: 'bg-brutal-pink/30' },
          { color: 'bg-brutal-purple/30' },
          { color: 'bg-brutal-orange/30' },
        ].map((item, i) => (
          <div
            key={i}
            className="overflow-hidden border-3 border-brutal-black/30 bg-brutal-white"
          >
            {/* Card Header */}
            <div
              className={`${item.color} border-b-2 border-brutal-black/30 p-4`}
            >
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 border-2 border-brutal-black/20 bg-brutal-black/10" />
                <div className="h-5 w-24 bg-brutal-black/10" />
              </div>
            </div>
            {/* Card Body */}
            <div className="p-4">
              <div className="mb-2 h-4 w-full bg-brutal-black/10" />
              <div className="h-4 w-3/4 bg-brutal-black/10" />
            </div>
            {/* Card Footer */}
            <div className="border-t border-brutal-black/10 px-4 py-3">
              <div className="h-8 w-20 bg-brutal-black/10" />
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
