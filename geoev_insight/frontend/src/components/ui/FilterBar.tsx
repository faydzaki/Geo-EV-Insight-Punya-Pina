'use client'
import { Search, X } from 'lucide-react'
import { OWNERS, POWER_OPTIONS } from '@/lib/constants'

interface FilterBarProps {
  prov: string
  owner: string
  area: string
  power: string
  search: string
  areas: string[]
  onChange: (key: string, value: string) => void
  onReset: () => void
}

const selectCls =
  'border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-400/50 focus:border-primary-300 bg-white text-slate-700 transition-colors hover:border-slate-300'

export default function FilterBar({
  prov, owner, area, power, search, areas, onChange, onReset,
}: FilterBarProps) {
  const hasFilter = prov !== 'Semua' || owner !== 'Semua' || area !== 'Semua' || power !== 'all' || search !== ''

  return (
    <div className="bg-white rounded-2xl border border-slate-100 shadow-card p-4">
      <div className="flex flex-wrap gap-2.5 items-end">

        {/* Provinsi */}
        <div className="flex flex-col gap-1">
          <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider px-0.5">Provinsi</label>
          <select className={selectCls} value={prov} onChange={(e) => onChange('prov', e.target.value)}>
            <option value="Semua">Semua provinsi</option>
            <option value="Jawa Timur">Jawa Timur</option>
            <option value="Bali">Bali</option>
          </select>
        </div>

        {/* Pengelola */}
        <div className="flex flex-col gap-1">
          <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider px-0.5">Pengelola</label>
          <select className={selectCls} value={owner} onChange={(e) => onChange('owner', e.target.value)}>
            <option value="Semua">Semua pengelola</option>
            {OWNERS.map((o) => <option key={o} value={o}>{o}</option>)}
          </select>
        </div>

        {/* Kabupaten / Kota */}
        <div className="flex flex-col gap-1">
          <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider px-0.5">Kabupaten / Kota</label>
          <select className={selectCls} value={area} onChange={(e) => onChange('area', e.target.value)}>
            <option value="Semua">Semua wilayah</option>
            {areas.map((a) => <option key={a} value={a}>{a}</option>)}
          </select>
        </div>

        {/* Kelompok daya */}
        <div className="flex flex-col gap-1">
          <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider px-0.5">Kelompok Daya</label>
          <select className={selectCls} value={power} onChange={(e) => onChange('power', e.target.value)}>
            {POWER_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
        </div>

        {/* Search */}
        <div className="flex flex-col gap-1 flex-1 min-w-44">
          <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider px-0.5">Cari SPKLU</label>
          <div className="relative">
            <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
            <input
              type="search"
              value={search}
              onChange={(e) => onChange('search', e.target.value)}
              placeholder="Cari nama atau alamat…"
              className={`${selectCls} w-full pl-8`}
              style={{ backgroundImage: 'none' }}
            />
          </div>
        </div>

        {/* Reset */}
        <button
          onClick={onReset}
          className={`flex items-center gap-1.5 px-3 py-2 text-sm rounded-xl border transition-all ${
            hasFilter
              ? 'border-primary-200 text-primary-600 bg-primary-50 hover:bg-primary-100'
              : 'border-slate-200 text-slate-400 cursor-not-allowed opacity-50'
          }`}
          disabled={!hasFilter}
        >
          <X size={13} />
          Reset
        </button>
      </div>
    </div>
  )
}
