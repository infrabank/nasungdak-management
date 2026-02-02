/**
 * Inventory Loading Skeleton
 */

export default function InventoryLoading() {
  return (
    <div className="animate-pulse">
      {/* Page Header */}
      <div className="mb-6">
        <div className="h-8 w-32 border-2 border-brutal-black/20 bg-brutal-black/10" />
        <div className="mt-2 h-4 w-56 border-2 border-brutal-black/20 bg-brutal-black/10" />
      </div>

      {/* Cards Grid */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
        {[...Array(6)].map((_, i) => (
          <div
            key={i}
            className="overflow-hidden border-3 border-brutal-black/30 bg-brutal-white"
          >
            <div className="border-b-2 border-brutal-black/30 bg-brutal-blue/30 p-4">
              <div className="flex items-center gap-3">
                <div className="h-8 w-8 bg-brutal-black/10" />
                <div className="h-5 w-24 bg-brutal-black/10" />
              </div>
            </div>
            <div className="space-y-3 p-4">
              <div className="flex justify-between">
                <div className="h-4 w-16 bg-brutal-black/10" />
                <div className="h-4 w-20 bg-brutal-black/10" />
              </div>
              <div className="flex justify-between">
                <div className="h-4 w-20 bg-brutal-black/10" />
                <div className="h-4 w-16 bg-brutal-black/10" />
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
