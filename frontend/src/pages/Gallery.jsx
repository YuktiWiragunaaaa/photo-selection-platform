import { useState, useEffect } from 'react'
import { useParams } from 'react-router-dom'
import { galleryApi } from '../api/galleryApi'
import { useSelection } from '../hooks/useSelection'
import PhotoGrid from '../components/PhotoGrid'
import ProgressBar from '../components/ProgressBar'
import SuccessScreen from '../components/SuccessScreen'
import Toast from '../components/Toast'
import LoadingSpinner from '../components/LoadingSpinner'

export default function Gallery() {
  const { slug } = useParams()
  const [galleryData, setGalleryData] = useState(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isSubmitted, setIsSubmitted] = useState(false)

  useEffect(() => {
    const fetchGallery = async () => {
      try {
        const data = await galleryApi.getGallery(slug)
        setGalleryData(data)
        if (data.status === 'completed') {
          setIsSubmitted(true)
        }
      } catch (err) {
        if (err.response?.status === 404) {
          setError('Galeri tidak ditemukan atau link sudah tidak valid.')
        } else {
          setError('Gagal memuat galeri. Periksa koneksi internet Anda.')
        }
      } finally {
        setIsLoading(false)
      }
    }
    fetchGallery()
  }, [slug])

  const limit = galleryData?.photo_limit || 0
  const { selectedList, count, isAtLimit, canSubmit, isSelected, toggle, warningMessage, clearWarning } = useSelection(limit)

  const handleSubmit = async () => {
    if (!canSubmit || isSubmitting) return
    setIsSubmitting(true)
    try {
      await galleryApi.submitSelection(slug, selectedList)
      setIsSubmitted(true)
    } catch (err) {
      alert(err.response?.data?.detail || 'Gagal mengirim pilihan. Coba lagi.')
    } finally {
      setIsSubmitting(false)
    }
  }

  // Loading state
  if (isLoading) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <LoadingSpinner size="lg" />
      </div>
    )
  }

  // Error state
  if (error) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center px-4">
        <div className="text-center">
          <p className="text-gray-500 text-sm">{error}</p>
        </div>
      </div>
    )
  }

  // Success state (already submitted)
  if (isSubmitted && galleryData.status === 'completed') {
    return <SuccessScreen clientName={galleryData.client_name} count={galleryData.photos?.filter(p => p.selected)?.length || count} />
  }

  const isReadOnly = galleryData.status === 'completed'

  return (
    <div className="min-h-screen bg-white pb-28">
      {/* Header */}
      <header className="border-b border-gray-50 sticky top-0 bg-white z-10">
        <div className="max-w-5xl mx-auto px-4 py-4">
          <h1 className="text-base font-medium text-gray-900">{galleryData.client_name}</h1>
          <p className="text-xs text-gray-400 mt-0.5">
            {galleryData.total_photos} foto tersedia
            {isReadOnly ? ' — Sudah dikirim' : ` · Pilih hingga ${limit}`}
          </p>
        </div>
      </header>

      {/* Photo grid */}
      <main className="max-w-5xl mx-auto px-2 pt-4">
        {galleryData.photos.length === 0 ? (
          <div className="text-center py-16 text-gray-400">
            <p className="text-sm">Tidak ada foto dalam galeri ini.</p>
          </div>
        ) : (
          <PhotoGrid
            photos={galleryData.photos}
            isSelected={isSelected}
            onToggle={toggle}
            isReadOnly={isReadOnly}
            isAtLimit={isAtLimit}
          />
        )}
      </main>

      {/* Warning toast */}
      <Toast message={warningMessage} onClose={clearWarning} />

      {/* Sticky progress bar + submit */}
      <ProgressBar
        count={count}
        limit={limit}
        canSubmit={canSubmit}
        onSubmit={handleSubmit}
        isSubmitting={isSubmitting}
        isReadOnly={isReadOnly}
      />
    </div>
  )
}
