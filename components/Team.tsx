'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase'
import { useProfile } from '@/lib/profile-context'
import StatusSelect from './StatusSelect'
import SearchInput from './SearchInput'
import { TableSkeleton, EmptyState } from './TableState'

const ROLES = ['admin', 'manager', 'editor', 'viewer']

// approval_status values that admin can assign directly via dropdown.
// Maps to the profiles.approval_status CHECK constraint.
const APPROVAL_OPTIONS = ['pending', 'approved', 'rejected']

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

// StyleMap uses English keys to match DB values.
const approvalStyleMap: Record<string, string> = {
  pending:  'bg-amber-50 text-amber-700',
  approved: 'bg-green-50 text-green-700',
  rejected: 'bg-red-50 text-red-600',
}

const roleStyle: Record<string, string> = {
  admin:   'bg-purple-50 text-purple-700',
  manager: 'bg-blue-50 text-blue-700',
  editor:  'bg-teal-50 text-teal-700',
  viewer:  'bg-gray-100 text-gray-500',
}

// Map DB value → Thai label for the StatusSelect display.
// StatusSelect uses the raw value as both key and display label —
// so we need a thin wrapper that converts to/from Thai labels.
const APPROVAL_DISPLAY_OPTIONS = ['รออนุมัติ', 'อนุมัติแล้ว', 'ปฏิเสธ']
const approvalDisplayStyle: Record<string, string> = {
  'รออนุมัติ':  'bg-amber-50 text-amber-700',
  'อนุมัติแล้ว': 'bg-green-50 text-green-700',
  'ปฏิเสธ':    'bg-red-50 text-red-600',
}
// Thai → DB value
const thaiToApproval: Record<string, string> = {
  'รออนุมัติ':  'pending',
  'อนุมัติแล้ว': 'approved',
  'ปฏิเสธ':    'rejected',
}

