import { useState } from 'react'
import { CheckCircle, XCircle, AlertTriangle, ChevronDown, ChevronUp, Shield, ShieldAlert } from 'lucide-react'
import toast from 'react-hot-toast'
import StatusBadge from './StatusBadge'
import { api } from '../api'

function ScoreBar({ score }) {
  const pct = Math.round((score ?? 0) * 100)
  const color = pct >= 85 ? 'bg-green-500' : pct >= 50 ? 'bg-yellow-500' : 'bg-red-500'
  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 bg-gray-700 rounded-full h-2">
        <div className={`${color} h-2 rounded-full transition-all`} style={{ width: `${pct}%` }} />
      </div>
      <span className="text-xs text-gray-400 w-8 text-right">{pct}%</span>
    </div>
  )
}

export default function ReceiptCard({ receipt, onRefresh }) {
  const [expanded, setExpanded] = useState(false)
  const [loading, setLoading] = useState(false)
  const a = receipt.analysis
  const canAction = receipt.status === 'pending' || receipt.status === 'suspicious'

  async function handleApprove() {
    setLoading(true)
    try {
      await api.approveReceipt(receipt.id)
      toast.success('Comprovante aprovado!')
      onRefresh()
    } catch (e) {
      toast.error(e.message)
    } finally {
      setLoading(false)
    }
  }

  async function handleReject() {
    setLoading(true)
    try {
      await api.rejectReceipt(receipt.id)
      toast.error('Comprovante rejeitado.')
      onRefresh()
    } catch (e) {
      toast.error(e.message)
    } finally {
      setLoading(false)
    }
  }

  const imageUrl = receipt.image_path
    ? `/uploads/${receipt.image_path.split('/').pop()}`
    : receipt.image_url

  return (
    <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
      {/* Header */}
      <div className="p-4 flex items-start gap-4">
        {/* Thumbnail */}
        {imageUrl ? (
          <a href={imageUrl} target="_blank" rel="noreferrer">
            <img
              src={imageUrl}
              alt="Comprovante"
              className="w-16 h-16 object-cover rounded-lg border border-gray-700 cursor-pointer hover:opacity-80 transition"
            />
          </a>
        ) : (
          <div className="w-16 h-16 bg-gray-800 rounded-lg flex items-center justify-center border border-gray-700">
            <span className="text-gray-500 text-xs">Sem img</span>
          </div>
        )}

        {/* Main info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap mb-1">
            <StatusBadge status={receipt.status} />
            {a?.is_authentic === true && <Shield size={14} className="text-green-400" />}
            {a?.is_authentic === false && <ShieldAlert size={14} className="text-red-400" />}
            <span className="text-xs text-gray-500">#{receipt.id}</span>
          </div>
          <p className="font-semibold text-sm truncate">
            {receipt.client?.name || receipt.client?.phone || `Cliente #${receipt.client_id}`}
          </p>
          <p className="text-xs text-gray-400 mt-0.5">
            {new Date(receipt.received_at + 'Z').toLocaleString('pt-BR')}
          </p>
          {a?.amount && (
            <p className="text-sm font-bold text-green-400 mt-1">{a.amount}</p>
          )}
        </div>

        {/* Score */}
        {a && (
          <div className="w-28 shrink-0">
            <p className="text-xs text-gray-500 mb-1">Confiança</p>
            <ScoreBar score={a.confidence_score} />
          </div>
        )}

        {/* Expand toggle */}
        <button
          onClick={() => setExpanded((v) => !v)}
          className="text-gray-500 hover:text-white transition"
        >
          {expanded ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
        </button>
      </div>

      {/* Expanded details */}
      {expanded && (
        <div className="border-t border-gray-800 p-4 space-y-4">
          {a ? (
            <>
              {/* Extracted data */}
              <div className="grid grid-cols-2 gap-3 text-sm">
                {[
                  ['Banco', a.bank_name],
                  ['Valor', a.amount],
                  ['Data', a.transaction_date],
                  ['ID Transação', a.transaction_id],
                  ['Pagador', a.sender_name],
                  ['Beneficiário', a.recipient_name],
                ].map(([label, value]) => (
                  <div key={label}>
                    <p className="text-xs text-gray-500">{label}</p>
                    <p className="text-gray-200 truncate">{value || <span className="text-gray-600">—</span>}</p>
                  </div>
                ))}
              </div>

              {/* Fraud indicators */}
              {a.fraud_indicators?.length > 0 && (
                <div className="bg-red-950 border border-red-900 rounded-lg p-3">
                  <div className="flex items-center gap-1 mb-2">
                    <AlertTriangle size={14} className="text-red-400" />
                    <span className="text-xs font-semibold text-red-300">Alertas de fraude</span>
                  </div>
                  <ul className="space-y-1">
                    {a.fraud_indicators.map((indicator, i) => (
                      <li key={i} className="text-xs text-red-200">• {indicator}</li>
                    ))}
                  </ul>
                </div>
              )}

              {/* AI Summary */}
              {a.ai_summary && (
                <div className="bg-gray-800 rounded-lg p-3">
                  <p className="text-xs text-gray-400 mb-1">Resumo da análise</p>
                  <p className="text-sm text-gray-200">{a.ai_summary}</p>
                </div>
              )}

              {/* Error */}
              {a.error && (
                <p className="text-xs text-red-400 bg-red-950 border border-red-900 rounded p-2">
                  Erro: {a.error}
                </p>
              )}
            </>
          ) : (
            <p className="text-sm text-gray-500 italic">Análise em andamento…</p>
          )}

          {/* Action buttons */}
          {canAction && (
            <div className="flex gap-3 pt-2">
              <button
                onClick={handleApprove}
                disabled={loading}
                className="flex-1 flex items-center justify-center gap-2 py-2 rounded-lg bg-green-700 hover:bg-green-600 text-white font-semibold text-sm transition disabled:opacity-50"
              >
                <CheckCircle size={16} /> Aprovar
              </button>
              <button
                onClick={handleReject}
                disabled={loading}
                className="flex-1 flex items-center justify-center gap-2 py-2 rounded-lg bg-red-800 hover:bg-red-700 text-white font-semibold text-sm transition disabled:opacity-50"
              >
                <XCircle size={16} /> Rejeitar
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
