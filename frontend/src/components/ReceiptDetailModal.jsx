import { useState } from 'react'
import {
  X, Building2, DollarSign, CalendarDays, Hash,
  ArrowUp, ArrowDown, AlertTriangle, Shield, Copy, Check,
  CheckCircle, XCircle, Loader2, ImageOff, ExternalLink,
} from 'lucide-react'
import toast from 'react-hot-toast'
import StatusBadge from './StatusBadge'
import ImagePreviewModal from './ImagePreviewModal'
import { api } from '../api'

/* ── Confidence Arc (same signature element) ──── */
function ConfidenceArc({ score }) {
  const pct    = Math.round((score ?? 0) * 100)
  const radius = 22
  const stroke = 3
  const circ   = 2 * Math.PI * radius
  const gap    = circ * 0.22
  const arc    = circ - gap
  const fill   = (pct / 100) * arc
  const color  = pct >= 85 ? '#10B981' : pct >= 55 ? '#F59E0B' : '#EF4444'
  const glow   = pct >= 85 ? 'rgba(16,185,129,0.55)' : pct >= 55 ? 'rgba(245,158,11,0.55)' : 'rgba(239,68,68,0.55)'
  const size   = (radius + stroke) * 2 + 2
  const rotate = 90 + (360 * 0.11)

  return (
    <div className="relative flex items-center justify-center shrink-0" style={{ width: size, height: size }}>
      <svg width={size} height={size} style={{ transform: `rotate(${rotate}deg)` }}>
        <circle cx={size/2} cy={size/2} r={radius} fill="none"
          stroke="rgba(100,150,255,0.07)" strokeWidth={stroke}
          strokeDasharray={`${arc} ${circ - arc}`} strokeLinecap="round" />
        <circle cx={size/2} cy={size/2} r={radius} fill="none"
          stroke={color} strokeWidth={stroke}
          strokeDasharray={`${fill} ${circ - fill}`} strokeLinecap="round"
          style={{ filter: `drop-shadow(0 0 5px ${glow})`, transition: 'stroke-dasharray 0.8s cubic-bezier(0.34,1.56,0.64,1)' }} />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="font-mono font-black leading-none" style={{ fontSize: 14, color }}>{pct}</span>
        <span className="font-mono text-ink3 leading-none" style={{ fontSize: 8 }}>%</span>
      </div>
    </div>
  )
}

/* ── Build decision explanation ─────────────────── */
function buildDecision(receipt) {
  const a = receipt.analysis
  if (receipt.is_duplicate) {
    return {
      icon: '❌',
      title: 'Rejeitado — Duplicado',
      body: receipt.notes || 'Comprovante com imagem idêntica a um já registrado.',
      color: '#EF4444',
    }
  }
  if (!a) return { icon: '⏳', title: 'Análise em andamento', body: 'A IA está processando este comprovante…', color: '#7A8DB5' }

  const pct = Math.round((a.confidence_score ?? 0) * 100)

  if (receipt.status === 'approved' && receipt.auto_processed)
    return { icon: '✅', title: `Auto-aprovado — ${pct}% de confiança`, body: a.ai_summary || '', color: '#10B981' }
  if (receipt.status === 'approved')
    return { icon: '✅', title: 'Aprovado manualmente', body: a.ai_summary || 'Aprovado pelo administrador.', color: '#10B981' }
  if (receipt.status === 'rejected')
    return { icon: '❌', title: 'Rejeitado', body: receipt.notes || a.ai_summary || '', color: '#EF4444' }
  if (receipt.status === 'suspicious')
    return { icon: '⚠️', title: `Suspeito — ${pct}% de confiança (< 85%)`, body: a.ai_summary || '', color: '#F59E0B' }
  return { icon: '⏳', title: 'Pendente', body: a.ai_summary || '', color: '#7A8DB5' }
}

/* ── Data row ────────────────────────────────────── */
function DataRow({ Icon, label, value, mono }) {
  if (!value) return null
  return (
    <div className="flex items-start gap-2 min-w-0">
      <Icon size={12} className="text-ink3 mt-[3px] shrink-0" />
      <div className="min-w-0 flex-1">
        <p className="label">{label}</p>
        <p className={`text-[12px] text-ink mt-0.5 ${mono ? 'font-mono' : 'font-medium'} break-all leading-snug`}>
          {value}
        </p>
      </div>
    </div>
  )
}

/* ── Section header ─────────────────────────────── */
function Section({ title, children }) {
  return (
    <div className="space-y-3">
      <p className="section-title">{title}</p>
      {children}
    </div>
  )
}

