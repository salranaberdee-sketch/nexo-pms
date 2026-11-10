'use client'

import { useEffect, useState, useCallback } from 'react'
import { createClient } from '@/lib/supabase'
import { useIsAdmin, useProfile } from '@/lib/profile-context'
import CategoryManager from './CategoryManager'
import { showToast } from './Toast'
import { inputCls, btnPrimary, btnSecondary, sectionLabelCls, tableWrapCls } from '@/lib/cx'

// ─── Types ────────────────────────────────────────────────────────────────────

type Setting = { key: string; value: string; description: string; updated_at: string }

type SettingsMap = Record<string, string>

// ─── Icons ────────────────────────────────────────────────────────────────────

function IconBuilding() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="2" y="7" width="20" height="14" rx="2" /><path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16" />
    </svg>
  )
}
function IconTag() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z" />
      <line x1="7" y1="7" x2="7.01" y2="7" />
    </svg>
  )
}
function IconShare() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="18" cy="5" r="3" /><circle cx="6" cy="12" r="3" /><circle cx="18" cy="19" r="3" />
      <line x1="8.59" y1="13.51" x2="15.42" y2="17.49" /><line x1="15.41" y1="6.51" x2="8.59" y2="10.49" />
    </svg>
  )
}
function IconCalendar() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="4" width="18" height="18" rx="2" /><line x1="16" y1="2" x2="16" y2="6" /><line x1="8" y1="2" x2="8" y2="6" /><line x1="3" y1="10" x2="21" y2="10" />
    </svg>
  )
}
function IconGrid() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="3" width="7" height="7" rx="1" /><rect x="14" y="3" width="7" height="7" rx="1" />
      <rect x="14" y="14" width="7" height="7" rx="1" /><rect x="3" y="14" width="7" height="7" rx="1" />
    </svg>
  )
}
function IconSave() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z" />
      <polyline points="17 21 17 13 7 13 7 21" /><polyline points="7 3 7 8 15 8" />
    </svg>
  )
}

// ─── Tag list editor ──────────────────────────────────────────────────────────
// Used for comma-separated values like channels, product_types, brands

function TagListEditor({
  value,
  onChange,
  placeholder,
  disabled,
}: {
  value: string
  onChange: (v: string) => void
  placeholder?: string
  disabled?: boolean
}) {
  const tags = value ? value.split(',').map(t => t.trim()).filter(Boolean) : []
  const [inputVal, setInputVal] = useState('')

  function addTag() {
    const t = inputVal.trim()
    if (!t || tags.includes(t)) { setInputVal(''); return }
    onChange([...tags, t].join(','))
    setInputVal('')
  }

  function removeTag(tag: string) {
    onChange(tags.filter(t => t !== tag).join(','))
  }

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap gap-1.5 min-h-[2rem]">
        {tags.map(tag => (
          <span key={tag} className="inline-flex items-center gap-1 bg-indigo-50 text-indigo-700 text-xs font-medium px-2.5 py-1 rounded-lg">
            {tag}
            {!disabled && (
              <button type="button" onClick={() => removeTag(tag)}
                className="text-indigo-400 hover:text-indigo-700 transition-colors ml-0.5 leading-none">
                ×
              </button>
            )}
          </span>
        ))}
        {tags.length === 0 && <span className="text-xs text-slate-400 py-1">{placeholder || 'ยังไม่มีรายการ'}</span>}
      </div>
      {!disabled && (
        <div className="flex gap-2">
          <input
            value={inputVal}
            onChange={e => setInputVal(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addTag() } }}
            placeholder="พิมพ์แล้ว Enter เพื่อเพิ่ม..."
            className="flex-1 border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 placeholder:text-slate-400 bg-white"
          />
          <button type="button" onClick={addTag} disabled={!inputVal.trim()}
            className="px-3 py-2 bg-indigo-50 text-indigo-600 rounded-xl text-sm font-medium hover:bg-indigo-100 transition-colors disabled:opacity-40">
            เพิ่ม
          </button>
        </div>
      )}
    </div>
  )
}

// ─── Section wrapper ──────────────────────────────────────────────────────────

