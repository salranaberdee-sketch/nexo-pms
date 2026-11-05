'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase'
import { useCan } from '@/lib/profile-context'
import ProfilePicker from './ProfilePicker'

const STATUSES = ['รอผลิต', 'ผลิตอยู่', 'รออนุมัติ', 'อนุมัติแล้ว', 'กำหนดโพสต์', 'โพสต์แล้ว']
const TYPES    = ['GRAPHIC', 'VIDEO', 'COPY']

const statusStyle: Record<string, string> = {
  'รอผลิต':       'bg-gray-100 text-gray-500',
  'ผลิตอยู่':      'bg-blue-50 text-blue-700',
  'รออนุมัติ':    'bg-amber-50 text-amber-700',
  'อนุมัติแล้ว':  'bg-purple-50 text-purple-700',
  'กำหนดโพสต์':  'bg-orange-50 text-orange-700',
  'โพสต์แล้ว':   'bg-green-50 text-green-700',
}

const typeLabel: Record<string, string> = {
  GRAPHIC: 'Graphic',
  VIDEO:   'Video',
  COPY:    'Copy',
}

function IconPlus() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
      <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
    </svg>
  )
}

export default function Contents() {
  const [contents, setContents]         = useState<any[]>([])
  const [products, setProducts]         = useState<any[]>([])
  const [filterProduct, setFilterProduct] = useState('all')
  const [filterStatus, setFilterStatus]   = useState('all')
  const [loading, setLoading]           = useState(true)
  const [showForm, setShowForm]         = useState(false)
  const [saving, setSaving]             = useState(false)
  const [error, setError]               = useState('')
  const [form, setForm] = useState({
    product_id: '', seq: '', type: 'GRAPHIC', title: '',
    objective: '', channel: 'Facebook', hook: '', format_size: '',
    assigned_to: '', assigned_to_id: '', deadline: '', status: 'รอผลิต',
  })
  const canInsert = useCan('insert', 'contents')
  const canUpdate = useCan('update', 'contents')
  const supabase = createClient()

  async function load() {
    const [c, p] = await Promise.all([
      supabase.from('contents').select('*').order('product_id').order('seq'),
      supabase.from('products').select('product_id, name'),
    ])
    setContents(c.data || [])
    setProducts(p.data || [])
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  async function save() {
    setSaving(true)
    setError('')
    const { error: insErr } = await supabase.from('contents').insert([{
      ...form,
      assigned_to_id: form.assigned_to_id || null,
      seq: Number(form.seq) || 1,
    }])
    if (insErr) {
      setError(insErr.message)
      setSaving(false)
      return
    }
    setShowForm(false)
    setForm({ product_id: '', seq: '', type: 'GRAPHIC', title: '', objective: '', channel: 'Facebook', hook: '', format_size: '', assigned_to: '', assigned_to_id: '', deadline: '', status: 'รอผลิต' })
    await load()
    setSaving(false)
  }

  async function updateStatus(id: number, status: string) {
    const { error: updErr } = await supabase.from('contents').update({ status }).eq('id', id)
    if (updErr) return
    setContents(prev => prev.map(c => c.id === id ? { ...c, status } : c))
  }

  const filtered = contents.filter(c =>
    (filterProduct === 'all' || c.product_id === filterProduct) &&
    (filterStatus === 'all' || c.status === filterStatus)
  )

  const countByStatus = STATUSES.reduce((acc, s) => ({
    ...acc, [s]: contents.filter(c => c.status === s).length,
  }), {} as Record<string, number>)

  return (
    <div className="p-6 max-w-screen-xl mx-auto space-y-5">

      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-semibold text-gray-900">Content</h1>
          <p className="text-sm text-gray-400 mt-0.5">ติดตามสถานะการผลิต Content ทุกชิ้น</p>
        </div>
        {canInsert && (
          <button
            onClick={() => setShowForm(v => !v)}
            className="flex items-center gap-1.5 bg-gray-900 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-gray-700 transition-colors"
          >
            <IconPlus />
            เพิ่ม Content
          </button>
        )}
      </div>

      {/* Add content form */}
      {showForm && (
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <h3 className="text-sm font-semibold text-gray-900 mb-4">เพิ่ม Content ใหม่</h3>
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
              type="number" placeholder="ลำดับ (seq)" value={form.seq}
              onChange={e => setForm({ ...form, seq: e.target.value })}
              className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gray-900 placeholder:text-gray-400"
            />
            <select
              value={form.type}
              onChange={e => setForm({ ...form, type: e.target.value })}
              className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gray-900 bg-white"
            >
              {TYPES.map(t => <option key={t}>{t}</option>)}
            </select>
            <input
              placeholder="ชื่อ Content" value={form.title}
              onChange={e => setForm({ ...form, title: e.target.value })}
              className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gray-900 placeholder:text-gray-400"
            />
            <input
              placeholder="วัตถุประสงค์" value={form.objective}
              onChange={e => setForm({ ...form, objective: e.target.value })}
              className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gray-900 placeholder:text-gray-400"
            />
            <input
              placeholder="ช่องทาง" value={form.channel}
              onChange={e => setForm({ ...form, channel: e.target.value })}
              className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gray-900 placeholder:text-gray-400"
            />
            <input
              placeholder="Hook" value={form.hook}
              onChange={e => setForm({ ...form, hook: e.target.value })}
              className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gray-900 placeholder:text-gray-400"
            />
            <input
              placeholder="Format/ขนาด" value={form.format_size}
              onChange={e => setForm({ ...form, format_size: e.target.value })}
              className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gray-900 placeholder:text-gray-400"
            />
            <ProfilePicker
              value={form.assigned_to_id}
              onChange={(id, name) => setForm({ ...form, assigned_to_id: id, assigned_to: name })}
              placeholder="มอบหมายให้"
            />
            <input
              type="date" value={form.deadline}
              onChange={e => setForm({ ...form, deadline: e.target.value })}
              className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gray-900"
            />
            <select
              value={form.status}
              onChange={e => setForm({ ...form, status: e.target.value })}
              className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gray-900 bg-white"
            >
              {STATUSES.map(s => <option key={s}>{s}</option>)}
            </select>
          </div>
          {error && (
            <p className="text-sm bg-red-50 text-red-600 border border-red-100 rounded-lg px-3.5 py-2.5 mt-3">{error}</p>
          )}
          <div className="flex gap-2 mt-4">
            <button
              onClick={save}
              disabled={saving || !form.product_id || !form.title}
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

      {/* Status summary pills */}
      <div className="flex gap-2 flex-wrap">
        {STATUSES.map(s => (
          <button
            key={s}
            onClick={() => setFilterStatus(filterStatus === s ? 'all' : s)}
            className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors border
              ${filterStatus === s
                ? statusStyle[s] + ' border-current/20'
                : 'bg-white border-gray-200 text-gray-500 hover:bg-gray-50'}`}
          >
            {s}
            <span className="ml-1.5 tabular-nums opacity-60">{countByStatus[s] || 0}</span>
          </button>
        ))}
      </div>

      {/* Filters */}
      <div className="flex gap-2">
        <select
          value={filterProduct}
          onChange={e => setFilterProduct(e.target.value)}
          className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gray-900 bg-white text-gray-700"
        >
          <option value="all">ทุก Product</option>
          {products.map(p => <option key={p.product_id} value={p.product_id}>{p.product_id}</option>)}
        </select>
        <select
          value={filterStatus}
          onChange={e => setFilterStatus(e.target.value)}
          className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gray-900 bg-white text-gray-700"
        >
          <option value="all">ทุกสถานะ</option>
          {STATUSES.map(s => <option key={s}>{s}</option>)}
        </select>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
        <div className="px-5 py-3 border-b border-gray-100 flex items-center justify-between">
          <span className="text-xs text-gray-400">{filtered.length} รายการ</span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100">
                {['#', 'Product', 'ประเภท', 'ชื่อ Content', 'วัตถุประสงค์', 'Hook', 'Format', 'ผู้รับผิดชอบ', 'สถานะ', 'อัปเดต'].map(h => (
                  <th key={h} className="text-left px-4 py-3 text-xs font-medium text-gray-400 whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={10} className="px-4 py-10 text-center text-sm text-gray-400">กำลังโหลด...</td>
                </tr>
              ) : filtered.map(c => (
                <tr key={c.id} className="border-b border-gray-50 hover:bg-gray-50 transition-colors last:border-0">
                  <td className="px-4 py-3 text-xs text-gray-400 tabular-nums">{c.seq}</td>
                  <td className="px-4 py-3 font-mono text-xs text-gray-400">{c.product_id}</td>
                  <td className="px-4 py-3">
                    <span className="text-xs font-medium text-gray-500 bg-gray-100 px-1.5 py-0.5 rounded">
                      {typeLabel[c.type] || c.type}
                    </span>
                  </td>
                  <td className="px-4 py-3 font-medium text-gray-900 max-w-[160px] truncate">{c.title}</td>
                  <td className="px-4 py-3 text-xs text-gray-400 max-w-[100px] truncate">{c.objective}</td>
                  <td className="px-4 py-3 text-xs text-gray-400 max-w-[140px] truncate">{c.hook}</td>
                  <td className="px-4 py-3 text-xs text-gray-400 whitespace-nowrap">{c.format_size}</td>
                  <td className="px-4 py-3 text-xs text-gray-500 whitespace-nowrap">{c.assigned_to || '—'}</td>
                  <td className="px-4 py-3">
                    <span className={`inline-block px-2 py-0.5 rounded-md text-xs font-medium whitespace-nowrap ${statusStyle[c.status]}`}>
                      {c.status}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    {canUpdate ? (
                      <select
                        value={c.status}
                        onChange={e => updateStatus(c.id, e.target.value)}
                        className="border border-gray-200 rounded-lg px-2 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-gray-900 bg-white text-gray-700"
                      >
                        {STATUSES.map(s => <option key={s}>{s}</option>)}
                      </select>
                    ) : (
                      <span className="text-xs text-gray-300">—</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
