import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Copy, Download, Plus, RefreshCw } from 'lucide-react'
import AdminShell from '../components/AdminShell'
import StatusBadge from '../components/StatusBadge'
import ReadyDot from '../components/ReadyDot'
import Toast from '../components/Toast'
import { adminApi } from '../api/adminApi'
import { errorMessage } from '../api/client'
import { copyText } from '../hooks/useClipboard'

const fmtDate = (iso) =>
  new Date(iso).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })

export default function Dashboard() {
  const [sessions, setSessions] = useState(null)
  const [toast, setToast] = useState('')
  const [busy, setBusy] = useState(false)

  const load = useCallback(async () => {
    setBusy(true)
    try {
      setSessions(await adminApi.listSessions())
    } catch (e) {
      setToast(errorMessage(e))
    } finally {
      setBusy(false)
    }
  }, [])

  useEffect(() => {
    load()
  }, [load])

  const copyLink = async (s) => {
    setToast((await copyText(s.gallery_url)) ? `Link galeri ${s.client_name} disalin` : 'Gagal menyalin')
  }
  const copyNames = async (s) => {
    try {
      const { filenames, count } = await adminApi.filenames(s.id)
      setToast((await copyText(filenames)) ? `${count} nama file disalin` : 'Gagal menyalin')
    } catch (e) {
      setToast(errorMessage(e))
    }
  }
  const xmp = async (s) => {
    try {
      await adminApi.downloadXmp(s.id)
    } catch (e) {
      setToast(errorMessage(e))
    }
  }

  const pending = sessions?.filter((s) => s.status === 'pending').length ?? 0
  const completed = sessions?.filter((s) => s.status === 'completed').length ?? 0

  return (
    <AdminShell
      eyebrow="Dashboard"
      title="Sesi klien"
      actions={
        <div className="flex gap-2">
          <button type="button" onClick={load} className="btn-ghost h-10 w-10 px-0" aria-label="Muat ulang" disabled={busy}>
            <RefreshCw size={15} className={busy ? 'animate-spin' : ''} />
          </button>
          <Link to="/admin/new" className="btn-ink h-10">
            <Plus size={16} /> Sesi baru
          </Link>
        </div>
      }
    >
      <Toast message={toast} onClose={() => setToast('')} />

      <div className="mb-8 flex gap-8 font-mono text-xs text-mute">
        <span>
          <b className="mr-1 text-lg font-medium text-ink">{sessions?.length ?? '–'}</b> sesi
        </span>
        <span>
          <b className="mr-1 text-lg font-medium text-ink">{pending}</b> menunggu
        </span>
        <span>
          <b className="mr-1 text-lg font-medium text-ink">{completed}</b> selesai
        </span>
      </div>

      {sessions === null ? (
        <p className="eyebrow animate-pulse">Memuat</p>
      ) : sessions.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-line px-6 py-16 text-center">
          <p className="font-display text-3xl">Belum ada sesi</p>
          <p className="mt-2 text-sm text-mute">Buat sesi pertama: tempel ID folder Drive, tentukan batas foto, bagikan link ke klien.</p>
          <Link to="/admin/new" className="btn-ink mt-6">
            <Plus size={16} /> Buat sesi
          </Link>
        </div>
      ) : (
        <ul className="divide-y divide-line border-t border-line">
          {sessions.map((s) => (
            <li key={s.id} className="grid grid-cols-1 gap-3 py-4 sm:grid-cols-[1fr_auto] sm:items-center">
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
                  <Link to={`/admin/sessions/${s.id}`} className="font-display text-2xl leading-tight hover:underline">
                    {s.client_name}
                  </Link>
                  <StatusBadge status={s.status} />
                  {s.status === 'pending' && <ReadyDot sessionId={s.id} />}
                </div>
                <p className="mt-1 font-mono text-[11px] text-mute">
                  {fmtDate(s.created_at)}
                  <span className="mx-2 text-line">|</span>
                  {s.status === 'completed' ? `${s.selected_count} / ${s.photo_limit} dipilih` : `batas ${s.photo_limit}`}
                  <span className="mx-2 text-line">|</span>
                  <span className="select-all">{s.gallery_url.replace(/^https?:\/\//, '')}</span>
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                <button type="button" className="btn-ghost h-9 px-3 text-xs" onClick={() => copyLink(s)}>
                  <Copy size={13} /> Link
                </button>
                {s.status === 'completed' && (
                  <>
                    <button type="button" className="btn-ink h-9 px-3 text-xs" onClick={() => xmp(s)}>
                      <Download size={13} /> XMP .zip
                    </button>
                    <button type="button" className="btn-ghost h-9 px-3 text-xs" onClick={() => copyNames(s)}>
                      <Copy size={13} /> Nama file
                    </button>
                  </>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}
    </AdminShell>
  )
}
