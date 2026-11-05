'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase'
import { useCan } from '@/lib/profile-context'
import ProfilePicker from './ProfilePicker'

function IconPlus() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
      <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
    </svg>
  )
}

export default function Ads() {
  const [ads, setAds]           = useState<any[]>([])
  const [products, setProducts] = useState<any[]>([])
  const [loading, setLoading]   = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [saving, setSaving]     = useState(false)
  const [error, setError]       = useState('')
  const [form, setForm] = useState({
    product_id: '', month: '', campaign_name: '', channel: 'Facebook',
    budget_approved: '', budget_allocated: '', content_ref: '',
    managed_by: '', managed_by_id: '', start_date: '', end_date: '', result_notes: '',
  })
  const canInsert = useCan('insert', 'ads')
  const supabase = createClient()

  async function load() {
    const [a, p] = await Promise.all([
      supabase.from('ads').select('*').order('product_id'),
      supabase.from('products').select('product_id, name'),
    ])
    setAds(a.data || [])
    setProducts(p.data || [])
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
  }

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
            <ProfilePicker
              value={form.managed_by_id}
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
