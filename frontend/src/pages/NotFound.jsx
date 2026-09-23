import { Link } from 'react-router-dom'
import { useT } from '../utils/i18n'

export default function NotFound() {
  const t = useT()
  return (
    <main className="flex min-h-screen items-center justify-center px-6">
      <div className="text-center">
        <p className="eyebrow">404</p>
        <h1 className="mt-3 font-display text-4xl">{t('Halaman tidak ada')}</h1>
        <Link to="/admin" className="btn-ghost mt-6">
          {t('Ke dashboard')}
        </Link>
      </div>
    </main>
  )
}
