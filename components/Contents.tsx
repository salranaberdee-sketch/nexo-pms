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

const STATUSES = ['รอผลิต', 'ผลิตอยู่', 'รออนุมัติ', 'อนุมัติแล้ว', 'กำหนดโพสต์', 'โพสต์แล้ว']
const TYPES    = ['GRAPHIC', 'VIDEO', 'COPY']

const statusStyle: Record<string, string> = {
  'รอผลิต':       'bg-gray-100 text-gray-500',
  'ผลิตอยู่':      'bg-blue-50 text-blue-700',
  'รออนุมัติ':    'bg-amber-50 text-amber-700',
  'อนุมัติแล้ว':  'bg-purple-50 text-purple-700',
  'กำหนดโพสต์':  'bg-orange-50 text-orange-700',
  'โพสต์แล้ว':   'bg-green-50 text-green-700',
}

// Color per content type — makes the mix scannable at a glance
const typeStyle: Record<string, string> = {
  GRAPHIC: 'bg-blue-50 text-blue-600',
  VIDEO:   'bg-purple-50 text-purple-600',
  COPY:    'bg-orange-50 text-orange-600',
}
const typeLabel: Record<string, string> = { GRAPHIC: 'Graphic', VIDEO: 'Video', COPY: 'Copy' }

const DONE_STATUS = 'โพสต์แล้ว'
const TODAY = todayStr()
const TODAY_MS = new Date(TODAY).getTime()
const SOON_DAYS = 3 // warn when deadline is within this many days

