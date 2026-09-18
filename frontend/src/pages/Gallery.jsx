import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useParams } from 'react-router-dom'
import { CalendarClock, Check, CircleHelp, MessageSquare } from 'lucide-react'
import clsx from 'clsx'
import { galleryApi, galleryToken } from '../api/galleryApi'
import { errorMessage } from '../api/client'
import { useSelection } from '../hooks/useSelection'
import { useColumns } from '../hooks/useColumns'
import PhotoTile from '../components/PhotoTile'
import Lightbox from '../components/Lightbox'
import SelectionBar from '../components/SelectionBar'
import Toast from '../components/Toast'
import PinGate from '../components/PinGate'
import Guide from '../components/Guide'
import Intro from '../components/Intro'
import { BrandFooter, BrandHeader } from '../components/Brand'

export default function Gallery() {
  const { slug } = useParams()
  const [meta, setMeta] = useState(null)
  const [data, setData] = useState(null)
  const [error, setError] = useState('')
  const [lightbox, setLightbox] = useState(null)
  const [confirming, setConfirming] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [done, setDone] = useState(null)
  const [unlockedAt, setUnlockedAt] = useState(0)

  useEffect(() => {
    galleryApi
      .meta(slug)
      .then(setMeta)
      .catch((e) => setError(errorMessage(e, 'Galeri tidak bisa dimuat.')))
  }, [slug])

  const needsPin = meta?.locked && !galleryToken.get(slug)

  useEffect(() => {
    if (!meta || meta.expired || needsPin) return
    galleryApi
      .get(slug)
      .then(setData)
      .catch((e) => {
        if (e.response?.status === 401) {
          galleryToken.clear(slug) // stale token (PIN changed) -> ask again
          setUnlockedAt((n) => n + 1)
        } else setError(errorMessage(e, 'Galeri tidak bisa dimuat.'))
      })
  }, [slug, meta, needsPin, unlockedAt])

  if (error) return <Empty title="Galeri tidak ditemukan" body={error} />
  if (!meta) return <Loading />
  if (meta.expired)
    return (
      <Empty
        title="Link sudah kedaluwarsa"
        body="Masa berlaku galeri ini sudah habis. Hubungi fotografer Anda untuk membukanya kembali."
        branding={meta.branding}
      />
    )
  const intro = <Intro branding={meta.branding} clientName={meta.client_name} slug={slug} />
  if (needsPin)
    return (
      <>
        {intro}
        <PinGate slug={slug} meta={meta} onUnlocked={() => setUnlockedAt((n) => n + 1)} />
      </>
    )
  return (
    <>
      {intro}
      {data ? <GalleryView {...{ slug, data, setData, lightbox, setLightbox, confirming, setConfirming, submitting, setSubmitting, done, setDone }} /> : <Loading />}
    </>
  )
}

