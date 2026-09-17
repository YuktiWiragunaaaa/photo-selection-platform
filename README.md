# Pilih Foto — Platform Seleksi Foto Interaktif

Portal *client-proofing* untuk fotografer. Klien memilih foto lewat galeri bergaya clean-editorial di HP/desktop; fotografer mendapatkan file **XMP sidecar** (★5 + label hijau) siap disinkronkan ke Capture One / Lightroom — tanpa mencatat nama file manual.

Semua komponen gratis: FastAPI + SQLite, React + Vite + Tailwind, Google Drive API (service account), Google Fonts.

## Tech stack

| Layer | Teknologi |
|---|---|
| Backend | Python 3.12 · FastAPI · SQLAlchemy 2 · Pillow · SQLite (Postgres opsional) |
| Foto | Google Drive API v3 (API key atau service account) + thumbnail Pillow + cache lokal |
| Frontend | React 18 · Vite · Tailwind CSS · lucide-react |
| Auth admin | Password tunggal → JWT |

## Menjalankan lokal

Prasyarat: Python 3.11+, Node 18+.

```bash
# Backend
cd backend
cp .env.example .env            # ubah ADMIN_PASSWORD & SECRET_KEY
python -m venv venv
venv\Scripts\activate           # Windows   |   source venv/bin/activate (Mac/Linux)
pip install -r requirements.txt
python dev.py                   # http://localhost:8000  (docs: /docs)
```

```bash
# Frontend (terminal kedua)
cd frontend
npm install
npm run dev                     # http://localhost:5173
```

Login admin: `http://localhost:5173/admin/login` dengan `ADMIN_PASSWORD` dari `.env`.

> **Tanpa Google Drive (mode mock):** jika `GOOGLE_API_KEY` kosong dan `service_account.json` tidak ada, backend otomatis memakai 24 foto placeholder (picsum.photos). Seluruh alur — buat sesi, galeri, submit, export XMP — bisa dicoba tanpa kredensial apa pun.

### Docker

```bash
docker compose up
```

## Menghubungkan Google Drive

Pilih salah satu. Keduanya gratis.

### Cara 1 — API key + folder publik (paling mudah)

Tidak butuh OAuth atau kunci JSON, dan tidak terpengaruh kebijakan organisasi yang memblokir *service account key*.

1. [Google Cloud Console](https://console.cloud.google.com) → pilih/buat project → **APIs & Services → Enable APIs and Services → Google Drive API → Enable**.
2. **APIs & Services → Credentials → + Create credentials → API key**. Salin key-nya.
   *(Opsional tapi disarankan: Edit key → API restrictions → Restrict key → centang hanya Google Drive API.)*
3. Di `backend/.env` isi: `GOOGLE_API_KEY=AIza...`
4. Di Google Drive, klik kanan folder foto → **Share → General access: Anyone with the link → Viewer**.
5. Restart backend. `GET /api/health` harus menjawab `"drive_mode": "api_key"`.

Folder harus publik-dengan-link (siapa pun yang punya link bisa melihat). Link galeri klien sendiri hanya berisi foto dari backend, bukan link Drive.

### Cara 2 — Service account (folder privat)

1. Enable **Google Drive API** seperti di atas.
2. **IAM & Admin → Service Accounts → Create service account** → tab **Keys → Add key → JSON**.
3. Simpan sebagai `backend/service_account.json` (sudah di-`.gitignore`).
4. **Share** folder foto ke `client_email` dari file JSON, akses **Viewer**.
5. Restart backend → `"drive_mode": "service_account"`.

> Jika muncul *"Service account key creation is disabled"*, project Anda berada di bawah organisasi yang memblokirnya — pakai Cara 1.

Saat membuat sesi, tempel **link folder** atau ID-nya (bagian setelah `/folders/`) — keduanya diterima. Gambar diambil dalam ukuran 640 px (grid) dan 2048 px (lightbox) langsung dari Drive, lalu di-cache di `backend/cache/` — file asli 15 MB tidak pernah diunduh. Saat sesi dibuat, cache dipanaskan di latar belakang.

## Alur kerja

1. **Persiapan** — ekspor JPEG kecil ke satu folder Drive.
2. **Buat sesi** — Admin → *Sesi baru*: nama klien, folder Drive, batas foto. Sistem memvalidasi folder dan membuat link unik `/g/<slug>`.
3. **Bagikan** — salin link, kirim ke klien.
4. **Klien memilih** — galeri masonry, ketuk untuk memilih, ikon sudut untuk memperbesar (lightbox, geser di HP). Pilihan tersimpan di browser klien jika halaman ditutup. Kuota dijaga; tombol *Kirim* aktif setelah ≥1 foto.
5. **Submit** — konfirmasi → status sesi jadi *Selesai*; galeri berubah read-only dengan foto pilihan ditandai.
6. **Export** — Admin → sesi → **XMP .zip** / **Salin nama file** / **CSV**.
7. **Editing** — ekstrak ZIP ke folder RAW. Capture One: *Image → Synchronize Metadata*. Lightroom: *Metadata → Read Metadata from File*. Foto pilihan mendapat **Rating 5** dan **Label Green**.

Admin juga bisa **Buka lagi** sesi (hapus pilihan, klien memilih ulang) atau **Hapus sesi**.

## API ringkas

| Method | Path | Keterangan |
|---|---|---|
| POST | `/api/admin/login` | `{password}` → JWT |
| GET/POST | `/api/admin/sessions` | daftar / buat sesi |
| POST | `/api/admin/check-folder` | validasi folder Drive |
| GET/DELETE | `/api/admin/sessions/{id}` | detail / hapus |
| POST | `/api/admin/sessions/{id}/reopen` | buka kembali |
| GET | `/api/admin/sessions/{id}/export/{xmp,filenames,csv}` | export |
| GET | `/api/gallery/{slug}` | data galeri publik |
| GET | `/api/gallery/{slug}/img/{file_id}?size=thumb\|full` | proxy gambar (cache 7 hari) |
| POST | `/api/gallery/{slug}/submit` | `{file_ids: []}` |

Gambar tidak pernah di-link langsung ke Drive: backend mengunduhnya sekali, membuat thumbnail, dan menyimpannya di `backend/cache/`, sehingga link galeri tetap hidup berminggu-minggu (thumbnail Drive asli kedaluwarsa dalam hitungan jam).

## Deployment

- **Backend** (Railway/Render/Fly): set env dari `.env.example`, `DATABASE_URL` Postgres bila perlu, set `GOOGLE_API_KEY` (atau upload `service_account.json` sebagai secret file), `FRONTEND_URL` = domain frontend.
- **Frontend** (Vercel/Netlify): build `npm run build`, output `dist`. Tambahkan rewrite `/api/*` → URL backend (atau jalankan keduanya di satu domain lewat reverse proxy).

## Struktur

```
backend/
  dev.py                  # launcher dev (reload)
  app/
    main.py  config.py  database.py  models.py  schemas.py  auth.py
    routers/admin.py      # login, sesi, export
    routers/gallery.py    # galeri publik, proxy gambar, submit
    services/drive_service.py   # Drive API + mock + cache
    services/xmp_service.py     # XMP / ZIP / CSV
frontend/src/
  pages/      Gallery · Login · Dashboard · NewSession · SessionDetail
  components/ PhotoTile · Lightbox · SelectionBar · AdminShell · …
  hooks/      useSelection (persist per galeri) · useClipboard
```
