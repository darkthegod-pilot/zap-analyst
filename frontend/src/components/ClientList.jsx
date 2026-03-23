import { useState } from 'react'
import { UserCheck, UserX, Pencil, Check } from 'lucide-react'
import toast from 'react-hot-toast'
import { api } from '../api'

export default function ClientList({ clients, onRefresh }) {
  const [editingId, setEditingId] = useState(null)
  const [editName, setEditName] = useState('')

  async function handleDeactivate(id, phone) {
    try {
      await api.deactivateClient(id)
      toast.success(`${phone} desativado`)
      onRefresh()
    } catch (e) {
      toast.error(e.message)
    }
  }

  async function handleSaveName(id) {
    try {
      await api.updateClientName(id, editName)
      toast.success('Nome atualizado')
      setEditingId(null)
      onRefresh()
    } catch (e) {
      toast.error(e.message)
    }
  }

  if (!clients.length) {
    return (
      <div className="text-center py-16 text-gray-600">
        <p>Nenhum cliente monitorado ainda.</p>
        <p className="text-sm mt-1">
          Envie <code className="bg-gray-800 px-1 rounded">Comprovante salvo.</code> para um
          número via WhatsApp para registrá-lo.
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-2">
      {clients.map((c) => (
        <div
          key={c.id}
          className="bg-gray-900 border border-gray-800 rounded-xl p-4 flex items-center gap-4"
        >
          {/* Status dot */}
          <div
            className={`w-2.5 h-2.5 rounded-full shrink-0 ${
              c.active ? 'bg-green-500' : 'bg-gray-600'
            }`}
          />

          {/* Name / phone */}
          <div className="flex-1 min-w-0">
            {editingId === c.id ? (
              <div className="flex items-center gap-2">
                <input
                  className="bg-gray-800 border border-gray-600 rounded px-2 py-1 text-sm text-white w-48"
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleSaveName(c.id)}
                  autoFocus
                />
                <button
                  onClick={() => handleSaveName(c.id)}
                  className="text-green-400 hover:text-green-300"
                >
                  <Check size={16} />
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <p className="font-medium text-sm truncate">{c.name || c.phone}</p>
                {c.name && <p className="text-xs text-gray-500">{c.phone}</p>}
                <button
                  onClick={() => {
                    setEditingId(c.id)
                    setEditName(c.name || '')
                  }}
                  className="text-gray-600 hover:text-gray-400 transition"
                >
                  <Pencil size={12} />
                </button>
              </div>
            )}
            <p className="text-xs text-gray-500 mt-0.5">
              Registrado em {new Date(c.registered_at + 'Z').toLocaleDateString('pt-BR')}
            </p>
          </div>

          {/* Receipts count */}
          <div className="text-center shrink-0">
            <p className="text-lg font-bold text-brand-500">{c.receipts_count ?? 0}</p>
            <p className="text-xs text-gray-500">comprovantes</p>
          </div>

          {/* Actions */}
          {c.active && (
            <button
              onClick={() => handleDeactivate(c.id, c.phone)}
              title="Desativar monitoramento"
              className="text-gray-600 hover:text-red-400 transition shrink-0"
            >
              <UserX size={18} />
            </button>
          )}
          {!c.active && <UserCheck size={18} className="text-gray-700 shrink-0" />}
        </div>
      ))}
    </div>
  )
}
