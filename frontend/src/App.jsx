import { useState, useCallback } from 'react'
import { Activity, Users, FileText, TrendingUp, RefreshCw, Wifi } from 'lucide-react'
import { usePolling } from './hooks/usePolling'
import { api } from './api'
import ReceiptFeed from './components/ReceiptFeed'
import ClientList from './components/ClientList'
import ReportChat from './components/ReportChat'

const TABS = [
  { id: 'receipts', label: 'Comprovantes', icon: FileText },
  { id: 'clients', label: 'Clientes', icon: Users },
  { id: 'reports', label: 'Relatórios', icon: TrendingUp },
]

function StatCard({ label, value, color }) {
  return (
    <div className="bg-gray-900 border border-gray-800 rounded-xl p-4">
      <p className="text-xs text-gray-500 uppercase tracking-wide">{label}</p>
      <p className={`text-3xl font-bold mt-1 ${color}`}>{value ?? '—'}</p>
    </div>
  )
}

export default function App() {
  const [tab, setTab] = useState('receipts')
  const [stats, setStats] = useState(null)
  const [receipts, setReceipts] = useState([])
  const [clients, setClients] = useState([])
  const [connected, setConnected] = useState(true)
  const [lastUpdate, setLastUpdate] = useState(null)

  const refresh = useCallback(async () => {
    try {
      const [s, r, c] = await Promise.all([
        api.getStats(),
        api.getReceipts(),
        api.getClients(),
      ])
      setStats(s)
      setReceipts(r)
      setClients(c)
      setConnected(true)
      setLastUpdate(new Date())
    } catch {
      setConnected(false)
    }
  }, [])

  usePolling(refresh, 5000)

  return (
    <div className="min-h-screen flex flex-col">
      {/* Header */}
      <header className="bg-gray-950 border-b border-gray-800 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-brand-600 flex items-center justify-center font-bold text-white text-sm">
            DC
          </div>
          <div>
            <h1 className="font-bold text-white leading-none">DarkCred</h1>
            <p className="text-xs text-gray-500">ZAP Analyst</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          {lastUpdate && (
            <p className="text-xs text-gray-600 hidden sm:block">
              Atualizado {lastUpdate.toLocaleTimeString('pt-BR')}
            </p>
          )}
          <div className={`flex items-center gap-1 text-xs ${connected ? 'text-green-400' : 'text-red-400'}`}>
            <Wifi size={13} />
            {connected ? 'Online' : 'Offline'}
          </div>
          <button
            onClick={refresh}
            className="p-1.5 rounded-lg bg-gray-800 hover:bg-gray-700 text-gray-400 hover:text-white transition"
          >
            <RefreshCw size={14} />
          </button>
        </div>
      </header>

      {/* Stats */}
      <div className="px-6 pt-6 grid grid-cols-2 sm:grid-cols-4 gap-3">
        <StatCard label="Total" value={stats?.total} color="text-white" />
        <StatCard label="Aprovados" value={stats?.approved} color="text-green-400" />
        <StatCard label="Suspeitos" value={stats?.suspicious} color="text-yellow-400" />
        <StatCard label="Rejeitados" value={stats?.rejected} color="text-red-400" />
      </div>

      {/* Secondary stats */}
      <div className="px-6 pt-3 grid grid-cols-2 gap-3">
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-3 flex items-center gap-3">
          <Activity size={16} className="text-brand-500" />
          <div>
            <p className="text-xs text-gray-500">Pendentes</p>
            <p className="font-bold">{stats?.pending ?? '—'}</p>
          </div>
        </div>
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-3 flex items-center gap-3">
          <Users size={16} className="text-brand-500" />
          <div>
            <p className="text-xs text-gray-500">Clientes ativos</p>
            <p className="font-bold">{stats?.active_clients ?? '—'} / {stats?.total_clients ?? '—'}</p>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="px-6 pt-6 flex gap-1 border-b border-gray-800">
        {TABS.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            onClick={() => setTab(id)}
            className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium rounded-t-lg border-b-2 transition ${
              tab === id
                ? 'text-brand-400 border-brand-500 bg-gray-900'
                : 'text-gray-500 border-transparent hover:text-gray-300'
            }`}
          >
            <Icon size={15} />
            {label}
            {id === 'receipts' && stats?.pending > 0 && (
              <span className="bg-yellow-600 text-white text-xs rounded-full px-1.5 py-0.5 min-w-5 text-center">
                {stats.pending}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Tab content */}
      <main className="flex-1 px-6 py-6 max-w-4xl w-full mx-auto">
        {tab === 'receipts' && (
          <ReceiptFeed receipts={receipts} onRefresh={refresh} />
        )}
        {tab === 'clients' && (
          <ClientList clients={clients} onRefresh={refresh} />
        )}
        {tab === 'reports' && <ReportChat />}
      </main>
    </div>
  )
}
