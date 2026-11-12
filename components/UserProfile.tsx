'use client'

/**
 * UserProfile — personal KPI dashboard at /profile
 * 4 URL-synced tabs: overview | content | ads | leads
 *
 * All data fetched from existing tables via current user's FK columns.
 * No new DB schema needed; RLS allows SELECT on all tables for authenticated users.
 */

import { useEffect, useState, useMemo } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase'
import { useProfile } from '@/lib/profile-context'
import { showToast } from './Toast'
import { TableSkeleton, EmptyState, todayStr } from './TableState'
import {
  pagePadCls, tableWrapCls, cardCls,
  thCls, thRightCls, tdCls, tdRightCls,
  btnPrimary, btnSecondary, inputCls,
  sectionLabelCls,
} from '@/lib/cx'
import { roleStyle, contentStatusStyle, productStatusStyle, leadStatusStyle } from '@/lib/status-styles'

// ─── Types ────────────────────────────────────────────────────────────────────

type ContentRow = {
  id: number
  product_id: string
  seq: number
  type: string
  title: string
  status: string | null
  deadline: string | null
  actual_submit_date: string | null
  actual_post_date: string | null
  assigned_date: string | null
  assigned_to_id: string | null
  producer_id: string | null
  approver_id: string | null
  poster_id: string | null
}

type AdsRow = {
  id: number
  campaign_name: string
  product_id: string
  month: string | null
  budget_total: number | null
  budget_spent: number | null
  leads: number | null
  cpl: number | null
  roas: number | null
}

type LeadRow = {
  id: number
  product_id: string
  channel_in: string
  status: string
  deal_amount: number | null
  closed_at: string | null
}

type ProductRow = {
  product_id: string
  name: string
  brand: string | null
  status: string | null
}

