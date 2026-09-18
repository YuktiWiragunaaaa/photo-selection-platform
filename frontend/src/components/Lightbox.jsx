import { useEffect, useRef, useState } from 'react'
import { Check, ChevronLeft, ChevronRight, MessageSquare, X } from 'lucide-react'
import clsx from 'clsx'

export default function Lightbox({ photos, index, selectedIds, notes = {}, onNote, onClose, onNavigate, onToggle, disabled, readOnly }) {
  const photo = photos[index]
  const selected = selectedIds.has(photo.file_id)
  const note = notes[photo.file_id] || ''
  const [loaded, setLoaded] = useState(false)
  const [noteOpen, setNoteOpen] = useState(false)
  const [draft, setDraft] = useState(note)
  const touch = useRef(null)
  const typing = useRef(false)

  useEffect(() => {
    setLoaded(false)
    setNoteOpen(false)
    setDraft(notes[photo.file_id] || '')
  }, [index]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    const onKey = (e) => {
      if (typing.current) {
        if (e.key === 'Escape') setNoteOpen(false)
        return
      }
      if (e.key === 'Escape') onClose()
      if (e.key === 'ArrowRight') onNavigate(1)
      if (e.key === 'ArrowLeft') onNavigate(-1)
      if (e.key === ' ' || e.key === 'Enter') {
        e.preventDefault()
        if (!readOnly) onToggle(photo.file_id)
      }
    }
    window.addEventListener('keydown', onKey)
    document.body.style.overflow = 'hidden'
    return () => {
      window.removeEventListener('keydown', onKey)
      document.body.style.overflow = ''
    }
  }, [onClose, onNavigate, onToggle, photo.file_id, readOnly])

  const onTouchStart = (e) => (touch.current = e.touches[0].clientX)
  const onTouchEnd = (e) => {
    if (touch.current == null || typing.current) return
    const dx = e.changedTouches[0].clientX - touch.current
    if (Math.abs(dx) > 50) onNavigate(dx < 0 ? 1 : -1)
    touch.current = null
  }

  const canSelect = !readOnly && (!disabled || selected)
  const canNote = !readOnly && selected

  const saveNote = () => {
    onNote?.(photo.file_id, draft)
    setNoteOpen(false)
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={photo.name}
      className="fixed inset-0 z-50 flex flex-col bg-paper animate-fade"
      onTouchStart={onTouchStart}
      onTouchEnd={onTouchEnd}
    >
      <header className="flex h-14 shrink-0 items-center justify-between px-4">
        <span className="font-mono text-xs text-mute">
          {String(index + 1).padStart(2, '0')} / {String(photos.length).padStart(2, '0')}
          <span className="mx-3 text-line">|</span>
          {photo.name}
        </span>
        <button type="button" onClick={onClose} aria-label="Tutup" className="btn-ghost h-9 w-9 px-0">
          <X size={16} />
        </button>
      </header>

      <div className="relative flex min-h-0 flex-1 items-center justify-center px-4 sm:px-16">
        <button
          type="button"
          onClick={() => onNavigate(-1)}
          aria-label="Sebelumnya"
          className="absolute left-2 top-1/2 hidden h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full border border-line bg-paper hover:border-ink sm:flex"
        >
          <ChevronLeft size={18} />
        </button>
        <img
          key={photo.file_id}
          src={photo.full_url}
          alt={photo.name}
          onLoad={() => setLoaded(true)}
          className={clsx('max-h-full max-w-full object-contain transition-opacity duration-300', loaded ? 'opacity-100' : 'opacity-0')}
        />
        {!loaded && <img src={photo.thumb_url} alt="" aria-hidden className="absolute max-h-full max-w-full object-contain blur-sm" />}
        <button
          type="button"
          onClick={() => onNavigate(1)}
          aria-label="Berikutnya"
          className="absolute right-2 top-1/2 hidden h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full border border-line bg-paper hover:border-ink sm:flex"
        >
          <ChevronRight size={18} />
        </button>
      </div>

      <footer className="shrink-0 px-4 pb-[max(16px,env(safe-area-inset-bottom))] pt-3">
        {noteOpen ? (
          <div className="mx-auto max-w-lg animate-rise">
            <label className="label" htmlFor="note">
              Catatan untuk fotografer · {photo.name}
            </label>
            <textarea
              id="note"
              autoFocus
              rows={2}
              maxLength={300}
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              onFocus={() => (typing.current = true)}
              onBlur={() => (typing.current = false)}
              placeholder="Contoh: tolong crop lebih ketat, hapus orang di belakang"
              className="w-full resize-none rounded-xl border border-line p-3 text-sm focus:border-ink focus:outline-none"
            />
            <div className="mt-2 flex justify-end gap-2">
              <button type="button" className="btn-ghost h-9 px-3 text-xs" onClick={() => setNoteOpen(false)}>
                Batal
              </button>
              <button type="button" className="btn-ink h-9 px-3 text-xs" onClick={saveNote}>
                Simpan catatan
              </button>
            </div>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-3">
            {note && (
              <p className="max-w-lg text-center text-xs text-mute">
                <MessageSquare size={11} className="mr-1 inline" />
                {note}
              </p>
            )}
            <div className="flex items-center gap-2">
              {readOnly ? (
                <span className="eyebrow">{selected ? 'Foto pilihan' : 'Tidak dipilih'}</span>
              ) : (
                <button
                  type="button"
                  onClick={() => onToggle(photo.file_id)}
                  disabled={!canSelect}
                  className={clsx(selected ? 'btn-ink' : 'btn-ghost', 'min-w-[11rem]')}
                >
                  <Check size={16} strokeWidth={selected ? 3 : 2} />
                  {selected ? 'Dipilih' : disabled ? 'Kuota penuh' : 'Pilih foto ini'}
                </button>
              )}
              {canNote && (
                <button
                  type="button"
                  onClick={() => setNoteOpen(true)}
                  aria-label={note ? 'Ubah catatan' : 'Tambah catatan'}
                  title={note ? 'Ubah catatan' : 'Tambah catatan'}
                  className={clsx('btn-ghost h-11 w-11 px-0', note && 'border-ink')}
                >
                  <MessageSquare size={16} />
                </button>
              )}
            </div>
          </div>
        )}
      </footer>
    </div>
  )
}
