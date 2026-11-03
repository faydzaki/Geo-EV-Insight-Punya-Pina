'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useAuth } from '@/contexts/AuthContext'
import {
  Map, BarChart2, GitCompare, Lightbulb,
  CheckSquare, Settings, Users, LogOut, Zap,
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
  super_admin: 'bg-amber-500/20 text-amber-300 border border-amber-500/30',
  admin:       'bg-primary-500/20 text-primary-300 border border-primary-500/30',
  viewer:      'bg-slate-500/20 text-slate-400 border border-slate-500/30',
}

export default function Sidebar() {
  const pathname     = usePathname()
  const { user, isAdmin, isSuperAdmin, logout } = useAuth()
  const initials     = (user?.display_name || user?.username || '?').slice(0, 2).toUpperCase()

  function navCx(href: string, exact = true) {
    const active = exact ? pathname === href : pathname.startsWith(href)
    return cx(
      'flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium',
      'transition-all duration-150 group border-l-2',
      active
        ? 'bg-white/10 text-white border-primary-400'
        : 'text-slate-400 hover:bg-white/6 hover:text-slate-200 border-transparent',
    )
  }

  return (
    <aside
      className="w-64 shrink-0 flex flex-col h-full"
      style={{ background: 'linear-gradient(180deg, #0f1629 0%, #1a2744 100%)' }}
    >
      {/* ── Brand ──────────────────────── */}
      <div className="px-5 py-5 border-b border-white/5">
        <div className="flex items-center gap-3">
          <div
            className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0"
            style={{
              background: 'linear-gradient(135deg, #087f83, #0ea5e9)',
              boxShadow: '0 0 18px rgba(8,127,131,0.45)',
            }}
          >
            <Zap size={17} className="text-white" fill="white" />
          </div>
          <div>
            <h2 className="font-bold text-sm text-white leading-tight tracking-tight">GeoEV Insight</h2>
            <p className="text-[11px] text-slate-400 leading-tight mt-0.5">SPKLU & Home Charging</p>
          </div>
        </div>
      </div>

      {/* ── Nav ────────────────────────── */}
      <nav className="flex-1 px-3 py-4 overflow-y-auto space-y-0.5">
        <p className="text-[10px] font-bold text-slate-600 uppercase tracking-widest mb-2 px-3 pt-1">
          Ruang Analisis
        </p>

        {NAV_ITEMS.map(({ href, label, icon: Icon, desc }) => (
          <Link key={href} href={href} title={desc} className={navCx(href)}>
            <Icon
              size={14}
              className={cx(
                'shrink-0 transition-colors',
                pathname === href ? 'text-primary-400' : 'text-slate-500 group-hover:text-slate-300',
              )}
            />
            <span className="truncate">{label}</span>
          </Link>
        ))}

        {isAdmin && (
          <>
            <div className="border-t border-white/5 my-3 mx-1" />
            <p className="text-[10px] font-bold text-slate-600 uppercase tracking-widest mb-2 px-3">
              Administrasi
            </p>
            <Link
              href="/admin"
              className={cx(
                navCx('/admin', false),
                pathname.startsWith('/admin') && pathname !== '/admin/users'
                  ? 'bg-white/10 text-white border-primary-400'
                  : 'text-slate-400 hover:bg-white/6 hover:text-slate-200 border-transparent',
              )}
            >
              <Settings size={14} className="shrink-0" />
              <span>Manajemen Data</span>
            </Link>
            {isSuperAdmin && (
              <Link href="/admin/users" className={navCx('/admin/users')}>
                <Users size={14} className="shrink-0" />
                <span>Manajemen User</span>
              </Link>
            )}
          </>
        )}
      </nav>

      {/* ── User footer ────────────────── */}
      <div className="px-3 py-4 border-t border-white/5">
        <div className="flex items-center gap-2.5 mb-3">
          <div
            className="w-8 h-8 rounded-full flex items-center justify-center text-[10px] font-bold text-white shrink-0"
            style={{ background: 'linear-gradient(135deg, #087f83, #0ea5e9)' }}
          >
            {initials}
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-medium text-white truncate leading-tight">
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
          className="flex items-center gap-2 text-xs text-slate-500 hover:text-red-400 transition-colors w-full px-2 py-1.5 rounded-lg hover:bg-red-500/10"
        >
          <LogOut size={13} />
          <span>Keluar dari sesi</span>
        </button>
      </div>
    </aside>
  )
}
