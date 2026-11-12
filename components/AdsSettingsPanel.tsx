'use client'

/**
 * AdsSettingsPanel — settings tab inside /ads?tab=settings
 * Sections:
 *   1. ช่องทางโฆษณา — app_settings.content_channels (admin only)
 *      Note: this key is shared with the Content page; editing here also
 *      affects the Content form's channel dropdown.
 *
 * Ads has no status workflow, so there is no status reference here.
 */

import { useIsAdmin } from '@/lib/profile-context'
import { SectionCard, CsvListManager } from './PageSettings'

export default function AdsSettingsPanel() {
  const isAdmin = useIsAdmin() // app_settings RLS = admin only

  return (
    <div className="space-y-5 max-w-2xl">

      {/* ช่องทาง — admin only (app_settings RLS) */}
      <SectionCard
        title="ช่องทางโฆษณา"
        description="รายการช่องทางที่ใช้ใน dropdown ของฟอร์มแคมเปญ — ใช้ร่วมกับหน้า Content"
        badge={!isAdmin ? 'admin เท่านั้น' : undefined}
      >
        <CsvListManager
          settingKey="content_channels"
          canManage={isAdmin}
          inputPlaceholder="เช่น Facebook, TikTok, LINE OA..."
          emptyLabel="ยังไม่มีช่องทาง"
        />
      </SectionCard>

    </div>
  )
}
