import { useState, useCallback, useEffect, useRef } from 'react'
import {
  FileStack, Users, BarChart3, AlertOctagon, Settings,
  RefreshCw, CheckCircle, AlertTriangle, Clock, XCircle,
  LogOut, ChevronDown, LayoutDashboard, Menu, Loader2, Check, AlertCircle,
} from 'lucide-react'
import { Toaster } from 'react-hot-toast'
import { usePolling }    from './hooks/usePolling'
import { useTheme }      from './hooks/useTheme'
import { api }           from './api'
import { presetToDates } from './components/DateFilter'
import DashboardPage   from './components/DashboardPage'
import ReceiptFeed     from './components/ReceiptFeed'
import ClientList      from './components/ClientList'
import ReportDashboard from './components/ReportDashboard'
import CalotePage      from './components/CalotePage'
import SettingsPage    from './components/SettingsPage'
import PinLock         from './components/PinLock'

const NAV_TABS = [
  { id: 'home',     label: 'Home',         Icon: LayoutDashboard },
  { id: 'receipts', label: 'Comprovantes', Icon: FileStack        },
  { id: 'clients',  label: 'Clientes',     Icon: Users            },
  { id: 'reports',  label: 'Relatórios',   Icon: BarChart3        },
  { id: 'calote',   label: 'Calote',       Icon: AlertOctagon     },
]

const TODAY = presetToDates('today')

