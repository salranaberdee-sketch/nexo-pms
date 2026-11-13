'use client'

/**
 * ContentSettingsPanel — settings tab inside /contents?tab=types
 *   1. ประเภท Content  — content_types table (admin/manager)
 *   2. ช่องทางเผยแพร่ — app_settings.content_channels (admin only)
 *   3. วัตถุประสงค์    — app_settings.content_objectives (admin only)
 *   4. ขนาด Format     — app_settings.content_format_sizes (admin only)
 *   5. สถานะ           — read-only workflow reference with descriptions
 */

import { useCan, useIsAdmin } from '@/lib/profile-context'
import ContentTypeManager from './ContentTypeManager'
import { contentStatusStyle } from '@/lib/status-styles'
import { SectionCard, CsvListManager, StatusReference } from './PageSettings'

const CONTENT_STATUSES = [
  { name: 'รอผลิต',      desc: 'ได้รับมอบหมายแล้ว ยังไม่เริ่มผลิต' },
  { name: 'ผลิตอยู่',    desc: 'กำลังผลิต — producer กำลังทำงาน' },
  { name: 'รออนุมัติ',   desc: 'ส่งให้ approver ตรวจสอบแล้ว' },
  { name: 'อนุมัติแล้ว', desc: 'approver อนุมัติ รอกำหนดวันโพสต์' },
  { name: 'กำหนดโพสต์',  desc: 'มีวันโพสต์แล้ว รอถึงเวลา' },
  { name: 'โพสต์แล้ว',   desc: 'โพสต์ขึ้น platform เรียบร้อย' },
]

export default function ContentSettingsPanel() {
  const isAdmin = useIsAdmin()

  return (
    <div className="space-y-5 max-w-2xl">

      {/* 1. ประเภท Content */}
      <SectionCard
        title="ประเภท Content"
        description="เพิ่ม/แก้/ลบ ประเภท เช่น GRAPHIC, VIDEO, COPY — ลากเรียงลำดับได้ รองรับสีกำหนดเอง"
      >
        <ContentTypeManager />
      </SectionCard>

      {/* 2. ช่องทางเผยแพร่ */}
      <SectionCard
        title="ช่องทางเผยแพร่"
        description="ช่องทางที่ใช้ใน dropdown ของฟอร์ม content และฟอร์ม ads (ใช้ร่วมกัน)"
        badge={!isAdmin ? 'admin เท่านั้น' : undefined}
      >
        <CsvListManager
          settingKey="content_channels"
          canManage={isAdmin}
          inputPlaceholder="เช่น LINE OA, Podcast, YouTube Shorts..."
          emptyLabel="ยังไม่มีช่องทาง"
        />
      </SectionCard>

      {/* 3. วัตถุประสงค์ */}
      <SectionCard
        title="วัตถุประสงค์ (Objective)"
        description="Objective ที่แนะนำใน dropdown เพื่อบ่งบอกเป้าหมายของแต่ละชิ้นงาน"
        badge={!isAdmin ? 'admin เท่านั้น' : undefined}
      >
        <CsvListManager
          settingKey="content_objectives"
          canManage={isAdmin}
          inputPlaceholder="เช่น Brand Awareness, Consideration, Retention..."
          emptyLabel="ยังไม่มีวัตถุประสงค์"
        />
      </SectionCard>

      {/* 4. ขนาด Format */}
      <SectionCard
        title="ขนาด Format / Size"
        description="Preset ขนาดไฟล์ที่ใช้บ่อย เช่น 1:1 1080×1080, 9:16 1080×1920"
        badge={!isAdmin ? 'admin เท่านั้น' : undefined}
      >
        <CsvListManager
          settingKey="content_format_sizes"
          canManage={isAdmin}
          inputPlaceholder="เช่น 1:1 1080×1080, 16:9 1920×1080..."
          emptyLabel="ยังไม่มี format preset"
        />
      </SectionCard>

      {/* 5. สถานะ */}
      <SectionCard
        title="สถานะ (Workflow Pipeline)"
        description="ลำดับสถานะของ content ตั้งแต่มอบหมายจนโพสต์ — แก้ไขผ่าน DB migration เท่านั้น"
      >
        <StatusReference statuses={CONTENT_STATUSES} statusStyle={contentStatusStyle} />
      </SectionCard>

    </div>
  )
}
