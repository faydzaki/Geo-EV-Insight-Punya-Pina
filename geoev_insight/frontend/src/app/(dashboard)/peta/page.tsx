'use client'
import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import dynamic from 'next/dynamic'
import { fetchSpklu, fetchHcs, fetchAreas } from '@/lib/api'
import { fmtNumber } from '@/lib/utils'
import KpiCard from '@/components/ui/KpiCard'
import FilterBar from '@/components/ui/FilterBar'
import InsightBlock from '@/components/ui/InsightBlock'
import DataTable from '@/components/ui/DataTable'
import type { Spklu } from '@/types'

const SpkluMap = dynamic(() => import('@/components/map/SpkluMap'), { ssr: false })

const LAYER_OPTIONS = [
  { value: 'spklu', label: 'SPKLU' },
  { value: 'hcs', label: 'Catatan HCS per kabupaten/kota' },
  { value: 'both', label: 'SPKLU dan HCS' },
] as const

type Layer = 'spklu' | 'hcs' | 'both'

export default function PetaPage() {
  const [filters, setFilters] = useState({
    prov: 'Semua',
    owner: 'Semua',
    area: 'Semua',
    power: 'all',
    search: '',
  })
  const [layer, setLayer] = useState<Layer>('spklu')
  const [selectedId, setSelectedId] = useState<number | null>(null)

  const { data: spkluRes, isLoading } = useQuery({
    queryKey: ['spklu', filters],
    queryFn: () => fetchSpklu(filters),
    refetchInterval: 60_000,
  })

  const { data: hcsRes } = useQuery({
    queryKey: ['hcs'],
    queryFn: fetchHcs,
    refetchInterval: 60_000,
  })

  const { data: areasRes } = useQuery({
    queryKey: ['areas'],
    queryFn: fetchAreas,
  })

  const sites = spkluRes?.data ?? []
  const hcs = hcsRes?.data ?? []
  const areas = areasRes?.data ?? []

  const selectedSite: Spklu | null = selectedId ? (sites.find((s) => s.id === selectedId) ?? null) : null

  const totalDaya = sites.reduce((s, x) => s + x.daya, 0)
  const totalUnit = sites.reduce((s, x) => s + x.unit, 0)
  const totalConnector = sites.reduce((s, x) => s + x.connector, 0)

  const leadProvince = sites.length
    ? Object.entries(
        sites.reduce((acc: Record<string, number>, s) => {
          acc[s.provinsi] = (acc[s.provinsi] ?? 0) + 1
          return acc
        }, {})
      ).sort((a, b) => b[1] - a[1])[0]
    : null

  const tableData = sites.map((s) => ({
    nama: s.nama,
    wilayah: s.wilayah,
    provinsi: s.provinsi,
    pengelola: s.pengelola,
    unit: s.unit,
    connector: s.connector,
    daya: Math.round(s.daya * 10) / 10,
  }))

  function handleFilterChange(key: string, value: string) {
    setFilters((prev) => ({ ...prev, [key]: value }))
  }

  function handleReset() {
    setFilters({ prov: 'Semua', owner: 'Semua', area: 'Semua', power: 'all', search: '' })
  }

  return (
    <div className="space-y-6 max-w-screen-2xl">
      {/* Header */}
      <div>
        <span className="text-xs font-bold text-primary-500 uppercase tracking-widest">01</span>
        <h1 className="text-2xl font-bold text-gray-900 mt-1">
          Jaringan Pengisian Jawa Timur &amp; Bali
        </h1>
        <p className="text-gray-500 text-sm mt-1">
          Peta menampilkan lokasi SPKLU dan jumlah catatan HCS per kabupaten/kota di Jawa Timur.
        </p>
        {spkluRes?.updated && (
          <p className="text-xs text-gray-400 mt-0.5">Diperbarui: {spkluRes.updated}</p>
        )}
      </div>

      {/* Filter Bar */}
      <FilterBar
        prov={filters.prov}
        owner={filters.owner}
        area={filters.area}
        power={filters.power}
        search={filters.search}
        areas={areas}
        onChange={handleFilterChange}
        onReset={handleReset}
      />

      {/* KPIs */}
      {isLoading ? (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="bg-white rounded-xl border border-gray-200 p-5 h-24 animate-pulse" />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <KpiCard title="Titik SPKLU" value={fmtNumber(sites.length)} subtitle="Lokasi terpilih" />
          <KpiCard title="Unit charger" value={fmtNumber(totalUnit)} subtitle="Lokasi terpilih" />
          <KpiCard title="Konektor" value={fmtNumber(totalConnector)} subtitle="Lokasi terpilih" />
          <KpiCard
            title="Total daya"
            value={`${fmtNumber(totalDaya, 1)} kW`}
            subtitle="Lokasi terpilih"
          />
        </div>
      )}

      {/* Map Section */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <InsightBlock
          headline={
            leadProvince
              ? `${leadProvince[0]}: ${fmtNumber(leadProvince[1])} titik SPKLU pada filter yang dipilih`
              : 'Data SPKLU belum tersedia. Unggah file Excel melalui Manajemen Data.'
          }
        />

        {/* Layer toggle */}
        <div className="flex flex-wrap gap-4 mb-4">
          {LAYER_OPTIONS.map((opt) => (
            <label key={opt.value} className="flex items-center gap-2 cursor-pointer text-sm">
              <input
                type="radio"
                name="map-layer"
                value={opt.value}
                checked={layer === opt.value}
                onChange={() => setLayer(opt.value)}
                className="accent-primary-500"
              />
              <span className={layer === opt.value ? 'font-semibold text-primary-700' : 'text-gray-600'}>
                {opt.label}
              </span>
            </label>
          ))}
        </div>

        {/* Map + Detail panel */}
        <div className="flex gap-5">
          <div className="flex-1 min-w-0">
            <SpkluMap
              sites={sites}
              hcsData={hcs}
              layer={layer}
              onSelectSite={setSelectedId}
            />

            {/* Legend */}
            <div className="flex gap-5 mt-3 text-xs text-gray-500">
              <div className="flex items-center gap-1.5">
                <span className="w-3 h-3 rounded-full bg-[#006199] inline-block" />
                PLN
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-3 h-3 rounded-full bg-[#E9AD2F] inline-block" />
                Non-PLN
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-3 h-3 rounded-full bg-[#98A7B9] inline-block" />
                Tidak diketahui
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-3 h-3 rounded-full bg-[#6B4EC6] inline-block" />
                Catatan HCS
              </div>
            </div>
            <p className="text-xs text-gray-400 mt-1">
              Klik titik untuk detail lokasi. Peta memerlukan koneksi internet.
            </p>
          </div>

          {/* Detail panel */}
          <aside className="w-72 shrink-0">
            <div className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3">
              Detail Lokasi
            </div>
            {selectedSite ? (
              <div className="space-y-2">
                <div className="font-bold text-gray-800">{selectedSite.nama}</div>
                <div className="text-xs text-gray-500">
                  {selectedSite.pengelola} · {selectedSite.wilayah}, {selectedSite.provinsi}
                </div>
                <div className="text-sm text-gray-600 leading-relaxed">
                  {selectedSite.alamat || 'Alamat belum tersedia'}
                </div>
                <div className="text-sm font-semibold text-primary-700">
                  {fmtNumber(selectedSite.daya, 1)} kW · {selectedSite.unit} unit ·{' '}
                  {selectedSite.connector} konektor
                </div>
                {selectedSite.rincian?.length > 0 && (
                  <div className="space-y-1 pt-1">
                    <div className="text-xs font-medium text-gray-500">Rincian charger:</div>
                    {selectedSite.rincian.map((d, i) => (
                      <div key={i} className="text-xs text-gray-500">
                        {fmtNumber(d.kw, 1)} kW × {d.unit} unit · {d.connector} konektor
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ) : (
              <div className="text-center text-gray-400 text-sm py-8">
                <div className="text-3xl mb-2">↗</div>
                <div className="font-medium text-gray-500">Kenali setiap lokasi</div>
                <div className="text-xs mt-1">Klik titik pada peta untuk melihat detail.</div>
              </div>
            )}
          </aside>
        </div>
      </div>

      {/* Detail table (collapsible) */}
      <details className="bg-white rounded-xl border border-gray-200">
        <summary className="px-6 py-4 cursor-pointer font-semibold text-gray-700 hover:bg-gray-50 rounded-xl transition-colors">
          Rincian pengelola, daya charger, dan data SPKLU ({sites.length} lokasi)
        </summary>
        <div className="px-6 pb-6">
          <DataTable
            data={tableData as unknown as Record<string, unknown>[]}
            columns={[
              { key: 'nama', label: 'Nama' },
              { key: 'wilayah', label: 'Kabupaten / kota' },
              { key: 'provinsi', label: 'Provinsi' },
              { key: 'pengelola', label: 'Pengelola' },
              { key: 'unit', label: 'Unit charger' },
              { key: 'connector', label: 'Konektor' },
              { key: 'daya', label: 'Daya (kW)' },
            ]}
          />
        </div>
      </details>
    </div>
  )
}

