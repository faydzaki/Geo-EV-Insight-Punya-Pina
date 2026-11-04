'use client'
import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { fetchQuality, downloadExport } from '@/lib/api'
import { fmtNumber } from '@/lib/utils'
import DataTable from '@/components/ui/DataTable'
import {
  ShieldAlert, AlertTriangle, MapPinOff, CheckCircle2,
  FileSpreadsheet, Tag, MapPin, AlertCircle, Download,
} from 'lucide-react'

/* ── Trendline Wave SVG for KPI Cards ── */
function TrendWave({ color }: { color: string }) {
  return (
    <svg viewBox="0 0 140 50" className="absolute bottom-0 right-0 w-32 h-14 pointer-events-none opacity-80" fill="none">
      <defs>
        <linearGradient id={`grad-q-${color}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.30" />
          <stop offset="100%" stopColor={color} stopOpacity="0.0" />
        </linearGradient>
      </defs>
      <path
        d="M0,45 C25,40 45,46 65,34 C85,22 105,32 120,18 C128,10 134,14 140,8 L140,50 L0,50 Z"
        fill={`url(#grad-q-${color})`}
      />
      <path
        d="M0,45 C25,40 45,46 65,34 C85,22 105,32 120,18 C128,10 134,14 140,8"
        stroke={color}
        strokeWidth="2.2"
        strokeLinecap="round"
      />
    </svg>
  )
}

export default function KualitasPage() {
  const [exporting, setExporting] = useState(false)

  const { data, isLoading } = useQuery({
    queryKey: ['quality'],
    queryFn:  fetchQuality,
    refetchInterval: 60_000,
  })

  const issues = data?.issues ?? []
  const kpis   = data?.kpis

  async function handleExport() {
    setExporting(true)
    try { await downloadExport('/api/export/quality', 'audit-spklu.xlsx') }
    finally { setExporting(false) }
  }

  return (
    <div className="space-y-4">
      {/* ══════════════════════════════════════
          1. HERO BANNER
      ══════════════════════════════════════ */}
      <section className="relative">
        <div
          className="relative w-full rounded-3xl overflow-hidden shadow-xs border border-white flex flex-col justify-between px-6 sm:px-10 py-7 min-h-[190px] sm:min-h-[220px]"
          style={{ background: 'linear-gradient(135deg, #E6F0FD 0%, #D8E7FD 50%, #E8F1FE 100%)' }}
        >
          {/* Decorative Vector Scene */}
          <div className="absolute inset-0 pointer-events-none overflow-hidden z-0">
            <div className="absolute inset-y-0 left-0 w-3/5 bg-gradient-to-r from-[#E6F0FD]/95 via-[#E6F0FD]/80 to-transparent z-10" />
            <svg
              viewBox="0 0 600 220"
              className="absolute right-0 bottom-0 h-full w-auto max-w-none pointer-events-none select-none z-0"
              preserveAspectRatio="xMaxYMax meet"
            >
              {/* Shield health checklist art */}
              <circle cx="450" cy="110" r="60" fill="#38BDF8" opacity="0.15" />
              <path d="M450,55 L490,75 C490,120 450,155 450,155 C450,155 410,120 410,75 Z" fill="#3B82F6" opacity="0.4" />
              <path d="M435,105 L445,115 L465,95" stroke="#FFFFFF" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" fill="none" />
            </svg>
          </div>

          <div className="relative z-10 max-w-xl">
            <div className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-white/70 backdrop-blur-md border border-white/80 rounded-full mb-3 shadow-xs">
              <span className="w-5 h-5 rounded-full bg-blue-600 text-white text-[10px] font-bold flex items-center justify-center">
                05
              </span>
              <span className="text-[10px] font-bold text-blue-700 tracking-wider uppercase px-1">
                Data Health
              </span>
            </div>

            <h2 className="text-2xl sm:text-3xl font-bold text-slate-800 tracking-tight mb-1.5 leading-snug">
              Kenali Batas Data Sebelum Mengambil Keputusan
            </h2>
            <p className="text-slate-600 text-xs sm:text-sm mb-3">
              Pemeriksaan seluruh inventaris SPKLU dan catatan HCS, tidak dipengaruhi oleh filter peta.
            </p>
          </div>
        </div>

        {/* Action bar */}
        <div className="mt-3 bg-white/80 backdrop-blur-md border border-white rounded-2xl shadow-xs p-2.5 flex items-center justify-between">
          <div className="flex items-center gap-2 px-2 text-xs text-slate-500 font-medium">
            <span className="w-2 h-2 rounded-full bg-emerald-500 ring-2 ring-emerald-200" />
            <span>Audit Otomatis Terhubung ke Database</span>
          </div>

          <button
            onClick={handleExport}
            disabled={exporting || isLoading || issues.length === 0}
            className="flex items-center gap-1.5 text-xs font-medium text-slate-700 hover:text-blue-600 bg-white hover:bg-blue-50 border border-slate-200/80 px-3.5 py-2 rounded-xl transition-all shadow-xs disabled:opacity-50"
            title={issues.length === 0 ? 'Tidak ada temuan untuk diekspor' : undefined}
          >
            <Download size={13} />
            <span>{exporting ? 'Mengunduh…' : 'Export Temuan'}</span>
          </button>
        </div>
      </section>

      {/* ══════════════════════════════════════
          2. KPI CARDS
      ══════════════════════════════════════ */}
      <section className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Lokasi Perlu Diperiksa */}
        <div className="bg-white/75 backdrop-blur-sm border border-white rounded-2xl p-4 shadow-xs relative overflow-hidden flex flex-col justify-between h-28 hover:shadow-md transition-all">
          <div className="flex items-center gap-2.5 mb-1 relative z-10">
            <div className="w-7 h-7 rounded-lg bg-amber-100/90 text-amber-600 flex items-center justify-center">
              <AlertTriangle size={15} />
            </div>
            <h3 className="text-[10px] font-bold text-slate-400 tracking-wider uppercase">
              Perlu Diperiksa
            </h3>
          </div>
          <div className="relative z-10">
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-bold text-slate-800 tracking-tight">
                {isLoading ? '...' : fmtNumber(kpis?.issues_count ?? 0)}
              </span>
              <span className="text-[11px] font-bold text-amber-600">
                Lokasi SPKLU
              </span>
            </div>
            <p className="text-[10px] text-slate-400 mt-0.5">Dari seluruh inventaris</p>
          </div>
          <TrendWave color="#F59E0B" />
        </div>

        {/* Wilayah Jatim Belum Dikenali */}
        <div className="bg-white/75 backdrop-blur-sm border border-white rounded-2xl p-4 shadow-xs relative overflow-hidden flex flex-col justify-between h-28 hover:shadow-md transition-all">
          <div className="flex items-center gap-2.5 mb-1 relative z-10">
            <div className="w-7 h-7 rounded-lg bg-blue-100/90 text-blue-600 flex items-center justify-center">
              <MapPinOff size={15} />
            </div>
            <h3 className="text-[10px] font-bold text-slate-400 tracking-wider uppercase">
              Belum Dikenali
            </h3>
          </div>
          <div className="relative z-10">
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-bold text-slate-800 tracking-tight">
                {isLoading ? '...' : fmtNumber(kpis?.unmapped_jatim ?? 0)}
              </span>
              <span className="text-[11px] font-bold text-blue-600">
                Titik Jatim
              </span>
            </div>
            <p className="text-[10px] text-slate-400 mt-0.5">Tidak masuk penyebut rasio wilayah</p>
          </div>
          <TrendWave color="#3B82F6" />
        </div>

        {/* Cakupan HCS */}
        <div className="bg-white/75 backdrop-blur-sm border border-white rounded-2xl p-4 shadow-xs relative overflow-hidden flex flex-col justify-between h-28 hover:shadow-md transition-all">
          <div className="flex items-center gap-2.5 mb-1 relative z-10">
            <div className="w-7 h-7 rounded-lg bg-emerald-100/90 text-emerald-600 flex items-center justify-center">
              <CheckCircle2 size={15} />
            </div>
            <h3 className="text-[10px] font-bold text-slate-400 tracking-wider uppercase">
              Cakupan HCS
            </h3>
          </div>
          <div className="relative z-10">
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-bold text-slate-800 tracking-tight">
                {isLoading ? '...' : `${fmtNumber(kpis?.hcs_area_count ?? 0)} Kab/Kota`}
              </span>
              <span className="text-[11px] font-bold text-emerald-600">
                Tersedia
              </span>
            </div>
            <p className="text-[10px] text-slate-400 mt-0.5">Kabupaten/kota tercatat</p>
          </div>
          <TrendWave color="#10B981" />
        </div>
      </section>

      {/* ══════════════════════════════════════
          3. ISSUES TABLE
      ══════════════════════════════════════ */}
      <div className="bg-white/75 backdrop-blur-sm border border-white rounded-3xl p-6 shadow-xs">
        <div className="flex items-center gap-2 mb-1">
          <ShieldAlert size={16} className="text-amber-500" />
          <h3 className="text-sm font-bold text-slate-800">Lokasi yang perlu diperiksa</h3>
        </div>
        <p className="text-xs text-slate-500 mb-4">
          Perbaiki sumber Excel pada Manajemen Data untuk memperbarui lokasi temuan ini.
        </p>

        <DataTable
          data={issues as unknown as Record<string, unknown>[]}
          searchable
          searchPlaceholder="Cari nama SPKLU, alamat, atau temuan…"
          columns={[
            {
              key: 'nama',
              label: 'SPKLU',
              className: 'font-semibold text-slate-800 min-w-[200px] text-xs',
            },
            {
              key: 'provinsi',
              label: 'Provinsi',
              className: 'text-slate-600 whitespace-nowrap min-w-[120px] text-xs',
            },
            {
              key: 'alamat',
              label: 'Alamat',
              className: 'text-slate-500 text-xs min-w-[260px] max-w-[400px] leading-relaxed',
            },
            {
              key: 'masalah',
              label: 'Temuan',
              className: 'min-w-[220px] max-w-[360px]',
              render: (v) => {
                const raw = String(v ?? '')
                const flags = raw
                  .split(/;\s*|\n|\s*\|\s*/)
                  .map((s) => s.trim())
                  .filter(Boolean)
                if (flags.length === 0) return <span className="text-slate-400 text-xs">—</span>
                return (
                  <div className="flex flex-wrap gap-1.5">
                    {flags.map((flag, i) => (
                      <span
                        key={i}
                        className="inline-flex items-center gap-1 text-amber-700 text-[11px] bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-full font-medium leading-tight"
                      >
                        <AlertCircle size={10} className="text-amber-500 shrink-0" />
                        {flag}
                      </span>
                    ))}
                  </div>
                )
              },
            },
          ]}
        />
      </div>

      {/* ══════════════════════════════════════
          4. EXPLANATION NOTES
      ══════════════════════════════════════ */}
      <div className="bg-white/75 backdrop-blur-sm border border-white rounded-3xl p-5 space-y-3 shadow-xs">
        <h4 className="font-bold text-slate-800 text-xs sm:text-sm">Panduan Integritas Data HCS</h4>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 pt-1">
          <div className="flex items-start gap-3 p-3 bg-slate-50/80 border border-slate-100 rounded-2xl">
            <div className="w-7 h-7 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
              <FileSpreadsheet size={14} />
            </div>
            <p className="text-[11px] text-slate-600 leading-relaxed">
              Satu catatan adalah satu baris HCS dengan wilayah valid. UID berulang tetap dihitung; angka ini bukan pelanggan unik.
            </p>
          </div>

          <div className="flex items-start gap-3 p-3 bg-slate-50/80 border border-slate-100 rounded-2xl">
            <div className="w-7 h-7 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0">
              <Tag size={14} />
            </div>
            <p className="text-[11px] text-slate-600 leading-relaxed">
              Kategori kendaraan mengikuti label sumber PLN ES sehingga merek dan model dapat tercampur tanpa penggabungan paksa.
            </p>
          </div>

          <div className="flex items-start gap-3 p-3 bg-slate-50/80 border border-slate-100 rounded-2xl">
            <div className="w-7 h-7 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center shrink-0">
              <MapPin size={14} />
            </div>
            <p className="text-[11px] text-slate-600 leading-relaxed">
              Wilayah tanpa data HCS bukan berarti tidak memiliki mobil listrik, melainkan belum tercatat dalam sistem terpadu.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
