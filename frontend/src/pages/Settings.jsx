// [ID] Menu Pengaturan (ADMIN): identitas, tampilan/tema, intro & galeri, pesan WhatsApp, domain & keamanan.
import { useEffect, useMemo, useRef, useState } from 'react'
import { Check, Film, ImagePlus, Trash2 } from 'lucide-react'
import clsx from 'clsx'
import AdminShell, { SETTINGS_TABS } from '../components/AdminShell'
import { Link, useParams } from 'react-router-dom'
import Toast from '../components/Toast'
import { BrandFooter, BrandHeader } from '../components/Brand'
import { adminApi } from '../api/adminApi'
import { errorMessage } from '../api/client'
import { PRESETS, TEXT_SCALES, WA_PLACEHOLDERS, applyTheme, themeVars, fillWaTemplate, loadFonts, setBranding, useStudio } from '../utils/theme'

export default function Settings() {
  const { tab: tabParam } = useParams()
  const tab = SETTINGS_TABS.some(([id]) => id === tabParam) ? tabParam : 'identitas'
  const [toast, setToast] = useState('')
  const [adm, setAdm] = useState(null) // { theme, public_url, fonts_display, fonts_body, password_from_panel }
  const [theme, setTheme] = useState(null) // editable copy
  const studio = useStudio()

  useEffect(() => {
    adminApi
      .getSettings()
      .then((x) => {
        setAdm(x)
        setTheme(x.theme)
        loadFonts([...x.fonts_display, ...x.fonts_body]) // so the font pickers can show real samples
      })
      .catch((e) => setToast(errorMessage(e)))
  }, [])

  // Live preview across the whole admin while editing; revert to the saved theme when leaving unsaved
  useEffect(() => {
    if (theme) applyTheme(theme)
  }, [theme])
  useEffect(() => () => adm && applyTheme(adm.theme), [adm])

  const dirty = useMemo(() => adm && theme && JSON.stringify(adm.theme) !== JSON.stringify(theme), [adm, theme])

  const saveTheme = async () => {
    try {
      const x = await adminApi.putTheme(theme)
      setAdm(x)
      setTheme(x.theme)
      if (studio) setBranding({ ...studio, theme: x.theme })
      setToast('Tersimpan — klien langsung melihat tampilan baru')
    } catch (e) {
      setToast(errorMessage(e))
    }
  }

  const up = (patch) => setTheme((t) => ({ ...t, ...patch }))

  return (
    <AdminShell eyebrow="Pengaturan" title={SETTINGS_TABS.find(([id]) => id === tab)[1]}>
      <Toast message={toast} onClose={() => setToast('')} />

      <div className="grid grid-cols-[minmax(0,1fr)] gap-6">
        {/* On desktop the sub-topics live in the sidebar under "Pengaturan"; phones get this row */}
        <nav aria-label="Bagian pengaturan" className="lg:hidden">
          <div className="-mx-1 flex gap-1 overflow-x-auto px-1 pb-1">
            {SETTINGS_TABS.map(([id, label]) => (
              <Link
                key={id}
                to={`/admin/settings/${id}`}
                className={clsx('flex h-10 shrink-0 items-center rounded-full px-4 text-sm', tab === id ? 'bg-solid font-semibold text-onsolid' : 'bg-card text-mute')}
              >
                {label}
              </Link>
            ))}
          </div>
        </nav>

        <div className="min-w-0">
          {tab === 'identitas' && <Identity onToast={setToast} />}

          {tab !== 'identitas' && !theme && <p className="eyebrow animate-pulse">Memuat</p>}

          {theme && tab === 'tampilan' && <Appearance theme={theme} up={up} fonts={adm} />}
          {theme && tab === 'galeri' && <GallerySettings theme={theme} up={up} />}
          {theme && tab === 'pesan' && <MessageSettings theme={theme} up={up} studio={studio} />}
          {adm && tab === 'domain' && <DomainSecurity adm={adm} setAdm={setAdm} onToast={setToast} />}
        </div>
      </div>

      {/* [ID] Bar simpan hanya muncul bila ada perubahan, agar tidak menutupi isi di HP */}
      {theme && dirty && ['tampilan', 'galeri', 'pesan'].includes(tab) && (
        <div className="sticky bottom-3 z-20 mt-10 flex items-center gap-2 rounded-[22px] bg-solid p-2 pl-4 text-onsolid shadow-lg">
          <span className="min-w-0 truncate text-sm text-sand">Belum disimpan</span>
          <div className="ml-auto flex gap-2">
            {dirty && (
              <button type="button" className="h-10 rounded-full px-4 text-sm text-sand hover:text-onsolid" onClick={() => setTheme(adm.theme)}>
                Batalkan
              </button>
            )}
            <button type="button" className="btn-accent h-10" disabled={!dirty} onClick={saveTheme}>
              <Check size={15} /> Simpan
            </button>
          </div>
        </div>
      )}
    </AdminShell>
  )
}

