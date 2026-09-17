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

export const adminApi = {
  login: (password) => api.post('/admin/login', { password }).then((r) => r.data),
  listSessions: () => api.get('/admin/sessions').then((r) => r.data),
  getSession: (id) => api.get(`/admin/sessions/${id}`).then((r) => r.data),
  createSession: (body) => api.post('/admin/sessions', body).then((r) => r.data),
  deleteSession: (id) => api.delete(`/admin/sessions/${id}`),
  reopenSession: (id) => api.post(`/admin/sessions/${id}/reopen`).then((r) => r.data),
  checkFolder: (drive_folder_id) => api.post('/admin/check-folder', { drive_folder_id }).then((r) => r.data),
  filenames: (id) => api.get(`/admin/sessions/${id}/export/filenames`).then((r) => r.data),
  downloadXmp: (id) => download(`/admin/sessions/${id}/export/xmp`, 'xmp.zip'),
  downloadCsv: (id) => download(`/admin/sessions/${id}/export/csv`, 'selected.csv'),
}
