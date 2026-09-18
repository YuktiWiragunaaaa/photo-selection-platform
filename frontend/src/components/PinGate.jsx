import { useState } from 'react'
import { ArrowRight } from 'lucide-react'
import { galleryApi, galleryToken } from '../api/galleryApi'
import { errorMessage } from '../api/client'
import { BrandHeader } from './Brand'

export default function PinGate({ slug, meta, onUnlocked }) {
  const [pin, setPin] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  const submit = async (e) => {
    e.preventDefault()
    setBusy(true)
    setError('')
    try {
      const { token } = await galleryApi.unlock(slug, pin)
      galleryToken.set(slug, token)
      onUnlocked()
    } catch (err) {
      setError(errorMessage(err, 'PIN salah.'))
      setPin('')
    } finally {
      setBusy(false)
    }
  }

  return (
    <main className="flex min-h-screen flex-col px-6">
      <div className="pt-6">
        <BrandHeader branding={meta.branding} />
      </div>
      <form onSubmit={submit} className="m-auto w-full max-w-xs animate-rise">
        <p className="eyebrow">Galeri privat</p>
        <h1 className="mt-3 font-display text-5xl leading-none">{meta.client_name}</h1>
        <p className="mt-4 text-sm text-mute">Masukkan PIN yang diberikan fotografer untuk membuka galeri.</p>
        <label className="label mt-10" htmlFor="pin">
          PIN
        </label>
        <input
          id="pin"
          inputMode="numeric"
          autoComplete="one-time-code"
          pattern="[0-9]*"
          maxLength={8}
          autoFocus
          className="field font-mono text-2xl tracking-[0.4em]"
          value={pin}
          onChange={(e) => setPin(e.target.value.replace(/\D/g, ''))}
          aria-invalid={!!error}
        />
        {error && <p className="mt-2 text-xs text-danger">{error}</p>}
        <button type="submit" className="btn-ink mt-8 w-full" disabled={busy || pin.length < 4}>
          {busy ? 'Memeriksa…' : 'Buka galeri'} {!busy && <ArrowRight size={16} />}
        </button>
      </form>
    </main>
  )
}
