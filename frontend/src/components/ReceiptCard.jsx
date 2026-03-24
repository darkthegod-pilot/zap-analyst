import { useState } from 'react'
import { Loader2, ImageOff, Square } from 'lucide-react'
import StatusBadge from './StatusBadge'
import ImagePreviewModal from './ImagePreviewModal'
import ReceiptDetailModal from './ReceiptDetailModal'

const TRUSTED_NAMES = ['weslley', 'gabriel', 'washington', 'francisco', 'lucas']
function isTrustedRecipient(name) {
  if (!name) return true  // sem nome = sem alerta
  const lower = name.toLowerCase()
  return TRUSTED_NAMES.some(n => lower.includes(n))
}

/* ─────────────────────────────────────────────────
   SIGNATURE ELEMENT: Confidence Arc
──────────────────────────────────────────────── */
function ConfidenceArc({ score }) {
  const pct    = Math.round((score ?? 0) * 100)
  const radius = 19
  const stroke = 2.5
  const circ   = 2 * Math.PI * radius
  const gap    = circ * 0.22
  const arc    = circ - gap
  const fill   = (pct / 100) * arc
  const color  = pct >= 85 ? 'var(--brand)' : pct >= 55 ? '#F59E0B' : '#EF4444'
  const glow   = pct >= 85 ? 'rgba(var(--brand-rgb),0.55)' : pct >= 55 ? 'rgba(245,158,11,0.55)' : 'rgba(239,68,68,0.55)'
  const size   = (radius + stroke) * 2 + 2
  const rotate = 90 + (360 * 0.11)

  return (
    <div className="relative flex items-center justify-center shrink-0" style={{ width: size, height: size }}>
      <svg width={size} height={size} style={{ transform: `rotate(${rotate}deg)` }}>
        <circle cx={size/2} cy={size/2} r={radius} fill="none"
          stroke="rgba(var(--accent-rgb),0.07)" strokeWidth={stroke}
          strokeDasharray={`${arc} ${circ - arc}`} strokeLinecap="round" />
        <circle cx={size/2} cy={size/2} r={radius} fill="none"
          stroke={color} strokeWidth={stroke}
          strokeDasharray={`${fill} ${circ - fill}`} strokeLinecap="round"
          style={{ filter: `drop-shadow(0 0 4px ${glow})`, transition: 'stroke-dasharray 0.8s cubic-bezier(0.34,1.56,0.64,1)' }} />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="font-mono font-black tabular lining leading-none" style={{ fontSize: 13, color }}>{pct}</span>
        <span className="font-mono text-ink3 leading-none" style={{ fontSize: 8 }}>%</span>
      </div>
    </div>
  )
}

/* ── Status → card shadow ──────────────────────── */
function cardShadow(status, selected) {
  if (selected) return '0 0 0 1.5px rgba(var(--brand-rgb),0.55), 0 2px 6px rgba(0,0,0,0.4)'
  if (status === 'approved')   return '0 0 0 0.5px rgba(var(--brand-rgb),0.25), 0 2px 6px rgba(0,0,0,0.4), 0 0 20px rgba(var(--brand-rgb),0.08)'
  if (status === 'suspicious') return '0 0 0 0.5px rgba(245,158,11,0.25), 0 2px 6px rgba(0,0,0,0.4), 0 0 20px rgba(245,158,11,0.08)'
  if (status === 'rejected')   return '0 0 0 0.5px rgba(239,68,68,0.25), 0 2px 6px rgba(0,0,0,0.4), 0 0 20px rgba(239,68,68,0.08)'
  return '0 0 0 0.5px rgba(var(--accent-rgb),0.07), 0 2px 6px rgba(0,0,0,0.45), 0 8px 20px rgba(0,0,0,0.25)'
}

