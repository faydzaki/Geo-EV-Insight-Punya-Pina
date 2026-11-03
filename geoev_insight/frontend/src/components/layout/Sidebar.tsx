'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useAuth } from '@/contexts/AuthContext'
import {
  Map, BarChart2, GitCompare, Lightbulb,
  CheckSquare, Settings, Users, LogOut, Zap, X,
} from 'lucide-react'
import { cx } from '@/lib/utils'

const NAV_ITEMS = [
  { href: '/peta',         label: 'Peta & Infrastruktur', icon: Map,         desc: 'Lokasi SPKLU dan HCS' },
  { href: '/hcs',          label: 'Distribusi HCS',       icon: BarChart2,   desc: 'Catatan Home Charging' },
  { href: '/perbandingan', label: 'Perbandingan Wilayah', icon: GitCompare,  desc: 'Rasio HCS per SPKLU' },
  { href: '/kajian',       label: 'Kajian Wilayah',       icon: Lightbulb,   desc: 'Rekomendasi lokasi baru' },
  { href: '/kualitas',     label: 'Kualitas Data',        icon: CheckSquare, desc: 'Pemeriksaan inventaris' },
]

const ROLE_LABELS: Record<string, string> = {
  super_admin: 'Super Admin',
  admin:       'Admin',
  viewer:      'Viewer',
}
const ROLE_COLORS: Record<string, string> = {
  super_admin: 'bg-amber-100 text-amber-700 border border-amber-200',
  admin:       'bg-primary-100 text-primary-700 border border-primary-200',
  viewer:      'bg-slate-100 text-slate-500 border border-slate-200',
}

interface SidebarProps {
  open?: boolean
  onClose?: () => void
}

export default function Sidebar({ open, onClose }: SidebarProps) {
  const pathname = usePathname()
  const { user, isAdmin, isSuperAdmin, logout } = useAuth()
  const initials = (user?.display_name || user?.username || '?').slice(0, 2).toUpperCase()

  function navCx(href: string, exact = true) {
    const active = exact ? pathname === href : pathname.startsWith(href)
    return cx(
      'flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium',
      'transition-all duration-200 group border-l-2',
      active
        ? 'bg-primary-500/10 text-primary-700 border-primary-500 font-semibold'
        : 'text-slate-500 hover:bg-primary-50 hover:text-primary-600 border-transparent',
    )
  }

  return (
    <>
      {/* Mobile overlay */}
      {open && (
        <div
          className="fixed inset-0 bg-black/20 backdrop-blur-sm z-40 lg:hidden"
          onClick={onClose}
          aria-hidden="true"
        />
      )}

      <aside
        className={cx(
          'flex flex-col glass border-r border-white/50 z-50',
          'w-64 shrink-0',
          'fixed inset-y-0 left-0',
          'transition-transform duration-300 ease-in-out',
          open ? 'translate-x-0' : '-translate-x-full',
          'lg:static lg:translate-x-0 lg:h-screen',
        )}
        style={{ background: 'rgba(255,255,255,0.82)' }}
      >
        {/* Brand */}
        <div className="relative px-5 py-5 border-b border-primary-100/40">
          <div className="flex items-center gap-3">
            <div
              className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0"
              style={{
                background: 'linear-gradient(135deg, #6C63FF, #3B82F6)',
                boxShadow: '0 0 20px rgba(108,99,255,0.4)',
              }}
            >
              <Zap size={17} className="text-white" fill="white" />
            </div>
            <div>
              <h2 className="font-bold text-sm text-indigo-900 leading-tight tracking-tight">GeoEV Insight</h2>
              <p className="text-[11px] text-slate-400 leading-tight mt-0.5">SPKLU &amp; Home Charging</p>
            </div>
          </div>

          {/* Close button — mobile only */}
          <button
            onClick={onClose}
            className="absolute top-4 right-4 lg:hidden p-1.5 rounded-lg hover:bg-primary-50 text-slate-400 hover:text-primary-600 transition-colors"
            aria-label="Tutup menu"
          >
            <X size={16} />
          </button>
        </div>

        {/* Nav */}
        <nav className="flex-1 px-3 py-4 overflow-y-auto space-y-0.5">
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2 px-3 pt-1">
            Ruang Analisis
          </p>

          {NAV_ITEMS.map(({ href, label, icon: Icon, desc }) => (
            <Link key={href} href={href} title={desc} className={navCx(href)} onClick={onClose}>
              <Icon
                size={14}
                className={cx(
                  'shrink-0 transition-colors',
                  pathname === href ? 'text-primary-500' : 'text-slate-400 group-hover:text-primary-500',
                )}
              />
              <span className="truncate">{label}</span>
            </Link>
          ))}

          {isAdmin && (
            <>
              <div className="border-t border-primary-100/50 my-3 mx-1" />
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2 px-3">
                Administrasi
              </p>
              <Link
                href="/admin"
                onClick={onClose}
                className={cx(
                  navCx('/admin', false),
                  pathname.startsWith('/admin') && pathname !== '/admin/users'
                    ? 'bg-primary-500/10 text-primary-700 border-primary-500 font-semibold'
                    : 'text-slate-500 hover:bg-primary-50 hover:text-primary-600 border-transparent',
                )}
              >
                <Settings size={14} className="shrink-0" />
                <span>Manajemen Data</span>
              </Link>
              {isSuperAdmin && (
                <Link href="/admin/users" className={navCx('/admin/users')} onClick={onClose}>
                  <Users size={14} className="shrink-0" />
                  <span>Manajemen User</span>
                </Link>
              )}
            </>
          )}
        </nav>

        {/* User footer */}
        <div className="px-3 py-4 border-t border-primary-100/40">
          <div className="flex items-center gap-2.5 mb-3">
            <div
              className="w-8 h-8 rounded-full flex items-center justify-center text-[10px] font-bold text-white shrink-0"
              style={{ background: 'linear-gradient(135deg, #6C63FF, #3B82F6)' }}
            >
              {initials}
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold text-indigo-900 truncate leading-tight">
                {user?.display_name || user?.username}
              </p>
              {user?.role && (
                <span
                  className={cx(
                    'text-[10px] px-1.5 py-0.5 rounded font-semibold inline-block mt-0.5',
                    ROLE_COLORS[user.role] ?? ROLE_COLORS.viewer,
                  )}
                >
                  {ROLE_LABELS[user.role] ?? user.role}
                </span>
              )}
            </div>
          </div>

          <button
            onClick={logout}
            className="flex items-center gap-2 text-xs text-slate-400 hover:text-red-500 transition-colors w-full px-2 py-1.5 rounded-lg hover:bg-red-50"
          >
            <LogOut size={13} />
            <span>Keluar dari sesi</span>
          </button>
        </div>
      </aside>
    </>
  )
}
