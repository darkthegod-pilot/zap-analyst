import { useState, useCallback } from 'react'
import {
  FileStack, Users, BarChart3,
  RefreshCw, CheckCircle, AlertTriangle, Clock, XCircle,
} from 'lucide-react'
import { Toaster } from 'react-hot-toast'
import { usePolling }    from './hooks/usePolling'
import { api }           from './api'
import { presetToDates } from './components/DateFilter'
import ReceiptFeed from './components/ReceiptFeed'
import ClientList  from './components/ClientList'
import ReportChat  from './components/ReportChat'

const TABS = [
  { id: 'receipts', label: 'Comprovantes', Icon: FileStack  },
  { id: 'clients',  label: 'Clientes',     Icon: Users      },
  { id: 'reports',  label: 'Relatórios',   Icon: BarChart3  },
]

const TODAY = presetToDates('today')

/* ── Stat pill ───────────────────────────────────── */
function StatPill({ Icon, value, label, color, bg, shadow }) {
  return (
    <div
      className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full shrink-0"
      style={{ background: bg, boxShadow: shadow }}
    >
      <Icon size={12} style={{ color }} />
      <span className="font-mono text-[13px] font-bold tabular lining" style={{ color }}>
        {value ?? <span style={{ opacity: 0.4 }}>—</span>}
      </span>
      <span className="text-[10px] font-semibold text-ink3 uppercase tracking-wide">{label}</span>
    </div>
  )
}