/* ------------------------------------------------------------------ Tampilan */
function Appearance({ theme, up, fonts }) {
  const presetId = PRESETS.find((p) => p.paper === theme.paper && p.ink === theme.ink && p.accent === theme.accent)?.id
  return (
    <div className="grid gap-10 lg:grid-cols-[minmax(0,30rem)_1fr]">
      <div className="space-y-10">
        <section>
          <p className="label">Tema warna siap pakai</p>
          <div className="grid grid-cols-3 gap-2 sm:grid-cols-6 lg:grid-cols-3">
            {PRESETS.map((p) => (
              <button
                key={p.id}
                type="button"
                onClick={() => up({ paper: p.paper, ink: p.ink, accent: p.accent })}
                aria-pressed={presetId === p.id}
                className={clsx('rounded-2xl border-2 p-2 text-left text-xs transition-colors', presetId === p.id ? 'border-ink' : 'border-transparent bg-card hover:border-line')}
              >
                <span className="flex h-10 overflow-hidden rounded-xl">
                  <span className="flex-1" style={{ background: p.paper }} />
                  <span className="flex-1" style={{ background: p.ink }} />
                  <span className="flex-1" style={{ background: p.accent }} />
                </span>
                <span className="mt-1.5 block font-semibold">{p.name}</span>
              </button>
            ))}
          </div>
        </section>

        <section>
          <p className="label">Atau pilih warna sendiri</p>
          <div className="grid grid-cols-3 gap-3">
            {[
              ['paper', 'Latar'],
              ['ink', 'Teks & gelap'],
              ['accent', 'Aksen / tombol'],
            ].map(([k, label]) => (
              <label key={k} className="flex flex-col gap-1.5 rounded-2xl bg-card p-3 text-xs">
                <input type="color" value={theme[k]} onChange={(e) => up({ [k]: e.target.value.toUpperCase() })} className="h-10 w-full cursor-pointer rounded-lg border border-line bg-transparent" />
                <span className="font-semibold">{label}</span>
                <span className="font-mono text-mute">{theme[k]}</span>
              </label>
            ))}
          </div>
          <p className="mt-2 text-xs text-mute">Warna turunan (abu-abu, garis, teks di atas tombol) dihitung otomatis supaya tetap mudah dibaca.</p>
        </section>

        <section>
          <p className="label">Mode warna untuk klien</p>
          <div className="grid grid-cols-3 gap-2">
            {[
              ['light', 'Terang', 'Selalu terang'],
              ['dark', 'Gelap', 'Selalu gelap'],
              ['auto', 'Ikuti perangkat', 'Sesuai setelan HP klien'],
            ].map(([id, label, desc]) => (
              <button
                key={id}
                type="button"
                onClick={() => up({ color_mode: id })}
                aria-pressed={theme.color_mode === id}
                className={clsx('rounded-2xl border-2 p-3 text-left', theme.color_mode === id ? 'border-ink bg-card' : 'border-transparent bg-card hover:border-line')}
              >
                <span className="block text-sm font-semibold">{label}</span>
                <span className="block text-xs text-mute">{desc}</span>
              </button>
            ))}
          </div>
          <p className="mt-2 text-xs text-mute">Versi gelap dibuat otomatis dari warna yang sama: warna teks jadi latar, warna latar jadi teks, aksen tetap. Intro dan tampilan foto besar selalu gelap.</p>
        </section>

        <section>
          <p className="label">Ukuran teks di galeri klien</p>
          <div className="flex flex-wrap gap-2">
            {TEXT_SCALES.map((s) => (
              <button
                key={s.value}
                type="button"
                onClick={() => up({ text_scale: s.value })}
                aria-pressed={Math.abs(theme.text_scale - s.value) < 0.01}
                className={clsx('h-12 rounded-full border-2 px-5', Math.abs(theme.text_scale - s.value) < 0.01 ? 'border-ink bg-solid text-onsolid' : 'border-line bg-card')}
                style={{ fontSize: `${s.value}rem` }}
              >
                {s.label}
              </button>
            ))}
          </div>
        </section>

        <section>
          <p className="label">Font judul</p>
          <div className="grid grid-cols-2 gap-2">
            {fonts.fonts_display.map((f) => (
              <FontOption key={f} font={f} active={theme.font_display === f} onClick={() => up({ font_display: f })} display italic={theme.display_italic} />
            ))}
          </div>
          <label className="mt-3 flex items-center gap-2 text-sm">
            <input type="checkbox" checked={theme.display_italic} onChange={(e) => up({ display_italic: e.target.checked })} className="h-5 w-5 rounded border-line" />
            Judul miring (italic)
          </label>
        </section>

        <section>
          <p className="label">Font teks</p>
          <div className="grid grid-cols-2 gap-2">
            {fonts.fonts_body.map((f) => (
              <FontOption key={f} font={f} active={theme.font_body === f} onClick={() => up({ font_body: f })} />
            ))}
          </div>
        </section>
      </div>

      <Preview theme={theme} />
    </div>
  )
}

function FontOption({ font, active, onClick, display, italic }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={clsx('flex h-16 flex-col justify-center rounded-2xl border-2 px-3 text-left', active ? 'border-ink bg-card' : 'border-transparent bg-card hover:border-line')}
    >
      <span className="truncate text-xl leading-tight" style={{ fontFamily: `'${font}'`, fontStyle: display && italic ? 'italic' : 'normal' }}>
        {display ? 'Ayu & Bagus' : 'Pilih foto favorit'}
      </span>
      <span className="text-[11px] text-mute">{font}</span>
    </button>
  )
}

