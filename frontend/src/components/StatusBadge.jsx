const STATUS_CONFIG = {
  approved: { label: 'Aprovado', cls: 'bg-green-900 text-green-300 border border-green-700' },
  rejected: { label: 'Rejeitado', cls: 'bg-red-900 text-red-300 border border-red-700' },
  suspicious: { label: 'Suspeito', cls: 'bg-yellow-900 text-yellow-300 border border-yellow-700' },
  pending: { label: 'Pendente', cls: 'bg-gray-800 text-gray-300 border border-gray-600' },
}

export default function StatusBadge({ status }) {
  const cfg = STATUS_CONFIG[status] || STATUS_CONFIG.pending
  return (
    <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${cfg.cls}`}>
      {cfg.label}
    </span>
  )
}
