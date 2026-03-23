import { useState, useCallback, useEffect } from 'react'
import { AlertTriangle, UserCheck, Trash2, Users } from 'lucide-react'
import toast from 'react-hot-toast'
import { api } from '../api'
import { usePolling } from '../hooks/usePolling'
import { formatPhone } from '../utils/format'
import Pagination from './Pagination'
import EmptyState from './EmptyState'
import { SkeletonList } from './Skeleton'

const PAGE = 20

/* ── Avatar ──────────────────────────────────────── */
function avatarColor(str) {
  let h = 0
  for (let i = 0; i < str.length; i++) h = str.charCodeAt(i) * 47 + (h << 5) - h
  return `hsl(${Math.abs(h) % 360} 55% 18%)`
}
function avatarText(str) {
  let h = 0
  for (let i = 0; i < str.length; i++) h = str.charCodeAt(i) * 47 + (h << 5) - h
  return `hsl(${Math.abs(h) % 360} 70% 60%)`
}
function avatarBdr(str) {
  let h = 0
  for (let i = 0; i < str.length; i++) h = str.charCodeAt(i) * 47 + (h << 5) - h
  return `hsl(${Math.abs(h) % 360} 50% 28%)`
}
function Avatar({ name, phone }) {
  const s = name || phone || '?'
  const letter = s[0].toUpperCase()
  return (
    <div
      className="w-10 h-10 rounded-[9px] flex items-center justify-center font-black text-[14px] shrink-0"
      style={{
        background: avatarColor(s),
        border: `0.5px solid ${avatarBdr(s)}`,
        color: avatarText(s),
      }}
    >
      {letter}
    </div>
  )
}

export default function CalotePage() {
  const [offset,  setOffset]  = useState(0)
  const [data,    setData]    = useState({ items: [], total: 0 })
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    try {
      const r = await api.getCaloteClients({ limit: PAGE, offset })
      setData(r)
    } finally {
      setLoading(false)
    }
  }, [offset])

  usePolling(load, 15000)

  async function handleRemoveCalote(id, label) {
    if (!window.confirm(`Remover "${label}" da lista de calote?`)) return
    try {
      await api.removeCalote(id)
      toast.success(`${label} removido do calote`)
      load()
    } catch (e) {
      toast.error(e.message)
    }
  }

  async function handleDelete(id, label) {
    if (!window.confirm(`Excluir "${label}"? Esta ação não pode ser desfeita.`)) return
    try {
      await api.deleteClient(id)
      toast(`${label} excluído`, { icon: '🗑️' })
      load()
    } catch (e) {
      toast.error(e.message)
    }
  }

  return (
    <div className="space-y-4">

      {/* Warning banner */}
      <div
        className="rounded-[10px] p-3 flex items-start gap-2.5"
        style={{
          background: 'rgba(239,68,68,0.06)',
          boxShadow: '0 0 0 0.5px rgba(239,68,68,0.20)',
        }}
      >
        <AlertTriangle size={14} className="text-danger mt-0.5 shrink-0" />
        <div>
          <p className="text-[12px] font-bold text-ink mb-0.5">Clientes em Calote</p>
          <p className="text-[11px] text-ink3 leading-snug">
            Clientes com <span className="font-semibold text-danger">7 ou mais dias consecutivos</span> sem
            pagamento. São marcados automaticamente às 23:59.
          </p>
        </div>
      </div>

      {/* Count */}
      {!loading && data.total > 0 && (
        <div className="flex items-center gap-2">
          <span
            className="px-2.5 py-1 rounded-full text-[11px] font-bold"
            style={{
              background: 'rgba(239,68,68,0.10)',
              color: '#F87171',
              boxShadow: '0 0 0 0.5px rgba(239,68,68,0.22)',
            }}
          >
            {data.total} {data.total === 1 ? 'cliente' : 'clientes'} em calote
          </span>
        </div>
      )}

      {/* List */}
      {loading ? (
        <SkeletonList count={3} />
      ) : data.items.length === 0 ? (
        <EmptyState
          icon={Users}
          title="Nenhum calote"
          subtitle="Nenhum cliente foi marcado como calote. Ótimo sinal!"
        />
      ) : (
        <>
          <div className="space-y-2">
            {data.items.map(c => {
              const label = c.name || c.phone
              return (
                <div
                  key={c.id}
                  className="rounded-[10px] p-3 flex items-center gap-3"
                  style={{
                    background: '#0D1525',
                    boxShadow: '0 0 0 0.5px rgba(239,68,68,0.18), 0 2px 6px rgba(0,0,0,0.4)',
                  }}
                >
                  <Avatar name={c.name} phone={c.phone} />

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="text-[13px] font-semibold text-ink truncate">
                        {label}
                      </p>
                      <span
                        className="text-[10px] font-bold px-1.5 py-0.5 rounded-full"
                        style={{
                          background: 'rgba(239,68,68,0.12)',
                          color: '#F87171',
                          boxShadow: '0 0 0 0.5px rgba(239,68,68,0.22)',
                        }}
                      >
                        🚨 CALOTE
                      </span>
                    </div>
                    {c.name && (
                      <p className="font-mono text-[11px] text-ink3 mt-0.5">{formatPhone(c.phone)}</p>
                    )}
                    <div className="flex items-center gap-3 mt-1 flex-wrap">
                      <span
                        className="text-[11px] font-semibold"
                        style={{ color: '#F87171' }}
                      >
                        {c.days_overdue} {c.days_overdue === 1 ? 'dia' : 'dias'} em atraso
                      </span>
                      <span
                        className="font-mono text-[11px]"
                        style={{
                          color: (c.score ?? 0) >= 500 ? '#F59E0B' : '#EF4444',
                        }}
                      >
                        Score: {c.score ?? 0}
                      </span>
                    </div>
                  </div>

                  {/* Action buttons */}
                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      onClick={() => handleRemoveCalote(c.id, label)}
                      className="text-ink3 hover:text-ok transition p-1"
                      title="Remover do calote"
                    >
                      <UserCheck size={15} />
                    </button>
                    <button
                      onClick={() => handleDelete(c.id, label)}
                      className="text-ink4 hover:text-danger transition p-1"
                      title="Excluir cliente"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              )
            })}
          </div>
          <Pagination total={data.total} limit={PAGE} offset={offset} onChange={setOffset} />
        </>
      )}
    </div>
  )
}
