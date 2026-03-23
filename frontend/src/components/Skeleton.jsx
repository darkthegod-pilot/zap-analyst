export function SkeletonCard() {
  return (
    <div className="card p-4 space-y-3 animate-pulse">
      <div className="flex items-center gap-3">
        <div className="w-14 h-14 rounded-xl bg-surface-raised" />
        <div className="flex-1 space-y-2">
          <div className="h-3 bg-surface-raised rounded w-1/3" />
          <div className="h-4 bg-surface-raised rounded w-1/2" />
          <div className="h-3 bg-surface-raised rounded w-1/4" />
        </div>
        <div className="w-20 space-y-2">
          <div className="h-3 bg-surface-raised rounded" />
          <div className="h-2 bg-surface-raised rounded" />
        </div>
      </div>
    </div>
  )
}

export function SkeletonList({ count = 5 }) {
  return (
    <div className="space-y-3">
      {Array.from({ length: count }).map((_, i) => (
        <SkeletonCard key={i} />
      ))}
    </div>
  )
}
