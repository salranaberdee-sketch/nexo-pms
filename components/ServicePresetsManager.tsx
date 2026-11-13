'use client'

/**
 * ServicePresetsManager — full CRUD for service_presets in app_settings
 *
 * UX principles:
 *  - Click price directly to edit it inline (no Edit button needed)
 *  - Drag handle on left to reorder
 *  - Add at bottom with Enter to confirm
 *  - Unsaved price shown in amber until saved
 *  - Group rows by category (optional prefix "หมวด: " in name)
 */

import { useState, useEffect, useRef } from 'react'
import { createClient } from '@/lib/supabase'
import { showToast } from './Toast'
import { inputCls } from '@/lib/cx'
import { IconPlus, IconTrash } from '@/lib/icons'

type ServicePreset = { name: string; price: number }

function parsePresets(raw: string): ServicePreset[] {
  if (!raw) return []
  return raw.split(',').map(s => {
    const parts = s.trim().split('|')
    return {
      name:  (parts[0] || '').trim(),
      price: parseFloat(parts[1] ?? '0') || 0,
    }
  }).filter(p => p.name)
}

function serializePresets(list: ServicePreset[]): string {
  return list.map(p => `${p.name}|${p.price}`).join(',')
}

// ── inline price cell ─────────────────────────────────────────────────────────
function PriceCell({
  price, canEdit, onSave,
}: {
  price: number
  canEdit: boolean
  onSave: (v: number) => void
}) {
  const [editing, setEditing] = useState(false)
  const [val, setVal]         = useState(String(price || ''))
  const inputRef              = useRef<HTMLInputElement>(null)

  useEffect(() => { if (editing) inputRef.current?.select() }, [editing])
  useEffect(() => { setVal(String(price || '')) }, [price])

  function commit() {
    setEditing(false)
    const n = parseFloat(val) || 0
    if (n !== price) onSave(n)
  }

  if (!canEdit) {
    return (
      <span className={`text-sm tabular-nums font-semibold ${price > 0 ? 'text-slate-800' : 'text-slate-300'}`}>
        {price > 0 ? `฿${price.toLocaleString()}` : '—'}
      </span>
    )
  }

  if (editing) {
    return (
      <div className="flex items-center gap-1">
        <span className="text-xs text-slate-400">฿</span>
        <input
          ref={inputRef}
          type="number" min="0"
          value={val}
          onChange={e => setVal(e.target.value)}
          onBlur={commit}
          onKeyDown={e => {
            if (e.key === 'Enter') commit()
            if (e.key === 'Escape') { setEditing(false); setVal(String(price || '')) }
          }}
          className="w-24 border border-indigo-300 rounded-lg px-2 py-1 text-sm text-right focus:outline-none focus:ring-2 focus:ring-indigo-400 bg-white tabular-nums"
        />
      </div>
    )
  }

  return (
    <button
      onClick={() => setEditing(true)}
      title="คลิกเพื่อแก้ราคา"
      className={`text-sm tabular-nums font-semibold rounded-lg px-2.5 py-1 transition-colors group
        ${price > 0
          ? 'text-slate-800 hover:bg-indigo-50 hover:text-indigo-700'
          : 'text-slate-300 hover:bg-amber-50 hover:text-amber-600'
        }`}
    >
      {price > 0 ? `฿${price.toLocaleString()}` : (
        <span className="flex items-center gap-1">
          <span>กำหนดราคา</span>
          <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="opacity-50">
            <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
            <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
          </svg>
        </span>
      )}
    </button>
  )
}

// ── name cell ─────────────────────────────────────────────────────────────────
function NameCell({
  name, canEdit, onSave,
}: {
  name: string
  canEdit: boolean
  onSave: (v: string) => void
}) {
  const [editing, setEditing] = useState(false)
  const [val, setVal]         = useState(name)
  const inputRef              = useRef<HTMLInputElement>(null)

  useEffect(() => { if (editing) { setVal(name); inputRef.current?.select() } }, [editing]) // eslint-disable-line react-hooks/exhaustive-deps

  function commit() {
    setEditing(false)
    if (val.trim() && val.trim() !== name) onSave(val.trim())
    else setVal(name)
  }

  if (!canEdit) return <span className="text-sm font-medium text-slate-800">{name}</span>

  if (editing) {
    return (
      <input
        ref={inputRef}
        value={val}
        onChange={e => setVal(e.target.value)}
        onBlur={commit}
        onKeyDown={e => {
          if (e.key === 'Enter') commit()
          if (e.key === 'Escape') { setEditing(false); setVal(name) }
        }}
        className="flex-1 border border-indigo-300 rounded-lg px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400 bg-white min-w-0"
      />
    )
  }

  return (
    <button
      onClick={() => setEditing(true)}
      title="คลิกเพื่อแก้ชื่อ"
      className="text-sm font-medium text-slate-800 hover:text-indigo-700 text-left transition-colors rounded px-1 -mx-1 hover:bg-indigo-50 py-0.5"
    >
      {name}
    </button>
  )
}

