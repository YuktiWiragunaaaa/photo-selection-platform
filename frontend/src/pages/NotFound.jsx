import { Link } from 'react-router-dom'

export default function NotFound() {
  return (
    <div className="min-h-screen bg-white flex items-center justify-center px-4">
      <div className="text-center">
        <p className="text-xs text-gray-400 uppercase tracking-widest mb-4">404</p>
        <h1 className="text-2xl font-light text-gray-900 mb-4">Halaman tidak ditemukan</h1>
        <Link to="/" className="text-sm text-gray-500 underline">Kembali ke beranda</Link>
      </div>
    </div>
  )
}
