import { useCallback, useEffect, useState } from 'react'
import { ChevronLeft, ChevronRight, MessageSquare, X } from 'lucide-react'

const baseName = (f) => f.replace(/\.[^.]+$/, '')

/**
 * Admin view of the client's picks: large thumbnails with labels *under* the photo (never on top of it),
 * and a click-to-enlarge preview with keyboard / swipe navigation.
 * items: [{ drive_file_id, filename, note?, is_extra? }]
 */
export default function AdminPhotoGrid({ slug, token, items }) {
  const [open, setOpen] = useState(null) // index or null
  const src = (id, size) => `/api/gallery/${slug}/img/${id}?size=${size}${token ? `&t=${token}` : ''}`

  const close = useCallback(() => setOpen(null), [])
  const go = useCallback((d) => setOpen((i) => (i + d + items.length) % items.length), [items.length])

  useEffect(() => {
    if (open == null) return
    const onKey = (e) => {
      if (e.key === 'Escape') close()
      if (e.key === 'ArrowRight') go(1)
      if (e.key === 'ArrowLeft') go(-1)
    }
    window.addEventListener('keydown', onKey)
    document.body.style.overflow = 'hidden'
    return () => {
      window.removeEventListener('keydown', onKey)
      document.body.style.overflow = ''
    }
  }, [open, close, go])

  if (!items.length) return null
  const cur = open != null ? items[open] : null

  return (
    <>
      <ul className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-3">
        {items.map((p, i) => (
          <li key={p.drive_file_id}>
            <button
              type="button"
              onClick={() => setOpen(i)}
              className="group block w-full text-left"
              aria-label={`Perbesar ${baseName(p.filename)}`}
            >
              <span className="block aspect-[4/5] overflow-hidden rounded-2xl bg-wash">
                <img
                  src={src(p.drive_file_id, 'thumb')}
                  alt=""
                  loading="lazy"
                  className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-[1.03]"
                />
              </span>
              <span className="mt-1.5 flex flex-wrap items-center gap-x-1.5 gap-y-1 px-0.5">
                <span className="min-w-0 max-w-full truncate font-mono text-[11px] text-mute">{baseName(p.filename)}</span>
                {p.note && <MessageSquare size={12} className="shrink-0 text-mute" aria-label="Ada catatan" />}
                {p.is_extra && <span className="shrink-0 rounded-full bg-ink px-1.5 py-0.5 text-[10px] font-bold text-accent">Tambahan</span>}
              </span>
            </button>
          </li>
        ))}
      </ul>

      {cur && (
        <div role="dialog" aria-modal="true" aria-label={cur.filename} className="on-dark fixed inset-0 z-50 flex flex-col bg-ink text-paper animate-fade">
          <header className="flex h-14 shrink-0 items-center justify-between gap-3 px-4">
            <span className="min-w-0 truncate font-mono text-xs text-sand">
              {String(open + 1).padStart(2, '0')} / {String(items.length).padStart(2, '0')} · {cur.filename}
              {cur.is_extra && <span className="ml-2 rounded-full bg-ink2 px-2 py-0.5 font-sans text-[11px] font-bold text-accent">Tambahan</span>}
            </span>
            <button type="button" onClick={close} aria-label="Tutup" className="btn-ghost h-10 w-10 shrink-0 px-0">
              <X size={16} />
            </button>
          </header>
          <div className="relative flex min-h-0 flex-1 items-center justify-center px-4 sm:px-16">
            {items.length > 1 && (
              <button type="button" onClick={() => go(-1)} aria-label="Sebelumnya" className="absolute left-2 top-1/2 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full bg-ink2 hover:bg-mute">
                <ChevronLeft size={18} />
              </button>
            )}
            <img key={cur.drive_file_id} src={src(cur.drive_file_id, 'full')} alt={cur.filename} className="max-h-full max-w-full object-contain animate-fade" />
            {items.length > 1 && (
              <button type="button" onClick={() => go(1)} aria-label="Berikutnya" className="absolute right-2 top-1/2 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full bg-ink2 hover:bg-mute">
                <ChevronRight size={18} />
              </button>
            )}
          </div>
          <footer className="shrink-0 px-4 pb-[max(16px,env(safe-area-inset-bottom))] pt-3">
            {cur.note ? (
              <p className="mx-auto max-w-lg rounded-2xl bg-ink2 px-4 py-2.5 text-center text-sm text-sand">
                <MessageSquare size={12} className="mr-1.5 inline" />
                {cur.note}
              </p>
            ) : (
              <p className="text-center text-xs text-faint">Tidak ada catatan dari klien</p>
            )}
          </footer>
        </div>
      )}
    </>
  )
}
