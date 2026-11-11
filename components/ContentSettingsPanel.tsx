'use client'

/**
 * ContentSettingsPanel — settings tab inside /contents?tab=types
 * Sections:
 *   1. ประเภท Content  (content_types table — admin/manager)
 *   2. ช่องทาง         (app_settings.content_channels — admin only per RLS)
 *   3. วัตถุประสงค์    (app_settings.content_objectives — admin only per RLS)
 *   4. สถานะ           (read-only workflow reference)
 */

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase'
import { useCan, useIsAdmin } from '@/lib/profile-context'
import { showToast } from './Toast'
import ContentTypeManager from './ContentTypeManager'
import { inputCls, btnPrimary } from '@/lib/cx'
import { contentStatusStyle } from '@/lib/status-styles'

// ─── SectionCard ──────────────────────────────────────────────────────────────

function SectionCard({ title, description, badge, children }: {
  title: string
  description?: string
  badge?: string
  children: React.ReactNode
}) {
  return (
    <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden">
      <div className="px-5 py-4 border-b border-slate-100 bg-slate-50/50 flex items-start justify-between gap-3">
        <div>
          <p className="text-sm font-semibold text-slate-800">{title}</p>
          {description && <p className="text-xs text-slate-400 mt-0.5">{description}</p>}
        </div>
        {badge && (
          <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-amber-50 text-amber-600 border border-amber-100 shrink-0 mt-0.5">
            {badge}
          </span>
        )}
      </div>
      <div className="p-5">{children}</div>
    </div>
  )
}

// ─── CsvListManager ───────────────────────────────────────────────────────────
// Manages a comma-separated list stored in app_settings.
// Does NOT call reload() after save — updates local state directly to avoid loops.

