import { cx } from '@/lib/utils'

interface KpiCardProps {
  title: string
  value: string | number
  subtitle?: string
  icon?: string
  highlight?: boolean
  color?: 'teal' | 'blue' | 'purple' | 'amber' | 'rose'
}

const COLOR_MAP = {
  teal:   { icon: 'bg-primary-100 text-primary-600',   ring: 'ring-primary-200' },
  blue:   { icon: 'bg-blue-100 text-blue-600',          ring: 'ring-blue-200' },
  purple: { icon: 'bg-violet-100 text-violet-600',      ring: 'ring-violet-200' },
  amber:  { icon: 'bg-amber-100 text-amber-600',        ring: 'ring-amber-200' },
  rose:   { icon: 'bg-rose-100 text-rose-600',          ring: 'ring-rose-200' },
}

export default function KpiCard({
  title, value, subtitle, icon, highlight, color = 'teal',
}: KpiCardProps) {
  const c = COLOR_MAP[color]

  if (highlight) {
    return (
      <div
        className="rounded-2xl p-5 text-white relative overflow-hidden"
        style={{
          background: 'linear-gradient(135deg, #6C63FF 0%, #3B82F6 100%)',
          boxShadow: '0 8px 32px rgba(108,99,255,0.35)',
        }}
      >
        {/* Decorative blob */}
        <div
          className="absolute -top-6 -right-6 w-28 h-28 rounded-full opacity-20"
          style={{ background: 'white' }}
        />
        <div
          className="absolute -bottom-4 -right-4 w-16 h-16 rounded-full opacity-10"
          style={{ background: 'white' }}
        />
        {icon && <div className="text-xl mb-3 opacity-90 relative">{icon}</div>}
        <div className="text-xs font-semibold text-white/70 uppercase tracking-wide mb-1 relative">{title}</div>
        <div className="text-3xl font-bold tracking-tight relative">{value}</div>
        {subtitle && <div className="text-xs text-white/60 mt-1 relative">{subtitle}</div>}
      </div>
    )
  }

  return (
    <div className="card-glass rounded-2xl p-5 transition-all duration-200 hover:-translate-y-0.5 hover:shadow-brand cursor-default"
      style={{ boxShadow: '0 4px 24px rgba(108,99,255,0.08), 0 1px 3px rgba(108,99,255,0.04)' }}
    >
      {icon && (
        <div className={cx('w-9 h-9 rounded-xl flex items-center justify-center text-lg mb-3', c.icon)}>
          {icon}
        </div>
      )}
      <div className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-1">{title}</div>
      <div className="text-2xl font-bold text-indigo-900 tracking-tight">{value}</div>
      {subtitle && <div className="text-xs text-slate-400 mt-1">{subtitle}</div>}
    </div>
  )
}