function Section({
  icon, title, description, children,
}: {
  icon: React.ReactNode
  title: string
  description?: string
  children: React.ReactNode
}) {
  return (
    <div className={tableWrapCls}>
      <div className="px-5 py-4 border-b border-slate-100 flex items-center gap-3">
        <div className="w-8 h-8 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0">
          {icon}
        </div>
        <div>
          <h2 className="text-sm font-semibold text-slate-900">{title}</h2>
          {description && <p className="text-xs text-slate-400 mt-0.5">{description}</p>}
        </div>
      </div>
      <div className="p-5">{children}</div>
    </div>
  )
}

// ─── Field row ────────────────────────────────────────────────────────────────

function FieldRow({ label, description, children }: { label: string; description?: string; children: React.ReactNode }) {
  return (
    <div className="flex gap-6 py-4 border-b border-slate-100 last:border-0 items-start">
      <div className="w-48 shrink-0">
        <p className="text-sm font-medium text-slate-700">{label}</p>
        {description && <p className="text-xs text-slate-400 mt-0.5 leading-relaxed">{description}</p>}
      </div>
      <div className="flex-1">{children}</div>
    </div>
  )
}

// ─── Main component ───────────────────────────────────────────────────────────

export default function Settings() {
  const isAdmin = useIsAdmin()
  const me = useProfile()
  const supabase = createClient()

  const [settings, setSettings]   = useState<SettingsMap>({})
  const [draft, setDraft]         = useState<SettingsMap>({})
  const [loading, setLoading]     = useState(true)
  const [saving, setSaving]       = useState(false)
  const [loadError, setLoadError] = useState('')
  const [dirtyKeys, setDirtyKeys] = useState<Set<string>>(new Set())

  // Active tab
  const [activeTab, setActiveTab] = useState<'general' | 'content' | 'products' | 'categories'>('general')

  // ── Load ────────────────────────────────────────────────────
  const load = useCallback(async () => {
    setLoadError('')
    const { data, error } = await supabase.from('app_settings').select('key, value, description, updated_at')
    if (error) { setLoadError(error.message); setLoading(false); return }
    const map: SettingsMap = {}
    for (const row of (data as Setting[])) {
      map[row.key] = row.value ?? ''
    }
    setSettings(map)
    setDraft(map)
    setDirtyKeys(new Set())
    setLoading(false)
  }, [supabase])

  useEffect(() => { load() }, [load])

  // ── Draft update ─────────────────────────────────────────────
  function set(key: string, value: string) {
    setDraft(prev => ({ ...prev, [key]: value }))
    setDirtyKeys(prev => new Set(prev).add(key))
  }

  // ── Save all dirty keys ──────────────────────────────────────
  async function saveAll() {
    if (dirtyKeys.size === 0) return
    setSaving(true)
    const updates = Array.from(dirtyKeys).map(key =>
      supabase.from('app_settings').upsert({
        key,
        value: draft[key] ?? '',
        updated_by: me.id,
      }, { onConflict: 'key' }),
    )
    const results = await Promise.all(updates)
    const errors = results.map(r => r.error).filter(Boolean)
    setSaving(false)
    if (errors.length > 0) {
      showToast(errors[0]!.message, 'error')
      return
    }
    setSettings({ ...draft })
    setDirtyKeys(new Set())
    showToast('บันทึกการตั้งค่าแล้ว')
  }

  // ── Discard ──────────────────────────────────────────────────
  function discard() {
    setDraft({ ...settings })
    setDirtyKeys(new Set())
  }

  const isDirty = dirtyKeys.size > 0
  const val = (k: string) => draft[k] ?? ''

  const MONTHS = [
    { v: '01', label: 'มกราคม' }, { v: '02', label: 'กุมภาพันธ์' },
    { v: '03', label: 'มีนาคม' },  { v: '04', label: 'เมษายน' },
    { v: '05', label: 'พฤษภาคม' }, { v: '06', label: 'มิถุนายน' },
    { v: '07', label: 'กรกฎาคม' }, { v: '08', label: 'สิงหาคม' },
    { v: '09', label: 'กันยายน' }, { v: '10', label: 'ตุลาคม' },
    { v: '11', label: 'พฤศจิกายน' }, { v: '12', label: 'ธันวาคม' },
  ]

  const TABS = [
    { id: 'general',    label: 'ทั่วไป',      icon: <IconBuilding /> },
    { id: 'content',    label: 'Content',    icon: <IconShare /> },
    { id: 'products',   label: 'สินค้า',     icon: <IconTag /> },
    { id: 'categories', label: 'หมวดหมู่',   icon: <IconGrid /> },
  ] as const

  if (!isAdmin) {
    return (
      <div className="p-6 flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <div className="text-4xl mb-3">🔒</div>
          <p className="text-sm text-slate-500">เฉพาะ admin เท่านั้นที่เข้าถึงหน้านี้ได้</p>
        </div>
      </div>
    )
  }

  return (
    <div className="p-6 space-y-5 max-w-4xl">

      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold text-slate-900">ตั้งค่าระบบ</h1>
          <p className="text-sm text-slate-400 mt-0.5">กำหนดค่าเริ่มต้นและตัวเลือกทั้งระบบ</p>
        </div>

        {/* Save / discard bar */}
        {isDirty && (
          <div className="flex items-center gap-2 bg-amber-50 border border-amber-200 rounded-2xl px-4 py-2.5 shadow-sm shrink-0">
            <span className="text-xs text-amber-700 font-medium mr-1">มีการเปลี่ยนแปลงที่ยังไม่บันทึก</span>
            <button onClick={discard}
              className="text-xs text-slate-500 hover:text-slate-700 px-2.5 py-1.5 rounded-lg hover:bg-slate-100 transition-colors">
              ยกเลิก
            </button>
            <button onClick={saveAll} disabled={saving} className={btnPrimary + ' py-1.5'}>
              <IconSave />
              {saving ? 'กำลังบันทึก...' : 'บันทึก'}
            </button>
          </div>
        )}
      </div>

      {loadError && (
        <div className="bg-red-50 border border-red-100 rounded-2xl px-4 py-3 text-sm text-red-600 flex items-center gap-3">
          <span className="flex-1">โหลดการตั้งค่าไม่สำเร็จ: {loadError}</span>
          <button onClick={load} className="text-red-600 underline underline-offset-2 hover:no-underline shrink-0">ลองใหม่</button>
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-1 bg-slate-100 p-1 rounded-2xl w-fit">
        {TABS.map(tab => (
          <button key={tab.id} onClick={() => setActiveTab(tab.id)}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all
              ${activeTab === tab.id
                ? 'bg-white text-slate-900 shadow-sm'
                : 'text-slate-500 hover:text-slate-700 hover:bg-slate-50'}`}>
            <span className={activeTab === tab.id ? 'text-indigo-600' : 'text-slate-400'}>{tab.icon}</span>
            {tab.label}
          </button>
        ))}
      </div>

      {/* Loading skeleton */}
      {loading && (
        <div className="space-y-4">
          {[...Array(2)].map((_, i) => (
            <div key={i} className={tableWrapCls}>
              <div className="h-14 bg-slate-50 border-b border-slate-100 animate-pulse" />
              <div className="p-5 space-y-4">
                {[...Array(3)].map((_, j) => <div key={j} className="h-10 bg-slate-100 rounded-xl animate-pulse" />)}
              </div>
            </div>
          ))}
        </div>
      )}

      {!loading && (

        <>
          {/* ── Tab: ทั่วไป ─────────────────────────────────────── */}
          {activeTab === 'general' && (
            <div className="space-y-5">
              <Section icon={<IconBuilding />} title="ข้อมูลบริษัท / ทีม" description="ชื่อที่แสดงใน header และ export">
                <FieldRow label="ชื่อบริษัท / ทีม" description="แสดงใน Sidebar และ header">
                  <input value={val('company_name')} onChange={e => set('company_name', e.target.value)}
                    placeholder="เช่น Nexo Team" className={inputCls} />
                </FieldRow>
                <FieldRow label="คำอธิบายสั้น" description="tagline ใต้ชื่อบริษัท">
                  <input value={val('company_tagline')} onChange={e => set('company_tagline', e.target.value)}
                    placeholder="เช่น Marketing & Product Team" className={inputCls} />
                </FieldRow>
              </Section>

              <Section icon={<IconCalendar />} title="ปีงบประมาณ / รอบขาย" description="ใช้กำหนดรอบ KPI และการคำนวณ">
                <FieldRow label="เดือนเริ่มต้นปีงบ" description="เดือนแรกของปีงบประมาณ">
                  <select value={val('fiscal_year_start')} onChange={e => set('fiscal_year_start', e.target.value)}
                    className="border border-slate-200 rounded-xl px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white">
                    {MONTHS.map(m => (
                      <option key={m.v} value={m.v}>{m.label}</option>
                    ))}
                  </select>
                </FieldRow>
                <FieldRow label="จำนวนวันต่อรอบขาย" description="ใช้เป็นค่า default ตอนสร้าง sales period">
                  <div className="flex items-center gap-2">
                    <input type="number" min="1" max="365" value={val('sales_period_days')}
                      onChange={e => set('sales_period_days', e.target.value)}
                      className="w-28 border border-slate-200 rounded-xl px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white" />
                    <span className="text-sm text-slate-500">วัน</span>
                  </div>
                </FieldRow>
                <FieldRow label="Timezone" description="สำหรับแสดงเวลา (ยังใช้งาน display only)">
                  <select value={val('timezone')} onChange={e => set('timezone', e.target.value)}
                    className="border border-slate-200 rounded-xl px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white">
                    <option value="Asia/Bangkok">Asia/Bangkok (UTC+7)</option>
                    <option value="Asia/Singapore">Asia/Singapore (UTC+8)</option>
                    <option value="UTC">UTC</option>
                  </select>
                </FieldRow>
              </Section>
            </div>
          )}

          {/* ── Tab: Content ────────────────────────────────────── */}
          {activeTab === 'content' && (
            <div className="space-y-5">
              <Section icon={<IconShare />} title="ช่องทางเผยแพร่ (Content Channels)" description="รายการช่องทางที่ใช้ใน Content และ Ads">
                <FieldRow label="ช่องทางทั้งหมด" description="เพิ่ม/ลบช่องทาง — ใช้ใน dropdown ทั่วระบบ">
                  <TagListEditor
                    value={val('content_channels')}
                    onChange={v => set('content_channels', v)}
                    placeholder="ยังไม่มีช่องทาง"
                  />
                </FieldRow>
                <FieldRow label="ช่องทาง default" description="ค่าที่กรอกล่วงหน้าตอนสร้าง Content / Ad ใหม่">
                  <select value={val('default_channel')} onChange={e => set('default_channel', e.target.value)}
                    className="border border-slate-200 rounded-xl px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white">
                    {val('content_channels').split(',').map(c => c.trim()).filter(Boolean).map(c => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                </FieldRow>
              </Section>
            </div>
          )}

          {/* ── Tab: สินค้า ──────────────────────────────────────── */}
          {activeTab === 'products' && (
            <div className="space-y-5">
              <Section icon={<IconTag />} title="ประเภทสินค้า (Product Types)" description="ใช้ใน dropdown 'ประเภทสินค้า' ตอนสร้าง/แก้ไข product">
                <FieldRow label="ประเภทสินค้า" description="เพิ่ม/ลบประเภท — ใช้ใน Products form">
                  <TagListEditor
                    value={val('product_types')}
                    onChange={v => set('product_types', v)}
                    placeholder="ยังไม่มีประเภท"
                  />
                </FieldRow>
              </Section>

              <Section icon={<IconTag />} title="Brand" description="รายชื่อ Brand ในองค์กร — ใช้ใน Products form และ editor brand_access">
                <FieldRow label="Brand ทั้งหมด" description="เพิ่ม/ลบ Brand — editor จะได้รับสิทธิ์ตาม brand_access ที่กำหนด">
                  <TagListEditor
                    value={val('brands')}
                    onChange={v => set('brands', v)}
                    placeholder="ยังไม่มี Brand"
                  />
                </FieldRow>
              </Section>
            </div>
          )}

          {/* ── Tab: หมวดหมู่ ────────────────────────────────────── */}
          {activeTab === 'categories' && (
            <Section icon={<IconGrid />} title="หมวดหมู่ธุรกิจ (Business Categories)" description="ใช้จัดกลุ่มสินค้าตาม Business Type — กรอง Sales, Products, Ads">
              <CategoryManager />
            </Section>
          )}
        </>
      )}

      {/* Bottom save bar (always visible when dirty, for long pages) */}
      {isDirty && !loading && activeTab !== 'categories' && (
        <div className="sticky bottom-6 flex justify-end">
          <div className="flex items-center gap-2 bg-white border border-slate-200 rounded-2xl px-4 py-2.5 shadow-lg">
            <button onClick={discard}
              className={btnSecondary}>
              ยกเลิก
            </button>
            <button onClick={saveAll} disabled={saving} className={btnPrimary}>
              <IconSave />
              {saving ? 'กำลังบันทึก...' : 'บันทึกการตั้งค่า'}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