export default function Team() {
  const [profiles, setProfiles] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('all')
  const [search, setSearch] = useState('')
  const [error, setError] = useState('')
  // Two-step confirm before suspending (downgrading to rejected) an approved user.
  const [confirmSuspend, setConfirmSuspend] = useState<string | null>(null)
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

  // Unified approval_status update — used by the inline StatusSelect dropdown.
  // Changing from approved → rejected counts as "suspend"; show confirm first.
  async function changeApproval(id: string, thaiValue: string) {
    const newStatus = thaiToApproval[thaiValue]
    if (!newStatus) return
    const current = profiles.find(p => p.id === id)?.approval_status
    // Suspending an active user requires confirmation (set via confirmSuspend state).
    if (current === 'approved' && newStatus === 'rejected') {
      setConfirmSuspend(id)
      return
    }
    await applyApproval(id, newStatus)
  }

  async function applyApproval(id: string, newStatus: string) {
    setError('')
    // Optimistic update
    setProfiles(prev => prev.map(p => p.id === id ? { ...p, approval_status: newStatus } : p))
    const { error: updErr } = await supabase.from('profiles').update({
      approval_status: newStatus,
      approved_by: me.id,
      approved_at: new Date().toISOString(),
    }).eq('id', id)
    if (updErr) {
      setError(updErr.message)
      await load() // revert by reloading
    }
    setConfirmSuspend(null)
  }

  async function changeRole(id: string, role: string) {
    setError('')
    setProfiles(prev => prev.map(p => p.id === id ? { ...p, role } : p))
    const { error: updErr } = await supabase.from('profiles').update({ role }).eq('id', id)
    if (updErr) {
      setError(updErr.message)
      await load()
    }
  }

  const pendingCount  = profiles.filter(p => p.approval_status === 'pending').length
  const approvedCount = profiles.filter(p => p.approval_status === 'approved').length
  const rejectedCount = profiles.filter(p => p.approval_status === 'rejected').length

  const filtered = profiles.filter(p => {
    const matchFilter = filter === 'all' || p.approval_status === filter
    const matchSearch = !search || (() => {
      const q = search.toLowerCase()
      return (p.name || '').toLowerCase().includes(q) || (p.email || '').toLowerCase().includes(q)
    })()
    return matchFilter && matchSearch
  })

  return (
    <div className="p-6 max-w-screen-xl mx-auto space-y-5">

      {/* Header */}
      <div>
        <h1 className="text-lg font-semibold text-gray-900">จัดการสมาชิก</h1>
        <p className="text-sm text-gray-400 mt-0.5">อนุมัติ ปฏิเสธ และกำหนดบทบาทของผู้ใช้ในระบบ</p>
      </div>

      {/* Summary filter cards */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { key: 'pending',  label: 'รออนุมัติ',   count: pendingCount,  color: 'text-amber-600',  ring: 'border-amber-300 ring-amber-100' },
          { key: 'approved', label: 'อนุมัติแล้ว', count: approvedCount, color: 'text-green-600',  ring: 'border-green-300 ring-green-100' },
          { key: 'rejected', label: 'ปฏิเสธ',      count: rejectedCount, color: 'text-red-500',    ring: 'border-red-300 ring-red-100' },
        ].map(({ key, label, count, color, ring }) => (
          <button
            key={key}
            onClick={() => setFilter(filter === key ? 'all' : key)}
            className={`bg-white rounded-xl border p-5 text-left transition-colors ${filter === key ? `${ring} ring-2` : 'border-gray-100 hover:border-gray-200'}`}
          >
            <p className="text-xs text-gray-400 mb-3">{label}</p>
            <p className={`text-2xl font-semibold leading-none ${color}`}>{count}</p>
            <p className="text-xs text-gray-400 mt-2">คน</p>
          </button>
        ))}
      </div>

      {error && (
        <p className="text-sm bg-red-50 text-red-600 border border-red-100 rounded-lg px-3.5 py-2.5">{error}</p>
      )}

      {/* Suspend confirmation banner */}
      {confirmSuspend && (() => {
        const p = profiles.find(x => x.id === confirmSuspend)
        return (
          <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 flex items-center justify-between gap-4">
            <p className="text-sm text-amber-800">
              ยืนยันระงับสิทธิ์ <strong>{p?.name}</strong>? ผู้ใช้จะเข้าระบบไม่ได้จนกว่า admin จะอนุมัติใหม่
            </p>
            <div className="flex gap-2 shrink-0">
              <button
                onClick={() => applyApproval(confirmSuspend, 'rejected')}
                className="text-xs bg-red-500 text-white px-3 py-1.5 rounded-lg hover:bg-red-600 transition-colors font-medium"
              >
                ระงับ
              </button>
              <button
                onClick={() => setConfirmSuspend(null)}
                className="text-xs text-gray-500 px-3 py-1.5 rounded-lg hover:bg-gray-100 transition-colors"
              >
                ยกเลิก
              </button>
            </div>
          </div>
        )
      })()}

      {/* Table */}
      <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
        <div className="px-5 py-3 border-b border-gray-100 flex items-center justify-between gap-3">
          <SearchInput value={search} onChange={setSearch} placeholder="ค้นหาชื่อหรืออีเมล..." />
          <div className="flex items-center gap-2 shrink-0">
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
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100">
                {['ชื่อ', 'อีเมล', 'บทบาท', 'สถานะ', 'วันที่สมัคร'].map(h => (
                  <th key={h} className="text-left px-4 py-3 text-xs font-medium text-gray-400 whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <TableSkeleton cols={5} />
              ) : filtered.length === 0 ? (
                <EmptyState message="ไม่พบสมาชิกที่ตรงเงื่อนไข" />
              ) : filtered.map(p => {
                const isSelf = p.id === me.id
                const displayApproval = approvalLabel[p.approval_status] || p.approval_status
                return (
                  <tr key={p.id} className="border-b border-gray-50 hover:bg-gray-50 transition-colors last:border-0">
                    {/* Name + avatar */}
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <div className="w-7 h-7 bg-gray-100 rounded-full flex items-center justify-center text-gray-600 font-semibold text-xs shrink-0">
                          {p.name?.[0]?.toUpperCase()}
                        </div>
                        <span className="font-medium text-gray-900">{p.name}</span>
                        {isSelf && (
                          <span className="text-[10px] text-gray-400 bg-gray-100 px-1.5 py-0.5 rounded">คุณ</span>
                        )}
                      </div>
                    </td>
                    {/* Email */}
                    <td className="px-4 py-3 text-xs text-gray-400">{p.email}</td>
                    {/* Role — inline styled select (already was; keep as-is) */}
                    <td className="px-4 py-3">
                      <div className="relative inline-flex">
                        <select
                          value={p.role}
                          onChange={e => changeRole(p.id, e.target.value)}
                          disabled={isSelf}
                          className={`appearance-none cursor-pointer text-xs font-medium pl-2 pr-6 py-1 rounded-md border border-current/20 focus:outline-none focus:ring-2 focus:ring-gray-900 ${roleStyle[p.role] || 'bg-gray-100 text-gray-500'} ${isSelf ? 'opacity-50 cursor-not-allowed' : ''}`}
                        >
                          {ROLES.map(r => <option key={r} value={r} className="bg-white text-gray-700">{r}</option>)}
                        </select>
                        {!isSelf && (
                          <svg className="pointer-events-none absolute right-1.5 top-1/2 -translate-y-1/2 opacity-60" width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                            <polyline points="6 9 12 15 18 9" />
                          </svg>
                        )}
                      </div>
                    </td>
                    {/* Approval status — inline StatusSelect (replaces badge + action buttons) */}
                    <td className="px-4 py-3">
                      <StatusSelect
                        value={displayApproval}
                        options={APPROVAL_DISPLAY_OPTIONS}
                        styleMap={approvalDisplayStyle}
                        disabled={isSelf}
                        onChange={v => changeApproval(p.id, v)}
                      />
                    </td>
                    {/* Date */}
                    <td className="px-4 py-3 text-xs text-gray-400 whitespace-nowrap">
                      {p.created_at
                        ? new Date(p.created_at).toLocaleDateString('th-TH', { year: 'numeric', month: 'short', day: 'numeric' })
                        : '—'}
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
