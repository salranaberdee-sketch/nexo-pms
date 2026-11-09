'use client'

import { useEffect, useState, useMemo } from 'react'
import { createClient } from '@/lib/supabase'
import { useCan } from '@/lib/profile-context'
import { showToast } from './Toast'
import Modal, { Field, ConfirmModal } from './Modal'
import { TableSkeleton, EmptyState } from './TableState'
import SearchInput from './SearchInput'

// ─── Types ─────────────────────────────────────────────────────────────────────

type BriefType = 'A' | 'B'

const BRIEF_TYPE_LABEL: Record<BriefType, string> = {
  A: 'คอร์ส / อบรม',
  B: 'สินค้า / บริการ',
}

const inputCls  = 'w-full border border-slate-200 rounded-xl px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 placeholder:text-slate-400 bg-white'
const selectCls = 'w-full border border-slate-200 rounded-xl px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white'
const textareaCls = inputCls + ' resize-none'

function IconPlus() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
      <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
    </svg>
  )
}
function IconPencil() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
      <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
    </svg>
  )
}
function IconTrash() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/>
      <path d="M10 11v6"/><path d="M14 11v6"/><path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/>
    </svg>
  )
}

// ─── Empty form factory ─────────────────────────────────────────────────────────

function emptyForm(briefType: BriefType = 'A') {
  return {
    product_id: '', brief_type: briefType as string,
    // shared fields
    topic: '', target_audience: '', problem: '', benefits: '', highlights: '',
    competitors: '', evidence: '', price: '', payment_method: '', contact_channel: '',
    format: '', schedule: '', deliverables: '',
    // type A only
    instructors: '', registration_period: '', registration_link: '',
    // type B only
    product_description: '', usage_method: '', warnings: '', legal_info: '',
    packages: '', delivery: '', warranty: '', order_method: '',
  }
}

// ─── Main Component ────────────────────────────────────────────────────────────

