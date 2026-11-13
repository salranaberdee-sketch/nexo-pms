'use client'

import { useEffect, useState, useMemo } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase'
import { useCan } from '@/lib/profile-context'
import ProfilePicker from './ProfilePicker'
import SearchInput from './SearchInput'
import { TableSkeleton, EmptyState } from './TableState'
import StatusSelect from './StatusSelect'
import { showToast } from './Toast'
import Modal, { Field, ConfirmModal } from './Modal'
import type { ProfileOption } from './InlinePersonPicker'
import { inputCls, selectCls, btnPrimary, btnSecondary, btnDanger, thCls, tdCls, tableWrapCls, sectionLabelCls } from '@/lib/cx'
import { IconPlus, IconPencil, IconTrash } from '@/lib/icons'
import { leadStatusStyle } from '@/lib/status-styles'
import type { Tables } from '@/src/types/database'
import LeadsSettingsPanel from './LeadsSettingsPanel'

const LEAD_STATUSES = ['ใหม่', 'ติดต่อแล้ว', 'ผ่านเกณฑ์', 'ปิดการขาย', 'ไม่สำเร็จ']

type Lead = Tables<'leads'>
type Product = Tables<'products'>
type Sale = Tables<'sales'>

const channelLabel: Record<string, string> = {
  form: 'Form', LINE: 'LINE', inbox: 'Inbox', phone: 'โทร', other: 'อื่นๆ',
}

const EMPTY_FORM = {
  product_id: '',
  ad_id: '',
  content_id: '',
  channel_in: 'other',
  utm_source: '',
  utm_medium: '',
  utm_campaign: '',
  utm_content: '',
  status: 'ใหม่',
  deal_amount: '',
  closed_at: '',
  owner_id: '',
  owner_name: '',
  consent_given: false,
  consent_at: '',
  notes: '',
}

type LeadFormType = typeof EMPTY_FORM

// Hoisted outside Leads so React doesn't remount it on every parent render.
// Previously defined inside Leads which caused input to lose focus on every state change.
function LeadForm({ form, setForm, products, adsOpts, contentsOpts, profileOptions }: {  form: LeadFormType
  setForm: (f: LeadFormType) => void
  products: any[]
  adsOpts: any[]
  contentsOpts: any[]
  profileOptions: ProfileOption[]
}) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">      {/* Attribution */}
      <Field label="สินค้า / บริการ" required>
        <select value={form.product_id} onChange={e => setForm({ ...form, product_id: e.target.value, ad_id: '', content_id: '' })} className={selectCls}>
          <option value="">เลือกสินค้า</option>
          {products.map((p: any) => <option key={p.product_id} value={p.product_id}>{p.product_id} — {p.name}</option>)}
        </select>
      </Field>
      <Field label="ลูกค้าติดต่อเข้ามาทาง" required>
        <select value={form.channel_in} onChange={e => setForm({ ...form, channel_in: e.target.value })} className={selectCls}>
          <option value="form">กรอกฟอร์ม</option>
          <option value="LINE">LINE</option>
          <option value="inbox">Inbox / ข้อความ</option>
          <option value="phone">โทรศัพท์</option>
          <option value="other">อื่นๆ</option>
        </select>
      </Field>
      <Field label="มาจากโฆษณาชิ้นไหน" hint="เลือกถ้ารู้ว่า lead มาจากแคมเปญไหน">
        <select value={form.ad_id} onChange={e => setForm({ ...form, ad_id: e.target.value })} className={selectCls}>
          <option value="">— ไม่แน่ใจ / ไม่มีโฆษณา</option>
          {adsOpts.map((a: any) => <option key={a.id} value={a.id}>{a.campaign_name} ({a.month})</option>)}
        </select>
      </Field>
      <Field label="มาจาก Content ชิ้นไหน" hint="เลือกถ้ารู้ว่าเห็น content อะไรก่อนติดต่อ">
        <select value={form.content_id} onChange={e => setForm({ ...form, content_id: e.target.value })} className={selectCls}>
          <option value="">— ไม่แน่ใจ / ไม่มี content</option>
          {contentsOpts.map((c: any) => <option key={c.id} value={c.id}>#{c.seq} {c.title}</option>)}
        </select>
      </Field>

      {/* UTM */}
      <div className="col-span-2 pt-2 border-t border-slate-100">
        <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-1">แหล่งที่มา (ไม่บังคับ)</p>
        <p className="text-xs text-slate-400 mb-3">กรอกถ้ามี link ติดตามจาก Facebook / TikTok / Google ฯลฯ</p>
      </div>
      <Field label="แพลตฟอร์มที่มาจาก" hint="เช่น facebook, tiktok, google, line">
        <input placeholder="เช่น facebook" value={form.utm_source} onChange={e => setForm({ ...form, utm_source: e.target.value.toLowerCase() })} className={inputCls} />
      </Field>
      <Field label="ประเภทโฆษณา" hint="เช่น cpc (คลิก), social (โพสต์), email">
        <input placeholder="เช่น cpc" value={form.utm_medium} onChange={e => setForm({ ...form, utm_medium: e.target.value.toLowerCase() })} className={inputCls} />
      </Field>
      <Field label="ชื่อแคมเปญใน link" hint="ตรงกับ utm_campaign ใน link โฆษณา">
        <input placeholder="เช่น med-psy-001-2026-11" value={form.utm_campaign} onChange={e => setForm({ ...form, utm_campaign: e.target.value.toLowerCase() })} className={inputCls} />
      </Field>
      <Field label="ชื่อชิ้นงาน / Creative" hint="ระบุว่าใช้รูปหรือวิดีโอชิ้นไหนใน link">
        <input placeholder="เช่น seq1-graphic" value={form.utm_content} onChange={e => setForm({ ...form, utm_content: e.target.value.toLowerCase() })} className={inputCls} />
      </Field>

      {/* Deal */}
      <div className="col-span-2 pt-2 border-t border-slate-100">
        <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-3">ข้อมูลการขาย</p>
      </div>
      <Field label="สถานะปัจจุบัน" required>
        <select value={form.status} onChange={e => setForm({ ...form, status: e.target.value })} className={selectCls}>
          <option value="ใหม่">ใหม่ — เพิ่งรับ lead</option>
          <option value="ติดต่อแล้ว">ติดต่อแล้ว — คุยกันแล้ว</option>
          <option value="ผ่านเกณฑ์">ผ่านเกณฑ์ — สนใจจริง พร้อมซื้อ</option>
          <option value="ปิดการขาย">ปิดการขาย — ซื้อแล้ว ✓</option>
          <option value="ไม่สำเร็จ">ไม่สำเร็จ — ไม่สนใจ</option>
        </select>
      </Field>
      <Field label="ยอดขายที่ได้ (฿)" hint="กรอกเมื่อปิดการขายสำเร็จแล้ว">
        <input type="number" min="0" placeholder="0" value={form.deal_amount} onChange={e => setForm({ ...form, deal_amount: e.target.value })} className={inputCls} />
      </Field>
      {form.status === 'ปิดการขาย' && (
        <Field label="วันที่ปิดการขาย">
          <input type="date" value={form.closed_at} onChange={e => setForm({ ...form, closed_at: e.target.value })} className={inputCls} />
        </Field>
      )}
      <Field label="เซลล์ / ผู้ดูแล lead นี้">
        <ProfilePicker value={form.owner_id} profiles={profileOptions}
          onChange={(id, name) => setForm({ ...form, owner_id: id, owner_name: name })}
          placeholder="เลือกผู้รับผิดชอบ" />
      </Field>

      {/* PDPA */}
      <div className="col-span-2 pt-2 border-t border-slate-100">
        <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-3">การยินยอมข้อมูล (PDPA)</p>
      </div>
      <div className="col-span-2 flex items-start gap-3">
        <input type="checkbox" id="consent_given" checked={form.consent_given}
          onChange={e => setForm({ ...form, consent_given: e.target.checked, consent_at: e.target.checked ? form.consent_at : '' })}
          className="mt-0.5 h-4 w-4 rounded border-slate-300 text-indigo-600" />
        <label htmlFor="consent_given" className="text-sm text-slate-600">
          ลูกค้ายืนยันยินยอมให้เก็บและใช้ข้อมูลส่วนตัวแล้ว
        </label>
      </div>
      {form.consent_given && (
        <Field label="วันที่ลูกค้ายินยอม">
          <input type="date" value={form.consent_at} onChange={e => setForm({ ...form, consent_at: e.target.value })} className={inputCls} />
        </Field>
      )}

      {/* Notes */}
      <div className="col-span-2">
        <Field label="หมายเหตุ" hint="⚠️ ห้ามระบุชื่อ เบอร์โทร หรือข้อมูลสุขภาพ">
          <textarea rows={2} placeholder="บันทึกข้อความเพิ่มเติม เช่น ความสนใจของลูกค้า (ห้ามระบุชื่อหรือเบอร์โทร)"
            value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })}
            className={inputCls + ' resize-none'} />
        </Field>
      </div>
    </div>
  )
}

