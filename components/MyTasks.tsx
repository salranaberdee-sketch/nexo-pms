'use client'

import { useEffect, useState, useMemo } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase'
import { useProfile } from '@/lib/profile-context'
import { TableSkeleton, todayStr } from './TableState'
import { showToast } from './Toast'

const TODAY = todayStr()
const TODAY_MS = new Date(TODAY).getTime()

const statusStyle: Record<string, string> = {
  'รอผลิต':      'bg-slate-100 text-slate-500',
  'ผลิตอยู่':     'bg-blue-50 text-blue-700',
  'รออนุมัติ':   'bg-amber-50 text-amber-700',
  'อนุมัติแล้ว': 'bg-purple-50 text-purple-700',
  'กำหนดโพสต์': 'bg-orange-50 text-orange-700',
  'โพสต์แล้ว':  'bg-emerald-50 text-emerald-700',
}

const DONE_STATUS = 'โพสต์แล้ว'
const ACTIVE_STATUSES = ['รอผลิต', 'ผลิตอยู่', 'รออนุมัติ', 'อนุมัติแล้ว', 'กำหนดโพสต์']

// A single content row seen from the perspective of "my role in it"
type MyTask = {
  id: number
  product_id: string
  seq: number
  title: string
  status: string
  deadline: string | null
  acknowledged_at: string | null
  assigned_date: string | null
  assigned_by?: string      // name of who assigned (from log)
  assigned_by_id?: string
  myRole: 'producer' | 'approver' | 'assigned_to'
  brand: string
}

type GroupKey = 'new' | 'pending' | 'approve' | 'overdue' | 'done'

