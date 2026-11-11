'use client'

import { useEffect, useState, useMemo } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase'
import { useProfile } from '@/lib/profile-context'
import { EmptyState } from './TableState'
import { showToast } from './Toast'
import { productStatusStyle, contentStatusStyle, salesStatusStyle } from '@/lib/status-styles'

const TODAY = new Date().toISOString().split('T')[0]
const TODAY_MS = new Date(TODAY).getTime()
const SOON_DAYS = 3

type PanelType = 'sales' | 'ads' | 'leads' | 'contents' | 'product' | 'roi' | null

export default function Dashboard() {
  const [products, setProducts] = useState<any[]>([])
  const [sales, setSales] = useState<any[]>([])
  const [contents, setContents] = useState<any[]>([])
  const [ads, setAds] = useState<any[]>([])
  const [profiles, setProfiles] = useState<any[]>([])
  const [roiData, setRoiData] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [loadError, setLoadError] = useState('')
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null)
  const [expandedPerson, setExpandedPerson] = useState<string | null>(null)
  // Detail panel state
  const [activePanel, setActivePanel] = useState<PanelType>(null)
  const [activePanelProduct, setActivePanelProduct] = useState<string | null>(null)
  const profile = useProfile()
  const supabase = createClient()

  function openPanel(type: PanelType, productId?: string) {
    setActivePanel(type)
    setActivePanelProduct(productId || null)
  }
  function closePanel() { setActivePanel(null); setActivePanelProduct(null) }

  // Close on Escape key
  useEffect(() => {
    function onKey(e: KeyboardEvent) { if (e.key === 'Escape') closePanel() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  async function load(silent = false) {
    if (!silent) setRefreshing(true)
    setLoadError('')
    const [p, s, c, a, pr, roi] = await Promise.all([
      supabase.from('products').select('id, product_id, name, brand, status, owner_id'),
      supabase.from('sales').select('product_id, sales_target_amount, actual_sales, actual_received, status, period_start, period_end'),
      supabase.from('contents').select('id, product_id, seq, title, status, assigned_to_id, assigned_to, producer_id, approver_id, poster_id, deadline'),
      supabase.from('ads').select('id, campaign_name, product_id, month, budget_total, budget_allocated, budget_spent, budget_remaining, leads, clicks, reach, cpl, roas, managed_by_id, managed_by'),
      supabase.from('profiles').select('id, name, role').eq('approval_status', 'approved').order('name'),
      supabase.from('v_content_roi').select('content_id, product_id, seq, title, type, production_cost, ad_cost_share, total_cost, total_leads, closed_leads, deal_revenue, roi, roi_pct, conversion_rate').order('deal_revenue', { ascending: false }).limit(20),
    ])
    const err = p.error || s.error || c.error || a.error || pr.error
    if (err) { setLoadError(err.message); setRefreshing(false); setLoading(false); return }
    setProducts(p.data || [])
    setSales(s.data || [])
    setContents(c.data || [])
    setAds(a.data || [])
    setProfiles(pr.data || [])
    // roi view may not exist yet (before migration) — ignore error gracefully
    if (!roi.error) setRoiData(roi.data || [])
    setLastUpdated(new Date())
    setLoading(false)
    setRefreshing(false)
    if (!silent) showToast('อัปเดตข้อมูลแล้ว', 'info')
  }

  useEffect(() => { load(true) }, [])

  const salesByProduct = useMemo(() => new Map(sales.map(s => [s.product_id, s])), [sales])
  const contentsByProduct = useMemo(() => contents.reduce((m, c) => {
    const arr = m.get(c.product_id) || []; arr.push(c); m.set(c.product_id, arr); return m
  }, new Map<string, any[]>()), [contents])
  const adsByProduct = useMemo(() => ads.reduce((m, a) => {
    const arr = m.get(a.product_id) || []; arr.push(a); m.set(a.product_id, arr); return m
  }, new Map<string, any[]>()), [ads])

  const totalBudget = useMemo(() => ads.reduce((s, r) => s + Number(r.budget_total ?? 0), 0), [ads])
  const totalSpent  = useMemo(() => ads.reduce((s, r) => s + Number(r.budget_spent), 0), [ads])
  const totalTarget = useMemo(() => sales.reduce((s, r) => s + Number(r.sales_target_amount), 0), [sales])
  const totalActual = useMemo(() => sales.reduce((s, r) => s + Number(r.actual_sales), 0), [sales])
  const totalLeads  = useMemo(() => ads.reduce((s, r) => s + Number(r.leads), 0), [ads])
  const contentDone = useMemo(() => contents.filter(c => c.status === 'โพสต์แล้ว').length, [contents])
  const contentWait = useMemo(() => contents.filter(c => c.status === 'รอผลิต').length, [contents])
  const pct = totalTarget > 0 ? Math.round((totalActual / totalTarget) * 100) : 0

  // ROI aggregates from v_content_roi
  const totalDealRevenue   = useMemo(() => roiData.reduce((s, r) => s + Number(r.deal_revenue || 0), 0), [roiData])
  const totalProductionCost = useMemo(() => roiData.reduce((s, r) => s + Number(r.production_cost || 0), 0), [roiData])
  const totalAdCostShare   = useMemo(() => roiData.reduce((s, r) => s + Number(r.ad_cost_share || 0), 0), [roiData])
  const totalROI           = useMemo(() => totalDealRevenue - totalProductionCost - totalAdCostShare, [totalDealRevenue, totalProductionCost, totalAdCostShare])
  const topROIContent      = useMemo(() => roiData.filter(r => Number(r.deal_revenue) > 0).slice(0, 5), [roiData])

  const teamWorkload = useMemo(() => {
    const map = new Map<string, { id: string; name: string; role: string; contents: any[]; ads: any[]; products: any[] }>()
    function ensure(id: string, name: string, role: string) {
      if (!map.has(id)) map.set(id, { id, name, role, contents: [], ads: [], products: [] })
      return map.get(id)!
    }
    contents.forEach(c => { if (!c.assigned_to_id) return; const prof = profiles.find(p => p.id === c.assigned_to_id); ensure(c.assigned_to_id, c.assigned_to || prof?.name || '?', prof?.role || '').contents.push(c) })
    ads.forEach(a => { if (!a.managed_by_id) return; const prof = profiles.find(p => p.id === a.managed_by_id); ensure(a.managed_by_id, a.managed_by || prof?.name || '?', prof?.role || '').ads.push(a) })
    products.forEach(p => { if (!p.owner_id) return; const prof = profiles.find(pr => pr.id === p.owner_id); ensure(p.owner_id, prof?.name || '?', prof?.role || '').products.push(p) })
    return Array.from(map.values()).map(person => {
      const activeContents  = person.contents.filter(c => c.status !== 'โพสต์แล้ว')
      const overdueContents = activeContents.filter(c => c.deadline && c.deadline < TODAY)
      const soonContents    = activeContents.filter(c => { if (!c.deadline || c.deadline < TODAY) return false; return Math.round((new Date(c.deadline).getTime() - TODAY_MS) / 86400000) <= SOON_DAYS })
      const doneContents    = person.contents.filter(c => c.status === 'โพสต์แล้ว')
      return { ...person, totalTasks: person.contents.length + person.ads.length + person.products.length, overdueCount: overdueContents.length, soonCount: soonContents.length, doneCount: doneContents.length, activeCount: activeContents.length, overdueContents, soonContents, activeContents, doneContents }
    }).sort((a, b) => b.overdueCount - a.overdueCount || b.totalTasks - a.totalTasks)
  }, [contents, ads, products, profiles])

  const myTasks = useMemo(() => {
    // Count contents where user has ANY role (producer/approver/assigned_to/poster)
    // This matches the same filter used in MyTasks component so the numbers are consistent
    const myContents = contents.filter(c =>
      c.assigned_to_id === profile.id ||
      c.producer_id    === profile.id ||
      c.approver_id    === profile.id ||
      c.poster_id      === profile.id
    )
    const myAds      = ads.filter(a => a.managed_by_id === profile.id)
    const myProducts = products.filter(p => p.owner_id === profile.id)
    return {
      myContents, myAds, myProducts,
      myDone:       myContents.filter(c => c.status === 'โพสต์แล้ว').length,
      myInProgress: myContents.filter(c => c.status !== 'โพสต์แล้ว' && c.status !== 'รอผลิต').length,
      myWaiting:    myContents.filter(c => c.status === 'รอผลิต').length,
      totalTasks:   myContents.length + myAds.length + myProducts.length,
    }
  }, [contents, ads, products, profile.id])

  const updatedLabel = lastUpdated ? lastUpdated.toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit', second: '2-digit' }) : ''

  if (loading) return <Loading />

  // ── Detail panel content ───────────────────────────────────────
  const panelProduct = activePanelProduct ? products.find(p => p.product_id === activePanelProduct) : null

  function PanelContent() {
    if (!activePanel) return null

    if (activePanel === 'sales') {
      const sorted = [...sales].sort((a, b) => {
        const pa = Number(a.sales_target_amount) || 0
        const pb = Number(b.sales_target_amount) || 0
        return pb - pa
      })
      const SALES_STATUS_GROUPS = ['กำลังขาย', 'ยังไม่เริ่ม', 'ปิดเป้า', 'ยังไม่เปิดขาย']
      return (
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-emerald-50 rounded-xl p-4">
              <p className="text-xs text-slate-500 mb-1">ยอดขายรวม</p>
              <p className="text-xl font-bold text-emerald-700">฿{totalActual.toLocaleString()}</p>
              <p className="text-xs text-slate-400 mt-0.5">{pct}% ของเป้า ฿{totalTarget.toLocaleString()}</p>
            </div>
            <div className="bg-slate-50 rounded-xl p-4">
              <p className="text-xs text-slate-500 mb-1">ยังขาดอยู่</p>
              <p className="text-xl font-bold text-red-500">฿{Math.max(0, totalTarget - totalActual).toLocaleString()}</p>
              <p className="text-xs text-slate-400 mt-0.5">{sales.length} product</p>
            </div>
          </div>
          <div>
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-2">รายละเอียดแต่ละ Product</p>
            <div className="space-y-2">
              {sorted.map(s => {
                const prod = products.find(p => p.product_id === s.product_id)
                const target = Number(s.sales_target_amount) || 0
                const actual = Number(s.actual_sales) || 0
                const rowPct = target > 0 ? Math.round((actual / target) * 100) : 0
                const barColor = rowPct >= 80 ? 'bg-emerald-500' : rowPct >= 40 ? 'bg-amber-400' : 'bg-blue-500'
                return (
                  <div key={s.product_id} className="bg-white rounded-xl border border-slate-100 p-3.5">
                    <div className="flex items-center justify-between mb-2">
                      <div>
                        <span className="font-semibold text-slate-900 text-sm">{prod?.name || s.product_id}</span>
                        <span className={`ml-2 text-xs px-1.5 py-0.5 rounded-md font-medium ${salesStatusStyle[s.status] || 'bg-slate-100 text-slate-400'}`}>{s.status}</span>
                      </div>
                      <span className="text-xs text-slate-400 tabular-nums">{rowPct}%</span>
                    </div>
                    <div className="w-full h-2 rounded-full overflow-hidden bg-slate-100 mb-1.5">
                      <div className={`h-full rounded-full ${barColor}`} style={{ width: `${Math.min(rowPct, 100)}%` }} />
                    </div>
                    <div className="flex justify-between text-xs text-slate-400">
                      <span>จริง ฿{actual.toLocaleString()}</span>
                      <span>เป้า ฿{target.toLocaleString()}</span>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      )
    }

    if (activePanel === 'ads') {
      const sorted = [...ads].sort((a, b) => Number(b.budget_spent) - Number(a.budget_spent))
      return (
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-amber-50 rounded-xl p-4">
              <p className="text-xs text-slate-500 mb-1">งบทั้งหมด</p>
              <p className="text-xl font-bold text-amber-700">฿{totalBudget.toLocaleString()}</p>
              <p className="text-xs text-slate-400 mt-0.5">ใช้ไป ฿{totalSpent.toLocaleString()}</p>
            </div>
            <div className="bg-slate-50 rounded-xl p-4">
              <p className="text-xs text-slate-500 mb-1">คงเหลือ</p>
              <p className="text-xl font-bold text-slate-700">฿{(totalBudget - totalSpent).toLocaleString()}</p>
              <p className="text-xs text-slate-400 mt-0.5">{totalBudget > 0 ? Math.round((totalBudget - totalSpent) / totalBudget * 100) : 0}%</p>
            </div>
          </div>
          <div>
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-2">แต่ละแคมเปญ</p>
            <div className="space-y-2">
              {sorted.map(a => {
                const allocated = Number(a.budget_allocated) || 0
                const spent     = Number(a.budget_spent) || 0
                const spentPct  = allocated > 0 ? Math.round(spent / allocated * 100) : 0
                const over      = spent > allocated
                return (
                  <div key={a.id} className="bg-white rounded-xl border border-slate-100 p-3.5">
                    <div className="flex items-center justify-between mb-1.5">
                      <div className="min-w-0">
                        <span className="font-semibold text-slate-900 text-sm truncate block">{a.campaign_name}</span>
                        <span className="text-xs text-slate-400">{a.product_id} · {a.month}</span>
                      </div>
                      {over && <span className="shrink-0 text-xs bg-red-100 text-red-600 px-2 py-0.5 rounded-lg font-semibold ml-2">เกินงบ</span>}
                    </div>
                    <div className="w-full h-1.5 rounded-full overflow-hidden bg-slate-100 mb-1.5">
                      <div className={`h-full rounded-full ${over ? 'bg-red-500' : spentPct >= 80 ? 'bg-amber-400' : 'bg-indigo-500'}`}
                        style={{ width: `${Math.min(spentPct, 100)}%` }} />
                    </div>
                    <div className="flex justify-between text-xs text-slate-400">
                      <span>ใช้ ฿{spent.toLocaleString()}</span>
                      <span>จัดสรร ฿{allocated.toLocaleString()}</span>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      )
    }

    if (activePanel === 'leads') {
      const sorted = [...ads].filter(a => Number(a.leads) > 0).sort((a, b) => Number(b.leads) - Number(a.leads))
      const maxLeads = sorted.length ? Number(sorted[0].leads) : 1
      return (
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-blue-50 rounded-xl p-4">
              <p className="text-xs text-slate-500 mb-1">Leads รวม</p>
              <p className="text-xl font-bold text-blue-700">{totalLeads.toLocaleString()}</p>
              <p className="text-xs text-slate-400 mt-0.5">{ads.length} campaigns</p>
            </div>
            <div className="bg-slate-50 rounded-xl p-4">
              <p className="text-xs text-slate-500 mb-1">CPL เฉลี่ย</p>
              <p className="text-xl font-bold text-slate-700">
                ฿{totalLeads > 0 ? Math.round(totalSpent / totalLeads).toLocaleString() : '—'}
              </p>
              <p className="text-xs text-slate-400 mt-0.5">บาท/lead</p>
            </div>
          </div>
          <div>
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-2">Leads แต่ละแคมเปญ</p>
            {sorted.length === 0 ? (
              <p className="text-sm text-slate-400 text-center py-6">ยังไม่มีข้อมูล Leads</p>
            ) : (
              <div className="space-y-2">
                {sorted.map(a => (
                  <div key={a.id} className="bg-white rounded-xl border border-slate-100 p-3.5">
                    <div className="flex items-center justify-between mb-2">
                      <div className="min-w-0">
                        <span className="font-semibold text-slate-900 text-sm truncate block">{a.campaign_name}</span>
                        <span className="text-xs text-slate-400">{a.product_id} · {a.month} · {a.managed_by || '—'}</span>
                      </div>
                      <span className="shrink-0 text-sm font-bold text-blue-700 ml-3">{Number(a.leads).toLocaleString()}</span>
                    </div>
                    <div className="w-full h-1.5 rounded-full overflow-hidden bg-slate-100">
                      <div className="h-full rounded-full bg-blue-500" style={{ width: `${Math.min(Number(a.leads) / maxLeads * 100, 100)}%` }} />
                    </div>
                    <div className="flex justify-between text-xs text-slate-400 mt-1.5">
                      <span>CPL ฿{Number(a.cpl) > 0 ? Math.round(Number(a.cpl)).toLocaleString() : '—'}</span>
                      <span>ROAS {Number(a.roas) > 0 ? `${Number(a.roas).toFixed(2)}×` : '—'}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )
    }

    if (activePanel === 'contents') {
      const STATUSES = ['รอผลิต', 'ผลิตอยู่', 'รออนุมัติ', 'อนุมัติแล้ว', 'กำหนดโพสต์', 'โพสต์แล้ว']
      const countByStatus = STATUSES.reduce((acc, s) => ({ ...acc, [s]: contents.filter(c => c.status === s).length }), {} as Record<string, number>)
      const overdue = contents.filter(c => c.deadline && c.deadline < TODAY && c.status !== 'โพสต์แล้ว')
      return (
        <div className="space-y-4">
          {/* Status breakdown */}
          <div>
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-2">แยกตามสถานะ</p>
            <div className="grid grid-cols-2 gap-2">
              {STATUSES.map(s => (
                <div key={s} className={`rounded-xl px-3.5 py-3 flex items-center justify-between ${contentStatusStyle[s] || 'bg-slate-100'}`}>
                  <span className="text-xs font-medium">{s}</span>
                  <span className="text-sm font-bold tabular-nums">{countByStatus[s] || 0}</span>
                </div>
              ))}
            </div>
          </div>
          {/* Overdue */}
          {overdue.length > 0 && (
            <div>
              <p className="text-xs font-semibold text-red-500 uppercase tracking-wide mb-2">เกิน Deadline ({overdue.length})</p>
              <div className="space-y-1.5">
                {overdue.sort((a, b) => (a.deadline || '').localeCompare(b.deadline || '')).map(c => {
                  const daysLate = Math.round((TODAY_MS - new Date(c.deadline).getTime()) / 86400000)
                  return (
                    <Link key={c.id} href={`/contents?product=${c.product_id}`}
                      className="flex items-center gap-2 px-3 py-2 bg-red-50 border border-red-100 rounded-lg hover:bg-red-100 transition-colors">
                      <span className="font-mono text-xs text-slate-400 shrink-0">{c.product_id}</span>
                      <span className="text-sm text-slate-700 flex-1 truncate">{c.title}</span>
                      <span className="text-xs text-red-600 font-medium shrink-0">เลย {daysLate} วัน</span>
                    </Link>
                  )
                })}
              </div>
            </div>
          )}
          {/* Unassigned */}
          {(() => {
            const unassigned = contents.filter(c => !c.assigned_to_id && c.status !== 'โพสต์แล้ว')
            return unassigned.length > 0 ? (
              <div>
                <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-2">ยังไม่มอบหมาย ({unassigned.length})</p>
                <div className="space-y-1.5">
                  {unassigned.slice(0, 5).map(c => (
                    <Link key={c.id} href={`/contents?product=${c.product_id}`}
                      className="flex items-center gap-2 px-3 py-2 bg-slate-50 border border-slate-100 rounded-lg hover:bg-slate-100 transition-colors">
                      <span className="font-mono text-xs text-slate-400 shrink-0">{c.product_id}</span>
                      <span className="text-sm text-slate-700 flex-1 truncate">{c.title}</span>
                      <span className={`text-xs px-1.5 py-0.5 rounded-md shrink-0 ${contentStatusStyle[c.status] || ''}`}>{c.status}</span>
                    </Link>
                  ))}
                  {unassigned.length > 5 && <p className="text-xs text-slate-400 text-center py-1">+{unassigned.length - 5} อื่นๆ</p>}
                </div>
              </div>
            ) : null
          })()}
        </div>
      )
    }

    if (activePanel === 'product' && activePanelProduct) {
      const prod = products.find(p => p.product_id === activePanelProduct)
      const productContents = contentsByProduct.get(activePanelProduct) || []
      const productAds      = adsByProduct.get(activePanelProduct) || []
      const productSales    = salesByProduct.get(activePanelProduct)
      const target = Number(productSales?.sales_target_amount || 0)
      const actual = Number(productSales?.actual_sales || 0)
      const rowPct = target > 0 ? Math.round((actual / target) * 100) : 0
      const STATUSES = ['รอผลิต', 'ผลิตอยู่', 'รออนุมัติ', 'อนุมัติแล้ว', 'กำหนดโพสต์', 'โพสต์แล้ว']
      return (
        <div className="space-y-5">
          {/* Product header */}
          <div className="flex items-start gap-3">
            <div className="flex-1">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-bold text-slate-900">{prod?.name}</span>
                <span className="font-mono text-xs text-slate-400">{activePanelProduct}</span>
                {prod?.brand && <span className="text-xs bg-slate-100 text-slate-500 px-2 py-0.5 rounded-md">{prod.brand}</span>}
              </div>
              {prod?.status && (
                <span className={`inline-block mt-1.5 text-xs px-2 py-0.5 rounded-md font-medium ${productStatusStyle[prod.status] || 'bg-slate-100 text-slate-400'}`}>{prod.status}</span>
              )}
            </div>
          </div>

          {/* Sales */}
          {productSales && (
            <div className="bg-white rounded-xl border border-slate-100 p-4">
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-3">ยอดขาย</p>
              <div className="flex items-center justify-between mb-2">
                <span className="text-2xl font-bold text-slate-900">฿{actual.toLocaleString()}</span>
                <span className={`text-xs px-2 py-1 rounded-lg font-medium ${salesStatusStyle[productSales.status] || 'bg-slate-100 text-slate-400'}`}>{productSales.status}</span>
              </div>
              <div className="w-full h-2 rounded-full overflow-hidden bg-slate-100 mb-1.5">
                <div className={`h-full rounded-full ${rowPct >= 80 ? 'bg-emerald-500' : rowPct >= 40 ? 'bg-amber-400' : 'bg-blue-500'}`}
                  style={{ width: `${Math.min(rowPct, 100)}%` }} />
              </div>
              <p className="text-xs text-slate-400">{rowPct}% ของเป้า ฿{target.toLocaleString()}</p>
            </div>
          )}

          {/* Content pipeline */}
          {productContents.length > 0 && (
            <div>
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-2">Content ({productContents.length} ชิ้น)</p>
              <div className="grid grid-cols-2 gap-2 mb-3">
                {STATUSES.filter(s => productContents.some((c: any) => c.status === s)).map(s => (
                  <div key={s} className={`rounded-lg px-3 py-2 flex items-center justify-between ${contentStatusStyle[s] || 'bg-slate-100'}`}>
                    <span className="text-xs font-medium">{s}</span>
                    <span className="text-sm font-bold">{productContents.filter((c: any) => c.status === s).length}</span>
                  </div>
                ))}
              </div>
              <div className="space-y-1.5">
                {productContents.slice().sort((a: any, b: any) => a.seq - b.seq).map((c: any) => {
                  const overdue = c.deadline && c.deadline < TODAY && c.status !== 'โพสต์แล้ว'
                  const daysLate = overdue ? Math.round((TODAY_MS - new Date(c.deadline).getTime()) / 86400000) : 0
                  return (
                    <div key={c.id} className={`flex items-center gap-2 px-3 py-2 rounded-lg border ${overdue ? 'bg-red-50 border-red-100' : 'bg-white border-slate-100'}`}>
                      <span className="text-xs text-slate-300 tabular-nums shrink-0 w-5">#{c.seq}</span>
                      <span className="text-sm text-slate-700 flex-1 truncate">{c.title}</span>
                      <span className={`text-xs px-1.5 py-0.5 rounded-md shrink-0 ${contentStatusStyle[c.status] || 'bg-slate-100 text-slate-500'}`}>{c.status}</span>
                      {overdue && <span className="text-xs text-red-600 shrink-0">{daysLate}d</span>}
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          {/* Ads */}
          {productAds.length > 0 && (
            <div>
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-2">Ads ({productAds.length} campaigns)</p>
              <div className="space-y-1.5">
                {productAds.map((a: any) => (
                  <div key={a.id} className="flex items-center gap-2 px-3 py-2 bg-white rounded-lg border border-slate-100">
                    <span className="text-sm text-slate-700 flex-1 truncate">{a.campaign_name}</span>
                    <span className="text-xs text-slate-400 shrink-0">{a.month}</span>
                    <span className="text-xs font-medium text-blue-700 shrink-0">{Number(a.leads).toLocaleString()} leads</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )
    }
    if (activePanel === 'roi') {
      const hasData = roiData.some(r => Number(r.deal_revenue) > 0 || Number(r.total_leads) > 0)
      return (
        <div className="space-y-4">
          {/* Formula note */}
          <div className="bg-slate-50 rounded-xl p-3.5 text-xs text-slate-500 space-y-1">
            <p className="font-semibold text-slate-700 mb-1.5">สูตร (First-touch Attribution)</p>
            <p>💰 ROI = Revenue – ต้นทุนผลิต – ส่วนแบ่งงบ Ads</p>
            <p>📊 Revenue = leads ที่ปิดการขายที่ link มาจาก content นี้</p>
            <p>🎯 ส่วนแบ่งงบ Ads = budget_spent × attribution_pct จาก ad_contents</p>
          </div>

          {/* Summary */}
          {totalDealRevenue > 0 && (
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-emerald-50 rounded-xl p-3.5">
                <p className="text-xs text-slate-500 mb-1">Revenue รวม</p>
                <p className="text-xl font-bold text-emerald-700">฿{totalDealRevenue.toLocaleString()}</p>
              </div>
              <div className={`rounded-xl p-3.5 ${totalROI >= 0 ? 'bg-emerald-50' : 'bg-red-50'}`}>
                <p className="text-xs text-slate-500 mb-1">ROI รวม</p>
                <p className={`text-xl font-bold ${totalROI >= 0 ? 'text-emerald-700' : 'text-red-600'}`}>
                  {totalROI >= 0 ? '+' : ''}฿{totalROI.toLocaleString()}
                </p>
              </div>
            </div>
          )}

          {/* Leaderboard */}
          <div>
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-2">
              {hasData ? 'Content ที่ทำเงินสูงสุด' : 'Content ทั้งหมด (ยังไม่มี lead data)'}
            </p>
            {roiData.length === 0 ? (
              <p className="text-sm text-slate-400 text-center py-8">
                รัน migration แล้วเพิ่ม Lead เพื่อดูข้อมูล ROI
              </p>
            ) : (
              <div className="space-y-2">
                {(hasData ? topROIContent : roiData.slice(0, 8)).map((r, i) => {
                  const roi = Number(r.roi || 0)
                  const isPositive = roi > 0
                  const roiPct = r.roi_pct !== null ? Number(r.roi_pct) : null
                  return (
                    <div key={r.content_id} className="bg-white rounded-xl border border-slate-100 p-3.5">
                      <div className="flex items-start gap-2.5">
                        {/* Rank */}
                        <span className={`shrink-0 w-5 h-5 rounded-full flex items-center justify-center text-[11px] font-bold
                          ${i === 0 ? 'bg-amber-100 text-amber-700' : i === 1 ? 'bg-slate-100 text-slate-600' : i === 2 ? 'bg-orange-50 text-orange-600' : 'bg-slate-50 text-slate-400'}`}>
                          {i + 1}
                        </span>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className="font-mono text-xs text-slate-400">{r.product_id}</span>
                            <span className="text-sm font-semibold text-slate-900 truncate">{r.title}</span>
                          </div>
                          <div className="flex items-center gap-3 mt-1.5 flex-wrap">
                            {Number(r.deal_revenue) > 0 && (
                              <span className="text-xs text-emerald-600 font-medium">
                                ฿{Number(r.deal_revenue).toLocaleString()} revenue
                              </span>
                            )}
                            {Number(r.total_leads) > 0 && (
                              <span className="text-xs text-blue-500">
                                {r.total_leads} leads ({r.closed_leads} ปิด)
                              </span>
                            )}
                            {Number(r.production_cost) > 0 && (
                              <span className="text-xs text-slate-400">
                                ต้นทุน ฿{Number(r.production_cost).toLocaleString()}
                              </span>
                            )}
                          </div>
                        </div>
                        {/* ROI badge */}
                        {Number(r.total_cost) > 0 && (
                          <div className="shrink-0 text-right">
                            <span className={`text-sm font-bold ${isPositive ? 'text-emerald-600' : roi < 0 ? 'text-red-500' : 'text-slate-400'}`}>
                              {roi > 0 ? '+' : ''}฿{roi.toLocaleString()}
                            </span>
                            {roiPct !== null && (
                              <p className={`text-xs font-medium ${isPositive ? 'text-emerald-500' : 'text-slate-400'}`}>
                                {roiPct > 0 ? '+' : ''}{roiPct}%
                              </p>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        </div>
      )
    }

    return null
  }

  const panelTitles: Record<string, string> = {
    sales:    'ภาพรวมยอดขาย',
    ads:      'งบโฆษณา',
    leads:    'Leads & ROI',
    contents: 'Content Pipeline',
    roi:      'Leaderboard ROI ต่อ Content',
    product:  panelProduct?.name || activePanelProduct || '',
  }

  return (
    <div className="flex h-full">
      {/* ── Main content ─────────────────────────────────────── */}
      <div className={`flex-1 overflow-y-auto transition-all duration-300 ${activePanel ? 'lg:mr-[380px]' : ''}`}>
        <div className="p-6 space-y-6">

          {/* Header */}
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-xl font-semibold text-slate-900">Dashboard</h1>
              <p className="text-sm text-slate-400 mt-0.5">ภาพรวมทุก Product{updatedLabel && ` — อัปเดต ${updatedLabel}`}</p>
            </div>
            <div className="flex items-center gap-2">
              {activePanel && (
                <button onClick={closePanel} className="text-sm text-slate-400 hover:text-slate-700 px-3 py-1.5 rounded-xl hover:bg-slate-100 transition-colors">
                  ปิด panel ✕
                </button>
              )}
              <button onClick={() => load(false)} disabled={refreshing}
                className="flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-900 px-3 py-1.5 rounded-xl hover:bg-slate-100 transition-colors disabled:opacity-40">
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={refreshing ? 'animate-spin' : ''}>
                  <polyline points="23 4 23 10 17 10" /><polyline points="1 20 1 14 7 14" />
                  <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15" />
                </svg>
                {refreshing ? 'กำลังโหลด...' : 'รีเฟรช'}
              </button>
            </div>
          </div>

          {loadError && (
            <div className="bg-red-50 border border-red-100 rounded-2xl px-4 py-3 text-sm text-red-600">
              โหลดข้อมูลไม่สำเร็จ: {loadError}
              <button onClick={() => load(false)} className="ml-3 underline text-red-500 hover:text-red-700">ลองใหม่</button>
            </div>
          )}

          {/* KPI cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <KPICard label="ยอดขายจริง" value={`฿${totalActual.toLocaleString()}`} sub={`เป้า ฿${totalTarget.toLocaleString()}`} pct={pct} accent="emerald" icon="baht" active={activePanel === 'sales'} onClick={() => openPanel(activePanel === 'sales' ? null : 'sales')} />
            <KPICard label="งบ Ads คงเหลือ" value={`฿${(totalBudget - totalSpent).toLocaleString()}`} sub={`ใช้ไป ฿${totalSpent.toLocaleString()}`} accent="amber" icon="ads" active={activePanel === 'ads'} onClick={() => openPanel(activePanel === 'ads' ? null : 'ads')} />
            <KPICard label="Leads รวม" value={totalLeads.toLocaleString()} sub={`${ads.length} campaigns`} accent="blue" icon="trending" active={activePanel === 'leads'} onClick={() => openPanel(activePanel === 'leads' ? null : 'leads')} />
            <KPICard label="Content โพสต์แล้ว" value={`${contentDone} / ${contents.length}`} sub={`รอผลิตอีก ${contentWait} ชิ้น`} accent="violet" icon="edit" active={activePanel === 'contents'} onClick={() => openPanel(activePanel === 'contents' ? null : 'contents')} />
          </div>

          {/* ROI Leaderboard — compact table */}
          <div className="bg-white rounded-2xl border border-slate-100 overflow-hidden shadow-sm">
            <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
              <div>
                <h2 className="text-sm font-semibold text-slate-900">ROI ต่อ Content</h2>
                <p className="text-xs text-slate-400 mt-0.5">First-touch attribution · กดเพื่อดู Leaderboard เต็ม</p>
              </div>
              <button onClick={() => openPanel(activePanel === 'roi' ? null : 'roi')}
                className={`text-xs px-3 py-1.5 rounded-lg font-medium transition-colors
                  ${activePanel === 'roi' ? 'bg-indigo-600 text-white' : 'text-indigo-600 hover:bg-indigo-50'}`}>
                {activePanel === 'roi' ? 'ปิด ✕' : 'ดูทั้งหมด →'}
              </button>
            </div>
            {roiData.length === 0 ? (
              <div className="px-5 py-8 text-center text-sm text-slate-400">
                รัน migration แล้วเพิ่ม Lead พร้อมระบุ content เพื่อดูข้อมูล ROI
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-slate-100">
                      <th className="text-left px-5 py-3 text-xs font-medium text-slate-400">#</th>
                      <th className="text-left px-4 py-3 text-xs font-medium text-slate-400">Content</th>
                      <th className="text-right px-4 py-3 text-xs font-medium text-slate-400">Leads</th>
                      <th className="text-right px-4 py-3 text-xs font-medium text-slate-400">Revenue</th>
                      <th className="text-right px-4 py-3 text-xs font-medium text-slate-400">ต้นทุนรวม</th>
                      <th className="text-right px-5 py-3 text-xs font-medium text-slate-400">ROI</th>
                    </tr>
                  </thead>
                  <tbody>
                    {roiData.slice(0, 5).map((r, i) => {
                      const roi = Number(r.roi || 0)
                      const roiPct = r.roi_pct !== null ? Number(r.roi_pct) : null
                      const isPositive = roi > 0
                      return (
                        <tr key={r.content_id} className="hover:bg-slate-50/60 transition-colors last:border-0 border-b border-slate-100/60">
                          <td className="px-5 py-3 text-xs text-slate-400 tabular-nums">{i + 1}</td>
                          <td className="px-4 py-3 max-w-[200px]">
                            <div className="truncate font-medium text-slate-900" title={r.title}>{r.title}</div>
                            <div className="text-xs text-slate-400">{r.product_id} · {r.type}</div>
                          </td>
                          <td className="px-4 py-3 text-right text-sm tabular-nums text-slate-600">
                            {Number(r.total_leads) > 0 ? (
                              <span>{r.closed_leads}<span className="text-slate-300">/{r.total_leads}</span></span>
                            ) : <span className="text-slate-300">—</span>}
                          </td>
                          <td className="px-4 py-3 text-right text-sm tabular-nums font-medium text-emerald-600">
                            {Number(r.deal_revenue) > 0 ? `฿${Number(r.deal_revenue).toLocaleString()}` : <span className="text-slate-300">—</span>}
                          </td>
                          <td className="px-4 py-3 text-right text-sm tabular-nums text-slate-500">
                            {Number(r.total_cost) > 0 ? `฿${Number(r.total_cost).toLocaleString()}` : <span className="text-slate-300">—</span>}
                          </td>
                          <td className="px-5 py-3 text-right tabular-nums">
                            {Number(r.total_cost) > 0 ? (
                              <div>
                                <span className={`text-sm font-bold ${isPositive ? 'text-emerald-600' : roi < 0 ? 'text-red-500' : 'text-slate-400'}`}>
                                  {roi > 0 ? '+' : ''}฿{roi.toLocaleString()}
                                </span>
                                {roiPct !== null && (
                                  <p className={`text-xs ${isPositive ? 'text-emerald-500' : 'text-slate-400'}`}>
                                    {roiPct > 0 ? '+' : ''}{roiPct}%
                                  </p>
                                )}
                              </div>
                            ) : <span className="text-slate-300 text-sm">—</span>}
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Team Workload */}
          <div className="bg-white rounded-2xl border border-slate-100 overflow-hidden shadow-sm">
            <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
              <div>
                <h2 className="text-sm font-semibold text-slate-900">ภาระงานทีม</h2>
                <p className="text-xs text-slate-400 mt-0.5">กดที่ชื่อเพื่อดูรายละเอียดงาน</p>
              </div>
              <span className="text-xs text-slate-400">{teamWorkload.length} คน</span>
            </div>
            {teamWorkload.length === 0 ? (
              <div className="px-5 py-8 text-center text-sm text-slate-400">ยังไม่มีการมอบหมายงาน</div>
            ) : (
              <div className="divide-y divide-slate-100">
                {teamWorkload.map(person => {
                  const isExpanded = expandedPerson === person.id
                  const hasOverdue = person.overdueCount > 0
                  const hasSoon    = person.soonCount > 0
                  return (
                    <div key={person.id}>
                      <button type="button" onClick={() => setExpandedPerson(isExpanded ? null : person.id)}
                        className="w-full flex items-center gap-4 px-5 py-4 hover:bg-slate-50 transition-colors text-left">
                        <span className={`w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold shrink-0 ${hasOverdue ? 'bg-red-100 text-red-600' : hasSoon ? 'bg-amber-100 text-amber-600' : 'bg-indigo-100 text-indigo-600'}`}>
                          {person.name[0].toUpperCase()}
                        </span>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-semibold text-slate-900">{person.name}</span>
                            <span className="text-xs text-slate-400 bg-slate-100 px-1.5 py-0.5 rounded-md">{person.role}</span>
                            {hasOverdue && <span className="text-xs font-semibold bg-red-100 text-red-600 px-2 py-0.5 rounded-full">เกิน deadline {person.overdueCount} ชิ้น</span>}
                            {!hasOverdue && hasSoon && <span className="text-xs font-semibold bg-amber-100 text-amber-600 px-2 py-0.5 rounded-full">ใกล้ deadline {person.soonCount} ชิ้น</span>}
                          </div>
                          {person.contents.length > 0 && (
                            <div className="flex items-center gap-2 mt-1.5">
                              <div className="w-24 h-1.5 rounded-full overflow-hidden bg-slate-100">
                                <div className="h-full rounded-full bg-emerald-500" style={{ width: `${Math.min(person.doneCount / person.contents.length * 100, 100)}%` }} />
                              </div>
                              <span className="text-xs text-slate-400">Content {person.doneCount}/{person.contents.length} เสร็จ</span>
                            </div>
                          )}
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          {person.contents.length > 0 && <span className="text-xs text-violet-600 bg-violet-50 px-2 py-1 rounded-lg font-medium">{person.contents.length} content</span>}
                          {person.ads.length > 0      && <span className="text-xs text-amber-600 bg-amber-50 px-2 py-1 rounded-lg font-medium">{person.ads.length} ads</span>}
                          {person.products.length > 0 && <span className="text-xs text-blue-600 bg-blue-50 px-2 py-1 rounded-lg font-medium">{person.products.length} product</span>}
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" className={`text-slate-300 transition-transform ${isExpanded ? 'rotate-180' : ''}`}><polyline points="6 9 12 15 18 9" /></svg>
                        </div>
                      </button>
                      {isExpanded && (
                        <div className="bg-slate-50/60 border-t border-slate-100 px-5 py-4 space-y-4">
                          {person.contents.length > 0 && (
                            <div>
                              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-2">Content</p>
                              <div className="space-y-2">
                                {person.contents.slice().sort((a: any, b: any) => {
                                  const aO = a.deadline && a.deadline < TODAY ? -1 : 0; const bO = b.deadline && b.deadline < TODAY ? -1 : 0
                                  if (aO !== bO) return aO - bO; if (!a.deadline && b.deadline) return 1; if (a.deadline && !b.deadline) return -1
                                  return (a.deadline || '').localeCompare(b.deadline || '')
                                }).map((c: any) => {
                                  const done = c.status === 'โพสต์แล้ว'; const overdue = !done && c.deadline && c.deadline < TODAY
                                  const daysUntil = !done && c.deadline ? Math.round((new Date(c.deadline).getTime() - TODAY_MS) / 86400000) : null
                                  const soon = !overdue && daysUntil !== null && daysUntil >= 0 && daysUntil <= SOON_DAYS
                                  const daysLate = overdue ? Math.round((TODAY_MS - new Date(c.deadline).getTime()) / 86400000) : 0
                                  return (
                                    <Link key={c.id} href={`/contents?product=${c.product_id}`}
                                      className={`flex items-center gap-3 px-3.5 py-2.5 rounded-xl border transition-colors hover:border-indigo-200 hover:bg-white ${overdue ? 'bg-red-50 border-red-100' : soon ? 'bg-amber-50 border-amber-100' : 'bg-white border-slate-100'}`}>
                                      <span className={`shrink-0 text-xs font-semibold px-2 py-0.5 rounded-md ${contentStatusStyle[c.status] || 'bg-slate-100 text-slate-500'}`}>{c.status}</span>
                                      <span className="font-mono text-xs text-slate-400 shrink-0">{c.product_id}</span>
                                      <span className="text-sm text-slate-700 flex-1 truncate">{c.title}</span>
                                      <span className="shrink-0 text-xs font-medium ml-auto pl-3 whitespace-nowrap">
                                        {done ? <span className="text-emerald-600">✓ เสร็จ</span> : overdue ? <span className="text-red-600">เลย {daysLate} วัน</span> : c.deadline ? <span className={soon ? 'text-amber-600' : 'text-slate-400'}>{soon ? `⚡ อีก ${daysUntil} วัน` : new Date(c.deadline).toLocaleDateString('th-TH', { day: '2-digit', month: 'short' })}</span> : <span className="text-slate-300">ไม่มี deadline</span>}
                                      </span>
                                    </Link>
                                  )
                                })}
                              </div>
                            </div>
                          )}
                          {person.ads.length > 0 && (
                            <div>
                              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-2">Ads</p>
                              <div className="space-y-2">
                                {person.ads.map((a: any) => (
                                  <Link key={a.id} href="/ads" className="flex items-center gap-3 px-3.5 py-2.5 rounded-xl border border-slate-100 bg-white hover:border-indigo-200 transition-colors">
                                    <span className="font-mono text-xs text-slate-400 shrink-0">{a.product_id}</span>
                                    <span className="text-sm text-slate-700 flex-1 truncate">{a.campaign_name}</span>
                                    <span className="text-xs text-slate-400 shrink-0">{a.month}</span>
                                  </Link>
                                ))}
                              </div>
                            </div>
                          )}
                          {person.products.length > 0 && (
                            <div>
                              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-2">Product</p>
                              <div className="space-y-2">
                                {person.products.map((p: any) => (
                                  <Link key={p.id} href="/products" className="flex items-center gap-3 px-3.5 py-2.5 rounded-xl border border-slate-100 bg-white hover:border-indigo-200 transition-colors">
                                    <span className="font-mono text-xs text-slate-400 shrink-0">{p.product_id}</span>
                                    <span className="text-sm text-slate-700 flex-1">{p.name}</span>
                                    <span className={`text-xs px-2 py-0.5 rounded-md font-medium ${productStatusStyle[p.status] || 'bg-slate-100 text-slate-400'}`}>{p.status}</span>
                                  </Link>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            )}
          </div>

          {/* Products table */}
          <div className="bg-white rounded-2xl border border-slate-100 overflow-hidden shadow-sm">
            <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
              <h2 className="text-sm font-semibold text-slate-900">สถานะทุก Product</h2>
              <span className="text-xs text-slate-400">{products.length} รายการ</span>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-100">
                    <th className="text-left px-5 py-3 text-xs font-medium text-slate-400">Product ID</th>
                    <th className="text-left px-4 py-3 text-xs font-medium text-slate-400">ชื่อสินค้า</th>
                    <th className="text-left px-4 py-3 text-xs font-medium text-slate-400">แบรนด์</th>
                    <th className="text-left px-4 py-3 text-xs font-medium text-slate-400">สถานะ</th>
                    <th className="text-right px-4 py-3 text-xs font-medium text-slate-400">เป้า</th>
                    <th className="text-right px-4 py-3 text-xs font-medium text-slate-400">ยอดจริง</th>
                    <th className="text-right px-4 py-3 text-xs font-medium text-slate-400">% สำเร็จ</th>
                    <th className="text-right px-4 py-3 text-xs font-medium text-slate-400">ADS ใช้จริง</th>
                    <th className="text-right px-4 py-3 text-xs font-medium text-slate-400">เหลือวัน</th>
                    <th className="text-right px-4 py-3 text-xs font-medium text-slate-400">Content</th>
                    <th className="text-right px-5 py-3 text-xs font-medium text-red-400">เกินกำหนด</th>
                  </tr>
                </thead>
                <tbody>
                  {products.length === 0 ? (
                    <EmptyState message="ยังไม่มี Product ในระบบ" />
                  ) : products.map(p => {
                    const s = salesByProduct.get(p.product_id)
                    const c = contentsByProduct.get(p.product_id) || []
                    const adsForProduct = adsByProduct.get(p.product_id) || []
                    const target = Number(s?.sales_target_amount || 0)
                    const actual = Number(s?.actual_sales || 0)
                    const rowPct = target > 0 ? Math.round((actual / target) * 100) : 0
                    const barColor = rowPct >= 80 ? 'bg-emerald-500' : rowPct >= 40 ? 'bg-amber-400' : 'bg-blue-500'
                    const adsSpent = adsForProduct.reduce((sum: number, a: any) => sum + Number(a.budget_spent || 0), 0)
                    const TODAY_STR = new Date().toISOString().split('T')[0]
                    const overdueContents = c.filter((x: any) => x.status !== 'โพสต์แล้ว' && x.deadline && x.deadline < TODAY_STR)
                    const daysLeft = s?.period_end ? Math.max(0, Math.round((new Date(s.period_end).getTime() - TODAY_MS) / 86400000)) : null
                    const isActive = activePanel === 'product' && activePanelProduct === p.product_id
                    return (
                      <tr key={p.id}
                        onClick={() => openPanel(isActive ? null : 'product', p.product_id)}
                        className={`border-b border-slate-100/60 transition-colors cursor-pointer last:border-0
                          ${isActive ? 'bg-indigo-50' : 'hover:bg-slate-50'}`}>
                        <td className="px-5 py-3 font-mono text-xs text-slate-400">{p.product_id}</td>
                        <td className="px-4 py-3 font-medium text-slate-900 max-w-[200px] truncate" title={p.name}>
                          <div className="flex items-center gap-1.5">
                            {p.name}
                            {isActive && <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" className="text-indigo-500 shrink-0"><polyline points="9 18 15 12 9 6"/></svg>}
                          </div>
                        </td>
                        <td className="px-4 py-3 text-sm text-slate-500">{p.brand}</td>
                        <td className="px-4 py-3">
                          <span className={`inline-block px-2 py-0.5 rounded-md text-xs font-medium ${productStatusStyle[p.status] || 'bg-slate-100 text-slate-400'}`}>{p.status}</span>
                        </td>
                        <td className="px-4 py-3 text-right text-sm text-slate-400">฿{target.toLocaleString()}</td>
                        <td className="px-4 py-3 text-right text-sm font-medium text-slate-900">฿{actual.toLocaleString()}</td>
                        <td className="px-4 py-3 text-right">
                          <div className="flex items-center justify-end gap-2">
                            <div className="w-14 h-1.5 rounded-full overflow-hidden bg-slate-100">
                              <div className={`h-full rounded-full ${barColor}`} style={{ width: `${Math.min(rowPct, 100)}%` }} />
                            </div>
                            <span className="text-xs text-slate-500 w-10 text-right tabular-nums">{rowPct}%</span>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-right text-sm tabular-nums text-slate-500">
                          {adsSpent > 0 ? `฿${adsSpent.toLocaleString()}` : <span className="text-slate-300">—</span>}
                        </td>
                        <td className="px-4 py-3 text-right">
                          {daysLeft !== null
                            ? <span className={`text-xs tabular-nums font-medium ${daysLeft <= 3 ? 'text-red-500' : daysLeft <= 7 ? 'text-amber-500' : 'text-slate-500'}`}>{daysLeft} วัน</span>
                            : <span className="text-slate-300 text-xs">—</span>}
                        </td>
                        <td className="px-5 py-3 text-right">
                          <span className="text-xs text-slate-400">
                            {c.filter((x: any) => x.status === 'โพสต์แล้ว').length}/{c.length}
                          </span>
                        </td>
                        <td className="px-5 py-3 text-right">
                          {overdueContents.length > 0
                            ? <span className="text-xs font-semibold text-red-500 bg-red-50 px-2 py-0.5 rounded-md">{overdueContents.length} ชิ้น</span>
                            : <span className="text-xs text-emerald-500">✓</span>}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* My Tasks */}
          <div className="bg-white rounded-2xl border border-slate-100 overflow-hidden shadow-sm">
            <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
              <h2 className="text-sm font-semibold text-slate-900">งานของฉัน</h2>
              <span className="text-xs text-slate-400">{myTasks.totalTasks} รายการ</span>
            </div>
            <div className="grid grid-cols-3 gap-3 p-4">
              <Link href="/contents" className="p-5 rounded-xl hover:shadow-md hover:-translate-y-0.5 transition-all block bg-violet-50">
                <p className="text-xs text-slate-400 mb-2">Content ที่รับผิดชอบ</p>
                <p className="text-2xl font-semibold text-slate-900 leading-none">{myTasks.myContents.length}</p>
                <div className="flex gap-3 mt-3 flex-wrap">
                  <span className="text-xs text-emerald-600">โพสต์แล้ว {myTasks.myDone}</span>
                  <span className="text-xs text-blue-500">กำลังทำ {myTasks.myInProgress}</span>
                  <span className="text-xs text-slate-400">รอผลิต {myTasks.myWaiting}</span>
                </div>
              </Link>
              <Link href="/ads" className="p-5 rounded-xl hover:shadow-md hover:-translate-y-0.5 transition-all block bg-amber-50">
                <p className="text-xs text-slate-400 mb-2">แคมเปญ Ads ที่ดูแล</p>
                <p className="text-2xl font-semibold text-slate-900 leading-none">{myTasks.myAds.length}</p>
                <p className="text-xs text-slate-400 mt-3">campaigns</p>
              </Link>
              <Link href="/products" className="p-5 rounded-xl hover:shadow-md hover:-translate-y-0.5 transition-all block bg-emerald-50">
                <p className="text-xs text-slate-400 mb-2">Product ที่ดูแล</p>
                <p className="text-2xl font-semibold text-slate-900 leading-none">{myTasks.myProducts.length}</p>
                <p className="text-xs text-slate-400 mt-3">products</p>
              </Link>
            </div>
          </div>

        </div>
      </div>

      {/* ── Detail Panel (slide in from right) ──────────────── */}
      {activePanel && (
        <div
          className="fixed top-0 right-0 h-screen w-[380px] bg-white border-l border-slate-200 shadow-xl z-40 flex flex-col">
          {/* Panel header */}
          <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 shrink-0">
            <h3 className="text-sm font-semibold text-slate-900">{panelTitles[activePanel]}</h3>
            <div className="flex items-center gap-2">
              {activePanel === 'product' && activePanelProduct && (
                <Link href={`/contents?product=${activePanelProduct}`}
                  className="text-xs text-indigo-600 hover:underline">ดู Content →</Link>
              )}
              {activePanel === 'sales'    && <Link href="/sales"    className="text-xs text-indigo-600 hover:underline">ดูทั้งหมด →</Link>}
              {activePanel === 'ads'      && <Link href="/ads"      className="text-xs text-indigo-600 hover:underline">ดูทั้งหมด →</Link>}
              {activePanel === 'leads'    && <Link href="/leads"    className="text-xs text-indigo-600 hover:underline">ดูทั้งหมด →</Link>}
              {activePanel === 'contents' && <Link href="/contents" className="text-xs text-indigo-600 hover:underline">ดูทั้งหมด →</Link>}
              {activePanel === 'roi'      && <Link href="/leads"    className="text-xs text-indigo-600 hover:underline">ดู Leads →</Link>}
              <button onClick={closePanel} className="text-slate-400 hover:text-slate-700 p-1 rounded-lg hover:bg-slate-100 transition-colors ml-1">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                  <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
                </svg>
              </button>
            </div>
          </div>
          {/* Panel body — scrollable */}
          <div className="flex-1 overflow-y-auto px-5 py-5">
            <PanelContent />
          </div>
        </div>
      )}
    </div>
  )
}

function KPICard({ label, value, sub, pct, accent, icon, active, onClick }: {
  label: string; value: string; sub: string; pct?: number
  accent: 'emerald' | 'amber' | 'blue' | 'violet'; icon: 'baht' | 'ads' | 'trending' | 'edit'
  active: boolean; onClick: () => void
}) {
  const accentMap = {
    emerald: { bar: '#10b981', bg: '#ecfdf5', fg: '#059669' },
    amber:   { bar: '#f59e0b', bg: '#fffbeb', fg: '#d97706' },
    blue:    { bar: '#3b82f6', bg: '#eff6ff', fg: '#2563eb' },
    violet:  { bar: '#8b5cf6', bg: '#f5f3ff', fg: '#7c3aed' },
  }
  const a = accentMap[accent]
  const barColor = pct !== undefined ? (pct >= 80 ? '#10b981' : pct >= 40 ? '#f59e0b' : '#3b82f6') : a.bar

  return (
    <button type="button" onClick={onClick}
      className={`text-left bg-white rounded-2xl border p-5 hover:shadow-md hover:-translate-y-0.5 transition-all block relative overflow-hidden w-full
        ${active ? 'border-indigo-300 ring-2 ring-indigo-100 shadow-md' : 'border-slate-100'}`}>
      <div className="absolute top-0 left-0 right-0 h-1" style={{ backgroundColor: a.bar }} />
      <div className="flex items-center justify-between mb-3 mt-1">
        <p className="text-xs text-slate-400">{label}</p>
        <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ backgroundColor: a.bg }}>
          {icon === 'baht' && <span className="text-xs font-bold" style={{ color: a.fg }}>฿</span>}
          {icon === 'ads' && <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke={a.fg} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="18" height="18" rx="2"/><line x1="3" y1="9" x2="21" y2="9"/></svg>}
          {icon === 'trending' && <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke={a.fg} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="23 6 13.5 15.5 8.5 10.5 1 18"/><polyline points="17 6 23 6 23 12"/></svg>}
          {icon === 'edit' && <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke={a.fg} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>}
        </div>
      </div>
      <p className="text-2xl font-semibold text-slate-900 leading-none">{value}</p>
      <p className="text-xs text-slate-400 mt-2">{sub}</p>
      {pct !== undefined && (
        <div className="mt-3">
          <div className="w-full h-1.5 rounded-full overflow-hidden bg-slate-100">
            <div className="h-full rounded-full transition-all" style={{ width: `${Math.min(pct, 100)}%`, backgroundColor: barColor }} />
          </div>
          <p className="text-xs text-slate-400 mt-1.5">{pct}% ของเป้า</p>
        </div>
      )}
      {/* Hint */}
      <p className="text-[10px] text-slate-300 mt-2">{active ? '▸ กำลังดูรายละเอียด' : 'กดเพื่อดูรายละเอียด'}</p>
    </button>
  )
}

function Loading() {
  return (
    <div className="p-6 space-y-4">
      <div className="grid grid-cols-4 gap-4">
        {[...Array(4)].map((_, i) => <div key={i} className="bg-white rounded-2xl h-28 animate-pulse border border-slate-100" />)}
      </div>
      <div className="bg-white rounded-2xl h-64 animate-pulse border border-slate-100" />
      <div className="bg-white rounded-2xl h-64 animate-pulse border border-slate-100" />
      <div className="bg-white rounded-2xl h-28 animate-pulse border border-slate-100" />
    </div>
  )
}