export default function ProductBriefs() {
  const [briefs, setBriefs]       = useState<any[]>([])
  const [products, setProducts]   = useState<any[]>([])
  const [loading, setLoading]     = useState(true)
  const [loadError, setLoadError] = useState('')
  const [search, setSearch]       = useState('')
  const [filterProduct, setFilterProduct] = useState('all')
  const [filterType, setFilterType]       = useState<'all' | 'A' | 'B'>('all')

  const [showAdd, setShowAdd]       = useState(false)
  const [addForm, setAddForm]       = useState(emptyForm())
  const [saving, setSaving]         = useState(false)
  const [addError, setAddError]     = useState('')

  const [editingRow, setEditingRow] = useState<any | null>(null)
  const [editForm, setEditForm]     = useState(emptyForm())
  const [savingEdit, setSavingEdit] = useState(false)
  const [editError, setEditError]   = useState('')

  const [confirmDelete, setConfirmDelete] = useState<number | null>(null)
  const [deleting, setDeleting]           = useState(false)

  const canInsert = useCan('insert', 'product_briefs')
  const canUpdate = useCan('update', 'product_briefs')
  const canDelete = useCan('delete', 'product_briefs')
  const supabase  = createClient()

  async function load() {
    setLoadError('')
    const [b, p] = await Promise.all([
      supabase
        .from('product_briefs')
        .select('id, product_id, brief_type, topic, target_audience, problem, benefits, highlights, competitors, evidence, instructors, format, schedule, deliverables, registration_period, price, payment_method, registration_link, contact_channel, product_description, usage_method, warnings, legal_info, packages, delivery, warranty, order_method, created_at, updated_at')
        .order('product_id').order('brief_type'),
      supabase.from('products').select('product_id, name, brand'),
    ])
    if (b.error) { setLoadError(b.error.message); setLoading(false); return }
    setBriefs(b.data || [])
    setProducts(p.data || [])
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  // ── Add ──────────────────────────────────────────────────────
  async function saveAdd() {
    setSaving(true); setAddError('')
    if (!addForm.product_id) { setAddError('กรุณาเลือก Product'); setSaving(false); return }

    const { error: insErr } = await supabase.from('product_briefs').insert([buildPayload(addForm)])
    if (insErr) { setAddError(insErr.message); setSaving(false); return }
    setShowAdd(false)
    setAddForm(emptyForm())
    await load()
    setSaving(false)
    showToast('เพิ่ม Brief แล้ว')
  }

  // ── Edit ─────────────────────────────────────────────────────
  function openEdit(row: any) {
    setEditingRow(row)
    setEditForm({
      product_id: row.product_id || '',
      brief_type: row.brief_type || 'A',
      topic: row.topic || '',
      target_audience: row.target_audience || '',
      problem: row.problem || '',
      benefits: row.benefits || '',
      highlights: row.highlights || '',
      competitors: row.competitors || '',
      evidence: row.evidence || '',
      price: row.price || '',
      payment_method: row.payment_method || '',
      contact_channel: row.contact_channel || '',
      format: row.format || '',
      schedule: row.schedule || '',
      deliverables: row.deliverables || '',
      instructors: row.instructors || '',
      registration_period: row.registration_period || '',
      registration_link: row.registration_link || '',
      product_description: row.product_description || '',
      usage_method: row.usage_method || '',
      warnings: row.warnings || '',
      legal_info: row.legal_info || '',
      packages: row.packages || '',
      delivery: row.delivery || '',
      warranty: row.warranty || '',
      order_method: row.order_method || '',
    })
    setEditError('')
  }

  async function saveEdit() {
    if (!editingRow) return
    setSavingEdit(true); setEditError('')
    const { error: updErr } = await supabase
      .from('product_briefs')
      .update(buildPayload(editForm))
      .eq('id', editingRow.id)
    if (updErr) { setEditError(updErr.message); setSavingEdit(false); return }
    setSavingEdit(false)
    setEditingRow(null)
    await load()
    showToast('บันทึก Brief แล้ว')
  }

  // ── Delete ────────────────────────────────────────────────────
  async function deleteRow(id: number) {
    setDeleting(true)
    const { error: delErr } = await supabase.from('product_briefs').delete().eq('id', id)
    setDeleting(false)
    if (delErr) { showToast(delErr.message, 'error'); return }
    setConfirmDelete(null)
    setBriefs(prev => prev.filter(b => b.id !== id))
    showToast('ลบ Brief แล้ว')
  }

  // ── Helper: build DB payload (omit empty strings → null) ─────
  function buildPayload(form: typeof addForm) {
    const n = (v: string) => v || null
    return {
      product_id:          form.product_id,
      brief_type:          form.brief_type,
      topic:               n(form.topic),
      target_audience:     n(form.target_audience),
      problem:             n(form.problem),
      benefits:            n(form.benefits),
      highlights:          n(form.highlights),
      competitors:         n(form.competitors),
      evidence:            n(form.evidence),
      price:               n(form.price),
      payment_method:      n(form.payment_method),
      contact_channel:     n(form.contact_channel),
      format:              n(form.format),
      schedule:            n(form.schedule),
      deliverables:        n(form.deliverables),
      ...(form.brief_type === 'A' ? {
        instructors:         n(form.instructors),
        registration_period: n(form.registration_period),
        registration_link:   n(form.registration_link),
      } : {
        product_description: n(form.product_description),
        usage_method:        n(form.usage_method),
        warnings:            n(form.warnings),
        legal_info:          n(form.legal_info),
        packages:            n(form.packages),
        delivery:            n(form.delivery),
        warranty:            n(form.warranty),
        order_method:        n(form.order_method),
      }),
    }
  }

  // ── Filters ───────────────────────────────────────────────────
  const productMap = useMemo(() => new Map(products.map(p => [p.product_id, p])), [products])
  const filtered = useMemo(() => {
    let list = briefs
    if (filterProduct !== 'all') list = list.filter(b => b.product_id === filterProduct)
    if (filterType !== 'all')    list = list.filter(b => b.brief_type === filterType)
    if (!search) return list
    const q = search.toLowerCase()
    return list.filter(b =>
      (b.product_id || '').toLowerCase().includes(q) ||
      (b.topic || '').toLowerCase().includes(q) ||
      (productMap.get(b.product_id)?.name || '').toLowerCase().includes(q),
    )
  }, [briefs, filterProduct, filterType, search, productMap])

  // ── Brief form (shared for add/edit) ─────────────────────────
  function BriefForm({ form, setForm }: { form: typeof addForm; setForm: (f: typeof addForm) => void }) {
    const isA = form.brief_type === 'A'
    return (
      <div className="space-y-5">
        {/* Product + type */}
        <div className="grid grid-cols-2 gap-4">
          <Field label="Product" required>
            <select value={form.product_id} onChange={e => setForm({ ...form, product_id: e.target.value })} className={selectCls}>
              <option value="">เลือก Product</option>
              {products.map(p => <option key={p.product_id} value={p.product_id}>{p.product_id} — {p.name}</option>)}
            </select>
          </Field>
          <Field label="ประเภท Brief" required>
            <select value={form.brief_type} onChange={e => setForm({ ...form, brief_type: e.target.value })} className={selectCls}>
              <option value="A">A — คอร์ส / อบรม</option>
              <option value="B">B — สินค้า / บริการ</option>
            </select>
          </Field>
        </div>

        {/* Shared fields */}
        <Section label="ข้อมูลสินค้า / บริการ">
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <Field label="หัวข้อ / ชื่อสินค้า">
                <input value={form.topic} onChange={e => setForm({ ...form, topic: e.target.value })} className={inputCls} placeholder="เช่น คอร์สจิตวิทยาเด็ก รุ่น 1" />
              </Field>
            </div>
            <Field label="กลุ่มเป้าหมาย">
              <textarea rows={2} value={form.target_audience} onChange={e => setForm({ ...form, target_audience: e.target.value })} className={textareaCls} placeholder="คนไข้, ผู้ปกครอง, นักจิตวิทยา..." />
            </Field>
            <Field label="ปัญหาที่แก้ได้">
              <textarea rows={2} value={form.problem} onChange={e => setForm({ ...form, problem: e.target.value })} className={textareaCls} placeholder="ปัญหาหลักที่ target มี..." />
            </Field>
            <Field label="ประโยชน์ที่ได้รับ">
              <textarea rows={2} value={form.benefits} onChange={e => setForm({ ...form, benefits: e.target.value })} className={textareaCls} />
            </Field>
            <Field label="จุดเด่น">
              <textarea rows={2} value={form.highlights} onChange={e => setForm({ ...form, highlights: e.target.value })} className={textareaCls} />
            </Field>
            <Field label="คู่แข่ง">
              <textarea rows={2} value={form.competitors} onChange={e => setForm({ ...form, competitors: e.target.value })} className={textareaCls} />
            </Field>
            <Field label="หลักฐาน / Social Proof">
              <textarea rows={2} value={form.evidence} onChange={e => setForm({ ...form, evidence: e.target.value })} className={textareaCls} />
            </Field>
          </div>
        </Section>

        {/* Type A specific */}
        {isA && (
          <Section label="ข้อมูลคอร์ส / อบรม">
            <div className="grid grid-cols-2 gap-4">
              <Field label="วิทยากร / ผู้สอน">
                <textarea rows={2} value={form.instructors} onChange={e => setForm({ ...form, instructors: e.target.value })} className={textareaCls} />
              </Field>
              <Field label="รูปแบบ / format">
                <input value={form.format} onChange={e => setForm({ ...form, format: e.target.value })} className={inputCls} placeholder="เช่น Online / 12 ชม. / 4 สัปดาห์" />
              </Field>
              <Field label="ตารางเรียน">
                <textarea rows={2} value={form.schedule} onChange={e => setForm({ ...form, schedule: e.target.value })} className={textareaCls} />
              </Field>
              <Field label="สิ่งที่ได้รับ">
                <textarea rows={2} value={form.deliverables} onChange={e => setForm({ ...form, deliverables: e.target.value })} className={textareaCls} placeholder="ใบประกาศ, วัสดุ, เอกสาร..." />
              </Field>
              <Field label="ช่วงเวลารับสมัคร">
                <input value={form.registration_period} onChange={e => setForm({ ...form, registration_period: e.target.value })} className={inputCls} />
              </Field>
              <Field label="ลิงก์สมัคร">
                <input value={form.registration_link} onChange={e => setForm({ ...form, registration_link: e.target.value })} className={inputCls} placeholder="https://..." />
              </Field>
            </div>
          </Section>
        )}

        {/* Type B specific */}
        {!isA && (
          <Section label="ข้อมูลสินค้า / บริการ">
            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2">
                <Field label="คำอธิบายสินค้า">
                  <textarea rows={3} value={form.product_description} onChange={e => setForm({ ...form, product_description: e.target.value })} className={textareaCls} />
                </Field>
              </div>
              <Field label="วิธีใช้">
                <textarea rows={2} value={form.usage_method} onChange={e => setForm({ ...form, usage_method: e.target.value })} className={textareaCls} />
              </Field>
              <Field label="ข้อควรระวัง">
                <textarea rows={2} value={form.warnings} onChange={e => setForm({ ...form, warnings: e.target.value })} className={textareaCls} />
              </Field>
              <Field label="ข้อมูลทางกฎหมาย / อย.">
                <input value={form.legal_info} onChange={e => setForm({ ...form, legal_info: e.target.value })} className={inputCls} />
              </Field>
              <Field label="แพ็กเกจ / ขนาด">
                <textarea rows={2} value={form.packages} onChange={e => setForm({ ...form, packages: e.target.value })} className={textareaCls} />
              </Field>
              <Field label="การจัดส่ง">
                <input value={form.delivery} onChange={e => setForm({ ...form, delivery: e.target.value })} className={inputCls} />
              </Field>
              <Field label="การรับประกัน">
                <input value={form.warranty} onChange={e => setForm({ ...form, warranty: e.target.value })} className={inputCls} />
              </Field>
              <Field label="วิธีสั่งซื้อ">
                <input value={form.order_method} onChange={e => setForm({ ...form, order_method: e.target.value })} className={inputCls} />
              </Field>
            </div>
          </Section>
        )}

        {/* Shared pricing */}
        <Section label="ราคาและการชำระเงิน">
          <div className="grid grid-cols-2 gap-4">
            <Field label="ราคา">
              <input value={form.price} onChange={e => setForm({ ...form, price: e.target.value })} className={inputCls} placeholder="เช่น 3,900 บาท / Early Bird 2,900 บาท" />
            </Field>
            <Field label="วิธีชำระเงิน">
              <input value={form.payment_method} onChange={e => setForm({ ...form, payment_method: e.target.value })} className={inputCls} placeholder="โอน, บัตรเครดิต, QR..." />
            </Field>
            <Field label="ช่องทางติดต่อ">
              <input value={form.contact_channel} onChange={e => setForm({ ...form, contact_channel: e.target.value })} className={inputCls} placeholder="LINE OA, inbox, โทร..." />
            </Field>
          </div>
        </Section>
      </div>
    )
  }

  return (
    <div className="p-6 space-y-5">

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-slate-900">Product Briefs</h1>
          <p className="text-sm text-slate-400 mt-0.5">ข้อมูลสินค้าสำหรับทีม Content และ Ads</p>
        </div>
        {canInsert && (
          <button
            onClick={() => { setAddForm(emptyForm()); setAddError(''); setShowAdd(true) }}
            className="flex items-center gap-2 bg-indigo-600 text-white px-5 py-2.5 rounded-xl text-sm font-medium hover:bg-indigo-500 transition-colors shadow-sm">
            <IconPlus />เพิ่ม Brief
          </button>
        )}
      </div>

      {loadError && (
        <div className="bg-red-50 border border-red-100 rounded-2xl px-4 py-3 text-sm text-red-600">
          โหลดข้อมูลไม่สำเร็จ: {loadError}
          <button onClick={load} className="ml-3 underline">ลองใหม่</button>
        </div>
      )}

      {/* Filters */}
      <div className="flex gap-2 flex-wrap items-center">
        <SearchInput value={search} onChange={setSearch} placeholder="ค้นหา brief, product..." />
        <select value={filterProduct} onChange={e => setFilterProduct(e.target.value)}
          className="border border-slate-200 rounded-xl px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white">
          <option value="all">ทุก Product</option>
          {products.map(p => <option key={p.product_id} value={p.product_id}>{p.product_id} — {p.name}</option>)}
        </select>
        <div className="flex gap-1">
          {(['all', 'A', 'B'] as const).map(t => (
            <button key={t} onClick={() => setFilterType(t)}
              className={`px-3.5 py-2 rounded-xl text-sm font-medium transition-colors border
                ${filterType === t ? 'bg-indigo-600 text-white border-indigo-600' : 'bg-white border-slate-200 text-slate-500 hover:bg-slate-50'}`}>
              {t === 'all' ? 'ทั้งหมด' : `Type ${t} — ${BRIEF_TYPE_LABEL[t]}`}
            </button>
          ))}
        </div>
      </div>

      {/* Cards grid */}
      {loading ? (
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm">
          <table className="w-full"><tbody><TableSkeleton cols={4} /></tbody></table>
        </div>
      ) : filtered.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-12">
          <EmptyState message={briefs.length === 0 ? 'ยังไม่มี Brief — กดเพิ่มเพื่อสร้าง' : 'ไม่พบ brief ที่ตรงกับ filter'} />
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4">
          {filtered.map(brief => {
            const product = productMap.get(brief.product_id)
            const isA = brief.brief_type === 'A'
            const filledCount = [
              brief.topic, brief.target_audience, brief.problem, brief.benefits,
              brief.highlights, brief.competitors, brief.evidence, brief.price,
            ].filter(Boolean).length
            const totalFields = 8
            const completePct = Math.round((filledCount / totalFields) * 100)

            return (
              <div key={brief.id} className="bg-white rounded-2xl border border-slate-100 shadow-sm hover:shadow-md transition-shadow">
                {/* Card header */}
                <div className="px-5 pt-5 pb-3 border-b border-slate-50">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-mono text-xs font-medium bg-slate-100 text-slate-600 px-2 py-0.5 rounded-md">{brief.product_id}</span>
                        <span className={`text-xs font-semibold px-2 py-0.5 rounded-lg ${isA ? 'bg-blue-50 text-blue-700' : 'bg-purple-50 text-purple-700'}`}>
                          {BRIEF_TYPE_LABEL[brief.brief_type as BriefType]}
                        </span>
                      </div>
                      <p className="text-sm font-semibold text-slate-900 mt-1.5 truncate">{product?.name || brief.product_id}</p>
                      {brief.topic && <p className="text-xs text-slate-500 mt-0.5 truncate">{brief.topic}</p>}
                    </div>
                    {/* Actions */}
                    <div className="flex gap-1 shrink-0">
                      {canUpdate && (
                        <button onClick={() => openEdit(brief)}
                          className="p-1.5 text-slate-300 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors">
                          <IconPencil />
                        </button>
                      )}
                      {canDelete && (
                        <button onClick={() => setConfirmDelete(brief.id)}
                          className="p-1.5 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors">
                          <IconTrash />
                        </button>
                      )}
                    </div>
                  </div>
                  {/* Completeness bar */}
                  <div className="mt-3">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-[10px] text-slate-400">ความครบถ้วน</span>
                      <span className="text-[10px] font-semibold text-slate-500">{completePct}%</span>
                    </div>
                    <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all ${completePct >= 80 ? 'bg-emerald-500' : completePct >= 50 ? 'bg-amber-400' : 'bg-blue-500'}`}
                        style={{ width: `${completePct}%` }}
                      />
                    </div>
                  </div>
                </div>

                {/* Key info preview */}
                <div className="px-5 py-4 space-y-2">
                  {brief.target_audience && (
                    <InfoRow label="กลุ่มเป้าหมาย" value={brief.target_audience} />
                  )}
                  {brief.price && (
                    <InfoRow label="ราคา" value={brief.price} />
                  )}
                  {brief.contact_channel && (
                    <InfoRow label="ติดต่อ" value={brief.contact_channel} />
                  )}
                  {!brief.target_audience && !brief.price && !brief.contact_channel && (
                    <p className="text-xs text-slate-400 italic">ยังไม่มีข้อมูล — กดแก้ไขเพื่อเพิ่ม</p>
                  )}
                </div>

                {/* Footer */}
                <div className="px-5 pb-4 text-[10px] text-slate-400">
                  อัปเดต {brief.updated_at ? new Date(brief.updated_at).toLocaleDateString('th-TH', { day: '2-digit', month: 'short', year: 'numeric' }) : '—'}
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* ── DELETE confirm ─────────────────────────────────────── */}
      <ConfirmModal
        open={confirmDelete !== null}
        onClose={() => setConfirmDelete(null)}
        onConfirm={() => deleteRow(confirmDelete!)}
        loading={deleting}
        title="ยืนยันลบ Brief"
        message="Brief นี้จะถูกลบถาวร"
      />

      {/* ── ADD modal ──────────────────────────────────────────── */}
      <Modal open={showAdd} onClose={() => setShowAdd(false)} title="เพิ่ม Product Brief" width="max-w-3xl">
        <BriefForm form={addForm} setForm={setAddForm} />
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
      <Modal open={!!editingRow} onClose={() => setEditingRow(null)}
        title={`แก้ไข Brief — ${editingRow?.product_id} (${editingRow?.brief_type === 'A' ? 'คอร์ส' : 'สินค้า'})`}
        width="max-w-3xl">
        <BriefForm form={editForm} setForm={setEditForm} />
        {editError && <p className="text-sm bg-red-50 text-red-600 border border-red-100 rounded-xl px-3.5 py-2.5 mt-4">{editError}</p>}
        <div className="flex gap-2 mt-6">
          <button onClick={saveEdit} disabled={savingEdit}
            className="flex-1 bg-indigo-600 text-white py-2.5 rounded-xl text-sm font-semibold disabled:opacity-40 hover:bg-indigo-500 transition-colors">
            {savingEdit ? 'กำลังบันทึก...' : 'บันทึกการแก้ไข'}
          </button>
          <button onClick={() => setEditingRow(null)} className="px-5 py-2.5 text-sm text-slate-500 rounded-xl hover:bg-slate-100 transition-colors">ยกเลิก</button>
        </div>
      </Modal>
    </div>
  )
}

// ─── Sub-components ─────────────────────────────────────────────────────────────

function Section({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-3">{label}</p>
      {children}
    </div>
  )
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex gap-2 text-xs">
      <span className="text-slate-400 shrink-0 w-20">{label}</span>
      <span className="text-slate-700 line-clamp-2">{value}</span>
    </div>
  )
}