function IconPlus() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
      <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
    </svg>
  )
}
function IconPencil() {
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
      <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
    </svg>
  )
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
  const [showForm, setShowForm]             = useState(false)
  const [saving, setSaving]                 = useState(false)
  const [error, setError]                   = useState('')
  // Inline edit state: id of row being edited + field values
  const [editingId, setEditingId]           = useState<number | null>(null)
  const [editForm, setEditForm]             = useState({ title: '', deadline: '', hook: '', format_size: '', objective: '' })
  const [savingEdit, setSavingEdit]         = useState(false)

  const [form, setForm] = useState({
    product_id: '', seq: '', type: 'GRAPHIC', title: '',
    objective: '', channel: 'Facebook', hook: '', format_size: '',
    assigned_to: '', assigned_to_id: '', deadline: '', status: 'รอผลิต',
  })
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

  // Sync URL param → filter (when navigating from Dashboard)
  useEffect(() => {
    const p = searchParams.get('product')
    if (p) setFilterProduct(p)
  }, [searchParams])

  async function save() {
    setSaving(true)
    setError('')
    const { error: insErr } = await supabase.from('contents').insert([{
      ...form,
      assigned_to_id: form.assigned_to_id || null,
      seq: Number(form.seq) || 1,
    }])
    if (insErr) { setError(insErr.message); setSaving(false); return }
    setShowForm(false)
    setForm({ product_id: '', seq: '', type: 'GRAPHIC', title: '', objective: '', channel: 'Facebook', hook: '', format_size: '', assigned_to: '', assigned_to_id: '', deadline: '', status: 'รอผลิต' })
    await load()
    setSaving(false)
    showToast('เพิ่ม Content แล้ว')
  }

  // Inline row edit — saves title, deadline, hook, format_size, objective
  function startEdit(c: any) {
    setEditingId(c.id)
    setEditForm({ title: c.title || '', deadline: c.deadline || '', hook: c.hook || '', format_size: c.format_size || '', objective: c.objective || '' })
  }
  async function saveEdit(id: number) {
    setSavingEdit(true)
    const { error: updErr } = await supabase.from('contents').update(editForm).eq('id', id)
    setSavingEdit(false)
    if (updErr) { setError(updErr.message); showToast(updErr.message, 'error'); return }
    setContents(prev => prev.map(c => c.id === id ? { ...c, ...editForm } : c))
    setEditingId(null)
    showToast('บันทึกแล้ว')
  }

  async function updateStatus(id: number, status: string) {
    const old = contents.find(c => c.id === id)?.status
    setContents(prev => prev.map(c => c.id === id ? { ...c, status } : c))
    const { error: updErr } = await supabase.from('contents').update({ status }).eq('id', id)
    if (updErr) {
      setError(updErr.message)
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
      setError(updErr.message)
      showToast(updErr.message, 'error')
      setContents(prev => prev.map(c => c.id === id ? { ...c, assigned_to_id: old?.assigned_to_id, assigned_to: old?.assigned_to } : c))
    }
  }

  const suggestedSeq = useMemo(() => {
    if (!form.product_id) return 0
    const seqs = contents.filter(c => c.product_id === form.product_id).map(c => Number(c.seq) || 0)
    return seqs.length ? Math.max(0, ...seqs) + 1 : 1
  }, [form.product_id, contents])

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

  const headers = ['#', 'Product', 'ประเภท', 'ชื่อ Content', 'วัตถุประสงค์', 'Hook', 'Format', 'ผู้รับผิดชอบ', 'กำหนดส่ง', 'สถานะ', '']

  return (
    <div className="p-6 max-w-screen-xl mx-auto space-y-5">

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-semibold text-gray-900">Content</h1>
          <p className="text-sm text-gray-400 mt-0.5">ติดตามสถานะการผลิต Content ทุกชิ้น</p>
        </div>
        {canInsert && (
          <button onClick={() => setShowForm(v => !v)}
            className="flex items-center gap-1.5 bg-gray-900 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-gray-700 transition-colors">
            <IconPlus />เพิ่ม Content
          </button>
        )}
      </div>

      {loadError && (
        <div className="bg-red-50 border border-red-100 rounded-xl px-4 py-3 text-sm text-red-600">
          โหลดข้อมูลไม่สำเร็จ: {loadError}
          <button onClick={load} className="ml-3 underline text-red-500 hover:text-red-700">ลองใหม่</button>
        </div>
      )}
      {error && !showForm && (
        <p className="text-sm bg-red-50 text-red-600 border border-red-100 rounded-lg px-3.5 py-2.5">{error}</p>
      )}

      {/* Add form */}
      {showForm && (
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <h3 className="text-sm font-semibold text-gray-900 mb-4">เพิ่ม Content ใหม่</h3>
          <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
            <select value={form.product_id}
              onChange={e => {
                const pid = e.target.value
                setForm(f => ({ ...f, product_id: pid, seq: f.seq === '' && pid ? String(Math.max(0, ...contents.filter(c => c.product_id === pid).map(c => Number(c.seq) || 0)) + 1) : f.seq }))
              }}
              className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gray-900 bg-white">
              <option value="">เลือก Product *</option>
              {products.map(p => <option key={p.product_id} value={p.product_id}>{p.product_id} — {p.name}</option>)}
            </select>
            <div className="relative">
              <input type="number" placeholder="ลำดับชิ้น (seq)" value={form.seq}
                onChange={e => setForm({ ...form, seq: e.target.value })}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gray-900 placeholder:text-gray-400" />
              {form.product_id && form.seq === '' && suggestedSeq > 0 && (
                <button type="button" onClick={() => setForm({ ...form, seq: String(suggestedSeq) })}
                  className="absolute right-1.5 top-1/2 -translate-y-1/2 text-[10px] text-blue-600 bg-blue-50 px-1.5 py-0.5 rounded hover:bg-blue-100">
                  แนะนำ {suggestedSeq}
                </button>
              )}
            </div>
            <select value={form.type} onChange={e => setForm({ ...form, type: e.target.value })}
              className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gray-900 bg-white">
              {TYPES.map(t => <option key={t}>{t}</option>)}
            </select>
            <input placeholder="ชื่อ Content *" value={form.title}
              onChange={e => setForm({ ...form, title: e.target.value })}
              className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gray-900 placeholder:text-gray-400" />
            <input placeholder="วัตถุประสงค์" value={form.objective}
              onChange={e => setForm({ ...form, objective: e.target.value })}
              className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gray-900 placeholder:text-gray-400" />
            <input placeholder="ช่องทาง" value={form.channel}
              onChange={e => setForm({ ...form, channel: e.target.value })}
              className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gray-900 placeholder:text-gray-400" />
            <input placeholder="Hook" value={form.hook}
              onChange={e => setForm({ ...form, hook: e.target.value })}
              className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gray-900 placeholder:text-gray-400" />
            <input placeholder="Format/ขนาด" value={form.format_size}
              onChange={e => setForm({ ...form, format_size: e.target.value })}
              className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gray-900 placeholder:text-gray-400" />
            <ProfilePicker value={form.assigned_to_id} profiles={profileOptions}
              onChange={(id, name) => setForm({ ...form, assigned_to_id: id, assigned_to: name })}
              placeholder="มอบหมายให้" />
            <input type="date" value={form.deadline}
              onChange={e => setForm({ ...form, deadline: e.target.value })}
              className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gray-900" />
            <select value={form.status} onChange={e => setForm({ ...form, status: e.target.value })}
              className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gray-900 bg-white">
              {STATUSES.map(s => <option key={s}>{s}</option>)}
            </select>
          </div>
          {error && <p className="text-sm bg-red-50 text-red-600 border border-red-100 rounded-lg px-3.5 py-2.5 mt-3">{error}</p>}
          <div className="flex gap-2 mt-4">
            <button onClick={save} disabled={saving || !form.product_id || !form.title}
              className="bg-gray-900 text-white px-4 py-2 rounded-lg text-sm font-medium disabled:opacity-40 hover:bg-gray-700 transition-colors">
              {saving ? 'กำลังบันทึก...' : 'บันทึก'}
            </button>
            <button onClick={() => { setShowForm(false); setError('') }}
              className="text-sm text-gray-400 px-4 py-2 rounded-lg hover:bg-gray-100 transition-colors">ยกเลิก</button>
          </div>
        </div>
      )}

      {/* Status filter pills */}
      <div className="flex gap-2 flex-wrap">
        <button onClick={() => setFilterStatus('all')}
          className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors border
            ${filterStatus === 'all' ? 'bg-gray-900 text-white border-gray-900' : 'bg-white border-gray-200 text-gray-500 hover:bg-gray-50'}`}>
          ทั้งหมด <span className="ml-1 opacity-60">{contents.length}</span>
        </button>
        {STATUSES.map(s => (
          <button key={s} onClick={() => setFilterStatus(filterStatus === s ? 'all' : s)}
            className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors border
              ${filterStatus === s ? statusStyle[s] + ' border-current/20' : 'bg-white border-gray-200 text-gray-500 hover:bg-gray-50'}`}>
            {s} <span className="ml-1 tabular-nums opacity-60">{countByStatus[s] || 0}</span>
          </button>
        ))}
      </div>

      {/* Search + product filter */}
      <div className="flex gap-2 flex-wrap items-center">
        <SearchInput value={search} onChange={setSearch} placeholder="ค้นหาชื่อ, Hook, Product, ผู้รับผิดชอบ..." />
        <select value={filterProduct} onChange={e => setFilterProduct(e.target.value)}
          className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gray-900 bg-white text-gray-700">
          <option value="all">ทุก Product</option>
          {products.map(p => <option key={p.product_id} value={p.product_id}>{p.product_id}</option>)}
        </select>
        {hasFilters && (
          <button onClick={() => { setFilterProduct('all'); setFilterStatus('all'); setSearch('') }}
            className="text-xs text-gray-400 hover:text-gray-700 px-2 py-2 rounded-lg hover:bg-gray-100 transition-colors whitespace-nowrap">
            ล้างตัวกรอง ✕
          </button>
        )}
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
        <div className="px-5 py-3 border-b border-gray-100 flex items-center justify-between">
          <span className="text-xs text-gray-400">{filtered.length} / {contents.length} รายการ</span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100">
                {headers.map(h => (
                  <th key={h} className="text-left px-4 py-3 text-xs font-medium text-gray-400 whitespace-nowrap">{h}</th>
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
                const isEditing = editingId === c.id

                const rowBg = overdue ? 'bg-red-50/40' : soon ? 'bg-amber-50/40' : ''

                return (
                  <tr key={c.id} className={`border-b border-gray-50 hover:bg-gray-50 transition-colors last:border-0 ${rowBg}`}>
                    <td className="px-4 py-3 text-xs text-gray-400 tabular-nums">{c.seq}</td>
                    <td className="px-4 py-3 font-mono text-xs text-gray-400">{c.product_id}</td>
                    <td className="px-4 py-3">
                      <span className={`text-xs font-medium px-1.5 py-0.5 rounded ${typeStyle[c.type] || 'bg-gray-100 text-gray-500'}`}>
                        {typeLabel[c.type] || c.type}
                      </span>
                    </td>
                    {/* title — editable inline */}
                    <td className="px-4 py-3 font-medium text-gray-900 max-w-[180px]">
                      {isEditing ? (
                        <input value={editForm.title} onChange={e => setEditForm(f => ({ ...f, title: e.target.value }))}
                          className="w-full border border-gray-300 rounded px-2 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-gray-900" />
                      ) : (
                        <span className="truncate block" title={c.title}>{c.title}</span>
                      )}
                    </td>
                    {/* objective — editable inline */}
                    <td className="px-4 py-3 text-xs text-gray-400 max-w-[100px]">
                      {isEditing ? (
                        <input value={editForm.objective} onChange={e => setEditForm(f => ({ ...f, objective: e.target.value }))}
                          className="w-full border border-gray-300 rounded px-2 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-gray-900" />
                      ) : (
                        <span className="truncate block" title={c.objective || ''}>{c.objective}</span>
                      )}
                    </td>
                    {/* hook — editable inline */}
                    <td className="px-4 py-3 text-xs text-gray-400 max-w-[140px]">
                      {isEditing ? (
                        <input value={editForm.hook} onChange={e => setEditForm(f => ({ ...f, hook: e.target.value }))}
                          className="w-full border border-gray-300 rounded px-2 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-gray-900" />
                      ) : (
                        <span className="truncate block" title={c.hook || ''}>{c.hook}</span>
                      )}
                    </td>
                    {/* format_size — editable inline */}
                    <td className="px-4 py-3 text-xs text-gray-400 whitespace-nowrap">
                      {isEditing ? (
                        <input value={editForm.format_size} onChange={e => setEditForm(f => ({ ...f, format_size: e.target.value }))}
                          className="w-24 border border-gray-300 rounded px-2 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-gray-900" />
                      ) : c.format_size}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <InlinePersonPicker value={c.assigned_to_id || ''} display={c.assigned_to || ''}
                        profiles={profileOptions} disabled={!canUpdate}
                        onChange={(id, name) => updateAssignee(c.id, id, name)} />
                    </td>
                    {/* deadline — editable inline, with overdue/soon indicators */}
                    <td className="px-4 py-3 whitespace-nowrap">
                      {isEditing ? (
                        <input type="date" value={editForm.deadline} onChange={e => setEditForm(f => ({ ...f, deadline: e.target.value }))}
                          className="border border-gray-300 rounded px-2 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-gray-900" />
                      ) : c.deadline ? (
                        <div className="flex flex-col">
                          <span className={`text-xs ${overdue ? 'text-red-600 font-medium' : soon ? 'text-amber-600 font-medium' : 'text-gray-400'}`}>
                            {new Date(c.deadline).toLocaleDateString('th-TH', { day: '2-digit', month: 'short' })}
                          </span>
                          {overdue && <span className="text-[10px] text-red-500 font-medium">เลย {daysLate} วัน</span>}
                          {soon && <span className="text-[10px] text-amber-500 font-medium">อีก {daysUntil} วัน</span>}
                        </div>
                      ) : <span className="text-xs text-gray-300">—</span>}
                    </td>
                    <td className="px-4 py-3">
                      <StatusSelect value={c.status} options={STATUSES} styleMap={statusStyle}
                        disabled={!canUpdate} onChange={v => updateStatus(c.id, v)} />
                    </td>
                    {/* Edit / Save / Cancel */}
                    <td className="px-4 py-2 whitespace-nowrap">
                      {canUpdate && (
                        isEditing ? (
                          <div className="flex gap-1">
                            <button onClick={() => saveEdit(c.id)} disabled={savingEdit}
                              className="text-[11px] bg-gray-900 text-white px-2 py-1 rounded hover:bg-gray-700 transition-colors disabled:opacity-40">
                              {savingEdit ? '...' : 'บันทึก'}
                            </button>
                            <button onClick={() => setEditingId(null)}
                              className="text-[11px] text-gray-400 px-2 py-1 rounded hover:bg-gray-100 transition-colors">ยกเลิก</button>
                          </div>
                        ) : (
                          <button onClick={() => startEdit(c)}
                            className="text-gray-300 hover:text-gray-600 transition-colors p-1 rounded hover:bg-gray-100">
                            <IconPencil />
                          </button>
                        )
                      )}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
