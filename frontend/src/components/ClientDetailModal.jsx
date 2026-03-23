import { useState, useEffect } from 'react'
import { X, Flame, TrendingUp } from 'lucide-react'
import { api } from '../api'

/* ─── Score Arc (same DNA as ConfidenceArc) ─────── */
function ScoreArc({ score }) {
  const pct    = Math.round((score / 1000) * 100)
  const radius = 36
  const stroke = 4
  const circ   = 2 * Math.PI * radius
  const gap    = circ * 0.22
  const arc    = circ - gap
  const fill   = (pct / 100) * arc
  const color  = score >= 800 ? '#10B981' : score >= 500 ? '#F59E0B' : '#EF4444'
  const glow   = score >= 800 ? 'rgba(16,185,129,0.5)' : score >= 500 ? 'rgba(245,158,11,0.5)' : 'rgba(239,68,68,0.5)'
  const size   = (radius + stroke) * 2 + 4
  const rotate = 90 + (360 * 0.11)

  return (
    <div className="relative flex items-center justify-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} style={{ transform: `rotate(${rotate}deg)` }}>
        <circle cx={size/2} cy={size/2} r={radius} fill="none"
          stroke="rgba(100,150,255,0.07)" strokeWidth={stroke}
          strokeDasharray={`${arc} ${circ - arc}`} strokeLinecap="round" />
        <circle cx={size/2} cy={size/2} r={radius} fill="none"
          stroke={color} strokeWidth={stroke}
          strokeDasharray={`${fill} ${circ - fill}`} strokeLinecap="round"
          style={{ filter: `drop-shadow(0 0 8px ${glow})`, transition: 'stroke-dasharray 0.8s cubic-bezier(0.34,1.56,0.64,1)' }} />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center gap-0.5">
        <span className="font-mono font-black tabular lining leading-none" style={{ fontSize: 22, color }}>{score}</span>
        <span className="font-mono text-ink3 leading-none" style={{ fontSize: 9 }}>/ 1000</span>
      </div>
    </div>
  )
}

/* ─── Day cell in calendar grid ─────────────────── */
const STATUS_COLORS = {
  paid_early:   { bg: 'rgba(16,185,129,0.30)', glow: '0 0 8px rgba(16,185,129,0.6)', label: '⚡' },
  paid_on_time: { bg: 'rgba(16,185,129,0.20)', glow: '0 0 6px rgba(16,185,129,0.5)', label: '✅' },
  paid_normal:  { bg: 'rgba(75,184,130,0.14)', glow: '0 0 4px rgba(75,184,130,0.3)', label: '🟡' },
  paid_late:    { bg: 'rgba(245,158,11,0.20)',  glow: '0 0 6px rgba(245,158,11,0.4)', label: '⏰' },
  missed:       { bg: 'rgba(239,68,68,0.20)',   glow: '0 0 4px rgba(239,68,68,0.3)',  label: '❌' },
  sunday:       { bg: 'rgba(30,45,79,0.5)',     glow: 'none',                          label: '' },
  future:       { bg: 'rgba(18,29,53,0.6)',     glow: 'none',                          label: '' },
  unknown:      { bg: 'rgba(30,45,79,0.3)',     glow: 'none',                          label: '' },
}

function DayCell({ item }) {
  const cfg = STATUS_COLORS[item.status] || STATUS_COLORS.unknown
  const d   = new Date(item.date + 'T12:00:00')
  const day = d.getDate()

  return (
    <div
      className="flex flex-col items-center justify-center rounded-[6px] aspect-square"
      style={{
        background: cfg.bg,
        boxShadow: cfg.glow !== 'none' ? cfg.glow : undefined,
        minWidth: 0,
      }}
      title={item.date}
    >
      <span className="font-mono text-[10px] text-ink3 leading-none">{day}</span>
      {cfg.label && <span style={{ fontSize: 9, lineHeight: 1.2 }}>{cfg.label}</span>}
    </div>
  )
}

