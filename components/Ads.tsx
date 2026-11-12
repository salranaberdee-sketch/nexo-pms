'use client'

import { useEffect, useState, useMemo } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase'
import { useCan } from '@/lib/profile-context'
import ProfilePicker from './ProfilePicker'
import SearchInput from './SearchInput'
import { TableSkeleton, EmptyState } from './TableState'
import InlinePersonPicker, { type ProfileOption } from './InlinePersonPicker'
import { showToast } from './Toast'
import Modal, { Field, ConfirmModal } from './Modal'
import { inputCls, selectCls, btnPrimary, btnSecondary, btnDanger, thCls, thRightCls, tdCls, tdRightCls, tableWrapCls, sectionLabelCls } from '@/lib/cx'
import { useSettings } from '@/lib/app-settings'
import AdsSettingsPanel from './AdsSettingsPanel'
import { IconPlus, IconPencil, IconTrash } from '@/lib/icons'
import type { Tables } from '@/src/types/database'

type Ad = Tables<'ads'>
type Product = Tables<'products'>
type Content = Tables<'contents'>

const EMPTY_ADD_FORM = {
  product_id: '', month: '', campaign_name: '', channel: '',
  budget_approved: '', budget_allocated: '', content_ref: '',
  content_id: '',
  managed_by: '', managed_by_id: '', start_date: '', end_date: '', result_notes: '',
}

