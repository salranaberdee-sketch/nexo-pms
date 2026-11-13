'use client'

import { useEffect, useState, useMemo } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase'
import { useCan } from '@/lib/profile-context'
import { useSettings } from '@/lib/app-settings'
import ProfilePicker from './ProfilePicker'
import CustomerPicker, { type CustomerOption } from './CustomerPicker'
import SearchInput from './SearchInput'
import { TableSkeleton, EmptyState, todayStr } from './TableState'
import StatusSelect from './StatusSelect'
import { showToast } from './Toast'
import Modal, { Field, ConfirmModal } from './Modal'
import type { ProfileOption } from './InlinePersonPicker'
import {
  inputCls, selectCls, btnPrimary, btnSecondary, btnDanger,
  thCls, thRightCls, tdCls, tdRightCls, tableWrapCls, pagePadCls,
} from '@/lib/cx'
import { IconPlus, IconPencil, IconTrash } from '@/lib/icons'
import { orderPaymentStatusStyle, orderPaymentMethodLabel } from '@/lib/status-styles'
import type { Tables } from '@/src/types/database'
import OrdersSettingsPanel from './OrdersSettingsPanel'

// ── Constants ─────────────────────────────────────────────────────────────────
const PAYMENT_METHODS  = ['transfer', 'cash', 'credit', 'qr', 'other'] as const
const PAYMENT_STATUSES = ['pending', 'partial', 'paid', 'refunded'] as const

const paymentStatusLabel: Record<string, string> = {
  pending:  'รอชำระ',
  partial:  'ชำระบางส่วน',
  paid:     'ชำระแล้ว',
  refunded: 'คืนเงิน',
}

type Order   = Tables<'orders'>
type Product = Tables<'products'>
type Sale    = Tables<'sales'>

const EMPTY_FORM = {
  product_id:     '',
  service_name:   '',
  unit_price:     '',
  quantity:       '1',
  discount:       '0',
  payment_method: 'transfer',
  payment_status: 'pending',
  amount_paid:    '0',
  paid_at:        '',
  lead_id:        '',
  sale_period_id: '',
  staff_id:       '',
  staff_name:     '',
  order_date:     '',
  notes:          '',
  receipt_number: '',
}
type OrderFormType = typeof EMPTY_FORM

