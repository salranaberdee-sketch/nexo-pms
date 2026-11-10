  'use client'

import React, { useEffect, useState, useMemo } from 'react'
import { useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase'
import { useCan, useProfile } from '@/lib/profile-context'
import ProfilePicker from './ProfilePicker'
import SearchInput from './SearchInput'
import { TableSkeleton, EmptyState, todayStr } from './TableState'
import StatusSelect from './StatusSelect'
import InlinePersonPicker, { type ProfileOption } from './InlinePersonPicker'
import { showToast } from './Toast'
import Modal, { Field, ConfirmModal } from './Modal'
import ContentAssets, { type ContentAsset } from './ContentAssets'
import { useSettings } from '@/lib/app-settings'
import { inputCls, selectCls, btnPrimary, btnSecondary, btnDanger, thCls, tdCls, tableWrapCls } from '@/lib/cx'

// ─── Types ────────────────────────────────────────────────────────────────────

const STATUSES = ['รอผลิต', 'ผลิตอยู่', 'รออนุมัติ', 'อนุมัติแล้ว', 'กำหนดโพสต์', 'โพสต์แล้ว']
const TYPES    = ['GRAPHIC', 'VIDEO', 'COPY']

const statusStyle: Record<string, string> = {
  'รอผลิต':       'bg-slate-100 text-slate-500',
  'ผลิตอยู่':      'bg-blue-50 text-blue-700',
  'รออนุมัติ':    'bg-amber-50 text-amber-700',
  'อนุมัติแล้ว':  'bg-purple-50 text-purple-700',
  'กำหนดโพสต์':  'bg-orange-50 text-orange-700',
  'โพสต์แล้ว':   'bg-emerald-50 text-emerald-700',
}

const typeStyle: Record<string, string> = {
  GRAPHIC: 'bg-blue-50 text-blue-600',
  VIDEO:   'bg-purple-50 text-purple-600',
  COPY:    'bg-orange-50 text-orange-600',
}
const typeLabel: Record<string, string> = { GRAPHIC: 'Graphic', VIDEO: 'Video', COPY: 'Copy' }

const DONE_STATUS = 'โพสต์แล้ว'
const TODAY = todayStr()
const TODAY_MS = new Date(TODAY).getTime()
const SOON_DAYS = 3

function IconChevron() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
      <polyline points="6 9 12 15 18 9"/>
    </svg>
  )
}

// ─── ContentAssetsPanel ───────────────────────────────────────────────────────

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

const EMPTY_ADD_FORM = {
  product_id: '', seq: '', type: 'GRAPHIC', title: '',
  objective: '', channel: '', hook: '', format_size: '',
  assigned_to: '', assigned_to_id: '',
  producer: '', producer_id: '',
  approver: '', approver_id: '',
  deadline: '', status: 'รอผลิต',
  production_cost: '',
  poster: '', poster_id: '',
  scheduled_post_date: '',
  issues: '',
}

const EMPTY_EDIT_FORM = {
  product_id: '', seq: '', type: 'GRAPHIC', title: '',
  objective: '', channel: '', hook: '', format_size: '',
  deadline: '',
  assigned_to: '', assigned_to_id: '',
  producer: '', producer_id: '',
  approver: '', approver_id: '',
  status: 'รอผลิต',
  production_cost: '',
  poster: '', poster_id: '',
  scheduled_post_date: '',
  actual_submit_date: '',
  approved_at: '',
  actual_post_date: '',
  post_link: '',
  file_link: '',
  issues: '',
}

