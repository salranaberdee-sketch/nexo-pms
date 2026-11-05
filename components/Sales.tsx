'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase'

const salesStatusStyle: Record<string, string> = {
  'ยังไม่เปิดขาย': 'bg-gray-100 text-gray-400',
  'ปิดเป้า':        'bg-green-50 text-green-700',
}

export default function Sales() {
  const [sales, setSales]       = useState<any[]>([])
  const [products, setProducts] = useState<any[]>([])
  const [loading, setLoading]   = useState(true)
  const [editing, setEditing]   = useState<number | null>(null)
  const [editVal, setEditVal]   = useState({ actual_sales: '', actual_received: '' })
  const supabase = createClient()

  async function load() {
    const [s, p] = await Promise.all([
      supabase.from('sales').select('*').order('product_id'),
      supabase.from('products').select('product_id, name, status'),
    ])
    setSales(s.data || [])
    setProducts(p.data || [])
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  async function saveEdit(id: number) {
    await supabase.from('sales').update({
      actual_sales:     Number(editVal.actual_sales),
      actual_received:  Number(editVal.actual_received),
    }).eq('id', id)
    setEditing(null)
    await load()
  }

  const today     = new Date()
  const periodEnd = new Date('2026-11-30')
  const daysLeft  = Math.max(0, Math.ceil((periodEnd.getTime() - today.getTime()) / 86400000))

  const totalTarget = sales.reduce((s, r) => s + Number(r.sales_target_amount), 0)
  const totalActual = sales.reduce((s, r) => s + Number(r.actual_sales), 0)
  const overallPct  = totalTarget > 0 ? Math.round((totalActual / totalTarget) * 100) : 0
  const gap         = Math.max(0, totalTarget - totalActual)
  const perDay      = daysLeft > 0 && gap > 0 ? Math.round(gap / daysLeft) : 0

  const headers = ['Product ID', 'ชื่อสินค้า', 'เป้ายอดขาย', 'ยอดจริง', 'รับเงินจริง', 'ยังขาด', '% สำเร็จ', 'ต้องขาย/วัน', 'สถานะ', '']

  return (
    <div className="p-6 max-w-screen-xl mx-auto space-y-5">

      <div>
        <h1 className="text-lg font-semibold text-gray-900">Sales</h1>
        <p className="text-sm text-gray-400 mt-0.5">ยอดขาย พฤศจิกายน 2026 — เหลือ {daysLeft} วัน</p>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-3 gap-4">
        <div className="bg-white rounded-xl border border-gray-100 p-5">
          <p className="text-xs text-gray-400 mb-3">ยอดขายรวม</p>
          <p className="text-2xl font-semibold text-gray-900 leading-none">฿{totalActual.toLocaleString()}</p>
          <div className="mt-3">
            <div className="w-full h-1 bg-gray-100 rounded-full overflow-hidden">
              <div
                className="h-full rounded-full bg-gray-900"
                style={{ width: `${Math.min(overallPct, 100)}%` }}
              />
            </div>
            <p className="text-xs text-gray-400 mt-1.5">{overallPct}% ของเป้า ฿{totalTarget.toLocaleString()}</p>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-gray-100 p-5">
          <p className="text-xs text-gray-400 mb-3">ยังขาดอยู่</p>
          <p className="text-2xl font-semibold text-red-500 leading-none">฿{gap.toLocaleString()}</p>
          <p className="text-xs text-gray-400 mt-2">ต้องขายเพิ่ม ฿{perDay.toLocaleString()}/วัน</p>
        </div>

        <div className="bg-white rounded-xl border border-gray-100 p-5">
          <p className="text-xs text-gray-400 mb-3">วันที่คงเหลือ</p>
          <p className="text-2xl font-semibold text-gray-900 leading-none">{daysLeft} วัน</p>
          <p className="text-xs text-gray-400 mt-2">สิ้นสุด 30 พ.ย. 2026</p>
        </div>
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
                  <td colSpan={10} className="px-4 py-10 text-center text-sm text-gray-400">กำลังโหลด...</td>
                </tr>
              ) : sales.map(s => {
                const product = products.find(p => p.product_id === s.product_id)
                const target  = Number(s.sales_target_amount)
                const actual  = Number(s.actual_sales)
                const rowGap  = Math.max(0, target - actual)
                const pct     = target > 0 ? Math.round((actual / target) * 100) : 0
                const perDayRow = daysLeft > 0 && rowGap > 0 ? Math.round(rowGap / daysLeft) : 0
                return (
                  <tr key={s.id} className="border-b border-gray-50 hover:bg-gray-50 transition-colors last:border-0">
                    <td className="px-4 py-3 font-mono text-xs text-gray-400">{s.product_id}</td>
                    <td className="px-4 py-3 font-medium text-gray-900 max-w-[160px] truncate">{product?.name}</td>
                    <td className="px-4 py-3 text-sm text-gray-500 tabular-nums">฿{target.toLocaleString()}</td>

                    {/* Inline edit: actual_sales */}
                    <td className="px-4 py-3 tabular-nums">
                      {editing === s.id
                        ? <input
                            type="number"
                            value={editVal.actual_sales}
                            onChange={e => setEditVal({ ...editVal, actual_sales: e.target.value })}
                            className="w-28 border border-gray-300 rounded-lg px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-gray-900"
                          />
                        : <span className="text-sm font-medium text-gray-900">฿{actual.toLocaleString()}</span>
                      }
                    </td>

                    {/* Inline edit: actual_received */}
                    <td className="px-4 py-3 tabular-nums">
                      {editing === s.id
                        ? <input
                            type="number"
                            value={editVal.actual_received}
                            onChange={e => setEditVal({ ...editVal, actual_received: e.target.value })}
                            className="w-28 border border-gray-300 rounded-lg px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-gray-900"
                          />
                        : <span className="text-sm text-gray-600">฿{Number(s.actual_received).toLocaleString()}</span>
                      }
                    </td>

                    <td className="px-4 py-3 text-sm text-red-500 tabular-nums">฿{rowGap.toLocaleString()}</td>

                    {/* Progress bar */}
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <div className="w-12 h-1 bg-gray-100 rounded-full overflow-hidden">
                          <div
                            className={`h-full rounded-full ${pct >= 80 ? 'bg-green-500' : pct >= 40 ? 'bg-amber-400' : 'bg-blue-500'}`}
                            style={{ width: `${Math.min(pct, 100)}%` }}
                          />
                        </div>
                        <span className="text-xs text-gray-500 tabular-nums">{pct}%</span>
                      </div>
                    </td>

                    <td className="px-4 py-3 text-xs font-medium text-amber-600 tabular-nums">
                      {perDayRow > 0 ? `฿${perDayRow.toLocaleString()}` : '—'}
                    </td>

                    <td className="px-4 py-3">
                      <span className={`inline-block px-2 py-0.5 rounded-md text-xs font-medium ${salesStatusStyle[s.status] || 'bg-amber-50 text-amber-700'}`}>
                        {s.status}
                      </span>
                    </td>

                    <td className="px-4 py-3 whitespace-nowrap">
                      {editing === s.id
                        ? <div className="flex gap-1">
                            <button
                              onClick={() => saveEdit(s.id)}
                              className="text-xs bg-gray-900 text-white px-2.5 py-1 rounded-lg hover:bg-gray-700 transition-colors"
                            >
                              บันทึก
                            </button>
                            <button
                              onClick={() => setEditing(null)}
                              className="text-xs text-gray-400 px-2 py-1 rounded-lg hover:bg-gray-100 transition-colors"
                            >
                              ยกเลิก
                            </button>
                          </div>
                        : <button
                            onClick={() => {
                              setEditing(s.id)
                              setEditVal({ actual_sales: String(s.actual_sales), actual_received: String(s.actual_received) })
                            }}
                            className="text-xs text-gray-400 hover:text-gray-900 transition-colors"
                          >
                            แก้ไข
                          </button>
                      }
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