export default function App() {
  const [tab,      setTab]      = useState('receipts')
  const [stats,    setStats]    = useState(null)
  const [online,   setOnline]   = useState(true)
  const [spin,     setSpin]     = useState(false)
  const [dateCtx,  setDateCtx]  = useState({ preset: 'today', ...TODAY })

  const refresh = useCallback(async () => {
    try {
      const s = await api.getStats({
        date_from: dateCtx.date_from,
        date_to:   dateCtx.date_to,
      })
      setStats(s)
      setOnline(true)
    } catch {
      setOnline(false)
    }
  }, [dateCtx.date_from, dateCtx.date_to])

  usePolling(refresh, 6000)

  async function manualRefresh() {
    setSpin(true)
    await refresh()
    setTimeout(() => setSpin(false), 500)
  }

  return (
    <div className="min-h-dvh flex flex-col" style={{ background: '#080D18', color: '#E8EEF8' }}>

      {/* ── Toast ─────────────────────────────────────── */}
      <Toaster
        position="top-center"
        toastOptions={{
          duration: 3000,
          style: {
            background: '#0D1525',
            border: '0.5px solid rgba(100,150,255,0.12)',
            color: '#E8EEF8',
            borderRadius: '8px',
            fontFamily: 'Inter,sans-serif',
            fontSize: '13px',
            boxShadow: '0 4px 16px rgba(0,0,0,0.5)',
          },
          success: { iconTheme: { primary: '#10B981', secondary: '#080D18' } },
          error:   { iconTheme: { primary: '#EF4444', secondary: '#080D18' } },
        }}
      />

      {/* ── Header ─────────────────────────────────────── */}
      <header
        className="sticky top-0 z-40"
        style={{
          background: 'rgba(8,13,24,0.92)',
          backdropFilter: 'blur(20px)',
          borderBottom: '0.5px solid rgba(100,150,255,0.09)',
        }}
      >
        {/* Top bar */}
        <div className="flex items-center gap-3 px-4 py-3">

          {/* Logo */}
          <div
            className="w-9 h-9 rounded-[9px] flex items-center justify-center shrink-0"
            style={{
              background: 'rgba(16,185,129,0.10)',
              boxShadow: '0 0 0 1px rgba(16,185,129,0.25), 0 0 16px rgba(16,185,129,0.08)',
            }}
          >
            <span
              className="font-mono font-black text-[11px] tracking-tight"
              style={{ color: '#10B981' }}
            >DC</span>
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-baseline gap-2">
              <h1 className="font-black text-[15px] text-ink leading-none">DarkCred</h1>
              <span className="text-[11px] text-ink3 hidden xs:inline font-medium">
                ZAP Analyst
              </span>
            </div>
          </div>

          {/* Connection status */}
          <div
            className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold"
            style={{
              background: online ? 'rgba(16,185,129,0.08)' : 'rgba(239,68,68,0.08)',
              boxShadow:  online ? '0 0 0 0.5px rgba(16,185,129,0.22)' : '0 0 0 0.5px rgba(239,68,68,0.22)',
              color:      online ? '#34D399' : '#F87171',
            }}
          >
            {online ? <span className="dot-live" /> : <span className="w-1.5 h-1.5 rounded-full bg-danger" />}
            <span className="hidden xs:inline">{online ? 'Online' : 'Offline'}</span>
          </div>

          <button
            onClick={manualRefresh}
            className="btn-ghost"
            aria-label="Atualizar"
          >
            <RefreshCw size={13} className={spin ? 'animate-spin' : ''} />
          </button>
        </div>

        {/* Stats strip */}
        <div
          className="px-4 pb-3 flex gap-2 overflow-x-auto scrollbar-hide"
          style={{ scrollbarWidth: 'none' }}
        >
          <StatPill
            Icon={FileStack}
            value={stats?.total}
            label="total"
            color="#7A8DB5"
            bg="rgba(100,150,255,0.05)"
            shadow="0 0 0 0.5px rgba(100,150,255,0.09)"
          />
          <StatPill
            Icon={CheckCircle}
            value={stats?.approved}
            label="aprov."
            color="#34D399"
            bg="rgba(16,185,129,0.08)"
            shadow="0 0 0 0.5px rgba(16,185,129,0.20)"
          />
          <StatPill
            Icon={AlertTriangle}
            value={stats?.suspicious}
            label="susp."
            color="#FCD34D"
            bg="rgba(245,158,11,0.08)"
            shadow="0 0 0 0.5px rgba(245,158,11,0.20)"
          />
          <StatPill
            Icon={Clock}
            value={stats?.pending}
            label="pend."
            color="#7A8DB5"
            bg="rgba(75,94,138,0.08)"
            shadow="0 0 0 0.5px rgba(75,94,138,0.20)"
          />
          <StatPill
            Icon={XCircle}
            value={stats?.rejected}
            label="rejeit."
            color="#F87171"
            bg="rgba(239,68,68,0.08)"
            shadow="0 0 0 0.5px rgba(239,68,68,0.20)"
          />
        </div>

        {/* Desktop tab bar */}
        <div
          className="hidden md:flex px-4 gap-1"
          style={{ borderTop: '0.5px solid rgba(100,150,255,0.07)' }}
        >
          {TABS.map(({ id, label, Icon }) => (
            <button
              key={id}
              onClick={() => setTab(id)}
              className="flex items-center gap-2 px-4 py-3 text-[13px] font-semibold
                         border-b-2 transition-all duration-150"
              style={{
                borderColor: tab === id ? '#10B981' : 'transparent',
                color:        tab === id ? '#10B981' : '#3D4E72',
              }}
            >
              <Icon size={14} />
              {label}
              {id === 'receipts' && (stats?.pending ?? 0) > 0 && (
                <span
                  className="text-[10px] font-bold px-1.5 py-0.5 rounded-full"
                  style={{
                    background: 'rgba(245,158,11,0.15)',
                    color: '#FCD34D',
                    boxShadow: '0 0 0 0.5px rgba(245,158,11,0.25)',
                  }}
                >
                  {stats.pending}
                </span>
              )}
            </button>
          ))}
        </div>
      </header>

      {/* ── Content ────────────────────────────────────── */}
      <main className="flex-1 w-full max-w-2xl mx-auto px-4 py-5 pb-24 md:pb-8 animate-fade-in">
        {tab === 'receipts' && (
          <ReceiptFeed
            globalDate={dateCtx}
            onDateChange={setDateCtx}
            onRefreshStats={refresh}
          />
        )}
        {tab === 'clients' && <ClientList />}
        {tab === 'reports' && <ReportChat />}
      </main>

      {/* ── Mobile bottom nav ──────────────────────────── */}
      <nav
        className="md:hidden fixed bottom-0 inset-x-0 z-40 pb-safe"
        style={{
          background: 'rgba(8,13,24,0.96)',
          backdropFilter: 'blur(20px)',
          borderTop: '0.5px solid rgba(100,150,255,0.09)',
        }}
      >
        <div className="flex justify-around py-1">
          {TABS.map(({ id, label, Icon }) => (
            <button
              key={id}
              onClick={() => setTab(id)}
              className={tab === id ? 'nav-item-active' : 'nav-item'}
            >
              <div className="relative">
                <Icon size={22} />
                {id === 'receipts' && (stats?.pending ?? 0) > 0 && (
                  <span
                    className="absolute -top-1 -right-2 min-w-4 h-4 flex items-center justify-center
                               rounded-full text-[9px] font-black px-1"
                    style={{
                      background: '#F59E0B',
                      color: '#080D18',
                    }}
                  >
                    {stats.pending > 9 ? '9+' : stats.pending}
                  </span>
                )}
              </div>
              {label}
            </button>
          ))}
        </div>
      </nav>

    </div>
  )
}
