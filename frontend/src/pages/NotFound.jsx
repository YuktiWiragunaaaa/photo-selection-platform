import { Link } from 'react-router-dom'

export default function NotFound() {
  return (
    <main className="flex min-h-screen items-center justify-center px-6">
      <div className="text-center">
        <p className="eyebrow">404</p>
        <h1 className="mt-3 font-display text-4xl">Halaman tidak ada</h1>
        <Link to="/admin" className="btn-ghost mt-6">
          Ke dashboard
        </Link>
      </div>
    </main>
  )
}
