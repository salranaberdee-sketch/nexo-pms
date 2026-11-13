'use client'

/**
 * LeadsSettingsPanel — settings tab inside /leads?tab=settings
 *   1. ช่องทางรับ Lead  — app_settings.lead_channels (admin only) ← NOW EDITABLE
 *   2. แหล่งที่มา (UTM) — app_settings.lead_sources (admin only) ← NEW
 *   3. สถานะ Lead       — read-only workflow reference with descriptions
 */

import { useIsAdmin } from '@/lib/profile-context'
import { leadStatusStyle } from '@/lib/status-styles'
import { SectionCard, CsvListManager, StatusReference } from './PageSettings'

const LEAD_STATUSES = [
  { name: 'ใหม่',         desc: 'เพิ่งรับ lead เข้ามา ยังไม่ได้ติดต่อ' },
  { name: 'ติดต่อแล้ว',  desc: 'ติดต่อหาลูกค้าแล้ว กำลัง follow up' },
  { name: 'ผ่านเกณฑ์',   desc: 'ลูกค้าสนใจจริง พร้อมพิจารณาซื้อ' },
  { name: 'ปิดการขาย',   desc: 'ลูกค้าซื้อแล้ว ✓ บันทึก deal_amount' },
  { name: 'ไม่สำเร็จ',   desc: 'ลูกค้าไม่สนใจ หรือเกินเวลา follow up' },
]

export default function LeadsSettingsPanel() {
  const isAdmin = useIsAdmin()

  return (
    <div className="space-y-5 max-w-2xl">

      {/* 1. ช่องทางรับ Lead — now editable */}
      <SectionCard
        title="ช่องทางรับ Lead (channel_in)"
        description="ช่องทางที่ลูกค้าติดต่อเข้ามา — ใช้ใน dropdown ฟอร์มเพิ่ม Lead"
        badge={!isAdmin ? 'admin เท่านั้น' : undefined}
      >
        <CsvListManager
          settingKey="lead_channels"
          canManage={isAdmin}
          inputPlaceholder="เช่น LINE, Form, โทรศัพท์, Walk-in..."
          emptyLabel="ยังไม่มีช่องทาง"
        />
      </SectionCard>

      {/* 2. Lead Sources (UTM) — new */}
      <SectionCard
        title="แหล่งที่มา (utm_source)"
        description="แหล่งที่มาของ traffic ที่ใช้ใน UTM tracking เช่น Facebook, Google"
        badge={!isAdmin ? 'admin เท่านั้น' : undefined}
      >
        <CsvListManager
          settingKey="lead_sources"
          canManage={isAdmin}
          inputPlaceholder="เช่น Facebook, Google, TikTok, referral..."
          emptyLabel="ยังไม่มีแหล่งที่มา"
        />
      </SectionCard>

      {/* 3. สถานะ */}
      <SectionCard
        title="สถานะ Lead (Workflow)"
        description="Pipeline ของ lead ตั้งแต่รับจนปิดการขาย — แก้ไขผ่าน DB migration เท่านั้น"
      >
        <StatusReference statuses={LEAD_STATUSES} statusStyle={leadStatusStyle} />
      </SectionCard>

    </div>
  )
}
