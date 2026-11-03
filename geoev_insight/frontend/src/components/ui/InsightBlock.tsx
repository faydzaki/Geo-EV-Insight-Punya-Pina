interface InsightBlockProps {
  eyebrow?: string
  headline: string
  className?: string
}

export default function InsightBlock({ eyebrow, headline, className = '' }: InsightBlockProps) {
  return (
    <div className={`mb-4 ${className}`}>
      {eyebrow && (
        <div className="text-xs font-bold text-primary-500 uppercase tracking-wider mb-1">
          {eyebrow}
        </div>
      )}
      <h3 className="text-lg font-bold text-gray-800 leading-snug">{headline}</h3>
    </div>
  )
}

