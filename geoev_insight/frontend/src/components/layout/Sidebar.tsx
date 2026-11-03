'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useAuth } from '@/contexts/AuthContext'
import {
  Map,
  BarChart2,
  GitCompare,
  Lightbulb,
  CheckSquare,
  Settings,
  LogOut,
} from 'lucide-react'
import { cx } from '@/lib/utils'

const NAV_ITEMS = [
  { href: '/peta', label: 'Peta & infrastruktur', icon: Map },
  { href: '/hcs', label: 'Distribusi HCS', icon: BarChart2 },
  { href: '/perbandingan', label: 'Perbandingan wilayah', icon: GitCompare },
  { href: '/kajian', label: 'Kajian wilayah', icon: Lightbulb },
  { href: '/kualitas', label: 'Kualitas data', icon: CheckSquare },
]

export default function Sidebar() {
  const pathname = usePathname()
  const { isAdmin, logout } = useAuth()

  return (
    <aside className="w-64 shrink-0 bg-gray-900 text-white flex flex-col h-full">
      {/* Brand */}
      <div className="p-5 border-b border-gray-800">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 bg-primary-500 rounded-lg flex items-center justify-center text-white font-bold text-lg select-none">
            ϟ
          </div>
          <div>
            <h2 className="font-bold text-sm text-white">GeoEV Insight</h2>
            <p className="text-xs text-gray-400">SPKLU dan Home Charging</p>
          </div>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 p-4 space-y-0.5 overflow-y-auto">
        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3 px-2 pt-1">
          Ruang Analisis
        </p>
        {NAV_ITEMS.map(({ href, label, icon: Icon }) => {
          const active = pathname === href
          return (
            <Link
              key={href}
              href={href}
              className={cx(
                'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors',
                active
                  ? 'bg-primary-500 text-white'
                  : 'text-gray-300 hover:bg-gray-800 hover:text-white'
              )}
            >
              <Icon size={16} className="shrink-0" />
              <span>{label}</span>
            </Link>
          )
        })}

        {isAdmin && (
          <>
            <div className="border-t border-gray-800 my-3" />
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2 px-2">
              Admin
            </p>
            <Link
              href="/admin"
              className={cx(
                'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors',
                pathname === '/admin'
                  ? 'bg-primary-500 text-white'
                  : 'text-gray-300 hover:bg-gray-800 hover:text-white'
              )}
            >
              <Settings size={16} className="shrink-0" />
              <span>Manajemen Data</span>
            </Link>
          </>
        )}
      </nav>

      {/* Footer */}
      <div className="p-4 border-t border-gray-800">
        <p className="text-xs text-gray-500 mb-0.5">SPKLU Jawa Timur dan Bali</p>
        <p className="text-xs text-gray-600">Data HCS hanya Jawa Timur</p>
        <button
          onClick={logout}
          className="mt-3 flex items-center gap-2 text-xs text-gray-500 hover:text-white transition-colors"
        >
          <LogOut size={13} />
          <span>Keluar</span>
        </button>
      </div>
    </aside>
  )
}