function Preview({ theme }) {
  const studio = useStudio()
  const [dark, setDark] = useState(theme.color_mode === 'dark')
  useEffect(() => {
    if (theme.color_mode !== 'auto') setDark(theme.color_mode === 'dark')
  }, [theme.color_mode])
  return (
    <div className="lg:sticky lg:top-6 lg:self-start">
      <div className="mb-3 flex items-center justify-between gap-2">
        <p className="eyebrow">Pratinjau galeri klien</p>
        <div className="flex rounded-full bg-card p-0.5 text-xs">
          {[
            [false, 'Terang'],
            [true, 'Gelap'],
          ].map(([v, label]) => (
            <button key={label} type="button" onClick={() => setDark(v)} aria-pressed={dark === v} className={clsx('rounded-full px-3 py-1', dark === v ? 'bg-solid text-onsolid' : 'text-mute')}>
              {label}
            </button>
          ))}
        </div>
      </div>
      <div className="overflow-hidden rounded-[26px] border border-line bg-paper p-5 text-ink" style={{ fontSize: `${theme.text_scale || 1}rem`, ...themeVars(theme, dark) }}>
        <BrandHeader branding={studio} />
        <p className="eyebrow mt-6">{theme.gallery_title}</p>
        <p className="mt-2 font-display text-5xl leading-none">Ayu &amp; Bagus</p>
        <div className="mt-3 flex flex-wrap gap-2">
          <span className="rounded-full bg-solid px-3 py-1 text-[0.8em] text-onsolid">Pilih sebelum Jumat, 25 Sep</span>
          <span className="rounded-full bg-accent px-3 py-1 text-[0.8em] font-bold text-onaccent">7 hari lagi</span>
        </div>
        <div className="mt-5 grid grid-cols-3 gap-2">
          {[0, 1, 2].map((i) => (
            <div key={i} className={clsx('relative aspect-[4/5] rounded-2xl bg-wash', i === 1 && 'ring-[3px] ring-inset ring-accent')}>
              {i === 1 && <span className="absolute left-2 top-2 flex h-6 w-6 items-center justify-center rounded-full bg-accent text-onaccent"><Check size={13} strokeWidth={3} /></span>}
            </div>
          ))}
        </div>
        <div className="mt-5 flex items-center gap-3 rounded-[22px] bg-solid p-3 text-onsolid">
          <span className="font-mono text-2xl">
            12 <span className="text-faint">/ 40</span>
          </span>
          <span className="text-[0.75em] text-sand">Sisa 28 foto dalam paket</span>
          <span className="btn-accent ml-auto h-10 px-4 text-[0.85em]">Kirim</span>
        </div>
      </div>
    </div>
  )
}

/* ------------------------------------------------------------------ Intro & galeri */
function GallerySettings({ theme, up }) {
  return (
    <div className="grid gap-10 xl:grid-cols-[minmax(0,1fr)_17rem]">
    <div className="grid gap-8">
      <section className="rounded-[22px] bg-card p-5">
        <p className="label">Kemudahan untuk klien</p>
        <p className="mb-4 text-sm text-mute">Untuk klien yang kurang terbiasa dengan aplikasi (misalnya orang tua). Ukuran teks ada di Tampilan.</p>
        <Toggle
          checked={theme.simple_mode}
          onChange={(v) => up({ simple_mode: v })}
          title="Mode sederhana"
          desc="Menyembunyikan fitur “Tandai dulu” dan membuat tombol panduan lebih besar, supaya pilihan di layar lebih sedikit."
        />
      </section>

      <section className="rounded-[22px] bg-card p-5">
        <p className="label">Intro pembuka</p>
        <Toggle checked={theme.intro_enabled} onChange={(v) => up({ intro_enabled: v })} title="Tampilkan intro" desc="Muncul sekali saat klien membuka link. Klien selalu bisa mengetuk untuk melewati." />
        {theme.intro_enabled && (
          <div className="mt-5 grid grid-cols-2 gap-2 sm:grid-cols-4">
            {INTRO_STYLES.map(([id, label, desc]) => (
              <button
                key={id}
                type="button"
                onClick={() => up({ intro_style: id })}
                aria-pressed={theme.intro_style === id}
                className={clsx('rounded-2xl border-2 p-3 text-left', theme.intro_style === id ? 'border-ink bg-paper' : 'border-line hover:border-mute')}
              >
                <span className="block text-sm font-semibold">{label}</span>
                <span className="mt-0.5 block text-xs text-mute">{desc}</span>
              </button>
            ))}
          </div>
        )}
        {theme.intro_enabled && theme.intro_style === 'video' && <IntroVideo />}
        {theme.intro_enabled && theme.intro_style !== 'video' && (
          <div className="mt-5 grid gap-5 sm:grid-cols-2">
            <div>
              <label className="label" htmlFor="intro-text">Teks sebelum nama klien</label>
              <input autoComplete="off" id="intro-text" className="field" value={theme.intro_text} onChange={(e) => up({ intro_text: e.target.value })} placeholder="Galeri untuk" maxLength={60} />
            </div>
            <div>
              <label className="label" htmlFor="intro-sec">Lama tampil: {Number(theme.intro_seconds).toFixed(1)} detik</label>
              <input id="intro-sec" type="range" min="1.5" max="6" step="0.5" value={theme.intro_seconds} onChange={(e) => up({ intro_seconds: Number(e.target.value) })} className="mt-4 w-full accent-[rgb(var(--c-ink))]" />
            </div>
          </div>
        )}
      </section>

      <section className="rounded-[22px] bg-card p-5">
        <p className="label">Galeri</p>
        <label className="label mt-2" htmlFor="gtitle">Judul kecil di atas nama klien</label>
        <input autoComplete="off" id="gtitle" className="field" value={theme.gallery_title} onChange={(e) => up({ gallery_title: e.target.value })} maxLength={80} />
        <Toggle className="mt-5" checked={theme.guide_enabled} onChange={(v) => up({ guide_enabled: v })} title="Panduan otomatis" desc="Panduan cara memilih muncul sekali saat klien pertama membuka. Tombol “Cara memilih” selalu tersedia." />
      </section>
    </div>
    <IntroPreview theme={theme} />
    </div>
  )
}

