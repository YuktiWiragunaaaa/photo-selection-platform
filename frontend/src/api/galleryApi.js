import axios from 'axios'

const BASE = '/api/gallery'

export const galleryApi = {
  getGallery: async (slug) => {
    const res = await axios.get(`${BASE}/${slug}`)
    return res.data
  },

  submitSelection: async (slug, selectedFiles) => {
    const res = await axios.post(`${BASE}/${slug}/submit`, {
      selected_files: selectedFiles,
    })
    return res.data
  },
}
