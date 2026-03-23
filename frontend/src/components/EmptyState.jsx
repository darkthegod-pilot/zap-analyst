export default function EmptyState({ icon: Icon, title, subtitle, action }) {
  return (
    <div className="flex flex-col items-center justify-center py-20 gap-4 text-center animate-fade-in">
      {Icon && (
        <div className="w-16 h-16 rounded-2xl bg-surface-raised border border-surface-border flex items-center justify-center">
          <Icon size={28} className="text-ink-muted" />
        </div>
      )}
      <div>
        <p className="font-semibold text-ink">{title}</p>
        {subtitle && <p className="text-sm text-ink-secondary mt-1 max-w-xs">{subtitle}</p>}
      </div>
      {action}
    </div>
  )
}
