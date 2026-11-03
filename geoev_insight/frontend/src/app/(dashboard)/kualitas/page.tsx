'use client'
import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { fetchQuality, downloadExport } from '@/lib/api'
import { fmtNumber } from '@/lib/utils'
import KpiCard from '@/components/ui/KpiCard'
import DataTable from '@/components/ui/DataTable'
import {
  ShieldAlert, AlertTriangle, MapPinOff, CheckCircle2,
  FileSpreadsheet, Tag, MapPin, AlertCircle, Download,
} from 'lucide-react'

function SkeletonKpi() {
  return (
    <div className="card-glass rounded-2xl p-5">
      <div className="skeleton h-9 w-9 rounded-xl mb-3" />
      <div className="skeleton h-3 w-20 rounded mb-2" />
      <div className="skeleton h-7 w-24 rounded mb-2" />
      <div className="skeleton h-2.5 w-16 rounded" />
    </div>
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
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <div className="inline-flex items-center gap-2 mb-2">
            <span
              className="text-[10px] font-bold text-white px-2 py-0.5 rounded-full"
              style={{ background: 'linear-gradient(135deg, #6C63FF, #3B82F6)' }}
            >
              05
            </span>
            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Data Health</span>
          </div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
            Kenali batas data sebelum mengambil keputusan
          </h1>
          <p className="text-slate-500 text-sm mt-1">
            Pemeriksaan seluruh inventaris, tidak dipengaruhi filter peta.
          </p>
        </div>
        <button
          onClick={handleExport}
          disabled={exporting || isLoading || issues.length === 0}
          className="flex items-center gap-1.5 shrink-0 text-xs font-medium text-slate-600 hover:text-primary-700 border border-slate-200 hover:border-primary-300 hover:bg-primary-50 px-3 py-1.5 rounded-lg transition-all disabled:opacity-50 mt-1"
          title={issues.length === 0 ? 'Tidak ada temuan untuk diekspor' : undefined}
        >
          <Download size={13} />
          {exporting ? 'Mengunduh…' : 'Export Temuan'}
        </button>
      </div>

      {/* KPIs */}
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">{[0, 1, 2].map((i) => <SkeletonKpi key={i} />)}</div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {[
            {
              title: 'Lokasi Perlu Diperiksa',
              value: fmtNumber(kpis?.issues_count ?? 0),
              subtitle: 'Dari seluruh inventaris',
              icon: <AlertTriangle size={18} className={kpis?.issues_count ? 'text-white' : 'text-amber-600'} />,
              highlight: Boolean(kpis?.issues_count),
            },
            {
              title: 'Wilayah Jatim Belum Dikenali',
              value: fmtNumber(kpis?.unmapped_jatim ?? 0),
              subtitle: 'Tidak masuk penyebut rasio wilayah',
              icon: <MapPinOff size={18} />,
              color: 'amber' as const,
            },
            {
              title: 'Cakupan HCS',
              value: fmtNumber(kpis?.hcs_area_count ?? 0),
              subtitle: 'Kabupaten/kota dengan catatan HCS',
              icon: <CheckCircle2 size={18} />,
              color: 'teal' as const,
            },
          ].map((kpi, i) => (
            <div
              key={kpi.title}
              className="animate-slide-up"
              style={{ animationDelay: `${i * 80}ms`, animationFillMode: 'both' }}
            >
              <KpiCard {...kpi} />
            </div>
          ))}
        </div>
      )}

      {/* Issues table */}
      <div className="card-glass rounded-2xl p-6">
        <div className="flex items-center gap-2 mb-1">
          <ShieldAlert size={16} className="text-amber-500" />
          <h2 className="text-base font-semibold text-slate-800">Lokasi yang perlu diperiksa</h2>
        </div>
        <p className="text-xs text-slate-500 mb-4">
          Perbaiki sumber Excel, lalu unggah ulang untuk memperbarui lokasi.
        </p>
        <DataTable
          data={issues as unknown as Record<string, unknown>[]}
          searchable
          searchPlaceholder="Cari nama SPKLU, alamat, atau temuan…"
          columns={[
            {
              key: 'nama',
              label: 'SPKLU',
              className: 'font-semibold text-slate-800 min-w-[200px]',
            },
            {
              key: 'provinsi',
              label: 'Provinsi',
              className: 'text-slate-600 whitespace-nowrap min-w-[120px]',
            },
            {
              key: 'alamat',
              label: 'Alamat',
              className: 'text-slate-500 text-xs min-w-[280px] max-w-[420px] leading-relaxed',
            },
            {
              key: 'masalah',
              label: 'Temuan',
              className: 'min-w-[220px] max-w-[360px]',
              render: (v) => {
                // Support multiple separators: "; ", ", ", "\n", or "|"
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
                        className="inline-flex items-center gap-1 text-amber-700 text-xs bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-full font-medium leading-tight"
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

      {/* Explanation */}
      <div className="card-glass rounded-2xl p-6 space-y-4 text-sm text-slate-600">
        <h2 className="text-base font-semibold text-slate-800">Cara membaca data HCS</h2>
        <div className="space-y-2.5">
          <div className="flex items-start gap-3 p-3.5 bg-slate-50/80 border border-slate-100 rounded-xl">
            <div className="w-7 h-7 rounded-lg bg-primary-100 flex items-center justify-center shrink-0 mt-0.5">
              <FileSpreadsheet size={15} className="text-primary-600" />
            </div>
            <p className="text-sm text-slate-600 leading-relaxed">
              Satu catatan adalah satu baris HCS dengan wilayah valid. UID berulang dan kosong tetap dihitung; angka ini bukan pelanggan unik.
            </p>
          </div>
          <div className="flex items-start gap-3 p-3.5 bg-slate-50/80 border border-slate-100 rounded-xl">
            <div className="w-7 h-7 rounded-lg bg-primary-100 flex items-center justify-center shrink-0 mt-0.5">
              <Tag size={15} className="text-primary-600" />
            </div>
            <p className="text-sm text-slate-600 leading-relaxed">
              Kategori kendaraan mengikuti label sumber, sehingga merek, model, dan label pemasang dapat tercampur. Tidak ada penggabungan otomatis.
            </p>
          </div>
          <div className="flex items-start gap-3 p-3.5 bg-slate-50/80 border border-slate-100 rounded-xl">
            <div className="w-7 h-7 rounded-lg bg-primary-100 flex items-center justify-center shrink-0 mt-0.5">
              <MapPin size={15} className="text-primary-600" />
            </div>
            <p className="text-sm text-slate-600 leading-relaxed">
              Wilayah tanpa data HCS bukan berarti tidak memiliki pelanggan HCS.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
