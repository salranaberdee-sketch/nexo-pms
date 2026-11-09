'use client'

import React, { useEffect, useState, useMemo } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import type { User } from '@supabase/supabase-js'
import { createClient } from '@/lib/supabase'
import { useIsAdmin, type Profile } from '@/lib/profile-context'

// SVG icon components — inline, no external dependency
function IconDashboard() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="3" width="7" height="7" rx="1" />
      <rect x="14" y="3" width="7" height="7" rx="1" />
      <rect x="14" y="14" width="7" height="7" rx="1" />
      <rect x="3" y="14" width="7" height="7" rx="1" />
    </svg>
  )
}
function IconBox() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" />
    </svg>
  )
}
function IconFileText() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
      <polyline points="14 2 14 8 20 8" />
      <line x1="16" y1="13" x2="8" y2="13" />
      <line x1="16" y1="17" x2="8" y2="17" />
      <polyline points="10 9 9 9 8 9" />
    </svg>
  )
}
function IconBarChart() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="18" y1="20" x2="18" y2="10" />
      <line x1="12" y1="20" x2="12" y2="4" />
      <line x1="6" y1="20" x2="6" y2="14" />
    </svg>
  )
}
function IconTrendingUp() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="23 6 13.5 15.5 8.5 10.5 1 18" />
      <polyline points="17 6 23 6 23 12" />
    </svg>
  )
}
function IconUserPlus() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
      <circle cx="8.5" cy="7" r="4" />
      <line x1="20" y1="8" x2="20" y2="14" />
      <line x1="23" y1="11" x2="17" y2="11" />
    </svg>
  )
}
function IconUsers() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
      <path d="M16 3.13a4 4 0 0 1 0 7.75" />
    </svg>
  )
}
function IconCheckSquare() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="9 11 12 14 22 4" />
      <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" />
    </svg>
  )
}
function IconLogOut() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
      <polyline points="16 17 21 12 16 7" />
      <line x1="21" y1="12" x2="9" y2="12" />
    </svg>
  )
}

// Role badge styles
const roleStyle: Record<string, string> = {
  admin:   'bg-purple-50 text-purple-700',
  manager: 'bg-blue-50 text-blue-700',
  editor:  'bg-teal-50 text-teal-700',
  viewer:  'bg-slate-100 text-slate-500',
}

export default function Sidebar({ user, profile }: { user: User | null; profile: Profile | null }) {
  const pathname = usePathname()
  const supabase = createClient()
  const isAdmin = useIsAdmin()
  const [pendingCount, setPendingCount] = useState(0)
  const [myTaskCount, setMyTaskCount]   = useState(0)
  const [confirmLogout, setConfirmLogout] = useState(false)

  // Fetch pending user count for admin badge
  useEffect(() => {
    if (!isAdmin) return
    supabase
      .from('profiles')
      .select('id', { count: 'exact', head: true })
      .eq('approval_status', 'pending')
      .then(({ count }: { count: number | null }) => setPendingCount(count ?? 0))
  }, [supabase, isAdmin])

  // Fetch my unacknowledged task count (contents where I am producer/approver/assigned_to and not acknowledged)
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

  // Base nav items — visible to all approved users
  const nav: { path: string; label: string; Icon: () => React.ReactElement; adminOnly?: boolean }[] = [
    { path: '/dashboard', label: 'Dashboard',  Icon: IconDashboard },
    { path: '/products',  label: 'Products',   Icon: IconBox },
    { path: '/contents',  label: 'Content',    Icon: IconFileText },
    { path: '/my-tasks',  label: 'งานของฉัน',  Icon: IconCheckSquare },
    { path: '/ads',       label: 'Ads',        Icon: IconBarChart },
    { path: '/leads',     label: 'Leads',      Icon: IconUserPlus },
    { path: '/sales',     label: 'Sales',      Icon: IconTrendingUp },
    { path: '/team',      label: 'ทีม',        Icon: IconUsers, adminOnly: true },
  ]

  const visibleNav = useMemo(
    () => nav.filter(item => !item.adminOnly || isAdmin),
    [isAdmin], // eslint-disable-line react-hooks/exhaustive-deps
  )

  return (
    <aside className="w-52 bg-white border-r flex flex-col h-screen shrink-0" style={{ borderColor: 'var(--color-border)' }}>

      {/* Logo → Dashboard */}
      <div className="px-5 py-5 border-b" style={{ borderColor: 'var(--color-border)' }}>
        <Link href="/dashboard" className="flex items-center gap-2.5 hover:opacity-80 transition-opacity">
          <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: 'linear-gradient(135deg, #6366f1, #8b5cf6)' }}>
            <span className="text-white font-bold text-sm tracking-tight">N</span>
          </div>
          <div>
            <p className="font-semibold text-slate-900 text-sm leading-none">Nexo PMS</p>
            <p className="text-[11px] text-slate-400 mt-0.5">v1.0</p>
          </div>
        </Link>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-3 space-y-1">
        {visibleNav.map(({ path, label, Icon }) => {
          const active = pathname === path
          return (
            <Link
              key={path}
              href={path}
              prefetch={true}
              className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-sm font-medium transition-all
                ${active
                  ? 'bg-indigo-50 text-indigo-700 shadow-sm'
                  : 'text-slate-500 hover:bg-slate-50 hover:text-slate-800'}`}
            >
              <Icon />
              {label}
              {path === '/team' && pendingCount > 0 && (
                <span className="ml-auto bg-amber-100 text-amber-700 text-[10px] font-semibold px-1.5 py-0.5 rounded-full tabular-nums">
                  {pendingCount}
                </span>
              )}
              {path === '/my-tasks' && myTaskCount > 0 && (
                <span className="ml-auto bg-indigo-100 text-indigo-700 text-[10px] font-semibold px-1.5 py-0.5 rounded-full tabular-nums">
                  {myTaskCount}
                </span>
              )}
            </Link>
          )
        })}
      </nav>

      {/* User */}
      <div className="px-3 py-3 border-t" style={{ borderColor: 'var(--color-border)' }}>
        <div className="flex items-center gap-2 px-3 py-2 mb-1">
          <div className="w-7 h-7 rounded-full flex items-center justify-center font-semibold text-xs shrink-0" style={{ background: 'linear-gradient(135deg, #e0e7ff, #ede9fe)', color: '#4f46e5' }}>
            {profile?.name?.[0]?.toUpperCase() || user?.email?.[0]?.toUpperCase()}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-medium text-slate-900 truncate">{profile?.name || user?.email}</p>
            {profile && (
              <span className={`inline-block mt-0.5 px-1.5 py-0.5 rounded text-[10px] font-medium ${roleStyle[profile.role] || 'bg-slate-100 text-slate-500'}`}>
                {profile.role}
              </span>
            )}
          </div>
        </div>
        {confirmLogout ? (
          <div className="flex items-center gap-1.5 px-3 py-2">
            <span className="text-[11px] text-red-500 flex-1">ออกจากระบบ?</span>
            <button
              onClick={() => supabase.auth.signOut()}
              className="text-[11px] bg-red-500 text-white px-2 py-0.5 rounded-md hover:bg-red-600 transition-colors font-medium"
            >
              ยืนยัน
            </button>
            <button
              onClick={() => setConfirmLogout(false)}
              className="text-[11px] text-slate-400 px-2 py-0.5 rounded-md hover:bg-slate-100 transition-colors"
            >
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
