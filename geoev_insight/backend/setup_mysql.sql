-- Jalankan menggunakan user administratif MySQL melalui MySQL Workbench.
-- Jangan gunakan root sebagai akun aplikasi.
CREATE DATABASE IF NOT EXISTS geoev_insight
  CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- Buat user khusus sesuai kebutuhan lokal (ganti password contoh).
CREATE USER IF NOT EXISTS 'geoev_app'@'localhost' IDENTIFIED BY 'GANTI_PASSWORD_DATABASE_YANG_KUAT';
GRANT SELECT, INSERT, UPDATE, DELETE, CREATE, ALTER, INDEX, REFERENCES
  ON geoev_insight.* TO 'geoev_app'@'localhost';
-- Jika user sudah ada tetapi password ingin diubah, gunakan ALTER USER secara terpisah.
-- Untuk hosting, sesuaikan host user dan ACL jaringan; jangan buka port MySQL ke internet umum.
