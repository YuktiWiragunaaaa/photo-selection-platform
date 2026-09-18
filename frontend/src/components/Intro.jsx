import { useEffect, useState } from 'react'

const DURATION = 2600 // ms on screen before it lifts away

/**
 * Opening title card for the studio: logo + studio name revealed letter by
 * letter, then "untuk <client>". Shown once per browser session per gallery,
 * tap anywhere to skip, and skipped entirely for reduced-motion users.
 */
export default function Intro({ branding, clientName, slug }) {
  const key = `psp_intro_${slug}`
  const name = branding?.studio_name?.trim()
  const [phase, setPhase] = useState(() => {
    if (!name && !branding?.logo_url) return 'gone'
    try {
      if (sessionStorage.getItem(key)) return 'gone'
      if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return 'gone'
    } catch {}
    return 'wait' // dark screen until the logo & fonts are ready, then animate
  })

  // Don't start the animation until the logo image and the web fonts have loaded,
  // otherwise the first visit shows a half-loaded logo. Give up waiting after 2.5s.
  useEffect(() => {
    if (phase !== 'wait') return
    let done = false
    const go = () => {
      if (!done) {
        done = true
        setPhase('in')
      }
    }
    const waits = []
    if (branding?.logo_url) {
      waits.push(
        new Promise((res) => {
          const img = new Image()
          img.onload = img.onerror = res
          img.src = branding.logo_url
          if (img.decode) img.decode().then(res, res)
        }),
      )
    }
    if (document.fonts?.ready) waits.push(document.fonts.ready)
    Promise.all(waits).then(go, go)
    const t = setTimeout(go, 2500)
    return () => clearTimeout(t)
  }, [phase, branding?.logo_url])

  useEffect(() => {
    if (phase !== 'in') return
    try {
      sessionStorage.setItem(key, '1')
    } catch {}
    const t = setTimeout(() => setPhase('out'), DURATION)
    return () => clearTimeout(t)
  }, [phase, key])

  useEffect(() => {
    if (phase !== 'out') return
    const t = setTimeout(() => setPhase('gone'), 700)
    return () => clearTimeout(t)
  }, [phase])

  if (phase === 'gone') return null
  if (phase === 'wait') return <div className="fixed inset-0 z-[60] bg-ink" aria-hidden />

  return (
    <div
      role="presentation"
      onClick={() => setPhase('out')}
      className={`intro fixed inset-0 z-[60] flex cursor-pointer flex-col items-center justify-center bg-ink px-6 text-paper ${phase === 'out' ? 'intro-out' : ''}`}
    >
      {branding?.logo_url && (
        <img src={branding.logo_url} alt="" className="intro-logo mb-8 h-28 w-auto max-w-[260px] object-contain sm:h-36 sm:max-w-[320px]" />
      )}
      {name && (
        <h1 className="text-center font-display text-5xl leading-none tracking-tight sm:text-7xl" aria-label={name}>
          {Array.from(name).map((ch, i) => (
            <span key={i} className="intro-letter" style={{ animationDelay: `${250 + i * 45}ms` }} aria-hidden>
              {ch === ' ' ? ' ' : ch}
            </span>
          ))}
        </h1>
      )}
      {branding?.tagline && (
        <p className="intro-sub mt-4 text-center font-mono text-[11px] uppercase tracking-eyebrow text-paper/60" style={{ animationDelay: '900ms' }}>
          {branding.tagline}
        </p>
      )}
      <div className="intro-line mt-10 h-[3px] w-24 rounded-full bg-accent" />
      <p className="intro-sub mt-6 text-center text-sm text-paper/80" style={{ animationDelay: '1300ms' }}>
        Galeri untuk <span className="font-display text-xl italic text-paper">{clientName}</span>
      </p>
      <p className="intro-sub absolute bottom-[max(24px,env(safe-area-inset-bottom))] font-mono text-[10px] uppercase tracking-eyebrow text-paper/40" style={{ animationDelay: '1600ms' }}>
        Ketuk untuk masuk
      </p>
    </div>
  )
}
