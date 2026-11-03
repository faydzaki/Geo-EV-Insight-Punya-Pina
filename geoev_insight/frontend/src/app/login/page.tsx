'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/contexts/AuthContext'
import { loginApi } from '@/lib/api'

export default function LoginPage() {
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const { login } = useAuth()
  const router = useRouter()

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
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary-50 via-white to-gray-100">
      <div className="bg-white rounded-2xl shadow-xl p-10 w-full max-w-md border border-gray-100">
        {/* Logo & Brand */}
        <div className="flex items-center gap-3 mb-8">
          <div className="w-11 h-11 bg-primary-500 rounded-xl flex items-center justify-center text-white text-2xl font-bold select-none">
            ϟ
          </div>
          <div>
            <h1 className="text-xl font-bold text-gray-900">GeoEV Insight</h1>
            <p className="text-sm text-gray-500">SPKLU dan Home Charging Jawa Timur–Bali</p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Username</label>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent transition"
              placeholder="Masukkan username"
              required
              autoComplete="username"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent transition"
              required
              autoComplete="current-password"
            />
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg px-4 py-3">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-primary-500 hover:bg-primary-600 disabled:opacity-50 text-white font-semibold py-2.5 rounded-lg transition-colors text-sm"
          >
            {loading ? 'Memeriksa akses…' : 'Masuk'}
          </button>
        </form>

        <p className="text-xs text-gray-400 text-center mt-6">
          Hanya untuk pegawai PLN ES yang memiliki izin akses.
        </p>
      </div>
    </div>
  )
}
