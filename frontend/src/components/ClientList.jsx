import { useState, useCallback, useEffect, useRef } from 'react'
import {
  Pencil, Check, X, Users, MessageCircle, UserPlus, Trash2,
  Snowflake, Play, Search, FileText, CheckSquare, Square,
  Loader2,
} from 'lucide-react'
import toast from 'react-hot-toast'
import { usePolling }    from '../hooks/usePolling'
import { api }           from '../api'
import { formatPhone }   from '../utils/format'
import { presetToDates } from './DateFilter'
import DateFilter        from './DateFilter'
import Pagination        from './Pagination'
import EmptyState        from './EmptyState'
import { SkeletonList }  from './Skeleton'
import AddClientModal    from './AddClientModal'
import ClientDetailModal from './ClientDetailModal'

const PAGE  = 50
const TODAY = presetToDates('all')

const STATUS_FILTERS = [
  { v: '',         l: 'Todos'     },
  { v: 'active',   l: 'Ativos'   },
  { v: 'frozen',   l: 'Congelados'},
  { v: 'inactive', l: 'Inativos' },
]

/* ── Deterministic avatar colour ────────────────── */
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
        color:  avatarText(s),
      }}
    >
      {letter}
    </div>
  )
}

export default function ClientList() {
  const [date,         setDate]         = useState({ preset: 'all', ...TODAY })
  const [offset,       setOffset]       = useState(0)
  const [data,         setData]         = useState({ items: [], total: 0 })
  const [loading,      setLoading]      = useState(true)
  const [editingId,    setEditingId]    = useState(null)
  const [editName,     setEditName]     = useState('')
  const [showAdd,      setShowAdd]      = useState(false)
  const [detailClient, setDetailClient] = useState(null)
  const [searchQ,      setSearchQ]      = useState('')
  const [searchInput,  setSearchInput]  = useState('')
  const [actionId,     setActionId]     = useState(null)
  const [statusFilter, setStatusFilter] = useState('')
  const [selected,     setSelected]     = useState(new Set())
  const [bulkLoad,     setBulkLoad]     = useState(null) // 'freeze' | 'unfreeze' | 'delete' | null
  const searchTimer = useRef(null)

  const selectionMode = selected.size > 0

  const load = useCallback(async () => {
    try {
      const r = await api.getClients({
        date_from: date.date_from,
        date_to:   date.date_to,
        q:      searchQ || undefined,
        status: statusFilter || undefined,
        limit:  PAGE,
        offset,
      })
      setData(r)
    } finally {
      setLoading(false)
    }
  }, [date.date_from, date.date_to, searchQ, statusFilter, offset])

  useEffect(() => { setOffset(0); setSelected(new Set()) }, [date.date_from, date.date_to, searchQ, statusFilter])
  useEffect(() => () => clearTimeout(searchTimer.current), [])
  usePolling(load, 8000)

  function handleSearch(val) {
    setSearchInput(val)
    clearTimeout(searchTimer.current)
    searchTimer.current = setTimeout(() => setSearchQ(val), 300)
  }

  function toggleSelect(id) {
    setSelected(prev => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  function selectAllPage() {
    setSelected(new Set(data.items.map(c => c.id)))
  }

  function clearSelection() {
    setSelected(new Set())
  }

  async function runBulk(action) {
    if (action === 'delete') {
      if (!window.confirm(`Excluir ${selected.size} cliente(s)? Esta ação não pode ser desfeita.`)) return
    }
    setBulkLoad(action)
    try {
      await api.bulkClients(Array.from(selected), action)
      const labels = { freeze: 'congelado(s)', unfreeze: 'descongelado(s)', delete: 'excluído(s)', activate: 'ativado(s)' }
      toast.success(`${selected.size} cliente(s) ${labels[action]}`)
      clearSelection()
      load()
    } catch (e) {
      toast.error(e.message)
    } finally {
      setBulkLoad(null)
    }
  }

  async function deleteClient(id, label) {
    if (!window.confirm(`Excluir "${label}"? Esta ação não pode ser desfeita.`)) return
    setActionId(id)
    try {
      await api.deleteClient(id)
      toast(`${label} excluído`, { icon: '🗑️' })
      load()
    } catch (e) { toast.error(e.message) }
    finally { setActionId(null) }
  }

  async function freezeClient(id, label) {
    setActionId(id)
    try {
      await api.freezeClient(id)
      toast(`${label} congelado`, { icon: '❄️' })
      load()
    } catch (e) { toast.error(e.message) }
    finally { setActionId(null) }
  }

  async function activateClient(id, label) {
    setActionId(id)
    try {
      await api.activateClient(id)
      toast.success(`${label} ativado`)
      load()
    } catch (e) { toast.error(e.message) }
    finally { setActionId(null) }
  }

  async function saveName(id) {
    if (!editName.trim()) { setEditingId(null); return }
    try {
      await api.updateClientName(id, editName.trim())
      toast.success('Nome salvo')
      setEditingId(null)
      load()
    } catch (e) { toast.error(e.message) }
  }

  return (
    <div className="space-y-4">
      {/* Header row */}
      <div className="flex items-center justify-between gap-2">
        <h2 className="font-black text-[15px] text-ink">Clientes</h2>
        <button
          onClick={() => setShowAdd(true)}
          className="btn-primary btn-sm shrink-0"
        >
          <UserPlus size={12} />
          Adicionar
        </button>
      </div>

      {/* Date filter */}
      <DateFilter
        value={date.preset}
        customFrom={date.date_from}
        customTo={date.date_to}
        onChange={d => { setDate(d); setOffset(0) }}
      />

      {/* Search */}
      <div className="relative">
        <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-ink4 pointer-events-none" />
        <input
          type="text"
          placeholder="Buscar por nome ou telefone…"
          className="input w-full pl-8 text-[13px]"
          value={searchInput}
          onChange={e => handleSearch(e.target.value)}
        />
      </div>

      {/* Status filter chips */}
      <div className="flex gap-1.5 flex-wrap">
        {STATUS_FILTERS.map(f => (
          <button
            key={f.v}
            onClick={() => setStatusFilter(f.v)}
            className={statusFilter === f.v ? 'chip-active' : 'chip-default'}
          >
            {f.l}
          </button>
        ))}
      </div>

      {/* Tip */}
      <div
        className="rounded-[8px] p-3 flex items-start gap-2.5 text-[12px]"
        style={{
          background: 'rgba(var(--brand-rgb),0.05)',
          boxShadow: '0 0 0 0.5px rgba(var(--brand-rgb),0.15)',
        }}
      >
        <MessageCircle size={13} className="text-brand mt-[1px] shrink-0" />
        <span className="text-ink2">
          Envie{' '}
          <code
            className="font-mono px-1 py-0.5 rounded text-[11px]"
            style={{ background: 'rgba(var(--brand-rgb),0.12)', color: 'var(--brand-hi)' }}
          >
            Comprovante salvo.
          </code>{' '}
          via WhatsApp ou use o botão acima para registrar um cliente.
        </span>
      </div>

      {/* List */}
      {loading ? (
        <SkeletonList count={4} />
      ) : data.items.length === 0 ? (
        <EmptyState
          icon={Users}
          title="Nenhum cliente"
          subtitle={
            date.preset === 'today'
              ? 'Nenhum cliente registrado hoje. Tente "Tudo".'
              : 'Sem clientes no período selecionado.'
          }
          action={
            <button className="btn-ghost btn-sm" onClick={() => setDate({ preset: 'all', date_from: null, date_to: null })}>
              Ver todos
            </button>
          }
        />
      ) : (
        <>
          {/* Select all bar */}
          <div className="flex items-center justify-between text-[12px] text-ink3">
            <span>{data.total} cliente(s)</span>
            <button
              onClick={selectionMode ? clearSelection : selectAllPage}
              className="flex items-center gap-1 text-[11px] font-semibold hover:text-ink2 transition"
            >
              {selectionMode
                ? <><X size={11} /> Cancelar ({selected.size})</>
                : <><CheckSquare size={11} /> Selecionar página</>
              }
            </button>
          </div>

          <div className="space-y-2">
            {data.items.map(c => {
              const isFrozen = c.frozen
              const label = c.name || c.phone
              const isSelected = selected.has(c.id)
              return (
                <div
                  key={c.id}
                  className="rounded-[10px] p-3 flex items-center gap-3 transition-colors duration-150 cursor-pointer active:opacity-80"
                  style={{
                    background: 'var(--panel)',
                    boxShadow: isSelected
                      ? '0 0 0 1.5px rgba(var(--brand-rgb),0.55), 0 2px 6px rgba(0,0,0,0.4)'
                      : isFrozen
                        ? '0 0 0 0.5px rgba(75,94,138,0.25), 0 2px 6px rgba(0,0,0,0.4)'
                        : '0 0 0 0.5px rgba(var(--accent-rgb),0.07), 0 2px 6px rgba(0,0,0,0.4)',
                    opacity: isFrozen && !isSelected ? 0.65 : 1,
                  }}
                  onClick={() => selectionMode ? toggleSelect(c.id) : setDetailClient(c)}
                >
                  {/* Checkbox / Avatar */}
                  {selectionMode ? (
                    <div className="w-10 h-10 flex items-center justify-center shrink-0">
                      {isSelected
                        ? <CheckSquare size={20} className="text-brand" />
                        : <Square size={20} className="text-ink4" />
                      }
                    </div>
                  ) : (
                    <Avatar name={c.name} phone={c.phone} />
                  )}

                  {/* Info */}
                  <div className="flex-1 min-w-0" onClick={e => selectionMode && e.stopPropagation()}>
                    {editingId === c.id ? (
                      <div className="flex items-center gap-1.5 overflow-hidden">
                        <input
                          className="input py-1 text-[12px] flex-1 min-w-0"
                          value={editName}
                          onChange={e => setEditName(e.target.value)}
                          onKeyDown={e => { if (e.key === 'Enter') saveName(c.id); if (e.key === 'Escape') setEditingId(null) }}
                          placeholder="Nome do cliente"
                          autoFocus
                        />
                        <button onClick={() => saveName(c.id)} className="text-ok hover:opacity-75 transition">
                          <Check size={14} />
                        </button>
                        <button onClick={() => setEditingId(null)} className="text-ink3 hover:text-ink2 transition">
                          <X size={14} />
                        </button>
                      </div>
                    ) : (
                      <div className="flex items-center gap-1.5">
                        <p className="text-[13px] font-semibold text-ink truncate">
                          {c.name || c.phone}
                        </p>
                        {!selectionMode && (
                          <button
                            onClick={e => { e.stopPropagation(); setEditingId(c.id); setEditName(c.name || '') }}
                            className="text-ink4 hover:text-ink3 transition shrink-0"
                          >
                            <Pencil size={11} />
                          </button>
                        )}
                        {c.notes && (
                          <FileText size={11} className="text-ink4 shrink-0" title={c.notes} />
                        )}
                      </div>
                    )}
                    <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                      {c.name && (
                        <span className="font-mono text-[11px] text-ink3">{formatPhone(c.phone)}</span>
                      )}
                      {isFrozen ? (
                        <span className="text-[10px] font-semibold flex items-center gap-1" style={{ color: 'var(--idle)' }}>
                          <span className="w-1.5 h-1.5 rounded-full" style={{ background: 'var(--idle)' }} />
                          Congelado
                        </span>
                      ) : (
                        <span
                          className="text-[10px] font-semibold flex items-center gap-1"
                          style={{ color: c.active ? 'var(--brand-hi)' : 'var(--ink3)' }}
                        >
                          <span
                            className="w-1.5 h-1.5 rounded-full"
                            style={{
                              background: c.active ? 'var(--brand)' : 'var(--ink3)',
                              boxShadow: c.active ? '0 0 5px rgba(var(--brand-rgb),0.6)' : 'none',
                            }}
                          />
                          {c.active ? 'Ativo' : 'Inativo'}
                        </span>
                      )}
                    </div>
                    <p className="font-mono text-[10px] text-ink4 mt-0.5">
                      {new Date(c.registered_at + 'Z').toLocaleDateString('pt-BR')}
                    </p>
                  </div>

                  {/* Score + Receipt count */}
                  <div className="text-center shrink-0 space-y-1.5" onClick={e => e.stopPropagation()}>
                    <div className="min-w-[44px]">
                      <p className="font-mono font-black text-[18px] tabular lining text-gradient-brand">
                        {c.receipts_count ?? 0}
                      </p>
                      <p className="text-[9px] text-ink3 uppercase tracking-wide leading-none">comp.</p>
                    </div>
                    <div className="min-w-[44px]">
                      <p
                        className="font-mono font-black text-[14px] tabular lining"
                        style={{
                          color: (c.score ?? 1000) >= 800 ? 'var(--brand)'
                               : (c.score ?? 1000) >= 500 ? '#F59E0B'
                               : '#EF4444'
                        }}
                      >
                        {c.score ?? 1000}
                      </p>
                      <p className="text-[9px] text-ink3 uppercase tracking-wide leading-none">score</p>
                    </div>
                  </div>

                  {/* Action buttons (hidden in selection mode) */}
                  {!selectionMode && (
                    <div className="flex items-center gap-1 shrink-0" onClick={e => e.stopPropagation()}>
                      {isFrozen ? (
                        <button
                          onClick={() => activateClient(c.id, label)}
                          disabled={actionId === c.id}
                          className="text-ink3 hover:text-ok transition p-1 disabled:opacity-40"
                          title="Ativar"
                        >
                          <Play size={14} />
                        </button>
                      ) : (
                        c.active && (
                          <button
                            onClick={() => freezeClient(c.id, label)}
                            disabled={actionId === c.id}
                            className="text-ink4 hover:text-idle transition p-1 disabled:opacity-40"
                            title="Congelar"
                          >
                            <Snowflake size={14} />
                          </button>
                        )
                      )}
                      <button
                        onClick={() => deleteClient(c.id, label)}
                        disabled={actionId === c.id}
                        className="text-ink4 hover:text-danger transition p-1 disabled:opacity-40"
                        title="Excluir"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
          <Pagination total={data.total} limit={PAGE} offset={offset} onChange={o => { setOffset(o); setSelected(new Set()) }} />
        </>
      )}

      {/* ── Floating bulk action bar ─────────────────── */}
      {selectionMode && (
        <div
          className="fixed bottom-20 inset-x-4 md:inset-x-auto md:left-1/2 md:-translate-x-1/2 md:w-[420px] z-50
                     rounded-[14px] p-3 flex items-center gap-2"
          style={{
            background: 'var(--panel)',
            boxShadow: '0 0 0 0.5px rgba(var(--accent-rgb),0.18), 0 8px 32px rgba(0,0,0,0.6)',
          }}
        >
          <span className="text-[12px] font-semibold text-ink flex-1">
            {selected.size} selecionado{selected.size !== 1 ? 's' : ''}
          </span>

          {/* Freeze */}
          <button
            onClick={() => runBulk('freeze')}
            disabled={!!bulkLoad}
            className="btn-sm btn-ghost gap-1.5 disabled:opacity-40"
            title="Congelar selecionados"
          >
            {bulkLoad === 'freeze' ? <Loader2 size={12} className="animate-spin" /> : <Snowflake size={12} />}
            <span className="text-[11px]">Congelar</span>
          </button>

          {/* Unfreeze */}
          <button
            onClick={() => runBulk('unfreeze')}
            disabled={!!bulkLoad}
            className="btn-sm btn-ghost gap-1.5 disabled:opacity-40"
            title="Descongelar selecionados"
            style={{ color: 'var(--brand-hi)' }}
          >
            {bulkLoad === 'unfreeze' ? <Loader2 size={12} className="animate-spin" /> : <Play size={12} />}
            <span className="text-[11px]">Ativar</span>
          </button>

          {/* Delete */}
          <button
            onClick={() => runBulk('delete')}
            disabled={!!bulkLoad}
            className="btn-sm btn-ghost gap-1.5 disabled:opacity-40"
            title="Excluir selecionados"
            style={{ color: '#F87171' }}
          >
            {bulkLoad === 'delete' ? <Loader2 size={12} className="animate-spin" /> : <Trash2 size={12} />}
            <span className="text-[11px]">Excluir</span>
          </button>

          {/* Cancel */}
          <button
            onClick={clearSelection}
            className="btn-sm btn-ghost p-1.5"
            title="Cancelar seleção"
          >
            <X size={14} />
          </button>
        </div>
      )}

      {/* Add client modal */}
      {showAdd && (
        <AddClientModal
          onClose={() => setShowAdd(false)}
          onCreated={() => { load(); setDate({ preset: 'all', date_from: null, date_to: null }) }}
        />
      )}

      {/* Client detail / score modal */}
      {detailClient && !selectionMode && (
        <ClientDetailModal
          client={detailClient}
          onClose={() => setDetailClient(null)}
          onUpdated={load}
        />
      )}
    </div>
  )
}
