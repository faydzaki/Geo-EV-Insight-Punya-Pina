'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useAuth } from '@/contexts/AuthContext'
import {
  Map, BarChart2, GitCompare, Lightbulb,
  CheckSquare, Settings, Users, X,
} from 'lucide-react'
import PlnIcon from '@/components/ui/PlnIcon'
import { cx } from '@/lib/utils'

const NAV_ITEMS = [
  { href: '/peta',         label: 'Peta & Infrastruktur', icon: Map },
  { href: '/hcs',          label: 'Distribusi HCS',       icon: BarChart2 },
  { href: '/perbandingan', label: 'Perbandingan Wilayah', icon: GitCompare },
  { href: '/kajian',       label: 'Kajian Wilayah',       icon: Lightbulb },
  { href: '/kualitas',     label: 'Kualitas Data',        icon: CheckSquare },
]

const ROLE_LABELS: Record<string, string> = {
  super_admin: 'Super Admin',
  admin:       'Admin',
  viewer:      'Viewer',
}

interface SidebarProps {
  open?: boolean
  onClose?: () => void
}

export default function Sidebar({ open, onClose }: SidebarProps) {
  const pathname = usePathname()
  const { user, isAdmin, isSuperAdmin, logout } = useAuth()
  const initials = (user?.display_name || user?.username || 'AD').slice(0, 2).toUpperCase()

  function isNavActive(href: string, exact = true) {
    return exact ? pathname === href : pathname.startsWith(href)
  }

  return (
    <>
      {/* Mobile overlay */}
      {open && (
        <div
          className="fixed inset-0 bg-slate-900/25 backdrop-blur-sm z-40 lg:hidden"
          onClick={onClose}
          aria-hidden="true"
        />
      )}

      {/* Floating Sidebar Card */}
      <aside
        className={cx(
          'flex flex-col w-64 h-full shrink-0 z-50 p-3.5',
          'bg-white/70 backdrop-blur-xl border border-white rounded-3xl',
          'shadow-[0_8px_30px_rgba(50,80,200,0.06)]',
          'transition-transform duration-300 ease-in-out',
          'fixed inset-y-3.5 left-3.5 lg:static lg:inset-auto',
          open ? 'translate-x-0' : '-translate-x-[calc(100%+24px)] lg:translate-x-0',
        )}
      >
        {/* Brand Header with PLN Logo */}
        <div className="flex items-center justify-between px-2 py-2 mb-3">
          <div className="flex items-center gap-3">
            <div
              className="w-10 h-10 rounded-2xl flex items-center justify-center shrink-0 shadow-sm overflow-hidden bg-white/95 border border-white/80 p-1"
              style={{
                boxShadow: '0 4px 14px rgba(247,232,46,0.25)',
              }}
            >
              <PlnIcon className="w-full h-full object-contain" />
            </div>
            <div>
              <h1 className="font-bold text-slate-800 text-[15px] leading-tight tracking-tight">
                GeoEV Insight
              </h1>
              <p className="text-[11px] text-slate-400 font-medium leading-tight mt-0.5">
                SPKLU &amp; Home Charging
              </p>
            </div>
          </div>

          {/* Close button on mobile */}
          <button
            onClick={onClose}
            className="lg:hidden p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-white/60 transition-colors"
            aria-label="Tutup menu"
          >
            <X size={16} />
          </button>
        </div>

        {/* Navigation Groups */}
        <nav className="flex-1 overflow-y-auto space-y-5 px-1 py-1 custom-scrollbar">
          {/* Ruang Analisis Group */}
          <div>
            <h2 className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2 px-3">
              Ruang Analisis
            </h2>
            <ul className="space-y-1">
              {NAV_ITEMS.map(({ href, label, icon: Icon }) => {
                const active = isNavActive(href)
                return (
                  <li key={href}>
                    <Link
                      href={href}
                      onClick={onClose}
                      className={cx(
                        'flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-medium transition-all group relative',
                        active
                          ? 'bg-blue-50/90 text-blue-600 font-semibold shadow-xs'
                          : 'text-slate-600 hover:bg-white/60 hover:text-slate-800',
                      )}
                    >
                      {active && (
                        <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-5 bg-blue-600 rounded-r-md" />
                      )}
                      <Icon
                        size={15}
                        className={cx(
                          'shrink-0 transition-colors',
                          active ? 'text-blue-600' : 'text-slate-400 group-hover:text-slate-600',
                        )}
                      />
                      <span className="truncate">{label}</span>
                    </Link>
                  </li>
                )
              })}
            </ul>
          </div>

          {/* Administrasi Group */}
          {isAdmin && (
            <div>
              <h2 className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2 px-3">
                Administrasi
              </h2>
              <ul className="space-y-1">
                <li>
                  {(() => {
                    const active = isNavActive('/admin', false) && pathname !== '/admin/users'
                    return (
                      <Link
                        href="/admin"
                        onClick={onClose}
                        className={cx(
                          'flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-medium transition-all group relative',
                          active
                            ? 'bg-blue-50/90 text-blue-600 font-semibold shadow-xs'
                            : 'text-slate-600 hover:bg-white/60 hover:text-slate-800',
                        )}
                      >
                        {active && (
                          <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-5 bg-blue-600 rounded-r-md" />
                        )}
                        <Settings
                          size={15}
                          className={cx(
                            'shrink-0 transition-colors',
                            active ? 'text-blue-600' : 'text-slate-400 group-hover:text-slate-600',
                          )}
                        />
                        <span>Manajemen Data</span>
                      </Link>
                    )
                  })()}
                </li>
                {isSuperAdmin && (
                  <li>
                    {(() => {
                      const active = isNavActive('/admin/users')
                      return (
                        <Link
                          href="/admin/users"
                          onClick={onClose}
                          className={cx(
                            'flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-medium transition-all group relative',
                            active
                              ? 'bg-blue-50/90 text-blue-600 font-semibold shadow-xs'
                              : 'text-slate-600 hover:bg-white/60 hover:text-slate-800',
                          )}
                        >
                          {active && (
                            <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-5 bg-blue-600 rounded-r-md" />
                          )}
                          <Users
                            size={15}
                            className={cx(
                              'shrink-0 transition-colors',
                              active ? 'text-blue-600' : 'text-slate-400 group-hover:text-slate-600',
                            )}
                          />
                          <span>Manajemen User</span>
                        </Link>
                      )
                    })()}
                  </li>
                )}
              </ul>
            </div>
          )}
        </nav>

        {/* User Profile Card at Bottom */}
        <div className="mt-auto pt-2">
          <div className="bg-white/85 rounded-2xl p-3 flex flex-col gap-2.5 shadow-xs border border-white">
            <div className="flex items-center gap-2.5">
              <div
                className="w-8 h-8 rounded-full flex items-center justify-center text-white font-bold text-xs shrink-0 shadow-xs"
                style={{ background: 'linear-gradient(135deg, #60A5FA 0%, #3B82F6 100%)' }}
              >
                {initials}
              </div>
              <div className="min-w-0 flex-1">
                <p className="font-semibold text-slate-800 text-xs leading-tight truncate">
                  {user?.display_name || user?.username || 'Admin'}
                </p>
                <span className="inline-block px-2 py-0.5 bg-orange-100 text-orange-700 text-[10px] rounded-full font-medium mt-0.5">
                  {ROLE_LABELS[user?.role ?? ''] ?? user?.role ?? 'Super Admin'}
                </span>
              </div>
            </div>

            <button
              onClick={logout}
              className="flex items-center gap-2 text-slate-400 hover:text-slate-600 text-xs transition-colors pt-2 border-t border-slate-100 w-full text-left"
            >
              <span className="text-sm leading-none">↪</span>
              <span>Keluar dari sesi</span>
            </button>
          </div>
        </div>
      </aside>
    </>
  )
}
