'use client'

import type { ProfileOption } from '@/lib/types'

// Re-export so existing `import { type ProfileOption } from '@/components/ProfilePicker'`
// imports continue to compile without changes.
export type { ProfileOption }

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
      className={`border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white ${className}`}
    >
      {allowEmpty && <option value="">{placeholder}</option>}
      {profiles.map(p => (
        <option key={p.id} value={p.id}>{p.name}</option>
      ))}
    </select>
  )
}
