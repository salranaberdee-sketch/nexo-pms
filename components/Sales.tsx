'use client'

import { useEffect, useState, useMemo } from 'react'
import { createClient } from '@/lib/supabase'
import { useCan } from '@/lib/profile-context'
import SearchInput from './SearchInput'
import { TableSkeleton, EmptyState, todayStr } from './TableState'
import { showToast } from './Toast'
import Modal, { Field, ConfirmModal } from './Modal'
import { useCategories } from './CategoryManager'

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
function IconTrash() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="3 6 5 6 21 6"/>
      <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/>
      <path d="M10 11v6"/><path d="M14 11v6"/>
      <path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/>
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
  const [editVal, setEditVal] = useState({
    product_id: '',
    period_start: '',
    period_end: '',
    sales_target_amount: '',
    sales_target_count: '',
    actual_sales: '',
    actual_received: '',
    status: 'ยังไม่เปิดขาย',
  })

  // Delete confirm
  const [confirmDelete, setConfirmDelete] = useState<number | null>(null)
  const [deleting, setDeleting] = useState(false)

  const canInsert = useCan('insert', 'sales')
  const canUpdate = useCan('update', 'sales')
  const canDelete = useCan('delete', 'sales')
  const supabase = createClient()

  // Categories from DB (same source as Products page)
  const { categories } = useCategories()

  async function load() {
    setLoadError('')
    const [s, p] = await Promise.all([
      supabase.from('sales').select('id, product_id, period_start, period_end, sales_target_amount, sales_target_count, actual_sales, actual_received, status, created_at').order('product_id'),
      supabase.from('products').select('product_id, name, status, business_type, product_type, brand'),
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
      product_id:          s.product_id,
      period_start:        s.period_start ?? '',
      period_end:          s.period_end ?? '',
      sales_target_amount: String(s.sales_target_amount ?? 0),
      sales_target_count:  String(s.sales_target_count ?? 0),
      actual_sales:        String(s.actual_sales ?? 0),
      actual_received:     String(s.actual_received ?? 0),
      status:              s.status,
    })
    setEditError('')
  }

  async function saveEdit() {
    if (!editingRow) return
    setSavingEdit(true); setEditError('')
    if (editVal.period_start && editVal.period_end && editVal.period_end <= editVal.period_start) {
      setEditError('วันสิ้นสุดต้องหลังวันเริ่มต้น')
      setSavingEdit(false); return
    }
    const { error: updErr } = await supabase.from('sales').update({
      product_id:          editVal.product_id,
      period_start:        editVal.period_start,
      period_end:          editVal.period_end,
      sales_target_amount: Number(editVal.sales_target_amount),
      sales_target_count:  Number(editVal.sales_target_count),
      actual_sales:        Number(editVal.actual_sales),
      actual_received:     Number(editVal.actual_received),
      status:              editVal.status,
    }).eq('id', editingRow.id)
    setSavingEdit(false)
    if (updErr) { setEditError(updErr.message); return }
    setSales(prev => prev.map(s => s.id === editingRow.id ? {
      ...s,
      product_id:          editVal.product_id,
      period_start:        editVal.period_start,
      period_end:          editVal.period_end,
      sales_target_amount: Number(editVal.sales_target_amount),
      sales_target_count:  Number(editVal.sales_target_count),
      actual_sales:        Number(editVal.actual_sales),
      actual_received:     Number(editVal.actual_received),
      status:              editVal.status,
    } : s))
    setEditingRow(null)
    showToast('บันทึกยอดขายแล้ว')
  }

  async function deleteRow(id: number) {
    setDeleting(true)
    const { error: delErr } = await supabase.from('sales').delete().eq('id', id)
    setDeleting(false)
    if (delErr) { showToast(delErr.message, 'error'); return }
    setConfirmDelete(null)
    setSales(prev => prev.filter(s => s.id !== id))
    showToast('ลบยอดขายแล้ว')
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

  // Category filter — from DB (same order as CategoryManager)
  const [filterCategory, setFilterCategory] = useState('all')
  const allCategories = useMemo(() => categories.map(c => c.name), [categories])

  // Per-category aggregation for summary cards
  const categoryStats = useMemo(() => {
    return allCategories.map(cat => {
      const catProductIds = products.filter(p => p.business_type === cat).map(p => p.product_id)
      const catSales = sales.filter(s => catProductIds.includes(s.product_id))
      const target = catSales.reduce((sum, r) => sum + Number(r.sales_target_amount), 0)
      const actual = catSales.reduce((sum, r) => sum + Number(r.actual_sales), 0)
      const pct = target > 0 ? Math.round((actual / target) * 100) : 0
      return { cat, target, actual, pct, count: catProductIds.length }
    })
  }, [allCategories, products, sales])

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

  // Date range filter
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo]     = useState('')

  const filtered = useMemo(() => {
    let list = sales
    if (filterCategory !== 'all') {
      const catIds = products.filter(p => p.business_type === filterCategory).map(p => p.product_id)
      list = list.filter(s => catIds.includes(s.product_id))
    }
    if (dateFrom) list = list.filter(s => s.created_at && s.created_at >= dateFrom)
    if (dateTo)   list = list.filter(s => s.created_at && s.created_at <= dateTo + 'T23:59:59')
    if (!search) return list
    const q = search.toLowerCase()
    return list.filter(s => {
      const product = productMap.get(s.product_id)
      return s.product_id.toLowerCase().includes(q)
        || (product?.name || '').toLowerCase().includes(q)
        || (product?.business_type || '').toLowerCase().includes(q)
    })
  }, [sales, search, productMap, filterCategory, products, dateFrom, dateTo])

  // Status filter
  const [filterStatus, setFilterStatus] = useState('all')

  const countByStatus = useMemo(
    () => SALES_STATUS_OPTIONS.reduce((acc, s) => ({ ...acc, [s]: sales.filter(r => r.status === s).length }), {} as Record<string, number>),
    [sales],
  )

  const filteredAndSearched = useMemo(() => {
    return filterStatus === 'all' ? filtered : filtered.filter(s => s.status === filterStatus)
  }, [filtered, filterStatus])

  const headers = ['Product', 'ชื่อสินค้า', 'หมวดหมู่', 'ช่วงเวลา', 'เป้ายอดขาย', 'ยอดจริง', 'รับเงินจริง', 'ยังขาด', '% สำเร็จ', 'สถานะ', 'วันที่เพิ่ม', '']

  // Pagination — reset when filters change
  const [visibleCount, setVisibleCount] = useState(10)
  useEffect(() => { setVisibleCount(10) }, [search, filterCategory, filterStatus, dateFrom, dateTo])

  return (
    <div className="p-6 space-y-5">

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

      {/* Category summary cards */}
      {categoryStats.length > 0 && (
        <div className={`grid gap-3 ${categoryStats.length <= 2 ? 'grid-cols-2' : categoryStats.length === 3 ? 'grid-cols-3' : 'grid-cols-2 lg:grid-cols-4'}`}>
          {categoryStats.map(({ cat, target, actual, pct }, i) => {
            const colors = ['#6366f1', '#10b981', '#f59e0b', '#8b5cf6', '#3b82f6', '#f43f5e']
            const color = colors[i % colors.length]
            const isActive = filterCategory === cat
            return (
              <button key={cat} type="button"
                onClick={() => setFilterCategory(isActive ? 'all' : cat)}
                className={`text-left bg-white rounded-2xl border p-4 shadow-sm relative overflow-hidden transition-all hover:shadow-md
                  ${isActive ? 'border-indigo-300 ring-2 ring-indigo-100' : 'border-slate-100'}`}>
                <div className="absolute top-0 left-0 right-0 h-1" style={{ backgroundColor: color }} />
                <p className="text-xs text-slate-400 mb-2 mt-0.5 truncate">{cat}</p>
                <p className="text-xl font-bold text-slate-900 leading-none">฿{actual.toLocaleString()}</p>
                <div className="mt-2.5">
                  <div className="w-full h-1.5 rounded-full overflow-hidden bg-slate-100">
                    <div className="h-full rounded-full transition-all" style={{ width: `${Math.min(pct, 100)}%`, backgroundColor: color }} />
                  </div>
                  <p className="text-xs text-slate-400 mt-1">{pct}% ของเป้า ฿{target.toLocaleString()}</p>
                </div>
                {isActive && <p className="text-[10px] mt-1.5" style={{ color }}>กำลังกรอง ✓</p>}
              </button>
            )
          })}
        </div>
      )}

      {/* Category filter bar (เมื่อมีหมวดหมู่) */}
      {allCategories.length > 1 && (
        <div className="flex gap-2 flex-wrap items-center">
          <span className="text-xs text-slate-400 font-medium shrink-0">หมวดหมู่:</span>
          <button onClick={() => setFilterCategory('all')}
            className={`px-3 py-1 rounded-lg text-xs font-medium transition-colors border
              ${filterCategory === 'all' ? 'bg-slate-700 text-white border-slate-700' : 'bg-white border-slate-200 text-slate-500 hover:bg-slate-50'}`}>
            ทั้งหมด
          </button>
          {allCategories.map(cat => (
            <button key={cat} onClick={() => setFilterCategory(filterCategory === cat ? 'all' : cat)}
              className={`px-3 py-1 rounded-lg text-xs font-medium transition-colors border
                ${filterCategory === cat ? 'bg-slate-700 text-white border-slate-700' : 'bg-white border-slate-200 text-slate-500 hover:bg-slate-50'}`}>
              {cat}
            </button>
          ))}
        </div>
      )}

      {/* Status filter pills */}
      <div className="flex gap-2 flex-wrap items-center">
        <button onClick={() => setFilterStatus('all')}
          className={`px-3.5 py-1.5 rounded-lg text-sm font-medium transition-colors border
            ${filterStatus === 'all' ? 'bg-indigo-600 text-white border-indigo-600' : 'bg-white border-slate-200 text-slate-500 hover:bg-slate-50'}`}>
          ทั้งหมด <span className="ml-1 opacity-60">{sales.length}</span>
        </button>
        {SALES_STATUS_OPTIONS.map(s => (
          <button key={s} onClick={() => setFilterStatus(filterStatus === s ? 'all' : s)}
            className={`px-3.5 py-1.5 rounded-lg text-sm font-medium transition-colors border
              ${filterStatus === s ? salesStatusStyle[s] + ' border-current/20' : 'bg-white border-slate-200 text-slate-500 hover:bg-slate-50'}`}>
            {s} <span className="ml-1 tabular-nums opacity-60">{countByStatus[s] || 0}</span>
          </button>
        ))}
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl border border-slate-100 overflow-hidden shadow-sm">
        <div className="px-5 py-3.5 border-b border-slate-100 flex items-center justify-between gap-3 flex-wrap">
          <div className="flex items-center gap-2 flex-1 flex-wrap">
            <SearchInput value={search} onChange={setSearch} placeholder="ค้นหาด้วย Product ID หรือชื่อสินค้า..." />
            <div className="flex items-center gap-1.5 shrink-0">
              <span className="text-xs text-slate-400 whitespace-nowrap">จาก</span>
              <input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)}
                className="border border-slate-200 rounded-xl px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white text-slate-700" />
              <span className="text-xs text-slate-400">ถึง</span>
              <input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)}
                className="border border-slate-200 rounded-xl px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white text-slate-700" />
              {(dateFrom || dateTo) && (
                <button onClick={() => { setDateFrom(''); setDateTo('') }}
                  className="text-xs text-slate-400 hover:text-red-500 transition-colors px-1.5 py-1 rounded-lg hover:bg-red-50">✕</button>
              )}
            </div>
          </div>
          <span className="text-xs text-slate-400 whitespace-nowrap">{filteredAndSearched.length} รายการ</span>
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
              ) : filteredAndSearched.length === 0 ? (
                <EmptyState message="ยังไม่มีเป้ายอดขาย" />
              ) : filteredAndSearched.slice(0, visibleCount).map(s => {
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
                    <td className="px-5 py-4 font-semibold text-slate-900 max-w-[160px] truncate">{product?.name}</td>
                    {/* Category */}
                    <td className="px-5 py-4">
                      {product?.business_type ? (
                        <span className="text-xs text-slate-500 bg-slate-100 px-2 py-0.5 rounded-md">{product.business_type}</span>
                      ) : <span className="text-xs text-slate-300">—</span>}
                    </td>
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
                      {canUpdate ? (
                        <div className="flex gap-1 flex-wrap">
                          {SALES_STATUS_OPTIONS.map(opt => (
                            <button
                              key={opt}
                              onClick={() => s.status !== opt && updateStatus(s.id, opt)}
                              title={opt}
                              className={`text-xs font-medium px-2.5 py-1 rounded-lg border transition-all
                                ${s.status === opt
                                  ? salesStatusStyle[opt] + ' border-current/20 shadow-sm scale-105'
                                  : 'bg-white border-slate-200 text-slate-400 hover:border-slate-300 hover:text-slate-600'
                                }`}
                            >
                              {opt}
                            </button>
                          ))}
                        </div>
                      ) : (
                        <span className={`text-xs font-medium px-2.5 py-1 rounded-lg ${salesStatusStyle[s.status] || 'bg-slate-100 text-slate-400'}`}>
                          {s.status}
                        </span>
                      )}
                    </td>
                    {/* Created at */}
                    <td className="px-5 py-4 text-xs text-slate-400 whitespace-nowrap">
                      {s.created_at
                        ? new Date(s.created_at).toLocaleDateString('th-TH', { day: '2-digit', month: 'short', year: 'numeric' })
                        : '—'}
                    </td>
                    <td className="px-5 py-4 whitespace-nowrap">
                      <div className="flex items-center gap-1">
                        {canUpdate && (
                          <button onClick={() => openEdit(s)} title="แก้ไข"
                            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-600 bg-slate-100 hover:bg-indigo-100 hover:text-indigo-700 rounded-lg transition-colors">
                            <IconPencil />แก้ไข
                          </button>
                        )}
                        {canDelete && (
                          <button onClick={() => setConfirmDelete(s.id)} title="ลบ"
                            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-400 hover:bg-red-50 hover:text-red-600 rounded-lg transition-colors">
                            <IconTrash />ลบ
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
          {visibleCount < filteredAndSearched.length && (
            <div className="px-5 py-4 border-t border-slate-100 text-center">
              <button onClick={() => setVisibleCount(v => v + 10)}
                className="text-sm text-indigo-600 font-medium hover:text-indigo-800 transition-colors">
                ดูเพิ่มเติม ({filteredAndSearched.length - visibleCount} รายการ)
              </button>
            </div>
          )}
        </div>
      </div>

      {/* ── DELETE confirm ─────────────────────────────────────── */}
      <ConfirmModal
        open={confirmDelete !== null}
        onClose={() => setConfirmDelete(null)}
        onConfirm={() => deleteRow(confirmDelete!)}
        loading={deleting}
        title="ยืนยันลบยอดขาย"
        message={(() => {
          const target = sales.find(s => s.id === confirmDelete)
          const product = target ? productMap.get(target.product_id) : null
          return <><strong>{product?.name || target?.product_id}</strong> จะถูกลบถาวร</>
        })()}
      />

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
      <Modal open={!!editingRow} onClose={() => setEditingRow(null)} title={`แก้ไขยอดขาย — ${editingRow?.product_id}`} width="max-w-lg">
        <div className="grid grid-cols-2 gap-4">
          <div className="col-span-2">
            <Field label="Product" required>
              <select value={editVal.product_id} onChange={e => setEditVal(v => ({ ...v, product_id: e.target.value }))} className={selectCls}>
                <option value="">เลือก Product</option>
                {products.map(p => <option key={p.product_id} value={p.product_id}>{p.product_id} — {p.name}</option>)}
              </select>
            </Field>
          </div>
          <Field label="วันเริ่มต้น" required>
            <input type="date" value={editVal.period_start} onChange={e => setEditVal(v => ({ ...v, period_start: e.target.value }))} className={inputCls} />
          </Field>
          <Field label="วันสิ้นสุด" required>
            <input type="date" value={editVal.period_end} onChange={e => setEditVal(v => ({ ...v, period_end: e.target.value }))} className={inputCls} />
          </Field>
          <Field label="เป้ายอดขาย (฿)">
            <input type="number" value={editVal.sales_target_amount} onChange={e => setEditVal(v => ({ ...v, sales_target_amount: e.target.value }))} className={inputCls} />
          </Field>
          <Field label="เป้าจำนวนชิ้น">
            <input type="number" value={editVal.sales_target_count} onChange={e => setEditVal(v => ({ ...v, sales_target_count: e.target.value }))} className={inputCls} />
          </Field>
          <Field label="ยอดขายจริง (฿)">
            <input type="number" value={editVal.actual_sales} onChange={e => setEditVal(v => ({ ...v, actual_sales: e.target.value }))} className={inputCls} />
          </Field>
          <Field label="รับเงินจริง (฿)">
            <input type="number" value={editVal.actual_received} onChange={e => setEditVal(v => ({ ...v, actual_received: e.target.value }))} className={inputCls} />
          </Field>
          <div className="col-span-2">
            <Field label="สถานะ">
              <select value={editVal.status} onChange={e => setEditVal(v => ({ ...v, status: e.target.value }))} className={selectCls}>
                {SALES_STATUS_OPTIONS.map(s => <option key={s}>{s}</option>)}
              </select>
            </Field>
          </div>
        </div>
        {editError && <p className="text-sm bg-red-50 text-red-600 border border-red-100 rounded-xl px-3.5 py-2.5 mt-4">{editError}</p>}
        <div className="flex gap-2 mt-6">
          <button onClick={saveEdit} disabled={savingEdit || !editVal.product_id || !editVal.period_start || !editVal.period_end}
            className="flex-1 bg-indigo-600 text-white py-2.5 rounded-xl text-sm font-semibold disabled:opacity-40 hover:bg-indigo-500 transition-colors">
            {savingEdit ? 'กำลังบันทึก...' : 'บันทึกการแก้ไข'}
          </button>
          <button onClick={() => setEditingRow(null)} className="px-5 py-2.5 text-sm text-slate-500 rounded-xl hover:bg-slate-100 transition-colors">ยกเลิก</button>
        </div>
      </Modal>
    </div>
  )
}
