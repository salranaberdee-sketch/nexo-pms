'use client'

export type ProfileOption = { id: string; name: string }

// Reusable dropdown that lists all approved profiles.
// Accepts profiles as a prop — fetch once in the parent and pass down,
// instead of fetching independently in every form instance.
// Stores both id (for FK) and name (for display/fallback) via onChange.
export default function ProfilePicker({
  value,
  profiles,
  onChange,
  placeholder = 'เลือกผู้รับผิดชอบ',
  allowEmpty = true,
  className = '',
}: {
  value: string
  profiles: ProfileOption[]
  onChange: (id: string, name: string) => void
  placeholder?: string
  allowEmpty?: boolean
  className?: string
}) {
  return (
    <select
      value={value}
      onChange={e => {
        const p = profiles.find(p => p.id === e.target.value)
        onChange(e.target.value, p?.name || '')
      }}
      className={`border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gray-900 bg-white ${className}`}
    >
      {allowEmpty && <option value="">{placeholder}</option>}
      {profiles.map(p => (
        <option key={p.id} value={p.id}>{p.name}</option>
      ))}
    </select>
  )
}
