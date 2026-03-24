function SkeletonBlock({ w, h, rounded }) {
  return (
    <div
      className="skeleton"
      style={{ width: w, height: h, borderRadius: rounded ?? 6 }}
    />
  )
}

export function SkeletonCard() {
  return (
    <div
      className="rounded-[10px] p-3 flex items-center gap-3"
      style={{
        background: 'var(--panel)',
        boxShadow: '0 0 0 0.5px rgba(var(--accent-rgb),0.07), 0 2px 6px rgba(0,0,0,0.4)',
      }}
    >
      <SkeletonBlock w={52} h={52} rounded={7} />
      <div className="flex-1 space-y-2">
        <SkeletonBlock w="45%" h={12} />
        <SkeletonBlock w="30%" h={14} />
        <SkeletonBlock w="55%" h={10} />
      </div>
      <SkeletonBlock w={44} h={44} rounded={22} />
    </div>
  )
}

export function SkeletonList({ count = 4 }) {
  return (
    <div className="space-y-3">
      {Array.from({ length: count }).map((_, i) => (
        <SkeletonCard key={i} />
      ))}
    </div>
  )
}
