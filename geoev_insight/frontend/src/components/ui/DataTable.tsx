'use client'
import { useState } from 'react'
import { ChevronUp, ChevronDown, ChevronsUpDown } from 'lucide-react'

interface Column {
  key: string
  label: string
  render?: (value: unknown, row: Record<string, unknown>) => React.ReactNode
}

interface DataTableProps {
  columns: Column[]
  data: Record<string, unknown>[]
  pageSize?: number
  className?: string
}

export default function DataTable({ columns, data, pageSize = 12, className = '' }: DataTableProps) {
  const [page, setPage]       = useState(1)
  const [sortKey, setSortKey] = useState<string | null>(null)
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc')

  function handleSort(key: string) {
    if (sortKey === key) setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'))
    else { setSortKey(key); setSortDir('asc') }
    setPage(1)
  }

  const sorted = [...data].sort((a, b) => {
    if (!sortKey) return 0
    const av = a[sortKey], bv = b[sortKey]
    if (av == null) return 1
    if (bv == null) return -1
    const cmp = av < bv ? -1 : av > bv ? 1 : 0
    return sortDir === 'asc' ? cmp : -cmp
  })

  const totalPages = Math.ceil(sorted.length / pageSize)
  const paged      = sorted.slice((page - 1) * pageSize, page * pageSize)

  return (
    <div className={className}>
      <div className="overflow-x-auto rounded-xl border border-primary-100/50">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-primary-50/60 border-b border-primary-100/50">
              {columns.map((col) => (
                <th
                  key={col.key}
                  className="text-left px-4 py-3 font-semibold text-slate-600 cursor-pointer hover:bg-slate-100 select-none whitespace-nowrap transition-colors"
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
          <tbody className="divide-y divide-slate-50">
            {paged.map((row, i) => (
              <tr key={i} className="hover:bg-slate-50/70 transition-colors">
                {columns.map((col) => (
                  <td key={col.key} className="px-4 py-3 text-slate-700">
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
                    <span className="text-2xl">📭</span>
                    <span>Tidak ada data</span>
                  </div>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {totalPages > 1 && (
        <div className="flex items-center justify-between mt-3 text-sm text-slate-500">
          <span className="text-xs text-slate-400">{data.length.toLocaleString('id-ID')} baris total</span>
          <div className="flex items-center gap-1.5">
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
          </div>
        </div>
      )}
    </div>
  )
}
