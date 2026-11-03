'use client'
import React, { useEffect, useRef, useState } from 'react'
import { MapContainer, TileLayer, CircleMarker, Tooltip, Popup, Circle, useMap } from 'react-leaflet'
import { COLORS, AREA_CENTERS } from '@/lib/constants'
import { fmtNumber } from '@/lib/utils'
import type { Spklu, HcsRecord } from '@/types'
import 'leaflet/dist/leaflet.css'

// ─── Basemap configs (100% Free, No API Key Required) ───────────────────────
const BASEMAPS = {
  osm: {
    label: 'Jalan (OSM)',
    url: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
    subdomains: 'abc',
    maxZoom: 19,
  },
  topo: {
    label: 'Topografi',
    url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Topo_Map/MapServer/tile/{z}/{y}/{x}',
    attribution: 'Tiles &copy; Esri',
    subdomains: '',
    maxZoom: 18,
  },
  satelit: {
    label: 'Satelit',
    url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
    attribution: 'Tiles &copy; Esri',
    subdomains: '',
    maxZoom: 18,
  },
} as const
type BasemapKey = keyof typeof BASEMAPS

const DEFAULT_CENTER: [number, number] = [-7.85, 113.3]
const DEFAULT_ZOOM = 7

// ─── Map Controller (fly-to + reset) ─────────────────────────────────────────
function MapController({
  flyToArea,
  flyToSite,
  resetKey,
}: {
  flyToArea?: string
  flyToSite?: [number, number] | null
  resetKey: number
}) {
  const map = useMap()
  const isFirstReset = useRef(true)

  useEffect(() => {
    if (!flyToArea || flyToArea === 'Semua') return
    const center = AREA_CENTERS[flyToArea]
    if (center) map.flyTo(center, 10, { duration: 1.2, easeLinearity: 0.25 })
  }, [flyToArea, map])

  useEffect(() => {
    if (!flyToSite) return
    map.flyTo(flyToSite, 14, { duration: 1.2, easeLinearity: 0.25 })
  }, [flyToSite, map])

  useEffect(() => {
    if (isFirstReset.current) { isFirstReset.current = false; return }
    map.flyTo(DEFAULT_CENTER, DEFAULT_ZOOM, { duration: 1.2 })
  }, [resetKey, map])

  return null
}

