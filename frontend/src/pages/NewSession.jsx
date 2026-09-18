import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { ArrowRight, Shuffle } from 'lucide-react'
import { randomPin, rememberPin } from '../utils/pin'
import AdminShell from '../components/AdminShell'
import { adminApi } from '../api/adminApi'
import { errorMessage } from '../api/client'

export default function NewSession() {
  const navigate = useNavigate()
  const [form, setForm] = useState({ client_name: '', drive_folder_id: '', photo_limit: 50, max_limit: '', pin: '', expires_at: '', notes: '' })
  const [check, setCheck] = useState(null)
  const [checking, setChecking] = useState(false)
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }))

  const checkFolder = async () => {
    if (!form.drive_folder_id.trim()) return
    setChecking(true)
    setCheck(null)
    try {
      setCheck(await adminApi.checkFolder(form.drive_folder_id))
    } catch (e) {
      setCheck({ ok: false, message: errorMessage(e) })
    } finally {
      setChecking(false)
    }
  }

  const submit = async (e) => {
    e.preventDefault()
    setBusy(true)
    setError('')
    try {
      const s = await adminApi.createSession({
        client_name: form.client_name,
        drive_folder_id: form.drive_folder_id,
        photo_limit: Number(form.photo_limit),
        max_limit: form.max_limit ? Number(form.max_limit) : null,
        pin: form.pin || null,
        expires_at: form.expires_at ? new Date(form.expires_at + 'T23:59:59').toISOString() : null,
        notes: form.notes || null,
      })
      rememberPin(s.id, form.pin)
      navigate(`/admin/sessions/${s.id}`, { state: { created: true } })
    } catch (err) {
      setError(errorMessage(err, 'Sesi tidak bisa dibuat.'))
    } finally {
      setBusy(false)
    }
  }

  return (
    <AdminShell eyebrow="Sesi baru" title="Buat galeri untuk klien">
      <form onSubmit={submit} className="max-w-xl space-y-10">
        <div>
          <label className="label" htmlFor="name">
            Nama klien
          </label>
          <input id="name" className="field text-lg" required value={form.client_name} onChange={set('client_name')} placeholder="Ayu & Bagus" />
          <p className="mt-2 text-xs text-mute">Tampil sebagai judul galeri.</p>
        </div>

        <div>
          <label className="label" htmlFor="folder">
            Folder Google Drive
          </label>
          <input
            id="folder"
            className="field font-mono text-sm"
            required
            value={form.drive_folder_id}
            onChange={(e) => {
              set('drive_folder_id')(e)
              setCheck(null)
            }}
            onBlur={checkFolder}
            placeholder="Tempel link folder atau ID-nya"
          />
          <p className="mt-2 text-xs text-mute">
            Folder harus sudah di-share (Viewer) ke email service account.{' '}
            {checking ? (
              <span className="text-ink">Memeriksa…</span>
            ) : check ? (
              <span className={check.ok ? 'text-ink' : 'text-danger'}>{check.message}</span>
            ) : null}
          </p>
        </div>

        <div className="grid grid-cols-2 gap-6">
          <div>
            <label className="label" htmlFor="limit">
              Foto dalam paket
            </label>
            <input id="limit" type="number" min={1} max={1000} className="field font-mono text-lg" required value={form.photo_limit} onChange={set('photo_limit')} />
            <p className="mt-2 text-xs text-mute">Jumlah yang termasuk harga paket.</p>
          </div>
          <div>
            <label className="label" htmlFor="max">
              Maksimal dengan tambahan
            </label>
            <input id="max" type="number" min={form.photo_limit || 1} max={2000} className="field font-mono text-lg" value={form.max_limit} onChange={set('max_limit')} placeholder="—" />
            <p className="mt-2 text-xs text-mute">Kosongkan jika klien tidak boleh melebihi paket.</p>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-6">
          <div>
            <label className="label" htmlFor="pin">
              PIN galeri (opsional)
            </label>
            <div className="flex items-end gap-2">
              <input id="pin" inputMode="numeric" pattern="[0-9]{4}" maxLength={4} className="field font-mono text-lg tracking-[0.3em]" value={form.pin} onChange={(e) => setForm((f) => ({ ...f, pin: e.target.value.replace(/\D/g, '') }))} placeholder="4 digit" />
              <button type="button" className="btn-ghost h-10 shrink-0 px-3 text-xs" onClick={() => setForm((f) => ({ ...f, pin: randomPin() }))} title="Buat PIN acak">
                <Shuffle size={13} /> Acak
              </button>
            </div>
            <p className="mt-2 text-xs text-mute">Klien harus memasukkan PIN sebelum melihat foto.</p>
          </div>
          <div>
            <label className="label" htmlFor="exp">
              Berlaku sampai (opsional)
            </label>
            <input id="exp" type="date" min={new Date().toISOString().slice(0, 10)} className="field font-mono text-sm" value={form.expires_at} onChange={set('expires_at')} />
            <p className="mt-2 text-xs text-mute">Setelah tanggal ini link tidak bisa dibuka.</p>
          </div>
        </div>

        <div>
          <label className="label" htmlFor="notes">
            Catatan (opsional)
          </label>
          <input id="notes" className="field" value={form.notes} onChange={set('notes')} placeholder="Prewedding, batch 1" />
        </div>

        {error && <p className="text-sm text-danger">{error}</p>}

        <div className="flex flex-wrap items-center gap-3 border-t border-line pt-6">
          <button type="submit" className="btn-ink" disabled={busy}>
            {busy ? 'Membuat…' : 'Buat sesi & link'} {!busy && <ArrowRight size={16} />}
          </button>
          <Link to="/admin" className="btn-ghost">
            Batal
          </Link>
        </div>
      </form>
    </AdminShell>
  )
}
