'use client'

import { useEffect, useState, useMemo } from 'react'
import { createClient } from '@/lib/supabase'
import { useCan } from '@/lib/profile-context'
import ProfilePicker from './ProfilePicker'
import SearchInput from './SearchInput'
import { TableSkeleton, EmptyState } from './TableState'
import StatusSelect from './StatusSelect'
import InlinePersonPicker, { type ProfileOption } from './InlinePersonPicker'

const STATUS_OPTIONS = ['กำลังพัฒนา', 'เตรียมเปิดตัว', 'เปิดขาย', 'หยุดขาย']

const statusStyle: Record<string, string> = {
  'เปิดขาย':       'bg-green-50 text-green-700',
  'เตรียมเปิดตัว': 'bg-amber-50 text-amber-700',
  'กำลังพัฒนา':   'bg-blue-50 text-blue-700',
  'หยุดขาย':       'bg-gray-100 text-gray-400',
}

// Product ID format: XXX-YYY-NNN (e.g. MED-PSY-002).
const PID_RE = /^[A-Z]+-[A-Z]+-\d+$/

const EMPTY_FORM = {
  product_id: '', name: '', business_type: '', product_type: '',
  brand: '', owner: '', owner_id: '', status: 'กำลังพัฒนา', notes: '',
}

function IconPlus() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
      <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
    </svg>
  )
}

