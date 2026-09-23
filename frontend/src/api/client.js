import axios from 'axios'
import { t, tServer } from '../utils/i18n'

export const TOKEN_KEY = 'psp_admin_token'

export const api = axios.create({ baseURL: '/api' })

// Token admin hanya dikirim di halaman admin, atau di galeri yang dibuka lewat tombol
// "Buka galeri" (?preview=1). Membuka link galeri biasa — walau di HP yang login admin —
// selalu diperlakukan sebagai KLIEN: PIN tetap diminta dan tidak ada mode pratinjau.
const adminContext = () =>
  window.location.pathname.startsWith('/admin') || new URLSearchParams(window.location.search).get('preview') === '1'

api.interceptors.request.use((config) => {
  const token = localStorage.getItem(TOKEN_KEY)
  if (token && adminContext()) config.headers.Authorization = `Bearer ${token}`
  return config
})

api.interceptors.response.use(
  (r) => r,
  (err) => {
    if (err.response?.status === 401 && !err.config?.url?.endsWith('/admin/login')) {
      localStorage.removeItem(TOKEN_KEY)
      if (location.pathname.startsWith('/admin')) location.assign('/admin/login')
    }
    return Promise.reject(err)
  },
)

// Pesan dari server selalu bahasa Indonesia; diterjemahkan di sini — satu pintu untuk semua halaman.
export const errorMessage = (err, fallback) => {
  const d = err?.response?.data?.detail
  if (typeof d === 'string') return tServer(d)
  if (Array.isArray(d)) return d.map((x) => x.msg).join(', ')
  if (!err?.response) return t('Server tidak bisa dihubungi.')
  return fallback || t('Terjadi kesalahan. Coba lagi.')
}
