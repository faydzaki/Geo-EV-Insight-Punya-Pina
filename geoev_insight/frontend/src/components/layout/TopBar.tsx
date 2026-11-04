'use client'
import { useAuth } from '@/contexts/AuthContext'
import { useQueryClient } from '@tanstack/react-query'
import { usePathname } from 'next/navigation'
import {
  Menu, ChevronDown, KeyRound, X, Eye, EyeOff,
  Bell, RefreshCw, Check,
} from 'lucide-react'
import { useState, useRef, useEffect } from 'react'
import { changePassword } from '@/lib/api'

const PAGE_LABELS: Record<string, string> = {
  '/peta':         'Peta & Infrastruktur',
  '/hcs':          'Distribusi HCS',
  '/perbandingan': 'Perbandingan Wilayah',
  '/kajian':       'Kajian Wilayah',
  '/admin':        'Manajemen Data',
  '/admin/users':  'Manajemen User',
}

const ROLE_LABELS: Record<string, string> = {
  super_admin: 'Super Admin',
  admin:       'Admin',
  viewer:      'Viewer',
}

const inputCls =
  'w-full rounded-xl px-3 py-2 text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-400/40 transition border border-slate-200 bg-white'

export default function TopBar({ onMenuClick }: { onMenuClick?: () => void }) {
  const { user } = useAuth()
  const qc       = useQueryClient()
  const pathname = usePathname()
  const [refreshed, setRefreshed] = useState(false)
  const [loading,   setLoading]   = useState(false)

  const [dropdownOpen, setDropdownOpen] = useState(false)
  const [notifOpen,    setNotifOpen]    = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)
  const notifRef    = useRef<HTMLDivElement>(null)

  const [pwModal,   setPwModal]   = useState(false)
  const [oldPw,     setOldPw]     = useState('')
  const [newPw,     setNewPw]     = useState('')
  const [confirmPw, setConfirmPw] = useState('')
  const [showOld,   setShowOld]   = useState(false)
  const [showNew,   setShowNew]   = useState(false)
  const [showConf,  setShowConf]  = useState(false)
  const [pwLoading, setPwLoading] = useState(false)
  const [pwMsg,     setPwMsg]     = useState<{ ok: boolean; text: string } | null>(null)

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setDropdownOpen(false)
      }
      if (notifRef.current && !notifRef.current.contains(e.target as Node)) {
        setNotifOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  async function handleRefresh() {
    setLoading(true)
    setRefreshed(false)
    await qc.invalidateQueries()
    setTimeout(() => { setLoading(false); setRefreshed(true) }, 600)
    setTimeout(() => setRefreshed(false), 3000)
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
      setTimeout(() => { setPwModal(false); setPwMsg(null) }, 1500)
    } catch {
      setPwMsg({ ok: false, text: 'Password lama salah atau terjadi kesalahan server.' })
    } finally {
      setPwLoading(false)
    }
  }

  const pageLabel = PAGE_LABELS[pathname] ?? 'Dashboard'
  const initials  = (user?.display_name || user?.username || 'AD').slice(0, 2).toUpperCase()

  return (
    <>
      <header className="flex items-center justify-between px-2 sm:px-4 py-2 flex-shrink-0 z-10">
        {/* Left: Breadcrumbs */}
        <div className="flex items-center gap-2">
          {/* Mobile hamburger */}
          <button
            onClick={onMenuClick}
            className="lg:hidden p-2 rounded-xl text-slate-500 hover:text-slate-800 hover:bg-white/60 transition-colors"
            aria-label="Buka menu navigasi"
          >
            <Menu size={18} />
          </button>

          <div className="flex items-center gap-2 text-xs sm:text-sm">
            <span className="font-semibold text-slate-800">GeoEV</span>
            <span className="text-slate-400">›</span>
            <span className="font-medium text-slate-700">{pageLabel}</span>
          </div>
        </div>

        {/* Right: Actions */}
        <div className="flex items-center gap-2.5 sm:gap-3">
          {/* Refresh button */}
          <button
            onClick={handleRefresh}
            className="flex items-center gap-2 px-3 py-1.5 bg-white/70 hover:bg-white border border-white rounded-xl text-slate-700 text-xs font-medium transition-colors shadow-xs"
          >
            <RefreshCw size={12} className={loading ? 'animate-spin text-blue-600' : ''} />
            <span className="hidden sm:inline">
              {refreshed ? (
                <span className="text-green-600 font-semibold inline-flex items-center gap-1">
                  <span>Diperbarui</span>
                  <Check size={11} />
                </span>
              ) : (
                'Muat ulang'
              )}
            </span>
          </button>

          {/* Notification button with popover */}
          <div className="relative" ref={notifRef}>
            <button
              onClick={() => setNotifOpen((v) => !v)}
              className="relative p-2 bg-white/70 hover:bg-white rounded-xl border border-white text-slate-600 shadow-xs transition-colors"
              title="Notifikasi Sistem"
            >
              <Bell size={15} />
              <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-emerald-500 border border-white rounded-full animate-pulse" />
            </button>

            {notifOpen && (
              <div className="absolute right-0 top-full mt-2 w-72 rounded-2xl overflow-hidden z-50 bg-white/95 backdrop-blur-xl border border-white shadow-xl p-3 animate-slide-up">
                <div className="flex items-center justify-between pb-2 mb-2 border-b border-slate-100">
                  <span className="text-xs font-bold text-slate-800">Status &amp; Notifikasi</span>
                  <span className="text-[10px] bg-emerald-50 text-emerald-600 font-semibold px-2 py-0.5 rounded-full border border-emerald-100">
                    Sistem Normal
                  </span>
                </div>
                <div className="space-y-2 text-xs">
                  <div className="p-2 rounded-xl bg-slate-50 border border-slate-100/60">
                    <p className="font-semibold text-slate-700 text-[11px]">Integrasi Peta &amp; SPKLU Aktif</p>
                    <p className="text-[10px] text-slate-400 mt-0.5">Semua koordinat SPKLU Jawa Timur &amp; Bali terpetakan.</p>
                  </div>
                  <div className="p-2 rounded-xl bg-slate-50 border border-slate-100/60">
                    <p className="font-semibold text-slate-700 text-[11px]">Audit Kualitas Data</p>
                    <p className="text-[10px] text-slate-400 mt-0.5">Koreksi wilayah HCS dan inventaris berjalan sinkron.</p>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* User profile with dropdown */}
          <div className="relative" ref={dropdownRef}>
            <button
              onClick={() => setDropdownOpen((o) => !o)}
              className="flex items-center gap-2 pl-2 border-l border-slate-200/80 cursor-pointer py-1"
            >
              <div
                className="w-7 h-7 rounded-full flex items-center justify-center text-white font-bold text-[10px] shrink-0 shadow-xs"
                style={{ background: 'linear-gradient(135deg, #60A5FA 0%, #3B82F6 100%)' }}
              >
                {initials}
              </div>
              <span className="font-medium text-slate-700 text-xs hidden sm:block">
                {user?.display_name || user?.username || 'Admin'}
              </span>
              <ChevronDown
                size={12}
                className={`text-slate-400 transition-transform ${dropdownOpen ? 'rotate-180' : ''}`}
              />
            </button>

            {/* Dropdown Menu */}
            {dropdownOpen && (
              <div
                className="absolute right-0 top-full mt-2 w-48 rounded-2xl overflow-hidden z-50 bg-white/95 backdrop-blur-xl border border-white shadow-lg p-1 animate-slide-up"
              >
                <div className="px-3 py-2 border-b border-slate-100">
                  <p className="text-xs font-bold text-slate-800 truncate">
                    {user?.display_name || user?.username || 'Admin'}
                  </p>
                  <p className="text-[10px] text-slate-400 mt-0.5">
                    {ROLE_LABELS[user?.role ?? ''] ?? user?.role ?? 'Super Admin'}
                  </p>
                </div>
                <div className="py-1">
                  <button
                    onClick={openPwModal}
                    className="flex items-center gap-2 w-full px-3 py-2 text-xs text-slate-600 hover:bg-slate-50 hover:text-blue-600 rounded-lg transition-colors text-left"
                  >
                    <KeyRound size={13} className="text-slate-400" />
                    Ganti Password
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Password Modal */}
      {pwModal && (
        <div
          className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-slate-900/35 backdrop-blur-sm"
        >
          <div className="w-full max-w-sm rounded-3xl p-6 bg-white border border-white shadow-2xl animate-slide-up">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
                  <KeyRound size={16} />
                </div>
                <div>
                  <h2 className="text-sm font-bold text-slate-800">Ganti Password</h2>
                  <p className="text-[11px] text-slate-400">{user?.username}</p>
                </div>
              </div>
              <button
                onClick={() => { setPwModal(false); setPwMsg(null) }}
                className="p-1 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-600"
              >
                <X size={16} />
              </button>
            </div>

            <form onSubmit={handleChangePw} className="space-y-3">
              <div>
                <label className="block text-[11px] font-semibold text-slate-600 mb-1">Password Lama</label>
                <div className="relative">
                  <input
                    type={showOld ? 'text' : 'password'}
                    value={oldPw}
                    onChange={(e) => setOldPw(e.target.value)}
                    className={`${inputCls} pr-8`}
                    placeholder="Password saat ini"
                    required
                  />
                  <button type="button" onClick={() => setShowOld((s) => !s)} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400">
                    {showOld ? <EyeOff size={13} /> : <Eye size={13} />}
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-600 mb-1">Password Baru</label>
                <div className="relative">
                  <input
                    type={showNew ? 'text' : 'password'}
                    value={newPw}
                    onChange={(e) => setNewPw(e.target.value)}
                    className={`${inputCls} pr-8`}
                    placeholder="Minimal 6 karakter"
                    required
                  />
                  <button type="button" onClick={() => setShowNew((s) => !s)} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400">
                    {showNew ? <EyeOff size={13} /> : <Eye size={13} />}
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-600 mb-1">Konfirmasi Password</label>
                <div className="relative">
                  <input
                    type={showConf ? 'text' : 'password'}
                    value={confirmPw}
                    onChange={(e) => setConfirmPw(e.target.value)}
                    className={`${inputCls} pr-8`}
                    placeholder="Ulangi password baru"
                    required
                  />
                  <button type="button" onClick={() => setShowConf((s) => !s)} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400">
                    {showConf ? <EyeOff size={13} /> : <Eye size={13} />}
                  </button>
                </div>
              </div>

              {pwMsg && (
                <div className={`text-xs rounded-xl px-3 py-2 ${pwMsg.ok ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-600'}`}>
                  {pwMsg.text}
                </div>
              )}

              <button
                type="submit"
                disabled={pwLoading || Boolean(pwMsg?.ok)}
                className="w-full py-2.5 rounded-xl text-white font-semibold text-xs bg-blue-600 hover:bg-blue-700 transition-colors shadow-sm mt-2 disabled:opacity-50"
              >
                {pwLoading ? 'Mengubah...' : pwMsg?.ok ? 'Berhasil!' : 'Ubah Password'}
              </button>
            </form>
          </div>
        </div>
      )}
    </>
  )
}
