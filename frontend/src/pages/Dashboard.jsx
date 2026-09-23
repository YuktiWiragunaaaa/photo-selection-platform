// [ID] Dashboard ADMIN: ringkasan status, pencarian, dan kartu tiap sesi.
import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { Copy, Download, Plus, RefreshCw, Search } from 'lucide-react'
import clsx from 'clsx'
import AdminShell, { useBranding } from '../components/AdminShell'
import StatusBadge, { sessionState } from '../components/StatusBadge'
import ReadyDot from '../components/ReadyDot'
import Toast from '../components/Toast'
import { adminApi } from '../api/adminApi'
import { errorMessage } from '../api/client'
import { copyText } from '../hooks/useClipboard'
import { dateLocale, t } from '../utils/i18n'

const fmtShort = (iso) => new Date(iso).toLocaleDateString(dateLocale(), { day: 'numeric', month: 'short' })
const daysLeft = (iso) => Math.ceil((new Date(iso) - Date.now()) / 86400000)

function metaLine(s) {
  if (s.status === 'completed') return s.submitted_at ? t('dikirim {d}', { d: fmtShort(s.submitted_at) }) : t('selesai')
  if (s.expires_at) {
    const d = daysLeft(s.expires_at)
    return d < 0 ? t('kedaluwarsa') : d === 0 ? t('deadline hari ini') : t('deadline {d}', { d: fmtShort(s.expires_at) })
  }
  return t('dibuat {d}', { d: fmtShort(s.created_at) })
}

function countLine(s) {
  const n = s.status === 'completed' ? s.selected_count : s.draft_count
  const extra = s.status === 'completed' && s.extra_count ? ` +${s.extra_count}` : ''
  return `${n} / ${s.photo_limit}${extra}`
}

