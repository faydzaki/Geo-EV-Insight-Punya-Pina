'use client'
import { useState, useMemo } from 'react'
import { ChevronUp, ChevronDown, ChevronsUpDown, Inbox, Search, X } from 'lucide-react'
import { cx } from '@/lib/utils'

interface Column {
  key: string
  label: string
  className?: string
  searchable?: boolean
  render?: (value: unknown, row: Record<string, unknown>) => React.ReactNode
}

interface DataTableProps {
  columns: Column[]
  data: Record<string, unknown>[]
  pageSize?: number
  className?: string
  searchable?: boolean
  searchPlaceholder?: string
}

export default function DataTable({
  columns,
  data,
  pageSize = 12,
  className = '',
  searchable = false,
  searchPlaceholder = 'Cari…',
}: DataTableProps) {
  const [page, setPage]       = useState(1)
  const [sortKey, setSortKey] = useState<string | null>(null)
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc')
  const [query, setQuery]     = useState('')

  function handleSort(key: string) {
    if (sortKey === key) setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'))
    else { setSortKey(key); setSortDir('asc') }
    setPage(1)
  }

  function handleSearch(val: string) {
    setQuery(val)
    setPage(1)
  }

  // Searchable columns: all string-type columns by default, or those marked searchable
  const searchCols = columns.filter((c) => c.searchable !== false)

  const filtered = useMemo(() => {
    if (!searchable || !query.trim()) return data
    const q = query.trim().toLowerCase()
    return data.filter((row) =>
      searchCols.some((col) => {
        const v = row[col.key]
        return v != null && String(v).toLowerCase().includes(q)
      })
    )
  }, [data, query, searchable, searchCols])

  const sorted = useMemo(() => [...filtered].sort((a, b) => {
    if (!sortKey) return 0
    const av = a[sortKey], bv = b[sortKey]
    if (av == null) return 1
    if (bv == null) return -1
    const cmp = av < bv ? -1 : av > bv ? 1 : 0
    return sortDir === 'asc' ? cmp : -cmp
  }), [filtered, sortKey, sortDir])

  const totalPages = Math.ceil(sorted.length / pageSize)
  const paged      = sorted.slice((page - 1) * pageSize, page * pageSize)

  return (
    <div className={className}>
      {/* Live Search Bar */}
      {searchable && (
        <div className="mb-3 relative">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-primary-400 pointer-events-none" />
          <input
            type="search"
            value={query}
            onChange={(e) => handleSearch(e.target.value)}
            placeholder={searchPlaceholder}
            className="w-full pl-8 pr-8 py-2 text-sm rounded-xl border border-primary-100 bg-white/80 text-slate-700 focus:outline-none focus:ring-2 focus:ring-primary-400/30 focus:border-primary-300 transition-all"
            style={{ backgroundImage: 'none' }}
          />
          {query && (
            <button
              onClick={() => handleSearch('')}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors"
              aria-label="Hapus pencarian"
            >
              <X size={14} />
            </button>
          )}
        </div>
      )}

      {/* Table */}
      <div className="overflow-x-auto rounded-xl border border-primary-100/50">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-primary-50/60 border-b border-primary-100/50">
              {columns.map((col) => (
                <th
                  key={col.key}
                  className={cx(
                    'text-left px-4 py-3 font-semibold text-slate-600 cursor-pointer hover:bg-primary-50 select-none whitespace-nowrap transition-colors',
                    col.className,
                  )}
                  onClick={() => handleSort(col.key)}
                >
                  <div className="flex items-center gap-1.5">
                    {col.label}
                    {sortKey === col.key
                      ? sortDir === 'asc'
                        ? <ChevronUp size={12} className="text-primary-500" />
                        : <ChevronDown size={12} className="text-primary-500" />
                      : <ChevronsUpDown size={11} className="text-slate-300" />
                    }
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100/60">
            {paged.map((row, i) => (
              <tr key={i} className="hover:bg-primary-50/20 transition-colors">
                {columns.map((col) => (
                  <td key={col.key} className={cx('px-4 py-3 text-slate-700', col.className)}>
                    {col.render
                      ? col.render(row[col.key], row)
                      : row[col.key] != null ? String(row[col.key]) : '—'}
                  </td>
                ))}
              </tr>
            ))}
            {paged.length === 0 && (
              <tr>
                <td colSpan={columns.length} className="px-4 py-12 text-center text-slate-400 text-sm">
                  <div className="flex flex-col items-center gap-2">
                    <Inbox size={26} className="text-slate-300" />
                    <span>
                      {searchable && query ? `Tidak ada hasil untuk "${query}"` : 'Tidak ada data'}
                    </span>
                    {searchable && query && (
                      <button
                        onClick={() => handleSearch('')}
                        className="text-xs text-primary-500 hover:underline"
                      >
                        Hapus pencarian
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Footer: count + pagination */}
      <div className="flex items-center justify-between mt-3 text-sm text-slate-500 flex-wrap gap-2">
        <span className="text-xs text-slate-400">
          {searchable && query
            ? `${sorted.length.toLocaleString('id-ID')} dari ${data.length.toLocaleString('id-ID')} baris`
            : `${data.length.toLocaleString('id-ID')} baris total`
          }
        </span>
        {totalPages > 1 && (
          <div className="flex items-center gap-1.5">
            <button
              onClick={() => setPage(1)}
              disabled={page === 1}
              className="px-2.5 py-1.5 text-xs border border-slate-200 rounded-lg disabled:opacity-40 hover:bg-slate-50 transition-colors"
            >
              «
            </button>
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page === 1}
              className="px-3 py-1.5 text-xs border border-slate-200 rounded-lg disabled:opacity-40 hover:bg-slate-50 transition-colors"
            >
              ‹ Sebelumnya
            </button>
            <span className="px-2.5 py-1 bg-primary-50 text-primary-700 rounded-lg text-xs font-semibold">
              {page} / {totalPages}
            </span>
            <button
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page === totalPages}
              className="px-3 py-1.5 text-xs border border-slate-200 rounded-lg disabled:opacity-40 hover:bg-slate-50 transition-colors"
            >
              Berikutnya ›
            </button>
            <button
              onClick={() => setPage(totalPages)}
              disabled={page === totalPages}
              className="px-2.5 py-1.5 text-xs border border-slate-200 rounded-lg disabled:opacity-40 hover:bg-slate-50 transition-colors"
            >
              »
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
