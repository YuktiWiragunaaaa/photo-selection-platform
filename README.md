# Pilih Foto — Platform Seleksi Foto Interaktif

Portal *client-proofing* untuk fotografer. Klien memilih foto lewat galeri di HP/desktop; fotografer mendapatkan file **XMP sidecar** (★5 + label warna) siap disinkronkan ke Capture One / Lightroom — tanpa mencatat nama file manual.

Semua komponen gratis: FastAPI + SQLite, React + Vite + Tailwind, Google Drive API, Google Fonts.

---

## Cara cepat menjalankan (Windows)

1. **Klik dua kali `jalankan.bat`** di folder utama.
   Ini akan *build* tampilan website lalu menyalakan server. Tunggu sampai muncul
   `Uvicorn running on http://0.0.0.0:8000`.
2. Buka **http://localhost:8000/admin** dan login dengan `ADMIN_PASSWORD` dari `backend/.env`.
3. Supaya klien bisa membuka dari internet, jalankan ngrok di jendela lain:
   ```
   ngrok http 8000 --url=DOMAIN-KAMU.ngrok-free.dev
   ```
   Lalu buka admin lewat alamat ngrok itu (`https://DOMAIN-KAMU.ngrok-free.dev/admin`),
   supaya link yang dibagikan ke klien memakai alamat ngrok.

> **Setiap kali kode diubah**, tutup jendela `jalankan.bat` lalu klik dua kali lagi supaya build diperbarui.

### Persiapan pertama kali (sekali saja)

Prasyarat: Python 3.11+, Node 18+.

```bash
# Backend
cd backend
copy .env.example .env          # lalu edit isinya (lihat bagian Pengaturan)
python -m venv venv
venv\Scripts\activate
pip install -r requirements.txt

# Frontend
cd ..\frontend
npm install
```

### Mode development (untuk mengubah kode)

Dua terminal: `cd backend && python dev.py` (port 8000) dan `cd frontend && npm run dev` (port 5173, buka `http://localhost:5173/admin`). Perubahan kode langsung terlihat, tapi **lambat jika diakses lewat ngrok** — untuk klien selalu pakai `jalankan.bat`.

---

## Pengaturan (`backend/.env`)

| Kunci | Keterangan |
|---|---|
| `ADMIN_PASSWORD` | Password login admin. **Wajib diganti** sebelum dibuka ke internet (server memberi peringatan jika masih bawaan). |
| `SECRET_KEY` | Kunci rahasia. Isi sekali di awal lalu jangan diubah — mengubahnya membuat PIN sesi lama tidak berlaku. |
| `FRONTEND_URL` | Alamat publik untuk link galeri, mis. `https://DOMAIN-KAMU.ngrok-free.dev`. Restart server setelah mengubah. |
| `GOOGLE_API_KEY` | Untuk folder Drive publik (lihat di bawah). |
| `CACHE_RETENTION_DAYS` | Lama cache foto disimpan setelah sesi selesai (bawaan 30 hari). |

Tanpa Google Drive (API key kosong dan `service_account.json` tidak ada), aplikasi memakai 24 foto contoh sehingga seluruh alur bisa dicoba.

## Menghubungkan Google Drive

