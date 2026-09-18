import { ArrowRight } from 'lucide-react'
import clsx from 'clsx'

/**
 * Sticky contact strip: counter in mono (like a frame counter), a filmstrip of
 * the last picks, and the one action. Stays quiet until the first pick.
 */
export default function SelectionBar({ count, limit, maxLimit, selected, photoById, onSubmit, submitting, filter, onFilter }) {
  const hard = maxLimit || limit
  const extras = Math.max(0, count - limit)
  const pct = Math.min(100, (count / limit) * 100)
  const full = count >= hard
  const recent = selected.slice(-6).reverse()

  const status = full
    ? 'Kuota terpenuhi'
    : count === 0
      ? 'Ketuk foto untuk memilih'
      : extras > 0
        ? `${extras} di luar paket`
        : 'foto dipilih'

  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-0 z-40 flex justify-center px-3 pb-[max(12px,env(safe-area-inset-bottom))]">
      <div className="pointer-events-auto w-full max-w-2xl animate-rise rounded-2xl border border-line bg-paper/95 shadow-[0_12px_40px_-12px_rgba(0,0,0,0.25)] backdrop-blur">
        <div className="relative h-[2px] w-full overflow-hidden rounded-t-2xl bg-line">
          <div className="h-full bg-ink transition-[width] duration-500 ease-out" style={{ width: `${pct}%` }} />
          {/* Extras fill the bar again, dotted, so "over the package" is visible at a glance */}
          {extras > 0 && (
            <div
              className="absolute inset-y-0 left-0 bg-[repeating-linear-gradient(90deg,#111_0_3px,transparent_3px_6px)] transition-[width] duration-500"
              style={{ width: `${Math.min(100, (extras / Math.max(1, hard - limit)) * 100)}%` }}
            />
          )}
        </div>
        <div className="flex items-center gap-2 px-3 py-2.5 sm:gap-3 sm:px-4">
          <div className="flex shrink-0 flex-col leading-none">
            <span className="font-mono text-2xl tabular-nums tracking-tight">
              {String(count).padStart(2, '0')}
              <span className="text-faint"> / {String(limit).padStart(2, '0')}</span>
              {extras > 0 && <span className="ml-1 text-base text-ink">+{extras}</span>}
            </span>
            <span className={clsx('mt-1 text-[11px]', full || extras ? 'text-ink' : 'text-mute')}>{status}</span>
          </div>

          <div className="hidden min-w-0 flex-1 items-center gap-1 sm:flex" aria-hidden>
            {recent.map((id) => {
              const p = photoById.get(id)
              return p ? (
                <img key={id} src={p.thumb_url} alt="" className="h-9 w-9 shrink-0 rounded-[3px] object-cover animate-fade" />
              ) : null
            })}
            {count > recent.length && <span className="ml-1 font-mono text-[11px] text-mute">+{count - recent.length}</span>}
          </div>

          {count > 0 && (
            <div role="group" aria-label="Tampilkan" className="ml-auto flex shrink-0 rounded-full border border-line p-0.5 text-xs">
              <button
                type="button"
                onClick={() => onFilter('all')}
                aria-pressed={filter === 'all'}
                className={clsx('rounded-full px-2.5 py-1.5 transition-colors sm:px-3', filter === 'all' ? 'bg-ink text-paper' : 'text-mute hover:text-ink')}
              >
                Semua
              </button>
              <button
                type="button"
                onClick={() => onFilter('selected')}
                aria-pressed={filter === 'selected'}
                className={clsx('rounded-full px-2.5 py-1.5 transition-colors sm:px-3', filter === 'selected' ? 'bg-ink text-paper' : 'text-mute hover:text-ink')}
              >
                Pilihan
              </button>
            </div>
          )}

          <button type="button" onClick={onSubmit} disabled={count === 0 || submitting} className={clsx('btn-ink shrink-0 px-4 sm:px-5', count === 0 && 'ml-auto')}>
            {submitting ? 'Mengirim…' : (
              <>
                Kirim<span className="hidden sm:inline"> pilihan</span>
              </>
            )}
            {!submitting && <ArrowRight size={16} />}
          </button>
        </div>
      </div>
    </div>
  )
}
