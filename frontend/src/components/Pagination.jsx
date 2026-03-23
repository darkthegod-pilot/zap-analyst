import { ChevronLeft, ChevronRight } from 'lucide-react'

export default function Pagination({ total, limit, offset, onChange }) {
  if (total <= limit) return null

  const currentPage = Math.floor(offset / limit) + 1
  const totalPages  = Math.ceil(total / limit)
  const start       = offset + 1
  const end         = Math.min(offset + limit, total)

  function goTo(page) {
    onChange((page - 1) * limit)
  }

  // Build visible page numbers
  const pages = []
  const delta = 1
  const left  = currentPage - delta
  const right = currentPage + delta

  let lastAdded = 0
  for (let p = 1; p <= totalPages; p++) {
    if (p === 1 || p === totalPages || (p >= left && p <= right)) {
      if (lastAdded && p - lastAdded > 1) pages.push('...')
      pages.push(p)
      lastAdded = p
    }
  }

  return (
    <div className="flex flex-col items-center gap-3 pt-4">
      {/* Info text */}
      <p className="text-xs text-ink-muted">
        Mostrando <span className="text-ink font-semibold">{start}–{end}</span> de{' '}
        <span className="text-ink font-semibold">{total}</span> itens
      </p>

      {/* Controls */}
      <div className="flex items-center gap-1">
        <button
          onClick={() => goTo(currentPage - 1)}
          disabled={currentPage === 1}
          className="btn-ghost py-1.5 px-2 disabled:opacity-30"
          aria-label="Página anterior"
        >
          <ChevronLeft size={16} />
        </button>

        {pages.map((p, i) =>
          p === '...'
            ? <span key={`dots-${i}`} className="px-2 text-ink-muted text-sm">…</span>
            : (
              <button
                key={p}
                onClick={() => goTo(p)}
                className={
                  p === currentPage
                    ? 'chip-active min-w-[2rem] justify-center'
                    : 'chip-default min-w-[2rem] justify-center'
                }
              >
                {p}
              </button>
            )
        )}

        <button
          onClick={() => goTo(currentPage + 1)}
          disabled={currentPage === totalPages}
          className="btn-ghost py-1.5 px-2 disabled:opacity-30"
          aria-label="Próxima página"
        >
          <ChevronRight size={16} />
        </button>
      </div>
    </div>
  )
}