const INTRO_STYLES = [
  ['morph', 'Logo → pojok', 'Logo besar lalu mengecil ke atas galeri. Butuh logo.'],
  ['letters', 'Huruf per huruf', 'Nama studio muncul bertahap.'],
  ['fade', 'Fade', 'Tenang dan sederhana.'],
  ['video', 'Video sendiri', 'Klip pendek buatan studio.'],
]

// Limits for the intro clip (why: most clients open the link on a phone, often on mobile data)
const VIDEO_RULES = { maxMB: 6, maxSeconds: 8, warnSeconds: 6 }

function readVideoMeta(file) {
  return new Promise((resolve) => {
    const v = document.createElement('video')
    v.preload = 'metadata'
    v.onloadedmetadata = () => {
      resolve({ seconds: v.duration, width: v.videoWidth, height: v.videoHeight })
      URL.revokeObjectURL(v.src)
    }
    v.onerror = () => resolve(null)
    v.src = URL.createObjectURL(file)
  })
}

function IntroVideo() {
  const studio = useStudio()
  const [busy, setBusy] = useState(null) // variant being uploaded
  const [progress, setProgress] = useState(0)
  const [msg, setMsg] = useState('')
  const refs = { desktop: useRef(null), mobile: useRef(null) }
  const vids = studio?.intro_video || {}

  const upload = async (variant, file) => {
    if (!file) return
    setMsg('')
    if (!['video/mp4', 'video/webm'].includes(file.type)) return setMsg('Format harus MP4 (disarankan) atau WebM.')
    if (file.size > VIDEO_RULES.maxMB * 1024 * 1024) return setMsg(`Ukuran ${(file.size / 1048576).toFixed(1)} MB — maksimal ${VIDEO_RULES.maxMB} MB. Kecilkan ke 720p atau perpendek durasinya.`)
    const meta = await readVideoMeta(file)
    if (!meta) return setMsg('Video tidak bisa dibaca browser. Ekspor ulang sebagai MP4 (H.264).')
    if (meta.seconds > VIDEO_RULES.maxSeconds) return setMsg(`Durasi ${meta.seconds.toFixed(1)} detik — maksimal ${VIDEO_RULES.maxSeconds} detik.`)
    const notes = []
    if (meta.seconds > VIDEO_RULES.warnSeconds) notes.push(`durasi ${meta.seconds.toFixed(1)} dtk (ideal ≤ ${VIDEO_RULES.warnSeconds})`)
    if (Math.max(meta.width, meta.height) > 1920) notes.push('resolusi di atas 1080p tidak perlu')
    if (variant === 'mobile' && meta.width > meta.height) notes.push('versi HP sebaiknya tegak (9:16)')
    setBusy(variant)
    setProgress(0)
    try {
      const b = await adminApi.uploadIntroVideo(variant, file, setProgress)
      setBranding({ ...b, theme: studio?.theme || b.theme })
      setMsg(`Video terunggah (${(file.size / 1048576).toFixed(1)} MB, ${meta.seconds.toFixed(1)} dtk).${notes.length ? ' Catatan: ' + notes.join('; ') + '.' : ''}`)
    } catch (e) {
      setMsg(errorMessage(e))
    } finally {
      setBusy(null)
    }
  }
  const remove = async (variant) => {
    const b = await adminApi.deleteIntroVideo(variant)
    setBranding({ ...b, theme: studio?.theme || b.theme })
  }

  return (
    <div className="mt-5 space-y-4">
      <div className="grid gap-3 sm:grid-cols-2">
        {[
          ['desktop', 'Versi utama', 'Mendatar 16:9 · wajib'],
          ['mobile', 'Versi HP', 'Tegak 9:16 · opsional'],
        ].map(([variant, title, sub]) => (
          <div key={variant} className="rounded-2xl border border-line p-3">
            <p className="text-sm font-semibold">{title}</p>
            <p className="text-xs text-mute">{sub}</p>
            {vids[variant] ? (
              <video src={vids[variant]} muted playsInline controls className={clsx('mt-3 w-full rounded-xl bg-solid', variant === 'mobile' ? 'mx-auto aspect-[9/16] max-h-56 w-auto' : 'aspect-video')} />
            ) : (
              <div className={clsx('mt-3 flex items-center justify-center rounded-xl border border-dashed border-line text-faint', variant === 'mobile' ? 'mx-auto aspect-[9/16] h-40' : 'aspect-video')}>
                <Film size={20} />
              </div>
            )}
            <input ref={refs[variant]} type="file" accept="video/mp4,video/webm" className="hidden" onChange={(e) => {
                const f = e.target.files?.[0]
                e.target.value = '' // allow re-selecting the same file
                upload(variant, f)
              }} />
            <div className="mt-3 flex gap-2">
              <button type="button" className="btn-ghost h-9 px-3 text-xs" disabled={!!busy} onClick={() => refs[variant].current?.click()}>
                {busy === variant ? `Mengunggah ${Math.round(progress * 100)}%` : vids[variant] ? 'Ganti' : 'Unggah'}
              </button>
              {vids[variant] && (
                <button type="button" className="btn-ghost h-9 w-9 px-0 text-danger" aria-label="Hapus video" onClick={() => remove(variant)}>
                  <Trash2 size={13} />
                </button>
              )}
            </div>
          </div>
        ))}
      </div>
      {msg && <p className="text-sm">{msg}</p>}
      <div className="rounded-2xl bg-paper p-4 text-xs leading-relaxed text-mute">
        <p className="mb-1 font-semibold text-ink">Ketentuan video intro</p>
        <ul className="list-disc space-y-0.5 pl-4">
          <li><b className="text-ink">Durasi 3–6 detik</b> (maks {VIDEO_RULES.maxSeconds}). Klien datang untuk melihat foto, bukan menonton.</li>
          <li><b className="text-ink">Ukuran maks {VIDEO_RULES.maxMB} MB</b>, idealnya di bawah 3 MB, supaya cepat di data seluler.</li>
          <li><b className="text-ink">MP4 (H.264), 720p</b> sudah cukup tajam di HP. Tidak perlu 4K.</li>
          <li><b className="text-ink">Tanpa suara.</b> Browser HP memutar video otomatis hanya jika dibisukan.</li>
          <li>Versi HP (tegak 9:16) opsional. Tanpa itu, versi utama ditampilkan utuh dengan latar gelap.</li>
          <li>Jika video belum siap dalam 2,5 detik (sinyal lemah), otomatis diganti animasi logo supaya klien tidak menunggu.</li>
        </ul>
      </div>
    </div>
  )
}

