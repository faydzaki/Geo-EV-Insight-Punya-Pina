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
      <div className="min-h-screen flex items-center justify-center bg-[#EEF4FD]">
        <div className="flex items-center gap-3 text-slate-400">
          <Zap size={18} className="animate-pulse text-blue-500" />
          <span className="text-sm">Mengalihkan ke halaman login&hellip;</span>
        </div>
      </div>
    )
  }

  return (
    <div className="flex h-screen overflow-hidden bg-[#EEF4FD] p-2.5 sm:p-3.5 gap-3.5 font-sans">
      {/* Floating Sidebar Card */}
      <div className="no-print shrink-0 h-full">
        <Sidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      </div>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 h-full overflow-hidden">
        {/* TopBar */}
        <div className="no-print shrink-0 mb-2">
          <TopBar onMenuClick={() => setSidebarOpen((o) => !o)} />
        </div>

        {/* Scrollable Main */}
        <main className="flex-1 overflow-y-auto pr-1 pb-4 print:p-0 print:overflow-visible custom-scrollbar">
          <div className="max-w-[1600px] mx-auto animate-fade-in">
            {children}
          </div>
        </main>
      </div>
    </div>
  )
}
