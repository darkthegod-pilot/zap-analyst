import { useState } from 'react'
import {
  Send, MessageSquare, Loader2, Smartphone,
  CheckCircle2, Copy, BarChart3,
} from 'lucide-react'
import toast from 'react-hot-toast'
import { api }           from '../api'
import DateFilter, { presetToDates } from './DateFilter'

const QUICK = [
  { label: '📊 Relatório de hoje',         msg: 'relatório de hoje'                },
  { label: '📅 Relatório de ontem',        msg: 'relatório de ontem'               },
  { label: '📱 Enviar no WhatsApp',        msg: 'manda o relatório de hoje no zap' },
  { label: '📆 Relatório semanal',         msg: 'relatório dos últimos 7 dias'     },
]

const TODAY = presetToDates('today')

export default function ReportChat() {
  const [message,      setMessage]      = useState('')
  const [loading,      setLoading]      = useState(false)
  const [sendingNow,   setSendingNow]   = useState(false)
  const [result,       setResult]       = useState(null)
  const [dateFilter,   setDateFilter]   = useState({ preset: 'today', ...TODAY })
  const [copied,       setCopied]       = useState(false)

  async function handleSend(overrideMsg) {
    const text = overrideMsg ?? message
    if (!text.trim()) return
    setLoading(true)
    setResult(null)
    try {
      const data = await api.requestReport(text)
      setResult(data)
      if (data.sent_whatsapp) {
        toast.success('Relatório enviado no WhatsApp!', { duration: 4000 })
      }
    } catch (e) {
      toast.error(e.message)
    } finally {
      setLoading(false)
    }
  }

  async function handleSendNow() {
    setSendingNow(true)
    try {
      await api.sendNow()
      toast.success('Relatório enviado para +55 11 99655-4604!', { duration: 5000 })
    } catch (e) {
      toast.error(e.message)
    } finally {
      setSendingNow(false)
    }
  }

  async function handleCopy() {
    if (!result?.report) return
    try {
      await navigator.clipboard.writeText(result.report)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      toast.error('Não foi possível copiar')
    }
  }

  /* Build context-aware quick message using date filter */
  function buildMessage(base) {
    if (dateFilter.preset === 'today')     return base
    if (dateFilter.preset === 'yesterday') return base.replace('hoje', 'ontem')
    if (dateFilter.preset === '7d')        return 'relatório dos últimos 7 dias'
    if (dateFilter.preset === '30d')       return 'relatório do último mês'
    if (dateFilter.preset === 'custom')
      return `relatório do período ${dateFilter.date_from} até ${dateFilter.date_to}`
    return base
  }

  return (
    <div className="space-y-5">
      {/* ── Daily auto-send banner ─────────────────── */}
      <div className="card p-4 flex flex-col xs:flex-row items-start xs:items-center gap-4">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <Smartphone size={15} className="text-brand shrink-0" />
            <p className="font-bold text-sm text-ink">Envio automático diário</p>
          </div>
          <p className="text-xs text-ink-secondary">
            Todo dia às <span className="text-brand font-mono font-bold">00:00</span> BRT para{' '}
            <span className="font-mono text-ink">+55 11 99655-4604</span>
          </p>
        </div>
        <button
          onClick={handleSendNow}
          disabled={sendingNow}
          className="btn-brand shrink-0 w-full xs:w-auto"
        >
          {sendingNow
            ? <Loader2 size={15} className="animate-spin" />
            : <Smartphone size={15} />}
          Enviar agora
        </button>
      </div>

      {/* ── Period filter ─────────────────────────── */}
      <div className="card p-4 space-y-3">
        <p className="section-title flex items-center gap-1.5">
          <BarChart3 size={13} /> Período do relatório
        </p>
        <DateFilter
          value={dateFilter.preset}
          customFrom={dateFilter.date_from}
          customTo={dateFilter.date_to}
          onChange={setDateFilter}
        />
      </div>

      {/* ── Natural language input ─────────────────── */}
      <div className="card p-4 space-y-4">
        <p className="section-title flex items-center gap-1.5">
          <MessageSquare size={13} /> Pedir por texto
        </p>

        {/* Quick suggestions */}
        <div className="grid grid-cols-2 gap-2">
          {QUICK.map(q => (
            <button
              key={q.msg}
              onClick={() => handleSend(buildMessage(q.msg))}
              disabled={loading}
              className="btn-ghost text-xs py-2.5 text-left justify-start"
            >
              {q.label}
            </button>
          ))}
        </div>

        {/* Text input */}
        <div className="flex gap-2">
          <input
            className="input"
            placeholder="Ex: me manda o relatório do mês no WhatsApp…"
            value={message}
            onChange={e => setMessage(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && !e.shiftKey && handleSend()}
          />
          <button
            onClick={() => handleSend()}
            disabled={loading || !message.trim()}
            className="btn-brand px-3 shrink-0"
            aria-label="Enviar"
          >
            {loading
              ? <Loader2 size={16} className="animate-spin" />
              : <Send size={16} />}
          </button>
        </div>
      </div>

      {/* ── Result ────────────────────────────────── */}
      {result && (
        <div className="card p-4 space-y-3 animate-slide-up border-brand/20">
          {/* Header */}
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <div className="flex items-center gap-2 flex-wrap">
              <p className="section-title">Relatório gerado</p>
              <span className="text-xs text-ink-secondary">{result.date}</span>
              {result.sent_whatsapp && (
                <span className="tag bg-status-approved-bg text-status-approved border-status-approved-border">
                  <CheckCircle2 size={11} /> Enviado no WhatsApp
                </span>
              )}
            </div>
            <button
              onClick={handleCopy}
              className="btn-ghost text-xs py-1.5 px-3 shrink-0"
            >
              {copied ? <CheckCircle2 size={13} className="text-status-approved" /> : <Copy size={13} />}
              {copied ? 'Copiado!' : 'Copiar'}
            </button>
          </div>

          {/* Report body */}
          <div className="bg-surface-raised rounded-xl p-4 border border-surface-border">
            <pre className="text-sm text-ink whitespace-pre-wrap font-sans leading-relaxed">
              {result.report}
            </pre>
          </div>
        </div>
      )}
    </div>
  )
}
