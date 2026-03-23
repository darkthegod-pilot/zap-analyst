import { useState } from 'react'
import ReceiptCard from './ReceiptCard'
import { Filter } from 'lucide-react'

const FILTERS = [
  { value: '', label: 'Todos' },
  { value: 'pending', label: 'Pendentes' },
  { value: 'suspicious', label: 'Suspeitos' },
  { value: 'approved', label: 'Aprovados' },
  { value: 'rejected', label: 'Rejeitados' },
]

export default function ReceiptFeed({ receipts, onRefresh }) {
  const [filter, setFilter] = useState('')

  const filtered = filter ? receipts.filter((r) => r.status === filter) : receipts

  return (
    <div>
      {/* Filter bar */}
      <div className="flex items-center gap-2 mb-4 flex-wrap">
        <Filter size={15} className="text-gray-500" />
        {FILTERS.map((f) => (
          <button
            key={f.value}
            onClick={() => setFilter(f.value)}
            className={`px-3 py-1 rounded-full text-xs font-medium transition ${
              filter === f.value
                ? 'bg-brand-600 text-white'
                : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      {/* List */}
      {filtered.length === 0 ? (
        <div className="text-center py-16 text-gray-600">
          <p className="text-lg">Nenhum comprovante encontrado</p>
          <p className="text-sm mt-1">Aguardando recebimento via WhatsApp…</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((r) => (
            <ReceiptCard key={r.id} receipt={r} onRefresh={onRefresh} />
          ))}
        </div>
      )}
    </div>
  )
}
