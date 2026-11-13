'use client'

/**
 * ProductSettingsPanel — settings tab inside /products?tab=settings
 *   1. หมวดหมู่ (Business Type)   — categories table (admin/manager)
 *   2. ประเภทสินค้า (Product Type) — app_settings.product_types (admin only)
 *   3. แบรนด์ (Brand)             — app_settings.brands (admin only)
 *   4. Owner (ผู้รับผิดชอบ)        — info card: how owner_id is used
 *   5. สถานะสินค้า (Workflow)      — read-only reference with descriptions
 */

import { useIsAdmin } from '@/lib/profile-context'
import CategoryManager from './CategoryManager'
import { productStatusStyle } from '@/lib/status-styles'
import { SectionCard, CsvListManager, StatusReference } from './PageSettings'

const PRODUCT_STATUSES = [
  { name: 'กำลังพัฒนา',   desc: 'กำลังสร้าง / พัฒนาสินค้า ยังไม่พร้อมขาย' },
  { name: 'เตรียมเปิดตัว', desc: 'ใกล้ launch รอวันประกาศ' },
  { name: 'เปิดขาย',       desc: 'ขายอยู่ในตลาดแล้ว' },
  { name: 'หยุดขาย',       desc: 'หยุดขายชั่วคราวหรือถาวร' },
]

export default function ProductSettingsPanel() {
  const isAdmin = useIsAdmin()

  return (
    <div className="space-y-5 max-w-2xl">

      {/* 1. หมวดหมู่ */}
      <SectionCard
        title="หมวดหมู่ (Business Type)"
        description="จัดกลุ่มสินค้าตามประเภทธุรกิจ — ใช้ใน filter และ summary cards ของ Sales"
      >
        <CategoryManager />
      </SectionCard>

      {/* 2. ประเภทสินค้า */}
      <SectionCard
        title="ประเภทสินค้า (Product Type)"
        description="ประเภทย่อยของสินค้า เช่น หลักสูตร, บริการ, สินค้าดิจิทัล"
        badge={!isAdmin ? 'admin เท่านั้น' : undefined}
      >
        <CsvListManager
          settingKey="product_types"
          canManage={isAdmin}
          inputPlaceholder="เช่น หลักสูตรออนไลน์, สินค้ากายภาพ..."
          emptyLabel="ยังไม่มีประเภทสินค้า — เพิ่มเพื่อให้ dropdown มีตัวเลือก"
        />
      </SectionCard>

      {/* 3. แบรนด์ */}
      <SectionCard
        title="แบรนด์ (Brand)"
        description="รายการแบรนด์ของบริษัท — ใช้ใน dropdown ฟอร์มสินค้าและ filter editor"
        badge={!isAdmin ? 'admin เท่านั้น' : undefined}
      >
        <CsvListManager
          settingKey="brands"
          canManage={isAdmin}
          inputPlaceholder="เช่น REBORN, medFTU, DeeCourse..."
          emptyLabel="ยังไม่มีแบรนด์ — เพิ่มเพื่อให้ editor เห็น product ตาม brand_access"
        />
      </SectionCard>

      {/* 4. สถานะ */}
      <SectionCard
        title="สถานะสินค้า (Workflow)"
        description="Pipeline ของสินค้าตั้งแต่พัฒนาจนหยุดขาย — แก้ไขผ่าน DB migration เท่านั้น"
      >
        <StatusReference statuses={PRODUCT_STATUSES} statusStyle={productStatusStyle} />
      </SectionCard>

    </div>
  )
}
