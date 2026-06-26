export function LoadingSkeleton({ rows = 3 }) {
  return (
    <div className="space-y-3">
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="card animate-pulse">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full skeleton" />
            <div className="flex-1 space-y-2">
              <div className="h-4 skeleton rounded w-3/4" />
              <div className="h-3 skeleton rounded w-1/2" />
            </div>
            <div className="h-6 w-16 skeleton rounded-full" />
          </div>
        </div>
      ))}
    </div>
  )
}

export function SkeletonCard() {
  return (
    <div className="card animate-pulse space-y-3">
      <div className="h-5 skeleton rounded w-1/2" />
      <div className="h-4 skeleton rounded w-full" />
      <div className="h-4 skeleton rounded w-4/5" />
    </div>
  )
}
