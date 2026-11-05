'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase'
import { useProfile } from '@/lib/profile-context'
import { EmptyState } from './TableState'

export default function Dashboard() {
  const [products, setProducts] = useState<any[]>([])
  const [sales, setSales] = useState<any[]>([])
  const [contents, setContents] = useState<any[]>([])
  const [ads, setAds] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null)
  const profile = useProfile()
  const router = useRouter()
  const supabase = createClient()

  async function load() {
    setRefreshing(true)
    const [p, s, c, a] = await Promise.all([
      supabase.from('products').select('*'),
      supabase.from('sales').select('*'),
      supabase.from('contents').select('*'),
      supabase.from('ads').select('*'),
    ])
    setProducts(p.data || [])
    setSales(s.data || [])
    setContents(c.data || [])
    setAds(a.data || [])
    setLastUpdated(new Date())
    setLoading(false)
    setRefreshing(false)
  }

  useEffect(() => { load() }, [])

  if (loading) return <Loading />

  // Bug fix: use the generated budget_total column (approved + adjustment) instead of budget_approved alone.
  const totalBudget  = ads.reduce((s, r) => s + Number(r.budget_total ?? 0), 0)
  const totalSpent   = ads.reduce((s, r) => s + Number(r.budget_spent), 0)
  const totalTarget  = sales.reduce((s, r) => s + Number(r.sales_target_amount), 0)
  const totalActual  = sales.reduce((s, r) => s + Number(r.actual_sales), 0)
  const totalLeads   = ads.reduce((s, r) => s + Number(r.leads), 0)
  const contentDone  = contents.filter(c => c.status === 'โพสต์แล้ว').length
  const contentWait  = contents.filter(c => c.status === 'รอผลิต').length
  const pct = totalTarget > 0 ? Math.round((totalActual / totalTarget) * 100) : 0

  const statusStyle: Record<string, string> = {
    'เปิดขาย':       'bg-green-50 text-green-700',
    'เตรียมเปิดตัว': 'bg-amber-50 text-amber-700',
    'กำลังพัฒนา':   'bg-blue-50 text-blue-700',
    'หยุดขาย':       'bg-gray-100 text-gray-400',
  }

  const updatedLabel = lastUpdated
    ? lastUpdated.toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit', second: '2-digit' })
    : ''

  return (
    <div className="p-6 max-w-screen-xl mx-auto space-y-6">

      {/* Page header with refresh */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-semibold text-gray-900">Dashboard</h1>
          <p className="text-sm text-gray-400 mt-0.5">
            ภาพรวมทุก Product{updatedLabel && ` — อัปเดต ${updatedLabel}`}
          </p>
        </div>
        <button
          onClick={load}
          disabled={refreshing}
          className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-900 px-3 py-1.5 rounded-lg hover:bg-gray-100 transition-colors disabled:opacity-40"
        >
          <svg
            width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor"
            strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
            className={refreshing ? 'animate-spin' : ''}
          >
            <polyline points="23 4 23 10 17 10" />
            <polyline points="1 20 1 14 7 14" />
            <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15" />
          </svg>
          {refreshing ? 'กำลังโหลด...' : 'รีเฟรช'}
        </button>
      </div>

      {/* KPI row — clickable to drill down into the relevant page */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KPICard
          label="ยอดขายจริง"
          value={`฿${totalActual.toLocaleString()}`}
          sub={`เป้า ฿${totalTarget.toLocaleString()}`}
          pct={pct}
          onClick={() => router.push('/sales')}
        />
        <KPICard
          label="งบ Ads คงเหลือ"
          value={`฿${(totalBudget - totalSpent).toLocaleString()}`}
          sub={`ใช้ไป ฿${totalSpent.toLocaleString()}`}
          onClick={() => router.push('/ads')}
        />
        <KPICard
          label="Leads รวม"
          value={totalLeads.toLocaleString()}
          sub={`${ads.length} campaigns`}
          onClick={() => router.push('/ads')}
        />
        <KPICard
          label="Content โพสต์แล้ว"
          value={`${contentDone} / ${contents.length}`}
          sub={`รอผลิตอีก ${contentWait} ชิ้น`}
          onClick={() => router.push('/contents')}
        />
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
                const s = sales.find(s => s.product_id === p.product_id)
                const c = contents.filter(c => c.product_id === p.product_id)
                const target = Number(s?.sales_target_amount || 0)
                const actual = Number(s?.actual_sales || 0)
                const rowPct = target > 0 ? Math.round((actual / target) * 100) : 0
                return (
                  <tr key={p.id} className="border-b border-gray-50 hover:bg-gray-50 transition-colors last:border-0">
                    <td className="px-5 py-3 font-mono text-xs text-gray-400">{p.product_id}</td>
                    <td className="px-4 py-3 font-medium text-gray-900 max-w-[200px] truncate">{p.name}</td>
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
                          <div
                            className={`h-full rounded-full ${rowPct >= 80 ? 'bg-green-500' : rowPct >= 40 ? 'bg-amber-400' : 'bg-blue-500'}`}
                            style={{ width: `${Math.min(rowPct, 100)}%` }}
                          />
                        </div>
                        <span className="text-xs text-gray-500 w-8 text-right">{rowPct}%</span>
                      </div>
                    </td>
                    <td className="px-5 py-3 text-right text-xs text-gray-400">
                      {c.filter(x => x.status === 'โพสต์แล้ว').length}/{c.length}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* My Tasks — work assigned to the current user */}
      {(() => {
        const myContents = contents.filter(c => c.assigned_to_id === profile.id)
        const myAds = ads.filter(a => a.managed_by_id === profile.id)
        const myProducts = products.filter(p => p.owner_id === profile.id)
        const myDone = myContents.filter(c => c.status === 'โพสต์แล้ว').length
        const myInProgress = myContents.filter(c => c.status !== 'โพสต์แล้ว' && c.status !== 'รอผลิต').length
        const myWaiting = myContents.filter(c => c.status === 'รอผลิต').length
        const totalTasks = myContents.length + myAds.length + myProducts.length

        return (
          <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
            <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
              <h2 className="text-sm font-semibold text-gray-900">งานของฉัน</h2>
              <span className="text-xs text-gray-400">{totalTasks} งาน</span>
            </div>
            <div className="grid grid-cols-3 gap-0 divide-x divide-gray-100">
              <div className="p-5">
                <p className="text-xs text-gray-400 mb-2">Content ที่รับผิดชอบ</p>
                <p className="text-2xl font-semibold text-gray-900 leading-none">{myContents.length}</p>
                <div className="flex gap-3 mt-3 flex-wrap">
                  <span className="text-xs text-green-600">โพสต์แล้ว {myDone}</span>
                  <span className="text-xs text-blue-500">กำลังทำ {myInProgress}</span>
                  <span className="text-xs text-gray-400">รอผลิต {myWaiting}</span>
                </div>
              </div>
              <div className="p-5">
                <p className="text-xs text-gray-400 mb-2">แคมเปญ Ads ที่ดูแล</p>
                <p className="text-2xl font-semibold text-gray-900 leading-none">{myAds.length}</p>
                <p className="text-xs text-gray-400 mt-3">campaigns</p>
              </div>
              <div className="p-5">
                <p className="text-xs text-gray-400 mb-2">Product ที่ดูแล</p>
                <p className="text-2xl font-semibold text-gray-900 leading-none">{myProducts.length}</p>
                <p className="text-xs text-gray-400 mt-3">products</p>
              </div>
            </div>
          </div>
        )
      })()}
    </div>
  )
}

function KPICard({ label, value, sub, pct, onClick }: {
  label: string
  value: string
  sub: string
  pct?: number
  onClick?: () => void
}) {
  const interactive = !!onClick
  return (
    <div
      onClick={onClick}
      role={interactive ? 'button' : undefined}
      tabIndex={interactive ? 0 : undefined}
      onKeyDown={interactive ? (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onClick!() } } : undefined}
      className={`bg-white rounded-xl border border-gray-100 p-5 ${interactive ? 'hover:border-gray-300 hover:shadow-sm transition-all cursor-pointer' : ''}`}
    >
      <div className="flex items-center justify-between">
        <p className="text-xs text-gray-400 mb-3">{label}</p>
        {interactive && (
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-gray-300">
            <line x1="7" y1="17" x2="17" y2="7" /><polyline points="7 7 17 7 17 17" />
          </svg>
        )}
      </div>
      <p className="text-2xl font-semibold text-gray-900 leading-none">{value}</p>
      <p className="text-xs text-gray-400 mt-2">{sub}</p>
      {pct !== undefined && (
        <div className="mt-3">
          <div className="w-full h-1 bg-gray-100 rounded-full overflow-hidden">
            <div
              className="h-full rounded-full bg-gray-900 transition-all"
              style={{ width: `${Math.min(pct, 100)}%` }}
            />
          </div>
          <p className="text-xs text-gray-400 mt-1.5">{pct}% ของเป้า</p>
        </div>
      )}
    </div>
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
    </div>
  )
}
