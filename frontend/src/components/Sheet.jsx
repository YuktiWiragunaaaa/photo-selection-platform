// [ID] Pop-up bersama (sheet): mengunci scroll halaman agar tidak bergeser, bisa ditutup dengan ketuk latar.
import { useEffect, useRef } from 'react'
import { X } from 'lucide-react'
import clsx from 'clsx'
import { t } from '../utils/i18n'

let locks = 0
let savedY = 0
/**
 * Freeze the page behind a pop-up. `overflow:hidden` alone doesn't stop iOS/Android from
 * scrolling the page (and the address bar from resizing it), which made pop-ups jump around.
 */
export function lockScroll() {
  if (locks++ === 0) {
    savedY = window.scrollY
    const b = document.body.style
    b.position = 'fixed'
    b.top = `-${savedY}px`
    b.left = '0'
    b.right = '0'
    b.width = '100%'
  }
  return () => {
    if (--locks === 0) {
      const b = document.body.style
      b.position = b.top = b.left = b.right = b.width = ''
      window.scrollTo(0, savedY)
    }
  }
}

export function useLockScroll(active = true) {
  useEffect(() => (active ? lockScroll() : undefined), [active])
}

/**
 * Make the phone's Back button close an overlay instead of leaving the gallery.
 *
 * One shared history entry covers every open overlay: Back pops it and closes the topmost one,
 * while closing with X / Escape / backdrop removes the entry again so Back keeps its normal
 * meaning. Adding and removing the entry is deferred by a tick, so React re-mounting an overlay
 * (StrictMode in development, or one pop-up replacing another) doesn't push and pop in a loop.
 */
const openOverlays = []
let historyEntry = false
let syncQueued = false
let restoreOnPop = false // the next popstate is our own overlay entry going away

function syncHistoryEntry() {
  if (syncQueued) return
  syncQueued = true
  setTimeout(() => {
    syncQueued = false
    if (openOverlays.length && !historyEntry) {
      historyEntry = true
      // The page is already locked here, so the browser would remember scroll position 0 for the
      // gallery and jump to the top on Back (seen on phones). We restore the position ourselves.
      if ('scrollRestoration' in window.history) window.history.scrollRestoration = 'manual'
      window.history.pushState({ pspOverlay: true }, '')
    } else if (!openOverlays.length && historyEntry) {
      historyEntry = false
      restoreOnPop = true
      window.history.back()
    }
  }, 0)
}

if (typeof window !== 'undefined') {
  window.addEventListener('popstate', () => {
    const ours = historyEntry || restoreOnPop
    restoreOnPop = false
    if (!ours) return // riwayat biasa (pindah halaman), bukan pop-up kita
    // Setelah entri pop-up dilepas, kembalikan posisi scroll galeri (bukan ke paling atas).
    setTimeout(() => {
      if (historyEntry || openOverlays.length) return
      if (!locks) window.scrollTo(0, savedY)
      if ('scrollRestoration' in window.history) window.history.scrollRestoration = 'auto'
    }, 50)
    if (!historyEntry) return // pop-up sudah ditutup lewat X / Esc
    historyEntry = false
    openOverlays[openOverlays.length - 1]?.() // tutup pop-up teratas
    syncHistoryEntry() // masih ada pop-up lain di bawahnya? pasang entri baru
  })
}

export function useBackToClose(active, onClose) {
  const cb = useRef(onClose)
  cb.current = onClose
  useEffect(() => {
    if (!active) return
    const close = () => cb.current?.()
    openOverlays.push(close)
    syncHistoryEntry()
    return () => {
      const i = openOverlays.indexOf(close)
      if (i >= 0) openOverlays.splice(i, 1)
      syncHistoryEntry()
    }
  }, [active])
}

/**
 * Bottom sheet on phones, centred card on larger screens. Locks page scroll, closes on
 * backdrop tap / Escape (unless `persistent`), respects the phone's safe area.
 */
export default function Sheet({ open = true, onClose, persistent = false, labelledBy, children, className, wide = false }) {
  useLockScroll(open)
  useBackToClose(open && !persistent, onClose)
  const card = useRef(null)
  useEffect(() => {
    if (!open) return
    const onKey = (e) => e.key === 'Escape' && !persistent && onClose?.()
    window.addEventListener('keydown', onKey)
    card.current?.focus()
    return () => window.removeEventListener('keydown', onKey)
  }, [open, persistent, onClose])
  if (!open) return null
  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby={labelledBy}
      className="fixed inset-0 z-[70] flex items-end justify-center bg-black/50 animate-fade sm:items-center sm:p-4"
      style={{ touchAction: 'none', overscrollBehavior: 'contain' }}
      onClick={(e) => e.target === e.currentTarget && !persistent && onClose?.()}
    >
      <div
        ref={card}
        tabIndex={-1}
        className={clsx(
          'relative w-full overflow-y-auto rounded-t-[28px] bg-paper p-6 pb-[max(24px,env(safe-area-inset-bottom))] text-ink shadow-2xl outline-none animate-sheet sm:rounded-[28px] sm:pb-6',
          wide ? 'sm:max-w-lg' : 'sm:max-w-md',
          className,
        )}
        style={{ maxHeight: 'min(88dvh, 88vh)', touchAction: 'pan-y', overscrollBehavior: 'contain' }}
      >
        <span className="mx-auto -mt-2 mb-3 block h-1 w-10 rounded-full bg-line sm:hidden" aria-hidden />
        {!persistent && onClose && (
          <button type="button" onClick={onClose} aria-label={t('Tutup')} className="absolute right-3 top-3 flex h-10 w-10 items-center justify-center rounded-full text-mute hover:bg-wash hover:text-ink">
            <X size={18} />
          </button>
        )}
        {children}
      </div>
    </div>
  )
}