export default function Leads() {
  const [leads, setLeads]                   = useState<Lead[]>([])
  const [products, setProducts]             = useState<Product[]>([])
  const [ads, setAds]                       = useState<Tables<'ads'>[]>([])
  const [contents, setContents]             = useState<Tables<'contents'>[]>([])
  const [sales, setSales]                   = useState<Sale[]>([])
  const [profileOptions, setProfileOptions] = useState<ProfileOption[]>([])
  const [loading, setLoading]               = useState(true)
  const [loadError, setLoadError]           = useState('')
  const [search, setSearch]                 = useState('')
  const [filterStatus, setFilterStatus]     = useState('all')
  const [filterProduct, setFilterProduct]   = useState('all')

  // Sales-link modal state
  const [salesLinkModal, setSalesLinkModal] = useState<{ lead: Lead } | null>(null)
  const [salesLinkSaving, setSalesLinkSaving] = useState(false)
  const [salesLinkError, setSalesLinkError]   = useState('')
  // selectedSaleId: existing sales record to link, or 'new' to create
  const [selectedSaleId, setSelectedSaleId]   = useState<string>('')

  // Add / Edit modal state
  const [showAdd, setShowAdd]               = useState(false)
  const [addForm, setAddForm]               = useState({ ...EMPTY_FORM })
  const [saving, setSaving]                 = useState(false)
  const [addError, setAddError]             = useState('')

  const [editingRow, setEditingRow]         = useState<any | null>(null)
  const [editForm, setEditForm]             = useState({ ...EMPTY_FORM })
  const [savingEdit, setSavingEdit]         = useState(false)
  const [editError, setEditError]           = useState('')

  const [confirmDelete, setConfirmDelete]   = useState<number | null>(null)
  const [deleting, setDeleting]             = useState(false)

  const canInsert = useCan('insert', 'leads')
  const canUpdate = useCan('update', 'leads')
  const canDelete = useCan('delete', 'leads')
  const supabase = createClient()

  async function load() {
    setLoadError('')
    const [l, p, a, c, pr, s] = await Promise.all([
      supabase
        .from('leads')
        .select('id, product_id, ad_id, content_id, channel_in, utm_source, utm_medium, utm_campaign, utm_content, status, deal_amount, closed_at, owner_id, owner_name, consent_given, consent_at, notes, created_at, sales_id')
        .order('created_at', { ascending: false }),
      supabase.from('products').select('product_id, name'),
      supabase.from('ads').select('id, campaign_name, product_id, month'),
      supabase.from('contents').select('id, title, product_id, seq'),
      supabase.from('profiles').select('id, name, role').eq('approval_status', 'approved').order('name'),
      supabase.from('sales').select('id, product_id, period_start, period_end, sales_target_amount, actual_sales, status, closed_leads_count, closed_leads_amount, lead_source').order('period_start', { ascending: false }),
    ])
    if (l.error) { setLoadError(l.error.message); setLoading(false); return }
    setLeads(l.data || [])
    setProducts(p.data || [])
    setAds(a.data || [])
    setContents(c.data || [])
    setProfileOptions(pr.data || [])
    setSales(s.data || [])
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  // ── Add ──────────────────────────────────────────────────────
  async function saveAdd() {
    setSaving(true); setAddError('')
    if (!addForm.product_id) { setAddError('กรุณาเลือก Product'); setSaving(false); return }

    // Validate: consent_given must be true if consent_at is set
    if (addForm.consent_at && !addForm.consent_given) {
      setAddError('กรุณาติ๊ก "ยินยอม" ก่อนระบุวันที่ยินยอม')
      setSaving(false); return
    }

    const { error: insErr } = await supabase.from('leads').insert([{
      product_id:    addForm.product_id,
      ad_id:         addForm.ad_id     ? Number(addForm.ad_id)      : null,
      content_id:    addForm.content_id ? Number(addForm.content_id) : null,
      channel_in:    addForm.channel_in,
      utm_source:    addForm.utm_source    || null,
      utm_medium:    addForm.utm_medium    || null,
      utm_campaign:  addForm.utm_campaign  || null,
      utm_content:   addForm.utm_content   || null,
      status:        addForm.status,
      deal_amount:   Number(addForm.deal_amount) || 0,
      closed_at:     addForm.status === 'ปิดการขาย' && addForm.closed_at ? addForm.closed_at : null,
      owner_id:      addForm.owner_id || null,
      owner_name:    addForm.owner_name || null,
      consent_given: addForm.consent_given,
      consent_at:    addForm.consent_given && addForm.consent_at ? addForm.consent_at : null,
      notes:         addForm.notes || null,
    }])
    if (insErr) { setAddError(insErr.message); setSaving(false); return }
    setShowAdd(false)
    setAddForm({ ...EMPTY_FORM })
    await load()
    setSaving(false)
    showToast('เพิ่ม Lead แล้ว')
  }

  // ── Edit ─────────────────────────────────────────────────────
  function openEdit(row: any) {
    setEditingRow(row)
    setEditForm({
      product_id:   row.product_id   || '',
      ad_id:        row.ad_id        ? String(row.ad_id) : '',
      content_id:   row.content_id   ? String(row.content_id) : '',
      channel_in:   row.channel_in   || 'other',
      utm_source:   row.utm_source   || '',
      utm_medium:   row.utm_medium   || '',
      utm_campaign: row.utm_campaign || '',
      utm_content:  row.utm_content  || '',
      status:       row.status       || 'ใหม่',
      deal_amount:  String(row.deal_amount ?? 0),
      closed_at:    row.closed_at    ? row.closed_at.split('T')[0] : '',
      owner_id:     row.owner_id     || '',
      owner_name:   row.owner_name   || '',
      consent_given: row.consent_given ?? false,
      consent_at:   row.consent_at   ? row.consent_at.split('T')[0] : '',
      notes:        row.notes        || '',
    })
    setEditError('')
  }

  async function saveEdit() {
    if (!editingRow) return
    setSavingEdit(true); setEditError('')

    const { error: updErr } = await supabase.from('leads').update({
      product_id:    editForm.product_id,
      ad_id:         editForm.ad_id      ? Number(editForm.ad_id)      : null,
      content_id:    editForm.content_id  ? Number(editForm.content_id) : null,
      channel_in:    editForm.channel_in,
      utm_source:    editForm.utm_source    || null,
      utm_medium:    editForm.utm_medium    || null,
      utm_campaign:  editForm.utm_campaign  || null,
      utm_content:   editForm.utm_content   || null,
      status:        editForm.status,
      deal_amount:   Number(editForm.deal_amount) || 0,
      closed_at:     editForm.status === 'ปิดการขาย' && editForm.closed_at ? editForm.closed_at : null,
      owner_id:      editForm.owner_id  || null,
      owner_name:    editForm.owner_name || null,
      consent_given: editForm.consent_given,
      consent_at:    editForm.consent_given && editForm.consent_at ? editForm.consent_at : null,
      notes:         editForm.notes || null,
    }).eq('id', editingRow.id)

    setSavingEdit(false)
    if (updErr) { setEditError(updErr.message); return }

    setLeads(prev => prev.map(l => l.id === editingRow.id ? {
      ...l,
      ...editForm,
      deal_amount: Number(editForm.deal_amount) || 0,
      ad_id:       editForm.ad_id      ? Number(editForm.ad_id)      : null,
      content_id:  editForm.content_id  ? Number(editForm.content_id) : null,
    } : l))
    setEditingRow(null)
    showToast('บันทึก Lead แล้ว')
  }

  // ── Delete ────────────────────────────────────────────────────
  async function deleteRow(id: number) {
    setDeleting(true)
    const { error: delErr } = await supabase.from('leads').delete().eq('id', id)
    setDeleting(false)
    if (delErr) { showToast(delErr.message, 'error'); return }
    setConfirmDelete(null)
    setLeads(prev => prev.filter(l => l.id !== id))
    showToast('ลบ Lead แล้ว')
  }

  // ── Inline status update ──────────────────────────────────────
  async function updateStatus(id: number, status: string) {
    const closedAt = status === 'ปิดการขาย' ? new Date().toISOString().split('T')[0] : null
    const { error: updErr } = await supabase.from('leads').update({
      status,
      ...(status === 'ปิดการขาย' ? { closed_at: closedAt } : {}),
    }).eq('id', id)
    if (updErr) { showToast(updErr.message, 'error'); return }
    setLeads(prev => prev.map(l => l.id === id ? {
      ...l, status,
      ...(status === 'ปิดการขาย' ? { closed_at: closedAt } : {}),
    } : l))

    // If changing to ปิดการขาย and lead has deal_amount, offer to link to sales
    if (status === 'ปิดการขาย') {
      const lead = leads.find(l => l.id === id)
      if (lead && Number(lead.deal_amount) > 0) {
        openSalesLinkModal({ ...lead, status, ...(closedAt ? { closed_at: closedAt } : {}) } as Lead)
      }
    }
  }

  // ── Sales link modal ─────────────────────────────────────────
  function openSalesLinkModal(lead: Lead) {
    setSalesLinkError('')
    // Pre-select the most relevant sales record (same product, active period)
    const today = new Date().toISOString().split('T')[0]
    const relevantSale = sales.find(s =>
      s.product_id === lead.product_id &&
      s.period_start <= today &&
      s.period_end >= today,
    )
    setSelectedSaleId(relevantSale ? String(relevantSale.id) : (sales.find(s => s.product_id === lead.product_id) ? String(sales.find(s => s.product_id === lead.product_id)!.id) : 'skip'))
    setSalesLinkModal({ lead })
  }

  async function saveSalesLink() {
    if (!salesLinkModal || selectedSaleId === 'skip') {
      setSalesLinkModal(null)
      return
    }
    setSalesLinkSaving(true)
    setSalesLinkError('')
    const { lead } = salesLinkModal
    const dealAmt = Number(lead.deal_amount) || 0

    if (selectedSaleId === 'new') {
      // This path is handled by redirecting to Sales page — we just link without creating
      setSalesLinkModal(null)
      setSalesLinkSaving(false)
      showToast('ไปสร้างเป้ายอดขายที่หน้า Sales แล้วกลับมาเชื่อม Lead', 'info')
      return
    }

    // Link lead to existing sales record + update sales aggregates
    const saleId = Number(selectedSaleId)
    const sale = sales.find(s => s.id === saleId)
    if (!sale) { setSalesLinkError('ไม่พบเป้ายอดขาย'); setSalesLinkSaving(false); return }

    // Check if this lead is already linked (avoid double-counting)
    const alreadyLinked = lead.sales_id === saleId
    if (alreadyLinked) {
      setSalesLinkModal(null)
      setSalesLinkSaving(false)
      return
    }

    // If lead was previously linked to a different sales record, subtract from old one
    if (lead.sales_id && lead.sales_id !== saleId) {
      const oldSale = sales.find(s => s.id === lead.sales_id)
      if (oldSale) {
        const newOldCount = Math.max(0, (oldSale.closed_leads_count ?? 0) - 1)
        const newOldAmount = Math.max(0, Number(oldSale.closed_leads_amount ?? 0) - dealAmt)
        const newOldActual = Math.max(0, Number(oldSale.actual_sales ?? 0) - dealAmt)
        await supabase.from('sales').update({
          closed_leads_count:  newOldCount,
          closed_leads_amount: newOldAmount,
          actual_sales:        newOldActual,
          lead_source:         newOldCount > 0 ? (Number(newOldActual) > newOldAmount ? 'mixed' : 'leads') : 'manual',
        }).eq('id', oldSale.id)
      }
    }

    // Update new sales record
    const newCount  = (sale.closed_leads_count ?? 0) + 1
    const newAmount = Number(sale.closed_leads_amount ?? 0) + dealAmt
    const newActual = Number(sale.actual_sales ?? 0) + dealAmt
    const { error: saleErr } = await supabase.from('sales').update({
      closed_leads_count:  newCount,
      closed_leads_amount: newAmount,
      actual_sales:        newActual,
      lead_source:         Number(sale.actual_sales ?? 0) > Number(sale.closed_leads_amount ?? 0) ? 'mixed' : 'leads',
    }).eq('id', saleId)

    if (saleErr) { setSalesLinkError(saleErr.message); setSalesLinkSaving(false); return }

    // Update lead's sales_id FK
    const { error: leadErr } = await supabase.from('leads').update({ sales_id: saleId }).eq('id', lead.id)
    if (leadErr) {
      // Rollback sales update
      await supabase.from('sales').update({
        closed_leads_count:  sale.closed_leads_count ?? 0,
        closed_leads_amount: sale.closed_leads_amount ?? 0,
        actual_sales:        sale.actual_sales ?? 0,
      }).eq('id', saleId)
      setSalesLinkError(leadErr.message)
      setSalesLinkSaving(false)
      return
    }

    // Update local state
    setLeads(prev => prev.map(l => l.id === lead.id ? { ...l, sales_id: saleId } : l))
    setSales(prev => prev.map(s => s.id === saleId ? {
      ...s,
      closed_leads_count:  newCount,
      closed_leads_amount: newAmount,
      actual_sales:        newActual,
    } : s))

    setSalesLinkModal(null)
    setSalesLinkSaving(false)
    showToast('เชื่อมยอดขายสำเร็จ — อัปเดต actual_sales แล้ว')
  }

  // ── Unlink lead from sales ────────────────────────────────────
  async function unlinkSales(lead: Lead) {
    if (!lead.sales_id) return
    const sale = sales.find(s => s.id === lead.sales_id)
    if (!sale) return

    const dealAmt  = Number(lead.deal_amount) || 0
    const newCount  = Math.max(0, (sale.closed_leads_count ?? 0) - 1)
    const newAmount = Math.max(0, Number(sale.closed_leads_amount ?? 0) - dealAmt)
    const newActual = Math.max(0, Number(sale.actual_sales ?? 0) - dealAmt)

    const { error: saleErr } = await supabase.from('sales').update({
      closed_leads_count:  newCount,
      closed_leads_amount: newAmount,
      actual_sales:        newActual,
      lead_source:         newCount > 0 ? 'leads' : 'manual',
    }).eq('id', sale.id)

    if (saleErr) { showToast(saleErr.message, 'error'); return }

    const { error: leadErr } = await supabase.from('leads').update({ sales_id: null }).eq('id', lead.id)
    if (leadErr) {
      // Rollback
      await supabase.from('sales').update({
        closed_leads_count: sale.closed_leads_count,
        closed_leads_amount: sale.closed_leads_amount,
        actual_sales: sale.actual_sales,
      }).eq('id', sale.id)
      showToast(leadErr.message, 'error')
      return
    }

    setLeads(prev => prev.map(l => l.id === lead.id ? { ...l, sales_id: null } : l))
    setSales(prev => prev.map(s => s.id === sale.id ? {
      ...s, closed_leads_count: newCount, closed_leads_amount: newAmount, actual_sales: newActual,
    } : s))
    showToast('ยกเลิกการเชื่อมยอดขายแล้ว')
  }

  // ── Aggregates ────────────────────────────────────────────────
  const productMap  = useMemo(() => new Map(products.map(p => [p.product_id, p])), [products])
  const adMap       = useMemo(() => new Map(ads.map(a => [a.id, a])), [ads])
  const contentMap  = useMemo(() => new Map(contents.map(c => [c.id, c])), [contents])
  const salesMap    = useMemo(() => new Map(sales.map(s => [s.id, s])), [sales])
  // Sales options scoped to the product of the lead being linked
  const salesForProduct = useMemo(() => {
    if (!salesLinkModal) return []
    return sales.filter(s => s.product_id === salesLinkModal.lead.product_id)
  }, [sales, salesLinkModal])

  const totalLeads  = leads.length
  const closedLeads = leads.filter(l => l.status === 'ปิดการขาย').length
  const totalDeal   = leads.filter(l => l.status === 'ปิดการขาย').reduce((s, l) => s + Number(l.deal_amount || 0), 0)
  const convRate    = totalLeads > 0 ? Math.round((closedLeads / totalLeads) * 100) : 0

  // Filtered list
  const filtered = useMemo(() => {
    let list = leads
    if (filterProduct !== 'all') list = list.filter(l => l.product_id === filterProduct)
    if (filterStatus !== 'all')  list = list.filter(l => l.status === filterStatus)
    if (!search) return list
    const q = search.toLowerCase()
    return list.filter(l =>
      (l.product_id || '').toLowerCase().includes(q) ||
      (l.utm_campaign || '').toLowerCase().includes(q) ||
      (l.utm_source || '').toLowerCase().includes(q) ||
      (l.owner_name || '').toLowerCase().includes(q) ||
      (l.notes || '').toLowerCase().includes(q),
    )
  }, [leads, filterProduct, filterStatus, search])

  const countByStatus = useMemo(
    () => LEAD_STATUSES.reduce((acc, s) => ({ ...acc, [s]: leads.filter(l => l.status === s).length }), {} as Record<string, number>),
    [leads],
  )

  // Pagination
  const [visibleCount, setVisibleCount] = useState(15)
  useEffect(() => { setVisibleCount(15) }, [filterProduct, filterStatus, search])

  // Filtered ads/contents dropdown — scoped to selected product
  const filteredAds = useMemo(() => ads.filter(a => !addForm.product_id || a.product_id === addForm.product_id), [ads, addForm.product_id])
  const filteredContents = useMemo(() => contents.filter(c => !addForm.product_id || c.product_id === addForm.product_id), [contents, addForm.product_id])
  const editFilteredAds = useMemo(() => ads.filter(a => !editForm.product_id || a.product_id === editForm.product_id), [ads, editForm.product_id])
  const editFilteredContents = useMemo(() => contents.filter(c => !editForm.product_id || c.product_id === editForm.product_id), [contents, editForm.product_id])

  // Tab: sync with ?tab= URL param
  const searchParams = useSearchParams()
  const router = useRouter()
  const activeTab: 'list' | 'settings' = searchParams.get('tab') === 'settings' ? 'settings' : 'list'
  function setActiveTab(tab: 'list' | 'settings') {
    const params = new URLSearchParams(searchParams.toString())
    if (tab === 'list') params.delete('tab')
    else params.set('tab', tab)
    router.replace(`/leads?${params.toString()}`)
  }

  return (
    <div className="p-4 md:p-6 space-y-4 md:space-y-5">
      {/* ── Page header ───────────────────────────────────────── */}
      <div className="flex items-center justify-between gap-2">
        <div>
          <h1 className="text-lg md:text-xl font-semibold text-slate-900">Leads</h1>
          <p className="text-sm text-slate-400 mt-0.5">ติดตาม Lead ตั้งแต่รับจนปิดการขาย</p>
        </div>
        {activeTab === 'list' && canInsert && (
          <button onClick={() => { setAddForm({ ...EMPTY_FORM }); setAddError(''); setShowAdd(true) }}
            className={btnPrimary}>
            <IconPlus />เพิ่ม Lead
          </button>
        )}
      </div>

      {/* ── Tabs ───────────────────────────────────────────── */}
      <div className="flex gap-1 border-b border-slate-100">
        <button onClick={() => setActiveTab('list')}
          className={`px-4 py-2.5 text-sm font-medium border-b-2 -mb-px transition-colors ${activeTab === 'list' ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-slate-500 hover:text-slate-700'}`}>
          รายการ Lead
        </button>
        <button onClick={() => setActiveTab('settings')}
          className={`px-4 py-2.5 text-sm font-medium border-b-2 -mb-px transition-colors ${activeTab === 'settings' ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-slate-500 hover:text-slate-700'}`}>
          ตั้งค่า
        </button>
      </div>

      {/* ── Tab: ตั้งค่า ─────────────────────────────────────── */}
      {activeTab === 'settings' && <LeadsSettingsPanel />}

      {/* ── Tab: รายการ ────────────────────────────────────── */}
      {activeTab === 'list' && (<>
      {loadError && (
        <div className="bg-red-50 border border-red-100 rounded-2xl px-4 py-3 text-sm text-red-600 flex items-center gap-3">
          <span className="flex-1">โหลดข้อมูลไม่สำเร็จ: {loadError}</span>
          <button onClick={load} className="text-red-600 underline underline-offset-2 hover:no-underline shrink-0">ลองใหม่</button>
        </div>
      )}

      {/* ── Summary cards ─────────────────────────────────────── */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4">
        {(
          [
            { label: 'Leads ทั้งหมด',   value: totalLeads.toLocaleString(),      meta: 'ทุก status',              color: 'bg-indigo-500' },
            { label: 'ปิดการขายแล้ว',  value: closedLeads.toLocaleString(),     meta: `${convRate}% conversion`, color: 'bg-emerald-500' },
            { label: 'มูลค่า Deal รวม', value: `฿${totalDeal.toLocaleString()}`, meta: 'เฉพาะ ปิดการขาย',         color: 'bg-amber-500' },
            { label: 'รอติดตาม',        value: String((countByStatus['ใหม่'] || 0) + (countByStatus['ติดต่อแล้ว'] || 0)), meta: 'ใหม่ + ติดต่อแล้ว', color: 'bg-violet-500' },
          ] as const
        ).map(({ label, value, meta, color }) => (
          <div key={label} className="bg-white rounded-2xl border border-slate-100 p-5 shadow-sm relative overflow-hidden">
            <div className={`absolute top-0 left-0 right-0 h-0.5 ${color}`} />
            <p className="text-xs text-slate-400 mb-2.5 mt-1">{label}</p>
            <p className="text-2xl font-semibold text-slate-900 leading-none">{value}</p>
            <p className="text-xs text-slate-400 mt-2">{meta}</p>
          </div>
        ))}
      </div>

      {/* ── Status filter pills ───────────────────────────────── */}
      <div className="flex gap-2 flex-wrap items-center">
        <button onClick={() => setFilterStatus('all')}
          className={filterStatus === 'all'
            ? 'px-3.5 py-1.5 rounded-lg text-sm font-medium border bg-indigo-600 text-white border-indigo-600 transition-colors'
            : 'px-3.5 py-1.5 rounded-lg text-sm font-medium border bg-white border-slate-200 text-slate-500 hover:bg-slate-50 hover:border-slate-300 transition-colors'}>
          ทั้งหมด <span className="ml-1 opacity-60 tabular-nums">{totalLeads}</span>
        </button>
        {LEAD_STATUSES.map(s => (
          <button key={s} onClick={() => setFilterStatus(filterStatus === s ? 'all' : s)}
            className={`px-3.5 py-1.5 rounded-lg text-sm font-medium border transition-colors
              ${filterStatus === s
                ? (leadStatusStyle[s] || '') + ' border-current/20'
                : 'bg-white border-slate-200 text-slate-500 hover:bg-slate-50 hover:border-slate-300'}`}>
            {s} <span className="ml-1 tabular-nums opacity-60">{countByStatus[s] || 0}</span>
          </button>
        ))}
      </div>

      {/* ── Search + product filter ───────────────────────────── */}
      <div className="flex gap-2 flex-wrap items-center">
        <SearchInput value={search} onChange={setSearch} placeholder="ค้นหาแคมเปญ, ผู้รับผิดชอบ, utm..." />
        <select value={filterProduct} onChange={e => setFilterProduct(e.target.value)}
          className="border border-slate-200 rounded-xl px-3.5 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white text-slate-700">
          <option value="all">ทุก Product</option>
          {products.map(p => <option key={p.product_id} value={p.product_id}>{p.product_id} — {p.name}</option>)}
        </select>
      </div>

      {/* ── Table ─────────────────────────────────────────────── */}
      <div className={tableWrapCls}>
        <div className="px-4 py-3 border-b border-slate-100 flex items-center justify-between">
          <span className="text-sm text-slate-400 tabular-nums">{filtered.length} รายการ</span>
        </div>
        <div className="hidden md:block overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-slate-50/60 border-b border-slate-100">
                <th className={thCls}>#</th>
                <th className={thCls}>Product</th>
                <th className={thCls}>ช่องทาง</th>
                <th className={thCls}>แคมเปญ</th>
                <th className={thCls}>ผู้รับผิดชอบ</th>
                <th className={thCls}>มูลค่า</th>
                <th className={thCls}>ยินยอม</th>
                <th className={thCls}>เชื่อม Sales</th>
                <th className={thCls}>สถานะ</th>
                <th className={thCls}>วันที่</th>
                <th className={thCls}></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100/60">
              {loading ? (
                <TableSkeleton cols={10} />
              ) : filtered.length === 0 ? (
                <EmptyState message="ยังไม่มี Lead" />
              ) : filtered.slice(0, visibleCount).map((l, i) => {
                const product = productMap.get(l.product_id)
                const ad      = l.ad_id      ? adMap.get(l.ad_id)           : null
                const content = l.content_id ? contentMap.get(l.content_id) : null
                return (
                  <tr key={l.id} className="hover:bg-slate-50/60 transition-colors">
                    <td className={`${tdCls} text-xs text-slate-400 tabular-nums`}>{i + 1}</td>
                    <td className={tdCls}>
                      <span className="font-mono text-xs font-medium bg-slate-100 text-slate-600 px-2 py-1 rounded-md">{l.product_id}</span>
                      {product && <p className="text-xs text-slate-400 mt-1 truncate max-w-[120px]">{product.name}</p>}
                    </td>
                    <td className={tdCls}>
                      <span className="text-xs font-medium bg-blue-50 text-blue-600 px-2 py-0.5 rounded-md">
                        {channelLabel[l.channel_in] || l.channel_in}
                      </span>
                      {l.utm_source && <p className="text-xs text-slate-400 mt-1">{l.utm_source}</p>}
                    </td>
                    <td className={`${tdCls} max-w-[160px]`}>
                      {ad ? (
                        <div>
                          <span className="text-sm font-medium text-slate-700 truncate block" title={ad.campaign_name}>{ad.campaign_name}</span>
                          <span className="text-xs text-slate-400">{ad.month}</span>
                        </div>
                      ) : l.utm_campaign ? (
                        <span className="text-xs text-slate-500 truncate block" title={l.utm_campaign}>{l.utm_campaign}</span>
                      ) : <span className="text-slate-300 text-sm">—</span>}
                      {content && (
                        <p className="text-xs text-indigo-500 mt-1 truncate" title={content.title}>↳ {content.title}</p>
                      )}
                    </td>
                    <td className={`${tdCls} text-sm text-slate-600 whitespace-nowrap`}>
                      {l.owner_name || <span className="text-slate-300">—</span>}
                    </td>
                    <td className={`${tdCls} tabular-nums`}>
                      {Number(l.deal_amount) > 0
                        ? <span className="text-sm font-semibold text-emerald-600">฿{Number(l.deal_amount).toLocaleString()}</span>
                        : <span className="text-slate-300 text-sm">—</span>}
                    </td>
                    <td className={tdCls}>
                      {l.consent_given
                        ? <span className="text-xs bg-emerald-50 text-emerald-600 px-2 py-0.5 rounded-md font-medium">ยินยอม ✓</span>
                        : <span className="text-xs bg-red-50 text-red-400 px-2 py-0.5 rounded-md">ยังไม่ยินยอม</span>}
                    </td>
                    {/* ── Sales link cell ── */}
                    <td className={tdCls}>
                      {l.sales_id ? (() => {
                        const linkedSale = salesMap.get(l.sales_id)
                        return (
                          <div className="flex flex-col gap-1">
                            <span className="text-xs bg-emerald-50 text-emerald-700 px-2 py-0.5 rounded-md font-medium flex items-center gap-1">
                              <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="20 6 9 17 4 12"/></svg>
                              เชื่อมแล้ว
                            </span>
                            {linkedSale && (
                              <span className="text-[11px] text-slate-400 truncate max-w-[100px]">
                                {new Date(linkedSale.period_start).toLocaleDateString('th-TH', { month: 'short', year: 'numeric' })}
                              </span>
                            )}
                            {canUpdate && (
                              <button onClick={() => unlinkSales(l)}
                                className="text-[10px] text-slate-300 hover:text-red-400 transition-colors leading-none mt-0.5">
                                ยกเลิกเชื่อม
                              </button>
                            )}
                          </div>
                        )
                      })() : (
                        l.status === 'ปิดการขาย' && Number(l.deal_amount) > 0 && canUpdate ? (
                          <button onClick={() => openSalesLinkModal(l)}
                            className="text-xs bg-amber-50 text-amber-700 border border-amber-200 hover:bg-amber-100 px-2.5 py-1 rounded-lg font-medium transition-colors flex items-center gap-1 whitespace-nowrap">
                            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/></svg>
                            บันทึกยอดขาย
                          </button>
                        ) : (
                          <span className="text-slate-200 text-sm">—</span>
                        )
                      )}
                    </td>
                    <td className={tdCls}>
                      <StatusSelect value={l.status} options={LEAD_STATUSES} styleMap={leadStatusStyle}
                        disabled={!canUpdate} onChange={v => updateStatus(l.id, v)} />
                    </td>
                    <td className={`${tdCls} text-xs text-slate-400 whitespace-nowrap`}>
                      {l.created_at
                        ? new Date(l.created_at).toLocaleDateString('th-TH', { day: '2-digit', month: 'short', year: 'numeric' })
                        : '—'}
                    </td>
                    <td className={`${tdCls} whitespace-nowrap`}>
                      <div className="flex items-center gap-1">
                        {canUpdate && (
                          <button onClick={() => openEdit(l)} className={btnSecondary}>
                            <IconPencil />แก้ไข
                          </button>
                        )}
                        {canDelete && (
                          <button onClick={() => setConfirmDelete(l.id)} className={btnDanger}>
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

        {/* Mobile card list */}
        <div className="md:hidden divide-y divide-slate-100">
          {loading ? (
            <div className="p-6 text-center text-sm text-slate-400">กำลังโหลด...</div>
          ) : filtered.length === 0 ? (
            <div className="p-6 text-center text-sm text-slate-400">ยังไม่มี Lead</div>
          ) : filtered.slice(0, visibleCount).map(l => {
            const product = productMap.get(l.product_id)
            const ad      = l.ad_id ? adMap.get(l.ad_id) : null
            const content = l.content_id ? contentMap.get(l.content_id) : null
            return (
              <div key={l.id} className="p-4 space-y-2">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-mono text-xs text-slate-400 bg-slate-100 px-1.5 py-0.5 rounded">{l.product_id}</span>
                      <span className={`text-xs px-2 py-0.5 rounded-md font-medium ${(leadStatusStyle as Record<string, string>)[l.status] || 'bg-slate-100 text-slate-500'}`}>{l.status}</span>
                    </div>
                    {product && <p className="text-sm font-medium text-slate-900 mt-1">{product.name}</p>}
                    <div className="flex items-center gap-2 mt-1 flex-wrap text-xs text-slate-400">
                      <span className="bg-blue-50 text-blue-600 px-1.5 py-0.5 rounded">{channelLabel[l.channel_in] || l.channel_in}</span>
                      {l.owner_name && <span>{l.owner_name}</span>}
                      {ad && <span>{ad.campaign_name}</span>}
                    </div>
                  </div>
                  <div className="flex flex-col items-end gap-1.5 shrink-0">
                    {Number(l.deal_amount) > 0 && (
                      <span className="text-sm font-semibold text-emerald-600">฿{Number(l.deal_amount).toLocaleString()}</span>
                    )}
                    {l.consent_given
                      ? <span className="text-xs bg-emerald-50 text-emerald-600 px-1.5 py-0.5 rounded">ยินยอม ✓</span>
                      : <span className="text-xs bg-red-50 text-red-400 px-1.5 py-0.5 rounded">ยังไม่ยินยอม</span>}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <StatusSelect value={l.status} options={LEAD_STATUSES} styleMap={leadStatusStyle}
                    disabled={!canUpdate} onChange={v => updateStatus(l.id, v)} />
                  {canUpdate && (
                    <button onClick={() => openEdit(l)} className="flex items-center gap-1 text-xs text-slate-500 hover:text-indigo-600 px-2.5 py-1.5 rounded-lg hover:bg-indigo-50 border border-slate-200 transition-colors">
                      <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                      แก้ไข
                    </button>
                  )}
                  {canDelete && (
                    <button onClick={() => setConfirmDelete(l.id)} className="flex items-center gap-1 text-xs text-slate-400 hover:text-red-500 px-2.5 py-1.5 rounded-lg hover:bg-red-50 border border-transparent transition-colors">
                      <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/></svg>
                      ลบ
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

      {/* ── SALES LINK modal ───────────────────────────────────── */}
      <Modal
        open={!!salesLinkModal}
        onClose={() => setSalesLinkModal(null)}
        title="บันทึกยอดขาย — เชื่อม Lead เข้า Sales"
        width="max-w-lg"
      >
        {salesLinkModal && (() => {
          const { lead } = salesLinkModal
          const product = productMap.get(lead.product_id)
          const dealAmt = Number(lead.deal_amount) || 0
          return (
            <div className="space-y-5">
              {/* Lead summary */}
              <div className="bg-slate-50 rounded-xl p-4 space-y-1.5">
                <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-2">Lead ที่ปิดการขาย</p>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-slate-600">{product?.name || lead.product_id}</span>
                  <span className="text-lg font-bold text-emerald-600">฿{dealAmt.toLocaleString()}</span>
                </div>
                {lead.owner_name && (
                  <p className="text-xs text-slate-400">ปิดโดย: {lead.owner_name}</p>
                )}
              </div>

              {/* Choose sales record */}
              <div>
                <p className="text-sm font-medium text-slate-700 mb-3">
                  เลือกเป้ายอดขายที่ต้องการให้ ฿{dealAmt.toLocaleString()} นี้เข้าไป
                </p>
                {salesForProduct.length === 0 ? (
                  <div className="bg-amber-50 border border-amber-100 rounded-xl p-4 text-sm text-amber-700">
                    <p className="font-medium mb-1">ยังไม่มีเป้ายอดขายสำหรับ {lead.product_id}</p>
                    <p className="text-xs text-amber-600">ไปสร้างที่หน้า Sales ก่อน แล้วค่อยกลับมาเชื่อม Lead</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {salesForProduct.map(s => {
                      const pct = Number(s.sales_target_amount) > 0
                        ? Math.round((Number(s.actual_sales ?? 0) / Number(s.sales_target_amount)) * 100)
                        : 0
                      const isSelected = selectedSaleId === String(s.id)
                      return (
                        <label key={s.id}
                          className={`flex items-start gap-3 p-3.5 rounded-xl border cursor-pointer transition-all ${isSelected ? 'border-indigo-400 bg-indigo-50 ring-1 ring-indigo-300' : 'border-slate-200 bg-white hover:border-slate-300'}`}>
                          <input type="radio" name="sales_link" value={String(s.id)}
                            checked={isSelected}
                            onChange={() => setSelectedSaleId(String(s.id))}
                            className="mt-0.5 text-indigo-600" />
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between gap-2">
                              <span className="text-sm font-medium text-slate-800">
                                {new Date(s.period_start).toLocaleDateString('th-TH', { day: '2-digit', month: 'short', year: 'numeric' })}
                                {' – '}
                                {new Date(s.period_end).toLocaleDateString('th-TH', { day: '2-digit', month: 'short', year: 'numeric' })}
                              </span>
                              <span className={`text-xs px-2 py-0.5 rounded-md font-medium shrink-0 ${
                                s.status === 'กำลังขาย' ? 'bg-emerald-100 text-emerald-700' :
                                s.status === 'ปิดเป้า'  ? 'bg-blue-100 text-blue-700' :
                                'bg-slate-100 text-slate-500'
                              }`}>{s.status}</span>
                            </div>
                            <div className="mt-2 flex items-center gap-3 text-xs text-slate-400">
                              <span>ยอดจริง ฿{Number(s.actual_sales ?? 0).toLocaleString()}</span>
                              <span>เป้า ฿{Number(s.sales_target_amount ?? 0).toLocaleString()}</span>
                              <span className="text-slate-300">|</span>
                              <span>{pct}%</span>
                              {(s.closed_leads_count ?? 0) > 0 && (
                                <span className="text-indigo-500">{s.closed_leads_count} leads แล้ว</span>
                              )}
                            </div>
                            {/* Preview: how much actual_sales will increase */}
                            {isSelected && (
                              <div className="mt-2 text-xs font-medium text-emerald-600 bg-emerald-50 rounded-lg px-2.5 py-1.5">
                                actual_sales จะเพิ่มเป็น ฿{(Number(s.actual_sales ?? 0) + dealAmt).toLocaleString()} (+฿{dealAmt.toLocaleString()})
                              </div>
                            )}
                          </div>
                        </label>
                      )
                    })}
                    {/* Skip option */}
                    <label className={`flex items-center gap-3 p-3 rounded-xl border cursor-pointer transition-all ${selectedSaleId === 'skip' ? 'border-slate-400 bg-slate-50' : 'border-slate-200 hover:border-slate-300'}`}>
                      <input type="radio" name="sales_link" value="skip"
                        checked={selectedSaleId === 'skip'}
                        onChange={() => setSelectedSaleId('skip')}
                        className="text-slate-500" />
                      <span className="text-sm text-slate-500">ข้ามไปก่อน — ไม่เชื่อมตอนนี้</span>
                    </label>
                  </div>
                )}
              </div>

              {salesLinkError && (
                <p className="text-sm bg-red-50 text-red-600 border border-red-100 rounded-xl px-3.5 py-2.5">{salesLinkError}</p>
              )}

              <div className="flex gap-2 pt-1">
                <button
                  onClick={saveSalesLink}
                  disabled={salesLinkSaving || (!selectedSaleId || selectedSaleId === '' || salesForProduct.length === 0)}
                  className="flex-1 bg-indigo-600 text-white py-2.5 rounded-xl text-sm font-semibold disabled:opacity-40 hover:bg-indigo-500 transition-colors">
                  {salesLinkSaving ? 'กำลังบันทึก...' : selectedSaleId === 'skip' ? 'ข้ามไปก่อน' : 'เชื่อมและอัปเดตยอดขาย'}
                </button>
                <button onClick={() => setSalesLinkModal(null)}
                  className="px-5 py-2.5 text-sm text-slate-500 rounded-xl hover:bg-slate-100 transition-colors">
                  ยกเลิก
                </button>
              </div>
            </div>
          )
        })()}
      </Modal>

      {/* ── DELETE confirm ─────────────────────────────────────── */}
      <ConfirmModal
        open={confirmDelete !== null}
        onClose={() => setConfirmDelete(null)}
        onConfirm={() => deleteRow(confirmDelete!)}
        loading={deleting}
        title="ยืนยันลบ Lead"
        message="Lead นี้จะถูกลบถาวร — ข้อมูล attribution จะหายไปด้วย"
      />

      {/* ── ADD modal ──────────────────────────────────────────── */}
      <Modal open={showAdd} onClose={() => setShowAdd(false)} title="เพิ่ม Lead ใหม่" width="max-w-2xl">
        <LeadForm form={addForm} setForm={setAddForm} products={products} adsOpts={filteredAds} contentsOpts={filteredContents} profileOptions={profileOptions} />
        {addError && <p className="text-sm bg-red-50 text-red-600 border border-red-100 rounded-xl px-3.5 py-2.5 mt-4">{addError}</p>}
        <div className="flex gap-2 mt-6">
          <button onClick={saveAdd} disabled={saving || !addForm.product_id}
            className="flex-1 bg-indigo-600 text-white py-2.5 rounded-xl text-sm font-semibold disabled:opacity-40 hover:bg-indigo-500 transition-colors">
            {saving ? 'กำลังบันทึก...' : 'บันทึก'}
          </button>
          <button onClick={() => setShowAdd(false)} className="px-5 py-2.5 text-sm text-slate-500 rounded-xl hover:bg-slate-100 transition-colors">ยกเลิก</button>
        </div>
      </Modal>

      {/* ── EDIT modal ─────────────────────────────────────────── */}
      <Modal open={!!editingRow} onClose={() => setEditingRow(null)} title="แก้ไข Lead" width="max-w-2xl">
        <LeadForm form={editForm} setForm={setEditForm} products={products} adsOpts={editFilteredAds} contentsOpts={editFilteredContents} profileOptions={profileOptions} />
        {editError && <p className="text-sm bg-red-50 text-red-600 border border-red-100 rounded-xl px-3.5 py-2.5 mt-4">{editError}</p>}
        <div className="flex gap-2 mt-6">
          <button onClick={saveEdit} disabled={savingEdit || !editForm.product_id}
            className="flex-1 bg-indigo-600 text-white py-2.5 rounded-xl text-sm font-semibold disabled:opacity-40 hover:bg-indigo-500 transition-colors">
            {savingEdit ? 'กำลังบันทึก...' : 'บันทึกการแก้ไข'}
          </button>
          <button onClick={() => setEditingRow(null)} className="px-5 py-2.5 text-sm text-slate-500 rounded-xl hover:bg-slate-100 transition-colors">ยกเลิก</button>
        </div>
      </Modal>
      </>
      )}
    </div>
  )
}
