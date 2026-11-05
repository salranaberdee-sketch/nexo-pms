'use client'

import { useEffect, useState, useMemo } from 'react'
import { createClient } from '@/lib/supabase'
import { useCan } from '@/lib/profile-context'
import ProfilePicker from './ProfilePicker'
import SearchInput from './SearchInput'
import { TableSkeleton, EmptyState } from './TableState'
import InlinePersonPicker, { type ProfileOption } from './InlinePersonPicker'
import { showToast } from './Toast'

function IconPlus() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
      <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
    </svg>
  )
}

// Module-level numeric input — must NOT be defined inside the component render,
// otherwise React remounts it on each keystroke and the field loses focus.
function NumInput({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  return (
    <input
      type="number"
      value={value}
      onChange={e => onChange(e.target.value)}
      className="w-24 border border-gray-300 rounded-lg px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-gray-900"
    />
  )
}

export default function Ads() {
  const [ads, setAds]           = useState<any[]>([])
  const [products, setProducts] = useState<any[]>([])
  // Profiles fetched once in parallel with ads — shared with form + all row pickers.
  const [profileOptions, setProfileOptions] = useState<ProfileOption[]>([])
  const [loading, setLoading]   = useState(true)
  const [loadError, setLoadError] = useState('')
  const [showForm, setShowForm] = useState(false)
  const [saving, setSaving]     = useState(false)
  const [error, setError]       = useState('')
  const [search, setSearch]     = useState('')
  const [filterMonth, setFilterMonth] = useState('all')
  const [editing, setEditing]   = useState<number | null>(null)
  const [savingRow, setSavingRow] = useState(false)
  const [editVal, setEditVal]   = useState({ reach: '', clicks: '', leads: '', budget_spent: '', sales_amount: '' })
  const [form, setForm] = useState({
    product_id: '', month: '', campaign_name: '', channel: 'Facebook',
    budget_approved: '', budget_allocated: '', content_ref: '',
    managed_by: '', managed_by_id: '', start_date: '', end_date: '', result_notes: '',
  })
  const canInsert = useCan('insert', 'ads')
  const canUpdate = useCan('update', 'ads')
  const supabase = createClient()

  async function load() {
    setLoadError('')
    const [a, p, pr] = await Promise.all([
      supabase
        .from('ads')
        .select('id, product_id, month, campaign_name, channel, managed_by, managed_by_id, budget_allocated, budget_spent, budget_total, budget_remaining, reach, clicks, leads, cpl, roas, sales_amount, result_notes')
        .order('month', { ascending: false }).order('product_id'),
      supabase.from('products').select('product_id, name'),
      supabase.from('profiles').select('id, name, role').eq('approval_status', 'approved').order('name'),
    ])
    if (a.error) { setLoadError(a.error.message); setLoading(false); return }
    setAds(a.data || [])
    setProducts(p.data || [])
    setProfileOptions(pr.data || [])
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  async function save() {
    setSaving(true)
    setError('')
    const { error: insErr } = await supabase.from('ads').insert([{
      product_id:      form.product_id,
      month:           form.month,
      campaign_name:   form.campaign_name,
      channel:         form.channel,
      budget_approved: Number(form.budget_approved) || 0,
      budget_allocated: Number(form.budget_allocated) || 0,
      content_ref:     form.content_ref,
      managed_by:      form.managed_by,
      managed_by_id:   form.managed_by_id || null,
      start_date:      form.start_date || null,
      end_date:        form.end_date || null,
      result_notes:    form.result_notes,
    }])
    if (insErr) {
      setError(insErr.message)
      setSaving(false)
      return
    }
    setShowForm(false)
    setForm({ product_id: '', month: '', campaign_name: '', channel: 'Facebook', budget_approved: '', budget_allocated: '', content_ref: '', managed_by: '', managed_by_id: '', start_date: '', end_date: '', result_notes: '' })
    await load()
    setSaving(false)
    showToast('เพิ่มแคมเปญแล้ว')
  }

  function startEdit(a: any) {
    setEditing(a.id)
    setEditVal({
      reach:        String(a.reach ?? 0),
      clicks:       String(a.clicks ?? 0),
      leads:        String(a.leads ?? 0),
      budget_spent: String(a.budget_spent ?? 0),
      sales_amount: String(a.sales_amount ?? 0),
    })
    setError('')
  }

  // Inline manager assignment — optimistic update, revert on error.
  async function updateManager(id: number, managed_by_id: string, managed_by: string) {
    setAds(prev => prev.map(a => a.id === id ? { ...a, managed_by_id, managed_by } : a))
    const { error: updErr } = await supabase.from('ads').update({
      managed_by_id: managed_by_id || null,
      managed_by,
    }).eq('id', id)
    if (updErr) {
      setError(updErr.message)
      await load()
    }
  }

  // Inline-edit performance metrics. Generated columns (budget_remaining, cpl, roas)
  // recompute in the DB automatically, so we reload to refresh them.
  async function saveEdit(id: number) {
    setSavingRow(true)
    const { error: updErr } = await supabase.from('ads').update({
      reach:        Number(editVal.reach) || 0,
      clicks:       Number(editVal.clicks) || 0,
      leads:        Number(editVal.leads) || 0,
      budget_spent: Number(editVal.budget_spent) || 0,
      sales_amount: Number(editVal.sales_amount) || 0,
    }).eq('id', id)
    setSavingRow(false)
    if (updErr) {
      setError(updErr.message)
      return
    }
    setEditing(null)
    setError('')
    await load()
    showToast('บันทึกผลแล้ว')
  }

  // Summary totals — memoized so they only recompute when ads data changes.
  // Unique sorted months for filter dropdown
  const months = useMemo(() => Array.from(new Set(ads.map(a => a.month).filter(Boolean))).sort().reverse(), [ads])

  const totalBudget = useMemo(() => ads.reduce((s, r) => s + Number(r.budget_total ?? 0), 0), [ads])
  const totalSpent  = useMemo(() => ads.reduce((s, r) => s + Number(r.budget_spent), 0), [ads])
  const totalLeads  = useMemo(() => ads.reduce((s, r) => s + Number(r.leads), 0), [ads])
  const totalReach  = useMemo(() => ads.reduce((s, r) => s + Number(r.reach), 0), [ads])
  const spentPct    = totalBudget > 0 ? Math.round((totalSpent / totalBudget) * 100) : 0

  const summaryCards = useMemo(() => [
    { label: 'งบทั้งหมด',   value: `฿${totalBudget.toLocaleString()}`, meta: `${ads.length} campaigns` },
    { label: 'ใช้จ่ายแล้ว', value: `฿${totalSpent.toLocaleString()}`,  meta: `${spentPct}% ของงบ` },
    { label: 'Reach รวม',   value: totalReach.toLocaleString(),         meta: 'impressions' },
    { label: 'Leads รวม',   value: totalLeads.toLocaleString(),         meta: 'leads' },
  ], [totalBudget, totalSpent, spentPct, totalReach, totalLeads, ads.length])

  const filtered = useMemo(() => {
    let list = filterMonth === 'all' ? ads : ads.filter(a => a.month === filterMonth)
    if (!search) return list
    const q = search.toLowerCase()
    return list.filter(a =>
      (a.product_id || '').toLowerCase().includes(q)
      || (a.campaign_name || '').toLowerCase().includes(q)
      || (a.channel || '').toLowerCase().includes(q),
    )
  }, [ads, search, filterMonth])

  const headers = ['Product', 'เดือน', 'Campaign', 'ช่องทาง', 'ผู้ดูแล', 'งบจัดสรร', 'ใช้จริง', 'คงเหลือ', 'Reach', 'Clicks', 'Leads', 'CPL', 'ROAS', 'ยอดขาย', 'บันทึก', '']

  return (
    <div className="p-6 max-w-screen-xl mx-auto space-y-5">

      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-semibold text-gray-900">Ads</h1>
          <p className="text-sm text-gray-400 mt-0.5">ติดตามแคมเปญโฆษณาและ ROI</p>
        </div>
        {canInsert && (
          <button
            onClick={() => setShowForm(v => !v)}
            className="flex items-center gap-1.5 bg-gray-900 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-gray-700 transition-colors"
          >
            <IconPlus />
            เพิ่มแคมเปญ
          </button>
        )}
      </div>

      {loadError && (
        <div className="bg-red-50 border border-red-100 rounded-xl px-4 py-3 text-sm text-red-600">
          โหลดข้อมูลไม่สำเร็จ: {loadError}
          <button onClick={load} className="ml-3 underline text-red-500 hover:text-red-700">ลองใหม่</button>
        </div>
      )}
      {error && !showForm && (
        <p className="text-sm bg-red-50 text-red-600 border border-red-100 rounded-lg px-3.5 py-2.5">{error}</p>
      )}

      {/* Add ad form */}
      {showForm && (
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <h3 className="text-sm font-semibold text-gray-900 mb-4">เพิ่มแคมเปญโฆษณาใหม่</h3>
          <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
            <select
              value={form.product_id}
              onChange={e => setForm({ ...form, product_id: e.target.value })}
              className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gray-900 bg-white"
            >
              <option value="">เลือก Product</option>
              {products.map(p => <option key={p.product_id} value={p.product_id}>{p.product_id}</option>)}
            </select>
            <input
              placeholder="เดือน (เช่น 2026-11)" value={form.month}
              onChange={e => setForm({ ...form, month: e.target.value })}
              className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gray-900 placeholder:text-gray-400"
            />
            <input
              placeholder="ชื่อแคมเปญ" value={form.campaign_name}
              onChange={e => setForm({ ...form, campaign_name: e.target.value })}
              className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gray-900 placeholder:text-gray-400"
            />
            <input
              placeholder="ช่องทาง" value={form.channel}
              onChange={e => setForm({ ...form, channel: e.target.value })}
              className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gray-900 placeholder:text-gray-400"
            />
            <input
              type="number" placeholder="งบที่อนุมัติ (฿)" value={form.budget_approved}
              onChange={e => setForm({ ...form, budget_approved: e.target.value })}
              className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gray-900 placeholder:text-gray-400"
            />
            <input
              type="number" placeholder="งบจัดสรร (฿)" value={form.budget_allocated}
              onChange={e => setForm({ ...form, budget_allocated: e.target.value })}
              className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gray-900 placeholder:text-gray-400"
            />
            <input
              placeholder="อ้างอิง Content" value={form.content_ref}
              onChange={e => setForm({ ...form, content_ref: e.target.value })}
              className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gray-900 placeholder:text-gray-400"
            />
            {/* ProfilePicker receives profiles as a prop — no internal fetch */}
            <ProfilePicker
              value={form.managed_by_id}
              profiles={profileOptions}
              onChange={(id, name) => setForm({ ...form, managed_by_id: id, managed_by: name })}
              placeholder="ผู้ดูแล"
            />
            <input
              type="date" value={form.start_date}
              onChange={e => setForm({ ...form, start_date: e.target.value })}
              className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gray-900"
            />
            <input
              type="date" value={form.end_date}
              onChange={e => setForm({ ...form, end_date: e.target.value })}
              className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gray-900"
            />
            <input
              placeholder="หมายเหตุผล" value={form.result_notes}
              onChange={e => setForm({ ...form, result_notes: e.target.value })}
              className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gray-900 placeholder:text-gray-400"
            />
          </div>
          {error && (
            <p className="text-sm bg-red-50 text-red-600 border border-red-100 rounded-lg px-3.5 py-2.5 mt-3">{error}</p>
          )}
          <div className="flex gap-2 mt-4">
            <button
              onClick={save}
              disabled={saving || !form.product_id || !form.campaign_name || !form.month}
              className="bg-gray-900 text-white px-4 py-2 rounded-lg text-sm font-medium disabled:opacity-40 hover:bg-gray-700 transition-colors"
            >
              {saving ? 'กำลังบันทึก...' : 'บันทึก'}
            </button>
            <button
              onClick={() => { setShowForm(false); setError('') }}
              className="text-sm text-gray-400 px-4 py-2 rounded-lg hover:bg-gray-100 transition-colors"
            >
              ยกเลิก
            </button>
          </div>
        </div>
      )}

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
        <div className="px-5 py-3 border-b border-gray-100 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2 flex-1">
            <SearchInput value={search} onChange={setSearch} placeholder="ค้นหาแคมเปญ, Product, ช่องทาง..." />
            {months.length > 0 && (
              <select value={filterMonth} onChange={e => setFilterMonth(e.target.value)}
                className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gray-900 bg-white text-gray-700 shrink-0">
                <option value="all">ทุกเดือน</option>
                {months.map(m => <option key={m} value={m}>{m}</option>)}
              </select>
            )}
          </div>
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
                <EmptyState message="ยังไม่มีแคมเปญ กด &quot;เพิ่มแคมเปญ&quot; เพื่อเริ่ม" />
              ) : filtered.map(a => {
                const allocated = Number(a.budget_allocated || 0)
                const spent = Number(a.budget_spent || 0)
                const over = spent > allocated
                const roas = Number(a.roas || 0)
                const roasColor = roas >= 2 ? 'text-green-600' : roas >= 1 ? 'text-gray-900' : roas > 0 ? 'text-red-500' : 'text-gray-300'
                const isEditing = editing === a.id
                return (
                  <tr key={a.id} className="border-b border-gray-50 hover:bg-gray-50 transition-colors last:border-0">
                    <td className="px-4 py-3 font-mono text-xs text-gray-400">{a.product_id}</td>
                    <td className="px-4 py-3 text-xs text-gray-400 whitespace-nowrap">{a.month}</td>
                    <td className="px-4 py-3 font-medium text-gray-900 max-w-[140px] truncate">{a.campaign_name}</td>
                    <td className="px-4 py-3 text-sm text-gray-500">{a.channel}</td>
                    {/* managed_by — inline person picker, profiles passed as prop */}
                    <td className="px-4 py-3">
                      <InlinePersonPicker
                        value={a.managed_by_id || ''}
                        display={a.managed_by || ''}
                        profiles={profileOptions}
                        disabled={!canUpdate}
                        onChange={(id, name) => updateManager(a.id, id, name)}
                      />
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600 tabular-nums">฿{allocated.toLocaleString()}</td>
                    <td className={`px-4 py-3 tabular-nums ${over && !isEditing ? 'bg-red-50' : ''}`}>
                      {isEditing ? (
                        <NumInput value={editVal.budget_spent} onChange={v => setEditVal({ ...editVal, budget_spent: v })} />
                      ) : (
                        <div className="flex items-center gap-1">
                          <span className={`text-sm tabular-nums ${over ? 'text-red-600 font-medium' : 'text-red-500'}`}>฿{spent.toLocaleString()}</span>
                          {over && <span className="text-[10px] bg-red-100 text-red-600 px-1 py-0.5 rounded whitespace-nowrap">เกินงบ</span>}
                        </div>
                      )}
                    </td>
                    <td className="px-4 py-3 text-sm text-green-600 tabular-nums">฿{Number(a.budget_remaining).toLocaleString()}</td>
                    <td className="px-4 py-3 tabular-nums">
                      {isEditing
                        ? <NumInput value={editVal.reach} onChange={v => setEditVal({ ...editVal, reach: v })} />
                        : <span className="text-sm text-gray-500">{Number(a.reach).toLocaleString()}</span>
                      }
                    </td>
                    <td className="px-4 py-3 tabular-nums">
                      {isEditing
                        ? <NumInput value={editVal.clicks} onChange={v => setEditVal({ ...editVal, clicks: v })} />
                        : <span className="text-sm text-gray-500">{Number(a.clicks).toLocaleString()}</span>
                      }
                    </td>
                    <td className="px-4 py-3 tabular-nums">
                      {isEditing
                        ? <NumInput value={editVal.leads} onChange={v => setEditVal({ ...editVal, leads: v })} />
                        : <span className="text-sm font-medium text-gray-900">{Number(a.leads).toLocaleString()}</span>
                      }
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-500 tabular-nums">฿{Number(a.cpl).toLocaleString()}</td>
                    <td className={`px-4 py-3 text-sm tabular-nums ${roasColor}`}>
                      {roas > 0 ? `${roas.toFixed(2)}×` : '—'}
                    </td>
                    <td className="px-4 py-3 tabular-nums">
                      {isEditing
                        ? <NumInput value={editVal.sales_amount} onChange={v => setEditVal({ ...editVal, sales_amount: v })} />
                        : <span className="text-sm text-gray-500">฿{Number(a.sales_amount).toLocaleString()}</span>
                      }
                    </td>
                    <td className="px-4 py-3 text-xs text-gray-400 max-w-[100px] truncate">{a.result_notes}</td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      {isEditing ? (
                        <div className="flex gap-1">
                          <button
                            onClick={() => saveEdit(a.id)}
                            disabled={savingRow}
                            className="text-xs bg-gray-900 text-white px-2.5 py-1 rounded-lg hover:bg-gray-700 transition-colors disabled:opacity-40"
                          >
                            {savingRow ? '...' : 'บันทึก'}
                          </button>
                          <button
                            onClick={() => { setEditing(null); setError('') }}
                            className="text-xs text-gray-400 px-2 py-1 rounded-lg hover:bg-gray-100 transition-colors"
                          >
                            ยกเลิก
                          </button>
                        </div>
                      ) : canUpdate ? (
                        <button
                          onClick={() => startEdit(a)}
                          className="text-xs text-gray-400 hover:text-gray-900 transition-colors"
                        >
                          แก้ไข
                        </button>
                      ) : (
                        <span className="text-xs text-gray-300">—</span>
                      )}
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