function Toggle({ checked, onChange, title, desc, className }) {
  return (
    <label className={clsx('flex cursor-pointer items-start gap-3', className)}>
      <span className="relative mt-0.5 inline-flex shrink-0">
        <input type="checkbox" className="peer sr-only" checked={!!checked} onChange={(e) => onChange(e.target.checked)} />
        <span className="h-7 w-12 rounded-full bg-line transition-colors peer-checked:bg-solid peer-focus-visible:ring-2 peer-focus-visible:ring-ink peer-focus-visible:ring-offset-2" />
        <span className="absolute left-1 top-1 h-5 w-5 rounded-full bg-card shadow transition-transform peer-checked:translate-x-5" />
      </span>
      <span>
        <span className="block text-sm font-semibold">{title}</span>
        {desc && <span className="block text-sm text-mute">{desc}</span>}
      </span>
    </label>
  )
}

/* ------------------------------------------------------------------ Pesan WhatsApp */
function MessageSettings({ theme, up, studio }) {
  const ref = useRef(null)
  const sample = fillWaTemplate(theme.wa_template, {
    nama: 'Ayu & Bagus',
    link: 'https://studio-kamu.com/g/Ab12Cd34',
    pin: '4827',
    paket: 40,
    tambahan: ' (kalau mau lebih, bisa sampai 50 dengan biaya tambahan)',
    deadline: 'Jumat, 25 September',
    studio: studio?.studio_name || 'Nama Studio',
  })
  const insert = (tag) => {
    const el = ref.current
    const start = el?.selectionStart ?? theme.wa_template.length
    const end = el?.selectionEnd ?? start
    up({ wa_template: theme.wa_template.slice(0, start) + tag + theme.wa_template.slice(end) })
    requestAnimationFrame(() => {
      el?.focus()
      el?.setSelectionRange(start + tag.length, start + tag.length)
    })
  }
  return (
    <div className="grid gap-8 lg:grid-cols-2">
      <div>
        <label className="label" htmlFor="wa">Template pesan</label>
        <textarea autoComplete="off" ref={ref} id="wa" rows={12} value={theme.wa_template} onChange={(e) => up({ wa_template: e.target.value })} className="w-full rounded-2xl border border-line bg-card p-4 text-sm leading-relaxed focus:border-ink focus:outline-none" />
        <p className="mb-2 mt-4 text-xs text-mute">Klik untuk menyisipkan data otomatis:</p>
        <div className="flex flex-wrap gap-1.5">
          {WA_PLACEHOLDERS.map(([tag, desc]) => (
            <button key={tag} type="button" onClick={() => insert(tag)} title={desc} className="rounded-full border border-line bg-card px-2.5 py-1 font-mono text-xs hover:border-ink">
              {tag}
            </button>
          ))}
        </div>
        <ul className="mt-3 space-y-0.5 text-xs text-mute">
          {WA_PLACEHOLDERS.map(([tag, desc]) => (
            <li key={tag}>
              <span className="font-mono text-ink">{tag}</span> — {desc}
            </li>
          ))}
        </ul>
      </div>
      <div>
        <p className="label">Contoh hasilnya</p>
        <div className="rounded-2xl bg-[#E7FFDB] p-4 text-sm leading-relaxed text-[#111B21] shadow-sm" style={{ whiteSpace: 'pre-wrap' }}>
          {sample}
        </div>
        <p className="mt-2 text-xs text-mute">Hindari emoji: sebagian HP menampilkannya sebagai “�” lewat tombol WhatsApp.</p>
      </div>
    </div>
  )
}

