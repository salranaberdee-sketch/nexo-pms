'use client'

import { useEffect, useState, useMemo } from 'react'
import { createClient } from '@/lib/supabase'
import { useCan } from '@/lib/profile-context'
import ProfilePicker from './ProfilePicker'
import SearchInput from './SearchInput'
import { TableSkeleton, EmptyState } from './TableState'
import InlinePersonPicker, { type ProfileOption } from './InlinePersonPicker'
import { showToast } from './Toast'
import Modal, { Field } from './Modal'

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

export default function Ads() {
  const [ads, setAds]               = useState<any[]>([])
  const [products, setProducts]     = useState<any[]>([])
  const [profileOptions, setProfileOptions] = useState<ProfileOption[]>([])
  const [loading, setLoading]       = useState(true)
  const [loadError, setLoadError]   = useState('')
  const [search, setSearch]         = useState('')
  const [filterMonth, setFilterMonth] = useState('all')

  // Add modal
  const [showAdd, setShowAdd] = useState(false)
  const [saving, setSaving]   = useState(false)
  const [addError, setAddError] = useState('')
  const [addForm, setAddForm] = useState({
    product_id: '', month: '', campaign_name: '', channel: 'Facebook',
    budget_approved: '', budget_allocated: '', content_ref: '',
    managed_by: '', managed_by_id: '', start_date: '', end_date: '', result_notes: '',
  })

  // Edit modal
  const [editingRow, setEditingRow] = useState<any | null>(null)
  const [savingEdit, setSavingEdit] = useState(false)
  const [editError, setEditError]   = useState('')
  const [editVal, setEditVal] = useState({ reach: '', clicks: '', leads: '', budget_spent: '', sales_amount: '', result_notes: '' })

  const canInsert = useCan('insert', 'ads')
  const canUpdate = useCan('update', 'ads')
  const supabase = createClient()

  async function load() {
    setLoadError('')
    const [a, p, pr] = await Promise.all([
      supabase
        .from('ads')
        .select('id, product_id, month, campaign_name, channel, managed_by, managed_by_id, budget_allocated, budget_spent, budget_total, budget_remaining, reach, clicks, leads, cpl, roas, sales_amount, result_notes')
        .order('month', { ascending: false }).order('product_id'),
      supabase.from('products').select('product_id, name'),
      supabase.from('profiles').select('id, name, role').eq('approval_status', 'approved').order('name'),
    ])
    if (a.error) { setLoadError(a.error.message); setLoading(false); return }
    setAds(a.data || [])
    setProducts(p.data || [])
    setProfileOptions(pr.data || [])
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  // ── Add ──────────────────────────────────────────────────────
  async function saveAdd() {
    setSaving(true); setAddError('')
    const { error: insErr } = await supabase.from('ads').insert([{
      product_id:      addForm.product_id,
      month:           addForm.month,
      campaign_name:   addForm.campaign_name,
      channel:         addForm.channel,
      budget_approved: Number(addForm.budget_approved) || 0,
      budget_allocated: Number(addForm.budget_allocated) || 0,
      content_ref:     addForm.content_ref,
      managed_by:      addForm.managed_by,
      managed_by_id:   addForm.managed_by_id || null,
      start_date:      addForm.start_date || null,
      end_date:        addForm.end_date || null,
      result_notes:    addForm.result_notes,
    }])
    if (insErr) { setAddError(insErr.message); setSaving(false); return }
    setShowAdd(false)
    setAddForm({ product_id: '', month: '', campaign_name: '', channel: 'Facebook', budget_approved: '', budget_allocated: '', content_ref: '', managed_by: '', managed_by_id: '', start_date: '', end_date: '', result_notes: '' })
    await load()
    setSaving(false)
    showToast('เพิ่มแคมเปญแล้ว')
  }

  // ── Edit ─────────────────────────────────────────────────────
  function openEdit(a: any) {
    setEditingRow(a)
    setEditVal({
      reach:        String(a.reach ?? 0),
      clicks:       String(a.clicks ?? 0),
      leads:        String(a.leads ?? 0),
      budget_spent: String(a.budget_spent ?? 0),
      sales_amount: String(a.sales_amount ?? 0),
      result_notes: a.result_notes || '',
    })
    setEditError('')
  }

  // Generated columns (budget_remaining, cpl, roas) recompute in DB → full reload
  async function saveEdit() {
    if (!editingRow) return
    setSavingEdit(true); setEditError('')
    const { error: updErr } = await supabase.from('ads').update({
      reach:        Number(editVal.reach) || 0,
      clicks:       Number(editVal.clicks) || 0,
      leads:        Number(editVal.leads) || 0,
      budget_spent: Number(editVal.budget_spent) || 0,
      sales_amount: Number(editVal.sales_amount) || 0,
      result_notes: editVal.result_notes,
    }).eq('id', editingRow.id)
    setSavingEdit(false)
    if (updErr) { setEditError(updErr.message); return }
    setEditingRow(null)
    await load()   // reload to get updated generated cols (budget_remaining, cpl, roas)
    showToast('บันทึกผลแล้ว')
  }

  // ── Inline manager ────────────────────────────────────────────
  async function updateManager(id: number, managed_by_id: string, managed_by: string) {
    setAds(prev => prev.map(a => a.id === id ? { ...a, managed_by_id, managed_by } : a))
    const { error: updErr } = await supabase.from('ads').update({
      managed_by_id: managed_by_id || null, managed_by,
    }).eq('id', id)
    if (updErr) { showToast(updErr.message, 'error'); await load() }
  }

  // ── Aggregates ────────────────────────────────────────────────
  const months = useMemo(() => Array.from(new Set(ads.map(a => a.month).filter(Boolean))).sort().reverse(), [ads])
  const totalBudget = useMemo(() => ads.reduce((s, r) => s + Number(r.budget_total ?? 0), 0), [ads])
  const totalSpent  = useMemo(() => ads.reduce((s, r) => s + Number(r.budget_spent), 0), [ads])
  const totalLeads  = useMemo(() => ads.reduce((s, r) => s + Number(r.leads), 0), [ads])
  const totalReach  = useMemo(() => ads.reduce((s, r) => s + Number(r.reach), 0), [ads])
  const spentPct    = totalBudget > 0 ? Math.round((totalSpent / totalBudget) * 100) : 0

  const summaryCards = useMemo(() => [
    { label: 'งบทั้งหมด',   value: `฿${totalBudget.toLocaleString()}`, meta: `${ads.length} campaigns`, accent: '#6366f1' },
    { label: 'ใช้จ่ายแล้ว', value: `฿${totalSpent.toLocaleString()}`,  meta: `${spentPct}% ของงบ`,    accent: '#f59e0b' },
    { label: 'Reach รวม',   value: totalReach.toLocaleString(),         meta: 'impressions',              accent: '#3b82f6' },
    { label: 'Leads รวม',   value: totalLeads.toLocaleString(),         meta: 'leads',                    accent: '#8b5cf6' },
  ], [totalBudget, totalSpent, spentPct, totalReach, totalLeads, ads.length])

  const filtered = useMemo(() => {
    let list = filterMonth === 'all' ? ads : ads.filter(a => a.month === filterMonth)
    if (!search) return list
    const q = search.toLowerCase()
    return list.filter(a =>
      (a.product_id || '').toLowerCase().includes(q)
      || (a.campaign_name || '').toLowerCase().includes(q)
      || (a.channel || '').toLowerCase().includes(q),
    )
  }, [ads, search, filterMonth])

  const headers = ['Product', 'เดือน', 'Campaign', 'ช่องทาง', 'ผู้ดูแล', 'งบจัดสรร', 'ใช้จริง', 'คงเหลือ', 'Reach', 'Leads', 'CPL', 'ROAS', '']

  return (
    <div className="p-6 max-w-screen-xl mx-auto space-y-5">

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-slate-900">Ads</h1>
          <p className="text-sm text-slate-400 mt-0.5">ติดตามแคมเปญโฆษณาและ ROI</p>
        </div>
        {canInsert && (
          <button onClick={() => { setAddForm({ product_id: '', month: '', campaign_name: '', channel: 'Facebook', budget_approved: '', budget_allocated: '', content_ref: '', managed_by: '', managed_by_id: '', start_date: '', end_date: '', result_notes: '' }); setAddError(''); setShowAdd(true) }}
            className="flex items-center gap-2 bg-indigo-600 text-white px-5 py-2.5 rounded-xl text-sm font-medium hover:bg-indigo-500 transition-colors shadow-sm">
            <IconPlus />เพิ่มแคมเปญ
          </button>
        )}
      </div>

      {loadError && (
        <div className="bg-red-50 border border-red-100 rounded-2xl px-4 py-3 text-sm text-red-600">
          โหลดข้อมูลไม่สำเร็จ: {loadError}
          <button onClick={load} className="ml-3 underline text-red-500 hover:text-red-700">ลองใหม่</button>
        </div>
      )}

      {/* Summary cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {summaryCards.map(({ label, value, meta, accent }) => (
          <div key={label} className="bg-white rounded-2xl border border-slate-100 p-5 shadow-sm relative overflow-hidden">
            <div className="absolute top-0 left-0 right-0 h-1" style={{ backgroundColor: accent }} />
            <p className="text-xs text-slate-400 mb-3 mt-1">{label}</p>
            <p className="text-2xl font-semibold text-slate-900 leading-none">{value}</p>
            <p className="text-xs text-slate-400 mt-2">{meta}</p>
          </div>
        ))}
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl border border-slate-100 overflow-hidden shadow-sm">
        <div className="px-5 py-3.5 border-b border-slate-100 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2 flex-1">
            <SearchInput value={search} onChange={setSearch} placeholder="ค้นหาแคมเปญ, Product, ช่องทาง..." />
            {months.length > 0 && (
              <select value={filterMonth} onChange={e => setFilterMonth(e.target.value)}
                className="border border-slate-200 rounded-xl px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white text-slate-700 shrink-0">
                <option value="all">ทุกเดือน</option>
                {months.map(m => <option key={m} value={m}>{m}</option>)}
              </select>
            )}
          </div>
          <span className="text-xs text-slate-400 whitespace-nowrap">{filtered.length} รายการ</span>
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
                <EmptyState message="ยังไม่มีแคมเปญ" />
              ) : filtered.map(a => {
                const allocated = Number(a.budget_allocated || 0)
                const spent = Number(a.budget_spent || 0)
                const over = spent > allocated
                const roas = Number(a.roas || 0)
                const roasColor = roas >= 2 ? 'text-emerald-600 font-semibold' : roas >= 1 ? 'text-slate-900' : roas > 0 ? 'text-red-500' : 'text-slate-300'
                return (
                  <tr key={a.id} className="border-b border-slate-100/60 hover:bg-indigo-50/20 transition-colors last:border-0">
                    <td className="px-5 py-4">
                      <span className="font-mono text-xs font-medium bg-slate-100 text-slate-600 px-2 py-1 rounded-md">{a.product_id}</span>
                    </td>
                    <td className="px-5 py-4 text-sm text-slate-500 whitespace-nowrap">{a.month}</td>
                    <td className="px-5 py-4 font-semibold text-slate-900 max-w-[160px] truncate" title={a.campaign_name}>{a.campaign_name}</td>
                    <td className="px-5 py-4 text-sm text-slate-500">{a.channel}</td>
                    <td className="px-5 py-4">
                      <InlinePersonPicker value={a.managed_by_id || ''} display={a.managed_by || ''}
                        profiles={profileOptions} disabled={!canUpdate}
                        onChange={(id, name) => updateManager(a.id, id, name)} />
                    </td>
                    <td className="px-5 py-4 text-sm text-slate-600 tabular-nums">฿{allocated.toLocaleString()}</td>
                    <td className={`px-5 py-4 tabular-nums ${over ? 'bg-red-50/60' : ''}`}>
                      <div className="flex items-center gap-1.5">
                        <span className={`text-sm ${over ? 'text-red-600 font-semibold' : 'text-slate-600'}`}>฿{spent.toLocaleString()}</span>
                        {over && <span className="text-[10px] bg-red-100 text-red-600 px-1.5 py-0.5 rounded-md font-medium">เกินงบ</span>}
                      </div>
                    </td>
                    <td className="px-5 py-4 text-sm text-emerald-600 tabular-nums font-medium">฿{Number(a.budget_remaining).toLocaleString()}</td>
                    <td className="px-5 py-4 text-sm text-slate-500 tabular-nums">{Number(a.reach).toLocaleString()}</td>
                    <td className="px-5 py-4 text-sm font-semibold text-slate-900 tabular-nums">{Number(a.leads).toLocaleString()}</td>
                    <td className="px-5 py-4 text-sm text-slate-500 tabular-nums">฿{Number(a.cpl).toLocaleString()}</td>
                    <td className={`px-5 py-4 text-sm tabular-nums ${roasColor}`}>
                      {roas > 0 ? `${roas.toFixed(2)}×` : '—'}
                    </td>
                    <td className="px-5 py-4 whitespace-nowrap">
                      {canUpdate ? (
                        <button onClick={() => openEdit(a)} title="บันทึกผล"
                          className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-600 bg-slate-100 hover:bg-indigo-100 hover:text-indigo-700 rounded-lg transition-colors">
                          <IconPencil />บันทึกผล
                        </button>
                      ) : <span className="text-xs text-slate-300">—</span>}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* ── ADD modal ──────────────────────────────────────────── */}
      <Modal open={showAdd} onClose={() => setShowAdd(false)} title="เพิ่มแคมเปญโฆษณาใหม่" width="max-w-2xl">
        <div className="grid grid-cols-2 gap-4">
          <Field label="Product" required>
            <select value={addForm.product_id} onChange={e => setAddForm({ ...addForm, product_id: e.target.value })} className={selectCls}>
              <option value="">เลือก Product</option>
              {products.map(p => <option key={p.product_id} value={p.product_id}>{p.product_id} — {p.name}</option>)}
            </select>
          </Field>
          <Field label="เดือน" hint="รูปแบบ YYYY-MM เช่น 2026-11" required>
            <input placeholder="2026-11" value={addForm.month} onChange={e => setAddForm({ ...addForm, month: e.target.value })} className={inputCls} />
          </Field>
          <div className="col-span-2">
            <Field label="ชื่อแคมเปญ" required>
              <input placeholder="ชื่อแคมเปญ" value={addForm.campaign_name} onChange={e => setAddForm({ ...addForm, campaign_name: e.target.value })} className={inputCls} />
            </Field>
          </div>
          <Field label="ช่องทาง">
            <input placeholder="Facebook, Instagram ฯลฯ" value={addForm.channel} onChange={e => setAddForm({ ...addForm, channel: e.target.value })} className={inputCls} />
          </Field>
          <Field label="งบที่อนุมัติ (฿)">
            <input type="number" placeholder="0" value={addForm.budget_approved} onChange={e => setAddForm({ ...addForm, budget_approved: e.target.value })} className={inputCls} />
          </Field>
          <Field label="งบจัดสรร (฿)">
            <input type="number" placeholder="0" value={addForm.budget_allocated} onChange={e => setAddForm({ ...addForm, budget_allocated: e.target.value })} className={inputCls} />
          </Field>
          <Field label="อ้างอิง Content">
            <input placeholder="ชื่อ content ที่ใช้" value={addForm.content_ref} onChange={e => setAddForm({ ...addForm, content_ref: e.target.value })} className={inputCls} />
          </Field>
          <Field label="ผู้ดูแล">
            <ProfilePicker value={addForm.managed_by_id} profiles={profileOptions}
              onChange={(id, name) => setAddForm({ ...addForm, managed_by_id: id, managed_by: name })} placeholder="เลือกผู้ดูแล" />
          </Field>
          <Field label="วันเริ่มต้น">
            <input type="date" value={addForm.start_date} onChange={e => setAddForm({ ...addForm, start_date: e.target.value })} className={inputCls} />
          </Field>
          <Field label="วันสิ้นสุด">
            <input type="date" value={addForm.end_date} onChange={e => setAddForm({ ...addForm, end_date: e.target.value })} className={inputCls} />
          </Field>
          <div className="col-span-2">
            <Field label="หมายเหตุผล">
              <input placeholder="หมายเหตุเพิ่มเติม" value={addForm.result_notes} onChange={e => setAddForm({ ...addForm, result_notes: e.target.value })} className={inputCls} />
            </Field>
          </div>
        </div>
        {addError && <p className="text-sm bg-red-50 text-red-600 border border-red-100 rounded-xl px-3.5 py-2.5 mt-4">{addError}</p>}
        <div className="flex gap-2 mt-6">
          <button onClick={saveAdd} disabled={saving || !addForm.product_id || !addForm.campaign_name || !addForm.month}
            className="flex-1 bg-indigo-600 text-white py-2.5 rounded-xl text-sm font-semibold disabled:opacity-40 hover:bg-indigo-500 transition-colors">
            {saving ? 'กำลังบันทึก...' : 'บันทึก'}
          </button>
          <button onClick={() => setShowAdd(false)} className="px-5 py-2.5 text-sm text-slate-500 rounded-xl hover:bg-slate-100 transition-colors">ยกเลิก</button>
        </div>
      </Modal>

      {/* ── EDIT / บันทึกผล modal ──────────────────────────────── */}
      <Modal open={!!editingRow} onClose={() => setEditingRow(null)} title={`บันทึกผล — ${editingRow?.campaign_name}`} width="max-w-md">
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <Field label="Reach (impressions)">
              <input type="number" value={editVal.reach} onChange={e => setEditVal(v => ({ ...v, reach: e.target.value }))} className={inputCls} />
            </Field>
            <Field label="Clicks">
              <input type="number" value={editVal.clicks} onChange={e => setEditVal(v => ({ ...v, clicks: e.target.value }))} className={inputCls} />
            </Field>
            <Field label="Leads">
              <input type="number" value={editVal.leads} onChange={e => setEditVal(v => ({ ...v, leads: e.target.value }))} className={inputCls} />
            </Field>
            <Field label="ใช้จ่ายจริง (฿)">
              <input type="number" value={editVal.budget_spent} onChange={e => setEditVal(v => ({ ...v, budget_spent: e.target.value }))} className={inputCls} />
            </Field>
          </div>
          <Field label="ยอดขายที่ได้จากแคมเปญ (฿)">
            <input type="number" value={editVal.sales_amount} onChange={e => setEditVal(v => ({ ...v, sales_amount: e.target.value }))} className={inputCls} />
          </Field>
          <Field label="หมายเหตุผล">
            <input value={editVal.result_notes} onChange={e => setEditVal(v => ({ ...v, result_notes: e.target.value }))} className={inputCls} />
          </Field>
          <div className="bg-slate-50 rounded-xl px-4 py-3 text-xs text-slate-500">
            CPL และ ROAS จะคำนวณอัตโนมัติหลังบันทึก
          </div>
        </div>
        {editError && <p className="text-sm bg-red-50 text-red-600 border border-red-100 rounded-xl px-3.5 py-2.5 mt-4">{editError}</p>}
        <div className="flex gap-2 mt-6">
          <button onClick={saveEdit} disabled={savingEdit}
            className="flex-1 bg-indigo-600 text-white py-2.5 rounded-xl text-sm font-semibold disabled:opacity-40 hover:bg-indigo-500 transition-colors">
            {savingEdit ? 'กำลังบันทึก...' : 'บันทึกผล'}
          </button>
          <button onClick={() => setEditingRow(null)} className="px-5 py-2.5 text-sm text-slate-500 rounded-xl hover:bg-slate-100 transition-colors">ยกเลิก</button>
        </div>
      </Modal>
    </div>
  )
}
