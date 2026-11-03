interface InsightBlockProps {
  label?: string
  headline: string
  sub?: string
}

export default function InsightBlock({ label, headline, sub }: InsightBlockProps) {
  return (
    <div className="flex gap-3 mb-5">
      {/* Accent bar */}
      <div
        className="w-1 rounded-full shrink-0 self-stretch min-h-[2rem]"
        style={{ background: 'linear-gradient(180deg, #087f83, #0ea5e9)' }}
      />
      <div>
        {label && (
          <p className="text-[10px] font-bold text-primary-600 uppercase tracking-widest mb-1">{label}</p>
        )}
        <h2 className="text-base font-semibold text-slate-800 leading-snug">{headline}</h2>
        {sub && <p className="text-xs text-slate-400 mt-0.5">{sub}</p>}
      </div>
    </div>
  )
}
