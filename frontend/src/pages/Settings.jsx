import { useEffect, useRef, useState } from 'react'
import { ImagePlus, Trash2 } from 'lucide-react'
import AdminShell from '../components/AdminShell'
import Toast from '../components/Toast'
import { BrandFooter, BrandHeader } from '../components/Brand'
import { adminApi } from '../api/adminApi'
import { errorMessage } from '../api/client'

export default function Settings() {
  const [b, setB] = useState(null)
  const [form, setForm] = useState({ studio_name: '', tagline: '', contact: '' })
  const [toast, setToast] = useState('')
  const [busy, setBusy] = useState(false)
  const fileRef = useRef(null)

  useEffect(() => {
    adminApi
      .getBranding()
      .then((x) => {
        setB(x)
        setForm({ studio_name: x.studio_name, tagline: x.tagline, contact: x.contact })
      })
      .catch((e) => setToast(errorMessage(e)))
  }, [])

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }))

  const save = async (e) => {
    e.preventDefault()
    setBusy(true)
    try {
      setB(await adminApi.putBranding(form))
      setToast('Branding disimpan')
    } catch (err) {
      setToast(errorMessage(err))
    } finally {
      setBusy(false)
    }
  }

  const upload = async (file) => {
    if (!file) return
    try {
      setB(await adminApi.uploadLogo(file))
      setToast('Logo diunggah')
    } catch (err) {
      setToast(errorMessage(err))
    }
  }

  const removeLogo = async () => {
    try {
      setB(await adminApi.deleteLogo())
      setToast('Logo dihapus')
    } catch (err) {
      setToast(errorMessage(err))
    }
  }

  const preview = { ...form, logo_url: b?.logo_url }

  return (
    <AdminShell eyebrow="Pengaturan" title="Identitas studio">
      <Toast message={toast} onClose={() => setToast('')} />
      {!b ? (
        <p className="eyebrow animate-pulse">Memuat</p>
      ) : (
        <div className="grid gap-12 md:grid-cols-[minmax(0,28rem)_1fr]">
          <form onSubmit={save} className="space-y-8">
            <div>
              <label className="label" htmlFor="name">
                Nama studio
              </label>
              <input id="name" className="field text-lg" value={form.studio_name} onChange={set('studio_name')} placeholder="Yukti Studio" maxLength={120} />
              <p className="mt-2 text-xs text-mute">Tampil di atas galeri klien, halaman PIN, dan footer.</p>
            </div>
            <div>
              <label className="label" htmlFor="tag">
                Tagline
              </label>
              <input id="tag" className="field" value={form.tagline} onChange={set('tagline')} placeholder="Wedding & portrait photography, Bali" maxLength={200} />
            </div>
            <div>
              <label className="label" htmlFor="contact">
                Kontak
              </label>
              <input id="contact" className="field font-mono text-sm" value={form.contact} onChange={set('contact')} placeholder="@studio · 0812-xxxx-xxxx" maxLength={200} />
              <p className="mt-2 text-xs text-mute">Ditampilkan di footer galeri agar klien tahu ke mana bertanya.</p>
            </div>

            <div>
              <span className="label">Logo (opsional)</span>
              <div className="flex items-center gap-3">
                {b.logo_url ? (
                  <img src={b.logo_url} alt="Logo" className="h-12 w-auto max-w-[160px] rounded border border-line object-contain p-1" />
                ) : (
                  <span className="flex h-12 w-24 items-center justify-center rounded border border-dashed border-line text-[11px] text-faint">tanpa logo</span>
                )}
                <input ref={fileRef} type="file" accept="image/png,image/jpeg,image/svg+xml,image/webp" className="hidden" onChange={(e) => upload(e.target.files?.[0])} />
                <button type="button" className="btn-ghost h-9 px-3 text-xs" onClick={() => fileRef.current?.click()}>
                  <ImagePlus size={13} /> {b.logo_url ? 'Ganti' : 'Unggah'}
                </button>
                {b.logo_url && (
                  <button type="button" className="btn-ghost h-9 w-9 px-0 text-danger" aria-label="Hapus logo" onClick={removeLogo}>
                    <Trash2 size={13} />
                  </button>
                )}
              </div>
              <p className="mt-2 text-xs text-mute">PNG/SVG dengan latar transparan, maks 2 MB. Tinggi tampil ±28 px.</p>
            </div>

            <div className="border-t border-line pt-6">
              <button type="submit" className="btn-ink" disabled={busy}>
                {busy ? 'Menyimpan…' : 'Simpan'}
              </button>
            </div>
          </form>

          <div>
            <p className="eyebrow mb-3">Pratinjau di galeri klien</p>
            <div className="rounded-2xl border border-line p-6">
              <BrandHeader branding={preview} />
              <p className="eyebrow mt-8">Pilih foto favorit Anda</p>
              <p className="mt-2 font-display text-4xl">Nama Klien</p>
              <div className="mt-6 grid grid-cols-3 gap-2">
                {[0, 1, 2].map((i) => (
                  <div key={i} className="aspect-[3/2] rounded-xl bg-wash" />
                ))}
              </div>
              <div className="-mx-6 -mb-6">
                <BrandFooter branding={preview} />
              </div>
            </div>
          </div>
        </div>
      )}
    </AdminShell>
  )
}
