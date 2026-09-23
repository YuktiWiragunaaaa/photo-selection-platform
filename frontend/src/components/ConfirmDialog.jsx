// [ID] Pop-up konfirmasi bertema untuk tindakan berisiko (keluar, hapus sesi, reset pilihan, kunci ulang).
import { useCallback, useState } from 'react'
import { TriangleAlert } from 'lucide-react'
import clsx from 'clsx'
import Sheet from './Sheet'
import { t } from '../utils/i18n'

/**
 * Themed stand-in for window.confirm(): follows the studio's colours and fonts instead of the
 * browser's grey box. Reach for it through `useConfirm()` so a button only needs one line.
 */
export default function ConfirmDialog({ title, message, confirmLabel, cancelLabel, danger = false, onConfirm, onCancel }) {
  return (
    <Sheet onClose={onCancel} labelledBy="confirm-dialog-title">
      <div className="flex gap-4">
        <span
          className={clsx('flex h-11 w-11 shrink-0 items-center justify-center rounded-full', danger ? 'bg-danger/15 text-danger' : 'bg-wash text-ink')}
          aria-hidden
        >
          <TriangleAlert size={20} />
        </span>
        <div className="min-w-0 pt-0.5">
          <h2 id="confirm-dialog-title" className="pr-8 font-display text-2xl leading-tight">
            {title}
          </h2>
          {message && <p className="mt-2 text-sm leading-relaxed text-mute">{message}</p>}
        </div>
      </div>
      <div className="mt-7 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
        <button type="button" onClick={onCancel} className="btn-ghost h-12 px-5 sm:h-11">
          {cancelLabel || t('Batal')}
        </button>
        <button
          type="button"
          autoFocus
          onClick={onConfirm}
          className={clsx('btn h-12 px-6 font-semibold sm:h-11', danger ? 'bg-danger text-paper hover:brightness-95' : 'btn-ink')}
        >
          {confirmLabel || t('Lanjutkan')}
        </button>
      </div>
    </Sheet>
  )
}

/**
 * Imperative confirm, so a call site stays one line:
 *   const [ask, dialog] = useConfirm()
 *   … if (await ask({ title: '…', danger: true })) doTheThing()
 *   … {dialog}
 */
export function useConfirm() {
  const [pending, setPending] = useState(null)
  const ask = useCallback((opts) => new Promise((resolve) => setPending({ opts, resolve })), [])
  const settle = (value) => {
    pending?.resolve(value)
    setPending(null)
  }
  const dialog = pending ? <ConfirmDialog {...pending.opts} onConfirm={() => settle(true)} onCancel={() => settle(false)} /> : null
  return [ask, dialog]
}
