import { api } from './client'

export const galleryApi = {
  get: (slug) => api.get(`/gallery/${slug}`).then((r) => r.data),
  submit: (slug, file_ids) => api.post(`/gallery/${slug}/submit`, { file_ids }).then((r) => r.data),
}
