'use client'

import { useEffect, useState, useMemo } from 'react'
import { createClient } from '@/lib/supabase'
import { useCan } from '@/lib/profile-context'
import SearchInput from './SearchInput'
import { TableSkeleton, EmptyState, todayStr } from './TableState'
import StatusSelect from './StatusSelect'

const SALES_STATUS_OPTIONS = ['ยังไม่เปิดขาย', 'ยังไม่เริ่ม', 'กำลังขาย', 'ปิดเป้า']

const salesStatusStyle: Record<string, string> = {
  'ยังไม่เปิดขาย': 'bg-gray-100 text-gray-400',
  'ยังไม่เริ่ม':   'bg-blue-50 text-blue-700',
  'กำลังขาย':     'bg-amber-50 text-amber-700',
  'ปิดเป้า':       'bg-green-50 text-green-700',
}

// TODAY is stable for the component lifetime — compute once, not on every render.
const TODAY = todayStr()
const TODAY_MS = new Date(TODAY).getTime()

// Module-level inline input — avoids remounting on each keystroke (same pattern as Ads.tsx NumInput).
function InlineNumInput({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  return (
    <input
      type="number"
      value={value}
      onChange={e => onChange(e.target.value)}
      className="w-28 border border-gray-300 rounded-lg px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-gray-900"
    />
  )
}

function IconPlus() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
      <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
    </svg>
  )
}