// ─── Popups ───────────────────────────────────────────────────────────────────
function SpkluPopup({ site }: { site: Spklu }) {
  const ownerStyle =
    site.pengelola === 'PLN'
      ? { bg: '#ede9fe', color: '#5b21b6' }
      : site.pengelola === 'Non-PLN'
      ? { bg: '#fef9c3', color: '#713f12' }
      : { bg: '#f3f4f6', color: '#374151' }

  const mapsUrl = `https://www.google.com/maps/dir/?api=1&destination=${site.lat},${site.lon}&travelmode=driving`

  return (
    <div style={{ fontFamily: "'Inter','Segoe UI',Arial,sans-serif", maxWidth: 320 }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8, marginBottom: 8 }}>
        <div style={{ fontWeight: 700, color: '#1E1B4B', flex: 1, lineHeight: 1.3 }}>{site.nama}</div>
        <span style={{
          fontSize: 11, padding: '2px 8px', borderRadius: 99, fontWeight: 600,
          background: ownerStyle.bg, color: ownerStyle.color, whiteSpace: 'nowrap',
        }}>
          {site.pengelola}
        </span>
      </div>
      <p style={{ fontSize: 12, color: '#6B7280', marginBottom: 4 }}>
        {site.provinsi} &middot; {site.wilayah}
      </p>
      <p style={{ fontSize: 12, color: '#4B5563', marginBottom: 8 }}>
        {site.alamat || 'Alamat belum tersedia'}
      </p>
      <div style={{ fontSize: 13, fontWeight: 700, color: '#1E1B4B', marginBottom: 10, display: 'flex', alignItems: 'center', gap: 6 }}>
        <svg width="14" height="14" viewBox="0 0 24 24" fill="#6C63FF" stroke="#6C63FF" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
          <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/>
        </svg>
        <span>{fmtNumber(site.daya, 1)} kW &middot; {site.unit} unit &middot; {site.connector} konektor</span>
      </div>
      {site.rincian?.length > 0 && (
        <table style={{ fontSize: 11, width: '100%', borderCollapse: 'collapse', marginBottom: 10 }}>
          <thead>
            <tr style={{ background: '#F5F0FF' }}>
              {['Daya', 'Unit', 'Konektor'].map((h) => (
                <th key={h} style={{ textAlign: 'left', padding: '4px 8px', border: '1px solid #E9D5FF', fontWeight: 600, color: '#5b21b6' }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {site.rincian.map((d, i) => (
              <tr key={i} style={{ background: i % 2 === 0 ? '#fff' : '#fafafa' }}>
                <td style={{ padding: '3px 8px', border: '1px solid #F3F4F6' }}>{fmtNumber(d.kw, 1)} kW</td>
                <td style={{ padding: '3px 8px', border: '1px solid #F3F4F6' }}>{d.unit}</td>
                <td style={{ padding: '3px 8px', border: '1px solid #F3F4F6' }}>{d.connector}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      {/* Google Maps navigation button */}
      <a
        href={mapsUrl}
        target="_blank"
        rel="noopener noreferrer"
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 6,
          width: '100%',
          padding: '7px 12px',
          borderRadius: 10,
          background: 'linear-gradient(135deg, #6C63FF 0%, #3B82F6 100%)',
          color: '#fff',
          fontWeight: 700,
          fontSize: 12,
          textDecoration: 'none',
          boxShadow: '0 2px 10px rgba(108,99,255,0.35)',
          marginBottom: 6,
          boxSizing: 'border-box',
        }}
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <polygon points="3 11 22 2 13 21 11 13 3 11"/>
        </svg>
        Petunjuk Arah (Google Maps)
      </a>
      <p style={{ fontSize: 10, color: '#9CA3AF', marginTop: 2, textAlign: 'center' }}>Daya terpasang bukan ketersediaan saat ini.</p>
    </div>
  )
}

function HcsPopup({ area, total, brands }: { area: string; total: number; brands: [string, number][] }) {
  return (
    <div style={{ fontFamily: "'Inter','Segoe UI',Arial,sans-serif", maxWidth: 280 }}>
      <div style={{ fontWeight: 700, color: '#1E1B4B', marginBottom: 4, lineHeight: 1.3 }}>{area}</div>
      <div style={{ fontSize: 13, fontWeight: 700, color: '#8B5CF6', marginBottom: 8 }}>{fmtNumber(total)} catatan HCS</div>
      <div style={{ fontSize: 11, fontWeight: 600, color: '#4B5563', marginBottom: 4 }}>Kategori kendaraan:</div>
      <ul style={{ fontSize: 11, color: '#4B5563', margin: 0, padding: 0, listStyle: 'none' }}>
        {brands.slice(0, 5).map(([brand, cnt]) => (
          <li key={brand} style={{ display: 'flex', justifyContent: 'space-between', padding: '2px 0' }}>
            <span>{brand}</span>
            <span style={{ fontWeight: 600, color: '#4C1D95' }}>{fmtNumber(cnt)}</span>
          </li>
        ))}
      </ul>
      <p style={{ fontSize: 11, color: '#9CA3AF', marginTop: 8 }}>Titik menunjukkan kabupaten/kota, bukan alamat pelanggan.</p>
    </div>
  )
}

// ─── Main Component ───────────────────────────────────────────────────────────
interface SpkluMapProps {
  sites: Spklu[]
  hcsData: HcsRecord[]
  layer: 'spklu' | 'hcs' | 'both'
  onSelectSite?: (id: number) => void
  selectedId?: number | null
  showCoverage?: boolean
  flyToArea?: string
}

export default function SpkluMap({
  sites, hcsData, layer, onSelectSite, selectedId, showCoverage = false, flyToArea,
}: SpkluMapProps) {
  const [mounted, setMounted] = useState(false)
  const [basemap, setBasemap] = useState<BasemapKey>('osm')
  const [resetKey, setResetKey] = useState(0)

  useEffect(() => setMounted(true), [])

  const selectedSite = selectedId ? sites.find((s) => s.id === selectedId) : null
  const flyToSite: [number, number] | null = selectedSite ? [selectedSite.lat, selectedSite.lon] : null

  if (!mounted) {
    return (
      <div
        className="h-[600px] rounded-xl flex items-center justify-center text-slate-400 text-sm"
        style={{ background: 'linear-gradient(135deg, #F0EFFE, #EEF2FF)' }}
      >
        <div className="flex flex-col items-center gap-2">
          <div className="w-8 h-8 border-2 border-primary-400 border-t-transparent rounded-full animate-spin" />
          <span>Memuat peta...</span>
        </div>
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

  const bm = BASEMAPS[basemap]

  const floatingPanel: React.CSSProperties = {
    position: 'absolute',
    zIndex: 1000,
    background: 'rgba(255,255,255,0.94)',
    backdropFilter: 'blur(12px)',
    WebkitBackdropFilter: 'blur(12px)',
    border: '1px solid rgba(108,99,255,0.12)',
    borderRadius: 14,
    boxShadow: '0 4px 20px rgba(108,99,255,0.14)',
  }

  return (
    <div style={{ position: 'relative' }}>
      <MapContainer
        center={DEFAULT_CENTER}
        zoom={DEFAULT_ZOOM}
        style={{ height: 600, width: '100%', borderRadius: '0.75rem' }}
        scrollWheelZoom={true}
      >
        <TileLayer
          key={basemap}
          url={bm.url}
          attribution={bm.attribution}
          subdomains={bm.subdomains || 'abc'}
          maxZoom={bm.maxZoom}
        />

        <MapController flyToArea={flyToArea} flyToSite={flyToSite} resetKey={resetKey} />

        {/* Coverage circles */}
        {showCoverage && (layer === 'spklu' || layer === 'both') && sites.map((site) => (
          <Circle
            key={`cov-${site.id}`}
            center={[site.lat, site.lon]}
            radius={5000}
            pathOptions={{ color: '#6C63FF', weight: 1, fillColor: '#6C63FF', fillOpacity: 0.07, dashArray: '5,4' }}
          />
        ))}

        {/* SPKLU markers */}
        {(layer === 'spklu' || layer === 'both') && sites.map((site) => {
          const isSelected = selectedId === site.id
          return (
            <React.Fragment key={site.id}>
              {isSelected && (
                <CircleMarker
                  center={[site.lat, site.lon]}
                  radius={15}
                  pathOptions={{
                    color: '#6C63FF',
                    weight: 2.5,
                    fillColor: '#6C63FF',
                    fillOpacity: 0.22,
                    dashArray: '3,3',
                  }}
                />
              )}
              <CircleMarker
                center={[site.lat, site.lon]}
                radius={isSelected ? 9 : 7}
                pathOptions={{
                  color: isSelected ? '#312E81' : '#ffffff',
                  weight: isSelected ? 3 : 2,
                  fillColor: COLORS[site.pengelola] ?? COLORS['Tidak diketahui'],
                  fillOpacity: 0.95,
                }}
                eventHandlers={{ click: () => onSelectSite?.(site.id) }}
              >
                <Tooltip>{site.nama}</Tooltip>
                <Popup maxWidth={380}><SpkluPopup site={site} /></Popup>
              </CircleMarker>
            </React.Fragment>
          )
        })}

        {/* HCS area markers */}
        {(layer === 'hcs' || layer === 'both') && Object.entries(hcsByArea).map(([area, info]) => {
          const center = AREA_CENTERS[area]
          if (!center) return null
          const radius = Math.min(30, 7 + Math.sqrt(info.total) * 0.45)
          const sortedBrands = [...info.brands].sort((a, b) => b[1] - a[1])
          return (
            <CircleMarker
              key={`hcs-${area}`}
              center={center}
              radius={radius}
              pathOptions={{ color: '#ffffff', weight: 3, fillColor: COLORS.HCS, fillOpacity: 0.85 }}
            >
              <Tooltip>{area}: {fmtNumber(info.total)} catatan HCS</Tooltip>
              <Popup maxWidth={300}><HcsPopup area={area} total={info.total} brands={sortedBrands} /></Popup>
            </CircleMarker>
          )
        })}
      </MapContainer>

      {/* Basemap switcher - bottom left */}
      <div style={{ ...floatingPanel, bottom: 16, left: 16, display: 'flex', gap: 3, padding: 4 }}>
        {(Object.keys(BASEMAPS) as BasemapKey[]).map((k) => (
          <button
            key={k}
            onClick={() => setBasemap(k)}
            style={{
              padding: '5px 11px',
              borderRadius: 10,
              fontSize: 11,
              fontWeight: 600,
              cursor: 'pointer',
              border: 'none',
              transition: 'all 0.15s',
              background: basemap === k ? 'linear-gradient(135deg, #6C63FF, #3B82F6)' : 'transparent',
              color: basemap === k ? '#fff' : '#64748b',
            }}
          >
            {BASEMAPS[k].label}
          </button>
        ))}
      </div>

      {/* Reset center - bottom right */}
      <button
        onClick={() => setResetKey((k) => k + 1)}
        style={{
          ...floatingPanel,
          bottom: 16,
          right: 16,
          padding: '6px 12px',
          fontSize: 11,
          fontWeight: 600,
          color: '#6C63FF',
          cursor: 'pointer',
          border: '1px solid rgba(108,99,255,0.18)',
          background: 'rgba(255,255,255,0.94)',
          display: 'flex',
          alignItems: 'center',
          gap: 6,
        }}
      >
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <path d="M21.5 2v6h-6M21.34 15.57a10 10 0 1 1-.57-8.38l5.67-5.67"/>
        </svg>
        Pusatkan Peta
      </button>
    </div>
  )
}
