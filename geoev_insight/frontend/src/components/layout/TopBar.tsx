'use client'
import { useAuth } from '@/contexts/AuthContext'
import { useQueryClient } from '@tanstack/react-query'
import { usePathname } from 'next/navigation'
import { RefreshCw, ChevronRight, Menu, ChevronDown, KeyRound, X, Eye, EyeOff, Check } from 'lucide-react'
import { useState, useRef, useEffect } from 'react'
import { changePassword } from '@/lib/api'

const PAGE_LABELS: Record<string, string> = {
  '/peta':         'Peta & Infrastruktur',
  '/hcs':          'Distribusi HCS',
  '/perbandingan': 'Perbandingan Wilayah',
  '/kajian':       'Kajian Wilayah',
  '/kualitas':     'Kualitas Data',
  '/admin':        'Manajemen Data',
  '/admin/users':  'Manajemen User',
}

const ROLE_LABELS: Record<string, string> = {
  super_admin: 'Super Admin',
  admin:       'Admin',
  viewer:      'Viewer',
}

const inputCls = 'w-full rounded-xl px-3 py-2.5 text-sm text-indigo-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-primary-400/40 transition border border-primary-100 bg-white/80'

export default function TopBar({ onMenuClick }: { onMenuClick?: () => void }) {
  const { user, isAdmin } = useAuth()
  const qc       = useQueryClient()
  const pathname = usePathname()
  const [loading,   setLoading]   = useState(false)
  const [refreshed, setRefreshed] = useState(false)

  // Dropdown state
  const [dropdownOpen, setDropdownOpen] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)

  // Change password modal state
  const [pwModal,   setPwModal]   = useState(false)
  const [oldPw,     setOldPw]     = useState('')
  const [newPw,     setNewPw]     = useState('')
  const [confirmPw, setConfirmPw] = useState('')
  const [showOld,   setShowOld]   = useState(false)
  const [showNew,   setShowNew]   = useState(false)
  const [showConf,  setShowConf]  = useState(false)
  const [pwLoading, setPwLoading] = useState(false)
  const [pwMsg,     setPwMsg]     = useState<{ ok: boolean; text: string } | null>(null)

  // Close dropdown on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setDropdownOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  async function handleRefresh() {
    setLoading(true)
    setRefreshed(false)
    await qc.invalidateQueries()
    setTimeout(() => { setLoading(false); setRefreshed(true) }, 700)
    setTimeout(() => setRefreshed(false), 3500)
  }

  function openPwModal() {
    setDropdownOpen(false)
    setOldPw(''); setNewPw(''); setConfirmPw('')
    setPwMsg(null)
    setPwModal(true)
  }

  async function handleChangePw(e: React.FormEvent) {
    e.preventDefault()
    if (newPw.length < 6) { setPwMsg({ ok: false, text: 'Password baru minimal 6 karakter.' }); return }
    if (newPw !== confirmPw) { setPwMsg({ ok: false, text: 'Konfirmasi password tidak cocok.' }); return }
    setPwLoading(true)
    try {
      await changePassword(oldPw, newPw)
      setPwMsg({ ok: true, text: 'Password berhasil diubah!' })
      setTimeout(() => { setPwModal(false); setPwMsg(null) }, 1800)
    } catch {
      setPwMsg({ ok: false, text: 'Password lama salah atau terjadi kesalahan server.' })
    } finally {
      setPwLoading(false)
    }
  }

  const pageLabel = PAGE_LABELS[pathname] ?? 'Dashboard'
  const initials  = (user?.display_name || user?.username || '?').slice(0, 2).toUpperCase()

  return (
    <>
      <header
        className="glass h-14 px-4 sm:px-6 flex items-center justify-between shrink-0 border-b border-white/50"
        style={{ background: 'rgba(255,255,255,0.85)' }}
      >
        {/* Left: hamburger + breadcrumb */}
        <div className="flex items-center gap-2">
          <button
            onClick={onMenuClick}
            className="lg:hidden p-2 rounded-xl text-slate-400 hover:text-primary-600 hover:bg-primary-50 transition-colors"
            aria-label="Buka menu navigasi"
          >
            <Menu size={18} />
          </button>
          <div className="flex items-center gap-1.5 text-sm">
            <span className="text-primary-400 font-medium hidden sm:block">GeoEV</span>
            <ChevronRight size={13} className="text-primary-300 hidden sm:block" />
            <span className="font-semibold text-indigo-800 text-sm sm:text-base">{pageLabel}</span>
          </div>
        </div>

        {/* Right cluster */}
        <div className="flex items-center gap-2 sm:gap-3">
          <button
            onClick={handleRefresh}
            className="flex items-center gap-1.5 text-xs font-medium text-slate-500 hover:text-primary-600 transition-all px-2.5 sm:px-3 py-1.5 rounded-lg border border-primary-100 hover:border-primary-300 hover:bg-primary-50/60"
          >
            <RefreshCw size={12} className={loading ? 'animate-spin text-primary-500' : ''} />
            <span className="hidden sm:inline">
              {refreshed ? (
                <span className="text-green-600 font-semibold inline-flex items-center gap-1">
                  <span>Diperbarui</span>
                  <Check size={12} className="stroke-[2.5]" />
                </span>
              ) : (
                'Muat ulang'
              )}
            </span>
          </button>

          <div className="w-px h-5 bg-primary-100" />

          {/* User chip with dropdown */}
          <div className="relative" ref={dropdownRef}>
            <button
              onClick={() => setDropdownOpen((o) => !o)}
              className="flex items-center gap-1.5 rounded-xl px-2 py-1.5 hover:bg-primary-50 transition-colors"
            >
              <div
                className="w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-bold text-white shrink-0"
                style={{ background: 'linear-gradient(135deg, #6C63FF, #3B82F6)' }}
              >
                {initials}
              </div>
              <span className="text-sm font-medium text-indigo-900 hidden sm:block max-w-[120px] truncate">
                {user?.display_name || user?.username}
              </span>
              {isAdmin && (
                <span className="text-[10px] bg-primary-50 text-primary-700 border border-primary-200 px-1.5 py-0.5 rounded-full font-semibold hidden md:inline">
                  {user?.role === 'super_admin' ? 'Super Admin' : 'Admin'}
                </span>
              )}
              <ChevronDown
                size={12}
                className={`text-slate-400 transition-transform hidden sm:block ${dropdownOpen ? 'rotate-180' : ''}`}
              />
            </button>

            {/* Dropdown menu */}
            {dropdownOpen && (
              <div
                className="absolute right-0 top-full mt-2 w-52 rounded-2xl overflow-hidden z-50 animate-slide-up"
                style={{
                  background: 'rgba(255,255,255,0.97)',
                  backdropFilter: 'blur(16px)',
                  WebkitBackdropFilter: 'blur(16px)',
                  border: '1px solid rgba(108,99,255,0.12)',
                  boxShadow: '0 8px 32px rgba(108,99,255,0.18), 0 2px 8px rgba(0,0,0,0.06)',
                }}
              >
                {/* User info header */}
                <div className="px-4 py-3 border-b border-primary-50">
                  <p className="text-xs font-bold text-indigo-900 truncate">
                    {user?.display_name || user?.username}
                  </p>
                  <p className="text-xs text-slate-400 mt-0.5">
                    {ROLE_LABELS[user?.role ?? ''] ?? user?.role}
                  </p>
                </div>
                {/* Actions */}
                <div className="py-1">
                  <button
                    onClick={openPwModal}
                    className="flex items-center gap-2.5 w-full px-4 py-2.5 text-sm text-slate-600 hover:bg-primary-50/70 hover:text-primary-700 transition-colors text-left"
                  >
                    <KeyRound size={14} className="text-primary-400" />
                    Ganti Password
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Change Password Modal */}
      {pwModal && (
        <div
          className="fixed inset-0 z-[9999] flex items-center justify-center p-4"
          style={{ background: 'rgba(30,27,75,0.35)', backdropFilter: 'blur(6px)', WebkitBackdropFilter: 'blur(6px)' }}
        >
          <div
            className="w-full max-w-sm rounded-3xl p-6 animate-slide-up"
            style={{
              background: 'rgba(255,255,255,0.97)',
              backdropFilter: 'blur(24px)',
              WebkitBackdropFilter: 'blur(24px)',
              border: '1px solid rgba(108,99,255,0.15)',
              boxShadow: '0 24px 60px rgba(108,99,255,0.22), 0 4px 16px rgba(0,0,0,0.08)',
            }}
          >
            {/* Modal header */}
            <div className="flex items-center justify-between mb-5">
              <div className="flex items-center gap-2.5">
                <div
                  className="w-9 h-9 rounded-xl flex items-center justify-center"
                  style={{ background: 'linear-gradient(135deg, #6C63FF, #3B82F6)' }}
                >
                  <KeyRound size={16} className="text-white" />
                </div>
                <div>
                  <h2 className="text-sm font-bold text-indigo-900">Ganti Password</h2>
                  <p className="text-xs text-slate-400">{user?.username}</p>
                </div>
              </div>
              <button
                onClick={() => { setPwModal(false); setPwMsg(null) }}
                className="p-1.5 rounded-lg hover:bg-primary-50 text-slate-400 hover:text-primary-600 transition-colors"
              >
                <X size={16} />
              </button>
            </div>

            <form onSubmit={handleChangePw} className="space-y-3">
              {/* Old password */}
              <div>
                <label className="block text-xs font-semibold text-indigo-700/70 uppercase tracking-wide mb-1.5">
                  Password Lama
                </label>
                <div className="relative">
                  <input
                    type={showOld ? 'text' : 'password'}
                    value={oldPw}
                    onChange={(e) => setOldPw(e.target.value)}
                    className={inputCls + ' pr-10'}
                    placeholder="Password saat ini"
                    required
                    autoComplete="current-password"
                  />
                  <button type="button" onClick={() => setShowOld((s) => !s)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-primary-500 transition-colors">
                    {showOld ? <EyeOff size={14} /> : <Eye size={14} />}
                  </button>
                </div>
              </div>

              {/* New password */}
              <div>
                <label className="block text-xs font-semibold text-indigo-700/70 uppercase tracking-wide mb-1.5">
                  Password Baru
                </label>
                <div className="relative">
                  <input
                    type={showNew ? 'text' : 'password'}
                    value={newPw}
                    onChange={(e) => setNewPw(e.target.value)}
                    className={inputCls + ' pr-10'}
                    placeholder="Minimal 6 karakter"
                    required
                    autoComplete="new-password"
                  />
                  <button type="button" onClick={() => setShowNew((s) => !s)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-primary-500 transition-colors">
                    {showNew ? <EyeOff size={14} /> : <Eye size={14} />}
                  </button>
                </div>
              </div>

              {/* Confirm password */}
              <div>
                <label className="block text-xs font-semibold text-indigo-700/70 uppercase tracking-wide mb-1.5">
                  Konfirmasi Password Baru
                </label>
                <div className="relative">
                  <input
                    type={showConf ? 'text' : 'password'}
                    value={confirmPw}
                    onChange={(e) => setConfirmPw(e.target.value)}
                    className={inputCls + ' pr-10'}
                    placeholder="Ulangi password baru"
                    required
                    autoComplete="new-password"
                  />
                  <button type="button" onClick={() => setShowConf((s) => !s)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-primary-500 transition-colors">
                    {showConf ? <EyeOff size={14} /> : <Eye size={14} />}
                  </button>
                </div>
              </div>

              {/* Message */}
              {pwMsg && (
                <div className={`text-sm rounded-xl px-4 py-2.5 ${pwMsg.ok
                  ? 'bg-green-50 border border-green-200 text-green-700'
                  : 'bg-red-50 border border-red-200 text-red-600'}`}>
                  {pwMsg.text}
                </div>
              )}

              {/* Submit */}
              <button
                type="submit"
                disabled={pwLoading || pwMsg?.ok}
                className="w-full py-2.5 rounded-xl text-white font-semibold text-sm transition-all disabled:opacity-60 mt-1"
                style={{ background: 'linear-gradient(135deg, #6C63FF, #3B82F6)', boxShadow: '0 4px 16px rgba(108,99,255,0.35)' }}
              >
                {pwLoading ? (
                  <span className="flex items-center justify-center gap-2">
                    <svg className="animate-spin w-4 h-4" viewBox="0 0 24 24" fill="none">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                    </svg>
                    Mengubah...
                  </span>
                ) : pwMsg?.ok ? 'Berhasil!' : 'Ubah Password'}
              </button>
            </form>
          </div>
        </div>
      )}
    </>
  )
}
