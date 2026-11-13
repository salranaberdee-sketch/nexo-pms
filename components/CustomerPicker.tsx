'use client'

/**
 * CustomerPicker — search-as-you-type dropdown for selecting a customer.
 * Searches by HN, name, or phone. Shows HN + full name + phone in results.
 * Returns customer id + display label to parent.
 */

import { useState, useRef, useEffect } from 'react'
import { createClient } from '@/lib/supabase'

export type CustomerOption = {
  id: number
  hn: string | null
  first_name: string
  last_name: string
  phone: string | null
  dob: string | null
  gender: string | null
  allergies: string | null
  chronic_diseases: string | null
}

function displayName(c: CustomerOption) {
  return `${c.first_name} ${c.last_name}`
}

function ageStr(dob: string | null): string {
  if (!dob) return ''
  const y = new Date().getFullYear() - new Date(dob).getFullYear()
  return `${y} ปี`
}

export default function CustomerPicker({
  value,
  onChange,
  placeholder = 'ค้นหาด้วยชื่อ, HN, หรือเบอร์โทร',
  className = '',
}: {
  value: CustomerOption | null
  onChange: (c: CustomerOption | null) => void
  placeholder?: string
  className?: string
}) {
  const [query, setQuery]       = useState('')
  const [results, setResults]   = useState<CustomerOption[]>([])
  const [open, setOpen]         = useState(false)
  const [searching, setSearching] = useState(false)
  const inputRef                = useRef<HTMLInputElement>(null)
  const wrapRef                 = useRef<HTMLDivElement>(null)
  const supabase                = createClient()
  const debounceRef             = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Close dropdown when clicking outside
  useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', onClickOutside)
    return () => document.removeEventListener('mousedown', onClickOutside)
  }, [])

  async function search(q: string) {
    if (!q.trim()) { setResults([]); return }
    setSearching(true)
    // Search by HN exact, or name/phone contains
    const { data } = await supabase
      .from('customers')
      .select('id, hn, first_name, last_name, phone, dob, gender, allergies, chronic_diseases')
      .or(`hn.eq.${q},first_name.ilike.%${q}%,last_name.ilike.%${q}%,phone.ilike.%${q}%`)
      .order('first_name')
      .limit(10)
    setResults(data || [])
    setSearching(false)
    setOpen(true)
  }

  function onInput(e: React.ChangeEvent<HTMLInputElement>) {
    const q = e.target.value
    setQuery(q)
    if (value) onChange(null) // clear selection when typing
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => search(q), 220)
  }

  function select(c: CustomerOption) {
    onChange(c)
    setQuery('')
    setOpen(false)
    setResults([])
  }

  function clear() {
    onChange(null)
    setQuery('')
    setResults([])
    setTimeout(() => inputRef.current?.focus(), 50)
  }

  // Show selected customer as a chip
  if (value) {
    return (
      <div className={`flex items-center gap-2 border border-slate-200 rounded-xl px-3 py-2 bg-white ${className}`}>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            {value.hn && (
              <span className="text-[10px] font-mono font-semibold bg-indigo-100 text-indigo-700 px-1.5 py-0.5 rounded">
                HN {value.hn}
              </span>
            )}
            <span className="text-sm font-semibold text-slate-900">{displayName(value)}</span>
            {value.dob && <span className="text-xs text-slate-400">{ageStr(value.dob)}</span>}
          </div>
          <div className="flex items-center gap-3 mt-0.5 flex-wrap">
            {value.phone && <span className="text-xs text-slate-500">{value.phone}</span>}
            {value.allergies && (
              <span className="text-[11px] text-red-600 font-medium flex items-center gap-0.5">
                ⚠ แพ้: {value.allergies}
              </span>
            )}
            {value.chronic_diseases && (
              <span className="text-[11px] text-amber-600">{value.chronic_diseases}</span>
            )}
          </div>
        </div>
        <button
          onClick={clear}
          type="button"
          className="shrink-0 w-6 h-6 flex items-center justify-center rounded-lg text-slate-300 hover:text-red-500 hover:bg-red-50 transition-colors"
          title="เปลี่ยนลูกค้า"
        >
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round">
            <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
          </svg>
        </button>
      </div>
    )
  }

  return (
    <div ref={wrapRef} className={`relative ${className}`}>
      <div className="relative">
        <svg
          className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-300 pointer-events-none"
          width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"
        >
          <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
        </svg>
        <input
          ref={inputRef}
          value={query}
          onChange={onInput}
          onFocus={() => query && setOpen(true)}
          placeholder={placeholder}
          className="w-full border border-slate-200 rounded-xl pl-9 pr-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white placeholder:text-slate-300"
          autoComplete="off"
        />
        {searching && (
          <div className="absolute right-3 top-1/2 -translate-y-1/2">
            <div className="w-3.5 h-3.5 border-2 border-slate-200 border-t-indigo-500 rounded-full animate-spin" />
          </div>
        )}
      </div>

      {/* Dropdown results */}
      {open && (
        <div className="absolute z-50 top-full left-0 right-0 mt-1 bg-white border border-slate-200 rounded-2xl shadow-xl overflow-hidden">
          {results.length === 0 ? (
            <div className="px-4 py-3 text-sm text-slate-400 text-center">
              {query.length < 2 ? 'พิมพ์อย่างน้อย 2 ตัวอักษร' : `ไม่พบ "${query}"`}
            </div>
          ) : (
            <div className="max-h-64 overflow-y-auto divide-y divide-slate-50">
              {results.map(c => (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => select(c)}
                  className="w-full text-left px-4 py-3 hover:bg-indigo-50 transition-colors"
                >
                  <div className="flex items-center gap-2 flex-wrap">
                    {c.hn && (
                      <span className="text-[10px] font-mono font-semibold bg-indigo-100 text-indigo-700 px-1.5 py-0.5 rounded shrink-0">
                        HN {c.hn}
                      </span>
                    )}
                    <span className="text-sm font-semibold text-slate-900">
                      {c.first_name} {c.last_name}
                    </span>
                    {c.dob && <span className="text-xs text-slate-400">{ageStr(c.dob)}</span>}
                  </div>
                  <div className="flex items-center gap-3 mt-0.5 flex-wrap">
                    {c.phone && <span className="text-xs text-slate-500">{c.phone}</span>}
                    {c.allergies && (
                      <span className="text-[11px] text-red-600 font-medium">⚠ แพ้ {c.allergies}</span>
                    )}
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
