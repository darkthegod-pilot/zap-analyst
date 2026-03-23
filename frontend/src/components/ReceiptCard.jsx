import { useState } from 'react'
import {
  ChevronDown, ChevronUp,
  CheckCircle, XCircle, AlertTriangle,
  Building2, DollarSign, CalendarDays, Hash,
  ArrowUp, ArrowDown, Loader2, ImageOff,
} from 'lucide-react'
import toast from 'react-hot-toast'
import StatusBadge from './StatusBadge'
import { api } from '../api'

/* ─────────────────────────────────────────────────
   SIGNATURE ELEMENT: Confidence Arc
   Forensic score visualisation — circular arc dial
   that shows AI authenticity confidence.
   No other app would have this exact component.
──────────────────────────────────────────────── */
function ConfidenceArc({ score }) {
  const pct = Math.round((score ?? 0) * 100)
  const radius  = 19
  const stroke  = 2.5
  const circ    = 2 * Math.PI * radius
  const gap     = circ * 0.22            // leave a 22% gap at the bottom
  const arc     = circ - gap
  const fill    = (pct / 100) * arc
  const color   = pct >= 85 ? '#10B981' : pct >= 55 ? '#F59E0B' : '#EF4444'
  const glow    = pct >= 85 ? 'rgba(16,185,129,0.55)' : pct >= 55 ? 'rgba(245,158,11,0.55)' : 'rgba(239,68,68,0.55)'
  const size    = (radius + stroke) * 2 + 2
  const rotate  = 90 + (360 * 0.11)     // rotate so gap is at bottom

  return (
    <div className="relative flex items-center justify-center shrink-0" style={{ width: size, height: size }}>
      <svg width={size} height={size} style={{ transform: `rotate(${rotate}deg)` }}>
        {/* Track */}
        <circle
          cx={size / 2} cy={size / 2} r={radius}
          fill="none"
          stroke="rgba(100,150,255,0.07)"
          strokeWidth={stroke}
          strokeDasharray={`${arc} ${circ - arc}`}
          strokeLinecap="round"
        />
        {/* Fill */}
        <circle
          cx={size / 2} cy={size / 2} r={radius}
          fill="none"
          stroke={color}
          strokeWidth={stroke}
          strokeDasharray={`${fill} ${circ - fill}`}
          strokeLinecap="round"
          style={{
            filter:     `drop-shadow(0 0 4px ${glow})`,
            transition: 'stroke-dasharray 0.8s cubic-bezier(0.34,1.56,0.64,1)',
          }}
        />
      </svg>
      {/* Centre label */}
      <div className="absolute inset-0 flex flex-col items-center justify-center gap-0">
        <span
          className="font-mono font-black tabular lining leading-none"
          style={{ fontSize: 13, color }}
        >{pct}</span>
        <span className="font-mono text-ink3 leading-none" style={{ fontSize: 8 }}>%</span>
      </div>
    </div>
  )
}

/* ── Status → card shadow ──────────────────────── */
function cardShadow(status) {
  if (status === 'approved')   return '0 0 0 0.5px rgba(16,185,129,0.25), 0 2px 6px rgba(0,0,0,0.4), 0 0 20px rgba(16,185,129,0.08)'
  if (status === 'suspicious') return '0 0 0 0.5px rgba(245,158,11,0.25), 0 2px 6px rgba(0,0,0,0.4), 0 0 20px rgba(245,158,11,0.08)'
  if (status === 'rejected')   return '0 0 0 0.5px rgba(239,68,68,0.25), 0 2px 6px rgba(0,0,0,0.4), 0 0 20px rgba(239,68,68,0.08)'
  return '0 0 0 0.5px rgba(100,150,255,0.07), 0 2px 6px rgba(0,0,0,0.45), 0 8px 20px rgba(0,0,0,0.25)'
}

/* ── Data row ──────────────────────────────────── */
function DataRow({ Icon, label, value, mono }) {
  if (!value) return null
  return (
    <div className="flex items-start gap-2 min-w-0">
      <Icon size={12} className="text-ink3 mt-[3px] shrink-0" />
      <div className="min-w-0">
        <p className="label">{label}</p>
        <p className={`text-[12px] text-ink mt-0.5 ${mono ? 'font-mono' : 'font-medium'} break-all leading-snug`}>
          {value}
        </p>
      </div>
    </div>
  )
}

