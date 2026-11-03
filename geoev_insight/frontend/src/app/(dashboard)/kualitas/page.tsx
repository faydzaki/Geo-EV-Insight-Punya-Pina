'use client'
import { useQuery } from '@tanstack/react-query'
import { fetchQuality } from '@/lib/api'
import { fmtNumber } from '@/lib/utils'
import KpiCard from '@/components/ui/KpiCard'
import DataTable from '@/components/ui/DataTable'
import { ShieldAlert } from 'lucide-react'

function SkeletonKpi() {
  return (
    <div className="bg-white rounded-2xl border border-slate-100 p-5 shadow-card">
      <div className="skeleton h-9 w-9 rounded-xl mb-3" />
      <div className="skeleton h-3 w-20 rounded mb-2" />
      <div className="skeleton h-7 w-24 rounded mb-2" />
      <div className="skeleton h-2.5 w-16 rounded" />
    </div>
  )
}

export default function KualitasPage() {
  const { data, isLoading } = useQuery({
    queryKey: ['quality'],
    queryFn:  fetchQuality,
    refetchInterval: 60_000,
  })

  const issues = data?.issues ?? []
  const kpis   = data?.kpis

  return (
    <div className="space-y-5">
      {/* Header */}
      <div>
        <div className="inline-flex items-center gap-2 mb-2">
          <span className="text-[10px] font-bold text-white px-2 py-0.5 rounded-full"
            style={{ background: 'linear-gradient(135deg, #087f83, #0ea5e9)' }}>05</span>
          <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Data Health</span>
        </div>
        <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
          Kenali batas data sebelum mengambil keputusan
        </h1>
        <p className="text-slate-500 text-sm mt-1">
          Pemeriksaan seluruh inventaris, tidak dipengaruhi filter peta.
        </p>
      </div>

      {/* KPIs */}
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">{[0,1,2].map((i) => <SkeletonKpi key={i} />)}</div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <KpiCard
            title="Lokasi Perlu Diperiksa"
            value={fmtNumber(kpis?.issues_count ?? 0)}
            subtitle="Dari seluruh inventaris"
            icon="⚠️"
            highlight={Boolean(kpis?.issues_count)}
          />
          <KpiCard
            title="Wilayah Jatim Belum Dikenali"
            value={fmtNumber(kpis?.unmapped_jatim ?? 0)}
            subtitle="Tidak masuk penyebut rasio wilayah"
            icon="🗺️"
            color="amber"
          />
          <KpiCard
            title="Cakupan HCS"
            value={fmtNumber(kpis?.hcs_area_count ?? 0)}
            subtitle="Kabupaten/kota dengan catatan HCS"
            icon="✅"
            color="teal"
          />
        </div>
      )}

      {/* Issues table */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-card p-6">
        <div className="flex items-center gap-2 mb-1">
          <ShieldAlert size={16} className="text-amber-500" />
          <h2 className="text-base font-semibold text-slate-800">Lokasi yang perlu diperiksa</h2>
        </div>
        <p className="text-xs text-slate-500 mb-4">
          Perbaiki sumber Excel, lalu unggah ulang untuk memperbarui lokasi.
        </p>
        <DataTable
          data={issues as unknown as Record<string, unknown>[]}
          columns={[
            { key: 'nama',     label: 'SPKLU' },
            { key: 'provinsi', label: 'Provinsi' },
            { key: 'alamat',   label: 'Alamat' },
            { key: 'masalah',  label: 'Temuan',
              render: (v) => (
                <span className="text-amber-700 text-xs bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-lg">
                  {v as string}
                </span>
              ),
            },
          ]}
        />
      </div>

      {/* Explanation */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-card p-6 space-y-4 text-sm text-slate-600">
        <h2 className="text-base font-semibold text-slate-800">Cara membaca data HCS</h2>
        <div className="space-y-2">
          <div className="flex gap-3 p-3 bg-slate-50 rounded-xl">
            <span className="shrink-0 text-base">📊</span>
            <p>Satu catatan adalah satu baris HCS dengan wilayah valid. UID berulang dan kosong tetap dihitung; angka ini bukan pelanggan unik.</p>
          </div>
          <div className="flex gap-3 p-3 bg-slate-50 rounded-xl">
            <span className="shrink-0 text-base">🏷️</span>
            <p>Kategori kendaraan mengikuti label sumber, sehingga merek, model, dan label pemasang dapat tercampur. Tidak ada penggabungan otomatis.</p>
          </div>
          <div className="flex gap-3 p-3 bg-slate-50 rounded-xl">
            <span className="shrink-0 text-base">📍</span>
            <p>Wilayah tanpa data HCS bukan berarti tidak memiliki pelanggan HCS.</p>
          </div>
        </div>
      </div>
    </div>
  )
}
