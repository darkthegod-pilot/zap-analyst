import { useState, useEffect } from 'react'
import {
  Loader2, CheckCircle, XCircle, Copy, Check,
  Wifi, KeyRound, Settings2, Info, Eye, EyeOff, ExternalLink,
} from 'lucide-react'
import toast from 'react-hot-toast'
import { api } from '../api'

/* ── Field ──────────────────────────────────────── */
function Field({ label, hint, children }) {
  return (
    <div className="space-y-1.5">
      <label className="text-[11px] font-semibold text-ink3 uppercase tracking-wide">{label}</label>
      {children}
      {hint && <p className="text-[10px] text-ink4 leading-snug">{hint}</p>}
    </div>
  )
}

/* ── Section ─────────────────────────────────────── */
function Section({ title, icon: Icon, children, accent }) {
  return (
    <div
      className="rounded-[12px] p-4 space-y-4"
      style={{
        background: '#0D1525',
        boxShadow: accent
          ? `0 0 0 0.5px ${accent}33, 0 2px 6px rgba(0,0,0,0.4)`
          : '0 0 0 0.5px rgba(100,150,255,0.07), 0 2px 6px rgba(0,0,0,0.4)',
      }}
    >
      <div className="flex items-center gap-2">
        <Icon size={14} style={{ color: accent || '#7A8DB5' }} />
        <p className="text-[13px] font-bold text-ink">{title}</p>
      </div>
      {children}
    </div>
  )
}

/* ── Test status badge ───────────────────────────── */
function TestBadge({ status }) {
  if (!status) return null
  const ok = status === 'ok'
  return (
    <div
      className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold"
      style={{
        background: ok ? 'rgba(16,185,129,0.10)' : 'rgba(239,68,68,0.10)',
        color:      ok ? '#34D399'                : '#F87171',
        boxShadow:  ok ? '0 0 0 0.5px rgba(16,185,129,0.25)' : '0 0 0 0.5px rgba(239,68,68,0.25)',
      }}
    >
      {ok ? <CheckCircle size={11} /> : <XCircle size={11} />}
      {ok ? 'Conectado' : 'Falhou'}
    </div>
  )
}

