import { Check } from 'lucide-react'
import clsx from 'clsx'

export default function PhotoCard({ photo, isSelected, onToggle, isReadOnly, isAtLimit }) {
  const handleClick = () => {
    if (isReadOnly) return
    onToggle(photo)
  }

  return (
    <div
      className={clsx(
        'photo-grid-item relative cursor-pointer overflow-hidden rounded-sm group',
        isReadOnly && 'cursor-default',
      )}
      onClick={handleClick}
    >
      {/* Photo image */}
      <img
        src={photo.thumbnail_url}
        alt={photo.filename}
        loading="lazy"
        className={clsx(
          'w-full h-auto object-cover transition-all duration-200 block',
          isSelected && 'brightness-90',
          !isSelected && !isReadOnly && !isAtLimit && 'hover:brightness-95',
          !isSelected && !isReadOnly && isAtLimit && 'opacity-70',
        )}
      />

      {/* Selection overlay */}
      {isSelected && (
        <div className="absolute inset-0 ring-2 ring-inset ring-gray-900 rounded-sm pointer-events-none">
          {/* Checkmark badge */}
          <div className="absolute top-2 right-2 bg-gray-900 rounded-full p-1">
            <Check size={12} className="text-white" strokeWidth={3} />
          </div>
        </div>
      )}

      {/* Hover overlay for unselected photos */}
      {!isSelected && !isReadOnly && !isAtLimit && (
        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/5 transition-colors pointer-events-none" />
      )}

      {/* Filename on hover */}
      <div className="absolute bottom-0 left-0 right-0 p-2 bg-gradient-to-t from-black/40 to-transparent opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
        <p className="text-white text-xs font-medium truncate">{photo.name_without_ext}</p>
      </div>
    </div>
  )
}
