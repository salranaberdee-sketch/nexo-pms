/**
 * Shared status → Tailwind class maps — single source of truth.
 * Used by components and StatusSelect styleMap prop.
 * Import what you need: import { productStatusStyle, contentStatusStyle, ... } from '@/lib/status-styles'
 */

/** products.status */
export const productStatusStyle: Record<string, string> = {
  'เปิดขาย':       'bg-emerald-50 text-emerald-700',
  'เตรียมเปิดตัว': 'bg-amber-50 text-amber-700',
  'กำลังพัฒนา':   'bg-blue-50 text-blue-700',
  'หยุดขาย':       'bg-slate-100 text-slate-400',
}

/** contents.status */
export const contentStatusStyle: Record<string, string> = {
  'รอผลิต':       'bg-slate-100 text-slate-500',
  'ผลิตอยู่':      'bg-blue-50 text-blue-700',
  'รออนุมัติ':    'bg-amber-50 text-amber-700',
  'อนุมัติแล้ว':  'bg-purple-50 text-purple-700',
  'กำหนดโพสต์':  'bg-orange-50 text-orange-700',
  'โพสต์แล้ว':   'bg-emerald-50 text-emerald-700',
}

/** sales.status */
export const salesStatusStyle: Record<string, string> = {
  'ยังไม่เปิดขาย': 'bg-slate-100 text-slate-400',
  'ยังไม่เริ่ม':   'bg-blue-50 text-blue-700',
  'กำลังขาย':     'bg-amber-50 text-amber-700',
  'ปิดเป้า':       'bg-emerald-50 text-emerald-700',
}

/** leads.status */
export const leadStatusStyle: Record<string, string> = {
  'ใหม่':         'bg-blue-50 text-blue-700',
  'ติดต่อแล้ว':  'bg-amber-50 text-amber-700',
  'ผ่านเกณฑ์':   'bg-purple-50 text-purple-700',
  'ปิดการขาย':   'bg-emerald-50 text-emerald-700',
  'ไม่สำเร็จ':   'bg-red-50 text-red-500',
}

/** profiles.role */
export const roleStyle: Record<string, string> = {
  admin:   'bg-purple-50 text-purple-700',
  manager: 'bg-blue-50 text-blue-700',
  editor:  'bg-teal-50 text-teal-700',
  viewer:  'bg-slate-100 text-slate-500',
}

/** profiles.approval_status */
export const approvalStatusStyle: Record<string, string> = {
  approved: 'bg-emerald-50 text-emerald-700',
  pending:  'bg-amber-50 text-amber-700',
  rejected: 'bg-red-50 text-red-600',
}
/** orders.payment_status */
export const orderPaymentStatusStyle: Record<string, string> = {
  pending:  'bg-amber-50 text-amber-700',
  partial:  'bg-blue-50 text-blue-700',
  paid:     'bg-emerald-50 text-emerald-700',
  refunded: 'bg-red-50 text-red-500',
}
/** orders.payment_method — display labels (not a style map, but kept here as a companion) */
export const orderPaymentMethodLabel: Record<string, string> = {
  transfer: 'โอนเงิน',
  cash:     'เงินสด',
  credit:   'บัตรเครดิต',
  qr:       'QR Code',
  other:    'อื่นๆ',
}
