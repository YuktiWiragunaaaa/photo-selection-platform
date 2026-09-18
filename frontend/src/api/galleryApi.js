import { api } from './client'

const tokenKey = (slug) => `psp_gtoken_${slug}`

export const galleryToken = {
  get: (slug) => {
    try {
      return localStorage.getItem(tokenKey(slug))
    } catch {
      return null
    }
  },
  set: (slug, t) => {
    try {
      localStorage.setItem(tokenKey(slug), t)
    } catch {}
  },
  clear: (slug) => {
    try {
      localStorage.removeItem(tokenKey(slug))
    } catch {}
  },
}

const auth = (slug) => {
  const t = galleryToken.get(slug)
  return t ? { headers: { 'X-Gallery-Token': t } } : {}
}

export const galleryApi = {
  meta: (slug) => api.get(`/gallery/${slug}/meta`).then((r) => r.data),
  unlock: (slug, pin) => api.post(`/gallery/${slug}/unlock`, { pin }).then((r) => r.data),
  get: (slug) => api.get(`/gallery/${slug}`, auth(slug)).then((r) => r.data),
  saveDraft: (slug, file_ids, notes, maybe_ids) => api.put(`/gallery/${slug}/draft`, { file_ids, notes, maybe_ids }, auth(slug)),
  submit: (slug, file_ids, notes, extra_ids) =>
    api.post(`/gallery/${slug}/submit`, { file_ids, notes, extra_ids }, auth(slug)).then((r) => r.data),
}
