// [ID] Bahasa antarmuka: deteksi bahasa perangkat, simpan pilihan, kamus Indonesia → Inggris.
import { useEffect, useState } from 'react'
import { EN_ADMIN } from './i18n-admin'

/**
 * Deliberately tiny (no i18n library): the Indonesian text IS the key, so the code stays
 * readable and anything without a translation simply falls back to Indonesian instead of
 * showing a broken "gallery.title" placeholder.
 *
 *   t('Sisa {n} foto dalam paket', { n: 3 })
 *
 * Clients get their device language (Indonesian phone → Indonesian, anything else → English);
 * whoever wants a third language can use their browser's own translate on top of English.
 */
const LANG_KEY = 'psp_lang'

export const LANGS = [
  ['id', 'Bahasa Indonesia'],
  ['en', 'English'],
]

const EN = {
  // ---- galeri klien
  'Galeri tidak bisa dimuat.': 'This gallery could not be loaded.',
  'Galeri tidak ditemukan': 'Gallery not found',
  'Link sudah kedaluwarsa': 'This link has expired',
  'Masa berlaku galeri ini sudah habis. Hubungi fotografer Anda untuk membukanya kembali.':
    'This gallery is no longer available. Please contact your photographer to reopen it.',
  'Tidak tersedia': 'Not available',
  'Memuat galeri': 'Loading gallery',
  'Galeri foto': 'Photo gallery',
  'Cara memilih': 'How to choose',
  'Cara memilih foto': 'How to choose photos',
  'Pilihan tersimpan': 'Selection saved',
  'Pilih foto favorit Anda': 'Choose your favourite photos',
  '{n} foto': '{n} photos',
  '{n} foto termasuk paket': '{n} photos included in the package',
  ' · hingga {n} dengan tambahan': ' · up to {n} with extras',
  'Ketuk foto': 'Tap a photo',
  ' untuk memilih · tekan ': ' to select · press ',
  ' untuk melihat besar & menulis catatan.': ' to view it large & write a note.',
  'Pilih sebelum {date}': 'Choose before {date}',
  'hari ini': 'today',
  besok: 'tomorrow',
  '{n} hari lagi': '{n} days left',
  '{n} foto pilihan sudah tersimpan.': '{n} selected photos have been saved.',
  ' {n} di antaranya di luar paket.': ' {n} of them are outside the package.',
  'Galeri ini sekarang hanya bisa dilihat. Foto yang Anda pilih ditandai; hubungi fotografer jika ingin mengubah.':
    'This gallery is now view-only. Your picks are marked; contact the photographer if you want to change them.',
  'Lihat {n} pilihan saja': 'Show only the {n} picks',
  'Lihat semua foto': 'Show all photos',
  'Mode pratinjau fotografer': 'Photographer preview mode',
  ' — yang kamu klik di sini tidak disimpan dan tidak mengubah pilihan klien.':
    ' — nothing you tap here is saved, and the client’s picks stay untouched.',

  // ---- lewat kuota paket
  'Di luar paket': 'Outside the package',
  'Kuota paket sudah penuh': 'The package is full',
  '{n} foto dalam paket sudah terpilih semua. Foto berikutnya dihitung sebagai ':
    'All {n} photos in the package are already chosen. The next one counts as an ',
  'foto tambahan': 'extra photo',
  ' (ada biaya tambahan) dan akan diberi label ': ' (at additional cost) and will be labelled ',
  Tambahan: 'Extra',
  'Anda bisa menambah hingga {n} foto lagi.': 'You can add up to {n} more photos.',
  'Lanjutkan memilih': 'Keep choosing',

  // ---- konfirmasi kirim
  'Periksa sebelum mengirim': 'Check before sending',
  'Kirim {n} foto pilihan?': 'Send your {n} selected photos?',
  '{n} foto termasuk paket, ': '{n} photos are included in the package, ',
  '{n} foto tambahan': '{n} extra photos',
  ' di luar paket — fotografer akan menghubungi Anda soal biayanya.':
    ' beyond it — the photographer will contact you about the cost.',
  'Ketuk foto untuk menentukan mana yang menjadi ': 'Tap a photo to choose which ones are the ',
  tambahan: 'extras',
  ' ({n}/{total} ditandai).': ' ({n}/{total} marked).',
  ', tambahan': ', extra',
  '{n} catatan ikut terkirim': '{n} notes will be sent as well',
  'Setelah dikirim, pilihan tidak bisa diubah lagi dari halaman ini.':
    'Once sent, your picks can no longer be changed from this page.',
  'Periksa lagi': 'Check again',
  'Ya, kirim': 'Yes, send',
  'Mengirim…': 'Sending…',

  // ---- bar bawah
  'Kuota terpenuhi': 'Quota reached',
  'Ketuk foto untuk memilih': 'Tap a photo to select',
  '{n} di luar paket': '{n} beyond the package',
  'Sisa {n} foto dalam paket': '{n} photos left in the package',
  'Paket terpenuhi': 'Package complete',
  Semua: 'All',
  'Pilihan {n}': 'Picks {n}',
  'Ditandai {n}': 'Marked {n}',
  'menyimpan…': 'saving…',
  'tersimpan ✓': 'saved ✓',
  Kirim: 'Send',
  ' pilihan': ' picks',
  Tampilkan: 'Show',

  // ---- panduan
  Panduan: 'Guide',
  Pilih: 'Choose',
  ' (bisa sampai {n} dengan biaya tambahan)': ' (up to {n} at additional cost)',
  ' sebelum ': ' before ',
  'Ketuk lagi untuk membatalkan.': 'Tap again to undo.',
  'Ikon ⤢ untuk melihat besar': 'Tap ⤢ to view it large',
  'Geser kiri/kanan untuk pindah foto.': 'Swipe left/right to move between photos.',
  'Tulis catatan bila perlu': 'Add a note if you need to',
  'Ada di tampilan besar foto yang dipilih.': 'Found in the large view of a selected photo.',
  'Tekan “Kirim” jika selesai': 'Press “Send” when you are done',
  'Pilihan tersimpan otomatis, bisa dilanjut nanti.': 'Your picks save automatically — you can continue later.',
  'Mulai memilih': 'Start choosing',

  // ---- PIN
  'Galeri privat': 'Private gallery',
  'Masukkan 4 angka PIN yang diberikan fotografer untuk membuka galeri.':
    'Enter the 4-digit PIN from your photographer to open the gallery.',
  'PIN 4 angka': '4-digit PIN',
  'PIN salah.': 'Wrong PIN.',
  'Memeriksa…': 'Checking…',
  'Buka galeri': 'Open gallery',

  // ---- foto besar (lightbox) & kartu foto
  Sebelumnya: 'Previous',
  Berikutnya: 'Next',
  'Catatan untuk fotografer': 'Note for the photographer',
  'Contoh: tolong crop lebih ketat, hapus orang di belakang':
    'For example: please crop tighter, remove the person in the back',
  'Simpan catatan': 'Save note',
  'Foto pilihan': 'Chosen photo',
  'Tidak dipilih': 'Not chosen',
  'Dipilih · tambahan': 'Chosen · extra',
  Dipilih: 'Chosen',
  'Kuota penuh': 'Quota full',
  'Pilih foto ini': 'Choose this photo',
  Ditandai: 'Marked',
  'Tandai dulu': 'Mark for later',
  'Tandai dulu (masih ragu)': 'Mark for later (still unsure)',
  'Hapus tanda': 'Remove mark',
  'Ubah catatan': 'Edit note',
  'Tambah catatan': 'Add note',
  Catatan: 'Note',
  Batalkan: 'Undo',
  'Lihat {name} lebih besar': 'View {name} larger',
  '{action} {name}': '{action} {name}',

  // ---- sukses
  'Terkirim!': 'Sent!',
  '{n} foto sudah sampai ke fotografer': '{n} photos have reached your photographer',

  // ---- umum
  Batal: 'Cancel',
  Lanjutkan: 'Continue',
  Tutup: 'Close',
  'Halaman tidak ada': 'Page not found',
  'Ke dashboard': 'Go to dashboard',
  'Ketuk untuk masuk': 'Tap to enter',
  'Maksimal {n} foto. Batalkan salah satu untuk mengganti.': 'Maximum {n} photos. Undo one to swap it for another.',
  'Ganti bahasa': 'Change language',
  'Mode gelap': 'Dark mode',
  'Mode terang': 'Light mode',

  // ---- pesan dari server yang dilihat klien
  'Terjadi kesalahan. Coba lagi.': 'Something went wrong. Please try again.',
  'Server tidak bisa dihubungi.': 'Could not reach the server.',
  'Galeri tidak ditemukan atau link tidak valid.': 'Gallery not found, or the link is invalid.',
  'Link galeri ini sudah kedaluwarsa. Hubungi fotografer Anda.':
    'This gallery link has expired. Please contact your photographer.',
  'Link galeri ini sudah kedaluwarsa.': 'This gallery link has expired.',
  'Galeri ini dilindungi PIN. Masukkan PIN lagi.': 'This gallery is PIN-protected. Please enter the PIN again.',
  'PIN salah. Sisa {n} kali percobaan.': 'Wrong PIN. {n} attempts left.',
  'PIN salah. Coba lagi dalam 15 menit.': 'Wrong PIN. Try again in 15 minutes.',
  'Terlalu banyak percobaan PIN. Tunggu 15 menit, atau tanyakan PIN yang benar ke fotografer Anda.':
    'Too many PIN attempts. Wait 15 minutes, or ask your photographer for the right PIN.',
  'Pilihan sudah dikirim.': 'Your picks have already been sent.',
  'Pilihan sudah dikirim sebelumnya. Galeri ini sekarang hanya bisa dilihat.':
    'Your picks were already sent. This gallery is now view-only.',
  'Maksimal {n} foto, Anda memilih {m}.': 'Maximum {n} photos — you chose {m}.',
  'Beberapa foto tidak dikenali. Muat ulang halaman dan coba lagi.':
    'Some photos were not recognised. Reload the page and try again.',
  'Terima kasih! {n} foto pilihan Anda sudah tersimpan.': 'Thank you! Your {n} selected photos have been saved.',
  ' {n} di antaranya di luar paket': ' {n} of them are outside the package',
}