function GalleryView({ slug, data, setData, lightbox, setLightbox, confirming, setConfirming, submitting, setSubmitting, done, setDone }) {
  const readOnly = data.status === 'completed' || !!done
  const sel = useSelection(`${slug}${data.rev ? `_r${data.rev}` : ''}`, data.max_limit, data.selected_ids, data.notes, data.maybe_ids || [])
  const [toast, setToast] = useState('')
  const [saveState, setSaveState] = useState('') // '' | 'saving' | 'saved' | 'offline'
  // How-to: pops up the first time this gallery is opened on this device; reopen anytime via "Cara memilih" (top right).
  const guideKey = `psp_guide_${slug}`
  const [guide, setGuide] = useState(() => {
    if (readOnly) return false
    try {
      return !localStorage.getItem(guideKey)
    } catch {
      return true
    }
  })
  const closeGuide = useCallback(() => {
    setGuide(false)
    try {
      localStorage.setItem(guideKey, '1')
    } catch {}
  }, [guideKey])
  const deadline = useMemo(() => formatDeadline(data.expires_at), [data.expires_at])
  const shownIds = useMemo(() => (readOnly ? new Set(data.selected_ids) : sel.set), [readOnly, data.selected_ids, sel.set])
  const shownNotes = readOnly ? data.notes || {} : sel.notes
  const selectedCount = shownIds.size
  const extras = Math.max(0, selectedCount - data.photo_limit)
  const photoById = useMemo(() => new Map(data.photos.map((p) => [p.file_id, p])), [data.photos])
  const [filter, setFilter] = useState('all')
  const visible = useMemo(
    () =>
      filter === 'selected'
        ? data.photos.filter((p) => shownIds.has(p.file_id))
        : filter === 'maybe'
          ? data.photos.filter((p) => sel.maybeSet.has(p.file_id))
          : data.photos,
    [filter, data.photos, shownIds, sel.maybeSet],
  )
  const columns = useColumns(visible)

  // Image links carry a short-lived pass (~12h). Refresh them periodically for clients who keep the page open.
  useEffect(() => {
    const t = setInterval(() => {
      galleryApi
        .get(slug)
        .then((fresh) => setData((d) => ({ ...d, photos: fresh.photos })))
        .catch(() => {})
    }, 3 * 3600 * 1000)
    return () => clearInterval(t)
  }, [slug, setData])

  // Crossing from "package full" into paid extras needs an explicit OK, so the client
  // knows which picks are included and which cost extra.
  const [overPrompt, setOverPrompt] = useState(null) // file id waiting for confirmation
  const canExtra = data.max_limit > data.photo_limit
  const pick = useCallback(
    (id) => {
      if (!sel.set.has(id) && canExtra && sel.count === data.photo_limit) {
        setOverPrompt(id)
        return
      }
      sel.toggle(id)
    },
    [sel.set, sel.count, sel.toggle, canExtra, data.photo_limit],
  )
  const extraSet = useMemo(() => (readOnly ? new Set() : new Set(sel.ids.slice(data.photo_limit))), [readOnly, sel.ids, data.photo_limit])

  // Autosave picks to the server so the client can continue on another device.
  const firstSave = useRef(true)
  useEffect(() => {
    if (readOnly || data.preview) return
    if (firstSave.current) {
      firstSave.current = false
      // Nothing new to save if the server already had this selection.
      if (data.selected_ids.length || data.maybe_ids?.length) return
      if (!sel.count && !sel.maybe.length) return
    }
    setSaveState('saving')
    const t = setTimeout(() => {
      galleryApi
        .saveDraft(slug, sel.ids, sel.notes, sel.maybe)
        .then(() => setSaveState('saved'))
        .catch((e) => {
          if (e.response?.status === 401) {
            galleryToken.clear(slug)
            window.location.reload()
          } else setSaveState('offline')
        })
    }, 700)
    return () => clearTimeout(t)
  }, [sel.ids, sel.notes, sel.maybe, readOnly, slug]) // eslint-disable-line react-hooks/exhaustive-deps

  // Keep the lightbox index valid when the visible list shrinks (e.g. un-picking under the "Pilihan" filter).
  useEffect(() => {
    if (lightbox == null) return
    if (visible.length === 0) setLightbox(null)
    else if (lightbox >= visible.length) setLightbox(visible.length - 1)
  }, [visible.length, lightbox, setLightbox])

  useEffect(() => {
    if (sel.warning) {
      setToast(sel.warning)
      sel.clearWarning()
    }
  }, [sel.warning]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (filter === 'selected' && sel.count === 0 && !readOnly) setFilter('all')
    if (filter === 'maybe' && sel.maybe.length === 0) setFilter('all')
  }, [filter, sel.count, sel.maybe.length, readOnly])

  const navigate = useCallback((d) => setLightbox((i) => (i + d + visible.length) % visible.length), [visible.length, setLightbox])
  const close = useCallback(() => setLightbox(null), [setLightbox])

  const submit = async () => {
    setSubmitting(true)
    try {
      const res = await galleryApi.submit(slug, sel.ids, sel.notes, extraIds)
      setData((d) => ({ ...d, status: 'completed', selected_ids: sel.ids, notes: sel.notes }))
      setDone(res)
      setConfirming(false)
      sel.clear()
      window.scrollTo({ top: 0, behavior: 'smooth' })
    } catch (e) {
      if (e.response?.status === 401) {
        // Device pass expired or the photographer re-locked the gallery: ask for the PIN again.
        // Picks are safe (saved on the server and on this device).
        galleryToken.clear(slug)
        window.location.reload()
        return
      }
      setToast(errorMessage(e))
    } finally {
      setSubmitting(false)
    }
  }

  const b = data.branding
  const nExtra = Math.max(0, sel.count - data.photo_limit)
  const [extraIds, setExtraIds] = useState([])
  const openConfirm = () => {
    // Default: the most recent picks are the extras; the client can change which ones.
    setExtraIds(nExtra ? sel.ids.slice(-nExtra) : [])
    setConfirming(true)
  }
  const toggleExtra = (id) =>
    setExtraIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : prev.length < nExtra ? [...prev, id] : [...prev.slice(1), id]))

  return (
    <main className="min-h-screen pb-44 sm:pb-32">
      {data.preview && (
        <div className="sticky top-0 z-30 bg-ink px-4 py-2.5 text-center text-xs text-paper">
          <b className="text-accent">Mode pratinjau fotografer</b> — yang kamu klik di sini tidak disimpan dan tidak mengubah pilihan klien.
        </div>
      )}
      <Toast message={toast} onClose={() => setToast('')} />

      <header className="mx-auto max-w-[1600px] px-4 pt-6 sm:px-6 sm:pt-8">
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0 flex-1">
            <BrandHeader branding={b} />
          </div>
          {!readOnly && (
            <button type="button" onClick={() => setGuide(true)} className="btn-ghost h-9 shrink-0 px-3 text-xs" aria-label="Cara memilih foto">
              <CircleHelp size={14} /> Cara memilih
            </button>
          )}
        </div>
        <p className="eyebrow mt-8 animate-rise sm:mt-12">{readOnly ? 'Pilihan tersimpan' : 'Pilih foto favorit Anda'}</p>
        <h1 className="mt-3 font-display text-5xl italic leading-[0.92] tracking-tight animate-rise sm:text-7xl md:text-8xl" style={{ animationDelay: '60ms' }}>
          {data.client_name}
        </h1>
        <div className="mt-5 flex flex-wrap items-baseline gap-x-6 gap-y-1 font-mono text-xs text-mute animate-rise" style={{ animationDelay: '120ms' }}>
          <span>{data.photos.length} foto</span>
          <span>
            {data.photo_limit} foto termasuk paket
            {data.max_limit > data.photo_limit && ` · hingga ${data.max_limit} dengan tambahan`}
          </span>
        </div>
        {!readOnly && (
          <div className="mt-4 space-y-1 text-sm animate-rise" style={{ animationDelay: '140ms' }}>
            <p className="text-mute">
              <b className="text-ink">Ketuk foto</b> untuk memilih · tekan <b className="text-ink">⤢</b> untuk melihat besar &amp; menulis catatan.
            </p>
            {deadline && (
              <p className="flex flex-wrap items-center gap-2 pt-2">
                <span className="inline-flex h-8 items-center gap-1.5 rounded-full bg-ink px-3 text-[13px] text-paper">
                  <CalendarClock size={14} /> Pilih sebelum {deadline.date}
                </span>
                <span className={clsx('inline-flex h-8 items-center rounded-full px-3 text-[13px] font-bold', deadline.urgent ? 'bg-danger text-paper' : 'bg-accent text-ink')}>
                  {deadline.left}
                </span>
              </p>
            )}
            {saveState && (
              <p className="font-mono text-[11px] text-faint" aria-live="polite">
                {saveState === 'saving' ? 'Menyimpan…' : saveState === 'saved' ? '✓ Pilihan tersimpan otomatis — bisa dilanjutkan nanti' : 'Belum tersimpan ke server (cek koneksi). Pilihan aman di perangkat ini.'}
              </p>
            )}
          </div>
        )}
        {readOnly && (
          <div className="mt-8 flex max-w-xl items-start gap-3 border-t border-line pt-5 animate-rise" style={{ animationDelay: '160ms' }}>
            <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-ink text-paper">
              <Check size={13} strokeWidth={3} />
            </span>
            <div>
              <p className="text-sm">{done?.message ?? `${selectedCount} foto pilihan sudah tersimpan.${extras ? ` ${extras} di antaranya di luar paket.` : ''}`}</p>
              <p className="mt-1 text-sm text-mute">Galeri ini sekarang hanya bisa dilihat. Foto yang Anda pilih ditandai; hubungi fotografer jika ingin mengubah.</p>
              <button
                type="button"
                onClick={() => setFilter((f) => (f === 'all' ? 'selected' : 'all'))}
                className="btn-ghost mt-4 h-9 px-4 text-xs"
              >
                {filter === 'all' ? `Lihat ${selectedCount} pilihan saja` : 'Lihat semua foto'}
              </button>
            </div>
          </div>
        )}
        <hr className="mt-8 border-line sm:mt-12" />
      </header>

      <section className="mx-auto max-w-[1600px] px-2 pt-2 sm:px-6 sm:pt-4" aria-label="Galeri foto">
        <div className="masonry">
          {columns.map((col, c) => (
            <div key={c} className="masonry-col">
              {col.map(({ photo: p, index: i }) => (
                <PhotoTile
                  key={p.file_id}
                  photo={p}
                  index={i}
                  selected={shownIds.has(p.file_id)}
                  hasNote={!!shownNotes[p.file_id]}
                  disabled={sel.atLimit}
                  readOnly={readOnly}
                  onToggle={pick}
                  extra={extraSet.has(p.file_id)}
                  maybe={sel.maybeSet.has(p.file_id)}
                  onMaybe={sel.toggleMaybe}
                  onOpen={setLightbox}
                />
              ))}
            </div>
          ))}
        </div>
      </section>

      <BrandFooter branding={b} />

      {!readOnly && (
        <SelectionBar
          count={sel.count}
          maybeCount={sel.maybe.length}
          limit={data.photo_limit}
          maxLimit={data.max_limit}
          selected={sel.ids}
          photoById={photoById}
          onSubmit={openConfirm}
          submitting={submitting}
          filter={filter}
          onFilter={setFilter}
        />
      )}

      {guide && <Guide limit={data.photo_limit} maxLimit={data.max_limit} deadline={deadline?.date} onClose={closeGuide} />}

      {lightbox != null && visible[lightbox] && (
        <Lightbox
          photos={visible}
          index={lightbox}
          selectedIds={shownIds}
          maybeIds={sel.maybeSet}
          onMaybe={sel.toggleMaybe}
          notes={shownNotes}
          onNote={sel.setNote}
          onClose={close}
          onNavigate={navigate}
          onToggle={pick}
          extraIds={extraSet}
          disabled={sel.atLimit}
          readOnly={readOnly}
        />
      )}

      {overPrompt && (
        <div role="dialog" aria-modal="true" aria-labelledby="over-title" className="fixed inset-0 z-[70] flex items-end justify-center bg-ink/50 p-4 animate-fade sm:items-center">
          <div className="w-full max-w-md rounded-[28px] bg-paper p-6 animate-rise">
            <p className="eyebrow">Di luar paket</p>
            <h2 id="over-title" className="mt-2 font-display text-4xl italic leading-tight">
              Kuota paket sudah penuh
            </h2>
            <p className="mt-3 text-sm">
              {data.photo_limit} foto dalam paket sudah terpilih semua. Foto berikutnya dihitung sebagai <b>foto tambahan</b> (ada biaya tambahan) dan
              akan diberi label <span className="rounded-full bg-ink px-2 py-0.5 text-xs font-bold text-accent">Tambahan</span>.
            </p>
            <p className="mt-2 text-sm text-mute">Anda bisa menambah hingga {data.max_limit - data.photo_limit} foto lagi.</p>
            <div className="mt-6 flex flex-wrap gap-2 sm:justify-end">
              <button type="button" className="btn-ghost" onClick={() => setOverPrompt(null)}>
                Batal
              </button>
              <button
                type="button"
                className="btn-accent"
                autoFocus
                onClick={() => {
                  sel.toggle(overPrompt)
                  setOverPrompt(null)
                }}
              >
                Lanjutkan memilih
              </button>
            </div>
          </div>
        </div>
      )}

      {confirming && (
        <div role="dialog" aria-modal="true" className="fixed inset-0 z-50 flex items-end justify-center bg-ink/40 p-4 animate-fade sm:items-center">
          <div className="max-h-full w-full max-w-lg overflow-y-auto rounded-[28px] bg-paper p-6 animate-rise">
            <p className="eyebrow">Periksa sebelum mengirim</p>
            <h2 className="mt-2 font-display text-4xl italic">Kirim {sel.count} foto pilihan?</h2>
            {nExtra > 0 && (
              <p className="mt-3 rounded-2xl bg-ink p-4 text-sm text-paper">
                {data.photo_limit} foto termasuk paket, <b className="text-accent">{nExtra} foto tambahan</b> di luar paket — fotografer akan menghubungi Anda soal biayanya.
                <span className="mt-1 block text-sand">
                  Ketuk foto untuk menentukan mana yang menjadi <b className="text-ink">tambahan</b> ({extraIds.length}/{nExtra} ditandai).
                </span>
              </p>
            )}
            <ul className="mt-4 grid grid-cols-4 gap-1.5 sm:grid-cols-5">
              {sel.ids.map((id) => {
                const p = photoById.get(id)
                if (!p) return null
                const isExtra = extraIds.includes(id)
                return (
                  <li key={id}>
                    <button
                      type="button"
                      disabled={!nExtra}
                      onClick={() => toggleExtra(id)}
                      aria-pressed={isExtra}
                      aria-label={`${p.name}${isExtra ? ', tambahan' : ''}`}
                      className={clsx('relative block aspect-square w-full overflow-hidden rounded-xl bg-wash disabled:cursor-default', isExtra && 'ring-[3px] ring-inset ring-ink')}
                    >
                      <img src={p.thumb_url} alt="" className="h-full w-full object-cover" />
                      {isExtra && <span className="absolute inset-x-0 bottom-0 bg-ink py-0.5 text-center font-mono text-[9px] uppercase text-paper">tambahan</span>}
                      {sel.notes[id] && (
                        <span className="absolute right-1 top-1 flex h-4 w-4 items-center justify-center rounded-full bg-paper/90">
                          <MessageSquare size={9} />
                        </span>
                      )}
                    </button>
                  </li>
                )
              })}
            </ul>
            {Object.keys(sel.notes).length > 0 && (
              <p className="mt-3 flex items-center gap-1.5 text-xs text-mute">
                <MessageSquare size={12} /> {Object.keys(sel.notes).length} catatan ikut terkirim
              </p>
            )}
            <p className="mt-3 text-sm text-mute">Setelah dikirim, pilihan tidak bisa diubah lagi dari halaman ini.</p>
            <div className="mt-6 flex flex-wrap gap-2 sm:justify-end">
              <button type="button" className="btn-ghost" onClick={() => setConfirming(false)} disabled={submitting}>
                Periksa lagi
              </button>
              <button type="button" className="btn-accent" onClick={submit} disabled={submitting || extraIds.length !== nExtra}>
                {submitting ? 'Mengirim…' : 'Ya, kirim'}
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  )
}

function formatDeadline(iso) {
  if (!iso) return null
  const d = new Date(iso)
  const days = Math.ceil((d - Date.now()) / 86400000)
  return {
    date: d.toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long' }),
    left: days <= 0 ? 'hari ini' : days === 1 ? 'besok' : `${days} hari lagi`,
    urgent: days <= 2,
  }
}

function Loading() {
  return (
    <div className="flex min-h-screen items-center justify-center">
      <span className="eyebrow animate-pulse">Memuat galeri</span>
    </div>
  )
}

function Empty({ title, body, branding }) {
  return (
    <main className="flex min-h-screen flex-col px-6">
      {branding && (
        <div className="pt-6">
          <BrandHeader branding={branding} />
        </div>
      )}
      <div className="m-auto max-w-md text-center">
        <p className="eyebrow">Tidak tersedia</p>
        <h1 className="mt-3 font-display text-4xl">{title}</h1>
        <p className="mt-3 text-sm text-mute">{body}</p>
      </div>
    </main>
  )
}
