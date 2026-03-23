import { useState } from 'react'
import {
  ChevronDown, ChevronUp, CheckCircle, XCircle,
  AlertTriangle, Shield, ShieldOff, Loader2,
  Building2, DollarSign, CalendarDays, Hash, User, ArrowRightLeft,
} from 'lucide-react'
import toast from 'react-hot-toast'
import StatusBadge from './StatusBadge'
import { api } from '../api'

/* ── Score bar ─────────────────────────────────── */
function ScoreBar({ score }) {
  const pct   = Math.round((score ?? 0) * 100)
  const color = pct >= 85 ? '#00ff88' : pct >= 55 ? '#ffb020' : '#ff4466'
  return (
    <div className="space-y-1">
      <div className="flex justify-between items-center">
        <span className="text-2xs text-ink-muted">Confiança</span>
        <span className="text-xs font-bold tabular-nums" style={{ color }}>{pct}%</span>
      </div>
      <div className="score-track">
        <div
          className="score-fill"
          style={{ width: `${pct}%`, background: color, boxShadow: `0 0 6px ${color}60` }}
        />
      </div>
    </div>
  )
}

/* ── Data row ──────────────────────────────────── */
function DataRow({ Icon, label, value }) {
  if (!value) return null
  return (
    <div className="flex items-start gap-2">
      <div className="mt-0.5 shrink-0 w-4 h-4 flex items-center justify-center">
        <Icon size={13} className="text-ink-muted" />
      </div>
      <div className="min-w-0">
        <p className="text-2xs text-ink-muted leading-none">{label}</p>
        <p className="text-sm text-ink font-medium mt-0.5 break-all">{value}</p>
      </div>
    </div>
  )
}

/* ── Status glow border ────────────────────────── */
function statusBorderClass(status) {
  switch (status) {
    case 'approved':   return 'border-status-approved-border shadow-glow-green'
    case 'rejected':   return 'border-status-rejected-border shadow-glow-red'
    case 'suspicious': return 'border-status-suspicious-border shadow-glow-yellow'
    default:           return 'border-surface-border'
  }
}