const DICT = { en: { ...EN_ADMIN, ...EN } }

/** Server replies are Indonesian; these turn the ones carrying a number back into keys. */
const SERVER_RULES = [
  [/^PIN salah\. Sisa (\d+) kali percobaan\.$/, 'PIN salah. Sisa {n} kali percobaan.', ['n']],
  [/^Maksimal (\d+) foto, Anda memilih (\d+)\.$/, 'Maksimal {n} foto, Anda memilih {m}.', ['n', 'm']],
  [/^Terima kasih! (\d+) foto pilihan Anda sudah tersimpan\.$/, 'Terima kasih! {n} foto pilihan Anda sudah tersimpan.', ['n']],
]

const detect = () => {
  const nav = typeof navigator !== 'undefined' ? navigator.language || '' : ''
  return nav.toLowerCase().startsWith('id') ? 'id' : 'en'
}

const stored = () => {
  try {
    const v = localStorage.getItem(LANG_KEY)
    return LANGS.some(([id]) => id === v) ? v : ''
  } catch {
    return ''
  }
}

let lang = stored() || detect()
const listeners = new Set()

if (typeof document !== 'undefined') document.documentElement.lang = lang

export const getLang = () => lang

export function setLang(next) {
  if (!LANGS.some(([id]) => id === next) || next === lang) return
  lang = next
  try {
    localStorage.setItem(LANG_KEY, next)
  } catch {}
  if (typeof document !== 'undefined') document.documentElement.lang = next
  listeners.forEach((fn) => fn(next))
}