/* ─────────────────────────────────────────────────
   MAIN CARD — collapsed row only
   Clicking opens ReceiptDetailModal
──────────────────────────────────────────────── */
export default function ReceiptCard({ receipt, onRefresh, selected, onToggle, bulkMode }) {
  const [detailOpen,  setDetailOpen]  = useState(false)
  const [previewOpen, setPreviewOpen] = useState(false)

  const a = receipt.analysis

  const imgUrl = receipt.image_path
    ? `/uploads/${receipt.image_path.split('/').pop()}`
    : receipt.image_url

  const time = new Date(receipt.received_at + 'Z').toLocaleString('pt-BR', {
    day: '2-digit', month: '2-digit',
    hour: '2-digit', minute: '2-digit',
  })

  function handleRowClick() {
    if (bulkMode) {
      onToggle?.()
    } else {
      setDetailOpen(true)
    }
  }

  return (
    <>
      <article
        className="rounded-[10px] overflow-hidden animate-fade-in cursor-pointer"
        style={{ background: 'var(--panel)', boxShadow: cardShadow(receipt.status, selected) }}
        onClick={handleRowClick}
        role="button"
      >
        <div className="flex items-center gap-3 p-3 transition-colors duration-150 active:opacity-80">

          {/* Checkbox (bulk mode) or Thumbnail */}
          <div className="shrink-0" onClick={e => e.stopPropagation()}>
            {bulkMode ? (
              <button
                onClick={onToggle}
                className="w-[52px] h-[52px] rounded-[7px] flex items-center justify-center focus:outline-none"
                style={{
                  background: selected ? 'rgba(var(--brand-rgb),0.15)' : 'rgba(var(--accent-rgb),0.05)',
                  boxShadow: selected ? '0 0 0 1.5px rgba(var(--brand-rgb),0.5)' : '0 0 0 0.5px rgba(var(--accent-rgb),0.09)',
                }}
              >
                <div className="w-5 h-5 rounded-[4px] flex items-center justify-center"
                  style={{ background: selected ? 'var(--brand)' : 'transparent', boxShadow: selected ? 'none' : '0 0 0 1.5px rgba(var(--accent-rgb),0.25)' }}>
                  {selected && (
                    <svg width="11" height="9" viewBox="0 0 11 9" fill="none">
                      <path d="M1 4L4 7L10 1" stroke="var(--canvas)" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                  )}
                </div>
              </button>
            ) : imgUrl ? (
              <button
                onClick={e => { e.stopPropagation(); setPreviewOpen(true) }}
                className="block rounded-[7px] overflow-hidden transition-opacity hover:opacity-75 focus:outline-none"
                style={{ width: 52, height: 52 }}
                title="Ver imagem"
              >
                <img src={imgUrl} alt="comprovante" loading="lazy"
                  className="w-full h-full object-cover"
                  style={{ boxShadow: '0 0 0 0.5px rgba(var(--accent-rgb),0.10)' }} />
              </button>
            ) : (
              <div className="rounded-[7px] flex items-center justify-center"
                style={{ width: 52, height: 52, background: 'rgba(var(--accent-rgb),0.05)', boxShadow: '0 0 0 0.5px rgba(var(--accent-rgb),0.09)' }}>
                <ImageOff size={18} className="text-ink3" />
              </div>
            )}
          </div>

          {/* Main info */}
          <div className="flex-1 min-w-0 space-y-1">
            <p className="text-[13px] font-bold text-ink truncate leading-none">
              {a?.bank_name || receipt.client?.name || receipt.client?.phone || `#${receipt.client_id}`}
            </p>
            {a?.amount ? (
              <p className="font-mono font-black text-[14px] tabular lining" style={{ color: 'var(--brand-hi)' }}>
                {a.amount}
              </p>
            ) : (
              <p className="text-[12px] text-ink3">
                {receipt.client?.name || receipt.client?.phone || '—'}
              </p>
            )}
            <div className="flex items-center gap-2 flex-wrap">
              <StatusBadge status={receipt.status} />
              <span className="font-mono text-[10px] text-ink3">{time}</span>
              {receipt.is_duplicate && (
                <span className="badge" style={{ background: 'rgba(239,68,68,0.10)', color: '#F87171', boxShadow: '0 0 0 0.5px rgba(239,68,68,0.22)' }}>
                  DUP
                </span>
              )}
              {a?.recipient_name && !isTrustedRecipient(a.recipient_name) && (
                <span className="badge" style={{ background: 'rgba(251,146,60,0.13)', color: '#FB923C', boxShadow: '0 0 0 0.5px rgba(251,146,60,0.30)' }}
                  title={`Destinatário: ${a.recipient_name}`}>
                  ⚠ DEST
                </span>
              )}
            </div>
          </div>

          {/* Right: arc + select button */}
          <div className="shrink-0 flex items-center gap-1.5">
            {!bulkMode && (
              <>
                {a ? (
                  <ConfidenceArc score={a.confidence_score} />
                ) : (
                  <div className="w-11 h-11 flex items-center justify-center">
                    <Loader2 size={16} className="text-ink3 animate-spin" />
                  </div>
                )}
                {/* Select button to enter bulk mode */}
                <button
                  onClick={e => { e.stopPropagation(); onToggle?.() }}
                  className="text-ink4 hover:text-ink3 transition p-0.5 shrink-0"
                  title="Selecionar"
                >
                  <Square size={12} />
                </button>
              </>
            )}
          </div>
        </div>
      </article>

      {/* Detail modal */}
      {detailOpen && (
        <ReceiptDetailModal
          receipt={receipt}
          onClose={() => setDetailOpen(false)}
          onRefresh={onRefresh}
        />
      )}

      {/* Image preview lightbox */}
      {previewOpen && imgUrl && (
        <ImagePreviewModal url={imgUrl} onClose={() => setPreviewOpen(false)} />
      )}
    </>
  )
}
