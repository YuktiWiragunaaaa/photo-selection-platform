// [ID] Halaman galeri KLIEN (/g/:slug): cek PIN, intro, grid foto, pilih/tandai foto, bar bawah, konfirmasi kirim.
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
import SuccessPop from '../components/SuccessPop'
import Sheet from '../components/Sheet'
import Intro from '../components/Intro'
import ScrollProgress from '../components/ScrollProgress'
import ViewControls from '../components/ViewControls'
import { applyTheme } from '../utils/theme'
import { dateLocale, getLang, t, tServer, useT } from '../utils/i18n'
import { BrandFooter, BrandHeader } from '../components/Brand'

export default function Gallery() {
  const { slug } = useParams()
  const t = useT()
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
      .then((m) => {
        applyTheme(m.branding?.theme) // studio colours & fonts before anything renders
        setMeta(m)
      })
      .catch((e) => setError(errorMessage(e, t('Galeri tidak bisa dimuat.'))))
  }, [slug]) // eslint-disable-line react-hooks/exhaustive-deps

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
        } else setError(errorMessage(e, t('Galeri tidak bisa dimuat.')))
      })
  }, [slug, meta, needsPin, unlockedAt]) // eslint-disable-line react-hooks/exhaustive-deps

  if (error) return <Empty title={t('Galeri tidak ditemukan')} body={error} branding={meta?.branding} />
  if (!meta) return <Loading />
  if (meta.expired)
    return (
      <Empty
        title={t('Link sudah kedaluwarsa')}
        body={t('Masa berlaku galeri ini sudah habis. Hubungi fotografer Anda untuk membukanya kembali.')}
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
  const t = useT()
  const readOnly = data.status === 'completed' || !!done
  const sel = useSelection(`${slug}${data.rev ? `_r${data.rev}` : ''}`, data.max_limit, data.selected_ids, data.notes, data.maybe_ids || [])
  const [toast, setToast] = useState('')
  const [saveState, setSaveState] = useState('') // '' | 'saving' | 'saved' | 'offline'
  // How-to: pops up the first time this gallery is opened on this device; reopen anytime via "Cara memilih" (top right).
  const guideKey = `psp_guide_${slug}`
  const theme = data.branding?.theme || {}
  const simple = !!theme.simple_mode // "Mode sederhana": fewer options, bigger labelled buttons

  // Bigger text for clients (Pengaturan → Tampilan → Ukuran teks); every rem-based size scales with it
  useEffect(() => {
    const html = document.documentElement
    const prev = html.style.fontSize
    html.style.fontSize = `${16 * (theme.text_scale || 1)}px`
    return () => {
      html.style.fontSize = prev
    }
  }, [theme.text_scale])

  // Panduan tidak muncul bersamaan dengan intro: tunggu intro selesai dulu, baru tampil
  const [guide, setGuide] = useState(false)
  useEffect(() => {
    if (readOnly || theme.guide_enabled === false) return
    try {
      if (localStorage.getItem(guideKey)) return
    } catch {}
    const show = () => setTimeout(() => setGuide(true), 350)
    if (window.__pspIntroActive) {
      window.addEventListener('psp:intro-done', show, { once: true })
      return () => window.removeEventListener('psp:intro-done', show)
    }
    const t = show()
    return () => clearTimeout(t)
  }, []) // eslint-disable-line react-hooks/exhaustive-deps
  const closeGuide = useCallback(() => {
    setGuide(false)
    try {
      localStorage.setItem(guideKey, '1')
    } catch {}
  }, [guideKey])
  const lang = getLang()
  const deadline = useMemo(() => formatDeadline(data.expires_at), [data.expires_at, lang]) // eslint-disable-line react-hooks/exhaustive-deps
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

  const [celebrate, setCelebrate] = useState(0) // jumlah foto terkirim untuk pop-up sukses (0 = tidak tampil)
  const hideCelebrate = useCallback(() => setCelebrate(0), [])

  const submit = async () => {
    setSubmitting(true)
    try {
      const res = await galleryApi.submit(slug, sel.ids, sel.notes, extraIds)
      setData((d) => ({ ...d, status: 'completed', selected_ids: sel.ids, notes: sel.notes }))
      setDone(res)
      setConfirming(false)
      setCelebrate(sel.count || sel.ids.length) // tampilkan animasi sukses
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
        <div className="sticky top-0 z-30 bg-solid px-4 py-2.5 text-center text-xs text-onsolid">
          <b className="text-accent">{t('Mode pratinjau fotografer')}</b>
          {t(' — yang kamu klik di sini tidak disimpan dan tidak mengubah pilihan klien.')}
        </div>
      )}
      <Toast message={toast} onClose={() => setToast('')} />

      <header className="mx-auto max-w-[1600px] px-4 pt-6 sm:px-6 sm:pt-8">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <BrandHeader branding={b} />
          </div>
          <div className="flex shrink-0 items-center gap-1.5">
            <ViewControls theme={theme} big={simple} />
            {!readOnly && (
              <button type="button" onClick={() => setGuide(true)} className={clsx(simple ? 'btn-ink h-11 px-4 text-sm' : 'btn-ghost h-9 px-3 text-xs')} aria-label={t('Cara memilih foto')}>
                <CircleHelp size={simple ? 17 : 14} /> {t('Cara memilih')}
              </button>
            )}
          </div>
        </div>
        <p className="eyebrow mt-8 animate-rise sm:mt-12">{readOnly ? t('Pilihan tersimpan') : theme.gallery_title || t('Pilih foto favorit Anda')}</p>
        <h1 className="mt-3 font-display text-5xl leading-[0.92] tracking-tight animate-rise sm:text-7xl md:text-8xl" style={{ animationDelay: '60ms' }}>
          {data.client_name}
        </h1>
        <div className="mt-5 flex flex-wrap items-baseline gap-x-6 gap-y-1 font-mono text-xs text-mute animate-rise" style={{ animationDelay: '120ms' }}>
          <span>{t('{n} foto', { n: data.photos.length })}</span>
          <span>
            {t('{n} foto termasuk paket', { n: data.photo_limit })}
            {data.max_limit > data.photo_limit && t(' · hingga {n} dengan tambahan', { n: data.max_limit })}
          </span>
        </div>
        {!readOnly && (
          <div className="mt-4 space-y-1 text-sm animate-rise" style={{ animationDelay: '140ms' }}>
            <p className="text-mute">
              <b className="text-ink">{t('Ketuk foto')}</b>
              {t(' untuk memilih · tekan ')}
              <b className="text-ink">⤢</b>
              {t(' untuk melihat besar & menulis catatan.')}
            </p>
            {deadline && (
              <p className="flex flex-wrap items-center gap-2 pt-2">
                <span className="inline-flex h-8 items-center gap-1.5 rounded-full bg-solid px-3 text-[13px] text-onsolid">
                  <CalendarClock size={14} /> {t('Pilih sebelum {date}', { date: deadline.date })}
                </span>
                <span className={clsx('inline-flex h-8 items-center rounded-full px-3 text-[13px] font-bold', deadline.urgent ? 'bg-danger text-paper' : 'bg-accent text-onaccent')}>
                  {deadline.left}
                </span>
              </p>
            )}
          </div>
        )}
        {readOnly && (
          <div className="mt-8 flex max-w-xl items-start gap-3 border-t border-line pt-5 animate-rise" style={{ animationDelay: '160ms' }}>
            <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-solid text-onsolid">
              <Check size={13} strokeWidth={3} />
            </span>
            <div>
              <p className="text-sm">
                {done?.message
                  ? tServer(done.message)
                  : t('{n} foto pilihan sudah tersimpan.', { n: selectedCount }) + (extras ? t(' {n} di antaranya di luar paket.', { n: extras }) : '')}
              </p>
              <p className="mt-1 text-sm text-mute">
                {t('Galeri ini sekarang hanya bisa dilihat. Foto yang Anda pilih ditandai; hubungi fotografer jika ingin mengubah.')}
              </p>
              <button
                type="button"
                onClick={() => setFilter((f) => (f === 'all' ? 'selected' : 'all'))}
                className="btn-ghost mt-4 h-9 px-4 text-xs"
              >
                {filter === 'all' ? t('Lihat {n} pilihan saja', { n: selectedCount }) : t('Lihat semua foto')}
              </button>
            </div>
          </div>
        )}
        <hr className="mt-8 border-line sm:mt-12" />
      </header>

      <section className="mx-auto max-w-[1600px] px-2 pt-2 sm:px-6 sm:pt-4" aria-label={t('Galeri foto')}>
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
                  onMaybe={simple ? undefined : sel.toggleMaybe}
                  onOpen={setLightbox}
                />
              ))}
            </div>
          ))}
        </div>
      </section>

      <ScrollProgress total={visible.length} raisedForBar={!readOnly} />

      <BrandFooter branding={b} />

      {!readOnly && (
        <SelectionBar
          count={sel.count}
          maybeCount={simple ? 0 : sel.maybe.length}
          saveState={saveState}
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
          onMaybe={simple ? undefined : sel.toggleMaybe}
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
        <Sheet onClose={() => setOverPrompt(null)} labelledBy="over-title">
            <p className="eyebrow">{t('Di luar paket')}</p>
            <h2 id="over-title" className="mt-1 pr-10 font-display text-3xl leading-tight">
              {t('Kuota paket sudah penuh')}
            </h2>
            <p className="mt-3 text-sm">
              {t('{n} foto dalam paket sudah terpilih semua. Foto berikutnya dihitung sebagai ', { n: data.photo_limit })}
              <b>{t('foto tambahan')}</b>
              {t(' (ada biaya tambahan) dan akan diberi label ')}
              <span className="rounded-full bg-solid px-2 py-0.5 text-xs font-bold text-accent">{t('Tambahan')}</span>.
            </p>
            <p className="mt-2 text-sm text-mute">{t('Anda bisa menambah hingga {n} foto lagi.', { n: data.max_limit - data.photo_limit })}</p>
            <div className="mt-6 flex flex-wrap gap-2 sm:justify-end">
              <button type="button" className="btn-ghost" onClick={() => setOverPrompt(null)}>
                {t('Batal')}
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
                {t('Lanjutkan memilih')}
              </button>
            </div>
        </Sheet>
      )}

      {celebrate > 0 && <SuccessPop count={celebrate} onDone={hideCelebrate} />}

      {confirming && (
        <Sheet wide onClose={() => !submitting && setConfirming(false)} persistent={submitting} labelledBy="confirm-title">
            <p className="eyebrow">{t('Periksa sebelum mengirim')}</p>
            <h2 id="confirm-title" className="mt-1 pr-10 font-display text-3xl">{t('Kirim {n} foto pilihan?', { n: sel.count })}</h2>
            {nExtra > 0 && (
              <p className="mt-3 rounded-2xl bg-solid p-4 text-sm text-onsolid">
                {t('{n} foto termasuk paket, ', { n: data.photo_limit })}
                <b className="text-accent">{t('{n} foto tambahan', { n: nExtra })}</b>
                {t(' di luar paket — fotografer akan menghubungi Anda soal biayanya.')}
                <span className="mt-1 block text-sand">
                  {t('Ketuk foto untuk menentukan mana yang menjadi ')}
                  <b className="text-ink">{t('tambahan')}</b>
                  {t(' ({n}/{total} ditandai).', { n: extraIds.length, total: nExtra })}
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
                      aria-label={`${p.name}${isExtra ? t(', tambahan') : ''}`}
                      className={clsx('relative block aspect-square w-full overflow-hidden rounded-xl bg-wash disabled:cursor-default', isExtra && 'ring-[3px] ring-inset ring-ink')}
                    >
                      <img src={p.thumb_url} alt="" className="h-full w-full object-cover" />
                      {isExtra && <span className="absolute inset-x-0 bottom-0 bg-solid py-0.5 text-center font-mono text-[9px] uppercase text-onsolid">{t('tambahan')}</span>}
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
                <MessageSquare size={12} /> {t('{n} catatan ikut terkirim', { n: Object.keys(sel.notes).length })}
              </p>
            )}
            <p className="mt-3 text-sm text-mute">{t('Setelah dikirim, pilihan tidak bisa diubah lagi dari halaman ini.')}</p>
            <div className="mt-6 flex flex-wrap gap-2 sm:justify-end">
              <button type="button" className="btn-ghost" onClick={() => setConfirming(false)} disabled={submitting}>
                {t('Periksa lagi')}
              </button>
              <button type="button" className="btn-accent" onClick={submit} disabled={submitting || extraIds.length !== nExtra}>
                {submitting ? t('Mengirim…') : t('Ya, kirim')}
              </button>
            </div>
        </Sheet>
      )}
    </main>
  )
}

function formatDeadline(iso) {
  if (!iso) return null
  const d = new Date(iso)
  const days = Math.ceil((d - Date.now()) / 86400000)
  return {
    date: d.toLocaleDateString(dateLocale(), { weekday: 'long', day: 'numeric', month: 'long' }),
    left: days <= 0 ? t('hari ini') : days === 1 ? t('besok') : t('{n} hari lagi', { n: days }),
    urgent: days <= 2,
  }
}

function Loading() {
  const t = useT()
  return (
    <div className="flex min-h-screen items-center justify-center">
      <span className="eyebrow animate-pulse">{t('Memuat galeri')}</span>
    </div>
  )
}

function Empty({ title, body, branding }) {
  const t = useT()
  return (
    <main className="flex min-h-screen flex-col px-6">
      <div className="flex items-start justify-between gap-3 pt-6">
        {branding ? <BrandHeader branding={branding} /> : <span />}
        <ViewControls theme={branding?.theme} />
      </div>
      <div className="m-auto max-w-md text-center">
        <p className="eyebrow">{t('Tidak tersedia')}</p>
        <h1 className="mt-3 font-display text-4xl">{title}</h1>
        <p className="mt-3 text-sm text-mute">{body}</p>
      </div>
    </main>
  )
}
