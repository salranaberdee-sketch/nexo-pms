'use client'

import React, { useEffect, useState, useMemo } from 'react'
import { createClient } from '@/lib/supabase'
import { useCan } from '@/lib/profile-context'
import ProfilePicker from './ProfilePicker'
import SearchInput from './SearchInput'
import { TableSkeleton, EmptyState } from './TableState'
import StatusSelect from './StatusSelect'
import InlinePersonPicker, { type ProfileOption } from './InlinePersonPicker'
import { showToast } from './Toast'
import Modal, { Field, ConfirmModal } from './Modal'
import CategoryManager, { useCategories } from './CategoryManager'
import { useSettings } from '@/lib/app-settings'
import { inputCls, selectCls, btnPrimary, btnSecondary, btnDanger, thCls, tdCls, tableWrapCls } from '@/lib/cx'
import { IconPlus, IconPencil, IconTrash, IconCopy } from '@/lib/icons'
import { productStatusStyle as statusStyle } from '@/lib/status-styles'
import type { Tables } from '@/src/types/database'

const STATUS_OPTIONS = ['กำลังพัฒนา', 'เตรียมเปิดตัว', 'เปิดขาย', 'หยุดขาย']

type Feature = { id: number; label: string; value: string; sort_order: number }
type Product = Tables<'products'>

const PID_RE = /^[A-Z]+-[A-Z]+-\d+$/

const EMPTY_FORM = {
  product_id: '', name: '', business_type: '', product_type: '',
  brand: '', owner: '', owner_id: '', status: 'กำลังพัฒนา', notes: '', start_date: '',
}

