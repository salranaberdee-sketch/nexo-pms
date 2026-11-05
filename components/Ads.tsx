'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase'

export default function Ads() {
  const [ads, setAds]       = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const supabase = createClient()

  useEffect(() => {
    supabase.from('ads').select('*').order('product_id').then(({ data }) => {
      setAds(data || [])
      setLoading(false)
    })
  }, [])

  const totalBudget = ads.reduce((s, r) => s + Number(r.budget_approved), 0)
  const totalSpent  = ads.reduce((s, r) => s + Number(r.budget_spent), 0)
  const totalLeads  = ads.reduce((s, r) => s + Number(r.leads), 0)
  const totalReach  = ads.reduce((s, r) => s + Number(r.reach), 0)
  const spentPct    = totalBudget > 0 ? Math.round((totalSpent / totalBudget) * 100) : 0

  const summaryCards = [
    { label: 'งบทั้งหมด',   value: `฿${totalBudget.toLocaleString()}`, meta: `${ads.length} campaigns` },
    { label: 'ใช้จ่ายแล้ว', value: `฿${totalSpent.toLocaleString()}`,  meta: `${spentPct}% ของงบ` },
    { label: 'Reach รวม',   value: totalReach.toLocaleString(),         meta: 'impressions' },
    { label: 'Leads รวม',   value: totalLeads.toLocaleString(),         meta: 'leads' },
  ]

  const headers = ['Product', 'Campaign', 'ช่องทาง', 'งบจัดสรร', 'ใช้จริง', 'คงเหลือ', 'Reach', 'Clicks', 'Leads', 'CPL', 'ผล']

  return (
    <div className="p-6 max-w-screen-xl mx-auto space-y-5">

      <div>
        <h1 className="text-lg font-semibold text-gray-900">Ads</h1>
        <p className="text-sm text-gray-400 mt-0.5">ติดตามแคมเปญโฆษณาและ ROI</p>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {summaryCards.map(({ label, value, meta }) => (
          <div key={label} className="bg-white rounded-xl border border-gray-100 p-5">
            <p className="text-xs text-gray-400 mb-3">{label}</p>
            <p className="text-2xl font-semibold text-gray-900 leading-none">{value}</p>
            <p className="text-xs text-gray-400 mt-2">{meta}</p>
          </div>
        ))}
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
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
                <tr>
                  <td colSpan={11} className="px-4 py-10 text-center text-sm text-gray-400">กำลังโหลด...</td>
                </tr>
              ) : ads.map(a => (
                <tr key={a.id} className="border-b border-gray-50 hover:bg-gray-50 transition-colors last:border-0">
                  <td className="px-4 py-3 font-mono text-xs text-gray-400">{a.product_id}</td>
                  <td className="px-4 py-3 font-medium text-gray-900 max-w-[140px] truncate">{a.campaign_name}</td>
                  <td className="px-4 py-3 text-sm text-gray-500">{a.channel}</td>
                  <td className="px-4 py-3 text-sm text-gray-600 tabular-nums">฿{Number(a.budget_allocated).toLocaleString()}</td>
                  <td className="px-4 py-3 text-sm text-red-500 tabular-nums">฿{Number(a.budget_spent).toLocaleString()}</td>
                  <td className="px-4 py-3 text-sm text-green-600 tabular-nums">฿{Number(a.budget_remaining).toLocaleString()}</td>
                  <td className="px-4 py-3 text-sm text-gray-500 tabular-nums">{Number(a.reach).toLocaleString()}</td>
                  <td className="px-4 py-3 text-sm text-gray-500 tabular-nums">{Number(a.clicks).toLocaleString()}</td>
                  <td className="px-4 py-3 text-sm font-medium text-gray-900 tabular-nums">{a.leads}</td>
                  <td className="px-4 py-3 text-sm text-gray-500 tabular-nums">฿{Number(a.cpl).toLocaleString()}</td>
                  <td className="px-4 py-3 text-xs text-gray-400 max-w-[100px] truncate">{a.result_notes}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
