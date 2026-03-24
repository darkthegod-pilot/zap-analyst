import { useEffect } from 'react'
import { X, Download } from 'lucide-react'

export default function ImagePreviewModal({ url, onClose }) {
  const isPdf = url?.toLowerCase().includes('.pdf')

  useEffect(() => {
    function onKey(e) {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [onClose])

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center"
      style={{ background: 'rgba(0,0,0,0.92)' }}
      onClick={onClose}
    >
      {/* Controls */}
      <div
        className="absolute top-4 right-4 flex items-center gap-2 z-10"
        onClick={e => e.stopPropagation()}
      >
        <a
          href={url}
          download
          className="btn-ghost btn-sm"
          style={{ color: 'var(--ink2)' }}
        >
          <Download size={14} />
          Baixar
        </a>
        <button
          onClick={onClose}
          className="btn-ghost btn-sm"
          style={{ color: 'var(--ink2)' }}
        >
          <X size={14} />
          Fechar
        </button>
      </div>

      {/* Content */}
      <div
        className="relative flex items-center justify-center"
        onClick={e => e.stopPropagation()}
        style={{ maxWidth: '92vw', maxHeight: '92vh' }}
      >
        {isPdf ? (
          <iframe
            src={url}
            title="Comprovante PDF"
            style={{
              width: '85vw',
              height: '88vh',
              border: 'none',
              borderRadius: 10,
            }}
          />
        ) : (
          <img
            src={url}
            alt="Comprovante"
            style={{
              maxWidth: '92vw',
              maxHeight: '88vh',
              objectFit: 'contain',
              borderRadius: 10,
              boxShadow: '0 0 0 0.5px rgba(var(--accent-rgb),0.12), 0 8px 40px rgba(0,0,0,0.6)',
            }}
          />
        )}
      </div>
    </div>
  )
}