/* ── MAIN ───────────────────────────────────────── */
export default function ReceiptDetailModal({ receipt, onClose, onRefresh }) {
  const [loading,      setLoading]      = useState(null)
  const [copied,       setCopied]       = useState(false)
  const [previewOpen,  setPreviewOpen]  = useState(false)

  const a        = receipt.analysis
  const canAct   = receipt.status === 'pending' || receipt.status === 'suspicious'
  const decision = buildDecision(receipt)

  const imgUrl = receipt.image_path
    ? `/uploads/${receipt.image_path.split('/').pop()}`
    : receipt.image_url

  const time = new Date(receipt.received_at + 'Z').toLocaleString('pt-BR', {
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  })

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
      onClose()
    } catch (e) {
      toast.error(e.message)
    } finally {
      setLoading(null)
    }
  }

  async function copyHash() {
    if (!receipt.image_hash) return
    await navigator.clipboard.writeText(receipt.image_hash).catch(() => {})
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <>
      <div
        className="fixed inset-0 z-50 flex items-end sm:items-center justify-center"
        style={{ background: 'rgba(0,0,0,0.75)' }}
        onClick={onClose}
      >
        <div
          className="w-full sm:max-w-lg max-h-[92vh] overflow-y-auto rounded-t-[16px] sm:rounded-[16px]"
          style={{
            background: '#0D1525',
            boxShadow: '0 0 0 0.5px rgba(100,150,255,0.10), 0 -8px 40px rgba(0,0,0,0.6)',
          }}
          onClick={e => e.stopPropagation()}
        >
          {/* Header */}
          <div
            className="flex items-center justify-between p-4 sticky top-0 z-10"
            style={{ background: '#0D1525', borderBottom: '0.5px solid rgba(100,150,255,0.07)' }}
          >
            <div className="flex items-center gap-2">
              <StatusBadge status={receipt.status} />
              <span className="font-mono text-[11px] text-ink3">#{receipt.id}</span>
              {receipt.is_duplicate && (
                <span className="badge" style={{ background: 'rgba(239,68,68,0.12)', color: '#F87171', boxShadow: '0 0 0 0.5px rgba(239,68,68,0.25)' }}>
                  DUPLICADO
                </span>
              )}
            </div>
            <button onClick={onClose} className="text-ink4 hover:text-ink3 transition p-1">
              <X size={18} />
            </button>
          </div>

          <div className="p-4 space-y-5">

            {/* Top row: thumbnail + basic info */}
            <div className="flex gap-4">
              {/* Thumbnail */}
              <div className="shrink-0">
                {imgUrl ? (
                  <button
                    onClick={() => setPreviewOpen(true)}
                    className="block rounded-[10px] overflow-hidden relative group focus:outline-none"
                    style={{ width: 80, height: 80 }}
                    title="Ver comprovante"
                  >
                    <img src={imgUrl} alt="comprovante" className="w-full h-full object-cover" />
                    <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition flex items-center justify-center rounded-[10px]">
                      <ExternalLink size={16} className="text-white" />
                    </div>
                  </button>
                ) : (
                  <div className="rounded-[10px] flex items-center justify-center"
                    style={{ width: 80, height: 80, background: 'rgba(100,150,255,0.05)', boxShadow: '0 0 0 0.5px rgba(100,150,255,0.09)' }}>
                    <ImageOff size={22} className="text-ink3" />
                  </div>
                )}
              </div>

              {/* Basic info */}
              <div className="flex-1 min-w-0 space-y-1.5">
                <p className="text-[15px] font-bold text-ink leading-tight truncate">
                  {a?.bank_name || receipt.client?.name || receipt.client?.phone || `Cliente #${receipt.client_id}`}
                </p>
                {a?.amount && (
                  <p className="font-mono font-black text-[18px] tabular lining" style={{ color: '#34D399' }}>
                    {a.amount}
                  </p>
                )}
                <p className="font-mono text-[11px] text-ink3">{time}</p>
                {receipt.client?.name && (
                  <p className="font-mono text-[11px] text-ink4">{receipt.client.phone}</p>
                )}
              </div>
            </div>

            {/* Decision section */}
            <Section title="🔬 Decisão da IA">
              <div
                className="rounded-[10px] p-3 flex items-start gap-3"
                style={{
                  background: `rgba(${decision.color === '#10B981' ? '16,185,129' : decision.color === '#EF4444' ? '239,68,68' : decision.color === '#F59E0B' ? '245,158,11' : '75,94,138'},0.07)`,
                  boxShadow: `0 0 0 0.5px ${decision.color}33`,
                }}
              >
                {a && !receipt.is_duplicate && (
                  <ConfidenceArc score={a.confidence_score} />
                )}
                <div className="flex-1 min-w-0 space-y-1">
                  <p className="text-[13px] font-bold" style={{ color: decision.color }}>
                    {decision.icon} {decision.title}
                  </p>
                  {decision.body && (
                    <p className="text-[12px] text-ink2 leading-relaxed">{decision.body}</p>
                  )}
                  {a?.is_authentic !== null && a?.is_authentic !== undefined && (
                    <p className="text-[11px] text-ink3 mt-1">
                      {a.is_authentic ? '✓ Autêntico' : '✗ Possivelmente falsificado'}
                      {receipt.auto_processed && ' · Processado automaticamente pela IA'}
                    </p>
                  )}
                </div>
              </div>
            </Section>

            {/* Fraud indicators */}
            {(a?.fraud_indicators?.length ?? 0) > 0 && (
              <Section title="⚠️ Alertas de Fraude">
                <div className="rounded-[10px] p-3 space-y-2"
                  style={{ background: 'rgba(239,68,68,0.07)', boxShadow: '0 0 0 0.5px rgba(239,68,68,0.20)' }}>
                  <ul className="space-y-2">
                    {a.fraud_indicators.map((item, i) => (
                      <li key={i} className="flex items-start gap-2 text-[12px]" style={{ color: '#F87171' }}>
                        <AlertTriangle size={11} className="mt-0.5 shrink-0" />
                        {item}
                      </li>
                    ))}
                  </ul>
                </div>
              </Section>
            )}

            {/* Extracted data */}
            {a && (a.bank_name || a.amount || a.transaction_date || a.transaction_id || a.sender_name || a.recipient_name) && (
              <Section title="📋 Dados Extraídos">
                <div className="grid grid-cols-2 gap-x-4 gap-y-3"
                  style={{ background: 'rgba(100,150,255,0.03)', borderRadius: 8, padding: 12, boxShadow: '0 0 0 0.5px rgba(100,150,255,0.07)' }}>
                  <DataRow Icon={Building2}    label="Banco"         value={a.bank_name}        />
                  <DataRow Icon={DollarSign}   label="Valor"         value={a.amount}           mono />
                  <DataRow Icon={CalendarDays} label="Data"          value={a.transaction_date} mono />
                  <DataRow Icon={Hash}         label="ID Transação"  value={a.transaction_id}   mono />
                  <DataRow Icon={ArrowUp}      label="Pagador"       value={a.sender_name}      />
                  <DataRow Icon={ArrowDown}    label="Beneficiário"  value={a.recipient_name}   />
                </div>
              </Section>
            )}

            {/* Security section */}
            <Section title="🔒 Segurança">
              <div className="rounded-[10px] p-3 space-y-2"
                style={{ background: 'rgba(100,150,255,0.03)', boxShadow: '0 0 0 0.5px rgba(100,150,255,0.07)' }}>
                {receipt.image_hash ? (
                  <div className="flex items-center gap-2">
                    <Shield size={12} className="text-ink3 shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="label">Hash SHA-256</p>
                      <p className="font-mono text-[10px] text-ink3 truncate mt-0.5">{receipt.image_hash}</p>
                    </div>
                    <button onClick={copyHash} className="btn-ghost btn-sm shrink-0">
                      {copied ? <Check size={11} className="text-ok" /> : <Copy size={11} />}
                    </button>
                  </div>
                ) : (
                  <p className="text-[12px] text-ink3">Hash não disponível — imagem não processada localmente.</p>
                )}
                <div className="flex items-center gap-2 pt-1" style={{ borderTop: '0.5px solid rgba(100,150,255,0.07)' }}>
                  <span className="label flex-1">Comprovante duplicado</span>
                  <span className="text-[12px] font-semibold" style={{ color: receipt.is_duplicate ? '#EF4444' : '#10B981' }}>
                    {receipt.is_duplicate ? '⚠️ Sim' : '✓ Não'}
                  </span>
                </div>
              </div>
            </Section>

            {/* Notes */}
            {receipt.notes && !receipt.is_duplicate && (
              <p className="text-[11px] text-ink3 italic pl-3 border-l-2 border-ink4">
                {receipt.notes}
              </p>
            )}

            {/* Action buttons */}
            {canAct && (
              <div className="flex gap-3 pt-1 pb-2">
                <button
                  onClick={() => act('approve')}
                  disabled={!!loading}
                  className="btn-ok flex-1"
                >
                  {loading === 'approve' ? <Loader2 size={14} className="animate-spin" /> : <CheckCircle size={14} />}
                  Aprovar
                </button>
                <button
                  onClick={() => act('reject')}
                  disabled={!!loading}
                  className="btn-danger flex-1"
                >
                  {loading === 'reject' ? <Loader2 size={14} className="animate-spin" /> : <XCircle size={14} />}
                  Rejeitar
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {previewOpen && imgUrl && (
        <ImagePreviewModal url={imgUrl} onClose={() => setPreviewOpen(false)} />
      )}
    </>
  )
}
