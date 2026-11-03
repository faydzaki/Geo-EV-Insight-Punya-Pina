# GeoEV Insight — revisi dashboard

Dashboard internal berbasis Python Dash, Dash Leaflet, Plotly, Pandas, dan MySQL/MariaDB. SPKLU mencakup Jawa Timur–Bali; HCS dan perbandingan wilayah mencakup Jawa Timur.

## Menjalankan revisi dari proyek lama

1. Ekstrak ZIP ke folder terpisah untuk mencoba revisi.
2. Salin `.env` dari proyek lama ke folder `geoev_insight` hasil ekstraksi. ZIP hanya menyertakan `.env.example`, bukan kredensial asli.
3. Pastikan MySQL/MariaDB dan database lama aktif. Struktur tabel tidak berubah; tidak perlu mengimpor ulang dump atau menghapus data.
4. Dari folder hasil ekstraksi, jalankan:

```powershell
python -m pip install -r requirements.txt
python app.py
```

Buka `http://127.0.0.1:8050`, lalu login memakai akun yang sudah dikonfigurasi. Untuk instalasi baru, buat database lewat `setup_mysql.sql`, salin `.env.example` menjadi `.env`, dan isi konfigurasi. Aplikasi memerlukan password admin dan viewer yang berbeda, tanpa placeholder contoh.

## Perubahan pada revisi ini

- Tampilan hijau-teal dengan sidebar ringkas, pencarian, empat KPI infrastruktur, dan peta sebagai fokus utama.
- Pencarian nama/alamat SPKLU tanpa membedakan kapital, indikator filter aktif, serta reset filter.
- Panel detail lokasi melalui klik marker atau dropdown pencarian lokasi.
- Peta menyesuaikan cakupan saat filter/layer berubah. Penyegaran inventaris memperbarui layer tanpa mengganti komponen peta atau memaksa ulang bounds.
- Lingkaran HCS membesar sesuai jumlah catatan, dengan batas ukuran agar terbaca. Lingkaran adalah titik representatif wilayah, bukan batas administratif atau lokasi rumah.
- Ringkasan HCS pada panel peta mengikuti provinsi dan kabupaten/kota. Tidak mengikuti pencarian SPKLU, pengelola, atau daya.
- Filter wilayah bersama untuk halaman HCS, perbandingan, dan kajian; filter ini selalu terlihat pada ketiga halaman.
- Halaman Kualitas Data: lokasi dengan wilayah Jatim belum dikenali, unit charger nol, pengelola belum dikenali, atau koordinat di luar cakupan.
- Pratinjau ringkasan sebelum penyimpanan Excel. Dialog menjelaskan apakah operasi menambah/memperbarui SPKLU atau mengganti seluruh HCS. Batal tidak menyimpan data.
- Menu manajemen dan kontrol upload disembunyikan/dinonaktifkan bagi viewer; otorisasi penyimpanan juga diperiksa kembali di server.
- Dukungan kolom opsional `KOTA/KABUPATEN` pada Excel SPKLU. Jika valid, nilai ini didahulukan dibanding ekstraksi alamat.
- Label HCS diubah menjadi **catatan HCS** untuk mencerminkan hitungan baris, bukan klaim pelanggan unik.
- Jika callback utama gagal, status memberi pesan kegagalan muat ulang dan hasil sebelumnya dipertahankan.

## Definisi angka dan filter

**Titik SPKLU** adalah jumlah lokasi. **Unit charger** dan **konektor** merupakan ringkasan rincian charger. **Daya terpasang** dihitung sebagai `Σ(kapasitas kW × jumlah unit)`.

Filter daya memilih **lokasi yang memiliki setidaknya satu charger pada rentang tersebut**. KPI, popup, dan grafik tetap menghitung seluruh charger di lokasi terpilih. Ini tidak menggambarkan daya charger yang sedang tersedia atau utilisasi real-time.

**Catatan HCS** adalah setiap baris sumber dengan kabupaten/kota valid. UID kosong dan UID berulang tetap dihitung. Nama, UID, alamat rumah, dan koordinat rumah tidak disimpan ke tabel analitik. Kategori kendaraan mengikuti label sumber; belum dilakukan penyatuan merek/model/label pemasang secara otomatis.

`Rasio wilayah = jumlah catatan HCS / jumlah lokasi SPKLU terpetakan di wilayah tersebut`.

Rasio menggunakan semua pengelola dan semua kapasitas SPKLU Jawa Timur, tidak mengikuti filter peta. Filter wilayah analisis memengaruhi distribusi HCS, rasio, dan daftar kajian. Rasio kosong jika HCS atau SPKLU tidak tersedia. Ketiadaan data bukan bukti ketiadaan fasilitas/pelanggan. Rasio tinggi bukan keputusan pembangunan.

## Format Excel

Hanya `.xlsx`, maksimal 20 MB sesudah decoding. Sheet dipilih berdasarkan kolom wajib, bukan nama sheet.

### SPKLU

Kolom wajib: `Nama`, `Alamat`, `PLN atau NON PLN`, `Provinsi`, `Latitude`, `Longitude`.

