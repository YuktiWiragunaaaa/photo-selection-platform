// [ID] Sistem tema: warna (terang & gelap), font, preset, template pesan WhatsApp.
import { useEffect, useState } from 'react'
import { api } from '../api/client'

/**
 * Runtime theming. The admin picks 3 colours (background, text, accent) + fonts in
 * "Pengaturan → Tampilan"; every other shade is derived here so contrast stays readable.
 */

export const PRESETS = [
  { id: 'neon', name: 'Neon', paper: '#F4F1EA', ink: '#141413', accent: '#D4FF3A' },
  { id: 'earth', name: 'Earth', paper: '#F3ECE1', ink: '#2B211A', accent: '#D9773F' },
  { id: 'klasik', name: 'Klasik', paper: '#FAF8F4', ink: '#1C1B19', accent: '#C9A96E' },
  { id: 'laut', name: 'Laut', paper: '#EEF3F3', ink: '#0F2A33', accent: '#7FD1C7' },
  { id: 'blush', name: 'Blush', paper: '#FBF1EE', ink: '#2D1E22', accent: '#F2A7B5' },
  { id: 'hutan', name: 'Hutan', paper: '#F1F2EA', ink: '#1E2A1F', accent: '#B8D86B' },
]

export const TEXT_SCALES = [
  { value: 1, label: 'Normal' },
  { value: 1.12, label: 'Besar' },
  { value: 1.25, label: 'Sangat besar' },
]

const hexToRgb = (hex) => {
  const n = parseInt(hex.replace('#', ''), 16)
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255]
}
const mix = (a, b, t) => a.map((v, i) => Math.round(v + (b[i] - v) * t)) // t=0 → a, t=1 → b
const triple = (rgb) => rgb.join(' ')
const luminance = ([r, g, b]) => {
  const f = (c) => {
    c /= 255
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4
  }
  return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b)
}

const contrast = (a, b) => {
  const [x, y] = [luminance(a), luminance(b)].sort((m, n) => n - m)
  return (x + 0.05) / (y + 0.05)
}

/** CSS variables for a theme (only the three chosen colours are needed). */
/**
 * Colour roles from the studio's 3 colours. Dark mode swaps the roles: the text colour, deepened,
 * becomes the background and the background colour becomes the text — so the palette still feels
 * like the studio's own. The accent stays the same in both modes.
 */
function palette(t, dark) {
  const paperL = hexToRgb(t.paper)
  const inkL = hexToRgb(t.ink)
  const accentL = hexToRgb(t.accent)
  const black = [0, 0, 0]
  const white = [255, 255, 255]

  if (!dark) {
    // ---- MODE TERANG: seperti sebelumnya
    return {
      paper: triple(paperL),
      card: triple(mix(paperL, white, 0.65)),
      ink: triple(inkL),
      ink2: triple(mix(inkL, paperL, 0.1)),
      mute: triple(mix(inkL, paperL, 0.38)),
      faint: triple(mix(inkL, paperL, 0.55)),
      sand: triple(mix(inkL, paperL, 0.78)),
      line: triple(mix(paperL, inkL, 0.1)),
      wash: triple(mix(paperL, inkL, 0.06)),
      accent: triple(accentL),
      onaccent: triple(contrast(accentL, inkL) >= contrast(accentL, paperL) ? inkL : paperL),
      solid: triple(inkL), // permukaan kuat (bar bawah, tombol utama): gelap di mode terang
      onsolid: triple(paperL),
      danger: '179 38 30',
    }
  }

  // ---- MODE GELAP: dirancang untuk ruangan minim cahaya, bukan sekadar dibalik
  // latar: warna teks studio yang digelapkan (tetap membawa nuansa warnanya), tidak hitam pekat
  let bg = mix(inkL, black, 0.55)
  if (luminance(bg) > 0.025) bg = mix(bg, black, 0.5) // jaga tetap gelap
  // teks: off-white lembut (bukan putih penuh) supaya tidak menyilaukan di tempat gelap
  const text = mix(paperL, bg, 0.12)
  // aksen yang sangat terang (mis. neon) sedikit diredam
  const accent = luminance(accentL) > 0.55 ? mix(accentL, bg, 0.14) : accentL
  // permukaan kuat di mode gelap = abu gelap yang sedikit terangkat, BUKAN putih
  const solid = mix(bg, text, 0.12)
  return {
    paper: triple(bg),
    card: triple(mix(bg, text, 0.06)),
    ink: triple(text),
    ink2: triple(mix(solid, text, 0.1)),
    mute: triple(mix(text, bg, 0.3)),
    faint: triple(mix(text, bg, 0.48)),
    sand: triple(mix(text, solid, 0.25)),
    line: triple(mix(bg, text, 0.13)),
    wash: triple(mix(bg, text, 0.08)),
    accent: triple(accent),
    onaccent: triple(contrast(accent, bg) >= contrast(accent, text) ? bg : text),
    solid: triple(solid),
    onsolid: triple(text),
    danger: '242 139 130', // merah lebih lembut agar terbaca di latar gelap
  }
}

/** CSS variables for a theme. `--l-*` always hold the light palette (used by `.keep-light` areas). */
export function themeVars(t, dark = false) {
  const vars = {
    '--f-display': `'${t.font_display}'`,
    '--f-body': `'${t.font_body}'`,
    '--display-style': t.display_italic ? 'italic' : 'normal',
  }
  Object.entries(palette(t, dark)).forEach(([k, v]) => (vars[`--c-${k}`] = v))
  Object.entries(palette(t, false)).forEach(([k, v]) => (vars[`--l-${k}`] = v))
  return vars
}