export default function Ads() {
  const [ads, setAds]               = useState<Ad[]>([])
  const [products, setProducts]     = useState<Product[]>([])
  const [contents, setContents]     = useState<Content[]>([])
  const [adContentsMap, setAdContentsMap] = useState<Map<number, number[]>>(new Map()) // ad_id → content_ids[]
  const [profileOptions, setProfileOptions] = useState<ProfileOption[]>([])
  const [loading, setLoading]       = useState(true)
  const [loadError, setLoadError]   = useState('')
  const [search, setSearch]         = useState('')
  const [filterMonth, setFilterMonth] = useState('all')

  // Add modal
  const [showAdd, setShowAdd] = useState(false)
  const [saving, setSaving]   = useState(false)
  const [addError, setAddError] = useState('')
  const [addForm, setAddForm] = useState({ ...EMPTY_ADD_FORM })

  // Edit modal
  const [editingRow, setEditingRow] = useState<any | null>(null)
  const [savingEdit, setSavingEdit] = useState(false)
  const [editError, setEditError]   = useState('')
  const [editVal, setEditVal] = useState({
    product_id: '', month: '', campaign_name: '', channel: '',
    budget_approved: '', budget_adjustment: '', budget_allocated: '',
    content_ref: '', content_id: '',
    managed_by: '', managed_by_id: '',
    start_date: '', end_date: '', next_action: '',
    reach: '', clicks: '', leads: '', budget_spent: '', sales_amount: '', result_notes: '',
  })

  // Delete confirm
  const [confirmDelete, setConfirmDelete] = useState<number | null>(null)
  const [deleting, setDeleting] = useState(false)

  const canInsert = useCan('insert', 'ads')
  const canUpdate = useCan('update', 'ads')
  const canDelete = useCan('delete', 'ads')
  const supabase = createClient()
  const { channels: settingChannels, defaultChannel } = useSettings()

  async function load() {
    setLoadError('')
    const [a, p, c, ac, pr] = await Promise.all([
      supabase
        .from('ads')
        .select('id, product_id, month, campaign_name, channel, content_ref, managed_by, managed_by_id, budget_approved, budget_adjustment, budget_allocated, budget_spent, budget_total, budget_remaining, reach, clicks, leads, cpl, roas, sales_amount, result_notes, next_action, start_date, end_date, created_at')
        .order('month', { ascending: false }).order('product_id'),
      supabase.from('products').select('product_id, name'),
      supabase.from('contents').select('id, product_id, seq, title, status').order('product_id').order('seq'),
      supabase.from('ad_contents').select('ad_id, content_id'),
      supabase.from('profiles').select('id, name, role').eq('approval_status', 'approved').order('name'),
    ])
    if (a.error) { setLoadError(a.error.message); setLoading(false); return }
    setAds(a.data || [])
    setProducts(p.data || [])
    setContents(c.data || [])
    // Build ad_id → content_ids map
    const map = new Map<number, number[]>()
    for (const row of (ac.data || [])) {
      const list = map.get(row.ad_id) || []
      list.push(row.content_id)
      map.set(row.ad_id, list)
    }
    setAdContentsMap(map)
    setProfileOptions(pr.data || [])
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  // ── Add ──────────────────────────────────────────────────────
  async function saveAdd() {
    setSaving(true); setAddError('')
    const { data: newAd, error: insErr } = await supabase.from('ads').insert([{
      product_id:      addForm.product_id,
      month:           addForm.month,
      campaign_name:   addForm.campaign_name,
      channel:         addForm.channel,
      budget_approved: Number(addForm.budget_approved) || 0,
      budget_allocated: Number(addForm.budget_allocated) || 0,
      // Keep content_ref as legacy display; ad_contents is the FK source of truth
      content_ref:     addForm.content_ref,
      managed_by:      addForm.managed_by,
      managed_by_id:   addForm.managed_by_id || null,
      start_date:      addForm.start_date || null,
      end_date:        addForm.end_date || null,
      result_notes:    addForm.result_notes,
    }]).select('id').single()
    if (insErr || !newAd) { setAddError(insErr?.message || 'เพิ่มไม่สำเร็จ'); setSaving(false); return }

    // Link content via ad_contents if a content was selected
    if (addForm.content_id) {
      const { error: acErr } = await supabase.from('ad_contents').insert([{
        ad_id: newAd.id,
        content_id: Number(addForm.content_id),
        attribution_pct: 100,
      }])
      if (acErr) showToast(`เพิ่มแคมเปญแล้ว แต่ link Content ไม่สำเร็จ: ${acErr.message}`, 'error')
    }

    setShowAdd(false)
    setAddForm({ ...EMPTY_ADD_FORM })
    await load()
    setSaving(false)
    showToast('เพิ่มแคมเปญแล้ว')
  }

  // ── Edit ─────────────────────────────────────────────────────
  function openEdit(a: any) {
    // Find linked content (first one if multiple)
    const linkedContentIds = adContentsMap.get(a.id) || []
    const linkedContentId = linkedContentIds.length > 0 ? String(linkedContentIds[0]) : ''

    setEditingRow(a)
    setEditVal({
      product_id:       a.product_id || '',
      month:            a.month || '',
      campaign_name:    a.campaign_name || '',
      channel:          a.channel || '',
      budget_approved:  String(a.budget_approved ?? 0),
      budget_adjustment: String(a.budget_adjustment ?? 0),
      budget_allocated: String(a.budget_allocated ?? 0),
      content_ref:      a.content_ref || '',
      content_id:       linkedContentId,
      managed_by:       a.managed_by || '',
      managed_by_id:    a.managed_by_id || '',
      start_date:       a.start_date || '',
      end_date:         a.end_date || '',
      next_action:      a.next_action || '',
      reach:            String(a.reach ?? 0),
      clicks:           String(a.clicks ?? 0),
      leads:            String(a.leads ?? 0),
      budget_spent:     String(a.budget_spent ?? 0),
      sales_amount:     String(a.sales_amount ?? 0),
      result_notes:     a.result_notes || '',
    })
    setEditError('')
  }

  // Generated columns (budget_remaining, cpl, roas) recompute in DB → full reload
  async function saveEdit() {
    if (!editingRow) return
    setSavingEdit(true); setEditError('')

    // Find the linked content from contents list (for content_ref display name)
    const linkedContent = editVal.content_id ? contents.find(c => c.id === Number(editVal.content_id)) : null
    const contentRefDisplay = linkedContent ? `#${linkedContent.seq} ${linkedContent.title}` : editVal.content_ref

    const { error: updErr } = await supabase.from('ads').update({
      product_id:        editVal.product_id,
      month:             editVal.month,
      campaign_name:     editVal.campaign_name,
      channel:           editVal.channel,
      budget_approved:   Number(editVal.budget_approved) || 0,
      budget_adjustment: Number(editVal.budget_adjustment) || 0,
      budget_allocated:  Number(editVal.budget_allocated) || 0,
      content_ref:       contentRefDisplay,
      managed_by:        editVal.managed_by,
      managed_by_id:     editVal.managed_by_id || null,
      start_date:        editVal.start_date || null,
      end_date:          editVal.end_date || null,
      next_action:       editVal.next_action,
      reach:             Number(editVal.reach) || 0,
      clicks:            Number(editVal.clicks) || 0,
      leads:             Number(editVal.leads) || 0,
      budget_spent:      Number(editVal.budget_spent) || 0,
      sales_amount:      Number(editVal.sales_amount) || 0,
      result_notes:      editVal.result_notes,
    }).eq('id', editingRow.id)

    if (updErr) { setEditError(updErr.message); setSavingEdit(false); return }

    // Sync ad_contents: remove old links and add new one
    if (editVal.content_id !== undefined) {
      await supabase.from('ad_contents').delete().eq('ad_id', editingRow.id)
      if (editVal.content_id) {
        const { error: acErr } = await supabase.from('ad_contents').insert([{
          ad_id: editingRow.id,
          content_id: Number(editVal.content_id),
          attribution_pct: 100,
        }])
        if (acErr) showToast(`บันทึกแล้ว แต่ link Content ไม่สำเร็จ: ${acErr.message}`, 'error')
      }
    }

    setSavingEdit(false)
    setEditingRow(null)
    await load()   // reload to get updated generated cols (budget_remaining, cpl, roas)
    showToast('บันทึกแคมเปญแล้ว')
  }

  // ── Delete ────────────────────────────────────────────────────
  async function deleteRow(id: number) {
    setDeleting(true)
    const { error: delErr } = await supabase.from('ads').delete().eq('id', id)
    setDeleting(false)
    if (delErr) { showToast(delErr.message, 'error'); return }
    setConfirmDelete(null)
    setAds(prev => prev.filter(a => a.id !== id))
    showToast('ลบแคมเปญแล้ว')
  }

  // ── Inline manager ────────────────────────────────────────────
  async function updateManager(id: number, managed_by_id: string, managed_by: string) {
    // Call supabase first, then update state
    const { error: updErr } = await supabase.from('ads').update({
      managed_by_id: managed_by_id || null, managed_by,
    }).eq('id', id)
    if (updErr) { showToast(updErr.message, 'error'); return }
    setAds(prev => prev.map(a => a.id === id ? { ...a, managed_by_id, managed_by } : a))
  }

  // ── Aggregates ────────────────────────────────────────────────
  const months = useMemo(() => Array.from(new Set(ads.map(a => a.month).filter(Boolean))).sort().reverse(), [ads])
  const totalBudget = useMemo(() => ads.reduce((s, r) => s + Number(r.budget_total ?? 0), 0), [ads])
  const totalSpent  = useMemo(() => ads.reduce((s, r) => s + Number(r.budget_spent), 0), [ads])
  const totalLeads  = useMemo(() => ads.reduce((s, r) => s + Number(r.leads), 0), [ads])
  const totalReach  = useMemo(() => ads.reduce((s, r) => s + Number(r.reach), 0), [ads])
  const spentPct    = totalBudget > 0 ? Math.round((totalSpent / totalBudget) * 100) : 0

  // Date range filter
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo]     = useState('')

  const filtered = useMemo(() => {
    let list = filterMonth === 'all' ? ads : ads.filter(a => a.month === filterMonth)
    if (dateFrom) list = list.filter(a => a.start_date && a.start_date >= dateFrom)
    if (dateTo)   list = list.filter(a => a.start_date && a.start_date <= dateTo)
    if (!search) return list
    const q = search.toLowerCase()
    return list.filter(a =>
      (a.product_id || '').toLowerCase().includes(q)
      || (a.campaign_name || '').toLowerCase().includes(q)
      || (a.channel || '').toLowerCase().includes(q),
    )
  }, [ads, search, filterMonth, dateFrom, dateTo])

  // Pagination — reset when filters change
  const [visibleCount, setVisibleCount] = useState(10)
  useEffect(() => { setVisibleCount(10) }, [search, filterMonth, dateFrom, dateTo])
  const addFilteredContents = useMemo(
    () => contents.filter(c => !addForm.product_id || c.product_id === addForm.product_id),
    [contents, addForm.product_id],
  )
  const editFilteredContents = useMemo(
    () => contents.filter(c => !editVal.product_id || c.product_id === editVal.product_id),
    [contents, editVal.product_id],
  )

  // Content dropdown filtered by product
  const contentMap = useMemo(() => new Map(contents.map(c => [c.id, c])), [contents])

  // Tab: sync with ?tab= URL param
  const searchParams = useSearchParams()
  const router = useRouter()
  const activeTab: 'list' | 'settings' = searchParams.get('tab') === 'settings' ? 'settings' : 'list'
  function setActiveTab(tab: 'list' | 'settings') {
    const params = new URLSearchParams(searchParams.toString())
    if (tab === 'list') params.delete('tab')
    else params.set('tab', tab)
    router.replace(`/ads?${params.toString()}`)
  }

  return (
    <div className="p-4 md:p-6 space-y-4 md:space-y-5">

      {/* ── Page header ───────────────────────────────────────── */}
      <div className="flex items-center justify-between gap-2">
        <div>
          <h1 className="text-lg md:text-xl font-semibold text-slate-900">Ads</h1>
          <p className="text-sm text-slate-400 mt-0.5">ติดตามแคมเปญโฆษณาและ ROI</p>
        </div>
        {activeTab === 'list' && canInsert && (
          <button onClick={() => { setAddForm({ ...EMPTY_ADD_FORM }); setAddError(''); setShowAdd(true) }}
            className={btnPrimary}>
            <IconPlus />เพิ่มแคมเปญ
          </button>
        )}
      </div>

      {/* ── Tabs ───────────────────────────────────────────── */}
      <div className="flex gap-1 border-b border-slate-100">
        <button onClick={() => setActiveTab('list')}
          className={`px-4 py-2.5 text-sm font-medium border-b-2 -mb-px transition-colors ${activeTab === 'list' ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-slate-500 hover:text-slate-700'}`}>
          รายการแคมเปญ
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
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {(
          [
            { label: 'งบทั้งหมด',   value: `฿${totalBudget.toLocaleString()}`, meta: `${ads.length} campaigns`, color: 'bg-indigo-500' },
            { label: 'ใช้จ่ายแล้ว', value: `฿${totalSpent.toLocaleString()}`,  meta: `${spentPct}% ของงบ`,    color: 'bg-amber-500' },
            { label: 'Reach รวม',   value: totalReach.toLocaleString(),         meta: 'impressions',              color: 'bg-blue-500' },
            { label: 'Leads รวม',   value: totalLeads.toLocaleString(),         meta: 'leads',                    color: 'bg-violet-500' },
          ] as const
        ).map(({ label, value, meta, color }) => (
          <div key={label} className="bg-white rounded-2xl border border-slate-100 p-5 shadow-sm relative overflow-hidden">
            <div className={`absolute top-0 left-0 right-0 h-0.5 ${color}`} />
            <p className="text-xs text-slate-400 mb-2.5 mt-1">{label}</p>
            <p className="text-2xl font-semibold text-slate-900 leading-none">{value}</p>
            <p className="text-xs text-slate-400 mt-2">{meta}</p>
          </div>
        ))}
      </div>

      {/* ── Table ─────────────────────────────────────────────── */}
      <div className={tableWrapCls}>
        {/* Toolbar */}
        <div className="px-4 py-3 border-b border-slate-100 flex items-center justify-between gap-3 flex-wrap">
          <div className="flex items-center gap-2 flex-1 flex-wrap">
            <SearchInput value={search} onChange={setSearch} placeholder="ค้นหาแคมเปญ, Product, ช่องทาง..." />
            {months.length > 0 && (
              <select value={filterMonth} onChange={e => setFilterMonth(e.target.value)}
                className="border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white text-slate-700 shrink-0">
                <option value="all">ทุกเดือน</option>
                {months.map(m => <option key={m} value={m}>{m}</option>)}
              </select>
            )}
            <div className="flex items-center gap-1 flex-wrap">
              <span className="text-xs text-slate-400 whitespace-nowrap">วันเริ่ม Campaign จาก</span>
              <input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)}
                className="border border-slate-200 rounded-xl px-2 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white text-slate-700 w-32" />
              <span className="text-xs text-slate-400">ถึง</span>
              <input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)}
                className="border border-slate-200 rounded-xl px-2 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white text-slate-700 w-32" />
              {(dateFrom || dateTo) && (
                <button onClick={() => { setDateFrom(''); setDateTo('') }}
                  className="text-xs text-slate-400 hover:text-red-500 transition-colors px-1.5 py-1 rounded-lg hover:bg-red-50">✕</button>
              )}
            </div>
          </div>
          <span className="text-xs text-slate-400 whitespace-nowrap tabular-nums">{filtered.length} รายการ</span>
        </div>

        <div className="hidden md:block overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-slate-50/60 border-b border-slate-100">
                <th className={thCls}>Product</th>
                <th className={thCls}>เดือน</th>
                <th className={thCls}>Campaign</th>
                <th className={thCls}>ช่องทาง</th>
                <th className={thCls}>Content</th>
                <th className={thCls}>ผู้ดูแล</th>
                <th className={thRightCls}>งบอนุมัติ</th>
                <th className={thRightCls}>งบจัดสรร</th>
                <th className={thRightCls}>ใช้จริง</th>
                <th className={thRightCls}>คงเหลือ</th>
                <th className={thRightCls}>Reach</th>
                <th className={thRightCls}>Clicks</th>
                <th className={thRightCls}>Leads</th>
                <th className={thRightCls}>CPL</th>
                <th className={thRightCls}>ROAS</th>
                <th className={thRightCls}>ยอดขาย Ads</th>
                <th className={thCls}></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100/60">
              {loading ? (
                <TableSkeleton cols={17} />
              ) : filtered.length === 0 ? (
                <EmptyState message="ยังไม่มีแคมเปญ" />
              ) : filtered.slice(0, visibleCount).map(a => {
                const allocated = Number(a.budget_allocated || 0)
                const spent = Number(a.budget_spent || 0)
                const over = spent > allocated
                const roas = Number(a.roas || 0)
                const roasColor = roas >= 2 ? 'text-emerald-600 font-semibold' : roas >= 1 ? 'text-slate-900' : roas > 0 ? 'text-red-500' : 'text-slate-300'
                const linkedContentIds = adContentsMap.get(a.id) || []
                const linkedContent = linkedContentIds.length > 0 ? contentMap.get(linkedContentIds[0]) : null
                const contentDisplay = linkedContent
                  ? `#${linkedContent.seq} ${linkedContent.title}`
                  : a.content_ref || null
                return (
                  <tr key={a.id} className="hover:bg-slate-50/60 transition-colors">
                    <td className={tdCls}>
                      <span className="font-mono text-xs font-medium bg-slate-100 text-slate-600 px-2 py-1 rounded-md">{a.product_id}</span>
                    </td>
                    <td className={`${tdCls} text-sm text-slate-500 whitespace-nowrap`}>{a.month}</td>
                    <td className={`${tdCls} font-semibold text-slate-900 max-w-[160px]`}>
                      <span className="truncate block" title={a.campaign_name}>{a.campaign_name}</span>
                    </td>
                    <td className={`${tdCls} text-sm text-slate-500`}>{a.channel}</td>
                    <td className={`${tdCls} max-w-[140px]`}>
                      {contentDisplay
                        ? <span className="text-xs text-indigo-600 truncate block" title={contentDisplay}>{contentDisplay}</span>
                        : <span className="text-slate-300 text-xs">—</span>}
                      {linkedContent && (
                        <span className={`text-[10px] px-1.5 py-0.5 rounded-md font-medium mt-0.5 inline-block
                          ${linkedContent.status === 'โพสต์แล้ว' ? 'bg-emerald-50 text-emerald-600'
                            : linkedContent.status === 'รอผลิต' ? 'bg-slate-100 text-slate-400'
                            : 'bg-blue-50 text-blue-600'}`}>
                          {linkedContent.status}
                        </span>
                      )}
                    </td>
                    <td className={tdCls}>
                      <InlinePersonPicker value={a.managed_by_id || ''} display={a.managed_by || ''}
                        profiles={profileOptions} disabled={!canUpdate}
                        onChange={(id, name) => updateManager(a.id, id, name)} />
                    </td>
                    <td className={`${tdRightCls} text-sm text-slate-500`}>฿{Number(a.budget_total ?? 0).toLocaleString()}</td>
                    <td className={`${tdRightCls} text-sm text-slate-600`}>฿{allocated.toLocaleString()}</td>
                    <td className={`${tdRightCls} ${over ? 'bg-red-50/50' : ''}`}>
                      <div className="flex items-center justify-end gap-1.5">
                        <span className={`text-sm ${over ? 'text-red-600 font-semibold' : 'text-slate-600'}`}>฿{spent.toLocaleString()}</span>
                        {over && <span className="text-[10px] bg-red-100 text-red-600 px-1.5 py-0.5 rounded-md font-medium">เกินงบ</span>}
                      </div>
                    </td>
                    <td className={`${tdRightCls} text-sm text-emerald-600 font-medium`}>฿{Number(a.budget_remaining).toLocaleString()}</td>
                    <td className={`${tdRightCls} text-sm text-slate-500`}>{Number(a.reach).toLocaleString()}</td>
                    <td className={`${tdRightCls} text-sm text-slate-500`}>{Number(a.clicks).toLocaleString()}</td>
                    <td className={`${tdRightCls} text-sm font-semibold text-slate-900`}>{Number(a.leads).toLocaleString()}</td>
                    <td className={`${tdRightCls} text-sm text-slate-500`}>฿{Number(a.cpl).toLocaleString()}</td>
                    <td className={`${tdRightCls} text-sm ${roasColor}`}>
                      {roas > 0 ? `${roas.toFixed(2)}×` : '—'}
                    </td>
                    <td className={`${tdRightCls} text-sm text-emerald-700 font-medium`}>
                      {Number(a.sales_amount) > 0 ? `฿${Number(a.sales_amount).toLocaleString()}` : <span className="text-slate-300">—</span>}
                    </td>
                    <td className={`${tdCls} whitespace-nowrap`}>
                      <div className="flex items-center gap-1">
                        {canUpdate && (
                          <button onClick={() => openEdit(a)} title="บันทึกผล" className={btnSecondary}>
                            <IconPencil />บันทึกผล
                          </button>
                        )}
                        {canDelete && (
                          <button onClick={() => setConfirmDelete(a.id)} title="ลบ" className={btnDanger}>
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
          {visibleCount < filtered.length && (
            <div className="px-4 py-4 border-t border-slate-100 text-center">
              <button onClick={() => setVisibleCount(v => v + 10)}
                className="text-sm text-indigo-600 font-medium hover:text-indigo-800 transition-colors">
                ดูเพิ่มเติม ({filtered.length - visibleCount} รายการ)
              </button>
            </div>
          )}
        </div>

        {/* Mobile card list */}
        <div className="md:hidden divide-y divide-slate-100">
          {loading ? (
            <div className="p-6 text-center text-sm text-slate-400">กำลังโหลด...</div>
          ) : filtered.length === 0 ? (
            <div className="p-6 text-center text-sm text-slate-400">ยังไม่มีแคมเปญ</div>
          ) : filtered.slice(0, visibleCount).map(a => {
            const allocated = Number(a.budget_allocated || 0)
            const spent = Number(a.budget_spent || 0)
            const spentPctRow = allocated > 0 ? Math.round(spent / allocated * 100) : 0
            const over = spent > allocated
            const roas = Number(a.roas || 0)
            const linkedContentIds = adContentsMap.get(a.id) || []
            const linkedContent = linkedContentIds.length > 0 ? contentMap.get(linkedContentIds[0]) : null
            const contentDisplay = linkedContent ? `#${linkedContent.seq} ${linkedContent.title}` : a.content_ref || null
            return (
              <div key={a.id} className="p-4 space-y-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-slate-900 text-sm leading-snug">{a.campaign_name}</p>
                    <div className="flex items-center gap-2 mt-1 flex-wrap">
                      <span className="font-mono text-xs text-slate-400 bg-slate-100 px-1.5 py-0.5 rounded">{a.product_id}</span>
                      <span className="text-xs text-slate-400">{a.month}</span>
                      {a.channel && <span className="text-xs text-slate-400">{a.channel}</span>}
                    </div>
                    {contentDisplay && (
                      <p className="text-xs text-indigo-600 mt-1 truncate">{contentDisplay}</p>
                    )}
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    {canUpdate && (
                      <button onClick={() => openEdit(a)} className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-xl transition-colors">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                      </button>
                    )}
                    {canDelete && (
                      <button onClick={() => setConfirmDelete(a.id)} className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-xl transition-colors">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/></svg>
                      </button>
                    )}
                  </div>
                </div>
                {/* Budget bar */}
                <div>
                  <div className="flex justify-between text-xs mb-1.5">
                    <span className="text-slate-500">ใช้จ่าย <span className={`font-semibold ${over ? 'text-red-600' : 'text-slate-800'}`}>฿{spent.toLocaleString()}</span></span>
                    <span className="text-slate-400">จัดสรร ฿{allocated.toLocaleString()}</span>
                  </div>
                  <div className="w-full h-1.5 rounded-full overflow-hidden bg-slate-100">
                    <div className={`h-full rounded-full ${over ? 'bg-red-500' : spentPctRow >= 80 ? 'bg-amber-400' : 'bg-indigo-500'}`}
                      style={{ width: `${Math.min(spentPctRow, 100)}%` }} />
                  </div>
                </div>
                {/* Stats row */}
                <div className="flex items-center gap-3 flex-wrap text-xs">
                  {Number(a.leads) > 0 && <span className="text-blue-600 font-medium">{Number(a.leads).toLocaleString()} Leads</span>}
                  {Number(a.clicks) > 0 && <span className="text-slate-500">{Number(a.clicks).toLocaleString()} Clicks</span>}
                  {roas > 0 && <span className={roas >= 2 ? 'text-emerald-600 font-semibold' : roas >= 1 ? 'text-slate-700' : 'text-red-500'}>ROAS {roas.toFixed(2)}×</span>}
                  {Number(a.cpl) > 0 && <span className="text-slate-400">CPL ฿{Math.round(Number(a.cpl)).toLocaleString()}</span>}
                </div>
              </div>
            )
          })}
          {visibleCount < filtered.length && (
            <div className="p-4 text-center">
              <button onClick={() => setVisibleCount(v => v + 10)}
                className="text-sm text-indigo-600 font-medium hover:text-indigo-800 transition-colors">
                ดูเพิ่มเติม ({filtered.length - visibleCount} รายการ)
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
        title="ยืนยันลบแคมเปญ"
        message={(() => {
          const target = ads.find(a => a.id === confirmDelete)
          return <><strong>{target?.campaign_name}</strong> ({target?.product_id}) จะถูกลบถาวร</>
        })()}
      />

      {/* ── ADD modal ──────────────────────────────────────────── */}
      <Modal open={showAdd} onClose={() => setShowAdd(false)} title="เพิ่มแคมเปญโฆษณาใหม่" width="max-w-2xl">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Field label="Product" required>
            <select value={addForm.product_id}
              onChange={e => setAddForm({ ...addForm, product_id: e.target.value, content_id: '' })}
              className={selectCls}>
              <option value="">เลือก Product</option>
              {products.map(p => <option key={p.product_id} value={p.product_id}>{p.product_id} — {p.name}</option>)}
            </select>
          </Field>
          <Field label="เดือน" hint="รูปแบบ YYYY-MM เช่น 2026-11" required>
            <input placeholder="2026-11" value={addForm.month} onChange={e => setAddForm({ ...addForm, month: e.target.value })} className={inputCls} />
          </Field>
          <div className="col-span-2">
            <Field label="ชื่อแคมเปญ" required>
              <input placeholder="ชื่อแคมเปญ" value={addForm.campaign_name} onChange={e => setAddForm({ ...addForm, campaign_name: e.target.value })} className={inputCls} />
            </Field>
          </div>
          <Field label="ช่องทาง">
            <select value={addForm.channel || defaultChannel}
              onChange={e => setAddForm({ ...addForm, channel: e.target.value })}
              className={selectCls}>
              {settingChannels.map(ch => <option key={ch} value={ch}>{ch}</option>)}
            </select>
          </Field>
          <Field label="งบที่อนุมัติ (฿)">
            <input type="number" placeholder="0" value={addForm.budget_approved} onChange={e => setAddForm({ ...addForm, budget_approved: e.target.value })} className={inputCls} />
          </Field>
          <Field label="งบจัดสรร (฿)">
            <input type="number" placeholder="0" value={addForm.budget_allocated} onChange={e => setAddForm({ ...addForm, budget_allocated: e.target.value })} className={inputCls} />
          </Field>
          <Field label="Content ที่ใช้" hint="เลือก content ที่โฆษณาชิ้นนี้ใช้ (สำหรับ ROI tracking)">
            <select value={addForm.content_id} onChange={e => setAddForm({ ...addForm, content_id: e.target.value })} className={selectCls}>
              <option value="">— ไม่ระบุ</option>
              {addFilteredContents.map(c => (
                <option key={c.id} value={c.id}>#{c.seq} {c.title}</option>
              ))}
            </select>
          </Field>
          <Field label="ผู้ดูแล">
            <ProfilePicker value={addForm.managed_by_id} profiles={profileOptions}
              onChange={(id, name) => setAddForm({ ...addForm, managed_by_id: id, managed_by: name })} placeholder="เลือกผู้ดูแล" />
          </Field>
          <Field label="วันเริ่มต้น">
            <input type="date" value={addForm.start_date} onChange={e => setAddForm({ ...addForm, start_date: e.target.value })} className={inputCls} />
          </Field>
          <Field label="วันสิ้นสุด">
            <input type="date" value={addForm.end_date} onChange={e => setAddForm({ ...addForm, end_date: e.target.value })} className={inputCls} />
          </Field>
          <div className="col-span-2">
            <Field label="หมายเหตุ">
              <input placeholder="หมายเหตุเพิ่มเติม" value={addForm.result_notes} onChange={e => setAddForm({ ...addForm, result_notes: e.target.value })} className={inputCls} />
            </Field>
          </div>
        </div>
        {addError && <p className="text-sm bg-red-50 text-red-600 border border-red-100 rounded-xl px-3.5 py-2.5 mt-4">{addError}</p>}
        <div className="flex gap-2 mt-6">
          <button onClick={saveAdd} disabled={saving || !addForm.product_id || !addForm.campaign_name || !addForm.month}
            className="flex-1 bg-indigo-600 text-white py-2.5 rounded-xl text-sm font-semibold disabled:opacity-40 hover:bg-indigo-500 transition-colors">
            {saving ? 'กำลังบันทึก...' : 'บันทึก'}
          </button>
          <button onClick={() => setShowAdd(false)} className="px-5 py-2.5 text-sm text-slate-500 rounded-xl hover:bg-slate-100 transition-colors">ยกเลิก</button>
        </div>
      </Modal>

      {/* ── EDIT / บันทึกผล modal ──────────────────────────────── */}
      <Modal open={!!editingRow} onClose={() => setEditingRow(null)} title={`แก้ไขแคมเปญ — ${editingRow?.campaign_name}`} width="max-w-2xl">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {/* ── ข้อมูลแคมเปญ ── */}
          <Field label="Product" required>
            <select value={editVal.product_id}
              onChange={e => setEditVal(v => ({ ...v, product_id: e.target.value, content_id: '' }))}
              className={selectCls}>
              <option value="">เลือก Product</option>
              {products.map(p => <option key={p.product_id} value={p.product_id}>{p.product_id} — {p.name}</option>)}
            </select>
          </Field>
          <Field label="เดือน" hint="รูปแบบ YYYY-MM เช่น 2026-11" required>
            <input placeholder="2026-11" value={editVal.month} onChange={e => setEditVal(v => ({ ...v, month: e.target.value }))} className={inputCls} />
          </Field>
          <div className="col-span-2">
            <Field label="ชื่อแคมเปญ" required>
              <input placeholder="ชื่อแคมเปญ" value={editVal.campaign_name} onChange={e => setEditVal(v => ({ ...v, campaign_name: e.target.value }))} className={inputCls} />
            </Field>
          </div>
          <Field label="ช่องทาง">
            <select value={editVal.channel || defaultChannel}
              onChange={e => setEditVal(v => ({ ...v, channel: e.target.value }))}
              className={selectCls}>
              {settingChannels.map(ch => <option key={ch} value={ch}>{ch}</option>)}
            </select>
          </Field>
          <Field label="Content ที่ใช้" hint="เลือก content เพื่อ track ROI">
            <select value={editVal.content_id} onChange={e => setEditVal(v => ({ ...v, content_id: e.target.value }))} className={selectCls}>
              <option value="">— ไม่ระบุ</option>
              {editFilteredContents.map(c => (
                <option key={c.id} value={c.id}>#{c.seq} {c.title}</option>
              ))}
            </select>
          </Field>
          <Field label="งบที่อนุมัติ (฿)">
            <input type="number" placeholder="0" value={editVal.budget_approved} onChange={e => setEditVal(v => ({ ...v, budget_approved: e.target.value }))} className={inputCls} />
          </Field>
          <Field label="ปรับงบเพิ่มเติม (฿)">
            <input type="number" placeholder="0" value={editVal.budget_adjustment} onChange={e => setEditVal(v => ({ ...v, budget_adjustment: e.target.value }))} className={inputCls} />
          </Field>
          <Field label="งบจัดสรร (฿)">
            <input type="number" placeholder="0" value={editVal.budget_allocated} onChange={e => setEditVal(v => ({ ...v, budget_allocated: e.target.value }))} className={inputCls} />
          </Field>
          <Field label="ผู้ดูแล">
            <ProfilePicker value={editVal.managed_by_id} profiles={profileOptions}
              onChange={(id, name) => setEditVal(v => ({ ...v, managed_by_id: id, managed_by: name }))} placeholder="เลือกผู้ดูแล" />
          </Field>
          <Field label="วันเริ่มต้น">
            <input type="date" value={editVal.start_date} onChange={e => setEditVal(v => ({ ...v, start_date: e.target.value }))} className={inputCls} />
          </Field>
          <Field label="วันสิ้นสุด">
            <input type="date" value={editVal.end_date} onChange={e => setEditVal(v => ({ ...v, end_date: e.target.value }))} className={inputCls} />
          </Field>

          {/* ── ผลลัพธ์ ── */}
          <div className="col-span-2 border-t border-slate-100 pt-4 mt-1">
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-3">ผลลัพธ์แคมเปญ</p>
          </div>
          <Field label="Reach (impressions)">
            <input type="number" value={editVal.reach} onChange={e => setEditVal(v => ({ ...v, reach: e.target.value }))} className={inputCls} />
          </Field>
          <Field label="Clicks">
            <input type="number" value={editVal.clicks} onChange={e => setEditVal(v => ({ ...v, clicks: e.target.value }))} className={inputCls} />
          </Field>
          <Field label="Leads">
            <input type="number" value={editVal.leads} onChange={e => setEditVal(v => ({ ...v, leads: e.target.value }))} className={inputCls} />
          </Field>
          <Field label="ใช้จ่ายจริง (฿)">
            <input type="number" value={editVal.budget_spent} onChange={e => setEditVal(v => ({ ...v, budget_spent: e.target.value }))} className={inputCls} />
          </Field>
          <Field label="ยอดขายที่ได้จากแคมเปญ (฿)">
            <input type="number" value={editVal.sales_amount} onChange={e => setEditVal(v => ({ ...v, sales_amount: e.target.value }))} className={inputCls} />
          </Field>
          <Field label="แผนถัดไป (Next Action)">
            <input placeholder="แผนการดำเนินงานถัดไป" value={editVal.next_action} onChange={e => setEditVal(v => ({ ...v, next_action: e.target.value }))} className={inputCls} />
          </Field>
          <div className="col-span-2">
            <Field label="หมายเหตุ">
              <input placeholder="หมายเหตุเพิ่มเติม" value={editVal.result_notes} onChange={e => setEditVal(v => ({ ...v, result_notes: e.target.value }))} className={inputCls} />
            </Field>
          </div>
          <div className="col-span-2 bg-slate-50 rounded-xl px-4 py-3 text-xs text-slate-500">
            CPL และ ROAS จะคำนวณอัตโนมัติหลังบันทึก
          </div>
        </div>
        {editError && <p className="text-sm bg-red-50 text-red-600 border border-red-100 rounded-xl px-3.5 py-2.5 mt-4">{editError}</p>}
        <div className="flex gap-2 mt-6">
          <button onClick={saveEdit} disabled={savingEdit || !editVal.product_id || !editVal.campaign_name || !editVal.month}
            className="flex-1 bg-indigo-600 text-white py-2.5 rounded-xl text-sm font-semibold disabled:opacity-40 hover:bg-indigo-500 transition-colors">
            {savingEdit ? 'กำลังบันทึก...' : 'บันทึกการแก้ไข'}
          </button>
          <button onClick={() => setEditingRow(null)} className="px-5 py-2.5 text-sm text-slate-500 rounded-xl hover:bg-slate-100 transition-colors">ยกเลิก</button>
        </div>
      </Modal>
      </>
      )}

      {/* ── Tab: ตั้งค่า ─────────────────────────────────────── */}
      {activeTab === 'settings' && <AdsSettingsPanel />}
    </div>
  )
}