/* ── Stat pill ───────────────────────────────────── */
function StatPill({ Icon, value, label, color, bg, shadow }) {
  return (
    <div
      className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full shrink-0"
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

/* ── Avatar dropdown ─────────────────────────────── */
function AvatarMenu({ onLogout, onSettings }) {
  const [open, setOpen] = useState(false)
  const ref = useRef(null)

  useEffect(() => {
    function handler(e) {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen(v => !v)}
        className="avatar-btn"
        aria-label="Menu do usuário"
      >
        <span
          className="w-8 h-8 rounded-full flex items-center justify-center font-mono font-black text-[11px]"
          style={{
            background: 'rgba(var(--brand-rgb),0.12)',
            boxShadow: '0 0 0 1.5px rgba(var(--brand-rgb),0.30)',
            color: 'var(--brand)',
          }}
        >DC</span>
        <ChevronDown
          size={12}
          className="text-ink3 transition-transform duration-150"
          style={{ transform: open ? 'rotate(180deg)' : 'rotate(0deg)' }}
        />
      </button>

      {open && (
        <div
          className="avatar-dropdown"
          role="menu"
        >
          <div className="px-3 py-2 border-b" style={{ borderColor: 'rgba(var(--accent-rgb),0.08)' }}>
            <p className="text-[11px] font-bold text-ink">DarkCred</p>
            <p className="text-[10px] text-ink3">ZAP Analyst</p>
          </div>

          <button
            className="dropdown-item"
            onClick={() => { setOpen(false); onSettings() }}
          >
            <Settings size={13} />
            Configurações
          </button>

          <div className="my-1" style={{ borderTop: '0.5px solid rgba(var(--accent-rgb),0.08)' }} />

          <button
            className="dropdown-item text-danger"
            onClick={() => { setOpen(false); onLogout() }}
          >
            <LogOut size={13} />
            Sair
          </button>
        </div>
      )}
    </div>
  )
}

export default function App() {
  const [tab,         setTab]         = useState('home')
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [stats,    setStats]    = useState(null)
  const [online,   setOnline]   = useState(true)
  const [updateState, setUpdateState] = useState('idle') // idle|checking|updating|done|up_to_date|error
  const [dateCtx,  setDateCtx]  = useState({ preset: 'today', ...TODAY })
  const [unlocked, setUnlocked] = useState(false)
  const [authChecked, setAuthChecked] = useState(false)
  const [theme, setTheme] = useTheme()

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'instant' })
  }, [tab])

  // Verify stored token on mount
  useEffect(() => {
    const token = localStorage.getItem('dc_auth_token')
    if (!token) { setAuthChecked(true); return }
    api.checkToken(token)
      .then(() => setUnlocked(true))
      .catch(() => { localStorage.removeItem('dc_auth_token') })
      .finally(() => setAuthChecked(true))
  }, [])

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

  async function handleUpdate() {
    setUpdateState('checking')
    try {
      const r = await api.systemUpdate()
      if (r.status === 'up_to_date') {
        setUpdateState('up_to_date')
        setTimeout(() => setUpdateState('idle'), 3000)
        return
      }
      if (r.status === 'updating') {
        setUpdateState('updating')
        const target = r.to
        let attempts = 0
        const poll = setInterval(async () => {
          attempts++
          try {
            const v = await api.systemVersion()
            if (v.commit === target || attempts > 90) {
              clearInterval(poll)
              setUpdateState('done')
              setTimeout(() => setUpdateState('idle'), 4000)
            }
          } catch { /* container reiniciando */ }
        }, 2000)
        return
      }
      setUpdateState('error')
    } catch {
      setUpdateState('error')
    }
    setTimeout(() => setUpdateState('idle'), 3000)
  }

  function handleLogout() {
    localStorage.removeItem('dc_auth_token')
    setUnlocked(false)
  }

  const currentTabLabel = [...NAV_TABS, { id: 'settings', label: 'Configurações' }]
    .find(t => t.id === tab)?.label ?? 'Home'

  if (!authChecked) return null
  if (!unlocked) return <PinLock onUnlock={() => setUnlocked(true)} />

  return (
    <div className="min-h-dvh flex" style={{ background: 'var(--canvas)', color: 'var(--ink)' }}>

      {/* ── Toast ─────────────────────────────────────── */}
      <Toaster
        position="top-center"
        toastOptions={{
          duration: 3000,
          style: {
            background: 'var(--panel)',
            border: '0.5px solid rgba(var(--accent-rgb),0.12)',
            color: 'var(--ink)',
            borderRadius: '8px',
            fontFamily: 'Inter,sans-serif',
            fontSize: '13px',
            boxShadow: '0 4px 16px rgba(0,0,0,0.5)',
          },
          success: { iconTheme: { primary: 'var(--brand)', secondary: 'var(--canvas)' } },
          error:   { iconTheme: { primary: '#EF4444', secondary: 'var(--canvas)' } },
        }}
      />

      {/* ── Sidebar backdrop (mobile only) ────────── */}
      {sidebarOpen && (
        <div
          className="md:hidden fixed inset-0 z-40"
          style={{ background: 'rgba(0,0,0,0.6)' }}
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* ══════════════════════════════════════════════
          SIDEBAR — drawer on mobile, fixed on desktop
      ══════════════════════════════════════════════ */}
      <aside className={`sidebar${sidebarOpen ? ' sidebar-open' : ''}`}>

        {/* Logo */}
        <div className="sidebar-logo">
          <div
            className="w-9 h-9 rounded-[10px] flex items-center justify-center shrink-0"
            style={{
              background: 'rgba(var(--brand-rgb),0.10)',
              boxShadow: '0 0 0 1px rgba(var(--brand-rgb),0.22), 0 0 20px rgba(var(--brand-rgb),0.08)',
            }}
          >
            <span className="font-mono font-black text-[11px]" style={{ color: 'var(--brand)' }}>DC</span>
          </div>
          <div>
            <p className="font-black text-[14px] leading-none text-ink">DarkCred</p>
            <p className="text-[10px] text-ink3 font-medium mt-0.5">ZAP Analyst</p>
          </div>
        </div>

        {/* Nav */}
        <nav className="sidebar-nav">
          <p className="sidebar-section-label">Menu</p>

          {NAV_TABS.map(({ id, label, Icon }) => (
            <button
              key={id}
              onClick={() => { setTab(id); setSidebarOpen(false) }}
              className={tab === id ? 'sidebar-item sidebar-item-active' : 'sidebar-item'}
            >
              <Icon size={16} />
              <span>{label}</span>
              {id === 'receipts' && (stats?.pending ?? 0) > 0 && (
                <span className="sidebar-badge">{stats.pending > 99 ? '99+' : stats.pending}</span>
              )}
            </button>
          ))}

          <div className="my-3" style={{ borderTop: '0.5px solid rgba(var(--accent-rgb),0.07)' }} />
          <p className="sidebar-section-label">Sistema</p>

          <button
            onClick={() => { setTab('settings'); setSidebarOpen(false) }}
            className={tab === 'settings' ? 'sidebar-item sidebar-item-active' : 'sidebar-item'}
          >
            <Settings size={16} />
            <span>Configurações</span>
          </button>
        </nav>

        {/* Footer */}
        <div className="sidebar-footer">
          <div
            className="flex items-center gap-1.5 text-[11px] font-semibold"
            style={{ color: online ? 'var(--brand-hi)' : '#F87171' }}
          >
            {online
              ? <span className="dot-live" />
              : <span className="w-1.5 h-1.5 rounded-full" style={{ background: '#F87171' }} />
            }
            {online ? 'Sistema online' : 'Offline'}
          </div>
          <p className="text-[10px] text-ink3 mt-1">v2.0</p>
        </div>
      </aside>

      {/* ══════════════════════════════════════════════
          MAIN AREA (topbar + content)
      ══════════════════════════════════════════════ */}
      <div className="main-area">

        {/* ── Topbar ──────────────────────────────── */}
        <header className="topbar">
          <div className="topbar-inner">

            {/* Left: hamburger (mobile) + page title */}
            <div className="flex items-center gap-2.5 min-w-0">
              {/* Hamburger — mobile only */}
              <button
                onClick={() => setSidebarOpen(true)}
                className="md:hidden btn-ghost shrink-0"
                aria-label="Abrir menu"
              >
                <Menu size={16} />
              </button>
              <div className="min-w-0">
                <h1 className="font-bold text-[15px] leading-none text-ink truncate">{currentTabLabel}</h1>
                <p className="text-[10px] text-ink3 mt-0.5 hidden md:block">
                  {new Date().toLocaleDateString('pt-BR', { weekday: 'long', day: '2-digit', month: 'long' })}
                </p>
              </div>
            </div>

            {/* Right: update button + status + avatar */}
            <div className="flex items-center gap-2">
              {(() => {
                const U = {
                  idle:       { Icon: RefreshCw,   text: 'Atualizar',      color: 'var(--ink2)', spin: false },
                  checking:   { Icon: Loader2,      text: 'Verificando…',   color: 'var(--brand)', spin: true  },
                  updating:   { Icon: Loader2,      text: 'Atualizando…',   color: '#F59E0B',      spin: true  },
                  done:       { Icon: Check,        text: '✓ Atualizado',   color: '#34D399',      spin: false },
                  up_to_date: { Icon: Check,        text: 'Sem novidades',  color: 'var(--ink3)',  spin: false },
                  error:      { Icon: AlertCircle,  text: 'Erro',           color: '#EF4444',      spin: false },
                }[updateState]
                return (
                  <button
                    onClick={handleUpdate}
                    disabled={updateState !== 'idle'}
                    className="btn-ghost"
                    style={{ color: U.color, transition: 'color 0.2s' }}
                    aria-label="Atualizar sistema"
                  >
                    <U.Icon size={13} className={U.spin ? 'animate-spin' : ''} />
                    <span className="hidden md:inline text-[12px]">{U.text}</span>
                  </button>
                )
              })()}

              {/* Status — visible only mobile (desktop shows in sidebar) */}
              <div
                className="md:hidden flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold"
                style={{
                  background: online ? 'rgba(var(--brand-rgb),0.08)' : 'rgba(239,68,68,0.08)',
                  boxShadow:  online ? '0 0 0 0.5px rgba(var(--brand-rgb),0.22)' : '0 0 0 0.5px rgba(239,68,68,0.22)',
                  color:      online ? 'var(--brand-hi)' : '#F87171',
                }}
              >
                {online ? <span className="dot-live" /> : <span className="w-1.5 h-1.5 rounded-full bg-danger" />}
              </div>

              {/* Avatar menu — desktop only */}
              <div className="hidden md:block">
                <AvatarMenu
                  onLogout={handleLogout}
                  onSettings={() => setTab('settings')}
                />
              </div>
            </div>
          </div>

          {/* Stats strip — receipts tab only */}
          {tab === 'receipts' && (
            <div
              className="flex gap-1.5 px-4 pb-3 overflow-x-auto"
              style={{ scrollbarWidth: 'none', borderTop: '0.5px solid rgba(var(--accent-rgb),0.05)', paddingTop: '10px' }}
            >
              <StatPill Icon={FileStack}     value={stats?.total}      label="total"   color="var(--ink2)"     bg="rgba(var(--accent-rgb),0.05)" shadow="0 0 0 0.5px rgba(var(--accent-rgb),0.09)" />
              <StatPill Icon={CheckCircle}   value={stats?.approved}   label="aprov."  color="var(--brand-hi)" bg="rgba(var(--brand-rgb),0.08)"  shadow="0 0 0 0.5px rgba(var(--brand-rgb),0.20)"  />
              <StatPill Icon={AlertTriangle} value={stats?.suspicious} label="susp."   color="#FCD34D"         bg="rgba(245,158,11,0.08)"         shadow="0 0 0 0.5px rgba(245,158,11,0.20)"        />
              <StatPill Icon={Clock}         value={stats?.pending}    label="pend."   color="var(--ink2)"     bg="rgba(75,94,138,0.08)"          shadow="0 0 0 0.5px rgba(75,94,138,0.20)"         />
              <StatPill Icon={XCircle}       value={stats?.rejected}   label="rejeit." color="#F87171"         bg="rgba(239,68,68,0.08)"          shadow="0 0 0 0.5px rgba(239,68,68,0.20)"         />
            </div>
          )}
        </header>

        {/* ── Content ─────────────────────────────── */}
        <main className="content-area animate-fade-in">
          {tab === 'home'      && <DashboardPage stats={stats} onNavigate={setTab} />}
          {tab === 'receipts'  && (
            <ReceiptFeed
              globalDate={dateCtx}
              onDateChange={setDateCtx}
              onRefreshStats={refresh}
            />
          )}
          {tab === 'clients'   && <ClientList />}
          {tab === 'reports'   && <ReportDashboard />}
          {tab === 'calote'    && <CalotePage />}
          {tab === 'settings'  && <SettingsPage theme={theme} setTheme={setTheme} />}
        </main>
      </div>

      {/* ── Mobile bottom nav ───────────────────────── */}
      <nav
        className="md:hidden fixed bottom-0 inset-x-0 z-40 pb-safe"
        style={{
          background: 'rgba(var(--canvas-rgb),0.96)',
          backdropFilter: 'blur(20px)',
          borderTop: '0.5px solid rgba(var(--accent-rgb),0.09)',
        }}
      >
        <div className="flex justify-around py-1">
          {NAV_TABS.map(({ id, label, Icon }) => (
            <button
              key={id}
              onClick={() => setTab(id)}
              className={tab === id ? 'nav-item-active' : 'nav-item'}
            >
              <div className="relative">
                <Icon size={20} />
                {id === 'receipts' && (stats?.pending ?? 0) > 0 && (
                  <span
                    className="absolute -top-1 -right-2 min-w-4 h-4 flex items-center justify-center
                               rounded-full text-[9px] font-black px-1"
                    style={{ background: '#F59E0B', color: 'var(--canvas)' }}
                  >
                    {stats.pending > 9 ? '9+' : stats.pending}
                  </span>
                )}
              </div>
              <span className="text-[9px]">{label}</span>
            </button>
          ))}
        </div>
      </nav>

    </div>
  )
}
