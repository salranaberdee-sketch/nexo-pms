'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase'
import { useCan } from '@/lib/profile-context'
import { showToast } from './Toast'
import { inputCls, btnPrimary, btnDanger } from '@/lib/cx'

export type ContentType = {
  id: number
  name: string
  color: string
  sort_order: number
}

// Preset color options for the picker
const COLOR_PRESETS = [
  { label: 'น้ำเงิน',   value: 'bg-blue-50 text-blue-600' },
  { label: 'ม่วง',      value: 'bg-purple-50 text-purple-600' },
  { label: 'ส้ม',       value: 'bg-orange-50 text-orange-600' },
  { label: 'เขียว',     value: 'bg-green-50 text-green-600' },
  { label: 'แดง',       value: 'bg-red-50 text-red-600' },
  { label: 'ชมพู',      value: 'bg-pink-50 text-pink-600' },
  { label: 'เหลือง',    value: 'bg-yellow-50 text-yellow-700' },
  { label: 'ฟ้า',       value: 'bg-cyan-50 text-cyan-600' },
  { label: 'เทา',       value: 'bg-slate-100 text-slate-600' },
  { label: 'ม่วงเข้ม',  value: 'bg-indigo-50 text-indigo-600' },
]

// ─── Standalone hook ──────────────────────────────────────────────────────────

