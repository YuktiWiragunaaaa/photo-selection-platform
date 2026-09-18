import { useCallback, useEffect, useState } from 'react'
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom'
import { Copy, Download, Eye, ExternalLink, FolderSync, KeyRound, MessageCircle, MessageSquare, Pencil, RotateCcw, Eraser, Lock, Trash2 } from 'lucide-react'
import AccessEditor from '../components/AccessEditor'
import AdminPhotoGrid from '../components/AdminPhotoGrid'
import clsx from 'clsx'
import CacheStatus from '../components/CacheStatus'
import AdminShell from '../components/AdminShell'
import StatusBadge from '../components/StatusBadge'
import Toast from '../components/Toast'
import { adminApi } from '../api/adminApi'
import { errorMessage } from '../api/client'
import { copyText } from '../hooks/useClipboard'
import { recallPin } from '../utils/pin'

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
  const pin = s.has_pin ? recallPin(s.id) : ''
  const fmt = (d) => new Date(d).toLocaleString('id-ID', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })
  // ===== TEKS PESAN WHATSAPP — ubah kalimatnya di sini. Setiap baris = satu baris di WA, '' = baris kosong. =====
  const waText = [
    `Halo ${s.client_name}, fotonya sudah bisa dipilih ya.`,
    '',
    s.gallery_url,
    s.has_pin ? `PIN: ${pin || '[isi PIN]'}` : null,
    '',
    `Pilih ${s.photo_limit} foto favorit kalian ya${s.max_limit && s.max_limit > s.photo_limit ? ` (kalau mau lebih, bisa sampai ${s.max_limit} dengan biaya tambahan)` : ''}, lalu tekan Kirim.`,
    '',
    s.expires_at ? `Ditunggu sampai ${new Date(s.expires_at).toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long' })}.` : null,
    s.expires_at ? '' : null,
    'Terima kasih!',
  ]
    .filter((x) => x !== null)
    .join('\n')

  return (
    <AdminShell
      eyebrow={<Link to="/admin" className="hover:text-ink">← Semua sesi</Link>}
      title={<span className="font-display text-5xl font-normal italic tracking-normal sm:text-6xl">{s.client_name}</span>}
      actions={<StatusBadge session={s} className="h-[34px] px-3.5 text-[13px]" />}
    >
      <Toast message={toast} onClose={() => setToast('')} />

      <div className="grid gap-5 md:grid-cols-[1fr_1fr]">
        <section>
          <div className="on-dark flex flex-col gap-3.5 rounded-[26px] bg-ink p-5 text-paper sm:p-6">
          <p className="eyebrow">Link galeri klien</p>
          <div className="flex items-center gap-2 rounded-2xl bg-ink2 p-1.5 pl-4">
            <span className="min-w-0 flex-1 truncate font-mono text-sm">{s.gallery_url}</span>
            <button type="button" className="btn h-10 rounded-xl bg-paper px-4 text-xs font-bold text-ink hover:bg-sand" onClick={() => act(async () => { if (!(await copyText(s.gallery_url))) throw new Error() }, 'Link disalin')}>
              <Copy size={13} /> Salin
            </button>
            <a href={s.gallery_url} target="_blank" rel="noreferrer" className="btn-ghost h-10 w-10 px-0" aria-label="Buka galeri">
              <ExternalLink size={13} />
            </a>
          </div>

          <a
            href={`https://wa.me/?text=${encodeURIComponent(waText)}`}
            target="_blank"
            rel="noreferrer"
            className="btn-accent h-[50px] w-full px-4 text-sm"
          >
            <MessageCircle size={16} /> Kirim lewat WhatsApp{s.has_pin && !pin && ' (isi PIN dulu)'}
          </a>
          {!ready && <p className="text-xs text-sand">Tunggu “Galeri siap dibagikan” sebelum mengirim link, supaya klien tidak menunggu foto dimuat.</p>}
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

          <dl className="mt-4 grid grid-cols-2 gap-x-4 gap-y-3.5 rounded-[26px] bg-card p-5 text-sm sm:px-6 [&>dd]:min-w-0 [&>dt]:text-mute">
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
                <KeyRound size={11} /> {s.has_pin ? (pin ? `PIN ${pin}` : 'PIN aktif') : 'tanpa PIN'}
              </span>
              <span>
                {s.expires_at ? `berlaku s/d ${new Date(s.expires_at).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })}` : 'tanpa kedaluwarsa'}
              </span>
            </dd>
            <dt className="text-mute">Aktivitas klien</dt>
            <dd className="flex items-center gap-1">
              <Eye size={11} />
              {s.first_opened_at
                ? `dibuka ${fmt(s.first_opened_at)} · terakhir ${fmt(s.last_seen_at)}`
                : 'belum dibuka'}
              {!done && s.draft_count > 0 && ` · ${s.draft_count} foto sedang dipilih`}
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

          <div className="mt-4 flex flex-wrap gap-2">
            {done && (
              <button type="button" className="btn-ghost h-9 px-3 text-xs" onClick={() => confirm('Buka galeri lagi agar klien bisa mengubah pilihan? Pilihan sebelumnya tetap ada sebagai titik awal.') && act(async () => setS(await adminApi.reopenSession(s.id)), 'Galeri dibuka kembali')}>
                <RotateCcw size={13} /> Buka lagi
              </button>
            )}
            {s.has_pin && (
              <button
                type="button"
                className="btn-ghost h-9 px-3 text-xs"
                title="Semua perangkat yang sudah membuka galeri harus memasukkan PIN lagi. PIN tetap sama, pilihan klien tidak hilang."
                onClick={() =>
                  confirm('Kunci ulang semua perangkat? Siapa pun yang sudah membuka galeri harus memasukkan PIN lagi. PIN tetap sama dan pilihan klien tidak hilang.') &&
                  act(async () => setS(await adminApi.relockSession(s.id)), 'Semua perangkat dikunci ulang')
                }
              >
                <Lock size={13} /> Kunci ulang perangkat
              </button>
            )}
            {(done || s.draft_count > 0) && (
              <button
                type="button"
                className="btn-ghost h-9 px-3 text-xs"
                onClick={() =>
                  confirm('Reset semua pilihan, catatan, dan tanda klien? Klien akan mulai memilih dari nol. Tindakan ini tidak bisa dibatalkan.') &&
                  act(async () => setS(await adminApi.resetSession(s.id)), 'Pilihan direset — galeri kosong kembali')
                }
              >
                <Eraser size={13} /> Reset pilihan
              </button>
            )}
            <button type="button" className="btn-ghost h-9 px-3 text-xs text-danger hover:border-danger" onClick={() => confirm(`Hapus sesi ${s.client_name}? Link galeri akan mati.`) && act(async () => { await adminApi.deleteSession(s.id); navigate('/admin') })}>
              <Trash2 size={13} /> Hapus sesi
            </button>
          </div>
        </section>

        <section className="rounded-[26px] bg-card p-5 sm:p-6">
          <p className="eyebrow">{done ? 'Hasil pilihan' : 'Pilihan sementara'}</p>
          {!done ? (
            <>
              <p className="mt-3 flex items-baseline gap-2.5">
                <span className="font-mono text-[56px] leading-none tracking-[-0.05em]">{s.draft_count}</span>
                <span className="font-mono text-[22px] text-faint">/ {s.photo_limit}</span>
                <span className="ml-1 text-sm text-mute">{s.first_opened_at ? 'tersimpan otomatis' : 'klien belum membuka galeri'}</span>
              </p>
              <AdminPhotoGrid slug={s.slug} token={s.gallery_token} items={s.draft_photos || []} />
              <p className="mt-4 text-sm text-mute">Export XMP, CSV, dan nama file aktif setelah klien menekan “Kirim”.</p>
            </>
          ) : (
            <>
              <div className="mt-3 flex flex-wrap items-baseline gap-x-2.5 gap-y-2">
                <span className="font-mono text-[56px] leading-none tracking-[-0.05em]">{s.selected_count}</span>
                <span className="font-mono text-[22px] leading-none text-faint">/ {s.photo_limit}</span>
                {s.extra_count > 0 && (
                  <span className="self-center whitespace-nowrap rounded-full bg-ink px-2.5 py-1 text-xs font-bold text-accent">+{s.extra_count} di luar paket</span>
                )}
              </div>
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
              <AdminPhotoGrid slug={s.slug} token={s.gallery_token} items={s.selected_photos} />
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
