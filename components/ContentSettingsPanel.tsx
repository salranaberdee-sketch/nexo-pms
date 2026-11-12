'use client'

/**
 * ContentSettingsPanel — settings tab inside /contents?tab=types
 * Sections:
 *   1. ประเภท Content  (content_types table — admin/manager)
 *   2. ช่องทาง         (app_settings.content_channels — admin only per RLS)
 *   3. วัตถุประสงค์    (app_settings.content_objectives — admin only per RLS)
 *   4. สถานะ           (read-only workflow reference)
 *
 * SectionCard / CsvListManager / StatusReference now live in ./PageSettings
 * so every page's "ตั้งค่า" tab can reuse them.
 */

import { useCan, useIsAdmin } from '@/lib/profile-context'
import ContentTypeManager from './ContentTypeManager'
import { contentStatusStyle } from '@/lib/status-styles'
import { SectionCard, CsvListManager, StatusReference } from './PageSettings'

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
        <StatusReference statuses={CONTENT_STATUSES} statusStyle={contentStatusStyle} />
      </SectionCard>

    </div>
  )
}
