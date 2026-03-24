import { useState } from 'react'
import { Send, Smartphone, Loader2, Check, Copy, BarChart3, MessageSquare } from 'lucide-react'
import toast from 'react-hot-toast'
import { api }           from '../api'
import DateFilter, { presetToDates } from './DateFilter'

const TODAY = presetToDates('today')

const QUICK = [
  { emoji: '📊', label: 'Hoje',            msg: 'relatório de hoje'                },
  { emoji: '📅', label: 'Ontem',           msg: 'relatório de ontem'               },
  { emoji: '📱', label: 'Enviar no zap',   msg: 'manda o relatório de hoje no zap' },
  { emoji: '📆', label: 'Última semana',   msg: 'relatório dos últimos 7 dias'     },
]

export default function ReportChat() {
  const [msg,        setMsg]        = useState('')
  const [loading,    setLoading]    = useState(false)
  const [sending,    setSending]    = useState(false)
  const [result,     setResult]     = useState(null)
  const [copied,     setCopied]     = useState(false)
  const [date,       setDate]       = useState({ preset: 'today', ...TODAY })

  function buildMsg(base) {
    if (date.preset === 'yesterday') return base.replace('hoje', 'ontem')
    if (date.preset === '7d')        return 'relatório dos últimos 7 dias'
    if (date.preset === '30d')       return 'relatório do último mês'
    if (date.preset === 'custom' && date.date_from)
      return `relatório do período ${date.date_from} até ${date.date_to}`
    return base
  }

  async function send(text) {
    if (loading) return
    const t = text ?? msg
    if (!t.trim()) return
    setLoading(true); setResult(null)
    try {
      const r = await api.requestReport(t)
      setResult(r)
      if (r.sent_whatsapp) toast.success('Relatório enviado no WhatsApp!', { duration: 4000 })
    } catch (e) {
      toast.error(e.message)
    } finally {
      setLoading(false)
    }
  }

  async function sendNow() {
    setSending(true)
    try {
      await api.sendNow()
      toast.success('Relatório enviado para o WhatsApp do admin!', { duration: 5000 })
    } catch (e) {
      toast.error(e.message)
    } finally {
      setSending(false)
    }
  }

  async function copy() {
    if (!result?.report) return
    await navigator.clipboard.writeText(result.report).catch(() => {})
    setCopied(true); setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="space-y-4">

      {/* Auto-send banner */}
      <div
        className="rounded-[10px] p-4 flex items-center justify-between gap-4"
        style={{
          background: 'var(--panel)',
          boxShadow: '0 0 0 0.5px rgba(var(--accent-rgb),0.07), 0 2px 6px rgba(0,0,0,0.4)',
        }}
      >
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Smartphone size={13} className="text-brand" />
            <p className="text-[13px] font-bold text-ink">Envio automático</p>
          </div>
          <p className="text-[12px] text-ink2">
            Diariamente às{' '}
            <span className="font-mono font-bold text-brand">00:00</span> BRT
            {' '}→{' '}
            <span className="font-mono text-ink3">Admin WhatsApp</span>
          </p>
        </div>
        <button onClick={sendNow} disabled={sending} className="btn-primary shrink-0">
          {sending ? <Loader2 size={14} className="animate-spin" /> : <Smartphone size={14} />}
          Enviar
        </button>
      </div>

      {/* Period selector */}
      <div
        className="rounded-[10px] p-4 space-y-3"
        style={{
          background: 'var(--panel)',
          boxShadow: '0 0 0 0.5px rgba(var(--accent-rgb),0.07), 0 2px 6px rgba(0,0,0,0.4)',
        }}
      >
        <p className="section-title flex items-center gap-1.5">
          <BarChart3 size={11} /> Período do relatório
        </p>
        <DateFilter
          value={date.preset}
          customFrom={date.date_from}
          customTo={date.date_to}
          onChange={setDate}
        />
      </div>

      {/* Request */}
      <div
        className="rounded-[10px] p-4 space-y-4"
        style={{
          background: 'var(--panel)',
          boxShadow: '0 0 0 0.5px rgba(var(--accent-rgb),0.07), 0 2px 6px rgba(0,0,0,0.4)',
        }}
      >
        <p className="section-title flex items-center gap-1.5">
          <MessageSquare size={11} /> Pedir por texto
        </p>

        {/* Quick buttons */}
        <div className="grid grid-cols-2 gap-2">
          {QUICK.map(q => (
            <button
              key={q.msg}
              onClick={() => send(buildMsg(q.msg))}
              disabled={loading}
              className="btn-ghost btn-sm justify-start text-[12px] py-3"
            >
              <span>{q.emoji}</span>
              <span>{q.label}</span>
            </button>
          ))}
        </div>

        {/* Text input */}
        <div className="flex gap-2">
          <input
            className="input"
            placeholder="Ex: manda o relatório semanal no WhatsApp…"
            value={msg}
            onChange={e => setMsg(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && !e.shiftKey && send()}
          />
          <button
            onClick={() => send()}
            disabled={loading || !msg.trim()}
            className="btn-primary shrink-0 px-3"
          >
            {loading ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />}
          </button>
        </div>
      </div>

      {/* Result */}
      {result && (
        <div
          className="rounded-[10px] p-4 space-y-3 animate-slide-up"
          style={{
            background: 'var(--panel)',
            boxShadow: '0 0 0 0.5px rgba(var(--brand-rgb),0.22), 0 2px 6px rgba(0,0,0,0.4), 0 0 20px rgba(var(--brand-rgb),0.06)',
          }}
        >
          {/* Header */}
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <div className="flex items-center gap-2 flex-wrap">
              <p className="section-title">Relatório gerado</p>
              <span className="font-mono text-[11px] text-ink3">{result.date}</span>
              {result.sent_whatsapp && (
                <span
                  className="badge"
                  style={{
                    background: 'rgba(var(--brand-rgb),0.10)',
                    color: 'var(--brand-hi)',
                    boxShadow: '0 0 0 0.5px rgba(var(--brand-rgb),0.22)',
                  }}
                >
                  <Check size={9} /> Enviado no WhatsApp
                </span>
              )}
            </div>
            <button onClick={copy} className="btn-ghost btn-sm">
              {copied ? <Check size={12} className="text-ok" /> : <Copy size={12} />}
              {copied ? 'Copiado' : 'Copiar'}
            </button>
          </div>

          {/* Body */}
          <div
            className="rounded-[8px] p-3"
            style={{ background: 'rgba(var(--accent-rgb),0.04)', boxShadow: '0 0 0 0.5px rgba(var(--accent-rgb),0.07)' }}
          >
            <pre className="text-[12px] text-ink2 whitespace-pre-wrap font-sans leading-relaxed">
              {result.report}
            </pre>
          </div>
        </div>
      )}
    </div>
  )
}
