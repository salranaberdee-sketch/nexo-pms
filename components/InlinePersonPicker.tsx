'use client'

import { useState, useRef, useEffect } from 'react'

export type ProfileOption = { id: string; name: string; role: string; brand_access?: string[] }

// Minimal inline assignee chip for table rows.
// Idle: avatar + name, no border — clean.
// Hover: subtle ring appears, signalling it's interactive.
// Click: compact dropdown to reassign.
// disabled=true → read-only chip.
//
// IMPORTANT: profiles are passed as a prop — do NOT fetch inside this component.
export default function InlinePersonPicker({
  value,
  display,
  profiles,
  onChange,
  disabled = false,
  placeholder = 'มอบหมาย',
}: {
  value: string
  display: string
  profiles: ProfileOption[]
  onChange: (id: string, name: string) => void
  disabled?: boolean
  placeholder?: string
}) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    function handle(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handle)
    return () => document.removeEventListener('mousedown', handle)
  }, [open])

  const initial = display ? display[0].toUpperCase() : null

  // ── Read-only (viewer) ──────────────────────────────────────
  if (disabled) {
    return (
      <div className="inline-flex items-center gap-1.5">
        <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold shrink-0
          ${display ? 'bg-indigo-100 text-indigo-600' : 'bg-slate-100 text-slate-300'}`}>
          {initial ?? '—'}
        </span>
        <span className="text-sm text-slate-500 truncate max-w-[100px]">{display || '—'}</span>
      </div>
    )
  }

  // ── Interactive chip ────────────────────────────────────────
  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        className="inline-flex items-center gap-1.5 rounded-lg px-1.5 py-1 -mx-1.5 -my-1
          hover:bg-slate-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400
          transition-colors group"
      >
        {/* Avatar */}
        <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold shrink-0 transition-colors
          ${display ? 'bg-indigo-100 text-indigo-600 group-hover:bg-indigo-200' : 'bg-slate-100 text-slate-400 group-hover:bg-slate-200'}`}>
          {initial ?? (
            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
              <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/>
            </svg>
          )}
        </span>
        {/* Name */}
        <span className={`text-sm truncate max-w-[100px] transition-colors
          ${display ? 'text-slate-700 group-hover:text-slate-900' : 'text-slate-400 group-hover:text-slate-500'}`}>
          {display || placeholder}
        </span>
        {/* Chevron — only on hover */}
        <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"
          className={`shrink-0 text-slate-400 opacity-0 group-hover:opacity-100 transition-all ${open ? 'rotate-180' : ''}`}>
          <polyline points="6 9 12 15 18 9" />
        </svg>
      </button>

      {/* Dropdown */}
      {open && (
        <div className="absolute z-50 top-full mt-1 left-0 w-48 bg-white border border-slate-200 rounded-xl shadow-lg py-1 overflow-hidden">
          {/* Unassign */}
          <button
            type="button"
            onClick={() => { onChange('', ''); setOpen(false) }}
            className="w-full flex items-center gap-2 px-3 py-2 text-sm text-slate-400 hover:bg-slate-50 transition-colors"
          >
            <span className="w-6 h-6 rounded-full bg-slate-100 flex items-center justify-center shrink-0 text-slate-400">
              <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round">
                <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
              </svg>
            </span>
            ไม่มอบหมาย
          </button>
          <div className="h-px bg-slate-100 mx-2 my-1" />
          {profiles.map(p => (
            <button
              key={p.id}
              type="button"
              onClick={() => { onChange(p.id, p.name); setOpen(false) }}
              className={`w-full flex items-center gap-2 px-3 py-2 text-sm transition-colors
                ${p.id === value ? 'bg-indigo-50 text-indigo-700' : 'text-slate-700 hover:bg-slate-50'}`}
            >
              <span className="w-6 h-6 rounded-full bg-indigo-100 text-indigo-600 flex items-center justify-center text-xs font-bold shrink-0">
                {p.name[0].toUpperCase()}
              </span>
              <span className="flex-1 text-left truncate">{p.name}</span>
              {p.id === value && (
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" className="text-indigo-500 shrink-0">
                  <polyline points="20 6 9 17 4 12"/>
                </svg>
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