export default function Contents() {
  const searchParams = useSearchParams()
  const initialProduct = searchParams.get('product') || 'all'
  const me = useProfile()

  const [contents, setContents]             = useState<any[]>([])
  const [products, setProducts]             = useState<any[]>([])
  const [profileOptions, setProfileOptions] = useState<ProfileOption[]>([])
  const [filterProduct, setFilterProduct]   = useState(initialProduct)
  const [filterStatus, setFilterStatus]     = useState('all')
  const [search, setSearch]                 = useState('')
  const [loading, setLoading]               = useState(true)
  const [loadError, setLoadError]           = useState('')

  // Add modal
  const [showAdd, setShowAdd]   = useState(false)
  const [addForm, setAddForm]   = useState({ ...EMPTY_ADD_FORM })
  const [saving, setSaving]     = useState(false)
  const [addError, setAddError] = useState('')

  // Edit modal
  const [editingRow, setEditingRow] = useState<any | null>(null)
  const [editForm, setEditForm]     = useState({ ...EMPTY_EDIT_FORM })
  const [savingEdit, setSavingEdit] = useState(false)
  const [editError, setEditError]   = useState('')

  // Delete confirm
  const [confirmDelete, setConfirmDelete] = useState<number | null>(null)
  const [deleting, setDeleting] = useState(false)

  const canInsert = useCan('insert', 'contents')
  const canUpdate = useCan('update', 'contents')
  const canDelete = useCan('delete', 'contents')
  const canManageAssets = useCan('insert', 'contents') // editor+ can add assets
  const supabase = createClient()
  const { channels: settingChannels, defaultChannel } = useSettings()

  // Expanded row state — shows assets panel
  const [expandedId, setExpandedId] = useState<number | null>(null)
  // Assets cache keyed by content_id (full list, loaded on expand)
  const [assetsMap, setAssetsMap] = useState<Record<number, ContentAsset[]>>({})
  // Asset counts pre-loaded on page load for badge display
  const [assetCounts, setAssetCounts] = useState<Record<number, number>>({})
  // Work-order counts pre-loaded for badge display
  const [workOrderCounts, setWorkOrderCounts] = useState<Record<number, number>>({})

  // Approvers = admin/manager only
  const approverOptions = useMemo(
    () => profileOptions.filter(p => p.role === 'admin' || p.role === 'manager'),
    [profileOptions],
  )

  async function load() {
    setLoadError('')
    const [c, p, pr] = await Promise.all([
      supabase
        .from('contents')
        .select('id, product_id, seq, type, title, objective, hook, format_size, assigned_to, assigned_to_id, producer, producer_id, approver, approver_id, deadline, status, production_cost, acknowledged_at, assigned_date, created_at, file_link, post_link, channel, actual_submit_date, approved_at, poster, poster_id, scheduled_post_date, actual_post_date, issues')
        .order('product_id').order('seq'),
      supabase.from('products').select('product_id, name, brand'),
      supabase.from('profiles').select('id, name, role, brand_access').eq('approval_status', 'approved').order('name'),
    ])
    if (c.error) { setLoadError(c.error.message); setLoading(false); return }

    // Pre-load asset counts for all content IDs in one query
    const contentIds = (c.data || []).map((row: any) => row.id)
    let assetCounts: Record<number, number> = {}
    // Work-order counts (📋) tracked separately for badge display
    let workOrderCounts: Record<number, number> = {}
    if (contentIds.length > 0) {
      const { data: countData } = await supabase
        .from('content_assets')
        .select('content_id, category')
        .in('content_id', contentIds)
      if (countData) {
        for (const row of countData) {
          assetCounts[row.content_id] = (assetCounts[row.content_id] || 0) + 1
          if (row.category === 'work_order') {
            workOrderCounts[row.content_id] = (workOrderCounts[row.content_id] || 0) + 1
          }
        }
      }
    }

    setContents(c.data || [])
    setProducts(p.data || [])
    setProfileOptions(pr.data || [])
    setAssetCounts(assetCounts)
    setWorkOrderCounts(workOrderCounts)
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  useEffect(() => {
    const p = searchParams.get('product')
    if (p) setFilterProduct(p)
  }, [searchParams])

  // Filter profiles by brand of selected product (if brand_access is populated)
  function getProfilesForProduct(product_id: string): ProfileOption[] {
    const product = products.find(p => p.product_id === product_id)
    if (!product?.brand) return profileOptions
    return profileOptions.filter(p =>
      p.role === 'admin' || p.role === 'manager' ||
      !p.brand_access?.length ||
      (p.brand_access as string[]).includes(product.brand),
    )
  }

  // ── Log assignment change ─────────────────────────────────────
  async function logAssignment(
    content_id: number,
    role: 'assigned_to' | 'producer' | 'approver',
    assigned_to_id: string | null,
    assigned_to_name: string,
  ) {
    if (!assigned_to_id) return
    await supabase.from('content_assignment_log').insert([{
      content_id,
      role,
      assigned_to_id,
      assigned_to_name,
      assigned_by_id: me.id,
      assigned_by_name: me.name,
    }])
  }

  // ── Assets ────────────────────────────────────────────────────
  async function loadAssets(contentId: number) {
    // Use undefined check — empty array [] is falsy-enough but we distinguish "not loaded" vs "loaded empty"
    if (assetsMap[contentId] !== undefined) return
    const { data, error } = await supabase
      .from('content_assets')
      .select('id, content_id, asset_type, category, label, url, storage_path, file_size, mime_type, sort_order, uploaded_by, created_at')
      .eq('content_id', contentId)
      .order('sort_order')
      .order('created_at')
    if (!error) {
      setAssetsMap(prev => ({ ...prev, [contentId]: (data || []) as ContentAsset[] }))
    }
  }

  function handleExpandRow(contentId: number) {
    if (expandedId === contentId) {
      setExpandedId(null)
    } else {
      setExpandedId(contentId)
      loadAssets(contentId)
    }
  }

  // ── Add ──────────────────────────────────────────────────────
  const suggestedSeq = useMemo(() => {
    if (!addForm.product_id) return 0
    const seqs = contents.filter(c => c.product_id === addForm.product_id).map(c => Number(c.seq) || 0)
    return seqs.length ? Math.max(0, ...seqs) + 1 : 1
  }, [addForm.product_id, contents])

  async function saveAdd() {
    setSaving(true); setAddError('')
    const { data: inserted, error: insErr } = await supabase.from('contents').insert([{
      product_id:      addForm.product_id,
      seq:             Number(addForm.seq) || suggestedSeq || 1,
      type:            addForm.type,
      title:           addForm.title,
      objective:       addForm.objective || null,
      channel:         addForm.channel || null,
      hook:            addForm.hook || null,
      format_size:     addForm.format_size || null,
      assigned_to:     addForm.assigned_to || null,
      assigned_to_id:  addForm.assigned_to_id || null,
      assigned_date:   addForm.assigned_to_id ? new Date().toISOString().split('T')[0] : null,
      producer:        addForm.producer || null,
      producer_id:     addForm.producer_id || null,
      approver:        addForm.approver || null,
      approver_id:     addForm.approver_id || null,
      deadline:        addForm.deadline || null,
      status:          addForm.status,
      production_cost: Number(addForm.production_cost) || 0,
      scheduled_post_date: addForm.scheduled_post_date || null,
      issues:          addForm.issues || null,
    }]).select('id').single()
    if (insErr) { setAddError(insErr.message); setSaving(false); return }
    // Log assignments
    if (inserted?.id) {
      const logs = []
      if (addForm.assigned_to_id) logs.push(logAssignment(inserted.id, 'assigned_to', addForm.assigned_to_id, addForm.assigned_to))
      if (addForm.producer_id)    logs.push(logAssignment(inserted.id, 'producer', addForm.producer_id, addForm.producer))
      if (addForm.approver_id)    logs.push(logAssignment(inserted.id, 'approver', addForm.approver_id, addForm.approver))
      await Promise.all(logs)
    }
    setShowAdd(false)
    setAddForm({ ...EMPTY_ADD_FORM })
    await load()
    setSaving(false)
    showToast('เพิ่ม Content แล้ว')
  }

  // ── Edit ─────────────────────────────────────────────────────
  function openEdit(c: any) {
    setEditingRow(c)
    setEditForm({
      product_id:     c.product_id || '',
      seq:            String(c.seq ?? ''),
      type:           c.type || 'GRAPHIC',
      title:          c.title || '',
      objective:      c.objective || '',
      channel:        c.channel || '',
      hook:           c.hook || '',
      format_size:    c.format_size || '',
      deadline:       c.deadline || '',
      assigned_to:    c.assigned_to || '',
      assigned_to_id: c.assigned_to_id || '',
      producer:       c.producer || '',
      producer_id:    c.producer_id || '',
      approver:       c.approver || '',
      approver_id:    c.approver_id || '',
      status:         c.status || 'รอผลิต',
      production_cost: String(c.production_cost ?? 0),
      poster:         c.poster || '',
      poster_id:      c.poster_id || '',
      scheduled_post_date: c.scheduled_post_date || '',
      actual_submit_date:  c.actual_submit_date || '',
      approved_at:    c.approved_at || '',
      actual_post_date:    c.actual_post_date || '',
      post_link:      c.post_link || '',
      file_link:      c.file_link || '',
      issues:         c.issues || '',
    })
    setEditError('')
  }

  async function saveEdit() {
    if (!editingRow) return
    setSavingEdit(true); setEditError('')

    const prevProducerId  = editingRow.producer_id
    const prevApproverId  = editingRow.approver_id
    const prevAssigneeId  = editingRow.assigned_to_id

    // Reset acknowledged_at when producer changes
    const producerChanged  = editForm.producer_id !== (prevProducerId || '')
    const assigneeChanged  = editForm.assigned_to_id !== (prevAssigneeId || '')

    const { error: updErr } = await supabase.from('contents').update({
      product_id:     editForm.product_id,
      seq:            Number(editForm.seq) || editingRow.seq,
      type:           editForm.type,
      title:          editForm.title,
      objective:      editForm.objective || null,
      channel:        editForm.channel || null,
      hook:           editForm.hook || null,
      format_size:    editForm.format_size || null,
      deadline:       editForm.deadline || null,
      assigned_to:    editForm.assigned_to || null,
      assigned_to_id: editForm.assigned_to_id || null,
      assigned_date:  assigneeChanged && editForm.assigned_to_id ? new Date().toISOString().split('T')[0] : editingRow.assigned_date,
      producer:       editForm.producer || null,
      producer_id:    editForm.producer_id || null,
      approver:       editForm.approver || null,
      approver_id:    editForm.approver_id || null,
      status:         editForm.status,
      production_cost: Number(editForm.production_cost) || 0,
      poster:         editForm.poster || null,
      poster_id:      editForm.poster_id || null,
      scheduled_post_date: editForm.scheduled_post_date || null,
      actual_submit_date:  editForm.actual_submit_date || null,
      approved_at:    editForm.approved_at || null,
      actual_post_date:    editForm.actual_post_date || null,
      post_link:      editForm.post_link || null,
      file_link:      editForm.file_link || null,
      issues:         editForm.issues || null,
      // Clear acknowledgement when producer reassigned (new person hasn't seen it yet)
      ...(producerChanged ? { acknowledged_at: null, acknowledged_by: null } : {}),
    }).eq('id', editingRow.id)

    setSavingEdit(false)
    if (updErr) { setEditError(updErr.message); showToast(updErr.message, 'error'); return }

    // Log assignment changes
    const logs = []
    if (assigneeChanged && editForm.assigned_to_id)
      logs.push(logAssignment(editingRow.id, 'assigned_to', editForm.assigned_to_id, editForm.assigned_to))
    if (producerChanged && editForm.producer_id)
      logs.push(logAssignment(editingRow.id, 'producer', editForm.producer_id, editForm.producer))
    if (editForm.approver_id !== (prevApproverId || '') && editForm.approver_id)
      logs.push(logAssignment(editingRow.id, 'approver', editForm.approver_id, editForm.approver))
    await Promise.all(logs)

    setContents(prev => prev.map(c => c.id === editingRow.id ? {
      ...c, ...editForm,
      seq: Number(editForm.seq) || editingRow.seq,
      production_cost: Number(editForm.production_cost) || 0,
      ...(producerChanged ? { acknowledged_at: null } : {}),
    } : c))
    setEditingRow(null)
    showToast('บันทึกแล้ว')
  }

  // ── Delete ────────────────────────────────────────────────────
  async function deleteRow(id: number) {
    setDeleting(true)
    const { error: delErr } = await supabase.from('contents').delete().eq('id', id)
    setDeleting(false)
    if (delErr) { showToast(delErr.message, 'error'); return }
    setConfirmDelete(null)
    setContents(prev => prev.filter(c => c.id !== id))
    showToast('ลบ Content แล้ว')
  }

  // ── Status / assignee — quick inline updates ─────────────────
  async function updateStatus(id: number, status: string) {
    const old = contents.find(c => c.id === id)?.status
    setContents(prev => prev.map(c => c.id === id ? { ...c, status } : c))
    const { error: updErr } = await supabase.from('contents').update({ status }).eq('id', id)
    if (updErr) {
      setContents(prev => prev.map(c => c.id === id ? { ...c, status: old } : c))
      showToast(updErr.message, 'error')
    }
  }

  async function updateAssignee(id: number, assigned_to_id: string, assigned_to: string) {
    const old = contents.find(c => c.id === id)
    const prevId = old?.assigned_to_id || ''
    setContents(prev => prev.map(c => c.id === id ? { ...c, assigned_to_id, assigned_to } : c))
    const { error: updErr } = await supabase.from('contents').update({
      assigned_to_id: assigned_to_id || null,
      assigned_to,
      assigned_date: assigned_to_id ? new Date().toISOString().split('T')[0] : null,
    }).eq('id', id)
    if (updErr) {
      showToast(updErr.message, 'error')
      setContents(prev => prev.map(c => c.id === id ? { ...c, assigned_to_id: old?.assigned_to_id, assigned_to: old?.assigned_to } : c))
    } else if (assigned_to_id && assigned_to_id !== prevId) {
      await logAssignment(id, 'assigned_to', assigned_to_id, assigned_to)
    }
  }

  // ── Filters ──────────────────────────────────────────────────
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo]     = useState('')

  const filtered = useMemo(() => contents.filter(c =>
    (filterProduct === 'all' || c.product_id === filterProduct) &&
    (filterStatus === 'all' || c.status === filterStatus) &&
    (!dateFrom || (c.created_at && c.created_at >= dateFrom)) &&
    (!dateTo   || (c.created_at && c.created_at <= dateTo + 'T23:59:59')) &&
    (search === '' || (() => {
      const q = search.toLowerCase()
      return (c.title || '').toLowerCase().includes(q)
        || (c.hook || '').toLowerCase().includes(q)
        || (c.product_id || '').toLowerCase().includes(q)
        || (c.assigned_to || '').toLowerCase().includes(q)
        || (c.producer || '').toLowerCase().includes(q)
        || (c.objective || '').toLowerCase().includes(q)
    })()),
  ), [contents, filterProduct, filterStatus, search, dateFrom, dateTo])

  const countByStatus = useMemo(
    () => STATUSES.reduce((acc, s) => ({ ...acc, [s]: contents.filter(c => c.status === s).length }), {} as Record<string, number>),
    [contents],
  )

  const hasFilters = filterProduct !== 'all' || filterStatus !== 'all' || search !== '' || !!dateFrom || !!dateTo

  // Pagination — reset when filters change
  const [visibleCount, setVisibleCount] = useState(10)
  useEffect(() => { setVisibleCount(10) }, [filterProduct, filterStatus, search, dateFrom, dateTo])

  return (
    <div className="p-6 space-y-5">

      {/* ── Page header ───────────────────────────────────────── */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-slate-900">Content</h1>
          <p className="text-sm text-slate-400 mt-0.5">ติดตามสถานะการผลิต Content ทุกชิ้น</p>
        </div>
        {canInsert && (
          <button onClick={() => { setAddForm({ ...EMPTY_ADD_FORM }); setAddError(''); setShowAdd(true) }}
            className={btnPrimary}>
            <IconPlus />เพิ่ม Content
          </button>
        )}
      </div>

      {loadError && (
        <div className="bg-red-50 border border-red-100 rounded-2xl px-4 py-3 text-sm text-red-600 flex items-center gap-3">
          <span className="flex-1">โหลดข้อมูลไม่สำเร็จ: {loadError}</span>
          <button onClick={load} className="text-red-600 underline underline-offset-2 hover:no-underline shrink-0">ลองใหม่</button>
        </div>
      )}

      {/* ── Status filter pills ───────────────────────────────── */}
      <div className="flex gap-2 flex-wrap">
        <button onClick={() => setFilterStatus('all')}
          className={filterStatus === 'all'
            ? 'px-3.5 py-1.5 rounded-lg text-sm font-medium border bg-indigo-600 text-white border-indigo-600 transition-colors'
            : 'px-3.5 py-1.5 rounded-lg text-sm font-medium border bg-white border-slate-200 text-slate-500 hover:bg-slate-50 hover:border-slate-300 transition-colors'}>
          ทั้งหมด <span className="ml-1 opacity-60 tabular-nums">{contents.length}</span>
        </button>
        {STATUSES.map(s => (
          <button key={s} onClick={() => setFilterStatus(filterStatus === s ? 'all' : s)}
            className={`px-3.5 py-1.5 rounded-lg text-sm font-medium border transition-colors
              ${filterStatus === s
                ? (statusStyle[s] || '') + ' border-current/20'
                : 'bg-white border-slate-200 text-slate-500 hover:bg-slate-50 hover:border-slate-300'}`}>
            {s} <span className="ml-1 tabular-nums opacity-60">{countByStatus[s] || 0}</span>
          </button>
        ))}
      </div>

      {/* ── Search + filters ──────────────────────────────────── */}
      <div className="flex gap-2 flex-wrap items-center">
        <SearchInput value={search} onChange={setSearch} placeholder="ค้นหาชื่อ, Hook, Product, ผู้รับผิดชอบ..." />
        <select value={filterProduct} onChange={e => setFilterProduct(e.target.value)}
          className="border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white text-slate-700">
          <option value="all">ทุก Product</option>
          {products.map(p => <option key={p.product_id} value={p.product_id}>{p.product_id} — {p.name}</option>)}
        </select>
        <div className="flex items-center gap-1.5 shrink-0">
          <span className="text-xs text-slate-400 whitespace-nowrap">จาก</span>
          <input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)}
            className="border border-slate-200 rounded-xl px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white text-slate-700" />
          <span className="text-xs text-slate-400">ถึง</span>
          <input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)}
            className="border border-slate-200 rounded-xl px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white text-slate-700" />
        </div>
        {hasFilters && (
          <button onClick={() => { setFilterProduct('all'); setFilterStatus('all'); setSearch(''); setDateFrom(''); setDateTo('') }}
            className="text-sm text-slate-400 hover:text-slate-700 px-3 py-1.5 rounded-xl hover:bg-slate-100 transition-colors whitespace-nowrap border border-transparent hover:border-slate-200">
            ล้างตัวกรอง ✕
          </button>
        )}
      </div>

      {/* ── Table ─────────────────────────────────────────────── */}
      <div className={tableWrapCls}>
        <div className="px-4 py-3 border-b border-slate-100 flex items-center justify-between">
          <span className="text-sm text-slate-400 tabular-nums">{filtered.length} / {contents.length} รายการ</span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-slate-50/60 border-b border-slate-100">
                <th className={thCls}></th>
                <th className={thCls}>#</th>
                <th className={thCls}>Product</th>
                <th className={thCls}>ประเภท</th>
                <th className={thCls}>ชื่อ Content</th>
                <th className={thCls}>ช่องทาง</th>
                <th className={thCls}>ผู้รับผิดชอบ</th>
                <th className={thCls}>ผู้อนุมัติ</th>
                <th className={thCls}>ต้นทุน</th>
                <th className={thCls}>กำหนดส่ง</th>
                <th className={thCls}>สถานะ</th>
                <th className={thCls}>โพสต์</th>
                <th className={thCls}></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100/60">
              {loading ? (
                <TableSkeleton cols={13} />
              ) : filtered.length === 0 ? (
                <EmptyState message="ไม่พบ Content ที่ตรงเงื่อนไข" />
              ) : filtered.slice(0, visibleCount).map(c => {
                const overdue = c.deadline && c.deadline < TODAY && c.status !== DONE_STATUS
                const daysUntil = c.deadline && c.status !== DONE_STATUS
                  ? Math.round((new Date(c.deadline).getTime() - TODAY_MS) / 86400000) : null
                const soon = !overdue && daysUntil !== null && daysUntil >= 0 && daysUntil <= SOON_DAYS
                const daysLate = overdue ? Math.round((TODAY_MS - new Date(c.deadline).getTime()) / 86400000) : 0
                const rowBg = overdue ? 'bg-red-50/40' : soon ? 'bg-amber-50/40' : ''
                const isNew = !c.acknowledged_at && (
                  c.producer_id === me.id || c.assigned_to_id === me.id
                ) && c.status !== DONE_STATUS
                const isExpanded = expandedId === c.id
                const assets = assetsMap[c.id] || []
                const assetCount = assetsMap[c.id] !== undefined ? assets.length : (assetCounts[c.id] || 0)
                const workOrderCount = assetsMap[c.id] !== undefined
                  ? assets.filter(a => a.category === 'work_order').length
                  : (workOrderCounts[c.id] || 0)
                const deliverableCount = assetCount - workOrderCount

                return (
                  <React.Fragment key={c.id}>
                    <tr className={`transition-colors ${rowBg} ${isExpanded ? 'bg-indigo-50/30' : 'hover:bg-slate-50/60'}`}>
                      {/* Expand */}
                      <td className="px-3 py-3.5 w-8">
                        <button onClick={() => handleExpandRow(c.id)}
                          title={isExpanded ? 'ซ่อนรายละเอียด' : 'ดูรายละเอียด / assets'}
                          className={`w-7 h-7 flex items-center justify-center rounded-lg transition-all text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 ${isExpanded ? 'bg-indigo-100 text-indigo-600 rotate-180' : ''}`}>
                          <IconChevron />
                        </button>
                      </td>
                      <td className={`${tdCls} text-sm text-slate-400 tabular-nums font-medium`}>{c.seq}</td>
                      <td className={tdCls}>
                        <span className="font-mono text-xs font-medium bg-slate-100 text-slate-600 px-2 py-1 rounded-md">{c.product_id}</span>
                      </td>
                      <td className={tdCls}>
                        <span className={`text-xs font-semibold px-2 py-0.5 rounded-md ${typeStyle[c.type] || 'bg-slate-100 text-slate-500'}`}>
                          {typeLabel[c.type] || c.type}
                        </span>
                      </td>
                      <td className={`${tdCls} max-w-[220px]`}>
                        <div className="flex items-center gap-1.5">
                          {isNew && <span className="shrink-0 text-[10px] font-bold bg-indigo-500 text-white px-1.5 py-0.5 rounded-full">ใหม่</span>}
                          <span className="font-semibold text-slate-900 truncate block" title={c.title}>{c.title}</span>
                        </div>
                        {c.objective && <span className="text-xs text-slate-400 truncate block mt-0.5" title={c.objective}>{c.objective}</span>}
                        {c.producer && <span className="text-xs text-blue-500 mt-0.5 block">ผู้ผลิต: {c.producer}</span>}
                        {assetCount > 0 && (
                          <div className="flex items-center gap-1 mt-1 flex-wrap">
                            {workOrderCount > 0 && (
                              <span className="inline-flex items-center gap-0.5 text-[10px] font-semibold text-amber-700 bg-amber-50 border border-amber-100 px-1.5 py-0.5 rounded-full">
                                📋 {workOrderCount}
                              </span>
                            )}
                            {deliverableCount > 0 && (
                              <span className="inline-flex items-center gap-0.5 text-[10px] font-semibold text-indigo-700 bg-indigo-50 border border-indigo-100 px-1.5 py-0.5 rounded-full">
                                ✅ {deliverableCount}
                              </span>
                            )}
                          </div>
                        )}
                      </td>
                      <td className={`${tdCls} text-xs text-slate-500 whitespace-nowrap`}>
                        {c.channel
                          ? <span className="bg-slate-100 text-slate-600 px-2 py-0.5 rounded-md">{c.channel}</span>
                          : <span className="text-slate-300">—</span>}
                      </td>
                      <td className={`${tdCls} whitespace-nowrap`}>
                        <InlinePersonPicker value={c.assigned_to_id || ''} display={c.assigned_to || ''}
                          profiles={profileOptions} disabled={!canUpdate}
                          onChange={(id, name) => updateAssignee(c.id, id, name)} />
                      </td>
                      <td className={`${tdCls} text-xs text-slate-500`}>
                        {c.approver
                          ? <span className="bg-purple-50 text-purple-700 px-2 py-0.5 rounded-md font-medium">{c.approver}</span>
                          : <span className="text-slate-300">—</span>}
                      </td>
                      <td className={`${tdCls} text-sm tabular-nums text-slate-500 whitespace-nowrap`}>
                        {Number(c.production_cost) > 0
                          ? <span>฿{Number(c.production_cost).toLocaleString()}</span>
                          : <span className="text-slate-300">—</span>}
                      </td>
                      <td className={`${tdCls} whitespace-nowrap`}>
                        {c.deadline ? (
                          <div className="flex flex-col">
                            <span className={`text-sm ${overdue ? 'text-red-600 font-semibold' : soon ? 'text-amber-600 font-medium' : 'text-slate-500'}`}>
                              {new Date(c.deadline).toLocaleDateString('th-TH', { day: '2-digit', month: 'short' })}
                            </span>
                            {overdue && <span className="text-xs text-red-500 font-medium">เลย {daysLate} วัน</span>}
                            {soon && <span className="text-xs text-amber-500 font-medium">อีก {daysUntil} วัน</span>}
                          </div>
                        ) : <span className="text-sm text-slate-300">—</span>}
                      </td>
                      <td className={tdCls}>
                        <StatusSelect value={c.status} options={STATUSES} styleMap={statusStyle}
                          disabled={!canUpdate} onChange={v => updateStatus(c.id, v)} />
                      </td>
                      <td className={`${tdCls} whitespace-nowrap`}>
                        {c.actual_post_date ? (
                          <div className="flex flex-col gap-0.5">
                            <span className="text-xs text-emerald-600 font-medium">
                              {new Date(c.actual_post_date).toLocaleDateString('th-TH', { day: '2-digit', month: 'short' })}
                            </span>
                            {c.post_link && (
                              <a href={c.post_link} target="_blank" rel="noreferrer"
                                className="text-[10px] text-indigo-500 hover:text-indigo-700 truncate max-w-[100px] block">
                                ดูโพสต์ →
                              </a>
                            )}
                          </div>
                        ) : c.scheduled_post_date ? (
                          <span className="text-xs text-orange-500">
                            ⏰ {new Date(c.scheduled_post_date).toLocaleDateString('th-TH', { day: '2-digit', month: 'short' })}
                          </span>
                        ) : <span className="text-slate-300 text-xs">—</span>}
                      </td>
                      <td className={`${tdCls} whitespace-nowrap`}>
                        <div className="flex items-center gap-1">
                          {canUpdate && (
                            <button onClick={() => openEdit(c)} title="แก้ไข" className={btnSecondary}>
                              <IconPencil />แก้ไข
                            </button>
                          )}
                          {canDelete && (
                            <button onClick={() => setConfirmDelete(c.id)} title="ลบ" className={btnDanger}>
                              <IconTrash />
                            </button>
                          )}
                          {!canUpdate && !canDelete && <span className="text-xs text-slate-300">—</span>}
                        </div>
                      </td>
                    </tr>
                    {/* Assets panel — expanded row */}
                    {isExpanded && (
                      <tr className="bg-slate-50/60">
                        <td colSpan={13} className="px-6 pb-5 pt-3">
                          <ContentAssets
                            contentId={c.id}
                            assets={assetsMap[c.id] || []}
                            canWrite={canManageAssets}
                            canDelete={me.role === 'admin' || me.role === 'manager'}
                            onAssetsChange={updated => {
                              setAssetsMap(prev => ({ ...prev, [c.id]: updated }))
                              setAssetCounts(prev => ({ ...prev, [c.id]: updated.length }))
                              setWorkOrderCounts(prev => ({
                                ...prev,
                                [c.id]: updated.filter(a => a.category === 'work_order').length,
                              }))
                            }}
                          />
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
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
      </div>

      {/* ── DELETE confirm ─────────────────────────────────────── */}
      <ConfirmModal
        open={confirmDelete !== null}
        onClose={() => setConfirmDelete(null)}
        onConfirm={() => deleteRow(confirmDelete!)}
        loading={deleting}
        title="ยืนยันลบ Content"
        message={(() => {
          const target = contents.find(c => c.id === confirmDelete)
          return <><strong>{target?.title}</strong> ({target?.product_id} #{target?.seq}) จะถูกลบถาวร</>
        })()}
      />

      {/* ── ADD modal ──────────────────────────────────────────── */}
      <Modal open={showAdd} onClose={() => setShowAdd(false)} title="เพิ่ม Content ใหม่" width="max-w-2xl">
        <div className="grid grid-cols-2 gap-4">
          <Field label="Product" required>
            <select value={addForm.product_id}
              onChange={e => setAddForm(f => ({ ...f, product_id: e.target.value }))}
              className={selectCls}>
              <option value="">เลือก Product</option>
              {products.map(p => <option key={p.product_id} value={p.product_id}>{p.product_id} — {p.name}</option>)}
            </select>
          </Field>
          <Field label="ลำดับชิ้น (seq)" hint={addForm.product_id && suggestedSeq > 0 ? `แนะนำ: ${suggestedSeq}` : undefined}>
            <div className="flex gap-2">
              <input type="number" placeholder={String(suggestedSeq || 1)} value={addForm.seq}
                onChange={e => setAddForm({ ...addForm, seq: e.target.value })} className={inputCls} />
              {suggestedSeq > 0 && addForm.seq === '' && (
                <button type="button" onClick={() => setAddForm({ ...addForm, seq: String(suggestedSeq) })}
                  className="shrink-0 text-xs text-indigo-600 bg-indigo-50 px-3 py-2 rounded-xl hover:bg-indigo-100">
                  ใช้ {suggestedSeq}
                </button>
              )}
            </div>
          </Field>
          <Field label="ประเภท" required>
            <select value={addForm.type} onChange={e => setAddForm({ ...addForm, type: e.target.value })} className={selectCls}>
              {TYPES.map(t => <option key={t}>{t}</option>)}
            </select>
          </Field>
          <Field label="ชื่อ Content" required>
            <input placeholder="ชื่อ Content" value={addForm.title}
              onChange={e => setAddForm({ ...addForm, title: e.target.value })} className={inputCls} />
          </Field>
          <Field label="วัตถุประสงค์">
            <input placeholder="Awareness / Conversion / ฯลฯ" value={addForm.objective}
              onChange={e => setAddForm({ ...addForm, objective: e.target.value })} className={inputCls} />
          </Field>
          <Field label="ช่องทาง">
            <select value={addForm.channel || defaultChannel}
              onChange={e => setAddForm({ ...addForm, channel: e.target.value })}
              className={selectCls}>
              {settingChannels.map(ch => <option key={ch} value={ch}>{ch}</option>)}
            </select>
          </Field>
          <Field label="Hook">
            <input placeholder="Hook ของ Content" value={addForm.hook}
              onChange={e => setAddForm({ ...addForm, hook: e.target.value })} className={inputCls} />
          </Field>
          <Field label="Format / ขนาด">
            <input placeholder="เช่น 1:1 1080x1080" value={addForm.format_size}
              onChange={e => setAddForm({ ...addForm, format_size: e.target.value })} className={inputCls} />
          </Field>

          {/* Assignment section */}
          <Field label="ผู้รับผิดชอบ (assigned to)">
            <ProfilePicker value={addForm.assigned_to_id}
              profiles={getProfilesForProduct(addForm.product_id)}
              onChange={(id, name) => setAddForm({ ...addForm, assigned_to_id: id, assigned_to: name })}
              placeholder="เลือกผู้รับผิดชอบ" />
          </Field>
          <Field label="กำหนดส่ง">
            <input type="date" value={addForm.deadline}
              onChange={e => setAddForm({ ...addForm, deadline: e.target.value })} className={inputCls} />
          </Field>
          <Field label="ผู้ผลิต (producer)">
            <ProfilePicker value={addForm.producer_id}
              profiles={getProfilesForProduct(addForm.product_id)}
              onChange={(id, name) => setAddForm({ ...addForm, producer_id: id, producer: name })}
              placeholder="เลือกผู้ผลิต" />
          </Field>
          <Field label="ผู้อนุมัติ (approver)" hint="admin / manager เท่านั้น">
            <ProfilePicker value={addForm.approver_id}
              profiles={approverOptions}
              onChange={(id, name) => setAddForm({ ...addForm, approver_id: id, approver: name })}
              placeholder="เลือกผู้อนุมัติ" />
          </Field>
          <Field label="สถานะ">
            <select value={addForm.status} onChange={e => setAddForm({ ...addForm, status: e.target.value })} className={selectCls}>
              {STATUSES.map(s => <option key={s}>{s}</option>)}
            </select>
          </Field>
          <Field label="ต้นทุนผลิต (฿)" hint="ค่าจ้างผู้ผลิต / ค่าตัดต่อ / ฯลฯ">
            <input type="number" min="0" placeholder="0"
              value={addForm.production_cost}
              onChange={e => setAddForm({ ...addForm, production_cost: e.target.value })}
              className={inputCls} />
          </Field>
          <Field label="กำหนดโพสต์">
            <input type="date" value={addForm.scheduled_post_date}
              onChange={e => setAddForm({ ...addForm, scheduled_post_date: e.target.value })} className={inputCls} />
          </Field>
          <div className="col-span-2">
            <Field label="ปัญหา / ติดขัด">
              <input placeholder="บันทึกปัญหาหรือสิ่งที่ติดขัด (ถ้ามี)"
                value={addForm.issues}
                onChange={e => setAddForm({ ...addForm, issues: e.target.value })}
                className={inputCls} />
            </Field>
          </div>
        </div>
        {addError && <p className="text-sm bg-red-50 text-red-600 border border-red-100 rounded-xl px-3.5 py-2.5 mt-4">{addError}</p>}
        <div className="flex gap-2 mt-6">
          <button onClick={saveAdd} disabled={saving || !addForm.product_id || !addForm.title}
            className="flex-1 bg-indigo-600 text-white py-2.5 rounded-xl text-sm font-semibold disabled:opacity-40 hover:bg-indigo-500 transition-colors">
            {saving ? 'กำลังบันทึก...' : 'บันทึก'}
          </button>
          <button onClick={() => setShowAdd(false)}
            className="px-5 py-2.5 text-sm text-slate-500 rounded-xl hover:bg-slate-100 transition-colors">
            ยกเลิก
          </button>
        </div>
      </Modal>

      {/* ── EDIT modal ─────────────────────────────────────────── */}
      <Modal open={!!editingRow} onClose={() => setEditingRow(null)} title={`แก้ไข Content — ${editingRow?.product_id} #${editingRow?.seq}`} width="max-w-2xl">
        <div className="grid grid-cols-2 gap-4">
          <Field label="Product" required>
            <select value={editForm.product_id} onChange={e => setEditForm(f => ({ ...f, product_id: e.target.value }))} className={selectCls}>
              <option value="">เลือก Product</option>
              {products.map(p => <option key={p.product_id} value={p.product_id}>{p.product_id} — {p.name}</option>)}
            </select>
          </Field>
          <Field label="ลำดับชิ้น (seq)">
            <input type="number" value={editForm.seq} onChange={e => setEditForm(f => ({ ...f, seq: e.target.value }))} className={inputCls} />
          </Field>
          <Field label="ประเภท" required>
            <select value={editForm.type} onChange={e => setEditForm(f => ({ ...f, type: e.target.value }))} className={selectCls}>
              {TYPES.map(t => <option key={t}>{t}</option>)}
            </select>
          </Field>
          <Field label="ช่องทาง">
            <select value={editForm.channel}
              onChange={e => setEditForm(f => ({ ...f, channel: e.target.value }))}
              className={selectCls}>
              {settingChannels.map(ch => <option key={ch} value={ch}>{ch}</option>)}
            </select>
          </Field>
          <div className="col-span-2">
            <Field label="ชื่อ Content" required>
              <input value={editForm.title} onChange={e => setEditForm(f => ({ ...f, title: e.target.value }))} className={inputCls} />
            </Field>
          </div>
          <Field label="วัตถุประสงค์">
            <input value={editForm.objective} onChange={e => setEditForm(f => ({ ...f, objective: e.target.value }))} className={inputCls} />
          </Field>
          <Field label="Hook">
            <input value={editForm.hook} onChange={e => setEditForm(f => ({ ...f, hook: e.target.value }))} className={inputCls} />
          </Field>
          <Field label="Format / ขนาด">
            <input value={editForm.format_size} onChange={e => setEditForm(f => ({ ...f, format_size: e.target.value }))} className={inputCls} />
          </Field>
          <Field label="กำหนดส่ง">
            <input type="date" value={editForm.deadline} onChange={e => setEditForm(f => ({ ...f, deadline: e.target.value }))} className={inputCls} />
          </Field>

          {/* Assignment section */}
          <Field label="ผู้รับผิดชอบ">
            <ProfilePicker value={editForm.assigned_to_id}
              profiles={getProfilesForProduct(editForm.product_id)}
              onChange={(id, name) => setEditForm(f => ({ ...f, assigned_to_id: id, assigned_to: name }))}
              placeholder="เลือกผู้รับผิดชอบ" />
          </Field>
          <Field label="ผู้ผลิต (producer)">
            <ProfilePicker value={editForm.producer_id}
              profiles={getProfilesForProduct(editForm.product_id)}
              onChange={(id, name) => setEditForm(f => ({ ...f, producer_id: id, producer: name }))}
              placeholder="เลือกผู้ผลิต" />
          </Field>
          <Field label="ผู้อนุมัติ (approver)" hint="admin / manager เท่านั้น">
            <ProfilePicker value={editForm.approver_id}
              profiles={approverOptions}
              onChange={(id, name) => setEditForm(f => ({ ...f, approver_id: id, approver: name }))}
              placeholder="เลือกผู้อนุมัติ" />
          </Field>
          <Field label="สถานะ">
            <select value={editForm.status} onChange={e => setEditForm(f => ({ ...f, status: e.target.value }))} className={selectCls}>
              {STATUSES.map(s => <option key={s}>{s}</option>)}
            </select>
          </Field>
          <Field label="ต้นทุนผลิต (฿)" hint="ค่าจ้างผู้ผลิต / ค่าตัดต่อ / ฯลฯ">
            <input type="number" min="0" placeholder="0"
              value={editForm.production_cost}
              onChange={e => setEditForm(f => ({ ...f, production_cost: e.target.value }))}
              className={inputCls} />
          </Field>

          {/* ── Post-production tracking ── */}
          <div className="col-span-2 border-t border-slate-100 pt-4 mt-1">
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-3">ติดตามหลังผลิต</p>
          </div>
          <Field label="วันส่งจริง">
            <input type="date" value={editForm.actual_submit_date}
              onChange={e => setEditForm(f => ({ ...f, actual_submit_date: e.target.value }))} className={inputCls} />
          </Field>
          <Field label="วันที่อนุมัติ">
            <input type="date" value={editForm.approved_at}
              onChange={e => setEditForm(f => ({ ...f, approved_at: e.target.value }))} className={inputCls} />
          </Field>
          <Field label="ผู้โพสต์">
            <ProfilePicker value={editForm.poster_id}
              profiles={profileOptions}
              onChange={(id, name) => setEditForm(f => ({ ...f, poster_id: id, poster: name }))}
              placeholder="เลือกผู้โพสต์" />
          </Field>
          <Field label="กำหนดโพสต์">
            <input type="date" value={editForm.scheduled_post_date}
              onChange={e => setEditForm(f => ({ ...f, scheduled_post_date: e.target.value }))} className={inputCls} />
          </Field>
          <Field label="วันโพสต์จริง">
            <input type="date" value={editForm.actual_post_date}
              onChange={e => setEditForm(f => ({ ...f, actual_post_date: e.target.value }))} className={inputCls} />
          </Field>
          <Field label="ลิงก์ไฟล์งาน">
            <input placeholder="https://..." value={editForm.file_link}
              onChange={e => setEditForm(f => ({ ...f, file_link: e.target.value }))} className={inputCls} />
          </Field>
          <div className="col-span-2">
            <Field label="ลิงก์โพสต์จริง">
              <input placeholder="https://..." value={editForm.post_link}
                onChange={e => setEditForm(f => ({ ...f, post_link: e.target.value }))} className={inputCls} />
            </Field>
          </div>
          <div className="col-span-2">
            <Field label="ปัญหา / ติดขัด">
              <textarea rows={2} placeholder="บันทึกปัญหาหรือสิ่งที่ติดขัด"
                value={editForm.issues}
                onChange={e => setEditForm(f => ({ ...f, issues: e.target.value }))}
                className={inputCls + ' resize-none'} />
            </Field>
          </div>
        </div>
        {editError && <p className="text-sm bg-red-50 text-red-600 border border-red-100 rounded-xl px-3.5 py-2.5 mt-4">{editError}</p>}
        <div className="flex gap-2 mt-6">
          <button onClick={saveEdit} disabled={savingEdit || !editForm.title || !editForm.product_id}
            className="flex-1 bg-indigo-600 text-white py-2.5 rounded-xl text-sm font-semibold disabled:opacity-40 hover:bg-indigo-500 transition-colors">
            {savingEdit ? 'กำลังบันทึก...' : 'บันทึกการแก้ไข'}
          </button>
          <button onClick={() => setEditingRow(null)}
            className="px-5 py-2.5 text-sm text-slate-500 rounded-xl hover:bg-slate-100 transition-colors">
            ยกเลิก
          </button>
        </div>
      </Modal>
    </div>
  )
}