export function useContentTypes() {
  const [contentTypes, setContentTypes] = useState<ContentType[]>([])
  const [loading, setLoading] = useState(true)
  const supabase = createClient()

  async function load() {
    const { data } = await supabase
      .from('content_types')
      .select('id, name, color, sort_order')
      .order('sort_order')
      .order('name')
    setContentTypes(data || [])
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  return { contentTypes, setContentTypes, loading, reload: load }
}

// ─── ContentTypeManager UI ────────────────────────────────────────────────────

export default function ContentTypeManager() {
  const { contentTypes, setContentTypes, loading } = useContentTypes()
  const [newName, setNewName]     = useState('')
  const [newColor, setNewColor]   = useState(COLOR_PRESETS[0].value)
  const [saving, setSaving]       = useState(false)
  const [editingId, setEditingId] = useState<number | null>(null)
  const [editName, setEditName]   = useState('')
  const [editColor, setEditColor] = useState('')
  const [draggingId, setDraggingId] = useState<number | null>(null)
  const [dragOverId, setDragOverId] = useState<number | null>(null)

  const canManage = useCan('insert', 'content_types')
  const supabase  = createClient()

  // ── Add ───────────────────────────────────────────────────────────────────
  async function addType() {
    const name = newName.trim().toUpperCase()
    if (!name) return
    if (contentTypes.some(t => t.name === name)) {
      showToast(`ประเภท "${name}" มีอยู่แล้ว`, 'error')
      return
    }
    setSaving(true)
    const maxOrder = contentTypes.length
      ? Math.max(...contentTypes.map(t => t.sort_order)) + 1
      : 0
    const { data, error } = await supabase
      .from('content_types')
      .insert([{ name, color: newColor, sort_order: maxOrder }])
      .select('id, name, color, sort_order')
      .single()
    setSaving(false)
    if (error) { showToast(error.message, 'error'); return }
    setContentTypes(prev => [...prev, data])
    setNewName('')
    setNewColor(COLOR_PRESETS[0].value)
    showToast(`เพิ่มประเภท "${name}" แล้ว`)
  }

  // ── Rename / recolor ───────────────────────────────────────────────────────
  async function saveEdit(id: number) {
    const name = editName.trim().toUpperCase()
    if (!name) return
    const { error } = await supabase
      .from('content_types')
      .update({ name, color: editColor })
      .eq('id', id)
    if (error) { showToast(error.message, 'error'); return }
    setContentTypes(prev => prev.map(t => t.id === id ? { ...t, name, color: editColor } : t))
    setEditingId(null)
    showToast('แก้ไขประเภทแล้ว')
  }

  // ── Delete ─────────────────────────────────────────────────────────────────
  async function deleteType(id: number, name: string) {
    // Check if any content uses this type
    const { count } = await supabase
      .from('contents')
      .select('id', { count: 'exact', head: true })
      .eq('type', name)
    if ((count ?? 0) > 0) {
      showToast(`ไม่สามารถลบ "${name}" ได้ — มี content ${count} ชิ้นที่ใช้ประเภทนี้`, 'error')
      return
    }
    const { error } = await supabase.from('content_types').delete().eq('id', id)
    if (error) { showToast(error.message, 'error'); return }
    setContentTypes(prev => prev.filter(t => t.id !== id))
    showToast(`ลบ "${name}" แล้ว`)
  }

  // ── Drag-to-reorder ────────────────────────────────────────────────────────
  async function handleDrop(targetId: number) {
    if (draggingId === null || draggingId === targetId) {
      setDraggingId(null); setDragOverId(null); return
    }
    const reordered = [...contentTypes]
    const fromIdx = reordered.findIndex(t => t.id === draggingId)
    const toIdx   = reordered.findIndex(t => t.id === targetId)
    const [item]  = reordered.splice(fromIdx, 1)
    reordered.splice(toIdx, 0, item)
    const updated = reordered.map((t, i) => ({ ...t, sort_order: i }))
    setContentTypes(updated)
    setDraggingId(null)
    setDragOverId(null)
    // Persist new sort_order for each item
    await Promise.all(
      updated.map(t =>
        supabase.from('content_types').update({ sort_order: t.sort_order }).eq('id', t.id),
      ),
    )
  }

  if (loading) return <p className="text-sm text-slate-400">กำลังโหลด...</p>

  return (
    <div className="space-y-4">
      {/* List */}
      <div className="space-y-1.5">
        {contentTypes.length === 0 && (
          <p className="text-sm text-slate-400 py-4 text-center">ยังไม่มีประเภท</p>
        )}
        {contentTypes.map(t => (
          <div
            key={t.id}
            draggable={canManage}
            onDragStart={() => setDraggingId(t.id)}
            onDragOver={e => { e.preventDefault(); setDragOverId(t.id) }}
            onDrop={() => handleDrop(t.id)}
            onDragEnd={() => { setDraggingId(null); setDragOverId(null) }}
            className={`flex items-center gap-3 p-2.5 rounded-xl border transition-all ${
              dragOverId === t.id ? 'border-indigo-300 bg-indigo-50' : 'border-slate-100 bg-white hover:border-slate-200'
            } ${canManage ? 'cursor-grab active:cursor-grabbing' : ''}`}
          >
            {/* Drag handle */}
            {canManage && (
              <svg className="text-slate-300 shrink-0" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <line x1="4" y1="8" x2="20" y2="8"/><line x1="4" y1="16" x2="20" y2="16"/>
              </svg>
            )}

            {editingId === t.id ? (
              /* Edit mode */
              <div className="flex items-center gap-2 flex-1 flex-wrap">
                <input
                  value={editName}
                  onChange={e => setEditName(e.target.value.toUpperCase())}
                  onKeyDown={e => { if (e.key === 'Enter') saveEdit(t.id); if (e.key === 'Escape') setEditingId(null) }}
                  className={`${inputCls} w-32 py-1 text-sm font-mono uppercase`}
                  autoFocus
                />
                <select
                  value={editColor}
                  onChange={e => setEditColor(e.target.value)}
                  className="text-xs border border-slate-200 rounded-lg px-2 py-1 bg-white text-slate-700"
                >
                  {COLOR_PRESETS.map(c => (
                    <option key={c.value} value={c.value}>{c.label}</option>
                  ))}
                </select>
                <span className={`text-xs font-semibold px-2 py-0.5 rounded-md ${editColor}`}>{editName || 'ตัวอย่าง'}</span>
                <button onClick={() => saveEdit(t.id)} className="text-xs text-white bg-indigo-600 hover:bg-indigo-700 px-3 py-1 rounded-lg font-medium">บันทึก</button>
                <button onClick={() => setEditingId(null)} className="text-xs text-slate-500 hover:text-slate-700 px-2 py-1 rounded-lg">ยกเลิก</button>
              </div>
            ) : (
              /* View mode */
              <>
                <span className={`text-xs font-semibold px-2.5 py-1 rounded-md min-w-[72px] text-center ${t.color}`}>
                  {t.name}
                </span>
                <span className="text-xs text-slate-400 flex-1">
                  {COLOR_PRESETS.find(c => c.value === t.color)?.label ?? 'กำหนดเอง'}
                </span>
                {canManage && (
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => { setEditingId(t.id); setEditName(t.name); setEditColor(t.color) }}
                      className="p-1.5 rounded-lg text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 transition-colors"
                      title="แก้ไข"
                    >
                      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
                        <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
                      </svg>
                    </button>
                    <button
                      onClick={() => deleteType(t.id, t.name)}
                      className="p-1.5 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 transition-colors"
                      title="ลบ"
                    >
                      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                        <polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/>
                        <path d="M10 11v6"/><path d="M14 11v6"/><path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/>
                      </svg>
                    </button>
                  </div>
                )}
              </>
            )}
          </div>
        ))}
      </div>

      {/* Add form — admin/manager only */}
      {canManage && (
        <div className="flex items-center gap-2 flex-wrap pt-2 border-t border-slate-100">
          <input
            value={newName}
            onChange={e => setNewName(e.target.value.toUpperCase())}
            onKeyDown={e => { if (e.key === 'Enter') addType() }}
            placeholder="ชื่อประเภทใหม่ เช่น REEL"
            className={`${inputCls} flex-1 min-w-[150px] py-1.5 text-sm font-mono uppercase`}
          />
          <select
            value={newColor}
            onChange={e => setNewColor(e.target.value)}
            className="text-xs border border-slate-200 rounded-xl px-2.5 py-1.5 bg-white text-slate-700"
          >
            {COLOR_PRESETS.map(c => (
              <option key={c.value} value={c.value}>{c.label}</option>
            ))}
          </select>
          {newName && (
            <span className={`text-xs font-semibold px-2 py-0.5 rounded-md ${newColor}`}>{newName}</span>
          )}
          <button
            onClick={addType}
            disabled={saving || !newName.trim()}
            className={`${btnPrimary} py-1.5 text-sm`}
          >
            {saving ? 'กำลังเพิ่ม...' : '+ เพิ่ม'}
          </button>
        </div>
      )}
    </div>
  )
}
