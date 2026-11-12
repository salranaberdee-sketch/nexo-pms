'use client'

import { useEffect, useState, useMemo } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase'
import { useCan } from '@/lib/profile-context'
import SearchInput from './SearchInput'
import { TableSkeleton, EmptyState, todayStr } from './TableState'
import { showToast } from './Toast'
import Modal, { Field, ConfirmModal } from './Modal'
import { useCategories } from './CategoryManager'
import StatusSelect from './StatusSelect'
import { inputCls, selectCls, btnPrimary, btnSecondary, btnDanger, thCls, thRightCls, tdCls, tdRightCls, tableWrapCls } from '@/lib/cx'
import SalesSettingsPanel from './SalesSettingsPanel'
import { IconPlus, IconPencil, IconTrash } from '@/lib/icons'
import { salesStatusStyle } from '@/lib/status-styles'
import type { Tables } from '@/src/types/database'

const SALES_STATUS_OPTIONS = ['ยังไม่เปิดขาย', 'ยังไม่เริ่ม', 'กำลังขาย', 'ปิดเป้า']

type Sale = Tables<'sales'>
type Product = Tables<'products'>

const TODAY = todayStr()
const TODAY_MS = new Date(TODAY).getTime()

export default function Sales() {
  const [sales, setSales]     = useState<Sale[]>([])
  const [products, setProducts] = useState<Product[]>([])
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
  const [editingRow, setEditingRow] = useState<Sale | null>(null)
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
      supabase.from('products').select('product_id, name, status, business_type, product_type, brand, owner'),
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
    // Call DB first — only update local state on success (project convention)
    const { error: updErr } = await supabase.from('sales').update({ status }).eq('id', id)
    if (updErr) {
      showToast(updErr.message, 'error')
      return
    }
    setSales(prev => prev.map(s => s.id === id ? { ...s, status } : s))
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
    if (dateFrom) list = list.filter(s => s.period_start && s.period_start >= dateFrom)
    if (dateTo)   list = list.filter(s => s.period_end && s.period_end <= dateTo)
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

  // Pagination — reset when filters change
  const [visibleCount, setVisibleCount] = useState(10)
  useEffect(() => { setVisibleCount(10) }, [search, filterCategory, filterStatus, dateFrom, dateTo])

  // Tab: sync with ?tab= URL param
  const searchParams = useSearchParams()
  const router = useRouter()
  const activeTab: 'list' | 'settings' = searchParams.get('tab') === 'settings' ? 'settings' : 'list'
  function setActiveTab(tab: 'list' | 'settings') {
    const params = new URLSearchParams(searchParams.toString())
    if (tab === 'list') params.delete('tab')
    else params.set('tab', tab)
    router.replace(`/sales?${params.toString()}`)
  }

  return (
    <div className="p-4 md:p-6 space-y-4 md:space-y-5">

      {/* Header */}
      <div className="flex items-center justify-between gap-2">
        <div>
          <h1 className="text-lg md:text-xl font-semibold text-slate-900">Sales</h1>
          <p className="text-sm text-slate-400 mt-0.5">ยอดขายรวม — เหลือ {daysLeft} วัน ถึงสิ้นรอบ</p>
        </div>
        {activeTab === 'list' && canInsert && (
          <button onClick={() => { setAddForm({ product_id: '', period_start: '', period_end: '', sales_target_amount: '', sales_target_count: '', status: 'ยังไม่เปิดขาย' }); setAddError(''); setShowAdd(true) }}
            className={btnPrimary}>
            <IconPlus />เพิ่มเป้ายอดขาย
          </button>
        )}
      </div>

      {/* ── Tabs ───────────────────────────────────────────── */}
      <div className="flex gap-1 border-b border-slate-100">
        <button onClick={() => setActiveTab('list')}
          className={`px-4 py-2.5 text-sm font-medium border-b-2 -mb-px transition-colors ${activeTab === 'list' ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-slate-500 hover:text-slate-700'}`}>
          รายการยอดขาย
        </button>
        <button onClick={() => setActiveTab('settings')}
          className={`px-4 py-2.5 text-sm font-medium border-b-2 -mb-px transition-colors ${activeTab === 'settings' ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-slate-500 hover:text-slate-700'}`}>
          ตั้งค่า
        </button>
      </div>

      {/* ── Tab: รายการ ────────────────────────────────────── */}
      {activeTab === 'list' && (<>
      {loadError && (
        <div className="bg-red-50 border border-red-100 rounded-2xl px-4 py-3 text-sm text-red-600 flex items-center gap-3">
          <span className="flex-1">โหลดข้อมูลไม่สำเร็จ: {loadError}</span>
          <button onClick={load} className="text-red-600 underline underline-offset-2 hover:no-underline shrink-0">ลองใหม่</button>
        </div>
      )}

      {/* ── Summary cards ─────────────────────────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 md:gap-4">
        <div className="bg-white rounded-2xl border border-slate-100 p-5 shadow-sm relative overflow-hidden">
          <div className="absolute top-0 left-0 right-0 h-0.5 bg-indigo-500" />
          <p className="text-xs text-slate-400 mb-2.5 mt-1">ยอดขายรวม</p>
          <p className="text-2xl font-semibold text-slate-900 leading-none">฿{totalActual.toLocaleString()}</p>
          <div className="mt-3">
            <div className="w-full h-1.5 rounded-full overflow-hidden bg-slate-100">
              <div className="h-full rounded-full bg-indigo-500 transition-all" style={{ width: `${Math.min(overallPct, 100)}%` }} />
            </div>
            <p className="text-xs text-slate-400 mt-1.5">{overallPct}% ของเป้า ฿{totalTarget.toLocaleString()}</p>
          </div>
        </div>
        <div className="bg-white rounded-2xl border border-slate-100 p-5 shadow-sm relative overflow-hidden">
          <div className="absolute top-0 left-0 right-0 h-0.5 bg-red-400" />
          <p className="text-xs text-slate-400 mb-2.5 mt-1">ยังขาดอยู่</p>
          <p className="text-2xl font-semibold text-red-500 leading-none">฿{gap.toLocaleString()}</p>
          <p className="text-xs text-slate-400 mt-2">ต้องขายเพิ่ม ฿{perDay.toLocaleString()}/วัน</p>
        </div>
        <div className="bg-white rounded-2xl border border-slate-100 p-5 shadow-sm relative overflow-hidden">
          <div className="absolute top-0 left-0 right-0 h-0.5 bg-amber-400" />
          <p className="text-xs text-slate-400 mb-2.5 mt-1">วันที่คงเหลือ</p>
          <p className="text-2xl font-semibold text-slate-900 leading-none">{daysLeft} วัน</p>
          <p className="text-xs text-slate-400 mt-2">
            สิ้นสุด {periodEnd.toLocaleDateString('th-TH', { day: '2-digit', month: 'short', year: 'numeric' })}
          </p>
        </div>
      </div>

      {/* ── Category summary cards ────────────────────────────── */}
      {categoryStats.length > 0 && (
        <div className={`grid gap-3 ${categoryStats.length <= 2 ? 'grid-cols-2' : categoryStats.length === 3 ? 'grid-cols-2 sm:grid-cols-3' : 'grid-cols-2 lg:grid-cols-4'}`}>
          {categoryStats.map(({ cat, target, actual, pct }, i) => {
            // Tailwind-safe color pairs [accent-bar, progress-bar, text]
            const colorPairs = [
              { bar: 'bg-indigo-500', prog: 'bg-indigo-500', ring: 'border-indigo-300 ring-indigo-100' },
              { bar: 'bg-emerald-500', prog: 'bg-emerald-500', ring: 'border-emerald-300 ring-emerald-100' },
              { bar: 'bg-amber-500',  prog: 'bg-amber-500',  ring: 'border-amber-300 ring-amber-100' },
              { bar: 'bg-violet-500', prog: 'bg-violet-500', ring: 'border-violet-300 ring-violet-100' },
              { bar: 'bg-blue-500',   prog: 'bg-blue-500',   ring: 'border-blue-300 ring-blue-100' },
              { bar: 'bg-rose-500',   prog: 'bg-rose-500',   ring: 'border-rose-300 ring-rose-100' },
            ]
            const cp = colorPairs[i % colorPairs.length]
            const isActive = filterCategory === cat
            return (
              <button key={cat} type="button"
                onClick={() => setFilterCategory(isActive ? 'all' : cat)}
                className={`text-left bg-white rounded-2xl border p-4 shadow-sm relative overflow-hidden transition-all hover:shadow-md
                  ${isActive ? `${cp.ring} ring-2` : 'border-slate-100'}`}>
                <div className={`absolute top-0 left-0 right-0 h-0.5 ${cp.bar}`} />
                <p className="text-xs text-slate-400 mb-2 mt-0.5 truncate">{cat}</p>
                <p className="text-2xl font-semibold text-slate-900 leading-none">฿{actual.toLocaleString()}</p>
                <div className="mt-2.5">
                  <div className="w-full h-1.5 rounded-full overflow-hidden bg-slate-100">
                    <div className={`h-full rounded-full transition-all ${cp.prog}`}
                      style={{ width: `${Math.min(pct, 100)}%` }} />
                  </div>
                  <p className="text-xs text-slate-400 mt-1">{pct}% ของเป้า ฿{target.toLocaleString()}</p>
                </div>
                {isActive && <p className="text-[10px] mt-1.5 text-indigo-500">กำลังกรอง ✓</p>}
              </button>
            )
          })}
        </div>
      )}

      {/* ── Category filter bar ───────────────────────────────── */}
      {allCategories.length > 1 && (
        <div className="flex gap-2 flex-wrap items-center">
          <span className="text-xs text-slate-400 font-medium shrink-0">หมวดหมู่:</span>
          <button onClick={() => setFilterCategory('all')}
            className={`px-3 py-1 rounded-lg text-xs font-medium border transition-colors
              ${filterCategory === 'all' ? 'bg-slate-700 text-white border-slate-700' : 'bg-white border-slate-200 text-slate-500 hover:bg-slate-50 hover:border-slate-300'}`}>
            ทั้งหมด
          </button>
          {allCategories.map(cat => (
            <button key={cat} onClick={() => setFilterCategory(filterCategory === cat ? 'all' : cat)}
              className={`px-3 py-1 rounded-lg text-xs font-medium border transition-colors
                ${filterCategory === cat ? 'bg-slate-700 text-white border-slate-700' : 'bg-white border-slate-200 text-slate-500 hover:bg-slate-50 hover:border-slate-300'}`}>
              {cat}
            </button>
          ))}
        </div>
      )}

      {/* ── Status filter pills ───────────────────────────────── */}
      <div className="flex gap-2 flex-wrap items-center">
        <button onClick={() => setFilterStatus('all')}
          className={filterStatus === 'all'
            ? 'px-3.5 py-1.5 rounded-lg text-sm font-medium border bg-indigo-600 text-white border-indigo-600 transition-colors'
            : 'px-3.5 py-1.5 rounded-lg text-sm font-medium border bg-white border-slate-200 text-slate-500 hover:bg-slate-50 hover:border-slate-300 transition-colors'}>
          ทั้งหมด <span className="ml-1 opacity-60 tabular-nums">{sales.length}</span>
        </button>
        {SALES_STATUS_OPTIONS.map(s => (
          <button key={s} onClick={() => setFilterStatus(filterStatus === s ? 'all' : s)}
            className={`px-3.5 py-1.5 rounded-lg text-sm font-medium border transition-colors
              ${filterStatus === s
                ? (salesStatusStyle[s] || '') + ' border-current/20'
                : 'bg-white border-slate-200 text-slate-500 hover:bg-slate-50 hover:border-slate-300'}`}>
            {s} <span className="ml-1 tabular-nums opacity-60">{countByStatus[s] || 0}</span>
          </button>
        ))}
      </div>

      {/* ── Table ─────────────────────────────────────────────── */}
      <div className={tableWrapCls}>
        <div className="px-4 py-3 border-b border-slate-100 flex items-center justify-between gap-3 flex-wrap">
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
          <span className="text-xs text-slate-400 whitespace-nowrap tabular-nums">{filteredAndSearched.length} รายการ</span>
        </div>
        <div className="hidden md:block overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-slate-50/60 border-b border-slate-100">
                <th className={thCls}>Product</th>
                <th className={thCls}>ชื่อสินค้า</th>
                <th className={thCls}>ผู้รับผิดชอบ</th>
                <th className={thCls}>หมวดหมู่</th>
                <th className={thCls}>ช่วงเวลา</th>
                <th className={thRightCls}>เป้ายอดขาย</th>
                <th className={thRightCls}>เป้าจำนวน</th>
                <th className={thRightCls}>ยอดจริง</th>
                <th className={thRightCls}>รับเงินจริง</th>
                <th className={thRightCls}>ยังขาด</th>
                <th className={thCls}>% สำเร็จ</th>
                <th className={thRightCls}>ต้องขาย/วัน</th>
                <th className={thCls}>สถานะ</th>
                <th className={thCls}></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100/60">
              {loading ? (
                <TableSkeleton cols={14} />
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
                const rowDaysLeft = s.period_end ? Math.max(0, Math.round((new Date(s.period_end).getTime() - TODAY_MS) / 86400000)) : 0
                const rowPerDay   = rowDaysLeft > 0 && rowGap > 0 ? Math.round(rowGap / rowDaysLeft) : 0
                return (
                  <tr key={s.id} className="hover:bg-slate-50/60 transition-colors">
                    <td className={`${tdCls} font-mono text-xs font-medium text-slate-500`}>{s.product_id}</td>
                    <td className={`${tdCls} font-semibold text-slate-900 max-w-[160px]`}>
                      <span className="truncate block">{product?.name}</span>
                    </td>
                    <td className={tdCls}>
                      {product?.owner
                        ? <span className="text-xs bg-indigo-50 text-indigo-700 px-2 py-0.5 rounded-md font-medium">{product.owner}</span>
                        : <span className="text-slate-300 text-xs">—</span>}
                    </td>
                    <td className={tdCls}>
                      {product?.business_type
                        ? <span className="text-xs text-slate-500 bg-slate-100 px-2 py-0.5 rounded-md">{product.business_type}</span>
                        : <span className="text-xs text-slate-300">—</span>}
                    </td>
                    <td className={`${tdCls} whitespace-nowrap`}>
                      <div className="text-xs text-slate-500">
                        {s.period_start && new Date(s.period_start).toLocaleDateString('th-TH', { day: '2-digit', month: 'short' })}
                        {' – '}
                        {s.period_end && new Date(s.period_end).toLocaleDateString('th-TH', { day: '2-digit', month: 'short' })}
                      </div>
                    </td>
                    <td className={`${tdRightCls} text-sm text-slate-500`}>฿{target.toLocaleString()}</td>
                    <td className={`${tdRightCls} text-sm text-slate-500`}>
                      {Number(s.sales_target_count) > 0
                        ? <span>{Number(s.sales_target_count).toLocaleString()} ชิ้น</span>
                        : <span className="text-slate-300">—</span>}
                    </td>
                    <td className={`${tdRightCls} text-sm font-semibold text-slate-900`}>฿{actual.toLocaleString()}</td>
                    <td className={tdRightCls}>
                      <div className="flex flex-col items-end">
                        <span className="text-sm text-slate-600">฿{received.toLocaleString()}</span>
                        {actual > 0 && (
                          <span className={`text-xs ${colPct >= 80 ? 'text-emerald-600' : colPct >= 50 ? 'text-amber-600' : 'text-red-500'}`}>
                            เก็บได้ {colPct}%
                          </span>
                        )}
                      </div>
                    </td>
                    <td className={`${tdRightCls} text-sm text-red-500 font-medium`}>฿{rowGap.toLocaleString()}</td>
                    <td className={tdCls}>
                      <div className="flex items-center gap-2">
                        <div className="w-16 h-2 rounded-full overflow-hidden bg-slate-100">
                          <div className={`h-full rounded-full ${pct >= 80 ? 'bg-emerald-500' : pct >= 40 ? 'bg-amber-400' : 'bg-blue-500'}`}
                            style={{ width: `${Math.min(pct, 100)}%` }} />
                        </div>
                        <span className="text-sm text-slate-600 tabular-nums font-medium">{pct}%</span>
                      </div>
                    </td>
                    <td className={`${tdRightCls} text-sm`}>
                      {rowPerDay > 0
                        ? <span className="text-amber-600 font-medium">฿{rowPerDay.toLocaleString()}</span>
                        : rowGap === 0
                          ? <span className="text-emerald-600 font-medium">ปิดเป้าแล้ว</span>
                          : <span className="text-slate-300">—</span>}
                    </td>
                    <td className={tdCls}>
                      <StatusSelect value={s.status ?? 'ยังไม่เปิดขาย'} options={SALES_STATUS_OPTIONS} styleMap={salesStatusStyle}
                        disabled={!canUpdate} onChange={v => updateStatus(s.id, v)} />
                    </td>
                    <td className={`${tdCls} whitespace-nowrap`}>
                      <div className="flex items-center gap-1">
                        {canUpdate && (
                          <button onClick={() => openEdit(s)} title="แก้ไข" className={btnSecondary}>
                            <IconPencil />แก้ไข
                          </button>
                        )}
                        {canDelete && (
                          <button onClick={() => setConfirmDelete(s.id)} title="ลบ" className={btnDanger}>
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
          {visibleCount < filteredAndSearched.length && (
            <div className="px-4 py-4 border-t border-slate-100 text-center">
              <button onClick={() => setVisibleCount(v => v + 10)}
                className="text-sm text-indigo-600 font-medium hover:text-indigo-800 transition-colors">
                ดูเพิ่มเติม ({filteredAndSearched.length - visibleCount} รายการ)
              </button>
            </div>
          )}
        </div>

        {/* Mobile card list */}
        <div className="md:hidden divide-y divide-slate-100">
          {loading ? (
            <div className="p-6 text-center text-sm text-slate-400">กำลังโหลด...</div>
          ) : filteredAndSearched.length === 0 ? (
            <div className="p-6 text-center text-sm text-slate-400">ไม่พบข้อมูล</div>
          ) : filteredAndSearched.slice(0, visibleCount).map(s => {
            const product = productMap.get(s.product_id)
            const target  = Number(s.sales_target_amount)
            const actual  = Number(s.actual_sales)
            const received = Number(s.actual_received)
            const rowGap  = Math.max(0, target - actual)
            const pct     = target > 0 ? Math.round((actual / target) * 100) : 0
            const colPct  = actual > 0 ? Math.round((received / actual) * 100) : 0
            const barColor = pct >= 80 ? 'bg-emerald-500' : pct >= 40 ? 'bg-amber-400' : 'bg-blue-500'
            return (
              <div key={s.id} className="p-4 space-y-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-slate-900 text-sm truncate">{product?.name || s.product_id}</p>
                    <div className="flex items-center gap-2 mt-1 flex-wrap">
                      <span className="font-mono text-xs text-slate-400">{s.product_id}</span>
                      {product?.business_type && <span className="text-xs text-slate-400 bg-slate-100 px-1.5 py-0.5 rounded">{product.business_type}</span>}
                    </div>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    {canUpdate && (
                      <button onClick={() => openEdit(s)} className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-xl transition-colors">
                        <IconPencil />
                      </button>
                    )}
                    {canDelete && (
                      <button onClick={() => setConfirmDelete(s.id)} className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-xl transition-colors">
                        <IconTrash />
                      </button>
                    )}
                  </div>
                </div>
                {/* Status — แยกแถวเพื่อป้องกัน dropdown ทับ content */}
                <div>
                  <StatusSelect value={s.status ?? 'ยังไม่เปิดขาย'} options={SALES_STATUS_OPTIONS} styleMap={salesStatusStyle}
                    disabled={!canUpdate} onChange={v => updateStatus(s.id, v)} />
                </div>
                {/* Progress bar */}
                <div>
                  <div className="flex justify-between text-xs mb-1.5">
                    <span className="text-slate-500">ยอดจริง <span className="font-semibold text-slate-800">฿{actual.toLocaleString()}</span></span>
                    <span className="text-slate-400">เป้า ฿{target.toLocaleString()}</span>
                  </div>
                  <div className="w-full h-2 rounded-full overflow-hidden bg-slate-100">
                    <div className={`h-full rounded-full ${barColor}`} style={{ width: `${Math.min(pct, 100)}%` }} />
                  </div>
                  <div className="flex justify-between text-xs mt-1">
                    <span className="text-slate-500">{pct}% สำเร็จ</span>
                    {rowGap > 0 && <span className="text-red-500">ขาด ฿{rowGap.toLocaleString()}</span>}
                    {rowGap === 0 && actual > 0 && <span className="text-emerald-600">ปิดเป้าแล้ว ✓</span>}
                  </div>
                </div>
                {/* Received */}
                {actual > 0 && (
                  <div className="flex justify-between text-xs text-slate-500">
                    <span>รับเงินจริง ฿{received.toLocaleString()}</span>
                    <span className={colPct >= 80 ? 'text-emerald-600' : colPct >= 50 ? 'text-amber-600' : 'text-red-500'}>เก็บได้ {colPct}%</span>
                  </div>
                )}
              </div>
            )
          })}
          {visibleCount < filteredAndSearched.length && (
            <div className="p-4 text-center">
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
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="col-span-1 sm:col-span-2">
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
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="col-span-1 sm:col-span-2">
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
      </>
      )}

      {/* ── Tab: ตั้งค่า ─────────────────────────────────────── */}
      {activeTab === 'settings' && <SalesSettingsPanel />}
    </div>
  )
}
