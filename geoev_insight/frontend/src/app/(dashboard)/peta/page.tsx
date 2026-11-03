'use client'
import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import dynamic from 'next/dynamic'
import { fetchSpklu, fetchHcs, fetchAreas, downloadExport } from '@/lib/api'
import { fmtNumber } from '@/lib/utils'
import KpiCard from '@/components/ui/KpiCard'
import FilterBar from '@/components/ui/FilterBar'
import InsightBlock from '@/components/ui/InsightBlock'
import DataTable from '@/components/ui/DataTable'
import type { Spklu } from '@/types'
import { Download, ChevronDown, MapPin, Zap, Plug, Gauge, Navigation, Copy, Check } from 'lucide-react'

const SpkluMap = dynamic(() => import('@/components/map/SpkluMap'), { ssr: false })

const LAYER_OPTIONS = [
  { value: 'spklu', label: 'SPKLU' },
  { value: 'hcs',   label: 'Catatan HCS' },
  { value: 'both',  label: 'SPKLU & HCS' },
] as const
type Layer = 'spklu' | 'hcs' | 'both'

function SkeletonKpi() {
  return (
    <div className="card-glass rounded-2xl p-5">
      <div className="skeleton h-9 w-9 rounded-xl mb-3" />
      <div className="skeleton h-3 w-20 rounded mb-2" />
      <div className="skeleton h-7 w-24 rounded mb-2" />
      <div className="skeleton h-2.5 w-16 rounded" />
    </div>
  )
}

