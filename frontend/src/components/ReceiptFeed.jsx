import { useState, useCallback, useEffect } from 'react'
import { FileX } from 'lucide-react'
import { usePolling }    from '../hooks/usePolling'
import { api }           from '../api'
import { presetToDates } from './DateFilter'
import DateFilter        from './DateFilter'
import Pagination        from './Pagination'
import ReceiptCard       from './ReceiptCard'
import EmptyState        from './EmptyState'
import { SkeletonList }  from './Skeleton'

const STATUS_FILTERS = [
  { value: '',           label: 'Todos'     },
  { value: 'pending',    label: 'Pendentes' },
  { value: 'suspicious', label: 'Suspeitos' },
  { value: 'approved',   label: 'Aprovados' },
  { value: 'rejected',   label: 'Rejeitados'},
]

const TODAY = presetToDates('today')
const PAGE  = 20

export default function ReceiptFeed({ onStatsRefresh }) {
  const [dateFilter,  setDateFilter]  = useState({ preset: 'today', ...TODAY })
  const [statusFilter,setStatusFilter]= useState('')
  const [offset,      setOffset]      = useState(0)
  const [data,        setData]        = useState({ items: [], total: 0 })
  const [loading,     setLoading]     = useState(true)

  const fetchReceipts = useCallback(async () => {
    try {
      const result = await api.getReceipts({
        status:    statusFilter || undefined,
        date_from: dateFilter.date_from,
        date_to:   dateFilter.date_to,
        limit:     PAGE,
        offset,
      })
      setData(result)
    } catch {
      // keep previous data on error
    } finally {
      setLoading(false)
    }
  }, [statusFilter, dateFilter.date_from, dateFilter.date_to, offset])

  // Reset to page 1 when filters change
  useEffect(() => { setOffset(0) }, [statusFilter, dateFilter.date_from, dateFilter.date_to])

  usePolling(fetchReceipts, 6000)

  function handleRefresh() {
    fetchReceipts()
    onStatsRefresh?.()
  }

  function handleDateChange(df) {
    setDateFilter(df)
    setOffset(0)
  }

  return (
    <div className="space-y-4">
      {/* ── Date filter ─────────────────────────────── */}
      <DateFilter
        value={dateFilter.preset}
        customFrom={dateFilter.date_from}
        customTo={dateFilter.date_to}
        onChange={handleDateChange}
      />

      {/* ── Status chips ────────────────────────────── */}
      <div className="flex gap-1.5 flex-wrap">
        {STATUS_FILTERS.map(f => (
          <button
            key={f.value}
            onClick={() => { setStatusFilter(f.value); setOffset(0) }}
            className={statusFilter === f.value ? 'chip-active' : 'chip-default'}
          >
            {f.label}
            {f.value === '' && data.total > 0 && (
              <span className="text-2xs opacity-70">({data.total})</span>
            )}
          </button>
        ))}
      </div>

      {/* ── List ────────────────────────────────────── */}
      {loading ? (
        <SkeletonList count={4} />
      ) : data.items.length === 0 ? (
        <EmptyState
          icon={FileX}
          title="Nenhum comprovante encontrado"
          subtitle={
            dateFilter.preset === 'today'
              ? 'Nenhum comprovante recebido hoje. Tente selecionar outro período.'
              : 'Nenhum comprovante encontrado para os filtros selecionados.'
          }
          action={
            <button
              onClick={() => handleDateChange({ preset: 'all', date_from: null, date_to: null })}
              className="btn-ghost text-xs"
            >
              Ver todos os períodos
            </button>
          }
        />
      ) : (
        <>
          <div className="space-y-3">
            {data.items.map(r => (
              <ReceiptCard key={r.id} receipt={r} onRefresh={handleRefresh} />
            ))}
          </div>
          <Pagination
            total={data.total}
            limit={PAGE}
            offset={offset}
            onChange={setOffset}
          />
        </>
      )}
    </div>
  )
}
