'use client'
import { useEffect, useState } from 'react'
import { MapContainer, TileLayer, CircleMarker, Tooltip, Popup } from 'react-leaflet'
import { COLORS, AREA_CENTERS } from '@/lib/constants'
import { fmtNumber } from '@/lib/utils'
import type { Spklu, HcsRecord } from '@/types'
import 'leaflet/dist/leaflet.css'

interface SpkluMapProps {
  sites: Spklu[]
  hcsData: HcsRecord[]
  layer: 'spklu' | 'hcs' | 'both'
  onSelectSite?: (id: number) => void
}

function SpkluPopup({ site }: { site: Spklu }) {
  return (
    <div className="max-w-xs font-sans">
      <div className="flex items-start gap-2 mb-2">
        <div className="font-bold text-gray-800 flex-1">{site.nama}</div>
        <span
          className="text-xs px-2 py-0.5 rounded-full shrink-0"
          style={{
            backgroundColor:
              site.pengelola === 'PLN'
                ? '#dbeafe'
                : site.pengelola === 'Non-PLN'
                ? '#fef9c3'
                : '#f3f4f6',
            color:
              site.pengelola === 'PLN'
                ? '#1e40af'
                : site.pengelola === 'Non-PLN'
                ? '#713f12'
                : '#374151',
          }}
        >
          {site.pengelola}
        </span>
      </div>
      <p className="text-xs text-gray-500 mb-1">
        {site.provinsi} · {site.wilayah}
      </p>
      <p className="text-xs text-gray-600 mb-2">{site.alamat || 'Alamat belum tersedia'}</p>
      <div className="text-sm font-semibold text-gray-800 mb-2">
        {fmtNumber(site.daya, 1)} kW · {site.unit} unit · {site.connector} konektor
      </div>
      {site.rincian?.length > 0 && (
        <table className="text-xs w-full border-collapse">
          <thead>
            <tr className="bg-gray-50">
              <th className="text-left px-2 py-1 border border-gray-200 font-medium">Daya</th>
              <th className="text-left px-2 py-1 border border-gray-200 font-medium">Unit</th>
              <th className="text-left px-2 py-1 border border-gray-200 font-medium">Konektor</th>
            </tr>
          </thead>
          <tbody>
            {site.rincian.map((d, i) => (
              <tr key={i}>
                <td className="px-2 py-1 border border-gray-200">{fmtNumber(d.kw, 1)} kW</td>
                <td className="px-2 py-1 border border-gray-200">{d.unit}</td>
                <td className="px-2 py-1 border border-gray-200">{d.connector}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
      <p className="text-xs text-gray-400 mt-2">Daya terpasang bukan ketersediaan saat ini.</p>
    </div>
  )
}

function HcsPopup({ area, total, brands }: { area: string; total: number; brands: [string, number][] }) {
  return (
    <div className="max-w-xs font-sans">
      <div className="font-bold text-gray-800 mb-1">{area}</div>
      <div className="text-sm font-semibold text-hcs mb-2">{fmtNumber(total)} catatan HCS</div>
      <div className="text-xs font-medium text-gray-600 mb-1">Kategori kendaraan:</div>
      <ul className="text-xs text-gray-600 space-y-0.5">
        {brands.slice(0, 5).map(([brand, cnt]) => (
          <li key={brand}>
            {brand}: <span className="font-semibold">{fmtNumber(cnt)}</span>
          </li>
        ))}
      </ul>
      <p className="text-xs text-gray-400 mt-2">
        Titik menunjukkan kabupaten/kota, bukan alamat pelanggan.
      </p>
    </div>
  )
}

export default function SpkluMap({ sites, hcsData, layer, onSelectSite }: SpkluMapProps) {
  const [mounted, setMounted] = useState(false)
  useEffect(() => setMounted(true), [])

  if (!mounted) {
    return (
      <div className="h-[600px] bg-gray-100 rounded-xl flex items-center justify-center text-gray-400 text-sm">
        Memuat peta…
      </div>
    )
  }

  // Group HCS by wilayah
  const hcsByArea: Record<string, { total: number; brands: [string, number][] }> = {}
  for (const r of hcsData) {
    if (!hcsByArea[r.wilayah]) hcsByArea[r.wilayah] = { total: 0, brands: [] }
    hcsByArea[r.wilayah].total += r.jumlah
    const existing = hcsByArea[r.wilayah].brands.find(([b]) => b === r.merk)
    if (existing) existing[1] += r.jumlah
    else hcsByArea[r.wilayah].brands.push([r.merk, r.jumlah])
  }

  return (
    <MapContainer
      center={[-7.85, 113.3]}
      zoom={7}
      style={{ height: 600, width: '100%', borderRadius: '0.75rem' }}
      scrollWheelZoom={true}
    >
      <TileLayer
        url="https://tile.openstreetmap.org/{z}/{x}/{y}.png"
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        maxZoom={19}
      />

      {/* SPKLU markers */}
      {(layer === 'spklu' || layer === 'both') &&
        sites.map((site) => (
          <CircleMarker
            key={site.id}
            center={[site.lat, site.lon]}
            radius={7}
            pathOptions={{
              color: '#ffffff',
              weight: 2,
              fillColor: COLORS[site.pengelola] ?? COLORS['Tidak diketahui'],
              fillOpacity: 0.9,
            }}
            eventHandlers={{ click: () => onSelectSite?.(site.id) }}
          >
            <Tooltip>{site.nama}</Tooltip>
            <Popup maxWidth={380}>
              <SpkluPopup site={site} />
            </Popup>
          </CircleMarker>
        ))}

      {/* HCS area markers */}
      {(layer === 'hcs' || layer === 'both') &&
        Object.entries(hcsByArea).map(([area, info]) => {
          const center = AREA_CENTERS[area]
          if (!center) return null
          const radius = Math.min(30, 7 + Math.sqrt(info.total) * 0.45)
          const sortedBrands = [...info.brands].sort((a, b) => b[1] - a[1])
          return (
            <CircleMarker
              key={`hcs-${area}`}
              center={center}
              radius={radius}
              pathOptions={{
                color: '#ffffff',
                weight: 3,
                fillColor: COLORS.HCS,
                fillOpacity: 0.85,
              }}
            >
              <Tooltip>
                {area}: {fmtNumber(info.total)} catatan HCS
              </Tooltip>
              <Popup maxWidth={320}>
                <HcsPopup area={area} total={info.total} brands={sortedBrands} />
              </Popup>
            </CircleMarker>
          )
        })}
    </MapContainer>
  )
}

