import { useState, useCallback, useEffect } from 'react'
import { FileStack } from 'lucide-react'
import { usePolling }    from '../hooks/usePolling'
import { api }           from '../api'
import { presetToDates } from './DateFilter'
import DateFilter        from './DateFilter'
import Pagination        from './Pagination'
import ReceiptCard       from './ReceiptCard'
import EmptyState        from './EmptyState'
import { SkeletonList }  from './Skeleton'

const STATUS = [
  { v: '',            l: 'Todos'     },
  { v: 'pending',     l: 'Pendentes' },
  { v: 'suspicious',  l: 'Suspeitos' },
  { v: 'approved',    l: 'Aprovados' },
  { v: 'rejected',    l: 'Rejeitados'},
]

const PAGE = 20
const TODAY = presetToDates('today')

export default function ReceiptFeed({ onRefreshStats }) {
  const [date,    setDate]    = useState({ preset: 'today', ...TODAY })
  const [status,  setStatus]  = useState('')
  const [offset,  setOffset]  = useState(0)
  const [data,    setData]    = useState({ items: [], total: 0 })
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    try {
      const r = await api.getReceipts({
        status:    status || undefined,
        date_from: date.date_from,
        date_to:   date.date_to,
        limit: PAGE, offset,
      })
      setData(r)
    } finally {
      setLoading(false)
    }
  }, [status, date.date_from, date.date_to, offset])

  useEffect(() => { setOffset(0) }, [status, date.date_from, date.date_to])
  usePolling(load, 6000)

  function refresh() { load(); onRefreshStats?.() }

  return (
    <div className="space-y-4">
      {/* Date filter */}
      <DateFilter
        value={date.preset}
        customFrom={date.date_from}
        customTo={date.date_to}
        onChange={d => { setDate(d); setOffset(0) }}
      />

      {/* Status filter */}
      <div className="flex gap-1.5 overflow-x-auto pb-0.5" style={{ scrollbarWidth: 'none' }}>
        {STATUS.map(f => (
          <button
            key={f.v}
            onClick={() => { setStatus(f.v); setOffset(0) }}
            className={status === f.v ? 'chip-active' : 'chip-default'}
          >
            {f.l}
            {f.v === '' && data.total > 0 && (
              <span className="font-mono text-[10px] opacity-50">({data.total})</span>
            )}
          </button>
        ))}
      </div>

      {/* Content */}
      {loading ? (
        <SkeletonList count={4} />
      ) : data.items.length === 0 ? (
        <EmptyState
          icon={FileStack}
          title="Nenhum comprovante"
          subtitle={
            date.preset === 'today'
              ? 'Nenhum comprovante recebido hoje. Tente outro período.'
              : 'Sem resultados para os filtros selecionados.'
          }
          action={
            <button className="btn-ghost btn-sm" onClick={() => setDate({ preset: 'all', date_from: null, date_to: null })}>
              Ver todos
            </button>
          }
        />
      ) : (
        <>
          <div className="space-y-3">
            {data.items.map(r => (
              <ReceiptCard key={r.id} receipt={r} onRefresh={refresh} />
            ))}
          </div>
          <Pagination total={data.total} limit={PAGE} offset={offset} onChange={setOffset} />
        </>
      )}
    </div>
  )
}
