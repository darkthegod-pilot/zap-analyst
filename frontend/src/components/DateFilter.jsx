import { useState } from 'react'
import { CalendarDays, X } from 'lucide-react'
import toast from 'react-hot-toast'

const PRESETS = [
  { value: 'today',     label: 'Hoje'    },
  { value: 'yesterday', label: 'Ontem'   },
  { value: '7d',        label: '7 dias'  },
  { value: '30d',       label: '30 dias' },
  { value: 'all',       label: 'Tudo'    },
  { value: 'custom',    label: 'Período' },
]

function toISO(d) { return d.toISOString().slice(0, 10) }

export function presetToDates(preset) {
  const today = new Date(); today.setHours(0, 0, 0, 0)
  const ts = toISO(today)

  if (preset === 'today')     return { date_from: ts,   date_to: ts   }
  if (preset === 'yesterday') {
    const y = new Date(today); y.setDate(y.getDate() - 1)
    const ys = toISO(y)
    return { date_from: ys, date_to: ys }
  }
  if (preset === '7d') {
    const d = new Date(today); d.setDate(d.getDate() - 6)
    return { date_from: toISO(d), date_to: ts }
  }
  if (preset === '30d') {
    const d = new Date(today); d.setDate(d.getDate() - 29)
    return { date_from: toISO(d), date_to: ts }
  }
  if (preset === 'all') return { date_from: null, date_to: null }
  return null
}

export default function DateFilter({ value = 'today', customFrom, customTo, onChange }) {
  const [showCustom, setShowCustom] = useState(value === 'custom')
  const [from, setFrom] = useState(customFrom || '')
  const [to,   setTo]   = useState(customTo   || '')

  function selectPreset(preset) {
    if (preset === 'custom') { setShowCustom(true); return }
    setShowCustom(false)
    onChange({ preset, ...presetToDates(preset) })
  }

  function applyCustom() {
    if (!from || !to) return
    if (from > to) {
      toast.error('Data inicial não pode ser maior que a data final')
      return
    }
    onChange({ preset: 'custom', date_from: from, date_to: to })
  }

  function clear() {
    setShowCustom(false); setFrom(''); setTo('')
    onChange({ preset: 'today', ...presetToDates('today') })
  }

  return (
    <div className="space-y-2">
      {/* Chips */}
      <div
        className="flex gap-1.5 overflow-x-auto pb-0.5"
        style={{ scrollbarWidth: 'none' }}
      >
        {PRESETS.map(p => (
          <button
            key={p.value}
            onClick={() => selectPreset(p.value)}
            className={
              (p.value === value || (p.value === 'custom' && showCustom))
                ? 'chip-active'
                : 'chip-default'
            }
          >
            {p.value === 'today' && <CalendarDays size={10} />}
            {p.label}
          </button>
        ))}
      </div>

      {/* Custom range inputs */}
      {showCustom && (
        <div className="flex items-center gap-2 flex-wrap animate-slide-down">
          <input type="date" value={from} onChange={e => setFrom(e.target.value)}
            className="input py-1.5 text-[12px] w-auto" />
          <span className="text-ink3 text-[11px]">→</span>
          <input type="date" value={to} onChange={e => setTo(e.target.value)}
            className="input py-1.5 text-[12px] w-auto" />
          <button onClick={applyCustom} disabled={!from || !to} className="btn-sm btn-primary">
            Aplicar
          </button>
          <button onClick={clear} className="btn-ghost">
            <X size={12} />
          </button>
        </div>
      )}
    </div>
  )
}
