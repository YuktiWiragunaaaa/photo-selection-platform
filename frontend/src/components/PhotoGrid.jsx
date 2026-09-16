import PhotoCard from './PhotoCard'

export default function PhotoGrid({ photos, isSelected, onToggle, isReadOnly, isAtLimit }) {
  return (
    <div className="photo-grid">
      {photos.map((photo) => (
        <PhotoCard
          key={photo.file_id}
          photo={photo}
          isSelected={isSelected(photo.file_id)}
          onToggle={onToggle}
          isReadOnly={isReadOnly}
          isAtLimit={isAtLimit}
        />
      ))}
    </div>
  )
}
