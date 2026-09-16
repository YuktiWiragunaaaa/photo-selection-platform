import { useState, useEffect, useCallback } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Plus, RefreshCw, LogOut } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { adminApi } from '../api/adminApi'
import SessionTable from '../components/SessionTable'
import LoadingSpinner from '../components/LoadingSpinner'

export default function Dashboard() {
  const [sessions, setSessions] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState(null)
  const { logout } = useAuth()
  const navigate = useNavigate()

  const fetchSessions = useCallback(async () => {
    try {
      setError(null)
      const data = await adminApi.getSessions()
      setSessions(data)
    } catch (err) {
      if (err.response?.status === 401) {
        logout()
        navigate('/admin/login')
      } else {
        setError('Gagal memuat data. Coba lagi.')
      }
    } finally {
      setIsLoading(false)
    }
  }, [logout, navigate])

  useEffect(() => {
    fetchSessions()
  }, [fetchSessions])

  const handleDelete = async (id) => {
    try {
      await adminApi.deleteSession(id)
      setSessions(prev => prev.filter(s => s.id !== id))
    } catch {
      alert('Gagal menghapus sesi')
    }
  }

  const pending = sessions.filter(s => s.status === 'pending').length
  const completed = sessions.filter(s => s.status === 'completed').length

  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <header className="border-b border-gray-100 sticky top-0 bg-white z-10">
        <div className="max-w-5xl mx-auto px-4 py-4 flex items-center justify-between">
          <div>
            <h1 className="text-lg font-medium text-gray-900">Dashboard</h1>
            <p className="text-xs text-gray-400">Photo Selection Platform</p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={fetchSessions}
              className="p-2 text-gray-400 hover:text-gray-600 transition-colors"
              title="Refresh"
            >
              <RefreshCw size={16} />
            </button>
            <button
              onClick={logout}
              className="p-2 text-gray-400 hover:text-gray-600 transition-colors"
              title="Logout"
            >
              <LogOut size={16} />
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 py-8">
        {/* Stats */}
        <div className="grid grid-cols-3 gap-4 mb-8">
          {[
            { label: 'Total Sesi', value: sessions.length },
            { label: 'Pending', value: pending },
            { label: 'Completed', value: completed },
          ].map(({ label, value }) => (
            <div key={label} className="border border-gray-100 rounded-lg p-4">
              <p className="text-2xl font-light text-gray-900">{value}</p>
              <p className="text-xs text-gray-400 uppercase tracking-wider mt-1">{label}</p>
            </div>
          ))}
        </div>

        {/* Sessions panel */}
        <div className="border border-gray-100 rounded-xl overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
            <h2 className="text-sm font-medium text-gray-700">Semua Sesi</h2>
            <Link
              to="/admin/sessions/new"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-gray-900 text-white text-xs rounded-lg hover:bg-gray-700 transition-colors"
            >
              <Plus size={13} />
              Sesi Baru
            </Link>
          </div>

          {isLoading ? (
            <div className="flex justify-center py-12">
              <LoadingSpinner />
            </div>
          ) : error ? (
            <div className="text-center py-12">
              <p className="text-sm text-red-500">{error}</p>
              <button onClick={fetchSessions} className="mt-2 text-xs text-gray-400 underline">Coba lagi</button>
            </div>
          ) : (
            <SessionTable
              sessions={sessions}
              onDelete={handleDelete}
              onRefresh={fetchSessions}
            />
          )}
        </div>
      </main>
    </div>
  )
}
