'use client'

import { useEffect, useState, useMemo } from 'react'
import { useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase'
import { useCan } from '@/lib/profile-context'
import ProfilePicker from './ProfilePicker'
import SearchInput from './SearchInput'
import { TableSkeleton, EmptyState, todayStr } from './TableState'
import StatusSelect from './StatusSelect'
import InlinePersonPicker, { type ProfileOption } from './InlinePersonPicker'
import { showToast } from './Toast'
import Modal, { Field } from './Modal'

const STATUSES = ['รอผลิต', 'ผลิตอยู่', 'รออนุมัติ', 'อนุมัติแล้ว', 'กำหนดโพสต์', 'โพสต์แล้ว']
const TYPES    = ['GRAPHIC', 'VIDEO', 'COPY']

const statusStyle: Record<string, string> = {
  'รอผลิต':       'bg-slate-100 text-slate-500',
  'ผลิตอยู่':      'bg-blue-50 text-blue-700',
  'รออนุมัติ':    'bg-amber-50 text-amber-700',
  'อนุมัติแล้ว':  'bg-purple-50 text-purple-700',
  'กำหนดโพสต์':  'bg-orange-50 text-orange-700',
  'โพสต์แล้ว':   'bg-emerald-50 text-emerald-700',
}

const typeStyle: Record<string, string> = {
  GRAPHIC: 'bg-blue-50 text-blue-600',
  VIDEO:   'bg-purple-50 text-purple-600',
  COPY:    'bg-orange-50 text-orange-600',
}
const typeLabel: Record<string, string> = { GRAPHIC: 'Graphic', VIDEO: 'Video', COPY: 'Copy' }

const DONE_STATUS = 'โพสต์แล้ว'
const TODAY = todayStr()
const TODAY_MS = new Date(TODAY).getTime()
const SOON_DAYS = 3

// Shared input class
const inputCls = 'w-full border border-slate-200 rounded-xl px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 placeholder:text-slate-400 bg-white'
const selectCls = 'w-full border border-slate-200 rounded-xl px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white'

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

const EMPTY_ADD_FORM = {
  product_id: '', seq: '', type: 'GRAPHIC', title: '',
  objective: '', channel: 'Facebook', hook: '', format_size: '',
  assigned_to: '', assigned_to_id: '', deadline: '', status: 'รอผลิต',
}

const EMPTY_EDIT_FORM = {
  product_id: '', seq: '', type: 'GRAPHIC', title: '',
  objective: '', channel: '', hook: '', format_size: '',
  deadline: '', assigned_to: '', assigned_to_id: '', status: 'รอผลิต',
}

export default function Contents() {
  const searchParams = useSearchParams()
  const initialProduct = searchParams.get('product') || 'all'

  const [contents, setContents]             = useState<any[]>([])
  const [products, setProducts]             = useState<any[]>([])
  const [profileOptions, setProfileOptions] = useState<ProfileOption[]>([])
  const [filterProduct, setFilterProduct]   = useState(initialProduct)
  const [filterStatus, setFilterStatus]     = useState('all')
  const [search, setSearch]                 = useState('')
  const [loading, setLoading]               = useState(true)
  const [loadError, setLoadError]           = useState('')

  // Add modal
  const [showAdd, setShowAdd]   = useState(false)
  const [addForm, setAddForm]   = useState({ ...EMPTY_ADD_FORM })
  const [saving, setSaving]     = useState(false)
  const [addError, setAddError] = useState('')

  // Edit modal
  const [editingRow, setEditingRow] = useState<any | null>(null)
  const [editForm, setEditForm]     = useState({ ...EMPTY_EDIT_FORM })
  const [savingEdit, setSavingEdit] = useState(false)
  const [editError, setEditError]   = useState('')

  const canInsert = useCan('insert', 'contents')
  const canUpdate = useCan('update', 'contents')
  const supabase = createClient()

  async function load() {
    setLoadError('')
    const [c, p, pr] = await Promise.all([
      supabase
        .from('contents')
        .select('id, product_id, seq, type, title, objective, hook, format_size, assigned_to, assigned_to_id, deadline, status')
        .order('product_id').order('seq'),
      supabase.from('products').select('product_id, name'),
      supabase.from('profiles').select('id, name, role').eq('approval_status', 'approved').order('name'),
    ])
    if (c.error) { setLoadError(c.error.message); setLoading(false); return }
    setContents(c.data || [])
    setProducts(p.data || [])
    setProfileOptions(pr.data || [])
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  useEffect(() => {
    const p = searchParams.get('product')
    if (p) setFilterProduct(p)
  }, [searchParams])

  // ── Add ──────────────────────────────────────────────────────
  const suggestedSeq = useMemo(() => {
    if (!addForm.product_id) return 0
    const seqs = contents.filter(c => c.product_id === addForm.product_id).map(c => Number(c.seq) || 0)
    return seqs.length ? Math.max(0, ...seqs) + 1 : 1
  }, [addForm.product_id, contents])

  async function saveAdd() {
    setSaving(true); setAddError('')
    const { error: insErr } = await supabase.from('contents').insert([{
      ...addForm,
      assigned_to_id: addForm.assigned_to_id || null,
      seq: Number(addForm.seq) || suggestedSeq || 1,
    }])
    if (insErr) { setAddError(insErr.message); setSaving(false); return }
    setShowAdd(false)
    setAddForm({ ...EMPTY_ADD_FORM })
    await load()
    setSaving(false)
    showToast('เพิ่ม Content แล้ว')
  }

  // ── Edit ─────────────────────────────────────────────────────
  function openEdit(c: any) {
    setEditingRow(c)
    setEditForm({
      product_id:     c.product_id || '',
      seq:            String(c.seq ?? ''),
      type:           c.type || 'GRAPHIC',
      title:          c.title || '',
      objective:      c.objective || '',
      channel:        c.channel || '',
      hook:           c.hook || '',
      format_size:    c.format_size || '',
      deadline:       c.deadline || '',
      assigned_to:    c.assigned_to || '',
      assigned_to_id: c.assigned_to_id || '',
      status:         c.status || 'รอผลิต',
    })
    setEditError('')
  }

  async function saveEdit() {
    if (!editingRow) return
    setSavingEdit(true); setEditError('')
    const { error: updErr } = await supabase.from('contents').update({
      product_id:     editForm.product_id,
      seq:            Number(editForm.seq) || editingRow.seq,
      type:           editForm.type,
      title:          editForm.title,
      objective:      editForm.objective,
      channel:        editForm.channel,
      hook:           editForm.hook,
      format_size:    editForm.format_size,
      deadline:       editForm.deadline || null,
      assigned_to:    editForm.assigned_to,
      assigned_to_id: editForm.assigned_to_id || null,
      status:         editForm.status,
    }).eq('id', editingRow.id)
    setSavingEdit(false)
    if (updErr) { setEditError(updErr.message); showToast(updErr.message, 'error'); return }
    setContents(prev => prev.map(c => c.id === editingRow.id ? { ...c, ...editForm, seq: Number(editForm.seq) || editingRow.seq } : c))
    setEditingRow(null)
    showToast('บันทึกแล้ว')
  }

  // ── Status / assignee — quick inline updates ─────────────────
  async function updateStatus(id: number, status: string) {
    const old = contents.find(c => c.id === id)?.status
    setContents(prev => prev.map(c => c.id === id ? { ...c, status } : c))
    const { error: updErr } = await supabase.from('contents').update({ status }).eq('id', id)
    if (updErr) {
      setContents(prev => prev.map(c => c.id === id ? { ...c, status: old } : c))
      showToast(updErr.message, 'error')
    }
  }

  async function updateAssignee(id: number, assigned_to_id: string, assigned_to: string) {
    const old = contents.find(c => c.id === id)
    setContents(prev => prev.map(c => c.id === id ? { ...c, assigned_to_id, assigned_to } : c))
    const { error: updErr } = await supabase.from('contents').update({
      assigned_to_id: assigned_to_id || null, assigned_to,
    }).eq('id', id)
    if (updErr) {
      showToast(updErr.message, 'error')
      setContents(prev => prev.map(c => c.id === id ? { ...c, assigned_to_id: old?.assigned_to_id, assigned_to: old?.assigned_to } : c))
    }
  }

  // ── Filters ──────────────────────────────────────────────────
  const filtered = useMemo(() => contents.filter(c =>
    (filterProduct === 'all' || c.product_id === filterProduct) &&
    (filterStatus === 'all' || c.status === filterStatus) &&
    (search === '' || (() => {
      const q = search.toLowerCase()
      return (c.title || '').toLowerCase().includes(q)
        || (c.hook || '').toLowerCase().includes(q)
        || (c.product_id || '').toLowerCase().includes(q)
        || (c.assigned_to || '').toLowerCase().includes(q)
        || (c.objective || '').toLowerCase().includes(q)
    })()),
  ), [contents, filterProduct, filterStatus, search])

  const countByStatus = useMemo(
    () => STATUSES.reduce((acc, s) => ({ ...acc, [s]: contents.filter(c => c.status === s).length }), {} as Record<string, number>),
    [contents],
  )

  const hasFilters = filterProduct !== 'all' || filterStatus !== 'all' || search !== ''
  const headers = ['#', 'Product', 'ประเภท', 'ชื่อ Content', 'ผู้รับผิดชอบ', 'กำหนดส่ง', 'สถานะ', '']

  return (
    <div className="p-6 max-w-screen-xl mx-auto space-y-5">

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-slate-900">Content</h1>
          <p className="text-sm text-slate-400 mt-0.5">ติดตามสถานะการผลิต Content ทุกชิ้น</p>
        </div>
        {canInsert && (
          <button onClick={() => { setAddForm({ ...EMPTY_ADD_FORM }); setAddError(''); setShowAdd(true) }}
            className="flex items-center gap-2 bg-indigo-600 text-white px-5 py-2.5 rounded-xl text-sm font-medium hover:bg-indigo-500 transition-colors shadow-sm">
            <IconPlus />เพิ่ม Content
          </button>
        )}
      </div>

      {loadError && (
        <div className="bg-red-50 border border-red-100 rounded-2xl px-4 py-3 text-sm text-red-600">
          โหลดข้อมูลไม่สำเร็จ: {loadError}
          <button onClick={load} className="ml-3 underline text-red-500 hover:text-red-700">ลองใหม่</button>
        </div>
      )}

      {/* Status filter pills */}
      <div className="flex gap-2 flex-wrap">
        <button onClick={() => setFilterStatus('all')}
          className={`px-3.5 py-1.5 rounded-lg text-sm font-medium transition-colors border
            ${filterStatus === 'all' ? 'bg-indigo-600 text-white border-indigo-600' : 'bg-white border-slate-200 text-slate-500 hover:bg-slate-50'}`}>
          ทั้งหมด <span className="ml-1 opacity-60">{contents.length}</span>
        </button>
        {STATUSES.map(s => (
          <button key={s} onClick={() => setFilterStatus(filterStatus === s ? 'all' : s)}
            className={`px-3.5 py-1.5 rounded-lg text-sm font-medium transition-colors border
              ${filterStatus === s ? statusStyle[s] + ' border-current/20' : 'bg-white border-slate-200 text-slate-500 hover:bg-slate-50'}`}>
            {s} <span className="ml-1 tabular-nums opacity-60">{countByStatus[s] || 0}</span>
          </button>
        ))}
      </div>

      {/* Search + product filter */}
      <div className="flex gap-2 flex-wrap items-center">
        <SearchInput value={search} onChange={setSearch} placeholder="ค้นหาชื่อ, Hook, Product, ผู้รับผิดชอบ..." />
        <select value={filterProduct} onChange={e => setFilterProduct(e.target.value)}
          className="border border-slate-200 rounded-xl px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white text-slate-700">
          <option value="all">ทุก Product</option>
          {products.map(p => <option key={p.product_id} value={p.product_id}>{p.product_id} — {p.name}</option>)}
        </select>
        {hasFilters && (
          <button onClick={() => { setFilterProduct('all'); setFilterStatus('all'); setSearch('') }}
            className="text-sm text-slate-400 hover:text-slate-700 px-3 py-2 rounded-xl hover:bg-slate-100 transition-colors whitespace-nowrap">
            ล้างตัวกรอง ✕
          </button>
        )}
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl border border-slate-100 overflow-hidden shadow-sm">
        <div className="px-5 py-3.5 border-b border-slate-100 flex items-center justify-between">
          <span className="text-sm text-slate-400">{filtered.length} / {contents.length} รายการ</span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-100">
                {headers.map(h => (
                  <th key={h} className="text-left px-5 py-3.5 text-xs font-semibold text-slate-400 whitespace-nowrap uppercase tracking-wide">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <TableSkeleton cols={headers.length} />
              ) : filtered.length === 0 ? (
                <EmptyState message="ไม่พบ Content ที่ตรงเงื่อนไข" />
              ) : filtered.map(c => {
                const overdue = c.deadline && c.deadline < TODAY && c.status !== DONE_STATUS
                const daysUntil = c.deadline && c.status !== DONE_STATUS
                  ? Math.round((new Date(c.deadline).getTime() - TODAY_MS) / 86400000) : null
                const soon = !overdue && daysUntil !== null && daysUntil >= 0 && daysUntil <= SOON_DAYS
                const daysLate = overdue ? Math.round((TODAY_MS - new Date(c.deadline).getTime()) / 86400000) : 0
                const rowBg = overdue ? 'bg-red-50/40' : soon ? 'bg-amber-50/40' : ''

                return (
                  <tr key={c.id} className={`border-b border-slate-100/60 hover:bg-indigo-50/20 transition-colors last:border-0 ${rowBg}`}>
                    <td className="px-5 py-4 text-sm text-slate-400 tabular-nums font-medium">{c.seq}</td>
                    <td className="px-5 py-4">
                      <span className="font-mono text-xs font-medium bg-slate-100 text-slate-600 px-2 py-1 rounded-md">{c.product_id}</span>
                    </td>
                    <td className="px-5 py-4">
                      <span className={`text-xs font-semibold px-2 py-1 rounded-lg ${typeStyle[c.type] || 'bg-slate-100 text-slate-500'}`}>
                        {typeLabel[c.type] || c.type}
                      </span>
                    </td>
                    {/* Title — read only, click edit button to change */}
                    <td className="px-5 py-4 max-w-[220px]">
                      <span className="font-semibold text-slate-900 truncate block" title={c.title}>{c.title}</span>
                      {c.objective && <span className="text-xs text-slate-400 truncate block mt-0.5" title={c.objective}>{c.objective}</span>}
                    </td>
                    {/* Assignee — inline picker for quick reassign */}
                    <td className="px-5 py-4 whitespace-nowrap">
                      <InlinePersonPicker value={c.assigned_to_id || ''} display={c.assigned_to || ''}
                        profiles={profileOptions} disabled={!canUpdate}
                        onChange={(id, name) => updateAssignee(c.id, id, name)} />
                    </td>
                    {/* Deadline */}
                    <td className="px-5 py-4 whitespace-nowrap">
                      {c.deadline ? (
                        <div className="flex flex-col">
                          <span className={`text-sm ${overdue ? 'text-red-600 font-semibold' : soon ? 'text-amber-600 font-medium' : 'text-slate-500'}`}>
                            {new Date(c.deadline).toLocaleDateString('th-TH', { day: '2-digit', month: 'short' })}
                          </span>
                          {overdue && <span className="text-xs text-red-500 font-medium">เลย {daysLate} วัน</span>}
                          {soon && <span className="text-xs text-amber-500 font-medium">อีก {daysUntil} วัน</span>}
                        </div>
                      ) : <span className="text-sm text-slate-300">—</span>}
                    </td>
                    {/* Status — quick inline */}
                    <td className="px-5 py-4">
                      <StatusSelect value={c.status} options={STATUSES} styleMap={statusStyle}
                        disabled={!canUpdate} onChange={v => updateStatus(c.id, v)} />
                    </td>
                    {/* Edit button */}
                    <td className="px-5 py-4 whitespace-nowrap">
                      {canUpdate && (
                        <button onClick={() => openEdit(c)}
                          title="แก้ไข"
                          className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-600 bg-slate-100 hover:bg-indigo-100 hover:text-indigo-700 rounded-lg transition-colors">
                          <IconPencil />แก้ไข
                        </button>
                      )}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* ── ADD modal ──────────────────────────────────────────── */}
      <Modal open={showAdd} onClose={() => setShowAdd(false)} title="เพิ่ม Content ใหม่" width="max-w-2xl">
        <div className="grid grid-cols-2 gap-4">
          <Field label="Product" required>
            <select value={addForm.product_id}
              onChange={e => {
                const pid = e.target.value
                setAddForm(f => ({ ...f, product_id: pid }))
              }}
              className={selectCls}>
              <option value="">เลือก Product</option>
              {products.map(p => <option key={p.product_id} value={p.product_id}>{p.product_id} — {p.name}</option>)}
            </select>
          </Field>
          <Field label="ลำดับชิ้น (seq)" hint={addForm.product_id && suggestedSeq > 0 ? `แนะนำ: ${suggestedSeq}` : undefined}>
            <div className="flex gap-2">
              <input type="number" placeholder={String(suggestedSeq || 1)} value={addForm.seq}
                onChange={e => setAddForm({ ...addForm, seq: e.target.value })}
                className={inputCls} />
              {suggestedSeq > 0 && addForm.seq === '' && (
                <button type="button" onClick={() => setAddForm({ ...addForm, seq: String(suggestedSeq) })}
                  className="shrink-0 text-xs text-indigo-600 bg-indigo-50 px-3 py-2 rounded-xl hover:bg-indigo-100">
                  ใช้ {suggestedSeq}
                </button>
              )}
            </div>
          </Field>
          <Field label="ประเภท" required>
            <select value={addForm.type} onChange={e => setAddForm({ ...addForm, type: e.target.value })} className={selectCls}>
              {TYPES.map(t => <option key={t}>{t}</option>)}
            </select>
          </Field>
          <Field label="ชื่อ Content" required>
            <input placeholder="ชื่อ Content" value={addForm.title}
              onChange={e => setAddForm({ ...addForm, title: e.target.value })} className={inputCls} />
          </Field>
          <Field label="วัตถุประสงค์">
            <input placeholder="Awareness / Conversion / ฯลฯ" value={addForm.objective}
              onChange={e => setAddForm({ ...addForm, objective: e.target.value })} className={inputCls} />
          </Field>
          <Field label="ช่องทาง">
            <input placeholder="Facebook, Instagram ฯลฯ" value={addForm.channel}
              onChange={e => setAddForm({ ...addForm, channel: e.target.value })} className={inputCls} />
          </Field>
          <Field label="Hook">
            <input placeholder="Hook ของ Content" value={addForm.hook}
              onChange={e => setAddForm({ ...addForm, hook: e.target.value })} className={inputCls} />
          </Field>
          <Field label="Format / ขนาด">
            <input placeholder="เช่น 1:1 1080x1080" value={addForm.format_size}
              onChange={e => setAddForm({ ...addForm, format_size: e.target.value })} className={inputCls} />
          </Field>
          <Field label="มอบหมายให้">
            <ProfilePicker value={addForm.assigned_to_id} profiles={profileOptions}
              onChange={(id, name) => setAddForm({ ...addForm, assigned_to_id: id, assigned_to: name })}
              placeholder="เลือกผู้รับผิดชอบ" />
          </Field>
          <Field label="กำหนดส่ง">
            <input type="date" value={addForm.deadline}
              onChange={e => setAddForm({ ...addForm, deadline: e.target.value })} className={inputCls} />
          </Field>
          <Field label="สถานะ">
            <select value={addForm.status} onChange={e => setAddForm({ ...addForm, status: e.target.value })} className={selectCls}>
              {STATUSES.map(s => <option key={s}>{s}</option>)}
            </select>
          </Field>
        </div>
        {addError && <p className="text-sm bg-red-50 text-red-600 border border-red-100 rounded-xl px-3.5 py-2.5 mt-4">{addError}</p>}
        <div className="flex gap-2 mt-6">
          <button onClick={saveAdd} disabled={saving || !addForm.product_id || !addForm.title}
            className="flex-1 bg-indigo-600 text-white py-2.5 rounded-xl text-sm font-semibold disabled:opacity-40 hover:bg-indigo-500 transition-colors">
            {saving ? 'กำลังบันทึก...' : 'บันทึก'}
          </button>
          <button onClick={() => setShowAdd(false)}
            className="px-5 py-2.5 text-sm text-slate-500 rounded-xl hover:bg-slate-100 transition-colors">
            ยกเลิก
          </button>
        </div>
      </Modal>

      {/* ── EDIT modal ─────────────────────────────────────────── */}
      <Modal open={!!editingRow} onClose={() => setEditingRow(null)} title={`แก้ไข Content — ${editingRow?.product_id} #${editingRow?.seq}`} width="max-w-2xl">
        <div className="grid grid-cols-2 gap-4">
          <Field label="Product" required>
            <select value={editForm.product_id} onChange={e => setEditForm(f => ({ ...f, product_id: e.target.value }))} className={selectCls}>
              <option value="">เลือก Product</option>
              {products.map(p => <option key={p.product_id} value={p.product_id}>{p.product_id} — {p.name}</option>)}
            </select>
          </Field>
          <Field label="ลำดับชิ้น (seq)">
            <input type="number" value={editForm.seq} onChange={e => setEditForm(f => ({ ...f, seq: e.target.value }))} className={inputCls} />
          </Field>
          <Field label="ประเภท" required>
            <select value={editForm.type} onChange={e => setEditForm(f => ({ ...f, type: e.target.value }))} className={selectCls}>
              {TYPES.map(t => <option key={t}>{t}</option>)}
            </select>
          </Field>
          <Field label="ช่องทาง">
            <input placeholder="Facebook, Instagram ฯลฯ" value={editForm.channel} onChange={e => setEditForm(f => ({ ...f, channel: e.target.value }))} className={inputCls} />
          </Field>
          <div className="col-span-2">
            <Field label="ชื่อ Content" required>
              <input value={editForm.title} onChange={e => setEditForm(f => ({ ...f, title: e.target.value }))} className={inputCls} />
            </Field>
          </div>
          <Field label="วัตถุประสงค์">
            <input value={editForm.objective} onChange={e => setEditForm(f => ({ ...f, objective: e.target.value }))} className={inputCls} />
          </Field>
          <Field label="Hook">
            <input value={editForm.hook} onChange={e => setEditForm(f => ({ ...f, hook: e.target.value }))} className={inputCls} />
          </Field>
          <Field label="Format / ขนาด">
            <input value={editForm.format_size} onChange={e => setEditForm(f => ({ ...f, format_size: e.target.value }))} className={inputCls} />
          </Field>
          <Field label="กำหนดส่ง">
            <input type="date" value={editForm.deadline} onChange={e => setEditForm(f => ({ ...f, deadline: e.target.value }))} className={inputCls} />
          </Field>
          <Field label="มอบหมายให้">
            <ProfilePicker value={editForm.assigned_to_id} profiles={profileOptions}
              onChange={(id, name) => setEditForm(f => ({ ...f, assigned_to_id: id, assigned_to: name }))}
              placeholder="เลือกผู้รับผิดชอบ" />
          </Field>
          <Field label="สถานะ">
            <select value={editForm.status} onChange={e => setEditForm(f => ({ ...f, status: e.target.value }))} className={selectCls}>
              {STATUSES.map(s => <option key={s}>{s}</option>)}
            </select>
          </Field>
        </div>
        {editError && <p className="text-sm bg-red-50 text-red-600 border border-red-100 rounded-xl px-3.5 py-2.5 mt-4">{editError}</p>}
        <div className="flex gap-2 mt-6">
          <button onClick={saveEdit} disabled={savingEdit || !editForm.title || !editForm.product_id}
            className="flex-1 bg-indigo-600 text-white py-2.5 rounded-xl text-sm font-semibold disabled:opacity-40 hover:bg-indigo-500 transition-colors">
            {savingEdit ? 'กำลังบันทึก...' : 'บันทึกการแก้ไข'}
          </button>
          <button onClick={() => setEditingRow(null)}
            className="px-5 py-2.5 text-sm text-slate-500 rounded-xl hover:bg-slate-100 transition-colors">
            ยกเลิก
          </button>
        </div>
      </Modal>
    </div>
  )
}
