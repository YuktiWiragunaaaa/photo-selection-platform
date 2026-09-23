// [ID] Detail satu sesi (ADMIN): link & WhatsApp, info, tombol aksi, hasil pilihan, export XMP/CSV.
import { useCallback, useEffect, useState } from 'react'
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom'
import { Copy, Download, Eye, FolderDown, ExternalLink, FolderSync, KeyRound, MessageCircle, MessageSquare, Pencil, RotateCcw, Eraser, Lock, Trash2 } from 'lucide-react'
import AccessEditor from '../components/AccessEditor'
import AdminPhotoGrid from '../components/AdminPhotoGrid'
import clsx from 'clsx'
import CacheStatus from '../components/CacheStatus'
import AdminShell from '../components/AdminShell'
import StatusBadge from '../components/StatusBadge'
import Toast from '../components/Toast'
import { useConfirm } from '../components/ConfirmDialog'
import { dateLocale, t } from '../utils/i18n'
import { adminApi } from '../api/adminApi'
import { errorMessage } from '../api/client'
import { copyText } from '../hooks/useClipboard'
import { recallPin } from '../utils/pin'

// Chrome/Edge desktop can write straight into a chosen folder (no zip, no extracting)
const canPickFolder = typeof window !== 'undefined' && 'showDirectoryPicker' in window
async function saveXmpToFolder(id) {
  let dir
  try {
    dir = await window.showDirectoryPicker({ id: 'raw-folder', mode: 'readwrite' })
  } catch {
    return 0 // cancelled
  }
  const files = await adminApi.xmpFiles(id)
  for (const f of files) {
    const handle = await dir.getFileHandle(f.name, { create: true })
    const w = await handle.createWritable()
    await w.write(f.content)
    await w.close()
  }
  return files.length
}
import { DEFAULT_WA_TEMPLATE as DEFAULT_WA, fillWaTemplate, useStudio } from '../utils/theme'

