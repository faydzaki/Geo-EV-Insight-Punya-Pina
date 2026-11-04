# GeoEV Insight — Dokumentasi Lengkap

> **GeoEV Insight** adalah dashboard internal berbasis web untuk memvisualisasikan, menganalisis, dan mengelola data infrastruktur pengisian kendaraan listrik (SPKLU) di wilayah **Jawa Timur dan Bali**, serta data catatan Home Charging Station (HCS) khusus **Jawa Timur**. Aplikasi ini dibangun untuk kebutuhan internal PLN Energi Primer Indonesia (PLN ES) dan tidak ditujukan untuk akses publik.

---

## Daftar Isi

1. [Gambaran Umum Aplikasi](#1-gambaran-umum-aplikasi)
2. [Teknologi yang Digunakan](#2-teknologi-yang-digunakan)
3. [Struktur Folder dan File](#3-struktur-folder-dan-file)
4. [Cara Instalasi dan Menjalankan](#4-cara-instalasi-dan-menjalankan)
5. [Konfigurasi File `.env`](#5-konfigurasi-file-env)
6. [Skema Database MySQL](#6-skema-database-mysql)
7. [Fitur-Fitur Aplikasi](#7-fitur-fitur-aplikasi)
8. [Sistem Autentikasi](#8-sistem-autentikasi)
9. [Format File Excel Upload](#9-format-file-excel-upload)
10. [Modul dan File Backend](#10-modul-dan-file-backend)
11. [Alur Data: Dari Upload ke Dashboard](#11-alur-data-dari-upload-ke-dashboard)
12. [Manajemen Data oleh Admin](#12-manajemen-data-oleh-admin)
13. [Auto-Refresh Data](#13-auto-refresh-data)
14. [Definisi Angka, Metrik, dan Rasio](#14-definisi-angka-metrik-dan-rasio)
15. [Privasi dan Perlindungan Data](#15-privasi-dan-perlindungan-data)
16. [Pengujian (Testing)](#16-pengujian-testing)
17. [Deploy ke Produksi](#17-deploy-ke-produksi)
18. [Batasan Aplikasi](#18-batasan-aplikasi)

---

## 1. Gambaran Umum Aplikasi

GeoEV Insight adalah **web dashboard internal** yang bertujuan memberikan gambaran menyeluruh tentang:

- **Distribusi dan kapasitas SPKLU** (Stasiun Pengisian Kendaraan Listrik Umum) di seluruh wilayah Jawa Timur dan Bali
- **Catatan pelanggan Home Charging Station (HCS)** di Jawa Timur — disimpan dan ditampilkan hanya sebagai **data agregat per kabupaten/kota dan merek kendaraan** demi menjaga privasi pelanggan
- **Rasio perbandingan** antara jumlah catatan HCS dan ketersediaan SPKLU per kabupaten/kota — berguna sebagai indikator awal untuk mengidentifikasi wilayah yang mungkin perlu dikaji untuk penambahan fasilitas pengisian publik

### Apa yang bisa dilihat di dashboard?

| Halaman                  | Isi                                                                                       |
| ------------------------ | ----------------------------------------------------------------------------------------- |
| **Peta & Infrastruktur** | Peta interaktif lokasi SPKLU dan sebaran catatan HCS, KPI, grafik pengelola dan kapasitas |
| **Distribusi HCS**       | Jumlah catatan HCS per kabupaten/kota dan per merek kendaraan                             |
| **Perbandingan Wilayah** | Tabel dan grafik rasio HCS/SPKLU per kabupaten/kota                                       |
| **Kajian Wilayah**       | Daftar wilayah prioritas kajian berdasarkan rasio tertinggi                               |
| **Manajemen Data**       | Upload Excel SPKLU/HCS, input & edit SPKLU, input & edit HCS — hanya untuk Admin          |

---

## 2. Teknologi yang Digunakan

### Backend & Framework

| Library                       | Versi                 | Kegunaan                                         |
| ----------------------------- | --------------------- | ------------------------------------------------ |
| **Python**                    | 3.9+                  | Bahasa pemrograman utama                         |
| **Dash**                      | >=3.0, <4             | Framework web dashboard (berbasis Flask + React) |
| **Dash Leaflet**              | >=1.1, <2             | Komponen peta interaktif (OpenStreetMap)         |
| **Dash Bootstrap Components** | >=2.0, <3             | Komponen UI Bootstrap untuk Dash                 |
| **Plotly**                    | >=6.0, <7             | Grafik interaktif (pie, bar, scatter)            |
| **Pandas**                    | >=2.2, <3             | Olah data tabular dan agregasi                   |
| **SQLAlchemy**                | >=2.0, <3             | ORM dan koneksi ke MySQL                         |
| **PyMySQL**                   | >=1.1, <2             | Driver Python untuk MySQL                        |
| **python-dotenv**             | >=1.0, <2             | Membaca variabel dari file `.env`                |
| **openpyxl**                  | >=3.1, <4             | Parsing file Excel (.xlsx)                       |
| **Flask**                     | (bundled dengan Dash) | HTTP server, autentikasi HTTP Basic              |
| **gunicorn**                  | >=23, <25             | WSGI server untuk produksi Linux                 |

### Frontend & Peta

- **OpenStreetMap** — tile peta dasar (membutuhkan koneksi internet)
- **Leaflet.js** — rendering peta interaktif (via Dash Leaflet)
- **Bootstrap** — grid layout responsif
- **Google Fonts (Inter)** — tipografi

### Database

- **MySQL / MariaDB** — penyimpanan permanen semua data SPKLU dan agregat HCS

---

## 3. Struktur Folder dan File

```
geoev_insight/
├── docs.md                    <- Dokumentasi ini
├── backend/
│   ├── app.py                 <- Aplikasi utama: UI, parsing Excel, autentikasi, callbacks
│   ├── database.py            <- Koneksi MySQL, skema tabel, semua query dan transaksi
│   ├── admin_ui.py            <- UI dan callbacks halaman Manajemen Data (Admin)
│   ├── storytelling.py        <- Kalkulasi rasio, headline, dan kandidat wilayah
│   ├── diagnose_db.py         <- Script diagnostik koneksi database
│   ├── requirements.txt       <- Daftar dependensi Python
│   ├── setup_mysql.sql        <- Script SQL untuk membuat database dan user
│   ├── README.md              <- Panduan singkat pengembang
│   ├── .env                   <- Kredensial (TIDAK di-commit ke Git)
│   ├── .gitignore             <- File yang dikecualikan dari Git
│   ├── assets/
│   │   ├── style.css          <- Stylesheet utama (tema hijau-teal, responsif)
│   │   └── map_helper.js      <- JavaScript helper untuk status tile peta
│   ├── test_admin.py          <- Tes fitur admin UI dan manajemen SPKLU/HCS
│   ├── test_database.py       <- Tes tabel, insert, reload, audit, dan rollback
│   ├── test_processing.py     <- Tes fungsi parsing Excel (tanpa Dash)
│   ├── test_refresh.py        <- Tes event refresh data
│   ├── test_revision.py       <- Tes regresi fungsional lengkap
│   └── test_storytelling.py   <- Tes logika rasio dan headline
└── frontend/
    └── (folder kosong — frontend dirender langsung oleh Dash di backend)
```

---

## 4. Cara Instalasi dan Menjalankan

### Prasyarat

- Python 3.9 atau lebih baru
- MySQL atau MariaDB aktif
- Database `geoev_insight` sudah dibuat

### Langkah Instalasi

**1. Buat database MySQL (lakukan sekali)**

```sql
-- Jalankan di MySQL Workbench atau klien MySQL
CREATE DATABASE IF NOT EXISTS geoev_insight
  CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
```

Atau gunakan script yang sudah disediakan:

```powershell
mysql -u root -p < backend\setup_mysql.sql
```

**2. Salin dan isi file konfigurasi**

```powershell
copy backend\.env.example backend\.env
# Lalu buka backend\.env dan isi kredensial yang sesuai
```

**3. Install dependensi Python**

```powershell
cd backend
python -m pip install -r requirements.txt
```

**4. Jalankan aplikasi**

```powershell
python app.py
```

**5. Buka di browser**

```
http://127.0.0.1:8050
```

Login menggunakan akun yang sudah dikonfigurasi di `.env`.

---

## 5. Konfigurasi File `.env`

File `.env` wajib ada di folder `backend/` sebelum aplikasi dijalankan. **Jangan commit file ini ke Git.**

```env
# Koneksi MySQL
DB_HOST=127.0.0.1          # Host database (default: localhost)
DB_PORT=3306               # Port MySQL (default: 3306)
DB_NAME=geoev_insight      # Nama database
DB_USER=root               # Username MySQL
DB_PASSWORD=               # Password MySQL (boleh kosong untuk instalasi lokal tanpa password)

# Akun aplikasi — admin dan viewer HARUS berbeda username DAN password
GEOEV_ADMIN_USER=admin
GEOEV_ADMIN_PASSWORD=admin123      # Ganti dengan password kuat!
GEOEV_VIEWER_USER=viewer
GEOEV_VIEWER_PASSWORD=viewer123    # Ganti dengan password kuat!

# Opsional: TLS untuk MySQL di server remote
# DB_SSL_CA=/path/to/mysql-ca.pem

# Opsional: Override host/port server Dash
# HOST=127.0.0.1
# PORT=8050
```

> **PENTING:** Aplikasi **menolak start** jika:
>
> - Salah satu dari empat variabel akun kosong
> - Username atau password admin sama dengan viewer
> - Password masih berisi teks `GANTI_PASSWORD`

---

## 6. Skema Database MySQL

Semua tabel dibuat otomatis oleh `database.py` saat aplikasi pertama kali dijalankan. **Tidak perlu import ulang dump** untuk skema yang sudah ada.

### Tabel `spklu` — Lokasi SPKLU

| Kolom       | Tipe           | Keterangan                                      |
| ----------- | -------------- | ----------------------------------------------- |
| `id`        | INT (PK, auto) | ID unik lokasi                                  |
| `nama`      | VARCHAR(255)   | Nama lokasi SPKLU                               |
| `alamat`    | TEXT           | Alamat lengkap                                  |
| `pengelola` | VARCHAR(32)    | `PLN`, `Non-PLN`, atau `Tidak diketahui`        |
| `provinsi`  | VARCHAR(50)    | `Jawa Timur` atau `Bali`                        |
| `wilayah`   | VARCHAR(120)   | Nama kabupaten/kota (misal: `Kota Surabaya`)    |
| `lat`       | FLOAT          | Latitude koordinat                              |
| `lon`       | FLOAT          | Longitude koordinat                             |
| `daya`      | FLOAT          | Total daya terpasang (kW) = Σ(kapasitas × unit) |
| `unit`      | INT            | Total unit charger                              |
| `connector` | INT            | Total konektor                                  |

### Tabel `spklu_charger` — Rincian Charger per Lokasi

| Kolom          | Tipe              | Keterangan                                             |
| -------------- | ----------------- | ------------------------------------------------------ |
| `id`           | INT (PK, auto)    | —                                                      |
| `spklu_id`     | INT (FK spklu.id) | Referensi ke lokasi induk                              |
| `kelompok`     | VARCHAR(32)       | Sufiks kelompok charger dari Excel (misal: `_1`, `-A`) |
| `kapasitas_kw` | FLOAT             | Daya per unit charger dalam kW                         |
| `unit`         | INT               | Jumlah unit charger dalam kelompok ini                 |
| `connector`    | INT               | Jumlah konektor dalam kelompok ini                     |

### Tabel `hcs_by_brand` — Agregat Catatan HCS

| Kolom     | Tipe              | Keterangan                                           |
| --------- | ----------------- | ---------------------------------------------------- |
| `wilayah` | VARCHAR(120) (PK) | Nama kabupaten/kota Jawa Timur                       |
| `merk`    | VARCHAR(120) (PK) | Kategori/merek kendaraan (uppercase)                 |
| `jumlah`  | INT               | Jumlah catatan HCS untuk kombinasi wilayah+merek ini |

> **Catatan:** Data HCS yang disimpan **hanya agregat** (jumlah per wilayah dan merek).
> Nama pelanggan, UID, alamat rumah, dan koordinat rumah **tidak pernah disimpan** ke database.

### Tabel `metadata` — Timestamp Data

| Kolom | Tipe             | Keterangan                                                   |
| ----- | ---------------- | ------------------------------------------------------------ |
| `k`   | VARCHAR(80) (PK) | Key metadata (`spklu_updated`, `hcs_updated`, `_write_lock`) |
| `v`   | VARCHAR(255)     | Nilai (biasanya timestamp WIB atau `1` untuk lock)           |

### Tabel `upload_history` — Riwayat Upload

| Kolom          | Tipe           | Keterangan                 |
| -------------- | -------------- | -------------------------- |
| `id`           | INT (PK, auto) | —                          |
| `dataset`      | VARCHAR(16)    | `spklu` atau `hcs`         |
| `jumlah_baris` | INT            | Jumlah baris yang diproses |
| `waktu_upload` | DATETIME       | Waktu upload (WIB)         |

### Tabel `spklu_status` — Status Aktif/Nonaktif SPKLU

| Kolom      | Tipe                  | Keterangan                            |
| ---------- | --------------------- | ------------------------------------- |
| `spklu_id` | INT (PK, FK spklu.id) | Referensi lokasi                      |
| `aktif`    | INT                   | `1` = aktif (default), `0` = nonaktif |

> Lokasi nonaktif tetap ada di inventaris tetapi **tidak muncul** di peta, KPI, maupun perhitungan rasio.

### Tabel `change_log` — Audit Trail

| Kolom         | Tipe           | Keterangan                                                |
| ------------- | -------------- | --------------------------------------------------------- |
| `id`          | INT (PK, auto) | —                                                         |
| `request_id`  | VARCHAR(80)    | UUID unik per operasi (idempotency key)                   |
| `dataset`     | VARCHAR(16)    | `spklu` atau `hcs`                                        |
| `action`      | VARCHAR(40)    | Jenis aksi (`import`, `tambah`, `edit`, `aktifkan`, dll.) |
| `target`      | VARCHAR(255)   | Nama lokasi/wilayah yang diubah                           |
| `actor`       | VARCHAR(120)   | Username yang melakukan perubahan                         |
| `reason`      | TEXT           | Alasan perubahan                                          |
| `before_json` | LONGTEXT       | Snapshot data sebelum perubahan                           |
| `after_json`  | LONGTEXT       | Snapshot data sesudah perubahan                           |
| `created_at`  | DATETIME       | Waktu perubahan                                           |

---

## 7. Fitur-Fitur Aplikasi

### 7.1 Halaman Peta & Infrastruktur

Halaman utama yang menampilkan:

- **Peta interaktif** menggunakan OpenStreetMap dengan dua layer yang bisa dipilih:
  - **Layer SPKLU**: Titik berwarna (biru = PLN, kuning = Non-PLN, abu-abu = tidak diketahui)
  - **Layer HCS**: Lingkaran ungu per kabupaten/kota, ukurannya proporsional dengan jumlah catatan HCS (dibatasi maks. radius 30px agar peta tetap terbaca)
  - **Keduanya sekaligus**

- **Filter peta** (berlaku independen dari analisis HCS/Rasio):
  - Provinsi (Jawa Timur / Bali / Semua)
  - Pengelola (PLN / Non-PLN / Tidak diketahui)
  - Kabupaten/kota Jawa Timur
  - Range daya charger (<=22 kW / >22-50 kW / >50-100 kW / >100 kW)

- **Pencarian teks** nama atau alamat SPKLU (case-insensitive, mendukung variasi Unicode)

- **Panel detail lokasi**: Klik marker atau pilih dari dropdown untuk melihat:
  - Nama, pengelola, alamat, provinsi, wilayah
  - Total daya, unit, konektor
  - Rincian charger per kelompok (daya/unit, jumlah unit, jumlah konektor)

- **4 KPI (Key Performance Indicator)**:
  - Titik SPKLU (lokasi terpilih)
  - Unit charger (lokasi terpilih)
  - Konektor (lokasi terpilih)
  - Total daya terpasang (kW)

- **Grafik detail** (di dalam panel lipat):
  - Pie chart pengelola SPKLU
  - Bar chart SPKLU per provinsi
  - Bar chart unit charger menurut kelompok daya
  - Bar chart 10 SPKLU dengan daya terbesar

- **Tabel data** SPKLU dengan sort dan filter bawaan

### 7.2 Halaman Distribusi HCS

- **Bar chart horizontal** jumlah catatan HCS per kabupaten/kota (dapat difilter per wilayah)
- **Insight otomatis**: kota dengan catatan HCS terbanyak ditampilkan sebagai headline
- **Perbandingan HCS vs SPKLU**: insight naratif singkat
- **Pie chart merek kendaraan**: sampai 8 merek terbesar, sisanya digabung sebagai "LAINNYA"

> Filter wilayah pada halaman ini **tidak terikat** dengan filter peta. Keduanya bekerja secara independen.

### 7.3 Halaman Perbandingan Wilayah

- **Bar chart rasio** HCS/SPKLU per kabupaten/kota Jawa Timur
- **Tabel perbandingan** dengan kolom: Kabupaten/kota, Catatan HCS, Titik SPKLU, Rasio, Status data
- **Status data per wilayah**:
  - _Dapat dihitung_: ada data HCS dan SPKLU
  - _SPKLU belum terpetakan_: ada HCS tapi tidak ada SPKLU terdeteksi
  - _Data HCS belum tersedia_: ada SPKLU tapi tidak ada data HCS
- **Panel audit**: peringatan jika ada SPKLU Jawa Timur yang wilayahnya belum dikenali

### 7.4 Halaman Kajian Wilayah

- Daftar hingga **5 kabupaten/kota** dengan rasio HCS/SPKLU tertinggi sebagai kandidat kajian
- Daftar kabupaten/kota yang memiliki catatan HCS namun **belum ada SPKLU terpetakan**

### 7.5 Halaman Manajemen Data (Admin Only)

Manajemen data terintegrasi yang mencakup:
- **Input SPKLU**: Formulir penambahan titik SPKLU baru lengkap beserta rincian dispenser charger
- **Edit SPKLU**: Pencarian dan modifikasi data SPKLU, rincian konektor, serta aktivasi/deaktivasi status
- **Input HCS**: Formulir penambahan unit catatan HCS baru berdasarkan kabupaten/kota dan merek kendaraan
- **Edit HCS**: Modifikasi atau penyesuaian (koreksi) total catatan unit HCS terpasang
- **Upload Excel**: Unggah berkas Excel data SPKLU dan catatan agregat HCS
- **Riwayat Perubahan**: Catatan audit log 100 perubahan data terakhir

Lihat Bagian 12 untuk penjelasan teknis lengkap.

---

## 8. Sistem Autentikasi

Aplikasi menggunakan **HTTP Basic Authentication** yang diterapkan di level Flask (sebelum request apapun diproses, termasuk callback Dash).

- **Timing-safe comparison**: menggunakan `secrets.compare_digest()` untuk mencegah timing attack
- **Dua level akses**:
  - **Admin**: akses penuh termasuk Manajemen Data, upload Excel, input manual, edit lokasi, nonaktifkan SPKLU
  - **Viewer**: akses baca saja semua halaman kecuali Manajemen Data
- Menu "Manajemen Data" **tidak tampil** untuk viewer
- Upload file **dinonaktifkan** di sisi UI untuk viewer
- **Otorisasi diverifikasi ulang di server** pada setiap operasi write — viewer tidak bisa bypass dengan memanipulasi request

> **PERHATIAN (Keamanan):** Untuk deployment, aplikasi **wajib** ditempatkan di balik HTTPS
> dan akses terbatas (VPN/firewall internal). HTTP Basic Auth tanpa HTTPS mengirim
> kredensial dalam plaintext.

---

## 9. Format File Excel Upload

Hanya file `.xlsx`, maksimal **20 MB** setelah decode base64. Sheet dipilih otomatis berdasarkan kolom wajib, bukan nama sheet.

### 9.1 Format SPKLU

**Kolom wajib:**

| Kolom              | Keterangan                                                        |
| ------------------ | ----------------------------------------------------------------- |
| `Nama`             | Nama lokasi SPKLU                                                 |
| `Alamat`           | Alamat lengkap                                                    |
| `PLN atau NON PLN` | Pengelola (`PLN` / `Non-PLN` / variasi lain -> "Tidak diketahui") |
| `Provinsi`         | `Jawa Timur` / `Jatim` / `East Java` / `Bali`                     |
| `Latitude`         | Angka desimal, rentang -9.8 s/d -5.3                              |
| `Longitude`        | Angka desimal, rentang 110 s/d 116.5                              |

**Kolom opsional:**

| Kolom            | Keterangan                                                         |
| ---------------- | ------------------------------------------------------------------ |
| `KOTA/KABUPATEN` | Nama kabupaten/kota eksplisit (hanya untuk Jawa Timur)             |
| `ID`             | ID lokasi yang sudah ada di database (kosongkan untuk lokasi baru) |

**Kelompok charger (minimal 1 kelompok lengkap):**

Setiap kelompok harus memiliki ketiga kolom berikut dengan sufiks yang **sama persis**:

- `Kapasitas Charger_1` / `Jumlah Charger_1` / `Jumlah Connector_1`
- `Kapasitas Charger-A` / `Jumlah Charger-A` / `Jumlah Connector-A`
- Sufiks bebas (angka, huruf, simbol) selama konsisten dalam satu kelompok

**Logika upload SPKLU:**

- Lokasi **dicocokkan** berdasarkan nama + provinsi + koordinat (6 desimal)
- Jika koordinat berubah, dicoba cocokkan dengan nama + provinsi + alamat
- Lokasi cocok -> **diperbarui** (rincian charger diganti)
- Lokasi baru -> **ditambahkan**
- Lokasi lain **tidak dihapus**
- Upload file yang sama berulang kali **tidak menambah duplikat**

### 9.2 Format HCS

**Kolom wajib:**

| Kolom            | Keterangan                                                            |
| ---------------- | --------------------------------------------------------------------- |
| `NAMA PELANGGAN` | Diperlukan untuk validasi sheet, **tidak disimpan**                   |
| `MERK KENDARAAN` | Merek/kategori kendaraan                                              |
| `ALAMAT`         | Diperlukan untuk validasi sheet, **tidak disimpan**                   |
| `UID`            | ID unik pelanggan (untuk statistik kualitas saja, **tidak disimpan**) |
| `Latitude`       | Koordinat rumah pelanggan (**tidak disimpan**)                        |
| `Longitude`      | Koordinat rumah pelanggan (**tidak disimpan**)                        |
| `KOTA/KABUPATEN` | Nama kabupaten/kota (dipakai untuk agregasi)                          |

**Logika upload HCS:**

- Setiap baris dengan kabupaten/kota valid -> **dihitung** dan diagregasi per `(wilayah, merek)`
- UID berulang atau kosong -> tetap dihitung (bukan deduplikasi)
- Mode **Ganti** (default): seluruh agregat HCS sebelumnya **diganti** dalam satu transaksi atomik
- Mode **Tambah**: data baru **ditambahkan** ke agregat yang ada; file yang sama tidak bisa ditambahkan dua kali (diproteksi dengan fingerprint SHA-256 file)
- Data pribadi pelanggan (nama, UID, alamat, koordinat) **tidak pernah masuk ke database**

---

## 10. Modul dan File Backend

### `app.py` — Aplikasi Utama (1.125 baris)

File terbesar yang mengandung:

- **Konstanta & lookup**: daftar koordinat representatif 38 kabupaten/kota Jawa Timur (`AREA_CENTERS`), daftar nama ambigu (`AMBIGUOUS`), palet warna pengelola
- **Fungsi parsing & normalisasi**:
  - `normalize_province()` — normalisasi nama provinsi (Jatim -> Jawa Timur, dll.)
  - `normalize_owner()` — normalisasi nama pengelola
  - `normalize_area()` — pendeteksian kabupaten/kota dari teks bebas (menghindari tebakan untuk nama ambigu)
  - `parse_spklu()` — parsing sheet Excel SPKLU
  - `parse_hcs()` — parsing sheet Excel HCS, menghasilkan agregat
  - `safe_num()` — konversi nilai numerik dari string (mendukung format koma/titik Indonesia)
- **UI helpers**: `kpi()`, `popup_spklu()`, `popup_hcs()`, `build_map()`, `empty_fig()`, dll.
- **Autentikasi**: `require_basic_auth()` (Flask `before_request`), `current_user_is_admin()`
- **Layout Dash**: seluruh komponen HTML/Dash yang mendefinisikan tampilan
- **Callbacks Dash**:
  - `update_dashboard()` — memperbarui seluruh konten analitik (27 output)
  - `update_map()` — memperbarui layer peta secara independen
  - `preview_upload()` — validasi Excel sebelum konfirmasi simpan
  - `on_upload()` — eksekusi simpan ke database setelah konfirmasi
  - `access_controls()` — mengatur visibilitas menu berdasarkan role
  - Dan beberapa callback kecil lainnya

### `database.py` — Lapisan Database (495 baris)

- Definisi skema SQLAlchemy (7 tabel)
- `init_db()` — membuat tabel jika belum ada
- `load_data()` — membaca SPKLU, HCS, dan metadata dari MySQL -> DataFrame Pandas
- `save_spklu()` — upsert lokasi SPKLU dengan transaksi atomik + audit log
- `save_hcs()` — simpan/ganti agregat HCS dengan proteksi idempotency
- `save_site_manual()` — tambah/edit lokasi satu per satu oleh admin
- `set_site_active()` — aktifkan/nonaktifkan lokasi
- `adjust_hcs()` — tambah atau koreksi jumlah HCS satu kombinasi wilayah+merek
- `get_site()` / `snapshot_token()` — ambil snapshot lokasi untuk optimistic locking
- `history()` — ambil riwayat perubahan dari `change_log`
- `_lock_writes()` — MySQL row-level lock untuk serialisasi operasi write

### `admin_ui.py` — Panel Administrasi (301 baris)

- `layout()` — definisi UI panel Manajemen Data
- `register()` — mendaftarkan semua callbacks admin ke instance Dash
- Formulir input SPKLU manual dengan peta klik-untuk-koordinat
- Formulir input/koreksi HCS manual
- Tabel inventaris SPKLU (filter, sort, pilih untuk edit)
- Tabel data HCS
- Tabel riwayat perubahan (`change_log`)

### `storytelling.py` — Analisis Naratif (109 baris)

Modul independen (tidak membutuhkan Dash) untuk kalkulasi:

- `compare_areas()` — DataFrame rasio HCS/SPKLU per wilayah
- `comparison_quality()` — diagnostik cakupan data
- `headline_spklu()` — teks ringkasan infrastruktur SPKLU
- `headline_hcs()` — teks ringkasan distribusi HCS
- `headline_ratio()` — teks ringkasan rasio tertinggi
- `insight_hcs_vs_spklu()` — insight perbandingan naratif
- `candidates()` — 5 wilayah prioritas untuk dikaji (berdasarkan rasio dan jumlah HCS)

### `diagnose_db.py` — Diagnostik Koneksi

Script utilitas untuk memverifikasi koneksi database dan melihat jumlah baris tiap tabel. Berguna saat troubleshooting.

```powershell
python backend\diagnose_db.py
```

---

## 11. Alur Data: Dari Upload ke Dashboard

```
File Excel (.xlsx)
       |
       v
  [Browser: dcc.Upload]
       |  (base64 encoded, maks. 20 MB)
       v
  preview_upload() --- validasi & parsing ---> Pratinjau teks di dialog konfirmasi
       |                                               |
       |  User klik "Lanjutkan"                        |
       v                                               v
  on_upload()                                   Batalkan -> tidak ada perubahan
       |
       +-- parse_spklu() atau parse_hcs()
       |       |
       |       v
       |   Data bersih (list of dict / Counter)
       |
       +-- save_spklu() atau save_hcs()
       |       |
       |       +-- _lock_writes()  <- MySQL row lock
       |       +-- Upsert / Replace ke tabel
       |       +-- _mark_updated() <- update timestamp
       |       +-- _audit()        <- tulis ke change_log
       |
       v
  data-version (Store) dinaikkan +1
       |
       v
  Semua callback yang listen ke data-version refresh otomatis
  (update_dashboard, update_map, update_area_options, ...)
       |
       v
  Dashboard ter-update dengan data terbaru
```

---

## 12. Manajemen Data oleh Admin

### Struktur Tab Manajemen Data

**1. Input SPKLU (`spklu-add`)**
- Tambah lokasi SPKLU baru lengkap dengan nama, pengelola, provinsi, kabupaten/kota, alamat, koordinat lat/lon, dan rincian dispenser charger (daya kW, unit, konektor).
- Wajib menyertakan alasan perubahan untuk pencatatan jejak audit.

**2. Edit SPKLU (`spklu-edit`)**
- Pencarian cerdas lokasi SPKLU berdasarkan nama atau ID.
- Pembaruan informasi nama, alamat, wilayah, koordinat, dan konfigurasi charger.
- Toggle status lokasi (Aktif / Nonaktif) dengan alasan perubahan.
- Dilengkapi perlindungan *optimistic concurrency* berbasis token snapshot.

**3. Input HCS (`hcs-add`)**
- Penambahan unit catatan pemasangan Home Charging Services (HCS) baru.
- Pilihan kabupaten/kota (Jawa Timur) dan merek kendaraan (dengan tombol cepat untuk merek populer: Hyundai, Wuling, BYD, Chery, MG, BMW, Tesla, Toyota, Kia).
- Jumlah unit diakumulasikan ke total catatan yang sudah ada di wilayah tersebut.
- Wajib menyertakan alasan penambahan / sumber data.

**4. Edit HCS (`hcs-edit`)**
- Koreksi atau pembaruan total unit catatan HCS terpasang untuk kombinasi wilayah dan merek.
- Dilengkapi tabel pencarian interaktif data HCS dengan tombol "Edit" di setiap baris.
- Tampilan detail item terpilih, jumlah saat ini, dan input jumlah baru serta alasan koreksi.

**5. Upload Excel (`upload`)**
- Upload berkas Excel `.xlsx` untuk data massal SPKLU (Jawa Timur & Bali) dan catatan agregat HCS (mode ganti seluruh agregat atau tambah ke agregat).

**6. Riwayat (`history`)**
- Tabel audit log interaktif yang menampilkan 100 aktivitas transaksi terakhir (waktu, akun pelaksana, dataset, tindakan, target, dan alasan perubahan).

### Fitur Keamanan Data

- **Optimistic locking**: saat admin membuka formulir edit, snapshot lokasi diambil. Jika data berubah oleh admin lain sebelum disimpan, sistem menolak dengan pesan "Data sudah berubah, muat ulang formulir"
- **Idempotency**: setiap operasi write memiliki `request_id` unik. Double-submit tidak menyebabkan data dobel
- **Audit trail lengkap**: setiap perubahan mencatat `before_json` dan `after_json`
- **Nonaktif != hapus**: lokasi yang dinonaktifkan tetap ada di database dan `change_log`, bisa diaktifkan kembali
- **Transaksi atomik**: upload HCS mode "ganti" menghapus data lama dan menulis data baru dalam satu transaksi. Jika gagal, tidak ada data yang berubah (rollback otomatis)

---

## 13. Auto-Refresh Data

Dashboard otomatis membaca ulang data dari MySQL dalam beberapa kondisi:

1. **Interval 60 detik** — browser membaca ulang data terbaru secara berkala (`dcc.Interval`)
2. **Tombol "Muat ulang data"** — refresh manual oleh pengguna
3. **Setelah upload/edit** — `data-version` store dinaikkan, memicu semua callback

> Pembaruan oleh admin di session lain (atau edit langsung via phpMyAdmin) akan terlihat pada
> refresh interval berikutnya, **tanpa perlu reload halaman**.

---

## 14. Definisi Angka, Metrik, dan Rasio

### Definisi SPKLU

| Istilah                 | Definisi                                                                      |
| ----------------------- | ----------------------------------------------------------------------------- |
| **Titik SPKLU**         | Jumlah lokasi (bukan unit charger)                                            |
| **Unit charger**        | Jumlah total unit charger dari seluruh kelompok di lokasi terpilih            |
| **Konektor**            | Jumlah total konektor dari seluruh kelompok di lokasi terpilih                |
| **Daya terpasang (kW)** | Jumlah dari kapasitas_kW x jumlah_unit per kelompok, lalu dijumlah per lokasi |

### Filter Daya

Filter daya memilih **lokasi yang memiliki setidaknya satu charger** dalam rentang daya tersebut. KPI, popup, dan grafik tetap menghitung **seluruh charger** di lokasi terpilih (termasuk charger dari kelompok daya lain).

**Rentang filter:**

- `<= 22 kW` — AC charger
- `> 22-50 kW` — DC fast charger entry
- `> 50-100 kW` — DC fast charger
- `> 100 kW` — DC ultra-fast charger

### Definisi Catatan HCS

| Istilah          | Definisi                                                                 |
| ---------------- | ------------------------------------------------------------------------ |
| **Catatan HCS**  | Setiap baris dalam file HCS dengan kabupaten/kota yang valid             |
| **UID**          | Hanya untuk statistik kualitas upload; **bukan** kunci deduplikasi       |
| **UID berulang** | UID yang muncul lebih dari sekali dalam satu file (tetap dihitung semua) |

### Definisi Rasio

```
Rasio wilayah = Jumlah catatan HCS / Jumlah titik SPKLU terpetakan
```

**Catatan penting:**

- Rasio menggunakan **semua** SPKLU Jawa Timur (tidak mengikuti filter pengelola/kapasitas peta)
- Filter wilayah analisis memengaruhi distribusi HCS, rasio, dan daftar kajian
- Rasio **kosong/tidak dihitung** jika HCS atau SPKLU tidak tersedia untuk wilayah tersebut
- Rasio tinggi bukan otomatis keputusan pembangunan SPKLU

---

## 15. Privasi dan Perlindungan Data

Aplikasi ini dirancang dengan prinsip **privacy-by-design** untuk data HCS:

1. **Tidak ada PII (Personally Identifiable Information) yang tersimpan**: Nama pelanggan, UID, alamat rumah, dan koordinat rumah dibaca dari Excel hanya untuk validasi baris, lalu **dibuang**. Hanya jumlah per (kabupaten/kota, merek) yang disimpan.

2. **Peta HCS tidak menunjukkan lokasi pelanggan**: Lingkaran ungu di peta merepresentasikan **koordinat representatif pusat kabupaten/kota** (hardcoded di `AREA_CENTERS`), bukan lokasi pelanggan.

3. **Akses terbatas**: Seluruh halaman dilindungi dengan autentikasi. Tidak ada data yang bisa diakses tanpa login.

4. **Untuk hosting**: wajib menggunakan HTTPS dan akses jaringan yang dibatasi (VPN atau IP whitelist).

---

## 16. Pengujian (Testing)

Tersedia 6 file test yang bisa dijalankan secara independen:

```powershell
cd backend

# Tes parsing Excel dan normalisasi wilayah (tidak butuh database/Dash)
python test_processing.py

# Tes logika kalkulasi rasio dan headline
python test_storytelling.py

# Tes event refresh (tombol dan interval)
python test_refresh.py

# Tes operasi database (SQLite in-memory sebagai test double)
python test_database.py

# Tes fungsional UI admin (manajemen SPKLU dan HCS)
python test_admin.py

# Tes regresi lengkap: autentikasi, upload, filter, dashboard, peta
python test_revision.py
```

> **Catatan:** `test_database.py` dan `test_revision.py` menggunakan **SQLite in-memory**
> sebagai test double (pengganti MySQL). Ini hanya untuk pengujian — aplikasi produksi
> selalu menggunakan MySQL.

### Cakupan Test

| File Test              | Yang Diuji                                                                                                           |
| ---------------------- | -------------------------------------------------------------------------------------------------------------------- |
| `test_processing.py`   | Normalisasi wilayah, parsing angka, parse SPKLU dan HCS dari Excel                                                   |
| `test_storytelling.py` | Rasio Jatim, nilai nol/tak terdefinisi, headline, kandidat kajian                                                    |
| `test_refresh.py`      | Event tombol refresh, interval, status data MySQL                                                                    |
| `test_database.py`     | Pembuatan tabel, insert, reload, audit log, rollback atomik                                                          |
| `test_admin.py`        | Tambah/edit SPKLU manual, penolakan stale-write, upload berulang, autorisasi, serialisasi callback                   |
| `test_revision.py`     | Autentikasi, pratinjau tanpa simpan, penolakan viewer, upload konfirmasi, filter, dashboard, peta, koordinat invalid |

---

## 17. Deploy ke Produksi

### Linux dengan Gunicorn (Direkomendasikan)

```bash
pip install -r requirements.txt
gunicorn app:server --bind 0.0.0.0:8050 --workers 2 --threads 4
```

### Konfigurasi yang Disarankan untuk Produksi

- **HTTPS**: Tempatkan di balik Nginx atau Apache sebagai reverse proxy dengan SSL/TLS
- **Akses terbatas**: Batasi akses ke IP internal / VPN saja (jangan buka port 8050 ke internet)
- **Kredensial kuat**: Gunakan password acak minimal 16 karakter untuk admin dan viewer
- **Database terpisah**: Hindari menggunakan user `root` MySQL; buat user aplikasi khusus (lihat `setup_mysql.sql`)
- **TLS ke MySQL**: Untuk database di server berbeda, aktifkan `DB_SSL_CA` di `.env`
- **Environment variables**: Di produksi, lebih aman menyimpan kredensial di environment variables sistem daripada file `.env`

### Contoh Konfigurasi Nginx (Reverse Proxy)

```nginx
server {
    listen 443 ssl;
    server_name geoev-insight.internal.company.com;

    ssl_certificate /etc/ssl/certs/internal.pem;
    ssl_certificate_key /etc/ssl/private/internal.key;

    location / {
        proxy_pass http://127.0.0.1:8050;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
}
```

---

## 18. Batasan Aplikasi

Fitur-fitur berikut **belum tersedia** dalam versi ini:

| Keterbatasan                           | Keterangan                                                                  |
| -------------------------------------- | --------------------------------------------------------------------------- |
| Marker clustering                      | Banyak titik dekat bisa tumpang tindih di zoom rendah                       |
| Polygon batas administratif            | Peta tidak menampilkan batas kabupaten/kota; hanya titik dan lingkaran      |
| Standardisasi merek kendaraan otomatis | Merek/model/label pemasang mengikuti label di file sumber tanpa normalisasi |
| Edit/hapus lokasi melalui UI Viewer    | Hanya Admin yang dapat mengubah data                                        |
| Rollback data oleh pengguna            | Riwayat audit ada, tetapi pemulihan ke versi sebelumnya harus manual        |
| SSO / LDAP                             | Hanya mendukung HTTP Basic Auth dengan username/password statis             |
| Data utilisasi charger real-time       | Tidak ada integrasi dengan sistem monitoring SPKLU                          |
| Model keputusan pembangunan            | Rasio adalah indikator awal; bukan rekomendasi pembangunan                  |
| Dukungan wilayah Bali untuk HCS        | HCS dan analisis rasio hanya mencakup Jawa Timur                            |
| Pengenalan kabupaten/kota Bali         | Kolom `KOTA/KABUPATEN` di Excel SPKLU Bali tidak diproses                   |

---

## Referensi Cepat

### URL Lokal

```
http://127.0.0.1:8050
```

### Menjalankan Aplikasi

```powershell
cd backend
python app.py
```

### Mendiagnosis Koneksi Database

```powershell
cd backend
python diagnose_db.py
```

### Menjalankan Semua Test

```powershell
cd backend
python test_processing.py
python test_storytelling.py
python test_refresh.py
python test_database.py
python test_admin.py
python test_revision.py
```

---

_Dokumentasi dibuat untuk GeoEV Insight — Dashboard internal infrastruktur EV PLN ES, Jawa Timur-Bali._