export default function PetaPage() {
  const [filters, setFilters] = useState({ prov: 'Semua', owner: 'Semua', area: 'Semua', power: 'all', search: '' })
  const [layer, setLayer]         = useState<Layer>('spklu')
  const [selectedId, setSelectedId] = useState<number | null>(null)
  const [showCoverage, setShowCoverage] = useState(false)
  const [exporting, setExporting] = useState(false)
  const [copied, setCopied] = useState(false)

  const { data: spkluRes, isLoading } = useQuery({
    queryKey: ['spklu', filters],
    queryFn:  () => fetchSpklu(filters),
    refetchInterval: 60_000,
  })
  const { data: hcsRes }   = useQuery({ queryKey: ['hcs'],   queryFn: fetchHcs,   refetchInterval: 60_000 })
  const { data: areasRes } = useQuery({ queryKey: ['areas'], queryFn: fetchAreas })

  const sites  = spkluRes?.data ?? []
  const hcs    = hcsRes?.data   ?? []
  const areas  = areasRes?.data ?? []

  const selectedSite: Spklu | null = selectedId ? (sites.find((s) => s.id === selectedId) ?? null) : null
  const totalDaya      = sites.reduce((s, x) => s + x.daya,      0)
  const totalUnit      = sites.reduce((s, x) => s + x.unit,      0)
  const totalConnector = sites.reduce((s, x) => s + x.connector, 0)

  const leadProvince = sites.length
    ? Object.entries(sites.reduce((acc: Record<string, number>, s) => {
        acc[s.provinsi] = (acc[s.provinsi] ?? 0) + 1; return acc
      }, {})).sort((a, b) => b[1] - a[1])[0]
    : null

  function handleFilterChange(key: string, value: string) {
    setFilters((prev) => ({ ...prev, [key]: value }))
  }
  function handleReset() {
    setFilters({ prov: 'Semua', owner: 'Semua', area: 'Semua', power: 'all', search: '' })
  }
  async function handleExport(type: 'xlsx' | 'csv') {
    setExporting(true)
    try {
      await downloadExport(
        type === 'xlsx' ? '/api/export/spklu' : '/api/export/spklu.csv',
        type === 'xlsx' ? 'spklu-export.xlsx' : 'spklu-export.csv',
      )
    } finally { setExporting(false) }
  }

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <div className="inline-flex items-center gap-2 mb-2">
            <span className="text-[10px] font-bold text-white px-2 py-0.5 rounded-full"
              style={{ background: 'linear-gradient(135deg, #6C63FF, #3B82F6)' }}>01</span>
            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Infrastruktur</span>
          </div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
            Jaringan Pengisian Jawa Timur & Bali
          </h1>
          <p className="text-slate-500 text-sm mt-1">
            Peta lokasi SPKLU dan jumlah catatan HCS per kabupaten/kota.
          </p>
          {spkluRes?.updated && (
            <p className="text-xs text-slate-400 mt-0.5">Diperbarui: {spkluRes.updated}</p>
          )}
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <button onClick={() => handleExport('xlsx')} disabled={exporting}
            className="flex items-center gap-1.5 text-xs font-medium text-slate-600 hover:text-primary-700 border border-slate-200 hover:border-primary-300 hover:bg-primary-50 px-3 py-1.5 rounded-lg transition-all disabled:opacity-50">
            <Download size={13} /> Excel
          </button>
          <button onClick={() => handleExport('csv')} disabled={exporting}
            className="flex items-center gap-1.5 text-xs font-medium text-slate-600 hover:text-primary-700 border border-slate-200 hover:border-primary-300 hover:bg-primary-50 px-3 py-1.5 rounded-lg transition-all disabled:opacity-50">
            <Download size={13} /> CSV
          </button>
        </div>
      </div>

      {/* Filter */}
      <FilterBar prov={filters.prov} owner={filters.owner} area={filters.area}
        power={filters.power} search={filters.search} areas={areas}
        onChange={handleFilterChange} onReset={handleReset} />

      {/* KPIs */}
      {isLoading ? (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[0,1,2,3].map((i) => <SkeletonKpi key={i} />)}
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <KpiCard title="Titik SPKLU"   value={fmtNumber(sites.length)} subtitle="Lokasi terpilih" icon={<MapPin size={18} />} color="teal" />
          <KpiCard title="Unit Charger"  value={fmtNumber(totalUnit)}    subtitle="Lokasi terpilih" icon={<Zap size={18} />} color="blue" />
          <KpiCard title="Konektor"      value={fmtNumber(totalConnector)} subtitle="Lokasi terpilih" icon={<Plug size={18} />} color="purple" />
          <KpiCard title="Total Daya"    value={`${fmtNumber(totalDaya, 1)} kW`} subtitle="Daya terpasang" icon={<Gauge size={18} />} color="amber" />
        </div>
      )}

      {/* Map section */}
      <div id="map-container-section" className="card-glass rounded-2xl p-6">
        <InsightBlock
          headline={
            leadProvince
              ? `${leadProvince[0]}: ${fmtNumber(leadProvince[1])} titik SPKLU pada filter yang dipilih`
              : 'Data SPKLU belum tersedia. Unggah file Excel melalui Manajemen Data.'
          }
        />

        {/* Controls */}
        <div className="flex flex-wrap gap-4 mb-4 items-center">
          {LAYER_OPTIONS.map((opt) => (
            <label key={opt.value} className="flex items-center gap-2 cursor-pointer text-sm select-none">
              <input type="radio" name="map-layer" value={opt.value}
                checked={layer === opt.value} onChange={() => setLayer(opt.value)}
                className="accent-primary-500" />
              <span className={layer === opt.value ? 'font-semibold text-primary-700' : 'text-slate-500'}>
                {opt.label}
              </span>
            </label>
          ))}
          <label className="flex items-center gap-2 cursor-pointer text-sm ml-auto select-none">
            <input type="checkbox" checked={showCoverage}
              onChange={(e) => setShowCoverage(e.target.checked)}
              className="accent-primary-500 rounded" />
            <span className="text-slate-500">Jangkauan 5 km</span>
          </label>
        </div>

        {/* Map + detail (responsive flex-col on tablet/mobile) */}
        <div className="flex flex-col lg:flex-row gap-5">
          <div className="flex-1 min-w-0">
            <SpkluMap
              sites={sites}
              hcsData={hcs}
              layer={layer}
              onSelectSite={setSelectedId}
              selectedId={selectedId}
              showCoverage={showCoverage}
              flyToArea={filters.area}
            />

            {/* Legend */}
            <div className="flex flex-wrap gap-4 mt-3 text-xs text-slate-500">
              {[
                { color: '#006199', label: 'PLN' },
                { color: '#E9AD2F', label: 'Non-PLN' },
                { color: '#98A7B9', label: 'Tidak diketahui' },
                { color: '#6B4EC6', label: 'Catatan HCS' },
              ].map(({ color, label }) => (
                <div key={label} className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full inline-block" style={{ background: color }} />
                  {label}
                </div>
              ))}
              {showCoverage && (
                <div className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full border-2 border-blue-400 bg-blue-100 inline-block" />
                  Jangkauan 5 km
                </div>
              )}
            </div>
            <p className="text-xs text-slate-400 mt-1">Klik titik untuk detail lokasi. Peta memerlukan koneksi internet.</p>
          </div>

          {/* Detail panel */}
          <aside className="w-full lg:w-80 shrink-0">
            <div className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-3">Detail Lokasi</div>
            {selectedSite ? (() => {
              const ownerColor =
                selectedSite.pengelola === 'PLN'       ? 'bg-violet-100 text-violet-700 border-violet-200' :
                selectedSite.pengelola === 'Non-PLN'   ? 'bg-amber-100 text-amber-700 border-amber-200'    :
                                                         'bg-slate-100 text-slate-500 border-slate-200'
              const mapsUrl = `https://www.google.com/maps/dir/?api=1&destination=${selectedSite.lat},${selectedSite.lon}&travelmode=driving`
              const coordStr = `${selectedSite.lat.toFixed(6)}, ${selectedSite.lon.toFixed(6)}`
              return (
                <div className="space-y-3 animate-slide-up bg-white/70 rounded-2xl p-4 border border-primary-100/60 shadow-xs">
                  {/* Name + owner badge */}
                  <div>
                    <div className="flex items-start gap-2 mb-1">
                      <MapPin size={14} className="text-primary-500 mt-0.5 shrink-0" />
                      <div className="font-bold text-slate-800 text-sm leading-tight flex-1">{selectedSite.nama}</div>
                    </div>
                    <div className="flex items-center gap-2 pl-5">
                      <span className={`text-[10px] px-2 py-0.5 rounded-full font-semibold border ${ownerColor}`}>
                        {selectedSite.pengelola}
                      </span>
                      <span className="text-xs text-slate-400">{selectedSite.wilayah}</span>
                    </div>
                  </div>

                  {/* Address */}
                  {selectedSite.alamat && (
                    <p className="text-xs text-slate-500 leading-relaxed pl-5 border-l-2 border-primary-100">
                      {selectedSite.alamat}
                    </p>
                  )}

                  {/* Power info badge */}
                  <div className="pl-5">
                    <div className="inline-flex items-center gap-1.5 bg-primary-50 text-primary-700 text-xs font-semibold px-2.5 py-1 rounded-full border border-primary-100">
                      <Zap size={11} className="shrink-0 text-primary-600" />
                      <span>{fmtNumber(selectedSite.daya, 1)} kW &middot; {selectedSite.unit} unit &middot; {selectedSite.connector} konektor</span>
                    </div>
                  </div>

                  {/* Charger details */}
                  {selectedSite.rincian?.length > 0 && (
                    <div className="space-y-1 pl-5">
                      <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Rincian charger</div>
                      {selectedSite.rincian.map((d, i) => (
                        <div key={i} className="text-xs text-slate-500 bg-slate-50 rounded-lg px-2.5 py-1.5 flex items-center gap-1.5">
                          <Zap size={10} className="text-primary-400 shrink-0" />
                          {fmtNumber(d.kw, 1)} kW &times; {d.unit} unit &middot; {d.connector} konektor
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Coordinates & Copy button */}
                  <div className="pl-5 flex items-center justify-between gap-2 pt-1 border-t border-slate-100">
                    <div className="text-[10px] text-slate-400 font-mono">
                      {selectedSite.lat.toFixed(5)}, {selectedSite.lon.toFixed(5)}
                    </div>
                    <button
                      onClick={() => {
                        navigator.clipboard.writeText(coordStr)
                        setCopied(true)
                        setTimeout(() => setCopied(false), 2000)
                      }}
                      className="text-[10px] font-medium text-primary-600 hover:text-primary-800 bg-primary-50 hover:bg-primary-100 px-2 py-0.5 rounded-md transition-colors flex items-center gap-1"
                      title="Salin koordinat GPS"
                    >
                      {copied ? <Check size={10} className="text-green-600" /> : <Copy size={10} />}
                      {copied ? 'Tersalin!' : 'Salin'}
                    </button>
                  </div>

                  {/* ── Google Maps Navigation Button ── */}
                  <a
                    href={mapsUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center justify-center gap-2 w-full py-2.5 px-4 rounded-xl text-sm font-semibold text-white transition-all duration-200 hover:scale-[1.02] hover:shadow-lg active:scale-[0.98]"
                    style={{
                      background: 'linear-gradient(135deg, #6C63FF 0%, #3B82F6 100%)',
                      boxShadow: '0 4px 14px rgba(108,99,255,0.35)',
                    }}
                  >
                    <Navigation size={15} className="shrink-0" />
                    Petunjuk Arah
                  </a>
                  <p className="text-[10px] text-slate-400 text-center -mt-1">
                    Buka di Google Maps &rarr; navigasi GPS
                  </p>
                </div>
              )
            })() : (
              <div className="text-center text-slate-400 py-10 px-4">
                <div className="w-12 h-12 rounded-2xl bg-slate-100 flex items-center justify-center mx-auto mb-3">
                  <MapPin size={20} className="text-slate-300" />
                </div>
                <div className="font-medium text-slate-500 text-sm">Kenali setiap lokasi</div>
                <div className="text-xs mt-1 text-slate-400">Klik titik pada peta untuk melihat detail.</div>
              </div>
            )}
          </aside>
        </div>
      </div>

      {/* Detail table collapsible */}
      <details className="card-glass rounded-2xl group">
        <summary className="px-6 py-4 cursor-pointer font-semibold text-slate-700 hover:bg-slate-50 rounded-2xl transition-colors select-none flex items-center justify-between">
          <span>Rincian data SPKLU ({sites.length} lokasi)</span>
          <ChevronDown size={16} className="text-slate-400 transition-transform group-open:rotate-180" />
        </summary>
        <div className="px-6 pb-6 border-t border-slate-50">
          <div className="h-3" />
          <DataTable
            data={sites.map((s) => ({
              id: s.id,
              nama: s.nama, wilayah: s.wilayah, provinsi: s.provinsi,
              pengelola: s.pengelola, unit: s.unit, connector: s.connector,
              daya: Math.round(s.daya * 10) / 10,
            })) as unknown as Record<string, unknown>[]}
            searchable
            searchPlaceholder="Cari nama atau wilayah SPKLU…"
            columns={[
              { key: 'nama',      label: 'Nama', className: 'font-semibold text-slate-800' },
              { key: 'wilayah',   label: 'Kabupaten / kota' },
              { key: 'provinsi',  label: 'Provinsi' },
              { key: 'pengelola', label: 'Pengelola' },
              { key: 'unit',      label: 'Unit charger' },
              { key: 'connector', label: 'Konektor' },
              { key: 'daya',      label: 'Daya (kW)' },
              {
                key: 'id',
                label: '',
                searchable: false,
                className: 'text-right w-24',
                render: (_v, row) => (
                  <button
                    onClick={() => {
                      setSelectedId(row.id as number)
                      const el = document.getElementById('map-container-section')
                      if (el) el.scrollIntoView({ behavior: 'smooth' })
                    }}
                    className="inline-flex items-center gap-1 text-xs font-semibold text-primary-600 hover:text-primary-800 bg-primary-50 hover:bg-primary-100 px-2.5 py-1 rounded-lg transition-colors border border-primary-200"
                  >
                    <Navigation size={11} />
                    Lihat Peta
                  </button>
                ),
              },
            ]}
          />
        </div>
      </details>
    </div>
  )
}
