const CONFIG = {
  approved:  { label: 'Aprovado',  color: '#34D399', bg: 'rgba(16,185,129,0.10)',  shadow: '0 0 0 0.5px rgba(16,185,129,0.22)'  },
  rejected:  { label: 'Rejeitado', color: '#F87171', bg: 'rgba(239,68,68,0.10)',   shadow: '0 0 0 0.5px rgba(239,68,68,0.22)'   },
  suspicious:{ label: 'Suspeito',  color: '#FCD34D', bg: 'rgba(245,158,11,0.10)',  shadow: '0 0 0 0.5px rgba(245,158,11,0.22)'  },
  pending:   { label: 'Pendente',  color: '#7A8DB5', bg: 'rgba(75,94,138,0.10)',   shadow: '0 0 0 0.5px rgba(75,94,138,0.22)'   },
}

export default function StatusBadge({ status }) {
  const c = CONFIG[status] ?? CONFIG.pending
  return (
    <span
      className="badge"
      style={{ background: c.bg, color: c.color, boxShadow: c.shadow }}
    >
      <span
        className="w-1.5 h-1.5 rounded-full"
        style={{ background: c.color, boxShadow: `0 0 4px ${c.color}80` }}
      />
      {c.label}
    </span>
  )
}