function CsvListManager({
  settingKey,
  canManage,
  inputPlaceholder = 'เพิ่มรายการ...',
  emptyLabel = 'ยังไม่มีรายการ',
}: {
  settingKey: string
  canManage: boolean
  inputPlaceholder?: string
  emptyLabel?: string
}) {
  const supabase = createClient()
  const [items, setItems]       = useState<string[]>([])
  const [loaded, setLoaded]     = useState(false)
  const [newVal, setNewVal]     = useState('')
  const [saving, setSaving]     = useState(false)
  const [editIdx, setEditIdx]   = useState<number | null>(null)
  const [editVal, setEditVal]   = useState('')
  const [dragging, setDragging] = useState<number | null>(null)
  const [dragOver, setDragOver] = useState<number | null>(null)

  // Load once on mount — direct from DB, independent of AppSettingsContext
  useEffect(() => {
    supabase
      .from('app_settings')
      .select('value')
      .eq('key', settingKey)
      .single()
      .then(({ data }: { data: { value: string } | null }) => {
        const raw = data?.value ?? ''
        setItems(raw ? raw.split(',').map((s: string) => s.trim()).filter(Boolean) : [])
        setLoaded(true)
      })
  }, [settingKey]) // eslint-disable-line react-hooks/exhaustive-deps

  async function persist(next: string[]): Promise<boolean> {
    const { error } = await supabase
      .from('app_settings')
      .upsert({ key: settingKey, value: next.join(',') }, { onConflict: 'key' })
    if (error) {
      showToast(`บันทึกไม่สำเร็จ: ${error.message}`, 'error')
      return false
    }
    setItems(next) // update local state directly — no reload()
    return true
  }

  async function add() {
    const v = newVal.trim()
    if (!v) return
    if (items.includes(v)) { showToast(`"${v}" มีอยู่แล้ว`, 'error'); return }
    setSaving(true)
    const ok = await persist([...items, v])
    setSaving(false)
    if (ok) { setNewVal(''); showToast(`เพิ่ม "${v}" แล้ว`) }
  }

  async function remove(idx: number) {
    const removed = items[idx]
    const ok = await persist(items.filter((_, i) => i !== idx))
    if (ok) showToast(`ลบ "${removed}" แล้ว`)
  }

  async function saveEdit(idx: number) {
    const v = editVal.trim()
    if (!v) return
    if (items.some((item, i) => item === v && i !== idx)) {
      showToast(`"${v}" มีอยู่แล้ว`, 'error'); return
    }
    const ok = await persist(items.map((item, i) => (i === idx ? v : item)))
    if (ok) { setEditIdx(null); showToast('แก้ไขแล้ว') }
  }

  async function handleDrop(toIdx: number) {
    if (dragging === null || dragging === toIdx) {
      setDragging(null); setDragOver(null); return
    }
    const next = [...items]
    const [item] = next.splice(dragging, 1)
    next.splice(toIdx, 0, item)
    setDragging(null); setDragOver(null)
    await persist(next)
  }

  if (!loaded) return <p className="text-sm text-slate-400 py-2">กำลังโหลด...</p>

  return (
    <div className="space-y-1.5">
      {items.length === 0 && (
        <p className="text-sm text-slate-400 py-3 text-center">{emptyLabel}</p>
      )}

      {items.map((item, idx) => (
        <div
          key={`${item}-${idx}`}
          draggable={canManage}
          onDragStart={() => setDragging(idx)}
          onDragOver={e => { e.preventDefault(); setDragOver(idx) }}
          onDrop={() => handleDrop(idx)}
          onDragEnd={() => { setDragging(null); setDragOver(null) }}
          className={`flex items-center gap-2.5 px-3 py-2 rounded-xl border transition-all ${
            dragOver === idx
              ? 'border-indigo-300 bg-indigo-50'
              : 'border-slate-100 bg-white hover:border-slate-200'
          } ${canManage ? 'cursor-grab active:cursor-grabbing' : ''}`}
        >
          {canManage && (
            <svg className="text-slate-300 shrink-0" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <line x1="4" y1="8" x2="20" y2="8"/><line x1="4" y1="16" x2="20" y2="16"/>
            </svg>
          )}

          {editIdx === idx ? (
            <div className="flex items-center gap-2 flex-1 flex-wrap">
              <input
                value={editVal}
                onChange={e => setEditVal(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') saveEdit(idx); if (e.key === 'Escape') setEditIdx(null) }}
                className={`${inputCls} flex-1 py-1 text-sm`}
                autoFocus
              />
              <button onClick={() => saveEdit(idx)}
                className="text-xs text-white bg-indigo-600 hover:bg-indigo-700 px-3 py-1 rounded-lg font-medium">
                บันทึก
              </button>
              <button onClick={() => setEditIdx(null)}
                className="text-xs text-slate-500 hover:text-slate-700 px-2 py-1 rounded-lg">
                ยกเลิก
              </button>
            </div>
          ) : (
            <>
              <span className="flex-1 text-sm text-slate-700">{item}</span>
              {canManage && (
                <div className="flex items-center gap-1 shrink-0">
                  <button
                    onClick={() => { setEditIdx(idx); setEditVal(item) }}
                    className="p-1.5 rounded-lg text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 transition-colors"
                    title="แก้ไข"
                  >
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
                      <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
                    </svg>
                  </button>
                  <button
                    onClick={() => remove(idx)}
                    className="p-1.5 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 transition-colors"
                    title="ลบ"
                  >
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/>
                      <path d="M10 11v6"/><path d="M14 11v6"/>
                      <path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/>
                    </svg>
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      ))}

      {canManage && (
        <div className="flex items-center gap-2 pt-2 border-t border-slate-100">
          <input
            value={newVal}
            onChange={e => setNewVal(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') add() }}
            placeholder={inputPlaceholder}
            className={`${inputCls} flex-1 py-1.5 text-sm`}
          />
          <button
            onClick={add}
            disabled={saving || !newVal.trim()}
            className={`${btnPrimary} py-1.5 text-sm disabled:opacity-40`}
          >
            {saving ? '...' : '+ เพิ่ม'}
          </button>
        </div>
      )}
    </div>
  )
}

// ─── Statuses (read-only) ─────────────────────────────────────────────────────

const CONTENT_STATUSES = [
  { name: 'รอผลิต',      desc: 'ยังไม่เริ่มผลิต' },
  { name: 'ผลิตอยู่',    desc: 'กำลังผลิต' },
  { name: 'รออนุมัติ',   desc: 'ส่งให้ approver ตรวจ' },
  { name: 'อนุมัติแล้ว', desc: 'ผ่านการอนุมัติ' },
  { name: 'กำหนดโพสต์',  desc: 'รอกำหนดวันโพสต์' },
  { name: 'โพสต์แล้ว',  desc: 'โพสต์เสร็จแล้ว' },
]

// ─── Main export ──────────────────────────────────────────────────────────────

export default function ContentSettingsPanel() {
  const canManageTypes = useCan('insert', 'content_types') // admin + manager (content_types RLS)
  const isAdmin        = useIsAdmin()                       // app_settings RLS = admin only

  return (
    <div className="space-y-5 max-w-2xl">

      {/* 1. ประเภท Content — admin/manager */}
      <SectionCard
        title="ประเภท Content"
        description="เพิ่ม/แก้/ลบ ประเภท เช่น GRAPHIC, VIDEO, COPY — ลากเรียงลำดับได้"
      >
        <ContentTypeManager />
      </SectionCard>

      {/* 2. ช่องทางเผยแพร่ — admin only (app_settings RLS) */}
      <SectionCard
        title="ช่องทางเผยแพร่"
        description="รายการช่องทางที่ใช้ใน dropdown ของฟอร์ม content"
        badge={!isAdmin ? 'admin เท่านั้น' : undefined}
      >
        <CsvListManager
          settingKey="content_channels"
          canManage={isAdmin}
          inputPlaceholder="เช่น LINE OA, Podcast..."
          emptyLabel="ยังไม่มีช่องทาง"
        />
      </SectionCard>

      {/* 3. วัตถุประสงค์ — admin only (app_settings RLS) */}
      <SectionCard
        title="วัตถุประสงค์ (Objective)"
        description="รายการ objective ที่แนะนำใน dropdown เช่น Awareness, Conversion"
        badge={!isAdmin ? 'admin เท่านั้น' : undefined}
      >
        <CsvListManager
          settingKey="content_objectives"
          canManage={isAdmin}
          inputPlaceholder="เช่น Consideration, Retention..."
          emptyLabel="ยังไม่มีวัตถุประสงค์"
        />
      </SectionCard>

      {/* 4. สถานะ — read-only */}
      <SectionCard
        title="สถานะ (Workflow)"
        description="ลำดับ pipeline ของ content — fixed, แก้ไขผ่าน migration เท่านั้น"
      >
        <div className="space-y-1.5">
          {CONTENT_STATUSES.map((s, i) => (
            <div key={s.name} className="flex items-center gap-3 px-3 py-2 rounded-xl border border-slate-100 bg-slate-50/40">
              <span className="text-xs text-slate-300 tabular-nums w-4 shrink-0 font-medium">{i + 1}</span>
              <span className={`text-xs font-semibold px-2.5 py-1 rounded-lg min-w-[90px] text-center ${contentStatusStyle[s.name] || 'bg-slate-100 text-slate-600'}`}>
                {s.name}
              </span>
              <span className="text-xs text-slate-400 flex-1">{s.desc}</span>
              {i < CONTENT_STATUSES.length - 1 && (
                <svg className="text-slate-200 shrink-0" width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <polyline points="9 18 15 12 9 6"/>
                </svg>
              )}
            </div>
          ))}
        </div>
      </SectionCard>

    </div>
  )
}
