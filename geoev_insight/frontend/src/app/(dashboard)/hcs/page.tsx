'use client'
import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell,
  PieChart, Pie, Legend, TooltipProps,
} from 'recharts'
import { fetchHcs, fetchAreas, downloadExport } from '@/lib/api'
import { fmtNumber } from '@/lib/utils'
import { CHART_BLUE } from '@/lib/constants'
import DataTable from '@/components/ui/DataTable'
import { ChevronDown, ShieldCheck, FileSpreadsheet, MapPin, Car, Download, RotateCcw } from 'lucide-react'

const PIE_COLORS = ['#3B82F6','#60A5FA','#8B5CF6','#F59E0B','#10B981','#06B6D4','#EC4899','#6366F1']

/* ── Lightweight glass tooltip ─────────────────────────── */
function ChartTooltip({ active, payload, label, unit = '' }: TooltipProps<number, string> & { unit?: string }) {
  if (!active || !payload?.length) return null
  return (
    <div
      className="rounded-xl px-3 py-2 text-xs shadow-lg"
      style={{
        background: 'rgba(255,255,255,0.95)',
        border: '1px solid rgba(108,99,255,0.14)',
        backdropFilter: 'blur(8px)',
        boxShadow: '0 8px 24px rgba(108,99,255,0.14)',
      }}
    >
      {label && <p className="font-semibold text-slate-800 mb-1 text-[11px]">{label}</p>}
      {payload.map((p, i) => (
        <p key={i} className="text-slate-600">
          <span className="font-bold" style={{ color: p.color ?? '#3B82F6' }}>
            {fmtNumber(p.value as number)}
          </span>{' '}
          {p.name ?? unit}
        </p>
      ))}
    </div>
  )
}

