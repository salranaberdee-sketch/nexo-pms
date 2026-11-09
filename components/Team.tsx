'use client'

import { useEffect, useState, useMemo } from 'react'
import { createClient } from '@/lib/supabase'
import { useProfile, useCan } from '@/lib/profile-context'
import StatusSelect from './StatusSelect'
import SearchInput from './SearchInput'
import { TableSkeleton, EmptyState } from './TableState'
import { showToast } from './Toast'
import { ConfirmModal } from './Modal'

function IconTrash() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="3 6 5 6 21 6"/>
      <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/>
      <path d="M10 11v6"/><path d="M14 11v6"/>
      <path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/>
    </svg>
  )
}

const ROLES = ['admin', 'manager', 'editor', 'viewer']

const approvalLabel: Record<string, string> = {
  pending:  'รออนุมัติ',
  approved: 'อนุมัติแล้ว',
  rejected: 'ปฏิเสธ',
}

const roleStyle: Record<string, string> = {
  admin:   'bg-purple-50 text-purple-700',
  manager: 'bg-blue-50 text-blue-700',
  editor:  'bg-teal-50 text-teal-700',
  viewer:  'bg-slate-100 text-slate-500',
}

const APPROVAL_DISPLAY_OPTIONS = ['รออนุมัติ', 'อนุมัติแล้ว', 'ปฏิเสธ']
const approvalDisplayStyle: Record<string, string> = {
  'รออนุมัติ':  'bg-amber-50 text-amber-700',
  'อนุมัติแล้ว': 'bg-emerald-50 text-emerald-700',
  'ปฏิเสธ':    'bg-red-50 text-red-600',
}
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

  // Brand access management state
  const [allBrands, setAllBrands] = useState<string[]>([])
  const [editingBrandAccess, setEditingBrandAccess] = useState<string | null>(null) // profile id
  const [brandAccessDraft, setBrandAccessDraft] = useState<string[]>([])
  const [savingBrandAccess, setSavingBrandAccess] = useState(false)

  const supabase = createClient()
  const me = useProfile()
  const canDelete = useCan('delete', 'profiles')

  // Delete confirm
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null)
  const [deleting, setDeleting] = useState(false)

  async function load() {
    const [profileRes, brandRes] = await Promise.all([
      supabase
        .from('profiles')
        .select('id, name, email, role, approval_status, approved_at, created_at, brand_access')
        .order('created_at', { ascending: false }),
      supabase
        .from('products')
        .select('brand')
        .not('brand', 'is', null)
        .neq('brand', ''),
    ])
    setProfiles(profileRes.data || [])
    // Deduplicate brands
    const rawBrands = (brandRes.data || []).map((r: any) => String(r.brand))
    const uniqueBrands = new Set<string>(rawBrands)
    const brands: string[] = [...uniqueBrands].sort()
    setAllBrands(brands)
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
    setProfiles(prev => prev.map(p => p.id === id ? { ...p, approval_status: newStatus } : p))
    const { error: updErr } = await supabase.from('profiles').update({
      approval_status: newStatus,
      approved_by: me.id,
      approved_at: new Date().toISOString(),
    }).eq('id', id)
    if (updErr) {
      setError(updErr.message)
      await load()
    } else {
      showToast(newStatus === 'approved' ? 'อนุมัติแล้ว' : newStatus === 'rejected' ? 'ปฏิเสธแล้ว' : 'อัปเดตสถานะแล้ว')
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
    } else {
      showToast('เปลี่ยน role แล้ว')
    }
  }

  // ── Delete profile ────────────────────────────────────────────
  async function deleteProfile(id: string) {
    setDeleting(true)
    const { error: delErr } = await supabase.from('profiles').delete().eq('id', id)
    setDeleting(false)
    if (delErr) { showToast(delErr.message, 'error'); return }
    setConfirmDelete(null)
    setProfiles(prev => prev.filter(p => p.id !== id))
    showToast('ลบสมาชิกแล้ว')
  }

  // ── Brand Access ──────────────────────────────────────────────
  function openBrandAccess(profileId: string, currentAccess: string[]) {
    setEditingBrandAccess(profileId)
    setBrandAccessDraft(currentAccess || [])
  }

  function toggleBrand(brand: string) {
    setBrandAccessDraft(prev =>
      prev.includes(brand) ? prev.filter(b => b !== brand) : [...prev, brand],
    )
  }

  async function saveBrandAccess() {
    if (!editingBrandAccess) return
    setSavingBrandAccess(true)
    const { error: updErr } = await supabase
      .from('profiles')
      .update({ brand_access: brandAccessDraft })
      .eq('id', editingBrandAccess)
    setSavingBrandAccess(false)
    if (updErr) {
      showToast(updErr.message, 'error')
      return
    }
    setProfiles(prev => prev.map(p =>
      p.id === editingBrandAccess ? { ...p, brand_access: brandAccessDraft } : p,
    ))
    setEditingBrandAccess(null)
    showToast('บันทึกสิทธิ์ Brand แล้ว')
  }

  const pendingCount  = useMemo(() => profiles.filter(p => p.approval_status === 'pending').length, [profiles])
  const approvedCount = useMemo(() => profiles.filter(p => p.approval_status === 'approved').length, [profiles])
  const rejectedCount = useMemo(() => profiles.filter(p => p.approval_status === 'rejected').length, [profiles])

  // Date range filter
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo]     = useState('')

  const filtered = useMemo(() => profiles.filter(p => {
    const matchFilter = filter === 'all' || p.approval_status === filter
    const matchSearch = !search || (() => {
      const q = search.toLowerCase()
      return (p.name || '').toLowerCase().includes(q) || (p.email || '').toLowerCase().includes(q)
    })()
    const matchDate = (!dateFrom || (p.created_at && p.created_at >= dateFrom))
                   && (!dateTo   || (p.created_at && p.created_at <= dateTo + 'T23:59:59'))
    return matchFilter && matchSearch && matchDate
  }), [profiles, filter, search, dateFrom, dateTo])

  // Pagination — reset when filters change
  const [visibleCount, setVisibleCount] = useState(10)
  useEffect(() => { setVisibleCount(10) }, [filter, search, dateFrom, dateTo])

  return (
    <div className="p-6 max-w-screen-xl mx-auto space-y-5">

      {/* Header */}
      <div>
        <h1 className="text-xl font-semibold text-slate-900">จัดการสมาชิก</h1>
        <p className="text-sm text-slate-400 mt-0.5">อนุมัติ ปฏิเสธ และกำหนดบทบาทของผู้ใช้ในระบบ</p>
      </div>

      {/* Summary filter cards */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { key: 'pending',  label: 'รออนุมัติ',   count: pendingCount,  color: 'text-amber-600',  ring: 'border-amber-300 ring-amber-100' },
          { key: 'approved', label: 'อนุมัติแล้ว', count: approvedCount, color: 'text-emerald-600',  ring: 'border-emerald-300 ring-emerald-100' },
          { key: 'rejected', label: 'ปฏิเสธ',      count: rejectedCount, color: 'text-red-500',    ring: 'border-red-300 ring-red-100' },
        ].map(({ key, label, count, color, ring }) => (
          <button
            key={key}
            onClick={() => setFilter(filter === key ? 'all' : key)}
            className={`bg-white rounded-2xl border p-5 text-left transition-all shadow-sm ${filter === key ? `${ring} ring-2` : 'border-slate-100 hover:border-slate-200'}`}
          >
            <p className="text-xs text-slate-400 mb-3">{label}</p>
            <p className={`text-2xl font-semibold leading-none ${color}`}>{count}</p>
            <p className="text-xs text-slate-400 mt-2">คน</p>
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
                className="text-xs text-slate-500 px-3 py-1.5 rounded-lg hover:bg-slate-100 transition-colors"
              >
                ยกเลิก
              </button>
            </div>
          </div>
        )
      })()}

      {/* Table */}
      <div className="bg-white rounded-2xl border border-slate-100 overflow-hidden shadow-sm">
        <div className="px-5 py-3.5 border-b border-slate-100 flex items-center justify-between gap-3 flex-wrap">
          <div className="flex items-center gap-2 flex-1 flex-wrap">
            <SearchInput value={search} onChange={setSearch} placeholder="ค้นหาชื่อหรืออีเมล..." />
            <div className="flex items-center gap-1.5 shrink-0">
              <span className="text-xs text-slate-400 whitespace-nowrap">จาก</span>
              <input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)}
                className="border border-slate-200 rounded-xl px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white text-slate-700" />
              <span className="text-xs text-slate-400">ถึง</span>
              <input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)}
                className="border border-slate-200 rounded-xl px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white text-slate-700" />
              {(dateFrom || dateTo) && (
                <button onClick={() => { setDateFrom(''); setDateTo('') }}
                  className="text-xs text-slate-400 hover:text-red-500 transition-colors px-1.5 py-1 rounded-lg hover:bg-red-50">✕</button>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <span className="text-xs text-slate-400">{filtered.length} คน</span>
            {filter !== 'all' && (
              <button
                onClick={() => setFilter('all')}
                className="text-xs text-slate-400 hover:text-slate-900 transition-colors"
              >
                ดูทั้งหมด
              </button>
            )}
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-100">
                {['ชื่อ', 'อีเมล', 'บทบาท', 'สิทธิ์ Brand', 'สถานะ', 'วันที่สมัคร', ''].map(h => (
                  <th key={h} className="text-left px-5 py-3.5 text-xs font-semibold text-slate-400 whitespace-nowrap uppercase tracking-wide">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <TableSkeleton cols={7} />
              ) : filtered.length === 0 ? (
                <EmptyState message="ไม่พบสมาชิกที่ตรงเงื่อนไข" />
              ) : filtered.slice(0, visibleCount).map(p => {
                const isSelf = p.id === me.id
                const displayApproval = approvalLabel[p.approval_status] || p.approval_status
                return (
                  <tr key={p.id} className="border-b border-slate-100/60 hover:bg-indigo-50/20 transition-colors last:border-0">
                    {/* Name + avatar */}
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-full flex items-center justify-center font-semibold text-xs shrink-0" style={{ background: 'linear-gradient(135deg, #e0e7ff, #ede9fe)', color: '#4f46e5' }}>
                          {p.name?.[0]?.toUpperCase()}
                        </div>
                        <span className="font-semibold text-slate-900">{p.name}</span>
                        {isSelf && (
                          <span className="text-[10px] text-slate-400 bg-slate-100 px-1.5 py-0.5 rounded">คุณ</span>
                        )}
                      </div>
                    </td>
                    {/* Email */}
                    <td className="px-5 py-4 text-sm text-slate-400">{p.email}</td>
                    {/* Role — inline styled select (already was; keep as-is) */}
                    <td className="px-5 py-4">
                      <div className="relative inline-flex">
                        <select
                          value={p.role}
                          onChange={e => changeRole(p.id, e.target.value)}
                          disabled={isSelf}
                          className={`appearance-none cursor-pointer text-xs font-medium pl-2 pr-6 py-1 rounded-lg border border-current/20 focus:outline-none focus:ring-2 focus:ring-indigo-500 ${roleStyle[p.role] || 'bg-slate-100 text-slate-500'} ${isSelf ? 'opacity-50 cursor-not-allowed' : ''}`}
                        >
                          {ROLES.map(r => <option key={r} value={r} className="bg-white text-slate-700">{r}</option>)}
                        </select>
                        {!isSelf && (
                          <svg className="pointer-events-none absolute right-1.5 top-1/2 -translate-y-1/2 opacity-60" width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                            <polyline points="6 9 12 15 18 9" />
                          </svg>
                        )}
                      </div>
                    </td>
                    {/* Approval status */}
                    <td className="px-5 py-4">
                      <StatusSelect
                        value={displayApproval}
                        options={APPROVAL_DISPLAY_OPTIONS}
                        styleMap={approvalDisplayStyle}
                        disabled={isSelf}
                        onChange={v => changeApproval(p.id, v)}
                      />
                    </td>

                    {/* Brand Access — only meaningful for editor role */}
                    <td className="px-5 py-4">
                      {p.role === 'editor' ? (
                        <button
                          type="button"
                          onClick={() => openBrandAccess(p.id, p.brand_access || [])}
                          className="flex items-center gap-1.5"
                        >
                          {(p.brand_access || []).length === 0 ? (
                            <span className="text-xs text-red-400 bg-red-50 border border-red-100 px-2 py-1 rounded-lg font-medium hover:bg-red-100 transition-colors">
                              ไม่มีสิทธิ์ — ตั้งค่า
                            </span>
                          ) : (
                            <span className="text-xs text-teal-700 bg-teal-50 border border-teal-100 px-2 py-1 rounded-lg font-medium hover:bg-teal-100 transition-colors">
                              {(p.brand_access || []).length} brand
                              <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" className="inline ml-1 opacity-60"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                            </span>
                          )}
                        </button>
                      ) : (
                        <span className="text-xs text-slate-300">—</span>
                      )}
                    </td>

                    <td className="px-5 py-4 text-sm text-slate-400 whitespace-nowrap">
                      {p.created_at
                        ? new Date(p.created_at).toLocaleDateString('th-TH', { year: 'numeric', month: 'short', day: 'numeric' })
                        : '—'}
                    </td>
                    {/* Delete */}
                    <td className="px-5 py-4 whitespace-nowrap">
                      {canDelete && !isSelf && (
                        <button onClick={() => setConfirmDelete(p.id)} title="ลบสมาชิก"
                          className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-400 hover:bg-red-50 hover:text-red-600 rounded-lg transition-colors">
                          <IconTrash />ลบ
                        </button>
                      )}
                      {(isSelf || !canDelete) && <span className="text-xs text-slate-300">—</span>}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
          {visibleCount < filtered.length && (
            <div className="px-5 py-4 border-t border-slate-100 text-center">
              <button onClick={() => setVisibleCount(v => v + 10)}
                className="text-sm text-indigo-600 font-medium hover:text-indigo-800 transition-colors">
                ดูเพิ่มเติม ({filtered.length - visibleCount} คน)
              </button>
            </div>
          )}
        </div>
      </div>

      {/* ── DELETE confirm ─────────────────────────────────────── */}
      <ConfirmModal
        open={confirmDelete !== null}
        onClose={() => setConfirmDelete(null)}
        onConfirm={() => deleteProfile(confirmDelete!)}
        loading={deleting}
        title="ยืนยันลบสมาชิก"
        message={(() => {
          const target = profiles.find(p => p.id === confirmDelete)
          return <>ลบ <strong>{target?.name}</strong> ({target?.email}) ออกจากระบบถาวร บัญชีและข้อมูลทั้งหมดจะหายไปไม่สามารถกู้คืนได้</>
        })()}
      />

      {/* ── Brand Access Modal ──────────────────────────────────── */}
      {editingBrandAccess && (() => {
        const target = profiles.find(p => p.id === editingBrandAccess)
        return (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ backgroundColor: 'rgba(0,0,0,0.4)' }}>
            <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden">
              {/* Header */}
              <div className="px-6 py-5 border-b border-slate-100 flex items-center justify-between">
                <div>
                  <h2 className="text-sm font-semibold text-slate-900">กำหนดสิทธิ์ Brand</h2>
                  <p className="text-xs text-slate-400 mt-0.5">
                    <span className="font-medium text-slate-600">{target?.name}</span>
                    {' — editor เห็นเฉพาะ product/content ของ brand ที่เลือก'}
                  </p>
                </div>
                <button onClick={() => setEditingBrandAccess(null)} className="text-slate-300 hover:text-slate-600 transition-colors p-1">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                    <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
                  </svg>
                </button>
              </div>

              {/* Brand checklist */}
              <div className="px-6 py-4 space-y-2">
                {allBrands.length === 0 ? (
                  <p className="text-sm text-slate-400 text-center py-4">ยังไม่มีข้อมูล Brand ในระบบ</p>
                ) : allBrands.map(brand => {
                  const checked = brandAccessDraft.includes(brand)
                  return (
                    <label
                      key={brand}
                      className={`flex items-center gap-3 px-4 py-3 rounded-xl border cursor-pointer transition-colors
                        ${checked
                          ? 'bg-teal-50 border-teal-200 text-teal-800'
                          : 'bg-white border-slate-100 text-slate-700 hover:bg-slate-50'
                        }`}
                    >
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={() => toggleBrand(brand)}
                        className="w-4 h-4 rounded accent-teal-600 shrink-0"
                      />
                      <span className="text-sm font-medium flex-1">{brand}</span>
                      {checked && (
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" className="text-teal-600 shrink-0">
                          <polyline points="20 6 9 17 4 12"/>
                        </svg>
                      )}
                    </label>
                  )
                })}
              </div>

              {/* Summary */}
              <div className="px-6 pb-2">
                {brandAccessDraft.length === 0 ? (
                  <div className="flex items-center gap-2 px-3 py-2.5 bg-red-50 border border-red-100 rounded-xl">
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" className="text-red-500 shrink-0">
                      <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
                    </svg>
                    <p className="text-xs text-red-600">ไม่เลือก Brand ใดเลย — editor จะมองไม่เห็นข้อมูลใดๆ</p>
                  </div>
                ) : (
                  <div className="px-3 py-2.5 bg-teal-50 border border-teal-100 rounded-xl">
                    <p className="text-xs text-teal-700">
                      เข้าถึงได้: <span className="font-semibold">{brandAccessDraft.join(', ')}</span>
                    </p>
                  </div>
                )}
              </div>

              {/* Actions */}
              <div className="flex gap-2 px-6 py-4">
                <button
                  onClick={saveBrandAccess}
                  disabled={savingBrandAccess}
                  className="flex-1 bg-indigo-600 text-white py-2.5 rounded-xl text-sm font-semibold disabled:opacity-40 hover:bg-indigo-500 transition-colors"
                >
                  {savingBrandAccess ? 'กำลังบันทึก...' : 'บันทึกสิทธิ์'}
                </button>
                <button
                  onClick={() => setEditingBrandAccess(null)}
                  className="px-5 py-2.5 text-sm text-slate-500 rounded-xl hover:bg-slate-100 transition-colors"
                >
                  ยกเลิก
                </button>
              </div>
            </div>
          </div>
        )
      })()}
    </div>
  )
}
