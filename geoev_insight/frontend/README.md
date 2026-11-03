# GeoEV Insight — Frontend (Next.js)

Dashboard frontend untuk GeoEV Insight menggunakan **Next.js 14** (App Router) + TypeScript + Tailwind CSS.

## Prasyarat

- Node.js 18 atau lebih baru
- Backend Python (`backend/app.py`) harus berjalan di port **8050**

## Cara Menjalankan

### 1. Install dependencies

```powershell
cd frontend
npm install
```

### 2. Konfigurasi (opsional)

Edit `.env.local` jika backend berjalan di port berbeda:

```env
NEXT_PUBLIC_API_URL=http://localhost:8050
```

### 3. Jalankan backend (terminal terpisah)

```powershell
cd backend
python app.py
```

### 4. Jalankan frontend

```powershell
cd frontend
npm run dev
```

Buka browser: **http://localhost:3000**

Login menggunakan akun yang sama dengan yang dikonfigurasi di `backend/.env`.

---

## Struktur Folder

```
frontend/
├── src/
│   ├── app/
│   │   ├── (dashboard)/        — Halaman utama (butuh login)
│   │   │   ├── peta/           — Peta & infrastruktur SPKLU
│   │   │   ├── hcs/            — Distribusi catatan HCS
│   │   │   ├── perbandingan/   — Rasio HCS vs SPKLU
│   │   │   ├── kajian/         — Kajian wilayah prioritas
│   │   │   ├── kualitas/       — Kualitas data
│   │   │   └── admin/          — Manajemen data (Admin only)
│   │   └── login/              — Halaman login
│   ├── components/
│   │   ├── layout/             — Sidebar, TopBar
│   │   ├── map/                — SpkluMap (Leaflet)
│   │   ├── providers/          — QueryProvider (TanStack Query)
│   │   └── ui/                 — KpiCard, DataTable, FilterBar, dll.
│   ├── contexts/               — AuthContext
│   ├── lib/                    — api.ts, auth.ts, constants.ts, utils.ts
│   └── types/                  — TypeScript types
├── .env.local
├── next.config.ts              — Proxy /api → http://localhost:8050/api
├── tailwind.config.ts
└── tsconfig.json
```

## Tech Stack

| Library | Kegunaan |
|---|---|
| Next.js 14 (App Router) | Framework React dengan SSR/SSG |
| TypeScript | Type safety |
| Tailwind CSS | Styling |
| TanStack Query | Data fetching & caching |
| Axios | HTTP client |
| React Leaflet | Peta interaktif (OpenStreetMap) |
| Recharts | Grafik (bar chart, pie chart) |
| React Hook Form | Formulir admin |
| React Dropzone | Upload file Excel |
| Lucide React | Ikon |

## Cara Kerja Auth

Frontend menggunakan HTTP Basic Auth (sama dengan backend Dash). Kredensial disimpan di `sessionStorage` dan dikirim sebagai header `Authorization: Basic <base64>` di setiap request API.

## Build untuk Produksi

```powershell
npm run build
npm start
```

Atau deploy ke Vercel / server Node.js.

