interface KpiCardProps {
  title: string
  value: string | number
  subtitle?: string
  icon?: string
  highlight?: boolean
}

export default function KpiCard({ title, value, subtitle, icon, highlight }: KpiCardProps) {
  return (
    <div
      className={`rounded-xl border p-5 ${
        highlight ? 'bg-primary-500 border-primary-500 text-white' : 'bg-white border-gray-200'
      }`}
    >
      <div
        className={`flex items-center gap-1.5 text-sm mb-2 ${
          highlight ? 'text-primary-100' : 'text-gray-500'
        }`}
      >
        {icon && <span className="text-base">{icon}</span>}
        <span className="font-medium">{title}</span>
      </div>
      <div className={`text-2xl font-bold ${highlight ? 'text-white' : 'text-gray-900'}`}>
        {value}
      </div>
      {subtitle && (
        <div className={`text-xs mt-1 ${highlight ? 'text-primary-100' : 'text-gray-400'}`}>
          {subtitle}
        </div>
      )}
    </div>
  )
}

