'use client'

/**
 * LeadsSettingsPanel — settings tab inside /leads?tab=settings
 * Sections:
 *   1. สถานะ Lead (Workflow)     — read-only reference
 *   2. ช่องทางรับ Lead            — read-only reference
 *
 * Leads has no editable lookup today (statuses + intake channel are hardcoded
 * in the UI). The tab is informational only for now.
 */

import { leadStatusStyle } from '@/lib/status-styles'
import { SectionCard, StatusReference } from './PageSettings'

// leads.status — plain text in DB, shown read-only here
const LEAD_STATUSES = [
  { name: 'ใหม่' },
  { name: 'ติดต่อแล้ว' },
  { name: 'ผ่านเกณฑ์' },
  { name: 'ปิดการขาย' },
  { name: 'ไม่สำเร็จ' },
]

// leads.channel_in — plain text in DB, shown read-only here
const LEAD_CHANNELS = [
  { name: 'form',   label: 'กรอกฟอร์ม' },
  { name: 'LINE',   label: 'LINE' },
  { name: 'inbox',  label: 'Inbox / ข้อความ' },
  { name: 'phone',  label: 'โทรศัพท์' },
  { name: 'other',  label: 'อื่นๆ' },
]

export default function LeadsSettingsPanel() {
  return (
    <div className="space-y-5 max-w-2xl">

      {/* 1. สถานะ — read-only */}
      <SectionCard
        title="สถานะ Lead (Workflow)"
        description="ลำดับสถานะของ Lead ตั้งแต่รับจนปิดการขาย — fixed, แก้ไขผ่าน migration เท่านั้น"
      >
        <StatusReference statuses={LEAD_STATUSES} statusStyle={leadStatusStyle} />
      </SectionCard>

      {/* 2. ช่องทางรับ Lead — read-only */}
      <SectionCard
        title="ช่องทางรับ Lead"
        description="รายการช่องทางที่ลูกค้าติดต่อเข้ามา — fixed, แก้ไขผ่าน migration เท่านั้น"
      >
        <div className="flex flex-wrap gap-2">
          {LEAD_CHANNELS.map(c => (
            <span key={c.name} className="text-xs font-medium px-3 py-1.5 rounded-lg bg-slate-100 text-slate-600">
              {c.label}
            </span>
          ))}
        </div>
      </SectionCard>

    </div>
  )
}
