'use client'
import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { fetchCompare, fetchAreas, downloadExport } from '@/lib/api'
import { fmtNumber } from '@/lib/utils'
import InsightBlock from '@/components/ui/InsightBlock'
import { AlertTriangle, TrendingUp, MapPin, Download, Printer } from 'lucide-react'

function CandidateCard({ rank, wilayah, hcs, spklu, rasio }: {
  rank: number; wilayah: string; hcs: number; spklu: number; rasio: number
}) {
  const medalColors = ['bg-amber-400', 'bg-slate-400', 'bg-amber-700', 'bg-slate-300', 'bg-slate-300']
  return (
    <div className="card-glass rounded-2xl p-5 flex gap-4 items-start hover:shadow-brand transition-all duration-200 hover:-translate-y-0.5">
      <div className={`w-9 h-9 rounded-full ${medalColors[rank - 1] ?? 'bg-slate-200'} text-white font-bold text-sm flex items-center justify-center shrink-0`}>
        {rank}
      </div>
      <div className="flex-1">
        <div className="font-bold text-slate-800 mb-0.5">{wilayah}</div>
        <div className="text-xs text-slate-500 mb-2">
          {fmtNumber(hcs)} catatan HCS &middot; {fmtNumber(spklu)} SPKLU
        </div>
        <div className="flex items-center gap-2">
          <div className="inline-flex items-center gap-1.5 bg-purple-50 text-purple-700 text-xs font-semibold px-2.5 py-1 rounded-full border border-purple-200">
            <TrendingUp size={11} />
            Rasio {fmtNumber(rasio, 1)}
          </div>
        </div>
        <p className="text-[11px] text-amber-600 mt-2 flex items-center gap-1">
          <AlertTriangle size={10} className="shrink-0" />
          Perlu kajian lanjutan sebelum penambahan SPKLU.
        </p>
      </div>
    </div>
  )
}

