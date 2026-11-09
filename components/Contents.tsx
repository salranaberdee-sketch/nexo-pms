  'use client'

import React, { useEffect, useState, useMemo, useRef } from 'react'
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

// ─── Types ────────────────────────────────────────────────────────────────────
type ContentAsset = {
  id: number
  content_id: number
  asset_type: 'url' | 'image'
  label: string | null
  url: string
  sort_order: number
  uploaded_by: string | null
  created_at: string
}

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

const inputCls = 'w-full border border-slate-200 rounded-xl px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 placeholder:text-slate-400 bg-white'
const selectCls = 'w-full border border-slate-200 rounded-xl px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white'

function IconChevron() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
      <polyline points="6 9 12 15 18 9"/>
    </svg>
  )
}

// ─── ContentAssetsPanel ───────────────────────────────────────────────────────

function ContentAssetsPanel({
  contentId, assets, canManage, canDelete, onAdd, onDelete, onUpdateLabel,
}: {
  contentId: number
  assets: ContentAsset[]
  canManage: boolean
  canDelete: boolean
  onAdd: (type: 'url' | 'image', url: string, label: string) => void
  onDelete: (id: number) => void
  onUpdateLabel: (id: number, label: string) => void
}) {
  const [addType, setAddType]   = useState<'url' | 'image'>('url')
  const [addUrl, setAddUrl]     = useState('')
  const [addLabel, setAddLabel] = useState('')
  const [adding, setAdding]     = useState(false)
  const [editingLabelId, setEditingLabelId] = useState<number | null>(null)
  const [editLabelVal, setEditLabelVal]     = useState('')
  const urlInputRef = useRef<HTMLInputElement>(null)

  // Image preview inline
  function isImageUrl(url: string) {
    return /\.(jpg|jpeg|png|gif|webp|svg|avif)(\?.*)?$/i.test(url)
  }

  async function handleAdd() {
    if (!addUrl.trim()) return
    setAdding(true)
    await onAdd(addType, addUrl.trim(), addLabel.trim())
    setAddUrl('')
    setAddLabel('')
    setAdding(false)
    urlInputRef.current?.focus()
  }

  const urlAssets   = assets.filter(a => a.asset_type === 'url')
  const imageAssets = assets.filter(a => a.asset_type === 'image')

  return (
    <div className="space-y-4">
      {/* Section header */}
      <div className="flex items-center gap-2">
        <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">ชิ้นงาน / Files & Links</span>
        <span className="text-xs text-slate-400">({assets.length} รายการ)</span>
      </div>

      {/* Image previews grid */}
      {imageAssets.length > 0 && (
        <div>
          <p className="text-[11px] font-semibold text-slate-400 mb-2 uppercase tracking-wide">รูปภาพชิ้นงาน</p>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
            {imageAssets.map(asset => (
              <AssetImageCard
                key={asset.id}
                asset={asset}
                canDelete={canDelete}
                onDelete={() => onDelete(asset.id)}
                onEditLabel={() => { setEditingLabelId(asset.id); setEditLabelVal(asset.label || '') }}
                editingLabel={editingLabelId === asset.id}
                editLabelVal={editLabelVal}
                onEditLabelChange={setEditLabelVal}
                onSaveLabel={() => { onUpdateLabel(asset.id, editLabelVal); setEditingLabelId(null) }}
                onCancelLabel={() => setEditingLabelId(null)}
              />
            ))}
          </div>
        </div>
      )}

      {/* URL list */}
      {urlAssets.length > 0 && (
        <div>
          <p className="text-[11px] font-semibold text-slate-400 mb-2 uppercase tracking-wide">ลิงก์ / URLs</p>
          <div className="space-y-1.5">
            {urlAssets.map(asset => (
              <AssetUrlRow
                key={asset.id}
                asset={asset}
                canDelete={canDelete}
                onDelete={() => onDelete(asset.id)}
                onEditLabel={() => { setEditingLabelId(asset.id); setEditLabelVal(asset.label || '') }}
                editingLabel={editingLabelId === asset.id}
                editLabelVal={editLabelVal}
                onEditLabelChange={setEditLabelVal}
                onSaveLabel={() => { onUpdateLabel(asset.id, editLabelVal); setEditingLabelId(null) }}
                onCancelLabel={() => setEditingLabelId(null)}
              />
            ))}
          </div>
        </div>
      )}

      {assets.length === 0 && (
        <p className="text-xs text-slate-400 py-2">ยังไม่มีชิ้นงาน — เพิ่มได้ด้านล่าง</p>
      )}

      {/* Add new asset */}
      {canManage && (
        <div className="bg-white rounded-xl border border-slate-200 p-3 space-y-2.5">
          <p className="text-xs font-semibold text-slate-600">เพิ่มชิ้นงาน</p>
          {/* Type toggle */}
          <div className="flex gap-1 bg-slate-100 rounded-lg p-0.5 w-fit">
            <button
              onClick={() => setAddType('image')}
              className={`px-3 py-1 rounded-md text-xs font-medium transition-colors ${addType === 'image' ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500'}`}
            >
              🖼 รูปภาพ (URL)
            </button>
            <button
              onClick={() => setAddType('url')}
              className={`px-3 py-1 rounded-md text-xs font-medium transition-colors ${addType === 'url' ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500'}`}
            >
              🔗 ลิงก์ / URL
            </button>
          </div>
          <div className="flex gap-2 flex-wrap">
            <input
              ref={urlInputRef}
              value={addUrl}
              onChange={e => setAddUrl(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleAdd()}
              placeholder={addType === 'image'
                ? 'URL รูปภาพ เช่น https://drive.google.com/... หรือ https://i.imgur.com/...'
                : 'URL ลิงก์ เช่น https://www.facebook.com/... หรือ https://docs.google.com/...'}
              className="flex-1 min-w-0 border border-slate-200 rounded-lg px-3 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
            <input
              value={addLabel}
              onChange={e => setAddLabel(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleAdd()}
              placeholder="ชื่อ/label (ถ้ามี)"
              className="w-36 border border-slate-200 rounded-lg px-3 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
            <button
              onClick={handleAdd}
              disabled={!addUrl.trim() || adding}
              className="shrink-0 bg-indigo-600 text-white text-xs font-semibold px-4 py-1.5 rounded-lg hover:bg-indigo-500 disabled:opacity-40 transition-colors"
            >
              {adding ? '...' : '+ เพิ่ม'}
            </button>
          </div>
          <p className="text-[10px] text-slate-400">
            {addType === 'image'
              ? 'รองรับ URL รูปภาพโดยตรง (.jpg .png .gif .webp) — จะแสดงเป็น thumbnail ได้ทันที'
              : 'รองรับทุก URL — Google Drive, Dropbox, Facebook post, Notion, Figma ฯลฯ'}
          </p>
        </div>
      )}
    </div>
  )
}

// ─── AssetImageCard ──────────────────────────────────────────────────────────

function AssetImageCard({
  asset, canDelete, onDelete, onEditLabel,
  editingLabel, editLabelVal, onEditLabelChange, onSaveLabel, onCancelLabel,
}: {
  asset: ContentAsset
  canDelete: boolean
  onDelete: () => void
  onEditLabel: () => void
  editingLabel: boolean
  editLabelVal: string
  onEditLabelChange: (v: string) => void
  onSaveLabel: () => void
  onCancelLabel: () => void
}) {
  const [imgError, setImgError] = useState(false)

  return (
    <div className="group relative bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm">
      {/* Image */}
      <a href={asset.url} target="_blank" rel="noreferrer" className="block">
        {!imgError ? (
          <img
            src={asset.url}
            alt={asset.label || 'asset'}
            onError={() => setImgError(true)}
            className="w-full h-24 object-cover bg-slate-100"
          />
        ) : (
          <div className="w-full h-24 bg-slate-100 flex items-center justify-center text-slate-400 text-xs">
            🖼 เปิดลิงก์
          </div>
        )}
      </a>

      {/* Label */}
      <div className="px-2 py-1.5">
        {editingLabel ? (
          <div className="flex gap-1 items-center">
            <input
              autoFocus
              value={editLabelVal}
              onChange={e => onEditLabelChange(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') onSaveLabel(); if (e.key === 'Escape') onCancelLabel() }}
              className="flex-1 min-w-0 border border-indigo-300 rounded px-1.5 py-0.5 text-[10px] focus:outline-none"
            />
            <button onClick={onSaveLabel} className="text-emerald-600 text-[10px] font-bold">✓</button>
          </div>
        ) : (
          <button
            onClick={onEditLabel}
            className="text-[10px] text-slate-500 hover:text-indigo-600 truncate w-full text-left transition-colors"
            title={asset.label || 'คลิกเพื่อตั้งชื่อ'}
          >
            {asset.label || <span className="text-slate-300">+ ตั้งชื่อ</span>}
          </button>
        )}
      </div>

      {/* Delete overlay */}
      {canDelete && (
        <button
          onClick={onDelete}
          className="absolute top-1 right-1 w-5 h-5 bg-red-500 text-white rounded-full text-[10px] flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
          title="ลบ"
        >
          ✕
        </button>
      )}
    </div>
  )
}

// ─── AssetUrlRow ──────────────────────────────────────────────────────────────

function AssetUrlRow({
  asset, canDelete, onDelete, onEditLabel,
  editingLabel, editLabelVal, onEditLabelChange, onSaveLabel, onCancelLabel,
}: {
  asset: ContentAsset
  canDelete: boolean
  onDelete: () => void
  onEditLabel: () => void
  editingLabel: boolean
  editLabelVal: string
  onEditLabelChange: (v: string) => void
  onSaveLabel: () => void
  onCancelLabel: () => void
}) {
  const domain = (() => {
    try { return new URL(asset.url).hostname.replace('www.', '') } catch { return '' }
  })()

  const favicon = domain ? `https://www.google.com/s2/favicons?domain=${domain}&sz=16` : ''

  return (
    <div className="flex items-center gap-2.5 bg-white border border-slate-200 rounded-xl px-3 py-2 group hover:border-indigo-200 transition-colors">
      {/* Favicon */}
      {favicon && (
        <img src={favicon} alt="" className="w-4 h-4 shrink-0 rounded-sm" onError={e => (e.currentTarget.style.display = 'none')} />
      )}

      {/* URL + label */}
      <div className="flex-1 min-w-0">
        {editingLabel ? (
          <div className="flex gap-1 items-center">
            <input
              autoFocus
              value={editLabelVal}
              onChange={e => onEditLabelChange(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') onSaveLabel(); if (e.key === 'Escape') onCancelLabel() }}
              className="flex-1 min-w-0 border border-indigo-300 rounded px-2 py-0.5 text-xs focus:outline-none"
              placeholder="ชื่อลิงก์..."
            />
            <button onClick={onSaveLabel} className="text-emerald-600 text-xs font-bold">✓</button>
            <button onClick={onCancelLabel} className="text-slate-400 text-xs">✕</button>
          </div>
        ) : (
          <div className="flex items-center gap-1.5 min-w-0">
            <a
              href={asset.url}
              target="_blank"
              rel="noreferrer"
              className="text-xs text-indigo-600 hover:underline truncate"
              title={asset.url}
            >
              {asset.label || asset.url}
            </a>
            {asset.label && (
              <span className="text-[10px] text-slate-400 truncate hidden sm:inline">{domain}</span>
            )}
          </div>
        )}
      </div>

      {/* Actions — visible on hover */}
      <div className="shrink-0 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
        <button
          onClick={onEditLabel}
          className="text-[10px] text-slate-400 hover:text-indigo-600 px-1.5 py-0.5 rounded hover:bg-indigo-50 transition-colors"
          title="ตั้งชื่อ"
        >
          ✏️
        </button>
        {canDelete && (
          <button
            onClick={onDelete}
            className="text-[10px] text-slate-400 hover:text-red-600 px-1.5 py-0.5 rounded hover:bg-red-50 transition-colors"
            title="ลบ"
          >
            ✕
          </button>
        )}
      </div>
    </div>
  )
}

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
  objective: '', channel: 'Facebook', hook: '', format_size: '',
  assigned_to: '', assigned_to_id: '',
  producer: '', producer_id: '',
  approver: '', approver_id: '',
  deadline: '', status: 'รอผลิต',
  production_cost: '',
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

  // Expanded row state — shows assets panel
  const [expandedId, setExpandedId] = useState<number | null>(null)
  // Assets cache keyed by content_id
  const [assetsMap, setAssetsMap] = useState<Record<number, ContentAsset[]>>({})

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
        .select('id, product_id, seq, type, title, objective, hook, format_size, assigned_to, assigned_to_id, producer, producer_id, approver, approver_id, deadline, status, production_cost, acknowledged_at, assigned_date, created_at')
        .order('product_id').order('seq'),
      supabase.from('products').select('product_id, name, brand'),
      supabase.from('profiles').select('id, name, role, brand_access').eq('approval_status', 'approved').order('name'),
    ])
    if (c.error) { setLoadError(c.error.message); setLoading(false); return }
    setContents(c.data || [])
    setProducts(p.data || [])
    setProfileOptions(pr.data || [])
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
    if (assetsMap[contentId]) return // already loaded
    const { data, error } = await supabase
      .from('content_assets')
      .select('id, content_id, asset_type, label, url, sort_order, uploaded_by, created_at')
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

  async function addAsset(contentId: number, asset_type: 'url' | 'image', url: string, label: string) {
    const existing = assetsMap[contentId] || []
    const sort_order = existing.length
    const { data, error } = await supabase.from('content_assets').insert([{
      content_id: contentId,
      asset_type,
      url,
      label: label || null,
      sort_order,
      uploaded_by: me.id,
    }]).select().single()
    if (error) { showToast(error.message, 'error'); return }
    setAssetsMap(prev => ({
      ...prev,
      [contentId]: [...(prev[contentId] || []), data as ContentAsset],
    }))
    showToast('เพิ่ม asset แล้ว')
  }

  async function deleteAsset(contentId: number, assetId: number) {
    const { error } = await supabase.from('content_assets').delete().eq('id', assetId)
    if (error) { showToast(error.message, 'error'); return }
    setAssetsMap(prev => ({
      ...prev,
      [contentId]: (prev[contentId] || []).filter(a => a.id !== assetId),
    }))
    showToast('ลบ asset แล้ว')
  }

  async function updateAssetLabel(contentId: number, assetId: number, label: string) {
    const { error } = await supabase.from('content_assets').update({ label: label || null }).eq('id', assetId)
    if (error) { showToast(error.message, 'error'); return }
    setAssetsMap(prev => ({
      ...prev,
      [contentId]: (prev[contentId] || []).map(a => a.id === assetId ? { ...a, label } : a),
    }))
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
  const headers = ['expand', '#', 'Product', 'ประเภท', 'ชื่อ Content', 'ผู้รับผิดชอบ', 'ต้นทุน', 'กำหนดส่ง', 'สถานะ', 'วันที่เพิ่ม', 'actions']

  // Pagination — reset when filters change
  const [visibleCount, setVisibleCount] = useState(10)
  useEffect(() => { setVisibleCount(10) }, [filterProduct, filterStatus, search, dateFrom, dateTo])

  return (
    <div className="p-6 space-y-5">

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-slate-900">Content</h1>
          <p className="text-sm text-slate-400 mt-0.5">ติดตามสถานะการผลิต Content ทุกชิ้น</p>
        </div>
        {canInsert && (
          <button onClick={() => { setAddForm({ ...EMPTY_ADD_FORM }); setAddError(''); setShowAdd(true) }}
            className="flex items-center gap-2 bg-indigo-600 text-white px-5 py-2.5 rounded-xl text-sm font-medium hover:bg-indigo-500 transition-colors shadow-sm">
            <IconPlus />เพิ่ม Content
          </button>
        )}
      </div>

      {loadError && (
        <div className="bg-red-50 border border-red-100 rounded-2xl px-4 py-3 text-sm text-red-600">
          โหลดข้อมูลไม่สำเร็จ: {loadError}
          <button onClick={load} className="ml-3 underline text-red-500 hover:text-red-700">ลองใหม่</button>
        </div>
      )}

      {/* Status filter pills */}
      <div className="flex gap-2 flex-wrap">
        <button onClick={() => setFilterStatus('all')}
          className={`px-3.5 py-1.5 rounded-lg text-sm font-medium transition-colors border
            ${filterStatus === 'all' ? 'bg-indigo-600 text-white border-indigo-600' : 'bg-white border-slate-200 text-slate-500 hover:bg-slate-50'}`}>
          ทั้งหมด <span className="ml-1 opacity-60">{contents.length}</span>
        </button>
        {STATUSES.map(s => (
          <button key={s} onClick={() => setFilterStatus(filterStatus === s ? 'all' : s)}
            className={`px-3.5 py-1.5 rounded-lg text-sm font-medium transition-colors border
              ${filterStatus === s ? statusStyle[s] + ' border-current/20' : 'bg-white border-slate-200 text-slate-500 hover:bg-slate-50'}`}>
            {s} <span className="ml-1 tabular-nums opacity-60">{countByStatus[s] || 0}</span>
          </button>
        ))}
      </div>

      {/* Search + product filter */}
      <div className="flex gap-2 flex-wrap items-center">
        <SearchInput value={search} onChange={setSearch} placeholder="ค้นหาชื่อ, Hook, Product, ผู้รับผิดชอบ..." />
        <select value={filterProduct} onChange={e => setFilterProduct(e.target.value)}
          className="border border-slate-200 rounded-xl px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white text-slate-700">
          <option value="all">ทุก Product</option>
          {products.map(p => <option key={p.product_id} value={p.product_id}>{p.product_id} — {p.name}</option>)}
        </select>
        {/* Date range */}
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
            className="text-sm text-slate-400 hover:text-slate-700 px-3 py-2 rounded-xl hover:bg-slate-100 transition-colors whitespace-nowrap">
            ล้างตัวกรอง ✕
          </button>
        )}
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl border border-slate-100 overflow-hidden shadow-sm">
        <div className="px-5 py-3.5 border-b border-slate-100 flex items-center justify-between">
          <span className="text-sm text-slate-400">{filtered.length} / {contents.length} รายการ</span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-100">
                {headers.map(h => (
                  <th key={h} className="text-left px-5 py-3.5 text-xs font-semibold text-slate-400 whitespace-nowrap uppercase tracking-wide">
                    {h === 'expand' || h === 'actions' ? '' : h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <TableSkeleton cols={headers.length} />
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
                const assetCount = assets.length

                return (
                  <React.Fragment key={c.id}>
                    <tr className={`border-b border-slate-100/60 transition-colors last:border-0 ${rowBg} ${isExpanded ? 'bg-indigo-50/30' : 'hover:bg-indigo-50/20'}`}>
                      {/* Expand button */}
                      <td className="px-3 py-4 w-8">
                        <button
                          onClick={() => handleExpandRow(c.id)}
                          title={isExpanded ? 'ซ่อนรายละเอียด' : 'ดูรายละเอียด / assets'}
                          className={`w-7 h-7 flex items-center justify-center rounded-lg transition-all text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 ${isExpanded ? 'bg-indigo-100 text-indigo-600 rotate-180' : ''}`}
                        >
                          <IconChevron />
                        </button>
                      </td>
                      <td className="px-5 py-4 text-sm text-slate-400 tabular-nums font-medium">{c.seq}</td>
                      <td className="px-5 py-4">
                        <span className="font-mono text-xs font-medium bg-slate-100 text-slate-600 px-2 py-1 rounded-md">{c.product_id}</span>
                      </td>
                      <td className="px-5 py-4">
                        <span className={`text-xs font-semibold px-2 py-1 rounded-lg ${typeStyle[c.type] || 'bg-slate-100 text-slate-500'}`}>
                          {typeLabel[c.type] || c.type}
                        </span>
                      </td>
                      <td className="px-5 py-4 max-w-[220px]">
                        <div className="flex items-center gap-1.5">
                          {isNew && (
                            <span className="shrink-0 text-[10px] font-bold bg-indigo-500 text-white px-1.5 py-0.5 rounded-full">ใหม่</span>
                          )}
                          <span className="font-semibold text-slate-900 truncate block" title={c.title}>{c.title}</span>
                        </div>
                        {c.objective && <span className="text-xs text-slate-400 truncate block mt-0.5" title={c.objective}>{c.objective}</span>}
                        {c.producer && (
                          <span className="text-xs text-blue-500 mt-0.5 block">ผู้ผลิต: {c.producer}</span>
                        )}
                        {/* Asset badge */}
                        {assetCount > 0 && (
                          <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded-full mt-1">
                            📎 {assetCount} ชิ้นงาน
                          </span>
                        )}
                      </td>
                      <td className="px-5 py-4 whitespace-nowrap">
                        <InlinePersonPicker value={c.assigned_to_id || ''} display={c.assigned_to || ''}
                          profiles={profileOptions} disabled={!canUpdate}
                          onChange={(id, name) => updateAssignee(c.id, id, name)} />
                      </td>
                      <td className="px-5 py-4 text-sm tabular-nums text-slate-500 whitespace-nowrap">
                        {Number(c.production_cost) > 0
                          ? <span>฿{Number(c.production_cost).toLocaleString()}</span>
                          : <span className="text-slate-300">—</span>}
                      </td>
                      <td className="px-5 py-4 whitespace-nowrap">
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
                      <td className="px-5 py-4">
                        <StatusSelect value={c.status} options={STATUSES} styleMap={statusStyle}
                          disabled={!canUpdate} onChange={v => updateStatus(c.id, v)} />
                      </td>
                      {/* Created at */}
                      <td className="px-5 py-4 text-xs text-slate-400 whitespace-nowrap">
                        {c.created_at
                          ? new Date(c.created_at).toLocaleDateString('th-TH', { day: '2-digit', month: 'short', year: 'numeric' })
                          : '—'}
                      </td>
                      <td className="px-5 py-4 whitespace-nowrap">
                        <div className="flex items-center gap-1">
                          {canUpdate && (
                            <button onClick={() => openEdit(c)}
                              title="แก้ไข"
                              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-600 bg-slate-100 hover:bg-indigo-100 hover:text-indigo-700 rounded-lg transition-colors">
                              <IconPencil />แก้ไข
                            </button>
                          )}
                          {canDelete && (
                            <button onClick={() => setConfirmDelete(c.id)} title="ลบ"
                              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-400 hover:bg-red-50 hover:text-red-600 rounded-lg transition-colors">
                              <IconTrash />ลบ
                            </button>
                          )}
                          {!canUpdate && !canDelete && <span className="text-xs text-slate-300">—</span>}
                        </div>
                      </td>
                    </tr>
                    {/* Assets panel — expanded row */}
                    {isExpanded && (
                      <tr className="bg-slate-50/60">
                        <td colSpan={headers.length} className="px-6 pb-4 pt-2">
                          <ContentAssetsPanel
                            contentId={c.id}
                            assets={assets}
                            canManage={canManageAssets}
                            canDelete={me.role === 'admin' || me.role === 'manager'}
                            onAdd={(type, url, label) => addAsset(c.id, type, url, label)}
                            onDelete={(assetId) => deleteAsset(c.id, assetId)}
                            onUpdateLabel={(assetId, label) => updateAssetLabel(c.id, assetId, label)}
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
            <div className="px-5 py-4 border-t border-slate-100 text-center">
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
            <input placeholder="Facebook, Instagram ฯลฯ" value={addForm.channel}
              onChange={e => setAddForm({ ...addForm, channel: e.target.value })} className={inputCls} />
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
            <input placeholder="Facebook, Instagram ฯลฯ" value={editForm.channel} onChange={e => setEditForm(f => ({ ...f, channel: e.target.value }))} className={inputCls} />
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
