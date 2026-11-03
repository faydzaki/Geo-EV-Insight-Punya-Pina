'use client'
import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell,
  PieChart, Pie, Legend,
} from 'recharts'
import { fetchHcs, fetchAreas } from '@/lib/api'
import { fmtNumber } from '@/lib/utils'
import { CHART_BLUE, COLORS } from '@/lib/constants'
import InsightBlock from '@/components/ui/InsightBlock'
import KpiCard from '@/components/ui/KpiCard'

const PIE_COLORS = ['#087f83', '#6B4EC6', '#E9AD2F', '#006199', '#10b981', '#f97316', '#e11d48', '#8b5cf6']

export default function HcsPage() {
  const [selectedArea, setSelectedArea] = useState('Semua')

  const { data: hcsRes, isLoading } = useQuery({
    queryKey: ['hcs'],
    queryFn: fetchHcs,
    refetchInterval: 60_000,
  })

  const { data: areasRes } = useQuery({
    queryKey: ['areas'],
    queryFn: fetchAreas,
  })

  const allHcs = hcsRes?.data ?? []
  const areas = areasRes?.data ?? []

  // Filter by area
  const filteredHcs =
    selectedArea === 'Semua' ? allHcs : allHcs.filter((r) => r.wilayah === selectedArea)

  // Group by wilayah
  const byArea = Object.entries(
    filteredHcs.reduce((acc: Record<string, number>, r) => {
      acc[r.wilayah] = (acc[r.wilayah] ?? 0) + r.jumlah
      return acc
    }, {})
  )
    .map(([wilayah, jumlah]) => ({ wilayah, jumlah }))
    .sort((a, b) => a.jumlah - b.jumlah)

  // Group by merk (top 8 + others)
  const byBrand = Object.entries(
    filteredHcs.reduce((acc: Record<string, number>, r) => {
      acc[r.merk] = (acc[r.merk] ?? 0) + r.jumlah
      return acc
    }, {})
  )
    .map(([merk, jumlah]) => ({ merk, jumlah }))
    .sort((a, b) => b.jumlah - a.jumlah)

  const top8 = byBrand.slice(0, 8)
  if (byBrand.length > 8) {
    const rest = byBrand.slice(8).reduce((s, r) => s + r.jumlah, 0)
    top8.push({ merk: 'LAINNYA', jumlah: rest })
  }

  const totalHcs = filteredHcs.reduce((s, r) => s + r.jumlah, 0)
  const topArea = byArea.length ? byArea[byArea.length - 1] : null
  const topBrand = byBrand.length ? byBrand[0] : null

  const headline =
    selectedArea === 'Semua'
      ? topArea
        ? `${topArea.wilayah} mencatat ${fmtNumber(topArea.jumlah)} catatan HCS, terbanyak dalam data`
        : 'Data catatan HCS belum tersedia'
      : `${selectedArea}: ${fmtNumber(totalHcs)} catatan HCS tercatat`

  return (
    <div className="space-y-6 max-w-screen-2xl">
      {/* Header */}
      <div>
        <span className="text-xs font-bold text-primary-500 uppercase tracking-widest">02</span>
        <h1 className="text-2xl font-bold text-gray-900 mt-1">
          Distribusi catatan Home Charging di Jawa Timur
        </h1>
        <p className="text-gray-500 text-sm mt-1">
          Setiap baris HCS dengan kabupaten/kota valid dihitung, termasuk UID yang berulang.
        </p>
        {hcsRes?.updated && (
          <p className="text-xs text-gray-400 mt-0.5">Diperbarui: {hcsRes.updated}</p>
        )}
      </div>

      {/* Controls */}
      <div className="bg-white rounded-xl border border-gray-200 p-4 flex items-center gap-4">
        <label className="text-sm font-medium text-gray-700">Wilayah analisis HCS</label>
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

      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        <KpiCard title="Total catatan HCS" value={fmtNumber(totalHcs)} subtitle="Termasuk UID berulang" />
        <KpiCard
          title="Kabupaten / kota"
          value={fmtNumber(byArea.length)}
          subtitle="Dengan catatan HCS valid"
        />
        <KpiCard
          title="Kategori kendaraan"
          value={fmtNumber(byBrand.length)}
          subtitle="Kategori unik"
        />
      </div>

      {/* Bar chart per wilayah */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <InsightBlock headline={headline} />

        {isLoading ? (
          <div className="h-80 flex items-center justify-center text-gray-400 text-sm">
            Memuat data…
          </div>
        ) : byArea.length === 0 ? (
          <div className="h-80 flex items-center justify-center text-gray-400 text-sm">
            Data catatan HCS belum tersedia untuk pilihan ini.
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={Math.max(300, byArea.length * 28 + 60)}>
            <BarChart data={byArea} layout="vertical" margin={{ left: 160, right: 60, top: 10, bottom: 10 }}>
              <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f0f0f0" />
              <XAxis type="number" tick={{ fontSize: 12 }} tickFormatter={(v) => fmtNumber(v)} />
              <YAxis type="category" dataKey="wilayah" tick={{ fontSize: 11 }} width={155} />
              <Tooltip
                formatter={(v: number) => [fmtNumber(v), 'Catatan HCS']}
                contentStyle={{ fontSize: 12 }}
              />
              <Bar dataKey="jumlah" fill={CHART_BLUE} radius={[0, 4, 4, 0]} label={{ position: 'right', fontSize: 11 }} />
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>

      {/* Pie chart per merek */}
      <details className="bg-white rounded-xl border border-gray-200">
        <summary className="px-6 py-4 cursor-pointer font-semibold text-gray-700 hover:bg-gray-50 rounded-xl transition-colors">
          Data merek kendaraan catatan HCS
        </summary>
        <div className="px-6 pb-6">
          <InsightBlock
            headline={
              topBrand
                ? `${topBrand.merk}: ${fmtNumber(topBrand.jumlah)} catatan HCS tercatat`
                : 'Data merek kendaraan belum tersedia'
            }
          />
          {top8.length > 0 && (
            <ResponsiveContainer width="100%" height={340}>
              <PieChart>
                <Pie
                  data={top8}
                  dataKey="jumlah"
                  nameKey="merk"
                  cx="50%"
                  cy="50%"
                  outerRadius={120}
                  innerRadius={65}
                  label={({ merk, percent }) =>
                    percent > 0.04 ? `${merk} ${(percent * 100).toFixed(0)}%` : ''
                  }
                  labelLine={false}
                >
                  {top8.map((_, index) => (
                    <Cell key={index} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                  ))}
                </Pie>
                <Legend
                  formatter={(value) => <span style={{ fontSize: 12 }}>{value}</span>}
                />
                <Tooltip
                  formatter={(v: number) => [fmtNumber(v), 'Catatan HCS']}
                  contentStyle={{ fontSize: 12 }}
                />
              </PieChart>
            </ResponsiveContainer>
          )}
        </div>
      </details>

      {/* Privacy note */}
      <div className="bg-blue-50 border border-blue-200 rounded-xl p-5">
        <div className="font-semibold text-blue-800 mb-1 text-sm">Perlindungan data catatan HCS</div>
        <p className="text-blue-700 text-sm">
          Peta menampilkan jumlah catatan HCS per kabupaten/kota tanpa nama, UID, alamat, atau
          koordinat rumah pelanggan.
        </p>
      </div>
    </div>
  )
}

