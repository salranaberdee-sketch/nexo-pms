'use client'

import React, { useEffect, useState, useMemo } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import type { User } from '@supabase/supabase-js'
import { createClient } from '@/lib/supabase'
import { useIsAdmin, type Profile } from '@/lib/profile-context'
import { useSettings } from '@/lib/app-settings'
import {
  IconDashboard, IconBox, IconFileText, IconBarChart, IconBarChart2,
  IconTrendingUp, IconUserPlus, IconUsers, IconSettings, IconCheckSquare,
  IconLogOut, IconChevronLeft, IconChevronRight,
} from '@/lib/icons'
import { roleStyle } from '@/lib/status-styles'

// ─── Sidebar ──────────────────────────────────────────────────────────────────

export default function Sidebar({
  user, profile, onCollapse, mobileOpen, onMobileClose,
}: {
  user: User | null
  profile: Profile | null
  onCollapse?: (collapsed: boolean) => void
  mobileOpen?: boolean
  onMobileClose?: () => void
}) {
  const pathname  = usePathname()
  const supabase  = createClient()
  const isAdmin   = useIsAdmin()
  const { companyName, companyTagline } = useSettings()

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

  // Close mobile drawer on route change
  useEffect(() => {
    onMobileClose?.()
  }, [pathname]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!isAdmin) return
    supabase
      .from('profiles')
      .select('id', { count: 'exact', head: true })
      .eq('approval_status', 'pending')
      .then(({ count, error }: { count: number | null; error: { message: string } | null }) => {
        if (!error) setPendingCount(count ?? 0)
      })
  }, [isAdmin]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!profile?.id) return
    supabase
      .from('contents')
      .select('id', { count: 'exact', head: true })
      .or(`producer_id.eq.${profile.id},approver_id.eq.${profile.id},assigned_to_id.eq.${profile.id}`)
      .is('acknowledged_at', null)
      .neq('status', 'โพสต์แล้ว')
      .then(({ count, error }: { count: number | null; error: { message: string } | null }) => {
        if (!error) setMyTaskCount(count ?? 0)
      })
  }, [profile?.id]) // eslint-disable-line react-hooks/exhaustive-deps

  type NavItem = { path: string; label: string; Icon: React.FC<{ size?: number }> }
  type NavGroup = { label: string | null; adminOnly?: boolean; items: NavItem[] }

  const navGroups: NavGroup[] = [
    {
      label: null,
      items: [
        { path: '/dashboard', label: 'Dashboard', Icon: IconDashboard },
      ],
    },
    {
      label: 'สินค้า',
      items: [
        { path: '/products', label: 'Products', Icon: IconBox },
      ],
    },
    {
      label: 'Content',
      items: [
        { path: '/contents',  label: 'Content',    Icon: IconFileText },
        { path: '/my-tasks',  label: 'งานของฉัน', Icon: IconCheckSquare },
      ],
    },
    {
      label: 'การตลาด',
      items: [
        { path: '/ads',   label: 'Ads',   Icon: IconBarChart },
        { path: '/leads', label: 'Leads', Icon: IconUserPlus },
      ],
    },
    {
      label: 'ยอดขาย',
      items: [
        { path: '/sales', label: 'Sales', Icon: IconTrendingUp },
      ],
    },
    {
      label: 'รายงาน',
      items: [
        { path: '/report', label: 'Report', Icon: IconBarChart2 },
      ],
    },
    {
      label: 'จัดการ',
      adminOnly: true,
      items: [
        { path: '/team',     label: 'ทีม',       Icon: IconUsers },
        { path: '/settings', label: 'ตั้งค่า',   Icon: IconSettings },
      ],
    },
  ]

  const visibleGroups = useMemo(
    () => navGroups.filter(g => !g.adminOnly || isAdmin),
    [isAdmin], // eslint-disable-line react-hooks/exhaustive-deps
  )

  const initials = (profile?.name?.[0] || user?.email?.[0] || '?').toUpperCase()

  // Shared nav content — used in both desktop sidebar and mobile drawer
  function NavContent({ isMobile = false }: { isMobile?: boolean }) {
    return (
      <>
        {/* ── Logo ── */}
        <div className={`border-b border-slate-200 transition-all duration-200 flex items-center ${
          !isMobile && collapsed ? 'px-3 py-4 justify-center' : 'px-4 py-4 justify-between'
        }`}>
          <Link href="/dashboard" className="flex items-center gap-2.5 hover:opacity-80 transition-opacity min-w-0">
            <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0"
              style={{ background: 'linear-gradient(135deg, #6366f1, #8b5cf6)' }}>
              <span className="text-white font-bold text-sm">N</span>
            </div>
            {(isMobile || !collapsed) && (
              <div className="min-w-0 overflow-hidden">
                <p className="font-semibold text-slate-900 text-sm leading-none whitespace-nowrap">{companyName}</p>
                <p className="text-[11px] text-slate-400 mt-0.5 truncate">{companyTagline}</p>
              </div>
            )}
          </Link>
          {/* Desktop collapse button */}
          {!isMobile && !collapsed && (
            <button
              onClick={() => setCollapsed(true)}
              title="ย่อ sidebar"
              className="shrink-0 ml-2 w-6 h-6 rounded-lg flex items-center justify-center text-slate-300 hover:text-slate-600 hover:bg-slate-100 transition-colors"
            >
              <IconChevronLeft />
            </button>
          )}
          {/* Mobile close button */}
          {isMobile && (
            <button
              onClick={onMobileClose}
              className="shrink-0 ml-2 w-7 h-7 rounded-lg flex items-center justify-center text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
              aria-label="ปิด menu"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                <path d="M18 6L6 18M6 6l12 12" />
              </svg>
            </button>
          )}
        </div>

        {/* Desktop expand button when collapsed */}
        {!isMobile && collapsed && (
          <button
            onClick={() => setCollapsed(false)}
            title="ขยาย sidebar"
            className="mx-auto mt-3 mb-1 w-9 h-7 rounded-lg flex items-center justify-center text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 transition-colors"
          >
            <IconChevronRight />
          </button>
        )}

        {/* ── Nav ── */}
        <nav className={`flex-1 py-2 overflow-y-auto overflow-x-hidden ${(!isMobile && collapsed) ? 'px-2' : 'px-2'}`}>
          {visibleGroups.map((group, gi) => (
            <div key={gi} className={gi > 0 ? 'mt-1' : ''}>
              {(!isMobile && !collapsed || isMobile) && group.label && (
                <p className="px-3 pt-3 pb-1 text-[10px] font-semibold uppercase tracking-widest text-slate-400 select-none">
                  {group.label}
                </p>
              )}
              {!isMobile && collapsed && gi > 0 && (
                <div className="my-1.5 mx-1 border-t border-slate-100" />
              )}
              <div className="space-y-0.5">
                {group.items.map(({ path, label, Icon }) => {
                  const active = pathname === path
                  const badge =
                    path === '/team'     && pendingCount > 0 ? pendingCount :
                    path === '/my-tasks' && myTaskCount  > 0 ? myTaskCount  : 0
                  const isCollapsed = !isMobile && collapsed

                  return (
                    <div key={path} className="relative group/nav">
                      <Link
                        href={path}
                        prefetch={true}
                        className={`flex items-center gap-2.5 rounded-xl text-sm font-medium transition-all
                          ${isCollapsed ? 'px-2.5 py-2.5 justify-center' : 'px-3 py-2.5'}
                          ${active
                            ? 'bg-indigo-50 text-indigo-700 shadow-sm'
                            : 'text-slate-500 hover:bg-slate-50 hover:text-slate-800'}`}
                      >
                        <span className="shrink-0 relative">
                          <Icon />
                          {isCollapsed && badge > 0 && (
                            <span className="absolute -top-1.5 -right-1.5 w-3.5 h-3.5 bg-indigo-500 text-white text-[8px] font-bold rounded-full flex items-center justify-center">
                              {badge > 9 ? '9+' : badge}
                            </span>
                          )}
                        </span>

                        {!isCollapsed && (
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

                      {/* Tooltip — only when desktop collapsed */}
                      {isCollapsed && (
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
                          <div className="absolute right-full top-1/2 -translate-y-1/2 border-4 border-transparent border-r-slate-800" />
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            </div>
          ))}
        </nav>

        {/* ── User ── */}
        <div className={`border-t border-slate-200 py-3 ${(!isMobile && collapsed) ? 'px-2' : 'px-2'}`}>
          <div className={`flex items-center gap-2 rounded-xl px-2 py-2 mb-1 ${(!isMobile && collapsed) ? 'justify-center' : ''}`}>
            <div className="w-7 h-7 rounded-full flex items-center justify-center font-semibold text-xs shrink-0"
              style={{ background: 'linear-gradient(135deg, #e0e7ff, #ede9fe)', color: '#4f46e5' }}>
              {initials}
            </div>
            {(isMobile || !collapsed) && (
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

          {(!isMobile && collapsed) ? (
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
      </>
    )
  }

  return (
    <>
      {/* ── Desktop sidebar (md+) ─── */}
      <aside
        className="relative hidden md:flex flex-col h-screen shrink-0 bg-white border-r border-slate-200 transition-[width] duration-200 ease-in-out"
        style={{ width: collapsed ? '64px' : '208px' }}
      >
        <NavContent />
      </aside>

      {/* ── Mobile drawer overlay ─── */}
      {mobileOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/40 md:hidden"
          onClick={onMobileClose}
          aria-hidden="true"
        />
      )}

      {/* ── Mobile drawer panel ─── */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 flex flex-col w-[240px] bg-white border-r border-slate-200 shadow-xl transition-transform duration-250 ease-in-out md:hidden
          ${mobileOpen ? 'translate-x-0' : '-translate-x-full'}`}
      >
        <NavContent isMobile />
      </aside>
    </>
  )
}
