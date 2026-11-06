'use client'

import { useEffect, useState, useMemo } from 'react'
import { createClient } from '@/lib/supabase'
import { useCan } from '@/lib/profile-context'
import SearchInput from './SearchInput'
import { TableSkeleton, EmptyState, todayStr } from './TableState'
import StatusSelect from './StatusSelect'
import { showToast } from './Toast'
import Modal, { Field } from './Modal'

const SALES_STATUS_OPTIONS = ['ยังไม่เปิดขาย', 'ยังไม่เริ่ม', 'กำลังขาย', 'ปิดเป้า']

const salesStatusStyle: Record<string, string> = {
  'ยังไม่เปิดขาย': 'bg-slate-100 text-slate-400',
  'ยังไม่เริ่ม':   'bg-blue-50 text-blue-700',
  'กำลังขาย':     'bg-amber-50 text-amber-700',
  'ปิดเป้า':       'bg-emerald-50 text-emerald-700',
}

const TODAY = todayStr()
const TODAY_MS = new Date(TODAY).getTime()

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

export default function Sales() {
  const [sales, setSales]     = useState<any[]>([])
  const [products, setProducts] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState('')
  const [search, setSearch]   = useState('')

  // Add modal
  const [showAdd, setShowAdd] = useState(false)
  const [saving, setSaving]   = useState(false)
  const [addError, setAddError] = useState('')
  const [addForm, setAddForm] = useState({
    product_id: '', period_start: '', period_end: '',
    sales_target_amount: '', sales_target_count: '', status: 'ยังไม่เปิดขาย',
  })

  // Edit modal
  const [editingRow, setEditingRow] = useState<any | null>(null)
  const [savingEdit, setSavingEdit] = useState(false)
  const [editError, setEditError]   = useState('')
  const [editVal, setEditVal] = useState({ sales_target_amount: '', actual_sales: '', actual_received: '', status: 'ยังไม่เปิดขาย' })

  const canInsert = useCan('insert', 'sales')
  const canUpdate = useCan('update', 'sales')
  const supabase = createClient()

  async function load() {
    setLoadError('')
    const [s, p] = await Promise.all([
      supabase.from('sales').select('id, product_id, period_start, period_end, sales_target_amount, actual_sales, actual_received, status').order('product_id'),
      supabase.from('products').select('product_id, name, status'),
    ])
    if (s.error) { setLoadError(s.error.message); setLoading(false); return }
    setSales(s.data || [])
    setProducts(p.data || [])
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  // ── Add ──────────────────────────────────────────────────────
  async function saveAdd() {
    setSaving(true); setAddError('')
    if (addForm.period_start && addForm.period_end && addForm.period_end <= addForm.period_start) {
      setAddError('วันสิ้นสุดต้องหลังวันเริ่มต้น')
      setSaving(false); return
    }
    const { error: insErr } = await supabase.from('sales').insert([{
      product_id:          addForm.product_id,
      period_start:        addForm.period_start,
      period_end:          addForm.period_end,
      sales_target_amount: Number(addForm.sales_target_amount) || 0,
      sales_target_count:  Number(addForm.sales_target_count) || 0,
      status:              addForm.status,
    }])
    if (insErr) {
      setAddError(insErr.code === '23505'
        ? 'มีเป้ายอดขายของ Product นี้ในช่วงเวลานี้อยู่แล้ว'
        : insErr.message)
      setSaving(false); return
    }
    setShowAdd(false)
    setAddForm({ product_id: '', period_start: '', period_end: '', sales_target_amount: '', sales_target_count: '', status: 'ยังไม่เปิดขาย' })
    await load()
    setSaving(false)
    showToast('เพิ่มเป้ายอดขายแล้ว')
  }

  // ── Edit ─────────────────────────────────────────────────────
  function openEdit(s: any) {
    setEditingRow(s)
    setEditVal({
      sales_target_amount: String(s.sales_target_amount ?? 0),
      actual_sales:        String(s.actual_sales ?? 0),
      actual_received:     String(s.actual_received ?? 0),
      status:              s.status,
    })
    setEditError('')
  }

  async function saveEdit() {
    if (!editingRow) return
    setSavingEdit(true); setEditError('')
    const { error: updErr } = await supabase.from('sales').update({
      sales_target_amount: Number(editVal.sales_target_amount),
      actual_sales:        Number(editVal.actual_sales),
      actual_received:     Number(editVal.actual_received),
      status:              editVal.status,
    }).eq('id', editingRow.id)
    setSavingEdit(false)
    if (updErr) { setEditError(updErr.message); return }
    setSales(prev => prev.map(s => s.id === editingRow.id ? {
      ...s,
      sales_target_amount: Number(editVal.sales_target_amount),
      actual_sales:        Number(editVal.actual_sales),
      actual_received:     Number(editVal.actual_received),
      status:              editVal.status,
    } : s))
    setEditingRow(null)
    showToast('บันทึกยอดขายแล้ว')
  }

  async function updateStatus(id: number, status: string) {
    const old = sales.find(s => s.id === id)?.status
    setSales(prev => prev.map(s => s.id === id ? { ...s, status } : s))
    const { error: updErr } = await supabase.from('sales').update({ status }).eq('id', id)
    if (updErr) {
      setSales(prev => prev.map(s => s.id === id ? { ...s, status: old } : s))
      showToast(updErr.message, 'error')
    }
  }

  const productMap = useMemo(
    () => new Map(products.map(p => [p.product_id, p])),
    [products],
  )

  const { daysLeft, periodEnd } = useMemo(() => {
    const ends = sales.map(r => r.period_end).filter(Boolean).sort()
    const futureEnds = ends.filter(e => e >= TODAY)
    const periodEndStr = futureEnds.length ? futureEnds[0] : (ends.length ? ends[ends.length - 1] : TODAY)
    const pe = new Date(periodEndStr)
    return {
      daysLeft: Math.max(0, Math.round((pe.getTime() - TODAY_MS) / 86400000)),
      periodEnd: pe,
    }
  }, [sales])

  const totalTarget = useMemo(() => sales.reduce((s, r) => s + Number(r.sales_target_amount), 0), [sales])
  const totalActual = useMemo(() => sales.reduce((s, r) => s + Number(r.actual_sales), 0), [sales])
  const overallPct  = totalTarget > 0 ? Math.round((totalActual / totalTarget) * 100) : 0
  const gap         = Math.max(0, totalTarget - totalActual)
  const perDay      = daysLeft > 0 && gap > 0 ? Math.round(gap / daysLeft) : 0

  const filtered = useMemo(() => {
    if (!search) return sales
    const q = search.toLowerCase()
    return sales.filter(s => {
      const product = productMap.get(s.product_id)
      return s.product_id.toLowerCase().includes(q) || (product?.name || '').toLowerCase().includes(q)
    })
  }, [sales, search, productMap])

  const headers = ['Product', 'ชื่อสินค้า', 'ช่วงเวลา', 'เป้ายอดขาย', 'ยอดจริง', 'รับเงินจริง', 'ยังขาด', '% สำเร็จ', 'สถานะ', '']

  return (
    <div className="p-6 max-w-screen-xl mx-auto space-y-5">

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-slate-900">Sales</h1>
          <p className="text-sm text-slate-400 mt-0.5">ยอดขายรวม — เหลือ {daysLeft} วัน ถึงสิ้นรอบ</p>
        </div>
        {canInsert && (
          <button onClick={() => { setAddForm({ product_id: '', period_start: '', period_end: '', sales_target_amount: '', sales_target_count: '', status: 'ยังไม่เปิดขาย' }); setAddError(''); setShowAdd(true) }}
            className="flex items-center gap-2 bg-indigo-600 text-white px-5 py-2.5 rounded-xl text-sm font-medium hover:bg-indigo-500 transition-colors shadow-sm">
            <IconPlus />เพิ่มเป้ายอดขาย
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
      <div className="grid grid-cols-3 gap-4">
        <div className="bg-white rounded-2xl border border-slate-100 p-5 shadow-sm relative overflow-hidden">
          <div className="absolute top-0 left-0 right-0 h-1 bg-indigo-500" />
          <p className="text-xs text-slate-400 mb-3 mt-1">ยอดขายรวม</p>
          <p className="text-2xl font-semibold text-slate-900 leading-none">฿{totalActual.toLocaleString()}</p>
          <div className="mt-3">
            <div className="w-full h-1.5 rounded-full overflow-hidden" style={{ backgroundColor: '#f1f5f9' }}>
              <div className="h-full rounded-full bg-indigo-500 transition-all" style={{ width: `${Math.min(overallPct, 100)}%` }} />
            </div>
            <p className="text-xs text-slate-400 mt-1.5">{overallPct}% ของเป้า ฿{totalTarget.toLocaleString()}</p>
          </div>
        </div>
        <div className="bg-white rounded-2xl border border-slate-100 p-5 shadow-sm relative overflow-hidden">
          <div className="absolute top-0 left-0 right-0 h-1 bg-red-400" />
          <p className="text-xs text-slate-400 mb-3 mt-1">ยังขาดอยู่</p>
          <p className="text-2xl font-semibold text-red-500 leading-none">฿{gap.toLocaleString()}</p>
          <p className="text-xs text-slate-400 mt-2">ต้องขายเพิ่ม ฿{perDay.toLocaleString()}/วัน</p>
        </div>
        <div className="bg-white rounded-2xl border border-slate-100 p-5 shadow-sm relative overflow-hidden">
          <div className="absolute top-0 left-0 right-0 h-1 bg-amber-400" />
          <p className="text-xs text-slate-400 mb-3 mt-1">วันที่คงเหลือ</p>
          <p className="text-2xl font-semibold text-slate-900 leading-none">{daysLeft} วัน</p>
          <p className="text-xs text-slate-400 mt-2">
            สิ้นสุด {periodEnd.toLocaleDateString('th-TH', { day: '2-digit', month: 'short', year: 'numeric' })}
          </p>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl border border-slate-100 overflow-hidden shadow-sm">
        <div className="px-5 py-3.5 border-b border-slate-100 flex items-center justify-between gap-3">
          <SearchInput value={search} onChange={setSearch} placeholder="ค้นหาด้วย Product ID หรือชื่อสินค้า..." />
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
                <EmptyState message="ยังไม่มีเป้ายอดขาย" />
              ) : filtered.map(s => {
                const product = productMap.get(s.product_id)
                const target  = Number(s.sales_target_amount)
                const actual  = Number(s.actual_sales)
                const received = Number(s.actual_received)
                const rowGap  = Math.max(0, target - actual)
                const pct     = target > 0 ? Math.round((actual / target) * 100) : 0
                const colPct  = actual > 0 ? Math.round((received / actual) * 100) : 0
                return (
                  <tr key={s.id} className="border-b border-slate-100/60 hover:bg-indigo-50/20 transition-colors last:border-0">
                    <td className="px-5 py-4 font-mono text-xs font-medium text-slate-500">{s.product_id}</td>
                    <td className="px-5 py-4 font-semibold text-slate-900 max-w-[180px] truncate">{product?.name}</td>
                    {/* Period */}
                    <td className="px-5 py-4 whitespace-nowrap">
                      <div className="text-xs text-slate-500">
                        {s.period_start && new Date(s.period_start).toLocaleDateString('th-TH', { day: '2-digit', month: 'short' })}
                        {' – '}
                        {s.period_end && new Date(s.period_end).toLocaleDateString('th-TH', { day: '2-digit', month: 'short' })}
                      </div>
                    </td>
                    <td className="px-5 py-4 text-sm text-slate-500 tabular-nums">฿{target.toLocaleString()}</td>
                    <td className="px-5 py-4 text-sm font-semibold text-slate-900 tabular-nums">฿{actual.toLocaleString()}</td>
                    <td className="px-5 py-4 tabular-nums">
                      <div className="flex flex-col">
                        <span className="text-sm text-slate-600">฿{received.toLocaleString()}</span>
                        {actual > 0 && (
                          <span className={`text-xs ${colPct >= 80 ? 'text-emerald-600' : colPct >= 50 ? 'text-amber-600' : 'text-red-500'}`}>
                            เก็บได้ {colPct}%
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-5 py-4 text-sm text-red-500 tabular-nums font-medium">฿{rowGap.toLocaleString()}</td>
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-2">
                        <div className="w-16 h-2 rounded-full overflow-hidden" style={{ backgroundColor: '#f1f5f9' }}>
                          <div className={`h-full rounded-full ${pct >= 80 ? 'bg-emerald-500' : pct >= 40 ? 'bg-amber-400' : 'bg-blue-500'}`}
                            style={{ width: `${Math.min(pct, 100)}%` }} />
                        </div>
                        <span className="text-sm text-slate-600 tabular-nums font-medium">{pct}%</span>
                      </div>
                    </td>
                    <td className="px-5 py-4">
                      <StatusSelect value={s.status} options={SALES_STATUS_OPTIONS} styleMap={salesStatusStyle}
                        disabled={!canUpdate} onChange={v => updateStatus(s.id, v)} />
                    </td>
                    <td className="px-5 py-4 whitespace-nowrap">
                      {canUpdate ? (
                        <button onClick={() => openEdit(s)} title="แก้ไข"
                          className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-600 bg-slate-100 hover:bg-indigo-100 hover:text-indigo-700 rounded-lg transition-colors">
                          <IconPencil />แก้ไข
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
      <Modal open={showAdd} onClose={() => setShowAdd(false)} title="เพิ่มเป้ายอดขายใหม่" width="max-w-lg">
        <div className="grid grid-cols-2 gap-4">
          <div className="col-span-2">
            <Field label="Product" required>
              <select value={addForm.product_id} onChange={e => setAddForm({ ...addForm, product_id: e.target.value })} className={selectCls}>
                <option value="">เลือก Product</option>
                {products.map(p => <option key={p.product_id} value={p.product_id}>{p.product_id} — {p.name}</option>)}
              </select>
            </Field>
          </div>
          <Field label="วันเริ่มต้น" required>
            <input type="date" value={addForm.period_start} onChange={e => setAddForm({ ...addForm, period_start: e.target.value })} className={inputCls} />
          </Field>
          <Field label="วันสิ้นสุด" required>
            <input type="date" value={addForm.period_end} onChange={e => setAddForm({ ...addForm, period_end: e.target.value })} className={inputCls} />
          </Field>
          <Field label="เป้ายอดขาย (฿)">
            <input type="number" placeholder="0" value={addForm.sales_target_amount} onChange={e => setAddForm({ ...addForm, sales_target_amount: e.target.value })} className={inputCls} />
          </Field>
          <Field label="เป้าจำนวนชิ้น">
            <input type="number" placeholder="0" value={addForm.sales_target_count} onChange={e => setAddForm({ ...addForm, sales_target_count: e.target.value })} className={inputCls} />
          </Field>
          <div className="col-span-2">
            <Field label="สถานะ">
              <select value={addForm.status} onChange={e => setAddForm({ ...addForm, status: e.target.value })} className={selectCls}>
                {SALES_STATUS_OPTIONS.map(s => <option key={s}>{s}</option>)}
              </select>
            </Field>
          </div>
        </div>
        {addError && <p className="text-sm bg-red-50 text-red-600 border border-red-100 rounded-xl px-3.5 py-2.5 mt-4">{addError}</p>}
        <div className="flex gap-2 mt-6">
          <button onClick={saveAdd} disabled={saving || !addForm.product_id || !addForm.period_start || !addForm.period_end}
            className="flex-1 bg-indigo-600 text-white py-2.5 rounded-xl text-sm font-semibold disabled:opacity-40 hover:bg-indigo-500 transition-colors">
            {saving ? 'กำลังบันทึก...' : 'บันทึก'}
          </button>
          <button onClick={() => setShowAdd(false)} className="px-5 py-2.5 text-sm text-slate-500 rounded-xl hover:bg-slate-100 transition-colors">ยกเลิก</button>
        </div>
      </Modal>

      {/* ── EDIT modal ─────────────────────────────────────────── */}
      <Modal open={!!editingRow} onClose={() => setEditingRow(null)} title={`แก้ไขยอดขาย — ${editingRow?.product_id}`} width="max-w-md">
        <div className="space-y-4">
          <Field label="เป้ายอดขาย (฿)">
            <input type="number" value={editVal.sales_target_amount} onChange={e => setEditVal(v => ({ ...v, sales_target_amount: e.target.value }))} className={inputCls} />
          </Field>
          <Field label="ยอดขายจริง (฿)">
            <input type="number" value={editVal.actual_sales} onChange={e => setEditVal(v => ({ ...v, actual_sales: e.target.value }))} className={inputCls} />
          </Field>
          <Field label="รับเงินจริง (฿)">
            <input type="number" value={editVal.actual_received} onChange={e => setEditVal(v => ({ ...v, actual_received: e.target.value }))} className={inputCls} />
          </Field>
          <Field label="สถานะ">
            <select value={editVal.status} onChange={e => setEditVal(v => ({ ...v, status: e.target.value }))} className={selectCls}>
              {SALES_STATUS_OPTIONS.map(s => <option key={s}>{s}</option>)}
            </select>
          </Field>
        </div>
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
