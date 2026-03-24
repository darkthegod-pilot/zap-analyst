import { ChevronLeft, ChevronRight } from 'lucide-react'

export default function Pagination({ total, limit, offset, onChange }) {
  if (total <= limit) return null

  const page  = Math.floor(offset / limit) + 1
  const pages = Math.ceil(total / limit)
  const start = offset + 1
  const end   = Math.min(offset + limit, total)

  const nums = []
  for (let p = 1; p <= pages; p++) {
    if (p === 1 || p === pages || Math.abs(p - page) <= 1) {
      if (nums.length && p - nums[nums.length - 1] > 1) nums.push('…')
      nums.push(p)
    }
  }

  return (
    <div
      className="mt-4 pt-4 flex flex-col items-center gap-3"
      style={{ borderTop: '0.5px solid rgba(var(--accent-rgb),0.07)' }}
    >
      <p className="text-[11px] text-ink3 font-mono">
        {start}–{end} de <span className="text-ink2 font-semibold">{total}</span>
      </p>
      <div className="flex items-center gap-1">
        <button
          onClick={() => onChange((page - 2) * limit)}
          disabled={page === 1}
          className="btn-ghost disabled:opacity-30"
          aria-label="anterior"
        >
          <ChevronLeft size={14} />
        </button>
        {nums.map((p, i) =>
          p === '…'
            ? <span key={`d${i}`} className="px-2 text-ink3 text-[12px]">…</span>
            : (
              <button
                key={p}
                onClick={() => onChange((p - 1) * limit)}
                className={p === page ? 'chip-active' : 'chip-default'}
                style={{ minWidth: 32, justifyContent: 'center' }}
              >
                {p}
              </button>
            )
        )}
        <button
          onClick={() => onChange(page * limit)}
          disabled={page === pages}
          className="btn-ghost disabled:opacity-30"
          aria-label="próxima"
        >
          <ChevronRight size={14} />
        </button>
      </div>
    </div>
  )
}
