'use client'

/**
 * ProductSettingsPanel — settings tab inside /products?tab=settings
 * Sections:
 *   1. หมวดหมู่ (Business Type)  — categories table (admin/manager)
 *   2. ประเภทสินค้า (Product Type) — app_settings.product_types (admin only)
 *   3. แบรนด์ (Brand)            — app_settings.brands (admin only)
 *   4. สถานะสินค้า (Workflow)     — read-only reference
 */

import { useIsAdmin } from '@/lib/profile-context'
import CategoryManager from './CategoryManager'
import { productStatusStyle } from '@/lib/status-styles'
import { SectionCard, CsvListManager, StatusReference } from './PageSettings'

// products.status — CHECK constraint in DB, shown read-only here
const PRODUCT_STATUSES = [
  { name: 'กำลังพัฒนา' },
  { name: 'เตรียมเปิดตัว' },
  { name: 'เปิดขาย' },
  { name: 'หยุดขาย' },
]

export default function ProductSettingsPanel() {
  const isAdmin = useIsAdmin() // app_settings RLS = admin only

  return (
    <div className="space-y-5 max-w-2xl">

      {/* 1. หมวดหมู่ — admin/manager (categories RLS) */}
      <SectionCard
        title="หมวดหมู่ (Business Type)"
        description="เพิ่ม/แก้/ลบ หมวดหมู่สินค้า — ลากเรียงลำดับได้"
      >
        <CategoryManager />
      </SectionCard>

      {/* 2. ประเภทสินค้า — admin only (app_settings RLS) */}
      <SectionCard
        title="ประเภทสินค้า (Product Type)"
        description="รายการประเภทที่ใช้ใน dropdown ของฟอร์มสินค้า"
        badge={!isAdmin ? 'admin เท่านั้น' : undefined}
      >
        <CsvListManager
          settingKey="product_types"
          canManage={isAdmin}
          inputPlaceholder="เช่น หลักสูตร, บริการ..."
          emptyLabel="ยังไม่มีประเภทสินค้า"
        />
      </SectionCard>

      {/* 3. แบรนด์ — admin only (app_settings RLS) */}
      <SectionCard
        title="แบรนด์ (Brand)"
        description="รายการแบรนด์ที่ใช้ใน dropdown ของฟอร์มสินค้า"
        badge={!isAdmin ? 'admin เท่านั้น' : undefined}
      >
        <CsvListManager
          settingKey="brands"
          canManage={isAdmin}
          inputPlaceholder="เช่น REBORN, medFTU..."
          emptyLabel="ยังไม่มีแบรนด์"
        />
      </SectionCard>

      {/* 4. สถานะ — read-only */}
      <SectionCard
        title="สถานะสินค้า (Workflow)"
        description="ลำดับสถานะของสินค้า — fixed, แก้ไขผ่าน migration เท่านั้น"
      >
        <StatusReference statuses={PRODUCT_STATUSES} statusStyle={productStatusStyle} />
      </SectionCard>

    </div>
  )
}
