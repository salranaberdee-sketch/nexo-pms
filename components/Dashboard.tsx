'use client'

import { useEffect, useState, useMemo } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase'
import { useProfile } from '@/lib/profile-context'
import { EmptyState } from './TableState'
import { showToast } from './Toast'

export default function Dashboard() {
  const [products, setProducts] = useState<any[]>([])
  const [sales, setSales] = useState<any[]>([])
  const [contents, setContents] = useState<any[]>([])
  const [ads, setAds] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [loadError, setLoadError] = useState('')
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null)
  const profile = useProfile()
  const supabase = createClient()

  async function load(silent = false) {
    if (!silent) setRefreshing(true)
    setLoadError('')
    const [p, s, c, a] = await Promise.all([
      supabase.from('products').select('id, product_id, name, brand, status, owner_id'),
      supabase.from('sales').select('product_id, sales_target_amount, actual_sales'),
      supabase.from('contents').select('product_id, status, assigned_to_id'),
      supabase.from('ads').select('budget_total, budget_spent, leads, managed_by_id'),
    ])
    // Surface first error encountered
    const err = p.error || s.error || c.error || a.error
    if (err) {
      setLoadError(err.message)
      setRefreshing(false)
      setLoading(false)
      return
    }
    setProducts(p.data || [])
    setSales(s.data || [])
    setContents(c.data || [])
    setAds(a.data || [])
    setLastUpdated(new Date())
    setLoading(false)
    setRefreshing(false)
    if (!silent) showToast('อัปเดตข้อมูลแล้ว', 'info')
  }

  useEffect(() => { load(true) }, [])

  // O(1) lookup maps
  const salesByProduct = useMemo(
    () => new Map(sales.map(s => [s.product_id, s])),
    [sales],
  )
  const contentsByProduct = useMemo(
    () => contents.reduce((m, c) => {
      const arr = m.get(c.product_id) || []
      arr.push(c)
      m.set(c.product_id, arr)
      return m
    }, new Map<string, any[]>()),
    [contents],
  )

  // KPI aggregations
  const totalBudget  = useMemo(() => ads.reduce((s, r) => s + Number(r.budget_total ?? 0), 0), [ads])
  const totalSpent   = useMemo(() => ads.reduce((s, r) => s + Number(r.budget_spent), 0), [ads])
  const totalTarget  = useMemo(() => sales.reduce((s, r) => s + Number(r.sales_target_amount), 0), [sales])
  const totalActual  = useMemo(() => sales.reduce((s, r) => s + Number(r.actual_sales), 0), [sales])
  const totalLeads   = useMemo(() => ads.reduce((s, r) => s + Number(r.leads), 0), [ads])
  const contentDone  = useMemo(() => contents.filter(c => c.status === 'โพสต์แล้ว').length, [contents])
  const contentWait  = useMemo(() => contents.filter(c => c.status === 'รอผลิต').length, [contents])
  const pct = totalTarget > 0 ? Math.round((totalActual / totalTarget) * 100) : 0

  // "งานของฉัน"
  const myTasks = useMemo(() => {
    const myContents = contents.filter(c => c.assigned_to_id === profile.id)
    const myAds = ads.filter(a => a.managed_by_id === profile.id)
    const myProducts = products.filter(p => p.owner_id === profile.id)
    return {
      myContents,
      myAds,
      myProducts,
      myDone:       myContents.filter(c => c.status === 'โพสต์แล้ว').length,
      myInProgress: myContents.filter(c => c.status !== 'โพสต์แล้ว' && c.status !== 'รอผลิต').length,
      myWaiting:    myContents.filter(c => c.status === 'รอผลิต').length,
      totalTasks:   myContents.length + myAds.length + myProducts.length,
    }
  }, [contents, ads, products, profile.id])

  const statusStyle: Record<string, string> = {
    'เปิดขาย':       'bg-green-50 text-green-700',
    'เตรียมเปิดตัว': 'bg-amber-50 text-amber-700',
    'กำลังพัฒนา':   'bg-blue-50 text-blue-700',
    'หยุดขาย':       'bg-gray-100 text-gray-400',
  }

  const updatedLabel = lastUpdated
    ? lastUpdated.toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit', second: '2-digit' })
    : ''

  if (loading) return <Loading />

  return (
    <div className="p-6 max-w-screen-xl mx-auto space-y-6">

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-semibold text-gray-900">Dashboard</h1>
          <p className="text-sm text-gray-400 mt-0.5">
            ภาพรวมทุก Product{updatedLabel && ` — อัปเดต ${updatedLabel}`}
          </p>
        </div>
        <button
          onClick={() => load(false)}
          disabled={refreshing}
          className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-900 px-3 py-1.5 rounded-lg hover:bg-gray-100 transition-colors disabled:opacity-40"
        >
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor"
            strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
            className={refreshing ? 'animate-spin' : ''}>
            <polyline points="23 4 23 10 17 10" />
            <polyline points="1 20 1 14 7 14" />
            <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15" />
          </svg>
          {refreshing ? 'กำลังโหลด...' : 'รีเฟรช'}
        </button>
      </div>

      {loadError && (
        <div className="bg-red-50 border border-red-100 rounded-xl px-4 py-3 text-sm text-red-600">
          โหลดข้อมูลไม่สำเร็จ: {loadError}
          <button onClick={() => load(false)} className="ml-3 underline text-red-500 hover:text-red-700">ลองใหม่</button>
        </div>
      )}

      {/* KPI row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KPICard label="ยอดขายจริง" value={`฿${totalActual.toLocaleString()}`}
          sub={`เป้า ฿${totalTarget.toLocaleString()}`} pct={pct} href="/sales" />
        <KPICard label="งบ Ads คงเหลือ" value={`฿${(totalBudget - totalSpent).toLocaleString()}`}
          sub={`ใช้ไป ฿${totalSpent.toLocaleString()}`} href="/ads" />
        <KPICard label="Leads รวม" value={totalLeads.toLocaleString()}
          sub={`${ads.length} campaigns`} href="/ads" />
        <KPICard label="Content โพสต์แล้ว" value={`${contentDone} / ${contents.length}`}
          sub={`รอผลิตอีก ${contentWait} ชิ้น`} href="/contents" />
      </div>

      {/* Products summary table */}
      <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
          <h2 className="text-sm font-semibold text-gray-900">สถานะทุก Product</h2>
          <span className="text-xs text-gray-400">{products.length} รายการ</span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100">
                <th className="text-left px-5 py-3 text-xs font-medium text-gray-400">Product ID</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-400">ชื่อสินค้า</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-400">แบรนด์</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-400">สถานะ</th>
                <th className="text-right px-4 py-3 text-xs font-medium text-gray-400">เป้า</th>
                <th className="text-right px-4 py-3 text-xs font-medium text-gray-400">ยอดจริง</th>
                <th className="text-right px-4 py-3 text-xs font-medium text-gray-400">% สำเร็จ</th>
                <th className="text-right px-5 py-3 text-xs font-medium text-gray-400">Content</th>
              </tr>
            </thead>
            <tbody>
              {products.length === 0 ? (
                <EmptyState message="ยังไม่มี Product ในระบบ" />
              ) : products.map(p => {
                const s = salesByProduct.get(p.product_id)
                const c = contentsByProduct.get(p.product_id) || []
                const target = Number(s?.sales_target_amount || 0)
                const actual = Number(s?.actual_sales || 0)
                const rowPct = target > 0 ? Math.round((actual / target) * 100) : 0
                const barColor = rowPct >= 80 ? 'bg-green-500' : rowPct >= 40 ? 'bg-amber-400' : 'bg-blue-500'
                return (
                  <tr key={p.id} className="border-b border-gray-50 hover:bg-gray-50 transition-colors last:border-0">
                    <td className="px-5 py-3 font-mono text-xs text-gray-400">{p.product_id}</td>
                    {/* title tooltip on truncated name */}
                    <td className="px-4 py-3 font-medium text-gray-900 max-w-[200px] truncate" title={p.name}>{p.name}</td>
                    <td className="px-4 py-3 text-sm text-gray-500">{p.brand}</td>
                    <td className="px-4 py-3">
                      <span className={`inline-block px-2 py-0.5 rounded-md text-xs font-medium ${statusStyle[p.status] || 'bg-gray-100 text-gray-400'}`}>
                        {p.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right text-sm text-gray-400">฿{target.toLocaleString()}</td>
                    <td className="px-4 py-3 text-right text-sm font-medium text-gray-900">฿{actual.toLocaleString()}</td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <div className="w-14 h-1 bg-gray-100 rounded-full overflow-hidden">
                          <div className={`h-full rounded-full ${barColor}`}
                            style={{ width: `${Math.min(rowPct, 100)}%` }} />
                        </div>
                        <span className="text-xs text-gray-500 w-10 text-right tabular-nums">{rowPct}%</span>
                      </div>
                    </td>
                    {/* Click content count → Contents filtered by product */}
                    <td className="px-5 py-3 text-right">
                      <Link href={`/contents?product=${p.product_id}`}
                        className="text-xs text-gray-400 hover:text-blue-600 hover:underline transition-colors">
                        {c.filter((x: any) => x.status === 'โพสต์แล้ว').length}/{c.length}
                      </Link>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* My Tasks */}
      <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
          <h2 className="text-sm font-semibold text-gray-900">งานของฉัน</h2>
          <span className="text-xs text-gray-400">{myTasks.totalTasks} รายการ</span>
        </div>
        <div className="grid grid-cols-3 gap-0 divide-x divide-gray-100">
          {/* Content cell — drill-down to Contents filtered by me */}
          <Link href="/contents" className="p-5 hover:bg-gray-50 transition-colors block">
            <p className="text-xs text-gray-400 mb-2">Content ที่รับผิดชอบ</p>
            <p className="text-2xl font-semibold text-gray-900 leading-none">{myTasks.myContents.length}</p>
            <div className="flex gap-3 mt-3 flex-wrap">
              <span className="text-xs text-green-600">โพสต์แล้ว {myTasks.myDone}</span>
              <span className="text-xs text-blue-500">กำลังทำ {myTasks.myInProgress}</span>
              <span className="text-xs text-gray-400">รอผลิต {myTasks.myWaiting}</span>
            </div>
          </Link>
          {/* Ads cell */}
          <Link href="/ads" className="p-5 hover:bg-gray-50 transition-colors block">
            <p className="text-xs text-gray-400 mb-2">แคมเปญ Ads ที่ดูแล</p>
            <p className="text-2xl font-semibold text-gray-900 leading-none">{myTasks.myAds.length}</p>
            <p className="text-xs text-gray-400 mt-3">campaigns</p>
          </Link>
          {/* Products cell */}
          <Link href="/products" className="p-5 hover:bg-gray-50 transition-colors block">
            <p className="text-xs text-gray-400 mb-2">Product ที่ดูแล</p>
            <p className="text-2xl font-semibold text-gray-900 leading-none">{myTasks.myProducts.length}</p>
            <p className="text-xs text-gray-400 mt-3">products</p>
          </Link>
        </div>
      </div>
    </div>
  )
}

function KPICard({ label, value, sub, pct, href }: {
  label: string; value: string; sub: string; pct?: number; href: string
}) {
  const barColor = pct !== undefined
    ? pct >= 80 ? 'bg-green-500' : pct >= 40 ? 'bg-amber-400' : 'bg-blue-500'
    : 'bg-gray-900'
  return (
    <Link href={href}
      className="bg-white rounded-xl border border-gray-100 p-5 hover:border-gray-300 hover:shadow-sm transition-all block">
      <div className="flex items-center justify-between mb-3">
        <p className="text-xs text-gray-400">{label}</p>
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-gray-300">
          <line x1="7" y1="17" x2="17" y2="7" /><polyline points="7 7 17 7 17 17" />
        </svg>
      </div>
      <p className="text-2xl font-semibold text-gray-900 leading-none">{value}</p>
      <p className="text-xs text-gray-400 mt-2">{sub}</p>
      {pct !== undefined && (
        <div className="mt-3">
          <div className="w-full h-1 bg-gray-100 rounded-full overflow-hidden">
            <div className={`h-full rounded-full ${barColor} transition-all`}
              style={{ width: `${Math.min(pct, 100)}%` }} />
          </div>
          <p className="text-xs text-gray-400 mt-1.5">{pct}% ของเป้า</p>
        </div>
      )}
    </Link>
  )
}

function Loading() {
  return (
    <div className="p-6 space-y-4">
      <div className="grid grid-cols-4 gap-4">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="bg-white rounded-xl h-28 animate-pulse border border-gray-100" />
        ))}
      </div>
      <div className="bg-white rounded-xl h-64 animate-pulse border border-gray-100" />
      <div className="bg-white rounded-xl h-28 animate-pulse border border-gray-100" />
    </div>
  )
}
