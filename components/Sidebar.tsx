'use client'

import React, { useEffect, useState, useMemo } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import type { User } from '@supabase/supabase-js'
import { createClient } from '@/lib/supabase'
import { useIsAdmin, type Profile } from '@/lib/profile-context'

// ─── Icons ────────────────────────────────────────────────────────────────────

function IconDashboard() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="3" width="7" height="7" rx="1" /><rect x="14" y="3" width="7" height="7" rx="1" />
      <rect x="14" y="14" width="7" height="7" rx="1" /><rect x="3" y="14" width="7" height="7" rx="1" />
    </svg>
  )
}
function IconBox() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" />
    </svg>
  )
}
function IconFileText() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
      <polyline points="14 2 14 8 20 8" />
      <line x1="16" y1="13" x2="8" y2="13" /><line x1="16" y1="17" x2="8" y2="17" />
    </svg>
  )
}
function IconBarChart() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="18" y1="20" x2="18" y2="10" /><line x1="12" y1="20" x2="12" y2="4" /><line x1="6" y1="20" x2="6" y2="14" />
    </svg>
  )
}
function IconTrendingUp() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="23 6 13.5 15.5 8.5 10.5 1 18" /><polyline points="17 6 23 6 23 12" />
    </svg>
  )
}
function IconUserPlus() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" /><circle cx="8.5" cy="7" r="4" />
      <line x1="20" y1="8" x2="20" y2="14" /><line x1="23" y1="11" x2="17" y2="11" />
    </svg>
  )
}
function IconUsers() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" />
      <path d="M23 21v-2a4 4 0 0 0-3-3.87" /><path d="M16 3.13a4 4 0 0 1 0 7.75" />
    </svg>
  )
}
function IconCheckSquare() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="9 11 12 14 22 4" />
      <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" />
    </svg>
  )
}
function IconClipboard() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"/>
      <rect x="8" y="2" width="8" height="4" rx="1" ry="1"/>
      <line x1="9" y1="12" x2="15" y2="12"/><line x1="9" y1="16" x2="13" y2="16"/>
    </svg>
  )
}
function IconLogOut() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
      <polyline points="16 17 21 12 16 7" /><line x1="21" y1="12" x2="9" y2="12" />
    </svg>
  )
}
function IconChevronLeft() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
      <polyline points="15 18 9 12 15 6" />
    </svg>
  )
}
function IconChevronRight() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
      <polyline points="9 18 15 12 9 6" />
    </svg>
  )
}

// ─── Role badge ───────────────────────────────────────────────────────────────

const roleStyle: Record<string, string> = {
  admin:   'bg-purple-50 text-purple-700',
  manager: 'bg-blue-50 text-blue-700',
  editor:  'bg-teal-50 text-teal-700',
  viewer:  'bg-slate-100 text-slate-500',
}

// ─── Sidebar ──────────────────────────────────────────────────────────────────

