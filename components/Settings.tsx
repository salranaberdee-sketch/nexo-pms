'use client'

import { useEffect, useState, useCallback } from 'react'
import { createClient } from '@/lib/supabase'
import { useIsAdmin, useProfile } from '@/lib/profile-context'
import { showToast } from './Toast'
import { inputCls, btnPrimary, btnSecondary, tableWrapCls } from '@/lib/cx'
import ContentTypeManager from './ContentTypeManager'
import { usePwa } from '@/lib/use-pwa'

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
function IconCalendar() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="4" width="18" height="18" rx="2" /><line x1="16" y1="2" x2="16" y2="6" /><line x1="8" y1="2" x2="8" y2="6" /><line x1="3" y1="10" x2="21" y2="10" />
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

// ─── Section wrapper ──────────────────────────────────────────────────────────

function Section({ icon, title, description, children }: {
  icon: React.ReactNode; title: string; description?: string; children: React.ReactNode
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

function FieldRow({ label, description, children }: {
  label: string; description?: string | React.ReactNode; children: React.ReactNode
}) {
  return (
    <div className="flex flex-col md:flex-row md:gap-6 py-4 border-b border-slate-100 last:border-0 items-start gap-2">
      <div className="md:w-48 md:shrink-0 w-full">
        <p className="text-sm font-medium text-slate-700">{label}</p>
        {description && <p className="text-xs text-slate-400 mt-0.5 leading-relaxed">{description}</p>}
      </div>
      <div className="flex-1 w-full">{children}</div>
    </div>
  )
}

// ─── PWA Install Section ──────────────────────────────────────────────────────

function IconSmartphone() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="5" y="2" width="14" height="20" rx="2" ry="2"/>
      <line x1="12" y1="18" x2="12.01" y2="18"/>
    </svg>
  )
}

