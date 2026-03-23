import { useState, useCallback, useEffect } from 'react'
import { FileStack, CheckCircle, XCircle, X, Loader2 } from 'lucide-react'
import toast from 'react-hot-toast'
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
  const [date,     setDate]     = useState({ preset: 'today', ...TODAY })
  const [status,   setStatus]   = useState('')
  const [offset,   setOffset]   = useState(0)
  const [data,     setData]     = useState({ items: [], total: 0 })
  const [loading,  setLoading]  = useState(true)
  const [selected, setSelected] = useState(new Set())
  const [bulkLoad, setBulkLoad] = useState(null) // 'approve' | 'reject' | null

  const selectionMode = selected.size > 0

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

  function toggle(id) {
    setSelected(prev => {
      const s = new Set(prev)
      s.has(id) ? s.delete(id) : s.add(id)
      return s
    })
  }

  function clearSelection() {
    setSelected(new Set())
  }

  async function bulkAction(action) {
    if (selected.size === 0) return
    setBulkLoad(action)
    try {
      await api.bulkAction(Array.from(selected), action)
      toast.success(
        action === 'approve'
          ? `${selected.size} comprovante(s) aprovado(s)`
          : `${selected.size} comprovante(s) rejeitado(s)`
      )
      clearSelection()
      refresh()
    } catch (e) {
      toast.error(e.message)
    } finally {
      setBulkLoad(null)
    }
  }

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
              <ReceiptCard
                key={r.id}
                receipt={r}
                onRefresh={refresh}
                selected={selected.has(r.id)}
                onToggle={() => toggle(r.id)}
                bulkMode={selectionMode}
              />
            ))}
          </div>

          <Pagination total={data.total} limit={PAGE} offset={offset} onChange={setOffset} />
        </>
      )}

      {/* Bulk action bar — floats above bottom nav */}
      {selectionMode && (
        <div
          className="fixed left-0 right-0 z-40 flex items-center gap-2 px-4 py-3"
          style={{
            bottom: 64, // above bottom nav (h-16 = 64px)
            background: '#121D35',
            boxShadow: '0 -1px 0 rgba(100,150,255,0.10), 0 -8px 24px rgba(0,0,0,0.5)',
          }}
        >
          <span className="font-mono text-[12px] font-bold text-brand flex-1">
            {selected.size} selecionado{selected.size !== 1 ? 's' : ''}
          </span>
          <button
            onClick={() => bulkAction('approve')}
            disabled={!!bulkLoad}
            className="btn-ok btn-sm"
          >
            {bulkLoad === 'approve'
              ? <Loader2 size={12} className="animate-spin" />
              : <CheckCircle size={12} />}
            Aprovar
          </button>
          <button
            onClick={() => bulkAction('reject')}
            disabled={!!bulkLoad}
            className="btn-danger btn-sm"
          >
            {bulkLoad === 'reject'
              ? <Loader2 size={12} className="animate-spin" />
              : <XCircle size={12} />}
            Rejeitar
          </button>
          <button
            onClick={clearSelection}
            className="btn-ghost btn-sm shrink-0 px-2"
            disabled={!!bulkLoad}
          >
            <X size={14} />
          </button>
        </div>
      )}
    </div>
  )
}
