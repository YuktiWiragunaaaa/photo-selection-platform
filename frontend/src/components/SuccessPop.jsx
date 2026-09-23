// [ID] Pop-up sukses kecil setelah klien menekan "Kirim": centang yang tergambar,
// cincin memantul dan titik-titik "confetti". Tidak menutupi seluruh layar, hilang sendiri.
import { useEffect } from 'react'
import { useT } from '../utils/i18n'

// Posisi titik confetti (sudut dalam derajat) — dihitung sekali saja
const DOTS = Array.from({ length: 10 }, (_, i) => i * 36)

export default function SuccessPop({ count, onDone }) {
  const t = useT()
  useEffect(() => {
    // Getar halus di HP yang mendukung (diabaikan bila tidak ada)
    try { navigator.vibrate?.([18, 40, 28]) } catch { /* abaikan */ }
    const t = setTimeout(onDone, 2600) // tutup otomatis
    return () => clearTimeout(t)
  }, [onDone])

  return (
    <div className="pointer-events-none fixed inset-x-0 top-1/3 z-50 flex justify-center px-4" role="status" aria-live="polite">
      <button
        type="button"
        onClick={onDone}
        className="pointer-events-auto flex items-center gap-4 rounded-[26px] bg-solid py-4 pl-4 pr-6 text-onsolid shadow-2xl animate-pop"
      >
        <span className="relative flex h-14 w-14 shrink-0 items-center justify-center">
          {/* Titik confetti yang memancar keluar */}
          {DOTS.map((deg, i) => (
            <span
              key={deg}
              className="absolute left-1/2 top-1/2 h-1.5 w-1.5 rounded-full bg-accent animate-burst"
              style={{ '--r': `${deg}deg`, animationDelay: `${120 + (i % 3) * 30}ms` }}
              aria-hidden
            />
          ))}
          {/* Lingkaran + centang yang tergambar */}
          <svg viewBox="0 0 56 56" className="h-14 w-14" aria-hidden>
            <circle cx="28" cy="28" r="26" className="fill-accent animate-ring" style={{ transformOrigin: 'center' }} />
            <path d="M17 29l7 7 15-16" fill="none" stroke="rgb(var(--c-onaccent))" strokeWidth="4.5" strokeLinecap="round" strokeLinejoin="round" className="animate-draw" style={{ strokeDasharray: 40, strokeDashoffset: 40 }} />
          </svg>
        </span>
        <span className="text-left">
          <span className="block text-lg font-extrabold leading-tight">{t('Terkirim!')}</span>
          <span className="block text-sm text-sand">{t('{n} foto sudah sampai ke fotografer', { n: count })}</span>
        </span>
      </button>
    </div>
  )
}
