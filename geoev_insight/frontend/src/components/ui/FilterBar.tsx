'use client'
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
  'border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 bg-white min-w-0'

export default function FilterBar({
  prov,
  owner,
  area,
  power,
  search,
  areas,
  onChange,
  onReset,
}: FilterBarProps) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-4">
      <div className="flex flex-wrap gap-3 items-end">
        <div className="flex flex-col gap-1">
          <label className="text-xs text-gray-500 font-medium">Provinsi</label>
          <select
            className={selectCls}
            value={prov}
            onChange={(e) => onChange('prov', e.target.value)}
          >
            <option value="Semua">Semua provinsi</option>
            <option value="Jawa Timur">Jawa Timur</option>
            <option value="Bali">Bali</option>
          </select>
        </div>

        <div className="flex flex-col gap-1">
          <label className="text-xs text-gray-500 font-medium">Pengelola</label>
          <select
            className={selectCls}
            value={owner}
            onChange={(e) => onChange('owner', e.target.value)}
          >
            <option value="Semua">Semua pengelola</option>
            {OWNERS.map((o) => (
              <option key={o} value={o}>
                {o}
              </option>
            ))}
          </select>
        </div>

        <div className="flex flex-col gap-1">
          <label className="text-xs text-gray-500 font-medium">Kabupaten / kota</label>
          <select
            className={selectCls}
            value={area}
            onChange={(e) => onChange('area', e.target.value)}
          >
            <option value="Semua">Semua wilayah</option>
            {areas.map((a) => (
              <option key={a} value={a}>
                {a}
              </option>
            ))}
          </select>
        </div>

        <div className="flex flex-col gap-1">
          <label className="text-xs text-gray-500 font-medium">Kelompok daya</label>
          <select
            className={selectCls}
            value={power}
            onChange={(e) => onChange('power', e.target.value)}
          >
            {POWER_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        </div>

        <div className="flex flex-col gap-1 flex-1 min-w-48">
          <label className="text-xs text-gray-500 font-medium">Cari SPKLU</label>
          <input
            type="search"
            value={search}
            onChange={(e) => onChange('search', e.target.value)}
            placeholder="Cari nama atau alamat…"
            className={`${selectCls} w-full`}
          />
        </div>

        <button
          onClick={onReset}
          className="px-4 py-2 text-sm border border-gray-300 rounded-lg hover:bg-gray-50 text-gray-600 transition-colors"
        >
          Reset filter
        </button>
      </div>
    </div>
  )
}

