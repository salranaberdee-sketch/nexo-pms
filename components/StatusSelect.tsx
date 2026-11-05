'use client'

// Inline status dropdown styled like a colored badge — change status in one click.
// For users without update permission, renders a static badge instead.
// Uses optimistic update handled by the parent's onChange.
export default function StatusSelect({
  value,
  options,
  styleMap,
  onChange,
  disabled = false,
}: {
  value: string
  options: string[]
  styleMap: Record<string, string>
  onChange: (v: string) => void
  disabled?: boolean
}) {
  const cls = styleMap[value] || 'bg-gray-100 text-gray-400'

  if (disabled) {
    return (
      <span className={`inline-block px-2 py-0.5 rounded-md text-xs font-medium whitespace-nowrap ${cls}`}>
        {value}
      </span>
    )
  }

  return (
    <div className="relative inline-flex">
      <select
        value={value}
        onChange={e => onChange(e.target.value)}
        className={`cursor-pointer appearance-none rounded-md text-xs font-medium pl-2 pr-6 py-1 focus:outline-none focus:ring-2 focus:ring-gray-900 border border-current/20 ${cls}`}
      >
        {options.map(s => (
          <option key={s} value={s} className="bg-white text-gray-700">{s}</option>
        ))}
      </select>
      <svg
        className="pointer-events-none absolute right-1.5 top-1/2 -translate-y-1/2 opacity-60"
        width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="currentColor"
        strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"
      >
        <polyline points="6 9 12 15 18 9" />
      </svg>
    </div>
  )
}
