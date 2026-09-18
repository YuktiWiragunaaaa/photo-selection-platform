import { Link, useNavigate } from 'react-router-dom'
import { LogOut, Settings2 } from 'lucide-react'
import { useAuth } from '../context/AuthContext'

export default function AdminShell({ eyebrow, title, actions, children }) {
  const { logout } = useAuth()
  const navigate = useNavigate()

  return (
    <div className="min-h-screen">
      <nav className="mx-auto flex h-14 max-w-6xl items-center justify-between px-4 sm:px-6">
        <Link to="/admin" className="font-display text-xl">
          Pilih Foto <span className="font-mono text-[11px] uppercase tracking-eyebrow text-mute">admin</span>
        </Link>
        <div className="flex items-center gap-5">
          <Link to="/admin/settings" className="flex items-center gap-2 text-xs text-mute hover:text-ink">
            <Settings2 size={14} /> Studio
          </Link>
          <button
            type="button"
            onClick={() => {
              logout()
              navigate('/admin/login')
            }}
            className="flex items-center gap-2 text-xs text-mute hover:text-ink"
          >
            <LogOut size={14} /> Keluar
          </button>
        </div>
      </nav>

      <header className="mx-auto max-w-6xl px-4 pt-8 sm:px-6 sm:pt-12">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            {eyebrow && <p className="eyebrow">{eyebrow}</p>}
            <h1 className="mt-2 font-display text-4xl leading-none tracking-tight sm:text-5xl">{title}</h1>
          </div>
          {actions}
        </div>
        <hr className="mt-6 border-line" />
      </header>

      <main className="mx-auto max-w-6xl px-4 py-6 sm:px-6 sm:py-8">{children}</main>
    </div>
  )
}
