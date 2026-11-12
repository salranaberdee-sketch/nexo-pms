'use client'

/**
 * SalesSettingsPanel — settings tab inside /sales?tab=settings
 * Sections:
 *   1. หมวดหมู่ (Business Type) — categories table (admin/manager) — shared with Products
 *   2. สถานะยอดขาย (Workflow)   — read-only reference
 *   3. ปีงบ / รอบขาย             — shortcut link to /settings
 */

import Link from 'next/link'
import { salesStatusStyle } from '@/lib/status-styles'
import { SectionCard, StatusReference } from './PageSettings'
import CategoryManager from './CategoryManager'
import { useCan } from '@/lib/profile-context'

// sales.status — CHECK constraint in DB, shown read-only here
const SALES_STATUSES = [
  { name: 'ยังไม่เปิดขาย', desc: 'สินค้ายังไม่เปิดขาย' },
  { name: 'ยังไม่เริ่ม',   desc: 'เปิดขายแล้วแต่ยังไม่เริ่มตามเป้า' },
  { name: 'กำลังขาย',      desc: 'กำลังขายตามเป้า' },
  { name: 'ปิดเป้า',        desc: 'ครบ / เกินเป้าหมาย' },
]

export default function SalesSettingsPanel() {
  const canManageCategories = useCan('insert', 'categories') // admin/manager

  return (
    <div className="space-y-5 max-w-2xl">

      {/* 1. หมวดหมู่ — ใช้ร่วมกับ Products page */}
      <SectionCard
        title="หมวดหมู่ (Business Type)"
        description="กำหนดหมวดหมู่สินค้าที่ใช้ filter ยอดขาย — ใช้ร่วมกับหน้า Products"
        badge={!canManageCategories ? 'admin/manager เท่านั้น' : undefined}
      >
        <CategoryManager />
      </SectionCard>

      {/* 2. สถานะ — read-only */}
      <SectionCard
        title="สถานะยอดขาย (Workflow)"
        description="ลำดับสถานะของเป้ายอดขาย — fixed, แก้ไขผ่าน migration เท่านั้น"
      >
        <StatusReference statuses={SALES_STATUSES} statusStyle={salesStatusStyle} />
      </SectionCard>

      {/* 3. ปีงบ / รอบขาย — shortcut */}
      <SectionCard
        title="ปีงบประมาณ / รอบขาย"
        description="ตั้งค่าเดือนเริ่มปีงบและจำนวนวันต่อรอบขาย"
      >
        <div className="flex items-center justify-between">
          <p className="text-sm text-slate-500">
            ตั้งค่าที่นี่จะส่งผลต่อการคำนวณ KPI ใน Sales และ Dashboard
          </p>
          <Link
            href="/settings"
            className="flex items-center gap-1.5 text-xs font-medium text-indigo-600 hover:text-indigo-700 bg-indigo-50 hover:bg-indigo-100 border border-indigo-100 px-3 py-1.5 rounded-lg transition-colors whitespace-nowrap"
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