const loadedFonts = new Set(['Instrument Serif', 'Bricolage Grotesque'])
export function loadFonts(names) {
  names.filter((n) => n && !loadedFonts.has(n)).forEach((n) => {
    loadedFonts.add(n)
    const fam = n.replace(/ /g, '+')
    const spec = ['Instrument Serif', 'DM Serif Display'].includes(n) ? `${fam}:ital@0;1` : `${fam}:ital,wght@0,400;0,500;0,700;0,800;1,400`
    const link = Object.assign(document.createElement('link'), {
      rel: 'stylesheet',
      href: `https://fonts.googleapis.com/css2?family=${spec}&display=swap`,
    })
    document.head.appendChild(link)
  })
}

// ---- light / dark mode
// Starting point is the studio's "Mode warna" setting (Terang / Gelap / Ikuti perangkat).
// On top of that everyone may flip the switch for themselves: the photographer for the admin
// pages, the client for the gallery. The two choices are stored apart so they never collide.
const ADMIN_MODE_KEY = 'psp_admin_mode'
const CLIENT_MODE_KEY = 'psp_client_mode'
const prefersDark = () => typeof window !== 'undefined' && window.matchMedia?.('(prefers-color-scheme: dark)').matches
const onAdmin = () => typeof window !== 'undefined' && window.location.pathname.startsWith('/admin')
const modeKey = () => (onAdmin() ? ADMIN_MODE_KEY : CLIENT_MODE_KEY)

/** The visitor's own light/dark choice for the page they are on ('' = follow the studio setting). */
export function getMode() {
  try {
    return localStorage.getItem(modeKey()) || ''
  } catch {
    return ''
  }
}
export function setMode(mode) {
  try {
    mode ? localStorage.setItem(modeKey(), mode) : localStorage.removeItem(modeKey())
  } catch {}
  if (lastTheme) applyTheme(lastTheme)
}

let lastTheme = null
export function isDarkFor(t) {
  const mode = getMode() || t?.color_mode || 'light'
  return mode === 'dark' || (mode === 'auto' && prefersDark())
}

export function applyTheme(t, el = document.documentElement) {
  if (!t?.paper) return
  lastTheme = t
  loadFonts([t.font_display, t.font_body])
  const dark = isDarkFor(t)
  const vars = themeVars(t, dark)
  Object.entries(vars).forEach(([k, v]) => el.style.setProperty(k, v))
  el.style.colorScheme = dark ? 'dark' : 'light' // native inputs, scrollbars, date pickers
  el.dataset.mode = dark ? 'dark' : 'light'
  document.querySelector('meta[name="theme-color"]')?.setAttribute('content', `rgb(${vars['--c-paper']})`)
}

// re-apply when the phone switches between light and dark (for "Ikuti perangkat")
if (typeof window !== 'undefined' && window.matchMedia) {
  window.matchMedia('(prefers-color-scheme: dark)').addEventListener?.('change', () => lastTheme && applyTheme(lastTheme))
}

// ---- shared branding store (fetched once, updated live when the admin saves)
let current = null
const listeners = new Set()
let inflight = null

export function setBranding(b) {
  current = b
  applyTheme(b?.theme)
  listeners.forEach((fn) => fn(b))
}

export function loadBranding() {
  if (!inflight) {
    inflight = api
      .get('/branding')
      .then((r) => setBranding(r.data))
      .catch(() => {})
  }
  return inflight
}

/** Studio identity + theme from anywhere in the app. */
export function useStudio() {
  const [b, setB] = useState(current)
  useEffect(() => {
    listeners.add(setB)
    if (!current) loadBranding()
    return () => listeners.delete(setB)
  }, [])
  return b
}

// ---- WhatsApp message template
// Same text as DEFAULT_WA_TEMPLATE in backend/app/services/branding.py; its English version lives in utils/i18n.js
export { DEFAULT_WA_TEMPLATE } from './waTemplate'

export const WA_PLACEHOLDERS = [
  ['{nama}', 'nama klien'],
  ['{link}', 'link galeri'],
  ['{pin}', 'PIN (baris dihapus jika tanpa PIN)'],
  ['{paket}', 'jumlah foto dalam paket'],
  ['{tambahan}', 'keterangan foto tambahan, jika ada'],
  ['{deadline}', 'tanggal batas (baris dihapus jika tanpa batas)'],
  ['{studio}', 'nama studio'],
]

export function fillWaTemplate(template, v) {
  const values = {
    '{nama}': v.nama || '',
    '{link}': v.link || '',
    '{pin}': v.pin || '',
    '{paket}': String(v.paket ?? ''),
    '{tambahan}': v.tambahan || '',
    '{deadline}': v.deadline || '',
    '{studio}': v.studio || '',
  }
  const lines = template.split('\n').filter((line) => {
    // drop a line whose PIN / deadline is empty (e.g. "PIN: {pin}" for a gallery without PIN)
    if (line.includes('{pin}') && !values['{pin}']) return false
    if (line.includes('{deadline}') && !values['{deadline}']) return false
    return true
  })
  return lines
    .map((line) => Object.entries(values).reduce((s, [k, val]) => s.split(k).join(val), line))
    .join('\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim()
}
