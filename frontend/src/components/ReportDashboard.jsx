import { useState, useEffect, useCallback } from 'react'
import {
  BarChart, Bar, LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend,
} from 'recharts'
import {
  Smartphone, Loader2, CheckCircle, XCircle, AlertTriangle, Clock,
  TrendingUp, Users, DollarSign, Percent,
} from 'lucide-react'
import toast from 'react-hot-toast'
import { api } from '../api'

const PERIODS = [
  { id: 'today',     label: 'Hoje'    },
  { id: 'yesterday', label: 'Ontem'   },
  { id: 'week',      label: '7 dias'  },
  { id: 'month',     label: '30 dias' },
]

/* ── Mini stat card ──────────────────────────────── */
function StatCard({ icon: Icon, value, label, color, bg, shadow }) {
  return (
    <div
      className="rounded-[10px] p-3 flex flex-col gap-1.5"
      style={{ background: bg, boxShadow: shadow }}
    >
      <div className="flex items-center gap-2">
        <Icon size={13} style={{ color }} />
        <span className="text-[10px] font-semibold text-ink3 uppercase tracking-wide">{label}</span>
      </div>
      <p className="font-mono font-black text-[22px] tabular lining leading-none" style={{ color }}>
        {value ?? <span style={{ opacity: 0.3 }}>—</span>}
      </p>
    </div>
  )
}

/* ── Custom tooltip ──────────────────────────────── */
function CustomTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null
  return (
    <div
      className="rounded-[8px] px-3 py-2 text-[12px]"
      style={{
        background: '#121D35',
        boxShadow: '0 0 0 0.5px rgba(100,150,255,0.15), 0 4px 12px rgba(0,0,0,0.5)',
      }}
    >
      <p className="font-semibold text-ink mb-1">{label}</p>
      {payload.map(p => (
        <div key={p.name} className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full" style={{ background: p.color }} />
          <span className="text-ink3">{p.name}:</span>
          <span className="font-bold text-ink">{p.value}</span>
        </div>
      ))}
    </div>
  )
}

