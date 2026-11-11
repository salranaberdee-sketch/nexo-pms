'use client'

import { useEffect, useState, useMemo, useRef } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase'
import { useProfile } from '@/lib/profile-context'
import { todayStr } from './TableState'
import { showToast } from './Toast'
import ContentAssets, { type ContentAsset } from './ContentAssets'
import { contentStatusStyle as statusStyle } from '@/lib/status-styles'

// ─── Constants ────────────────────────────────────────────────────────────────

const DONE_STATUS    = 'โพสต์แล้ว'
const ACTIVE_STATUSES = ['รอผลิต', 'ผลิตอยู่', 'รออนุมัติ', 'อนุมัติแล้ว', 'กำหนดโพสต์']
const ALL_STATUSES   = [...ACTIVE_STATUSES, DONE_STATUS]

// Next-step transitions per status, scoped by myRole
const NEXT_STATUS: Record<string, Record<string, string>> = {
  producer: {
    'รอผลิต':      'ผลิตอยู่',
    'ผลิตอยู่':     'รออนุมัติ',
    'อนุมัติแล้ว': 'กำหนดโพสต์',
    'กำหนดโพสต์': 'โพสต์แล้ว',
  },
  assigned_to: {
    'รอผลิต':  'ผลิตอยู่',
    'ผลิตอยู่': 'รออนุมัติ',
  },
  approver: {
    'รออนุมัติ': 'อนุมัติแล้ว',
  },
  // poster role: only responsible for the final posting step
  poster: {
    'กำหนดโพสต์': 'โพสต์แล้ว',
  },
}

// Label for the "advance" button per role + status
const ADVANCE_LABEL: Record<string, Record<string, string>> = {
  producer: {
    'รอผลิต':      '▶ เริ่มผลิต',
    'ผลิตอยู่':     '📤 ส่งอนุมัติ',
    'อนุมัติแล้ว': '📅 กำหนดโพสต์',
    'กำหนดโพสต์': '✅ โพสต์แล้ว',
  },
  assigned_to: {
    'รอผลิต':  '▶ เริ่มผลิต',
    'ผลิตอยู่': '📤 ส่งอนุมัติ',
  },
  approver: {
    'รออนุมัติ': '✅ อนุมัติ',
  },
  poster: {
    'กำหนดโพสต์': '✅ โพสต์แล้ว',
  },
}

// ─── Types ────────────────────────────────────────────────────────────────────

type MyTask = {
  id: number
  product_id: string
  product_name: string
  seq: number
  type: string
  title: string
  objective: string | null
  hook: string | null
  format_size: string | null
  channel: string
  file_link: string | null
  post_link: string | null
  issues: string | null
  status: string
  deadline: string | null
  scheduled_post_date: string | null
  actual_post_date: string | null
  actual_submit_date: string | null
  acknowledged_at: string | null
  assigned_date: string | null
  assigned_by: string
  assigned_by_id: string
  producer: string
  producer_id: string | null
  approver: string
  approver_id: string | null
  assigned_to: string
  assigned_to_id: string | null
  poster: string
  poster_id: string | null
  myRole: 'producer' | 'approver' | 'assigned_to' | 'poster'
  brand: string
}

type GroupKey = 'new' | 'approve' | 'post_today' | 'overdue' | 'pending' | 'done'

type TeamItem = {
  person_id: string
  person_name: string
  role: string
  tasks: MyTask[]
}

// ─── Main component ───────────────────────────────────────────────────────────

