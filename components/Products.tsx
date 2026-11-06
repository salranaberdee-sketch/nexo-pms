'use client'

import { useEffect, useState, useMemo } from 'react'
import { createClient } from '@/lib/supabase'
import { useCan } from '@/lib/profile-context'
import ProfilePicker from './ProfilePicker'
import SearchInput from './SearchInput'
import { TableSkeleton, EmptyState } from './TableState'
import StatusSelect from './StatusSelect'
import InlinePersonPicker, { type ProfileOption } from './InlinePersonPicker'
import { showToast } from './Toast'
import Modal, { Field, ConfirmModal } from './Modal'

const STATUS_OPTIONS = ['กำลังพัฒนา', 'เตรียมเปิดตัว', 'เปิดขาย', 'หยุดขาย']

const statusStyle: Record<string, string> = {
  'เปิดขาย':       'bg-emerald-50 text-emerald-700',
  'เตรียมเปิดตัว': 'bg-amber-50 text-amber-700',
  'กำลังพัฒนา':   'bg-blue-50 text-blue-700',
  'หยุดขาย':       'bg-slate-100 text-slate-400',
}

const PID_RE = /^[A-Z]+-[A-Z]+-\d+$/

const EMPTY_FORM = {
  product_id: '', name: '', business_type: '', product_type: '',
  brand: '', owner: '', owner_id: '', status: 'กำลังพัฒนา', notes: '',
}

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
function IconTrash() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/><path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/>
    </svg>
  )
}
function IconCopy() {
  return (
    <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="9" y="9" width="13" height="13" rx="2" /><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/>
    </svg>
  )
}

