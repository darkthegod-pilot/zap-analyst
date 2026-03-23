import { useState, useCallback, useEffect } from 'react'
import { UserX, Pencil, Check, X, Users, MessageCircle } from 'lucide-react'
import toast from 'react-hot-toast'
import { usePolling }    from '../hooks/usePolling'
import { api }           from '../api'
import { presetToDates } from './DateFilter'
import DateFilter        from './DateFilter'
import Pagination        from './Pagination'
import EmptyState        from './EmptyState'
import { SkeletonList }  from './Skeleton'

const TODAY = presetToDates('today')
const PAGE  = 20

/* Avatar with generated color from phone */
function Avatar({ name, phone }) {
  const str    = name || phone || '?'
  const letter = str[0].toUpperCase()
  const hue    = (str.charCodeAt(0) * 47 + str.charCodeAt(1) * 13) % 360
  return (
    <div
      className="w-11 h-11 rounded-xl flex items-center justify-center font-black text-base shrink-0"
      style={{
        background: `hsl(${hue} 60% 20%)`,
        border:     `1px solid hsl(${hue} 50% 30%)`,
        color:      `hsl(${hue} 80% 65%)`,
      }}
    >
      {letter}
    </div>
  )
}

export default function ClientList() {
  const [dateFilter, setDateFilter] = useState({ preset: 'today', ...TODAY })
  const [offset,     setOffset]     = useState(0)
  const [data,       setData]       = useState({ items: [], total: 0 })
  const [loading,    setLoading]    = useState(true)
  const [editingId,  setEditingId]  = useState(null)
  const [editName,   setEditName]   = useState('')

  const fetchClients = useCallback(async () => {
    try {
      const result = await api.getClients({
        date_from: dateFilter.date_from,
        date_to:   dateFilter.date_to,
        limit:     PAGE,
        offset,
      })
      setData(result)
    } catch {
      // keep previous
    } finally {
      setLoading(false)
    }
  }, [dateFilter.date_from, dateFilter.date_to, offset])

  useEffect(() => { setOffset(0) }, [dateFilter.date_from, dateFilter.date_to])

  usePolling(fetchClients, 8000)

  async function handleDeactivate(id, phone) {
    try {
      await api.deactivateClient(id)
      toast(`${phone} desativado`, { icon: '🔕' })
      fetchClients()
    } catch (e) {
      toast.error(e.message)
    }
  }

  async function handleSaveName(id) {
    if (!editName.trim()) { setEditingId(null); return }
    try {
      await api.updateClientName(id, editName.trim())
      toast.success('Nome atualizado')
      setEditingId(null)
      fetchClients()
    } catch (e) {
      toast.error(e.message)
    }
  }

  return (
    <div className="space-y-4">
      {/* ── Date filter (by registration date) ────── */}
      <DateFilter
        value={dateFilter.preset}
        customFrom={dateFilter.date_from}
        customTo={dateFilter.date_to}
        onChange={(df) => { setDateFilter(df); setOffset(0) }}
      />

      {/* ── Hint ─────────────────────────────────── */}
      <div className="bg-brand-glow border border-brand/20 rounded-xl p-3 flex items-start gap-2.5 text-xs">
        <MessageCircle size={14} className="text-brand mt-0.5 shrink-0" />
        <span className="text-ink-secondary">
          Para adicionar um cliente, envie{' '}
          <code className="font-mono text-brand bg-brand-dim px-1 py-0.5 rounded text-xs">
            Comprovante salvo.
          </code>{' '}
          para o número via WhatsApp na instância ZAPI.
        </span>
      </div>

      {/* ── List ─────────────────────────────────── */}
      {loading ? (
        <SkeletonList count={5} />
      ) : data.items.length === 0 ? (
        <EmptyState
          icon={Users}
          title="Nenhum cliente encontrado"
          subtitle={
            dateFilter.preset === 'today'
              ? 'Nenhum cliente registrado hoje. Tente "Tudo" para ver todos.'
              : 'Nenhum cliente no período selecionado.'
          }
          action={
            <button
              onClick={() => setDateFilter({ preset: 'all', date_from: null, date_to: null })}
              className="btn-ghost text-xs"
            >
              Ver todos os períodos
            </button>
          }
        />
      ) : (
        <>
          <div className="space-y-2">
            {data.items.map((c) => (
              <div
                key={c.id}
                className="card p-4 flex items-center gap-3 transition-all duration-200 hover:bg-surface-hover"
              >
                {/* Avatar */}
                <Avatar name={c.name} phone={c.phone} />

                {/* Info */}
                <div className="flex-1 min-w-0">
                  {editingId === c.id ? (
                    <div className="flex items-center gap-2">
                      <input
                        className="input py-1 text-sm max-w-[160px]"
                        value={editName}
                        onChange={e => setEditName(e.target.value)}
                        onKeyDown={e => {
                          if (e.key === 'Enter') handleSaveName(c.id)
                          if (e.key === 'Escape') setEditingId(null)
                        }}
                        autoFocus
                        placeholder="Nome do cliente"
                      />
                      <button onClick={() => handleSaveName(c.id)} className="text-status-approved hover:opacity-80 transition">
                        <Check size={15} />
                      </button>
                      <button onClick={() => setEditingId(null)} className="text-ink-muted hover:text-ink transition">
                        <X size={15} />
                      </button>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2">
                      <p className="font-semibold text-sm text-ink truncate">
                        {c.name || c.phone}
                      </p>
                      <button
                        onClick={() => { setEditingId(c.id); setEditName(c.name || '') }}
                        className="text-ink-muted hover:text-ink transition shrink-0"
                        aria-label="Editar nome"
                      >
                        <Pencil size={12} />
                      </button>
                    </div>
                  )}
                  <div className="flex items-center gap-2 mt-0.5">
                    {c.name && <p className="text-xs text-ink-muted font-mono">{c.phone}</p>}
                    <span className={`inline-flex items-center gap-1 text-2xs font-semibold ${
                      c.active ? 'text-status-approved' : 'text-ink-muted'
                    }`}>
                      <span className={`w-1.5 h-1.5 rounded-full ${c.active ? 'bg-status-approved' : 'bg-ink-muted'}`} />
                      {c.active ? 'Monitorado' : 'Inativo'}
                    </span>
                  </div>
                  <p className="text-2xs text-ink-muted mt-0.5">
                    Registrado em{' '}
                    {new Date(c.registered_at + 'Z').toLocaleDateString('pt-BR', {
                      day: '2-digit', month: '2-digit', year: 'numeric'
                    })}
                  </p>
                </div>

                {/* Receipts count */}
                <div className="text-center shrink-0 min-w-[48px]">
                  <p className="text-xl font-black text-gradient-brand tabular-nums">
                    {c.receipts_count ?? 0}
                  </p>
                  <p className="text-2xs text-ink-muted leading-none">comprov.</p>
                </div>

                {/* Deactivate */}
                {c.active && (
                  <button
                    onClick={() => handleDeactivate(c.id, c.name || c.phone)}
                    className="shrink-0 text-ink-muted hover:text-status-rejected transition p-1"
                    title="Desativar monitoramento"
                    aria-label="Desativar"
                  >
                    <UserX size={17} />
                  </button>
                )}
              </div>
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
