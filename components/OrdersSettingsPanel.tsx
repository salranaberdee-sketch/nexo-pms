'use client'

/**
 * OrdersSettingsPanel — settings tab inside /orders?tab=settings
 *   1. รายการบริการ (service_presets) — format: ชื่อ|ราคา   admin/manager จัดการได้
 *   2. สถานะการชำระเงิน               — read-only reference
 *   3. ช่องทางชำระเงิน                — read-only reference
 */

import { useCan } from '@/lib/profile-context'
import { orderPaymentStatusStyle, orderPaymentMethodLabel } from '@/lib/status-styles'
import { SectionCard, StatusReference } from './PageSettings'
import ServicePresetsManager from './ServicePresetsManager'

const PAYMENT_STATUSES = [
  { name: 'รอชำระ (pending)',         desc: 'สร้าง order แล้วแต่ยังไม่ได้รับเงิน' },
  { name: 'ชำระบางส่วน (partial)',    desc: 'รับเงินมาบ้างแล้ว ยังค้างอยู่' },
  { name: 'ชำระแล้ว (paid)',          desc: 'รับเงินครบถ้วน' },
  { name: 'คืนเงิน (refunded)',       desc: 'คืนเงินลูกค้าแล้ว' },
]

const PAYMENT_METHODS = [
  { name: 'โอนเงิน (transfer)', desc: 'โอนเงินผ่านธนาคาร' },
  { name: 'เงินสด (cash)',       desc: 'รับเงินสดหน้าคลินิก' },
  { name: 'บัตรเครดิต (credit)', desc: 'รูดบัตร' },
  { name: 'QR Code (qr)',        desc: 'สแกน QR PromptPay / บัตรเดบิต' },
  { name: 'อื่นๆ (other)',       desc: 'ช่องทางอื่นนอกจากนี้' },
]

// Combine styles for display
const payStatusStyle: Record<string, string> = {
  'รอชำระ (pending)':      'bg-amber-50 text-amber-700',
  'ชำระบางส่วน (partial)': 'bg-blue-50 text-blue-700',
  'ชำระแล้ว (paid)':       'bg-emerald-50 text-emerald-700',
  'คืนเงิน (refunded)':    'bg-red-50 text-red-500',
}

export default function OrdersSettingsPanel() {
  const canManage = useCan('insert', 'orders')

  return (
    <div className="space-y-5 max-w-2xl">

      {/* 1. รายการบริการ */}
      <SectionCard
        title="รายการบริการ / สินค้า (Service Presets)"
        description="กำหนดบริการและราคาที่ใช้บ่อย — เลือกได้จาก dropdown ตอนสร้าง Order"
        badge={!canManage ? 'admin/manager เท่านั้น' : undefined}
      >
        <ServicePresetsManager canManage={canManage} />
      </SectionCard>

      {/* 2. สถานะการชำระเงิน */}
      <SectionCard
        title="สถานะการชำระเงิน"
        description="workflow การรับเงิน — แก้ไขผ่าน DB migration เท่านั้น"
      >
        <StatusReference statuses={PAYMENT_STATUSES} statusStyle={payStatusStyle} />
      </SectionCard>

      {/* 3. ช่องทางชำระเงิน */}
      <SectionCard
        title="ช่องทางชำระเงิน"
        description="ช่องทางที่รองรับในระบบ"
      >
        <div className="space-y-2">
          {PAYMENT_METHODS.map(m => (
            <div key={m.name} className="flex items-start gap-3 py-2 border-b border-slate-50 last:border-0">
              <span className="text-xs font-medium text-slate-700 bg-slate-100 px-2.5 py-1 rounded-lg min-w-[160px] shrink-0">{m.name}</span>
              <span className="text-xs text-slate-400 pt-1">{m.desc}</span>
            </div>
          ))}
        </div>
      </SectionCard>

    </div>
  )
}
