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
  teal:   { icon: 'bg-teal-100',   ring: 'ring-teal-200' },
  blue:   { icon: 'bg-blue-100',   ring: 'ring-blue-200' },
  purple: { icon: 'bg-purple-100', ring: 'ring-purple-200' },
  amber:  { icon: 'bg-amber-100',  ring: 'ring-amber-200' },
  rose:   { icon: 'bg-rose-100',   ring: 'ring-rose-200' },
}

export default function KpiCard({
  title, value, subtitle, icon, highlight, color = 'teal',
}: KpiCardProps) {
  const c = COLOR_MAP[color]

  if (highlight) {
    return (
      <div
        className="rounded-2xl p-5 text-white relative overflow-hidden shadow-card"
        style={{ background: 'linear-gradient(135deg, #087f83 0%, #0ea5e9 100%)' }}
      >
        {/* Decorative blob */}
        <div
          className="absolute -top-6 -right-6 w-24 h-24 rounded-full opacity-20"
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
    <div className="bg-white rounded-2xl border border-slate-100 p-5 shadow-card transition-all duration-200 hover:shadow-card-hover hover:-translate-y-0.5 cursor-default">
      {icon && (
        <div className={cx('w-9 h-9 rounded-xl flex items-center justify-center text-lg mb-3', c.icon)}>
          {icon}
        </div>
      )}
      <div className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1">{title}</div>
      <div className="text-2xl font-bold text-slate-800 tracking-tight">{value}</div>
      {subtitle && <div className="text-xs text-slate-400 mt-1">{subtitle}</div>}
    </div>
  )
}
