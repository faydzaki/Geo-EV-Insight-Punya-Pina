'use client'
import { useState, useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import dynamic from 'next/dynamic'
import { fetchSpklu, fetchHcs, fetchAreas, downloadExport } from '@/lib/api'
import { fmtNumber } from '@/lib/utils'
import DataTable from '@/components/ui/DataTable'
import type { Spklu } from '@/types'
import {
  MapPin, Zap, Plug, Gauge, Users, Building2,
  ChevronDown, RotateCcw, Navigation, Check, Copy,
  Download, Car,
} from 'lucide-react'
import { OWNERS, POWER_OPTIONS, AREA_CENTERS } from '@/lib/constants'

const SpkluMap = dynamic(() => import('@/components/map/SpkluMap'), { ssr: false })

type Layer = 'spklu' | 'hcs' | 'both'

/* ── Trendline Waves for KPI Cards ── */
function TrendWave({ color }: { color: string }) {
  return (
    <svg viewBox="0 0 140 50" className="absolute bottom-0 right-0 w-32 h-14 pointer-events-none opacity-80" fill="none">
      <defs>
        <linearGradient id={`grad-${color}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.30" />
          <stop offset="100%" stopColor={color} stopOpacity="0.0" />
        </linearGradient>
      </defs>
      <path
        d="M0,45 C25,40 45,46 65,34 C85,22 105,32 120,18 C128,10 134,14 140,8 L140,50 L0,50 Z"
        fill={`url(#grad-${color})`}
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

/* ── Cityscape Silhouette for Detail Lokasi Bottom ── */
function CityscapeBottom() {
  return (
    <svg viewBox="0 0 300 80" className="w-full h-20 text-blue-900/10 fill-current pointer-events-none" preserveAspectRatio="none">
      <rect x="10"  y="45" width="16" height="35" rx="1" />
      <rect x="30"  y="35" width="22" height="45" rx="1" />
      <rect x="56"  y="50" width="14" height="30" rx="1" />
      <rect x="74"  y="28" width="26" height="52" rx="1" />
      <polygon points="87,14 74,28 100,28" />
      <rect x="104" y="42" width="20" height="38" rx="1" />
      <rect x="128" y="24" width="24" height="56" rx="1" />
      <rect x="156" y="38" width="18" height="42" rx="1" />
      <rect x="178" y="48" width="16" height="32" rx="1" />
      <rect x="198" y="20" width="28" height="60" rx="1" />
      <polygon points="212,8 198,20 226,20" />
      <rect x="230" y="36" width="20" height="44" rx="1" />
      <rect x="254" y="46" width="18" height="34" rx="1" />
      <rect x="276" y="30" width="20" height="50" rx="1" />
      <ellipse cx="25"  cy="75" rx="18" ry="10" />
      <ellipse cx="140" cy="74" rx="22" ry="12" />
      <ellipse cx="265" cy="76" rx="20" ry="10" />
    </svg>
  )
}

export default function PetaPage() {
  const [filters, setFilters] = useState({ prov: 'Semua', owner: 'Semua', area: 'Semua', power: 'all', search: '' })
  const [layer, setLayer] = useState<Layer>('spklu')
  const [selectedId, setSelectedId] = useState<number | null>(null)
  const [selectedHcsArea, setSelectedHcsArea] = useState<string | null>(null)
  const [resetMapKey, setResetMapKey] = useState(0)
  const [isSearchOpen, setIsSearchOpen] = useState(false)
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

  // Group HCS by area
  const hcsByArea = useMemo(() => {
    const acc: Record<string, { total: number; brands: [string, number][] }> = {}
    for (const r of hcs) {
      if (!acc[r.wilayah]) acc[r.wilayah] = { total: 0, brands: [] }
      acc[r.wilayah].total += r.jumlah
      const existing = acc[r.wilayah].brands.find(([b]) => b === r.merk)
      if (existing) existing[1] += r.jumlah
      else acc[r.wilayah].brands.push([r.merk, r.jumlah])
    }
    return acc
  }, [hcs])

  // Active site is empty until explicitly selected by clicking marker or search
  const activeSite: Spklu | null = selectedId
    ? (sites.find((s) => s.id === selectedId) ?? null)
    : null

  // Active HCS area is empty until explicitly selected by clicking HCS marker or search
  const activeHcs = useMemo(() => {
    if (!selectedHcsArea || !hcsByArea[selectedHcsArea]) return null
    const center = AREA_CENTERS[selectedHcsArea]
    if (!center) return null
    const info = hcsByArea[selectedHcsArea]
    const sortedBrands = [...info.brands].sort((a, b) => b[1] - a[1])
    return {
      area: selectedHcsArea,
      lat: center[0],
      lon: center[1],
      total: info.total,
      brands: sortedBrands,
      topBrand: sortedBrands[0]?.[0] ?? '—',
      alamat: `Pusat Wilayah ${selectedHcsArea}, Jawa Timur`,
    }
  }, [selectedHcsArea, hcsByArea])

  const totalDaya      = sites.reduce((s, x) => s + x.daya, 0)
  const totalUnit      = sites.reduce((s, x) => s + x.unit, 0)
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
    setSelectedId(null)
    setSelectedHcsArea(null)
    setIsSearchOpen(false)
    setResetMapKey((k) => k + 1)
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

  const mapsUrl = activeSite
    ? `https://www.google.com/maps/dir/?api=1&destination=${activeSite.lat},${activeSite.lon}&travelmode=driving`
    : activeHcs
    ? `https://www.google.com/maps/dir/?api=1&destination=${activeHcs.lat},${activeHcs.lon}&travelmode=driving`
    : '#'

  return (
    <div className="space-y-4">
      {/* ══════════════════════════════════════
          1. HERO SECTION WITH BACKGROUND (z-30 for dropdown clearance)
      ══════════════════════════════════════ */}
      <section id="section-hero" className="relative z-30">
        <div
          className="relative w-full rounded-3xl overflow-hidden shadow-xs border border-white flex flex-col justify-between px-6 sm:px-10 py-7 min-h-[190px] sm:min-h-[220px]"
          style={{
            background: 'linear-gradient(135deg, #E6F0FD 0%, #D8E7FD 50%, #E8F1FE 100%)',
          }}
        >
          {/* Decorative Sky Clouds & EV Car Vector Illustration */}
          <div className="absolute inset-0 pointer-events-none overflow-hidden z-0">
            <div className="absolute inset-y-0 left-0 w-3/5 bg-gradient-to-r from-[#E6F0FD]/95 via-[#E6F0FD]/80 to-transparent z-10" />

            {/* EV Scene SVG */}
            <svg
              viewBox="0 0 700 240"
              className="absolute right-0 bottom-0 h-full w-auto max-w-none pointer-events-none select-none z-0"
              preserveAspectRatio="xMaxYMax meet"
            >
              <defs>
                <linearGradient id="carGrad" x1="0" y1="0" x2="1" y2="0">
                  <stop offset="0%" stopColor="#FFFFFF" />
                  <stop offset="50%" stopColor="#F1F5F9" />
                  <stop offset="100%" stopColor="#E2E8F0" />
                </linearGradient>
                <linearGradient id="chargerGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#FFFFFF" />
                  <stop offset="100%" stopColor="#CBD5E1" />
                </linearGradient>
                <linearGradient id="glowBlue" x1="0" y1="0" x2="1" y2="1">
                  <stop offset="0%" stopColor="#38BDF8" />
                  <stop offset="100%" stopColor="#2563EB" />
                </linearGradient>
              </defs>

              {/* City Skyline */}
              <rect x="260" y="80" width="30" height="160" fill="#93C5FD" opacity="0.35" rx="3" />
              <rect x="295" y="60" width="40" height="180" fill="#93C5FD" opacity="0.45" rx="4" />
              <rect x="340" y="95" width="35" height="145" fill="#BFDBFE" opacity="0.4" rx="3" />
              <rect x="380" y="50" width="45" height="190" fill="#93C5FD" opacity="0.3" rx="4" />
              <polygon points="402,30 380,50 425,50" fill="#93C5FD" opacity="0.3" />
              <rect x="430" y="85" width="50" height="155" fill="#BFDBFE" opacity="0.35" rx="3" />
              <rect x="485" y="70" width="35" height="170" fill="#93C5FD" opacity="0.25" rx="4" />
              <rect x="525" y="90" width="60" height="150" fill="#BFDBFE" opacity="0.3" rx="3" />

              {/* Trees */}
              <ellipse cx="220" cy="180" rx="35" ry="40" fill="#86EFAC" opacity="0.6" />
              <ellipse cx="250" cy="170" rx="40" ry="45" fill="#4ADE80" opacity="0.5" />
              <ellipse cx="285" cy="185" rx="30" ry="35" fill="#22C55E" opacity="0.4" />
              <ellipse cx="440" cy="175" rx="45" ry="50" fill="#86EFAC" opacity="0.5" />
              <ellipse cx="480" cy="170" rx="50" ry="55" fill="#4ADE80" opacity="0.4" />

              {/* Ground */}
              <path d="M100,240 Q350,210 700,220 L700,240 L100,240 Z" fill="#E2E8F0" opacity="0.7" />
              <path d="M120,240 Q400,225 700,230 L700,240 Z" fill="#CBD5E1" opacity="0.5" />

              {/* EV Charging Station */}
              <g transform="translate(230, 40)">
                <ellipse cx="25" cy="195" rx="35" ry="8" fill="#64748B" opacity="0.25" />
                <rect x="5" y="10" width="40" height="185" rx="14" fill="url(#chargerGrad)" stroke="#94A3B8" strokeWidth="2" />
                <path d="M5,24 Q25,8 45,24" stroke="#60A5FA" strokeWidth="2.5" fill="none" />
                <rect x="12" y="32" width="26" height="42" rx="6" fill="#0F172A" />
                <path d="M25,40 L19,53 L26,53 L22,66 L31,50 L25,50 Z" fill="url(#glowBlue)" />
                <rect x="12" y="82" width="26" height="4" rx="2" fill="#38BDF8" opacity="0.8" />
                <rect x="36" y="95" width="12" height="24" rx="4" fill="#334155" />
                <path
                  d="M42,118 C50,150 70,185 105,175 C130,168 150,155 170,140"
                  stroke="#334155"
                  strokeWidth="5"
                  strokeLinecap="round"
                  fill="none"
                />
              </g>

              {/* EV Car */}
              <g transform="translate(380, 85)">
                <ellipse cx="145" cy="148" rx="140" ry="14" fill="#334155" opacity="0.3" />
                <path
                  d="M10,120 C15,90 40,78 75,70 C105,42 165,34 220,44 C255,50 280,72 295,95 C305,108 308,122 305,134 C285,136 270,136 250,136 C245,115 220,115 215,136 C140,136 120,136 100,136 C95,115 70,115 65,136 C35,136 20,135 10,120 Z"
                  fill="url(#carGrad)"
                  stroke="#CBD5E1"
                  strokeWidth="1.5"
                />
                <path
                  d="M82,68 C110,45 160,38 215,48 C245,54 265,70 275,90 L210,88 L145,86 Z"
                  fill="#1E293B"
                  opacity="0.85"
                />
                <path d="M125,50 L195,54 L145,84 L100,80 Z" fill="#60A5FA" opacity="0.35" />
                <path d="M205,55 L255,68 L248,87 L200,86 Z" fill="#93C5FD" opacity="0.25" />
                <path d="M285,102 C295,105 304,110 302,118 L280,114 Z" fill="#EF4444" />
                <path d="M14,115 C20,110 30,108 38,110 L18,122 Z" fill="#38BDF8" opacity="0.9" />
                <circle cx="82" cy="136" r="22" fill="#1E293B" />
                <circle cx="82" cy="136" r="14" fill="#94A3B8" />
                <circle cx="82" cy="136" r="6"  fill="#0F172A" />
                <circle cx="232" cy="136" r="22" fill="#1E293B" />
                <circle cx="232" cy="136" r="14" fill="#94A3B8" />
                <circle cx="232" cy="136" r="6"  fill="#0F172A" />
                <rect x="250" y="82" width="10" height="8" rx="2" fill="#E2E8F0" stroke="#94A3B8" />
              </g>
            </svg>
          </div>

          {/* Foreground Text Content */}
          <div className="relative z-10 max-w-xl">
            <div className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-white/70 backdrop-blur-md border border-white/80 rounded-full mb-3 shadow-xs">
              <span className="w-5 h-5 rounded-full bg-blue-600 text-white text-[10px] font-bold flex items-center justify-center">
                01
              </span>
              <span className="text-[10px] font-bold text-blue-700 tracking-wider uppercase px-1">
                Infrastruktur
              </span>
            </div>

            <h2 className="text-2xl sm:text-3xl font-bold text-slate-800 tracking-tight mb-1.5 leading-snug">
              Jaringan Pengisian Jawa Timur &amp; Bali
            </h2>

            <p className="text-slate-600 text-xs sm:text-sm mb-3">
              Peta lokasi SPKLU dan jumlah catatan HCS per kabupaten/kota.
            </p>

            <div className="flex items-center gap-2 text-xs text-slate-500 font-medium">
              <span className="w-2 h-2 rounded-full bg-emerald-500 ring-2 ring-emerald-200 animate-pulse" />
              <span>Diperbarui: {spkluRes?.updated ?? '22/10/2025 11:23 WIB'}</span>
            </div>
          </div>
        </div>

        {/* ══════════════════════════════════════
            FLOATING FILTER BAR (z-40 for search dropdown)
        ══════════════════════════════════════ */}
        <div className="relative z-40 mt-3 bg-white/80 backdrop-blur-md border border-white rounded-2xl shadow-xs p-2 flex flex-wrap lg:flex-nowrap items-center gap-2">
          {/* 4 Dropdown items */}
          <div className="flex-1 grid grid-cols-2 md:grid-cols-4 gap-2">
            {/* Provinsi */}
            <div className="relative flex items-center gap-2.5 px-3 py-2 bg-white/60 hover:bg-white rounded-xl border border-white/80 transition-colors cursor-pointer group">
              <div className="w-7 h-7 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
                <MapPin size={14} />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-[10px] text-slate-400 font-medium leading-none">Provinsi</p>
                <p className="text-xs font-semibold text-slate-800 truncate mt-0.5 leading-tight">
                  {filters.prov}
                </p>
              </div>
              <ChevronDown size={13} className="text-slate-400 shrink-0" />
              <select
                aria-label="Pilih Provinsi"
                value={filters.prov}
                onChange={(e) => handleFilterChange('prov', e.target.value)}
                className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
              >
                <option value="Semua">Semua provinsi</option>
                <option value="Jawa Timur">Jawa Timur</option>
                <option value="Bali">Bali</option>
              </select>
            </div>

            {/* Pengelola */}
            <div className="relative flex items-center gap-2.5 px-3 py-2 bg-white/60 hover:bg-white rounded-xl border border-white/80 transition-colors cursor-pointer group">
              <div className="w-7 h-7 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0">
                <Users size={14} />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-[10px] text-slate-400 font-medium leading-none">Pengelola</p>
                <p className="text-xs font-semibold text-slate-800 truncate mt-0.5 leading-tight">
                  {filters.owner}
                </p>
              </div>
              <ChevronDown size={13} className="text-slate-400 shrink-0" />
              <select
                aria-label="Pilih Pengelola"
                value={filters.owner}
                onChange={(e) => handleFilterChange('owner', e.target.value)}
                className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
              >
                <option value="Semua">Semua pengelola</option>
                {OWNERS.map((o) => <option key={o} value={o}>{o}</option>)}
              </select>
            </div>

            {/* Kabupaten / Kota */}
            <div className="relative flex items-center gap-2.5 px-3 py-2 bg-white/60 hover:bg-white rounded-xl border border-white/80 transition-colors cursor-pointer group">
              <div className="w-7 h-7 rounded-lg bg-purple-50 text-purple-600 flex items-center justify-center shrink-0">
                <Building2 size={14} />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-[10px] text-slate-400 font-medium leading-none">Kabupaten / Kota</p>
                <p className="text-xs font-semibold text-slate-800 truncate mt-0.5 leading-tight">
                  {filters.area === 'Semua' ? 'Semua wilayah' : filters.area}
                </p>
              </div>
              <ChevronDown size={13} className="text-slate-400 shrink-0" />
              <select
                aria-label="Pilih Kabupaten atau Kota"
                value={filters.area}
                onChange={(e) => handleFilterChange('area', e.target.value)}
                className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
              >
                <option value="Semua">Semua wilayah</option>
                {areas.map((a) => <option key={a} value={a}>{a}</option>)}
              </select>
            </div>

            {/* Kelompok Daya */}
            <div className="relative flex items-center gap-2.5 px-3 py-2 bg-white/60 hover:bg-white rounded-xl border border-white/80 transition-colors cursor-pointer group">
              <div className="w-7 h-7 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center shrink-0">
                <Zap size={14} />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-[10px] text-slate-400 font-medium leading-none">Kelompok Daya</p>
                <p className="text-xs font-semibold text-slate-800 truncate mt-0.5 leading-tight">
                  {POWER_OPTIONS.find((p) => p.value === filters.power)?.label ?? 'Semua kelompok'}
                </p>
              </div>
              <ChevronDown size={13} className="text-slate-400 shrink-0" />
              <select
                aria-label="Pilih Kelompok Daya"
                value={filters.power}
                onChange={(e) => handleFilterChange('power', e.target.value)}
                className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
              >
                {POWER_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
              </select>
            </div>
          </div>

          {/* Search Box & Reset with Autocomplete (z-50) */}
          <div className="relative z-50 flex items-center gap-2 w-full lg:w-auto mt-1 lg:mt-0">
            <div className="relative flex-1 lg:w-64">
              <div className="bg-white/90 rounded-xl px-3 py-2 flex items-center text-xs text-slate-500 border border-slate-200/80 focus-within:border-blue-500 focus-within:ring-2 focus-within:ring-blue-100 transition-all shadow-xs">
                <span className="mr-2 text-slate-400 text-sm">⌕</span>
                <input
                  type="text"
                  placeholder="Cari nama atau alamat..."
                  value={filters.search}
                  onFocus={() => {
                    if (filters.search.trim().length >= 2) setIsSearchOpen(true)
                  }}
                  onChange={(e) => {
                    handleFilterChange('search', e.target.value)
                    setIsSearchOpen(e.target.value.trim().length >= 2)
                  }}
                  className="bg-transparent outline-none w-full text-slate-800 placeholder-slate-400 text-xs"
                />
                {filters.search && (
                  <button
                    onClick={() => {
                      handleFilterChange('search', '')
                      setIsSearchOpen(false)
                    }}
                    className="text-slate-400 hover:text-slate-600 text-xs px-1"
                  >
                    ×
                  </button>
                )}
              </div>

              {/* Autocomplete Suggestions Popup with High Stacking Context (z-[9999]) */}
              {isSearchOpen && filters.search.trim().length >= 2 && (
                <div
                  className="absolute top-full left-0 right-0 mt-1.5 bg-white border border-slate-200/90 rounded-2xl shadow-2xl p-1.5 z-[9999] max-h-60 overflow-y-auto"
                  style={{
                    boxShadow: '0 20px 35px -5px rgba(15, 23, 42, 0.25), 0 8px 16px -6px rgba(15, 23, 42, 0.15)',
                  }}
                >
                  {/* SPKLU Matches */}
                  {sites.filter((s) =>
                    s.nama.toLowerCase().includes(filters.search.toLowerCase()) ||
                    (s.alamat && s.alamat.toLowerCase().includes(filters.search.toLowerCase()))
                  ).slice(0, 5).map((s) => (
                    <button
                      key={`search-spklu-${s.id}`}
                      type="button"
                      onClick={() => {
                        setSelectedId(s.id)
                        setSelectedHcsArea(null)
                        handleFilterChange('search', s.nama)
                        setIsSearchOpen(false)
                        const el = document.getElementById('section-map-details')
                        if (el) el.scrollIntoView({ behavior: 'smooth' })
                      }}
                      className="w-full text-left px-3 py-2 hover:bg-blue-50/90 rounded-xl transition-colors flex items-start gap-2.5 text-xs group"
                    >
                      <MapPin size={14} className="text-blue-500 mt-0.5 shrink-0 group-hover:scale-110 transition-transform" />
                      <div className="min-w-0 flex-1">
                        <div className="font-semibold text-slate-800 truncate">{s.nama}</div>
                        <div className="text-[10px] text-slate-400 truncate">{s.wilayah} · {s.pengelola}</div>
                      </div>
                    </button>
                  ))}

                  {/* HCS Area Matches */}
                  {Object.keys(hcsByArea)
                    .filter((area) => area.toLowerCase().includes(filters.search.toLowerCase()))
                    .slice(0, 3)
                    .map((area) => (
                      <button
                        key={`search-hcs-${area}`}
                        type="button"
                        onClick={() => {
                          setSelectedHcsArea(area)
                          setSelectedId(null)
                          handleFilterChange('search', area)
                          setIsSearchOpen(false)
                          const el = document.getElementById('section-map-details')
                          if (el) el.scrollIntoView({ behavior: 'smooth' })
                        }}
                        className="w-full text-left px-3 py-2 hover:bg-purple-50/90 rounded-xl transition-colors flex items-start gap-2.5 text-xs group"
                      >
                        <Car size={14} className="text-purple-600 mt-0.5 shrink-0 group-hover:scale-110 transition-transform" />
                        <div className="min-w-0 flex-1">
                          <div className="font-semibold text-slate-800 truncate">{area}</div>
                          <div className="text-[10px] text-purple-600 truncate">
                            {fmtNumber(hcsByArea[area]?.total ?? 0)} unit catatan Home Charging
                          </div>
                        </div>
                      </button>
                    ))}

                  {sites.filter((s) =>
                    s.nama.toLowerCase().includes(filters.search.toLowerCase()) ||
                    (s.alamat && s.alamat.toLowerCase().includes(filters.search.toLowerCase()))
                  ).length === 0 &&
                  Object.keys(hcsByArea).filter((area) =>
                    area.toLowerCase().includes(filters.search.toLowerCase())
                  ).length === 0 && (
                    <div className="px-3 py-3 text-xs text-slate-400 text-center">
                      Tidak ada SPKLU atau wilayah HCS yang cocok
                    </div>
                  )}
                </div>
              )}
            </div>

            <button
              onClick={handleReset}
              className="px-3.5 py-2 bg-white/70 hover:bg-white border border-slate-200/50 rounded-xl text-xs font-medium text-slate-600 flex items-center gap-1.5 transition-colors shadow-xs shrink-0 active:scale-95"
              title="Reset semua filter"
            >
              <RotateCcw size={12} className="text-slate-400" />
              <span>Reset</span>
            </button>
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════
          2. STATS GRID (4 KPI CARDS) (z-10)
      ══════════════════════════════════════ */}
      <section id="section-stats" className="relative z-10 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: TITIK SPKLU */}
        <div className="bg-white/75 backdrop-blur-sm border border-white rounded-2xl p-4 shadow-xs relative overflow-hidden flex flex-col justify-between h-28 hover:shadow-md transition-all">
          <div className="flex items-center gap-2.5 mb-1 relative z-10">
            <div className="w-7 h-7 rounded-lg bg-blue-100/90 text-blue-600 flex items-center justify-center">
              <MapPin size={15} />
            </div>
            <h3 className="text-[10px] font-bold text-slate-400 tracking-wider uppercase">
              Titik SPKLU
            </h3>
          </div>
          <div className="relative z-10">
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-bold text-slate-800 tracking-tight">
                {isLoading ? '...' : fmtNumber(sites.length)}
              </span>
              <span className="text-[11px] font-bold text-emerald-600 flex items-center gap-0.5">
                ↑ +12%
              </span>
            </div>
            <p className="text-[10px] text-slate-400 mt-0.5">Lokasi terpilih</p>
          </div>
          <TrendWave color="#3B82F6" />
        </div>

        {/* Card 2: UNIT CHARGER */}
        <div className="bg-white/75 backdrop-blur-sm border border-white rounded-2xl p-4 shadow-xs relative overflow-hidden flex flex-col justify-between h-28 hover:shadow-md transition-all">
          <div className="flex items-center gap-2.5 mb-1 relative z-10">
            <div className="w-7 h-7 rounded-lg bg-emerald-100/90 text-emerald-600 flex items-center justify-center">
              <Zap size={15} />
            </div>
            <h3 className="text-[10px] font-bold text-slate-400 tracking-wider uppercase">
              Unit Charger
            </h3>
          </div>
          <div className="relative z-10">
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-bold text-slate-800 tracking-tight">
                {isLoading ? '...' : fmtNumber(totalUnit)}
              </span>
              <span className="text-[11px] font-bold text-emerald-600 flex items-center gap-0.5">
                ↑ +8%
              </span>
            </div>
            <p className="text-[10px] text-slate-400 mt-0.5">Lokasi terpilih</p>
          </div>
          <TrendWave color="#10B981" />
        </div>

        {/* Card 3: KONEKTOR */}
        <div className="bg-white/75 backdrop-blur-sm border border-white rounded-2xl p-4 shadow-xs relative overflow-hidden flex flex-col justify-between h-28 hover:shadow-md transition-all">
          <div className="flex items-center gap-2.5 mb-1 relative z-10">
            <div className="w-7 h-7 rounded-lg bg-purple-100/90 text-purple-600 flex items-center justify-center">
              <Plug size={15} />
            </div>
            <h3 className="text-[10px] font-bold text-slate-400 tracking-wider uppercase">
              Konektor
            </h3>
          </div>
          <div className="relative z-10">
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-bold text-slate-800 tracking-tight">
                {isLoading ? '...' : fmtNumber(totalConnector)}
              </span>
              <span className="text-[11px] font-bold text-emerald-600 flex items-center gap-0.5">
                ↑ +11%
              </span>
            </div>
            <p className="text-[10px] text-slate-400 mt-0.5">Lokasi terpilih</p>
          </div>
          <TrendWave color="#8B5CF6" />
        </div>

        {/* Card 4: TOTAL DAYA */}
        <div className="bg-white/75 backdrop-blur-sm border border-white rounded-2xl p-4 shadow-xs relative overflow-hidden flex flex-col justify-between h-28 hover:shadow-md transition-all">
          <div className="flex items-center gap-2.5 mb-1 relative z-10">
            <div className="w-7 h-7 rounded-lg bg-orange-100/90 text-orange-600 flex items-center justify-center">
              <Gauge size={15} />
            </div>
            <h3 className="text-[10px] font-bold text-slate-400 tracking-wider uppercase">
              Total Daya
            </h3>
          </div>
          <div className="relative z-10">
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-bold text-slate-800 tracking-tight">
                {isLoading ? '...' : `${fmtNumber(totalDaya, 1)} kW`}
              </span>
              <span className="text-[11px] font-bold text-emerald-600 flex items-center gap-0.5">
                ↑ +14%
              </span>
            </div>
            <p className="text-[10px] text-slate-400 mt-0.5">Daya terpasang</p>
          </div>
          <TrendWave color="#F59E0B" />
        </div>
      </section>

      {/* ══════════════════════════════════════
          3. MAP AND DETAILS SECTION (z-10)
      ══════════════════════════════════════ */}
      <section id="section-map-details" className="relative z-10 grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Map Area (Spans 2 columns) */}
        <div className="lg:col-span-2 bg-white/75 backdrop-blur-sm border border-white rounded-3xl p-3 shadow-xs flex flex-col gap-2 relative">
          {/* Header inside Map Card */}
          <div className="flex flex-wrap items-center justify-between gap-3 px-2 py-1">
            <div className="flex items-center gap-2">
              <div className="w-1 h-4 bg-blue-600 rounded-sm" />
              <span className="text-xs font-semibold text-slate-800">
                {leadProvince
                  ? `${leadProvince[0]}: ${fmtNumber(leadProvince[1])} titik SPKLU pada filter yang dipilih`
                  : 'Memuat data SPKLU...'}
              </span>
            </div>

            {/* Layer Radio Options */}
            <div className="flex items-center gap-3">
              {[
                { val: 'spklu', label: 'SPKLU' },
                { val: 'hcs',   label: 'Catatan HCS' },
                { val: 'both',  label: 'SPKLU & HCS' },
              ].map((opt) => (
                <label key={opt.val} className="flex items-center gap-1.5 cursor-pointer text-xs select-none">
                  <input
                    type="radio"
                    name="map-layer-radio"
                    value={opt.val}
                    checked={layer === opt.val}
                    onChange={() => setLayer(opt.val as Layer)}
                    className="accent-blue-600 w-3.5 h-3.5"
                  />
                  <span className={layer === opt.val ? 'font-semibold text-blue-700' : 'text-slate-500'}>
                    {opt.label}
                  </span>
                </label>
              ))}
            </div>

            {/* Coverage button */}
            <button
              onClick={() => setShowCoverage((prev) => !prev)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium border transition-colors shadow-xs ${
                showCoverage
                  ? 'bg-blue-600 text-white border-blue-600 shadow-blue-500/25'
                  : 'bg-white/80 hover:bg-white text-slate-700 border-white'
              }`}
            >
              <span>⚙ Jangkauan 5 km</span>
              <ChevronDown size={11} className={showCoverage ? 'rotate-180 transition-transform' : ''} />
            </button>
          </div>

          {/* Interactive Leaflet Map Container */}
          <div className="relative w-full h-[390px] lg:h-[430px] rounded-2xl overflow-hidden border border-slate-100">
            <SpkluMap
              sites={sites}
              hcsData={hcs}
              layer={layer}
              onSelectSite={(id) => {
                setSelectedId(id)
                if (id !== null) setSelectedHcsArea(null)
              }}
              selectedId={selectedId}
              onSelectHcs={(area) => {
                setSelectedHcsArea(area)
                if (area !== null) setSelectedId(null)
              }}
              selectedHcsArea={selectedHcsArea}
              showCoverage={showCoverage}
              flyToArea={filters.area}
              resetKey={resetMapKey}
            />

            {/* Bottom-left Overlay: Legend Pill */}
            <div
              className="absolute bottom-3 left-3 bg-white/90 backdrop-blur-md rounded-xl px-3.5 py-2 flex flex-wrap items-center gap-3.5 shadow-sm border border-white/80 select-none"
              style={{ zIndex: 1000 }}
            >
              <div className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-blue-600" />
                <span className="text-[10px] font-semibold text-slate-700">PLN</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-amber-500" />
                <span className="text-[10px] font-semibold text-slate-700">Non-PLN</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-slate-400" />
                <span className="text-[10px] font-semibold text-slate-700">Tidak diketahui</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-purple-600" />
                <span className="text-[10px] font-semibold text-slate-700">Catatan HCS</span>
              </div>
            </div>

            {/* Bottom-right Action Button: Pusatkan Peta (Replaces Lihat Detail) */}
            <button
              type="button"
              onClick={() => {
                setSelectedId(null)
                setSelectedHcsArea(null)
                setResetMapKey((k) => k + 1)
              }}
              className="absolute bottom-3 right-3 bg-white/90 backdrop-blur-md hover:bg-white px-3.5 py-2 rounded-xl text-xs font-semibold text-slate-700 hover:text-blue-600 shadow-sm border border-white/80 transition-all flex items-center gap-1.5 active:scale-95"
              style={{ zIndex: 1000 }}
              title="Pusatkan kembali peta ke posisi awal"
            >
              <RotateCcw size={12} className="text-blue-600" />
              <span>Pusatkan Peta</span>
            </button>
          </div>
        </div>

        {/* Detail Area (Spans 1 column) */}
        <div className="bg-white/75 backdrop-blur-sm border border-white rounded-3xl p-5 shadow-xs flex flex-col justify-between relative overflow-hidden h-full min-h-[400px]">
          {/* Top Title */}
          <div className="relative z-10 flex items-center justify-between">
            <h3 className="font-bold text-slate-800 text-sm">
              {activeHcs ? 'Detail Wilayah HCS' : 'Detail Lokasi'}
            </h3>
            {(activeSite || activeHcs) && (
              <button
                onClick={() => {
                  const coords = activeSite
                    ? `${activeSite.lat.toFixed(6)}, ${activeSite.lon.toFixed(6)}`
                    : activeHcs
                    ? `${activeHcs.lat.toFixed(6)}, ${activeHcs.lon.toFixed(6)}`
                    : ''
                  navigator.clipboard.writeText(coords)
                  setCopied(true)
                  setTimeout(() => setCopied(false), 2000)
                }}
                className={`text-[10px] px-2 py-0.5 rounded-md flex items-center gap-1 font-medium transition-colors ${
                  activeHcs
                    ? 'text-purple-700 hover:text-purple-900 bg-purple-50'
                    : 'text-blue-600 hover:text-blue-800 bg-blue-50'
                }`}
                title="Salin koordinat GPS"
              >
                {copied ? <Check size={10} className="text-emerald-600" /> : <Copy size={10} />}
                <span>{copied ? 'Tersalin' : 'GPS'}</span>
              </button>
            )}
          </div>

          {/* Center Site Card or HCS Card or Friendly Empty State */}
          <div className="relative z-10 my-auto py-2">
            {activeSite ? (
              <div className="space-y-3">
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-2xl bg-blue-100 text-blue-600 flex items-center justify-center shrink-0 shadow-xs">
                    <MapPin size={18} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <h4 className="text-xs sm:text-sm font-bold text-slate-800 leading-tight mb-1 truncate">
                      {activeSite.nama}
                    </h4>
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-emerald-50 text-emerald-600 text-[10px] font-semibold rounded-md border border-emerald-100">
                      <span className="text-[7px]">●</span> Aktif
                    </span>
                  </div>
                </div>

                {/* 3 Stats Boxes */}
                <div className="grid grid-cols-3 gap-2">
                  <div className="bg-slate-50/80 border border-slate-100 rounded-xl p-2 flex flex-col items-center justify-center text-center">
                    <span className="text-xs font-bold text-slate-800 leading-tight mb-0.5">
                      ϟ {fmtNumber(activeSite.daya, 0)} kW
                    </span>
                    <span className="text-[10px] text-slate-400">Daya</span>
                  </div>
                  <div className="bg-slate-50/80 border border-slate-100 rounded-xl p-2 flex flex-col items-center justify-center text-center">
                    <span className="text-xs font-bold text-slate-800 leading-tight mb-0.5">
                      🔌 {activeSite.unit} unit
                    </span>
                    <span className="text-[10px] text-slate-400">Konektor</span>
                  </div>
                  <div className="bg-slate-50/80 border border-slate-100 rounded-xl p-2 flex flex-col items-center justify-center text-center">
                    <span className="text-xs font-bold text-slate-800 leading-tight mb-0.5">
                      📍 {activeSite.connector} lok.
                    </span>
                    <span className="text-[10px] text-slate-400">SPKLU</span>
                  </div>
                </div>

                {/* Rincian Daya, Unit & Konektor Table (Full tanpa scroll) */}
                {activeSite.rincian && activeSite.rincian.length > 0 && (
                  <div className="rounded-xl border border-blue-100/90 bg-white/90 overflow-hidden shadow-2xs">
                    <table className="w-full text-left text-xs border-collapse">
                      <thead>
                        <tr className="bg-[#EBF5FE] text-blue-700 border-b border-blue-100 text-[11px]">
                          <th className="py-1.5 px-3 font-semibold">Daya</th>
                          <th className="py-1.5 px-2 font-semibold text-center">Unit</th>
                          <th className="py-1.5 px-3 font-semibold text-center">Konektor</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 text-slate-700 text-xs font-normal">
                        {activeSite.rincian.map((d, i) => (
                          <tr key={i} className="hover:bg-blue-50/40 transition-colors">
                            <td className="py-1.5 px-3 font-medium text-slate-800">
                              {fmtNumber(d.kw, 1)} kW
                            </td>
                            <td className="py-1.5 px-2 text-center text-slate-600">
                              {d.unit}
                            </td>
                            <td className="py-1.5 px-3 text-center text-slate-600">
                              {d.connector}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}

                {/* Address preview */}
                {activeSite.alamat && (
                  <p className="text-[11px] text-slate-500 line-clamp-2 leading-relaxed bg-white/60 p-2 rounded-xl border border-white">
                    {activeSite.alamat}
                  </p>
                )}
              </div>
            ) : activeHcs ? (
              <div className="space-y-3">
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-2xl bg-purple-100 text-purple-600 flex items-center justify-center shrink-0 shadow-xs">
                    <Car size={18} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <h4 className="text-xs sm:text-sm font-bold text-slate-800 leading-tight mb-1 truncate">
                      {activeHcs.area}
                    </h4>
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-purple-50 text-purple-700 text-[10px] font-semibold rounded-md border border-purple-100">
                      <span className="text-[7px]">●</span> Terdata HCS ({fmtNumber(activeHcs.total)} unit)
                    </span>
                  </div>
                </div>

                {/* 3 Stats Boxes for HCS */}
                <div className="grid grid-cols-3 gap-2">
                  <div className="bg-purple-50/50 border border-purple-100/70 rounded-xl p-2 flex flex-col items-center justify-center text-center">
                    <span className="text-xs font-bold text-purple-900 leading-tight mb-0.5">
                      ⚡ {fmtNumber(activeHcs.total)}
                    </span>
                    <span className="text-[10px] text-purple-600/80">Total HCS</span>
                  </div>
                  <div className="bg-purple-50/50 border border-purple-100/70 rounded-xl p-2 flex flex-col items-center justify-center text-center">
                    <span className="text-xs font-bold text-purple-900 leading-tight mb-0.5 truncate max-w-[80px]">
                      🚗 {activeHcs.topBrand}
                    </span>
                    <span className="text-[10px] text-purple-600/80">Merek Top</span>
                  </div>
                  <div className="bg-purple-50/50 border border-purple-100/70 rounded-xl p-2 flex flex-col items-center justify-center text-center">
                    <span className="text-xs font-bold text-purple-900 leading-tight mb-0.5">
                      🏷️ {activeHcs.brands.length}
                    </span>
                    <span className="text-[10px] text-purple-600/80">Model EV</span>
                  </div>
                </div>

                {/* Rincian Mobil Listrik Table */}
                {activeHcs.brands.length > 0 && (
                  <div className="rounded-xl border border-purple-100/90 bg-white/90 overflow-hidden shadow-2xs max-h-[160px] overflow-y-auto">
                    <table className="w-full text-left text-xs border-collapse">
                      <thead className="sticky top-0 bg-[#F5F3FF] text-purple-800 border-b border-purple-100 text-[11px] z-10">
                        <tr>
                          <th className="py-1.5 px-3 font-semibold">Mobil Listrik</th>
                          <th className="py-1.5 px-2 font-semibold text-center">Unit</th>
                          <th className="py-1.5 px-3 font-semibold text-center">Porsi</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 text-slate-700 text-xs font-normal">
                        {activeHcs.brands.map(([brand, count], i) => (
                          <tr key={i} className="hover:bg-purple-50/40 transition-colors">
                            <td className="py-1.5 px-3 font-medium text-slate-800">
                              {brand}
                            </td>
                            <td className="py-1.5 px-2 text-center text-slate-600">
                              {fmtNumber(count)}
                            </td>
                            <td className="py-1.5 px-3 text-center text-purple-600 font-medium text-[11px]">
                              {activeHcs.total > 0 ? ((count / activeHcs.total) * 100).toFixed(1) : 0}%
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}

                {/* Representative Address & Coordinates */}
                <div className="bg-white/70 p-2.5 rounded-xl border border-purple-100/60 text-[11px] space-y-1">
                  <div className="text-slate-700 font-medium truncate">
                    📍 {activeHcs.alamat}
                  </div>
                  <div className="text-slate-400 text-[10px]">
                    🌐 Koordinat: {activeHcs.lat.toFixed(5)}, {activeHcs.lon.toFixed(5)}
                  </div>
                </div>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-8 px-4 text-center">
                <div className="w-14 h-14 rounded-2xl bg-blue-50/90 text-blue-500 flex items-center justify-center mb-3 shadow-xs border border-blue-100/60">
                  <MapPin size={24} className="opacity-70 stroke-[1.75]" />
                </div>
                <h4 className="font-bold text-slate-700 text-sm mb-1">
                  Pilih Titik SPKLU atau HCS
                </h4>
                <p className="text-xs text-slate-400 max-w-[210px] leading-relaxed">
                  Klik titik SPKLU atau lingkaran wilayah HCS pada peta untuk melihat detail, unit kendaraan, dan navigasi Maps.
                </p>
              </div>
            )}
          </div>

          {/* Action Button: Google Maps Navigation */}
          {activeSite ? (
            <div className="relative z-10 pt-2">
              <a
                href={mapsUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="w-full py-2.5 px-4 bg-blue-50 hover:bg-blue-100 text-blue-600 text-xs font-semibold rounded-xl transition-all flex items-center justify-center gap-1.5 border border-blue-100/60 shadow-xs"
              >
                <Navigation size={13} />
                <span>Buka di Google Maps →</span>
              </a>
            </div>
          ) : activeHcs ? (
            <div className="relative z-10 pt-2">
              <a
                href={mapsUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="w-full py-2.5 px-4 bg-purple-50 hover:bg-purple-100 text-purple-700 text-xs font-semibold rounded-xl transition-all flex items-center justify-center gap-1.5 border border-purple-200/80 shadow-xs"
              >
                <Navigation size={13} />
                <span>Petunjuk Arah Google Maps (Wilayah {activeHcs.area}) →</span>
              </a>
            </div>
          ) : (
            <div className="relative z-10 pt-2 opacity-0 pointer-events-none">
              <div className="h-9" />
            </div>
          )}

          {/* Decorative Cityscape Silhouette at Bottom */}
          <div className="absolute bottom-0 left-0 right-0 pointer-events-none z-0">
            <CityscapeBottom />
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════
          4. COLLAPSIBLE DATA TABLE
      ══════════════════════════════════════ */}
      <details id="section-table-detail" className="bg-white/75 backdrop-blur-sm border border-white rounded-3xl p-2 shadow-xs group">
        <summary className="px-5 py-3.5 cursor-pointer font-semibold text-slate-700 hover:bg-white/50 rounded-2xl transition-colors select-none flex items-center justify-between text-xs sm:text-sm">
          <span>Rincian data SPKLU ({sites.length} lokasi)</span>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={(e) => { e.preventDefault(); e.stopPropagation(); handleExport('xlsx') }}
                disabled={exporting}
                className="text-[11px] px-2.5 py-1 bg-white border border-slate-200 rounded-lg text-slate-600 hover:text-blue-600 flex items-center gap-1 font-medium"
              >
                <Download size={11} /> Excel
              </button>
              <button
                type="button"
                onClick={(e) => { e.preventDefault(); e.stopPropagation(); handleExport('csv') }}
                disabled={exporting}
                className="text-[11px] px-2.5 py-1 bg-white border border-slate-200 rounded-lg text-slate-600 hover:text-blue-600 flex items-center gap-1 font-medium"
              >
                <Download size={11} /> CSV
              </button>
            </div>
            <ChevronDown size={15} className="text-slate-400 transition-transform duration-200 group-open:rotate-180" />
          </div>
        </summary>
        <div className="px-5 pb-5 pt-2 border-t border-slate-100/80">
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
              { key: 'nama',      label: 'Nama',             className: 'font-semibold text-slate-800' },
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
                      const el = document.getElementById('section-map-details')
                      if (el) el.scrollIntoView({ behavior: 'smooth' })
                    }}
                    className="inline-flex items-center gap-1 text-xs font-semibold text-blue-600 hover:text-blue-800 bg-blue-50 hover:bg-blue-100 px-2.5 py-1 rounded-lg transition-colors border border-blue-200"
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