export default function MyTasks() {
  const me     = useProfile()
  const canManage = me.role === 'admin' || me.role === 'manager'

  const [tasks, setTasks]         = useState<MyTask[]>([])
  const [teamTasks, setTeamTasks] = useState<MyTask[]>([]) // all tasks (manager/admin)
  const [profiles, setProfiles]   = useState<{ id: string; name: string; role: string }[]>([])
  const [loading, setLoading]     = useState(true)
  const [loadError, setLoadError] = useState('')
  const [activeTab, setActiveTab] = useState<'mine' | 'team'>('mine')
  const [filterBrand, setFilterBrand]   = useState('all')
  const [filterStatus, setFilterStatus] = useState('all')
  const [expandedId, setExpandedId]     = useState<string | null>(null) // `${id}-${role}`
  const [actioning, setActioning]       = useState<string | null>(null)  // `${id}-${action}`
  const [assetsMap, setAssetsMap]       = useState<Record<number, ContentAsset[]>>({})
  const supabase = createClient()

  async function load() {
    setLoadError('')
    setLoading(true)
    const [cRes, pRes, prRes, logRes] = await Promise.all([
      // My tasks
      supabase
        .from('contents')
        .select(`id, product_id, seq, type, title, objective, hook, format_size, channel,
                 file_link, post_link, issues,
                 status, deadline, scheduled_post_date, actual_post_date, actual_submit_date,
                 acknowledged_at, assigned_date,
                 producer, producer_id, approver, approver_id,
                 assigned_to, assigned_to_id, poster, poster_id`)
        .or(`producer_id.eq.${me.id},approver_id.eq.${me.id},assigned_to_id.eq.${me.id},poster_id.eq.${me.id}`),
      // All contents (for team view — manager/admin only)
      canManage
        ? supabase
            .from('contents')
            .select(`id, product_id, seq, type, title, objective, hook, format_size, channel,
                     file_link, post_link, issues,
                     status, deadline, scheduled_post_date, actual_post_date, actual_submit_date,
                     acknowledged_at, assigned_date,
                     producer, producer_id, approver, approver_id,
                     assigned_to, assigned_to_id, poster, poster_id`)
            .in('status', ACTIVE_STATUSES)
        : Promise.resolve({ data: [], error: null }),
      supabase.from('products').select('product_id, name, brand'),
      supabase
        .from('content_assignment_log')
        .select('content_id, role, assigned_by_id, assigned_by_name, assigned_at')
        .order('assigned_at', { ascending: false }),
    ])
    if (cRes.error) { setLoadError(cRes.error.message); setLoading(false); return }

    // Fetch approved profiles (for team view reassignment)
    if (canManage) {
      const { data: pr } = await supabase
        .from('profiles').select('id, name, role').eq('approval_status', 'approved').order('name')
      setProfiles(pr || [])
    }

    const productMap = new Map<string, { product_id: string; name: string; brand: string }>(
      (prRes.data || []).map((p: any) => [p.product_id, p]),
    )

    function buildTasks(rows: any[]): MyTask[] {
      const result: MyTask[] = []
      for (const c of rows) {
        const product = productMap.get(c.product_id)
        const brand   = product?.brand || ''
        const pname   = product?.name  || c.product_id

        const roles: MyTask['myRole'][] = []
        if (c.producer_id   === me.id) roles.push('producer')
        if (c.approver_id   === me.id) roles.push('approver')
        if (c.assigned_to_id === me.id && c.producer_id !== me.id) roles.push('assigned_to')
        // poster role: only if not already producer (producer handles กำหนดโพสต์→โพสต์แล้ว too)
        if (c.poster_id === me.id && c.producer_id !== me.id) roles.push('poster')

        // For non-my-tasks items (team view) just push once as 'producer' placeholder
        if (roles.length === 0) roles.push('producer')

        for (const role of roles) {
          const log = (logRes.data || []).find((l: any) => l.content_id === c.id && l.role === role)
          result.push({
            id:                  c.id,
            product_id:          c.product_id,
            product_name:        pname,
            seq:                 c.seq,
            type:                c.type || 'GRAPHIC',
            title:               c.title,
            objective:           c.objective,
            hook:                c.hook,
            format_size:         c.format_size,
            channel:             c.channel || 'Facebook',
            file_link:           c.file_link,
            post_link:           c.post_link,
            issues:              c.issues,
            status:              c.status || 'รอผลิต',
            deadline:            c.deadline,
            scheduled_post_date: c.scheduled_post_date,
            actual_post_date:    c.actual_post_date,
            actual_submit_date:  c.actual_submit_date,
            acknowledged_at:     c.acknowledged_at,
            assigned_date:       c.assigned_date,
            assigned_by:         log?.assigned_by_name || '',
            assigned_by_id:      log?.assigned_by_id   || '',
            producer:            c.producer     || '',
            producer_id:         c.producer_id  || null,
            approver:            c.approver     || '',
            approver_id:         c.approver_id  || null,
            assigned_to:         c.assigned_to  || '',
            assigned_to_id:      c.assigned_to_id || null,
            poster:              c.poster     || '',
            poster_id:           c.poster_id  || null,
            myRole:              role,
            brand,
          })
        }
      }
      return result
    }

    setTasks(buildTasks(cRes.data || []))
    setTeamTasks(buildTasks(pRes.data || []))
    setLoading(false)
  }

  useEffect(() => { load() }, [me.id])

  // ── Acknowledge ──────────────────────────────────────────────
  async function acknowledge(task: MyTask) {
    if (task.acknowledged_at) return
    const key = `${task.id}-ack`
    setActioning(key)
    const now = new Date().toISOString()
    const { error } = await supabase.from('contents').update({
      acknowledged_at: now, acknowledged_by: me.id,
    }).eq('id', task.id)
    setActioning(null)
    if (error) { showToast(error.message, 'error'); return }
    updateLocalTask(task.id, task.myRole, { acknowledged_at: now })
    showToast('รับงานแล้ว')
  }

  // ── Advance status (next step) ────────────────────────────────
  async function advanceStatus(task: MyTask, extraFields?: Partial<MyTask>) {
    const nextStatus = NEXT_STATUS[task.myRole]?.[task.status]
    if (!nextStatus) return
    const key = `${task.id}-advance`
    setActioning(key)
    const payload: Record<string, unknown> = { status: nextStatus }
    if (nextStatus === 'โพสต์แล้ว' && !task.actual_post_date) {
      payload.actual_post_date = new Date().toISOString().split('T')[0]
    }
    if (nextStatus === 'รออนุมัติ' && !task.actual_submit_date) {
      payload.actual_submit_date = new Date().toISOString().split('T')[0]
    }
    if (extraFields?.file_link)           payload.file_link           = extraFields.file_link
    if (extraFields?.post_link)           payload.post_link           = extraFields.post_link
    if (extraFields?.scheduled_post_date) payload.scheduled_post_date = extraFields.scheduled_post_date
    // Acknowledge automatically on first action
    if (!task.acknowledged_at) {
      payload.acknowledged_at = new Date().toISOString()
      payload.acknowledged_by = me.id
    }
    const { error } = await supabase.from('contents').update(payload).eq('id', task.id)
    setActioning(null)
    if (error) { showToast(error.message, 'error'); return }
    updateLocalTask(task.id, task.myRole, { status: nextStatus, ...payload } as Partial<MyTask>)
    showToast(`อัปเดตเป็น "${nextStatus}" แล้ว`)
  }

  // ── Reject (approver sends back) ──────────────────────────────
  async function rejectContent(task: MyTask, issues: string) {
    const key = `${task.id}-reject`
    setActioning(key)
    const { error } = await supabase.from('contents').update({
      status: 'ผลิตอยู่',
      issues: issues || null,
    }).eq('id', task.id)
    setActioning(null)
    if (error) { showToast(error.message, 'error'); return }
    updateLocalTask(task.id, task.myRole, { status: 'ผลิตอยู่', issues })
    showToast('ส่งกลับแก้ไขแล้ว')
  }

  // ── Inline field update ────────────────────────────────────────
  async function updateField(task: MyTask, fields: Record<string, unknown>) {
    const key = `${task.id}-field`
    setActioning(key)
    const { error } = await supabase.from('contents').update(fields).eq('id', task.id)
    setActioning(null)
    if (error) { showToast(error.message, 'error'); return }
    updateLocalTask(task.id, task.myRole, fields as Partial<MyTask>)
  }

  // ── Reassign (manager/admin) ──────────────────────────────────
  async function reassign(task: MyTask, roleField: 'producer_id' | 'approver_id' | 'assigned_to_id' | 'poster_id', personId: string, personName: string) {
    const nameField = roleField.replace('_id', '') as 'producer' | 'approver' | 'assigned_to' | 'poster'
    const logRole   = nameField as 'producer' | 'approver' | 'assigned_to'
    const payload: Record<string, unknown> = {
      [roleField]: personId || null,
      [nameField]: personName,
    }
    if (logRole === 'producer' && personId !== (task.producer_id || '')) {
      payload.acknowledged_at = null
      payload.acknowledged_by = null
    }
    const { error } = await supabase.from('contents').update(payload).eq('id', task.id)
    if (error) { showToast(error.message, 'error'); return }
    // Log assignment (only for the 3 roles that content_assignment_log tracks)
    if (personId && (logRole === 'producer' || logRole === 'approver' || logRole === 'assigned_to')) {
      await supabase.from('content_assignment_log').insert([{
        content_id:       task.id,
        role:             logRole,
        assigned_to_id:   personId,
        assigned_to_name: personName,
        assigned_by_id:   me.id,
        assigned_by_name: me.name,
      }])
    }
    updateLocalTask(task.id, task.myRole, { [nameField]: personName, [roleField]: personId || null } as Partial<MyTask>)
    showToast('มอบหมายงานแล้ว')
  }

  // ── Assets ────────────────────────────────────────────────────
  async function loadAssets(contentId: number) {
    if (assetsMap[contentId] !== undefined) return
    const { data } = await supabase
      .from('content_assets')
      .select('id, content_id, asset_type, label, url, storage_path, file_size, mime_type, sort_order, uploaded_by, created_at')
      .eq('content_id', contentId)
      .order('sort_order').order('created_at')
    setAssetsMap(prev => ({ ...prev, [contentId]: (data || []) as ContentAsset[] }))
  }

  // ── Local state helper ────────────────────────────────────────
  // Patch all rows of the same content id (status/dates apply to every role row)
  // but keep role-specific fields (acknowledged_at etc.) scoped by role when needed
  function updateLocalTask(id: number, role: MyTask['myRole'], patch: Partial<MyTask>) {
    // Fields that change globally (same content — same values for all roles)
    const globalFields: (keyof MyTask)[] = [
      'status', 'actual_post_date', 'actual_submit_date',
      'file_link', 'post_link', 'scheduled_post_date', 'issues',
      'producer', 'producer_id', 'approver', 'approver_id',
      'assigned_to', 'assigned_to_id', 'poster', 'poster_id',
    ]
    // Fields that are role-scoped (only update the specific role's row)
    const roleScopedFields: (keyof MyTask)[] = ['acknowledged_at', 'myRole']

    const globalPatch = Object.fromEntries(
      Object.entries(patch).filter(([k]) => globalFields.includes(k as keyof MyTask))
    ) as Partial<MyTask>
    const scopedPatch = Object.fromEntries(
      Object.entries(patch).filter(([k]) => roleScopedFields.includes(k as keyof MyTask))
    ) as Partial<MyTask>

    const patchFn = (prev: MyTask[]) =>
      prev.map(t => {
        if (t.id !== id) return t
        // Apply global fields to ALL rows of this content
        const updated = { ...t, ...globalPatch }
        // Apply scoped fields only to the matching role row
        if (t.myRole === role) return { ...updated, ...scopedPatch }
        return updated
      })
    setTasks(patchFn)
    setTeamTasks(patchFn)
  }

  // ── Filters ───────────────────────────────────────────────────
  const displayTasks = activeTab === 'mine' ? tasks : teamTasks
  const allBrands = useMemo(() =>
    [...new Set(displayTasks.map(t => t.brand).filter(Boolean))].sort(),
  [displayTasks])

  const filtered = useMemo(() => displayTasks.filter(t =>
    (filterBrand  === 'all' || t.brand  === filterBrand) &&
    (filterStatus === 'all' || t.status === filterStatus),
  ), [displayTasks, filterBrand, filterStatus])

  // ── Grouping (mine tab) ──────────────────────────────────────
  const TODAY = todayStr()
  const grouped = useMemo(() => {
    const g: Record<GroupKey, MyTask[]> = { new: [], approve: [], post_today: [], overdue: [], pending: [], done: [] }
    for (const t of filtered) {
      const isDone      = t.status === DONE_STATUS
      const isNew       = !t.acknowledged_at && !isDone
      const isOverdue   = !isDone && !!t.deadline && t.deadline < TODAY
      const isApprove   = t.myRole === 'approver' && t.status === 'รออนุมัติ'
      // "โพสต์วันนี้": status = กำหนดโพสต์ AND scheduled_post_date = today (or overdue sched date)
      const isPostToday = !isDone && t.status === 'กำหนดโพสต์' && !!t.scheduled_post_date && t.scheduled_post_date <= TODAY

      if (isDone)           g.done.push(t)
      else if (isNew)       g.new.push(t)
      else if (isApprove)   g.approve.push(t)
      else if (isPostToday) g.post_today.push(t)
      else if (isOverdue)   g.overdue.push(t)
      else                  g.pending.push(t)
    }
    return g
  }, [filtered, TODAY])

  // ── Team grouping (by person) ─────────────────────────────────
  const teamGroups = useMemo((): TeamItem[] => {
    if (activeTab !== 'team') return []
    const map = new Map<string, TeamItem>()

    // Dedup: in team view, one content should appear once per responsible person.
    // Use a Set to track (personId, contentId) pairs already added.
    const seen = new Set<string>()

    for (const t of filtered) {
      // Determine the actual responsible person — prefer producer, then assigned_to, then approver, then poster
      const personId   = t.producer_id || t.assigned_to_id || t.approver_id || t.poster_id || ''
      const personName = t.producer || t.assigned_to || t.approver || t.poster || '(ไม่มีผู้รับผิดชอบ)'
      const dedupKey = `${personId}:${t.id}`
      if (seen.has(dedupKey)) continue  // skip duplicate role rows of same content
      seen.add(dedupKey)

      if (!map.has(personId)) {
        const profile = profiles.find(p => p.id === personId)
        map.set(personId, { person_id: personId, person_name: personName, role: profile?.role || '', tasks: [] })
      }
      map.get(personId)!.tasks.push(t)
    }
    return [...map.values()].sort((a, b) => b.tasks.length - a.tasks.length)
  }, [filtered, activeTab, profiles])

  // For summary chips: count unique content ids to avoid inflating counts when user holds multiple roles
  const newCount     = useMemo(() => new Set(
    tasks.filter(t => !t.acknowledged_at && t.status !== DONE_STATUS).map(t => t.id)
  ).size, [tasks])
  const overdueCount = useMemo(() => new Set(
    tasks.filter(t => t.status !== DONE_STATUS && t.deadline && t.deadline < TODAY).map(t => t.id)
  ).size, [tasks, TODAY])
  const approveCount = tasks.filter(t => t.myRole === 'approver' && t.status === 'รออนุมัติ').length
  // Unique content count for team badge (deduplicated by content id)
  const teamUniqueActiveCount = useMemo(() => new Set(
    teamTasks.filter(t => t.status !== DONE_STATUS).map(t => t.id)
  ).size, [teamTasks])

  if (loading) return (
    <div className="p-6 space-y-4">
      {[1,2,3].map(i => (
        <div key={i} className="bg-white rounded-2xl border border-slate-100 p-5 space-y-3 animate-pulse">
          <div className="h-4 bg-slate-100 rounded w-1/3" />
          <div className="h-12 bg-slate-50 rounded-xl" />
          <div className="h-12 bg-slate-50 rounded-xl" />
        </div>
      ))}
    </div>
  )

  return (
    <div className="p-6 space-y-5">

      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold text-slate-900">งานของฉัน</h1>
          <p className="text-sm text-slate-400 mt-0.5">{me.name} · {me.role}</p>
        </div>
        <button onClick={load}
          className="flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-900 px-3 py-1.5 rounded-xl hover:bg-slate-100 transition-colors shrink-0">
          <RefreshIcon />
          รีเฟรช
        </button>
      </div>

      {loadError && (
        <div className="bg-red-50 border border-red-100 rounded-2xl px-4 py-3 text-sm text-red-600 flex items-center gap-2">
          {loadError}
          <button onClick={load} className="underline">ลองใหม่</button>
        </div>
      )}

      {/* Summary chips */}
      <div className="flex gap-2.5 flex-wrap">
        <Chip label="งานที่ยังทำอยู่" value={new Set(tasks.filter(t => t.status !== DONE_STATUS).map(t => t.id)).size} color="slate" />
        {newCount     > 0 && <Chip label="งานใหม่รอรับ" value={newCount}     color="indigo" />}
        {approveCount > 0 && <Chip label="รอฉันอนุมัติ" value={approveCount} color="amber" />}
        {overdueCount > 0 && <Chip label="เกิน deadline" value={overdueCount} color="red" />}
        {canManage && teamUniqueActiveCount > 0 && (
          <Chip label="งานทั้งทีม" value={teamUniqueActiveCount} color="purple" />
        )}
      </div>

      {/* Tabs (manager/admin only) */}
      {canManage && (
        <div className="flex gap-1 bg-slate-100 p-1 rounded-xl w-fit">
          <TabBtn active={activeTab === 'mine'} onClick={() => setActiveTab('mine')}>งานของฉัน</TabBtn>
          <TabBtn active={activeTab === 'team'} onClick={() => setActiveTab('team')}>
            ภาพรวมทีม
            {teamUniqueActiveCount > 0 && (
              <span className="ml-1.5 bg-purple-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full">
                {teamUniqueActiveCount}
              </span>
            )}
          </TabBtn>
        </div>
      )}

      {/* Filters */}
      <div className="flex gap-2 flex-wrap items-center">
        {allBrands.length > 1 && (
          <select value={filterBrand} onChange={e => setFilterBrand(e.target.value)}
            className="border border-slate-200 rounded-xl px-3.5 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500">
            <option value="all">ทุก Brand</option>
            {allBrands.map(b => <option key={b} value={b}>{b}</option>)}
          </select>
        )}
        <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)}
          className="border border-slate-200 rounded-xl px-3.5 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500">
          <option value="all">ทุกสถานะ</option>
          {ALL_STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
        </select>
        {(filterBrand !== 'all' || filterStatus !== 'all') && (
          <button onClick={() => { setFilterBrand('all'); setFilterStatus('all') }}
            className="text-sm text-slate-400 hover:text-slate-700 px-3 py-2 rounded-xl hover:bg-slate-100 transition-colors">
            ล้างตัวกรอง ✕
          </button>
        )}
      </div>

      {/* ── Mine tab ─────────────────────────────────────────── */}
      {activeTab === 'mine' && (
        filtered.length === 0
          ? <EmptyState />
          : <div className="space-y-5">
              {(
                [
                  { key: 'new'        as GroupKey, label: '📬 งานใหม่ — รอรับทราบ',      accent: 'border-indigo-200' },
                  { key: 'approve'    as GroupKey, label: '✅ รอฉันอนุมัติ',              accent: 'border-amber-200' },
                  { key: 'post_today' as GroupKey, label: '📅 ต้องโพสต์วันนี้',           accent: 'border-orange-300 bg-orange-50/30' },
                  { key: 'overdue'    as GroupKey, label: '🔴 เกิน Deadline',              accent: 'border-red-200' },
                  { key: 'pending'    as GroupKey, label: '🔵 กำลังดำเนินการ',            accent: 'border-slate-200' },
                  { key: 'done'       as GroupKey, label: '✓ เสร็จแล้ว',                  accent: 'border-slate-100 opacity-70' },
                ]
              ).filter(g => grouped[g.key].length > 0).map(({ key, label, accent }) => (
                <div key={key} className={`bg-white rounded-2xl border overflow-hidden shadow-sm ${accent}`}>
                  <div className="px-5 py-3 border-b border-slate-100 flex items-center justify-between">
                    <h2 className="text-sm font-semibold text-slate-700">{label}</h2>
                    <span className="text-xs text-slate-400 tabular-nums">{grouped[key].length} รายการ</span>
                  </div>
                  <div className="divide-y divide-slate-50">
                    {grouped[key].map(task => (
                      <TaskRow
                        key={`${task.id}-${task.myRole}`}
                        task={task}
                        myRole={task.myRole}
                        expandKey={`${task.id}-${task.myRole}`}
                        expanded={expandedId === `${task.id}-${task.myRole}`}
                        onToggleExpand={() => {
                          const key = `${task.id}-${task.myRole}`
                          setExpandedId(p => p === key ? null : key)
                          loadAssets(task.id)
                        }}
                        assets={assetsMap[task.id] || []}
                        onAssetsChange={updated => setAssetsMap(prev => ({ ...prev, [task.id]: updated }))}
                        actioning={actioning}
                        onAcknowledge={acknowledge}
                        onAdvance={advanceStatus}
                        onReject={rejectContent}
                        onUpdateField={updateField}
                        onReassign={reassign}
                        profiles={profiles}
                        canManage={canManage}
                        showReassign={false}
                      />
                    ))}
                  </div>
                </div>
              ))}
            </div>
      )}

      {/* ── Team tab ─────────────────────────────────────────── */}
      {activeTab === 'team' && (
        teamGroups.length === 0
          ? <EmptyState message="ไม่มีงานที่กำลังดำเนินการในทีม" />
          : <div className="space-y-4">
              {teamGroups.map(group => (
                <div key={group.person_id} className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
                  {/* Person header */}
                  <div className="px-5 py-3 bg-slate-50 border-b border-slate-100 flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-slate-400 to-slate-600 flex items-center justify-center text-white text-xs font-bold shrink-0">
                      {group.person_name.charAt(0)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-slate-800 truncate">{group.person_name}</p>
                      <p className="text-xs text-slate-400">{group.role}</p>
                    </div>
                    <div className="flex gap-1.5">
                      {group.tasks.filter(t => t.status !== DONE_STATUS).length > 0 && (
                        <span className="text-xs font-semibold bg-blue-50 text-blue-700 px-2 py-0.5 rounded-full">
                          {group.tasks.filter(t => t.status !== DONE_STATUS).length} งาน
                        </span>
                      )}
                      {group.tasks.filter(t => t.deadline && t.deadline < TODAY && t.status !== DONE_STATUS).length > 0 && (
                        <span className="text-xs font-semibold bg-red-50 text-red-600 px-2 py-0.5 rounded-full">
                          {group.tasks.filter(t => t.deadline && t.deadline < TODAY && t.status !== DONE_STATUS).length} เกิน deadline
                        </span>
                      )}
                      {group.tasks.filter(t => t.status === DONE_STATUS).length > 0 && (
                        <span className="text-xs font-semibold bg-emerald-50 text-emerald-600 px-2 py-0.5 rounded-full">
                          ✓ {group.tasks.filter(t => t.status === DONE_STATUS).length} เสร็จ
                        </span>
                      )}
                    </div>
                  </div>
                  {/* Tasks */}
                  <div className="divide-y divide-slate-50">
                    {group.tasks.map(task => (
                      <TaskRow
                        key={`team-${task.id}-${task.myRole}`}
                        task={task}
                        myRole={'producer'}
                        expandKey={`team-${task.id}-${task.myRole}`}
                        expanded={expandedId === `team-${task.id}-${task.myRole}`}
                        onToggleExpand={() => {
                          const key = `team-${task.id}-${task.myRole}`
                          setExpandedId(p => p === key ? null : key)
                          loadAssets(task.id)
                        }}
                        assets={assetsMap[task.id] || []}
                        onAssetsChange={updated => setAssetsMap(prev => ({ ...prev, [task.id]: updated }))}
                        actioning={actioning}
                        onAcknowledge={acknowledge}
                        onAdvance={advanceStatus}
                        onReject={rejectContent}
                        onUpdateField={updateField}
                        onReassign={reassign}
                        profiles={profiles}
                        canManage={canManage}
                        showReassign={true}
                      />
                    ))}
                  </div>
                </div>
              ))}
            </div>
      )}
    </div>
  )
}

