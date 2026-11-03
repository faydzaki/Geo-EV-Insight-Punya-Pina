'use client'
import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell,
} from 'recharts'
import { fetchCompare, fetchAreas } from '@/lib/api'
import { fmtNumber } from '@/lib/utils'
import InsightBlock from '@/components/ui/InsightBlock'
import DataTable from '@/components/ui/DataTable'
import { AlertTriangle, Info } from 'lucide-react'

export default function PerbandinganPage() {
  const [selectedArea, setSelectedArea] = useState('Semua')

  const { data: compareRes, isLoading } = useQuery({
    queryKey: ['compare', selectedArea],
    queryFn: () => fetchCompare(selectedArea === 'Semua' ? undefined : selectedArea),
    refetchInterval: 60_000,
  })

  const { data: areasRes } = useQuery({
    queryKey: ['areas'],
    queryFn: fetchAreas,
  })

  const rows = compareRes?.data ?? []
  const quality = compareRes?.quality
  const areas = areasRes?.data ?? []

  // Chart: only rows with both HCS and SPKLU
  const measurable = rows
    .filter((r) => r.HCS > 0 && r.SPKLU > 0 && r.Rasio != null)
    .sort((a, b) => (a.Rasio ?? 0) - (b.Rasio ?? 0))

  // Headline
  const topRow = measurable.length ? measurable[measurable.length - 1] : null
  const headline = topRow
    ? `${topRow.Wilayah}: ${fmtNumber(topRow.HCS)} catatan HCS dan ${fmtNumber(topRow.SPKLU)} SPKLU, rasio ${fmtNumber(topRow.Rasio ?? 0, 1)}`
    : 'Data catatan HCS dan SPKLU belum lengkap'

  const tableData = rows.map((r) => ({
    Wilayah: r.Wilayah,
    HCS: r.HCS,
    SPKLU: r.SPKLU,
    Rasio: r.Rasio != null ? Math.round(r.Rasio * 100) / 100 : null,
    Status: r.Status,
  }))

  const zeroSpklu = rows.filter((r) => r.HCS > 0 && r.SPKLU === 0)

  return (
    <div className="space-y-6 max-w-screen-2xl">
      {/* Header */}
      <div>
        <span className="text-xs font-bold text-primary-500 uppercase tracking-widest">03</span>
        <h1 className="text-2xl font-bold text-gray-900 mt-1">
          Perbandingan catatan HCS dan SPKLU per kabupaten/kota
        </h1>
        <p className="text-gray-500 text-sm mt-1">
          Rasio dihitung dari jumlah baris HCS dibagi titik SPKLU pada kabupaten/kota yang sama di
          Jawa Timur.
        </p>
      </div>

      {/* Area filter */}
      <div className="bg-white rounded-xl border border-gray-200 p-4 flex items-center gap-4">
        <label className="text-sm font-medium text-gray-700">Wilayah analisis</label>
        <select
          className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 bg-white"
          value={selectedArea}
          onChange={(e) => setSelectedArea(e.target.value)}
        >
          <option value="Semua">Semua kabupaten / kota</option>
          {areas.map((a) => (
            <option key={a} value={a}>
              {a}
            </option>
          ))}
        </select>
      </div>

      {/* Ratio chart */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <InsightBlock headline={headline} />

        {isLoading ? (
          <div className="h-80 flex items-center justify-center text-gray-400 text-sm animate-pulse">
            Memuat data…
          </div>
        ) : measurable.length === 0 ? (
          <div className="h-60 flex items-center justify-center text-gray-400 text-sm">
            {quality?.ready
              ? 'Belum ada kabupaten/kota dengan data HCS dan SPKLU yang sesuai.'
              : 'Data SPKLU Jawa Timur dan catatan HCS belum lengkap.'}
          </div>
        ) : (
          <ResponsiveContainer
            width="100%"
            height={Math.max(300, measurable.length * 30 + 60)}
          >
            <BarChart
              data={measurable}
              layout="vertical"
              margin={{ left: 160, right: 80, top: 10, bottom: 10 }}
            >
              <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f0f0f0" />
              <XAxis
                type="number"
                tick={{ fontSize: 12 }}
                tickFormatter={(v) => fmtNumber(v, 0)}
                label={{ value: 'Catatan HCS per SPKLU', position: 'insideBottom', offset: -5, fontSize: 12 }}
              />
              <YAxis type="category" dataKey="Wilayah" tick={{ fontSize: 11 }} width={155} />
              <Tooltip
                formatter={(v: number) => [fmtNumber(v, 1), 'Rasio HCS/SPKLU']}
                contentStyle={{ fontSize: 12 }}
              />
              <Bar dataKey="Rasio" radius={[0, 4, 4, 0]} label={{ position: 'right', fontSize: 11, formatter: (v: number) => fmtNumber(v, 1) }}>
                {measurable.map((_, i) => (
                  <Cell key={i} fill="#6B4EC6" />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        )}

        <p className="text-xs text-gray-400 mt-3">
          Rasio tidak dihitung jika SPKLU belum terpetakan; rasio tinggi belum membuktikan
          kebutuhan SPKLU baru.
        </p>
      </div>

      {/* Audit warnings */}
      <div className="space-y-3">
        {quality?.spklu_unmapped ? (
          <div className="flex gap-3 p-4 bg-amber-50 border border-amber-200 rounded-xl text-sm text-amber-800">
            <AlertTriangle size={18} className="shrink-0 mt-0.5 text-amber-600" />
            <span>
              Sebanyak {fmtNumber(quality.spklu_unmapped)} titik SPKLU Jawa Timur belum memiliki
              kabupaten/kota yang sesuai; periksa alamat sebelum menggunakan hasil rasio.
            </span>
          </div>
        ) : null}
        {zeroSpklu.length > 0 && (
          <div className="flex gap-3 p-4 bg-amber-50 border border-amber-200 rounded-xl text-sm text-amber-800">
            <AlertTriangle size={18} className="shrink-0 mt-0.5 text-amber-600" />
            <span>
              Sebanyak {zeroSpklu.length} kabupaten/kota memiliki data catatan HCS tanpa titik
              SPKLU terpetakan; nilai rasio belum dapat dihitung.
            </span>
          </div>
        )}
        {!quality?.spklu_unmapped && zeroSpklu.length === 0 && rows.length > 0 && (
          <div className="flex gap-3 p-4 bg-blue-50 border border-blue-200 rounded-xl text-sm text-blue-700">
            <Info size={18} className="shrink-0 mt-0.5" />
            <span>
              Rasio hanya dihitung untuk kabupaten/kota yang memiliki data catatan HCS dan titik
              SPKLU.
            </span>
          </div>
        )}
      </div>

      {/* Comparison table */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <h2 className="text-base font-semibold text-gray-800 mb-1">
          Jumlah catatan HCS dan SPKLU per kabupaten/kota
        </h2>
        <p className="text-xs text-gray-500 mb-4">
          Rasio tidak dihitung pada wilayah tanpa SPKLU terpetakan.
        </p>
        <DataTable
          data={tableData as unknown as Record<string, unknown>[]}
          columns={[
            { key: 'Wilayah', label: 'Kabupaten / kota' },
            { key: 'HCS', label: 'Catatan HCS', render: (v) => fmtNumber(v as number) },
            { key: 'SPKLU', label: 'Titik SPKLU', render: (v) => fmtNumber(v as number) },
            {
              key: 'Rasio',
              label: 'Rasio HCS/SPKLU',
              render: (v) => (v != null ? fmtNumber(v as number, 2) : '—'),
            },
            {
              key: 'Status',
              label: 'Status data',
              render: (v) => {
                const s = v as string
                const colors =
                  s === 'Dapat dihitung'
                    ? 'bg-green-100 text-green-700'
                    : s === 'SPKLU belum terpetakan'
                    ? 'bg-amber-100 text-amber-700'
                    : 'bg-gray-100 text-gray-500'
                return (
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${colors}`}>
                    {s}
                  </span>
                )
              },
            },
          ]}
        />
      </div>
    </div>
  )
}