// ── OrderForm — hoisted outside component to avoid remount on parent re-render ──
function OrderForm({
  form, setForm, products, leadsOpts, salesOpts, profileOptions, servicePresets,
  customer, setCustomer,
}: {
  form: OrderFormType
  setForm: (f: OrderFormType) => void
  products: Product[]
  leadsOpts: any[]
  salesOpts: Sale[]
  profileOptions: ProfileOption[]
  servicePresets: { name: string; price: number }[]
  customer: CustomerOption | null
  setCustomer: (c: CustomerOption | null) => void
}) {
  const filteredLeads = leadsOpts.filter(l => !form.product_id || l.product_id === form.product_id)
  const filteredSales = salesOpts.filter(s => !form.product_id || s.product_id === form.product_id)
  const totalPreview  = (Number(form.unit_price) * Number(form.quantity)) - Number(form.discount)

  // When selecting a preset, prefill service_name + unit_price
  function onPresetSelect(val: string) {
    if (!val) { setForm({ ...form, service_name: '' }); return }
    const preset = servicePresets.find(p => p.name === val)
    setForm({
      ...form,
      service_name: val,
      unit_price:   preset && preset.price > 0 ? String(preset.price) : form.unit_price,
    })
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">

      {/* ── ลูกค้า ── */}
      <div className="col-span-2 pt-1 pb-1 border-b border-slate-100">
        <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide">ลูกค้า / ผู้ป่วย</p>
      </div>
      <div className="col-span-2">
        <Field label="ค้นหาผู้ป่วย" hint="ค้นด้วยชื่อ, HN, หรือเบอร์โทร">
          <CustomerPicker value={customer} onChange={setCustomer} />
          {!customer && (
            <p className="text-[11px] text-slate-400 mt-1">
              ไม่พบ? <a href="/customers" target="_blank" className="text-indigo-500 underline underline-offset-2">เพิ่มผู้ป่วยใหม่</a>
            </p>
          )}
        </Field>
      </div>
      {customer?.allergies && (
        <div className="col-span-2 flex items-center gap-2 bg-red-50 border border-red-100 rounded-xl px-3.5 py-2.5">
          <span className="text-red-500 text-base shrink-0">⚠</span>
          <p className="text-xs text-red-700 font-medium">แพ้: {customer.allergies}</p>
          {customer.chronic_diseases && (
            <p className="text-xs text-amber-600 ml-2">· {customer.chronic_diseases}</p>
          )}
        </div>
      )}

      {/* ── สินค้า / บริการ ── */}
      <div className="col-span-2 pt-1 pb-1 border-b border-slate-100">
        <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide">รายการขาย</p>
      </div>

      <Field label="สินค้า" required>
        <select
          value={form.product_id}
          onChange={e => setForm({ ...form, product_id: e.target.value, lead_id: '', sale_period_id: '' })}
          className={selectCls}
        >
          <option value="">เลือกสินค้า</option>
          {products.map(p => (
            <option key={p.product_id} value={p.product_id}>{p.product_id} — {p.name}</option>
          ))}
        </select>
      </Field>

      <Field label="บริการ / สินค้าที่ขาย" required>
        {servicePresets.length > 0 ? (
          <>
            <select
              value={servicePresets.find(p => p.name === form.service_name) ? form.service_name : '__custom'}
              onChange={e => {
                if (e.target.value === '__custom') {
                  setForm({ ...form, service_name: '' })
                } else {
                  onPresetSelect(e.target.value)
                }
              }}
              className={selectCls}
            >
              <option value="">เลือกบริการ</option>
              {servicePresets.map(p => (
                <option key={p.name} value={p.name}>
                  {p.name}{p.price > 0 ? ` — ฿${p.price.toLocaleString()}` : ' — ยังไม่กำหนดราคา'}
                </option>
              ))}
              <option value="__custom">✏️ พิมพ์เอง</option>
            </select>
            {/* Show text input when 'พิมพ์เอง' or value not in presets */}
            {(!servicePresets.find(p => p.name === form.service_name)) && (
              <input
                value={form.service_name}
                onChange={e => setForm({ ...form, service_name: e.target.value })}
                placeholder="ระบุบริการ/สินค้าที่ขาย"
                className={inputCls + ' mt-2'}
              />
            )}
          </>
        ) : (
          <input
            value={form.service_name}
            onChange={e => setForm({ ...form, service_name: e.target.value })}
            placeholder="เช่น ตรวจสุขภาพ, ขลิบไร้เลือด"
            className={inputCls}
          />
        )}
      </Field>

      <Field label="ราคาต่อหน่วย (฿)" required>
        <input
          type="number" min="0" step="1"
          value={form.unit_price}
          onChange={e => setForm({ ...form, unit_price: e.target.value })}
          placeholder="0"
          className={inputCls}
        />
      </Field>

      <Field label="จำนวน">
        <input
          type="number" min="1"
          value={form.quantity}
          onChange={e => setForm({ ...form, quantity: e.target.value })}
          className={inputCls}
        />
      </Field>

      <Field label="ส่วนลด (฿)">
        <input
          type="number" min="0"
          value={form.discount}
          onChange={e => setForm({ ...form, discount: e.target.value })}
          placeholder="0"
          className={inputCls}
        />
      </Field>

      {/* Total preview */}
      <div className="flex flex-col justify-end pb-1">
        <p className="text-xs text-slate-400 mb-1">ยอดรวม</p>
        <p className={`text-xl font-bold ${totalPreview >= 0 ? 'text-slate-900' : 'text-red-500'}`}>
          ฿{totalPreview.toLocaleString()}
        </p>
      </div>

      {/* ── การชำระเงิน ── */}
      <div className="col-span-2 pt-2 border-t border-slate-100">
        <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-1">การชำระเงิน</p>
      </div>

      <Field label="ช่องทางชำระ" required>
        <select value={form.payment_method} onChange={e => setForm({ ...form, payment_method: e.target.value })} className={selectCls}>
          {PAYMENT_METHODS.map(m => (
            <option key={m} value={m}>{orderPaymentMethodLabel[m]}</option>
          ))}
        </select>
      </Field>

      <Field label="สถานะการชำระ">
        <select value={form.payment_status} onChange={e => setForm({ ...form, payment_status: e.target.value })} className={selectCls}>
          <option value="pending">รอชำระ</option>
          <option value="partial">ชำระบางส่วน</option>
          <option value="paid">ชำระแล้ว</option>
          <option value="refunded">คืนเงิน</option>
        </select>
      </Field>

      <Field label="ชำระแล้ว (฿)" hint="จำนวนเงินที่รับมาจริง">
        <input
          type="number" min="0"
          value={form.amount_paid}
          onChange={e => setForm({ ...form, amount_paid: e.target.value })}
          className={inputCls}
        />
      </Field>

      {(form.payment_status === 'paid' || form.payment_status === 'partial') && (
        <Field label="วันที่รับเงิน">
          <input type="date" value={form.paid_at} onChange={e => setForm({ ...form, paid_at: e.target.value })} className={inputCls} />
        </Field>
      )}

      {/* ── Attribution ── */}
      <div className="col-span-2 pt-2 border-t border-slate-100">
        <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-1">ที่มา (ไม่บังคับ)</p>
      </div>

      <Field label="Lead ที่นำมาซื้อ" hint="เลือกถ้า order นี้มาจาก lead ที่ติดตามไว้">
        <select value={form.lead_id} onChange={e => setForm({ ...form, lead_id: e.target.value })} className={selectCls}>
          <option value="">— ไม่ระบุ</option>
          {filteredLeads.map((l: any) => (
            <option key={l.id} value={l.id}>
              #{l.id} · {l.owner_name || 'ไม่ระบุ'} · ฿{Number(l.deal_amount || 0).toLocaleString()}
            </option>
          ))}
        </select>
      </Field>

      <Field label="เป้ายอดขาย (Sales Period)" hint="เพื่อให้ order นี้นับรวมใน Sales">
        <select value={form.sale_period_id} onChange={e => setForm({ ...form, sale_period_id: e.target.value })} className={selectCls}>
          <option value="">— ไม่ระบุ</option>
          {filteredSales.map(s => (
            <option key={s.id} value={s.id}>
              {s.period_start} → {s.period_end} · {s.status}
            </option>
          ))}
        </select>
      </Field>

      {/* ── รายละเอียดอื่น ── */}
      <div className="col-span-2 pt-2 border-t border-slate-100">
        <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-1">รายละเอียด</p>
      </div>

      <Field label="วันที่ขาย">
        <input type="date" value={form.order_date} onChange={e => setForm({ ...form, order_date: e.target.value })} className={inputCls} />
      </Field>

      <Field label="เลขที่ใบเสร็จ">
        <input value={form.receipt_number} onChange={e => setForm({ ...form, receipt_number: e.target.value })} placeholder="เช่น REC-2026-001" className={inputCls} />
      </Field>

      <Field label="เจ้าหน้าที่ / ผู้รับเงิน">
        <ProfilePicker
          value={form.staff_id}
          profiles={profileOptions}
          onChange={(id, name) => setForm({ ...form, staff_id: id, staff_name: name })}
          placeholder="เลือกเจ้าหน้าที่"
        />
      </Field>

      <div className="col-span-2">
        <Field label="หมายเหตุ">
          <textarea
            rows={2}
            value={form.notes}
            onChange={e => setForm({ ...form, notes: e.target.value })}
            placeholder="บันทึกเพิ่มเติม"
            className={inputCls + ' resize-none'}
          />
        </Field>
      </div>
    </div>
  )
}

