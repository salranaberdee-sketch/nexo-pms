'use client'

/**
 * SalesSettingsPanel — settings tab inside /sales?tab=settings
 *   1. หมวดหมู่ (Business Type)  — categories table (admin/manager) — shared with Products
 *   2. Sales Target Presets      — app_settings.sales_target_presets (admin only)
 *   3. สถานะยอดขาย (Workflow)    — read-only reference with descriptions
 *   4. ปีงบ / รอบขาย             — shortcut link to /settings
 */

import Link from 'next/link'
import { useCan, useIsAdmin } from '@/lib/profile-context'
import { salesStatusStyle } from '@/lib/status-styles'
import { SectionCard, CsvListManager, StatusReference } from './PageSettings'
import CategoryManager from './CategoryManager'

const SALES_STATUSES = [
  { name: 'ยังไม่เปิดขาย', desc: 'สินค้ายังไม่ถึงวันเปิดขาย' },
  { name: 'ยังไม่เริ่ม',   desc: 'เปิดขายแล้ว แต่ยังไม่เริ่มนับยอดตามเป้า' },
  { name: 'กำลังขาย',      desc: 'กำลังดำเนินการขายตามเป้าหมาย' },
  { name: 'ปิดเป้า',        desc: 'ยอดขายถึงหรือเกินเป้าหมายแล้ว' },
]

export default function SalesSettingsPanel() {
  const isAdmin = useIsAdmin()
  const canManageCategories = useCan('insert', 'categories')

  return (
    <div className="space-y-5 max-w-2xl">

      {/* 1. หมวดหมู่ */}
      <SectionCard
        title="หมวดหมู่ (Business Type)"
        description="จัดกลุ่มยอดขายตามหมวดหมู่สินค้า — ใช้ร่วมกับหน้า Products"
        badge={!canManageCategories ? 'admin/manager เท่านั้น' : undefined}
      >
        <CategoryManager />
      </SectionCard>

      {/* 2. Target Presets */}
      <SectionCard
        title="เป้ายอดขาย Presets (฿)"
        description="ค่าเป้าหมายที่ใช้บ่อย — ลากเรียงลำดับได้"
        badge={!isAdmin ? 'admin เท่านั้น' : undefined}
      >
        <CsvListManager
          settingKey="sales_target_presets"
          canManage={isAdmin}
          inputPlaceholder="เช่น 100000, 500000, 1000000..."
          emptyLabel="ยังไม่มี target preset"
        />
      </SectionCard>

      {/* 3. สถานะ */}
      <SectionCard
        title="สถานะยอดขาย (Workflow)"
        description="ลำดับสถานะของเป้ายอดขาย — แก้ไขผ่าน DB migration เท่านั้น"
      >
        <StatusReference statuses={SALES_STATUSES} statusStyle={salesStatusStyle} />
      </SectionCard>

      {/* 4. ปีงบ / รอบขาย */}
      <SectionCard
        title="ปีงบประมาณ / รอบขาย"
        description="เดือนเริ่มปีงบและจำนวนวันต่อรอบ — ส่งผลต่อ KPI ใน Sales และ Dashboard"
      >
        <div className="flex items-center justify-between gap-3">
          <p className="text-sm text-slate-500 leading-relaxed">
            ตั้งค่าที่ <strong>Settings → ปีงบประมาณ / รอบขาย</strong>
          </p>
          <Link
            href="/settings"
            className="flex items-center gap-1.5 text-xs font-medium text-indigo-600 hover:text-indigo-700 bg-indigo-50 hover:bg-indigo-100 border border-indigo-100 px-3 py-1.5 rounded-lg transition-colors whitespace-nowrap shrink-0"
          >
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="3"/>
              <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/>
            </svg>
            ไปที่ Settings
          </Link>
        </div>
      </SectionCard>

    </div>
  )
}
