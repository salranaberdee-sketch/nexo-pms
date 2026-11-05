'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase'

const STATUS_OPTIONS = ['กำลังพัฒนา', 'เตรียมเปิดตัว', 'เปิดขาย', 'หยุดขาย']

const statusStyle: Record<string, string> = {
  'เปิดขาย':       'bg-green-50 text-green-700',
  'เตรียมเปิดตัว': 'bg-amber-50 text-amber-700',
  'กำลังพัฒนา':   'bg-blue-50 text-blue-700',
  'หยุดขาย':       'bg-gray-100 text-gray-400',
}

function IconPlus() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
      <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
    </svg>
  )
}

export default function Products() {
  const [products, setProducts]   = useState<any[]>([])
  const [loading, setLoading]     = useState(true)
  const [showForm, setShowForm]   = useState(false)
  const [saving, setSaving]       = useState(false)
  const [form, setForm] = useState({
    product_id: '', name: '', business_type: '', product_type: '',
    brand: '', owner: '', status: 'กำลังพัฒนา', notes: '',
  })
  const supabase = createClient()

  async function load() {
    const { data } = await supabase.from('products').select('*').order('created_at', { ascending: false })
    setProducts(data || [])
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  async function save() {
    setSaving(true)
    await supabase.from('products').insert([form])
    setShowForm(false)
    setForm({ product_id: '', name: '', business_type: '', product_type: '', brand: '', owner: '', status: 'กำลังพัฒนา', notes: '' })
    await load()
    setSaving(false)
  }

  const fields: [keyof typeof form, string][] = [
    ['product_id',    'Product ID (เช่น MED-PSY-002)'],
    ['name',          'ชื่อสินค้า'],
    ['business_type', 'ประเภทธุรกิจ'],
    ['product_type',  'ประเภทสินค้า'],
    ['brand',         'แบรนด์'],
    ['owner',         'ผู้รับผิดชอบ'],
  ]

  return (
    <div className="p-6 max-w-screen-xl mx-auto space-y-5">

      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-semibold text-gray-900">Products</h1>
          <p className="text-sm text-gray-400 mt-0.5">จัดการ Product ID และข้อมูลสินค้า</p>
        </div>
        <button
          onClick={() => setShowForm(v => !v)}
          className="flex items-center gap-1.5 bg-gray-900 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-gray-700 transition-colors"
        >
          <IconPlus />
          เพิ่มสินค้า
        </button>
      </div>

      {/* Add product form */}
      {showForm && (
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <h3 className="text-sm font-semibold text-gray-900 mb-4">เพิ่มสินค้าใหม่</h3>
          <div className="grid grid-cols-2 gap-3">
            {fields.map(([key, placeholder]) => (
              <input
                key={key}
                placeholder={placeholder}
                value={form[key]}
                onChange={e => setForm({ ...form, [key]: e.target.value })}
                className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gray-900 placeholder:text-gray-400"
              />
            ))}
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
          <div className="flex gap-2 mt-4">
            <button
              onClick={save}
              disabled={saving || !form.product_id || !form.name}
              className="bg-gray-900 text-white px-4 py-2 rounded-lg text-sm font-medium disabled:opacity-40 hover:bg-gray-700 transition-colors"
            >
              {saving ? 'กำลังบันทึก...' : 'บันทึก'}
            </button>
            <button
              onClick={() => setShowForm(false)}
              className="text-sm text-gray-400 px-4 py-2 rounded-lg hover:bg-gray-100 transition-colors"
            >
              ยกเลิก
            </button>
          </div>
        </div>
      )}

      {/* Table */}
      <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100">
                {['Product ID', 'ชื่อสินค้า', 'ประเภท', 'แบรนด์', 'ผู้รับผิดชอบ', 'สถานะ', 'หมายเหตุ'].map(h => (
                  <th key={h} className="text-left px-4 py-3 text-xs font-medium text-gray-400">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={7} className="px-4 py-10 text-center text-sm text-gray-400">กำลังโหลด...</td>
                </tr>
              ) : products.map(p => (
                <tr key={p.id} className="border-b border-gray-50 hover:bg-gray-50 transition-colors last:border-0">
                  <td className="px-4 py-3 font-mono text-xs text-gray-400">{p.product_id}</td>
                  <td className="px-4 py-3 font-medium text-gray-900 max-w-[180px] truncate">{p.name}</td>
                  <td className="px-4 py-3 text-sm text-gray-500">{p.product_type}</td>
                  <td className="px-4 py-3 text-sm text-gray-500">{p.brand}</td>
                  <td className="px-4 py-3 text-sm text-gray-500">{p.owner}</td>
                  <td className="px-4 py-3">
                    <span className={`inline-block px-2 py-0.5 rounded-md text-xs font-medium ${statusStyle[p.status] || 'bg-gray-100 text-gray-400'}`}>
                      {p.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-xs text-gray-400 max-w-[160px] truncate">{p.notes}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
