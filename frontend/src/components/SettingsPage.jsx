import { useState, useEffect } from 'react'
import {
  Loader2, CheckCircle, XCircle, Copy, Check,
  Wifi, KeyRound, Settings2, Info, Eye, EyeOff, Palette,
} from 'lucide-react'
import toast from 'react-hot-toast'
import { api } from '../api'

/* ── Theme Picker ────────────────────────────────── */
const THEME_OPTIONS = [
  {
    id:     'default',
    label:  'Emerald Dark',
    desc:   'Verde esmeralda (padrão)',
    swatch: ['var(--canvas)', 'var(--panel)', 'var(--brand)'],
    font:   'Inter',
  },
  {
    id:     'purple',
    label:  'Purple Dark',
    desc:   'Violeta — moderno',
    swatch: ['#0C0817', '#15102A', '#8B5CF6'],
    font:   'Outfit',
  },
  {
    id:     'corporate',
    label:  'Corporate',
    desc:   'Azul — profissional',
    swatch: ['#0A0D14', '#111827', '#2563EB'],
    font:   'IBM Plex Sans',
  },
  {
    id:     'cyber',
    label:  'Blue Cyber',
    desc:   'Cyan — cibernético',
    swatch: ['#050B12', '#091525', '#06B6D4'],
    font:   'Exo 2',
  },
]

function ThemePicker({ theme, setTheme }) {
  return (
    <div className="grid grid-cols-2 gap-2">
      {THEME_OPTIONS.map(o => {
        const active = theme === o.id
        return (
          <button
            key={o.id}
            onClick={() => setTheme(o.id)}
            className="p-3 text-left transition-all duration-150 active:scale-[0.97]"
            style={{
              borderRadius: 'var(--radius-card)',
              background: active ? `rgba(var(--brand-rgb),0.08)` : o.swatch[1],
              boxShadow: active
                ? `0 0 0 1.5px var(--brand), 0 2px 8px rgba(0,0,0,0.4)`
                : `0 0 0 0.5px rgba(var(--accent-rgb),0.12)`,
            }}
          >
            {/* Color swatches */}
            <div className="flex gap-1 mb-2">
              {o.swatch.map((c, i) => (
                <span
                  key={i}
                  className="w-4 h-4 rounded-full"
                  style={{
                    background: c,
                    boxShadow: i === 2 ? `0 0 5px ${c}88` : 'none',
                  }}
                />
              ))}
            </div>
            <p
              className="font-bold text-[13px] leading-tight"
              style={{ color: active ? 'var(--brand)' : o.swatch[2] }}
            >
              {o.label}
            </p>
            <p className="text-[11px] mt-0.5" style={{ color: 'var(--ink3)' }}>{o.desc}</p>
            <p
              className="text-[10px] mt-1.5 opacity-60"
              style={{ fontFamily: `'${o.font}', sans-serif` }}
            >
              {o.font}
            </p>
          </button>
        )
      })}
    </div>
  )
}

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
function Section({ title, icon: Icon, children, accentColor }) {
  return (
    <div
      className="rounded-[12px] p-4 space-y-4"
      style={{
        background: 'var(--panel)',
        boxShadow: accentColor
          ? `0 0 0 0.5px ${accentColor}33, 0 2px 6px rgba(0,0,0,0.4)`
          : `0 0 0 0.5px rgba(var(--accent-rgb),0.07), 0 2px 6px rgba(0,0,0,0.4)`,
      }}
    >
      <div className="flex items-center gap-2">
        <Icon size={14} style={{ color: accentColor || 'var(--ink2)' }} />
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
        background: ok ? 'rgba(var(--brand-rgb),0.10)' : 'rgba(239,68,68,0.10)',
        color:      ok ? 'var(--brand-hi)'                : '#F87171',
        boxShadow:  ok ? '0 0 0 0.5px rgba(var(--brand-rgb),0.25)' : '0 0 0 0.5px rgba(239,68,68,0.25)',
      }}
    >
      {ok ? <CheckCircle size={11} /> : <XCircle size={11} />}
      {ok ? 'Conectado' : 'Falhou'}
    </div>
  )
}

export default function SettingsPage({ theme, setTheme }) {
  const [loading,     setLoading]     = useState(true)
  const [saving,      setSaving]      = useState(false)
  const [testingZapi, setTestingZapi] = useState(false)
  const [testingAI,   setTestingAI]   = useState(false)
  const [zapiStatus,  setZapiStatus]  = useState(null)
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

      {/* ── Aparência ─────────────────────────────────────────────────────────── */}
      <Section title="Aparência" icon={Palette}>
        <ThemePicker theme={theme} setTheme={setTheme} />
      </Section>

      {/* ── ZAPI ──────────────────────────────────────────────────────────── */}
      <Section title="ZAPI — WhatsApp API" icon={Wifi} accentColor="var(--brand)">

        {/* Webhook URL */}
        <div
          className="rounded-[8px] p-3 space-y-2"
          style={{ background: 'rgba(var(--brand-rgb),0.05)', boxShadow: '0 0 0 0.5px rgba(var(--brand-rgb),0.18)' }}
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
              style={{ background: 'rgba(var(--brand-rgb),0.08)' }}
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
      <Section title="OpenAI — Análise com IA" icon={KeyRound} accentColor="#7C3AED">

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
              <div className="h-1.5 rounded-full overflow-hidden" style={{ background: 'rgba(var(--accent-rgb),0.10)' }}>
                <div
                  className="h-full rounded-full transition-all duration-300"
                  style={{
                    width: `${Math.min(100, (parseFloat(form.auto_approve_threshold) || 0) * 100)}%`,
                    background: 'var(--brand)',
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
        style={{
          background: 'rgba(var(--accent-rgb),0.03)',
          boxShadow: '0 0 0 0.5px rgba(var(--accent-rgb),0.07)',
        }}
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