/* ------------------------------------------------------------------ Domain & keamanan */
function DomainSecurity({ adm, setAdm, onToast }) {
  const [url, setUrl] = useState(adm.public_url)
  const [pw, setPw] = useState({ current: '', next: '', again: '' })
  const [busy, setBusy] = useState(false)

  const saveUrl = async () => {
    setBusy(true)
    try {
      setAdm(await adminApi.putSettings({ public_url: url }))
      onToast(url ? 'Alamat publik disimpan' : 'Alamat publik dikosongkan — memakai FRONTEND_URL dari .env')
    } catch (e) {
      onToast(errorMessage(e))
    } finally {
      setBusy(false)
    }
  }

  const savePw = async (e) => {
    e.preventDefault()
    if (pw.next !== pw.again) return onToast('Password baru dan ulangannya tidak sama')
    setBusy(true)
    try {
      await adminApi.changePassword(pw.current, pw.next)
      setPw({ current: '', next: '', again: '' })
      setAdm({ ...adm, password_from_panel: true })
      onToast('Password admin diganti')
    } catch (err) {
      onToast(errorMessage(err))
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="grid max-w-2xl gap-8">
      <section className="rounded-[22px] bg-card p-5">
        <p className="label">Alamat publik (domain)</p>
        <p className="mb-4 text-sm text-mute">
          Alamat yang dipakai di link galeri & pesan WhatsApp. Isi dengan domain studio (mis. <span className="font-mono">https://pilih.studiokamu.com</span>) atau alamat ngrok. Kosongkan untuk memakai pengaturan server.
        </p>
        <div className="flex flex-wrap gap-2">
          <input autoComplete="off" className="field min-w-0 flex-1 font-mono text-sm" value={url} onChange={(e) => setUrl(e.target.value)} placeholder={window.location.origin} />
          <button type="button" className="btn-ink" disabled={busy || url === adm.public_url} onClick={saveUrl}>
            Simpan
          </button>
        </div>
        <button type="button" className="mt-3 text-xs text-mute underline hover:text-ink" onClick={() => setUrl(window.location.origin)}>
          Pakai alamat yang sedang dibuka ({window.location.origin})
        </button>
        <p className="mt-4 text-xs text-mute">
          Catatan: mengarahkan domain ke server (DNS & hosting) dilakukan di penyedia domain/hosting, bukan dari sini. Lihat README bagian “Hosting”.
        </p>
      </section>

      <form onSubmit={savePw} className="rounded-[22px] bg-card p-5">
        <p className="label">Ganti password admin</p>
        <p className="mb-4 text-sm text-mute">
          {adm.password_from_panel ? 'Password saat ini diatur dari panel ini.' : 'Saat ini memakai ADMIN_PASSWORD dari file .env. Setelah diganti di sini, password baru yang berlaku.'}
        </p>
        <div className="grid gap-4 sm:grid-cols-3">
          <input type="password" autoComplete="current-password" className="field" placeholder="Password lama" value={pw.current} onChange={(e) => setPw({ ...pw, current: e.target.value })} />
          <input type="password" autoComplete="new-password" className="field" placeholder="Password baru (min. 8)" value={pw.next} onChange={(e) => setPw({ ...pw, next: e.target.value })} />
          <input type="password" autoComplete="new-password" className="field" placeholder="Ulangi password baru" value={pw.again} onChange={(e) => setPw({ ...pw, again: e.target.value })} />
        </div>
        <button type="submit" className="btn-ink mt-5" disabled={busy || !pw.current || pw.next.length < 8}>
          Ganti password
        </button>
      </form>
    </div>
  )
}

/* ------------------------------------------------------------------ Identitas (name, tagline, contact, nomor WA, logo) */
function Identity({ onToast }) {
  const [b, setB] = useState(null)
  const [form, setForm] = useState({ studio_name: '', tagline: '', contact: '', wa_number: '' })
  const [busy, setBusy] = useState(false)
  const fileRef = useRef(null)
  const studio = useStudio()

  useEffect(() => {
    adminApi
      .getBranding()
      .then((x) => {
        setB(x)
        setForm({ studio_name: x.studio_name, tagline: x.tagline, contact: x.contact, wa_number: x.wa_number || '' })
      })
      .catch((e) => onToast(errorMessage(e)))
  }, [onToast])

  const publish = (x) => {
    setB(x)
    setBranding({ ...x, theme: studio?.theme || x.theme }) // sidebar & other pages update right away
  }
  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }))

  const save = async (e) => {
    e.preventDefault()
    setBusy(true)
    try {
      publish(await adminApi.putBranding(form))
      onToast('Identitas studio disimpan')
    } catch (err) {
      onToast(errorMessage(err))
    } finally {
      setBusy(false)
    }
  }
  const upload = async (file) => {
    if (!file) return
    try {
      publish(await adminApi.uploadLogo(file))
      onToast('Logo diunggah')
    } catch (err) {
      onToast(errorMessage(err))
    }
  }
  const removeLogo = async () => {
    try {
      publish(await adminApi.deleteLogo())
      onToast('Logo dihapus')
    } catch (err) {
      onToast(errorMessage(err))
    }
  }

  if (!b) return <p className="eyebrow animate-pulse">Memuat</p>
  const preview = { ...form, logo_url: b.logo_url }

  return (
    <div className="grid gap-12 md:grid-cols-[minmax(0,28rem)_1fr]">
      <form onSubmit={save} className="space-y-8">
        <div>
          <label className="label" htmlFor="name">Nama studio</label>
          <input autoComplete="off" id="name" className="field text-lg" value={form.studio_name} onChange={set('studio_name')} placeholder="Nama studio kamu" maxLength={120} />
          <p className="mt-2 text-xs text-mute">Tampil di intro, galeri klien, halaman PIN, dan judul dashboard.</p>
        </div>
        <div>
          <label className="label" htmlFor="tag">Tagline</label>
          <input autoComplete="off" id="tag" className="field" value={form.tagline} onChange={set('tagline')} placeholder="Wedding & portrait photography" maxLength={200} />
        </div>
        <div>
          <label className="label" htmlFor="contact">Kontak</label>
          <input autoComplete="off" id="contact" className="field font-mono text-sm" value={form.contact} onChange={set('contact')} placeholder="@studio · 0812-xxxx-xxxx" maxLength={200} />
          <p className="mt-2 text-xs text-mute">Ditampilkan di footer galeri agar klien tahu ke mana bertanya.</p>
        </div>
        <div>
          <label className="label" htmlFor="wa-number">Nomor WhatsApp studio</label>
          <input autoComplete="off" id="wa-number" inputMode="tel" className="field font-mono text-sm" value={form.wa_number} onChange={set('wa_number')} placeholder="0812-3456-7890" maxLength={25} />
          <p className="mt-2 text-xs text-mute">Memunculkan tombol “Chat fotografer” di footer galeri klien. Boleh ditulis 0812… atau +62812…, nanti dirapikan otomatis. Kosongkan untuk menyembunyikan tombolnya.</p>
        </div>
        <div>
          <span className="label">Logo</span>
          <div className="flex items-center gap-3">
            {b.logo_url ? (
              <img src={b.logo_url} alt="Logo" className="h-14 w-auto max-w-[160px] rounded-xl border border-line object-contain p-1" />
            ) : (
              <span className="flex h-14 w-28 items-center justify-center rounded-xl border border-dashed border-line text-[11px] text-faint">tanpa logo</span>
            )}
            <input ref={fileRef} type="file" accept="image/png,image/jpeg,image/svg+xml,image/webp" className="hidden" onChange={(e) => upload(e.target.files?.[0])} />
            <button type="button" className="btn-ghost h-10 px-4 text-xs" onClick={() => fileRef.current?.click()}>
              <ImagePlus size={14} /> {b.logo_url ? 'Ganti' : 'Unggah'}
            </button>
            {b.logo_url && (
              <button type="button" className="btn-ghost h-10 w-10 px-0 text-danger" aria-label="Hapus logo" onClick={removeLogo}>
                <Trash2 size={14} />
              </button>
            )}
          </div>
          <p className="mt-2 text-xs text-mute">PNG/SVG berlatar transparan, maks 2 MB.</p>
        </div>
        <button type="submit" className="btn-ink" disabled={busy}>
          {busy ? 'Menyimpan…' : 'Simpan identitas'}
        </button>
      </form>

      <div>
        <p className="eyebrow mb-3">Pratinjau di galeri klien</p>
        <div className="rounded-[26px] border border-line bg-paper p-6">
          <BrandHeader branding={preview} />
          <p className="eyebrow mt-8">Pilih foto favorit Anda</p>
          <p className="mt-2 font-display text-4xl">Nama Klien</p>
          <div className="mt-6 grid grid-cols-3 gap-2">
            {[0, 1, 2].map((i) => (
              <div key={i} className="aspect-[4/5] rounded-2xl bg-wash" />
            ))}
          </div>
          <div className="-mx-6 -mb-6">
            <BrandFooter branding={preview} />
          </div>
        </div>
      </div>
    </div>
  )
}

