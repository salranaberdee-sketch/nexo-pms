'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase'

const STATUSES = ['รอผลิต', 'ผลิตอยู่', 'รออนุมัติ', 'อนุมัติแล้ว', 'กำหนดโพสต์', 'โพสต์แล้ว']

const statusStyle: Record<string, string> = {
  'รอผลิต':       'bg-gray-100 text-gray-500',
  'ผลิตอยู่':      'bg-blue-50 text-blue-700',
  'รออนุมัติ':    'bg-amber-50 text-amber-700',
  'อนุมัติแล้ว':  'bg-purple-50 text-purple-700',
  'กำหนดโพสต์':  'bg-orange-50 text-orange-700',
  'โพสต์แล้ว':   'bg-green-50 text-green-700',
}

// Text labels replacing emoji icons for content type
const typeLabel: Record<string, string> = {
  GRAPHIC: 'Graphic',
  VIDEO:   'Video',
  COPY:    'Copy',
}

export default function Contents() {
  const [contents, setContents]         = useState<any[]>([])
  const [products, setProducts]         = useState<any[]>([])
  const [filterProduct, setFilterProduct] = useState('all')
  const [filterStatus, setFilterStatus]   = useState('all')
  const [loading, setLoading]           = useState(true)
  const supabase = createClient()

  useEffect(() => {
    async function load() {
      const [c, p] = await Promise.all([
        supabase.from('contents').select('*').order('product_id').order('seq'),
        supabase.from('products').select('product_id, name'),
      ])
      setContents(c.data || [])
      setProducts(p.data || [])
      setLoading(false)
    }
    load()
  }, [])

  async function updateStatus(id: number, status: string) {
    await supabase.from('contents').update({ status }).eq('id', id)
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

      <div>
        <h1 className="text-lg font-semibold text-gray-900">Content</h1>
        <p className="text-sm text-gray-400 mt-0.5">ติดตามสถานะการผลิต Content ทุกชิ้น</p>
      </div>

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
                {['#', 'Product', 'ประเภท', 'ชื่อ Content', 'วัตถุประสงค์', 'Hook', 'Format', 'สถานะ', 'อัปเดต'].map(h => (
                  <th key={h} className="text-left px-4 py-3 text-xs font-medium text-gray-400">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={9} className="px-4 py-10 text-center text-sm text-gray-400">กำลังโหลด...</td>
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
                  <td className="px-4 py-3">
                    <span className={`inline-block px-2 py-0.5 rounded-md text-xs font-medium whitespace-nowrap ${statusStyle[c.status]}`}>
                      {c.status}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <select
                      value={c.status}
                      onChange={e => updateStatus(c.id, e.target.value)}
                      className="border border-gray-200 rounded-lg px-2 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-gray-900 bg-white text-gray-700"
                    >
                      {STATUSES.map(s => <option key={s}>{s}</option>)}
                    </select>
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
