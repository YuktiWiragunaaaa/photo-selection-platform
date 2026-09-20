// [ID] Kerangka halaman admin: sidebar (menu + sub-menu Pengaturan), bar atas di HP, tombol mode gelap.
import { Link, NavLink, useLocation, useNavigate } from 'react-router-dom'
import { useState } from 'react'
import { ChevronDown, LayoutGrid, LogOut, Moon, Plus, Settings2, Sun } from 'lucide-react'
import clsx from 'clsx'
import { useAuth } from '../context/AuthContext'
import { isDarkFor, setAdminMode, useStudio } from '../utils/theme'

// Studio identity + theme, shared by every admin page (updates live after saving in Pengaturan)
export const useBranding = useStudio

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
      className="flex shrink-0 -rotate-6 items-center justify-center rounded-[11px] bg-accent text-sm font-extrabold text-onaccent"
      style={{ width: size, height: size }}
    >
      {initials}.
    </span>
  )
}

// Sub-topics of "Pengaturan", shown nested under it in the sidebar
export const SETTINGS_TABS = [
  ['identitas', 'Identitas'],
  ['tampilan', 'Tampilan'],
  ['galeri', 'Intro & galeri'],
  ['pesan', 'Pesan WhatsApp'],
  ['domain', 'Domain & keamanan'],
]

const subCls = (active) =>
  clsx('relative flex h-9 items-center rounded-xl pl-9 pr-3 text-[13px] transition-colors', active ? 'font-semibold text-onsolid' : 'text-sand/80 hover:text-onsolid')

const navCls = ({ isActive }) =>
  clsx('flex h-11 items-center gap-2.5 rounded-2xl px-3 text-sm transition-colors', isActive ? 'bg-ink2 font-semibold text-onsolid' : 'text-sand hover:text-onsolid')

export default function AdminShell({ eyebrow, title, actions, children }) {
  const { logout } = useAuth()
  const navigate = useNavigate()
  const branding = useBranding()
  const studio = branding?.studio_name || 'Pilih Foto'
  const { pathname } = useLocation()
  const inSettings = pathname.startsWith('/admin/settings')
  const currentTab = pathname.split('/')[3] || 'identitas'
  const [subOpen, setSubOpen] = useState(true)
  const showSub = inSettings && subOpen
  // Light/dark for the admin pages only (clients follow the studio setting)
  const [, rerender] = useState(0)
  const dark = isDarkFor(branding?.theme)
  const toggleMode = () => {
    setAdminMode(dark ? 'light' : 'dark')
    rerender((n) => n + 1)
  }
  const modeBtn = (cls) => (
    <button type="button" onClick={toggleMode} className={cls} aria-label={dark ? 'Mode terang' : 'Mode gelap'} title={dark ? 'Mode terang' : 'Mode gelap'}>
      {dark ? <Sun size={16} /> : <Moon size={16} />}
    </button>
  )
  const signOut = () => {
    logout()
    navigate('/admin/login')
  }

  return (
    <div className="min-h-screen lg:flex">
      {/* Sidebar (desktop) */}
      <aside className="keep-light sticky top-0 hidden h-screen w-[232px] shrink-0 flex-col gap-1.5 bg-solid px-[18px] py-7 text-onsolid lg:flex">
        <Link to="/admin" className="mb-7 flex items-center gap-2.5 px-2">
          <Mark branding={branding} />
          <span className="truncate text-[17px] font-extrabold tracking-tight">{studio}</span>
        </Link>
        <NavLink to="/admin" end className={navCls}>
          <LayoutGrid size={16} /> Semua sesi
        </NavLink>
        <NavLink
          to="/admin/settings"
          className={navCls}
          aria-expanded={inSettings ? showSub : undefined}
          onClick={(e) => {
            // already in Pengaturan: fold / unfold the sub-topics instead of navigating
            if (inSettings) {
              e.preventDefault()
              setSubOpen((o) => !o)
            } else setSubOpen(true)
          }}
        >
          <Settings2 size={16} /> Pengaturan
          <ChevronDown size={14} className={clsx('ml-auto transition-transform', showSub && 'rotate-180')} aria-hidden />
        </NavLink>
        {showSub && (
          <div className="relative mb-1 flex flex-col">
            <span className="absolute bottom-2 left-[1.35rem] top-1 w-px bg-ink2" aria-hidden />
            {SETTINGS_TABS.map(([id, label]) => (
              <Link key={id} to={`/admin/settings/${id}`} className={subCls(currentTab === id)} aria-current={currentTab === id ? 'page' : undefined}>
                {currentTab === id && <span className="absolute left-[1.2rem] h-1.5 w-1.5 rounded-full bg-accent" aria-hidden />}
                {label}
              </Link>
            ))}
          </div>
        )}
        <div className="flex-1" />
        <Link to="/admin/new" className="btn-accent h-[50px]">
          <Plus size={16} strokeWidth={2.6} /> Sesi baru
        </Link>
        <div className="mt-2 flex items-center justify-between">
          <button type="button" onClick={signOut} className="flex h-10 items-center gap-2 px-2 text-xs text-sand hover:text-onsolid">
            <LogOut size={14} /> Keluar
          </button>
          {modeBtn('flex h-10 w-10 items-center justify-center rounded-full text-sand hover:bg-ink2 hover:text-onsolid')}
        </div>
      </aside>

      {/* Top bar (mobile / tablet) */}
      <nav className="keep-light flex h-16 items-center justify-between gap-3 bg-solid px-4 text-onsolid lg:hidden">
        <Link to="/admin" className="flex min-w-0 items-center gap-2">
          <Mark branding={branding} size={30} />
          <span className="truncate font-extrabold tracking-tight">{studio}</span>
        </Link>
        <div className="flex items-center gap-1">
          {modeBtn('flex h-11 w-11 items-center justify-center rounded-full text-sand hover:text-onsolid')}
          <Link to="/admin/settings" className="flex h-11 w-11 items-center justify-center rounded-full text-sand hover:text-onsolid" aria-label="Pengaturan">
            <Settings2 size={18} />
          </Link>
          <button type="button" onClick={signOut} className="flex h-11 w-11 items-center justify-center rounded-full text-sand hover:text-onsolid" aria-label="Keluar">
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
              <h1 className="mt-2 break-words text-3xl font-extrabold leading-[1.05] tracking-[-0.04em] sm:text-5xl">{title}</h1>
            </div>
            {actions}
          </div>
        </header>
        <main className="mx-auto max-w-6xl px-4 py-6 sm:px-8 sm:py-8">{children}</main>
      </div>
    </div>
  )
}