// ── Main component ─────────────────────────────────────────────────────────────
export default function Orders() {
  const [orders, setOrders]             = useState<Order[]>([])
  const [products, setProducts]         = useState<Product[]>([])
  const [closedLeads, setClosedLeads]   = useState<any[]>([])
  const [sales, setSales]               = useState<Sale[]>([])
  const [profileOptions, setProfileOptions] = useState<ProfileOption[]>([])
  const [customerList, setCustomerList] = useState<any[]>([])
  const [loading, setLoading]           = useState(true)
  const [loadError, setLoadError]       = useState('')

  // Filters
  const [search, setSearch]             = useState('')
  const [filterProduct, setFilterProduct]       = useState('all')
  const [filterPayStatus, setFilterPayStatus]   = useState('all')
  const [filterDateFrom, setFilterDateFrom]     = useState('')
  const [filterDateTo, setFilterDateTo]         = useState('')

  // Add modal
  const [showAdd, setShowAdd]   = useState(false)
  const [addForm, setAddForm]   = useState<OrderFormType>({ ...EMPTY_FORM })
  const [addCustomer, setAddCustomer] = useState<CustomerOption | null>(null)
  const [saving, setSaving]     = useState(false)
  const [addError, setAddError] = useState('')

  // Edit modal
  const [editingRow, setEditingRow]   = useState<Order | null>(null)
  const [editForm, setEditForm]       = useState<OrderFormType>({ ...EMPTY_FORM })
  const [editCustomer, setEditCustomer] = useState<CustomerOption | null>(null)
  const [savingEdit, setSavingEdit]   = useState(false)
  const [editError, setEditError]     = useState('')

  // Delete
  const [confirmDelete, setConfirmDelete] = useState<number | null>(null)
  const [deleting, setDeleting]           = useState(false)

  // Pagination
  const [visibleCount, setVisibleCount] = useState(15)

  const canInsert = useCan('insert', 'orders')
  const canUpdate = useCan('update', 'orders')
  const canDelete = useCan('delete', 'orders')
  const supabase  = createClient()
  const TODAY     = todayStr()
  const { servicePresets } = useSettings()

  // ── Read URL params for prefill (from Leads "สร้าง Order" button) ──────────
  const searchParams = useSearchParams()
  const router       = useRouter()
  const activeTab: 'list' | 'settings' = searchParams.get('tab') === 'settings' ? 'settings' : 'list'
  function setActiveTab(tab: 'list' | 'settings') {
    const p = new URLSearchParams(searchParams.toString())
    if (tab === 'list') p.delete('tab')
    else p.set('tab', tab)
    router.replace(`/orders?${p.toString()}`)
  }

  // Open add modal pre-filled when navigated from Leads
  useEffect(() => {
    const leadId   = searchParams.get('lead_id')
    const prodId   = searchParams.get('product_id')
    const amount   = searchParams.get('amount')
    if (leadId && prodId) {
      setAddForm({
        ...EMPTY_FORM,
        lead_id:        leadId,
        product_id:     prodId,
        unit_price:     amount || '',
        order_date:     TODAY,
        payment_status: amount && Number(amount) > 0 ? 'pending' : 'pending',
        amount_paid:    '0',
      })
      setAddError('')
      setShowAdd(true)
      // Clean URL params without full reload
      const clean = new URLSearchParams(searchParams.toString())
      clean.delete('lead_id'); clean.delete('product_id'); clean.delete('amount')
      router.replace(`/orders${clean.toString() ? '?' + clean.toString() : ''}`)
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // ── Load ──────────────────────────────────────────────────────────────────
  async function load() {
    setLoadError('')
    const [o, p, l, s, pr, cust] = await Promise.all([
      supabase.from('orders')
        .select('id, product_id, lead_id, sale_period_id, customer_id, service_name, unit_price, quantity, discount, total_amount, payment_method, payment_status, amount_paid, paid_at, staff_id, staff_name, order_date, notes, receipt_number, created_at, updated_at')
        .order('order_date', { ascending: false })
        .order('id', { ascending: false }),
      supabase.from('products').select('product_id, name, business_type'),
      supabase.from('leads')
        .select('id, product_id, status, deal_amount, owner_name')
        .eq('status', 'ปิดการขาย')
        .order('id', { ascending: false }),
      supabase.from('sales')
        .select('id, product_id, period_start, period_end, status')
        .order('period_start', { ascending: false }),
      supabase.from('profiles').select('id, name, role').eq('approval_status', 'approved').order('name'),
      supabase.from('customers').select('id, hn, first_name, last_name, phone, allergies').order('first_name'),
    ])
    if (o.error) { setLoadError(o.error.message); setLoading(false); return }
    setOrders(o.data || [])
    setProducts(p.data || [])
    setClosedLeads(l.data || [])
    setSales(s.data || [])
    setProfileOptions(pr.data || [])
    setCustomerList(cust.data || [])
    setLoading(false)
  }
  useEffect(() => { load() }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // ── Add ───────────────────────────────────────────────────────────────────
  async function saveAdd() {
    setSaving(true); setAddError('')
    if (!addForm.product_id) { setAddError('กรุณาเลือกสินค้า'); setSaving(false); return }
    if (!addForm.service_name.trim()) { setAddError('กรุณาระบุบริการ/สินค้าที่ขาย'); setSaving(false); return }
    if (!addForm.unit_price || Number(addForm.unit_price) <= 0) { setAddError('กรุณาระบุราคา'); setSaving(false); return }

    const { error } = await supabase.from('orders').insert([{
      product_id:     addForm.product_id,
      lead_id:        addForm.lead_id        ? Number(addForm.lead_id)        : null,
      sale_period_id: addForm.sale_period_id ? Number(addForm.sale_period_id) : null,
      customer_id:    addCustomer ? addCustomer.id : null,
      service_name:   addForm.service_name.trim(),
      unit_price:     Number(addForm.unit_price),
      quantity:       Number(addForm.quantity) || 1,
      discount:       Number(addForm.discount) || 0,
      payment_method: addForm.payment_method,
      payment_status: addForm.payment_status,
      amount_paid:    Number(addForm.amount_paid) || 0,
      paid_at:        addForm.paid_at || null,
      staff_id:       addForm.staff_id   || null,
      staff_name:     addForm.staff_name || null,
      order_date:     addForm.order_date || TODAY,
      notes:          addForm.notes          || null,
      receipt_number: addForm.receipt_number || null,
    }])
    if (error) { setAddError(error.message); setSaving(false); return }
    setShowAdd(false)
    setAddForm({ ...EMPTY_FORM, order_date: TODAY })
    setAddCustomer(null)
    await load()
    setSaving(false)
    showToast('บันทึก Order แล้ว')
  }

  // ── Edit ──────────────────────────────────────────────────────────────────
  function openEdit(o: Order) {
    setEditingRow(o)
    setEditForm({
      product_id:     o.product_id,
      service_name:   o.service_name,
      unit_price:     String(o.unit_price ?? 0),
      quantity:       String(o.quantity ?? 1),
      discount:       String(o.discount ?? 0),
      payment_method: o.payment_method,
      payment_status: o.payment_status,
      amount_paid:    String(o.amount_paid ?? 0),
      paid_at:        o.paid_at ? o.paid_at.split('T')[0] : '',
      lead_id:        o.lead_id        ? String(o.lead_id)        : '',
      sale_period_id: o.sale_period_id ? String(o.sale_period_id) : '',
      staff_id:       o.staff_id    || '',
      staff_name:     o.staff_name  || '',
      order_date:     o.order_date  || TODAY,
      notes:          o.notes          || '',
      receipt_number: o.receipt_number || '',
    })
    setEditError('')
  }

  async function saveEdit() {
    if (!editingRow) return
    setSavingEdit(true); setEditError('')
    const { error } = await supabase.from('orders').update({
      product_id:     editForm.product_id,
      lead_id:        editForm.lead_id        ? Number(editForm.lead_id)        : null,
      sale_period_id: editForm.sale_period_id ? Number(editForm.sale_period_id) : null,
      customer_id:    editCustomer ? editCustomer.id : null,
      service_name:   editForm.service_name.trim(),
      unit_price:     Number(editForm.unit_price),
      quantity:       Number(editForm.quantity) || 1,
      discount:       Number(editForm.discount) || 0,
      payment_method: editForm.payment_method,
      payment_status: editForm.payment_status,
      amount_paid:    Number(editForm.amount_paid) || 0,
      paid_at:        editForm.paid_at || null,
      staff_id:       editForm.staff_id   || null,
      staff_name:     editForm.staff_name || null,
      order_date:     editForm.order_date || TODAY,
      notes:          editForm.notes          || null,
      receipt_number: editForm.receipt_number || null,
    }).eq('id', editingRow.id)
    setSavingEdit(false)
    if (error) { setEditError(error.message); return }
    setEditingRow(null)
    setEditCustomer(null)
    await load()
    showToast('บันทึกการแก้ไขแล้ว')
  }

  // ── Delete ────────────────────────────────────────────────────────────────
  async function deleteRow(id: number) {
    setDeleting(true)
    const { error } = await supabase.from('orders').delete().eq('id', id)
    setDeleting(false)
    if (error) { showToast(error.message, 'error'); return }
    setConfirmDelete(null)
    setOrders(prev => prev.filter(o => o.id !== id))
    showToast('ลบ Order แล้ว')
  }

  // ── Inline payment status update ──────────────────────────────────────────
  async function updatePaymentStatus(id: number, payment_status: string) {
    const { error } = await supabase.from('orders').update({ payment_status }).eq('id', id)
    if (error) { showToast(error.message, 'error'); return }
    setOrders(prev => prev.map(o => o.id === id ? { ...o, payment_status } : o))
  }

  // ── Derived / aggregates ──────────────────────────────────────────────────
  const productMap = useMemo(() => new Map(products.map(p => [p.product_id, p])), [products])
  const customerMap = useMemo(() => new Map(customerList.map(c => [c.id, c])), [customerList])

  // Summary KPIs
  const thisMonth = TODAY.slice(0, 7) // "YYYY-MM"
  const todayRevenue   = useMemo(() => orders.filter(o => o.order_date === TODAY).reduce((s, o) => s + Number(o.total_amount ?? 0), 0), [orders, TODAY])
  const monthRevenue   = useMemo(() => orders.filter(o => (o.order_date || '').startsWith(thisMonth)).reduce((s, o) => s + Number(o.total_amount ?? 0), 0), [orders, thisMonth])
  const pendingAmount  = useMemo(() => orders.filter(o => o.payment_status === 'pending' || o.payment_status === 'partial').reduce((s, o) => s + (Number(o.total_amount ?? 0) - Number(o.amount_paid ?? 0)), 0), [orders])
  const paidThisMonth  = useMemo(() => orders.filter(o => (o.order_date || '').startsWith(thisMonth) && o.payment_status === 'paid').reduce((s, o) => s + Number(o.amount_paid ?? 0), 0), [orders, thisMonth])

  // Filter
  useEffect(() => { setVisibleCount(15) }, [filterProduct, filterPayStatus, filterDateFrom, filterDateTo, search])

  const filtered = useMemo(() => {
    let list = orders
    if (filterProduct !== 'all')   list = list.filter(o => o.product_id === filterProduct)
    if (filterPayStatus !== 'all') list = list.filter(o => o.payment_status === filterPayStatus)
    if (filterDateFrom)            list = list.filter(o => (o.order_date || '') >= filterDateFrom)
    if (filterDateTo)              list = list.filter(o => (o.order_date || '') <= filterDateTo)
    if (!search) return list
    const q = search.toLowerCase()
    return list.filter(o =>
      o.service_name.toLowerCase().includes(q) ||
      o.product_id.toLowerCase().includes(q) ||
      (o.staff_name   || '').toLowerCase().includes(q) ||
      (o.receipt_number || '').toLowerCase().includes(q) ||
      (o.notes          || '').toLowerCase().includes(q) ||
      (productMap.get(o.product_id)?.name || '').toLowerCase().includes(q),
    )
  }, [orders, filterProduct, filterPayStatus, filterDateFrom, filterDateTo, search, productMap])

  const countByStatus = useMemo(
    () => PAYMENT_STATUSES.reduce((acc, s) => ({ ...acc, [s]: orders.filter(o => o.payment_status === s).length }), {} as Record<string, number>),
    [orders],
  )

  // Default order_date for new form
  useEffect(() => {
    setAddForm(prev => prev.order_date ? prev : { ...prev, order_date: TODAY })
  }, [TODAY])

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div className={pagePadCls}>

      {/* ── Header ── */}
      <div className="flex items-center justify-between gap-2">
        <div>
          <h1 className="text-lg md:text-xl font-semibold text-slate-900">Orders</h1>
          <p className="text-sm text-slate-400 mt-0.5">บันทึกรายการขาย — {orders.length} รายการ</p>
        </div>
        {activeTab === 'list' && canInsert && (
          <button
            onClick={() => { setAddForm({ ...EMPTY_FORM, order_date: TODAY }); setAddError(''); setShowAdd(true) }}
            className={btnPrimary}
          >
            <IconPlus />เพิ่ม Order
          </button>
        )}
      </div>

      {/* ── Tabs ── */}
      <div className="flex gap-1 border-b border-slate-100">
        {(['list', 'settings'] as const).map(tab => (
          <button key={tab} onClick={() => setActiveTab(tab)}
            className={`px-4 py-2.5 text-sm font-medium border-b-2 -mb-px transition-colors ${
              activeTab === tab
                ? 'border-indigo-600 text-indigo-600'
                : 'border-transparent text-slate-500 hover:text-slate-700'
            }`}>
            {tab === 'list' ? 'รายการ Order' : 'ตั้งค่า'}
          </button>
        ))}
      </div>

      {/* ── Tab: ตั้งค่า ── */}
      {activeTab === 'settings' && (
        <OrdersSettingsPanel />
      )}

      {/* ── Tab: รายการ ── */}
      {activeTab === 'list' && (<>

        {loadError && (
          <div className="bg-red-50 border border-red-100 rounded-2xl px-4 py-3 text-sm text-red-600 flex items-center gap-3">
            <span className="flex-1">โหลดข้อมูลไม่สำเร็จ: {loadError}</span>
            <button onClick={load} className="text-red-600 underline underline-offset-2 hover:no-underline shrink-0">ลองใหม่</button>
          </div>
        )}

        {/* ── KPI cards ── */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
          {[
            { label: 'รายได้วันนี้',   value: `฿${todayRevenue.toLocaleString()}`,   meta: TODAY,                            color: 'bg-indigo-500' },
            { label: 'รายได้เดือนนี้', value: `฿${monthRevenue.toLocaleString()}`,   meta: `${orders.filter(o=>(o.order_date||'').startsWith(thisMonth)).length} orders`, color: 'bg-emerald-500' },
            { label: 'รับเงินแล้ว',    value: `฿${paidThisMonth.toLocaleString()}`,  meta: 'เดือนนี้ · ชำระแล้ว',           color: 'bg-blue-500' },
            { label: 'รอรับเงิน',      value: `฿${pendingAmount.toLocaleString()}`,   meta: `${(countByStatus.pending||0)+(countByStatus.partial||0)} orders`, color: 'bg-amber-500' },
          ].map(({ label, value, meta, color }) => (
            <div key={label} className="bg-white rounded-2xl border border-slate-100 p-5 shadow-sm relative overflow-hidden">
              <div className={`absolute top-0 left-0 right-0 h-0.5 ${color}`} />
              <p className="text-xs text-slate-400 mb-2.5 mt-1">{label}</p>
              <p className="text-2xl font-semibold text-slate-900 leading-none">{value}</p>
              <p className="text-xs text-slate-400 mt-2">{meta}</p>
            </div>
          ))}
        </div>

        {/* ── Status filter pills ── */}
        <div className="flex gap-2 flex-wrap items-center">
          <button onClick={() => setFilterPayStatus('all')}
            className={filterPayStatus === 'all'
              ? 'px-3.5 py-1.5 rounded-lg text-sm font-medium border bg-indigo-600 text-white border-indigo-600 transition-colors'
              : 'px-3.5 py-1.5 rounded-lg text-sm font-medium border bg-white border-slate-200 text-slate-500 hover:bg-slate-50 transition-colors'}>
            ทั้งหมด <span className="ml-1 opacity-60 tabular-nums">{orders.length}</span>
          </button>
          {PAYMENT_STATUSES.map(s => (
            <button key={s} onClick={() => setFilterPayStatus(filterPayStatus === s ? 'all' : s)}
              className={`px-3.5 py-1.5 rounded-lg text-sm font-medium border transition-colors ${
                filterPayStatus === s
                  ? (orderPaymentStatusStyle[s] || '') + ' border-current/20'
                  : 'bg-white border-slate-200 text-slate-500 hover:bg-slate-50'
              }`}>
              {paymentStatusLabel[s]} <span className="ml-1 tabular-nums opacity-60">{countByStatus[s] || 0}</span>
            </button>
          ))}
        </div>

        {/* ── Filters row ── */}
        <div className="flex gap-2 flex-wrap items-center">
          <SearchInput value={search} onChange={setSearch} placeholder="ค้นหาบริการ, สินค้า, เจ้าหน้าที่, ใบเสร็จ..." />
          <select value={filterProduct} onChange={e => setFilterProduct(e.target.value)}
            className="border border-slate-200 rounded-xl px-3.5 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white text-slate-700">
            <option value="all">ทุกสินค้า</option>
            {products.map(p => <option key={p.product_id} value={p.product_id}>{p.product_id} — {p.name}</option>)}
          </select>
          <div className="flex items-center gap-1.5">
            <span className="text-xs text-slate-400 whitespace-nowrap">จาก</span>
            <input type="date" value={filterDateFrom} onChange={e => setFilterDateFrom(e.target.value)}
              className="border border-slate-200 rounded-xl px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white text-slate-700" />
            <span className="text-xs text-slate-400">ถึง</span>
            <input type="date" value={filterDateTo} onChange={e => setFilterDateTo(e.target.value)}
              className="border border-slate-200 rounded-xl px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white text-slate-700" />
            {(filterDateFrom || filterDateTo) && (
              <button onClick={() => { setFilterDateFrom(''); setFilterDateTo('') }}
                className="text-xs text-slate-400 hover:text-red-500 transition-colors px-1.5 py-1 rounded-lg hover:bg-red-50">✕</button>
            )}
          </div>
        </div>

        {/* ── Desktop table ── */}
        <div className={tableWrapCls}>
          <div className="px-4 py-3 border-b border-slate-100 flex items-center justify-between">
            <span className="text-sm text-slate-400 tabular-nums">{filtered.length} รายการ</span>
            <span className="text-sm font-semibold text-slate-700">
              รวม ฿{filtered.reduce((s, o) => s + Number(o.total_amount ?? 0), 0).toLocaleString()}
            </span>
          </div>

          {/* Desktop */}
          <div className="hidden md:block overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-slate-50/60 border-b border-slate-100">
                  <th className={thCls}>วันที่</th>
                  <th className={thCls}>ผู้ป่วย</th>
                  <th className={thCls}>สินค้า</th>
                  <th className={thCls}>บริการ / สินค้าที่ขาย</th>
                  <th className={thRightCls}>ราคา × จำนวน</th>
                  <th className={thRightCls}>ส่วนลด</th>
                  <th className={thRightCls}>ยอดรวม</th>
                  <th className={thRightCls}>ชำระแล้ว</th>
                  <th className={thCls}>ช่องทาง</th>
                  <th className={thCls}>สถานะ</th>
                  <th className={thCls}>เจ้าหน้าที่</th>
                  <th className={thCls}>หมายเหตุ</th>
                  <th className={thCls}></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100/60">
                {loading ? (
                  <TableSkeleton cols={12} />
                ) : filtered.length === 0 ? (
                  <EmptyState message="ยังไม่มี Order" />
                ) : filtered.slice(0, visibleCount).map(o => {
                  const product   = productMap.get(o.product_id)
                  const total     = Number(o.total_amount ?? 0)
                  const paid      = Number(o.amount_paid ?? 0)
                  const remaining = Math.max(0, total - paid)
                  return (
                    <tr key={o.id} className="hover:bg-slate-50/60 transition-colors">
                      {/* วันที่ */}
                      <td className={`${tdCls} whitespace-nowrap`}>
                        <span className="text-sm text-slate-700">
                          {o.order_date
                            ? new Date(o.order_date).toLocaleDateString('th-TH', { day: '2-digit', month: 'short', year: 'numeric' })
                            : '—'}
                        </span>
                        {o.receipt_number && (
                          <p className="text-[10px] text-slate-400 mt-0.5 font-mono">{o.receipt_number}</p>
                        )}
                      </td>
                      {/* ผู้ป่วย */}
                      <td className={tdCls}>
                        {(() => {
                          const cid = (o as any).customer_id
                          const c = cid ? customerMap.get(cid) : null
                          if (!c) return <span className="text-slate-200 text-xs">—</span>
                          return (
                            <div className="min-w-[100px]">
                              {c.hn && <p className="text-[10px] font-mono text-indigo-500 font-semibold leading-none mb-0.5">HN {c.hn}</p>}
                              <p className="text-sm font-medium text-slate-800 leading-snug">{c.first_name} {c.last_name}</p>
                              {c.phone && <p className="text-xs text-slate-400">{c.phone}</p>}
                              {c.allergies && <p className="text-[10px] text-red-500 font-medium">⚠ {c.allergies}</p>}
                            </div>
                          )
                        })()}
                      </td>
                      {/* สินค้า */}
                      <td className={tdCls}>
                        <span className="font-mono text-xs font-medium bg-slate-100 text-slate-600 px-2 py-0.5 rounded-md">{o.product_id}</span>
                        {product && <p className="text-xs text-slate-400 mt-0.5 truncate max-w-[100px]">{product.name}</p>}
                      </td>
                      {/* บริการ */}
                      <td className={`${tdCls} max-w-[180px]`}>
                        <span className="text-sm font-medium text-slate-800 truncate block">{o.service_name}</span>
                        {o.lead_id && <p className="text-[10px] text-indigo-400 mt-0.5">↳ Lead #{o.lead_id}</p>}
                      </td>
                      {/* ราคา × จำนวน */}
                      <td className={`${tdRightCls} text-sm text-slate-600 whitespace-nowrap`}>
                        ฿{Number(o.unit_price ?? 0).toLocaleString()}
                        {Number(o.quantity) > 1 && <span className="text-slate-400"> × {o.quantity}</span>}
                      </td>
                      {/* ส่วนลด */}
                      <td className={`${tdRightCls} text-sm`}>
                        {Number(o.discount) > 0
                          ? <span className="text-red-400">-฿{Number(o.discount).toLocaleString()}</span>
                          : <span className="text-slate-200">—</span>}
                      </td>
                      {/* ยอดรวม */}
                      <td className={`${tdRightCls} text-sm font-semibold text-slate-900`}>
                        ฿{total.toLocaleString()}
                      </td>
                      {/* ชำระแล้ว */}
                      <td className={tdRightCls}>
                        <span className="text-sm text-emerald-600 font-medium">฿{paid.toLocaleString()}</span>
                        {remaining > 0 && (
                          <p className="text-[10px] text-amber-500 mt-0.5">ค้าง ฿{remaining.toLocaleString()}</p>
                        )}
                      </td>
                      {/* ช่องทาง */}
                      <td className={tdCls}>
                        <span className="text-xs bg-slate-100 text-slate-600 px-2 py-0.5 rounded-md">
                          {orderPaymentMethodLabel[o.payment_method] || o.payment_method}
                        </span>
                      </td>
                      {/* สถานะ */}
                      <td className={tdCls}>
                        <StatusSelect
                          value={o.payment_status}
                          options={[...PAYMENT_STATUSES]}
                          styleMap={orderPaymentStatusStyle}
                          disabled={!canUpdate}
                          onChange={v => updatePaymentStatus(o.id, v)}
                        />
                      </td>
                      {/* เจ้าหน้าที่ */}
                      <td className={`${tdCls} text-sm text-slate-500 whitespace-nowrap`}>
                        {o.staff_name || <span className="text-slate-200">—</span>}
                      </td>
                      {/* หมายเหตุ */}
                      <td className={`${tdCls} max-w-[140px]`}>
                        {o.notes
                          ? <span className="text-xs text-slate-400 truncate block">{o.notes}</span>
                          : <span className="text-slate-200 text-sm">—</span>}
                      </td>
                      {/* Actions */}
                      <td className={`${tdCls} whitespace-nowrap`}>
                        <div className="flex items-center gap-1">
                          {canUpdate && (
                            <button onClick={() => openEdit(o)} className={btnSecondary}>
                              <IconPencil />แก้ไข
                            </button>
                          )}
                          {canDelete && (
                            <button onClick={() => setConfirmDelete(o.id)} className={btnDanger}>
                              <IconTrash />
                            </button>
                          )}
                          {!canUpdate && !canDelete && <span className="text-xs text-slate-300">—</span>}
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
            {visibleCount < filtered.length && (
              <div className="px-4 py-4 border-t border-slate-100 text-center">
                <button onClick={() => setVisibleCount(v => v + 15)}
                  className="text-sm text-indigo-600 font-medium hover:text-indigo-800 transition-colors">
                  ดูเพิ่มเติม ({filtered.length - visibleCount} รายการ)
                </button>
              </div>
            )}
          </div>

          {/* ── Mobile cards ── */}
          <div className="md:hidden divide-y divide-slate-100">
            {loading ? (
              <div className="p-6 text-center text-sm text-slate-400">กำลังโหลด...</div>
            ) : filtered.length === 0 ? (
              <div className="p-6 text-center text-sm text-slate-400">ยังไม่มี Order</div>
            ) : filtered.slice(0, visibleCount).map(o => {
              const product = productMap.get(o.product_id)
              const total   = Number(o.total_amount ?? 0)
              const paid    = Number(o.amount_paid  ?? 0)
              const remaining = Math.max(0, total - paid)
              const cls = orderPaymentStatusStyle[o.payment_status] || 'bg-slate-100 text-slate-500'
              return (
                <div key={o.id} className="p-4 space-y-2">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-mono text-xs text-slate-400 bg-slate-100 px-1.5 py-0.5 rounded">{o.product_id}</span>
                        <span className={`text-xs px-2 py-0.5 rounded-md font-medium ${cls}`}>
                          {paymentStatusLabel[o.payment_status]}
                        </span>
                      </div>
                      <p className="text-sm font-medium text-slate-900 mt-1">{o.service_name}</p>
                      <div className="flex items-center gap-2 mt-1 flex-wrap text-xs text-slate-400">
                        <span>{o.order_date ? new Date(o.order_date).toLocaleDateString('th-TH', { day: '2-digit', month: 'short' }) : '—'}</span>
                        <span className="bg-slate-50 text-slate-500 px-1.5 py-0.5 rounded">
                          {orderPaymentMethodLabel[o.payment_method]}
                        </span>
                        {o.staff_name && <span>{o.staff_name}</span>}
                        {product?.name && <span className="text-slate-300">{product.name}</span>}
                      </div>
                    </div>
                    <div className="flex flex-col items-end gap-1 shrink-0">
                      <span className="text-base font-bold text-slate-900">฿{total.toLocaleString()}</span>
                      {remaining > 0 && (
                        <span className="text-[11px] text-amber-600">ค้าง ฿{remaining.toLocaleString()}</span>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <StatusSelect value={o.payment_status} options={[...PAYMENT_STATUSES]}
                      styleMap={orderPaymentStatusStyle} disabled={!canUpdate}
                      onChange={v => updatePaymentStatus(o.id, v)} />
                    {canUpdate && (
                      <button onClick={() => openEdit(o)} className={btnSecondary}>
                        <IconPencil />แก้ไข
                      </button>
                    )}
                    {canDelete && (
                      <button onClick={() => setConfirmDelete(o.id)} className={btnDanger}>
                        <IconTrash />
                      </button>
                    )}
                  </div>
                </div>
              )
            })}
            {visibleCount < filtered.length && (
              <div className="p-4 text-center">
                <button onClick={() => setVisibleCount(v => v + 15)}
                  className="text-sm text-indigo-600 font-medium hover:text-indigo-800 transition-colors">
                  ดูเพิ่มเติม ({filtered.length - visibleCount} รายการ)
                </button>
              </div>
            )}
          </div>
        </div>

        {/* ── Modals ── */}
        <ConfirmModal
          open={confirmDelete !== null}
          onClose={() => setConfirmDelete(null)}
          onConfirm={() => deleteRow(confirmDelete!)}
          loading={deleting}
          title="ยืนยันลบ Order"
          message="Order นี้จะถูกลบถาวร — ข้อมูลยอดขายที่เชื่อมอยู่จะไม่ถูกอัปเดตโดยอัตโนมัติ"
        />

        <Modal open={showAdd} onClose={() => setShowAdd(false)} title="เพิ่ม Order ใหม่" width="max-w-2xl">
          <OrderForm
            form={addForm} setForm={setAddForm}
            products={products} leadsOpts={closedLeads} salesOpts={sales}
            profileOptions={profileOptions} servicePresets={servicePresets}
            customer={addCustomer} setCustomer={setAddCustomer}
          />
          {addError && <p className="text-sm bg-red-50 text-red-600 border border-red-100 rounded-xl px-3.5 py-2.5 mt-4">{addError}</p>}
          <div className="flex gap-2 mt-6">
            <button onClick={saveAdd} disabled={saving}
              className="flex-1 bg-indigo-600 text-white py-2.5 rounded-xl text-sm font-semibold disabled:opacity-40 hover:bg-indigo-500 transition-colors">
              {saving ? 'กำลังบันทึก...' : 'บันทึก Order'}
            </button>
            <button onClick={() => setShowAdd(false)} className="px-5 py-2.5 text-sm text-slate-500 rounded-xl hover:bg-slate-100 transition-colors">ยกเลิก</button>
          </div>
        </Modal>

        <Modal open={!!editingRow} onClose={() => setEditingRow(null)} title="แก้ไข Order" width="max-w-2xl">
          <OrderForm
            form={editForm} setForm={setEditForm}
            products={products} leadsOpts={closedLeads} salesOpts={sales}
            profileOptions={profileOptions} servicePresets={servicePresets}
            customer={editCustomer} setCustomer={setEditCustomer}
          />
          {editError && <p className="text-sm bg-red-50 text-red-600 border border-red-100 rounded-xl px-3.5 py-2.5 mt-4">{editError}</p>}
          <div className="flex gap-2 mt-6">
            <button onClick={saveEdit} disabled={savingEdit}
              className="flex-1 bg-indigo-600 text-white py-2.5 rounded-xl text-sm font-semibold disabled:opacity-40 hover:bg-indigo-500 transition-colors">
              {savingEdit ? 'กำลังบันทึก...' : 'บันทึกการแก้ไข'}
            </button>
            <button onClick={() => setEditingRow(null)} className="px-5 py-2.5 text-sm text-slate-500 rounded-xl hover:bg-slate-100 transition-colors">ยกเลิก</button>
          </div>
        </Modal>

      </>)}
    </div>
  )
}
