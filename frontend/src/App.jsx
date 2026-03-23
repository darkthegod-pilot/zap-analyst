import { useState, useCallback } from 'react'
import {
  FileText, Users, BarChart3,
  RefreshCw, Wifi, WifiOff, AlertTriangle,
} from 'lucide-react'
import { Toaster } from 'react-hot-toast'
import { usePolling } from './hooks/usePolling'
import { api } from './api'
import { presetToDates } from './components/DateFilter'
import ReceiptFeed  from './components/ReceiptFeed'
import ClientList   from './components/ClientList'
import ReportChat   from './components/ReportChat'

const TABS = [
  { id: 'receipts', label: 'Comprovantes', Icon: FileText  },
  { id: 'clients',  label: 'Clientes',     Icon: Users     },
  { id: 'reports',  label: 'Relatórios',   Icon: BarChart3 },
]

const TODAY = presetToDates('today')

export default function App() {
  const [tab,       setTab]       = useState('receipts')
  const [stats,     setStats]     = useState(null)
  const [connected, setConnected] = useState(true)
  const [spinning,  setSpinning]  = useState(false)

  // Global date filter shared across header stats
  const [dateFilter, setDateFilter] = useState({ preset: 'today', ...TODAY })

  const refreshStats = useCallback(async () => {
    try {
      const s = await api.getStats({
        date_from: dateFilter.date_from,
        date_to:   dateFilter.date_to,
      })
      setStats(s)
      setConnected(true)
    } catch {
      setConnected(false)
    }
  }, [dateFilter.date_from, dateFilter.date_to])

  usePolling(refreshStats, 6000)

  async function handleManualRefresh() {
    setSpinning(true)
    await refreshStats()
    setTimeout(() => setSpinning(false), 600)
  }

  return (
    <div className="min-h-dvh flex flex-col bg-[#0a0a0f] text-ink">
      <Toaster
        position="top-center"
        toastOptions={{
          style: {
            background: '#1a1a26',
            border: '1px solid #2a2a3a',
            color: '#f0f0f8',
            borderRadius: '0.75rem',
            fontFamily: 'Inter, sans-serif',
            fontSize: '0.875rem',
          },
          success: { iconTheme: { primary: '#00ff88', secondary: '#0a0a0f' } },
          error:   { iconTheme: { primary: '#ff4466', secondary: '#0a0a0f' } },
        }}
      />

      {/* ── Sticky Header ──────────────────────────────────────────── */}
      <header className="sticky top-0 z-40 bg-[#0a0a0f]/90 backdrop-blur-xl border-b border-surface-border">
        <div className="max-w-3xl mx-auto px-4 py-3 flex items-center gap-3">

          {/* Logo */}
          <div className="shrink-0 w-9 h-9 rounded-xl bg-brand-dim border border-brand/30 flex items-center justify-center glow-brand">
            <span className="text-brand font-black text-sm tracking-tight">DC</span>
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-baseline gap-2">
              <h1 className="font-black text-base text-ink leading-none">DarkCred</h1>
              <span className="text-xs text-ink-muted hidden xs:inline">ZAP Analyst</span>
            </div>
          </div>

          {/* Connection + refresh */}
          <div className="flex items-center gap-2 shrink-0">
            <div className={`flex items-center gap-1.5 text-xs font-medium px-2 py-1 rounded-lg border ${
              connected
                ? 'bg-status-approved-bg border-status-approved-border text-status-approved'
                : 'bg-status-rejected-bg border-status-rejected-border text-status-rejected'
            }`}>
              {connected
                ? <Wifi size={12} />
                : <WifiOff size={12} />}
              <span className="hidden xs:inline">{connected ? 'Online' : 'Offline'}</span>
            </div>
            <button
              onClick={handleManualRefresh}
              className="btn-ghost py-1.5 px-2"
              aria-label="Atualizar"
            >
              <RefreshCw size={14} className={spinning ? 'animate-spin' : ''} />
            </button>
          </div>
        </div>

        {/* ── Stats strip ──────────────────────────────────────────── */}
        <div className="border-t border-surface-border bg-[#0d0d14]/80">
          <div className="max-w-3xl mx-auto px-4 py-2.5 grid grid-cols-4 gap-2">
            {[
              { label: 'Total',     value: stats?.total,      color: 'text-ink' },
              { label: 'Aprovados', value: stats?.approved,   color: 'text-status-approved' },
              { label: 'Suspeitos', value: stats?.suspicious, color: 'text-status-suspicious' },
              { label: 'Rejeitados',value: stats?.rejected,   color: 'text-status-rejected' },
            ].map(({ label, value, color }) => (
              <div key={label} className="text-center">
                <p className={`text-lg font-black tabular-nums leading-none ${color}`}>
                  {value ?? <span className="opacity-30">—</span>}
                </p>
                <p className="text-2xs text-ink-muted mt-0.5 leading-none">{label}</p>
              </div>
            ))}
          </div>
        </div>

        {/* ── Desktop tab bar ───────────────────────────────────────── */}
        <div className="hidden md:block border-t border-surface-border">
          <div className="max-w-3xl mx-auto px-4 flex gap-1">
            {TABS.map(({ id, label, Icon }) => (
              <button
                key={id}
                onClick={() => setTab(id)}
                className={`flex items-center gap-2 px-4 py-3 text-sm font-semibold border-b-2 transition-all ${
                  tab === id
                    ? 'border-brand text-brand'
                    : 'border-transparent text-ink-secondary hover:text-ink'
                }`}
              >
                <Icon size={15} />
                {label}
                {id === 'receipts' && stats?.pending > 0 && (
                  <span className="tag bg-status-suspicious-bg text-status-suspicious border-status-suspicious-border text-2xs">
                    {stats.pending}
                  </span>
                )}
              </button>
            ))}
          </div>
        </div>
      </header>

      {/* ── Main content ──────────────────────────────────────────── */}
      <main className="flex-1 max-w-3xl w-full mx-auto px-4 py-5 pb-24 md:pb-8 page-enter">
        {tab === 'receipts' && (
          <ReceiptFeed
            globalDateFilter={dateFilter}
            onDateFilterChange={setDateFilter}
            onStatsRefresh={refreshStats}
          />
        )}
        {tab === 'clients' && (
          <ClientList />
        )}
        {tab === 'reports' && (
          <ReportChat />
        )}
      </main>

      {/* ── Mobile bottom nav ─────────────────────────────────────── */}
      <nav className="md:hidden fixed bottom-0 inset-x-0 z-40 bg-[#0a0a0f]/95 backdrop-blur-xl border-t border-surface-border pb-safe">
        <div className="flex justify-around py-1">
          {TABS.map(({ id, label, Icon }) => (
            <button
              key={id}
              onClick={() => setTab(id)}
              className={tab === id ? 'nav-item-active' : 'nav-item'}
            >
              <div className="relative">
                <Icon size={22} />
                {id === 'receipts' && stats?.pending > 0 && (
                  <span className="absolute -top-1 -right-1 w-4 h-4 bg-status-suspicious text-[#0a0a0f] rounded-full flex items-center justify-center text-2xs font-black">
                    {stats.pending > 9 ? '9+' : stats.pending}
                  </span>
                )}
              </div>
              {label}
            </button>
          ))}
        </div>
      </nav>

      {/* Offline banner */}
      {!connected && (
        <div className="fixed top-20 inset-x-4 z-50 animate-slide-up">
          <div className="max-w-3xl mx-auto bg-status-rejected-bg border border-status-rejected-border rounded-xl p-3 flex items-center gap-2 text-status-rejected text-sm font-medium">
            <AlertTriangle size={16} />
            Sem conexão com o servidor — tentando reconectar…
          </div>
        </div>
      )}
    </div>
  )
}
