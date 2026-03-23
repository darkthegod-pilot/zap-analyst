import { useState } from 'react'
import { Calendar, ChevronDown, X } from 'lucide-react'

const PRESETS = [
  { label: 'Hoje',      value: 'today' },
  { label: 'Ontem',     value: 'yesterday' },
  { label: '7 dias',    value: '7d' },
  { label: '30 dias',   value: '30d' },
  { label: 'Tudo',      value: 'all' },
  { label: 'Período',   value: 'custom' },
]

function toISODate(d) {
  return d.toISOString().slice(0, 10)
}

export function presetToDates(preset) {
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const todayStr = toISODate(today)

  switch (preset) {
    case 'today':
      return { date_from: todayStr, date_to: todayStr }
    case 'yesterday': {
      const y = new Date(today); y.setDate(y.getDate() - 1)
      const ys = toISODate(y)
      return { date_from: ys, date_to: ys }
    }
    case '7d': {
      const d = new Date(today); d.setDate(d.getDate() - 6)
      return { date_from: toISODate(d), date_to: todayStr }
    }
    case '30d': {
      const d = new Date(today); d.setDate(d.getDate() - 29)
      return { date_from: toISODate(d), date_to: todayStr }
    }
    case 'all':
      return { date_from: null, date_to: null }
    default:
      return null
  }
}

export default function DateFilter({ value = 'today', customFrom, customTo, onChange }) {
  const [showCustom, setShowCustom] = useState(value === 'custom')
  const [localFrom, setLocalFrom] = useState(customFrom || '')
  const [localTo, setLocalTo]     = useState(customTo   || '')

  function handlePreset(preset) {
    if (preset === 'custom') {
      setShowCustom(true)
      return
    }
    setShowCustom(false)
    onChange({ preset, ...presetToDates(preset) })
  }

  function handleCustomApply() {
    if (!localFrom || !localTo) return
    onChange({ preset: 'custom', date_from: localFrom, date_to: localTo })
  }

  function handleClearCustom() {
    setShowCustom(false)
    setLocalFrom('')
    setLocalTo('')
    onChange({ preset: 'today', ...presetToDates('today') })
  }

  return (
    <div className="space-y-2">
      {/* Preset chips */}
      <div className="flex items-center gap-1.5 flex-wrap">
        <Calendar size={13} className="text-ink-muted shrink-0" />
        {PRESETS.map((p) => (
          <button
            key={p.value}
            onClick={() => handlePreset(p.value)}
            className={
              (value === p.value || (p.value === 'custom' && showCustom))
                ? 'chip-active'
                : 'chip-default'
            }
          >
            {p.value === 'custom' && <ChevronDown size={11} />}
            {p.label}
          </button>
        ))}
      </div>

      {/* Custom range picker */}
      {showCustom && (
        <div className="flex items-center gap-2 animate-fade-in flex-wrap">
          <input
            type="date"
            value={localFrom}
            onChange={(e) => setLocalFrom(e.target.value)}
            className="input w-auto text-xs py-1.5 px-2"
          />
          <span className="text-ink-muted text-xs">até</span>
          <input
            type="date"
            value={localTo}
            onChange={(e) => setLocalTo(e.target.value)}
            className="input w-auto text-xs py-1.5 px-2"
          />
          <button
            onClick={handleCustomApply}
            disabled={!localFrom || !localTo}
            className="btn-brand text-xs py-1.5 px-3"
          >
            Aplicar
          </button>
          <button onClick={handleClearCustom} className="btn-ghost text-xs py-1.5 px-2">
            <X size={12} />
          </button>
        </div>
      )}
    </div>
  )
}
