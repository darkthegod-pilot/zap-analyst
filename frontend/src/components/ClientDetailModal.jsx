import { useState, useEffect } from 'react'
import {
  X, Flame, TrendingUp, FileText, Pencil, Check, DollarSign,
  Clock, CheckCircle, XCircle, AlertTriangle, CreditCard, Receipt,
} from 'lucide-react'
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts'
import toast from 'react-hot-toast'
import { api } from '../api'
import { formatPhone } from '../utils/format'

/* ─── Score Arc ─────────────────────────────────── */
function ScoreArc({ score }) {
  const pct    = Math.round((score / 1000) * 100)
  const radius = 36
  const stroke = 4
  const circ   = 2 * Math.PI * radius
  const gap    = circ * 0.22
  const arc    = circ - gap
  const fill   = (pct / 100) * arc
  const color  = score >= 800 ? 'var(--brand)' : score >= 500 ? '#F59E0B' : '#EF4444'
  const glow   = score >= 800 ? 'rgba(var(--brand-rgb),0.5)' : score >= 500 ? 'rgba(245,158,11,0.5)' : 'rgba(239,68,68,0.5)'
  const size   = (radius + stroke) * 2 + 4
  const rotate = 90 + (360 * 0.11)
  return (
    <div className="relative flex items-center justify-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} style={{ transform: `rotate(${rotate}deg)` }}>
        <circle cx={size/2} cy={size/2} r={radius} fill="none"
          stroke="rgba(var(--accent-rgb),0.07)" strokeWidth={stroke}
          strokeDasharray={`${arc} ${circ - arc}`} strokeLinecap="round" />
        <circle cx={size/2} cy={size/2} r={radius} fill="none"
          stroke={color} strokeWidth={stroke}
          strokeDasharray={`${fill} ${circ - fill}`} strokeLinecap="round"
          style={{ filter: `drop-shadow(0 0 8px ${glow})`, transition: 'stroke-dasharray 0.8s cubic-bezier(0.34,1.56,0.64,1)' }} />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center gap-0.5">
        <span className="font-mono font-black tabular lining leading-none" style={{ fontSize: 22, color }}>{score}</span>
        <span className="font-mono text-ink3 leading-none" style={{ fontSize: 9 }}>/ 1000</span>
      </div>
    </div>
  )
}

/* ─── Day cell ───────────────────────────────────── */
const STATUS_COLORS = {
  paid_early:   { bg: 'rgba(var(--brand-rgb),0.30)', glow: '0 0 8px rgba(var(--brand-rgb),0.6)', label: '⚡' },
  paid_on_time: { bg: 'rgba(var(--brand-rgb),0.20)', glow: '0 0 6px rgba(var(--brand-rgb),0.5)', label: '✅' },
  paid_normal:  { bg: 'rgba(75,184,130,0.14)', glow: '0 0 4px rgba(75,184,130,0.3)', label: '🟡' },
  paid_late:    { bg: 'rgba(245,158,11,0.20)',  glow: '0 0 6px rgba(245,158,11,0.4)', label: '⏰' },
  missed:       { bg: 'rgba(239,68,68,0.20)',   glow: '0 0 4px rgba(239,68,68,0.3)',  label: '❌' },
  sunday:       { bg: 'rgba(30,45,79,0.5)',     glow: 'none',                          label: '' },
  future:       { bg: 'rgba(18,29,53,0.6)',     glow: 'none',                          label: '' },
  unknown:      { bg: 'rgba(30,45,79,0.3)',     glow: 'none',                          label: '' },
}

function DayCell({ item }) {
  const cfg = STATUS_COLORS[item.status] || STATUS_COLORS.unknown
  const d   = new Date(item.date + 'T12:00:00')
  const day = d.getDate()
  return (
    <div
      className="flex flex-col items-center justify-center rounded-[6px] aspect-square"
      style={{ background: cfg.bg, boxShadow: cfg.glow !== 'none' ? cfg.glow : undefined, minWidth: 0 }}
      title={item.date}
    >
      <span className="font-mono text-[10px] text-ink3 leading-none">{day}</span>
      {cfg.label && <span style={{ fontSize: 9, lineHeight: 1.2 }}>{cfg.label}</span>}
    </div>
  )
}

/* ─── Score history ──────────────────────────────── */
const SCORE_BONUS = {
  paid_early: 40, paid_on_time: 30, paid_normal: 5,
  paid_late: -50, missed: -50,
}