export default function Dashboard() {
  const [sessions, setSessions] = useState(null)
  const [toast, setToast] = useState('')
  const [busy, setBusy] = useState(false)
  const [q, setQ] = useState('')
  const [filter, setFilter] = useState('all') // all | choosing | unopened | done | urgent

  const load = useCallback(async () => {
    setBusy(true)
    try {
      setSessions(await adminApi.listSessions())
    } catch (e) {
      setToast(errorMessage(e))
    } finally {
      setBusy(false)
    }
  }, [])

  useEffect(() => {
    load()
  }, [load])

  const copyLink = async (s) => {
    setToast((await copyText(s.gallery_url)) ? t('Link galeri {name} disalin', { name: s.client_name }) : t('Gagal menyalin'))
  }
  const copyNames = async (s) => {
    try {
      const { filenames, count } = await adminApi.filenames(s.id)
      setToast((await copyText(filenames)) ? t('{n} nama file disalin', { n: count }) : t('Gagal menyalin'))
    } catch (e) {
      setToast(errorMessage(e))
    }
  }
  const xmp = async (s) => {
    try {
      await adminApi.downloadXmp(s.id)
    } catch (e) {
      setToast(errorMessage(e))
    }
  }

  const isUrgent = (s) => s.status === 'pending' && s.expires_at && daysLeft(s.expires_at) >= 0 && daysLeft(s.expires_at) <= 2
  const stats = useMemo(() => {
    const all = sessions || []
    return {
      choosing: all.filter((s) => sessionState(s) === 'choosing').length,
      unopened: all.filter((s) => sessionState(s) === 'unopened').length,
      done: all.filter((s) => s.status === 'completed').length,
      fresh: all.filter((s) => s.is_new).length,
      urgent: all.filter(isUrgent).length,
    }
  }, [sessions])

  const shown = useMemo(() => {
    const term = q.trim().toLowerCase()
    return (sessions || []).filter((s) => {
      if (term && !s.client_name.toLowerCase().includes(term)) return false
      if (filter === 'urgent') return isUrgent(s)
      if (filter === 'fresh') return !!s.is_new
      if (filter !== 'all') return sessionState(s) === filter
      return true
    })
  }, [sessions, q, filter])

  const branding = useBranding()
  const today = new Date().toLocaleDateString(dateLocale(), { weekday: 'long', day: 'numeric', month: 'long' })
  const tiles = [
    ['fresh', t('Baru selesai'), stats.fresh, 'fresh'],
    ['choosing', t('Klien sedang memilih'), stats.choosing, 'dark'],
    ['unopened', t('Belum dibuka'), stats.unopened],
    ['done', t('Selesai dipilih'), stats.done],
    ['urgent', t('Deadline ≤ 2 hari'), stats.urgent, 'warn'],
  ]

  return (
    <AdminShell
      eyebrow={today}
      title={branding?.studio_name || t('Semua sesi')}
      actions={
        <div className="flex w-full gap-2 sm:w-auto">
          <label className="flex h-[46px] min-w-0 flex-1 items-center gap-2 rounded-full border-[1.5px] border-line bg-card px-4 text-mute sm:w-72 sm:flex-none">
            <Search size={16} />
            <input autoComplete="off"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder={t('Cari nama klien…')}
              aria-label={t('Cari nama klien')}
              className="min-w-0 flex-1 border-0 bg-transparent p-0 text-sm text-ink placeholder:text-faint focus:outline-none focus:ring-0"
            />
          </label>
          <button type="button" onClick={load} className="btn-ghost h-[46px] w-[46px] shrink-0 px-0" aria-label={t('Muat ulang')} disabled={busy}>
            <RefreshCw size={15} className={busy ? 'animate-spin' : ''} />
          </button>
        </div>
      }
    >
      <Toast message={toast} onClose={() => setToast('')} />

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-5">
        {tiles.map(([key, label, n, tone]) => (
          <button
            key={key}
            type="button"
            onClick={() => setFilter((f) => (f === key ? 'all' : key))}
            aria-pressed={filter === key}
            className={clsx(
              'flex flex-col items-start gap-1.5 rounded-[22px] px-5 py-4 text-left transition-shadow',
              tone === 'dark' ? 'bg-solid text-onsolid' : 'bg-card',
              filter === key && 'ring-2 ring-ink ring-offset-2 ring-offset-paper',
            )}
          >
            <span className={clsx('text-[13px]', tone === 'dark' ? 'text-sand' : 'text-mute')}>{label}</span>
            <span className={clsx('font-mono text-[38px] leading-none tracking-[-0.04em]', tone === 'dark' && 'text-accent', tone === 'warn' && n > 0 && 'text-danger', tone === 'fresh' && n > 0 && 'text-danger')}>
              {sessions ? n : '–'}
            </span>
          </button>
        ))}
      </div>

      <div className="mt-7">
        {sessions === null ? (
          <p className="eyebrow animate-pulse">{t('Memuat')}</p>
        ) : sessions.length === 0 ? (
          <div className="rounded-[26px] border-[1.5px] border-dashed border-line px-6 py-16 text-center">
            <p className="font-display text-4xl ">{t('Belum ada sesi')}</p>
            <p className="mt-2 text-sm text-mute">{t('Buat sesi pertama: tempel link folder Drive, tentukan jumlah foto, bagikan link ke klien.')}</p>
            <Link to="/admin/new" className="btn-accent mt-6">
              <Plus size={16} /> {t('Buat sesi')}
            </Link>
          </div>
        ) : shown.length === 0 ? (
          <p className="text-sm text-mute">{t('Tidak ada sesi yang cocok.')}</p>
        ) : (
          <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {shown.map((s) => (
              <li key={s.id} className="flex flex-col gap-3 rounded-[22px] bg-card p-3">
                <Link to={`/admin/sessions/${s.id}`} className="grid h-24 shrink-0 grid-cols-3 gap-1 overflow-hidden" aria-label={t('Buka sesi {name}', { name: s.client_name })}>
                  {[0, 1, 2].map((i) =>
                    s.preview_urls?.[i] ? (
                      <img
                        key={i}
                        src={s.preview_urls[i]}
                        alt=""
                        loading="lazy"
                        className={clsx('h-24 w-full min-w-0 bg-wash object-cover', i === 0 ? 'rounded-l-xl rounded-r' : i === 2 ? 'rounded-l rounded-r-xl' : 'rounded')}
                      />
                    ) : (
                      <span key={i} className={clsx('bg-wash', i === 0 ? 'rounded-l-xl rounded-r' : i === 2 ? 'rounded-l rounded-r-xl' : 'rounded')} />
                    ),
                  )}
                </Link>
                <div className="flex items-center justify-between gap-2 px-1.5">
                  <Link to={`/admin/sessions/${s.id}`} className="min-w-0 truncate font-display text-[26px] leading-none hover:underline">
                    {s.client_name}
                  </Link>
                  <span className="flex shrink-0 items-center gap-1.5">
                    {s.is_new && (
                      <span className="rounded-full bg-danger px-2 py-0.5 font-mono text-[10px] uppercase tracking-[0.12em] text-paper">{t('Baru')}</span>
                    )}
                    <StatusBadge session={s} />
                  </span>
                </div>
                <div className="flex items-center justify-between gap-2 px-1.5 text-xs text-mute">
                  <span className="font-mono">{countLine(s)}</span>
                  <span className={clsx(isUrgent(s) && 'font-semibold text-danger')}>{metaLine(s)}</span>
                </div>
                {s.status === 'pending' && (
                  <div className="px-1.5">
                    <ReadyDot sessionId={s.id} />
                  </div>
                )}
                <div className="flex flex-wrap gap-1.5 border-t border-line px-1 pt-3">
                  <button type="button" className="btn-ghost h-9 px-3 text-xs" onClick={() => copyLink(s)}>
                    <Copy size={13} /> {t('Link')}
                  </button>
                  {s.status === 'completed' && (
                    <>
                      <button type="button" className="btn-ink h-9 px-3 text-xs" onClick={() => xmp(s)}>
                        <Download size={13} /> XMP
                      </button>
                      <button type="button" className="btn-ghost h-9 px-3 text-xs" onClick={() => copyNames(s)}>
                        <Copy size={13} /> {t('Nama file')}
                      </button>
                    </>
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </AdminShell>
  )
}
