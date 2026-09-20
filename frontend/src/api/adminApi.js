import { api } from './client'

const download = async (url, fallbackName) => {
  const res = await api.get(url, { responseType: 'blob' })
  const cd = res.headers['content-disposition'] || ''
  const name = /filename="?([^"]+)"?/.exec(cd)?.[1] || fallbackName
  const href = URL.createObjectURL(res.data)
  const a = Object.assign(document.createElement('a'), { href, download: name })
  a.click()
  URL.revokeObjectURL(href)
}

// If the backend still thinks it lives on localhost (FRONTEND_URL not set, or not restarted)
// but the admin is being used through a public address (ngrok, a domain), build the client
// link from the address in the browser instead, so links sent to clients always work.
const isLocal = (host) => /^(localhost|127\.0\.0\.1|\[::1\])$/.test(host)
const fixLink = (s) => {
  if (!s || !s.slug || !s.gallery_url) return s
  try {
    const linkHost = new URL(s.gallery_url).hostname
    if (isLocal(linkHost) && !isLocal(window.location.hostname)) {
      return { ...s, gallery_url: `${window.location.origin}/g/${s.slug}` }
    }
  } catch {}
  return s
}
const fixAll = (list) => list.map(fixLink)

export const adminApi = {
  login: (password) => api.post('/admin/login', { password }).then((r) => r.data),
  listSessions: () => api.get('/admin/sessions').then((r) => fixAll(r.data)),
  getSession: (id) => api.get(`/admin/sessions/${id}`).then((r) => fixLink(r.data)),
  createSession: (body) => api.post('/admin/sessions', body).then((r) => fixLink(r.data)),
  deleteSession: (id) => api.delete(`/admin/sessions/${id}`),
  relockSession: (id) => api.post(`/admin/sessions/${id}/relock`).then((r) => fixLink(r.data)),
  resetSession: (id) => api.post(`/admin/sessions/${id}/reset`).then((r) => fixLink(r.data)),
  reopenSession: (id) => api.post(`/admin/sessions/${id}/reopen`).then((r) => fixLink(r.data)),
  updateSession: (id, body) => api.patch(`/admin/sessions/${id}`, body).then((r) => fixLink(r.data)),
  getSettings: () => api.get('/admin/settings').then((r) => r.data),
  putTheme: (theme) => api.put('/admin/settings/theme', { theme }).then((r) => r.data),
  putSettings: (body) => api.put('/admin/settings', body).then((r) => r.data),
  changePassword: (current, next) => api.post('/admin/settings/password', { current, new: next }),
  getBranding: () => api.get('/admin/branding').then((r) => r.data),
  putBranding: (body) => api.put('/admin/branding', body).then((r) => r.data),
  uploadLogo: (file) => {
    const fd = new FormData()
    fd.append('file', file)
    return api.post('/admin/branding/logo', fd).then((r) => r.data)
  },
  uploadIntroVideo: (variant, file, onProgress) => {
    const fd = new FormData()
    fd.append('file', file)
    return api
      .post(`/admin/branding/intro-video/${variant}`, fd, { onUploadProgress: (e) => onProgress?.(e.total ? e.loaded / e.total : 0) })
      .then((r) => r.data)
  },
  deleteIntroVideo: (variant) => api.delete(`/admin/branding/intro-video/${variant}`).then((r) => r.data),
  deleteLogo: () => api.delete('/admin/branding/logo').then((r) => r.data),
  syncSession: (id) => api.post(`/admin/sessions/${id}/sync`).then((r) => fixLink(r.data)),
  cacheStatus: (id) => api.get(`/admin/sessions/${id}/cache`).then((r) => r.data),
  checkFolder: (drive_folder_id) => api.post('/admin/check-folder', { drive_folder_id }).then((r) => r.data),
  filenames: (id) => api.get(`/admin/sessions/${id}/export/filenames`).then((r) => r.data),
  xmpFiles: (id) => api.get(`/admin/sessions/${id}/export/xmp-files`).then((r) => r.data.files),
  downloadXmp: (id) => download(`/admin/sessions/${id}/export/xmp`, 'xmp.zip'),
  downloadCsv: (id) => download(`/admin/sessions/${id}/export/csv`, 'selected.csv'),
}
