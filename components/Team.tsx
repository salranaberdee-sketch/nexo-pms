'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase'
import { useProfile } from '@/lib/profile-context'

const ROLES = ['admin', 'manager', 'editor', 'viewer']

const approvalStyle: Record<string, string> = {
  pending:  'bg-amber-50 text-amber-700',
  approved: 'bg-green-50 text-green-700',
  rejected: 'bg-red-50 text-red-600',
}

const approvalLabel: Record<string, string> = {
  pending:  'รออนุมัติ',
  approved: 'อนุมัติแล้ว',
  rejected: 'ปฏิเสธ',
}

const roleStyle: Record<string, string> = {
  admin:   'bg-purple-50 text-purple-700',
  manager: 'bg-blue-50 text-blue-700',
  editor:  'bg-teal-50 text-teal-700',
  viewer:  'bg-gray-100 text-gray-500',
}

export default function Team() {
  const [profiles, setProfiles] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('all')
  const [error, setError] = useState('')
  const supabase = createClient()
  const me = useProfile()

  async function load() {
    const { data } = await supabase
      .from('profiles')
      .select('*')
      .order('created_at', { ascending: false })
    setProfiles(data || [])
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  async function approve(id: string) {
    setError('')
    const { error } = await supabase.from('profiles').update({
      approval_status: 'approved',
      approved_by: me.id,
      approved_at: new Date().toISOString(),
    }).eq('id', id)
    if (error) { setError(error.message); return }
    await load()
  }

  async function reject(id: string) {
    setError('')
    const { error } = await supabase.from('profiles').update({
      approval_status: 'rejected',
      approved_by: me.id,
      approved_at: new Date().toISOString(),
    }).eq('id', id)
    if (error) { setError(error.message); return }
    await load()
  }

  async function changeRole(id: string, role: string) {
    setError('')
    const { error } = await supabase.from('profiles').update({ role }).eq('id', id)
    if (error) { setError(error.message); return }
    await load()
  }

  const pendingCount = profiles.filter(p => p.approval_status === 'pending').length
  const approvedCount = profiles.filter(p => p.approval_status === 'approved').length
  const rejectedCount = profiles.filter(p => p.approval_status === 'rejected').length

  const filtered = profiles.filter(p =>
    filter === 'all' || p.approval_status === filter
  )

  return (
    <div className="p-6 max-w-screen-xl mx-auto space-y-5">

      {/* Header */}
      <div>
        <h1 className="text-lg font-semibold text-gray-900">จัดการสมาชิก</h1>
        <p className="text-sm text-gray-400 mt-0.5">อนุมัติ ปฏิเสธ และกำหนดบทบาทของผู้ใช้ในระบบ</p>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-3 gap-4">
        <button
          onClick={() => setFilter(filter === 'pending' ? 'all' : 'pending')}
          className={`bg-white rounded-xl border p-5 text-left transition-colors ${filter === 'pending' ? 'border-amber-300 ring-2 ring-amber-100' : 'border-gray-100 hover:border-gray-200'}`}
        >
          <p className="text-xs text-gray-400 mb-3">รออนุมัติ</p>
          <p className="text-2xl font-semibold text-amber-600 leading-none">{pendingCount}</p>
          <p className="text-xs text-gray-400 mt-2">คน</p>
        </button>
        <button
          onClick={() => setFilter(filter === 'approved' ? 'all' : 'approved')}
          className={`bg-white rounded-xl border p-5 text-left transition-colors ${filter === 'approved' ? 'border-green-300 ring-2 ring-green-100' : 'border-gray-100 hover:border-gray-200'}`}
        >
          <p className="text-xs text-gray-400 mb-3">อนุมัติแล้ว</p>
          <p className="text-2xl font-semibold text-green-600 leading-none">{approvedCount}</p>
          <p className="text-xs text-gray-400 mt-2">คน</p>
        </button>
        <button
          onClick={() => setFilter(filter === 'rejected' ? 'all' : 'rejected')}
          className={`bg-white rounded-xl border p-5 text-left transition-colors ${filter === 'rejected' ? 'border-red-300 ring-2 ring-red-100' : 'border-gray-100 hover:border-gray-200'}`}
        >
          <p className="text-xs text-gray-400 mb-3">ปฏิเสธ</p>
          <p className="text-2xl font-semibold text-red-500 leading-none">{rejectedCount}</p>
          <p className="text-xs text-gray-400 mt-2">คน</p>
        </button>
      </div>

      {error && (
        <p className="text-sm bg-red-50 text-red-600 border border-red-100 rounded-lg px-3.5 py-2.5">{error}</p>
      )}

      {/* Table */}
      <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
        <div className="px-5 py-3 border-b border-gray-100 flex items-center justify-between">
          <span className="text-xs text-gray-400">{filtered.length} คน</span>
          {filter !== 'all' && (
            <button
              onClick={() => setFilter('all')}
              className="text-xs text-gray-400 hover:text-gray-900 transition-colors"
            >
              ดูทั้งหมด
            </button>
          )}
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100">
                {['ชื่อ', 'อีเมล', 'บทบาท', 'สถานะ', 'วันที่สมัคร', 'การจัดการ'].map(h => (
                  <th key={h} className="text-left px-4 py-3 text-xs font-medium text-gray-400 whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={6} className="px-4 py-10 text-center text-sm text-gray-400">กำลังโหลด...</td>
                </tr>
              ) : filtered.map(p => (
                <tr key={p.id} className="border-b border-gray-50 hover:bg-gray-50 transition-colors last:border-0">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <div className="w-7 h-7 bg-gray-100 rounded-full flex items-center justify-center text-gray-600 font-semibold text-xs shrink-0">
                        {p.name?.[0]?.toUpperCase()}
                      </div>
                      <span className="font-medium text-gray-900">{p.name}</span>
                      {p.id === me.id && (
                        <span className="text-[10px] text-gray-400 bg-gray-100 px-1.5 py-0.5 rounded">คุณ</span>
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-xs text-gray-400">{p.email}</td>
                  <td className="px-4 py-3">
                    <select
                      value={p.role}
                      onChange={e => changeRole(p.id, e.target.value)}
                      disabled={p.id === me.id}
                      className={`text-xs font-medium px-2 py-1 rounded-md border-0 cursor-pointer focus:outline-none focus:ring-1 focus:ring-gray-900 ${roleStyle[p.role] || 'bg-gray-100 text-gray-500'} ${p.id === me.id ? 'opacity-50 cursor-not-allowed' : ''}`}
                    >
                      {ROLES.map(r => <option key={r} value={r}>{r}</option>)}
                    </select>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`inline-block px-2 py-0.5 rounded-md text-xs font-medium whitespace-nowrap ${approvalStyle[p.approval_status]}`}>
                      {approvalLabel[p.approval_status] || p.approval_status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-xs text-gray-400 whitespace-nowrap">
                    {p.created_at ? new Date(p.created_at).toLocaleDateString('th-TH', { year: 'numeric', month: 'short', day: 'numeric' }) : '—'}
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap">
                    {p.approval_status === 'pending' && (
                      <div className="flex gap-1">
                        <button
                          onClick={() => approve(p.id)}
                          className="text-xs bg-green-600 text-white px-2.5 py-1 rounded-lg hover:bg-green-700 transition-colors font-medium"
                        >
                          อนุมัติ
                        </button>
                        <button
                          onClick={() => reject(p.id)}
                          className="text-xs text-red-500 px-2.5 py-1 rounded-lg hover:bg-red-50 transition-colors"
                        >
                          ปฏิเสธ
                        </button>
                      </div>
                    )}
                    {p.approval_status === 'rejected' && (
                      <button
                        onClick={() => approve(p.id)}
                        className="text-xs text-green-600 px-2.5 py-1 rounded-lg hover:bg-green-50 transition-colors"
                      >
                        อนุมัติใหม่
                      </button>
                    )}
                    {p.approval_status === 'approved' && p.id !== me.id && (
                      <button
                        onClick={() => reject(p.id)}
                        className="text-xs text-gray-400 hover:text-red-500 px-2.5 py-1 rounded-lg hover:bg-red-50 transition-colors"
                      >
                        ระงับ
                      </button>
                    )}
                    {p.id === me.id && (
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
