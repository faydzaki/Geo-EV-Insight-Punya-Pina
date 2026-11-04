'use client'
import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, TooltipProps,
} from 'recharts'
import { fetchCompare, fetchAreas, downloadExport } from '@/lib/api'
import { fmtNumber } from '@/lib/utils'
import DataTable from '@/components/ui/DataTable'
import { AlertTriangle, Info, Download, MapPin, ChevronDown, RotateCcw, GitCompare, CheckCircle2 } from 'lucide-react'

/* ── Lightweight glass tooltip ─────────────────────────── */
function ChartTooltip({ active, payload, label }: TooltipProps<number, string>) {
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
          <span className="font-bold text-blue-600">
            {fmtNumber(p.value as number, 1)}
          </span>{' '}
          Rasio HCS/SPKLU
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
        <linearGradient id={`grad-cmp-${color}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.30" />
          <stop offset="100%" stopColor={color} stopOpacity="0.0" />
        </linearGradient>
      </defs>
      <path
        d="M0,45 C25,40 45,46 65,34 C85,22 105,32 120,18 C128,10 134,14 140,8 L140,50 L0,50 Z"
        fill={`url(#grad-cmp-${color})`}
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

export default function PerbandinganPage() {
  const [selectedArea, setSelectedArea] = useState('Semua')
  const [exporting, setExporting]       = useState(false)

  async function handleExport() {
    setExporting(true)
    try { await downloadExport('/api/export/compare', 'perbandingan-export.xlsx') }
    finally { setExporting(false) }
  }

  const { data: compareRes, isLoading } = useQuery({
    queryKey: ['compare', selectedArea],
    queryFn:  () => fetchCompare(selectedArea === 'Semua' ? undefined : selectedArea),
    refetchInterval: 60_000,
  })
  const { data: areasRes } = useQuery({ queryKey: ['areas'], queryFn: fetchAreas })

  const rows    = compareRes?.data ?? []
  const quality = compareRes?.quality
  const areas   = areasRes?.data ?? []

  const measurable = rows
    .filter((r) => r.HCS > 0 && r.SPKLU > 0 && r.Rasio != null)
    .sort((a, b) => (a.Rasio ?? 0) - (b.Rasio ?? 0))

  const topRow  = measurable.length ? measurable[measurable.length - 1] : null
  const headline = topRow
    ? `${topRow.Wilayah}: ${fmtNumber(topRow.HCS)} catatan HCS dan ${fmtNumber(topRow.SPKLU)} SPKLU, rasio ${fmtNumber(topRow.Rasio ?? 0, 1)}`
    : 'Data catatan HCS dan SPKLU belum lengkap'

  const zeroSpklu = rows.filter((r) => r.HCS > 0 && r.SPKLU === 0)

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
              {/* Regional comparison chart vector art */}
              <rect x="320" y="140" width="30" height="80" rx="6" fill="#93C5FD" opacity="0.4" />
              <rect x="365" y="100" width="30" height="120" rx="6" fill="#60A5FA" opacity="0.5" />
              <rect x="410" y="60"  width="30" height="160" rx="6" fill="#3B82F6" opacity="0.7" />
              <rect x="455" y="120" width="30" height="100" rx="6" fill="#93C5FD" opacity="0.4" />
              <rect x="500" y="80"  width="30" height="140" rx="6" fill="#2563EB" opacity="0.6" />
              <path d="M335,130 C380,85 425,50 515,70" stroke="#1D4ED8" strokeWidth="3" fill="none" strokeDasharray="4 4" />
            </svg>
          </div>

          <div className="relative z-10 max-w-xl">
            <div className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-white/70 backdrop-blur-md border border-white/80 rounded-full mb-3 shadow-xs">
              <span className="w-5 h-5 rounded-full bg-blue-600 text-white text-[10px] font-bold flex items-center justify-center">
                03
              </span>
              <span className="text-[10px] font-bold text-blue-700 tracking-wider uppercase px-1">
                Analisis Wilayah
              </span>
            </div>

            <h2 className="text-2xl sm:text-3xl font-bold text-slate-800 tracking-tight mb-1.5 leading-snug">
              Perbandingan Catatan HCS dan SPKLU
            </h2>
            <p className="text-slate-600 text-xs sm:text-sm mb-3">
              Rasio HCS/SPKLU per kabupaten/kota di Jawa Timur untuk melihat kepadatan infrastruktur.
            </p>
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
            disabled={exporting}
            className="flex items-center gap-1.5 text-xs font-medium text-slate-700 hover:text-blue-600 bg-white hover:bg-blue-50 border border-slate-200/80 px-3.5 py-2 rounded-xl transition-all shadow-xs disabled:opacity-50"
          >
            <Download size={13} />
            <span>{exporting ? 'Mengunduh…' : 'Export Excel'}</span>
          </button>
        </div>
      </section>

      {/* ══════════════════════════════════════
          2. KPI SUMMARY CARDS
      ══════════════════════════════════════ */}
      <section className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Wilayah Terukur */}
        <div className="bg-white/75 backdrop-blur-sm border border-white rounded-2xl p-4 shadow-xs relative overflow-hidden flex flex-col justify-between h-28 hover:shadow-md transition-all">
          <div className="flex items-center gap-2.5 mb-1 relative z-10">
            <div className="w-7 h-7 rounded-lg bg-blue-100/90 text-blue-600 flex items-center justify-center">
              <CheckCircle2 size={15} />
            </div>
            <h3 className="text-[10px] font-bold text-slate-400 tracking-wider uppercase">
              Wilayah Terukur
            </h3>
          </div>
          <div className="relative z-10">
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-bold text-slate-800 tracking-tight">
                {isLoading ? '...' : `${measurable.length} Wilayah`}
              </span>
              <span className="text-[11px] font-bold text-emerald-600 flex items-center gap-0.5">
                Aktif
              </span>
            </div>
            <p className="text-[10px] text-slate-400 mt-0.5">Memiliki SPKLU &amp; HCS</p>
          </div>
          <TrendWave color="#3B82F6" />
        </div>

        {/* Rasio Tertinggi */}
        <div className="bg-white/75 backdrop-blur-sm border border-white rounded-2xl p-4 shadow-xs relative overflow-hidden flex flex-col justify-between h-28 hover:shadow-md transition-all">
          <div className="flex items-center gap-2.5 mb-1 relative z-10">
            <div className="w-7 h-7 rounded-lg bg-purple-100/90 text-purple-600 flex items-center justify-center">
              <GitCompare size={15} />
            </div>
            <h3 className="text-[10px] font-bold text-slate-400 tracking-wider uppercase">
              Rasio Tertinggi
            </h3>
          </div>
          <div className="relative z-10">
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-bold text-slate-800 tracking-tight">
                {topRow ? fmtNumber(topRow.Rasio ?? 0, 1) : '—'}
              </span>
              <span className="text-[11px] font-bold text-purple-600">
                {topRow?.Wilayah ?? ''}
              </span>
            </div>
            <p className="text-[10px] text-slate-400 mt-0.5">Catatan HCS per SPKLU</p>
          </div>
          <TrendWave color="#8B5CF6" />
        </div>

        {/* Belum Terpetakan */}
        <div className="bg-white/75 backdrop-blur-sm border border-white rounded-2xl p-4 shadow-xs relative overflow-hidden flex flex-col justify-between h-28 hover:shadow-md transition-all">
          <div className="flex items-center gap-2.5 mb-1 relative z-10">
            <div className="w-7 h-7 rounded-lg bg-amber-100/90 text-amber-600 flex items-center justify-center">
              <AlertTriangle size={15} />
            </div>
            <h3 className="text-[10px] font-bold text-slate-400 tracking-wider uppercase">
              SPKLU Belum Ada
            </h3>
          </div>
          <div className="relative z-10">
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-bold text-slate-800 tracking-tight">
                {zeroSpklu.length} Wilayah
              </span>
              <span className="text-[11px] font-bold text-amber-600">
                Perlu SPKLU
              </span>
            </div>
            <p className="text-[10px] text-slate-400 mt-0.5">Ada data HCS, 0 SPKLU</p>
          </div>
          <TrendWave color="#F59E0B" />
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
        ) : measurable.length === 0 ? (
          <div className="h-56 flex items-center justify-center text-slate-400 text-xs">
            {quality?.ready
              ? 'Belum ada kabupaten/kota dengan data HCS dan SPKLU yang sesuai.'
              : 'Data SPKLU Jawa Timur dan catatan HCS belum lengkap.'}
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={Math.max(300, measurable.length * 30 + 60)}>
            <BarChart data={measurable} layout="vertical" margin={{ left: 160, right: 80, top: 10, bottom: 10 }}>
              <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f1f5f9" />
              <XAxis type="number" tick={{ fontSize: 11 }} tickFormatter={(v) => fmtNumber(v, 0)}
                label={{ value: 'Catatan HCS per SPKLU', position: 'insideBottom', offset: -5, fontSize: 11 }} />
              <YAxis type="category" dataKey="Wilayah" tick={{ fontSize: 11 }} width={155} />
              <Tooltip content={<ChartTooltip />} />
              <Bar
                dataKey="Rasio"
                radius={[0, 6, 6, 0]}
                isAnimationActive
                animationDuration={700}
                animationEasing="ease-out"
                label={{ position: 'right', fontSize: 11, fill: '#64748b', formatter: (v: number) => fmtNumber(v, 1) }}
              >
                {measurable.map((_, i) => <Cell key={i} fill="#4F46E5" />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        )}
        <p className="text-xs text-slate-400 mt-3">
          Rasio tidak dihitung jika SPKLU belum terpetakan; rasio tinggi belum membuktikan kebutuhan SPKLU baru.
        </p>
      </div>

      {/* ══════════════════════════════════════
          4. AUDIT WARNINGS
      ══════════════════════════════════════ */}
      <div className="space-y-2">
        {quality?.spklu_unmapped ? (
          <div className="flex gap-3 p-4 bg-amber-50/80 border border-amber-200/80 rounded-2xl text-xs text-amber-800 shadow-xs">
            <AlertTriangle size={16} className="shrink-0 mt-0.5 text-amber-500" />
            <span>Sebanyak {fmtNumber(quality.spklu_unmapped)} titik SPKLU Jawa Timur belum memiliki kabupaten/kota yang sesuai; periksa alamat sebelum menggunakan hasil rasio.</span>
          </div>
        ) : null}
        {zeroSpklu.length > 0 && (
          <div className="flex gap-3 p-4 bg-amber-50/80 border border-amber-200/80 rounded-2xl text-xs text-amber-800 shadow-xs">
            <AlertTriangle size={16} className="shrink-0 mt-0.5 text-amber-500" />
            <span>Sebanyak {zeroSpklu.length} kabupaten/kota memiliki data catatan HCS tanpa titik SPKLU terpetakan; nilai rasio belum dapat dihitung.</span>
          </div>
        )}
        {!quality?.spklu_unmapped && zeroSpklu.length === 0 && rows.length > 0 && (
          <div className="flex gap-3 p-4 bg-blue-50/80 border border-blue-200/80 rounded-2xl text-xs text-blue-700 shadow-xs">
            <Info size={16} className="shrink-0 mt-0.5 text-blue-500" />
            <span>Rasio hanya dihitung untuk kabupaten/kota yang memiliki data catatan HCS dan titik SPKLU.</span>
          </div>
        )}
      </div>

      {/* ══════════════════════════════════════
          5. TABLE SECTION
      ══════════════════════════════════════ */}
      <div className="bg-white/75 backdrop-blur-sm border border-white rounded-3xl p-6 shadow-xs">
        <h3 className="text-sm font-bold text-slate-800 mb-1">Jumlah catatan HCS dan SPKLU per kabupaten/kota</h3>
        <p className="text-xs text-slate-500 mb-4">Rasio tidak dihitung pada wilayah tanpa SPKLU terpetakan.</p>
        <DataTable
          data={rows.map((r) => ({ Wilayah: r.Wilayah, HCS: r.HCS, SPKLU: r.SPKLU, Rasio: r.Rasio != null ? Math.round(r.Rasio * 100) / 100 : null, Status: r.Status })) as unknown as Record<string, unknown>[]}
          searchable
          searchPlaceholder="Cari kabupaten / kota…"
          columns={[
            { key: 'Wilayah', label: 'Kabupaten / kota', className: 'text-xs font-semibold text-slate-800' },
            { key: 'HCS',     label: 'Catatan HCS',      className: 'text-xs', render: (v) => fmtNumber(v as number) },
            { key: 'SPKLU',   label: 'Titik SPKLU',      className: 'text-xs', render: (v) => fmtNumber(v as number) },
            { key: 'Rasio',   label: 'Rasio HCS/SPKLU',  className: 'text-xs', render: (v) => v != null ? <span className="font-bold text-blue-600">{fmtNumber(v as number, 2)}</span> : '—' },
            { key: 'Status',  label: 'Status data',      className: 'text-xs', render: (v) => {
              const s = v as string
              const cls = s === 'Dapat dihitung' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : s === 'SPKLU belum terpetakan' ? 'bg-amber-50 text-amber-700 border-amber-200' : 'bg-slate-100 text-slate-500 border-slate-200'
              return <span className={`text-[10px] px-2.5 py-0.5 rounded-full font-semibold border ${cls}`}>{s}</span>
            }},
          ]}
        />
      </div>
    </div>
  )
}
