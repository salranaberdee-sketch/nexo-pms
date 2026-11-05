'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase'

type ProfileOption = { id: string; name: string; role: string }

// Inline person-assignment dropdown for table rows.
// Renders like a quiet text label; on focus/hover shows it's editable.
// disabled=true → shows plain text (for viewers without update permission).
export default function InlinePersonPicker({
  value,      // currently assigned profile id
  display,    // name string shown when not editing
  onChange,
  disabled = false,
  placeholder = '—',
}: {
  value: string
  display: string
  onChange: (id: string, name: string) => void
  disabled?: boolean
  placeholder?: string
}) {
  const [profiles, setProfiles] = useState<ProfileOption[]>([])
  const supabase = createClient()

  useEffect(() => {
    supabase
      .from('profiles')
      .select('id, name, role')
      .eq('approval_status', 'approved')
      .order('name')
      .then(({ data }) => setProfiles(data || []))
  }, [])

  if (disabled) {
    return <span className="text-xs text-gray-500">{display || placeholder}</span>
  }

  return (
    <div className="relative group">
      <select
        value={value}
        onChange={e => {
          const p = profiles.find(p => p.id === e.target.value)
          onChange(e.target.value, p?.name || '')
        }}
        className="appearance-none cursor-pointer text-xs text-gray-700 bg-transparent pr-4 focus:outline-none focus:ring-1 focus:ring-gray-900 rounded hover:text-gray-900 transition-colors min-w-[60px]"
      >
        <option value="">{placeholder}</option>
        {profiles.map(p => (
          <option key={p.id} value={p.id}>{p.name} ({p.role})</option>
        ))}
      </select>
      {/* tiny pencil hint — visible on row hover */}
      <svg
        className="pointer-events-none absolute right-0 top-1/2 -translate-y-1/2 text-gray-300 group-hover:text-gray-400 transition-colors"
        width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="currentColor"
        strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"
      >
        <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
        <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
      </svg>
    </div>
  )
}