function buildScoreSeries(history, currentScore) {
  if (!history.length) return []
  let s = currentScore
  const points = []
  for (let i = history.length - 1; i >= 0; i--) {
    const item = history[i]
    if (!['sunday', 'future', 'unknown'].includes(item.status)) {
      points.unshift({ date: item.date.slice(5), score: Math.max(0, Math.min(1000, s)) })
      const delta = SCORE_BONUS[item.status] ?? 0
      s = Math.max(0, Math.min(1000, s - delta))
    }
  }
  return points
}

function ScoreTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null
  const score = payload[0]?.value
  return (
    <div className="rounded-[6px] px-2 py-1.5 text-[11px]"
      style={{ background: 'var(--raised)', boxShadow: '0 0 0 0.5px rgba(var(--accent-rgb),0.15)', color: 'var(--ink)' }}>
      <p className="text-ink3 mb-0.5">{label}</p>
      <p className="font-mono font-bold" style={{ color: score >= 800 ? 'var(--brand)' : score >= 500 ? '#F59E0B' : '#EF4444' }}>{score}</p>
    </div>
  )
}

/* ─── BRL formatter ──────────────────────────────── */
const fmtBRL = v => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v ?? 0)

/* ─── Timeline receipt icon ─────────────────────── */
function statusIcon(status, isDuplicate) {
  if (isDuplicate) return { icon: '🔁', color: '#F87171' }
  switch (status) {
    case 'approved':   return { icon: '✅', color: 'var(--brand-hi)' }
    case 'rejected':   return { icon: '❌', color: '#F87171' }
    case 'suspicious': return { icon: '⚠️', color: '#FCD34D' }
    default:           return { icon: '⏳', color: 'var(--ink2)' }
  }
}

