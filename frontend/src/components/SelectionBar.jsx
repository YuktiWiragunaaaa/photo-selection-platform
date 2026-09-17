import { ArrowRight } from 'lucide-react'
import clsx from 'clsx'

/**
 * Sticky contact strip: counter in mono (like a frame counter), a filmstrip of
 * the last picks, and the one action. Stays quiet until the first pick.
 */
export default function SelectionBar({ count, limit, selected, photoById, onSubmit, submitting }) {
  const pct = Math.min(100, (count / limit) * 100)
  const full = count >= limit
  const recent = selected.slice(-6).reverse()

  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-0 z-40 flex justify-center px-3 pb-[max(12px,env(safe-area-inset-bottom))]">
      <div className="pointer-events-auto w-full max-w-2xl animate-rise rounded-2xl border border-line bg-paper/95 shadow-[0_12px_40px_-12px_rgba(0,0,0,0.25)] backdrop-blur">
        <div className="h-[2px] w-full overflow-hidden rounded-t-2xl bg-line">
          <div className="h-full bg-ink transition-[width] duration-500 ease-out" style={{ width: `${pct}%` }} />
        </div>
        <div className="flex items-center gap-3 px-3 py-2.5 sm:px-4">
          <div className="flex shrink-0 flex-col leading-none">
            <span className="font-mono text-2xl tabular-nums tracking-tight">
              {String(count).padStart(2, '0')}
              <span className="text-faint"> / {String(limit).padStart(2, '0')}</span>
            </span>
            <span className={clsx('mt-1 text-[11px]', full ? 'text-ink' : 'text-mute')}>
              {full ? 'Kuota terpenuhi' : count === 0 ? 'Ketuk foto untuk memilih' : 'foto dipilih'}
            </span>
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

          <button type="button" onClick={onSubmit} disabled={count === 0 || submitting} className="btn-ink ml-auto shrink-0">
            {submitting ? 'Mengirim…' : 'Kirim pilihan'}
            {!submitting && <ArrowRight size={16} />}
          </button>
        </div>
      </div>
    </div>
  )
}
