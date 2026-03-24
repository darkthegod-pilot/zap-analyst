import { useState, useEffect } from 'react'
import {
  FileStack, Users, BarChart3, AlertOctagon,
  TrendingUp, DollarSign, CheckCircle, Clock,
  AlertTriangle, XCircle, Smartphone, Loader2,
  ArrowRight,
} from 'lucide-react'
import toast from 'react-hot-toast'
import { api } from '../api'

const BRL = v => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v ?? 0)

function greet() {
  const h = new Date().getHours()
  if (h < 12) return 'Bom dia'
  if (h < 18) return 'Boa tarde'
  return 'Boa noite'
}

/* ── Quick nav card ──────────────────────────── */
function NavCard({ icon: Icon, title, subtitle, badge, badgeColor, onClick, accent }) {
  return (
    <button
      onClick={onClick}
      className="flex flex-col gap-3 p-4 rounded-[12px] text-left transition-all duration-150 active:scale-[0.98] w-full"
      style={{
        background: accent ? `rgba(${accent},0.06)` : 'var(--panel)',
        boxShadow: accent
          ? `0 0 0 0.5px rgba(${accent},0.20)`
          : '0 0 0 0.5px rgba(var(--accent-rgb),0.07)',
      }}
      onMouseEnter={e => {
        e.currentTarget.style.background = accent
          ? `rgba(${accent},0.10)`
          : 'rgba(var(--accent-rgb),0.05)'
      }}
      onMouseLeave={e => {
        e.currentTarget.style.background = accent
          ? `rgba(${accent},0.06)`
          : 'var(--panel)'
      }}
    >
      <div className="flex items-center justify-between">
        <Icon size={18} style={{ color: accent ? `rgb(${accent})` : 'var(--ink3)' }} />
        {badge != null && (
          <span
            className="text-[10px] font-black px-2 py-0.5 rounded-full"
            style={{
              background: badgeColor ? `rgba(${badgeColor},0.15)` : 'rgba(var(--accent-rgb),0.10)',
              color: badgeColor ? `rgb(${badgeColor})` : 'var(--ink2)',
              boxShadow: badgeColor ? `0 0 0 0.5px rgba(${badgeColor},0.25)` : 'none',
            }}
          >
            {badge}
          </span>
        )}
      </div>
      <div>
        <p className="font-bold text-[14px] text-ink">{title}</p>
        <p className="text-[11px] text-ink3 mt-0.5">{subtitle}</p>
      </div>
      <div
        className="flex items-center gap-1 text-[11px] font-semibold"
        style={{ color: accent ? `rgb(${accent})` : 'var(--ink3)' }}
      >
        <span>Acessar</span>
        <ArrowRight size={11} />
      </div>
    </button>
  )
}

