# GeoEV Insight — Dokumentasi Lengkap & Panduan Sistem

> **GeoEV Insight** adalah platform dashboard analitik geospasial berbasis web modern yang dirancang untuk memetakan, menganalisis, dan mengelola infrastruktur pengisian kendaraan listrik (EV) di wilayah **Jawa Timur dan Bali**. Platform ini menggabungkan data **Stasiun Pengisian Kendaraan Listrik Umum (SPKLU)** dengan catatan agregat **Home Charging Services (HCS)** guna mendukung perencanaan penempatan fasilitas pengisian secara terukur dan tepat sasaran.

---

## Daftar Isi

1. [Tentang GeoEV Insight (Untuk Orang Awam)](#1-tentang-geoev-insight-untuk-orang-awam)
   - [Latar Belakang & Masalah yang Diselesaikan](#11-latar-belakang--masalah-yang-diselesaikan)
   - [Tujuan & Manfaat Utama](#12-tujuan--manfaat-utama)
   - [Siapa Saja Penggunanya?](#13-siapa-saja-penggunanya)
2. [Konsep Kunci & Glosarium Istilah](#2-konsep-kunci--glosarium-istilah)
   - [SPKLU vs. HCS](#21-spklu-vs-hcs)
   - [Kategori Daya Pengisian (kW)](#22-kategori-daya-pengisian-kw)
   - [Prinsip Perlindungan Privasi (Privacy by Design)](#23-prinsip-perlindungan-privasi-privacy-by-design)
   - [Rumus & Makna Rasio HCS / SPKLU](#24-rumus--makna-rasio-hcs--spklu)
3. [Panduan Penggunaan Seluruh Halaman](#3-panduan-penggunaan-seluruh-halaman)
   - [1. Halaman Masuk (Login)](#31-halaman-masuk-login)
   - [2. Peta & Infrastruktur (`/peta`)](#32-peta--infrastruktur-peta)
   - [3. Distribusi HCS (`/hcs`)](#33-distribusi-hcs-hcs)
   - [4. Perbandingan Wilayah (`/compare`)](#34-perbandingan-wilayah-compare)
   - [5. Kajian Wilayah Prioritas (`/kajian`)](#35-kajian-wilayah-prioritas-kajian)
   - [6. Manajemen Data (`/admin`) — Admin & Super Admin](#36-manajemen-data-admin--khusus-admin--super-admin)
   - [7. Manajemen Pengguna (`/admin/users`) — Admin & Super Admin](#37-manajemen-pengguna-adminusers--khusus-admin--super-admin)
   - [8. Bilah Atas (TopBar) & Pengaturan Profil](#38-bilah-atas-topbar--pengaturan-profil)
4. [Format Data & Tata Cara Upload Excel](#4-format-data--tata-cara-upload-excel)
   - [Format Berkas Excel SPKLU](#41-format-berkas-excel-spklu)
   - [Format Berkas Excel HCS](#42-format-berkas-excel-hcs)
   - [Mekanisme Proteksi Upload & Audit Trail](#43-mekanisme-proteksi-upload--audit-trail)
5. [Arsitektur Sistem & Spesifikasi Teknis](#5-arsitektur-sistem--spesifikasi-teknis)
   - [Diagram Arsitektur Full-Stack](#51-diagram-arsitektur-full-stack)
   - [Struktur Direktori Proyek](#52-struktur-direktori-proyek)
   - [Skema Basis Data (Database Tables)](#53-skema-basis-data-database-tables)
   - [Sistem Autentikasi & Keamanan (JWT & RBAC)](#54-sistem-autentikasi--keamanan-jwt--rbac)
   - [Daftar Endpoint REST API Lengkap](#55-daftar-endpoint-rest-api-lengkap)
6. [Panduan Instalasi & Menjalankan Aplikasi](#6-panduan-instalasi--menjalankan-aplikasi)
   - [Prasyarat Perangkat Lunak](#61-prasyarat-perangkat-lunak)
   - [Langkah 1: Setup Backend Python](#62-langkah-1-setup-backend-python)
   - [Langkah 2: Setup Frontend Next.js](#63-langkah-2-setup-frontend-nextjs)
   - [Langkah 3: Akses Sistem & Akun Bawaan](#64-langkah-3-akses-sistem--akun-bawaan)
7. [Pengujian Otomatis (Testing)](#7-pengujian-otomatis-testing)
8. [Tanya Jawab & Pemecahan Masalah (FAQ & Troubleshooting)](#8-tanya-jawab--pemecahan-masalah-faq--troubleshooting)

---

## 1. Tentang GeoEV Insight (Untuk Orang Awam)

### 1.1 Latar Belakang & Masalah yang Diselesaikan

Pertumbuhan kendaraan listrik (Electric Vehicle / EV) di Indonesia meningkat pesat, terutama di provinsi Jawa Timur dan Bali. Pemilik mobil listrik umumnya mengisi daya baterai mereka dengan dua cara:
1. **Di Rumah (Home Charging / HCS)**: Memasang charger khusus di rumah untuk pengisian harian semalaman.
2. **Di Tempat Umum (SPKLU)**: Menggunakan stasiun pengisian publik yang disediakan PLN maupun pihak swasta di rest area tol, mall, kantor pemerintahan, atau pusat kota saat bepergian.

**Tantangan Nyata di Lapangan:**
* Pembangunan satu unit SPKLU membutuhkan investasi daya listrik besar, pengadaan mesin dispenser, serta lokasi strategis.
* Jika titik SPKLU dibangun sembarangan tanpa mengetahui di mana saja pemilik mobil listrik tinggal dan berkendara, SPKLU tersebut bisa menjadi sepi (idle), sementara di kabupaten lain pengguna mobil listrik mengantre atau bahkan kesulitan menemukan charger publik.
* Sebelumnya, data lokasi SPKLU dan data pelanggan Home Charging tersebar di berbagai file spreadsheet Excel terpisah, sehingga pimpinan dan tim perencana kesulitan melihat gambaran utuh wilayah mana yang sudah tercukupi dan wilayah mana yang masih sangat kekurangan charger.

### 1.2 Tujuan & Manfaat Utama

**GeoEV Insight** hadir sebagai *jembatan data* yang menyatukan kedua sisi tersebut ke dalam satu dashboard interaktif:
* **Melihat Peta Persebaran**: Mengetahui dengan tepat titik SPKLU aktif dan konsentrasi pemilik mobil listrik rumahan (HCS) di tiap kabupaten/kota.
* **Mendeteksi Wilayah Defisit**: Menghitung rasio perbandingan antara jumlah mobil listrik rumahan dengan ketersediaan SPKLU.
* **Rekomendasi Cerdas Kajian Lokasi Baru**: Secara otomatis menyaring 5 kabupaten/kota yang paling mendesak untuk dikaji penambahan SPKLU baru.
* **Navigasi Langsung**: Setiap titik SPKLU dan wilayah HCS terhubung langsung ke **Google Maps** untuk memandu tim lapangan mengecek lokasi secara fisik.
* **Manajemen Data Terpusat**: Memudahkan admin menginput data baru, mengoreksi data, mengunggah Excel massal, dan mencatat riwayat audit perubahan secara aman.

### 1.3 Siapa Saja Penggunanya?

Aplikasi memiliki 3 tingkatan hak akses pengguna (*Role*):
1. **Super Admin**: Pimpinan sistem / pengelola utama IT. Memiliki hak penuh untuk mengelola pengguna (tambah, edit status, ubah password, hapus user), mengelola data SPKLU/HCS, dan mengunggah Excel.
2. **Admin**: Tim operasional data infrastruktur EV. Dapat menginput, mengedit, mengaktifkan/menonaktifkan SPKLU, mengoreksi data HCS, mengunggah Excel, dan mengelola user.
3. **Viewer**: Tim manajemen, perencana, analis, atau pengambil keputusan. Dapat melihat peta, menjelajah grafik, memfilter analitik, melihat kajian wilayah, dan mengunduh laporan Excel, namun **tidak dapat** mengubah atau menghapus data inventaris.

---

## 2. Konsep Kunci & Glosarium Istilah

Agar tidak bingung saat membaca grafik dan tabel di dalam dashboard, pahami istilah penting berikut:

### 2.1 SPKLU vs. HCS

| Karakteristik | SPKLU (Stasiun Pengisian Publik) | HCS (Home Charging Services) |
| :--- | :--- | :--- |
| **Kepanjangan** | Stasiun Pengisian Kendaraan Listrik Umum | Home Charging Services / Station |
| **Sifat Lokasi** | Publik (bisa dipakai siapa saja) | Privat (terpasang di rumah pelanggan) |
| **Penyedia** | PLN, Mitra, Swasta (Shell, Voltron, Starvo, dll.) | Layanan pasang baru / tambah daya PLN |
| **Cakupan Wilayah** | Jawa Timur dan Bali | Khusus Jawa Timur |
| **Bentuk Visual Peta** | Titik pin lokasi dengan warna pengelola | Lingkaran ungu representatif kabupaten/kota |
| **Fungsi Utama** | Tempat *charging* cepat saat perjalanan | Indikator populasi riil mobil listrik di suatu kota |

### 2.2 Kategori Daya Pengisian (kW)

Daya listrik charger diukur dalam satuan **kiloWatt (kW)**:
* **Standard / AC Charging ($\le$ 22 kW)**: Pengisian arus bolak-balik (AC), umumnya membutuhkan waktu 4–8 jam untuk mengisi baterai mobil hingga penuh. Cocok untuk kantor atau tempat parkir jangka panjang.
* **Medium / DC Fast Entry (> 22 – 50 kW)**: Pengisian arus searah (DC), mengisi mobil dalam waktu 1–2 jam.
* **Fast Charging (> 50 – 100 kW)**: Pengisian cepat DC, mengisi baterai mobil 20% ke 80% dalam waktu 30–60 menit. Umum berada di mall atau rest area.
* **Ultra-Fast Charging (> 100 kW)**: Pengisian daya sangat tinggi (150 kW s/d 200+ kW), baterai mobil generasi baru dapat terisi dalam 15–25 menit.

> **Perbedaan Titik, Unit, dan Konektor:**
> * **1 Titik SPKLU** adalah 1 lokasi fisik (misal: *SPKLU PLN UP3 Surabaya Selatan*).
> * Di lokasi tersebut ada **2 Unit Dispenser** (mesin charger).
> * Setiap mesin dispenser memiliki kabel colokan pengisian, misal total ada **3 Konektor** (misal: CCS2, CHAdeMO, dan Type 2).

### 2.3 Prinsip Perlindungan Privasi (Privacy by Design)

> [!IMPORTANT]
> **Data Pribadi Pelanggan HCS Tidak Pernah Disimpan!**
> Untuk mematuhi regulasi perlindungan data pribadi konsumen (UU PDP):
> 1. Nama pelanggan, nomor identitas (UID), alamat rumah detail, dan titik GPS koordinat rumah pelanggan **langsung dihapus secara permanen** saat proses pembacaan file Excel selesai.
> 2. Basis data GeoEV Insight **hanya menyimpan angka jumlah agregat** per kombinasi kabupaten/kota dan merek mobil listrik (contoh: *Kota Malang, Hyundai, 45 unit*).
> 3. Titik lingkaran ungu pada peta berada di **koordinat representatif pusat kabupaten/kota** (bukan rumah pelanggan).

### 2.4 Rumus & Makna Rasio HCS / SPKLU

Rasio perbandingan dihitung menggunakan rumus:

$$\text{Rasio Wilayah} = \frac{\text{Jumlah Catatan Unit HCS di Wilayah Tersebut}}{\text{Jumlah Titik Lokasi SPKLU Terpetakan di Wilayah Tersebut}}$$

**Contoh Kasus:**
* Di **Kabupaten Sidoarjo**, terdata **240 unit HCS**, dan hanya ada **2 titik SPKLU**.
* Maka Rasio = $240 / 2 = \mathbf{120,0}$.
* Artinya, ada sekitar 120 mobil listrik rumahan yang harus berbagi atau bergantung pada 1 SPKLU publik jika mereka membutuhkan pengisian di luar rumah.
* Semakin **tinggi angka rasio**, semakin mendesak wilayah tersebut untuk dikaji penambahan SPKLU publik baru!

---

## 3. Panduan Penggunaan Seluruh Halaman

### 3.1 Halaman Masuk (Login)

Halaman pertama saat membuka sistem di alamat peramban `http://localhost:3000/login`.

1. Masukkan **Username** dan **Password**.
2. Klik tombol **Masuk ke GeoEV Insight**.
3. Sistem memverifikasi kredensial menggunakan enkripsi token JWT yang aman.
4. Pengguna langsung diarahkan ke halaman utama **Peta & Infrastruktur**.

---

### 3.2 Peta & Infrastruktur (`/peta`)

Halaman utama yang menyajikan peta interaktif seluruh sebaran charger dan mobil listrik di Jawa Timur dan Bali.

```
┌─────────────────────────────────────────────────────────────────────────────┐
│ 🔍 Bilah Pencarian Cerdas & Filter (Provinsi, Pengelola, Daya, Kab/Kota)    │
├─────────────────────────────────────────┬───────────────────────────────────┤
│                                         │  📌 KARTU DETAIL LOKASI / HCS     │
│             PETA INTERAKTIF             │  - Nama / Wilayah + Status        │
│          (Leaflet OpenStreetMap)        │  - 3 Kotak Statistik Kunci        │
│                                         │  - Tabel Rincian Charger/Mobil    │
│  🔵 Titik SPKLU PLN                     │  - Alamat & Koordinat GPS         │
│  🟡 Titik SPKLU Non-PLN                 │  - 📋 Tombol Salin GPS            │
│  🟣 Lingkaran Sebaran HCS               │  - 🚗 Tombol Buka di Google Maps  │
│  🔘 Jangkauan Buffer 5 km               │                                   │
├─────────────────────────────────────────┴───────────────────────────────────┤
│  ⚡ 4 KARTU KPI: Titik SPKLU | Unit Charger | Konektor | Total Daya (kW)    │
├─────────────────────────────────────────────────────────────────────────────┤
│  📊 PANEL GRAFIK ANALITIK: Pangsa Pengelola, Kapasitas Daya, Top 10 Lokasi  │
├─────────────────────────────────────────────────────────────────────────────┤
│  📋 TABEL DATA SPKLU: Lengkap dengan fitur filter, sortir, dan unduh Excel  │
└─────────────────────────────────────────────────────────────────────────────┘
```

#### Fitur & Cara Penggunaan:
1. **Memilih Layer Tampilan Peta**:
   * Tombol **SPKLU**: Menampilkan titik-titik stasiun pengisian.
   * Tombol **HCS**: Menampilkan lingkaran persebaran mobil listrik rumahan.
   * Tombol **Semua**: Menampilkan titik SPKLU dan lingkaran HCS secara bersamaan.
2. **Pencarian Cerdas (Autocomplete)**:
   * Ketik nama SPKLU (contoh: *Rest Area 725A*) atau nama wilayah (contoh: *Surabaya*).
   * Kotak rekomendasi akan menampilkan daftar SPKLU dan wilayah HCS yang cocok. Klik salah satu untuk langsung menyorot dan membuka detailnya.
3. **Melihat Jangkauan Layanan (Buffer 5 km)**:
   * Klik tombol **⚙ Jangkauan 5 km** di atas peta. Peta akan menampilkan lingkaran radius jangkauan 5 km di sekeliling setiap SPKLU untuk melihat area yang sudah terlayani pengisian.
4. **Interaksi Titik SPKLU**:
   * Klik pada salah satu titik SPKLU (titik biru PLN atau kuning Non-PLN).
   * Peta akan menampilkan popup ringkas dan kartu **Detail Lokasi** di sebelah kanan peta akan terisi lengkap dengan:
     * Nama SPKLU dan status (Aktif/Nonaktif).
     * 3 Kotak ringkasan: Daya total (kW), Jumlah Unit charger, dan Total Konektor.
     * Tabel rincian per dispenser daya.
     * Alamat fisik dan koordinat GPS (dengan tombol **GPS** untuk menyalin koordinat ke clipboard).
     * Tombol **"Buka di Google Maps →"** yang langsung membuka petunjuk arah berkendara ke lokasi SPKLU tersebut.
5. **Interaksi Titik HCS (Home Charging)**:
   * Klik pada salah satu lingkaran ungu wilayah HCS.
   * Kartu di samping peta otomatis berganti menjadi **Detail Wilayah HCS**:
     * Nama kabupaten/kota dan badge total unit HCS.
     * 3 Kotak ringkasan: Total HCS, Merek Mobil Terbanyak (Top Brand), dan Jumlah Variasi Merek EV.
     * Tabel rincian mobil listrik per merek (nama merek, jumlah unit, dan persentase porsi pasar di wilayah tersebut).
     * Koordinat representatif wilayah (dengan tombol salin GPS).
     * Tombol **"Petunjuk Arah Google Maps (Wilayah ...) →"**.
6. **Tombol "Pusatkan Peta"**:
   * Terletak di sudut kanan bawah peta. Klik untuk mengembalikan posisi zoom dan pandangan peta ke posisi awal Jawa Timur & Bali serta menghapus pilihan yang sedang aktif.
7. **Panel Grafik & Tabel Data**:
   * Di bawah peta terdapat 4 KPI ringkasan yang otomatis beradaptasi dengan filter yang dipilih.
   * Buka panel grafik untuk menganalisis perbandingan pengelola PLN vs swasta, kelompok kapasitas charger, dan 10 SPKLU dengan daya terbesar.
   * Tabel data di bagian bawah memungkinkan Anda mencari baris tertentu dan mengekspor hasilnya ke format Excel (`.xlsx`) atau `.csv`.

---

### 3.3 Distribusi HCS (`/hcs`)

Halaman ini berfokus pada analisis mendalam mengenai adopsi mobil listrik di kalangan masyarakat Jawa Timur melalui data pemasangan Home Charging.

1. **Ringkasan KPI HCS**:
   * **Total Unit HCS**: Jumlah seluruh instalasi charger rumahan yang terdata di Jawa Timur.
   * **Wilayah Terdata**: Jumlah kabupaten/kota yang telah memiliki catatan HCS.
   * **Merek Paling Populer**: Merek mobil listrik dengan populasi terbesar (misal: *WULING* atau *HYUNDAI*).
2. **Grafik Batang Sebaran Wilayah**:
   * Menampilkan peringkat kabupaten/kota dengan jumlah mobil listrik rumahan terbanyak hingga terendah.
   * Kota Surabaya, Kabupaten Sidoarjo, dan Kota Malang umumnya menempati urutan teratas.
3. **Diagram Lingkaran Komposisi Merek (Market Share EV)**:
   * Memperlihatkan persentase kepemilikan mobil listrik berdasarkan merek produsen (*Wuling, Hyundai, BYD, Chery, MG, BMW, Tesla, Toyota, Kia, dll.*).
4. **Tabel Data Agregat**:
   * Tabel rinci per baris kabupaten/kota dan merek yang dapat disortir dan diekspor.

---

### 3.4 Perbandingan Wilayah (`/compare`)

Halaman ini menyajikan perhitungan komparasi antara ketersediaan charger umum (SPKLU) dengan banyaknya populasi mobil listrik (HCS) di tiap kabupaten/kota Jawa Timur.

1. **Grafik Peringkat Rasio HCS/SPKLU**:
   * Mengurutkan daerah dengan beban charger tertinggi.
   * Bar yang menjulang tinggi menunjukkan bahwa daerah tersebut memiliki banyak mobil listrik tetapi fasilitas SPKLU publiknya sangat minim.
2. **Tabel Audit & Status Data Wilayah**:
   * **Dapat Dihitung**: Wilayah memiliki data HCS sekaligus titik SPKLU terpetakan.
   * **SPKLU Belum Terpetakan**: Wilayah sudah memiliki pengguna mobil listrik (HCS), namun belum ada satupun SPKLU publik yang tercatat di sistem (prioritas darurat pembangunan!).
   * **Data HCS Belum Tersedia**: Wilayah memiliki SPKLU tetapi belum ada catatan pelanggan HCS terdata.
3. **Tombol Ekspor Analisis**:
   * Unduh tabel perbandingan lengkap ke format Excel untuk keperluan rapat dan pelaporan manajemen.

---

### 3.5 Kajian Wilayah Prioritas (`/kajian`)

Halaman pendukung keputusan (*Decision Support System*) yang secara cerdas merumuskan rekomendasi penambahan fasilitas pengisian baru.

1. **Top 5 Wilayah Kandidat Kajian SPKLU Baru**:
   * Sistem memilih 5 kabupaten/kota teratas berdasarkan rasio HCS/SPKLU tertinggi dan volume populasi EV.
   * Menampilkan kartu rekomendasi lengkap dengan estimasi beban, persentase mobil listrik yang belum terlayani secara ideal, dan saran teknis kapasitas charger yang disarankan (misal: penempatan DC Fast Charger di pusat komersial).
2. **Daftar Wilayah Tanpa SPKLU (Unserved Areas)**:
   * Menyoroti kabupaten yang sudah memiliki mobil listrik tetapi masih nol unit SPKLU publik.
3. **Narasi Insight Otomatis**:
   * Rangkuman bahasa manusia yang siap disalin untuk bahan pertimbangan nota dinas perencanaan infrastruktur.

---

### 3.6 Manajemen Data (`/admin`) — Khusus Admin & Super Admin

Pusat kendali operasional data untuk menjaga agar informasi di peta dan dashboard selalu mutakhir (*up-to-date*).

Tersedia 6 tab kerja:
1. **Input SPKLU (`spklu-add`)**:
   * Menambah lokasi SPKLU baru.
   * Isi nama lokasi, pengelola (PLN / Non-PLN), provinsi (Jawa Timur / Bali), kabupaten/kota, alamat lengkap, dan titik koordinat Latitude/Longitude.
   * Tambahkan kelompok charger: kapasitas daya per unit (kW), jumlah unit mesin, dan jumlah konektor colokan.
   * Wajib menuliskan alasan penambahan data untuk keperluan audit trail.
2. **Edit SPKLU (`spklu-edit`)**:
   * Cari SPKLU yang sudah terdaftar berdasarkan nama atau ID.
   * Ubah informasi alamat, koordinat, maupun rincian dispenser charger.
   * **Toggle Status Aktif/Nonaktif**: Jika ada SPKLU yang sedang rusak atau dalam pemeliharaan berkala, admin dapat menonaktifkannya sementara dengan menyertakan alasan. SPKLU yang nonaktif tidak akan muncul di peta publik, namun datanya tidak hilang.
3. **Input HCS (`hcs-add`)**:
   * Menambah unit catatan Home Charging baru tanpa perlu mengunggah file Excel penuh.
   * Pilih kabupaten/kota dan periksa/sesuaikan titik koordinat wilayah (Latitude & Longitude) yang otomatis terisi posisi pusat wilayah (disertai tombol reset default).
   * Ketik atau pilih merek kendaraan (tersedia tombol cepat merek populer: *HYUNDAI, WULING, BYD, CHERY, MG, BMW, TESLA, TOYOTA, KIA*).
   * Masukkan jumlah unit tambahan dan alasan pembaruan untuk catatan audit.
4. **Edit & Koreksi HCS (`hcs-edit`)**:
   * Mengoreksi atau memperbarui angka total catatan HCS yang sudah tersimpan.
   * Dilengkapi tabel pencarian interaktif untuk menemukan baris wilayah dan merek yang ingin diperbaiki.
   * Masukkan angka total baru yang benar (atau masukkan `0` jika ingin menghapus catatan untuk kategori tersebut).
5. **Upload Excel (`upload`)**:
   * Mengunggah file spreadsheet `.xlsx` resmi PLN untuk memperbarui data ribuan baris sekaligus dalam hitungan detik.
   * Panel upload SPKLU dan panel upload HCS terpisah rapi dengan instruksi kolom yang jelas.
6. **Riwayat Perubahan (`history`)**:
   * Catatan log audit interaktif yang merekam 100 aktivitas terakhir: waktu kejadian, nama akun admin yang mengeksekusi, jenis tindakan (*tambah, edit, ubah status, upload*), target lokasi, dan alasan perubahannya.

---

### 3.7 Manajemen Pengguna (`/admin/users`) — Khusus Admin & Super Admin

Halaman untuk mengatur siapa saja yang berhak masuk ke dalam sistem GeoEV Insight.

```
┌────────────────────────────────────────────────────────────────────────┐
│  ADMIN > Manajemen User                         [ + Tambah User ]      │
├────────────────────────────────────────────────────────────────────────┤
│  Daftar Pengguna (3)                                                   │
│  USERNAME   NAMA LENGKAP   ROLE          STATUS     DIBUAT     AKSI    │
│  admin      Admin          Super Admin   Aktif      03/11/26   ✏️ 🔑 🗑️ │
│  viewer     Viewer         Viewer        Aktif      03/11/26   ✏️ 🔑 🗑️ │
│  zaki       Faydzaki       Admin         Aktif      04/11/26   ✏️ 🔑 🗑️ │
└────────────────────────────────────────────────────────────────────────┘
```

#### Fitur & Langkah Operasional:
1. **Melihat Daftar Pengguna**:
   * Memeriksa seluruh akun yang terdaftar beserta role (*Super Admin, Admin, Viewer*) dan status akun (*Aktif* / *Nonaktif*).
2. **Menambah User Baru**:
   * Klik tombol **+ Tambah user**.
   * Masukkan username, nama lengkap, password (minimal 6–8 karakter), dan pilih role yang sesuai.
   * Klik **Simpan**. Password disimpan dengan enkripsi searah berstandar industri (*bcrypt*).
3. **Mengedit Profil & Status Pengguna**:
   * Klik ikon pensil (**✏️**) di samping baris pengguna.
   * Anda dapat mengganti nama tampilan, mengubah role, atau menonaktifkan akun pengguna tersebut jika karyawan sudah tidak bertugas.
4. **Mereset / Mengubah Password Pengguna**:
   * Klik ikon kunci (**🔑**) untuk menetapkan password baru bagi pengguna yang lupa kata sandi.
5. **Menghapus Pengguna dengan Pop-up Konfirmasi**:
   * Klik ikon tempat sampah (**🗑️**).
   * Sistem akan memunculkan dialog pop-up modal modern: **"Apakah Anda Yakin? Hapus user '[username]'? Tindakan ini tidak dapat dibatalkan."**
   * Klik **Batal** untuk membatalkan, atau klik tombol merah **Hapus Pengguna** untuk mengeksekusi penghapusan akun.

---

### 3.8 Bilah Atas (TopBar) & Pengaturan Profil

Bilah navigasi atas selalu hadir di semua halaman dashboard:
* **Jalur Halaman (Breadcrumbs)**: Menunjukkan posisi halaman yang sedang aktif (contoh: `GeoEV > Manajemen User`).
* **Tombol "Muat Ulang"**: Memperbarui (*re-fetch*) data dashboard secara manual dari server kapan saja tanpa memuat ulang seluruh peramban.
* **Menu Profil Pengguna**:
  * Menampilkan inisial avatar, nama pengguna, dan lencana role aktif.
  * **Ubah Password**: Klik pada profil untuk membuka pop-up penggantian password akun Anda sendiri (memerlukan password lama dan konfirmasi password baru).
  * **Keluar dari Sesi (Logout)**: Menghapus token otentikasi dan mengembalikan Anda ke halaman login secara aman.

---

## 4. Format Data & Tata Cara Upload Excel

Bagi staf data yang bertugas menyiapkan file Excel untuk diunggah ke sistem, berikut panduan spesifikasi berkas yang harus dipenuhi:

### 4.1 Format Berkas Excel SPKLU

* Format file: Microsoft Excel OpenXML Spreadsheet (`.xlsx`). Ukuran maksimal: **20 MB**.
* Sistem memilih sheet data secara otomatis berdasarkan keberadaan kolom wajib berikut:

| Nama Kolom di Excel | Status | Penjelasan & Format Nilai |
| :--- | :--- | :--- |
| `Nama` | **Wajib** | Nama resmi lokasi SPKLU (contoh: *SPKLU PLN UID Jatim*) |
| `Alamat` | **Wajib** | Alamat jalan atau keterangan lokasi fisik |
| `PLN atau NON PLN` | **Wajib** | Diisi `PLN` atau `Non-PLN` (jika kosong/lainnya, terbaca *Tidak diketahui*) |
| `Provinsi` | **Wajib** | Diisi `Jawa Timur` atau `Bali` (variasi *Jatim / East Java* dikenali otomatis) |
| `Latitude` | **Wajib** | Angka koordinat lintang desimal (rentang: `-9.8` s/d `-5.3`) |
| `Longitude` | **Wajib** | Angka koordinat bujur desimal (rentang: `110.0` s/d `116.5`) |
| `KOTA/KABUPATEN` | Opsional | Nama kabupaten/kota eksplisit di Jawa Timur (misal: *Kota Malang*) |
| `ID` | Opsional | ID SPKLU yang sudah ada (kosongkan jika menambah lokasi baru) |

**Kelompok Kolom Charger (Minimal 1 kelompok):**
Setiap mesin charger diidentifikasi dengan sufiks yang sama persis:
* `Kapasitas Charger_1`, `Jumlah Charger_1`, `Jumlah Connector_1`
* `Kapasitas Charger_2`, `Jumlah Charger_2`, `Jumlah Connector_2` *(opsional)*

> **Pencegahan Duplikasi SPKLU:**
> Saat mengunggah file SPKLU baru, sistem mencocokkan lokasi berdasarkan nama, provinsi, dan koordinat GPS. Lokasi yang sudah ada akan diperbarui datanya (*upsert*), lokasi baru akan ditambahkan, dan lokasi lain tidak akan terhapus. Mengunggah file yang sama berkali-kali **tidak akan menimbulkan duplikat**.

---

### 4.2 Format Berkas Excel HCS

* Format file: Microsoft Excel OpenXML Spreadsheet (`.xlsx`).
* Kolom wajib yang harus tersedia di sheet data HCS:

| Nama Kolom di Excel | Keterangan Pemrosesan oleh Sistem |
| :--- | :--- |
| `KOTA/KABUPATEN` | **Dipakai Sistem**: Untuk mengelompokkan data per wilayah Jawa Timur |
| `MERK KENDARAAN` | **Dipakai Sistem**: Merek/tipe mobil listrik (otomatis diubah ke huruf kapital) |
| `NAMA PELANGGAN` | **Dihapus Langsung**: Hanya untuk validasi integritas baris Excel |
| `ALAMAT` | **Dihapus Langsung**: Privasi pelanggan terjamin |
| `UID` | **Dihapus Langsung**: ID meter/pelanggan PLN tidak pernah disimpan |
| `Latitude` | **Dihapus Langsung**: Koordinat rumah pelanggan dibuang |
| `Longitude` | **Dihapus Langsung**: Koordinat rumah pelanggan dibuang |

**Mode Upload HCS:**
* **Mode Ganti (Replace / Default)**: Menghapus data agregat HCS lama dan menggantikannya secara menyeluruh dengan data berkas baru dalam satu transaksi atomik.
* **Mode Tambah (Append)**: Menambahkan angka catatan dari file baru ke atas data yang sudah ada di database. Sistem dilengkapi pelindung *hash SHA-256*, sehingga file yang sama persis tidak akan dapat diunggah ulang dua kali tanpa sengaja.

---

### 4.3 Mekanisme Proteksi Upload & Audit Trail

1. **Pratinjau Sebelum Simpan (Preview Guard)**: File yang di-drop diperiksa terlebih dahulu format kolomnya. Sistem akan menampilkan pratinjau ringkasan baris valid sebelum admin menekan tombol konfirmasi simpan.
2. **Kunci Baris Basis Data (Database Write Lock)**: Menghindari benturan data jika dua admin mengunggah file di detik yang sama.
3. **Audit Log Otomatis**: Setiap proses upload mencatat username admin pengunggah, jumlah baris yang berhasil diproses, stempel waktu WIB, dan snapshot perubahan ke tabel `change_log`.

---

## 5. Arsitektur Sistem & Spesifikasi Teknis

Bagi pengembang perangkat lunak, arsitek sistem, atau auditor teknologi informasi, berikut adalah spesifikasi teknis arsitektur GeoEV Insight:

### 5.1 Diagram Arsitektur Full-Stack

```
                    ┌──────────────────────────────────────────┐
                    │      PERAMBAN PENGGUNA (BROWSER)         │
                    │   Desktop / Laptop / Tablet (Port 3000)  │
                    └────────────────────┬─────────────────────┘
                                         │ HTTP / JSON
                                         ▼
┌────────────────────────────────────────────────────────────────────────────────────────┐
│  FRONTEND: Next.js 14 (App Router) + React 18 + TypeScript + Tailwind CSS               │
│                                                                                        │
│  - Halaman Rute: /login, /peta, /hcs, /compare, /kajian, /admin, /admin/users          │
│  - Komponen Peta: Leaflet.js & React-Leaflet (Tile Peta OpenStreetMap)                 │
│  - Pengelolaan State & Cache: TanStack React Query (@tanstack/react-query v5)          │
│  - Form & Validasi: React Hook Form                                                    │
│  - Komponen UI: Glassmorphism UI, Lucide Icons, ConfirmModal, KpiCard, DataTable       │
│  - API Proxy Handler: src/app/api/[...path]/route.ts (meneruskan request ke port 8050) │
└────────────────────────────────────────┬───────────────────────────────────────────────┘
                                         │ Proxy Internal (Forwarding + Header Strip)
                                         ▼
┌────────────────────────────────────────────────────────────────────────────────────────┐
│  BACKEND: Python 3.9+ Flask REST API (Blueprint /api) di Port 8050                      │
│                                                                                        │
│  - REST API Controller: backend/api.py (JSON Endpoints untuk frontend Next.js)         │
│  - Mesin Analitik & Storytelling: backend/storytelling.py                              │
│  - Lapisan Database ORM: backend/database.py (SQLAlchemy 2.0 Core & PyMySQL)          │
│  - Keamanan & Token: PyJWT (JSON Web Token) + Bcrypt Password Hashing + RBAC Decorator │
│  - Parsing Berkas: openpyxl + Pandas 2.2+ (Excel reader & DataFrame sanitizer)         │
│  - Aplikasi Legacy Dash: backend/app.py & backend/admin_ui.py (Fallback runtime)       │
└────────────────────────────────────────┬───────────────────────────────────────────────┘
                                         │ SQLAlchemy Engine / PyMySQL Driver
                                         ▼
┌────────────────────────────────────────────────────────────────────────────────────────┐
│  BASIS DATA: MySQL / MariaDB (Database: geoev_insight)                                 │
│  Tabel: users, spklu, spklu_charger, hcs_by_brand, change_log, upload_history, metadata│
└────────────────────────────────────────────────────────────────────────────────────────┘
```

---

### 5.2 Struktur Direktori Proyek

```
geoev_insight/
├── docs.md                             <- Dokumentasi sistem lengkap (file ini)
├── backend/                            <- Layanan Backend Python Flask & REST API
│   ├── api.py                          <- REST API Blueprint (/api/*): Auth, SPKLU, HCS, Users, Export
│   ├── app.py                          <- Server Flask & registrasi Blueprint API & CORS
│   ├── database.py                     <- Skema SQLAlchemy, koneksi MySQL, transaksi, & audit log
│   ├── storytelling.py                 <- Logika kalkulasi rasio HCS/SPKLU & analisis wilayah
│   ├── admin_ui.py                     <- Komponen admin legacy Dash
│   ├── requirements.txt                <- Dependensi Python (Flask, PyJWT, bcrypt, SQLAlchemy, dll.)
│   ├── setup_mysql.sql                 <- Script inisialisasi basis data dan user MySQL
│   ├── diagnose_db.py                  <- Utilitas diagnostik kesehatan koneksi basis data
│   ├── test_admin.py                   <- Pengujian otomatis fitur admin & audit trail
│   ├── test_database.py                <- Pengujian tabel & transaksi basis data
│   ├── test_processing.py              <- Pengujian logika parsing Excel & normalisasi wilayah
│   ├── test_refresh.py                 <- Pengujian event refresh
│   ├── test_revision.py                <- Pengujian regresi otentikasi & proteksi viewer
│   └── test_storytelling.py            <- Pengujian formula rasio & kandidat kajian
└── frontend/                           <- Aplikasi Frontend Next.js 14 (App Router)
    ├── package.json                    <- Dependensi NPM (Next.js, React, Tailwind, Leaflet, React Query)
    ├── tsconfig.json                   <- Konfigurasi TypeScript
    ├── tailwind.config.ts              <- Konfigurasi tema warna & styling Tailwind CSS
    └── src/
        ├── app/
        │   ├── (dashboard)/            <- Layout Dashboard dengan Sidebar & TopBar
        │   │   ├── peta/page.tsx       <- Halaman Peta & Infrastruktur SPKLU & HCS
        │   │   ├── hcs/page.tsx        <- Halaman Distribusi HCS & Analisis Merek
        │   │   ├── compare/page.tsx    <- Halaman Rasio Perbandingan Wilayah
        │   │   ├── kajian/page.tsx     <- Halaman Rekomendasi Kajian Wilayah Prioritas
        │   │   ├── admin/
        │   │   │   ├── page.tsx        <- Halaman Manajemen Data (SPKLU, HCS, Upload, Riwayat)
        │   │   │   └── users/page.tsx  <- Halaman Manajemen Pengguna (CRUD User)
        │   │   └── layout.tsx          <- Shell dashboard terpadu
        │   ├── api/[...path]/route.ts  <- Next.js Proxy Route Handler ke Flask Backend
        │   ├── login/page.tsx          <- Halaman Login Otentikasi Pengguna
        │   ├── globals.css             <- File CSS global (Glassmorphism & animations)
        │   └── layout.tsx              <- Root Layout aplikasi
        ├── components/
        │   ├── layout/                 <- Sidebar.tsx, TopBar.tsx
        │   ├── map/                    <- SpkluMap.tsx (Leaflet interactive map engine)
        │   ├── providers/              <- QueryProvider.tsx (TanStack React Query client)
        │   └── ui/                     <- ConfirmModal.tsx, KpiCard.tsx, DataTable.tsx
        ├── contexts/
        │   └── AuthContext.tsx         <- Pengelolaan sesi JWT di sisi client & status Role
        ├── lib/
        │   ├── api.ts                  <- Klien HTTP Axios & pemanggilan endpoint API
        │   ├── constants.ts            <- Daftar 38 koordinat kabupaten/kota, palet warna, opsi daya
        │   └── utils.ts                <- Fungsi pembantu format angka (fmtNumber) & string
        └── types/
            └── index.ts                <- Definisi Interface TypeScript (Spklu, HcsRecord, UserRecord, dll.)
```

---

### 5.3 Skema Basis Data (Database Tables)

Basis data relasional menggunakan nama schema `geoev_insight` dengan engine InnoDB:

#### 1. Tabel `users` — Data Pengguna & Hak Akses
| Kolom | Tipe Data | Keterangan |
| :--- | :--- | :--- |
| `id` | INT (PK, Auto Increment) | ID unik pengguna |
| `username` | VARCHAR(80), Unique, Not Null | Username untuk login |
| `password_hash` | VARCHAR(255), Not Null | Kata sandi yang di-hash dengan algoritma **bcrypt** |
| `role` | VARCHAR(20), Not Null | Tingkatan hak akses: `super_admin`, `admin`, atau `viewer` |
| `display_name` | VARCHAR(120), Nullable | Nama lengkap pengguna |
| `is_active` | INT, Default 1 | Status akun (`1` = Aktif, `0` = Nonaktif) |
| `created_at` | DATETIME, Not Null | Waktu akun dibuat |
| `last_login` | DATETIME, Nullable | Waktu terakhir kali login |

#### 2. Tabel `spklu` — Master Lokasi SPKLU
| Kolom | Tipe Data | Keterangan |
| :--- | :--- | :--- |
| `id` | INT (PK, Auto Increment) | ID unik lokasi SPKLU |
| `nama` | VARCHAR(255), Not Null | Nama lokasi stasiun pengisian |
| `alamat` | TEXT | Alamat fisik lengkap |
| `pengelola` | VARCHAR(32) | `PLN`, `Non-PLN`, atau `Tidak diketahui` |
| `provinsi` | VARCHAR(50) | `Jawa Timur` atau `Bali` |
| `wilayah` | VARCHAR(120) | Nama kabupaten/kota di Jawa Timur |
| `lat` | FLOAT, Not Null | Titik koordinat Latitude |
| `lon` | FLOAT, Not Null | Titik koordinat Longitude |
| `daya` | FLOAT, Default 0 | Total akumulasi daya terpasang (kW) |
| `unit` | INT, Default 0 | Total jumlah unit dispenser charger |
| `connector` | INT, Default 0 | Total colokan konektor pengisian |

#### 3. Tabel `spklu_charger` — Rincian Dispenser Charger
| Kolom | Tipe Data | Keterangan |
| :--- | :--- | :--- |
| `id` | INT (PK, Auto Increment) | ID unik baris charger |
| `spklu_id` | INT (FK ke `spklu.id`) | Relasi ke stasiun induk |
| `kelompok` | VARCHAR(32) | Nama/kode kelompok charger (misal: `_1`, `-A`) |
| `kapasitas_kw` | FLOAT | Besaran daya listrik per unit dalam kiloWatt |
| `unit` | INT | Jumlah unit mesin pada kelompok ini |
| `connector` | INT | Jumlah konektor pada kelompok ini |

#### 4. Tabel `hcs_by_brand` — Agregat Catatan Mobil Listrik HCS
| Kolom | Tipe Data | Keterangan |
| :--- | :--- | :--- |
| `wilayah` | VARCHAR(120) (PK gabungan) | Nama kabupaten/kota di Jawa Timur |
| `merk` | VARCHAR(120) (PK gabungan) | Nama merek kendaraan listrik (kapital) |
| `jumlah` | INT, Not Null | Total unit pemasangan HCS terdata |

#### 5. Tabel `change_log` — Jejak Audit Operasional
| Kolom | Tipe Data | Keterangan |
| :--- | :--- | :--- |
| `id` | INT (PK, Auto Increment) | ID unik log |
| `request_id` | VARCHAR(80) | UUID unik transaksi (*idempotency key*) |
| `dataset` | VARCHAR(16) | Jenis dataset yang diubah (`spklu`, `hcs`, `user`) |
| `action` | VARCHAR(40) | Jenis tindakan (*import, tambah, edit, status*) |
| `target` | VARCHAR(255) | Nama objek yang diubah |
| `actor` | VARCHAR(120) | Username yang mengeksekusi |
| `reason` | TEXT | Alasan yang dicantumkan pelaksana |
| `before_json` | LONGTEXT | Snapshot data sebelum perubahan |
| `after_json` | LONGTEXT | Snapshot data setelah perubahan |
| `created_at` | DATETIME | Waktu transaksi dieksekusi |

---

### 5.4 Sistem Autentikasi & Keamanan (JWT & RBAC)

Sistem menerapkan prinsip keamanan berlapis (*defense-in-depth*):
1. **JSON Web Token (JWT)**: Setelah login berhasil, backend menerbitkan token JWT berumur 8 jam yang ditandatangani secara kriptografis menggunakan `JWT_SECRET`.
2. **Password Hashing Bcrypt**: Kata sandi tidak pernah disimpan dalam bentuk teks polos. Penyimpanan menggunakan salt acak dan kalkulasi cost faktor bcrypt.
3. **Role-Based Access Control (RBAC)**: Endpoint backend diproteksi dengan decorator `@jwt_required` dan `@jwt_admin_required`. Jika pengguna dengan role `viewer` mencoba mengirim request POST/PUT/DELETE melalui alat seperti Postman/cURL, server akan menolak dengan respon status `403 Forbidden`.
4. **Proxy Route Handler (Next.js)**: Menyembunyikan port backend internal dari browser dan mencegah dialog bawaan *HTTP Basic Auth* peramban agar tidak mengganggu antarmuka pengguna.

---

### 5.5 Daftar Endpoint REST API Lengkap

| Metode | Endpoint Path | Akses Role | Deskripsi Fungsi |
| :--- | :--- | :--- | :--- |
| `POST` | `/api/auth/login` | Publik | Masuk sistem, mengembalikan token JWT dan profil user |
| `GET` | `/api/auth/me` | Semua User Terautentikasi | Mengambil data sesi dan role pengguna saat ini |
| `POST` | `/api/auth/change-password` | Semua User Terautentikasi | Mengubah password akun sendiri |
| `GET` | `/api/spklu` | Semua User Terautentikasi | Mengambil daftar SPKLU (mendukung query filter) |
| `GET` | `/api/spklu/<id>` | Semua User Terautentikasi | Mengambil rincian lengkap 1 lokasi SPKLU beserta chargernya |
| `POST` | `/api/spklu` | Admin & Super Admin | Menambah lokasi SPKLU baru secara manual |
| `PUT` | `/api/spklu/<id>` | Admin & Super Admin | Memperbarui informasi lokasi SPKLU yang ada |
| `PATCH`| `/api/spklu/<id>/status` | Admin & Super Admin | Mengubah status SPKLU (Aktif $\leftrightarrow$ Nonaktif) |
| `GET` | `/api/hcs` | Semua User Terautentikasi | Mengambil seluruh data agregat HCS wilayah & merek |
| `POST` | `/api/hcs/adjust` | Admin & Super Admin | Menambah atau mengoreksi jumlah HCS wilayah tertentu |
| `POST` | `/api/upload/spklu` | Admin & Super Admin | Mengunggah file Excel data SPKLU massal |
| `POST` | `/api/upload/hcs` | Admin & Super Admin | Mengunggah file Excel data agregat HCS massal |
| `GET` | `/api/compare` | Semua User Terautentikasi | Mengambil data komparasi rasio HCS/SPKLU |
| `GET` | `/api/quality` | Semua User Terautentikasi | Mengambil ringkasan audit kualitas data |
| `GET` | `/api/history` | Semua User Terautentikasi | Mengambil 100 catatan log audit perubahan terakhir |
| `GET` | `/api/areas` | Semua User Terautentikasi | Mengambil daftar 38 kabupaten/kota resmi Jawa Timur |
| `GET` | `/api/users` | Admin & Super Admin | Mengambil daftar seluruh pengguna terdaftar |
| `POST` | `/api/users` | Admin & Super Admin | Membuat akun pengguna baru |
| `PUT` | `/api/users/<id>` | Admin & Super Admin | Memperbarui nama, role, atau status aktif pengguna |
| `DELETE`| `/api/users/<id>` | Admin & Super Admin | Menghapus akun pengguna dari sistem |
| `GET` | `/api/export/spklu` | Semua User Terautentikasi | Mengunduh master data SPKLU dalam format Excel (`.xlsx`) |
| `GET` | `/api/export/spklu.csv` | Semua User Terautentikasi | Mengunduh data SPKLU dalam format `.csv` |
| `GET` | `/api/export/compare` | Semua User Terautentikasi | Mengunduh tabel perbandingan rasio wilayah ke Excel |
| `GET` | `/api/export/hcs` | Semua User Terautentikasi | Mengunduh data agregat HCS ke Excel |

---

## 6. Panduan Instalasi & Menjalankan Aplikasi

Ikuti panduan praktis berikut untuk menjalankan seluruh sistem di komputer lokal (Windows / Linux / macOS):

### 6.1 Prasyarat Perangkat Lunak

Pastikan perangkat Anda sudah terinstal:
* **Node.js**: Versi 18.x atau 20.x LTS (disertai `npm`)
* **Python**: Versi 3.9 s/d 3.12 (disertai `pip`)
* **MySQL / MariaDB**: Server database aktif (bisa menggunakan XAMPP, MySQL Server, atau Docker)

---

### 6.2 Langkah 1: Setup Backend Python

1. Buka terminal (Command Prompt / PowerShell / Terminal).
2. Buat database di MySQL (hanya perlu dilakukan sekali):
   ```sql
   CREATE DATABASE IF NOT EXISTS geoev_insight CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
   ```
3. Masuk ke folder backend:
   ```bash
   cd c:\Geo-EV-Insight-Punya-Pina\geoev_insight\backend
   ```
4. Pasang seluruh dependensi Python:
   ```bash
   python -m pip install -r requirements.txt
   ```
5. Siapkan berkas konfigurasi `.env` di dalam folder `backend/`:
   ```env
   DB_HOST=127.0.0.1
   DB_PORT=3306
   DB_NAME=geoev_insight
   DB_USER=root
   DB_PASSWORD=
   JWT_SECRET=kunci_rahasia_geoev_insight_pln_2026
   ```
6. Jalankan server backend:
   ```bash
   python app.py
   ```
   > Server backend akan aktif di alamat `http://127.0.0.1:8050` dan siap melayani permintaan REST API.

---

### 6.3 Langkah 2: Setup Frontend Next.js

1. Buka jendela terminal baru.
2. Masuk ke folder frontend:
   ```bash
   cd c:\Geo-EV-Insight-Punya-Pina\geoev_insight\frontend
   ```
3. Pasang paket dependensi Node.js:
   ```bash
   npm install
   ```
4. Jalankan server pengembang Next.js:
   ```bash
   npm run dev
   ```
   > Server frontend akan siap dan aktif di alamat `http://localhost:3000`.

---

### 6.4 Langkah 3: Akses Sistem & Akun Bawaan

Buka browser web Anda (Google Chrome, Microsoft Edge, atau Mozilla Firefox) dan kunjungi:
```
http://localhost:3000
```

Gunakan salah satu akun default yang sudah terdaftar di sistem:

| Username | Password Bawaan | Hak Akses (Role) | Peruntukan |
| :--- | :--- | :--- | :--- |
| **`admin`** | `admin123` | **Super Admin** | Akses penuh: manajemen user, input/edit SPKLU & HCS, upload Excel |
| **`viewer`** | `viewer123` | **Viewer** | Akses analisis baca: eksplorasi peta, grafik, dan unduh laporan |

> [!TIP]
> **Keamanan Tambahan**: Segera ubah password akun bawaan setelah instalasi pertama melalui menu profil di sudut kanan atas TopBar.

---

## 7. Pengujian Otomatis (Testing)

Untuk memastikan seluruh logika kalkulasi analitik, integritas database, dan pembatasan hak akses berjalan normal tanpa cacat, jalankan rangkaian pengujian otomatis berikut:

```powershell
cd c:\Geo-EV-Insight-Punya-Pina\geoev_insight\backend

# 1. Menguji logika normalisasi wilayah dan parsing file Excel
python test_processing.py

# 2. Menguji kalkulasi rasio komparasi wilayah dan penyaringan kandidat kajian
python test_storytelling.py

# 3. Menguji transaksi database (pembuatan tabel, insert, rollback atomik)
python test_database.py

# 4. Menguji alur otorisasi admin, proteksi double-submit, dan koreksi HCS
python test_admin.py

# 5. Menguji regresi menyeluruh: otentikasi JWT, filter, dan penolakan hak akses
python test_revision.py
```

*Jika seluruh tes berhasil, terminal akan mengeluarkan pesan kelulusan `PASS` tanpa galat.*

---

## 8. Tanya Jawab & Pemecahan Masalah (FAQ & Troubleshooting)

### Q1: Mengapa lingkaran titik HCS di peta berada di tengah kota, bukan di rumah pelanggan?
> **Jawaban:** Ini adalah desain keamanan privasi (*Privacy by Design*). Alamat rumah dan koordinat presisi pemilik mobil pribadi adalah data rahasia yang dilindungi undang-undang. Sistem hanya mengambil angka agregat populasi kendaraan di wilayah tersebut dan menampilkannya pada titik koordinat pusat administratif kabupaten/kota Jawa Timur.

### Q2: Mengapa tombol "Buka di Google Maps" di titik HCS mengarahkan ke pusat kabupaten/kota?
> **Jawaban:** Tombol navigasi pada HCS bertujuan memandu tim survei dan perencana lapangan PLN menuju wilayah kabupaten/kota terkait guna melakukan studi kelayakan calon lokasi SPKLU terdekat dari konsentrasi pelanggan tersebut.

### Q3: Kenapa status pengguna baru atau pengguna lama sebelumnya sempat terlihat "Nonaktif"?
> **Jawaban:** Masalah tersebut sudah diperbaiki tuntas di versi terbaru. Backend dan frontend kini secara konsisten menyelaraskan flag status `is_active = 1` ke antarmuka, sehingga seluruh user yang aktif akan langsung menampilkan lencana hijau **"Aktif"**.

### Q4: Apa perbedaan tombol "Pusatkan Peta" dengan "Muat Ulang"?
> **Jawaban:**
> * **Pusatkan Peta**: Mengatur ulang kamera/tampilan peta ke posisi default Jawa Timur & Bali dan menghapus sorotan titik yang sedang aktif.
> * **Muat Ulang (di TopBar)**: Mengambil kembali data terbaru dari database ke server tanpa perlu menekan tombol F5 / refresh peramban.

### Q5: Muncul pesan error "Koneksi ke backend gagal / Network Error"?
> **Jawaban:** Pastikan terminal backend Python (`python app.py`) tetap berjalan di background pada port `8050`. Jika terminal backend tertutup, jalankan kembali perintah `python app.py`.

### Q6: Bagaimana jika lupa kata sandi Super Admin?
> **Jawaban:** Masuk ke database MySQL melalui phpMyAdmin / MySQL CLI, lalu perbarui kolom `password_hash` pada tabel `users` untuk user `admin` menggunakan hash bcrypt yang baru, atau jalankan script diagnostik pembuatan ulang user di terminal backend.

---

_Dokumentasi resmi ini disusun secara komprehensif untuk platform **GeoEV Insight** — Solusi Pengambilan Keputusan Infrastruktur Kendaraan Listrik Jawa Timur & Bali._