/* ─────────────────────────────────────────────────
   MAIN CARD
──────────────────────────────────────────────── */
export default function ReceiptCard({ receipt, onRefresh }) {
  const [open,    setOpen]    = useState(false)
  const [loading, setLoading] = useState(null)

  const a = receipt.analysis
  const canAct = receipt.status === 'pending' || receipt.status === 'suspicious'

  const imgUrl = receipt.image_path
    ? `/uploads/${receipt.image_path.split('/').pop()}`
    : receipt.image_url

  async function act(action) {
    setLoading(action)
    try {
      if (action === 'approve') {
        await api.approveReceipt(receipt.id)
        toast.success('Comprovante aprovado')
      } else {
        await api.rejectReceipt(receipt.id)
        toast('Comprovante rejeitado', { icon: '🚫' })
      }
      onRefresh?.()
    } catch (e) {
      toast.error(e.message)
    } finally {
      setLoading(null)
    }
  }

  const time = new Date(receipt.received_at + 'Z').toLocaleString('pt-BR', {
    day: '2-digit', month: '2-digit',
    hour: '2-digit', minute: '2-digit',
  })

  return (
    <article
      className="rounded-[10px] overflow-hidden animate-fade-in"
      style={{ background: '#0D1525', boxShadow: cardShadow(receipt.status) }}
    >
      {/* ── Collapsed Row ─────────────────────────── */}
      <div
        className="flex items-center gap-3 p-3 cursor-pointer select-none
                   transition-colors duration-150 active:opacity-80"
        style={{ background: 'transparent' }}
        onClick={() => setOpen(v => !v)}
        role="button"
        aria-expanded={open}
      >

        {/* Thumbnail */}
        <div className="shrink-0">
          {imgUrl ? (
            <a href={imgUrl} target="_blank" rel="noreferrer" onClick={e => e.stopPropagation()}>
              <img
                src={imgUrl}
                alt="comprovante"
                loading="lazy"
                className="rounded-[7px] object-cover transition-opacity hover:opacity-75"
                style={{
                  width: 52, height: 52,
                  boxShadow: '0 0 0 0.5px rgba(100,150,255,0.10)',
                }}
              />
            </a>
          ) : (
            <div
              className="rounded-[7px] flex items-center justify-center"
              style={{
                width: 52, height: 52,
                background: 'rgba(100,150,255,0.05)',
                boxShadow: '0 0 0 0.5px rgba(100,150,255,0.09)',
              }}
            >
              <ImageOff size={18} className="text-ink3" />
            </div>
          )}
        </div>

        {/* Main info */}
        <div className="flex-1 min-w-0 space-y-1">
          {/* Bank name or client */}
          <p className="text-[13px] font-bold text-ink truncate leading-none">
            {a?.bank_name || receipt.client?.name || receipt.client?.phone || `#${receipt.client_id}`}
          </p>
          {/* Amount (if available) */}
          {a?.amount ? (
            <p className="font-mono font-black text-[14px] tabular lining" style={{ color: '#34D399' }}>
              {a.amount}
            </p>
          ) : (
            <p className="text-[12px] text-ink3">
              {receipt.client?.name || receipt.client?.phone || `—`}
            </p>
          )}
          {/* Time + status */}
          <div className="flex items-center gap-2 flex-wrap">
            <StatusBadge status={receipt.status} />
            <span className="font-mono text-[10px] text-ink3">{time}</span>
          </div>
        </div>

        {/* Confidence arc / pending indicator */}
        <div className="shrink-0 flex items-center gap-2">
          {a ? (
            <ConfidenceArc score={a.confidence_score} />
          ) : (
            <div className="w-11 h-11 flex items-center justify-center">
              <Loader2 size={16} className="text-ink3 animate-spin" />
            </div>
          )}
          <span className="text-ink3 shrink-0">
            {open ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
          </span>
        </div>
      </div>

      {/* ── Expanded Details ──────────────────────── */}
      {open && (
        <div className="animate-slide-up">
          <div className="divider" />

          <div className="p-4 space-y-4">
            {a ? (
              <>
                {/* Confidence context bar */}
                <div
                  className="rounded-[8px] p-3 flex items-center gap-4"
                  style={{ background: 'rgba(100,150,255,0.04)', boxShadow: '0 0 0 0.5px rgba(100,150,255,0.07)' }}
                >
                  <ConfidenceArc score={a.confidence_score} />
                  <div className="flex-1 min-w-0">
                    <p className="label mb-1">Análise de Autenticidade</p>
                    <p className="text-[12px] text-ink leading-snug">
                      {a.is_authentic === true  && '✓ Comprovante provavelmente autêntico'}
                      {a.is_authentic === false && '✗ Comprovante possivelmente falsificado'}
                      {a.is_authentic === null  && 'Autenticidade inconclusiva'}
                    </p>
                    {(a.fraud_indicators?.length ?? 0) > 0 && (
                      <p className="text-[11px] mt-1" style={{ color: '#F59E0B' }}>
                        {a.fraud_indicators.length} alerta{a.fraud_indicators.length > 1 ? 's' : ''} detectado{a.fraud_indicators.length > 1 ? 's' : ''}
                      </p>
                    )}
                  </div>
                </div>

                {/* Extracted data — forensic grid */}
                <div className="grid grid-cols-2 gap-x-4 gap-y-3">
                  <DataRow Icon={Building2}    label="Banco"        value={a.bank_name}       />
                  <DataRow Icon={DollarSign}   label="Valor"        value={a.amount}          mono />
                  <DataRow Icon={CalendarDays} label="Data"         value={a.transaction_date}mono />
                  <DataRow Icon={Hash}         label="ID Transação" value={a.transaction_id}  mono />
                  <DataRow Icon={ArrowUp}      label="Pagador"      value={a.sender_name}     />
                  <DataRow Icon={ArrowDown}    label="Beneficiário" value={a.recipient_name}  />
                </div>

                {/* Fraud indicators */}
                {(a.fraud_indicators?.length ?? 0) > 0 && (
                  <div
                    className="rounded-[8px] p-3 space-y-2"
                    style={{
                      background: 'rgba(239,68,68,0.07)',
                      boxShadow: '0 0 0 0.5px rgba(239,68,68,0.20)',
                    }}
                  >
                    <div className="flex items-center gap-1.5">
                      <AlertTriangle size={12} className="text-danger" />
                      <span className="label" style={{ color: '#F87171' }}>
                        Alertas de Fraude
                      </span>
                    </div>
                    <ul className="space-y-1.5">
                      {a.fraud_indicators.map((item, i) => (
                        <li key={i} className="flex items-start gap-2 text-[12px] text-danger/80">
                          <span className="mt-1.5 w-1 h-1 rounded-full bg-danger/60 shrink-0" />
                          {item}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* AI Summary */}
                {a.ai_summary && (
                  <div
                    className="rounded-[8px] p-3"
                    style={{
                      background: 'rgba(100,150,255,0.04)',
                      boxShadow: '0 0 0 0.5px rgba(100,150,255,0.07)',
                    }}
                  >
                    <p className="label mb-1.5">Resumo da IA</p>
                    <p className="text-[12px] text-ink2 leading-relaxed">{a.ai_summary}</p>
                  </div>
                )}

                {/* Error */}
                {a.error && (
                  <p className="text-[12px] text-danger/80 pl-3 border-l-2 border-danger/30">
                    Erro: {a.error}
                  </p>
                )}
              </>
            ) : (
              <div className="flex items-center gap-3 py-4 justify-center text-ink3">
                <Loader2 size={14} className="animate-spin" />
                <span className="text-[12px] italic">Análise em andamento…</span>
              </div>
            )}

            {/* Notes */}
            {receipt.notes && (
              <p className="text-[11px] text-ink3 italic pl-3 border-l-2 border-ink4">
                {receipt.notes}
              </p>
            )}

            {/* Action buttons */}
            {canAct && (
              <div className="flex gap-3 pt-1">
                <button
                  onClick={() => act('approve')}
                  disabled={!!loading}
                  className="btn-ok flex-1"
                >
                  {loading === 'approve'
                    ? <Loader2 size={14} className="animate-spin" />
                    : <CheckCircle size={14} />}
                  Aprovar
                </button>
                <button
                  onClick={() => act('reject')}
                  disabled={!!loading}
                  className="btn-danger flex-1"
                >
                  {loading === 'reject'
                    ? <Loader2 size={14} className="animate-spin" />
                    : <XCircle size={14} />}
                  Rejeitar
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </article>
  )
}
