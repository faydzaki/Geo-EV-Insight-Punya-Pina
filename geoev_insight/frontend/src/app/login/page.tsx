'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/contexts/AuthContext'
import { loginApi } from '@/lib/api'
import { Eye, EyeOff, User, Lock } from 'lucide-react'
import PlnIcon from '@/components/ui/PlnIcon'

export default function LoginPage() {
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [showPwd,  setShowPwd]  = useState(false)
  const [error,    setError]    = useState('')
  const [loading,  setLoading]  = useState(false)
  const { login }  = useAuth()
  const router     = useRouter()

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')
    try {
      const { token } = await loginApi(username, password)
      login(token)
      router.push('/peta')
    } catch {
      setError('Username atau password salah. Pastikan server backend berjalan.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div
      className="min-h-screen flex items-center justify-center relative overflow-hidden"
      style={{
        background: 'linear-gradient(135deg, #F0EFFE 0%, #EDEEFF 40%, #EEF2FF 70%, #E8E4FF 100%)',
      }}
    >
      {/* Animated blobs */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div
          className="blob absolute w-[520px] h-[520px]"
          style={{
            background: 'radial-gradient(circle, rgba(108,99,255,0.28) 0%, transparent 70%)',
            top: '-15%', right: '-8%',
          }}
        />
        <div
          className="blob absolute w-[420px] h-[420px]"
          style={{
            background: 'radial-gradient(circle, rgba(59,130,246,0.22) 0%, transparent 70%)',
            bottom: '-18%', left: '-10%',
            animationDelay: '-8s',
          }}
        />
        <div
          className="blob absolute w-[300px] h-[300px]"
          style={{
            background: 'radial-gradient(circle, rgba(139,92,246,0.18) 0%, transparent 70%)',
            top: '45%', left: '28%',
            animationDelay: '-4s',
          }}
        />
        {/* Floating orbs */}
        <div
          className="absolute w-16 h-16 rounded-full opacity-60"
          style={{
            background: 'rgba(108,99,255,0.15)',
            border: '1px solid rgba(108,99,255,0.2)',
            top: '20%', left: '12%',
            animation: 'float 6s ease-in-out infinite',
          }}
        />
        <div
          className="absolute w-10 h-10 rounded-full opacity-60"
          style={{
            background: 'rgba(59,130,246,0.12)',
            border: '1px solid rgba(59,130,246,0.2)',
            bottom: '25%', right: '15%',
            animation: 'float 8s ease-in-out infinite reverse',
          }}
        />
      </div>

      {/* Card */}
      <div className="relative w-full max-w-md mx-4 animate-slide-up">
        <div
          className="rounded-3xl p-8 border border-white/70"
          style={{
            background: 'rgba(255,255,255,0.82)',
            backdropFilter: 'blur(24px)',
            WebkitBackdropFilter: 'blur(24px)',
            boxShadow: '0 24px 60px rgba(108,99,255,0.18), 0 4px 16px rgba(108,99,255,0.08)',
          }}
        >
          {/* PLN Logo */}
          <div className="flex items-center gap-4 mb-8">
            <div
              className="w-14 h-14 rounded-2xl flex items-center justify-center shrink-0 overflow-hidden bg-white/95 border border-white/80 p-1.5 shadow-md"
              style={{
                boxShadow: '0 4px 20px rgba(247,232,46,0.3)',
              }}
            >
              <PlnIcon className="w-full h-full object-contain" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-indigo-900 leading-tight">GeoEV Insight</h1>
              <p className="text-[12px] text-slate-400 mt-0.5">SPKLU & Home Charging Jawa Timur–Bali</p>
            </div>
          </div>

          <div className="mb-6">
            <h2 className="text-2xl font-bold text-indigo-900">Welcome Back!</h2>
            <p className="text-sm text-slate-400 mt-1">Masuk untuk mengakses dashboard Anda</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Username */}
            <div>
              <label className="block text-xs font-semibold text-indigo-700/70 uppercase tracking-wide mb-1.5">
                Username
              </label>
              <div className="relative">
                <User size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-primary-400 pointer-events-none" />
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="w-full rounded-xl pl-10 pr-4 py-3 text-sm text-indigo-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-primary-400/40 transition border border-primary-100 bg-white/70"
                  placeholder="Masukkan username"
                  required
                  autoComplete="username"
                />
              </div>
            </div>

            {/* Password */}
            <div>
              <label className="block text-xs font-semibold text-indigo-700/70 uppercase tracking-wide mb-1.5">
                Password
              </label>
              <div className="relative">
                <Lock size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-primary-400 pointer-events-none" />
                <input
                  type={showPwd ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full rounded-xl pl-10 pr-11 py-3 text-sm text-indigo-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-primary-400/40 transition border border-primary-100 bg-white/70"
                  placeholder="Masukkan password"
                  required
                  autoComplete="current-password"
                />
                <button
                  type="button"
                  onClick={() => setShowPwd((s) => !s)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-primary-500 transition-colors"
                >
                  {showPwd ? <EyeOff size={15} /> : <Eye size={15} />}
                </button>
              </div>
            </div>

            {/* Error */}
            {error && (
              <div className="bg-red-50 border border-red-200 text-red-600 text-sm rounded-xl px-4 py-3">
                {error}
              </div>
            )}

            {/* Submit */}
            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 rounded-xl text-white font-semibold text-sm transition-all duration-200 disabled:opacity-60 mt-2 relative overflow-hidden"
              style={{
                background: 'linear-gradient(135deg, #6C63FF, #3B82F6)',
                boxShadow: '0 4px 20px rgba(108,99,255,0.45)',
              }}
            >
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <svg className="animate-spin w-4 h-4" viewBox="0 0 24 24" fill="none">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                  Memeriksa akses…
                </span>
              ) : 'Masuk ke Dashboard →'}
            </button>
          </form>

          <div className="flex items-center gap-3 mt-6">
            <div className="flex-1 h-px bg-primary-100" />
            <p className="text-[11px] text-slate-400 text-center">Hanya untuk pegawai PLN ES yang berwenang</p>
            <div className="flex-1 h-px bg-primary-100" />
          </div>
        </div>
      </div>
    </div>
  )
}
