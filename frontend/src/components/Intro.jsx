// [ID] Animasi pembuka di galeri klien (Logo → pojok, huruf per huruf, fade, video).
import { useEffect, useRef, useState } from 'react'

/**
 * Opening title card for the studio. Style is chosen in Pengaturan → Intro & galeri:
 *  - morph   : big logo in the middle, then it flies into the small logo in the gallery header
 *  - letters : studio name revealed letter by letter
 *  - fade    : calm fade in / out
 *  - video   : the studio's own short clip (portrait version on phones if uploaded)
 * Shown once per browser session per gallery, tap to skip, skipped for reduced-motion users.
 */
const MAX_WAIT_MS = 2500 // never keep the client waiting on a dark screen longer than this

export default function Intro({ branding, clientName, slug }) {
  const key = `psp_intro_${slug}`
  const theme = branding?.theme || {}
  const name = branding?.studio_name?.trim()
  const hasLogo = !!branding?.logo_url
  const isPhone = typeof window !== 'undefined' && window.matchMedia('(max-width: 640px), (orientation: portrait)').matches
  const videoSrc = (isPhone && branding?.intro_video?.mobile) || branding?.intro_video?.desktop || branding?.intro_video?.mobile

  // Resolve the style, falling back gracefully when what it needs is missing
  let style = theme.intro_enabled === false ? 'none' : theme.intro_style || 'morph'
  if (style === 'video' && !videoSrc) style = 'morph'
  if (style === 'morph' && !hasLogo) style = 'letters'
  if (style !== 'video' && !name && !hasLogo) style = 'none'

  const [phase, setPhase] = useState(() => {
    if (style === 'none') return 'gone'
    try {
      if (sessionStorage.getItem(key)) return 'gone'
      if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return 'gone'
    } catch {}
    return 'wait'
  })
  const [videoFailed, setVideoFailed] = useState(false)
  const rootRef = useRef(null)
  const logoRef = useRef(null)
  const videoRef = useRef(null)
  const effective = style === 'video' && videoFailed ? (hasLogo ? 'morph' : 'letters') : style
  const seconds = theme.intro_seconds || 2.6

  // Wait for logo + fonts (or enough video to play) so nothing appears half-loaded
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
    if (hasLogo) {
      waits.push(
        new Promise((res) => {
          const img = new Image()
          img.onload = img.onerror = res
          img.src = branding.logo_url
        }),
      )
    }
    if (document.fonts?.ready) waits.push(document.fonts.ready)
    if (effective === 'video') {
      // the <video> is mounted (hidden) during 'wait'; canplaythrough / error resolve this
      waits.push(new Promise((res) => (videoReady.current = res)))
    }
    Promise.all(waits).then(go, go)
    const t = setTimeout(() => {
      if (effective === 'video') setVideoFailed(true) // too slow on this connection → built-in animation
      go()
    }, MAX_WAIT_MS)
    return () => clearTimeout(t)
  }, [phase]) // eslint-disable-line react-hooks/exhaustive-deps
  const videoReady = useRef(() => {})

  // How long each style stays on screen
  useEffect(() => {
    if (phase !== 'in') return
    try {
      sessionStorage.setItem(key, '1')
    } catch {}
    if (effective === 'video') {
      videoRef.current?.play?.().catch(() => setPhase('out'))
      return
    }
    const t = setTimeout(() => setPhase('out'), seconds * 1000)
    return () => clearTimeout(t)
  }, [phase]) // eslint-disable-line react-hooks/exhaustive-deps

  // Beri tahu galeri kapan intro aktif/selesai (panduan menunggu intro selesai)
  useEffect(() => {
    window.__pspIntroActive = phase !== 'gone'
    if (phase === 'gone') window.dispatchEvent(new Event('psp:intro-done'))
  }, [phase])

  // Exit animation
  useEffect(() => {
    if (phase !== 'out') return
    if (effective === 'morph' && logoRef.current) {
      flyToHeader(logoRef.current, rootRef.current).then(() => setPhase('gone'))
      return
    }
    const t = setTimeout(() => setPhase('gone'), 650)
    return () => clearTimeout(t)
  }, [phase]) // eslint-disable-line react-hooks/exhaustive-deps

  if (phase === 'gone') return null
  const skip = () => phase === 'in' && setPhase('out')

  // ------------------------------------------------------------ video
  if (effective === 'video') {
    return (
      <div
        ref={rootRef}
        role="presentation"
        onClick={skip}
        className={`keep-light fixed inset-0 z-[60] flex cursor-pointer items-center justify-center bg-solid transition-opacity duration-500 ${phase === 'out' ? 'opacity-0' : 'opacity-100'}`}
      >
        <video
          ref={videoRef}
          src={videoSrc}
          muted
          playsInline
          preload="auto"
          onCanPlayThrough={() => videoReady.current()}
          onError={() => {
            setVideoFailed(true)
            videoReady.current()
          }}
          onEnded={() => setPhase('out')}
          className={`h-full w-full object-contain transition-opacity duration-300 ${phase === 'wait' ? 'opacity-0' : 'opacity-100'}`}
        />
        <SkipHint show={phase === 'in'} />
      </div>
    )
  }

  if (phase === 'wait') return <div className="keep-light fixed inset-0 z-[60] bg-solid" aria-hidden />

  // ------------------------------------------------------------ morph
  if (effective === 'morph') {
    return (
      <div ref={rootRef} role="presentation" onClick={skip} className="intro-bg keep-light fixed inset-0 z-[60] flex cursor-pointer flex-col items-center justify-center bg-solid px-6 text-onsolid">
        <img ref={logoRef} src={branding.logo_url} alt="" className="intro-morph-logo h-32 w-auto max-w-[70vw] object-contain sm:h-44" />
        <div className="intro-morph-text mt-8 flex flex-col items-center">
          {name && <p className="text-center font-display text-3xl leading-none sm:text-4xl">{name}</p>}
          <p className="mt-4 text-center text-sm text-onsolid/75">
            {theme.intro_text ?? 'Galeri untuk'} <span className="font-display text-lg text-onsolid">{clientName}</span>
          </p>
        </div>
        <SkipHint show={phase === 'in'} />
      </div>
    )
  }

  // ------------------------------------------------------------ fade
  if (effective === 'fade') {
    return (
      <div
        ref={rootRef}
        role="presentation"
        onClick={skip}
        className={`keep-light fixed inset-0 z-[60] flex cursor-pointer flex-col items-center justify-center bg-solid px-6 text-onsolid transition-opacity duration-700 ${phase === 'out' ? 'opacity-0' : 'opacity-100'}`}
      >
        <div className="intro-fade flex flex-col items-center">
          {hasLogo && <img src={branding.logo_url} alt="" className="mb-6 h-24 w-auto max-w-[240px] object-contain sm:h-28" />}
          {name && <p className="text-center font-display text-4xl leading-none sm:text-5xl">{name}</p>}
          <p className="mt-5 text-center text-sm text-onsolid/75">
            {theme.intro_text ?? 'Galeri untuk'} <span className="font-display text-lg text-onsolid">{clientName}</span>
          </p>
        </div>
      </div>
    )
  }

  // ------------------------------------------------------------ letters (original)
  return (
    <div
      ref={rootRef}
      role="presentation"
      onClick={skip}
      className={`intro keep-light fixed inset-0 z-[60] flex cursor-pointer flex-col items-center justify-center bg-solid px-6 text-onsolid ${phase === 'out' ? 'intro-out' : ''}`}
    >
      {hasLogo && <img src={branding.logo_url} alt="" className="intro-logo mb-8 h-28 w-auto max-w-[260px] object-contain sm:h-36 sm:max-w-[320px]" />}
      {name && (
        <h1 className="text-center font-display text-5xl leading-none tracking-tight sm:text-7xl" aria-label={name}>
          {Array.from(name).map((ch, i) => (
            <span key={i} className="intro-letter" style={{ animationDelay: `${250 + i * 45}ms` }} aria-hidden>
              {ch === ' ' ? ' ' : ch}
            </span>
          ))}
        </h1>
      )}
      {branding?.tagline && (
        <p className="intro-sub mt-4 text-center font-mono text-[11px] uppercase tracking-eyebrow text-onsolid/60" style={{ animationDelay: '900ms' }}>
          {branding.tagline}
        </p>
      )}
      <div className="intro-line mt-10 h-[3px] w-24 rounded-full bg-accent" />
      <p className="intro-sub mt-6 text-center text-sm text-onsolid/80" style={{ animationDelay: '1300ms' }}>
        {theme.intro_text ?? 'Galeri untuk'} <span className="font-display text-xl text-onsolid">{clientName}</span>
      </p>
      <SkipHint show />
    </div>
  )
}

