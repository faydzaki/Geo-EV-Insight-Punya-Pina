'use client'
import React, { useEffect } from 'react'
import { AlertTriangle, Trash2, HelpCircle, X } from 'lucide-react'

interface ConfirmModalProps {
  open: boolean
  title?: string
  message: React.ReactNode
  confirmText?: string
  cancelText?: string
  variant?: 'danger' | 'warning' | 'primary'
  loading?: boolean
  onConfirm: () => void
  onCancel: () => void
}

export default function ConfirmModal({
  open,
  title = 'Apakah Anda Yakin?',
  message,
  confirmText = 'Ya, Lanjutkan',
  cancelText = 'Batal',
  variant = 'danger',
  loading = false,
  onConfirm,
  onCancel,
}: ConfirmModalProps) {
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape' && open && !loading) {
        onCancel()
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [open, loading, onCancel])

  if (!open) return null

  const iconVariants = {
    danger: {
      bg: 'bg-red-50 text-red-600 border border-red-100',
      icon: <Trash2 size={24} />,
      buttonStyle: { background: 'linear-gradient(135deg, #EF4444 0%, #DC2626 100%)' },
      buttonHover: 'hover:opacity-95',
    },
    warning: {
      bg: 'bg-amber-50 text-amber-600 border border-amber-100',
      icon: <AlertTriangle size={24} />,
      buttonStyle: { background: 'linear-gradient(135deg, #F59E0B 0%, #D97706 100%)' },
      buttonHover: 'hover:opacity-95',
    },
    primary: {
      bg: 'bg-blue-50 text-blue-600 border border-blue-100',
      icon: <HelpCircle size={24} />,
      buttonStyle: { background: 'linear-gradient(135deg, #2563EB 0%, #1D4ED8 100%)' },
      buttonHover: 'hover:opacity-95',
    },
  }

  const v = iconVariants[variant] || iconVariants.danger

  return (
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm animate-fade-in"
      onClick={(e) => {
        if (e.target === e.currentTarget && !loading) onCancel()
      }}
    >
      <div className="w-full max-w-sm rounded-3xl p-6 bg-white border border-white shadow-2xl space-y-4 animate-slide-up relative">
        <button
          onClick={onCancel}
          disabled={loading}
          className="absolute right-4 top-4 p-1 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors disabled:opacity-50"
          aria-label="Tutup modal"
        >
          <X size={16} />
        </button>

        <div className="flex flex-col items-center text-center pt-1">
          <div className={`w-12 h-12 rounded-2xl flex items-center justify-center mb-3.5 shadow-xs ${v.bg}`}>
            {v.icon}
          </div>
          <h3 className="text-base font-bold text-slate-900">{title}</h3>
          <div className="text-xs text-slate-500 mt-1.5 leading-relaxed">
            {message}
          </div>
        </div>

        <div className="flex items-center gap-2.5 pt-2">
          <button
            type="button"
            onClick={onCancel}
            disabled={loading}
            className="flex-1 py-2.5 px-4 rounded-xl text-xs font-semibold text-slate-600 bg-slate-100 hover:bg-slate-200 border border-slate-200 transition-colors disabled:opacity-50"
          >
            {cancelText}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={loading}
            style={v.buttonStyle}
            className={`flex-1 py-2.5 px-4 rounded-xl text-xs font-semibold text-white shadow-sm transition-all disabled:opacity-50 ${v.buttonHover}`}
          >
            {loading ? 'Memproses…' : confirmText}
          </button>
        </div>
      </div>
    </div>
  )
}
