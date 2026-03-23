import { useState, useEffect, useCallback } from 'react'
import { Loader2, Delete } from 'lucide-react'
import { api } from '../api'

const PIN_LENGTH = 4

export default function PinLock({ onUnlock }) {
  const [digits, setDigits] = useState([])
  const [error,  setError]  = useState(false)
  const [loading, setLoading] = useState(false)
  const [shake, setShake] = useState(false)

  const submit = useCallback(async (pin) => {
    setLoading(true)
    setError(false)
    try {
      const { token } = await api.verifyPin(pin)
      localStorage.setItem('dc_auth_token', token)
      onUnlock()
    } catch {
      setShake(true)
      setError(true)
      setDigits([])
      setTimeout(() => setShake(false), 600)
    } finally {
      setLoading(false)
    }
  }, [onUnlock])

  const press = useCallback((d) => {
    if (loading) return
    setError(false)
    setDigits(prev => {
      const next = [...prev, d]
      if (next.length === PIN_LENGTH) {
        submit(next.join(''))
        return []
      }
      return next
    })
  }, [loading, submit])

  const del = useCallback(() => {
    if (loading) return
    setError(false)
    setDigits(prev => prev.slice(0, -1))
  }, [loading])

  // Keyboard support
  useEffect(() => {
    function onKey(e) {
      if (loading) return
      if (e.key >= '0' && e.key <= '9') press(e.key)
      else if (e.key === 'Backspace') del()
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [press, del, loading])

  const keys = ['1','2','3','4','5','6','7','8','9','','0','⌫']

  return (
    <div
      className="fixed inset-0 z-[100] flex flex-col items-center justify-center gap-8"
      style={{ background: '#080D18' }}
    >
      {/* Logo */}
      <div className="flex flex-col items-center gap-3">
        <div
          className="w-16 h-16 rounded-[16px] flex items-center justify-center"
          style={{
            background: 'rgba(16,185,129,0.10)',
            boxShadow: '0 0 0 1px rgba(16,185,129,0.25), 0 0 32px rgba(16,185,129,0.10)',
          }}
        >
          <span className="font-mono font-black text-[22px]" style={{ color: '#10B981' }}>DC</span>
        </div>
        <div className="text-center">
          <h1 className="font-black text-[18px] text-ink">DarkCred</h1>
          <p className="text-[12px] text-ink3 mt-0.5">Digite o PIN para acessar</p>
        </div>
      </div>

      {/* Dot indicators */}
      <div
        className={`flex gap-4 transition-all ${shake ? 'animate-shake' : ''}`}
        style={{ animation: shake ? 'shake 0.5s ease' : undefined }}
      >
        {Array.from({ length: PIN_LENGTH }).map((_, i) => (
          <div
            key={i}
            className="w-4 h-4 rounded-full transition-all duration-150"
            style={{
              background: i < digits.length
                ? (error ? '#EF4444' : '#10B981')
                : 'rgba(100,150,255,0.12)',
              boxShadow: i < digits.length
                ? (error ? '0 0 8px rgba(239,68,68,0.6)' : '0 0 8px rgba(16,185,129,0.6)')
                : 'none',
              transform: i < digits.length ? 'scale(1.15)' : 'scale(1)',
            }}
          />
        ))}
      </div>

      {/* Error message */}
      <div style={{ minHeight: 18 }}>
        {error && (
          <p className="text-[12px] font-semibold" style={{ color: '#F87171' }}>
            PIN incorreto. Tente novamente.
          </p>
        )}
      </div>

      {/* Keypad */}
      <div className="grid grid-cols-3 gap-3" style={{ width: 240 }}>
        {keys.map((k, i) => {
          if (k === '') return <div key={i} />
          if (k === '⌫') {
            return (
              <button
                key={i}
                onClick={del}
                disabled={loading || digits.length === 0}
                className="flex items-center justify-center rounded-[14px] h-16 text-ink2
                           transition-all duration-100 active:scale-95 disabled:opacity-30"
                style={{
                  background: 'rgba(100,150,255,0.06)',
                  boxShadow: '0 0 0 0.5px rgba(100,150,255,0.10)',
                }}
              >
                <Delete size={18} />
              </button>
            )
          }
          return (
            <button
              key={i}
              onClick={() => press(k)}
              disabled={loading}
              className="flex items-center justify-center rounded-[14px] h-16
                         font-mono font-black text-[22px] text-ink
                         transition-all duration-100 active:scale-95 disabled:opacity-50"
              style={{
                background: 'rgba(100,150,255,0.06)',
                boxShadow: '0 0 0 0.5px rgba(100,150,255,0.10)',
              }}
            >
              {loading && digits.length === 0 && k === '0'
                ? <Loader2 size={18} className="animate-spin text-brand" />
                : k
              }
            </button>
          )
        })}
      </div>

      {/* Shake animation */}
      <style>{`
        @keyframes shake {
          0%, 100% { transform: translateX(0); }
          15% { transform: translateX(-8px); }
          30% { transform: translateX(8px); }
          45% { transform: translateX(-6px); }
          60% { transform: translateX(6px); }
          75% { transform: translateX(-3px); }
          90% { transform: translateX(3px); }
        }
        .animate-shake { animation: shake 0.5s ease; }
      `}</style>
    </div>
  )
}
