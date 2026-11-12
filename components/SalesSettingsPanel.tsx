'use client'

/**
 * SalesSettingsPanel — settings tab inside /sales?tab=settings
 * Sections:
 *   1. สถานะยอดขาย (Workflow) — read-only reference
 *
 * Sales has no editable lookup today (statuses are a CHECK constraint in the
 * DB). The tab is informational only for now.
 */

import { salesStatusStyle } from '@/lib/status-styles'
import { SectionCard, StatusReference } from './PageSettings'

// sales.status — CHECK constraint in DB, shown read-only here
const SALES_STATUSES = [
  { name: 'ยังไม่เปิดขาย' },
  { name: 'ยังไม่เริ่ม' },
  { name: 'กำลังขาย' },
  { name: 'ปิดเป้า' },
]

export default function SalesSettingsPanel() {
  return (
    <div className="space-y-5 max-w-2xl">

      {/* สถานะ — read-only */}
      <SectionCard
        title="สถานะยอดขาย (Workflow)"
        description="ลำดับสถานะของเป้ายอดขาย — fixed, แก้ไขผ่าน migration เท่านั้น"
      >
        <StatusReference statuses={SALES_STATUSES} statusStyle={salesStatusStyle} />
      </SectionCard>

    </div>
  )
}