export default function Products() {
  const [products, setProducts]             = useState<Product[]>([])
  const [profileOptions, setProfileOptions] = useState<ProfileOption[]>([])
  const [loading, setLoading]               = useState(true)
  const [loadError, setLoadError]           = useState('')
  const [showForm, setShowForm]             = useState(false)
  const [showCategoryManager, setShowCategoryManager] = useState(false)
  const [saving, setSaving]                 = useState(false)
  const [error, setError]                   = useState('')
  const [search, setSearch]                 = useState('')
  const [filterStatus, setFilterStatus]     = useState('all')
  const [editingId, setEditingId]           = useState<number | null>(null)
  const [confirmDelete, setConfirmDelete]   = useState<number | null>(null)
  const [deleting, setDeleting]             = useState(false)
  // Cascade counts shown in delete confirmation
  const [cascadeCounts, setCascadeCounts]   = useState<{ contents: number; ads: number; sales: number } | null>(null)
  const [loadingCascade, setLoadingCascade] = useState(false)
  const [form, setForm]                     = useState({ ...EMPTY_FORM })
  const canInsert = useCan('insert', 'products')
  const canUpdate = useCan('update', 'products')
  const canDelete = useCan('delete', 'products')
  const supabase = createClient()

  // Features panel state — lazy loaded per product
  const [expandedProductId, setExpandedProductId] = useState<string | null>(null)
  const [featuresMap, setFeaturesMap] = useState<Record<string, Feature[]>>({})
  const [featureSaving, setFeatureSaving] = useState(false)
  // Draft for new feature row
  const [newLabel, setNewLabel] = useState('')
  const [newValue, setNewValue] = useState('')

  // Modal-level features (for add/edit form)
  const [formFeatures, setFormFeatures] = useState<{ label: string; value: string }[]>([])
  const [formFeatLabel, setFormFeatLabel] = useState('')
  const [formFeatValue, setFormFeatValue] = useState('')

  async function loadFeatures(productId: string) {
    if (featuresMap[productId] !== undefined) return
    const { data } = await supabase
      .from('product_features')
      .select('id, label, value, sort_order')
      .eq('product_id', productId)
      .order('sort_order')
      .order('id')
    setFeaturesMap(prev => ({ ...prev, [productId]: (data || []) as Feature[] }))
  }

  function toggleExpand(productId: string) {
    if (expandedProductId === productId) {
      setExpandedProductId(null)
    } else {
      setExpandedProductId(productId)
      loadFeatures(productId)
      setNewLabel('')
      setNewValue('')
    }
  }

  async function addFeature(productId: string) {
    if (!newLabel.trim()) return
    setFeatureSaving(true)
    const nextOrder = (featuresMap[productId]?.length ?? 0)
    const { data, error } = await supabase
      .from('product_features')
      .insert([{ product_id: productId, label: newLabel.trim(), value: newValue.trim(), sort_order: nextOrder }])
      .select('id, label, value, sort_order')
      .single()
    setFeatureSaving(false)
    if (error) { showToast(error.message, 'error'); return }
    setFeaturesMap(prev => ({ ...prev, [productId]: [...(prev[productId] || []), data as Feature] }))
    setNewLabel('')
    setNewValue('')
  }

  async function updateFeature(productId: string, featureId: number, patch: Partial<Feature>) {
    const { error } = await supabase.from('product_features').update(patch).eq('id', featureId)
    if (error) { showToast(error.message, 'error'); return }
    setFeaturesMap(prev => ({
      ...prev,
      [productId]: (prev[productId] || []).map(f => f.id === featureId ? { ...f, ...patch } : f),
    }))
  }

  async function deleteFeature(productId: string, featureId: number) {
    const { error } = await supabase.from('product_features').delete().eq('id', featureId)
    if (error) { showToast(error.message, 'error'); return }
    setFeaturesMap(prev => ({
      ...prev,
      [productId]: (prev[productId] || []).filter(f => f.id !== featureId),
    }))
    showToast('ลบคุณสมบัติแล้ว')
  }

  // Categories from DB
  const { categories, reload: reloadCategories } = useCategories()
  // Product types and brands from app_settings
  const { productTypes: settingProductTypes, brands: settingBrands } = useSettings()

  async function load() {
    setLoadError('')
    const [p, pr] = await Promise.all([
      supabase
        .from('products')
        .select('id, product_id, name, business_type, product_type, brand, owner, owner_id, status, notes, start_date, created_at')
        .order('created_at', { ascending: false }),
      supabase.from('profiles').select('id, name, role, brand_access').eq('approval_status', 'approved').order('name'),
    ])
    if (p.error) { setLoadError(p.error.message); setLoading(false); return }
    setProducts(p.data || [])
    setProfileOptions(pr.data || [])
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  function resetForm() {
    setForm({ ...EMPTY_FORM })
    setEditingId(null)
    setError('')
    setFormFeatures([])
    setFormFeatLabel('')
    setFormFeatValue('')
  }

  function openAdd() { resetForm(); setShowForm(true) }

  function startEdit(p: any) {
    setEditingId(p.id)
    setForm({ product_id: p.product_id || '', name: p.name || '', business_type: p.business_type || '',
      product_type: p.product_type || '', brand: p.brand || '', owner: p.owner || '',
      owner_id: p.owner_id || '', status: p.status || 'กำลังพัฒนา', notes: p.notes || '',
      start_date: p.start_date || '' })
    setError('')
    setFormFeatLabel('')
    setFormFeatValue('')
    // Load existing features into form
    const cached = featuresMap[p.product_id]
    if (cached) {
      setFormFeatures(cached.map(f => ({ label: f.label, value: f.value })))
    } else {
      supabase
        .from('product_features')
        .select('label, value, sort_order')
        .eq('product_id', p.product_id)
        .order('sort_order')
        .order('id')
        .then((res: { data: { label: string; value: string; sort_order: number }[] | null }) => {
          setFormFeatures((res.data || []).map(f => ({ label: f.label, value: f.value })))
        })
    }
    setShowForm(true)
  }

  async function save() {
    setSaving(true); setError('')
    if (!editingId && !PID_RE.test(form.product_id)) {
      setError('Product ID ต้องเป็นรูปแบบ XXX-YYY-NNN เช่น MED-PSY-002')
      setSaving(false); return
    }

    const pid = editingId
      ? products.find(p => p.id === editingId)?.product_id
      : form.product_id

    if (editingId) {
      const { error: updErr } = await supabase.from('products').update({
        name: form.name, business_type: form.business_type, product_type: form.product_type,
        brand: form.brand, owner: form.owner, owner_id: form.owner_id || null,
        status: form.status, notes: form.notes, start_date: form.start_date || null,
      }).eq('id', editingId)
      if (updErr) { setError(updErr.message); setSaving(false); return }
    } else {
      const { error: insErr } = await supabase.from('products').insert([{
        ...form,
        owner_id: form.owner_id || null,
        start_date: form.start_date || null,
      }])
      if (insErr) { setError(insErr.message); setSaving(false); return }
    }

    // Sync features: delete all existing then re-insert in order
    if (pid) {
      const { error: delFeatErr } = await supabase.from('product_features').delete().eq('product_id', pid)
      if (delFeatErr) {
        showToast(`บันทึกสินค้าแล้ว แต่ลบ features เก่าไม่สำเร็จ: ${delFeatErr.message}`, 'error')
      } else if (formFeatures.length > 0) {
        const rows = formFeatures
          .filter(f => f.label.trim())
          .map((f, i) => ({ product_id: pid, label: f.label.trim(), value: f.value.trim(), sort_order: i }))
        if (rows.length > 0) {
          const { error: insFeatErr } = await supabase.from('product_features').insert(rows)
          if (insFeatErr) showToast(`บันทึกสินค้าแล้ว แต่บันทึก features ไม่สำเร็จ: ${insFeatErr.message}`, 'error')
        }
      }
      // Invalidate featuresMap cache for this product
      setFeaturesMap(prev => { const next = { ...prev }; delete next[pid]; return next })
    }

    showToast(editingId ? 'บันทึกการแก้ไขแล้ว' : 'เพิ่มสินค้าแล้ว')
    setShowForm(false); resetForm(); await load(); setSaving(false)
  }

  async function deleteRow(id: number) {
    setDeleting(true)
    const { error: delErr } = await supabase.from('products').delete().eq('id', id)
    setDeleting(false)
    if (delErr) { showToast(delErr.message, 'error'); return }
    setConfirmDelete(null)
    setCascadeCounts(null)
    setProducts(prev => prev.filter(p => p.id !== id))
    showToast('ลบสินค้าแล้ว')
  }

  async function openDeleteConfirm(id: number) {
    const product = products.find(p => p.id === id)
    if (!product) return
    setConfirmDelete(id)
    setCascadeCounts(null)
    setLoadingCascade(true)
    // Query cascade counts in parallel
    const [cRes, aRes, sRes] = await Promise.all([
      supabase.from('contents').select('id', { count: 'exact', head: true }).eq('product_id', product.product_id),
      supabase.from('ads').select('id', { count: 'exact', head: true }).eq('product_id', product.product_id),
      supabase.from('sales').select('id', { count: 'exact', head: true }).eq('product_id', product.product_id),
    ])
    setLoadingCascade(false)
    setCascadeCounts({
      contents: cRes.count ?? 0,
      ads:      aRes.count ?? 0,
      sales:    sRes.count ?? 0,
    })
  }

  async function updateStatus(id: number, status: string) {
    const { error: updErr } = await supabase.from('products').update({ status }).eq('id', id)
    if (updErr) { showToast(updErr.message, 'error'); return }
    setProducts(prev => prev.map(p => p.id === id ? { ...p, status } : p))
  }

  async function updateOwner(id: number, owner_id: string, owner: string) {
    const { error: updErr } = await supabase.from('products').update({ owner_id: owner_id || null, owner }).eq('id', id)
    if (updErr) { showToast(updErr.message, 'error'); return }
    setProducts(prev => prev.map(p => p.id === id ? { ...p, owner_id, owner } : p))
  }

  function copyId(pid: string) {
    navigator.clipboard.writeText(pid).then(() => showToast(`คัดลอก ${pid} แล้ว`))
  }

  const pidInvalid = !editingId && form.product_id !== '' && !PID_RE.test(form.product_id)

  // Derived category lists — from categories table (DB source of truth)
  const allBusinessTypes = useMemo(
    () => categories.map(c => c.name),
    [categories],
  )

  const [filterCategory, setFilterCategory] = useState('all') // business_type filter

  const countByStatus = useMemo(
    () => STATUS_OPTIONS.reduce((acc, s) => ({ ...acc, [s]: products.filter(p => p.status === s).length }), {} as Record<string, number>),
    [products],
  )

  const countByCategory = useMemo(
    () => allBusinessTypes.reduce((acc, bt) => ({ ...acc, [bt]: products.filter(p => p.business_type === bt).length }), {} as Record<string, number>),
    [products, allBusinessTypes],
  )

  // Date range filter
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo]     = useState('')

  const filtered = useMemo(() => {
    let list = products
    if (filterStatus !== 'all')   list = list.filter(p => p.status === filterStatus)
    if (filterCategory !== 'all') list = list.filter(p => p.business_type === filterCategory)
    if (dateFrom) list = list.filter(p => p.created_at && p.created_at >= dateFrom)
    if (dateTo)   list = list.filter(p => p.created_at && p.created_at <= dateTo + 'T23:59:59')
    if (!search) return list
    const q = search.toLowerCase()
    return list.filter(p =>
      (p.product_id || '').toLowerCase().includes(q) || (p.name || '').toLowerCase().includes(q)
      || (p.brand || '').toLowerCase().includes(q) || (p.owner || '').toLowerCase().includes(q)
      || (p.business_type || '').toLowerCase().includes(q) || (p.product_type || '').toLowerCase().includes(q),
    )
  }, [products, search, filterStatus, filterCategory, dateFrom, dateTo])

  const deleteTarget = confirmDelete !== null ? products.find(p => p.id === confirmDelete) : null

  // Pagination — reset when filters change
  const [visibleCount, setVisibleCount] = useState(10)
  useEffect(() => { setVisibleCount(10) }, [filterStatus, filterCategory, search, dateFrom, dateTo])
  const paginated = filtered.slice(0, visibleCount)

  return (
    <div className="p-4 md:p-6 space-y-4 md:space-y-5">

      {/* Page header */}
      <div className="flex items-center justify-between gap-2">
        <div>
          <h1 className="text-lg md:text-xl font-semibold text-slate-900">Products</h1>
          <p className="text-sm text-slate-400 mt-0.5">จัดการ Product ID และข้อมูลสินค้า</p>
        </div>
        {canInsert && (
          <div className="flex items-center gap-2">
            <button onClick={() => setShowCategoryManager(true)}
              className={btnSecondary}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/><line x1="8" y1="18" x2="21" y2="18"/>
                <line x1="3" y1="6" x2="3.01" y2="6"/><line x1="3" y1="12" x2="3.01" y2="12"/><line x1="3" y1="18" x2="3.01" y2="18"/>
              </svg>
              หมวดหมู่
            </button>
            <button onClick={openAdd} className={btnPrimary}>
              <IconPlus />เพิ่มสินค้า
            </button>
          </div>
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
          ทั้งหมด <span className="ml-1 opacity-60 tabular-nums">{products.length}</span>
        </button>
        {STATUS_OPTIONS.map(s => (
          <button key={s} onClick={() => setFilterStatus(filterStatus === s ? 'all' : s)}
            className={`px-3.5 py-1.5 rounded-lg text-sm font-medium border transition-colors
              ${filterStatus === s
                ? (statusStyle[s] || '') + ' border-current/20'
                : 'bg-white border-slate-200 text-slate-500 hover:bg-slate-50 hover:border-slate-300'}`}>
            {s} <span className="ml-1 tabular-nums opacity-60">{countByStatus[s] || 0}</span>
          </button>
        ))}
      </div>

      {/* ── Category filter pills ─────────────────────────────── */}
      {allBusinessTypes.length > 0 && (
        <div className="flex gap-2 flex-wrap items-center">
          <span className="text-xs text-slate-400 font-medium shrink-0">หมวดหมู่:</span>
          <button onClick={() => setFilterCategory('all')}
            className={`px-3 py-1 rounded-lg text-xs font-medium border transition-colors
              ${filterCategory === 'all' ? 'bg-slate-700 text-white border-slate-700' : 'bg-white border-slate-200 text-slate-500 hover:bg-slate-50 hover:border-slate-300'}`}>
            ทั้งหมด
          </button>
          {allBusinessTypes.map(bt => (
            <button key={bt} onClick={() => setFilterCategory(filterCategory === bt ? 'all' : bt)}
              className={`px-3 py-1 rounded-lg text-xs font-medium border transition-colors
                ${filterCategory === bt ? 'bg-slate-700 text-white border-slate-700' : 'bg-white border-slate-200 text-slate-500 hover:bg-slate-50 hover:border-slate-300'}`}>
              {bt} <span className="ml-1 opacity-60 tabular-nums">{countByCategory[bt] || 0}</span>
            </button>
          ))}
          {filterCategory !== 'all' && (
            <button onClick={() => setFilterCategory('all')} className="text-xs text-slate-400 hover:text-slate-700 px-2 py-1 rounded-lg hover:bg-slate-100 transition-colors">✕</button>
          )}
        </div>
      )}

      {/* ── Table ─────────────────────────────────────────────── */}
      <div className={tableWrapCls}>
        <div className="px-4 py-3 border-b border-slate-100 flex items-center justify-between gap-3 flex-wrap">
          <div className="flex items-center gap-2 flex-1 min-w-0 flex-wrap">
            <SearchInput value={search} onChange={setSearch} placeholder="ค้นหา Product ID, ชื่อ, แบรนด์..." />
            <div className="flex items-center gap-1 shrink-0 flex-wrap">
              <span className="text-xs text-slate-400 whitespace-nowrap">จาก</span>
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
          <span className="text-xs text-slate-400 whitespace-nowrap tabular-nums">{filtered.length} / {products.length} รายการ</span>
        </div>
        {/* Desktop table */}
        <div className="hidden md:block overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-slate-50/60 border-b border-slate-100">
                <th className={thCls}>Product ID</th>
                <th className={thCls}>ชื่อสินค้า</th>
                <th className={thCls}>ประเภทธุรกิจ</th>
                <th className={thCls}>ประเภทสินค้า</th>
                <th className={thCls}>แบรนด์</th>
                <th className={thCls}>ผู้รับผิดชอบ</th>
                <th className={thCls}>วันที่เริ่มต้น</th>
                <th className={thCls}>สถานะ</th>
                <th className={thCls}>หมายเหตุ</th>
                <th className={thCls}></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100/60">
              {loading ? (
                <TableSkeleton cols={10} />
              ) : filtered.length === 0 ? (
                <EmptyState message="ยังไม่มี Product ที่ตรงเงื่อนไข" />
              ) : paginated.map(p => (
                <tr key={p.id} className="hover:bg-slate-50/60 transition-colors group">
                  {/* Product ID + copy */}
                  <td className={tdCls}>
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-xs font-medium text-slate-500">{p.product_id}</span>
                      <button onClick={() => copyId(p.product_id)} title="คัดลอก"
                        className="opacity-0 group-hover:opacity-100 transition-opacity text-slate-300 hover:text-indigo-500 p-0.5 rounded">
                        <IconCopy />
                      </button>
                    </div>
                  </td>
                  <td className={`${tdCls} font-semibold text-slate-900 max-w-[200px]`}>
                    <span className="truncate block" title={p.name}>{p.name}</span>
                  </td>
                  <td className={`${tdCls} text-sm text-slate-500`}>{p.business_type || '—'}</td>
                  <td className={`${tdCls} text-sm text-slate-500`}>{p.product_type || '—'}</td>
                  <td className={`${tdCls} text-sm text-slate-500`}>{p.brand || '—'}</td>
                  <td className={tdCls}>
                    <InlinePersonPicker value={p.owner_id || ''} display={p.owner || ''}
                      profiles={profileOptions} disabled={!canUpdate}
                      onChange={(id, name) => updateOwner(p.id, id, name)} />
                  </td>
                  <td className={`${tdCls} text-xs text-slate-400 whitespace-nowrap`}>
                    {p.start_date
                      ? new Date(p.start_date).toLocaleDateString('th-TH', { day: '2-digit', month: 'short', year: 'numeric' })
                      : '—'}
                  </td>
                  <td className={tdCls}>
                    <StatusSelect value={p.status ?? 'กำลังพัฒนา'} options={STATUS_OPTIONS} styleMap={statusStyle}
                      disabled={!canUpdate} onChange={v => updateStatus(p.id, v)} />
                  </td>
                  <td className={`${tdCls} text-sm text-slate-400 max-w-[180px]`}>
                    <span className="truncate block" title={p.notes || ''}>{p.notes || '—'}</span>
                  </td>
                  <td className={`${tdCls} whitespace-nowrap`}>
                    <div className="flex items-center gap-1">
                      {canUpdate && (
                        <button onClick={() => startEdit(p)} title="แก้ไข" className={btnSecondary}>
                          <IconPencil />แก้ไข
                        </button>
                      )}
                      {canDelete && (
                        <button onClick={() => openDeleteConfirm(p.id)} title="ลบ" className={btnDanger}>
                          <IconTrash />
                        </button>
                      )}
                      {!canUpdate && !canDelete && <span className="text-xs text-slate-300">—</span>}
                    </div>
                  </td>
                </tr>
              ))}
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

        {/* Mobile card list (hidden md+) */}
        <div className="md:hidden divide-y divide-slate-100">
          {loading ? (
            <div className="p-6 text-center text-sm text-slate-400">กำลังโหลด...</div>
          ) : paginated.length === 0 ? (
            <div className="p-6 text-center text-sm text-slate-400">ยังไม่มีสินค้าที่ตรงเงื่อนไข</div>
          ) : paginated.map(p => (
            <div key={p.id} className="p-4 hover:bg-slate-50 transition-colors">
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-semibold text-slate-900 text-sm">{p.name}</span>
                    <span className={`text-xs px-2 py-0.5 rounded-md font-medium ${statusStyle[p.status ?? ''] || 'bg-slate-100 text-slate-500'}`}>
                      {p.status}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 mt-1 flex-wrap">
                    <span className="font-mono text-xs text-slate-400">{p.product_id}</span>
                    {p.brand && <span className="text-xs text-slate-400 bg-slate-100 px-1.5 py-0.5 rounded">{p.brand}</span>}
                    {p.business_type && <span className="text-xs text-slate-400">{p.business_type}</span>}
                  </div>
                  {p.owner && (
                    <p className="text-xs text-slate-400 mt-1">ผู้รับผิดชอบ: {p.owner}</p>
                  )}
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  {canUpdate && (
                    <button onClick={() => startEdit(p)} className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-xl transition-colors">
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                    </button>
                  )}
                  {canDelete && (
                    <button onClick={() => openDeleteConfirm(p.id)} className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-xl transition-colors">
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6M14 11v6"/><path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/></svg>
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
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

      {/* Add / Edit Modal */}
      <Modal
        open={showForm}
        onClose={() => { setShowForm(false); resetForm() }}
        title={editingId ? 'แก้ไขสินค้า' : 'เพิ่มสินค้าใหม่'}
        width="max-w-2xl"
      >
        {/* ── Basic info ── */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Field label="Product ID" hint="รูปแบบ XXX-YYY-NNN" required={!editingId}>
            <input
              placeholder="เช่น MED-PSY-002"
              value={form.product_id}
              disabled={!!editingId}
              onChange={e => setForm({ ...form, product_id: e.target.value })}
              className={`${inputCls} ${editingId ? 'bg-slate-50 text-slate-400 cursor-not-allowed' : ''} ${pidInvalid ? 'border-red-300 focus:ring-red-400' : ''}`}
            />
          </Field>
          <Field label="ชื่อสินค้า" required>
            <input placeholder="ชื่อสินค้า" value={form.name}
              onChange={e => setForm({ ...form, name: e.target.value })}
              className={inputCls} />
          </Field>
          <Field label="ประเภทธุรกิจ">
            <input
              list="business-type-options"
              placeholder="เลือกหรือพิมพ์หมวดหมู่"
              value={form.business_type}
              onChange={e => setForm({ ...form, business_type: e.target.value })}
              className={inputCls}
            />
            <datalist id="business-type-options">
              {categories.map(c => <option key={c.id} value={c.name} />)}
            </datalist>
          </Field>
          <Field label="ประเภทสินค้า">
            <input
              list="product-type-options"
              placeholder="เช่น หลักสูตร"
              value={form.product_type}
              onChange={e => setForm({ ...form, product_type: e.target.value })}
              className={inputCls}
            />
            <datalist id="product-type-options">
              {settingProductTypes.length > 0
                ? settingProductTypes.map(pt => <option key={pt} value={pt} />)
                : [...new Set(products.map(p => p.product_type).filter(Boolean) as string[])].sort().map(pt => (
                    <option key={pt} value={pt} />
                  ))}
            </datalist>
          </Field>
          <Field label="แบรนด์">
            <input
              list="brand-options"
              placeholder="เช่น REBORN"
              value={form.brand}
              onChange={e => setForm({ ...form, brand: e.target.value })}
              className={inputCls}
            />
            <datalist id="brand-options">
              {settingBrands.length > 0
                ? settingBrands.map(b => <option key={b} value={b} />)
                : [...new Set(products.map(p => p.brand).filter(Boolean) as string[])].sort().map(b => (
                    <option key={b} value={b} />
                  ))}
            </datalist>
          </Field>
          <Field label="ผู้รับผิดชอบ">
            <ProfilePicker value={form.owner_id} profiles={profileOptions}
              onChange={(id, name) => setForm({ ...form, owner_id: id, owner: name })} placeholder="เลือกผู้รับผิดชอบ" />
          </Field>
          <Field label="สถานะ">
            <select value={form.status} onChange={e => setForm({ ...form, status: e.target.value })}
              className={selectCls}>
              {STATUS_OPTIONS.map(s => <option key={s}>{s}</option>)}
            </select>
          </Field>
          <Field label="วันที่เริ่มต้น">
            <input type="date" value={form.start_date}
              onChange={e => setForm({ ...form, start_date: e.target.value })}
              className={inputCls} />
          </Field>
          <Field label="หมายเหตุ">
            <input placeholder="หมายเหตุเพิ่มเติม" value={form.notes}
              onChange={e => setForm({ ...form, notes: e.target.value })}
              className={inputCls} />
          </Field>
        </div>

        {/* ── คุณสมบัติสินค้า ──────────────────────────────── */}
        <div className="mt-5 border border-indigo-100 rounded-xl bg-indigo-50/40 px-4 pt-4 pb-3">
          <div className="flex items-center justify-between mb-3">
            <p className="text-xs font-semibold text-indigo-700">✦ คุณสมบัติสินค้า</p>
            <span className="text-[10px] text-indigo-400">อธิบายจุดเด่นให้ลูกค้าทราบ</span>
          </div>

          {/* Feature rows — 2 columns */}
          {formFeatures.length > 0 && (
            <div className="grid grid-cols-2 gap-x-4 gap-y-1.5 mb-3">
              {formFeatures.map((f, i) => (
                <div key={i} className="flex items-center gap-1.5 group/feat">
                  <input
                    value={f.label}
                    onChange={e => setFormFeatures(prev => prev.map((x, j) => j === i ? { ...x, label: e.target.value } : x))}
                    placeholder="หัวข้อ"
                    className="border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-indigo-400 bg-white flex-1 min-w-0 placeholder:text-slate-300"
                  />
                  <span className="text-slate-300 text-xs shrink-0">:</span>
                  <input
                    value={f.value}
                    onChange={e => setFormFeatures(prev => prev.map((x, j) => j === i ? { ...x, value: e.target.value } : x))}
                    placeholder="ค่า"
                    className="border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-indigo-400 bg-white w-24 shrink-0 placeholder:text-slate-300"
                  />
                  <button
                    type="button"
                    onClick={() => setFormFeatures(prev => prev.filter((_, j) => j !== i))}
                    className="opacity-0 group-hover/feat:opacity-100 transition-opacity text-slate-300 hover:text-red-500 p-0.5 rounded shrink-0"
                  >
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                      <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
                    </svg>
                  </button>
                </div>
              ))}
            </div>
          )}

          {/* Add row */}
          <div className="flex items-center gap-2">
            <input
              value={formFeatLabel}
              onChange={e => setFormFeatLabel(e.target.value)}
              placeholder="+ หัวข้อใหม่ เช่น จำนวนบทเรียน"
              onKeyDown={e => {
                if (e.key === 'Enter' && formFeatLabel.trim()) {
                  e.preventDefault()
                  setFormFeatures(prev => [...prev, { label: formFeatLabel.trim(), value: formFeatValue.trim() }])
                  setFormFeatLabel(''); setFormFeatValue('')
                }
              }}
              className="border border-dashed border-indigo-300 rounded-lg px-2.5 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-indigo-400 bg-white flex-1 placeholder:text-indigo-300"
            />
            <span className="text-slate-300 text-xs shrink-0">:</span>
            <input
              value={formFeatValue}
              onChange={e => setFormFeatValue(e.target.value)}
              placeholder="ค่า"
              onKeyDown={e => {
                if (e.key === 'Enter' && formFeatLabel.trim()) {
                  e.preventDefault()
                  setFormFeatures(prev => [...prev, { label: formFeatLabel.trim(), value: formFeatValue.trim() }])
                  setFormFeatLabel(''); setFormFeatValue('')
                }
              }}
              className="border border-dashed border-indigo-300 rounded-lg px-2.5 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-indigo-400 bg-white w-28 shrink-0 placeholder:text-indigo-300"
            />
            <button
              type="button"
              onClick={() => {
                if (!formFeatLabel.trim()) return
                setFormFeatures(prev => [...prev, { label: formFeatLabel.trim(), value: formFeatValue.trim() }])
                setFormFeatLabel(''); setFormFeatValue('')
              }}
              disabled={!formFeatLabel.trim()}
              className="shrink-0 text-xs font-semibold bg-indigo-600 text-white px-3 py-1.5 rounded-lg hover:bg-indigo-500 disabled:opacity-30 transition-colors"
            >
              + เพิ่ม
            </button>
          </div>
        </div>

        {error && <p className="text-sm bg-red-50 text-red-600 border border-red-100 rounded-xl px-3.5 py-2.5 mt-4">{error}</p>}
        <div className="flex gap-2 mt-6">
          <button onClick={save}
            disabled={saving || (!editingId && (!form.product_id || !form.name)) || (!!editingId && !form.name)}
            className="flex-1 bg-indigo-600 text-white py-2.5 rounded-xl text-sm font-semibold disabled:opacity-40 hover:bg-indigo-500 transition-colors">
            {saving ? 'กำลังบันทึก...' : editingId ? 'บันทึกการแก้ไข' : 'บันทึก'}
          </button>
          <button onClick={() => { setShowForm(false); resetForm() }}
            className="px-5 py-2.5 text-sm text-slate-500 rounded-xl hover:bg-slate-100 transition-colors">
            ยกเลิก
          </button>
        </div>
      </Modal>

      {/* Category Manager Modal */}
      <Modal
        open={showCategoryManager}
        onClose={() => { setShowCategoryManager(false); reloadCategories() }}
        title="จัดการหมวดหมู่"
        width="max-w-sm"
      >
        <CategoryManager onClose={() => { setShowCategoryManager(false); reloadCategories() }} />
      </Modal>

      {/* Delete confirm modal */}
      <ConfirmModal
        open={confirmDelete !== null}
        onClose={() => { setConfirmDelete(null); setCascadeCounts(null) }}
        onConfirm={() => deleteRow(confirmDelete!)}
        loading={deleting}
        title="ยืนยันลบสินค้า"
        message={
          <>
            ลบ <strong>{deleteTarget?.name}</strong> ({deleteTarget?.product_id})?
            {loadingCascade ? (
              <span className="block mt-2 text-xs text-slate-400">กำลังตรวจสอบข้อมูลที่เกี่ยวข้อง…</span>
            ) : cascadeCounts && (cascadeCounts.contents > 0 || cascadeCounts.ads > 0 || cascadeCounts.sales > 0) ? (
              <span className="block mt-3 p-3 bg-red-50 border border-red-100 rounded-xl text-xs text-red-700 space-y-1">
                <span className="block font-semibold text-red-800">⚠️ ข้อมูลต่อไปนี้จะถูกลบพร้อมกัน:</span>
                {cascadeCounts.contents > 0 && <span className="block">• Content {cascadeCounts.contents} ชิ้น</span>}
                {cascadeCounts.ads > 0      && <span className="block">• Ads {cascadeCounts.ads} แคมเปญ</span>}
                {cascadeCounts.sales > 0    && <span className="block">• Sales {cascadeCounts.sales} รายการ</span>}
                <span className="block mt-1 text-red-600 font-medium">ไม่สามารถกู้คืนได้</span>
              </span>
            ) : cascadeCounts ? (
              <span className="block mt-2 text-xs text-slate-500">ไม่มีข้อมูล Content, Ads หรือ Sales ที่เชื่อมโยง</span>
            ) : null}
          </>
        }
      />
    </div>
  )
}

// ─── FeaturePanel ────────────────────────────────────────────────────────────
// Inline expand panel under each product row — shows editable key-value features

function FeaturePanel({
  productId, productName, features, canEdit, canDelete,
  newLabel, newValue, saving,
  onNewLabelChange, onNewValueChange, onAdd, onUpdate, onDelete,
}: {
  productId: string
  productName: string
  features: Feature[] | undefined
  canEdit: boolean
  canDelete: boolean
  newLabel: string
  newValue: string
  saving: boolean
  onNewLabelChange: (v: string) => void
  onNewValueChange: (v: string) => void
  onAdd: () => void
  onUpdate: (id: number, patch: Partial<Feature>) => void
  onDelete: (id: number) => void
}) {
  const isLoading = features === undefined

  return (
    <div className="px-6 py-4 border-t border-indigo-100">
      {/* Panel header */}
      <div className="flex items-center gap-2 mb-3">
        <span className="text-xs font-semibold text-indigo-700 uppercase tracking-wide">
          ✦ คุณสมบัติสินค้า
        </span>
        <span className="text-xs text-indigo-400">{productName}</span>
        {!isLoading && features!.length > 0 && (
          <span className="text-[10px] bg-indigo-100 text-indigo-600 px-1.5 py-0.5 rounded-full font-medium">
            {features!.length} รายการ
          </span>
        )}
      </div>

      {isLoading ? (
        <div className="flex items-center gap-2 py-2">
          <div className="w-4 h-4 border-2 border-indigo-400 border-t-transparent rounded-full animate-spin" />
          <span className="text-xs text-slate-400">กำลังโหลด...</span>
        </div>
      ) : (
        <div className="space-y-2">
          {/* Feature rows */}
          {features!.length === 0 && !canEdit && (
            <p className="text-xs text-slate-400 py-1">ยังไม่มีคุณสมบัติ</p>
          )}
          {features!.map(f => (
            <FeatureRow
              key={f.id}
              feature={f}
              canEdit={canEdit}
              canDelete={canDelete}
              onUpdate={patch => onUpdate(f.id, patch)}
              onDelete={() => onDelete(f.id)}
            />
          ))}

          {/* Add new feature row */}
          {canEdit && (
            <div className="flex items-center gap-2 pt-1">
              <input
                value={newLabel}
                onChange={e => onNewLabelChange(e.target.value)}
                placeholder="หัวข้อ เช่น จำนวนบทเรียน"
                onKeyDown={e => e.key === 'Enter' && onAdd()}
                className="border border-dashed border-indigo-200 rounded-lg px-2.5 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-indigo-400 focus:border-transparent bg-white w-44 placeholder:text-slate-300"
              />
              <input
                value={newValue}
                onChange={e => onNewValueChange(e.target.value)}
                placeholder="ค่า เช่น 12 บท"
                onKeyDown={e => e.key === 'Enter' && onAdd()}
                className="border border-dashed border-indigo-200 rounded-lg px-2.5 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-indigo-400 focus:border-transparent bg-white w-36 placeholder:text-slate-300"
              />
              <button
                onClick={onAdd}
                disabled={saving || !newLabel.trim()}
                className="text-xs font-semibold bg-indigo-600 text-white px-3 py-1.5 rounded-lg hover:bg-indigo-500 disabled:opacity-40 transition-colors flex items-center gap-1"
              >
                {saving ? (
                  <span className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : (
                  '+ เพิ่ม'
                )}
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

// ─── FeatureRow ───────────────────────────────────────────────────────────────
// Single editable feature item

function FeatureRow({
  feature, canEdit, canDelete, onUpdate, onDelete,
}: {
  feature: Feature
  canEdit: boolean
  canDelete: boolean
  onUpdate: (patch: Partial<Feature>) => void
  onDelete: () => void
}) {
  const [editingLabel, setEditingLabel] = useState(false)
  const [editingValue, setEditingValue] = useState(false)
  const [draftLabel, setDraftLabel]     = useState(feature.label)
  const [draftValue, setDraftValue]     = useState(feature.value)

  function commitLabel() {
    setEditingLabel(false)
    if (draftLabel.trim() && draftLabel !== feature.label) onUpdate({ label: draftLabel.trim() })
    else setDraftLabel(feature.label)
  }

  function commitValue() {
    setEditingValue(false)
    if (draftValue !== feature.value) onUpdate({ value: draftValue })
  }

  return (
    <div className="flex items-center gap-2 group/row">
      {/* Label */}
      <div className="w-44 shrink-0">
        {editingLabel && canEdit ? (
          <input
            autoFocus
            value={draftLabel}
            onChange={e => setDraftLabel(e.target.value)}
            onBlur={commitLabel}
            onKeyDown={e => { if (e.key === 'Enter') commitLabel(); if (e.key === 'Escape') { setEditingLabel(false); setDraftLabel(feature.label) } }}
            className="w-full border border-indigo-300 rounded-lg px-2.5 py-1 text-xs focus:outline-none focus:ring-2 focus:ring-indigo-400 bg-white"
          />
        ) : (
          <span
            onClick={() => canEdit && setEditingLabel(true)}
            className={`inline-block text-xs font-semibold text-slate-600 px-2.5 py-1 rounded-lg bg-white border border-transparent ${canEdit ? 'cursor-pointer hover:border-indigo-200 hover:text-indigo-700' : ''}`}
          >
            {feature.label}
          </span>
        )}
      </div>

      {/* Separator */}
      <span className="text-slate-300 text-xs shrink-0">:</span>

      {/* Value */}
      <div className="flex-1 min-w-0">
        {editingValue && canEdit ? (
          <input
            autoFocus
            value={draftValue}
            onChange={e => setDraftValue(e.target.value)}
            onBlur={commitValue}
            onKeyDown={e => { if (e.key === 'Enter') commitValue(); if (e.key === 'Escape') { setEditingValue(false); setDraftValue(feature.value) } }}
            className="w-full border border-indigo-300 rounded-lg px-2.5 py-1 text-xs focus:outline-none focus:ring-2 focus:ring-indigo-400 bg-white"
          />
        ) : (
          <span
            onClick={() => canEdit && setEditingValue(true)}
            className={`inline-block text-xs text-slate-700 px-2.5 py-1 rounded-lg bg-white border border-transparent ${canEdit ? 'cursor-pointer hover:border-indigo-200 hover:text-indigo-700' : ''} ${!feature.value ? 'text-slate-300 italic' : ''}`}
          >
            {feature.value || (canEdit ? 'คลิกเพื่อใส่ค่า' : '—')}
          </span>
        )}
      </div>

      {/* Delete */}
      {canDelete && (
        <button
          onClick={onDelete}
          className="opacity-0 group-hover/row:opacity-100 transition-opacity text-slate-300 hover:text-red-500 p-1 rounded"
          title="ลบ"
        >
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        </button>
      )}
    </div>
  )
}