**Cara 1 — API key + folder publik (paling mudah)**
1. [Google Cloud Console](https://console.cloud.google.com) → APIs & Services → Enable **Google Drive API**.
2. Credentials → Create credentials → **API key** → isi `GOOGLE_API_KEY` di `.env`.
3. Folder foto di Drive: Share → *Anyone with the link* → Viewer.

**Cara 2 — Service account (folder privat)**
1. IAM & Admin → Service Accounts → buat → Keys → Add key → JSON.
2. Simpan sebagai `backend/service_account.json`, lalu share folder ke `client_email` di file itu (Viewer).

Saat membuat sesi, tempel **link folder** atau ID-nya. Foto diambil dalam ukuran kecil (grid) dan besar (preview), lalu di-cache di `backend/cache/` — file asli tidak pernah diunduh.

---

## Alur kerja

1. **Persiapan** — ekspor JPEG ukuran web ke satu folder Drive.
2. **Buat sesi** — Admin → *Sesi baru*: nama klien, link folder, jumlah foto dalam paket, (opsional) maksimal dengan tambahan, **PIN 4 digit** (tombol *Acak*), dan tanggal kedaluwarsa.
3. **Bagikan** — tunggu indikator **"Galeri siap dibagikan"**, lalu tekan **Kirim lewat WhatsApp** (pesan + link + PIN otomatis) atau **Salin** link.
4. **Klien memilih**:
   - intro studio (logo, nama, tagline) dan panduan singkat (bisa dibuka lagi lewat tombol **Cara memilih**);
   - ketuk foto untuk memilih, ikon ⤢ untuk melihat besar dan menulis **catatan**, ikon bookmark untuk **Tandai dulu** (masih ragu);
   - pilihan **tersimpan otomatis di server** — bisa dilanjutkan dari HP/laptop lain;
   - saat melewati kuota paket muncul pop-up konfirmasi, dan foto di luar paket diberi label **Tambahan**;
   - layar konfirmasi menampilkan semua foto; klien bisa memilih sendiri foto mana yang jadi tambahan.
5. **Hasil** — Admin → sesi: foto pilihan (klik untuk memperbesar + lihat catatan), lalu **XMP .zip** / **Salin nama file** / **CSV**.
6. **Editing** — ekstrak ZIP ke folder RAW. Capture One: *Image → Synchronize Metadata*. Lightroom: *Metadata → Read Metadata from File*. Foto pilihan: **Rating 5 + label hijau**; foto tambahan: **label kuning**; catatan klien masuk ke **Caption/Description**.

### Fitur admin

- **Dashboard**: ringkasan (**baru selesai**, sedang memilih, belum dibuka, selesai, deadline ≤ 2 hari — klik untuk menyaring), pencarian klien, kartu sesi dengan pratinjau foto.
- **Penanda “Baru”**: sesi yang baru dikirim klien tapi belum pernah Anda buka diberi label merah **BARU** pada kartunya dan dihitung di kotak **Baru selesai** (klik untuk menyaring). Penanda hilang otomatis begitu detail sesinya dibuka; kalau sesi dibuka lagi untuk klien lalu dikirim ulang, penandanya muncul kembali.
- **Detail sesi**: aktivitas klien (kapan dibuka), pilihan sementara yang sedang dipilih klien, dan tombol:
  - **Edit sesi** — ubah nama, link folder Drive (jika salah tempel), kuota, PIN, masa berlaku, catatan;
  - **Sinkronkan** — baca ulang folder bila foto ditambah/dihapus;
  - **Buka lagi** — klien bisa mengubah pilihan (pilihan lama jadi titik awal);
  - **Reset pilihan** — hapus semua pilihan, catatan, dan tanda; klien mulai dari nol;
  - **Kunci ulang perangkat** — semua perangkat harus memasukkan PIN lagi (PIN tetap sama);
  - **Hapus sesi**.
- **Mode pratinjau**: galeri yang dibuka saat login sebagai admin tidak mengubah pilihan/aktivitas klien. Untuk mencoba sebagai klien, buka link di jendela Incognito.
- **Studio & logo**: nama studio, tagline, kontak, dan logo (PNG transparan didukung) untuk intro dan galeri.

### Kustomisasi tanpa kode — menu **Pengaturan**

| Tab | Isi |
|---|---|
| **Identitas** | Nama studio, tagline, kontak, logo |
| **Tampilan** | 6 tema warna siap pakai (Neon, Earth, Klasik, Laut, Blush, Hutan) atau 3 warna sendiri (latar, teks, aksen — warna lain dihitung otomatis agar tetap terbaca); font judul & font teks; judul miring on/off. Pratinjau langsung sebelum disimpan. |
| **Intro & galeri** | **Ukuran teks** galeri (Normal / Besar / Sangat besar), **Mode sederhana** untuk klien yang kurang terbiasa, intro on/off + teks + durasi, judul galeri, panduan otomatis on/off |
| **Pesan WhatsApp** | Template pesan dengan data otomatis `{nama}` `{link}` `{pin}` `{paket}` `{tambahan}` `{deadline}` `{studio}` + contoh hasil |
| **Domain & keamanan** | Alamat publik untuk link galeri (menggantikan `FRONTEND_URL`), ganti password admin (menggantikan `ADMIN_PASSWORD`) |

Semua perubahan langsung berlaku untuk klien tanpa build ulang.

---

## Keamanan

- **PIN galeri 4 digit.** Salah tebak dibatasi 5×/pengunjung dan 10×/galeri per 15 menit.
- Perangkat yang sudah membuka galeri tetap terbuka **7 hari**; link gambar hanya berlaku **±12 jam** (link foto yang disalin cepat mati).
- Mengganti PIN atau menekan **Kunci ulang perangkat** membatalkan semua akses lama.
- **Login admin** dibatasi 5 salah/alamat dan 20 salah total per 15 menit.
- Hitungan salah tebak PIN & login **disimpan di database**, jadi tidak kembali nol saat server dinyalakan ulang.
- Galeri yang kedaluwarsa tertutup untuk klien.

## Hosting & dipakai studio lain

Aplikasi ini **satu instalasi = satu studio**. Untuk studio/perusahaan lain, pasang salinan terpisah:

1. **Server** — VPS (mis. Ubuntu) atau layanan seperti Railway/Render. Jalankan `npm run build` di `frontend`, lalu backend dengan `uvicorn app.main:app --host 0.0.0.0 --port 8000` (backend otomatis menyajikan website).
2. **Domain** — arahkan (DNS record A/CNAME) domain studio ke server, pasang HTTPS (mis. Caddy/Nginx + Let's Encrypt).
3. **`backend/.env` baru** — `SECRET_KEY` acak baru, `ADMIN_PASSWORD` awal, dan kredensial Google Drive milik studio tersebut.
4. **Sisanya dari panel admin** — logo, nama, warna, font, pesan WhatsApp, alamat publik, password.

Data (sesi, pilihan klien) tiap studio terpisah karena database dan cache ada di server masing-masing.

## Tes otomatis

```bash
cd backend
venv\Scripts\python -m pytest tests -q
```

Tes memakai database sementara dan foto Drive palsu, jadi **tidak menyentuh data asli**. Cakupannya: PIN benar/salah,
pembatas percobaan (termasuk tetap berlaku setelah server restart), kunci ulang perangkat, batas kuota foto,
penandaan foto di luar paket, larangan kirim dua kali, penanda "baru selesai", dan endpoint health.

## Backup

Setiap kali server dinyalakan, database disalin ke `backend/backups/` (satu per hari, 14 hari terakhir disimpan). Untuk memulihkan: matikan server, salin file backup menjadi `backend/photo_platform.db`, nyalakan lagi.

Selain itu, **setiap kali klien selesai mengirim pilihan**, database langsung disalin ke `backend/backups/kiriman/` dengan nama bertanggal-jam (30 salinan terakhir disimpan). Jadi hasil pilihan hari itu tidak perlu menunggu backup besok.

Cache foto dibersihkan otomatis untuk sesi yang selesai lebih dari `CACHE_RETENTION_DAYS` hari, dan saat sesi dihapus.

---

## Masalah umum

| Gejala | Solusi |
|---|---|
| Link galeri masih `localhost` | Buka admin lewat alamat ngrok, atau isi `FRONTEND_URL` di `backend/.env` lalu restart server. |
| `ERR_NGROK_334 … already online` | Ada ngrok lain yang masih jalan: tutup jendelanya atau `taskkill /f /im ngrok.exe`. |
| Klien melihat halaman "You are about to visit…" | Halaman peringatan ngrok gratis — tekan **Visit Site**. |
| Foto lama muncul / kosong saat pertama dibuka | Foto masih diambil dari Drive; tunggu "Galeri siap dibagikan" sebelum membagikan link. |
| "Terlalu banyak percobaan PIN" | Tunggu 15 menit, atau admin menekan **Kunci ulang perangkat**. |
| Tampilan kacau setelah ganti warna | Pengaturan → Tampilan → pilih salah satu tema siap pakai lalu Simpan. |
| Perubahan kode tidak terlihat | Tutup lalu jalankan ulang `jalankan.bat` (build ulang), lalu Ctrl+F5 di browser. |

---

## Tech stack

| Layer | Teknologi |
|---|---|
| Backend | Python · FastAPI · SQLAlchemy 2 · Pillow · SQLite |
| Foto | Google Drive API v3 (API key / service account) + cache lokal |
| Frontend | React 18 · Vite · Tailwind CSS · lucide-react |
| Font | Bricolage Grotesque · Instrument Serif · JetBrains Mono |

## Struktur

```
jalankan.bat              # build + jalankan (mode production, port 8000)
backend/
  dev.py                  # launcher development (auto-reload)
  app/
    main.py               # app, backup harian, sajikan hasil build frontend
    config.py database.py models.py schemas.py auth.py
    routers/admin.py      # login, sesi, edit, reset, kunci ulang, export
    routers/gallery.py    # galeri klien, PIN & token akses, simpan otomatis, submit
    services/             # drive_service (Drive + cache), xmp_service, branding
  backups/                # salinan database harian
frontend/src/
  pages/      Gallery · Dashboard · SessionDetail · NewSession · Settings · Login
  components/ Intro · Guide · PhotoTile · Lightbox · SelectionBar · PinGate ·
              AdminShell · AdminPhotoGrid · AccessEditor · StatusBadge · …
  hooks/      useSelection (pilihan + tanda) · useColumns (masonry) · useClipboard
  utils/      pin.js (PIN acak, ingat PIN di browser admin)
```

## API ringkas

| Method | Path | Keterangan |
|---|---|---|
| POST | `/api/admin/login` | `{password}` → JWT |
| GET/POST | `/api/admin/sessions` | daftar / buat sesi |
| GET/PATCH/DELETE | `/api/admin/sessions/{id}` | detail / ubah / hapus |
| POST | `/api/admin/sessions/{id}/sync` · `/reopen` · `/reset` · `/relock` | sinkron / buka lagi / reset pilihan / kunci ulang perangkat |
| GET | `/api/admin/sessions/{id}/export/{xmp,filenames,csv}` | export |
| GET | `/api/gallery/{slug}/meta` · `/api/gallery/{slug}` | info & data galeri |
| POST | `/api/gallery/{slug}/unlock` | `{pin}` → token akses (7 hari) |
| PUT | `/api/gallery/{slug}/draft` | simpan otomatis pilihan, catatan, tanda |
| POST | `/api/gallery/{slug}/submit` | kirim pilihan final (+ foto tambahan pilihan klien) |
| GET | `/api/gallery/{slug}/img/{file_id}?size=thumb\|full&t=…` | proxy gambar |
