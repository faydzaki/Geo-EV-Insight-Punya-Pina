'use client'
import { useAuth } from '@/contexts/AuthContext'
import { useQueryClient } from '@tanstack/react-query'
import { usePathname } from 'next/navigation'
import { RefreshCw, ChevronRight } from 'lucide-react'
import { useState } from 'react'

const PAGE_LABELS: Record<string, string> = {
  '/peta':         'Peta & Infrastruktur',
  '/hcs':          'Distribusi HCS',
  '/perbandingan': 'Perbandingan Wilayah',
  '/kajian':       'Kajian Wilayah',
  '/kualitas':     'Kualitas Data',
  '/admin':        'Manajemen Data',
  '/admin/users':  'Manajemen User',
}

export default function TopBar() {
  const { user, isAdmin } = useAuth()
  const qc        = useQueryClient()
  const pathname  = usePathname()
  const [loading,   setLoading]   = useState(false)
  const [refreshed, setRefreshed] = useState(false)

  async function handleRefresh() {
    setLoading(true)
    setRefreshed(false)
    await qc.invalidateQueries()
    setTimeout(() => { setLoading(false); setRefreshed(true) }, 700)
    setTimeout(() => setRefreshed(false), 3500)
  }

  const pageLabel = PAGE_LABELS[pathname] ?? 'Dashboard'
  const initials  = (user?.display_name || user?.username || '?').slice(0, 2).toUpperCase()

  return (
    <header className="bg-white border-b border-slate-100 h-14 px-6 flex items-center justify-between shrink-0 shadow-sm">
      {/* Breadcrumb */}
      <div className="flex items-center gap-1.5 text-sm">
        <span className="text-slate-400 font-medium">GeoEV</span>
        <ChevronRight size={13} className="text-slate-300" />
        <span className="font-semibold text-slate-700">{pageLabel}</span>
      </div>

      {/* Right cluster */}
      <div className="flex items-center gap-3">
        <button
          onClick={handleRefresh}
          className="flex items-center gap-1.5 text-xs font-medium text-slate-500 hover:text-primary-600 transition-all px-3 py-1.5 rounded-lg border border-slate-200 hover:border-primary-200 hover:bg-primary-50"
        >
          <RefreshCw size={12} className={loading ? 'animate-spin text-primary-500' : ''} />
          {refreshed
            ? <span className="text-green-600 font-semibold">Diperbarui ✓</span>
            : 'Muat ulang'}
        </button>

        <div className="w-px h-5 bg-slate-200" />

        {/* User chip */}
        <div className="flex items-center gap-2">
          <div
            className="w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-bold text-white shrink-0"
            style={{ background: 'linear-gradient(135deg, #087f83, #0ea5e9)' }}
          >
            {initials}
          </div>
          <span className="text-sm font-medium text-slate-700 hidden sm:block">
            {user?.display_name || user?.username}
          </span>
          {isAdmin && (
            <span className="text-[10px] bg-primary-50 text-primary-700 border border-primary-200 px-2 py-0.5 rounded-full font-semibold">
              {user?.role === 'super_admin' ? 'Super Admin' : 'Admin'}
            </span>
          )}
        </div>
      </div>
    </header>
  )
}