/* ── Trendline Wave SVG for KPI Cards ── */
function TrendWave({ color }: { color: string }) {
  return (
    <svg viewBox="0 0 140 50" className="absolute bottom-0 right-0 w-32 h-14 pointer-events-none opacity-80" fill="none">
      <defs>
        <linearGradient id={`grad-hcs-${color}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.30" />
          <stop offset="100%" stopColor={color} stopOpacity="0.0" />
        </linearGradient>
      </defs>
      <path
        d="M0,45 C25,40 45,46 65,34 C85,22 105,32 120,18 C128,10 134,14 140,8 L140,50 L0,50 Z"
        fill={`url(#grad-hcs-${color})`}
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

export default function HcsPage() {
  const [selectedArea, setSelectedArea] = useState('Semua')
  const [exporting, setExporting] = useState(false)

  async function handleExport() {
    setExporting(true)
    try { await downloadExport('/api/export/hcs', 'hcs-rekap.xlsx') }
    finally { setExporting(false) }
  }

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

  // Table data for brand distribution
  const brandTableData = byBrand.map((b, i) => ({
    Ranking: i + 1,
    'Kategori Kendaraan': b.merk,
    'Jumlah Catatan': b.jumlah,
    'Persentase (%)': byBrand.length
      ? ((b.jumlah / byBrand.reduce((s, x) => s + x.jumlah, 0)) * 100).toFixed(1)
      : '0',
  })) as unknown as Record<string, unknown>[]

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
              {/* Home Garage with Solar Roof and EV Charger */}
              <polygon points="350,70 480,20 580,70" fill="#93C5FD" opacity="0.35" />
              <rect x="370" y="70" width="190" height="150" fill="#CBD5E1" opacity="0.4" rx="4" />
              <rect x="390" y="90" width="150" height="130" fill="#94A3B8" opacity="0.25" rx="6" />
              {/* Wallbox Charger */}
              <rect x="330" y="90" width="24" height="40" rx="6" fill="#1E293B" opacity="0.8" />
              <circle cx="342" cy="105" r="5" fill="#38BDF8" />
              <path d="M336,130 C336,160 360,170 380,165" stroke="#334155" strokeWidth="3" fill="none" />
              {/* Car Silhouette */}
              <ellipse cx="440" cy="180" rx="90" ry="12" fill="#334155" opacity="0.2" />
              <path d="M370,160 C380,135 410,120 450,120 C490,120 520,138 535,160 Z" fill="#3B82F6" opacity="0.3" />
              <circle cx="405" cy="170" r="14" fill="#1E293B" opacity="0.6" />
              <circle cx="500" cy="170" r="14" fill="#1E293B" opacity="0.6" />
            </svg>
          </div>

          <div className="relative z-10 max-w-xl">
            <div className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-white/70 backdrop-blur-md border border-white/80 rounded-full mb-3 shadow-xs">
              <span className="w-5 h-5 rounded-full bg-blue-600 text-white text-[10px] font-bold flex items-center justify-center">
                02
              </span>
              <span className="text-[10px] font-bold text-blue-700 tracking-wider uppercase px-1">
                Home Charging
              </span>
            </div>

            <h2 className="text-2xl sm:text-3xl font-bold text-slate-800 tracking-tight mb-1.5 leading-snug">
              Distribusi Catatan Home Charging di Jawa Timur
            </h2>
            <p className="text-slate-600 text-xs sm:text-sm mb-3">
              Setiap baris HCS dengan kabupaten/kota valid dihitung, termasuk UID yang berulang.
            </p>
            {hcsRes?.updated && (
              <div className="flex items-center gap-2 text-xs text-slate-500 font-medium">
                <span className="w-2 h-2 rounded-full bg-emerald-500 ring-2 ring-emerald-200 animate-pulse" />
                <span>Diperbarui: {hcsRes.updated}</span>
              </div>
            )}
          </div>
        </div>

        {/* Floating Filter Bar */}
        <div className="mt-3 bg-white/80 backdrop-blur-md border border-white rounded-2xl shadow-xs p-2.5 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2.5 flex-1 min-w-[260px]">
            <div className="relative flex items-center gap-2.5 px-3 py-2 bg-white/60 hover:bg-white rounded-xl border border-white/80 transition-colors cursor-pointer group flex-1 sm:flex-initial sm:w-80">
              <div className="w-7 h-7 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
                <MapPin size={14} />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-[10px] text-slate-400 font-medium leading-none">Wilayah Analisis</p>
                <p className="text-xs font-semibold text-slate-800 truncate mt-0.5 leading-tight">
                  {selectedArea === 'Semua' ? 'Semua kabupaten / kota' : selectedArea}
                </p>
              </div>
              <ChevronDown size={13} className="text-slate-400 shrink-0" />
              <select
                aria-label="Pilih Wilayah Analisis"
                className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                value={selectedArea}
                onChange={(e) => setSelectedArea(e.target.value)}
              >
                <option value="Semua">Semua kabupaten / kota</option>
                {areas.map((a) => <option key={a} value={a}>{a}</option>)}
              </select>
            </div>

            {selectedArea !== 'Semua' && (
              <button
                onClick={() => setSelectedArea('Semua')}
                className="px-3 py-2 bg-white/70 hover:bg-white border border-slate-200/50 rounded-xl text-xs font-medium text-slate-600 flex items-center gap-1.5 transition-colors shadow-xs"
              >
                <RotateCcw size={12} className="text-slate-400" />
                <span>Reset</span>
              </button>
            )}
          </div>

          <button
            onClick={handleExport}
            disabled={exporting || isLoading}
            className="flex items-center gap-1.5 text-xs font-medium text-slate-700 hover:text-blue-600 bg-white hover:bg-blue-50 border border-slate-200/80 px-3.5 py-2 rounded-xl transition-all shadow-xs disabled:opacity-50"
          >
            <Download size={13} />
            <span>{exporting ? 'Mengunduh…' : 'Export Excel'}</span>
          </button>
        </div>
      </section>

      {/* ══════════════════════════════════════
          2. KPI CARDS WITH WAVE TRENDLINES
      ══════════════════════════════════════ */}
      <section className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Total Catatan HCS */}
        <div className="bg-white/75 backdrop-blur-sm border border-white rounded-2xl p-4 shadow-xs relative overflow-hidden flex flex-col justify-between h-28 hover:shadow-md transition-all">
          <div className="flex items-center gap-2.5 mb-1 relative z-10">
            <div className="w-7 h-7 rounded-lg bg-blue-100/90 text-blue-600 flex items-center justify-center">
              <FileSpreadsheet size={15} />
            </div>
            <h3 className="text-[10px] font-bold text-slate-400 tracking-wider uppercase">
              Total Catatan HCS
            </h3>
          </div>
          <div className="relative z-10">
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-bold text-slate-800 tracking-tight">
                {isLoading ? '...' : fmtNumber(totalHcs)}
              </span>
              <span className="text-[11px] font-bold text-emerald-600 flex items-center gap-0.5">
                ↑ +15%
              </span>
            </div>
            <p className="text-[10px] text-slate-400 mt-0.5">Termasuk UID berulang</p>
          </div>
          <TrendWave color="#3B82F6" />
        </div>

        {/* Kabupaten / Kota */}
        <div className="bg-white/75 backdrop-blur-sm border border-white rounded-2xl p-4 shadow-xs relative overflow-hidden flex flex-col justify-between h-28 hover:shadow-md transition-all">
          <div className="flex items-center gap-2.5 mb-1 relative z-10">
            <div className="w-7 h-7 rounded-lg bg-emerald-100/90 text-emerald-600 flex items-center justify-center">
              <MapPin size={15} />
            </div>
            <h3 className="text-[10px] font-bold text-slate-400 tracking-wider uppercase">
              Kabupaten / Kota
            </h3>
          </div>
          <div className="relative z-10">
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-bold text-slate-800 tracking-tight">
                {isLoading ? '...' : fmtNumber(byArea.length)}
              </span>
              <span className="text-[11px] font-bold text-emerald-600 flex items-center gap-0.5">
                ↑ +6%
              </span>
            </div>
            <p className="text-[10px] text-slate-400 mt-0.5">Dengan catatan HCS valid</p>
          </div>
          <TrendWave color="#10B981" />
        </div>

        {/* Kategori Kendaraan */}
        <div className="bg-white/75 backdrop-blur-sm border border-white rounded-2xl p-4 shadow-xs relative overflow-hidden flex flex-col justify-between h-28 hover:shadow-md transition-all">
          <div className="flex items-center gap-2.5 mb-1 relative z-10">
            <div className="w-7 h-7 rounded-lg bg-purple-100/90 text-purple-600 flex items-center justify-center">
              <Car size={15} />
            </div>
            <h3 className="text-[10px] font-bold text-slate-400 tracking-wider uppercase">
              Kategori Kendaraan
            </h3>
          </div>
          <div className="relative z-10">
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-bold text-slate-800 tracking-tight">
                {isLoading ? '...' : fmtNumber(byBrand.length)}
              </span>
              <span className="text-[11px] font-bold text-emerald-600 flex items-center gap-0.5">
                ↑ +9%
              </span>
            </div>
            <p className="text-[10px] text-slate-400 mt-0.5">Kategori unik</p>
          </div>
          <TrendWave color="#8B5CF6" />
        </div>
      </section>

      {/* ══════════════════════════════════════
          3. BAR CHART SECTION
      ══════════════════════════════════════ */}
      <div className="bg-white/75 backdrop-blur-sm border border-white rounded-3xl p-6 shadow-xs">
        <div className="flex items-center gap-2.5 mb-4">
          <div className="w-1 h-5 bg-blue-600 rounded-sm" />
          <h3 className="text-sm font-bold text-slate-800">{headline}</h3>
        </div>

        {isLoading ? (
          <div className="h-72 bg-slate-100/60 animate-pulse rounded-2xl" />
        ) : byArea.length === 0 ? (
          <div className="h-56 flex items-center justify-center text-slate-400 text-xs">
            Data catatan HCS belum tersedia untuk pilihan ini.
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={Math.max(300, byArea.length * 28 + 60)}>
            <BarChart data={byArea} layout="vertical" margin={{ left: 160, right: 60, top: 10, bottom: 10 }}>
              <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f1f5f9" />
              <XAxis type="number" tick={{ fontSize: 11 }} tickFormatter={(v) => fmtNumber(v)} />
              <YAxis type="category" dataKey="wilayah" tick={{ fontSize: 11 }} width={155} />
              <Tooltip content={<ChartTooltip unit="Catatan HCS" />} />
              <Bar
                dataKey="jumlah"
                fill={CHART_BLUE}
                radius={[0, 6, 6, 0]}
                isAnimationActive
                animationDuration={700}
                animationEasing="ease-out"
                label={{ position: 'right', fontSize: 11, fill: '#64748b' }}
              />
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>

      {/* ══════════════════════════════════════
          4. PIE CHART COLLAPSIBLE (MEREK KENDARAAN)
      ══════════════════════════════════════ */}
      <details className="bg-white/75 backdrop-blur-sm border border-white rounded-3xl group shadow-xs">
        <summary className="px-6 py-4 cursor-pointer font-semibold text-slate-700 hover:bg-white/50 rounded-3xl transition-colors select-none flex items-center justify-between text-xs sm:text-sm">
          <span>Data merek kendaraan catatan HCS</span>
          <ChevronDown size={16} className="text-slate-400 transition-transform duration-200 group-open:rotate-180" />
        </summary>
        <div className="px-6 pb-6 pt-2 border-t border-slate-100">
          <div className="flex items-center gap-2 mb-3">
            <div className="w-1 h-4 bg-purple-600 rounded-sm" />
            <h4 className="text-xs font-bold text-slate-800">
              {topBrand
                ? `${topBrand.merk}: ${fmtNumber(topBrand.jumlah)} catatan HCS tercatat`
                : 'Data merek kendaraan belum tersedia'}
            </h4>
          </div>

          {top8.length > 0 && (
            <ResponsiveContainer width="100%" height={320}>
              <PieChart>
                <Pie
                  data={top8}
                  dataKey="jumlah"
                  nameKey="merk"
                  cx="50%"
                  cy="50%"
                  outerRadius={115}
                  innerRadius={60}
                  isAnimationActive
                  animationDuration={800}
                  animationEasing="ease-out"
                  label={({ merk, percent }) => percent > 0.04 ? `${merk} ${(percent * 100).toFixed(0)}%` : ''}
                  labelLine={false}
                >
                  {top8.map((_, index) => <Cell key={index} fill={PIE_COLORS[index % PIE_COLORS.length]} />)}
                </Pie>
                <Legend formatter={(value) => <span style={{ fontSize: 12 }}>{value}</span>} />
                <Tooltip content={<ChartTooltip unit="Catatan HCS" />} />
              </PieChart>
            </ResponsiveContainer>
          )}

          {/* Brand Table */}
          {byBrand.length > 0 && (
            <div className="mt-5 border-t border-slate-100 pt-4">
              <h4 className="text-xs font-bold text-slate-700 mb-2">Rincian kategori kendaraan</h4>
              <DataTable
                data={brandTableData}
                searchable
                searchPlaceholder="Cari kategori kendaraan…"
                pageSize={8}
                columns={[
                  { key: 'Ranking',            label: '#',                  className: 'w-10 text-slate-400 font-mono text-xs' },
                  { key: 'Kategori Kendaraan', label: 'Kategori Kendaraan', className: 'font-medium text-slate-800 text-xs' },
                  { key: 'Jumlah Catatan',     label: 'Jumlah Catatan',     className: 'text-right text-xs', render: (v) => <span className="font-semibold text-blue-600">{fmtNumber(v as number)}</span> },
                  { key: 'Persentase (%)',      label: 'Persentase',         className: 'text-right text-xs', render: (v) => <span className="text-slate-500">{String(v)}%</span> },
                ]}
              />
            </div>
          )}
        </div>
      </details>

      {/* ══════════════════════════════════════
          5. PRIVACY NOTICE
      ══════════════════════════════════════ */}
      <div className="bg-white/70 backdrop-blur-sm border border-white rounded-3xl p-4 flex gap-3 shadow-xs">
        <div className="w-8 h-8 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
          <ShieldCheck size={18} />
        </div>
        <div>
          <div className="font-bold text-slate-800 text-xs mb-0.5">Perlindungan Data HCS</div>
          <p className="text-slate-500 text-xs leading-relaxed">
            Peta menampilkan jumlah catatan HCS per kabupaten/kota tanpa nama, UID, alamat, atau koordinat rumah pelanggan.
          </p>
        </div>
      </div>
    </div>
  )
}