export default function KajianPage() {
  const [selectedArea, setSelectedArea] = useState('Semua')
  const [exporting, setExporting] = useState(false)

  async function handleExport() {
    setExporting(true)
    try {
      await downloadExport('/api/export/compare', 'kajian-rekomendasi.xlsx')
    } finally {
      setExporting(false)
    }
  }

  function handlePrint() {
    window.print()
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

  const candidates = rows
    .filter((r) => r.HCS > 0 && r.SPKLU > 0 && r.Rasio != null)
    .sort((a, b) => { const d = (b.Rasio ?? 0) - (a.Rasio ?? 0); return d !== 0 ? d : b.HCS - a.HCS })
    .slice(0, 5)

  const noSpklu = rows.filter((r) => r.HCS > 0 && r.SPKLU === 0).sort((a, b) => b.HCS - a.HCS).slice(0, 5)

  return (
    <div className="space-y-5">
      {/* Header */}
      <div>
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <div className="inline-flex items-center gap-2 mb-2">
              <span className="text-[10px] font-bold text-white px-2 py-0.5 rounded-full"
                style={{ background: 'linear-gradient(135deg, #6C63FF, #3B82F6)' }}>04</span>
              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Kajian</span>
            </div>
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
              Wilayah yang perlu dikaji untuk SPKLU baru
            </h1>
            <p className="text-slate-500 text-sm mt-1">
              Urutan berdasarkan rasio catatan HCS per titik SPKLU, bukan keputusan pembangunan.
            </p>
          </div>
          <button
            onClick={handleExport}
            disabled={exporting}
            className="flex items-center gap-1.5 text-xs font-medium text-slate-600 hover:text-primary-700 border border-slate-200 hover:border-primary-300 hover:bg-primary-50 px-3 py-1.5 rounded-lg transition-all disabled:opacity-50 shrink-0 mt-1"
          >
            <Download size={13} />
            {exporting ? 'Mengunduh…' : 'Export Excel'}
          </button>
          <button
            onClick={() => window.print()}
            className="flex items-center gap-1.5 text-xs font-medium text-slate-600 hover:text-primary-700 border border-slate-200 hover:border-primary-300 hover:bg-primary-50 px-3 py-1.5 rounded-lg transition-all print:hidden shrink-0 mt-1"
          >
            <Printer size={13} />
            Cetak / PDF
          </button>
        </div>
      </div>

      {/* Filter */}
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

      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {[0,1,2].map((i) => (
            <div key={i} className="card-glass rounded-2xl p-5 h-28">
              <div className="skeleton h-full w-full rounded-xl" />
            </div>
          ))}
        </div>
      ) : !quality?.ready ? (
        <div className="card-glass rounded-2xl p-8 text-center">
          <InsightBlock headline="Data SPKLU dan HCS belum lengkap" />
          <p className="text-sm text-slate-400">Unggah data SPKLU Jawa Timur dan catatan HCS untuk membuat daftar wilayah.</p>
        </div>
      ) : (
        <>
          {/* Candidates */}
          {candidates.length > 0 ? (
            <div>
              <InsightBlock headline="Kabupaten/kota berdasarkan rasio catatan HCS per SPKLU" />
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {candidates.map((r, i) => (
                  <CandidateCard key={r.Wilayah} rank={i+1} wilayah={r.Wilayah}
                    hcs={r.HCS} spklu={r.SPKLU} rasio={r.Rasio ?? 0} />
                ))}
              </div>
            </div>
          ) : (
            <div className="card-glass rounded-2xl p-6">
              <InsightBlock headline="Data perbandingan belum tersedia" />
              <p className="text-sm text-slate-500">Periksa penulisan kabupaten/kota pada kedua file.</p>
            </div>
          )}

          {/* No SPKLU areas */}
          {noSpklu.length > 0 && (
            <div className="card-glass rounded-2xl p-6">
              <h3 className="font-semibold text-slate-800 mb-3 flex items-center gap-2">
                <MapPin size={15} className="text-amber-500" />
                Kabupaten/kota dengan data SPKLU yang perlu diperiksa
              </h3>
              <ul className="space-y-2">
                {noSpklu.map((r) => (
                  <li key={r.Wilayah} className="flex items-center gap-2 text-sm text-slate-700 bg-amber-50 rounded-xl px-3 py-2">
                    <span className="w-2 h-2 rounded-full bg-amber-400 shrink-0" />
                    <span className="font-medium">{r.Wilayah}</span>
                    <span className="text-slate-500">— {fmtNumber(r.HCS)} catatan HCS, 0 titik SPKLU</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {quality?.spklu_unmapped ? (
            <div className="flex gap-3 p-4 bg-amber-50 border border-amber-200/80 rounded-2xl text-sm text-amber-800">
              <AlertTriangle size={17} className="shrink-0 mt-0.5 text-amber-500" />
              <span>Sebagian titik SPKLU belum dikenali kabupaten/kotanya; periksa alamat sebelum memakai hasil perbandingan.</span>
            </div>
          ) : null}
        </>
      )}

      {/* Disclaimer */}
      <div className="card-glass rounded-2xl p-6 space-y-3">
        <h3 className="font-semibold text-slate-800">Sumber dan batasan data</h3>
        <div className="text-sm text-slate-600 space-y-1.5">
          <p>Sumber: data SPKLU dan catatan HCS internal PLN ES.</p>
          <p>Data HCS dan perbandingan HCS/SPKLU hanya mencakup Jawa Timur.</p>
          <p>Setiap baris HCS yang valid dihitung termasuk UID berulang, sehingga jumlahnya belum tentu sama dengan jumlah pelanggan unik.</p>
        </div>
        <div className="bg-amber-50/80 border border-amber-200/80 rounded-xl p-4 flex items-start gap-2.5">
          <AlertTriangle size={16} className="text-amber-600 shrink-0 mt-0.5" />
          <p className="text-sm text-amber-800 font-medium leading-relaxed">
            Rasio tinggi <span className="font-bold">bukan otomatis</span> berarti wilayah tersebut membutuhkan SPKLU baru.
            Perlu verifikasi lapangan, kajian penggunaan, akses lokasi, dan kondisi jaringan listrik.
          </p>
        </div>
      </div>
    </div>
  )
}