/* ------------------------------------------------------------------ live phone preview for "Intro & galeri" */
function IntroPreview({ theme }) {
  const studio = useStudio()
  const [run, setRun] = useState(0) // bump to replay
  const [phase, setPhase] = useState('intro') // intro → out → gallery
  const style = !theme.intro_enabled ? 'none' : theme.intro_style === 'morph' && !studio?.logo_url ? 'letters' : theme.intro_style
  const video = studio?.intro_video?.mobile || studio?.intro_video?.desktop

  useEffect(() => {
    if (style === 'none') return setPhase('gallery')
    setPhase('intro')
    const hold = style === 'video' ? 3000 : Math.min(theme.intro_seconds || 2.6, 3.5) * 1000
    const t1 = setTimeout(() => setPhase('out'), hold)
    const t2 = setTimeout(() => setPhase('gallery'), hold + 900)
    return () => {
      clearTimeout(t1)
      clearTimeout(t2)
    }
  }, [run, style, theme.intro_seconds])

  const name = studio?.studio_name || 'Nama Studio'
  const scale = theme.text_scale || 1
  const morphOut = phase !== 'intro'

  return (
    <div className="xl:sticky xl:top-6 xl:self-start">
      <div className="mb-3 flex items-center justify-between">
        <p className="eyebrow">Pratinjau di HP</p>
        <button type="button" className="text-xs text-mute underline hover:text-ink" onClick={() => setRun((n) => n + 1)}>
          Putar ulang
        </button>
      </div>
      <div className="relative mx-auto h-[500px] w-[250px] overflow-hidden rounded-[34px] border-[6px] border-ink bg-paper shadow-xl">
        {/* gallery underneath */}
        <div className="absolute inset-0 overflow-hidden px-3 pt-4" style={{ fontSize: `${10 * scale}px` }}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              {studio?.logo_url ? (
                <img src={studio.logo_url} alt="" className={clsx('h-5 w-auto max-w-[70px] object-contain transition-opacity', style === 'morph' && phase !== 'gallery' && 'opacity-0')} />
              ) : null}
              <span className="font-display text-[1.2em] leading-none">{name}</span>
            </div>
            <span className={clsx('rounded-full', theme.simple_mode ? 'bg-solid px-2 py-1 text-[0.9em] text-onsolid' : 'border border-line px-1.5 py-0.5 text-[0.8em]')}>? Cara memilih</span>
          </div>
          <p className="mt-4 font-mono text-[0.75em] uppercase tracking-eyebrow text-mute">{theme.gallery_title}</p>
          <p className="font-display text-[2.6em] leading-none">Ayu &amp; Bagus</p>
          <div className="mt-3 grid grid-cols-2 gap-1.5">
            {[64, 90, 80, 56, 72, 88].map((h, i) => (
              <div key={i} className={clsx('relative rounded-lg bg-wash', i === 1 && 'ring-2 ring-inset ring-accent')} style={{ height: h }}>
                {!theme.simple_mode && i === 2 && <span className="absolute right-1 top-1 h-3.5 w-3.5 rounded-full bg-solid" />}
              </div>
            ))}
          </div>
          <div className="absolute inset-x-2 bottom-2 flex items-center gap-2 rounded-2xl bg-solid px-2.5 py-2 text-onsolid">
            <span className="font-mono text-[1.2em]">
              1 <span className="text-faint">/ 40</span>
            </span>
            <span className="ml-auto rounded-full bg-accent px-2.5 py-1 text-[0.9em] font-bold text-onaccent">Kirim</span>
          </div>
        </div>

        {/* intro on top */}
        {phase !== 'gallery' && style !== 'none' && (
          <div
            key={run}
            className="absolute inset-0 flex flex-col items-center justify-center bg-solid px-4 text-onsolid transition-[background-color,opacity] duration-700"
            style={{
              backgroundColor: style === 'morph' && morphOut ? 'transparent' : undefined,
              opacity: style !== 'morph' && morphOut ? 0 : 1,
            }}
          >
            {style === 'video' ? (
              video ? (
                <video src={video} muted autoPlay playsInline className="h-full w-full object-cover" />
              ) : (
                <p className="text-center text-xs text-sand">Belum ada video. Unggah di bawah — sampai ada, gaya “Logo → pojok” yang dipakai.</p>
              )
            ) : style === 'morph' ? (
              <>
                <img
                  src={studio.logo_url}
                  alt=""
                  className="absolute object-contain transition-all duration-[800ms] ease-[cubic-bezier(.65,0,.25,1)]"
                  style={
                    morphOut
                      ? { top: 16, left: 12, height: 20, maxWidth: 70, transform: 'none' }
                      : { top: '42%', left: '50%', height: 72, maxWidth: 170, transform: 'translate(-50%,-50%)' }
                  }
                />
                <div className={clsx('absolute top-[58%] text-center transition-opacity duration-300', morphOut && 'opacity-0')}>
                  <p className="font-display text-lg leading-none">{name}</p>
                  <p className="mt-2 text-[10px] text-sand">
                    {theme.intro_text} <span className="font-display text-xs text-onsolid">Ayu &amp; Bagus</span>
                  </p>
                </div>
              </>
            ) : (
              <div className={style === 'fade' ? 'intro-fade text-center' : 'text-center'}>
                {studio?.logo_url && <img src={studio.logo_url} alt="" className="mx-auto mb-3 h-12 w-auto max-w-[140px] object-contain" />}
                <p className="font-display text-2xl leading-none">
                  {style === 'letters'
                    ? Array.from(name).map((ch, i) => (
                        <span key={i} className="intro-letter" style={{ animationDelay: `${150 + i * 45}ms` }}>
                          {ch === ' ' ? ' ' : ch}
                        </span>
                      ))
                    : name}
                </p>
                {style === 'letters' && <div className="intro-line mx-auto mt-4 h-[2px] w-12 rounded-full bg-accent" />}
                <p className="mt-3 text-[10px] text-sand">
                  {theme.intro_text} <span className="font-display text-xs text-onsolid">Ayu &amp; Bagus</span>
                </p>
              </div>
            )}
          </div>
        )}
      </div>
      <p className="mt-3 text-center text-xs text-mute">Pratinjau ikut berubah saat pengaturan di kiri diubah.</p>
    </div>
  )
}
