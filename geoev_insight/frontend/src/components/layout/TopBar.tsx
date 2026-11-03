'use client'
import { useAuth } from '@/contexts/AuthContext'
import { useQueryClient } from '@tanstack/react-query'
import { RefreshCw } from 'lucide-react'
import { useState } from 'react'

export default function TopBar() {
  const { username, isAdmin } = useAuth()
  const qc = useQueryClient()
  const [refreshing, setRefreshing] = useState(false)

  async function handleRefresh() {
    setRefreshing(true)
    await qc.invalidateQueries()
    setTimeout(() => setRefreshing(false), 800)
  }

  return (
    <header className="bg-white border-b border-gray-200 px-6 py-3 flex items-center justify-between shrink-0">
      <button
        onClick={handleRefresh}
        className="flex items-center gap-2 text-sm text-gray-600 hover:text-primary-600 transition-colors px-3 py-1.5 border border-gray-200 rounded-lg hover:border-primary-300"
      >
        <RefreshCw size={14} className={refreshing ? 'animate-spin' : ''} />
        Muat ulang data
      </button>

      <div className="flex items-center gap-3 text-sm">
        <span className="text-gray-500">Login sebagai</span>
        <span className="font-semibold text-gray-800">{username}</span>
        {isAdmin && (
          <span className="text-xs bg-primary-100 text-primary-700 px-2.5 py-0.5 rounded-full font-medium">
            Admin
          </span>
        )}
      </div>
    </header>
  )
}