export default function Products() {
  const [products, setProducts]             = useState<any[]>([])
  const [profileOptions, setProfileOptions] = useState<ProfileOption[]>([])
  const [loading, setLoading]               = useState(true)
  const [loadError, setLoadError]           = useState('')
  const [showForm, setShowForm]             = useState(false)
  const [saving, setSaving]                 = useState(false)
  const [error, setError]                   = useState('')
  const [search, setSearch]                 = useState('')
  const [filterStatus, setFilterStatus]     = useState('all')
  const [editingId, setEditingId]           = useState<number | null>(null)
  const [confirmDelete, setConfirmDelete]   = useState<number | null>(null)
  const [deleting, setDeleting]             = useState(false)
  const [form, setForm]                     = useState({ ...EMPTY_FORM })
  const canInsert = useCan('insert', 'products')
  const canUpdate = useCan('update', 'products')
  const canDelete = useCan('delete', 'products')
  const supabase = createClient()

  async function load() {
    setLoadError('')
    const [p, pr] = await Promise.all([
      supabase
        .from('products')
        .select('id, product_id, name, business_type, product_type, brand, owner, owner_id, status, notes')
        .order('created_at', { ascending: false }),
      supabase.from('profiles').select('id, name, role').eq('approval_status', 'approved').order('name'),
    ])
    if (p.error) { setLoadError(p.error.message); setLoading(false); return }
    setProducts(p.data || [])
    setProfileOptions(pr.data || [])
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  function resetForm() { setForm({ ...EMPTY_FORM }); setEditingId(null); setError('') }

  function openAdd() { resetForm(); setShowForm(true) }

  function startEdit(p: any) {
    setEditingId(p.id)
    setForm({ product_id: p.product_id || '', name: p.name || '', business_type: p.business_type || '',
      product_type: p.product_type || '', brand: p.brand || '', owner: p.owner || '',
      owner_id: p.owner_id || '', status: p.status || 'กำลังพัฒนา', notes: p.notes || '' })
    setError('')
    setShowForm(true)
  }

  async function save() {
    setSaving(true); setError('')
    if (!editingId && !PID_RE.test(form.product_id)) {
      setError('Product ID ต้องเป็นรูปแบบ XXX-YYY-NNN เช่น MED-PSY-002')
      setSaving(false); return
    }
    if (editingId) {
      const { error: updErr } = await supabase.from('products').update({
        name: form.name, business_type: form.business_type, product_type: form.product_type,
        brand: form.brand, owner: form.owner, owner_id: form.owner_id || null,
        status: form.status, notes: form.notes,
      }).eq('id', editingId)
      if (updErr) { setError(updErr.message); setSaving(false); return }
      showToast('บันทึกการแก้ไขแล้ว')
    } else {
      const { error: insErr } = await supabase.from('products').insert([{ ...form, owner_id: form.owner_id || null }])
      if (insErr) { setError(insErr.message); setSaving(false); return }
      showToast('เพิ่มสินค้าแล้ว')
    }
    setShowForm(false); resetForm(); await load(); setSaving(false)
  }

  async function deleteRow(id: number) {
    setDeleting(true)
    const { error: delErr } = await supabase.from('products').delete().eq('id', id)
    setDeleting(false)
    if (delErr) { showToast(delErr.message, 'error'); return }
    setConfirmDelete(null)
    setProducts(prev => prev.filter(p => p.id !== id))
    showToast('ลบสินค้าแล้ว')
  }

  async function updateStatus(id: number, status: string) {
    const old = products.find(p => p.id === id)?.status
    setProducts(prev => prev.map(p => p.id === id ? { ...p, status } : p))
    const { error: updErr } = await supabase.from('products').update({ status }).eq('id', id)
    if (updErr) {
      showToast(updErr.message, 'error')
      setProducts(prev => prev.map(p => p.id === id ? { ...p, status: old } : p))
    }
  }

  async function updateOwner(id: number, owner_id: string, owner: string) {
    setProducts(prev => prev.map(p => p.id === id ? { ...p, owner_id, owner } : p))
    const { error: updErr } = await supabase.from('products').update({ owner_id: owner_id || null, owner }).eq('id', id)
    if (updErr) { showToast(updErr.message, 'error'); await load() }
  }

  function copyId(pid: string) {
    navigator.clipboard.writeText(pid).then(() => showToast(`คัดลอก ${pid} แล้ว`))
  }

  const pidInvalid = !editingId && form.product_id !== '' && !PID_RE.test(form.product_id)

  const countByStatus = useMemo(
    () => STATUS_OPTIONS.reduce((acc, s) => ({ ...acc, [s]: products.filter(p => p.status === s).length }), {} as Record<string, number>),
    [products],
  )

  const filtered = useMemo(() => {
    let list = filterStatus === 'all' ? products : products.filter(p => p.status === filterStatus)
    if (!search) return list
    const q = search.toLowerCase()
    return list.filter(p =>
      (p.product_id || '').toLowerCase().includes(q) || (p.name || '').toLowerCase().includes(q)
      || (p.brand || '').toLowerCase().includes(q) || (p.owner || '').toLowerCase().includes(q),
    )
  }, [products, search, filterStatus])

  const deleteTarget = confirmDelete !== null ? products.find(p => p.id === confirmDelete) : null
  const headers = ['Product ID', 'ชื่อสินค้า', 'ประเภท', 'แบรนด์', 'ผู้รับผิดชอบ', 'สถานะ', 'หมายเหตุ', '']

  return (
    <div className="p-6 max-w-screen-xl mx-auto space-y-5">

      {/* Page header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-slate-900">Products</h1>
          <p className="text-sm text-slate-400 mt-0.5">จัดการ Product ID และข้อมูลสินค้า</p>
        </div>
        {canInsert && (
          <button onClick={openAdd}
            className="flex items-center gap-2 bg-indigo-600 text-white px-5 py-2.5 rounded-xl text-sm font-medium hover:bg-indigo-500 transition-colors shadow-sm">
            <IconPlus />เพิ่มสินค้า
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
          ทั้งหมด <span className="ml-1 opacity-60">{products.length}</span>
        </button>
        {STATUS_OPTIONS.map(s => (
          <button key={s} onClick={() => setFilterStatus(filterStatus === s ? 'all' : s)}
            className={`px-3.5 py-1.5 rounded-lg text-sm font-medium transition-colors border
              ${filterStatus === s ? statusStyle[s] + ' border-current/20' : 'bg-white border-slate-200 text-slate-500 hover:bg-slate-50'}`}>
            {s} <span className="ml-1 tabular-nums opacity-60">{countByStatus[s] || 0}</span>
          </button>
        ))}
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl border border-slate-100 overflow-hidden shadow-sm">
        <div className="px-5 py-3.5 border-b border-slate-100 flex items-center justify-between gap-3">
          <SearchInput value={search} onChange={setSearch} placeholder="ค้นหา Product ID, ชื่อ, แบรนด์, ผู้รับผิดชอบ..." />
          <span className="text-xs text-slate-400 whitespace-nowrap">{filtered.length} / {products.length} รายการ</span>
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
                <EmptyState message="ยังไม่มี Product ที่ตรงเงื่อนไข" />
              ) : filtered.map(p => (
                <tr key={p.id} className="border-b border-slate-100/60 hover:bg-indigo-50/20 transition-colors last:border-0 group">
                  {/* Product ID + copy */}
                  <td className="px-5 py-4">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-xs font-medium text-slate-500">{p.product_id}</span>
                      <button onClick={() => copyId(p.product_id)} title="คัดลอก"
                        className="opacity-0 group-hover:opacity-100 transition-opacity text-slate-300 hover:text-indigo-500 p-0.5 rounded">
                        <IconCopy />
                      </button>
                    </div>
                  </td>
                  <td className="px-5 py-4 font-semibold text-slate-900 max-w-[200px] truncate" title={p.name}>{p.name}</td>
                  <td className="px-5 py-4 text-sm text-slate-500">{p.product_type}</td>
                  <td className="px-5 py-4 text-sm text-slate-500">{p.brand}</td>
                  <td className="px-5 py-4">
                    <InlinePersonPicker value={p.owner_id || ''} display={p.owner || ''}
                      profiles={profileOptions} disabled={!canUpdate}
                      onChange={(id, name) => updateOwner(p.id, id, name)} />
                  </td>
                  <td className="px-5 py-4">
                    <StatusSelect value={p.status} options={STATUS_OPTIONS} styleMap={statusStyle}
                      disabled={!canUpdate} onChange={v => updateStatus(p.id, v)} />
                  </td>
                  <td className="px-5 py-4 text-sm text-slate-400 max-w-[180px] truncate" title={p.notes || ''}>{p.notes || '—'}</td>
                  {/* Action buttons — always visible, sized properly */}
                  <td className="px-5 py-4 whitespace-nowrap">
                    <div className="flex items-center gap-1">
                      {canUpdate && (
                        <button onClick={() => startEdit(p)}
                          title="แก้ไข"
                          className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-600 bg-slate-100 hover:bg-indigo-100 hover:text-indigo-700 rounded-lg transition-colors">
                          <IconPencil />แก้ไข
                        </button>
                      )}
                      {canDelete && (
                        <button onClick={() => setConfirmDelete(p.id)}
                          title="ลบ"
                          className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-400 hover:bg-red-50 hover:text-red-600 rounded-lg transition-colors">
                          <IconTrash />ลบ
                        </button>
                      )}
                      {!canUpdate && !canDelete && <span className="text-xs text-slate-300">—</span>}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add / Edit Modal */}
      <Modal
        open={showForm}
        onClose={() => { setShowForm(false); resetForm() }}
        title={editingId ? 'แก้ไขสินค้า' : 'เพิ่มสินค้าใหม่'}
        width="max-w-xl"
      >
        <div className="grid grid-cols-2 gap-4">
          <Field label="Product ID" hint="รูปแบบ XXX-YYY-NNN" required={!editingId}>
            <input
              placeholder="เช่น MED-PSY-002"
              value={form.product_id}
              disabled={!!editingId}
              onChange={e => setForm({ ...form, product_id: e.target.value })}
              className={`${inputCls} ${editingId ? 'bg-slate-50 text-slate-400 cursor-not-allowed' : ''} ${pidInvalid ? 'border-red-300 focus:ring-red-400' : ''}`}
            />
          </Field>
          <Field label="ชื่อสินค้า" required>
            <input placeholder="ชื่อสินค้า" value={form.name}
              onChange={e => setForm({ ...form, name: e.target.value })}
              className={inputCls} />
          </Field>
          <Field label="ประเภทธุรกิจ">
            <input placeholder="เช่น การศึกษา" value={form.business_type}
              onChange={e => setForm({ ...form, business_type: e.target.value })}
              className={inputCls} />
          </Field>
          <Field label="ประเภทสินค้า">
            <input placeholder="เช่น หลักสูตร" value={form.product_type}
              onChange={e => setForm({ ...form, product_type: e.target.value })}
              className={inputCls} />
          </Field>
          <Field label="แบรนด์">
            <input placeholder="เช่น REBORN" value={form.brand}
              onChange={e => setForm({ ...form, brand: e.target.value })}
              className={inputCls} />
          </Field>
          <Field label="ผู้รับผิดชอบ">
            <ProfilePicker value={form.owner_id} profiles={profileOptions}
              onChange={(id, name) => setForm({ ...form, owner_id: id, owner: name })} placeholder="เลือกผู้รับผิดชอบ" />
          </Field>
          <Field label="สถานะ">
            <select value={form.status} onChange={e => setForm({ ...form, status: e.target.value })}
              className={selectCls}>
              {STATUS_OPTIONS.map(s => <option key={s}>{s}</option>)}
            </select>
          </Field>
          <Field label="หมายเหตุ">
            <input placeholder="หมายเหตุเพิ่มเติม" value={form.notes}
              onChange={e => setForm({ ...form, notes: e.target.value })}
              className={inputCls} />
          </Field>
        </div>
        {error && <p className="text-sm bg-red-50 text-red-600 border border-red-100 rounded-xl px-3.5 py-2.5 mt-4">{error}</p>}
        <div className="flex gap-2 mt-6">
          <button onClick={save}
            disabled={saving || (!editingId && (!form.product_id || !form.name)) || (!!editingId && !form.name)}
            className="flex-1 bg-indigo-600 text-white py-2.5 rounded-xl text-sm font-semibold disabled:opacity-40 hover:bg-indigo-500 transition-colors">
            {saving ? 'กำลังบันทึก...' : editingId ? 'บันทึกการแก้ไข' : 'บันทึก'}
          </button>
          <button onClick={() => { setShowForm(false); resetForm() }}
            className="px-5 py-2.5 text-sm text-slate-500 rounded-xl hover:bg-slate-100 transition-colors">
            ยกเลิก
          </button>
        </div>
      </Modal>

      {/* Delete confirm modal */}
      <ConfirmModal
        open={confirmDelete !== null}
        onClose={() => setConfirmDelete(null)}
        onConfirm={() => deleteRow(confirmDelete!)}
        loading={deleting}
        title="ยืนยันลบสินค้า"
        message={
          <>
            ลบ <strong>{deleteTarget?.name}</strong> ({deleteTarget?.product_id})?
            <br />
            <span className="text-red-500">ระวัง: จะลบ Content, Ads และ Sales ที่อ้างอิงทั้งหมดด้วย (CASCADE)</span>
          </>
        }
      />
    </div>
  )
}
