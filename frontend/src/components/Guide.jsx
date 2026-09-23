// [ID] Pop-up panduan "Cara memilih" untuk klien.
import { ArrowRight, Check, Maximize2, MessageSquare, Send } from 'lucide-react'
import Sheet from './Sheet'
import { useT } from '../utils/i18n'

const STEPS = [
  { icon: Check, title: 'Ketuk foto untuk memilih', body: 'Ketuk lagi untuk membatalkan.' },
  { icon: Maximize2, title: 'Ikon ⤢ untuk melihat besar', body: 'Geser kiri/kanan untuk pindah foto.' },
  { icon: MessageSquare, title: 'Tulis catatan bila perlu', body: 'Ada di tampilan besar foto yang dipilih.' },
  { icon: Send, title: 'Tekan “Kirim” jika selesai', body: 'Pilihan tersimpan otomatis, bisa dilanjut nanti.' },
]

/** Short how-to, shown once after the intro and reopenable from “Cara memilih”. */
export default function Guide({ limit, maxLimit, deadline, onClose }) {
  const t = useT()
  return (
    <Sheet onClose={onClose} labelledBy="guide-title">
      <p className="eyebrow">{t('Panduan')}</p>
      <h2 id="guide-title" className="mt-1 pr-10 font-display text-3xl leading-tight">
        {t('Cara memilih foto')}
      </h2>
      <p className="mt-2 text-sm text-mute">
        {t('Pilih')} <b className="text-ink">{t('{n} foto', { n: limit })}</b>
        {maxLimit > limit && <>{t(' (bisa sampai {n} dengan biaya tambahan)', { n: maxLimit })}</>}
        {deadline && (
          <>
            {t(' sebelum ')}
            <b className="text-ink">{deadline}</b>
          </>
        )}
        .
      </p>
      <ol className="mt-5 grid gap-3">
        {STEPS.map(({ icon: Icon, title, body }, i) => (
          <li key={i} className="flex items-center gap-3">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-accent text-onaccent">
              <Icon size={15} />
            </span>
            <span className="min-w-0">
              <span className="block text-sm font-semibold leading-snug">{t(title)}</span>
              <span className="block text-[13px] leading-snug text-mute">{t(body)}</span>
            </span>
          </li>
        ))}
      </ol>
      <button type="button" className="btn-accent mt-6 h-12 w-full" onClick={onClose}>
        {t('Mulai memilih')} <ArrowRight size={16} />
      </button>
    </Sheet>
  )
}
