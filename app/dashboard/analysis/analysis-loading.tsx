/**
 * Loading skeleton for Analysis detailed content
 * Shown while SKU analysis and monthly data are being fetched
 */

export default function AnalysisLoading() {
  return (
    <div className="animate-pulse">
      {/* Tabs skeleton */}
      <div className="mb-6 border-b-3 border-brutal-black">
        <div className="flex gap-4">
          <div className="h-10 w-24 border-2 border-brutal-black bg-brutal-black/20" />
          <div className="h-10 w-24 border-2 border-brutal-black bg-brutal-black/20" />
        </div>
      </div>

      {/* Table skeleton */}
      <div className="overflow-hidden border-3 border-brutal-black bg-brutal-white shadow-brutal">
        <div className="border-b-3 border-brutal-black p-4">
          <div className="h-6 w-32 bg-brutal-black/20" />
        </div>
        <div className="divide-y-2 divide-brutal-black">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="flex gap-4 p-4">
              <div className="h-5 w-1/4 bg-brutal-black/20" />
              <div className="h-5 w-1/6 bg-brutal-black/20" />
              <div className="h-5 w-1/6 bg-brutal-black/20" />
              <div className="h-5 w-1/6 bg-brutal-black/20" />
              <div className="h-5 w-1/6 bg-brutal-black/20" />
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
