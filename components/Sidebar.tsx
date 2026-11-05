'use client'

import React, { useEffect, useState } from 'react'
import { usePathname, useRouter } from 'next/navigation'
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
  viewer:  'bg-gray-100 text-gray-500',
}

export default function Sidebar({ user, profile }: { user: User | null; profile: Profile | null }) {
  const pathname = usePathname()
  const router = useRouter()
  const supabase = createClient()
  const isAdmin = useIsAdmin()
  const [pendingCount, setPendingCount] = useState(0)

  // Fetch pending user count for admin badge
  useEffect(() => {
    if (!isAdmin) return
    supabase
      .from('profiles')
      .select('id', { count: 'exact', head: true })
      .eq('approval_status', 'pending')
      .then(({ count }) => setPendingCount(count || 0))
  }, [supabase, isAdmin])

  // Base nav items — visible to all approved users
  const nav: { path: string; label: string; Icon: () => React.ReactElement; adminOnly?: boolean }[] = [
    { path: '/dashboard', label: 'Dashboard',  Icon: IconDashboard },
    { path: '/products',  label: 'Products',   Icon: IconBox },
    { path: '/contents',  label: 'Content',    Icon: IconFileText },
    { path: '/ads',       label: 'Ads',        Icon: IconBarChart },
    { path: '/sales',     label: 'Sales',      Icon: IconTrendingUp },
    { path: '/team',      label: 'ทีม',        Icon: IconUsers, adminOnly: true },
  ]

  const visibleNav = nav.filter(item => !item.adminOnly || isAdmin)

  return (
    <aside className="w-52 bg-white border-r border-gray-100 flex flex-col h-screen shrink-0">

      {/* Logo */}
      <div className="px-5 py-5 border-b border-gray-100">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 bg-gray-900 rounded-lg flex items-center justify-center">
            <span className="text-white font-bold text-sm tracking-tight">N</span>
          </div>
          <div>
            <p className="font-semibold text-gray-900 text-sm leading-none">Nexo PMS</p>
            <p className="text-[11px] text-gray-400 mt-0.5">v1.0</p>
          </div>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-3 space-y-0.5">
        {visibleNav.map(({ path, label, Icon }) => {
          const active = pathname === path
          return (
            <button
              key={path}
              onClick={() => router.push(path)}
              className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors
                ${active
                  ? 'bg-gray-900 text-white'
                  : 'text-gray-500 hover:bg-gray-50 hover:text-gray-900'}`}
            >
              <Icon />
              {label}
              {path === '/team' && pendingCount > 0 && (
                <span className="ml-auto bg-amber-100 text-amber-700 text-[10px] font-semibold px-1.5 py-0.5 rounded-full tabular-nums">
                  {pendingCount}
                </span>
              )}
            </button>
          )
        })}
      </nav>

      {/* User */}
      <div className="px-3 py-3 border-t border-gray-100">
        <div className="flex items-center gap-2 px-3 py-2 mb-1">
          <div className="w-7 h-7 bg-gray-100 rounded-full flex items-center justify-center text-gray-600 font-semibold text-xs shrink-0">
            {profile?.name?.[0]?.toUpperCase() || user?.email?.[0]?.toUpperCase()}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-medium text-gray-900 truncate">{profile?.name || user?.email}</p>
            {profile && (
              <span className={`inline-block mt-0.5 px-1.5 py-0.5 rounded text-[10px] font-medium ${roleStyle[profile.role] || 'bg-gray-100 text-gray-500'}`}>
                {profile.role}
              </span>
            )}
          </div>
        </div>
        <button
          onClick={() => supabase.auth.signOut()}
          className="w-full flex items-center gap-2 px-3 py-2 text-xs text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
        >
          <IconLogOut />
          ออกจากระบบ
        </button>
      </div>
    </aside>
  )
}