export default function Sales() {
  const [sales, setSales]       = useState<any[]>([])
  const [products, setProducts] = useState<any[]>([])
  const [loading, setLoading]   = useState(true)
  const [editing, setEditing]   = useState<number | null>(null)
  const [savingRow, setSavingRow] = useState(false)
  const [editVal, setEditVal]   = useState({ sales_target_amount: '', actual_sales: '', actual_received: '' })
  const [search, setSearch]     = useState('')
  const [showForm, setShowForm] = useState(false)
  const [saving, setSaving]     = useState(false)
  const [form, setForm] = useState({
    product_id: '', period_start: '', period_end: '',
    sales_target_amount: '', sales_target_count: '', status: 'ยังไม่เปิดขาย',
  })
  const [error, setError]       = useState('')
  const canInsert = useCan('insert', 'sales')
  const canUpdate = useCan('update', 'sales')
  const supabase = createClient()

  async function load() {
    // Select only columns displayed — skips created_at, updated_at, etc.
    const [s, p] = await Promise.all([
      supabase
        .from('sales')
        .select('id, product_id, period_start, period_end, sales_target_amount, actual_sales, actual_received, status')
        .order('product_id'),
      supabase.from('products').select('product_id, name, status'),
    ])
    setSales(s.data || [])
    setProducts(p.data || [])
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  async function save() {
    setSaving(true)
    setError('')
    if (form.period_start && form.period_end && form.period_end <= form.period_start) {
      setError('วันสิ้นสุดต้องหลังวันเริ่มต้น')
      setSaving(false)
      return
    }
    const { error: insErr } = await supabase.from('sales').insert([{
      product_id:          form.product_id,
      period_start:        form.period_start,
      period_end:          form.period_end,
      sales_target_amount: Number(form.sales_target_amount) || 0,
      sales_target_count:  Number(form.sales_target_count) || 0,
      status:              form.status,
    }])
    if (insErr) {
      setError(insErr.code === '23505'
        ? 'มีเป้ายอดขายของ Product นี้ในช่วงเวลานี้อยู่แล้ว'
        : insErr.message)
      setSaving(false)
      return
    }
    setShowForm(false)
    setForm({ product_id: '', period_start: '', period_end: '', sales_target_amount: '', sales_target_count: '', status: 'ยังไม่เปิดขาย' })
    await load()
    setSaving(false)
  }

  async function saveEdit(id: number) {
    setSavingRow(true)
    const { error: updErr } = await supabase.from('sales').update({
      sales_target_amount: Number(editVal.sales_target_amount),
      actual_sales:        Number(editVal.actual_sales),
      actual_received:     Number(editVal.actual_received),
    }).eq('id', id)
    setSavingRow(false)
    if (updErr) {
      setError(updErr.message)
      return
    }
    // Update local state from editVal — avoids full table reload for numeric-only update.
    setSales(prev => prev.map(s => s.id === id ? {
      ...s,
      sales_target_amount: Number(editVal.sales_target_amount),
      actual_sales:        Number(editVal.actual_sales),
      actual_received:     Number(editVal.actual_received),
    } : s))
    setEditing(null)
    setError('')
  }

  // Inline status change — optimistic update, revert on error.
  async function updateStatus(id: number, status: string) {
    const old = sales.find(s => s.id === id)?.status
    setSales(prev => prev.map(s => s.id === id ? { ...s, status } : s))
    const { error: updErr } = await supabase.from('sales').update({ status }).eq('id', id)
    if (updErr) {
      setError(updErr.message)
      setSales(prev => prev.map(s => s.id === id ? { ...s, status: old } : s))
    }
  }

  // O(1) product name lookup — avoids O(N) linear scan inside each render row.
  const productMap = useMemo(
    () => new Map(products.map(p => [p.product_id, p])),
    [products],
  )

  // Summary period logic — memoized.
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

  // KPI summary totals — memoized.
  const totalTarget = useMemo(() => sales.reduce((s, r) => s + Number(r.sales_target_amount), 0), [sales])
  const totalActual = useMemo(() => sales.reduce((s, r) => s + Number(r.actual_sales), 0), [sales])
  const overallPct  = totalTarget > 0 ? Math.round((totalActual / totalTarget) * 100) : 0
  const gap         = Math.max(0, totalTarget - totalActual)
  const perDay      = daysLeft > 0 && gap > 0 ? Math.round(gap / daysLeft) : 0

  // Client-side text search — memoized.
  const filtered = useMemo(() => {
    if (!search) return sales
    const q = search.toLowerCase()
    return sales.filter(s => {
      const product = productMap.get(s.product_id)
      return s.product_id.toLowerCase().includes(q) || (product?.name || '').toLowerCase().includes(q)
    })
  }, [sales, search, productMap])

  const headers = ['Product ID', 'ชื่อสินค้า', 'เป้ายอดขาย', 'ยอดจริง', 'รับเงินจริง', 'ยังขาด', '% สำเร็จ', 'ต้องขาย/วัน', 'สถานะ', '']

  return (
    <div className="p-6 max-w-screen-xl mx-auto space-y-5">

      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-semibold text-gray-900">Sales</h1>
          <p className="text-sm text-gray-400 mt-0.5">ยอดขายรวม — เหลือ {daysLeft} วัน ถึงสิ้นรอบ</p>
        </div>
        {canInsert && (
          <button
            onClick={() => setShowForm(v => !v)}
            className="flex items-center gap-1.5 bg-gray-900 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-gray-700 transition-colors"
          >
            <IconPlus />
            เพิ่มเป้ายอดขาย
          </button>
        )}
      </div>

      {error && !showForm && (
        <p className="text-sm bg-red-50 text-red-600 border border-red-100 rounded-lg px-3.5 py-2.5">{error}</p>
      )}

      {/* Add sales target form */}
      {showForm && (
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <h3 className="text-sm font-semibold text-gray-900 mb-4">เพิ่มเป้ายอดขายใหม่</h3>
          <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
            <select
              value={form.product_id}
              onChange={e => setForm({ ...form, product_id: e.target.value })}
              className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gray-900 bg-white"
            >
              <option value="">เลือก Product</option>
              {products.map(p => <option key={p.product_id} value={p.product_id}>{p.product_id} — {p.name}</option>)}
            </select>
            <input
              type="date" value={form.period_start}
              onChange={e => setForm({ ...form, period_start: e.target.value })}
              className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gray-900"
            />
            <input
              type="date" value={form.period_end}
              onChange={e => setForm({ ...form, period_end: e.target.value })}
              className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gray-900"
            />
            <input
              type="number" placeholder="เป้ายอดขาย (฿)" value={form.sales_target_amount}
              onChange={e => setForm({ ...form, sales_target_amount: e.target.value })}
              className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gray-900 placeholder:text-gray-400"
            />
            <input
              type="number" placeholder="เป้าจำนวนชิ้น" value={form.sales_target_count}
              onChange={e => setForm({ ...form, sales_target_count: e.target.value })}
              className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gray-900 placeholder:text-gray-400"
            />
            <select
              value={form.status}
              onChange={e => setForm({ ...form, status: e.target.value })}
              className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gray-900 bg-white"
            >
              {SALES_STATUS_OPTIONS.map(s => <option key={s}>{s}</option>)}
            </select>
          </div>
          {error && (
            <p className="text-sm bg-red-50 text-red-600 border border-red-100 rounded-lg px-3.5 py-2.5 mt-3">{error}</p>
          )}
          <div className="flex gap-2 mt-4">
            <button
              onClick={save}
              disabled={saving || !form.product_id || !form.period_start || !form.period_end}
              className="bg-gray-900 text-white px-4 py-2 rounded-lg text-sm font-medium disabled:opacity-40 hover:bg-gray-700 transition-colors"
            >
              {saving ? 'กำลังบันทึก...' : 'บันทึก'}
            </button>
            <button
              onClick={() => { setShowForm(false); setError('') }}
              className="text-sm text-gray-400 px-4 py-2 rounded-lg hover:bg-gray-100 transition-colors"
            >
              ยกเลิก
            </button>
          </div>
        </div>
      )}

      {/* Summary cards */}
      <div className="grid grid-cols-3 gap-4">
        <div className="bg-white rounded-xl border border-gray-100 p-5">
          <p className="text-xs text-gray-400 mb-3">ยอดขายรวม</p>
          <p className="text-2xl font-semibold text-gray-900 leading-none">฿{totalActual.toLocaleString()}</p>
          <div className="mt-3">
            <div className="w-full h-1 bg-gray-100 rounded-full overflow-hidden">
              <div
                className="h-full rounded-full bg-gray-900"
                style={{ width: `${Math.min(overallPct, 100)}%` }}
              />
            </div>
            <p className="text-xs text-gray-400 mt-1.5">{overallPct}% ของเป้า ฿{totalTarget.toLocaleString()}</p>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-gray-100 p-5">
          <p className="text-xs text-gray-400 mb-3">ยังขาดอยู่</p>
          <p className="text-2xl font-semibold text-red-500 leading-none">฿{gap.toLocaleString()}</p>
          <p className="text-xs text-gray-400 mt-2">ต้องขายเพิ่ม ฿{perDay.toLocaleString()}/วัน</p>
        </div>

        <div className="bg-white rounded-xl border border-gray-100 p-5">
          <p className="text-xs text-gray-400 mb-3">วันที่คงเหลือ</p>
          <p className="text-2xl font-semibold text-gray-900 leading-none">{daysLeft} วัน</p>
          <p className="text-xs text-gray-400 mt-2">
            สิ้นสุด {periodEnd.toLocaleDateString('th-TH', { day: '2-digit', month: 'short', year: 'numeric' })}
          </p>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
        <div className="px-5 py-3 border-b border-gray-100 flex items-center justify-between gap-3">
          <SearchInput value={search} onChange={setSearch} placeholder="ค้นหาด้วย Product ID หรือชื่อสินค้า..." />
          <span className="text-xs text-gray-400 whitespace-nowrap">{filtered.length} รายการ</span>
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
                <EmptyState message="ยังไม่มีเป้ายอดขาย กด &quot;เพิ่มเป้ายอดขาย&quot; เพื่อเริ่ม" />
              ) : filtered.map(s => {
                // O(1) lookup via productMap
                const product = productMap.get(s.product_id)
                const target  = Number(s.sales_target_amount)
                const actual  = Number(s.actual_sales)
                const received = Number(s.actual_received)
                const rowGap  = Math.max(0, target - actual)
                const pct     = target > 0 ? Math.round((actual / target) * 100) : 0
                const colPct  = actual > 0 ? Math.round((received / actual) * 100) : 0
                const rowDaysLeft = Math.max(0, Math.round((new Date(s.period_end).getTime() - TODAY_MS) / 86400000))
                const perDayRow = rowDaysLeft > 0 && rowGap > 0 ? Math.round(rowGap / rowDaysLeft) : 0
                return (
                  <tr key={s.id} className="border-b border-gray-50 hover:bg-gray-50 transition-colors last:border-0">
                    <td className="px-4 py-3 font-mono text-xs text-gray-400">{s.product_id}</td>
                    <td className="px-4 py-3 font-medium text-gray-900 max-w-[160px] truncate">{product?.name}</td>
                    <td className="px-4 py-3 text-sm text-gray-500 tabular-nums">
                      {editing === s.id
                        ? <InlineNumInput value={editVal.sales_target_amount} onChange={v => setEditVal({ ...editVal, sales_target_amount: v })} />
                        : <span>฿{target.toLocaleString()}</span>
                      }
                    </td>
                    <td className="px-4 py-3 tabular-nums">
                      {editing === s.id
                        ? <InlineNumInput value={editVal.actual_sales} onChange={v => setEditVal({ ...editVal, actual_sales: v })} />
                        : <span className="text-sm font-medium text-gray-900">฿{actual.toLocaleString()}</span>
                      }
                    </td>
                    <td className="px-4 py-3 tabular-nums">
                      {editing === s.id
                        ? <InlineNumInput value={editVal.actual_received} onChange={v => setEditVal({ ...editVal, actual_received: v })} />
                        : (
                          <div className="flex flex-col">
                            <span className="text-sm text-gray-600">฿{received.toLocaleString()}</span>
                            {actual > 0 && (
                              <span className={`text-[10px] ${colPct >= 80 ? 'text-green-600' : colPct >= 50 ? 'text-amber-600' : 'text-red-500'}`}>
                                เก็บได้ {colPct}%
                              </span>
                            )}
                          </div>
                        )
                      }
                    </td>
                    <td className="px-4 py-3 text-sm text-red-500 tabular-nums">฿{rowGap.toLocaleString()}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <div className="w-12 h-1 bg-gray-100 rounded-full overflow-hidden">
                          <div
                            className={`h-full rounded-full ${pct >= 80 ? 'bg-green-500' : pct >= 40 ? 'bg-amber-400' : 'bg-blue-500'}`}
                            style={{ width: `${Math.min(pct, 100)}%` }}
                          />
                        </div>
                        <span className="text-xs text-gray-500 tabular-nums">{pct}%</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-xs font-medium text-amber-600 tabular-nums">
                      {perDayRow > 0 ? `฿${perDayRow.toLocaleString()}` : '—'}
                    </td>
                    <td className="px-4 py-3">
                      <StatusSelect
                        value={s.status}
                        options={SALES_STATUS_OPTIONS}
                        styleMap={salesStatusStyle}
                        disabled={!canUpdate}
                        onChange={v => updateStatus(s.id, v)}
                      />
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      {editing === s.id
                        ? <div className="flex gap-1">
                            <button
                              onClick={() => saveEdit(s.id)}
                              disabled={savingRow}
                              className="text-xs bg-gray-900 text-white px-2.5 py-1 rounded-lg hover:bg-gray-700 transition-colors disabled:opacity-40"
                            >
                              {savingRow ? '...' : 'บันทึก'}
                            </button>
                            <button
                              onClick={() => { setEditing(null); setError('') }}
                              className="text-xs text-gray-400 px-2 py-1 rounded-lg hover:bg-gray-100 transition-colors"
                            >
                              ยกเลิก
                            </button>
                          </div>
                        : canUpdate ? <button
                            onClick={() => {
                              setEditing(s.id)
                              setEditVal({
                                sales_target_amount: String(s.sales_target_amount),
                                actual_sales:        String(s.actual_sales),
                                actual_received:     String(s.actual_received),
                              })
                            }}
                            className="text-xs text-gray-400 hover:text-gray-900 transition-colors"
                          >
                            แก้ไข
                          </button> : <span className="text-xs text-gray-300">—</span>
                      }
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