function InstallSection() {
  const {
    isInstalled,
    platform,
    canInstall,
    updateReady,
    promptInstall,
    applyUpdate,
    dismissUpdate,
    openInExternalBrowser,
  } = usePwa()

  const [installing, setInstalling] = useState(false)

  const PLATFORM_LABEL: Record<string, string> = {
    ios: 'iOS (Safari)',
    android: 'Android (Chrome)',
    desktop: 'Desktop (Chrome / Edge)',
    line: 'LINE Browser',
    unknown: 'Browser ทั่วไป',
  }

  async function handleInstall() {
    setInstalling(true)
    const result = await promptInstall()
    setInstalling(false)
    if (result === 'accepted') showToast('ติดตั้งแอปสำเร็จ 🎉')
    else if (result === 'dismissed') showToast('ยกเลิกการติดตั้ง', 'error')
  }

  return (
    <Section
      icon={<IconSmartphone />}
      title="ติดตั้งแอป (PWA)"
      description="เข้าใช้งาน Nexo PMS เหมือน native app — ไม่ต้องผ่าน browser"
    >
      {/* Status row */}
      <FieldRow
        label="สถานะการติดตั้ง"
        description={`กำลังใช้งานบน: ${PLATFORM_LABEL[platform] ?? platform}`}
      >
        <div className="flex items-center gap-2">
          {isInstalled ? (
            <span className="inline-flex items-center gap-1.5 text-sm text-emerald-700 bg-emerald-50 border border-emerald-200 px-3 py-1.5 rounded-full font-medium">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="20 6 9 17 4 12"/>
              </svg>
              ติดตั้งแล้ว
            </span>
          ) : (
            <span className="inline-flex items-center gap-1.5 text-sm text-amber-700 bg-amber-50 border border-amber-200 px-3 py-1.5 rounded-full font-medium">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
              </svg>
              ยังไม่ได้ติดตั้ง
            </span>
          )}
        </div>
      </FieldRow>

      {/* Install action — only when NOT installed */}
      {!isInstalled && (
        <FieldRow
          label="วิธีติดตั้ง"
          description="เลือกวิธีที่เหมาะกับ device ของคุณ"
        >
          <div className="space-y-3">

            {/* LINE IAB */}
            {platform === 'line' && (
              <div className="rounded-xl border border-[#06C755]/30 bg-[#06C755]/5 p-4 space-y-2">
                <p className="text-sm font-medium text-slate-800">🟢 เปิดใน Browser ก่อน</p>
                <p className="text-xs text-slate-500 leading-relaxed">
                  LINE browser ไม่รองรับการติดตั้ง PWA — กดปุ่มด้านล่างเพื่อเปิดหน้านี้ใน Safari หรือ Chrome แล้วติดตั้งจากที่นั่น
                </p>
                <button
                  onClick={openInExternalBrowser}
                  className="flex items-center gap-1.5 text-xs font-semibold bg-[#06C755] hover:bg-[#05b34b] text-white px-3 py-2 rounded-lg transition-colors"
                >
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/>
                    <polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/>
                  </svg>
                  เปิดใน Browser
                </button>
              </div>
            )}

            {/* iOS */}
            {platform === 'ios' && (
              <div className="rounded-xl border border-blue-200 bg-blue-50 p-4 space-y-2">
                <p className="text-sm font-medium text-slate-800">📱 วิธีติดตั้งบน iPhone / iPad</p>
                <ol className="text-xs text-slate-600 space-y-1.5 pl-4 list-decimal leading-relaxed">
                  <li>กดปุ่ม <strong>แชร์</strong> (□↑) ที่ toolbar ด้านล่างของ Safari</li>
                  <li>เลื่อนหาแล้วกด <strong>"เพิ่มบนหน้าจอโฮม"</strong></li>
                  <li>กด <strong>เพิ่ม</strong> มุมขวาบน</li>
                </ol>
                <p className="text-xs text-slate-400">แอปจะปรากฏบน Home Screen เหมือน app ปกติ</p>
              </div>
            )}

            {/* Android / Desktop — native prompt */}
            {(platform === 'android' || platform === 'desktop') && canInstall && (
              <div className="rounded-xl border border-indigo-200 bg-indigo-50 p-4 space-y-2">
                <p className="text-sm font-medium text-slate-800">
                  {platform === 'desktop' ? '💻 ติดตั้งบน Desktop' : '📱 ติดตั้งบน Android'}
                </p>
                <p className="text-xs text-slate-500 leading-relaxed">
                  {platform === 'desktop'
                    ? 'ติดตั้งเป็น Desktop App — เปิดได้จาก Start Menu / Dock โดยไม่ต้องเปิด browser'
                    : 'ติดตั้งบน Home Screen เหมือน app ปกติ ใช้งานได้ offline บางส่วน'}
                </p>
                <button
                  onClick={handleInstall}
                  disabled={installing}
                  className={`flex items-center gap-1.5 text-xs font-semibold bg-indigo-600 hover:bg-indigo-500 text-white px-3 py-2 rounded-lg transition-colors ${installing ? 'opacity-60 cursor-not-allowed' : ''}`}
                >
                  {installing ? (
                    <>
                      <svg className="animate-spin w-3.5 h-3.5" viewBox="0 0 24 24" fill="none">
                        <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" opacity=".3"/>
                        <path d="M12 2a10 10 0 0 1 10 10" stroke="currentColor" strokeWidth="4" strokeLinecap="round"/>
                      </svg>
                      กำลังติดตั้ง…
                    </>
                  ) : (
                    <>
                      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                        <polyline points="7 10 12 15 17 10"/>
                        <line x1="12" y1="15" x2="12" y2="3"/>
                      </svg>
                      ติดตั้งเลย
                    </>
                  )}
                </button>
              </div>
            )}

            {/* Fallback: browser doesn't support install prompt yet */}
            {(platform === 'android' || platform === 'desktop') && !canInstall && (
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                <p className="text-xs text-slate-500 leading-relaxed">
                  Browser ยังไม่แสดง prompt ติดตั้ง — ลองกดเมนู <strong>⋮</strong> ใน Chrome แล้วเลือก <strong>"Add to Home screen"</strong> หรือ <strong>"Install app"</strong>
                </p>
              </div>
            )}

          </div>
        </FieldRow>
      )}

      {/* Already installed — show update status */}
      {isInstalled && (
        <FieldRow label="เวอร์ชัน" description="ตรวจสอบ / อัปเดตแอป">
          {updateReady ? (
            <div className="flex items-center gap-3 bg-indigo-50 border border-indigo-200 rounded-xl px-4 py-3">
              <span className="text-sm text-indigo-800 font-medium flex-1">
                🔄 มีเวอร์ชันใหม่พร้อมติดตั้ง
              </span>
              <button
                onClick={applyUpdate}
                className="text-xs font-semibold bg-indigo-600 hover:bg-indigo-500 text-white px-3 py-1.5 rounded-lg transition-colors"
              >
                อัปเดตเลย
              </button>
              <button
                onClick={dismissUpdate}
                className="text-xs text-slate-400 hover:text-slate-700 transition-colors"
              >
                ทีหลัง
              </button>
            </div>
          ) : (
            <span className="text-sm text-slate-500">ใช้เวอร์ชันล่าสุดแล้ว ✓</span>
          )}
        </FieldRow>
      )}
    </Section>
  )
}



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

  const load = useCallback(async () => {
    setLoadError('')
    const { data, error } = await supabase.from('app_settings').select('key, value, description, updated_at')
    if (error) { setLoadError(error.message); setLoading(false); return }
    const map: SettingsMap = {}
    for (const row of (data as Setting[])) map[row.key] = row.value ?? ''
    setSettings(map)
    setDraft(map)
    setDirtyKeys(new Set())
    setLoading(false)
  }, [supabase])

  useEffect(() => { load() }, [load])

  function set(key: string, value: string) {
    setDraft(prev => ({ ...prev, [key]: value }))
    setDirtyKeys(prev => new Set(prev).add(key))
  }

  async function saveAll() {
    if (dirtyKeys.size === 0) return
    setSaving(true)
    const results = await Promise.all(
      Array.from(dirtyKeys).map(key =>
        supabase.from('app_settings').upsert({ key, value: draft[key] ?? '', updated_by: me.id }, { onConflict: 'key' }),
      ),
    )
    const errors = results.map(r => r.error).filter(Boolean)
    setSaving(false)
    if (errors.length > 0) { showToast(errors[0]!.message, 'error'); return }
    setSettings({ ...draft })
    setDirtyKeys(new Set())
    showToast('บันทึกการตั้งค่าแล้ว')
  }

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
    <div className="p-4 md:p-6 space-y-4 md:space-y-5 max-w-3xl">

      {/* Header */}
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div>
          <h1 className="text-lg md:text-xl font-semibold text-slate-900">ตั้งค่าระบบ</h1>
          <p className="text-sm text-slate-400 mt-0.5">กำหนดข้อมูลบริษัทและค่าเริ่มต้นทั่วระบบ</p>
        </div>
        {isDirty && (
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2 bg-amber-50 border border-amber-200 rounded-2xl px-4 py-2.5 shadow-sm">
            <span className="text-xs text-amber-700 font-medium">มีการเปลี่ยนแปลงที่ยังไม่บันทึก</span>
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
        <div className="space-y-5">

          {/* ── ข้อมูลบริษัท ─────────────────────────────────────── */}
          <Section icon={<IconBuilding />} title="ข้อมูลบริษัท / ทีม" description="ชื่อที่แสดงใน Sidebar">
            <FieldRow label="ชื่อบริษัท / ทีม" description="แสดงใน Sidebar แทน 'Nexo PMS'">
              <input value={val('company_name')} onChange={e => set('company_name', e.target.value)}
                placeholder="เช่น Nexo Team" className={inputCls} />
            </FieldRow>
            <FieldRow label="คำอธิบายสั้น" description="tagline ใต้ชื่อบริษัทใน Sidebar">
              <input value={val('company_tagline')} onChange={e => set('company_tagline', e.target.value)}
                placeholder="เช่น Marketing & Product Team" className={inputCls} />
            </FieldRow>
          </Section>

          {/* ── ปีงบ / รอบขาย ────────────────────────────────────── */}
          <Section icon={<IconCalendar />} title="ปีงบประมาณ / รอบขาย" description="ใช้กำหนดรอบ KPI และการคำนวณ">
            <FieldRow label="เดือนเริ่มต้นปีงบ" description="เดือนแรกของปีงบประมาณ">
              <select value={val('fiscal_year_start')} onChange={e => set('fiscal_year_start', e.target.value)}
                className="border border-slate-200 rounded-xl px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white">
                {MONTHS.map(m => <option key={m.v} value={m.v}>{m.label}</option>)}
              </select>
            </FieldRow>
            <FieldRow label="จำนวนวันต่อรอบขาย" description="ค่า default ตอนสร้าง sales period">
              <div className="flex items-center gap-2">
                <input type="number" min="1" max="365" value={val('sales_period_days')}
                  onChange={e => set('sales_period_days', e.target.value)}
                  className="w-28 border border-slate-200 rounded-xl px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white" />
                <span className="text-sm text-slate-500">วัน</span>
              </div>
            </FieldRow>
            <FieldRow label="Timezone" description="สำหรับแสดงเวลา (display only)">
              <select value={val('timezone')} onChange={e => set('timezone', e.target.value)}
                className="border border-slate-200 rounded-xl px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white">
                <option value="Asia/Bangkok">Asia/Bangkok (UTC+7)</option>
                <option value="Asia/Singapore">Asia/Singapore (UTC+8)</option>
                <option value="UTC">UTC</option>
              </select>
            </FieldRow>
          </Section>

          {/* ── ประเภท Content ───────────────────────────────────── */}
          <Section
            icon={
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z"/>
                <line x1="7" y1="7" x2="7.01" y2="7"/>
              </svg>
            }
            title="ประเภท Content"
            description="เพิ่ม / แก้ไข / ลบ ประเภทที่ใช้จัดหมวด content (admin/manager)"
          >
            <ContentTypeManager />
          </Section>

          {/* ── ติดตั้งแอป ───────────────────────────────────── */}
          <InstallSection />

        </div>
      )}

      {/* Sticky save bar */}
      {isDirty && !loading && (
        <div className="sticky bottom-6 flex justify-end">
          <div className="flex items-center gap-2 bg-white border border-slate-200 rounded-2xl px-4 py-2.5 shadow-lg">
            <button onClick={discard} className={btnSecondary}>ยกเลิก</button>
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
