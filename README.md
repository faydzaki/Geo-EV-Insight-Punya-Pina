# ⚡ GeoEV Insight

<div align="center">

![Next.js](https://img.shields.io/badge/Next.js-14.2-black?style=for-the-badge&logo=next.js&logoColor=white)
![React](https://img.shields.io/badge/React-18-blue?style=for-the-badge&logo=react&logoColor=61DAFB)
![TypeScript](https://img.shields.io/badge/TypeScript-5.0-blue?style=for-the-badge&logo=typescript&logoColor=white)
![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-3.4-38B2AC?style=for-the-badge&logo=tailwind-css&logoColor=white)
![Python](https://img.shields.io/badge/Python-3.9+-yellow?style=for-the-badge&logo=python&logoColor=white)
![Flask](https://img.shields.io/badge/Flask-REST_API-lightgrey?style=for-the-badge&logo=flask&logoColor=black)
![MySQL](https://img.shields.io/badge/MySQL-8.0-orange?style=for-the-badge&logo=mysql&logoColor=white)
![Leaflet](https://img.shields.io/badge/Leaflet-Maps-green?style=for-the-badge&logo=leaflet&logoColor=white)

**Platform Dashboard Analitik Geospasial Infrastruktur SPKLU & Home Charging Services (HCS)**  
*Mendukung perencanaan berbasis data untuk ekosistem kendaraan listrik di Jawa Timur dan Bali.*

[📖 Baca Dokumentasi Lengkap (docs.md)](./docs.md) · [🚀 Panduan Memulai](#-panduan-instalasi--menjalankan-aplikasi) · [✨ Fitur Utama](#-fitur-utama) · [🔒 Keamanan & Privasi](#-keamanan--perlindungan-privasi)

</div>

---

## 📌 Ringkasan Proyek

**GeoEV Insight** adalah platform web terpadu untuk memetakan, menganalisis, dan merencanakan infrastruktur pengisian kendaraan listrik (Electric Vehicle / EV). Sistem ini menyatukan dua sisi data penting:
1. **Infrastruktur Publik (SPKLU)**: Data sebaran stasiun pengisian umum milik PLN maupun pihak swasta di Jawa Timur dan Bali beserta rincian dispenser daya (kW), unit mesin, dan konektor.
2. **Adopsi Kendaraan Pribadi (HCS)**: Data catatan pemasangan pengisian daya di rumah pelanggan (*Home Charging Services*) khusus Jawa Timur yang diagregasikan per kabupaten/kota dan merek kendaraan.

Melalui integrasi geospasial dan perhitungan rasio komparatif, platform ini membantu pengambil keputusan mengidentifikasi wilayah dengan kepadatan mobil listrik tinggi namun minim charger umum, sehingga investasi pembangunan SPKLU baru dapat dialokasikan secara presisi dan efisien.

---

## ✨ Fitur Utama

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                            GEOEV INSIGHT DASHBOARD                          │
├───────────────────┬─────────────────────────────────────────────────────────┤
│  RUANG ANALISIS   │  🗺️ Peta & Infrastruktur (Peta interaktif Leaflet)       │
│                   │  📊 Distribusi HCS (Sebaran mobil listrik per merek)    │
│                   │  ⚖️ Perbandingan Wilayah (Rasio HCS terhadap SPKLU)     │
│                   │  💡 Kajian Wilayah (Top 5 rekomendasi prioritas)        │
├───────────────────┼─────────────────────────────────────────────────────────┤
│  ADMINISTRASI     │  🛠️ Manajemen Data (Input, Edit, Upload Excel, Riwayat)  │
│                   │  👥 Manajemen User (Kelola akun, role, reset password)   │
└───────────────────┴─────────────────────────────────────────────────────────┘
```

### 1. 🗺️ Peta & Infrastruktur Geospasial (`/peta`)
* **Layer Fleksibel**: Beralih antara layer titik SPKLU (PLN = biru, Non-PLN = kuning), layer lingkaran agregat HCS (ungu), atau keduanya sekaligus.
* **Jangkauan Layanan (Buffer 5 km)**: Visualisasi radius jangkauan pengisian 5 km untuk melihat cakupan area terlayani.
* **Pencarian Cerdas**: Autocomplete cepat untuk mencari nama SPKLU maupun nama kabupaten/kota HCS.
* **Interaktivitas Detail & Navigasi Langsung**:
  * **Klik Titik SPKLU**: Menampilkan status operasional, rincian daya per dispenser, alamat, koordinat GPS (dengan tombol salin satu-klik), dan tombol direct **"Buka di Google Maps →"** (rute mengemudi).
  * **Klik Titik HCS**: Menampilkan total catatan HCS, merek mobil dominan, tabel porsi pasar mobil listrik (Hyundai, Wuling, BYD, dll.), alamat representatif wilayah, koordinat GPS, dan tombol **"Petunjuk Arah Google Maps →"**.
* **Analitik & Ekspor**: 4 Kartu KPI real-time, panel grafik (pengelola, kapasitas daya, sebaran provinsi), dan tabel data yang dapat disortir serta diekspor ke `.xlsx` atau `.csv`.

### 2. 📊 Distribusi Home Charging Services (`/hcs`)
* Visualisasi grafik batang sebaran adopsi mobil listrik rumahan di 38 kabupaten/kota Jawa Timur.
* Donut chart pangsa pasar merek mobil listrik (*Wuling, Hyundai, BYD, Chery, MG, BMW, Tesla, Toyota, Kia*).
* Rangkuman naratif otomatis (*insight headline*) daerah dengan adopsi kendaraan listrik tertinggi.

### 3. ⚖️ Perbandingan Rasio Wilayah (`/compare`)
* Analisis komparasi rasio: $\text{Rasio} = \frac{\text{Jumlah Catatan HCS}}{\text{Jumlah Titik SPKLU}}$.
* Grafik peringkat beban charger per kabupaten/kota.
* Audit kesiapan data wilayah (*Dapat dihitung*, *SPKLU belum terpetakan*, *Data HCS belum tersedia*).

### 4. 💡 Kajian Wilayah Prioritas (`/kajian`)
* **Sistem Pendukung Keputusan (DSS)**: Menyaring otomatis **Top 5 Wilayah Prioritas** penambahan SPKLU baru berdasarkan rasio beban tertinggi dan volume populasi EV.
* Deteksi wilayah *unserved* (darurat charger publik): daerah dengan adopsi HCS tinggi namun masih 0 titik SPKLU terpetakan.
* Narasi analisis otomatis siap pakai untuk justifikasi penyusunan nota dinas perencanaan.

### 5. 🛠️ Manajemen Data (`/admin`) — *Admin & Super Admin*
* **Input SPKLU**: Formulir penambahan titik SPKLU baru dengan konfigurasi kelompok charger dinamis.
* **Edit SPKLU**: Modifikasi data teknis dan toggle status operasional (Aktif / Nonaktif) dengan alasan perubahan.
* **Input HCS**: Tambah catatan unit HCS baru per wilayah dan merek dengan tombol cepat merek populer.
* **Edit & Koreksi HCS**: Tabel pencarian interaktif untuk mengoreksi atau mengubah total unit HCS tersimpan.
* **Upload Excel**: Unggah berkas `.xlsx` SPKLU dan HCS (mendukung mode *Replace* dan *Append* berpelindung *SHA-256*).
* **Riwayat Perubahan (Audit Trail)**: Merekam 100 log transaksi terakhir (waktu, username, aksi, target, alasan).

### 6. 👥 Manajemen Pengguna (`/admin/users`) — *Admin & Super Admin*
* Pengelolaan pengguna sistem: Tambah user baru, edit nama tampilan, dan pengaturan peran (*Super Admin, Admin, Viewer*).
* Ubah/reset password pengguna (enkripsi *bcrypt*).
* Toggle status akun pengguna (Aktif / Nonaktif).
* Hapus pengguna berpelindung modal pop-up konfirmasi modern **"Apakah Anda Yakin?"** (menggantikan browser alert bawaan).

---

## 🏗️ Arsitektur Sistem

Platform ini dibangun menggunakan arsitektur *Full-Stack Decoupled* modern:

```
┌──────────────────────────────────────────────┐
│             Peramban Klien (Port 3000)       │
└──────────────────────┬───────────────────────┘
                       │ HTTP / JSON
                       ▼
┌──────────────────────────────────────────────┐
│  FRONTEND: Next.js 14 (App Router)           │
│  - React 18, TypeScript, Tailwind CSS        │
│  - TanStack React Query (State & Cache)      │
│  - React-Leaflet (Peta OpenStreetMap)        │
│  - Route Proxy Handler (/api/[...path])      │
└──────────────────────┬───────────────────────┘
                       │ Proxy Internal Forwarding
                       ▼
┌──────────────────────────────────────────────┐
│  BACKEND: Python Flask REST API (Port 8050)  │
│  - REST Blueprint (/api/*)                   │
│  - SQLAlchemy 2.0 ORM Engine                 │
│  - PyJWT & Bcrypt Authentication             │
│  - Pandas & OpenPyXL Excel Processor         │
└──────────────────────┬───────────────────────┘
                       │ PyMySQL Driver
                       ▼
┌──────────────────────────────────────────────┐
│  DATABASE: MySQL / MariaDB (geoev_insight)   │
│  - users, spklu, spklu_charger,              │
│    hcs_by_brand, change_log, metadata        │
└──────────────────────────────────────────────┘
```

---

## 🔒 Keamanan & Perlindungan Privasi

1. **Perlindungan Data Pribadi (*Privacy by Design*)**:
   * Nama pelanggan, ID meter (UID), alamat rumah, dan titik GPS koordinat rumah pelanggan **dihapus seketika saat proses parsing file Excel selesai**.
   * Basis data hanya menyimpan angka agregat jumlah per `(wilayah, merek)`.
   * Titik HCS pada peta menggunakan koordinat representatif pusat kabupaten/kota, bukan koordinat rumah pelanggan.
2. **Keamanan Autentikasi**:
   * Token JSON Web Token (JWT) berumur 8 jam.
   * Kata sandi dienkripsi searah menggunakan *bcrypt*.
   * Role-Based Access Control (RBAC) di sisi frontend dan backend.
3. **Integritas Penulisan Data**:
   * *Optimistic Concurrency Control* menggunakan snapshot token untuk mencegah benturan revisi ganda.
   * *Idempotency key* berbasis UUID untuk mencegah duplikasi *double-submit*.
   * Log audit lengkap merekam status data sebelum (*before_json*) dan sesudah (*after_json*) perubahan.

---

## 🚀 Panduan Instalasi & Menjalankan Aplikasi

### Prasyarat
* **Node.js** >= 18.x (disertai `npm`)
* **Python** >= 3.9 s/d 3.12 (disertai `pip`)
* **MySQL / MariaDB** berjalan di port `3306`

---

### Langkah 1: Siapkan Database MySQL
Buka MySQL Workbench atau klien MySQL Anda, lalu buat database:
```sql
CREATE DATABASE IF NOT EXISTS geoev_insight
  CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
```

---

### Langkah 2: Jalankan Backend (Flask API)
```bash
# 1. Masuk ke direktori backend
cd backend

# 2. Pasang pustaka dependensi Python
python -m pip install -r requirements.txt

# 3. Buat file .env (jika belum ada)
# Pastikan DB_HOST, DB_NAME=geoev_insight, DB_USER, DB_PASSWORD sesuai dengan MySQL Anda

# 4. Jalankan server backend
python app.py
```
> Server backend akan berjalan di `http://127.0.0.1:8050` melayani endpoint REST API `/api/*`.

---

### Langkah 3: Jalankan Frontend (Next.js)
Buka terminal baru:
```bash
# 1. Masuk ke direktori frontend
cd frontend

# 2. Pasang paket dependensi Node.js
npm install

# 3. Jalankan server pengembang Next.js
npm run dev
```
> Server frontend akan aktif di `http://localhost:3000`.

---

### Langkah 4: Buka Aplikasi & Login
Buka browser Anda dan akses `http://localhost:3000`. Masuk menggunakan salah satu akun bawaan berikut:

| Username | Password | Role | Hak Akses |
| :--- | :--- | :--- | :--- |
| **`admin`** | `admin123` | **Super Admin** | Akses penuh seluruh fitur, manajemen user, input/edit, dan upload data |
| **`viewer`** | `viewer123` | **Viewer** | Akses analisis peta, eksplorasi grafik, komparasi wilayah, dan ekspor laporan |

---

## 🧪 Pengujian Otomatis

Untuk memastikan keandalan sistem dan integritas algoritma analitik, jalankan pengujian backend berikut:

```bash
cd backend

# Uji normalisasi data & parsing file Excel
python test_processing.py

# Uji formula rasio wilayah & rekomendasi kajian
python test_storytelling.py

# Uji skema tabel & transaksi atomik database
python test_database.py

# Uji otorisasi admin, koreksi HCS, dan audit trail
python test_admin.py

# Uji regresi menyeluruh otentikasi JWT & filter
python test_revision.py
```

Untuk memverifikasi konsistensi type TypeScript di frontend:
```bash
cd frontend
.\node_modules\.bin\tsc --noEmit
```

---

## 📁 Struktur Direktori

```
geoev_insight/
├── README.md                           <- Panduan singkat repositori ini
├── docs.md                             <- Dokumentasi menyeluruh & panduan lengkap
├── backend/                            <- Layanan Backend Flask REST API
│   ├── api.py                          <- Endpoint REST API JSON (/api/*)
│   ├── app.py                          <- Server Flask & registrasi blueprint
│   ├── database.py                     <- ORM SQLAlchemy & logika transaksi MySQL
│   ├── storytelling.py                 <- Perhitungan rasio HCS/SPKLU & rekomendasi
│   ├── requirements.txt                <- Daftar dependensi Python
│   └── test_*.py                       <- Berkas-berkas pengujian otomatis
└── frontend/                           <- Aplikasi Frontend Next.js 14
    ├── package.json                    <- Dependensi NPM
    ├── tailwind.config.ts              <- Konfigurasi styling Tailwind CSS
    └── src/
        ├── app/
        │   ├── (dashboard)/            <- Halaman /peta, /hcs, /compare, /kajian, /admin
        │   ├── api/[...path]/route.ts  <- Proxy handler meneruskan request ke backend
        │   └── login/page.tsx          <- Halaman Login
        ├── components/                 <- SpkluMap, ConfirmModal, DataTable, KpiCard, dll.
        └── lib/                        <- Klien API, konstanta koordinat, utilitas format
```

---

## 📄 Lisensi & Hak Cipta

Dikembangkan untuk kebutuhan internal operasional dan perencanaan strategis infrastruktur pengisian kendaraan listrik **PLN Energi Primer Indonesia (PLN ES)** di wilayah Jawa Timur dan Bali.