type RoiRow = {
  content_id: number | null
  title: string | null
  total_leads: number | null
  closed_leads: number | null
  deal_revenue: number | null
  roi: number | null
  roi_pct: number | null
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const TODAY = todayStr()

function fmt(n: number, prefix = '') {
  return prefix + n.toLocaleString('th-TH')
}
function pct(a: number, b: number) {
  return b > 0 ? Math.round((a / b) * 100) : 0
}
function fmtDate(d: string | null) {
  if (!d) return '—'
  return new Date(d).toLocaleDateString('th-TH', { day: 'numeric', month: 'short' })
}
function daysAgo(a: string | null, b: string | null) {
  if (!a || !b) return null
  const diff = new Date(b).getTime() - new Date(a).getTime()
  return Math.round(diff / 86400000)
}

// Role label per FK column
const ROLE_LABEL: Record<string, string> = {
  assigned_to_id: 'ผู้ดูแล',
  producer_id:    'ผู้ผลิต',
  approver_id:    'ผู้อนุมัติ',
  poster_id:      'ผู้โพสต์',
}

function myRoleOn(c: ContentRow, userId: string): string {
  if (c.producer_id    === userId) return 'ผู้ผลิต'
  if (c.approver_id    === userId) return 'ผู้อนุมัติ'
  if (c.assigned_to_id === userId) return 'ผู้ดูแล'
  if (c.poster_id      === userId) return 'ผู้โพสต์'
  return '—'
}

// ─── Sub-components ───────────────────────────────────────────────────────────

/** KPI card used across all tabs */
function KpiCard({ label, value, sub, color = 'bg-indigo-500' }: {
  label: string; value: string; sub?: string; color?: string
}) {
  return (
    <div className={`${cardCls} relative overflow-hidden`}>
      <div className={`absolute top-0 left-0 right-0 h-0.5 ${color}`} />
      <p className="text-xs text-slate-400 mb-2.5 mt-1">{label}</p>
      <p className="text-2xl font-semibold text-slate-900 leading-none">{value}</p>
      {sub && <p className="text-xs text-slate-400 mt-2">{sub}</p>}
    </div>
  )
}

/** Underline tab bar */
function TabBar({ tabs, active, onChange }: {
  tabs: { key: string; label: string }[]
  active: string
  onChange: (k: string) => void
}) {
  return (
    <div className="flex gap-1 border-b border-slate-100">
      {tabs.map(t => (
        <button key={t.key} onClick={() => onChange(t.key)}
          className={`px-4 py-2.5 text-sm font-medium border-b-2 -mb-px transition-colors ${
            active === t.key
              ? 'border-indigo-600 text-indigo-600'
              : 'border-transparent text-slate-500 hover:text-slate-700'
          }`}>
          {t.label}
        </button>
      ))}
    </div>
  )
}

/** Progress bar with label */
function ProgressBar({ value, max, label, color = 'bg-indigo-500' }: {
  value: number; max: number; label: string; color?: string
}) {
  const p = pct(value, max)
  return (
    <div>
      <div className="flex justify-between items-center mb-1.5">
        <span className="text-xs text-slate-600">{label}</span>
        <span className="text-xs font-semibold text-slate-700 tabular-nums">{p}%</span>
      </div>
      <div className="w-full h-2 rounded-full bg-slate-100 overflow-hidden">
        <div className={`h-full rounded-full ${color} transition-all`}
          style={{ width: `${Math.min(p, 100)}%` }} />
      </div>
      <p className="text-[11px] text-slate-400 mt-1">{value} / {max} ชิ้น</p>
    </div>
  )
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function UserProfile() {
  const supabase   = createClient()
  const me         = useProfile()
  const searchParams = useSearchParams()
  const router       = useRouter()

  // Tab from URL param — default: 'overview'
  const TAB_KEYS = ['overview', 'content', 'ads', 'leads']
  const rawTab   = searchParams.get('tab') ?? 'overview'
  const activeTab = TAB_KEYS.includes(rawTab) ? rawTab : 'overview'

  function setTab(tab: string) {
    const params = new URLSearchParams(searchParams.toString())
    if (tab === 'overview') params.delete('tab')
    else params.set('tab', tab)
    router.replace(`/profile${params.size ? '?' + params.toString() : ''}`)
  }

  // Data
  const [contents,  setContents]  = useState<ContentRow[]>([])
  const [products,  setProducts]  = useState<ProductRow[]>([])
  const [ads,       setAds]       = useState<AdsRow[]>([])
  const [leads,     setLeads]     = useState<LeadRow[]>([])
  const [roiData,   setRoiData]   = useState<RoiRow[]>([])
  const [loading,   setLoading]   = useState(true)
  const [loadError, setLoadError] = useState('')

  // Name edit
  const [editingName,  setEditingName]  = useState(false)
  const [nameVal,      setNameVal]      = useState(me.name)
  const [savingName,   setSavingName]   = useState(false)

  // Content tab filter
  const [roleFilter, setRoleFilter] = useState<'all' | 'assigned_to_id' | 'producer_id' | 'approver_id' | 'poster_id'>('all')

  // ── Load all data in parallel ─────────────────────────────
  useEffect(() => {
    async function load() {
      setLoadError('')
      const [cRes, pRes, aRes, lRes] = await Promise.all([
        supabase
          .from('contents')
          .select('id, product_id, seq, type, title, status, deadline, actual_submit_date, actual_post_date, assigned_date, assigned_to_id, producer_id, approver_id, poster_id')
          .or(`assigned_to_id.eq.${me.id},producer_id.eq.${me.id},approver_id.eq.${me.id},poster_id.eq.${me.id}`)
          .order('deadline', { ascending: true, nullsFirst: false }),
        supabase
          .from('products')
          .select('product_id, name, brand, status')
          .eq('owner_id', me.id)
          .order('created_at', { ascending: false }),
        supabase
          .from('ads')
          .select('id, campaign_name, product_id, month, budget_total, budget_spent, leads, cpl, roas')
          .eq('managed_by_id', me.id)
          .order('month', { ascending: false }),
        supabase
          .from('leads')
          .select('id, product_id, channel_in, status, deal_amount, closed_at')
          .eq('owner_id', me.id)
          .order('created_at', { ascending: false }),
      ])

      if (cRes.error) { setLoadError(cRes.error.message); setLoading(false); return }
      setContents((cRes.data ?? []) as ContentRow[])
      setProducts((pRes.data ?? []) as ProductRow[])
      setAds((aRes.data ?? []) as AdsRow[])
      setLeads((lRes.data ?? []) as LeadRow[])

      // ROI data — only if there are contents to look up
      const contentIds = (cRes.data ?? []).map((c: any) => c.id)
      if (contentIds.length > 0) {
        const { data: roi } = await supabase
          .from('v_content_roi')
          .select('content_id, title, total_leads, closed_leads, deal_revenue, roi, roi_pct')
          .in('content_id', contentIds)
          .order('deal_revenue', { ascending: false })
        setRoiData((roi ?? []) as RoiRow[])
      }

      setLoading(false)
    }
    load()
  }, [me.id]) // eslint-disable-line react-hooks/exhaustive-deps

  // ── KPI computations ─────────────────────────────────────
  const kpi = useMemo(() => {
    const done      = contents.filter(c => c.status === 'โพสต์แล้ว')
    const active    = contents.filter(c => c.status !== 'โพสต์แล้ว')
    const overdue   = active.filter(c => c.deadline && c.deadline < TODAY)
    const inProg    = active.filter(c => c.status !== 'รอผลิต')

    // On-time delivery: contents that are done AND had a deadline
    const doneWithDeadline = done.filter(c => c.deadline && c.actual_submit_date)
    const onTime = doneWithDeadline.filter(c => c.actual_submit_date! <= c.deadline!)

    // Average days from assigned_date to actual_submit_date
    const submitDays = done
      .map(c => daysAgo(c.assigned_date, c.actual_submit_date))
      .filter((d): d is number => d !== null && d >= 0)
    const avgDays = submitDays.length
      ? Math.round(submitDays.reduce((a, b) => a + b, 0) / submitDays.length)
      : null

    // Ads KPIs
    const totalBudget  = ads.reduce((s, a) => s + Number(a.budget_total  ?? 0), 0)
    const totalSpent   = ads.reduce((s, a) => s + Number(a.budget_spent  ?? 0), 0)
    const totalLeads   = ads.reduce((s, a) => s + Number(a.leads         ?? 0), 0)
    const avgRoas      = ads.length
      ? ads.reduce((s, a) => s + Number(a.roas ?? 0), 0) / ads.length
      : 0

    // Leads KPIs
    const closedLeads    = leads.filter(l => l.closed_at)
    const totalDeal      = closedLeads.reduce((s, l) => s + Number(l.deal_amount ?? 0), 0)
    const avgDeal        = closedLeads.length ? Math.round(totalDeal / closedLeads.length) : 0
    const convRate       = pct(closedLeads.length, leads.length)

    return {
      contentTotal:   contents.length,
      contentDone:    done.length,
      contentActive:  active.length,
      contentOverdue: overdue.length,
      contentInProg:  inProg.length,
      onTime:         onTime.length,
      onTimeTotal:    doneWithDeadline.length,
      avgDays,
      adsTotal:       ads.length,
      totalBudget,
      totalSpent,
      totalLeads,
      avgRoas,
      leadsTotal:     leads.length,
      leadsClosed:    closedLeads.length,
      totalDeal,
      avgDeal,
      convRate,
    }
  }, [contents, ads, leads])

  // ── Filtered contents (content tab) ──────────────────────
  const filteredContents = useMemo(() => {
    if (roleFilter === 'all') return contents
    return contents.filter(c => (c as any)[roleFilter] === me.id)
  }, [contents, roleFilter, me.id])

  // ── Save name ─────────────────────────────────────────────
  async function saveName() {
    const trimmed = nameVal.trim()
    if (!trimmed) return
    setSavingName(true)
    const { error } = await supabase.from('profiles').update({ name: trimmed }).eq('id', me.id)
    setSavingName(false)
    if (error) { showToast(error.message, 'error'); return }
    // Update local context (profile-context is read-only; show toast instead of live update)
    showToast('อัปเดตชื่อแล้ว — กรุณารีเฟรชหน้าเพื่อเห็นการเปลี่ยนแปลงใน Sidebar')
    setEditingName(false)
  }

  // ── Tabs config ───────────────────────────────────────────
  const TABS = [
    { key: 'overview', label: 'ภาพรวม' },
    { key: 'content',  label: `Content${contents.length ? ` (${contents.length})` : ''}` },
    ...(ads.length   > 0 ? [{ key: 'ads',   label: `Ads (${ads.length})`     }] : []),
    ...(leads.length > 0 ? [{ key: 'leads', label: `Leads (${leads.length})` }] : []),
  ]

  // ── Render ────────────────────────────────────────────────
  if (loading) {
    return (
      <div className={pagePadCls}>
        {/* Profile card skeleton */}
        <div className="bg-white rounded-2xl border border-slate-100 p-5 shadow-sm flex items-center gap-4">
          <div className="w-16 h-16 rounded-full bg-slate-100 animate-pulse shrink-0" />
          <div className="space-y-2 flex-1">
            <div className="h-5 bg-slate-100 rounded-lg animate-pulse w-40" />
            <div className="h-3.5 bg-slate-100 rounded-lg animate-pulse w-56" />
          </div>
        </div>
        {/* KPI skeletons */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map(i => (
            <div key={i} className="bg-white rounded-2xl border border-slate-100 p-5 shadow-sm h-24 animate-pulse" />
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className={pagePadCls}>

      {/* ── Profile Card ──────────────────────────────────── */}
      <div className="bg-white rounded-2xl border border-slate-100 p-5 shadow-sm">
        <div className="flex items-start gap-4">
          {/* Avatar */}
          <div className="w-16 h-16 rounded-full flex items-center justify-center font-bold text-xl shrink-0 select-none"
            style={{ background: 'linear-gradient(135deg, #e0e7ff, #ede9fe)', color: '#4f46e5' }}>
            {(me.name?.[0] || me.email?.[0] || '?').toUpperCase()}
          </div>

          {/* Info */}
          <div className="flex-1 min-w-0">
            {editingName ? (
              <div className="flex items-center gap-2 flex-wrap mb-1">
                <input
                  value={nameVal}
                  onChange={e => setNameVal(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter') saveName(); if (e.key === 'Escape') { setEditingName(false); setNameVal(me.name) } }}
                  autoFocus
                  className="border border-indigo-300 rounded-lg px-2.5 py-1 text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-indigo-400 w-48"
                />
                <button onClick={saveName} disabled={savingName}
                  className={`${btnPrimary} py-1 text-xs`}>
                  {savingName ? 'กำลังบันทึก…' : 'บันทึก'}
                </button>
                <button onClick={() => { setEditingName(false); setNameVal(me.name) }}
                  className="text-xs text-slate-400 hover:text-slate-700 px-2 py-1">
                  ยกเลิก
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-2 mb-1 flex-wrap">
                <h1 className="text-lg font-semibold text-slate-900">{me.name}</h1>
                <button onClick={() => setEditingName(true)}
                  className="text-slate-300 hover:text-indigo-500 transition-colors" title="แก้ไขชื่อ">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
                    <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
                  </svg>
                </button>
              </div>
            )}
            <p className="text-sm text-slate-400">{me.email}</p>
            <div className="flex items-center gap-2 mt-2 flex-wrap">
              <span className={`text-xs font-medium px-2.5 py-0.5 rounded-full ${roleStyle[me.role] ?? 'bg-slate-100 text-slate-500'}`}>
                {me.role}
              </span>
              {me.brand_access && me.brand_access.length > 0 && (
                <span className="text-xs text-slate-400">
                  Brand: {me.brand_access.join(', ')}
                </span>
              )}
            </div>
          </div>
        </div>
      </div>

      {loadError && (
        <div className="bg-red-50 border border-red-100 rounded-2xl px-4 py-3 text-sm text-red-600">
          โหลดข้อมูลไม่สำเร็จ: {loadError}
        </div>
      )}

      {/* ── Tabs ──────────────────────────────────────────── */}
      <TabBar tabs={TABS} active={activeTab} onChange={setTab} />

      {/* ══════════════════════════════════════════════════════
          Tab: ภาพรวม
      ══════════════════════════════════════════════════════ */}
      {activeTab === 'overview' && (
        <div className="space-y-5">

          {/* KPI Summary */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <KpiCard label="Content ที่รับผิดชอบ" value={String(kpi.contentTotal)}
              sub={`${kpi.contentActive} กำลังดำเนินการ`} color="bg-indigo-500" />
            <KpiCard label="โพสต์แล้ว" value={String(kpi.contentDone)}
              sub={`${pct(kpi.contentDone, kpi.contentTotal)}% ของทั้งหมด`} color="bg-emerald-500" />
            <KpiCard label="Campaigns ดูแล" value={String(kpi.adsTotal)}
              sub={kpi.adsTotal > 0 ? `Leads รวม ${kpi.totalLeads.toLocaleString()}` : 'ไม่มีแคมเปญ'} color="bg-amber-500" />
            <KpiCard label="Leads ปิดแล้ว" value={String(kpi.leadsClosed)}
              sub={kpi.leadsClosed > 0 ? `฿${kpi.totalDeal.toLocaleString()}` : 'ไม่มี leads'} color="bg-violet-500" />
          </div>

          {/* On-time delivery */}
          {kpi.onTimeTotal > 0 && (
            <div className={`${tableWrapCls} p-5`}>
              <p className={`${sectionLabelCls} mb-4`}>ประสิทธิภาพการส่งงาน</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                <ProgressBar
                  value={kpi.onTime}
                  max={kpi.onTimeTotal}
                  label="ส่งทันกำหนด"
                  color={pct(kpi.onTime, kpi.onTimeTotal) >= 70 ? 'bg-emerald-500' : 'bg-amber-500'}
                />
                <div>
                  <p className="text-xs text-slate-600 mb-1">Avg เวลาที่ใช้ต่อชิ้น</p>
                  <p className="text-2xl font-semibold text-slate-900">
                    {kpi.avgDays !== null ? `${kpi.avgDays} วัน` : '—'}
                  </p>
                  <p className="text-[11px] text-slate-400 mt-1">จากวันมอบหมายถึงวันส่ง</p>
                </div>
              </div>
            </div>
          )}

          {/* Overdue alert */}
          {kpi.contentOverdue > 0 && (
            <div className="bg-red-50 border border-red-100 rounded-2xl px-4 py-3 flex items-center gap-3">
              <span className="text-red-500 text-lg">⚠️</span>
              <div>
                <p className="text-sm font-semibold text-red-700">
                  เกิน deadline {kpi.contentOverdue} ชิ้น
                </p>
                <p className="text-xs text-red-500 mt-0.5">
                  กด "Content" ด้านบนเพื่อดูรายละเอียด
                </p>
              </div>
            </div>
          )}

          {/* Products owned */}
          {products.length > 0 && (
            <div className={tableWrapCls}>
              <div className="px-4 py-3 border-b border-slate-100">
                <p className={sectionLabelCls}>สินค้าที่รับผิดชอบ ({products.length})</p>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-slate-100">
                      {['Product ID', 'ชื่อ', 'Brand', 'สถานะ'].map(h => (
                        <th key={h} className={thCls}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {products.map(p => (
                      <tr key={p.product_id} className="border-b border-slate-50 hover:bg-slate-50/60">
                        <td className={`${tdCls} font-mono text-xs text-slate-600`}>{p.product_id}</td>
                        <td className={`${tdCls} font-medium text-slate-800`}>{p.name}</td>
                        <td className={`${tdCls} text-slate-500`}>{p.brand ?? '—'}</td>
                        <td className={tdCls}>
                          {p.status ? (
                            <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${productStatusStyle[p.status] ?? 'bg-slate-100 text-slate-600'}`}>
                              {p.status}
                            </span>
                          ) : '—'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Quick stats when no work yet */}
          {kpi.contentTotal === 0 && products.length === 0 && kpi.adsTotal === 0 && kpi.leadsTotal === 0 && (
            <div className="text-center py-16 text-slate-400">
              <div className="text-5xl mb-4">📋</div>
              <p className="text-sm font-medium text-slate-600">ยังไม่มีงานที่มอบหมาย</p>
              <p className="text-xs mt-1">เมื่อ admin/manager มอบหมายงานให้ ข้อมูลจะแสดงที่นี่</p>
            </div>
          )}
        </div>
      )}

      {/* ══════════════════════════════════════════════════════
          Tab: Content
      ══════════════════════════════════════════════════════ */}
      {activeTab === 'content' && (
        <div className="space-y-5">

          {/* KPI chips */}
          <div className="flex gap-2 flex-wrap">
            {[
              { label: 'ทั้งหมด',         value: kpi.contentTotal,   color: 'bg-slate-100 text-slate-700' },
              { label: 'กำลังดำเนินการ', value: kpi.contentInProg,  color: 'bg-blue-50 text-blue-700' },
              { label: 'โพสต์แล้ว',       value: kpi.contentDone,    color: 'bg-emerald-50 text-emerald-700' },
              { label: 'เกิน deadline',    value: kpi.contentOverdue, color: 'bg-red-50 text-red-600' },
            ].map(chip => (
              <span key={chip.label}
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium border border-current/10 ${chip.color}`}>
                {chip.label}
                <span className="font-bold tabular-nums">{chip.value}</span>
              </span>
            ))}
          </div>

          {/* Role filter */}
          <div className="flex gap-1.5 flex-wrap items-center">
            <span className="text-xs text-slate-400 mr-1">บทบาทของฉัน:</span>
            {(['all', 'assigned_to_id', 'producer_id', 'approver_id', 'poster_id'] as const).map(r => (
              <button key={r} onClick={() => setRoleFilter(r)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors ${
                  roleFilter === r
                    ? 'bg-indigo-600 text-white border-indigo-600'
                    : 'bg-white text-slate-500 border-slate-200 hover:bg-slate-50'
                }`}>
                {r === 'all' ? 'ทั้งหมด' : ROLE_LABEL[r]}
              </button>
            ))}
          </div>

          {/* Desktop table */}
          <div className={`${tableWrapCls} hidden md:block`}>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-slate-50/60 border-b border-slate-100">
                    {['Product', 'ประเภท', 'ชื่องาน', 'สถานะ', 'บทบาท', 'กำหนดส่ง', 'ส่งจริง', 'วันโพสต์'].map(h => (
                      <th key={h} className={thCls}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100/60">
                  {filteredContents.length === 0 ? (
                    <EmptyState message="ไม่มีงานในบทบาทนี้" />
                  ) : filteredContents.map(c => {
                    const isOverdue = c.deadline && c.deadline < TODAY && c.status !== 'โพสต์แล้ว'
                    return (
                      <tr key={c.id} className="hover:bg-slate-50/60 transition-colors">
                        <td className={`${tdCls} font-mono text-xs text-slate-500 whitespace-nowrap`}>{c.product_id}</td>
                        <td className={tdCls}>
                          <span className="text-xs font-medium px-2 py-0.5 rounded bg-slate-100 text-slate-600">{c.type}</span>
                        </td>
                        <td className={`${tdCls} max-w-[220px]`}>
                          <p className="font-medium text-slate-800 truncate" title={c.title}>{c.title}</p>
                        </td>
                        <td className={tdCls}>
                          {c.status ? (
                            <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${contentStatusStyle[c.status] ?? 'bg-slate-100 text-slate-600'}`}>
                              {c.status}
                            </span>
                          ) : '—'}
                        </td>
                        <td className={tdCls}>
                          <span className="text-xs text-slate-500 bg-slate-100 px-2 py-0.5 rounded">
                            {myRoleOn(c, me.id)}
                          </span>
                        </td>
                        <td className={`${tdCls} whitespace-nowrap`}>
                          <span className={`text-sm tabular-nums ${isOverdue ? 'text-red-600 font-semibold' : 'text-slate-600'}`}>
                            {fmtDate(c.deadline)}
                          </span>
                          {isOverdue && <span className="ml-1 text-[10px] text-red-500 font-medium">เกินกำหนด</span>}
                        </td>
                        <td className={`${tdCls} text-slate-500 whitespace-nowrap`}>{fmtDate(c.actual_submit_date)}</td>
                        <td className={`${tdCls} text-slate-500 whitespace-nowrap`}>{fmtDate(c.actual_post_date)}</td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* Mobile cards */}
          <div className="md:hidden space-y-2">
            {filteredContents.length === 0 ? (
              <p className="text-sm text-slate-400 text-center py-10">ไม่มีงานในบทบาทนี้</p>
            ) : filteredContents.map(c => {
              const isOverdue = c.deadline && c.deadline < TODAY && c.status !== 'โพสต์แล้ว'
              return (
                <div key={c.id} className="bg-white rounded-2xl border border-slate-100 p-4 shadow-sm space-y-2">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5 flex-wrap mb-1">
                        <span className="text-xs font-medium px-1.5 py-0.5 rounded bg-slate-100 text-slate-600">{c.type}</span>
                        <span className="text-xs text-slate-500 bg-slate-50 px-1.5 py-0.5 rounded">{myRoleOn(c, me.id)}</span>
                      </div>
                      <p className="text-sm font-medium text-slate-800 leading-snug">{c.title}</p>
                      <p className="text-xs text-slate-400 mt-0.5">{c.product_id}</p>
                    </div>
                    {c.status && (
                      <span className={`text-xs font-medium px-2 py-0.5 rounded-full shrink-0 ${contentStatusStyle[c.status] ?? 'bg-slate-100 text-slate-600'}`}>
                        {c.status}
                      </span>
                    )}
                  </div>
                  <div className="flex gap-3 text-xs text-slate-400 flex-wrap">
                    {c.deadline && (
                      <span className={isOverdue ? 'text-red-600 font-medium' : ''}>
                        กำหนด: {fmtDate(c.deadline)}{isOverdue ? ' ⚠️' : ''}
                      </span>
                    )}
                    {c.actual_post_date && <span>โพสต์: {fmtDate(c.actual_post_date)}</span>}
                  </div>
                </div>
              )
            })}
          </div>

          {/* Performance stats */}
          {kpi.onTimeTotal > 0 && (
            <div className={`${tableWrapCls} p-5`}>
              <p className={`${sectionLabelCls} mb-4`}>สถิติผลงาน</p>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {[
                  { label: 'ส่งทันกำหนด',    value: `${pct(kpi.onTime, kpi.onTimeTotal)}%`, sub: `${kpi.onTime}/${kpi.onTimeTotal}` },
                  { label: 'Avg วันทำงาน',    value: kpi.avgDays !== null ? `${kpi.avgDays} วัน` : '—', sub: 'ต่อชิ้น' },
                  { label: 'งานเสร็จแล้ว',   value: String(kpi.contentDone), sub: 'โพสต์แล้ว' },
                  { label: 'งานที่รอ',         value: String(kpi.contentTotal - kpi.contentDone), sub: 'ยังไม่เสร็จ' },
                ].map(s => (
                  <div key={s.label} className="text-center py-3 border border-slate-100 rounded-2xl">
                    <p className="text-xs text-slate-400 mb-1">{s.label}</p>
                    <p className="text-xl font-semibold text-slate-900">{s.value}</p>
                    <p className="text-[11px] text-slate-400 mt-0.5">{s.sub}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ══════════════════════════════════════════════════════
          Tab: Ads
      ══════════════════════════════════════════════════════ */}
      {activeTab === 'ads' && (
        <div className="space-y-5">

          {/* KPI Cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <KpiCard label="Campaigns ดูแล" value={String(kpi.adsTotal)} color="bg-indigo-500" />
            <KpiCard label="Leads รวม"       value={String(kpi.totalLeads)} color="bg-violet-500" />
            <KpiCard label="Budget ดูแล"     value={fmt(kpi.totalBudget, '฿')}
              sub={`ใช้ไป ${fmt(kpi.totalSpent, '฿')}`} color="bg-amber-500" />
            <KpiCard label="Avg ROAS"         value={`${kpi.avgRoas.toFixed(2)}x`}
              sub={ads.length > 0 ? `${ads.length} campaigns` : ''} color="bg-emerald-500" />
          </div>

          {/* Ads table */}
          <div className={tableWrapCls}>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-slate-50/60 border-b border-slate-100">
                    {['Product', 'Campaign', 'เดือน', 'Budget', 'ใช้ไป', 'Leads', 'CPL', 'ROAS'].map((h, i) => (
                      <th key={h} className={i >= 3 ? thRightCls : thCls}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100/60">
                  {ads.map(a => (
                    <tr key={a.id} className="hover:bg-slate-50/60 transition-colors">
                      <td className={`${tdCls} font-mono text-xs text-slate-500 whitespace-nowrap`}>{a.product_id}</td>
                      <td className={`${tdCls} font-medium text-slate-800 max-w-[200px] truncate`}>{a.campaign_name}</td>
                      <td className={`${tdCls} text-slate-500 whitespace-nowrap`}>{a.month ?? '—'}</td>
                      <td className={tdRightCls}>{fmt(Number(a.budget_total  ?? 0), '฿')}</td>
                      <td className={tdRightCls}>{fmt(Number(a.budget_spent  ?? 0), '฿')}</td>
                      <td className={`${tdRightCls} font-semibold`}>{a.leads ?? 0}</td>
                      <td className={tdRightCls}>{fmt(Math.round(Number(a.cpl ?? 0)), '฿')}</td>
                      <td className={`${tdRightCls} font-semibold text-indigo-600`}>{Number(a.roas ?? 0).toFixed(2)}x</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Revenue attribution */}
          {roiData.length > 0 && (
            <div className={tableWrapCls}>
              <div className="px-4 py-3 border-b border-slate-100">
                <p className={sectionLabelCls}>รายได้จาก Content ของฉัน</p>
                <p className="text-xs text-slate-400 mt-0.5">
                  Content ที่ฉันเป็น assigned_to — revenue จาก v_content_roi
                </p>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-slate-50/60 border-b border-slate-100">
                      {['ชื่องาน', 'Leads', 'ปิดแล้ว', 'Revenue', 'ROI'].map((h, i) => (
                        <th key={h} className={i >= 1 ? thRightCls : thCls}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100/60">
                    {roiData.map(r => (
                      <tr key={r.content_id} className="hover:bg-slate-50/60">
                        <td className={`${tdCls} font-medium text-slate-800 max-w-[200px] truncate`}>{r.title ?? '—'}</td>
                        <td className={tdRightCls}>{r.total_leads ?? 0}</td>
                        <td className={tdRightCls}>{r.closed_leads ?? 0}</td>
                        <td className={`${tdRightCls} font-semibold text-emerald-700`}>{fmt(Number(r.deal_revenue ?? 0), '฿')}</td>
                        <td className={`${tdRightCls} font-semibold ${(r.roi ?? 0) >= 0 ? 'text-emerald-700' : 'text-red-500'}`}>
                          {fmt(Math.round(Number(r.roi ?? 0)), '฿')}
                        </td>
                      </tr>
                    ))}
                    {/* Totals row */}
                    <tr className="bg-slate-50 font-semibold">
                      <td className={`${tdCls} text-xs text-slate-500`}>รวม</td>
                      <td className={tdRightCls}>{roiData.reduce((s, r) => s + Number(r.total_leads  ?? 0), 0)}</td>
                      <td className={tdRightCls}>{roiData.reduce((s, r) => s + Number(r.closed_leads ?? 0), 0)}</td>
                      <td className={`${tdRightCls} text-emerald-700`}>
                        {fmt(roiData.reduce((s, r) => s + Number(r.deal_revenue ?? 0), 0), '฿')}
                      </td>
                      <td className={tdRightCls}>
                        {fmt(roiData.reduce((s, r) => s + Math.round(Number(r.roi ?? 0)), 0), '฿')}
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ══════════════════════════════════════════════════════
          Tab: Leads
      ══════════════════════════════════════════════════════ */}
      {activeTab === 'leads' && (
        <div className="space-y-5">

          {/* KPI Cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <KpiCard label="Leads ทั้งหมด"    value={String(kpi.leadsTotal)}
              sub="ที่ดูแลอยู่" color="bg-indigo-500" />
            <KpiCard label="Conversion Rate"  value={`${kpi.convRate}%`}
              sub={`ปิดแล้ว ${kpi.leadsClosed}/${kpi.leadsTotal}`} color="bg-emerald-500" />
            <KpiCard label="Deal Value รวม"   value={fmt(kpi.totalDeal, '฿')}
              sub="เฉพาะที่ปิดแล้ว" color="bg-amber-500" />
            <KpiCard label="Avg Deal Size"    value={kpi.avgDeal > 0 ? fmt(kpi.avgDeal, '฿') : '—'}
              sub="ต่อ lead ที่ปิด" color="bg-violet-500" />
          </div>

          {/* Leads table */}
          <div className={tableWrapCls}>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-slate-50/60 border-b border-slate-100">
                    {['Product', 'ช่องทาง', 'สถานะ', 'มูลค่า', 'วันปิด'].map((h, i) => (
                      <th key={h} className={i === 3 ? thRightCls : thCls}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100/60">
                  {leads.length === 0 ? (
                    <EmptyState message="ยังไม่มี leads" />
                  ) : leads.map(l => (
                    <tr key={l.id} className="hover:bg-slate-50/60 transition-colors">
                      <td className={`${tdCls} font-mono text-xs text-slate-500 whitespace-nowrap`}>{l.product_id}</td>
                      <td className={`${tdCls} text-slate-600`}>{l.channel_in}</td>
                      <td className={tdCls}>
                        <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${leadStatusStyle[l.status] ?? 'bg-slate-100 text-slate-600'}`}>
                          {l.status}
                        </span>
                      </td>
                      <td className={`${tdRightCls} ${l.deal_amount ? 'font-semibold text-emerald-700' : 'text-slate-300'}`}>
                        {l.deal_amount ? fmt(Number(l.deal_amount), '฿') : '—'}
                      </td>
                      <td className={`${tdCls} text-slate-500 whitespace-nowrap`}>{fmtDate(l.closed_at)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

    </div>
  )
}
