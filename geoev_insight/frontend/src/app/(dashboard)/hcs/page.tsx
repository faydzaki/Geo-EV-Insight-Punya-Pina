'use client'
import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell,
  PieChart, Pie, Legend,
} from 'recharts'
import { fetchHcs, fetchAreas } from '@/lib/api'
import { fmtNumber } from '@/lib/utils'
import { CHART_BLUE } from '@/lib/constants'
import InsightBlock from '@/components/ui/InsightBlock'
import KpiCard from '@/components/ui/KpiCard'
import { ChevronDown, ShieldCheck } from 'lucide-react'

const PIE_COLORS = ['#087f83','#6B4EC6','#E9AD2F','#006199','#10b981','#f97316','#e11d48','#8b5cf6']

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

export default function HcsPage() {
  const [selectedArea, setSelectedArea] = useState('Semua')

  const { data: hcsRes, isLoading } = useQuery({
    queryKey: ['hcs'],
    queryFn:  fetchHcs,
    refetchInterval: 60_000,
  })
  const { data: areasRes } = useQuery({ queryKey: ['areas'], queryFn: fetchAreas })

  const allHcs = hcsRes?.data ?? []
  const areas  = areasRes?.data ?? []

  const filteredHcs = selectedArea === 'Semua'
    ? allHcs
    : allHcs.filter((r) => r.wilayah === selectedArea)

  const byArea = Object.entries(
    filteredHcs.reduce((acc: Record<string, number>, r) => {
      acc[r.wilayah] = (acc[r.wilayah] ?? 0) + r.jumlah; return acc
    }, {})
  ).map(([wilayah, jumlah]) => ({ wilayah, jumlah })).sort((a, b) => a.jumlah - b.jumlah)

  const byBrand = Object.entries(
    filteredHcs.reduce((acc: Record<string, number>, r) => {
      acc[r.merk] = (acc[r.merk] ?? 0) + r.jumlah; return acc
    }, {})
  ).map(([merk, jumlah]) => ({ merk, jumlah })).sort((a, b) => b.jumlah - a.jumlah)

  const top8 = byBrand.slice(0, 8)
  if (byBrand.length > 8) {
    top8.push({ merk: 'LAINNYA', jumlah: byBrand.slice(8).reduce((s, r) => s + r.jumlah, 0) })
  }

  const totalHcs = filteredHcs.reduce((s, r) => s + r.jumlah, 0)
  const topArea  = byArea.length ? byArea[byArea.length - 1] : null
  const topBrand = byBrand.length ? byBrand[0] : null

  const headline = selectedArea === 'Semua'
    ? topArea
      ? `${topArea.wilayah} mencatat ${fmtNumber(topArea.jumlah)} catatan HCS, terbanyak dalam data`
      : 'Data catatan HCS belum tersedia'
    : `${selectedArea}: ${fmtNumber(totalHcs)} catatan HCS tercatat`

  return (
    <div className="space-y-5">
      {/* Header */}
      <div>
        <div className="inline-flex items-center gap-2 mb-2">
          <span className="text-[10px] font-bold text-white px-2 py-0.5 rounded-full"
            style={{ background: 'linear-gradient(135deg, #087f83, #0ea5e9)' }}>02</span>
          <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Home Charging</span>
        </div>
        <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
          Distribusi catatan Home Charging di Jawa Timur
        </h1>
        <p className="text-slate-500 text-sm mt-1">
          Setiap baris HCS dengan kabupaten/kota valid dihitung, termasuk UID yang berulang.
        </p>
        {hcsRes?.updated && <p className="text-xs text-slate-400 mt-0.5">Diperbarui: {hcsRes.updated}</p>}
      </div>

      {/* Filter */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-card p-4 flex items-center gap-4">
        <label className="text-xs font-bold text-slate-500 uppercase tracking-wider shrink-0">Wilayah Analisis</label>
        <select
          className="border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-400/50 bg-white text-slate-700 transition-colors"
          value={selectedArea} onChange={(e) => setSelectedArea(e.target.value)}
        >
          <option value="Semua">Semua kabupaten / kota</option>
          {areas.map((a) => <option key={a} value={a}>{a}</option>)}
        </select>
      </div>

      {/* KPIs */}
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">{[0,1,2].map((i) => <SkeletonKpi key={i} />)}</div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <KpiCard title="Total Catatan HCS"      value={fmtNumber(totalHcs)}      subtitle="Termasuk UID berulang"         icon="🏠" color="teal" />
          <KpiCard title="Kabupaten / Kota"        value={fmtNumber(byArea.length)} subtitle="Dengan catatan HCS valid"      icon="🗺️" color="blue" />
          <KpiCard title="Kategori Kendaraan"      value={fmtNumber(byBrand.length)} subtitle="Kategori unik"               icon="🚗" color="purple" />
        </div>
      )}

      {/* Bar chart */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-card p-6">
        <InsightBlock headline={headline} />
        {isLoading ? (
          <div className="h-80 skeleton rounded-xl" />
        ) : byArea.length === 0 ? (
          <div className="h-60 flex items-center justify-center text-slate-400 text-sm">
            Data catatan HCS belum tersedia untuk pilihan ini.
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={Math.max(300, byArea.length * 28 + 60)}>
            <BarChart data={byArea} layout="vertical" margin={{ left: 160, right: 60, top: 10, bottom: 10 }}>
              <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f1f5f9" />
              <XAxis type="number" tick={{ fontSize: 11 }} tickFormatter={(v) => fmtNumber(v)} />
              <YAxis type="category" dataKey="wilayah" tick={{ fontSize: 11 }} width={155} />
              <Tooltip formatter={(v: number) => [fmtNumber(v), 'Catatan HCS']} contentStyle={{ fontSize: 12, borderRadius: 8, border: '1px solid #e2e8f0' }} />
              <Bar dataKey="jumlah" fill={CHART_BLUE} radius={[0, 6, 6, 0]}
                label={{ position: 'right', fontSize: 11, fill: '#64748b' }} />
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>

      {/* Pie chart (collapsible) */}
      <details className="bg-white rounded-2xl border border-slate-100 shadow-card group">
        <summary className="px-6 py-4 cursor-pointer font-semibold text-slate-700 hover:bg-slate-50 rounded-2xl transition-colors select-none flex items-center justify-between">
          <span>Data merek kendaraan catatan HCS</span>
          <ChevronDown size={16} className="text-slate-400 transition-transform group-open:rotate-180" />
        </summary>
        <div className="px-6 pb-6 border-t border-slate-50">
          <div className="h-4" />
          <InsightBlock
            headline={topBrand
              ? `${topBrand.merk}: ${fmtNumber(topBrand.jumlah)} catatan HCS tercatat`
              : 'Data merek kendaraan belum tersedia'}
          />
          {top8.length > 0 && (
            <ResponsiveContainer width="100%" height={340}>
              <PieChart>
                <Pie data={top8} dataKey="jumlah" nameKey="merk"
                  cx="50%" cy="50%" outerRadius={120} innerRadius={65}
                  label={({ merk, percent }) => percent > 0.04 ? `${merk} ${(percent * 100).toFixed(0)}%` : ''}
                  labelLine={false}>
                  {top8.map((_, index) => <Cell key={index} fill={PIE_COLORS[index % PIE_COLORS.length]} />)}
                </Pie>
                <Legend formatter={(value) => <span style={{ fontSize: 12 }}>{value}</span>} />
                <Tooltip formatter={(v: number) => [fmtNumber(v), 'Catatan HCS']} contentStyle={{ fontSize: 12, borderRadius: 8, border: '1px solid #e2e8f0' }} />
              </PieChart>
            </ResponsiveContainer>
          )}
        </div>
      </details>

      {/* Privacy note */}
      <div className="bg-teal-50 border border-teal-200/60 rounded-2xl p-5 flex gap-3">
        <ShieldCheck size={18} className="text-teal-600 shrink-0 mt-0.5" />
        <div>
          <div className="font-semibold text-teal-800 text-sm mb-1">Perlindungan Data HCS</div>
          <p className="text-teal-700 text-sm">
            Peta menampilkan jumlah catatan HCS per kabupaten/kota tanpa nama, UID, alamat, atau koordinat rumah pelanggan.
          </p>
        </div>
      </div>
    </div>
  )
}