export default function MyTasks() {
  const me = useProfile()
  const [tasks, setTasks]         = useState<MyTask[]>([])
  const [products, setProducts]   = useState<any[]>([])
  const [loading, setLoading]     = useState(true)
  const [loadError, setLoadError] = useState('')
  const [filterBrand, setFilterBrand]   = useState('all')
  const [filterStatus, setFilterStatus] = useState('all')
  const [acknowledging, setAcknowledging] = useState<number | null>(null)
  const supabase = createClient()

  async function load() {
    setLoadError('')
    // Fetch contents where I am producer OR approver OR assigned_to
    const [cRes, pRes, logRes] = await Promise.all([
      supabase
        .from('contents')
        .select('id, product_id, seq, title, status, deadline, acknowledged_at, assigned_date, producer_id, producer, approver_id, approver, assigned_to_id, assigned_to')
        .or(`producer_id.eq.${me.id},approver_id.eq.${me.id},assigned_to_id.eq.${me.id}`),
      supabase.from('products').select('product_id, name, brand'),
      supabase
        .from('content_assignment_log')
        .select('content_id, role, assigned_by_id, assigned_by_name, assigned_at')
        .order('assigned_at', { ascending: false }),
    ])

    if (cRes.error) { setLoadError(cRes.error.message); setLoading(false); return }

    const productMap = new Map<string, { product_id: string; name: string; brand: string }>(
      (pRes.data || []).map((p: any) => [p.product_id, p]),
    )
    // For each content, determine my role(s) — if multiple, show highest priority
    const myTasks: MyTask[] = []
    for (const c of cRes.data || []) {
      const product = productMap.get(c.product_id)
      const brand = product?.brand || ''

      // Determine latest assignment log for my role in this content
      const myRoles: MyTask['myRole'][] = []
      if (c.producer_id === me.id) myRoles.push('producer')
      if (c.approver_id === me.id) myRoles.push('approver')
      if (c.assigned_to_id === me.id && c.producer_id !== me.id) myRoles.push('assigned_to')

      for (const role of myRoles) {
        const latestLog = (logRes.data || []).find(
          (l: any) => l.content_id === c.id && l.role === role,
        )
        myTasks.push({
          id:              c.id,
          product_id:      c.product_id,
          seq:             c.seq,
          title:           c.title,
          status:          c.status || 'รอผลิต',
          deadline:        c.deadline,
          acknowledged_at: c.acknowledged_at,
          assigned_date:   c.assigned_date,
          assigned_by:     latestLog?.assigned_by_name,
          assigned_by_id:  latestLog?.assigned_by_id,
          myRole:          role,
          brand,
        })
      }
    }
    setTasks(myTasks)
    setProducts(pRes.data || [])
    setLoading(false)
  }

  useEffect(() => { load() }, [me.id])

  // ── Acknowledge (รับงาน) ─────────────────────────────────────
  async function acknowledge(task: MyTask) {
    if (task.acknowledged_at) return
    setAcknowledging(task.id)
    const now = new Date().toISOString()
    const { error } = await supabase.from('contents').update({
      acknowledged_at: now,
      acknowledged_by: me.id,
    }).eq('id', task.id)
    setAcknowledging(null)
    if (error) { showToast(error.message, 'error'); return }
    setTasks(prev => prev.map(t => t.id === task.id ? { ...t, acknowledged_at: now } : t))
    showToast('รับงานแล้ว')
  }

  // ── Filters & grouping ───────────────────────────────────────
  const allBrands = useMemo(() => {
    const s = new Set(tasks.map(t => t.brand).filter(Boolean))
    return [...s].sort()
  }, [tasks])

  const STATUSES_FILTER = ['all', ...Array.from(new Set(tasks.map(t => t.status)))]

  const filtered = useMemo(() => tasks.filter(t =>
    (filterBrand === 'all' || t.brand === filterBrand) &&
    (filterStatus === 'all' || t.status === filterStatus),
  ), [tasks, filterBrand, filterStatus])

  const grouped = useMemo(() => {
    const groups: Record<GroupKey, MyTask[]> = { new: [], overdue: [], pending: [], approve: [], done: [] }
    for (const t of filtered) {
      const isNew     = !t.acknowledged_at && t.status !== DONE_STATUS
      const isDone    = t.status === DONE_STATUS
      const isOverdue = !isDone && t.deadline && t.deadline < TODAY
      const isApprove = t.myRole === 'approver' && t.status === 'รออนุมัติ'

      if (isDone)          groups.done.push(t)
      else if (isNew)      groups.new.push(t)
      else if (isOverdue)  groups.overdue.push(t)
      else if (isApprove)  groups.approve.push(t)
      else                 groups.pending.push(t)
    }
    return groups
  }, [filtered])

  const newCount = tasks.filter(t => !t.acknowledged_at && t.status !== DONE_STATUS).length
  const overdueCount = tasks.filter(t => t.status !== DONE_STATUS && t.deadline && t.deadline < TODAY).length

  if (loading) return (
    <div className="p-6 max-w-screen-xl mx-auto">
      <div className="space-y-3">
        <div className="bg-white rounded-2xl h-28 animate-pulse border border-slate-100" />
        <div className="bg-white rounded-2xl h-64 animate-pulse border border-slate-100" />
      </div>
    </div>
  )

  return (
    <div className="p-6 max-w-screen-xl mx-auto space-y-5">

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-slate-900">งานของฉัน</h1>
          <p className="text-sm text-slate-400 mt-0.5">
            {me.name} — content ที่คุณเป็น producer หรือ approver
          </p>
        </div>
        <button onClick={() => load()}
          className="flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-900 px-3 py-1.5 rounded-xl hover:bg-slate-100 transition-colors">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            <polyline points="23 4 23 10 17 10"/><polyline points="1 20 1 14 7 14"/>
            <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"/>
          </svg>
          รีเฟรช
        </button>
      </div>

      {loadError && (
        <div className="bg-red-50 border border-red-100 rounded-2xl px-4 py-3 text-sm text-red-600">
          {loadError} <button onClick={load} className="ml-2 underline">ลองใหม่</button>
        </div>
      )}

      {/* Summary chips */}
      <div className="flex gap-3 flex-wrap">
        <div className="bg-white rounded-xl border border-slate-100 px-4 py-3 flex items-center gap-2 shadow-sm">
          <span className="text-sm text-slate-500">งานทั้งหมด</span>
          <span className="text-sm font-bold text-slate-900">{tasks.filter(t => t.status !== DONE_STATUS).length}</span>
        </div>
        {newCount > 0 && (
          <div className="bg-indigo-50 rounded-xl border border-indigo-100 px-4 py-3 flex items-center gap-2">
            <span className="text-sm text-indigo-700">งานใหม่รอรับ</span>
            <span className="text-sm font-bold text-indigo-700">{newCount}</span>
          </div>
        )}
        {overdueCount > 0 && (
          <div className="bg-red-50 rounded-xl border border-red-100 px-4 py-3 flex items-center gap-2">
            <span className="text-sm text-red-600">เกิน deadline</span>
            <span className="text-sm font-bold text-red-600">{overdueCount}</span>
          </div>
        )}
        {grouped.approve.length > 0 && (
          <div className="bg-amber-50 rounded-xl border border-amber-100 px-4 py-3 flex items-center gap-2">
            <span className="text-sm text-amber-700">รอฉันอนุมัติ</span>
            <span className="text-sm font-bold text-amber-700">{grouped.approve.length}</span>
          </div>
        )}
      </div>

      {/* Filters */}
      <div className="flex gap-2 flex-wrap items-center">
        {allBrands.length > 1 && (
          <select value={filterBrand} onChange={e => setFilterBrand(e.target.value)}
            className="border border-slate-200 rounded-xl px-3.5 py-2.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500">
            <option value="all">ทุก Brand</option>
            {allBrands.map(b => <option key={b} value={b}>{b}</option>)}
          </select>
        )}
        <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)}
          className="border border-slate-200 rounded-xl px-3.5 py-2.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500">
          <option value="all">ทุกสถานะ</option>
          {ACTIVE_STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
          <option value={DONE_STATUS}>{DONE_STATUS}</option>
        </select>
        {(filterBrand !== 'all' || filterStatus !== 'all') && (
          <button onClick={() => { setFilterBrand('all'); setFilterStatus('all') }}
            className="text-sm text-slate-400 hover:text-slate-700 px-3 py-2 rounded-xl hover:bg-slate-100 transition-colors">
            ล้างตัวกรอง ✕
          </button>
        )}
      </div>

      {filtered.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-100 p-12 text-center">
          <p className="text-slate-400 text-sm">ยังไม่มีงานที่มอบหมายให้คุณ</p>
        </div>
      ) : (
        <div className="space-y-5">
          {(
            [
              { key: 'new' as GroupKey,     label: '📬 งานใหม่ — รอรับทราบ',       accent: 'border-indigo-200 bg-indigo-50/30' },
              { key: 'overdue' as GroupKey, label: '🔴 เกิน Deadline',              accent: 'border-red-200 bg-red-50/30' },
              { key: 'approve' as GroupKey, label: '✅ รอฉันอนุมัติ',               accent: 'border-amber-200 bg-amber-50/30' },
              { key: 'pending' as GroupKey, label: '🔵 กำลังดำเนินการ',             accent: 'border-slate-200' },
              { key: 'done' as GroupKey,    label: '✓ เสร็จแล้ว',                   accent: 'border-slate-100 opacity-70' },
            ] as { key: GroupKey; label: string; accent: string }[]
          ).filter(g => grouped[g.key].length > 0).map(({ key, label, accent }) => (
            <div key={key} className={`bg-white rounded-2xl border overflow-hidden shadow-sm ${accent}`}>
              <div className="px-5 py-3.5 border-b border-slate-100 flex items-center justify-between">
                <h2 className="text-sm font-semibold text-slate-700">{label}</h2>
                <span className="text-xs text-slate-400 tabular-nums">{grouped[key].length} รายการ</span>
              </div>
              <div className="divide-y divide-slate-100">
                {grouped[key].map(task => <TaskRow key={`${task.id}-${task.myRole}`} task={task} onAcknowledge={acknowledge} acknowledging={acknowledging} />)}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// ── TaskRow ───────────────────────────────────────────────────
function TaskRow({ task, onAcknowledge, acknowledging }: {
  task: MyTask
  onAcknowledge: (t: MyTask) => void
  acknowledging: number | null
}) {
  const TODAY_STR = todayStr()
  const isDone    = task.status === DONE_STATUS
  const overdue   = !isDone && task.deadline && task.deadline < TODAY_STR
  const daysLate  = overdue ? Math.round((new Date(TODAY_STR).getTime() - new Date(task.deadline!).getTime()) / 86400000) : 0
  const daysLeft  = !isDone && task.deadline && task.deadline >= TODAY_STR
    ? Math.round((new Date(task.deadline).getTime() - new Date(TODAY_STR).getTime()) / 86400000)
    : null
  const isNew     = !task.acknowledged_at && !isDone

  const roleLabel: Record<string, string> = {
    producer:    'ผู้ผลิต',
    approver:    'ผู้อนุมัติ',
    assigned_to: 'ผู้รับผิดชอบ',
  }
  const roleColor: Record<string, string> = {
    producer:    'bg-blue-50 text-blue-700',
    approver:    'bg-purple-50 text-purple-700',
    assigned_to: 'bg-teal-50 text-teal-700',
  }

  return (
    <div className={`flex items-center gap-4 px-5 py-4 hover:bg-slate-50/50 transition-colors ${isNew ? 'bg-indigo-50/20' : ''}`}>
      {/* New dot */}
      <div className="shrink-0 w-2">
        {isNew && <div className="w-2 h-2 rounded-full bg-indigo-500" />}
      </div>

      {/* Role badge */}
      <span className={`shrink-0 text-xs font-semibold px-2 py-1 rounded-lg ${roleColor[task.myRole]}`}>
        {roleLabel[task.myRole]}
      </span>

      {/* Title + meta */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          {isNew && (
            <span className="shrink-0 text-[10px] font-bold bg-indigo-500 text-white px-1.5 py-0.5 rounded-full">ใหม่</span>
          )}
          <Link href={`/contents?product=${task.product_id}`}
            className="font-semibold text-slate-900 hover:text-indigo-600 truncate transition-colors">
            {task.title}
          </Link>
        </div>
        <div className="flex items-center gap-3 mt-0.5 flex-wrap">
          <span className="font-mono text-xs text-slate-400">{task.product_id}</span>
          {task.brand && <span className="text-xs text-slate-400">{task.brand}</span>}
          {task.assigned_by && (
            <span className="text-xs text-slate-400">
              มอบโดย <span className="text-slate-600">{task.assigned_by}</span>
              {task.assigned_date && ` • ${new Date(task.assigned_date).toLocaleDateString('th-TH', { day: '2-digit', month: 'short' })}`}
            </span>
          )}
          {task.acknowledged_at && (
            <span className="text-xs text-emerald-600">
              รับงานแล้ว {new Date(task.acknowledged_at).toLocaleDateString('th-TH', { day: '2-digit', month: 'short' })}
            </span>
          )}
        </div>
      </div>

      {/* Deadline */}
      <div className="shrink-0 text-right min-w-[80px]">
        {task.deadline ? (
          <div>
            <p className={`text-sm font-medium ${overdue ? 'text-red-600' : daysLeft !== null && daysLeft <= 3 ? 'text-amber-600' : 'text-slate-600'}`}>
              {new Date(task.deadline).toLocaleDateString('th-TH', { day: '2-digit', month: 'short' })}
            </p>
            {overdue && <p className="text-xs text-red-500">เลย {daysLate} วัน</p>}
            {!overdue && daysLeft !== null && daysLeft <= 3 && <p className="text-xs text-amber-500">อีก {daysLeft} วัน</p>}
          </div>
        ) : <span className="text-sm text-slate-300">—</span>}
      </div>

      {/* Status */}
      <span className={`shrink-0 text-xs font-medium px-2.5 py-1 rounded-lg ${statusStyle[task.status] || 'bg-slate-100 text-slate-500'}`}>
        {task.status}
      </span>

      {/* Acknowledge button */}
      {!isDone && !task.acknowledged_at && (
        <button
          onClick={() => onAcknowledge(task)}
          disabled={acknowledging === task.id}
          className="shrink-0 text-xs font-semibold bg-indigo-600 text-white px-3 py-1.5 rounded-lg hover:bg-indigo-500 transition-colors disabled:opacity-40 whitespace-nowrap"
        >
          {acknowledging === task.id ? '...' : 'รับงาน'}
        </button>
      )}
      {isDone && (
        <span className="shrink-0 text-xs text-emerald-600 font-medium">✓</span>
      )}
    </div>
  )
}
