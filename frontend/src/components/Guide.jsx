import { useEffect } from 'react'
import { ArrowRight, Check, Maximize2, MessageSquare, Send } from 'lucide-react'

const STEPS = [
  { icon: Check, title: 'Ketuk foto untuk memilih', body: 'Foto yang dipilih diberi tanda centang. Ketuk lagi untuk membatalkan.' },
  { icon: Maximize2, title: 'Tekan ikon ⤢ untuk melihat lebih besar', body: 'Di tampilan besar, geser ke kiri/kanan untuk pindah foto.' },
  { icon: MessageSquare, title: 'Tulis catatan jika perlu', body: 'Misalnya "tolong crop lebih ketat". Catatan ada di tampilan besar foto yang sudah dipilih.' },
  { icon: Send, title: 'Tekan "Kirim" jika sudah selesai', body: 'Pilihan tersimpan otomatis, jadi Anda bisa lanjut nanti, bahkan dari HP lain.' },
]

/** One-time walkthrough for first-time (non-technical) clients; reopenable from the "?" button. */
export default function Guide({ limit, maxLimit, deadline, onClose }) {
  useEffect(() => {
    const onKey = (e) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  return (
    <div role="dialog" aria-modal="true" aria-label="Cara memilih foto" className="fixed inset-0 z-50 flex items-end justify-center bg-ink/40 p-4 animate-fade sm:items-center">
      <div className="max-h-full w-full max-w-md overflow-y-auto rounded-[28px] bg-paper p-6 animate-rise">
        <p className="eyebrow">Panduan</p>
        <h2 className="mt-2 font-display text-4xl italic leading-tight">Cara memilih foto</h2>
        <p className="mt-2 text-sm text-mute">
          Anda bisa memilih <b className="text-ink">{limit} foto</b> dalam paket
          {maxLimit > limit && <> (maksimal {maxLimit} dengan biaya tambahan)</>}
          {deadline && <>, sebelum <b className="text-ink">{deadline}</b></>}.
        </p>
        <ol className="mt-6 space-y-4">
          {STEPS.map(({ icon: Icon, title, body }, i) => (
            <li key={i} className="flex gap-3">
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-accent text-ink">
                <Icon size={14} />
              </span>
              <div>
                <p className="text-sm font-medium">{title}</p>
                <p className="text-sm text-mute">{body}</p>
              </div>
            </li>
          ))}
        </ol>
        <button type="button" className="btn-accent mt-8 w-full" onClick={onClose} autoFocus>
          Mengerti <ArrowRight size={16} />
        </button>
      </div>
    </div>
  )
}
