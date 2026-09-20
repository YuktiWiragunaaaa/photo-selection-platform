// [ID] Bar bawah galeri klien: jumlah terpilih, status simpan, filter, tombol Kirim.
import { ArrowRight } from 'lucide-react'
import clsx from 'clsx'

/**
 * Sticky contact strip: counter (like a frame counter), a filmstrip of the last
 * picks, view filters and the one action. On phones the filters get their own
 * row so nothing collides with the counter or the submit button.
 */
export default function SelectionBar({ count, limit, maxLimit, maybeCount = 0, saveState = '', selected, photoById, onSubmit, submitting, filter, onFilter }) {
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
        : count < limit
          ? `Sisa ${limit - count} foto dalam paket`
          : 'Paket terpenuhi'

  const filters = [
    ['all', 'Semua'],
    ['selected', `Pilihan ${count}`], // selalu tampil (tidak muncul tiba-tiba) supaya tinggi bar tidak berubah
    ...(maybeCount > 0 ? [['maybe', `Ditandai ${maybeCount}`]] : []),
  ]

  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-0 z-40 flex justify-center px-3 pb-[max(12px,env(safe-area-inset-bottom))]">
      <div className="pointer-events-auto w-full max-w-2xl animate-rise rounded-[26px] bg-solid text-onsolid shadow-[0_18px_40px_-16px_rgba(20,20,19,0.55)]">
        <div className="relative mx-4 mt-3 h-1.5 overflow-hidden rounded-full bg-ink2">
          <div className="h-full rounded-full bg-accent transition-[width] duration-500 ease-out" style={{ width: `${pct}%` }} />
          {/* Extras fill the bar again, dotted, so "over the package" is visible at a glance */}
          {extras > 0 && (
            <div
              className="absolute inset-y-0 left-0 bg-[repeating-linear-gradient(90deg,rgb(var(--c-paper))_0_3px,transparent_3px_6px)] transition-[width] duration-500"
              style={{ width: `${Math.min(100, (extras / Math.max(1, hard - limit)) * 100)}%` }}
            />
          )}
        </div>

        <div className="flex flex-wrap items-center gap-x-3 gap-y-2 px-3 py-2.5 sm:flex-nowrap sm:px-4">
          <div className="flex min-w-0 shrink-0 flex-col leading-none">
            <span className="whitespace-nowrap font-mono text-2xl tabular-nums tracking-tight">
              {String(count).padStart(2, '0')}
              <span className="text-faint"> / {String(limit).padStart(2, '0')}</span>
              {extras > 0 && <span className="ml-1 text-base text-accent">+{extras}</span>}
            </span>
            {/* Tinggi baris tetap: status simpan ditampilkan di sini agar galeri tidak melompat */}
            <span className="mt-1 flex h-4 items-center gap-1.5 truncate text-[11px]" aria-live="polite">
              <span className={clsx(full || extras ? 'text-accent' : 'text-sand')}>{status}</span>
              {saveState && (
                <span className={clsx('transition-opacity', saveState === 'offline' ? 'text-danger' : 'text-faint')}>
                  · {saveState === 'saving' ? 'menyimpan…' : saveState === 'saved' ? 'tersimpan ✓' : 'offline'}
                </span>
              )}
            </span>
          </div>

          <div className="hidden min-w-0 flex-1 items-center gap-1 overflow-hidden md:flex" aria-hidden>
            {recent.map((id) => {
              const p = photoById.get(id)
              return p ? <img key={id} src={p.thumb_url} alt="" className="h-9 w-9 shrink-0 rounded-lg object-cover animate-fade" /> : null
            })}
            {count > recent.length && <span className="ml-1 font-mono text-[11px] text-sand">+{count - recent.length}</span>}
          </div>

          <button
            type="button"
            onClick={onSubmit}
            disabled={count === 0 || submitting}
            className="btn-accent order-2 ml-auto shrink-0 px-4 sm:order-3 sm:ml-0 sm:px-5"
          >
            {submitting ? 'Mengirim…' : (
              <>
                Kirim<span className="hidden sm:inline"> pilihan</span>
              </>
            )}
            {!submitting && <ArrowRight size={16} />}
          </button>

          {true && (
            <div
              role="group"
              aria-label="Tampilkan"
              className="order-3 flex w-full shrink-0 gap-1 overflow-x-auto rounded-full bg-ink2 p-1 text-xs sm:order-2 sm:ml-auto sm:w-auto"
            >
              {filters.map(([v, label]) => (
                <button
                  key={v}
                  type="button"
                  onClick={() => onFilter(v)}
                  disabled={v === 'selected' && count === 0}
                  aria-pressed={filter === v}
                  className={clsx(
                    'flex-1 whitespace-nowrap rounded-full px-3 py-1.5 transition-colors sm:flex-none',
                    filter === v ? 'bg-paper font-bold text-ink' : 'text-sand hover:text-onsolid disabled:opacity-40',
                  )}
                >
                  {label}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
