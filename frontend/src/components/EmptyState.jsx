export default function EmptyState({ icon: Icon, title, subtitle, action }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 gap-4 text-center animate-fade-in">
      {Icon && (
        <div
          className="w-14 h-14 rounded-[12px] flex items-center justify-center"
          style={{
            background: 'rgba(var(--accent-rgb),0.05)',
            boxShadow: '0 0 0 0.5px rgba(var(--accent-rgb),0.09)',
          }}
        >
          <Icon size={24} className="text-ink3" />
        </div>
      )}
      <div className="space-y-1">
        <p className="text-[14px] font-semibold text-ink2">{title}</p>
        {subtitle && <p className="text-[12px] text-ink3 max-w-[240px] leading-relaxed">{subtitle}</p>}
      </div>
      {action}
    </div>
  )
}
