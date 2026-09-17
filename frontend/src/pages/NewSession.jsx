import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { ArrowRight } from 'lucide-react'
import AdminShell from '../components/AdminShell'
import { adminApi } from '../api/adminApi'
import { errorMessage } from '../api/client'

export default function NewSession() {
  const navigate = useNavigate()
  const [form, setForm] = useState({ client_name: '', drive_folder_id: '', photo_limit: 50, notes: '' })
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
      const s = await adminApi.createSession({ ...form, photo_limit: Number(form.photo_limit), notes: form.notes || null })
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

        <div>
          <label className="label" htmlFor="limit">
            Batas maksimal foto
          </label>
          <input id="limit" type="number" min={1} max={1000} className="field w-32 font-mono text-lg" required value={form.photo_limit} onChange={set('photo_limit')} />
          <p className="mt-2 text-xs text-mute">Klien tidak bisa memilih lebih dari angka ini.</p>
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
