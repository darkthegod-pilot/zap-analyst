import { useState, useEffect } from 'react'
import { X, UserPlus, Loader2 } from 'lucide-react'
import toast from 'react-hot-toast'
import { api } from '../api'

export default function AddClientModal({ onClose, onCreated }) {
  const [phone, setPhone] = useState('')
  const [name,  setName]  = useState('')
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    function onKey(e) {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [onClose])

  async function submit(e) {
    e.preventDefault()
    const p = phone.trim().replace(/\D/g, '')
    if (!p) { toast.error('Informe o telefone'); return }
    setLoading(true)
    try {
      await api.createClient({ phone: p, name: name.trim() || undefined })
      toast.success('Cliente adicionado')
      onCreated?.()
      onClose()
    } catch (err) {
      toast.error(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center px-4 pb-4 sm:pb-0"
      style={{ background: 'rgba(0,0,0,0.75)' }}
      onClick={onClose}
    >
      <div
        className="w-full sm:max-w-sm rounded-[16px] p-5 space-y-4"
        style={{
          background: '#0D1525',
          boxShadow: '0 0 0 0.5px rgba(100,150,255,0.10), 0 24px 60px rgba(0,0,0,0.6)',
        }}
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <UserPlus size={14} className="text-brand" />
            <p className="text-[14px] font-bold text-ink">Adicionar cliente</p>
          </div>
          <button onClick={onClose} className="text-ink4 hover:text-ink3 transition">
            <X size={16} />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={submit} className="space-y-3">
          <div className="space-y-1.5">
            <label className="label">Telefone *</label>
            <input
              className="input"
              type="tel"
              placeholder="5511999990000"
              value={phone}
              onChange={e => setPhone(e.target.value)}
              autoFocus
            />
            <p className="text-[10px] text-ink4">Apenas números. Ex: 5511999990000</p>
          </div>

          <div className="space-y-1.5">
            <label className="label">Nome (opcional)</label>
            <input
              className="input"
              type="text"
              placeholder="João Silva"
              value={name}
              onChange={e => setName(e.target.value)}
            />
          </div>

          <div className="flex gap-2 pt-1">
            <button
              type="button"
              onClick={onClose}
              className="btn-ghost flex-1"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={loading || !phone.trim()}
              className="btn-primary flex-1"
            >
              {loading ? <Loader2 size={14} className="animate-spin" /> : <UserPlus size={14} />}
              Adicionar
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