export default function Sidebar({
  user, profile, onCollapse,
}: {
  user: User | null
  profile: Profile | null
  onCollapse?: (collapsed: boolean) => void
}) {
  const pathname  = usePathname()
  const supabase  = createClient()
  const isAdmin   = useIsAdmin()

  const [collapsed, setCollapsed] = useState(() => {
    if (typeof window === 'undefined') return false
    return localStorage.getItem('sidebar-collapsed') === '1'
  })
  const [pendingCount, setPendingCount] = useState(0)
  const [myTaskCount, setMyTaskCount]   = useState(0)
  const [confirmLogout, setConfirmLogout] = useState(false)

  // Notify parent layout of collapse state
  useEffect(() => {
    onCollapse?.(collapsed)
    if (typeof window !== 'undefined') {
      localStorage.setItem('sidebar-collapsed', collapsed ? '1' : '0')
    }
  }, [collapsed])

  useEffect(() => {
    if (!isAdmin) return
    supabase
      .from('profiles')
      .select('id', { count: 'exact', head: true })
      .eq('approval_status', 'pending')
      .then(({ count }: { count: number | null }) => setPendingCount(count ?? 0))
  }, [supabase, isAdmin])

  useEffect(() => {
    if (!profile?.id) return
    supabase
      .from('contents')
      .select('id', { count: 'exact', head: true })
      .or(`producer_id.eq.${profile.id},approver_id.eq.${profile.id},assigned_to_id.eq.${profile.id}`)
      .is('acknowledged_at', null)
      .neq('status', 'โพสต์แล้ว')
      .then(({ count }: { count: number | null }) => setMyTaskCount(count ?? 0))
  }, [supabase, profile?.id])

  const nav = [
    { path: '/dashboard', label: 'Dashboard',      Icon: IconDashboard },
    { path: '/products',  label: 'Products',        Icon: IconBox },
    { path: '/briefs',    label: 'Briefs',           Icon: IconClipboard },
    { path: '/contents',  label: 'Content',          Icon: IconFileText },
    { path: '/my-tasks',  label: 'งานของฉัน',       Icon: IconCheckSquare },
    { path: '/ads',       label: 'Ads',              Icon: IconBarChart },
    { path: '/leads',     label: 'Leads',            Icon: IconUserPlus },
    { path: '/sales',     label: 'Sales',            Icon: IconTrendingUp },
    { path: '/team',      label: 'ทีม',             Icon: IconUsers, adminOnly: true },
  ] as const

  const visibleNav = useMemo(
    () => nav.filter(item => !('adminOnly' in item) || !item.adminOnly || isAdmin),
    [isAdmin], // eslint-disable-line react-hooks/exhaustive-deps
  )

  const initials = (profile?.name?.[0] || user?.email?.[0] || '?').toUpperCase()

  return (
    <aside
      className="relative flex flex-col h-screen shrink-0 bg-white border-r border-slate-200 transition-[width] duration-200 ease-in-out"
      style={{ width: collapsed ? '64px' : '208px' }}
    >
      {/* ── Logo ── */}
      <div className={`border-b border-slate-200 transition-all duration-200 flex items-center ${collapsed ? 'px-3 py-4 justify-center' : 'px-4 py-4 justify-between'}`}>
        <Link href="/dashboard" className="flex items-center gap-2.5 hover:opacity-80 transition-opacity min-w-0">
          <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0"
            style={{ background: 'linear-gradient(135deg, #6366f1, #8b5cf6)' }}>
            <span className="text-white font-bold text-sm">N</span>
          </div>
          {!collapsed && (
            <div className="min-w-0 overflow-hidden">
              <p className="font-semibold text-slate-900 text-sm leading-none whitespace-nowrap">Nexo PMS</p>
              <p className="text-[11px] text-slate-400 mt-0.5">v1.0</p>
            </div>
          )}
        </Link>
        {/* Collapse button — inside header, right side when expanded */}
        {!collapsed && (
          <button
            onClick={() => setCollapsed(true)}
            title="ย่อ sidebar"
            className="shrink-0 ml-2 w-6 h-6 rounded-lg flex items-center justify-center text-slate-300 hover:text-slate-600 hover:bg-slate-100 transition-colors"
          >
            <IconChevronLeft />
          </button>
        )}
      </div>

      {/* Expand button — shown at top of nav when collapsed */}
      {collapsed && (
        <button
          onClick={() => setCollapsed(false)}
          title="ขยาย sidebar"
          className="mx-auto mt-3 mb-1 w-9 h-7 rounded-lg flex items-center justify-center text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 transition-colors"
        >
          <IconChevronRight />
        </button>
      )}

      {/* ── Nav ── */}
      <nav className={`flex-1 py-3 space-y-0.5 overflow-y-auto overflow-x-hidden ${collapsed ? 'px-2' : 'px-2'}`}>
        {visibleNav.map(({ path, label, Icon }) => {
          const active = pathname === path
          const badge =
            path === '/team'     && pendingCount > 0 ? pendingCount :
            path === '/my-tasks' && myTaskCount  > 0 ? myTaskCount  : 0

          return (
            <div key={path} className="relative group/nav">
              <Link
                href={path}
                prefetch={true}
                className={`flex items-center gap-2.5 rounded-xl text-sm font-medium transition-all
                  ${collapsed ? 'px-2.5 py-2.5 justify-center' : 'px-3 py-2.5'}
                  ${active
                    ? 'bg-indigo-50 text-indigo-700 shadow-sm'
                    : 'text-slate-500 hover:bg-slate-50 hover:text-slate-800'}`}
              >
                {/* Icon — always visible */}
                <span className="shrink-0 relative">
                  <Icon />
                  {/* Badge on icon when collapsed */}
                  {collapsed && badge > 0 && (
                    <span className="absolute -top-1.5 -right-1.5 w-3.5 h-3.5 bg-indigo-500 text-white text-[8px] font-bold rounded-full flex items-center justify-center">
                      {badge > 9 ? '9+' : badge}
                    </span>
                  )}
                </span>

                {/* Label + badge — only when expanded */}
                {!collapsed && (
                  <>
                    <span className="truncate">{label}</span>
                    {badge > 0 && (
                      <span className={`ml-auto text-[10px] font-semibold px-1.5 py-0.5 rounded-full tabular-nums
                        ${path === '/team' ? 'bg-amber-100 text-amber-700' : 'bg-indigo-100 text-indigo-700'}`}>
                        {badge}
                      </span>
                    )}
                  </>
                )}
              </Link>

              {/* Tooltip — only when collapsed */}
              {collapsed && (
                <div className="pointer-events-none absolute left-full top-1/2 -translate-y-1/2 ml-2 z-50
                  opacity-0 group-hover/nav:opacity-100 transition-opacity duration-100">
                  <div className="bg-slate-800 text-white text-xs font-medium px-2.5 py-1.5 rounded-lg whitespace-nowrap shadow-lg">
                    {label}
                    {badge > 0 && (
                      <span className="ml-1.5 bg-indigo-400 text-white text-[9px] font-bold px-1 py-0.5 rounded-full">
                        {badge}
                      </span>
                    )}
                  </div>
                  {/* Arrow */}
                  <div className="absolute right-full top-1/2 -translate-y-1/2 border-4 border-transparent border-r-slate-800" />
                </div>
              )}
            </div>
          )
        })}
      </nav>

      {/* ── User ── */}
      <div className={`border-t border-slate-200 py-3 ${collapsed ? 'px-2' : 'px-2'}`}>
        {/* Avatar row */}
        <div className={`flex items-center gap-2 rounded-xl px-2 py-2 mb-1 ${collapsed ? 'justify-center' : ''}`}>
          <div className="w-7 h-7 rounded-full flex items-center justify-center font-semibold text-xs shrink-0"
            style={{ background: 'linear-gradient(135deg, #e0e7ff, #ede9fe)', color: '#4f46e5' }}>
            {initials}
          </div>
          {!collapsed && (
            <div className="flex-1 min-w-0">
              <p className="text-xs font-medium text-slate-900 truncate">{profile?.name || user?.email}</p>
              {profile && (
                <span className={`inline-block mt-0.5 px-1.5 py-0.5 rounded text-[10px] font-medium ${roleStyle[profile.role] || 'bg-slate-100 text-slate-500'}`}>
                  {profile.role}
                </span>
              )}
            </div>
          )}
        </div>

        {/* Logout */}
        {collapsed ? (
          <div className="relative group/logout">
            <button
              onClick={() => supabase.auth.signOut()}
              className="w-full flex justify-center p-2.5 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-xl transition-colors"
              title="ออกจากระบบ"
            >
              <IconLogOut />
            </button>
            <div className="pointer-events-none absolute left-full top-1/2 -translate-y-1/2 ml-2 z-50
              opacity-0 group-hover/logout:opacity-100 transition-opacity duration-100">
              <div className="bg-slate-800 text-white text-xs font-medium px-2.5 py-1.5 rounded-lg whitespace-nowrap shadow-lg">
                ออกจากระบบ
              </div>
              <div className="absolute right-full top-1/2 -translate-y-1/2 border-4 border-transparent border-r-slate-800" />
            </div>
          </div>
        ) : confirmLogout ? (
          <div className="flex items-center gap-1.5 px-3 py-2">
            <span className="text-[11px] text-red-500 flex-1">ออกจากระบบ?</span>
            <button onClick={() => supabase.auth.signOut()}
              className="text-[11px] bg-red-500 text-white px-2 py-0.5 rounded-md hover:bg-red-600 transition-colors font-medium">
              ยืนยัน
            </button>
            <button onClick={() => setConfirmLogout(false)}
              className="text-[11px] text-slate-400 px-2 py-0.5 rounded-md hover:bg-slate-100 transition-colors">
              ยกเลิก
            </button>
          </div>
        ) : (
          <button
            onClick={() => setConfirmLogout(true)}
            className="w-full flex items-center gap-2 px-3 py-2 text-xs text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-xl transition-colors"
          >
            <IconLogOut />
            ออกจากระบบ
          </button>
        )}
      </div>
    </aside>
  )
}
