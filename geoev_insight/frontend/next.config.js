/** @type {import('next').NextConfig} */
const nextConfig = {
  // Tidak perlu rewrites() lagi — /api/* ditangani oleh Route Handler
  // di src/app/api/[...path]/route.ts yang juga menghapus WWW-Authenticate header
}

module.exports = nextConfig
