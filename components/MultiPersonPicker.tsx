'use client'

/**
 * MultiPersonPicker — select multiple profiles as tags.
 * Shows selected people as removable chips.
 * Remaining unselected people available in dropdown.
 * Used for extra_assignee_ids in Contents.
 */

import type { ProfileOption } from '@/lib/types'

export default function MultiPersonPicker({
  selectedIds,
  selectedNames,
  profiles,
  onChange,
  placeholder = 'เพิ่มผู้รับผิดชอบ...',
  excludeIds = [],
}: {
  selectedIds: string[]
  selectedNames: string[]
  profiles: ProfileOption[]
  onChange: (ids: string[], names: string[]) => void
  placeholder?: string
  excludeIds?: string[]  // ids already assigned elsewhere (e.g. primary assigned_to)
}) {
  // Available profiles = not yet selected AND not excluded
  const available = profiles.filter(
    p => !selectedIds.includes(p.id) && !excludeIds.includes(p.id),
  )

  function add(id: string) {
    const p = profiles.find(p => p.id === id)
    if (!p) return
    onChange([...selectedIds, id], [...selectedNames, p.name])
  }

  function remove(idx: number) {
    onChange(
      selectedIds.filter((_, i) => i !== idx),
      selectedNames.filter((_, i) => i !== idx),
    )
  }

  return (
    <div className="space-y-2">
      {/* Selected chips */}
      {selectedIds.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {selectedIds.map((id, i) => {
            const name = selectedNames[i] || profiles.find(p => p.id === id)?.name || id
            return (
              <span
                key={id}
                className="inline-flex items-center gap-1.5 bg-indigo-50 text-indigo-700 border border-indigo-200 text-xs font-medium px-2.5 py-1 rounded-lg"
              >
                {name}
                <button
                  type="button"
                  onClick={() => remove(i)}
                  className="text-indigo-400 hover:text-indigo-700 transition-colors leading-none"
                  title={`ลบ ${name}`}
                >
                  <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round">
                    <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
                  </svg>
                </button>
              </span>
            )
          })}
        </div>
      )}

      {/* Dropdown to add more */}
      {available.length > 0 && (
        <select
          value=""
          onChange={e => { if (e.target.value) add(e.target.value) }}
          className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white text-slate-500"
        >
          <option value="">{placeholder}</option>
          {available.map(p => (
            <option key={p.id} value={p.id}>{p.name}</option>
          ))}
        </select>
      )}

      {selectedIds.length === 0 && available.length === 0 && (
        <p className="text-xs text-slate-400">ไม่มีรายชื่อที่เพิ่มได้อีก</p>
      )}
    </div>
  )
}
