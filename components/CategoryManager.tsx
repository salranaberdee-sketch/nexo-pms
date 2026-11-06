'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase'
import { useCan, useIsAdmin } from '@/lib/profile-context'
import { showToast } from './Toast'

export type Category = { id: number; name: string; sort_order: number }

// ─────────────────────────────────────────────────────────────
// Standalone hook — fetch + CRUD for categories table
// ─────────────────────────────────────────────────────────────
export function useCategories() {
  const [categories, setCategories] = useState<Category[]>([])
  const [loading, setLoading] = useState(true)
  const supabase = createClient()

  async function load() {
    const { data } = await supabase
      .from('categories')
      .select('id, name, sort_order')
      .order('sort_order')
      .order('name')
    setCategories(data || [])
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  return { categories, setCategories, loading, reload: load }
}

// ─────────────────────────────────────────────────────────────
// CategoryManager — full CRUD UI embedded as a panel
// ─────────────────────────────────────────────────────────────
export default function CategoryManager({ onClose }: { onClose?: () => void }) {
  const { categories, setCategories, loading, reload } = useCategories()
  const [newName, setNewName] = useState('')
  const [saving, setSaving] = useState(false)
  const [editingId, setEditingId] = useState<number | null>(null)
  const [editName, setEditName] = useState('')
  const [draggingId, setDraggingId] = useState<number | null>(null)
  const [dragOverId, setDragOverId] = useState<number | null>(null)

  const canManage  = useCan('insert', 'products') // admin/manager
  const isAdmin    = useIsAdmin()
  const supabase   = createClient()

  // ── Add ──────────────────────────────────────────────────────
  async function addCategory() {
    const name = newName.trim()
    if (!name) return
    setSaving(true)
    const maxOrder = categories.length ? Math.max(...categories.map(c => c.sort_order)) + 1 : 0
    const { data, error } = await supabase
      .from('categories')
      .insert([{ name, sort_order: maxOrder }])
      .select('id, name, sort_order')
      .single()
    setSaving(false)
    if (error) { showToast(error.message, 'error'); return }
    setCategories(prev => [...prev, data])
    setNewName('')
    showToast(`เพิ่มหมวดหมู่ "${name}" แล้ว`)
  }

  // ── Rename ────────────────────────────────────────────────────
  async function saveRename(id: number) {
    const name = editName.trim()
    if (!name) return
    const { error } = await supabase.from('categories').update({ name }).eq('id', id)
    if (error) { showToast(error.message, 'error'); return }
    setCategories(prev => prev.map(c => c.id === id ? { ...c, name } : c))
    setEditingId(null)
    showToast('แก้ไขชื่อแล้ว')
  }

  // ── Delete ────────────────────────────────────────────────────
  async function deleteCategory(id: number, name: string) {
    const { error } = await supabase.from('categories').delete().eq('id', id)
    if (error) { showToast(error.message, 'error'); return }
    setCategories(prev => prev.filter(c => c.id !== id))
    showToast(`ลบ "${name}" แล้ว`)
  }

  // ── Drag-to-reorder ──────────────────────────────────────────
  function onDragStart(id: number) { setDraggingId(id) }
  function onDragOver(e: React.DragEvent, id: number) { e.preventDefault(); setDragOverId(id) }

  async function onDrop(targetId: number) {
    if (draggingId === null || draggingId === targetId) { setDraggingId(null); setDragOverId(null); return }

    const from = categories.findIndex(c => c.id === draggingId)
    const to   = categories.findIndex(c => c.id === targetId)
    const reordered = [...categories]
    const [moved] = reordered.splice(from, 1)
    reordered.splice(to, 0, moved)

    // Assign new sort_order values
    const updated = reordered.map((c, i) => ({ ...c, sort_order: i }))
    setCategories(updated)
    setDraggingId(null)
    setDragOverId(null)

    // Persist to DB
    await Promise.all(
      updated.map(c => supabase.from('categories').update({ sort_order: c.sort_order }).eq('id', c.id)),
    )
    showToast('บันทึกลำดับแล้ว')
  }

  function onDragEnd() { setDraggingId(null); setDragOverId(null) }

  return (
    <div className="w-full">
      {/* Add new */}
      {canManage && (
        <div className="flex gap-2 mb-4">
          <input
            value={newName}
            onChange={e => setNewName(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && addCategory()}
            placeholder="ชื่อหมวดหมู่ใหม่..."
            className="flex-1 border border-slate-200 rounded-xl px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 placeholder:text-slate-400 bg-white"
          />
          <button
            onClick={addCategory}
            disabled={saving || !newName.trim()}
            className="bg-indigo-600 text-white px-4 py-2.5 rounded-xl text-sm font-semibold hover:bg-indigo-500 transition-colors disabled:opacity-40"
          >
            เพิ่ม
          </button>
        </div>
      )}

      {/* List */}
      {loading ? (
        <div className="space-y-2">
          {[...Array(3)].map((_, i) => <div key={i} className="h-12 bg-slate-100 rounded-xl animate-pulse" />)}
        </div>
      ) : categories.length === 0 ? (
        <p className="text-sm text-slate-400 text-center py-6">ยังไม่มีหมวดหมู่</p>
      ) : (
        <div className="space-y-2">
          {categories.map((cat, idx) => {
            const isDragging  = draggingId === cat.id
            const isDragOver  = dragOverId === cat.id && draggingId !== cat.id
            const isEditing   = editingId === cat.id

            return (
              <div
                key={cat.id}
                draggable={canManage}
                onDragStart={() => onDragStart(cat.id)}
                onDragOver={e => onDragOver(e, cat.id)}
                onDrop={() => onDrop(cat.id)}
                onDragEnd={onDragEnd}
                className={`flex items-center gap-3 px-3.5 py-3 rounded-xl border transition-all
                  ${isDragging  ? 'opacity-40 scale-95' : ''}
                  ${isDragOver  ? 'border-indigo-400 bg-indigo-50 shadow-md' : 'bg-white border-slate-200'}
                  ${canManage ? 'cursor-grab active:cursor-grabbing' : ''}`}
              >
                {/* Drag handle */}
                {canManage && (
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"
                    className="text-slate-300 shrink-0">
                    <line x1="8" y1="6" x2="16" y2="6"/><line x1="8" y1="12" x2="16" y2="12"/><line x1="8" y1="18" x2="16" y2="18"/>
                  </svg>
                )}

                {/* Sort index */}
                <span className="text-xs text-slate-300 tabular-nums w-5 shrink-0">{idx + 1}</span>

                {/* Name / Edit input */}
                {isEditing ? (
                  <input
                    value={editName}
                    onChange={e => setEditName(e.target.value)}
                    onKeyDown={e => { if (e.key === 'Enter') saveRename(cat.id); if (e.key === 'Escape') setEditingId(null) }}
                    autoFocus
                    className="flex-1 border border-indigo-300 rounded-lg px-2.5 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                ) : (
                  <span className="flex-1 text-sm font-medium text-slate-800">{cat.name}</span>
                )}

                {/* Actions */}
                <div className="flex items-center gap-1 shrink-0">
                  {canManage && (
                    isEditing ? (
                      <>
                        <button onClick={() => saveRename(cat.id)}
                          className="text-xs bg-indigo-600 text-white px-2.5 py-1 rounded-lg hover:bg-indigo-500 transition-colors font-medium">
                          บันทึก
                        </button>
                        <button onClick={() => setEditingId(null)}
                          className="text-xs text-slate-400 px-2 py-1 rounded-lg hover:bg-slate-100 transition-colors">
                          ยกเลิก
                        </button>
                      </>
                    ) : (
                      <button
                        onClick={() => { setEditingId(cat.id); setEditName(cat.name) }}
                        className="text-slate-300 hover:text-indigo-500 p-1.5 rounded-lg hover:bg-indigo-50 transition-colors"
                        title="แก้ไขชื่อ"
                      >
                        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
                          <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
                        </svg>
                      </button>
                    )
                  )}
                  {isAdmin && !isEditing && (
                    <button
                      onClick={() => deleteCategory(cat.id, cat.name)}
                      className="text-slate-200 hover:text-red-500 p-1.5 rounded-lg hover:bg-red-50 transition-colors"
                      title="ลบ"
                    >
                      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                        <polyline points="3 6 5 6 21 6"/>
                        <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/>
                        <path d="M10 11v6"/><path d="M14 11v6"/>
                        <path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/>
                      </svg>
                    </button>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}

      <p className="text-xs text-slate-400 mt-3 text-center">
        {canManage ? 'ลากเพื่อเรียงลำดับ • ดับเบิลคลิกเพื่อแก้ไขชื่อ' : 'admin/manager สามารถจัดการหมวดหมู่ได้'}
      </p>
    </div>
  )
}
