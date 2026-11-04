'use client'
import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { fetchCompare, fetchAreas, downloadExport } from '@/lib/api'
import { fmtNumber } from '@/lib/utils'
import { AlertTriangle, TrendingUp, MapPin, Download, Printer, ChevronDown, RotateCcw } from 'lucide-react'

function CandidateCard({ rank, wilayah, hcs, spklu, rasio }: {
  rank: number; wilayah: string; hcs: number; spklu: number; rasio: number
}) {
  const medalColors = [
    'bg-gradient-to-br from-amber-400 to-amber-500 shadow-amber-400/30',
    'bg-gradient-to-br from-slate-300 to-slate-400 shadow-slate-300/30',
    'bg-gradient-to-br from-amber-600 to-amber-700 shadow-amber-600/30',
    'bg-slate-200 text-slate-600',
    'bg-slate-200 text-slate-600',
  ]
  return (
    <div className="bg-white/80 backdrop-blur-sm border border-white rounded-2xl p-5 flex gap-4 items-start shadow-xs hover:shadow-md transition-all duration-200 hover:-translate-y-0.5">
      <div className={`w-9 h-9 rounded-2xl ${medalColors[rank - 1] ?? 'bg-slate-200 text-slate-600'} text-white font-bold text-sm flex items-center justify-center shrink-0 shadow-xs`}>
        {rank}
      </div>
      <div className="flex-1 min-w-0">
        <div className="font-bold text-slate-800 text-sm mb-0.5 truncate">{wilayah}</div>
        <div className="text-xs text-slate-400 mb-2">
          {fmtNumber(hcs)} catatan HCS &middot; {fmtNumber(spklu)} SPKLU
        </div>
        <div className="flex items-center gap-2">
          <div className="inline-flex items-center gap-1.5 bg-blue-50 text-blue-700 text-xs font-semibold px-2.5 py-1 rounded-full border border-blue-200">
            <TrendingUp size={11} />
            Rasio {fmtNumber(rasio, 1)}
          </div>
        </div>
        <p className="text-[11px] text-amber-600 mt-2 flex items-center gap-1 leading-tight">
          <AlertTriangle size={11} className="shrink-0" />
          Perlu kajian lapangan lanjutan sebelum penambahan titik SPKLU.
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
              {/* Regional study / target map recommendation vectors */}
              <circle cx="450" cy="110" r="70" fill="#3B82F6" opacity="0.1" />
              <circle cx="450" cy="110" r="45" fill="#3B82F6" opacity="0.15" />
              <circle cx="450" cy="110" r="20" fill="#2563EB" opacity="0.3" />
              <circle cx="450" cy="110" r="6"  fill="#1D4ED8" />
              {/* Compass cross */}
              <line x1="450" y1="30" x2="450" y2="190" stroke="#93C5FD" strokeWidth="2" strokeDasharray="3 3" />
              <line x1="370" y1="110" x2="530" y2="110" stroke="#93C5FD" strokeWidth="2" strokeDasharray="3 3" />
            </svg>
          </div>

          <div className="relative z-10 max-w-xl">
            <div className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-white/70 backdrop-blur-md border border-white/80 rounded-full mb-3 shadow-xs">
              <span className="w-5 h-5 rounded-full bg-blue-600 text-white text-[10px] font-bold flex items-center justify-center">
                04
              </span>
              <span className="text-[10px] font-bold text-blue-700 tracking-wider uppercase px-1">
                Kajian Wilayah
              </span>
            </div>

            <h2 className="text-2xl sm:text-3xl font-bold text-slate-800 tracking-tight mb-1.5 leading-snug">
              Wilayah yang Perlu Dikaji untuk SPKLU Baru
            </h2>
            <p className="text-slate-600 text-xs sm:text-sm mb-3">
              Urutan berdasarkan rasio catatan HCS per titik SPKLU sebagai pertimbangan prioritas pembangunan.
            </p>
          </div>
        </div>

        {/* Floating Filter Bar & Action Buttons */}
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

          <div className="flex items-center gap-2">
            <button
              onClick={handleExport}
              disabled={exporting}
              className="flex items-center gap-1.5 text-xs font-medium text-slate-700 hover:text-blue-600 bg-white hover:bg-blue-50 border border-slate-200/80 px-3.5 py-2 rounded-xl transition-all shadow-xs disabled:opacity-50"
            >
              <Download size={13} />
              <span>{exporting ? 'Mengunduh…' : 'Export Excel'}</span>
            </button>
            <button
              onClick={() => window.print()}
              className="flex items-center gap-1.5 text-xs font-medium text-blue-700 bg-blue-50 hover:bg-blue-100 border border-blue-200 px-3.5 py-2 rounded-xl transition-all shadow-xs print:hidden"
            >
              <Printer size={13} />
              <span>Cetak / PDF</span>
            </button>
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════
          2. CANDIDATES GRID
      ══════════════════════════════════════ */}
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className="bg-white/75 border border-white rounded-2xl p-5 h-28 animate-pulse" />
          ))}
        </div>
      ) : !quality?.ready ? (
        <div className="bg-white/75 border border-white rounded-3xl p-8 text-center shadow-xs">
          <p className="font-bold text-slate-800 text-sm">Data SPKLU dan HCS belum lengkap</p>
          <p className="text-xs text-slate-400 mt-1">Unggah data SPKLU Jawa Timur dan catatan HCS untuk membuat daftar prioritas wilayah.</p>
        </div>
      ) : (
        <div className="space-y-4">
          <div>
            <div className="flex items-center gap-2.5 mb-3 px-1">
              <div className="w-1 h-5 bg-blue-600 rounded-sm" />
              <h3 className="text-sm font-bold text-slate-800">
                Kabupaten/kota berdasarkan rasio catatan HCS per SPKLU (Prioritas Teratas)
              </h3>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {candidates.map((r, i) => (
                <CandidateCard
                  key={r.Wilayah}
                  rank={i + 1}
                  wilayah={r.Wilayah}
                  hcs={r.HCS}
                  spklu={r.SPKLU}
                  rasio={r.Rasio ?? 0}
                />
              ))}
            </div>
          </div>

          {/* No SPKLU Areas */}
          {noSpklu.length > 0 && (
            <div className="bg-white/75 backdrop-blur-sm border border-white rounded-3xl p-5 shadow-xs">
              <h3 className="font-bold text-slate-800 text-xs sm:text-sm mb-3 flex items-center gap-2">
                <MapPin size={15} className="text-amber-500" />
                Kabupaten/kota dengan catatan HCS tanpa titik SPKLU
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                {noSpklu.map((r) => (
                  <div key={r.Wilayah} className="flex items-center justify-between p-3 bg-amber-50/70 border border-amber-200/60 rounded-xl text-xs">
                    <span className="font-semibold text-slate-800 truncate mr-2">{r.Wilayah}</span>
                    <span className="text-amber-700 font-bold shrink-0">{fmtNumber(r.HCS)} HCS · 0 SPKLU</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {quality?.spklu_unmapped ? (
            <div className="flex gap-3 p-4 bg-amber-50/80 border border-amber-200/80 rounded-2xl text-xs text-amber-800 shadow-xs">
              <AlertTriangle size={16} className="shrink-0 mt-0.5 text-amber-500" />
              <span>Sebagian titik SPKLU belum dikenali kabupaten/kotanya; periksa alamat sebelum memakai hasil perbandingan.</span>
            </div>
          ) : null}
        </div>
      )}

      {/* ══════════════════════════════════════
          3. DISCLAIMER & NOTES
      ══════════════════════════════════════ */}
      <div className="bg-white/75 backdrop-blur-sm border border-white rounded-3xl p-5 space-y-3 shadow-xs">
        <h4 className="font-bold text-slate-800 text-xs sm:text-sm">Sumber dan batasan data</h4>
        <div className="text-xs text-slate-500 space-y-1 leading-relaxed">
          <p>• Sumber: data SPKLU dan catatan HCS internal PLN ES.</p>
          <p>• Data HCS dan perbandingan HCS/SPKLU mencakup wilayah Jawa Timur.</p>
          <p>• Setiap baris HCS yang valid dihitung termasuk UID berulang, sehingga jumlahnya bukan pelanggan unik.</p>
        </div>
        <div className="bg-amber-50/80 border border-amber-200/80 rounded-xl p-3.5 flex items-start gap-2.5">
          <AlertTriangle size={15} className="text-amber-600 shrink-0 mt-0.5" />
          <p className="text-xs text-amber-800 font-medium leading-relaxed">
            Rasio tinggi <span className="font-bold">bukan otomatis</span> berarti wilayah tersebut wajib dibangun SPKLU baru.
            Perlu verifikasi lapangan, kesiapan daya gardu, akses jalan, dan pola mobilitas kendaraan listrik.
          </p>
        </div>
      </div>
    </div>
  )
}
