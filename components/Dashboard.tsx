'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase'

export default function Dashboard() {
  const [products, setProducts] = useState<any[]>([])
  const [sales, setSales] = useState<any[]>([])
  const [contents, setContents] = useState<any[]>([])
  const [ads, setAds] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const supabase = createClient()

  useEffect(() => {
    async function load() {
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
      setLoading(false)
    }
    load()
  }, [])

  if (loading) return <Loading />

  const totalTarget  = sales.reduce((s, r) => s + Number(r.sales_target_amount), 0)
  const totalActual  = sales.reduce((s, r) => s + Number(r.actual_sales), 0)
  const totalBudget  = ads.reduce((s, r) => s + Number(r.budget_approved), 0)
  const totalSpent   = ads.reduce((s, r) => s + Number(r.budget_spent), 0)
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

  return (
    <div className="p-6 max-w-screen-xl mx-auto space-y-6">

      {/* Page header */}
      <div>
        <h1 className="text-lg font-semibold text-gray-900">Dashboard</h1>
        <p className="text-sm text-gray-400 mt-0.5">ภาพรวมทุก Product — พฤศจิกายน 2026</p>
      </div>

      {/* KPI row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KPICard
          label="ยอดขายจริง"
          value={`฿${totalActual.toLocaleString()}`}
          sub={`เป้า ฿${totalTarget.toLocaleString()}`}
          pct={pct}
        />
        <KPICard
          label="งบ Ads คงเหลือ"
          value={`฿${(totalBudget - totalSpent).toLocaleString()}`}
          sub={`ใช้ไป ฿${totalSpent.toLocaleString()}`}
        />
        <KPICard
          label="Leads รวม"
          value={totalLeads.toLocaleString()}
          sub={`${ads.length} campaigns`}
        />
        <KPICard
          label="Content โพสต์แล้ว"
          value={`${contentDone} / ${contents.length}`}
          sub={`รอผลิตอีก ${contentWait} ชิ้น`}
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
              {products.map(p => {
                const s = sales.find(s => s.product_id === p.product_id)
                const c = contents.filter(c => c.product_id === p.product_id)
                const target = Number(s?.sales_target_amount || 0)
                const actual = Number(s?.actual_sales || 0)
                const pct = target > 0 ? Math.round((actual / target) * 100) : 0
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
                            className={`h-full rounded-full ${pct >= 80 ? 'bg-green-500' : pct >= 40 ? 'bg-amber-400' : 'bg-blue-500'}`}
                            style={{ width: `${Math.min(pct, 100)}%` }}
                          />
                        </div>
                        <span className="text-xs text-gray-500 w-8 text-right">{pct}%</span>
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
    </div>
  )
}

function KPICard({ label, value, sub, pct }: {
  label: string
  value: string
  sub: string
  pct?: number
}) {
  return (
    <div className="bg-white rounded-xl border border-gray-100 p-5">
      <p className="text-xs text-gray-400 mb-3">{label}</p>
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
