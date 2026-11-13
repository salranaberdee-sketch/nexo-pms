'use client'

/**
 * OrdersSettingsPanel — /orders?tab=settings
 *
 * Flow:
 *   1. รายการบริการ — เพิ่ม/แก้/ลบ service presets (name + price)
 *      ราคา click-to-edit inline, ไม่มี modal
 *   2. ช่องทางและสถานะ — quick reference แบบ compact 2 col
 */

import { useCan } from '@/lib/profile-context'
import { SectionCard } from './PageSettings'
import ServicePresetsManager from './ServicePresetsManager'

// Payment method display
const METHODS = [
  { key: 'transfer', label: 'โอนเงิน',      icon: '🏦' },
  { key: 'cash',     label: 'เงินสด',        icon: '💵' },
  { key: 'credit',   label: 'บัตรเครดิต',   icon: '💳' },
  { key: 'qr',       label: 'QR Code',       icon: '📱' },
  { key: 'other',    label: 'อื่นๆ',          icon: '•'  },
]

// Payment status workflow
const STATUSES = [
  { key: 'pending',  label: 'รอชำระ',         cls: 'bg-amber-50 text-amber-700',   arrow: true  },
  { key: 'partial',  label: 'ชำระบางส่วน',    cls: 'bg-blue-50 text-blue-700',     arrow: true  },
  { key: 'paid',     label: 'ชำระแล้ว',        cls: 'bg-emerald-50 text-emerald-700', arrow: false },
  { key: 'refunded', label: 'คืนเงิน',          cls: 'bg-red-50 text-red-500',       arrow: false },
]

export default function OrdersSettingsPanel() {
  const canManage = useCan('insert', 'orders')

  return (
    <div className="space-y-5 max-w-2xl">

      {/* ── 1. Service Presets ── */}
      <SectionCard
        title="รายการบริการ"
        description="กดที่ชื่อหรือราคาเพื่อแก้ทันที · ลากเพื่อเรียงใหม่ · Enter เพื่อเพิ่ม"
        badge={!canManage ? 'ดูได้อย่างเดียว' : undefined}
      >
        <ServicePresetsManager canManage={canManage} />
      </SectionCard>

      {/* ── 2. Payment quick-ref (compact, no bulk) ── */}
      <SectionCard
        title="ช่องทางและสถานะชำระเงิน"
        description="สำหรับอ้างอิง — flow: รอชำระ → ชำระบางส่วน → ชำระแล้ว"
      >
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">

          {/* Methods */}
          <div>
            <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-widest mb-2">ช่องทาง</p>
            <div className="space-y-1">
              {METHODS.map(m => (
                <div key={m.key} className="flex items-center gap-2.5 py-1.5 px-2.5 rounded-lg hover:bg-slate-50 transition-colors">
                  <span className="text-base w-5 text-center shrink-0 leading-none">{m.icon}</span>
                  <span className="text-sm text-slate-700">{m.label}</span>
                  <code className="ml-auto text-[10px] text-slate-300 font-mono">{m.key}</code>
                </div>
              ))}
            </div>
          </div>

          {/* Statuses — flow */}
          <div>
            <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-widest mb-2">สถานะ</p>
            <div className="space-y-1">
              {STATUSES.map((s, i) => (
                <div key={s.key} className="flex items-center gap-2">
                  <span className={`text-xs font-semibold px-2.5 py-1 rounded-lg flex-1 text-center ${s.cls}`}>
                    {s.label}
                  </span>
                  {s.arrow && (
                    <svg className="text-slate-200 shrink-0" width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                      <polyline points="6 9 12 15 18 9"/>
                    </svg>
                  )}
                </div>
              ))}
            </div>
          </div>

        </div>
      </SectionCard>

    </div>
  )
}