export default function SettingsPage() {
  const [loading,     setLoading]     = useState(true)
  const [saving,      setSaving]      = useState(false)
  const [testingZapi, setTestingZapi] = useState(false)
  const [testingAI,   setTestingAI]   = useState(false)
  const [zapiStatus,  setZapiStatus]  = useState(null)   // null | 'ok' | 'error'
  const [aiStatus,    setAiStatus]    = useState(null)
  const [zapiDetail,  setZapiDetail]  = useState(null)
  const [aiDetail,    setAiDetail]    = useState(null)
  const [showToken,   setShowToken]   = useState(false)
  const [showOpenAI,  setShowOpenAI]  = useState(false)
  const [copied,      setCopied]      = useState(false)

  const [form, setForm] = useState({
    zapi_instance_id:       '',
    zapi_token:             '',
    zapi_security_token:    '',
    openai_api_key:         '',
    openai_model:           'gpt-4o',
    admin_phone:            '',
    auto_approve_threshold: '0.85',
    base_url:               '',
    webhook_url:            '',
  })

  useEffect(() => {
    api.getSettings()
      .then(s => setForm(f => ({ ...f, ...s })))
      .catch(() => toast.error('Erro ao carregar configurações'))
      .finally(() => setLoading(false))
  }, [])

  function set(key, val) {
    setForm(f => ({ ...f, [key]: val }))
  }

  async function save() {
    if (form.auto_approve_threshold) {
      const t = parseFloat(form.auto_approve_threshold)
      if (isNaN(t) || t < 0 || t > 1) {
        toast.error('Threshold deve ser entre 0.0 e 1.0')
        return
      }
    }
    setSaving(true)
    try {
      await api.saveSettings({
        zapi_instance_id:       form.zapi_instance_id,
        zapi_token:             form.zapi_token,
        zapi_security_token:    form.zapi_security_token,
        openai_api_key:         form.openai_api_key,
        openai_model:           form.openai_model,
        admin_phone:            form.admin_phone,
        auto_approve_threshold: form.auto_approve_threshold,
        base_url:               form.base_url,
      })
      toast.success('Configurações salvas!')
    } catch (e) {
      toast.error(e.message)
    } finally {
      setSaving(false)
    }
  }

  async function testZapi() {
    setTestingZapi(true)
    setZapiStatus(null)
    setZapiDetail(null)
    try {
      const r = await api.testZapi()
      const ok = r.ok && r.connected
      setZapiStatus(ok ? 'ok' : 'error')
      setZapiDetail(ok
        ? `Instância conectada ao WhatsApp ✓`
        : `Status: ${r.status_code} — ${r.data?.message || 'Não conectado'}`
      )
      if (ok) toast.success('ZAPI conectada!')
      else    toast.error('ZAPI não conectada')
    } catch (e) {
      setZapiStatus('error')
      setZapiDetail(e.message)
      toast.error(e.message)
    } finally {
      setTestingZapi(false)
    }
  }

  async function testOpenAI() {
    setTestingAI(true)
    setAiStatus(null)
    setAiDetail(null)
    try {
      const r = await api.testOpenAI()
      setAiStatus('ok')
      setAiDetail(`Modelo ${r.model} respondeu: "${r.reply}"`)
      toast.success('OpenAI conectada!')
    } catch (e) {
      setAiStatus('error')
      setAiDetail(e.message)
      toast.error(e.message)
    } finally {
      setTestingAI(false)
    }
  }

  async function copyWebhook() {
    await navigator.clipboard.writeText(form.webhook_url).catch(() => {})
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 size={22} className="text-ink3 animate-spin" />
      </div>
    )
  }

  return (
    <div className="space-y-4">

      <h2 className="text-[15px] font-black text-ink">Configurações</h2>

      {/* ── ZAPI ──────────────────────────────────────────────────────────── */}
      <Section title="ZAPI — WhatsApp API" icon={Wifi} accent="#10B981">

        {/* Webhook URL (read-only instruction) */}
        <div
          className="rounded-[8px] p-3 space-y-2"
          style={{ background: 'rgba(16,185,129,0.05)', boxShadow: '0 0 0 0.5px rgba(16,185,129,0.18)' }}
        >
          <div className="flex items-start gap-2">
            <Info size={12} className="text-brand mt-0.5 shrink-0" />
            <p className="text-[11px] text-ink2 leading-snug">
              Cole este URL no painel externo da ZAPI em{' '}
              <span className="font-mono text-brand">Webhook → Ao receber → URL</span>:
            </p>
          </div>
          <div className="flex items-center gap-2">
            <code
              className="flex-1 font-mono text-[11px] text-brand truncate px-2 py-1 rounded-[5px]"
              style={{ background: 'rgba(16,185,129,0.08)' }}
            >
              {form.webhook_url || 'http://187.77.242.86/webhook/zapi'}
            </code>
            <button onClick={copyWebhook} className="btn-ghost btn-sm shrink-0">
              {copied ? <Check size={11} className="text-ok" /> : <Copy size={11} />}
            </button>
          </div>
        </div>

        <Field label="Instance ID" hint="Encontrado no painel da ZAPI → Instâncias">
          <input
            className="input"
            placeholder="Ex: 3D8F0B6F3E1..."
            value={form.zapi_instance_id}
            onChange={e => set('zapi_instance_id', e.target.value)}
          />
        </Field>

        <Field label="Token" hint="Token de acesso da instância ZAPI">
          <div className="relative">
            <input
              className="input pr-10"
              type={showToken ? 'text' : 'password'}
              placeholder="Token da instância"
              value={form.zapi_token}
              onChange={e => set('zapi_token', e.target.value)}
            />
            <button
              onClick={() => setShowToken(v => !v)}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-ink4 hover:text-ink3 transition"
            >
              {showToken ? <EyeOff size={14} /> : <Eye size={14} />}
            </button>
          </div>
        </Field>

        <Field label="Security Token (Client-Token)" hint="Token de segurança — header Client-Token">
          <input
            className="input"
            type="password"
            placeholder="Security token"
            value={form.zapi_security_token}
            onChange={e => set('zapi_security_token', e.target.value)}
          />
        </Field>

        <div className="flex items-center gap-3 flex-wrap">
          <button
            onClick={testZapi}
            disabled={testingZapi || !form.zapi_instance_id || !form.zapi_token}
            className="btn-ghost btn-sm"
          >
            {testingZapi ? <Loader2 size={12} className="animate-spin" /> : <Wifi size={12} />}
            Testar conexão
          </button>
          <TestBadge status={zapiStatus} />
        </div>
        {zapiDetail && (
          <p className={`text-[11px] ${zapiStatus === 'ok' ? 'text-ok' : 'text-danger'}`}>
            {zapiDetail}
          </p>
        )}
      </Section>

      {/* ── OpenAI ──────────────────────────────────────────────────────────── */}
      <Section title="OpenAI — Análise com IA" icon={KeyRound} accent="#7C3AED">

        <Field label="API Key" hint="Chave secreta OpenAI — sk-...">
          <div className="relative">
            <input
              className="input pr-10"
              type={showOpenAI ? 'text' : 'password'}
              placeholder="sk-..."
              value={form.openai_api_key}
              onChange={e => set('openai_api_key', e.target.value)}
            />
            <button
              onClick={() => setShowOpenAI(v => !v)}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-ink4 hover:text-ink3 transition"
            >
              {showOpenAI ? <EyeOff size={14} /> : <Eye size={14} />}
            </button>
          </div>
        </Field>

        <Field label="Modelo" hint="Modelo usado para análise de comprovantes">
          <select
            className="input"
            value={form.openai_model}
            onChange={e => set('openai_model', e.target.value)}
          >
            <option value="gpt-4o">gpt-4o (recomendado)</option>
            <option value="gpt-4o-mini">gpt-4o-mini (mais rápido)</option>
            <option value="gpt-4-turbo">gpt-4-turbo</option>
          </select>
        </Field>

        <div className="flex items-center gap-3 flex-wrap">
          <button
            onClick={testOpenAI}
            disabled={testingAI || !form.openai_api_key}
            className="btn-ghost btn-sm"
          >
            {testingAI ? <Loader2 size={12} className="animate-spin" /> : <KeyRound size={12} />}
            Testar API
          </button>
          <TestBadge status={aiStatus} />
        </div>
        {aiDetail && (
          <p className={`text-[11px] ${aiStatus === 'ok' ? 'text-ok' : 'text-danger'}`}>
            {aiDetail}
          </p>
        )}
      </Section>

      {/* ── General settings ─────────────────────────────────────────────────── */}
      <Section title="Configurações Gerais" icon={Settings2}>

        <Field
          label="Telefone do Admin"
          hint="Número que recebe os relatórios automáticos (com DDI, sem +)"
        >
          <input
            className="input font-mono"
            placeholder="5511996554604"
            value={form.admin_phone}
            onChange={e => set('admin_phone', e.target.value)}
          />
        </Field>

        <Field
          label="Limite de Auto-aprovação"
          hint="Confiança mínima para aprovar automaticamente (0.0 a 1.0). Padrão: 0.85"
        >
          <div className="flex items-center gap-3">
            <input
              className="input font-mono w-24"
              type="number"
              min="0"
              max="1"
              step="0.05"
              value={form.auto_approve_threshold}
              onChange={e => set('auto_approve_threshold', e.target.value)}
            />
            <div className="flex-1 space-y-1">
              <div className="h-1.5 rounded-full overflow-hidden" style={{ background: 'rgba(100,150,255,0.10)' }}>
                <div
                  className="h-full rounded-full transition-all duration-300"
                  style={{
                    width: `${Math.min(100, (parseFloat(form.auto_approve_threshold) || 0) * 100)}%`,
                    background: '#10B981',
                  }}
                />
              </div>
              <p className="text-[10px] text-ink4">
                {Math.round((parseFloat(form.auto_approve_threshold) || 0) * 100)}% de confiança
              </p>
            </div>
          </div>
        </Field>

        <Field
          label="URL Base do Servidor"
          hint="Usado para gerar o webhook URL (ex: http://187.77.242.86)"
        >
          <input
            className="input font-mono text-[12px]"
            placeholder="http://187.77.242.86"
            value={form.base_url}
            onChange={e => set('base_url', e.target.value)}
          />
        </Field>
      </Section>

      {/* Score rules info */}
      <div
        className="rounded-[10px] p-3 space-y-2"
        style={{ background: 'rgba(100,150,255,0.03)', boxShadow: '0 0 0 0.5px rgba(100,150,255,0.07)' }}
      >
        <p className="section-title">Regras de Score</p>
        <div className="space-y-1 text-[11px] text-ink3">
          <p>⏰ <span className="text-ok font-semibold">Antes das 12h</span>: streak +1, score +30 (com bônus)</p>
          <p>✅ <span className="text-brand font-semibold">12h–16h</span>: streak +1, score +20 (com bônus)</p>
          <p>🟡 <span className="text-[#FCD34D] font-semibold">16h–23:58</span>: score +5 (sem streak)</p>
          <p>⚠️ <span className="text-[#F59E0B] font-semibold">1 dia atraso</span>: streak = 0, score -50</p>
          <p>❌ <span className="text-danger font-semibold">Não pagou</span>: streak = 0, score -50</p>
          <p>🚨 <span className="text-danger font-semibold">7+ dias</span>: marcado como calote</p>
        </div>
      </div>

      {/* Save button */}
      <button onClick={save} disabled={saving} className="btn-primary w-full">
        {saving ? <Loader2 size={14} className="animate-spin" /> : <CheckCircle size={14} />}
        {saving ? 'Salvando…' : 'Salvar configurações'}
      </button>

    </div>
  )
}