// ── Main ──────────────────────────────────────────────────────────────────────
export default function ServicePresetsManager({ canManage }: { canManage: boolean }) {
  const [presets, setPresets]     = useState<ServicePreset[]>([])
  const [loading, setLoading]     = useState(true)
  const [newName, setNewName]     = useState('')
  const [newPrice, setNewPrice]   = useState('')
  const [adding, setAdding]       = useState(false)
  const [dragging, setDragging]   = useState<number | null>(null)
  const [dragOver, setDragOver]   = useState<number | null>(null)
  const addNameRef                = useRef<HTMLInputElement>(null)
  const supabase = createClient()

  async function load() {
    const { data } = await supabase
      .from('app_settings').select('value').eq('key', 'service_presets').single()
    setPresets(parsePresets(data?.value || ''))
    setLoading(false)
  }
  useEffect(() => { load() }, []) // eslint-disable-line react-hooks/exhaustive-deps

  async function persist(next: ServicePreset[]) {
    const { error } = await supabase
      .from('app_settings')
      .update({ value: serializePresets(next) })
      .eq('key', 'service_presets')
    if (error) { showToast(error.message, 'error'); return false }
    setPresets(next)
    return true
  }

  // Update a single field without full reload
  async function updateField(idx: number, field: 'name' | 'price', value: string | number) {
    const next = presets.map((p, i) =>
      i === idx ? { ...p, [field]: value } : p,
    )
    await persist(next)
  }

  async function remove(idx: number) {
    const name = presets[idx].name
    if (!confirm(`ลบ "${name}" ออกจากรายการ?`)) return
    const next = presets.filter((_, i) => i !== idx)
    if (await persist(next)) showToast(`ลบ "${name}" แล้ว`)
  }

  async function add() {
    if (!newName.trim()) { addNameRef.current?.focus(); return }
    const next = [...presets, { name: newName.trim(), price: parseFloat(newPrice) || 0 }]
    if (await persist(next)) {
      setNewName(''); setNewPrice(''); setAdding(false)
      showToast(`เพิ่ม "${newName.trim()}" แล้ว`)
    }
  }

  // Drag-to-reorder
  function onDragStart(idx: number) { setDragging(idx) }
  function onDragOver(e: React.DragEvent, idx: number) { e.preventDefault(); setDragOver(idx) }
  async function onDrop(toIdx: number) {
    if (dragging === null || dragging === toIdx) { setDragging(null); setDragOver(null); return }
    const next = [...presets]
    const [item] = next.splice(dragging, 1)
    next.splice(toIdx, 0, item)
    setDragging(null); setDragOver(null)
    await persist(next)
  }

  // Stats
  const withPrice    = presets.filter(p => p.price > 0).length
  const withoutPrice = presets.length - withPrice

  if (loading) {
    return (
      <div className="py-8 flex items-center justify-center gap-2 text-slate-400">
        <div className="w-4 h-4 border-2 border-slate-200 border-t-indigo-500 rounded-full animate-spin" />
        <span className="text-sm">กำลังโหลด...</span>
      </div>
    )
  }

  return (
    <div className="space-y-3">

      {/* ── Stats bar ── */}
      {presets.length > 0 && (
        <div className="flex items-center gap-4 px-1 pb-1 border-b border-slate-100">
          <span className="text-xs text-slate-400">{presets.length} รายการ</span>
          {withoutPrice > 0 && (
            <span className="text-xs text-amber-600 flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-amber-400 inline-block" />
              {withoutPrice} ยังไม่กำหนดราคา
            </span>
          )}
          <span className="text-xs text-slate-300 ml-auto">
            {canManage ? 'คลิกชื่อหรือราคาเพื่อแก้ · ลากเพื่อเรียงใหม่' : 'ดูได้อย่างเดียว'}
          </span>
        </div>
      )}

      {/* ── Table header ── */}
      {presets.length > 0 && (
        <div className="grid grid-cols-[24px_1fr_120px_32px] gap-2 px-3 pb-1">
          <span />
          <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wide">ชื่อบริการ</span>
          <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wide text-right">ราคา</span>
          <span />
        </div>
      )}

      {/* ── Rows ── */}
      <div className="space-y-1">
        {presets.length === 0 && !adding && (
          <div className="py-10 text-center space-y-2">
            <p className="text-sm text-slate-400">ยังไม่มีรายการบริการ</p>
            <p className="text-xs text-slate-300">กดปุ่ม "เพิ่มบริการ" ด้านล่างเพื่อเริ่ม</p>
          </div>
        )}
        {presets.map((p, i) => (
          <div
            key={`${p.name}-${i}`}
            draggable={canManage}
            onDragStart={() => onDragStart(i)}
            onDragOver={e => onDragOver(e, i)}
            onDrop={() => onDrop(i)}
            onDragEnd={() => { setDragging(null); setDragOver(null) }}
            className={`grid grid-cols-[24px_1fr_120px_32px] gap-2 items-center px-3 py-2.5 rounded-xl border transition-all
              ${dragging === i ? 'opacity-40' : ''}
              ${dragOver === i ? 'border-indigo-300 bg-indigo-50 shadow-sm' : 'border-slate-100 bg-white hover:border-slate-200 hover:shadow-sm'}
              ${canManage ? 'cursor-default' : ''}`}
          >
            {/* Drag handle */}
            <div className={`flex items-center justify-center ${canManage ? 'cursor-grab active:cursor-grabbing text-slate-300 hover:text-slate-500' : 'text-transparent'}`}>
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <line x1="4" y1="8" x2="20" y2="8"/>
                <line x1="4" y1="16" x2="20" y2="16"/>
              </svg>
            </div>

            {/* Name */}
            <NameCell
              name={p.name}
              canEdit={canManage}
              onSave={v => updateField(i, 'name', v)}
            />

            {/* Price — right aligned */}
            <div className="flex justify-end">
              <PriceCell
                price={p.price}
                canEdit={canManage}
                onSave={v => updateField(i, 'price', v)}
              />
            </div>

            {/* Delete */}
            {canManage ? (
              <button
                onClick={() => remove(i)}
                className="flex items-center justify-center w-7 h-7 rounded-lg text-slate-200 hover:text-red-500 hover:bg-red-50 transition-colors"
                title="ลบ"
              >
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                  <polyline points="3 6 5 6 21 6"/>
                  <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/>
                  <path d="M10 11v6"/><path d="M14 11v6"/>
                  <path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/>
                </svg>
              </button>
            ) : <span />}
          </div>
        ))}

        {/* ── Add row (inline) ── */}
        {adding && (
          <div className="grid grid-cols-[24px_1fr_120px_auto] gap-2 items-center px-3 py-2.5 rounded-xl border-2 border-indigo-300 bg-indigo-50/40">
            <span className="flex items-center justify-center">
              <div className="w-1.5 h-1.5 rounded-full bg-indigo-400" />
            </span>
            <input
              ref={addNameRef}
              value={newName}
              onChange={e => setNewName(e.target.value)}
              onKeyDown={e => {
                if (e.key === 'Enter') add()
                if (e.key === 'Escape') { setAdding(false); setNewName(''); setNewPrice('') }
              }}
              placeholder="ชื่อบริการ"
              autoFocus
              className="border border-indigo-300 rounded-lg px-2.5 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400 bg-white placeholder:text-slate-300"
            />
            <div className="flex items-center gap-1 justify-end">
              <span className="text-xs text-slate-400">฿</span>
              <input
                type="number" min="0"
                value={newPrice}
                onChange={e => setNewPrice(e.target.value)}
                onKeyDown={e => {
                  if (e.key === 'Enter') add()
                  if (e.key === 'Escape') { setAdding(false); setNewName(''); setNewPrice('') }
                }}
                placeholder="0"
                className="w-20 border border-indigo-300 rounded-lg px-2 py-1.5 text-sm text-right focus:outline-none focus:ring-2 focus:ring-indigo-400 bg-white placeholder:text-slate-300 tabular-nums"
              />
            </div>
            <div className="flex items-center gap-1">
              <button
                onClick={add}
                disabled={!newName.trim()}
                className="flex items-center justify-center w-7 h-7 rounded-lg bg-indigo-600 text-white hover:bg-indigo-700 disabled:opacity-30 transition-colors"
                title="เพิ่ม (Enter)"
              >
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round">
                  <polyline points="20 6 9 17 4 12"/>
                </svg>
              </button>
              <button
                onClick={() => { setAdding(false); setNewName(''); setNewPrice('') }}
                className="flex items-center justify-center w-7 h-7 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
                title="ยกเลิก (Esc)"
              >
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round">
                  <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
                </svg>
              </button>
            </div>
          </div>
        )}
      </div>

      {/* ── Footer actions ── */}
      {canManage && !adding && (
        <button
          onClick={() => { setAdding(true); setNewName(''); setNewPrice('') }}
          className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl border border-dashed border-slate-300 text-sm text-slate-400 hover:border-indigo-400 hover:text-indigo-600 hover:bg-indigo-50 transition-all"
        >
          <IconPlus size={13} />
          เพิ่มบริการ
        </button>
      )}

    </div>
  )
}
