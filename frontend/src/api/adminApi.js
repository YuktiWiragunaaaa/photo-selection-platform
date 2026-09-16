import axios from 'axios'

const BASE = '/api/admin'

const getHeaders = () => ({
  Authorization: `Bearer ${localStorage.getItem('admin_token')}`,
})

export const adminApi = {
  login: async (password) => {
    const res = await axios.post(`${BASE}/login`, { password })
    return res.data
  },

  getSessions: async () => {
    const res = await axios.get(`${BASE}/sessions`, { headers: getHeaders() })
    return res.data
  },

  createSession: async (payload) => {
    const res = await axios.post(`${BASE}/sessions`, payload, { headers: getHeaders() })
    return res.data
  },

  deleteSession: async (id) => {
    await axios.delete(`${BASE}/sessions/${id}`, { headers: getHeaders() })
  },

  getFilenames: async (id) => {
    const res = await axios.get(`${BASE}/sessions/${id}/export/filenames`, { headers: getHeaders() })
    return res.data
  },

  downloadZip: (id) => {
    const token = localStorage.getItem('admin_token')
    const url = `${BASE}/sessions/${id}/export/zip`
    const a = document.createElement('a')
    a.href = url
    a.setAttribute('download', '')
    fetch(url, { headers: { Authorization: `Bearer ${token}` } })
      .then(res => res.blob())
      .then(blob => {
        const objectUrl = URL.createObjectURL(blob)
        a.href = objectUrl
        document.body.appendChild(a)
        a.click()
        document.body.removeChild(a)
        URL.revokeObjectURL(objectUrl)
      })
  },

  downloadCsv: (id) => {
    const token = localStorage.getItem('admin_token')
    const url = `${BASE}/sessions/${id}/export/csv`
    fetch(url, { headers: { Authorization: `Bearer ${token}` } })
      .then(res => res.blob())
      .then(blob => {
        const objectUrl = URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = objectUrl
        a.setAttribute('download', 'selections.csv')
        document.body.appendChild(a)
        a.click()
        document.body.removeChild(a)
        URL.revokeObjectURL(objectUrl)
      })
  },
}