/* ─── MAIN ───────────────────────────────────────── */
export default function ClientDetailModal({ client, onClose }) {
  const [scoreData, setScoreData] = useState(null)
  const [loading,   setLoading]   = useState(true)

  useEffect(() => {
    api.getClientScore(client.id)
      .then(setScoreData)
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [client.id])

  useEffect(() => {
    function onKey(e) { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [onClose])

  const score  = scoreData?.score  ?? client.score  ?? 1000
  const streak = scoreData?.streak ?? client.streak ?? 0
  const history = scoreData?.history ?? []

  const onTime  = history.filter(d => ['paid_early','paid_on_time','paid_normal'].includes(d.status)).length
  const late    = history.filter(d => d.status === 'paid_late').length
  const missed  = history.filter(d => d.status === 'missed').length

  const scoreLabel = score >= 800 ? 'Excelente' : score >= 600 ? 'Bom' : score >= 400 ? 'Regular' : 'Crítico'
  const scoreColor = score >= 800 ? '#10B981'   : score >= 600 ? '#34D399' : score >= 400 ? '#F59E0B' : '#EF4444'

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center"
      style={{ background: 'rgba(0,0,0,0.75)' }}
      onClick={onClose}
    >
      <div
        className="w-full sm:max-w-md max-h-[90vh] overflow-y-auto rounded-t-[16px] sm:rounded-[16px]"
        style={{
          background: '#0D1525',
          boxShadow: '0 0 0 0.5px rgba(100,150,255,0.10), 0 -8px 40px rgba(0,0,0,0.6)',
        }}
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 sticky top-0 z-10"
          style={{ background: '#0D1525', borderBottom: '0.5px solid rgba(100,150,255,0.07)' }}>
          <div className="min-w-0">
            <p className="text-[14px] font-bold text-ink truncate">{client.name || client.phone}</p>
            {client.name && <p className="font-mono text-[11px] text-ink3">{client.phone}</p>}
          </div>
          <button onClick={onClose} className="text-ink4 hover:text-ink3 transition p-1 shrink-0">
            <X size={18} />
          </button>
        </div>

        <div className="p-4 space-y-5">

          {/* Score + streak */}
          <div className="flex items-center gap-6">
            {loading ? (
              <div className="w-[80px] h-[80px] rounded-full animate-pulse"
                style={{ background: 'rgba(100,150,255,0.07)' }} />
            ) : (
              <ScoreArc score={score} />
            )}
            <div className="space-y-2">
              <div>
                <p className="label">Score de Pontualidade</p>
                <p className="text-[18px] font-black" style={{ color: scoreColor }}>{scoreLabel}</p>
              </div>
              <div className="flex items-center gap-1.5">
                <Flame size={14} style={{ color: streak > 0 ? '#F59E0B' : '#3D4E72' }} />
                <p className="text-[13px] font-bold text-ink">
                  {streak > 0 ? `${streak} dia${streak !== 1 ? 's' : ''} seguido${streak !== 1 ? 's' : ''}` : 'Sem sequência'}
                </p>
              </div>
            </div>
          </div>

          {/* Stats row */}
          {!loading && history.length > 0 && (
            <div className="grid grid-cols-3 gap-2">
              {[
                { label: 'No prazo', value: onTime, color: '#10B981' },
                { label: 'Em atraso', value: late,   color: '#F59E0B' },
                { label: 'Faltou',   value: missed,  color: '#EF4444' },
              ].map(s => (
                <div key={s.label} className="rounded-[8px] p-2.5 text-center"
                  style={{ background: 'rgba(100,150,255,0.04)', boxShadow: '0 0 0 0.5px rgba(100,150,255,0.07)' }}>
                  <p className="font-mono font-black text-[18px]" style={{ color: s.color }}>{s.value}</p>
                  <p className="text-[9px] text-ink3 uppercase tracking-wide mt-0.5">{s.label}</p>
                </div>
              ))}
            </div>
          )}

          {/* 30-day calendar */}
          <div className="space-y-2">
            <p className="section-title flex items-center gap-1.5">
              <TrendingUp size={11} /> Histórico 30 dias
            </p>

            {loading ? (
              <div className="grid grid-cols-7 gap-1">
                {Array.from({ length: 30 }).map((_, i) => (
                  <div key={i} className="skeleton aspect-square rounded-[6px]" />
                ))}
              </div>
            ) : history.length === 0 ? (
              <p className="text-[12px] text-ink3">Sem histórico disponível.</p>
            ) : (
              <>
                {/* Day labels */}
                <div className="grid grid-cols-7 gap-1 mb-0.5">
                  {['D', 'S', 'T', 'Q', 'Q', 'S', 'S'].map((d, i) => (
                    <p key={i} className="text-center font-mono text-[9px] text-ink4 uppercase">{d}</p>
                  ))}
                </div>

                {/* Pad start to align with day-of-week */}
                {(() => {
                  const firstDate = new Date(history[0].date + 'T12:00:00')
                  const startDow  = firstDate.getDay() // 0=Sun
                  const padded    = [
                    ...Array.from({ length: startDow }).map((_, i) => ({ date: `pad-${i}`, status: 'pad' })),
                    ...history,
                  ]
                  return (
                    <div className="grid grid-cols-7 gap-1">
                      {padded.map((item, i) =>
                        item.status === 'pad'
                          ? <div key={`pad-${i}`} />
                          : <DayCell key={item.date} item={item} />
                      )}
                    </div>
                  )
                })()}

                {/* Legend */}
                <div className="flex flex-wrap gap-3 pt-1">
                  {[
                    { status: 'paid_early',   label: 'Antes 12h' },
                    { status: 'paid_on_time', label: '12h–16h'   },
                    { status: 'paid_normal',  label: '16h+'      },
                    { status: 'paid_late',    label: 'Atrasado'  },
                    { status: 'missed',       label: 'Faltou'    },
                  ].map(l => (
                    <div key={l.status} className="flex items-center gap-1">
                      <div className="w-3 h-3 rounded-[3px]"
                        style={{ background: STATUS_COLORS[l.status].bg, boxShadow: STATUS_COLORS[l.status].glow }} />
                      <span className="text-[10px] text-ink3">{l.label}</span>
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>

          {/* Score explanation */}
          <div className="rounded-[8px] p-3 space-y-1.5"
            style={{ background: 'rgba(100,150,255,0.03)', boxShadow: '0 0 0 0.5px rgba(100,150,255,0.07)' }}>
            <p className="section-title">Como funciona o score?</p>
            <div className="space-y-1 text-[11px] text-ink3">
              <p>⚡ Antes das 12h: streak +1, +30 pts (bônus por streak)</p>
              <p>✅ 12h–16h: streak +1, +20 pts (bônus por streak)</p>
              <p>🟡 16h–23:58: +5 pts (sem streak)</p>
              <p>⏰ 1 dia de atraso: streak = 0, -50 pts</p>
              <p>❌ Não pagou: streak = 0, -50 pts</p>
              <p>🚨 7+ dias: marcado como calote</p>
              <p>📅 Domingo: sem cobrança</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
