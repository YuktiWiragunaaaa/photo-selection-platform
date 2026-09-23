// [ID] Halaman PIN galeri: 4 kotak angka (satu kolom tersembunyi di baliknya) + Enter untuk membuka.
import { useRef, useState } from 'react'
import { ArrowRight } from 'lucide-react'
import clsx from 'clsx'
import { galleryApi, galleryToken } from '../api/galleryApi'
import { errorMessage } from '../api/client'
import { useT } from '../utils/i18n'
import ViewControls from './ViewControls'
import { BrandHeader } from './Brand'

const PANJANG = 4

export default function PinGate({ slug, meta, onUnlocked }) {
  const t = useT()
  const [pin, setPin] = useState('')
  const [fokus, setFokus] = useState(false)
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const kolom = useRef(null)

  const kirim = async (e) => {
    e?.preventDefault()
    if (busy || pin.length < PANJANG) return
    setBusy(true)
    setError('')
    try {
      const { token } = await galleryApi.unlock(slug, pin)
      galleryToken.set(slug, token)
      onUnlocked()
    } catch (err) {
      setError(errorMessage(err, t('PIN salah.')))
      setPin('')
      kolom.current?.focus()
    } finally {
      setBusy(false)
    }
  }

  // Satu kolom teks tak terlihat menampung seluruh PIN; kotak di bawahnya hanya tampilan.
  // Cara ini aman untuk ketikan cepat, tempel, dan keyboard angka di HP.
  const kotakAktif = Math.min(pin.length, PANJANG - 1)

  return (
    <main className="flex min-h-screen flex-col px-6">
      <div className="flex items-start justify-between gap-3 pt-6">
        <BrandHeader branding={meta.branding} />
        <ViewControls theme={meta.branding?.theme} />
      </div>
      <form onSubmit={kirim} className="m-auto w-full max-w-xs animate-rise">
        <p className="eyebrow">{t('Galeri privat')}</p>
        <h1 className="mt-3 font-display text-5xl leading-none">{meta.client_name}</h1>
        <p className="mt-4 text-sm text-mute">{t('Masukkan 4 angka PIN yang diberikan fotografer untuk membuka galeri.')}</p>
        <label className="label mt-10" htmlFor="pin">
          {t('PIN')}
        </label>
        <div className="relative mt-2" onClick={() => kolom.current?.focus()}>
          <input
            id="pin"
            ref={kolom}
            inputMode="numeric"
            pattern="[0-9]*"
            autoComplete="one-time-code"
            maxLength={PANJANG}
            autoFocus
            value={pin}
            onChange={(e) => setPin(e.target.value.replace(/\D/g, '').slice(0, PANJANG))}
            onKeyDown={(e) => e.key === 'Enter' && kirim(e)}
            onFocus={() => setFokus(true)}
            onBlur={() => setFokus(false)}
            aria-label={t('PIN 4 angka')}
            aria-invalid={!!error}
            className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
          />
          <div className="pointer-events-none flex gap-2.5" aria-hidden="true">
            {Array.from({ length: PANJANG }, (_, i) => (
              <span
                key={i}
                className={clsx(
                  'flex h-16 flex-1 items-center justify-center rounded-2xl border-[1.5px] bg-card font-mono text-2xl text-ink transition-colors',
                  error ? 'border-danger' : fokus && i === kotakAktif ? 'border-ink' : 'border-line',
                )}
              >
                {pin[i] || ''}
              </span>
            ))}
          </div>
        </div>
        {error && <p className="mt-2 text-xs text-danger">{error}</p>}
        <button type="submit" className="btn-ink mt-8 w-full" disabled={busy || pin.length < PANJANG}>
          {busy ? t('Memeriksa…') : t('Buka galeri')} {!busy && <ArrowRight size={16} />}
        </button>
      </form>
    </main>
  )
}