function SkipHint({ show }) {
  if (!show) return null
  return (
    <p className="intro-sub absolute bottom-[max(24px,env(safe-area-inset-bottom))] left-0 right-0 text-center font-mono text-[10px] uppercase tracking-eyebrow text-onsolid/40" style={{ animationDelay: '1200ms' }}>
      Ketuk untuk masuk
    </p>
  )
}

/**
 * Morph exit: the big centred logo flies into the small logo in the gallery header
 * ([data-brand-logo]) while the dark backdrop fades away. Falls back to the top-left
 * corner when there is no header logo on the page (e.g. PIN screen).
 */
function flyToHeader(logo, root) {
  const from = logo.getBoundingClientRect()
  const target = document.querySelector('[data-brand-logo]')
  const to = target?.getBoundingClientRect()
  const dest = to && to.width > 0 ? to : { left: 24, top: 24, width: (from.width / from.height) * 28, height: 28 }
  const scale = dest.height / from.height
  const dx = dest.left + dest.width / 2 - (from.left + from.width / 2)
  const dy = dest.top + dest.height / 2 - (from.top + from.height / 2)
  const ease = 'cubic-bezier(.65,0,.25,1)'
  const dur = 900

  if (target) target.style.opacity = '0' // the flying logo "becomes" the header logo
  const anims = [
    logo.animate([{ transform: 'none' }, { transform: `translate(${dx}px, ${dy}px) scale(${scale})` }], { duration: dur, easing: ease, fill: 'forwards' }),
    root.animate([{ backgroundColor: getComputedStyle(root).backgroundColor }, { backgroundColor: 'transparent' }], { duration: dur * 0.8, easing: 'ease-in', fill: 'forwards' }),
  ]
  root.querySelectorAll('.intro-morph-text, p').forEach((el) =>
    anims.push(el.animate([{ opacity: 1 }, { opacity: 0, transform: 'translateY(12px)' }], { duration: 300, fill: 'forwards' })),
  )
  return Promise.all(anims.map((a) => a.finished)).then(
    () => target && (target.style.opacity = ''),
    () => target && (target.style.opacity = ''),
  )
}
