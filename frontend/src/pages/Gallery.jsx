import { useCallback, useEffect, useMemo, useState } from 'react'
import { useParams } from 'react-router-dom'
import { Check } from 'lucide-react'
import { galleryApi } from '../api/galleryApi'
import { errorMessage } from '../api/client'
import { useSelection } from '../hooks/useSelection'
import { useColumns } from '../hooks/useColumns'
import PhotoTile from '../components/PhotoTile'
import Lightbox from '../components/Lightbox'
import SelectionBar from '../components/SelectionBar'
import Toast from '../components/Toast'

export default function Gallery() {
  const { slug } = useParams()
  const [data, setData] = useState(null)
  const [error, setError] = useState('')
  const [lightbox, setLightbox] = useState(null)
  const [confirming, setConfirming] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [done, setDone] = useState(null)

  useEffect(() => {
    galleryApi
      .get(slug)
      .then(setData)
      .catch((e) => setError(errorMessage(e, 'Galeri tidak bisa dimuat.')))
  }, [slug])

  if (error) return <Empty title="Galeri tidak ditemukan" body={error} />
  if (!data) return <Loading />
  return <GalleryView {...{ slug, data, setData, lightbox, setLightbox, confirming, setConfirming, submitting, setSubmitting, done, setDone }} />
}

function GalleryView({ slug, data, setData, lightbox, setLightbox, confirming, setConfirming, submitting, setSubmitting, done, setDone }) {
  const readOnly = data.status === 'completed' || !!done
  const sel = useSelection(slug, data.photo_limit, data.selected_ids)
  const [toast, setToast] = useState('')
  const photoById = useMemo(() => new Map(data.photos.map((p) => [p.file_id, p])), [data.photos])
  const columns = useColumns(data.photos)

  useEffect(() => {
    if (sel.warning) {
      setToast(sel.warning)
      sel.clearWarning()
    }
  }, [sel.warning]) // eslint-disable-line react-hooks/exhaustive-deps

  const navigate = useCallback((d) => setLightbox((i) => (i + d + data.photos.length) % data.photos.length), [data.photos.length, setLightbox])
  const close = useCallback(() => setLightbox(null), [setLightbox])

  const submit = async () => {
    setSubmitting(true)
    try {
      const res = await galleryApi.submit(slug, sel.ids)
      setData((d) => ({ ...d, status: 'completed', selected_ids: sel.ids }))
      setDone(res)
      setConfirming(false)
      sel.clear()
      window.scrollTo({ top: 0, behavior: 'smooth' })
    } catch (e) {
      setToast(errorMessage(e))
    } finally {
      setSubmitting(false)
    }
  }

  const shownIds = readOnly ? new Set(data.selected_ids) : sel.set
  const selectedCount = readOnly ? data.selected_ids.length : sel.count

  return (
    <main className="min-h-screen pb-32">
      <Toast message={toast} onClose={() => setToast('')} />

      <header className="mx-auto max-w-[1600px] px-4 pt-10 sm:px-6 sm:pt-16">
        <p className="eyebrow animate-rise">{readOnly ? 'Pilihan tersimpan' : 'Pilih foto favorit Anda'}</p>
        <h1 className="mt-3 font-display text-5xl leading-[0.95] tracking-tight animate-rise sm:text-7xl md:text-8xl" style={{ animationDelay: '60ms' }}>
          {data.client_name}
        </h1>
        <div className="mt-5 flex flex-wrap items-baseline gap-x-6 gap-y-1 font-mono text-xs text-mute animate-rise" style={{ animationDelay: '120ms' }}>
          <span>{data.photos.length} foto</span>
          <span>maksimal {data.photo_limit} pilihan</span>
          {!readOnly && <span className="hidden sm:inline">ketuk untuk memilih · ikon sudut untuk memperbesar</span>}
        </div>
        {readOnly && (
          <div className="mt-8 flex max-w-xl items-start gap-3 border-t border-line pt-5 animate-rise" style={{ animationDelay: '160ms' }}>
            <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-ink text-paper">
              <Check size={13} strokeWidth={3} />
            </span>
            <div>
              <p className="text-sm">
                {done?.message ?? `${selectedCount} foto pilihan sudah tersimpan.`}
              </p>
              <p className="mt-1 text-sm text-mute">Galeri ini sekarang hanya bisa dilihat. Foto yang Anda pilih ditandai; hubungi fotografer jika ingin mengubah.</p>
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
                  disabled={sel.atLimit}
                  readOnly={readOnly}
                  onToggle={sel.toggle}
                  onOpen={setLightbox}
                />
              ))}
            </div>
          ))}
        </div>
      </section>

      {!readOnly && (
        <SelectionBar
          count={sel.count}
          limit={data.photo_limit}
          selected={sel.ids}
          photoById={photoById}
          onSubmit={() => setConfirming(true)}
          submitting={submitting}
        />
      )}

      {lightbox != null && (
        <Lightbox
          photos={data.photos}
          index={lightbox}
          selectedIds={shownIds}
          onClose={close}
          onNavigate={navigate}
          onToggle={sel.toggle}
          disabled={sel.atLimit}
          readOnly={readOnly}
        />
      )}

      {confirming && (
        <div role="dialog" aria-modal="true" className="fixed inset-0 z-50 flex items-end justify-center bg-ink/40 p-4 animate-fade sm:items-center">
          <div className="w-full max-w-md rounded-2xl bg-paper p-6 animate-rise">
            <p className="eyebrow">Konfirmasi</p>
            <h2 className="mt-2 font-display text-3xl">Kirim {sel.count} foto pilihan?</h2>
            <p className="mt-3 text-sm text-mute">Setelah dikirim, pilihan tidak bisa diubah lagi dari halaman ini.</p>
            <div className="mt-6 flex flex-wrap gap-2 sm:justify-end">
              <button type="button" className="btn-ghost" onClick={() => setConfirming(false)} disabled={submitting}>
                Periksa lagi
              </button>
              <button type="button" className="btn-ink" onClick={submit} disabled={submitting}>
                {submitting ? 'Mengirim…' : 'Ya, kirim'}
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  )
}

function Loading() {
  return (
    <div className="flex min-h-screen items-center justify-center">
      <span className="eyebrow animate-pulse">Memuat galeri</span>
    </div>
  )
}

function Empty({ title, body }) {
  return (
    <main className="flex min-h-screen items-center justify-center px-6">
      <div className="max-w-md text-center">
        <p className="eyebrow">Tidak tersedia</p>
        <h1 className="mt-3 font-display text-4xl">{title}</h1>
        <p className="mt-3 text-sm text-mute">{body}</p>
      </div>
    </main>
  )
}
