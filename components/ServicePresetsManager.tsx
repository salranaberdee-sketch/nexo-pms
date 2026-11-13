'use client'

/**
 * ServicePresetsManager — CRUD for service_presets in app_settings
 * Format stored: "name|price,name|price,..."
 * UI shows: name (฿price) with editable price field
 */

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase'
import { showToast } from './Toast'
import { inputCls, btnPrimary, btnSecondary, btnDanger } from '@/lib/cx'
import { IconPlus, IconTrash, IconPencil } from '@/lib/icons'

type ServicePreset = { name: string; price: number }

function parsePresets(raw: string): ServicePreset[] {
  if (!raw) return []
  return raw.split(',').map(s => {
    const [name, price] = s.trim().split('|')
    return { name: (name || '').trim(), price: parseFloat(price ?? '0') || 0 }
  }).filter(p => p.name)
}

function serializePresets(presets: ServicePreset[]): string {
  return presets.map(p => `${p.name}|${p.price}`).join(',')
}

export default function ServicePresetsManager({ canManage }: { canManage: boolean }) {
  const [presets, setPresets]   = useState<ServicePreset[]>([])
  const [loading, setLoading]   = useState(true)
  const [saving, setSaving]     = useState(false)
  const [newName, setNewName]   = useState('')
  const [newPrice, setNewPrice] = useState('')
  const [editIdx, setEditIdx]   = useState<number | null>(null)
  const [editName, setEditName] = useState('')
  const [editPrice, setEditPrice] = useState('')
  const supabase = createClient()

  async function load() {
    const { data } = await supabase
      .from('app_settings')
      .select('value')
      .eq('key', 'service_presets')
      .single()
    setPresets(parsePresets(data?.value || ''))
    setLoading(false)
  }

  useEffect(() => { load() }, []) // eslint-disable-line react-hooks/exhaustive-deps

  async function persist(next: ServicePreset[]) {
    setSaving(true)
    const { error } = await supabase
      .from('app_settings')
      .update({ value: serializePresets(next) })
      .eq('key', 'service_presets')
    setSaving(false)
    if (error) { showToast(error.message, 'error'); return false }
    setPresets(next)
    return true
  }

  async function add() {
    if (!newName.trim()) return
    const next = [...presets, { name: newName.trim(), price: parseFloat(newPrice) || 0 }]
    if (await persist(next)) {
      setNewName('')
      setNewPrice('')
      showToast('เพิ่มบริการแล้ว')
    }
  }

  async function remove(idx: number) {
    const next = presets.filter((_, i) => i !== idx)
    if (await persist(next)) showToast('ลบบริการแล้ว')
  }

  function startEdit(idx: number) {
    setEditIdx(idx)
    setEditName(presets[idx].name)
    setEditPrice(String(presets[idx].price))
  }

  async function saveEdit() {
    if (editIdx === null || !editName.trim()) return
    const next = presets.map((p, i) =>
      i === editIdx ? { name: editName.trim(), price: parseFloat(editPrice) || 0 } : p,
    )
    if (await persist(next)) {
      setEditIdx(null)
      showToast('บันทึกแล้ว')
    }
  }

  if (loading) return <p className="text-sm text-slate-400 py-4 text-center">กำลังโหลด...</p>

  return (
    <div className="space-y-3">
      {/* List */}
      <div className="space-y-1">
        {presets.length === 0 && (
          <p className="text-sm text-slate-400 py-3 text-center">ยังไม่มีรายการ — เพิ่มด้านล่าง</p>
        )}
        {presets.map((p, i) => (
          <div key={i} className="flex items-center gap-2 py-2 px-3 rounded-xl border border-slate-100 bg-white hover:border-slate-200 transition-colors">
            {editIdx === i ? (
              <>
                <input
                  value={editName}
                  onChange={e => setEditName(e.target.value)}
                  className={inputCls + ' flex-1 py-1.5 text-sm'}
                  placeholder="ชื่อบริการ"
                  onKeyDown={e => e.key === 'Enter' && saveEdit()}
                />
                <input
                  type="number" min="0"
                  value={editPrice}
                  onChange={e => setEditPrice(e.target.value)}
                  className={inputCls + ' w-28 py-1.5 text-sm'}
                  placeholder="ราคา"
                  onKeyDown={e => e.key === 'Enter' && saveEdit()}
                />
                <button onClick={saveEdit} disabled={saving} className={btnPrimary + ' py-1.5 text-xs'}>
                  บันทึก
                </button>
                <button onClick={() => setEditIdx(null)} className="text-xs text-slate-400 hover:text-slate-600 px-2 py-1.5">
                  ยกเลิก
                </button>
              </>
            ) : (
              <>
                <span className="flex-1 text-sm text-slate-800 font-medium">{p.name}</span>
                <span className="text-sm font-semibold text-slate-600 tabular-nums">
                  {p.price > 0 ? `฿${p.price.toLocaleString()}` : <span className="text-slate-300 font-normal">ยังไม่กำหนดราคา</span>}
                </span>
                {canManage && (
                  <div className="flex items-center gap-1 ml-1">
                    <button onClick={() => startEdit(i)} className={btnSecondary + ' py-1'}>
                      <IconPencil size={11} />
                    </button>
                    <button onClick={() => remove(i)} className={btnDanger + ' py-1'}>
                      <IconTrash size={11} />
                    </button>
                  </div>
                )}
              </>
            )}
          </div>
        ))}
      </div>

      {/* Add row */}
      {canManage && (
        <div className="flex gap-2 items-center pt-1">
          <input
            value={newName}
            onChange={e => setNewName(e.target.value)}
            placeholder="ชื่อบริการใหม่"
            className={inputCls + ' flex-1'}
            onKeyDown={e => e.key === 'Enter' && add()}
          />
          <input
            type="number" min="0"
            value={newPrice}
            onChange={e => setNewPrice(e.target.value)}
            placeholder="ราคา (฿)"
            className={inputCls + ' w-32'}
            onKeyDown={e => e.key === 'Enter' && add()}
          />
          <button onClick={add} disabled={!newName.trim() || saving} className={btnPrimary}>
            <IconPlus />เพิ่ม
          </button>
        </div>
      )}
      <p className="text-[11px] text-slate-400">
        format เก็บ: ชื่อ|ราคา · ราคา 0 = ยังไม่กำหนด · แก้ราคาได้ตลอดเวลา
      </p>
    </div>
  )
}