export default function SessionDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { state } = useLocation()
  const [s, setS] = useState(null)
  const [toast, setToast] = useState(state?.created ? t('Sesi dibuat. Salin link dan kirim ke klien.') : '')
  const [error, setError] = useState('')
  const [ready, setReady] = useState(false)
  const [syncKey, setSyncKey] = useState(0)
  const [syncing, setSyncing] = useState(false)
  const [waTemplate, setWaTemplate] = useState('')
  const [ask, confirmDialog] = useConfirm()
  const studio = useStudio()
  useEffect(() => {
    adminApi
      .getSettings()
      .then((x) => setWaTemplate(x.theme.wa_template))
      .catch(() => {})
  }, [])

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

  if (error) return <AdminShell title={t('Sesi tidak ditemukan')}><p className="text-sm text-mute">{error}</p></AdminShell>
  if (!s) return <AdminShell title=" "><p className="eyebrow animate-pulse">{t('Memuat')}</p></AdminShell>

  const done = s.status === 'completed'
  const pin = s.has_pin ? recallPin(s.id) : ''
  const fmt = (d) => new Date(d).toLocaleString(dateLocale(), { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })
  // Teks pesan WhatsApp diatur dari admin: Pengaturan → Pesan WhatsApp (tanpa buka kode)
  // Template bawaan (belum diubah admin) ikut bahasa panel; template buatan sendiri dipakai apa adanya
  const isDefault = !waTemplate || waTemplate.trim() === DEFAULT_WA.trim()
  const tpl = isDefault ? t(DEFAULT_WA) : waTemplate
  // Isian ({tambahan}, {deadline}) ikut bahasa template: template buatan sendiri tetap berbahasa Indonesia
  const wt = (k, v = {}) => (isDefault ? t(k, v) : Object.entries(v).reduce((out, [a, b]) => out.split(`{${a}}`).join(b), k))
  const waText = fillWaTemplate(tpl, {
    nama: s.client_name,
    link: s.gallery_url,
    pin: s.has_pin ? pin || wt('[isi PIN]') : '',
    paket: s.photo_limit,
    tambahan: s.max_limit && s.max_limit > s.photo_limit ? wt(' (kalau mau lebih, bisa sampai {n} dengan biaya tambahan)', { n: s.max_limit }) : '',
    deadline: s.expires_at ? new Date(s.expires_at).toLocaleDateString(isDefault ? dateLocale() : 'id-ID', { weekday: 'long', day: 'numeric', month: 'long' }) : '',
    studio: studio?.studio_name,
  })

  return (
    <AdminShell
      eyebrow={<Link to="/admin" className="hover:text-ink">← {t('Semua sesi')}</Link>}
      title={<span className="font-display text-4xl font-normal tracking-normal sm:text-6xl">{s.client_name}</span>}
      actions={<StatusBadge session={s} className="h-[34px] px-3.5 text-[13px]" />}
    >
      <Toast message={toast} onClose={() => setToast('')} />

      <div className="grid gap-5 xl:grid-cols-[1fr_1fr]">
        <section>
          <div className="on-dark flex flex-col gap-3.5 rounded-[26px] bg-solid p-5 text-onsolid sm:p-6">
          <p className="eyebrow">{t('Link galeri klien')}</p>
          <div className="flex items-center gap-2 rounded-2xl bg-ink2 p-1.5 pl-4">
            <span className="min-w-0 flex-1 truncate font-mono text-sm">{s.gallery_url}</span>
            <button type="button" className="btn h-10 rounded-xl bg-paper px-4 text-xs font-bold text-ink hover:bg-sand" onClick={() => act(async () => { if (!(await copyText(s.gallery_url))) throw new Error() }, t('Link disalin'))}>
              <Copy size={13} /> {t('Salin')}
            </button>
            <a href={`${s.gallery_url}?preview=1`} target="_blank" rel="noreferrer" className="btn-ghost h-10 w-10 px-0" aria-label={t('Buka galeri')}>
              <ExternalLink size={13} />
            </a>
          </div>

          <a
            href={`https://wa.me/${s.client_wa || ''}?text=${encodeURIComponent(waText)}`}
            target="_blank"
            rel="noreferrer"
            className="btn-accent h-[50px] w-full px-4 text-sm"
          >
            <MessageCircle size={16} /> {t('Kirim lewat WhatsApp')}{s.has_pin && !pin && t(' (isi PIN dulu)')}
          </a>
          <p className="text-xs text-sand">
            {s.client_wa
              ? t('Langsung terbuka ke chat +{wa}.', { wa: s.client_wa })
              : t('Nomor WA klien belum diisi, jadi kontaknya masih dipilih sendiri di WhatsApp. Isi lewat “Edit sesi”.')}
          </p>
          {!ready && <p className="text-xs text-sand">{t('Tunggu “Galeri siap dibagikan” sebelum mengirim link, supaya klien tidak menunggu foto dimuat.')}</p>}
          </div>

          <div className="mt-4 flex items-start justify-between gap-4">
            <div className="min-w-0 flex-1">
              <CacheStatus sessionId={s.id} onReady={setReady} refreshKey={syncKey} />
            </div>
            <button
              type="button"
              className="btn-ghost h-9 shrink-0 px-3 text-xs"
              disabled={syncing}
              title={t('Baca ulang folder Drive (foto ditambah/dihapus)')}
              onClick={() =>
                act(async () => {
                  setSyncing(true)
                  try {
                    setS(await adminApi.syncSession(s.id))
                    setSyncKey((k) => k + 1)
                  } finally {
                    setSyncing(false)
                  }
                }, t('Folder disinkronkan; cache sedang dimuat ulang'))
              }
            >
              <FolderSync size={13} className={clsx(syncing && 'animate-spin')} /> {t('Sinkronkan')}
            </button>
          </div>

          <dl className="mt-4 grid grid-cols-1 gap-x-4 gap-y-1 rounded-[26px] bg-card p-5 text-sm sm:grid-cols-[10rem_minmax(0,1fr)] sm:gap-y-3.5 sm:px-6 [&>dd]:mb-3 [&>dd]:min-w-0 [&>dd]:break-words sm:[&>dd]:mb-0 [&>dt]:text-xs [&>dt]:text-mute sm:[&>dt]:text-sm">
            <dt className="text-mute">{t('Folder Drive')}</dt>
            <dd className="truncate">{s.drive_folder_id}</dd>
            <dt className="text-mute">{t('Paket / maksimal')}</dt>
            <dd>
              {s.photo_limit}
              {s.max_limit && s.max_limit > s.photo_limit ? ` / ${s.max_limit}` : t(' (tanpa tambahan)')}
            </dd>
            <dt className="text-mute">{t('Akses')}</dt>
            <dd className="flex flex-wrap items-center gap-x-3 gap-y-1">
              <span className="inline-flex items-center gap-1">
                <KeyRound size={11} /> {s.has_pin ? (pin ? `PIN ${pin}` : t('PIN aktif')) : t('tanpa PIN')}
              </span>
              <span>
                {s.expires_at ? t('berlaku s/d {d}', { d: new Date(s.expires_at).toLocaleDateString(dateLocale(), { day: 'numeric', month: 'short', year: 'numeric' }) }) : t('tanpa kedaluwarsa')}
              </span>
            </dd>
            {s.client_wa && (
              <>
                <dt className="text-mute">{t('WhatsApp klien')}</dt>
                <dd className="font-mono">+{s.client_wa}</dd>
              </>
            )}
            <dt className="text-mute">{t('Aktivitas klien')}</dt>
            <dd className="flex items-center gap-1">
              <Eye size={11} />
              {s.first_opened_at
                ? t('dibuka {a} · terakhir {b}', { a: fmt(s.first_opened_at), b: fmt(s.last_seen_at) })
                : t('belum dibuka')}
              {!done && s.draft_count > 0 && t(' · {n} foto sedang dipilih', { n: s.draft_count })}
            </dd>
            <dt className="text-mute">{t('Dibuat')}</dt>
            <dd>{new Date(s.created_at).toLocaleString(dateLocale())}</dd>
            {done && (
              <>
                <dt className="text-mute">{t('Dikirim')}</dt>
                <dd>{new Date(s.submitted_at).toLocaleString(dateLocale())}</dd>
              </>
            )}
            {s.notes && (
              <>
                <dt className="text-mute">{t('Catatan')}</dt>
                <dd className="font-sans">{s.notes}</dd>
              </>
            )}
          </dl>

          <AccessEditor session={s} onSaved={setS} onToast={setToast} />

          <div className="mt-4 flex flex-wrap gap-2">
            {done && (
              <button
                type="button"
                className="btn-ghost h-9 px-3 text-xs"
                onClick={async () => {
                  const ok = await ask({
                    title: t('Buka galeri lagi untuk klien?'),
                    message: t('Klien bisa mengubah pilihannya lagi. Pilihan sebelumnya tetap ada sebagai titik awal.'),
                    confirmLabel: t('Buka lagi'),
                  })
                  if (ok) act(async () => setS(await adminApi.reopenSession(s.id)), t('Galeri dibuka kembali'))
                }}
              >
                <RotateCcw size={13} /> {t('Buka lagi')}
              </button>
            )}
            {s.has_pin && (
              <button
                type="button"
                className="btn-ghost h-9 px-3 text-xs"
                title={t('Semua perangkat yang sudah membuka galeri harus memasukkan PIN lagi. PIN tetap sama, pilihan klien tidak hilang.')}
                onClick={async () => {
                  const ok = await ask({
                    title: t('Kunci ulang semua perangkat?'),
                    message: t('Siapa pun yang sudah membuka galeri harus memasukkan PIN lagi. PIN tetap sama dan pilihan klien tidak hilang.'),
                    confirmLabel: t('Kunci ulang'),
                  })
                  if (ok) act(async () => setS(await adminApi.relockSession(s.id)), t('Semua perangkat dikunci ulang'))
                }}
              >
                <Lock size={13} /> {t('Kunci ulang perangkat')}
              </button>
            )}
            {(done || s.draft_count > 0) && (
              <button
                type="button"
                className="btn-ghost h-9 px-3 text-xs"
                onClick={async () => {
                  const ok = await ask({
                    title: t('Reset semua pilihan klien?'),
                    message: t('Semua pilihan, catatan, dan tanda akan dihapus — klien mulai memilih dari nol. Tindakan ini tidak bisa dibatalkan.'),
                    confirmLabel: t('Ya, reset'),
                    danger: true,
                  })
                  if (ok) act(async () => setS(await adminApi.resetSession(s.id)), t('Pilihan direset — galeri kosong kembali'))
                }}
              >
                <Eraser size={13} /> {t('Reset pilihan')}
              </button>
            )}
            <button
              type="button"
              className="btn-ghost h-9 px-3 text-xs text-danger hover:border-danger"
              onClick={async () => {
                const ok = await ask({
                  title: t('Hapus sesi {nama}?', { nama: s.client_name }),
                  message: t('Link galeri akan mati dan hasil pilihan klien ikut terhapus. Tindakan ini tidak bisa dibatalkan.'),
                  confirmLabel: t('Ya, hapus'),
                  danger: true,
                })
                if (ok) act(async () => { await adminApi.deleteSession(s.id); navigate('/admin') })
              }}
            >
              <Trash2 size={13} /> {t('Hapus sesi')}
            </button>
          </div>
        </section>

        <section className="rounded-[26px] bg-card p-5 sm:p-6">
          <p className="eyebrow">{done ? t('Hasil pilihan') : t('Pilihan sementara')}</p>
          {!done ? (
            <>
              <p className="mt-3 flex items-baseline gap-2.5">
                <span className="font-mono text-[56px] leading-none tracking-[-0.05em]">{s.draft_count}</span>
                <span className="font-mono text-[22px] text-faint">/ {s.photo_limit}</span>
                <span className="ml-1 text-sm text-mute">{s.first_opened_at ? t('tersimpan otomatis') : t('klien belum membuka galeri')}</span>
              </p>
              <AdminPhotoGrid slug={s.slug} token={s.gallery_token} items={s.draft_photos || []} />
              <p className="mt-4 text-sm text-mute">{t('Export XMP, CSV, dan nama file aktif setelah klien menekan “Kirim”.')}</p>
            </>
          ) : (
            <>
              <div className="mt-3 flex flex-wrap items-baseline gap-x-2.5 gap-y-2">
                <span className="font-mono text-[56px] leading-none tracking-[-0.05em]">{s.selected_count}</span>
                <span className="font-mono text-[22px] leading-none text-faint">/ {s.photo_limit}</span>
                {s.extra_count > 0 && (
                  <span className="self-center whitespace-nowrap rounded-full bg-solid px-2.5 py-1 text-xs font-bold text-accent">{t('+{n} di luar paket', { n: s.extra_count })}</span>
                )}
              </div>
              {s.extra_count > 0 && (
                <p className="mt-1 text-xs text-mute">{t('Foto tambahan diberi label')} <b className="text-ink">{t('kuning')}</b> {t('di XMP dan ditandai')} <code>extra=yes</code> {t('di CSV.')}</p>
              )}
              <div className="mt-4 flex flex-wrap gap-2">
                {canPickFolder && (
                  <button
                    type="button"
                    className="btn-ink h-9 px-3 text-xs"
                    title={t('Pilih folder RAW klien — file .xmp langsung disimpan di sana')}
                    onClick={() =>
                      act(async () => {
                        const n = await saveXmpToFolder(s.id)
                        if (n) setToast(t('{n} file XMP disimpan ke folder', { n }))
                      })
                    }
                  >
                    <FolderDown size={13} /> {t('Simpan XMP ke folder')}
                  </button>
                )}
                <button type="button" className={clsx(canPickFolder ? 'btn-ghost' : 'btn-ink', 'h-9 px-3 text-xs')} onClick={() => act(() => adminApi.downloadXmp(s.id))}>
                  <Download size={13} /> XMP .zip
                </button>
                <button type="button" className="btn-ghost h-9 px-3 text-xs" onClick={() => act(async () => { const { filenames } = await adminApi.filenames(s.id); if (!(await copyText(filenames))) throw new Error() }, t('Nama file disalin'))}>
                  <Copy size={13} /> {t('Salin nama file')}
                </button>
                <button type="button" className="btn-ghost h-9 px-3 text-xs" onClick={() => act(() => adminApi.downloadCsv(s.id))}>
                  <Download size={13} /> CSV
                </button>
              </div>
              <AdminPhotoGrid slug={s.slug} token={s.gallery_token} items={s.selected_photos} />
              {s.selected_photos.some((p) => p.note) && (
                <div className="mt-6">
                  <p className="eyebrow">{t('Catatan klien')}</p>
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
                {t('Ekstrak ZIP ke folder RAW, lalu')} <b className="text-ink">Capture One → Image → Synchronize Metadata</b> {t('atau')} <b className="text-ink">Lightroom → Metadata → Read Metadata from File</b>. {t('Foto pilihan mendapat ★5 dan label hijau.')}
              </p>
            </>
          )}
        </section>
      </div>
      {confirmDialog}
    </AdminShell>
  )
}