/* ─── MAIN ───────────────────────────────────────── */
export default function ClientDetailModal({ client, onClose, onUpdated }) {
  const [scoreData,    setScoreData]    = useState(null)
  const [financials,   setFinancials]   = useState(null)
  const [loading,      setLoading]      = useState(true)
  const [editingNote,  setEditingNote]  = useState(false)
  const [noteText,     setNoteText]     = useState(client.notes || '')
  const [localNotes,   setLocalNotes]   = useState(client.notes || '')
  const [savingNote,   setSavingNote]   = useState(false)

  useEffect(() => {
    Promise.all([
      api.getClientScore(client.id).catch(() => null),
      api.getClientReceiptsSummary(client.id).catch(() => null),
    ]).then(([score, fin]) => {
      setScoreData(score)
      setFinancials(fin)
    }).finally(() => setLoading(false))
  }, [client.id])

  async function saveNote() {
    setSavingNote(true)
    try {
      await api.updateClientNotes(client.id, noteText)
      toast.success('Anotação salva')
      setLocalNotes(noteText)
      setEditingNote(false)
      onUpdated?.()
    } catch (e) {
      toast.error(e.message)
    } finally {
      setSavingNote(false)
    }
  }

  useEffect(() => {
    function onKey(e) { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [onClose])

  const score   = scoreData?.score  ?? client.score  ?? 1000
  const streak  = scoreData?.streak ?? client.streak ?? 0
  const history = scoreData?.history ?? []
  const scoreSeries = buildScoreSeries(history, score)

  const onTime = history.filter(d => ['paid_early','paid_on_time','paid_normal'].includes(d.status)).length
  const late   = history.filter(d => d.status === 'paid_late').length
  const missed = history.filter(d => d.status === 'missed').length

  const scoreLabel = score >= 800 ? 'Excelente' : score >= 600 ? 'Bom' : score >= 400 ? 'Regular' : 'Crítico'
  const scoreColor = score >= 800 ? 'var(--brand)' : score >= 600 ? 'var(--brand-hi)' : score >= 400 ? '#F59E0B' : '#EF4444'

  /* Risk badge config */
  const riskCfg = score >= 800
    ? { label: 'Baixo risco',  bg: 'rgba(var(--brand-rgb),0.12)', color: 'var(--brand-hi)', border: 'rgba(var(--brand-rgb),0.30)' }
    : score >= 600
    ? { label: 'Risco médio',  bg: 'rgba(75,94,138,0.12)',  color: 'var(--ink2)', border: 'rgba(75,94,138,0.30)'  }
    : score >= 400
    ? { label: 'Risco alto',   bg: 'rgba(245,158,11,0.12)', color: '#FCD34D', border: 'rgba(245,158,11,0.30)' }
    : { label: 'Risco crítico',bg: 'rgba(239,68,68,0.12)',  color: '#F87171', border: 'rgba(239,68,68,0.30)'  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center"
      style={{ background: 'rgba(0,0,0,0.75)' }}
      onClick={onClose}
    >
      <div
        className="w-full sm:max-w-md max-h-[92vh] overflow-y-auto rounded-t-[16px] sm:rounded-[16px]"
        style={{ background: 'var(--panel)', boxShadow: '0 0 0 0.5px rgba(var(--accent-rgb),0.10), 0 -8px 40px rgba(0,0,0,0.6)' }}
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 sticky top-0 z-10"
          style={{ background: 'var(--panel)', borderBottom: '0.5px solid rgba(var(--accent-rgb),0.07)' }}>
          <div className="min-w-0">
            <p className="text-[14px] font-bold text-ink truncate">{client.name || client.phone}</p>
            {client.name && <p className="font-mono text-[11px] text-ink3">{formatPhone(client.phone)}</p>}
          </div>
          <div className="flex items-center gap-2 shrink-0">
            {/* Risk badge */}
            <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full"
              style={{ background: riskCfg.bg, color: riskCfg.color, boxShadow: `0 0 0 0.5px ${riskCfg.border}` }}>
              {riskCfg.label}
            </span>
            <button onClick={onClose} className="text-ink4 hover:text-ink3 transition p-1">
              <X size={18} />
            </button>
          </div>
        </div>

        <div className="p-4 space-y-5">

          {/* Score + streak */}
          <div className="flex items-center gap-6">
            {loading ? (
              <div className="w-[80px] h-[80px] rounded-full animate-pulse"
                style={{ background: 'rgba(var(--accent-rgb),0.07)' }} />
            ) : (
              <ScoreArc score={score} />
            )}
            <div className="space-y-2">
              <div>
                <p className="label">Score de Pontualidade</p>
                <p className="text-[18px] font-black" style={{ color: scoreColor }}>{scoreLabel}</p>
              </div>
              <div className="flex items-center gap-1.5">
                <Flame size={14} style={{ color: streak > 0 ? '#F59E0B' : 'var(--ink3)' }} />
                <p className="text-[13px] font-bold text-ink">
                  {streak > 0 ? `${streak} dia${streak !== 1 ? 's' : ''} seguido${streak !== 1 ? 's' : ''}` : 'Sem sequência'}
                </p>
              </div>
            </div>
          </div>

          {/* Financial row */}
          <div className="rounded-[10px] p-3 space-y-2"
            style={{ background: 'rgba(var(--brand-rgb),0.05)', boxShadow: '0 0 0 0.5px rgba(var(--brand-rgb),0.15)' }}>
            <p className="section-title flex items-center gap-1.5">
              <DollarSign size={11} style={{ color: 'var(--brand-hi)' }} /> Financeiro
            </p>
            {loading ? (
              <div className="grid grid-cols-3 gap-2">
                {[0,1,2].map(i => <div key={i} className="skeleton h-12 rounded-[6px]" />)}
              </div>
            ) : (
              <div className="grid grid-cols-3 gap-2">
                {[
                  { label: 'Total recebido', value: fmtBRL(financials?.total_amount ?? 0), color: 'var(--brand-hi)' },
                  { label: 'Lucro líquido',  value: fmtBRL(financials?.profit ?? 0),       color: 'var(--brand)' },
                  { label: 'Ticket médio',   value: fmtBRL(financials?.avg_ticket ?? 0),   color: 'var(--ink2)' },
                ].map(s => (
                  <div key={s.label} className="rounded-[8px] p-2 text-center"
                    style={{ background: 'rgba(var(--accent-rgb),0.04)', boxShadow: '0 0 0 0.5px rgba(var(--accent-rgb),0.07)' }}>
                    <p className="font-mono font-black text-[11px] leading-tight" style={{ color: s.color }}>
                      {s.value}
                    </p>
                    <p className="text-[9px] text-ink3 uppercase tracking-wide mt-0.5">{s.label}</p>
                  </div>
                ))}
              </div>
            )}
            {financials && (
              <p className="text-[10px] text-ink4 text-right">
                {financials.payment_count} pagamento{financials.payment_count !== 1 ? 's' : ''} aprovado{financials.payment_count !== 1 ? 's' : ''}
              </p>
            )}
          </div>

          {/* Stats row */}
          {!loading && history.length > 0 && (
            <div className="grid grid-cols-3 gap-2">
              {[
                { label: 'No prazo', value: onTime, color: 'var(--brand)' },
                { label: 'Em atraso', value: late,   color: '#F59E0B' },
                { label: 'Faltou',   value: missed,  color: '#EF4444' },
              ].map(s => (
                <div key={s.label} className="rounded-[8px] p-2.5 text-center"
                  style={{ background: 'rgba(var(--accent-rgb),0.04)', boxShadow: '0 0 0 0.5px rgba(var(--accent-rgb),0.07)' }}>
                  <p className="font-mono font-black text-[18px]" style={{ color: s.color }}>{s.value}</p>
                  <p className="text-[9px] text-ink3 uppercase tracking-wide mt-0.5">{s.label}</p>
                </div>
              ))}
            </div>
          )}

          {/* Payment timeline */}
          {!loading && financials?.receipts?.length > 0 && (
            <div className="space-y-2">
              <p className="section-title flex items-center gap-1.5">
                <Receipt size={11} /> Últimos comprovantes
              </p>
              <div className="rounded-[10px] overflow-hidden"
                style={{ boxShadow: '0 0 0 0.5px rgba(var(--accent-rgb),0.07)' }}>
                {financials.receipts.map((r, i) => {
                  const { icon, color } = statusIcon(r.status, r.is_duplicate)
                  const dt = new Date(r.received_at + 'Z')
                  const dateStr = dt.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })
                  const timeStr = dt.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
                  return (
                    <div key={r.id}
                      className="flex items-center gap-3 px-3 py-2.5"
                      style={{
                        background: i % 2 === 0 ? 'rgba(var(--accent-rgb),0.03)' : 'transparent',
                        borderBottom: i < financials.receipts.length - 1 ? '0.5px solid rgba(var(--accent-rgb),0.06)' : 'none',
                      }}>
                      <span style={{ fontSize: 14, lineHeight: 1 }}>{icon}</span>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-[11px] text-ink2 font-semibold">
                            {dateStr} {timeStr}
                          </span>
                          {r.bank_name && (
                            <span className="text-[10px] text-ink3 truncate">{r.bank_name}</span>
                          )}
                        </div>
                      </div>
                      <div className="shrink-0 text-right">
                        {r.amount ? (
                          <span className="font-mono font-bold text-[12px]" style={{ color }}>
                            {r.amount}
                          </span>
                        ) : (
                          <span className="text-[11px]" style={{ color }}>
                            {r.status === 'rejected' ? 'Rejeitado' : r.status === 'suspicious' ? 'Suspeito' : 'Pendente'}
                          </span>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          {/* 30-day calendar */}
          <div className="space-y-2">
            <p className="section-title flex items-center gap-1.5">
              <TrendingUp size={11} /> Histórico 30 dias
            </p>
            {loading ? (
              <div className="grid grid-cols-7 gap-1">
                {Array.from({ length: 30 }).map((_, i) => (
                  <div key={i} className="skeleton aspect-square rounded-[6px]" />
                ))}
              </div>
            ) : history.length === 0 ? (
              <p className="text-[12px] text-ink3">Sem histórico disponível.</p>
            ) : (
              <>
                <div className="grid grid-cols-7 gap-1 mb-0.5">
                  {['D', 'S', 'T', 'Q', 'Q', 'S', 'S'].map((d, i) => (
                    <p key={i} className="text-center font-mono text-[9px] text-ink4 uppercase">{d}</p>
                  ))}
                </div>
                {(() => {
                  const firstDate = new Date(history[0].date + 'T12:00:00')
                  const startDow  = firstDate.getDay()
                  const padded    = [
                    ...Array.from({ length: startDow }).map((_, i) => ({ date: `pad-${i}`, status: 'pad' })),
                    ...history,
                  ]
                  return (
                    <div className="grid grid-cols-7 gap-1">
                      {padded.map((item, i) =>
                        item.status === 'pad'
                          ? <div key={`pad-${i}`} />
                          : <DayCell key={item.date} item={item} />
                      )}
                    </div>
                  )
                })()}
                <div className="flex flex-wrap gap-3 pt-1">
                  {[
                    { status: 'paid_early',   label: 'Antes 12h' },
                    { status: 'paid_on_time', label: '12h–16h'   },
                    { status: 'paid_normal',  label: '16h+'      },
                    { status: 'paid_late',    label: 'Atrasado'  },
                    { status: 'missed',       label: 'Faltou'    },
                  ].map(l => (
                    <div key={l.status} className="flex items-center gap-1">
                      <div className="w-3 h-3 rounded-[3px]"
                        style={{ background: STATUS_COLORS[l.status].bg, boxShadow: STATUS_COLORS[l.status].glow }} />
                      <span className="text-[10px] text-ink3">{l.label}</span>
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>

          {/* Score evolution chart */}
          {!loading && scoreSeries.length > 1 && (
            <div className="space-y-2">
              <p className="section-title flex items-center gap-1.5">
                <TrendingUp size={11} /> Evolução do score
              </p>
              <div className="rounded-[10px] p-3"
                style={{ background: 'rgba(var(--accent-rgb),0.03)', boxShadow: '0 0 0 0.5px rgba(var(--accent-rgb),0.07)' }}>
                <ResponsiveContainer width="100%" height={100}>
                  <LineChart data={scoreSeries}>
                    <XAxis
                      dataKey="date"
                      tick={{ fontSize: 8, fill: 'var(--ink3)' }}
                      axisLine={false} tickLine={false}
                      interval={Math.floor(scoreSeries.length / 4)}
                    />
                    <YAxis hide domain={[0, 1000]} />
                    <Tooltip content={<ScoreTooltip />} cursor={{ stroke: 'rgba(var(--brand-rgb),0.2)' }} />
                    <Line
                      type="monotone" dataKey="score"
                      stroke={score >= 800 ? 'var(--brand)' : score >= 500 ? '#F59E0B' : '#EF4444'}
                      strokeWidth={2} dot={false} activeDot={{ r: 3 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}

          {/* Client notes */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <p className="section-title flex items-center gap-1.5">
                <FileText size={11} /> Anotações
              </p>
              {!editingNote && (
                <button
                  onClick={() => { setEditingNote(true); setNoteText(localNotes) }}
                  className="text-ink4 hover:text-ink3 transition flex items-center gap-1 text-[11px]"
                >
                  <Pencil size={11} />
                  {localNotes ? 'Editar' : 'Adicionar'}
                </button>
              )}
            </div>
            {editingNote ? (
              <div className="space-y-2">
                <textarea
                  className="input w-full text-[12px] resize-none"
                  rows={3}
                  placeholder="Observações sobre este cliente…"
                  value={noteText}
                  onChange={e => setNoteText(e.target.value)}
                  autoFocus
                />
                <div className="flex gap-2">
                  <button onClick={saveNote} disabled={savingNote} className="btn-ok btn-sm flex-1">
                    <Check size={12} /> Salvar
                  </button>
                  <button
                    onClick={() => { setEditingNote(false); setNoteText(localNotes) }}
                    disabled={savingNote} className="btn-ghost btn-sm flex-1"
                  >
                    Cancelar
                  </button>
                </div>
              </div>
            ) : localNotes ? (
              <div className="rounded-[8px] p-3 text-[12px] text-ink2 leading-relaxed italic"
                style={{ background: 'rgba(var(--accent-rgb),0.04)', boxShadow: '0 0 0 0.5px rgba(var(--accent-rgb),0.08)' }}>
                {localNotes}
              </div>
            ) : (
              <p className="text-[12px] text-ink4 italic">Nenhuma anotação.</p>
            )}
          </div>

          {/* Score explanation */}
          <div className="rounded-[8px] p-3 space-y-1.5"
            style={{ background: 'rgba(var(--accent-rgb),0.03)', boxShadow: '0 0 0 0.5px rgba(var(--accent-rgb),0.07)' }}>
            <p className="section-title">Como funciona o score?</p>
            <div className="space-y-1 text-[11px] text-ink3">
              <p>⚡ Antes das 12h: streak +1, +30 pts (bônus por streak)</p>
              <p>✅ 12h–16h: streak +1, +20 pts (bônus por streak)</p>
              <p>🟡 16h–23:58: +5 pts (sem streak)</p>
              <p>⏰ 1 dia de atraso: streak = 0, -50 pts</p>
              <p>❌ Não pagou: streak = 0, -50 pts</p>
              <p>🚨 7+ dias: marcado como calote</p>
              <p>📅 Domingo: sem cobrança</p>
            </div>
          </div>

        </div>
      </div>
    </div>
  )
}
