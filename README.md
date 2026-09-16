# Platform Seleksi Foto Interaktif

Aplikasi web client-proofing untuk fotografer. Klien memilih foto secara visual melalui galeri interaktif, dan fotografer mendapatkan file XMP Sidecar siap pakai untuk Capture One / Lightroom — tanpa pencatatan manual.

---

## Tech Stack

| Layer | Teknologi |
|---|---|
| Backend | Python 3.12 + FastAPI + SQLAlchemy |
| Database | SQLite (dev) / PostgreSQL (prod) |
| Drive Integration | Google Drive API v3 (Service Account) |
| Frontend | React 18 + Vite + Tailwind CSS |
| Auth | JWT (simple password) |

---

## Prerequisites

- Python 3.11+
- Node.js 18+
- Google Cloud Project dengan Drive API aktif

---

## Setup Google Drive Service Account

1. Buka [Google Cloud Console](https://console.cloud.google.com)
2. Buat project baru atau pilih yang sudah ada
3. Aktifkan **Google Drive API**: APIs & Services → Enable APIs → cari "Google Drive API" → Enable
4. Buat Service Account: APIs & Services → Credentials → Create Credentials → Service Account
   - Isi nama, klik Create
   - Lewati role assignment (klik Continue)
   - Klik Done
5. Klik pada Service Account yang baru dibuat → tab **Keys** → Add Key → Create new key → **JSON**
6. Simpan file JSON yang terunduh sebagai `backend/service_account.json`
7. **Share folder Google Drive ke Service Account:**
   - Buka folder Drive yang berisi foto JPEG
   - Klik Share
   - Paste email Service Account (ada di file JSON, field `client_email`)
   - Berikan akses **Viewer**
   - Klik Send

---

## Quick Start (Local Development)

### Backend

```bash
cd backend

# Copy environment variables
cp .env.example .env
# Edit .env: set ADMIN_PASSWORD dan SECRET_KEY

# Create virtual environment
python -m venv venv

# Activate (Windows)
venv\Scripts\activate
# Activate (Mac/Linux)
source venv/bin/activate

# Install dependencies
pip install -r requirements.txt

# Run server
uvicorn app.main:app --reload --port 8000
```

Backend berjalan di: http://localhost:8000  
Swagger UI (API docs): http://localhost:8000/docs

### Frontend

```bash
cd frontend

# Install dependencies
npm install

# Run dev server
npm run dev
```

Frontend berjalan di: http://localhost:5173

---

## Cara Penggunaan

### 1. Login Admin
- Buka http://localhost:5173/admin/login
- Masukkan password yang telah di-set di `.env`

### 2. Buat Sesi Baru
- Klik **"Sesi Baru"** di dashboard
- Isi:
  - **Nama Klien**: Nama yang akan tampil di galeri
  - **Google Drive Folder ID**: ID folder yang berisi foto JPEG (dari URL Drive)
  - **Batas Maksimal Foto**: Jumlah foto maksimal yang bisa dipilih klien
- Klik **"Buat Sesi"**

### 3. Bagikan Link ke Klien
- Di dashboard, klik tombol **"Link"** untuk menyalin URL galeri
- Kirim URL tersebut ke klien

### 4. Klien Memilih Foto
- Klien membuka link → foto dari Drive tampil dalam grid
- Tap/klik foto untuk memilih (ada centang dan highlight)
- Progress bar di bawah menampilkan jumlah pilihan real-time
- Klik **"Kirim Pilihan"** setelah selesai

### 5. Export XMP / Filenames
- Status sesi berubah menjadi **Completed** di dashboard
- Klik **"XMP ZIP"** → download ZIP berisi file `.xmp` per foto
- Klik **"Filenames"** → salin nama file ke clipboard
- Klik **"CSV"** → download CSV daftar file terpilih

### 6. Proses di Capture One / Lightroom
- Ekstrak ZIP ke folder yang sama dengan file RAW
- **Capture One**: Image → Synchronize Metadata
- **Lightroom**: Library → Synchronize Folder
- Foto yang dipilih klien akan memiliki **Rating: 5 bintang** dan **Label: Green**

---

## Mendapatkan Google Drive Folder ID

URL folder Drive:
```
https://drive.google.com/drive/folders/1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgVE2upms
```
Folder ID = bagian setelah `/folders/` → `1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgVE2upms`

---

## Development tanpa Service Account (Mock Mode)

Jika file `service_account.json` tidak ada, backend otomatis menggunakan **mock data** berisi 20 foto placeholder dari [picsum.photos](https://picsum.photos). Cocok untuk development UI tanpa perlu akses Drive.

---

## Deployment (Railway / Render)

### Backend
1. Push repository ke GitHub
2. Di Railway/Render: New Project → Deploy from GitHub
3. Set environment variables dari `.env.example`
4. Ganti `DATABASE_URL` ke PostgreSQL URL yang disediakan
5. Upload `service_account.json` sebagai Secret File

### Frontend
1. Di Vercel/Netlify: Import repository
2. Set build command: `npm run build`
3. Set output directory: `dist`
4. Set environment: `VITE_API_URL=https://your-backend-url.railway.app`

---

## Project Structure

```
photo-selection-platform/
├── backend/
│   ├── app/
│   │   ├── main.py              # FastAPI app entry
│   │   ├── config.py            # Settings (pydantic-settings)
│   │   ├── database.py          # SQLAlchemy setup
│   │   ├── models.py            # ORM: PhotoSession, SelectedPhoto
│   │   ├── schemas.py           # Pydantic request/response
│   │   ├── auth.py              # JWT auth
│   │   ├── routers/
│   │   │   ├── admin.py         # Admin endpoints
│   │   │   └── gallery.py       # Public gallery endpoints
│   │   └── services/
│   │       ├── drive_service.py # Google Drive API
│   │       └── xmp_service.py   # XMP generator + ZIP
│   ├── service_account.json     # [NOT COMMITTED] Google creds
│   ├── .env                     # [NOT COMMITTED] Local config
│   ├── requirements.txt
│   └── Dockerfile
├── frontend/
│   ├── src/
│   │   ├── pages/               # Login, Dashboard, NewSession, Gallery
│   │   ├── components/          # UI components
│   │   ├── hooks/               # useSelection, useAuth
│   │   ├── api/                 # adminApi, galleryApi
│   │   └── context/             # AuthContext
│   ├── package.json
│   └── vite.config.js
├── docker-compose.yml
└── .env.example
```
