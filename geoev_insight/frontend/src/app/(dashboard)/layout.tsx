'use client'
import { useAuth } from '@/contexts/AuthContext'
import { useRouter, usePathname } from 'next/navigation'
import { useEffect, useState } from 'react'
import { isTokenExpired } from '@/lib/auth'
import Sidebar from '@/components/layout/Sidebar'
import TopBar from '@/components/layout/TopBar'
import { Zap } from 'lucide-react'

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, logout } = useAuth()
  const router   = useRouter()
  const pathname = usePathname()
  const [sidebarOpen, setSidebarOpen] = useState(false)

  useEffect(() => {
    if (!isAuthenticated || isTokenExpired()) {
      if (isAuthenticated) logout()
      router.replace('/login')
    }
  }, [isAuthenticated, router, pathname, logout])

  // Close sidebar on route change (mobile)
  useEffect(() => {
    setSidebarOpen(false)
  }, [pathname])

  if (!isAuthenticated || isTokenExpired()) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="flex items-center gap-3 text-slate-400">
          <Zap size={18} className="animate-pulse text-primary-400" />
          <span className="text-sm">Mengalihkan ke halaman login&hellip;</span>
        </div>
      </div>
    )
  }

  return (
    <div className="flex h-screen overflow-hidden">
      <div className="no-print">
        <Sidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      </div>
      <div className="flex-1 flex flex-col min-w-0">
        <div className="no-print">
          <TopBar onMenuClick={() => setSidebarOpen((o) => !o)} />
        </div>
        <main className="flex-1 overflow-y-auto p-6 print:p-4 print:overflow-visible">
          <div className="max-w-screen-2xl mx-auto animate-fade-in">
            {children}
          </div>
        </main>
      </div>
    </div>
  )
}
