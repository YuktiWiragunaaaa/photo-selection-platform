import { useEffect, useState } from 'react'
import { Link, NavLink, useNavigate } from 'react-router-dom'
import { LayoutGrid, LogOut, Plus, Settings2 } from 'lucide-react'
import clsx from 'clsx'
import { useAuth } from '../context/AuthContext'
import { adminApi } from '../api/adminApi'

let brandingCache = null // shared across admin pages so the sidebar doesn't refetch on every navigation

export function useBranding() {
  const [b, setB] = useState(brandingCache)
  useEffect(() => {
    if (brandingCache) return
    adminApi
      .getBranding()
      .then((x) => {
        brandingCache = x
        setB(x)
      })
      .catch(() => {})
  }, [])
  return b
}

function Mark({ branding, size = 36 }) {
  if (branding?.logo_url) {
    return <img src={branding.logo_url} alt="" className="shrink-0 rounded-[11px] bg-paper object-contain p-1" style={{ width: size, height: size }} />
  }
  const initials = (branding?.studio_name || 'Pilih Foto')
    .split(/\s+/)
    .map((w) => w[0])
    .join('')
    .slice(0, 2)
    .toLowerCase()
  return (
    <span
      className="flex shrink-0 -rotate-6 items-center justify-center rounded-[11px] bg-accent text-sm font-extrabold text-ink"
      style={{ width: size, height: size }}
    >
      {initials}.
    </span>
  )
}

const navCls = ({ isActive }) =>
  clsx('flex h-11 items-center gap-2.5 rounded-2xl px-3 text-sm transition-colors', isActive ? 'bg-ink2 font-semibold text-paper' : 'text-sand hover:text-paper')

export default function AdminShell({ eyebrow, title, actions, children }) {
  const { logout } = useAuth()
  const navigate = useNavigate()
  const branding = useBranding()
  const studio = branding?.studio_name || 'Pilih Foto'
  const signOut = () => {
    logout()
    navigate('/admin/login')
  }

  return (
    <div className="min-h-screen lg:flex">
      {/* Sidebar (desktop) */}
      <aside className="sticky top-0 hidden h-screen w-[232px] shrink-0 flex-col gap-1.5 bg-ink px-[18px] py-7 text-paper lg:flex">
        <Link to="/admin" className="mb-7 flex items-center gap-2.5 px-2">
          <Mark branding={branding} />
          <span className="truncate text-[17px] font-extrabold tracking-tight">{studio}</span>
        </Link>
        <NavLink to="/admin" end className={navCls}>
          <LayoutGrid size={16} /> Semua sesi
        </NavLink>
        <NavLink to="/admin/settings" className={navCls}>
          <Settings2 size={16} /> Studio &amp; logo
        </NavLink>
        <div className="flex-1" />
        <Link to="/admin/new" className="btn-accent h-[50px]">
          <Plus size={16} strokeWidth={2.6} /> Sesi baru
        </Link>
        <button type="button" onClick={signOut} className="mt-2 flex h-10 items-center justify-center gap-2 text-xs text-sand hover:text-paper">
          <LogOut size={14} /> Keluar
        </button>
      </aside>

      {/* Top bar (mobile / tablet) */}
      <nav className="flex h-16 items-center justify-between gap-3 bg-ink px-4 text-paper lg:hidden">
        <Link to="/admin" className="flex min-w-0 items-center gap-2">
          <Mark branding={branding} size={30} />
          <span className="truncate font-extrabold tracking-tight">{studio}</span>
        </Link>
        <div className="flex items-center gap-1">
          <Link to="/admin/settings" className="flex h-11 w-11 items-center justify-center rounded-full text-sand hover:text-paper" aria-label="Studio & logo">
            <Settings2 size={18} />
          </Link>
          <button type="button" onClick={signOut} className="flex h-11 w-11 items-center justify-center rounded-full text-sand hover:text-paper" aria-label="Keluar">
            <LogOut size={18} />
          </button>
          <Link to="/admin/new" className="btn-accent ml-1 h-10 px-4 text-xs">
            <Plus size={14} strokeWidth={2.6} /> Baru
          </Link>
        </div>
      </nav>

      <div className="min-w-0 flex-1">
        <header className="mx-auto max-w-6xl px-4 pt-8 sm:px-8 sm:pt-10">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div className="min-w-0">
              {eyebrow && <p className="eyebrow">{eyebrow}</p>}
              <h1 className="mt-2 text-4xl font-extrabold leading-none tracking-[-0.04em] sm:text-5xl">{title}</h1>
            </div>
            {actions}
          </div>
        </header>
        <main className="mx-auto max-w-6xl px-4 py-6 sm:px-8 sm:py-8">{children}</main>
      </div>
    </div>
  )
}
