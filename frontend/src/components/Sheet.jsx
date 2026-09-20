// [ID] Pop-up bersama (sheet): mengunci scroll halaman agar tidak bergeser, bisa ditutup dengan ketuk latar.
import { useEffect, useRef } from 'react'
import { X } from 'lucide-react'
import clsx from 'clsx'

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
 * Bottom sheet on phones, centred card on larger screens. Locks page scroll, closes on
 * backdrop tap / Escape (unless `persistent`), respects the phone's safe area.
 */
export default function Sheet({ open = true, onClose, persistent = false, labelledBy, children, className, wide = false }) {
  useLockScroll(open)
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
          <button type="button" onClick={onClose} aria-label="Tutup" className="absolute right-3 top-3 flex h-10 w-10 items-center justify-center rounded-full text-mute hover:bg-wash hover:text-ink">
            <X size={18} />
          </button>
        )}
        {children}
      </div>
    </div>
  )
}
