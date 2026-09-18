import { useState } from 'react'
import { Pencil } from 'lucide-react'
import { adminApi } from '../api/adminApi'
import { errorMessage } from '../api/client'

const toDateInput = (iso) => (iso ? new Date(iso).toISOString().slice(0, 10) : '')

/** Inline editor for quota, PIN and expiry of an existing session. */
export default function AccessEditor({ session: s, onSaved, onToast }) {
  const [open, setOpen] = useState(false)
  const [busy, setBusy] = useState(false)
  const [f, setF] = useState({})

  const start = () => {
    setF({
      photo_limit: s.photo_limit,
      max_limit: s.max_limit || '',
      pin: '',
      pinMode: s.has_pin ? 'keep' : 'none', // keep | none | set
      expires_at: toDateInput(s.expires_at),
    })
    setOpen(true)
  }

  const save = async () => {
    setBusy(true)
    try {
      const body = {
        photo_limit: Number(f.photo_limit),
        max_limit: f.max_limit ? Number(f.max_limit) : Number(f.photo_limit),
      }
      if (f.pinMode === 'none') body.pin = ''
      if (f.pinMode === 'set') body.pin = f.pin
      if (f.expires_at) body.expires_at = new Date(f.expires_at + 'T23:59:59').toISOString()
      else body.clear_expiry = true
      onSaved(await adminApi.updateSession(s.id, body))
      onToast('Pengaturan sesi disimpan')
      setOpen(false)
    } catch (e) {
      onToast(errorMessage(e))
    } finally {
      setBusy(false)
    }
  }

  if (!open) {
    return (
      <button type="button" onClick={start} className="mt-4 inline-flex items-center gap-1.5 text-xs text-mute hover:text-ink">
        <Pencil size={12} /> Ubah kuota, PIN, atau masa berlaku
      </button>
    )
  }

  return (
    <div className="mt-4 rounded-xl border border-line p-4 animate-rise">
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="label" htmlFor="e-limit">
            Foto dalam paket
          </label>
          <input id="e-limit" type="number" min={1} max={1000} className="field font-mono" value={f.photo_limit} onChange={(e) => setF({ ...f, photo_limit: e.target.value })} />
        </div>
        <div>
          <label className="label" htmlFor="e-max">
            Maksimal dengan tambahan
          </label>
          <input id="e-max" type="number" min={f.photo_limit || 1} max={2000} className="field font-mono" value={f.max_limit} onChange={(e) => setF({ ...f, max_limit: e.target.value })} placeholder="—" />
        </div>
        <div>
          <span className="label">PIN</span>
          <div className="flex flex-wrap gap-1 text-xs">
            {[
              ['none', 'Tanpa PIN'],
              ...(s.has_pin ? [['keep', 'Tetap']] : []),
              ['set', s.has_pin ? 'Ganti' : 'Pasang'],
            ].map(([v, label]) => (
              <button
                key={v}
                type="button"
                onClick={() => setF({ ...f, pinMode: v })}
                className={`rounded-full border px-3 py-1.5 ${f.pinMode === v ? 'border-ink bg-ink text-paper' : 'border-line text-mute hover:border-ink'}`}
              >
                {label}
              </button>
            ))}
          </div>
          {f.pinMode === 'set' && (
            <input
              inputMode="numeric"
              maxLength={8}
              autoFocus
              className="field mt-2 font-mono tracking-[0.3em]"
              placeholder="4–8 digit"
              value={f.pin}
              onChange={(e) => setF({ ...f, pin: e.target.value.replace(/\D/g, '') })}
            />
          )}
        </div>
        <div>
          <label className="label" htmlFor="e-exp">
            Berlaku sampai
          </label>
          <input id="e-exp" type="date" className="field font-mono text-sm" value={f.expires_at} onChange={(e) => setF({ ...f, expires_at: e.target.value })} />
          <p className="mt-1 text-[11px] text-mute">Kosongkan untuk tanpa batas.</p>
        </div>
      </div>
      <div className="mt-4 flex justify-end gap-2">
        <button type="button" className="btn-ghost h-9 px-3 text-xs" onClick={() => setOpen(false)} disabled={busy}>
          Batal
        </button>
        <button type="button" className="btn-ink h-9 px-3 text-xs" onClick={save} disabled={busy || (f.pinMode === 'set' && f.pin.length < 4)}>
          {busy ? 'Menyimpan…' : 'Simpan'}
        </button>
      </div>
    </div>
  )
}