/* ── Main card ─────────────────────────────────── */
export default function ReceiptCard({ receipt, onRefresh }) {
  const [expanded, setExpanded] = useState(false)
  const [loading,  setLoading]  = useState(null) // 'approve' | 'reject'

  const a = receipt.analysis
  const canAction = receipt.status === 'pending' || receipt.status === 'suspicious'

  const imageUrl = receipt.image_path
    ? `/uploads/${receipt.image_path.split('/').pop()}`
    : receipt.image_url

  async function handleAction(action) {
    setLoading(action)
    try {
      if (action === 'approve') {
        await api.approveReceipt(receipt.id)
        toast.success('Comprovante aprovado!')
      } else {
        await api.rejectReceipt(receipt.id)
        toast('Comprovante rejeitado.', { icon: '❌' })
      }
      onRefresh?.()
    } catch (e) {
      toast.error(e.message)
    } finally {
      setLoading(null)
    }
  }

  return (
    <article
      className={`card border transition-all duration-200 animate-fade-in ${statusBorderClass(receipt.status)} overflow-hidden`}
    >
      {/* ── Collapsed row ── */}
      <div
        className="flex items-center gap-3 p-4 cursor-pointer select-none active:bg-surface-hover"
        onClick={() => setExpanded(v => !v)}
        role="button"
        aria-expanded={expanded}
      >
        {/* Thumbnail */}
        <div className="shrink-0">
          {imageUrl ? (
            <a
              href={imageUrl}
              target="_blank"
              rel="noreferrer"
              onClick={e => e.stopPropagation()}
            >
              <img
                src={imageUrl}
                alt="Comprovante"
                className="w-14 h-14 rounded-xl object-cover border border-surface-border hover:opacity-80 transition"
                loading="lazy"
              />
            </a>
          ) : (
            <div className="w-14 h-14 rounded-xl bg-surface-raised border border-surface-border flex items-center justify-center">
              <ArrowRightLeft size={20} className="text-ink-muted" />
            </div>
          )}
        </div>

        {/* Main info */}
        <div className="flex-1 min-w-0 space-y-1">
          <div className="flex items-center gap-2 flex-wrap">
            <StatusBadge status={receipt.status} size="xs" />
            {a?.is_authentic === true  && <Shield    size={12} className="text-status-approved"   />}
            {a?.is_authentic === false && <ShieldOff size={12} className="text-status-rejected"   />}
          </div>
          <p className="font-semibold text-sm text-ink truncate">
            {receipt.client?.name || receipt.client?.phone || `#${receipt.client_id}`}
          </p>
          <p className="text-2xs text-ink-muted">
            {new Date(receipt.received_at + 'Z').toLocaleString('pt-BR', {
              day: '2-digit', month: '2-digit', year: 'numeric',
              hour: '2-digit', minute: '2-digit',
            })}
          </p>
        </div>

        {/* Amount + score */}
        <div className="shrink-0 text-right space-y-1 min-w-[80px]">
          {a?.amount && (
            <p className="text-sm font-black text-status-approved">{a.amount}</p>
          )}
          {a && (
            <div className="w-20">
              <ScoreBar score={a.confidence_score} />
            </div>
          )}
          {!a && receipt.status === 'pending' && (
            <span className="text-2xs text-ink-muted italic">Analisando…</span>
          )}
        </div>

        {/* Chevron */}
        <div className="shrink-0 text-ink-muted ml-1">
          {expanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
        </div>
      </div>

      {/* ── Expanded details ── */}
      {expanded && (
        <div className="border-t border-surface-border animate-slide-up">
          {a ? (
            <div className="p-4 space-y-4">
              {/* Extracted data grid */}
              <div className="grid grid-cols-1 xs:grid-cols-2 gap-x-6 gap-y-3">
                <DataRow Icon={Building2}      label="Banco"         value={a.bank_name}       />
                <DataRow Icon={DollarSign}     label="Valor"         value={a.amount}           />
                <DataRow Icon={CalendarDays}   label="Data"          value={a.transaction_date} />
                <DataRow Icon={Hash}           label="ID Transação"  value={a.transaction_id}   />
                <DataRow Icon={User}           label="Pagador"       value={a.sender_name}      />
                <DataRow Icon={User}           label="Beneficiário"  value={a.recipient_name}   />
              </div>

              {/* Fraud indicators */}
              {a.fraud_indicators?.length > 0 && (
                <div className="bg-status-rejected-bg border border-status-rejected-border rounded-xl p-3 space-y-2">
                  <div className="flex items-center gap-1.5">
                    <AlertTriangle size={13} className="text-status-rejected" />
                    <span className="text-xs font-bold text-status-rejected uppercase tracking-wide">
                      Alertas de Fraude
                    </span>
                  </div>
                  <ul className="space-y-1">
                    {a.fraud_indicators.map((item, i) => (
                      <li key={i} className="text-xs text-status-rejected/80 flex items-start gap-1.5">
                        <span className="mt-1 shrink-0 w-1 h-1 rounded-full bg-status-rejected/60 inline-block" />
                        {item}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* AI Summary */}
              {a.ai_summary && (
                <div className="bg-surface-raised rounded-xl p-3 border border-surface-border">
                  <p className="text-2xs text-ink-muted mb-1 uppercase tracking-wider font-semibold">Resumo da IA</p>
                  <p className="text-sm text-ink leading-relaxed">{a.ai_summary}</p>
                </div>
              )}

              {/* Error */}
              {a.error && (
                <div className="bg-status-rejected-bg border border-status-rejected-border rounded-xl p-3">
                  <p className="text-xs text-status-rejected">⚠ Erro na análise: {a.error}</p>
                </div>
              )}

              {/* Notes */}
              {receipt.notes && (
                <p className="text-xs text-ink-secondary italic border-l-2 border-surface-border pl-3">
                  {receipt.notes}
                </p>
              )}
            </div>
          ) : (
            <div className="p-6 flex items-center justify-center gap-3 text-ink-muted">
              <Loader2 size={16} className="animate-spin" />
              <span className="text-sm italic">Análise em andamento…</span>
            </div>
          )}

          {/* ── Action buttons ── */}
          {canAction && (
            <div className="px-4 pb-4 flex gap-3">
              <button
                onClick={() => handleAction('approve')}
                disabled={!!loading}
                className="btn-success flex-1"
              >
                {loading === 'approve'
                  ? <Loader2 size={15} className="animate-spin" />
                  : <CheckCircle size={15} />}
                Aprovar
              </button>
              <button
                onClick={() => handleAction('reject')}
                disabled={!!loading}
                className="btn-danger flex-1"
              >
                {loading === 'reject'
                  ? <Loader2 size={15} className="animate-spin" />
                  : <XCircle size={15} />}
                Rejeitar
              </button>
            </div>
          )}
        </div>
      )}
    </article>
  )
}
