import { useState } from 'react'
import { Send, MessageSquare, Loader2, Smartphone } from 'lucide-react'
import toast from 'react-hot-toast'
import { api } from '../api'

const SUGGESTIONS = [
  'Relatório de hoje',
  'Relatório de ontem',
  'Manda relatório no WhatsApp',
  'Quantos aprovados hoje?',
]

export default function ReportChat() {
  const [message, setMessage] = useState('')
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState(null)

  async function handleSend(msg) {
    const text = msg || message
    if (!text.trim()) return
    setLoading(true)
    setResult(null)
    try {
      const data = await api.requestReport(text)
      setResult(data)
      if (data.sent_whatsapp) {
        toast.success('Relatório enviado no WhatsApp!')
      }
    } catch (e) {
      toast.error(e.message)
    } finally {
      setLoading(false)
    }
  }

  async function handleSendNow() {
    setLoading(true)
    try {
      await api.sendNow()
      toast.success('Relatório enviado para o WhatsApp do admin!')
    } catch (e) {
      toast.error(e.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-6">
      {/* Quick send button */}
      <div className="bg-gray-900 border border-gray-800 rounded-xl p-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="font-semibold text-sm">Envio diário automático</p>
            <p className="text-xs text-gray-500 mt-0.5">Todo dia às 00:00 (BRT) para +55 11 99655-4604</p>
          </div>
          <button
            onClick={handleSendNow}
            disabled={loading}
            className="flex items-center gap-2 px-4 py-2 bg-green-700 hover:bg-green-600 text-white rounded-lg text-sm font-medium transition disabled:opacity-50"
          >
            <Smartphone size={15} />
            Enviar agora
          </button>
        </div>
      </div>

      {/* Chat input */}
      <div className="bg-gray-900 border border-gray-800 rounded-xl p-4">
        <div className="flex items-center gap-2 mb-3">
          <MessageSquare size={16} className="text-brand-500" />
          <p className="font-semibold text-sm">Pedir relatório por texto</p>
        </div>

        {/* Suggestions */}
        <div className="flex gap-2 flex-wrap mb-3">
          {SUGGESTIONS.map((s) => (
            <button
              key={s}
              onClick={() => handleSend(s)}
              className="px-3 py-1 bg-gray-800 hover:bg-gray-700 rounded-full text-xs text-gray-300 transition"
            >
              {s}
            </button>
          ))}
        </div>

        {/* Input */}
        <div className="flex gap-2">
          <input
            className="flex-1 bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-brand-600"
            placeholder="Ex: relatório dos últimos 7 dias no WhatsApp"
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSend()}
          />
          <button
            onClick={() => handleSend()}
            disabled={loading || !message.trim()}
            className="px-4 py-2 bg-brand-600 hover:bg-brand-500 rounded-lg text-white transition disabled:opacity-50"
          >
            {loading ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
          </button>
        </div>
      </div>

      {/* Result */}
      {result && (
        <div className="bg-gray-900 border border-gray-700 rounded-xl p-4">
          <div className="flex items-center gap-2 mb-3">
            <span className="text-xs text-gray-500 uppercase tracking-wide">
              Relatório — {result.date}
            </span>
            {result.sent_whatsapp && (
              <span className="text-xs bg-green-900 text-green-300 border border-green-700 px-2 py-0.5 rounded-full">
                Enviado no WhatsApp
              </span>
            )}
          </div>
          <pre className="text-sm text-gray-200 whitespace-pre-wrap font-sans leading-relaxed">
            {result.report}
          </pre>
        </div>
      )}
    </div>
  )
}
