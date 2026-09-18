import { useCallback, useEffect, useState } from 'react'
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom'
import { Copy, Download, ExternalLink, FolderSync, KeyRound, MessageSquare, Pencil, RotateCcw, Trash2 } from 'lucide-react'
import AccessEditor from '../components/AccessEditor'
import clsx from 'clsx'
import CacheStatus from '../components/CacheStatus'
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
  const [ready, setReady] = useState(false)
  const [syncKey, setSyncKey] = useState(0)
  const [syncing, setSyncing] = useState(false)

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
            <button type="button" className={clsx(ready ? 'btn-ink' : 'btn-ghost', 'h-9 px-3 text-xs')} onClick={() => act(async () => { if (!(await copyText(s.gallery_url))) throw new Error() }, 'Link disalin')}>
              <Copy size={13} /> Salin
            </button>
            <a href={s.gallery_url} target="_blank" rel="noreferrer" className="btn-ghost h-9 w-9 px-0" aria-label="Buka galeri">
              <ExternalLink size={13} />
            </a>
          </div>

          <div className="mt-4 flex items-start justify-between gap-4">
            <div className="min-w-0 flex-1">
              <CacheStatus sessionId={s.id} onReady={setReady} refreshKey={syncKey} />
            </div>
            <button
              type="button"
              className="btn-ghost h-9 shrink-0 px-3 text-xs"
              disabled={syncing}
              title="Baca ulang folder Drive (foto ditambah/dihapus)"
              onClick={() =>
                act(async () => {
                  setSyncing(true)
                  try {
                    setS(await adminApi.syncSession(s.id))
                    setSyncKey((k) => k + 1)
                  } finally {
                    setSyncing(false)
                  }
                }, 'Folder disinkronkan; cache sedang dimuat ulang')
              }
            >
              <FolderSync size={13} className={clsx(syncing && 'animate-spin')} /> Sinkronkan
            </button>
          </div>

          <dl className="mt-8 grid grid-cols-2 gap-y-4 font-mono text-xs">
            <dt className="text-mute">Folder Drive</dt>
            <dd className="truncate">{s.drive_folder_id}</dd>
            <dt className="text-mute">Paket / maksimal</dt>
            <dd>
              {s.photo_limit}
              {s.max_limit && s.max_limit > s.photo_limit ? ` / ${s.max_limit}` : ' (tanpa tambahan)'}
            </dd>
            <dt className="text-mute">Akses</dt>
            <dd className="flex flex-wrap items-center gap-x-3 gap-y-1">
              <span className="inline-flex items-center gap-1">
                <KeyRound size={11} /> {s.has_pin ? 'PIN aktif' : 'tanpa PIN'}
              </span>
              <span>
                {s.expires_at ? `berlaku s/d ${new Date(s.expires_at).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })}` : 'tanpa kedaluwarsa'}
              </span>
            </dd>
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

          <AccessEditor session={s} onSaved={setS} onToast={setToast} />

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
                {s.extra_count > 0 && <span className="ml-3 font-mono text-sm text-ink">+{s.extra_count} di luar paket</span>}
              </p>
              {s.extra_count > 0 && (
                <p className="mt-1 text-xs text-mute">Foto tambahan diberi label <b className="text-ink">kuning</b> di XMP dan ditandai <code>extra=yes</code> di CSV.</p>
              )}
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
              <ul className="mt-6 grid grid-cols-3 gap-2 sm:grid-cols-4">
                {s.selected_photos.map((p) => (
                  <li key={p.drive_file_id} className="group relative aspect-[3/2] overflow-hidden rounded-[3px] bg-wash">
                    <img
                      src={`/api/gallery/${s.slug}/img/${p.drive_file_id}?size=thumb${s.gallery_token ? `&t=${s.gallery_token}` : ''}`}
                      alt={p.filename}
                      loading="lazy"
                      className="h-full w-full object-cover"
                    />
                    <span className="absolute bottom-1 left-1 rounded bg-paper/85 px-1 py-0.5 font-mono text-[10px] backdrop-blur">
                      {p.filename.replace(/\.[^.]+$/, '')}
                    </span>
                    {p.is_extra && <span className="absolute right-1 top-1 rounded bg-ink px-1 py-0.5 font-mono text-[9px] uppercase text-paper">extra</span>}
                    {p.note && (
                      <span className="absolute left-1 top-1 flex h-5 w-5 items-center justify-center rounded-full bg-paper/90" title={p.note}>
                        <MessageSquare size={10} />
                      </span>
                    )}
                  </li>
                ))}
              </ul>
              {s.selected_photos.some((p) => p.note) && (
                <div className="mt-6">
                  <p className="eyebrow">Catatan klien</p>
                  <ul className="mt-2 divide-y divide-line border-y border-line text-sm">
                    {s.selected_photos.filter((p) => p.note).map((p) => (
                      <li key={p.drive_file_id} className="flex gap-4 py-2">
                        <span className="w-24 shrink-0 font-mono text-xs text-mute">{p.filename.replace(/\.[^.]+$/, '')}</span>
                        <span>{p.note}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
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