/** The other language (with only two, this is simply "the next one"). */
export function nextLang() {
  const i = LANGS.findIndex(([id]) => id === lang)
  return LANGS[(i + 1) % LANGS.length][0]
}

const fill = (s, vars) => (vars ? Object.entries(vars).reduce((out, [k, v]) => out.split(`{${k}}`).join(String(v)), s) : s)

/** Translate. Unknown text stays Indonesian rather than breaking the page. */
export function t(key, vars) {
  const table = DICT[lang]
  return fill((table && table[key]) || key, vars)
}

/** Translate an Indonesian message that came from the backend. */
export function tServer(msg) {
  if (!msg || lang === 'id') return msg
  const table = DICT[lang]
  if (table?.[msg]) return table[msg]
  for (const [re, key, names] of SERVER_RULES) {
    const m = msg.match(re)
    if (m) return t(key, Object.fromEntries(names.map((n, i) => [n, m[i + 1]])))
  }
  // Kalimat gabungan (mis. pesan submit + keterangan foto tambahan)
  const parts = msg.match(/^(Terima kasih! \d+ foto pilihan Anda sudah tersimpan\.)( \d+ di antaranya di luar paket\.)$/)
  if (parts) return tServer(parts[1]) + fill(t(' {n} di antaranya di luar paket'), { n: parts[2].match(/\d+/)[0] }) + '.'
  return msg
}

/** Locale for dates, so deadlines read naturally in either language. */
export const dateLocale = () => (lang === 'id' ? 'id-ID' : 'en-GB')

/** Subscribe a component to language changes; returns `t` so the component re-renders on switch. */
export function useT() {
  const [, setTick] = useState(lang)
  useEffect(() => {
    listeners.add(setTick)
    return () => listeners.delete(setTick)
  }, [])
  return t
}