export default function DashboardPage({ stats, onNavigate }) {
  const [data,    setData]    = useState(null)
  const [loading, setLoading] = useState(true)
  const [sending, setSending] = useState(false)

  useEffect(() => {
    api.getReportSummary('today')
      .then(setData)
      .catch(e => toast.error(e.message))
      .finally(() => setLoading(false))
  }, [])

  async function sendNow() {
    setSending(true)
    try {
      await api.sendNow()
      toast.success('Relatório enviado no WhatsApp!', { duration: 5000 })
    } catch (e) {
      toast.error(e.message)
    } finally {
      setSending(false)
    }
  }

  const total     = data?.total     ?? 0
  const approved  = data?.approved  ?? 0
  const approvalRate = total > 0 ? Math.round((approved / total) * 100) : 0

  const today = new Date().toLocaleDateString('pt-BR', {
    weekday: 'long', day: '2-digit', month: 'long',
  })

  return (
    <div className="space-y-5 max-w-3xl">

      {/* Greeting */}
      <div>
        <h2 className="font-black text-[20px] text-ink leading-none">
          {greet()}, DarkCred
        </h2>
        <p className="text-[12px] text-ink3 mt-1 capitalize">{today}</p>
      </div>

      {/* Financial card */}
      {loading ? (
        <div className="skeleton rounded-[14px] h-36" />
      ) : (
        <div
          className="rounded-[14px] p-4 space-y-3"
          style={{
            background: 'rgba(var(--brand-rgb),0.05)',
            boxShadow: '0 0 0 0.5px rgba(var(--brand-rgb),0.20), 0 4px 20px rgba(0,0,0,0.3)',
          }}
        >
          <p className="text-[10px] font-bold uppercase tracking-[0.1em] text-ink3">
            Resumo de hoje
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {/* Total recebido */}
            <div>
              <p className="text-[10px] text-ink3 font-semibold uppercase tracking-wide mb-1">
                Total recebido
              </p>
              <p
                className="font-mono font-black tabular lining leading-none"
                style={{ fontSize: 'clamp(16px, 3vw, 24px)', color: 'var(--brand-hi)' }}
              >
                {BRL(data?.total_amount)}
              </p>
            </div>
            {/* Lucro líquido */}
            <div>
              <p className="text-[10px] text-ink3 font-semibold uppercase tracking-wide mb-1">
                Lucro líquido
              </p>
              <p
                className="font-mono font-black tabular lining leading-none"
                style={{ fontSize: 'clamp(16px, 3vw, 24px)', color: 'var(--brand)' }}
              >
                {BRL(data?.total_profit)}
              </p>
            </div>
          </div>

          {/* Meta row */}
          <div className="flex gap-4 pt-1" style={{ borderTop: '0.5px solid rgba(var(--brand-rgb),0.15)' }}>
            {data?.avg_amount > 0 && (
              <div className="flex items-center gap-1.5">
                <DollarSign size={11} style={{ color: 'var(--ink2)' }} />
                <span className="text-[11px] text-ink3">
                  Ticket: <span className="font-mono font-semibold text-ink">{BRL(data.avg_amount)}</span>
                </span>
              </div>
            )}
            {total > 0 && (
              <div className="flex items-center gap-1.5">
                <TrendingUp size={11} style={{ color: 'var(--ink2)' }} />
                <span className="text-[11px] text-ink3">
                  Aprovação: <span className="font-mono font-semibold" style={{ color: approvalRate >= 70 ? 'var(--brand-hi)' : approvalRate >= 40 ? '#FCD34D' : '#F87171' }}>{approvalRate}%</span>
                </span>
              </div>
            )}
          </div>
        </div>
      )}


      {/* Quick nav grid */}
      {loading ? (
        <div className="grid grid-cols-2 gap-3">
          {[...Array(4)].map((_, i) => <div key={i} className="skeleton rounded-[12px] h-28" />)}
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-3">
          <NavCard
            icon={FileStack}
            title="Comprovantes"
            subtitle="Gerencie recebimentos"
            badge={(stats?.pending ?? 0) > 0 ? `${stats.pending} pendentes` : null}
            badgeColor="245,158,11"
            accent="16,185,129"
            onClick={() => onNavigate('receipts')}
          />
          <NavCard
            icon={Users}
            title="Clientes"
            subtitle={data ? `${data.active_clients} ativos · ${data.calote_clients} calote` : 'Ver todos os clientes'}
            accent="100,150,255"
            onClick={() => onNavigate('clients')}
          />
          <NavCard
            icon={BarChart3}
            title="Relatórios"
            subtitle={data?.total_profit > 0 ? `Lucro: ${BRL(data.total_profit)}` : 'Análises e gráficos'}
            accent="16,185,129"
            onClick={() => onNavigate('reports')}
          />
          <NavCard
            icon={AlertOctagon}
            title="Calote"
            subtitle={data ? `${data.calote_clients} em atraso` : 'Clientes inadimplentes'}
            badge={data?.calote_clients > 0 ? data.calote_clients : null}
            badgeColor="239,68,68"
            accent="239,68,68"
            onClick={() => onNavigate('calote')}
          />
        </div>
      )}

      {/* Send WhatsApp */}
      <button
        onClick={sendNow}
        disabled={sending}
        className="w-full flex items-center justify-center gap-2.5 py-3 rounded-[12px]
                   text-[13px] font-semibold transition-all duration-150 active:scale-[0.98]"
        style={{
          background: sending ? 'rgba(var(--brand-rgb),0.06)' : 'rgba(var(--brand-rgb),0.08)',
          boxShadow: '0 0 0 0.5px rgba(var(--brand-rgb),0.22)',
          color: 'var(--brand-hi)',
        }}
      >
        {sending
          ? <><Loader2 size={14} className="animate-spin" /> Enviando...</>
          : <><Smartphone size={14} /> Enviar relatório no WhatsApp</>
        }
      </button>

      {/* Auto-send note */}
      <p className="text-center text-[11px] text-ink3">
        Relatório automático enviado às{' '}
        <span className="font-mono font-semibold text-brand">00:00</span> BRT
      </p>

    </div>
  )
}
