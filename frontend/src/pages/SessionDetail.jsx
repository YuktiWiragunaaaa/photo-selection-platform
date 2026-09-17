import { useCallback, useEffect, useState } from 'react'
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom'
import { Copy, Download, ExternalLink, RotateCcw, Trash2 } from 'lucide-react'
import AdminShell from '../components/AdminShell'
import StatusBadge from '../components/StatusBadge'
import Toast from '../components/Toast'
import { adminApi } from '../api/adminApi'
import { errorMessage } from '../api/client'
import { copyText } from '../hooks/useClipboard'

export default function SessionDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { state } = useLocation()
  const [s, setS] = useState(null)
  const [toast, setToast] = useState(state?.created ? 'Sesi dibuat. Salin link dan kirim ke klien.' : '')
  const [error, setError] = useState('')

  const load = useCallback(() => adminApi.getSession(id).then(setS).catch((e) => setError(errorMessage(e))), [id])
  useEffect(() => {
    load()
  }, [load])

  const act = async (fn, okMsg) => {
    try {
      await fn()
      if (okMsg) setToast(okMsg)
    } catch (e) {
      setToast(errorMessage(e))
    }
  }

  if (error) return <AdminShell title="Sesi tidak ditemukan"><p className="text-sm text-mute">{error}</p></AdminShell>
  if (!s) return <AdminShell title=" "><p className="eyebrow animate-pulse">Memuat</p></AdminShell>

  const done = s.status === 'completed'

  return (
    <AdminShell
      eyebrow={<Link to="/admin" className="hover:text-ink">← Semua sesi</Link>}
      title={s.client_name}
      actions={<StatusBadge status={s.status} />}
    >
      <Toast message={toast} onClose={() => setToast('')} />

      <div className="grid gap-10 md:grid-cols-[1fr_1fr]">
        <section>
          <p className="eyebrow">Link galeri klien</p>
          <div className="mt-3 flex items-center gap-2 rounded-xl border border-line p-2 pl-4">
            <span className="min-w-0 flex-1 truncate font-mono text-sm">{s.gallery_url}</span>
            <button type="button" className="btn-ghost h-9 px-3 text-xs" onClick={() => act(async () => { if (!(await copyText(s.gallery_url))) throw new Error() }, 'Link disalin')}>
              <Copy size={13} /> Salin
            </button>
            <a href={s.gallery_url} target="_blank" rel="noreferrer" className="btn-ghost h-9 w-9 px-0" aria-label="Buka galeri">
              <ExternalLink size={13} />
            </a>
          </div>

          <dl className="mt-8 grid grid-cols-2 gap-y-4 font-mono text-xs">
            <dt className="text-mute">Folder Drive</dt>
            <dd className="truncate">{s.drive_folder_id}</dd>
            <dt className="text-mute">Batas foto</dt>
            <dd>{s.photo_limit}</dd>
            <dt className="text-mute">Dibuat</dt>
            <dd>{new Date(s.created_at).toLocaleString('id-ID')}</dd>
            {done && (
              <>
                <dt className="text-mute">Dikirim</dt>
                <dd>{new Date(s.submitted_at).toLocaleString('id-ID')}</dd>
              </>
            )}
            {s.notes && (
              <>
                <dt className="text-mute">Catatan</dt>
                <dd className="font-sans">{s.notes}</dd>
              </>
            )}
          </dl>

          <div className="mt-8 flex flex-wrap gap-2 border-t border-line pt-6">
            {done && (
              <button type="button" className="btn-ghost h-9 px-3 text-xs" onClick={() => confirm('Hapus pilihan klien dan buka galeri lagi?') && act(async () => setS(await adminApi.reopenSession(s.id)), 'Galeri dibuka kembali')}>
                <RotateCcw size={13} /> Buka lagi
              </button>
            )}
            <button type="button" className="btn-ghost h-9 px-3 text-xs text-danger hover:border-danger" onClick={() => confirm(`Hapus sesi ${s.client_name}? Link galeri akan mati.`) && act(async () => { await adminApi.deleteSession(s.id); navigate('/admin') })}>
              <Trash2 size={13} /> Hapus sesi
            </button>
          </div>
        </section>

        <section>
          <p className="eyebrow">Hasil pilihan</p>
          {!done ? (
            <p className="mt-3 text-sm text-mute">Klien belum mengirim pilihan. Halaman ini akan menampilkan daftar file setelah klien menekan “Kirim pilihan”.</p>
          ) : (
            <>
              <p className="mt-3 font-display text-4xl">
                {s.selected_count} <span className="text-faint">/ {s.photo_limit}</span>
              </p>
              <div className="mt-4 flex flex-wrap gap-2">
                <button type="button" className="btn-ink h-9 px-3 text-xs" onClick={() => act(() => adminApi.downloadXmp(s.id))}>
                  <Download size={13} /> XMP .zip
                </button>
                <button type="button" className="btn-ghost h-9 px-3 text-xs" onClick={() => act(async () => { const { filenames } = await adminApi.filenames(s.id); if (!(await copyText(filenames))) throw new Error() }, 'Nama file disalin')}>
                  <Copy size={13} /> Salin nama file
                </button>
                <button type="button" className="btn-ghost h-9 px-3 text-xs" onClick={() => act(() => adminApi.downloadCsv(s.id))}>
                  <Download size={13} /> CSV
                </button>
              </div>
              <ol className="mt-6 max-h-96 columns-2 gap-6 overflow-auto font-mono text-xs leading-6">
                {s.selected_photos.map((p) => (
                  <li key={p.drive_file_id} className="truncate">{p.filename}</li>
                ))}
              </ol>
              <p className="mt-6 text-xs text-mute">
                Ekstrak ZIP ke folder RAW, lalu <b className="text-ink">Capture One → Image → Synchronize Metadata</b> atau <b className="text-ink">Lightroom → Metadata → Read Metadata from File</b>. Foto pilihan mendapat ★5 dan label hijau.
              </p>
            </>
          )}
        </section>
      </div>
    </AdminShell>
  )
}