Kolom opsional: `KOTA/KABUPATEN`. Digunakan untuk Jawa Timur; pengenalan kabupaten/kota Bali belum tersedia.

Minimal satu kelompok lengkap dengan sufiks yang sama:

- `Kapasitas Charger_`, `Jumlah Charger_`, `Jumlah Connector_`
- `Kapasitas Charger-`, `Jumlah Charger-`, `Jumlah Connector-`
- `Kapasitas Charger*`, `Jumlah Charger*`, `Jumlah Connector*`
- Sufiks lain juga dapat dipakai, selama tiga nama kelompok cocok.

Koordinat diperiksa dalam rentang latitude -9,8 sampai -5,3 dan longitude 110 sampai 116,5. Provinsi harus Jawa Timur atau Bali. Nama wilayah ambigu tidak ditebak. Kelompok charger rusak dilewati dan dilaporkan; lokasi masih dapat masuk dengan rincian kosong, sehingga periksa ringkasan dan halaman Kualitas Data sebelum memakai hasil.

### HCS

Kolom wajib: `NAMA PELANGGAN`, `MERK KENDARAAN`, `ALAMAT`, `UID`, `Latitude`, `Longitude`, `KOTA/KABUPATEN`.

Wilayah yang tidak dikenali dilewati. UID hanya digunakan untuk statistik kualitas upload, bukan deduplikasi. File harus mencakup seluruh data HCS yang ingin dipertahankan karena konfirmasi upload mengganti agregat sebelumnya.

## Penyimpanan dan pembaruan

- `spklu`: lokasi dan ringkasan infrastruktur.
- `spklu_charger`: rincian kapasitas per lokasi.
- `hcs_by_brand`: agregat wilayah × kategori kendaraan.
- `metadata`: waktu upload dataset (WIB).
- `upload_history`: jenis dataset, jumlah baris, dan waktu upload.

Upload SPKLU mencocokkan nama + provinsi + koordinat (6 desimal), dengan cadangan nama + provinsi + alamat. Lokasi cocok diperbarui, lokasi baru ditambahkan, lokasi lain tidak dihapus. Jika identitas lokasi berubah terlalu jauh, lokasi dapat dianggap baru; periksa sumber sebelum upload. Detail charger untuk lokasi cocok diganti oleh hasil upload.

Upload HCS mengganti seluruh agregat dalam satu transaksi. Kegagalan penyimpanan membatalkan transaksi. Pratinjau belum menghitung jumlah SPKLU baru versus pembaruan; hasil tepat ditampilkan sesudah penyimpanan. Pratinjau dan penyimpanan memvalidasi file secara terpisah.

Tombol Muat ulang data dan interval 60 detik membaca inventaris kembali. Pembaruan langsung lewat phpMyAdmin terlihat saat refresh, tetapi tidak otomatis memperbarui timestamp upload pada tabel metadata. Riwayat upload belum menyimpan versi isi data atau menyediakan rollback pengguna.

## Pengujian

```powershell
python test_processing.py
python test_storytelling.py
python test_refresh.py
python test_database.py
python test_revision.py
```

Kelima skrip telah lulus saat revisi. Tes database dan integrasi menggunakan SQLite dalam memori **hanya sebagai test double**. Aplikasi produksi tetap menggunakan MySQL; tidak ada fallback SQLite.

`test_revision.py` menguji endpoint autentikasi/Dash, pratinjau tanpa penulisan, penolakan viewer, konfirmasi penyimpanan, upload ulang tanpa penambahan lokasi, kolom wilayah eksplisit, kebijakan HCS, pencarian, kondisi kosong, dan bounds peta. Validasi tambahan pada salinan dump 357 lokasi juga berhasil.

Batas verifikasi: koneksi MySQL/MariaDB live dan rendering browser belum diuji dalam lingkungan revisi. Preview browser gagal karena runtime Python tidak tersedia di layanan preview. Periksa tampilan desktop/mobile serta alur klik marker dan konfirmasi upload pada komputer Anda sebelum penerapan.

## Struktur dan pengembangan lanjutan

`app.py`: UI, parsing Excel, autentikasi dan callbacks. `database.py`: tabel, query dan transaksi. `storytelling.py`: perbandingan wilayah. `assets/style.css`: tampilan responsif.

Belum termasuk: marker clustering, polygon batas wilayah, standardisasi merek, edit/hapus lokasi melalui UI, rollback data, SSO, utilisasi charger, atau model keputusan pembangunan. Halaman kualitas menunjukkan masalah tetapi koreksi dilakukan lewat Excel sumber.

Untuk penggunaan jarak jauh, sajikan aplikasi di belakang HTTPS dan akses internal yang sesuai. Aset peta OpenStreetMap, Bootstrap, dan font memerlukan akses internet. Simpan kredensial di `.env`/environment; jangan masukkan `.env` ke distribusi kode. Produksi Linux dapat memakai `gunicorn app:server --bind 0.0.0.0:8050 --workers 2 --threads 4`.
