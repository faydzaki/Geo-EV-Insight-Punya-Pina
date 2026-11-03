'use client'
import { useQuery } from '@tanstack/react-query'
import { fetchQuality } from '@/lib/api'
import { fmtNumber } from '@/lib/utils'
import KpiCard from '@/components/ui/KpiCard'
import DataTable from '@/components/ui/DataTable'

export default function KualitasPage() {
  const { data, isLoading } = useQuery({
    queryKey: ['quality'],
    queryFn: fetchQuality,
    refetchInterval: 60_000,
  })

  const issues = data?.issues ?? []
  const kpis = data?.kpis

  return (
    <div className="space-y-6 max-w-screen-2xl">
      {/* Header */}
      <div>
        <span className="text-xs font-bold text-primary-500 uppercase tracking-widest">
          DATA HEALTH
        </span>
        <h1 className="text-2xl font-bold text-gray-900 mt-1">
          Kenali batas data sebelum mengambil keputusan
        </h1>
        <p className="text-gray-500 text-sm mt-1">
          Pemeriksaan seluruh inventaris, tidak dipengaruhi filter peta.
        </p>
      </div>

      {/* KPIs */}
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="bg-white rounded-xl border border-gray-200 p-5 h-24 animate-pulse" />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <KpiCard
            title="Lokasi perlu diperiksa"
            value={fmtNumber(kpis?.issues_count ?? 0)}
            subtitle="Dari seluruh inventaris"
            highlight={Boolean(kpis?.issues_count)}
          />
          <KpiCard
            title="Wilayah Jatim belum dikenali"
            value={fmtNumber(kpis?.unmapped_jatim ?? 0)}
            subtitle="Tidak masuk penyebut rasio wilayah"
          />
          <KpiCard
            title="Cakupan HCS"
            value={fmtNumber(kpis?.hcs_area_count ?? 0)}
            subtitle="Kabupaten/kota dengan catatan HCS"
          />
        </div>
      )}

      {/* Issues table */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <h2 className="text-base font-semibold text-gray-800 mb-1">
          Lokasi yang perlu diperiksa
        </h2>
        <p className="text-xs text-gray-500 mb-4">
          Perbaiki sumber Excel, lalu unggah ulang untuk memperbarui lokasi.
        </p>
        <DataTable
          data={issues as unknown as Record<string, unknown>[]}
          columns={[
            { key: 'nama', label: 'SPKLU' },
            { key: 'provinsi', label: 'Provinsi' },
            { key: 'alamat', label: 'Alamat' },
            {
              key: 'masalah',
              label: 'Temuan',
              render: (v) => (
                <span className="text-amber-700 text-xs bg-amber-50 px-2 py-0.5 rounded">
                  {v as string}
                </span>
              ),
            },
          ]}
        />
      </div>

      {/* Explanation */}
      <div className="bg-white rounded-xl border border-gray-200 p-6 space-y-4 text-sm text-gray-600">
        <h2 className="text-base font-semibold text-gray-800">Cara membaca data HCS</h2>
        <p>
          Satu catatan adalah satu baris HCS dengan wilayah valid. UID berulang dan kosong tetap
          dihitung; angka ini bukan pelanggan unik.
        </p>
        <p>
          Kategori kendaraan mengikuti label sumber, sehingga merek, model, dan label pemasang
          dapat tercampur. Tidak ada penggabungan otomatis.
        </p>
        <p>Wilayah tanpa data HCS bukan berarti tidak memiliki pelanggan HCS.</p>
      </div>
    </div>
  )
}

