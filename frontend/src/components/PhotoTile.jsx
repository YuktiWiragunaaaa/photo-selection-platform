import { memo, useState } from 'react'
import { Check, Maximize2 } from 'lucide-react'
import clsx from 'clsx'

function PhotoTile({ photo, index, selected, disabled, readOnly, onToggle, onOpen }) {
  const [loaded, setLoaded] = useState(false)
  const dim = readOnly && !selected

  return (
    <figure
      className={clsx(
        'group relative overflow-hidden rounded-[3px] bg-wash animate-fade',
        dim && 'opacity-35',
      )}
      style={{ aspectRatio: `${photo.width} / ${photo.height}` }}
    >
      <button
        type="button"
        onClick={() => onToggle(photo.file_id)}
        disabled={readOnly || (disabled && !selected)}
        aria-pressed={selected}
        aria-label={`${selected ? 'Batalkan' : 'Pilih'} ${photo.name}`}
        className="absolute inset-0 h-full w-full cursor-pointer disabled:cursor-default"
      >
        <img
          src={photo.thumb_url}
          alt={photo.name}
          loading={index < 12 ? 'eager' : 'lazy'}
          decoding="async"
          onLoad={() => setLoaded(true)}
          className={clsx(
            'h-full w-full object-cover transition-[opacity,transform] duration-500',
            loaded ? 'opacity-100' : 'opacity-0',
            selected ? 'scale-[0.94]' : 'scale-100',
          )}
        />
        {/* Selection frame: the photo itself steps back inside a thin ink border */}
        <span
          className={clsx(
            'pointer-events-none absolute inset-0 rounded-[3px] border-2 transition-colors duration-300',
            selected ? 'border-ink' : 'border-transparent',
          )}
        />
        <span
          className={clsx(
            'pointer-events-none absolute left-2 top-2 flex h-6 w-6 items-center justify-center rounded-full transition-all duration-300',
            selected ? 'scale-100 bg-ink text-paper' : 'scale-0 bg-paper text-ink',
          )}
        >
          <Check size={14} strokeWidth={3} />
        </span>
        {disabled && !selected && !readOnly && (
          <span className="pointer-events-none absolute inset-0 bg-paper/60" />
        )}
      </button>

      <figcaption className="pointer-events-none absolute bottom-0 left-0 right-0 flex items-end justify-between p-2">
        <span className="rounded bg-paper/85 px-1.5 py-0.5 font-mono text-[10px] text-ink opacity-0 backdrop-blur transition-opacity group-hover:opacity-100">
          {photo.name}
        </span>
      </figcaption>

      <button
        type="button"
        onClick={() => onOpen(index)}
        aria-label={`Lihat ${photo.name} lebih besar`}
        className="absolute bottom-2 right-2 flex h-8 w-8 items-center justify-center rounded-full bg-paper/85 text-ink opacity-0 backdrop-blur transition-opacity hover:bg-paper focus-visible:opacity-100 group-hover:opacity-100 [@media(hover:none)]:opacity-100"
      >
        <Maximize2 size={14} />
      </button>
    </figure>
  )
}

export default memo(PhotoTile)