export default function Products() {
  const [products, setProducts]           = useState<any[]>([])
  // Profiles fetched once in parallel with products — shared with form + all row pickers.
  const [profileOptions, setProfileOptions] = useState<ProfileOption[]>([])
  const [loading, setLoading]             = useState(true)
  const [showForm, setShowForm]           = useState(false)
  const [saving, setSaving]               = useState(false)
  const [error, setError]                 = useState('')
  const [search, setSearch]               = useState('')
  const [editingId, setEditingId]         = useState<number | null>(null)
  const [confirmDelete, setConfirmDelete] = useState<number | null>(null)
  const [deleting, setDeleting]           = useState(false)
  const [form, setForm]                   = useState({ ...EMPTY_FORM })
  const canInsert = useCan('insert', 'products')
  const canUpdate = useCan('update', 'products')
  const canDelete = useCan('delete', 'products')
  const supabase = createClient()

  async function load() {
    // Fetch products + profiles in parallel — select only displayed columns.
    const [p, pr] = await Promise.all([
      supabase
        .from('products')
        .select('id, product_id, name, business_type, product_type, brand, owner, owner_id, status, notes')
        .order('created_at', { ascending: false }),
      supabase
        .from('profiles')
        .select('id, name, role')
        .eq('approval_status', 'approved')
        .order('name'),
    ])
    setProducts(p.data || [])
    setProfileOptions(pr.data || [])
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  function resetForm() {
    setForm({ ...EMPTY_FORM })
    setEditingId(null)
    setError('')
  }

  function startEdit(p: any) {
    setEditingId(p.id)
    setForm({
      product_id:    p.product_id || '',
      name:          p.name || '',
      business_type: p.business_type || '',
      product_type:  p.product_type || '',
      brand:         p.brand || '',
      owner:         p.owner || '',
      owner_id:      p.owner_id || '',
      status:        p.status || 'กำลังพัฒนา',
      notes:         p.notes || '',
    })
    setShowForm(true)
    setError('')
  }

  async function save() {
    setSaving(true)
    setError('')
    if (!editingId && !PID_RE.test(form.product_id)) {
      setError('Product ID ต้องเป็นรูปแบบ XXX-YYY-NNN เช่น MED-PSY-002')
      setSaving(false)
      return
    }
    if (editingId) {
      // product_id is NOT updated — it is the FK referenced by contents/ads/sales.
      const { error: updErr } = await supabase.from('products').update({
        name:          form.name,
        business_type: form.business_type,
        product_type:  form.product_type,
        brand:         form.brand,
        owner:         form.owner,
        owner_id:      form.owner_id || null,
        status:        form.status,
        notes:         form.notes,
      }).eq('id', editingId)
      if (updErr) {
        setError(updErr.message)
        setSaving(false)
        return
      }
    } else {
      const { error: insErr } = await supabase.from('products').insert([{
        ...form,
        owner_id: form.owner_id || null,
      }])
      if (insErr) {
        setError(insErr.message)
        setSaving(false)
        return
      }
    }
    setShowForm(false)
    resetForm()
    await load()
    setSaving(false)
  }

  // Deleting a product CASCADE-deletes its contents, ads, sales and product_briefs.
  async function deleteRow(id: number) {
    setDeleting(true)
    const { error: delErr } = await supabase.from('products').delete().eq('id', id)
    setDeleting(false)
    if (delErr) {
      setError(delErr.message)
      return
    }
    setConfirmDelete(null)
    // Optimistic: remove from local state instead of full reload
    setProducts(prev => prev.filter(p => p.id !== id))
  }

  // Inline status change — optimistic update, revert on error.
  async function updateStatus(id: number, status: string) {
    const old = products.find(p => p.id === id)?.status
    setProducts(prev => prev.map(p => p.id === id ? { ...p, status } : p))
    const { error: updErr } = await supabase.from('products').update({ status }).eq('id', id)
    if (updErr) {
      setError(updErr.message)
      setProducts(prev => prev.map(p => p.id === id ? { ...p, status: old } : p))
    }
  }

  // Inline owner assignment — optimistic update, revert on error.
  async function updateOwner(id: number, owner_id: string, owner: string) {
    setProducts(prev => prev.map(p => p.id === id ? { ...p, owner_id, owner } : p))
    const { error: updErr } = await supabase.from('products').update({ owner_id: owner_id || null, owner }).eq('id', id)
    if (updErr) {
      setError(updErr.message)
      setProducts(prev => prev.map(p => p.id === id ? { ...p, owner_id, owner } : p))
      await load()
    }
  }

  const fields: [keyof typeof form, string][] = [
    ['product_id',    'Product ID (เช่น MED-PSY-002)'],
    ['name',          'ชื่อสินค้า'],
    ['business_type', 'ประเภทธุรกิจ'],
    ['product_type',  'ประเภทสินค้า'],
    ['brand',         'แบรนด์'],
  ]

  const pidInvalid = !editingId && form.product_id !== '' && !PID_RE.test(form.product_id)

  const filtered = useMemo(() => {
    if (!search) return products
    const q = search.toLowerCase()
    return products.filter(p =>
      (p.product_id || '').toLowerCase().includes(q)
      || (p.name || '').toLowerCase().includes(q)
      || (p.brand || '').toLowerCase().includes(q)
      || (p.owner || '').toLowerCase().includes(q),
    )
  }, [products, search])

  const headers = ['Product ID', 'ชื่อสินค้า', 'ประเภท', 'แบรนด์', 'ผู้รับผิดชอบ', 'สถานะ', 'หมายเหตุ', '']

  return (
    <div className="p-6 max-w-screen-xl mx-auto space-y-5">

      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-semibold text-gray-900">Products</h1>
          <p className="text-sm text-gray-400 mt-0.5">จัดการ Product ID และข้อมูลสินค้า</p>
        </div>
        {canInsert && (
          <button
            onClick={() => { if (editingId) resetForm(); setShowForm(v => !v) }}
            className="flex items-center gap-1.5 bg-gray-900 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-gray-700 transition-colors"
          >
            <IconPlus />
            {editingId ? 'แก้ไขสินค้า' : 'เพิ่มสินค้า'}
          </button>
        )}
      </div>

      {error && !showForm && (
        <p className="text-sm bg-red-50 text-red-600 border border-red-100 rounded-lg px-3.5 py-2.5">{error}</p>
      )}

      {/* Add / edit product form */}
      {showForm && (
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <h3 className="text-sm font-semibold text-gray-900 mb-4">{editingId ? 'แก้ไขสินค้า' : 'เพิ่มสินค้าใหม่'}</h3>
          <div className="grid grid-cols-2 gap-3">
            {fields.map(([key, placeholder]) => (
              <div key={key} className={key === 'product_id' ? 'relative' : ''}>
                <input
                  placeholder={placeholder}
                  value={form[key]}
                  disabled={key === 'product_id' && !!editingId}
                  onChange={e => setForm({ ...form, [key]: e.target.value })}
                  className={`w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gray-900 placeholder:text-gray-400 ${key === 'product_id' && editingId ? 'bg-gray-50 text-gray-400' : ''} ${key === 'product_id' && pidInvalid ? 'border-red-300 focus:ring-red-400' : ''}`}
                />
                {key === 'product_id' && pidInvalid && (
                  <p className="absolute -bottom-4 left-0 text-[10px] text-red-500">รูปแบบควรเป็น XXX-YYY-NNN</p>
                )}
                {key === 'product_id' && editingId && (
                  <p className="absolute -bottom-4 left-0 text-[10px] text-gray-400">เปลี่ยน Product ID ไม่ได้ (มีข้อมูลอ้างอิงอยู่)</p>
                )}
              </div>
            ))}
            {/* ProfilePicker receives profiles as a prop — no internal fetch */}
            <ProfilePicker
              value={form.owner_id}
              profiles={profileOptions}
              onChange={(id, name) => setForm({ ...form, owner_id: id, owner: name })}
              placeholder="ผู้รับผิดชอบ"
            />
            <select
              value={form.status}
              onChange={e => setForm({ ...form, status: e.target.value })}
              className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gray-900 bg-white"
            >
              {STATUS_OPTIONS.map(s => <option key={s}>{s}</option>)}
            </select>
            <input
              placeholder="หมายเหตุ"
              value={form.notes}
              onChange={e => setForm({ ...form, notes: e.target.value })}
              className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gray-900 placeholder:text-gray-400"
            />
          </div>
          {error && (
            <p className="text-sm bg-red-50 text-red-600 border border-red-100 rounded-lg px-3.5 py-2.5 mt-3">{error}</p>
          )}
          <div className="flex gap-2 mt-4">
            <button
              onClick={save}
              disabled={saving || (!editingId && (!form.product_id || !form.name)) || (!!editingId && !form.name)}
              className="bg-gray-900 text-white px-4 py-2 rounded-lg text-sm font-medium disabled:opacity-40 hover:bg-gray-700 transition-colors"
            >
              {saving ? 'กำลังบันทึก...' : editingId ? 'บันทึกการแก้ไข' : 'บันทึก'}
            </button>
            <button
              onClick={() => { setShowForm(false); resetForm() }}
              className="text-sm text-gray-400 px-4 py-2 rounded-lg hover:bg-gray-100 transition-colors"
            >
              ยกเลิก
            </button>
          </div>
        </div>
      )}

      {/* Table */}
      <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
        <div className="px-5 py-3 border-b border-gray-100 flex items-center justify-between gap-3">
          <SearchInput value={search} onChange={setSearch} placeholder="ค้นหา Product ID, ชื่อ, แบรนด์, ผู้รับผิดชอบ..." />
          <span className="text-xs text-gray-400 whitespace-nowrap">{filtered.length} รายการ</span>
        </div>
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
                <TableSkeleton cols={headers.length} />
              ) : filtered.length === 0 ? (
                <EmptyState message="ยังไม่มี Product ในระบบ กด &quot;เพิ่มสินค้า&quot; เพื่อเริ่ม" />
              ) : filtered.map(p => (
                <tr key={p.id} className="border-b border-gray-50 hover:bg-gray-50 transition-colors last:border-0">
                  <td className="px-4 py-3 font-mono text-xs text-gray-400">{p.product_id}</td>
                  <td className="px-4 py-3 font-medium text-gray-900 max-w-[180px] truncate">{p.name}</td>
                  <td className="px-4 py-3 text-sm text-gray-500">{p.product_type}</td>
                  <td className="px-4 py-3 text-sm text-gray-500">{p.brand}</td>
                  <td className="px-4 py-3 text-sm text-gray-500">
                    {/* profiles prop — single array shared by all rows, no per-row DB call */}
                    <InlinePersonPicker
                      value={p.owner_id || ''}
                      display={p.owner || ''}
                      profiles={profileOptions}
                      disabled={!canUpdate}
                      onChange={(id, name) => updateOwner(p.id, id, name)}
                    />
                  </td>
                  <td className="px-4 py-3">
                    <StatusSelect
                      value={p.status}
                      options={STATUS_OPTIONS}
                      styleMap={statusStyle}
                      disabled={!canUpdate}
                      onChange={v => updateStatus(p.id, v)}
                    />
                  </td>
                  <td className="px-4 py-3 text-xs text-gray-400 max-w-[160px] truncate">{p.notes}</td>
                  <td className="px-4 py-3 whitespace-nowrap text-right">
                    <div className="flex items-center justify-end gap-2">
                      {canUpdate && (
                        <button
                          onClick={() => { startEdit(p); setShowForm(true) }}
                          className="text-xs text-gray-400 hover:text-gray-900 transition-colors"
                        >
                          แก้ไข
                        </button>
                      )}
                      {canDelete && (
                        confirmDelete === p.id ? (
                          <div className="flex items-center gap-1">
                            <span className="text-[10px] text-red-500">ลบ?</span>
                            <button
                              onClick={() => deleteRow(p.id)}
                              disabled={deleting}
                              className="text-[11px] bg-red-500 text-white px-2 py-0.5 rounded hover:bg-red-600 transition-colors disabled:opacity-40"
                            >
                              {deleting ? '...' : 'ยืนยัน'}
                            </button>
                            <button
                              onClick={() => setConfirmDelete(null)}
                              className="text-[11px] text-gray-400 px-1.5 py-0.5 rounded hover:bg-gray-100 transition-colors"
                            >
                              ยกเลิก
                            </button>
                          </div>
                        ) : (
                          <button
                            onClick={() => setConfirmDelete(p.id)}
                            className="text-xs text-gray-400 hover:text-red-500 transition-colors"
                          >
                            ลบ
                          </button>
                        )
                      )}
                      {!canUpdate && !canDelete && <span className="text-xs text-gray-300">—</span>}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {canDelete && confirmDelete !== null && (
        <p className="text-xs text-amber-600 bg-amber-50 border border-amber-100 rounded-lg px-3 py-2">
          การลบ Product จะลบ Content, Ads, Sales และ Product Brief ที่เกี่ยวข้องทั้งหมดด้วย
        </p>
      )}
    </div>
  )
}