// ─── TaskRow ───────────────────────────────────────────────────────────────────

function TaskRow({
  task, myRole, expandKey, expanded, onToggleExpand,
  actioning, onAcknowledge, onAdvance, onReject, onUpdateField, onReassign,
  profiles, canManage, showReassign,
  assets, onAssetsChange,
}: {
  task:            MyTask
  myRole:          MyTask['myRole']
  expandKey:       string
  expanded:        boolean
  onToggleExpand:  () => void
  actioning:       string | null
  onAcknowledge:   (t: MyTask) => void
  onAdvance:       (t: MyTask, extra?: Partial<MyTask>) => void
  onReject:        (t: MyTask, issues: string) => void
  onUpdateField:   (t: MyTask, fields: Record<string, unknown>) => void
  onReassign:      (t: MyTask, roleField: 'producer_id'|'approver_id'|'assigned_to_id'|'poster_id', id: string, name: string) => void
  profiles:        { id: string; name: string; role: string }[]
  canManage:       boolean
  showReassign:    boolean
  assets:          ContentAsset[]
  onAssetsChange:  (updated: ContentAsset[]) => void
}) {
  const TODAY_STR   = todayStr()
  const isDone      = task.status === DONE_STATUS
  const overdue     = !isDone && task.deadline && task.deadline < TODAY_STR
  const daysLate    = overdue ? Math.round((Date.now() - new Date(task.deadline!).getTime()) / 86400000) : 0
  const daysLeft    = !isDone && task.deadline && task.deadline >= TODAY_STR
    ? Math.round((new Date(task.deadline).getTime() - Date.now()) / 86400000)
    : null
  const isNew       = !task.acknowledged_at && !isDone

  const nextStatus  = NEXT_STATUS[myRole]?.[task.status]
  const advLabel    = ADVANCE_LABEL[myRole]?.[task.status]
  const isActioning = actioning?.startsWith(`${task.id}-`)

  // Expand state for reject/advance forms
  const [showRejectForm, setShowRejectForm]     = useState(false)
  const [rejectIssues, setRejectIssues]         = useState(task.issues || '')
  const [showAdvanceForm, setShowAdvanceForm]   = useState(false)
  // Extra fields needed when advancing to certain statuses
  const [advFileLink, setAdvFileLink]           = useState(task.file_link || '')
  const [advPostLink, setAdvPostLink]           = useState(task.post_link || '')
  const [advSchedDate, setAdvSchedDate]         = useState(task.scheduled_post_date || '')

  const roleLabel: Record<string, string> = {
    producer: 'ผู้ผลิต', approver: 'ผู้อนุมัติ', assigned_to: 'ผู้รับผิดชอบ', poster: 'ผู้โพสต์',
  }
  const roleColor: Record<string, string> = {
    producer: 'bg-blue-50 text-blue-700', approver: 'bg-purple-50 text-purple-700',
    assigned_to: 'bg-teal-50 text-teal-700', poster: 'bg-orange-50 text-orange-700',
  }
  const typeIcon: Record<string, string> = { GRAPHIC: '🖼', VIDEO: '🎬', COPY: '📝' }

  // Require file_link when submitting for approval
  const needsFileLink = nextStatus === 'รออนุมัติ'
  // Require scheduled_post_date when setting to กำหนดโพสต์
  const needsSchedDate = nextStatus === 'กำหนดโพสต์'
  // Require post_link when marking as posted
  const needsPostLink = nextStatus === 'โพสต์แล้ว'
  const needsAdvanceForm = needsFileLink || needsSchedDate || needsPostLink

  function handleAdvance() {
    if (needsAdvanceForm && !showAdvanceForm) {
      setShowAdvanceForm(true)
      return
    }
    onAdvance(task, {
      file_link:           advFileLink  || undefined,
      post_link:           advPostLink  || undefined,
      scheduled_post_date: advSchedDate || undefined,
    })
    setShowAdvanceForm(false)
  }

  return (
    <div className={`transition-colors ${isNew ? 'bg-indigo-50/20' : 'bg-white'}`}>
      {/* ── Main row ── */}
      <div
        className="flex items-center gap-3 px-5 py-3.5 cursor-pointer hover:bg-slate-50/60 transition-colors group"
        onClick={onToggleExpand}
      >
        {/* New dot */}
        <div className="shrink-0 w-2">
          {isNew && <div className="w-2 h-2 rounded-full bg-indigo-500 animate-pulse" />}
        </div>

        {/* Type icon */}
        <span className="shrink-0 text-base">{typeIcon[task.type] || '📄'}</span>

        {/* Role badge */}
        <span className={`shrink-0 hidden sm:inline text-xs font-semibold px-2 py-0.5 rounded-lg ${roleColor[myRole]}`}>
          {roleLabel[myRole]}
        </span>

        {/* Title + meta */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            {isNew && (
              <span className="shrink-0 text-[10px] font-bold bg-indigo-500 text-white px-1.5 py-0.5 rounded-full">ใหม่</span>
            )}
            <p className="font-medium text-slate-800 truncate text-sm leading-snug">
              {task.title}
            </p>
          </div>
          <p className="text-xs text-slate-400 mt-0.5 truncate">
            <span className="font-mono">{task.product_id}</span>
            {task.brand && <> · {task.brand}</>}
            {task.assigned_by && <> · มอบโดย <span className="text-slate-500">{task.assigned_by}</span></>}
          </p>
        </div>

        {/* Deadline */}
        <div className="shrink-0 text-right hidden sm:block min-w-[70px]">
          {task.deadline ? (
            <>
              <p className={`text-xs font-medium ${overdue ? 'text-red-600' : daysLeft !== null && daysLeft <= 3 ? 'text-amber-600' : 'text-slate-500'}`}>
                {fmtDate(task.deadline)}
              </p>
              {overdue
                ? <p className="text-[10px] text-red-400">เลย {daysLate} วัน</p>
                : daysLeft !== null && daysLeft <= 3
                  ? <p className="text-[10px] text-amber-400">อีก {daysLeft} วัน</p>
                  : null}
            </>
          ) : <span className="text-xs text-slate-300">—</span>}
        </div>

        {/* Status pill */}
        <span className={`shrink-0 text-xs font-medium px-2.5 py-0.5 rounded-full ${statusStyle[task.status] || 'bg-slate-100 text-slate-500'}`}>
          {task.status}
        </span>

        {/* Expand chevron */}
        <span className={`shrink-0 text-slate-300 group-hover:text-slate-500 transition-transform ${expanded ? 'rotate-180' : ''}`}>
          <ChevronIcon />
        </span>
      </div>

      {/* ── Expanded panel ── */}
      {expanded && (
        <div className="border-t border-slate-100 bg-slate-50/40 px-5 py-4 space-y-4">

          {/* Detail grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
            <InfoPair label="ประเภท"   value={task.type} />
            <InfoPair label="ช่องทาง"  value={task.channel} />
            <InfoPair label="Format"   value={task.format_size || '—'} />
            <InfoPair label="Deadline" value={task.deadline ? fmtDate(task.deadline) : '—'} />
            {task.objective && <InfoPair label="Objective" value={task.objective} className="col-span-2" />}
            {task.hook      && <InfoPair label="Hook"      value={task.hook}      className="col-span-2" />}
            {task.issues    && (
              <div className="col-span-2 sm:col-span-4 bg-red-50 border border-red-100 rounded-xl px-3 py-2">
                <p className="text-xs font-semibold text-red-600 mb-0.5">Issues / ข้อแก้ไข</p>
                <p className="text-xs text-red-700">{task.issues}</p>
              </div>
            )}
          </div>

          {/* Links */}
          <div className="flex gap-3 flex-wrap">
            {task.file_link && (
              <a href={task.file_link} target="_blank" rel="noreferrer"
                className="text-xs text-blue-600 hover:underline flex items-center gap-1">
                📎 ไฟล์งาน
              </a>
            )}
            {task.post_link && (
              <a href={task.post_link} target="_blank" rel="noreferrer"
                className="text-xs text-emerald-600 hover:underline flex items-center gap-1">
                🔗 ลิงก์โพสต์
              </a>
            )}
            <Link href={`/contents?product=${task.product_id}`}
              className="text-xs text-slate-500 hover:text-indigo-600 hover:underline"
              onClick={e => e.stopPropagation()}>
              → ดูใน Contents
            </Link>
          </div>

          {/* ─── Assets panel ─── */}
          <div className="border-t border-slate-100 pt-3" onClick={e => e.stopPropagation()}>
            <ContentAssets
              contentId={task.id}
              assets={assets}
              canWrite={myRole === 'producer' || myRole === 'assigned_to' || canManage}
              canDelete={canManage}
              onAssetsChange={onAssetsChange}
            />
          </div>

          {/* ─── Actions by role ─── */}

          {/* Acknowledge */}
          {!isDone && !task.acknowledged_at && (
            <div className="flex items-center gap-2 p-3 bg-indigo-50 rounded-xl border border-indigo-100">
              <span className="text-xs text-indigo-700 flex-1">กด "รับงาน" เพื่อยืนยันว่าเห็นงานนี้แล้ว</span>
              <button
                onClick={e => { e.stopPropagation(); onAcknowledge(task) }}
                disabled={!!isActioning}
                className="text-xs font-semibold bg-indigo-600 text-white px-4 py-1.5 rounded-lg hover:bg-indigo-500 transition-colors disabled:opacity-40"
              >
                {isActioning ? '...' : 'รับงาน'}
              </button>
            </div>
          )}

          {/* Advance status — producer / assigned_to / poster */}
          {(myRole === 'producer' || myRole === 'assigned_to' || myRole === 'poster') && advLabel && !isDone && (
            <div className="space-y-2">
              {/* Optional extra fields */}
              {showAdvanceForm && (
                <div className="space-y-2 bg-white rounded-xl border border-slate-200 p-3">
                  {needsFileLink && (
                    <div>
                      <label className="text-xs text-slate-500 block mb-1">ลิงก์ไฟล์งาน (สำหรับ approver)</label>
                      <input
                        value={advFileLink}
                        onChange={e => setAdvFileLink(e.target.value)}
                        onClick={e => e.stopPropagation()}
                        placeholder="https://drive.google.com/..."
                        className="w-full border border-slate-200 rounded-lg px-3 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      />
                    </div>
                  )}
                  {needsSchedDate && (
                    <div>
                      <label className="text-xs text-slate-500 block mb-1">วันที่กำหนดโพสต์</label>
                      <input
                        type="date"
                        value={advSchedDate}
                        onChange={e => setAdvSchedDate(e.target.value)}
                        onClick={e => e.stopPropagation()}
                        className="border border-slate-200 rounded-lg px-3 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      />
                    </div>
                  )}
                  {needsPostLink && (
                    <div>
                      <label className="text-xs text-slate-500 block mb-1">ลิงก์โพสต์จริง</label>
                      <input
                        value={advPostLink}
                        onChange={e => setAdvPostLink(e.target.value)}
                        onClick={e => e.stopPropagation()}
                        placeholder="https://facebook.com/..."
                        className="w-full border border-slate-200 rounded-lg px-3 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      />
                    </div>
                  )}
                </div>
              )}
              <div className="flex gap-2">
                <button
                  onClick={e => { e.stopPropagation(); handleAdvance() }}
                  disabled={!!isActioning}
                  className="text-xs font-semibold bg-emerald-600 text-white px-4 py-2 rounded-xl hover:bg-emerald-500 transition-colors disabled:opacity-40"
                >
                  {isActioning ? '...' : advLabel}
                </button>
                {showAdvanceForm && (
                  <button
                    onClick={e => { e.stopPropagation(); setShowAdvanceForm(false) }}
                    className="text-xs text-slate-400 hover:text-slate-600 px-3 py-2 rounded-xl hover:bg-slate-100"
                  >
                    ยกเลิก
                  </button>
                )}
              </div>
            </div>
          )}

          {/* Approve / Reject — approver */}
          {myRole === 'approver' && task.status === 'รออนุมัติ' && (
            <div className="space-y-2">
              <div className="flex gap-2">
                <button
                  onClick={e => { e.stopPropagation(); onAdvance(task) }}
                  disabled={!!isActioning}
                  className="text-xs font-semibold bg-emerald-600 text-white px-4 py-2 rounded-xl hover:bg-emerald-500 transition-colors disabled:opacity-40"
                >
                  {isActioning ? '...' : '✅ อนุมัติ'}
                </button>
                <button
                  onClick={e => { e.stopPropagation(); setShowRejectForm(!showRejectForm); setRejectIssues(task.issues || '') }}
                  className="text-xs font-semibold bg-red-50 text-red-600 border border-red-200 px-4 py-2 rounded-xl hover:bg-red-100 transition-colors"
                >
                  ↩ ส่งกลับแก้ไข
                </button>
              </div>
              {showRejectForm && (
                <div className="bg-white border border-red-100 rounded-xl p-3 space-y-2" onClick={e => e.stopPropagation()}>
                  <label className="text-xs font-medium text-red-600">ระบุข้อแก้ไข</label>
                  <textarea
                    value={rejectIssues}
                    onChange={e => setRejectIssues(e.target.value)}
                    rows={2}
                    placeholder="บอกสิ่งที่ต้องแก้ไข..."
                    className="w-full border border-slate-200 rounded-lg px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-red-400 resize-none"
                  />
                  <div className="flex gap-2">
                    <button
                      onClick={() => { onReject(task, rejectIssues); setShowRejectForm(false) }}
                      disabled={!!isActioning}
                      className="text-xs font-semibold bg-red-600 text-white px-4 py-1.5 rounded-lg hover:bg-red-500 disabled:opacity-40"
                    >
                      {isActioning ? '...' : 'ส่งกลับ'}
                    </button>
                    <button
                      onClick={() => setShowRejectForm(false)}
                      className="text-xs text-slate-400 hover:text-slate-600 px-3 py-1.5 rounded-lg hover:bg-slate-100"
                    >
                      ยกเลิก
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Inline file_link update — producer, any active status (not poster) */}
          {(myRole === 'producer' || myRole === 'assigned_to') && !isDone && task.status !== 'รออนุมัติ' && (
            <InlineFieldUpdate
              label="อัปเดตลิงก์ไฟล์งาน"
              value={task.file_link || ''}
              placeholder="https://drive.google.com/..."
              onSave={val => onUpdateField(task, { file_link: val || null })}
            />
          )}

          {/* Reassign — manager/admin */}
          {showReassign && canManage && (
            <div className="border-t border-slate-100 pt-3 space-y-2">
              <p className="text-xs font-semibold text-slate-500">มอบหมายใหม่</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <ReassignPicker
                  label="ผู้ผลิต"
                  currentId={task.producer_id || ''}
                  currentName={task.producer}
                  profiles={profiles}
                  onSave={(id, name) => onReassign(task, 'producer_id', id, name)}
                />
                <ReassignPicker
                  label="ผู้อนุมัติ"
                  currentId={task.approver_id || ''}
                  currentName={task.approver}
                  profiles={profiles}
                  onSave={(id, name) => onReassign(task, 'approver_id', id, name)}
                />
                <ReassignPicker
                  label="ผู้รับผิดชอบ"
                  currentId={task.assigned_to_id || ''}
                  currentName={task.assigned_to}
                  profiles={profiles}
                  onSave={(id, name) => onReassign(task, 'assigned_to_id', id, name)}
                />
                <ReassignPicker
                  label="ผู้โพสต์"
                  currentId={task.poster_id || ''}
                  currentName={task.poster}
                  profiles={profiles}
                  onSave={(id, name) => onReassign(task, 'poster_id', id, name)}
                />
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

// ─── Small components ──────────────────────────────────────────────────────────

function InlineFieldUpdate({ label, value, placeholder, onSave }: {
  label: string; value: string; placeholder?: string; onSave: (v: string) => void
}) {
  const [editing, setEditing] = useState(false)
  const [val, setVal]         = useState(value)
  const inputRef              = useRef<HTMLInputElement>(null)

  useEffect(() => { if (editing) inputRef.current?.focus() }, [editing])

  if (!editing) {
    return (
      <button
        onClick={e => { e.stopPropagation(); setVal(value); setEditing(true) }}
        className="text-xs text-slate-400 hover:text-indigo-600 hover:underline transition-colors"
      >
        ✏️ {label}
        {value && <span className="text-slate-500 ml-1 truncate max-w-[160px] inline-block align-bottom">{value}</span>}
      </button>
    )
  }
  return (
    <div className="flex gap-2 items-center" onClick={e => e.stopPropagation()}>
      <input
        ref={inputRef}
        value={val}
        onChange={e => setVal(e.target.value)}
        placeholder={placeholder}
        className="flex-1 border border-slate-200 rounded-lg px-3 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500"
        onKeyDown={e => {
          if (e.key === 'Enter')  { onSave(val); setEditing(false) }
          if (e.key === 'Escape') { setEditing(false) }
        }}
      />
      <button onClick={() => { onSave(val); setEditing(false) }} className="text-xs text-emerald-600 font-semibold hover:underline">บันทึก</button>
      <button onClick={() => setEditing(false)} className="text-xs text-slate-400 hover:text-slate-600">ยกเลิก</button>
    </div>
  )
}

function ReassignPicker({ label, currentId, currentName, profiles, onSave }: {
  label: string; currentId: string; currentName: string
  profiles: { id: string; name: string; role: string }[]
  onSave: (id: string, name: string) => void
}) {
  const [sel, setSel] = useState(currentId)
  const changed = sel !== currentId
  return (
    <div className="space-y-1">
      <label className="text-[10px] text-slate-400 font-medium">{label}</label>
      <div className="flex gap-1">
        <select
          value={sel}
          onChange={e => setSel(e.target.value)}
          onClick={e => e.stopPropagation()}
          className="flex-1 border border-slate-200 rounded-lg px-2 py-1.5 text-xs bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500 min-w-0"
        >
          <option value="">— ไม่ระบุ —</option>
          {profiles.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
        </select>
        {changed && (
          <button
            onClick={e => {
              e.stopPropagation()
              const name = profiles.find(p => p.id === sel)?.name || ''
              onSave(sel, name)
            }}
            className="shrink-0 text-[10px] font-semibold bg-emerald-600 text-white px-2 py-1.5 rounded-lg hover:bg-emerald-500"
          >
            ✓
          </button>
        )}
      </div>
    </div>
  )
}

function Chip({ label, value, color }: { label: string; value: number; color: string }) {
  const colors: Record<string, string> = {
    slate:  'bg-white border-slate-100 text-slate-700',
    indigo: 'bg-indigo-50 border-indigo-100 text-indigo-700',
    amber:  'bg-amber-50 border-amber-100 text-amber-700',
    red:    'bg-red-50 border-red-100 text-red-600',
    purple: 'bg-purple-50 border-purple-100 text-purple-700',
  }
  return (
    <div className={`rounded-xl border px-4 py-2.5 flex items-center gap-2 shadow-sm ${colors[color] || colors.slate}`}>
      <span className="text-sm">{label}</span>
      <span className="text-sm font-bold tabular-nums">{value}</span>
    </div>
  )
}

function TabBtn({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-colors flex items-center gap-1 ${
        active ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'
      }`}
    >
      {children}
    </button>
  )
}

function InfoPair({ label, value, className }: { label: string; value: string; className?: string }) {
  return (
    <div className={className}>
      <p className="text-[10px] text-slate-400 font-medium mb-0.5">{label}</p>
      <p className="text-xs text-slate-700 break-words">{value}</p>
    </div>
  )
}

function EmptyState({ message }: { message?: string }) {
  return (
    <div className="bg-white rounded-2xl border border-slate-100 p-12 text-center">
      <p className="text-slate-400 text-sm">{message ?? 'ยังไม่มีงานที่มอบหมายให้คุณ'}</p>
    </div>
  )
}

function fmtDate(d: string) {
  return new Date(d).toLocaleDateString('th-TH', { day: '2-digit', month: 'short' })
}

function RefreshIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
      <polyline points="23 4 23 10 17 10"/><polyline points="1 20 1 14 7 14"/>
      <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"/>
    </svg>
  )
}

function ChevronIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
      <polyline points="6 9 12 15 18 9"/>
    </svg>
  )
}
