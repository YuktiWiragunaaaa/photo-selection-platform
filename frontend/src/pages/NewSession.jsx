import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { ArrowLeft, Info } from 'lucide-react'
import { adminApi } from '../api/adminApi'

export default function NewSession() {
  const navigate = useNavigate()
  const [form, setForm] = useState({
    client_name: '',
    drive_folder_id: '',
    photo_limit: 50,
    notes: '',
  })
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState(null)

  const handleChange = (e) => {
    const { name, value, type } = e.target
    setForm(prev => ({
      ...prev,
      [name]: type === 'number' ? parseInt(value, 10) : value,
    }))
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setIsLoading(true)
    setError(null)
    try {
      await adminApi.createSession(form)
      navigate('/admin')
    } catch (err) {
      setError(err.response?.data?.detail || 'Gagal membuat sesi. Coba lagi.')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-white">
      <header className="border-b border-gray-100 sticky top-0 bg-white z-10">
        <div className="max-w-2xl mx-auto px-4 py-4 flex items-center gap-3">
          <Link to="/admin" className="text-gray-400 hover:text-gray-600 transition-colors">
            <ArrowLeft size={18} />
          </Link>
          <h1 className="text-lg font-medium text-gray-900">Sesi Baru</h1>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-4 py-8">
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Client Name */}
          <div>
            <label className="block text-xs font-medium text-gray-500 uppercase tracking-wider mb-2">
              Nama Klien
            </label>
            <input
              type="text"
              name="client_name"
              value={form.client_name}
              onChange={handleChange}
              required
              placeholder="contoh: Budi & Sari"
              className="w-full px-4 py-3 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-gray-400 transition-colors"
            />
          </div>

          {/* Drive Folder ID */}
          <div>
            <label className="block text-xs font-medium text-gray-500 uppercase tracking-wider mb-2">
              Google Drive Folder ID
            </label>
            <input
              type="text"
              name="drive_folder_id"
              value={form.drive_folder_id}
              onChange={handleChange}
              required
              placeholder="1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgVE2upms"
              className="w-full px-4 py-3 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-gray-400 transition-colors font-mono"
            />
            <div className="flex items-start gap-1.5 mt-2">
              <Info size={12} className="text-gray-400 mt-0.5 shrink-0" />
              <p className="text-xs text-gray-400">
                Folder ID ada di URL Google Drive: drive.google.com/drive/folders/<span className="font-medium">ID_INI</span>
              </p>
            </div>
          </div>

          {/* Photo Limit */}
          <div>
            <label className="block text-xs font-medium text-gray-500 uppercase tracking-wider mb-2">
              Batas Maksimal Foto
            </label>
            <input
              type="number"
              name="photo_limit"
              value={form.photo_limit}
              onChange={handleChange}
              required
              min={1}
              max={500}
              className="w-full px-4 py-3 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-gray-400 transition-colors"
            />
          </div>

          {/* Notes (optional) */}
          <div>
            <label className="block text-xs font-medium text-gray-500 uppercase tracking-wider mb-2">
              Catatan <span className="text-gray-300 font-normal">(opsional)</span>
            </label>
            <textarea
              name="notes"
              value={form.notes}
              onChange={handleChange}
              rows={3}
              placeholder="Catatan internal untuk sesi ini..."
              className="w-full px-4 py-3 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-gray-400 transition-colors resize-none"
            />
          </div>

          {error && (
            <p className="text-sm text-red-500">{error}</p>
          )}

          <div className="flex gap-3">
            <Link
              to="/admin"
              className="flex-1 py-3 border border-gray-200 text-gray-600 text-sm rounded-lg text-center hover:bg-gray-50 transition-colors"
            >
              Batal
            </Link>
            <button
              type="submit"
              disabled={isLoading}
              className="flex-1 py-3 bg-gray-900 text-white text-sm rounded-lg hover:bg-gray-700 transition-colors disabled:opacity-50"
            >
              {isLoading ? 'Membuat...' : 'Buat Sesi'}
            </button>
          </div>
        </form>
      </main>
    </div>
  )
}