export default function ReportDashboard() {
  const [period,  setPeriod]  = useState('today')
  const [data,    setData]    = useState(null)
  const [loading, setLoading] = useState(true)
  const [sending, setSending] = useState(false)
  const [copied,  setCopied]  = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const r = await api.getReportSummary(period)
      setData(r)
    } catch (e) {
      toast.error(e.message)
    } finally {
      setLoading(false)
    }
  }, [period])

  useEffect(() => { load() }, [load])

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

  // Format daily chart labels
  const dailyData = (data?.daily ?? []).map(d => ({
    ...d,
    name: period === 'today' || period === 'yesterday'
      ? new Date(d.date + 'T12:00:00').toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })
      : new Date(d.date + 'T12:00:00').toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' }),
  }))

  // Hourly chart (only for today/yesterday)
  const hourlyData = (data?.hourly ?? []).filter(h => h.total > 0 || data?.period === 'today')
    .map(h => ({
      ...h,
      name: `${String(h.hour).padStart(2, '0')}h`,
    }))

  const showHourly = (period === 'today' || period === 'yesterday') && (data?.hourly?.some(h => h.total > 0))

  return (
    <div className="space-y-4">

      {/* Header + send button */}
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-[15px] font-black text-ink">Relatórios</h2>
        <button onClick={sendNow} disabled={sending} className="btn-primary btn-sm shrink-0">
          {sending ? <Loader2 size={12} className="animate-spin" /> : <Smartphone size={12} />}
          Enviar no WhatsApp
        </button>
      </div>

      {/* Period tabs */}
      <div
        className="flex rounded-[10px] p-1 gap-1"
        style={{ background: '#0D1525', boxShadow: '0 0 0 0.5px rgba(100,150,255,0.07)' }}
      >
        {PERIODS.map(p => (
          <button
            key={p.id}
            onClick={() => setPeriod(p.id)}
            className="flex-1 py-2 rounded-[8px] text-[12px] font-semibold transition-all duration-150"
            style={{
              background: period === p.id ? 'rgba(16,185,129,0.12)' : 'transparent',
              color:      period === p.id ? '#10B981'               : '#3D4E72',
              boxShadow:  period === p.id ? '0 0 0 0.5px rgba(16,185,129,0.25)' : 'none',
            }}
          >
            {p.label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="space-y-3">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="skeleton rounded-[10px] h-20" />
          ))}
        </div>
      ) : data ? (
        <>
          {/* Financial cards row */}
          {(() => {
            const BRL = v => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v ?? 0)
            const approvalRate = data.total > 0 ? Math.round((data.approved / data.total) * 100) : 0
            const rateColor = approvalRate >= 70 ? '#34D399' : approvalRate >= 40 ? '#FCD34D' : '#F87171'
            return (
              <div className="space-y-2">
                {/* Total + Lucro */}
                <div className="grid grid-cols-2 gap-2">
                  <div
                    className="rounded-[12px] p-4"
                    style={{ background: 'rgba(16,185,129,0.07)', boxShadow: '0 0 0 0.5px rgba(16,185,129,0.22)' }}
                  >
                    <div className="flex items-center gap-1.5 mb-2">
                      <DollarSign size={12} style={{ color: '#34D399' }} />
                      <p className="text-[10px] font-semibold text-ink3 uppercase tracking-wide">Total recebido</p>
                    </div>
                    <p className="font-mono font-black text-[22px] tabular lining leading-none" style={{ color: '#34D399' }}>
                      {BRL(data.total_amount)}
                    </p>
                    {data.avg_amount > 0 && (
                      <p className="text-[10px] text-ink3 mt-1.5">
                        Ticket médio: <span className="font-semibold text-ink">{BRL(data.avg_amount)}</span>
                      </p>
                    )}
                  </div>
                  <div
                    className="rounded-[12px] p-4"
                    style={{ background: 'rgba(5,150,105,0.09)', boxShadow: '0 0 0 0.5px rgba(5,150,105,0.30)' }}
                  >
                    <div className="flex items-center gap-1.5 mb-2">
                      <TrendingUp size={12} style={{ color: '#10B981' }} />
                      <p className="text-[10px] font-semibold text-ink3 uppercase tracking-wide">Lucro líquido</p>
                    </div>
                    <p className="font-mono font-black text-[22px] tabular lining leading-none" style={{ color: '#10B981' }}>
                      {BRL(data.total_profit)}
                    </p>
                    <p className="text-[10px] text-ink3 mt-1.5">Margem de 56%</p>
                  </div>
                </div>

                {/* Approval rate bar */}
                {data.total > 0 && (
                  <div
                    className="rounded-[10px] px-4 py-3 flex items-center gap-4"
                    style={{ background: '#0D1525', boxShadow: '0 0 0 0.5px rgba(100,150,255,0.07)' }}
                  >
                    <Percent size={14} style={{ color: rateColor, flexShrink: 0 }} />
                    <div className="flex-1">
                      <div className="flex items-center justify-between mb-1.5">
                        <span className="text-[10px] font-semibold text-ink3 uppercase tracking-wide">Taxa de aprovação</span>
                        <span className="font-mono font-black text-[14px]" style={{ color: rateColor }}>{approvalRate}%</span>
                      </div>
                      <div className="h-1.5 rounded-full" style={{ background: 'rgba(100,150,255,0.08)' }}>
                        <div
                          className="h-full rounded-full transition-all duration-500"
                          style={{ width: `${approvalRate}%`, background: rateColor, boxShadow: `0 0 6px ${rateColor}55` }}
                        />
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )
          })()}

          {/* Stat cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
            <StatCard icon={CheckCircle}   value={data.approved}   label="Aprovados"  color="#34D399" bg="rgba(16,185,129,0.06)" shadow="0 0 0 0.5px rgba(16,185,129,0.18)" />
            <StatCard icon={XCircle}       value={data.rejected}   label="Rejeitados" color="#F87171" bg="rgba(239,68,68,0.06)"  shadow="0 0 0 0.5px rgba(239,68,68,0.18)"  />
            <StatCard icon={AlertTriangle} value={data.suspicious} label="Suspeitos"  color="#FCD34D" bg="rgba(245,158,11,0.06)" shadow="0 0 0 0.5px rgba(245,158,11,0.18)" />
            <StatCard icon={Clock}         value={data.pending}    label="Pendentes"  color="#7A8DB5" bg="rgba(75,94,138,0.06)"  shadow="0 0 0 0.5px rgba(75,94,138,0.18)"  />
          </div>

          {/* Extra stats */}
          <div
            className="rounded-[10px] p-2 md:p-3 grid grid-cols-3 gap-1.5 md:gap-3"
            style={{ background: '#0D1525', boxShadow: '0 0 0 0.5px rgba(100,150,255,0.07)' }}
          >
            <div className="text-center py-1">
              <p className="font-mono font-black text-[15px] md:text-[18px] tabular" style={{ color: '#10B981' }}>
                {data.total}
              </p>
              <p className="text-[9px] text-ink3 uppercase tracking-wide mt-0.5">Total</p>
            </div>
            <div className="text-center py-1">
              <p className="font-mono font-black text-[15px] md:text-[18px] tabular" style={{ color: '#7A8DB5' }}>
                {data.auto_approved}
              </p>
              <p className="text-[9px] text-ink3 uppercase tracking-wide mt-0.5">Auto-apr.</p>
            </div>
            <div className="text-center py-1">
              <p className="font-mono font-black text-[15px] md:text-[18px] tabular" style={{ color: '#F87171' }}>
                {data.duplicates}
              </p>
              <p className="text-[9px] text-ink3 uppercase tracking-wide mt-0.5">Duplic.</p>
            </div>
          </div>

          {/* Daily bar chart */}
          {dailyData.length > 1 && (
            <div
              className="rounded-[10px] p-4 space-y-3"
              style={{ background: '#0D1525', boxShadow: '0 0 0 0.5px rgba(100,150,255,0.07)' }}
            >
              <p className="section-title flex items-center gap-1.5">
                <TrendingUp size={11} /> Comprovantes por dia
              </p>
              <ResponsiveContainer width="100%" height={180}>
                <BarChart data={dailyData} barCategoryGap="35%">
                  <XAxis
                    dataKey="name"
                    tick={{ fontSize: 9, fill: '#3D4E72' }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <YAxis hide allowDecimals={false} />
                  <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(100,150,255,0.04)' }} />
                  <Legend
                    wrapperStyle={{ fontSize: '10px', paddingTop: '8px' }}
                    formatter={v => <span style={{ color: '#7A8DB5' }}>{v}</span>}
                  />
                  <Bar dataKey="approved"   name="Aprovados"  fill="#10B981" radius={[3,3,0,0]} />
                  <Bar dataKey="rejected"   name="Rejeitados" fill="#EF4444" radius={[3,3,0,0]} />
                  <Bar dataKey="suspicious" name="Suspeitos"  fill="#F59E0B" radius={[3,3,0,0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}

          {/* Hourly line chart */}
          {showHourly && (
            <div
              className="rounded-[10px] p-4 space-y-3"
              style={{ background: '#0D1525', boxShadow: '0 0 0 0.5px rgba(100,150,255,0.07)' }}
            >
              <p className="section-title flex items-center gap-1.5">
                <TrendingUp size={11} /> Distribuição por hora
              </p>
              <ResponsiveContainer width="100%" height={120}>
                <LineChart data={hourlyData}>
                  <XAxis
                    dataKey="name"
                    tick={{ fontSize: 9, fill: '#3D4E72' }}
                    axisLine={false}
                    tickLine={false}
                    interval={3}
                  />
                  <YAxis hide allowDecimals={false} />
                  <Tooltip content={<CustomTooltip />} cursor={{ stroke: 'rgba(16,185,129,0.2)' }} />
                  <Line
                    type="monotone"
                    dataKey="total"
                    name="Total"
                    stroke="#10B981"
                    strokeWidth={2}
                    dot={false}
                    activeDot={{ r: 4, fill: '#10B981' }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          )}

          {/* Clients summary */}
          <div
            className="rounded-[10px] p-3 flex items-center gap-4"
            style={{ background: '#0D1525', boxShadow: '0 0 0 0.5px rgba(100,150,255,0.07)' }}
          >
            <Users size={14} className="text-ink3 shrink-0" />
            <div className="flex-1 grid grid-cols-3 gap-2 text-center">
              <div>
                <p className="font-mono font-black text-[16px]" style={{ color: '#7A8DB5' }}>
                  {data.total_clients}
                </p>
                <p className="text-[9px] text-ink4 uppercase tracking-wide">Total</p>
              </div>
              <div>
                <p className="font-mono font-black text-[16px]" style={{ color: '#34D399' }}>
                  {data.active_clients}
                </p>
                <p className="text-[9px] text-ink4 uppercase tracking-wide">Ativos</p>
              </div>
              <div>
                <p className="font-mono font-black text-[16px]" style={{ color: '#F87171' }}>
                  {data.calote_clients}
                </p>
                <p className="text-[9px] text-ink4 uppercase tracking-wide">Calote</p>
              </div>
            </div>
          </div>

          {/* Auto-send note */}
          <div
            className="rounded-[8px] p-3 flex items-center gap-2.5 text-[11px]"
            style={{
              background: 'rgba(16,185,129,0.04)',
              boxShadow: '0 0 0 0.5px rgba(16,185,129,0.12)',
            }}
          >
            <Smartphone size={12} className="text-brand shrink-0" />
            <span className="text-ink3">
              Relatório automático enviado diariamente às{' '}
              <span className="font-mono font-bold text-brand">00:00</span> BRT
            </span>
          </div>
        </>
      ) : null}
    </div>
  )
}
