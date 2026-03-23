const STATUS = {
  approved:  { label: 'Aprovado',  bg: 'bg-status-approved-bg',   text: 'text-status-approved',   border: 'border-status-approved-border',   dot: 'bg-status-approved'  },
  rejected:  { label: 'Rejeitado', bg: 'bg-status-rejected-bg',   text: 'text-status-rejected',   border: 'border-status-rejected-border',   dot: 'bg-status-rejected'  },
  suspicious:{ label: 'Suspeito',  bg: 'bg-status-suspicious-bg', text: 'text-status-suspicious', border: 'border-status-suspicious-border', dot: 'bg-status-suspicious'},
  pending:   { label: 'Pendente',  bg: 'bg-status-pending-bg',    text: 'text-status-pending',    border: 'border-status-pending-border',    dot: 'bg-status-pending'   },
}

export default function StatusBadge({ status, size = 'sm' }) {
  const cfg = STATUS[status] ?? STATUS.pending
  const textSize = size === 'xs' ? 'text-2xs' : 'text-xs'
  return (
    <span className={`tag ${cfg.bg} ${cfg.text} border ${cfg.border} ${textSize}`}>
      <span className={`inline-block w-1.5 h-1.5 rounded-full ${cfg.dot}`} />
      {cfg.label}
    </span>
  )
}
