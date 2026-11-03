'use client'
import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, TooltipProps,
} from 'recharts'
import { fetchCompare, fetchAreas, downloadExport } from '@/lib/api'
import { fmtNumber } from '@/lib/utils'
import InsightBlock from '@/components/ui/InsightBlock'
import DataTable from '@/components/ui/DataTable'
import { AlertTriangle, Info, Download } from 'lucide-react'

/* ── Lightweight glass tooltip ─────────────────────────── */
function ChartTooltip({ active, payload, label }: TooltipProps<number, string>) {
  if (!active || !payload?.length) return null
  return (
    <div
      className="rounded-xl px-3 py-2 text-xs"
      style={{
        background: 'rgba(255,255,255,0.95)',
        border: '1px solid rgba(108,99,255,0.14)',
        backdropFilter: 'blur(8px)',
        boxShadow: '0 8px 24px rgba(108,99,255,0.14)',
      }}
    >
      {label && <p className="font-semibold text-indigo-900 mb-1 text-[11px]">{label}</p>}
      {payload.map((p, i) => (
        <p key={i} className="text-slate-600">
          <span className="font-bold" style={{ color: '#6C63FF' }}>
            {fmtNumber(p.value as number, 1)}
          </span>{' '}
          Rasio HCS/SPKLU
        </p>
      ))}
    </div>
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
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-2 mb-2">
            <span className="text-[10px] font-bold text-white px-2 py-0.5 rounded-full"
              style={{ background: 'linear-gradient(135deg, #6C63FF, #3B82F6)' }}>03</span>
            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Analisis Wilayah</span>
          </div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
            Perbandingan catatan HCS dan SPKLU
          </h1>
          <p className="text-slate-500 text-sm mt-1">
            Rasio HCS/SPKLU per kabupaten/kota di Jawa Timur.
          </p>
        </div>
        <button onClick={handleExport} disabled={exporting}
          className="flex items-center gap-2 shrink-0 text-xs font-medium text-slate-600 hover:text-primary-700 border border-slate-200 hover:border-primary-300 hover:bg-primary-50 px-3 py-1.5 rounded-lg transition-all disabled:opacity-50">
          <Download size={13} /> Export Excel
        </button>
      </div>

      {/* Area filter */}
      <div className="card-glass rounded-2xl p-4 flex items-center gap-4">
        <label className="text-xs font-bold text-slate-500 uppercase tracking-wider shrink-0">Wilayah Analisis</label>
        <select
          className="border border-primary-100 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-400/40 bg-white/80 text-slate-700"
          value={selectedArea} onChange={(e) => setSelectedArea(e.target.value)}
        >
          <option value="Semua">Semua kabupaten / kota</option>
          {areas.map((a) => <option key={a} value={a}>{a}</option>)}
        </select>
      </div>

      {/* Chart */}
      <div className="card-glass rounded-2xl p-6">
        <InsightBlock headline={headline} />
        {isLoading ? (
          <div className="h-80 skeleton rounded-xl" />
        ) : measurable.length === 0 ? (
          <div className="h-60 flex items-center justify-center text-slate-400 text-sm">
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
                {measurable.map((_, i) => <Cell key={i} fill="#6B4EC6" />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        )}
        <p className="text-xs text-slate-400 mt-3">
          Rasio tidak dihitung jika SPKLU belum terpetakan; rasio tinggi belum membuktikan kebutuhan SPKLU baru.
        </p>
      </div>

      {/* Audit warnings */}
      <div className="space-y-2">
        {quality?.spklu_unmapped ? (
          <div className="flex gap-3 p-4 bg-amber-50 border border-amber-200/80 rounded-2xl text-sm text-amber-800">
            <AlertTriangle size={17} className="shrink-0 mt-0.5 text-amber-500" />
            <span>Sebanyak {fmtNumber(quality.spklu_unmapped)} titik SPKLU Jawa Timur belum memiliki kabupaten/kota yang sesuai; periksa alamat sebelum menggunakan hasil rasio.</span>
          </div>
        ) : null}
        {zeroSpklu.length > 0 && (
          <div className="flex gap-3 p-4 bg-amber-50 border border-amber-200/80 rounded-2xl text-sm text-amber-800">
            <AlertTriangle size={17} className="shrink-0 mt-0.5 text-amber-500" />
            <span>Sebanyak {zeroSpklu.length} kabupaten/kota memiliki data catatan HCS tanpa titik SPKLU terpetakan; nilai rasio belum dapat dihitung.</span>
          </div>
        )}
        {!quality?.spklu_unmapped && zeroSpklu.length === 0 && rows.length > 0 && (
          <div className="flex gap-3 p-4 bg-blue-50 border border-blue-200/80 rounded-2xl text-sm text-blue-700">
            <Info size={17} className="shrink-0 mt-0.5" />
            <span>Rasio hanya dihitung untuk kabupaten/kota yang memiliki data catatan HCS dan titik SPKLU.</span>
          </div>
        )}
      </div>

      {/* Table */}
      <div className="card-glass rounded-2xl p-6">
        <h2 className="text-base font-semibold text-slate-800 mb-1">Jumlah catatan HCS dan SPKLU per kabupaten/kota</h2>
        <p className="text-xs text-slate-500 mb-4">Rasio tidak dihitung pada wilayah tanpa SPKLU terpetakan.</p>
        <DataTable
          data={rows.map((r) => ({ Wilayah: r.Wilayah, HCS: r.HCS, SPKLU: r.SPKLU, Rasio: r.Rasio != null ? Math.round(r.Rasio * 100) / 100 : null, Status: r.Status })) as unknown as Record<string, unknown>[]}
          searchable
          searchPlaceholder="Cari kabupaten / kota…"
          columns={[
            { key: 'Wilayah', label: 'Kabupaten / kota' },
            { key: 'HCS',     label: 'Catatan HCS',    render: (v) => fmtNumber(v as number) },
            { key: 'SPKLU',   label: 'Titik SPKLU',   render: (v) => fmtNumber(v as number) },
            { key: 'Rasio',   label: 'Rasio HCS/SPKLU', render: (v) => v != null ? fmtNumber(v as number, 2) : '—' },
            { key: 'Status',  label: 'Status data', render: (v) => {
              const s = v as string
              const cls = s === 'Dapat dihitung' ? 'bg-green-100 text-green-700' : s === 'SPKLU belum terpetakan' ? 'bg-amber-100 text-amber-700' : 'bg-slate-100 text-slate-500'
              return <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${cls}`}>{s}</span>
            }},
          ]}
        />
      </div>
    </div>
  )
}
