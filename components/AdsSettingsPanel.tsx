'use client'

/**
 * AdsSettingsPanel — settings tab inside /ads?tab=settings
 *   1. ช่องทางโฆษณา   — app_settings.content_channels (admin only, shared with Content)
 *   2. Budget Presets — app_settings.ads_budget_presets (admin only)
 *   3. แนวทางการรายงาน — read-only info card
 */

import Link from 'next/link'
import { useIsAdmin } from '@/lib/profile-context'
import { SectionCard, CsvListManager } from './PageSettings'

export default function AdsSettingsPanel() {
  const isAdmin = useIsAdmin()

  return (
    <div className="space-y-5 max-w-2xl">

      {/* 1. ช่องทางโฆษณา */}
      <SectionCard
        title="ช่องทางโฆษณา"
        description="ช่องทางที่ใช้ใน dropdown ของฟอร์มแคมเปญ — ใช้ร่วมกับหน้า Content"
        badge={!isAdmin ? 'admin เท่านั้น' : undefined}
      >
        <CsvListManager
          settingKey="content_channels"
          canManage={isAdmin}
          inputPlaceholder="เช่น Facebook, TikTok, Google, LINE OA..."
          emptyLabel="ยังไม่มีช่องทาง"
        />
      </SectionCard>

      {/* 2. Budget Presets */}
      <SectionCard
        title="Budget Presets (฿)"
        description="ค่า budget ที่ใช้บ่อย — ลากเรียงลำดับได้ ใช้เป็น quick-select ในฟอร์ม"
        badge={!isAdmin ? 'admin เท่านั้น' : undefined}
      >
        <CsvListManager
          settingKey="ads_budget_presets"
          canManage={isAdmin}
          inputPlaceholder="เช่น 5000, 15000, 30000..."
          emptyLabel="ยังไม่มี budget preset"
        />
      </SectionCard>

      {/* 3. Metrics reference */}
      <SectionCard
        title="Metrics ที่ติดตาม"
        description="ตัวชี้วัดหลักของแคมเปญ — คำนวณอัตโนมัติโดย DB"
      >
        <div className="space-y-2">
          {[
            { metric: 'CPL',             formula: 'budget_spent ÷ leads',         note: 'Cost per Lead' },
            { metric: 'ROAS',            formula: 'sales_amount ÷ budget_spent',  note: 'Return on Ad Spend' },
            { metric: 'budget_total',    formula: 'budget_approved + adjustment',  note: 'งบรวม (generated column)' },
            { metric: 'budget_remaining',formula: 'budget_allocated − spent',      note: 'งบคงเหลือ (generated column)' },
          ].map(r => (
            <div key={r.metric} className="flex items-center gap-3 px-3 py-2.5 rounded-xl border border-slate-100 bg-slate-50/40">
              <span className="text-xs font-mono font-semibold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded min-w-[120px]">{r.metric}</span>
              <span className="text-xs font-mono text-slate-500 flex-1">{r.formula}</span>
              <span className="text-[11px] text-slate-400 hidden sm:block">{r.note}</span>
            </div>
          ))}
        </div>
        <p className="text-[11px] text-slate-400 mt-3">
          Generated columns คำนวณโดย PostgreSQL — ห้าม INSERT/UPDATE โดยตรง
        </p>
      </SectionCard>

    </div>
  )
}
