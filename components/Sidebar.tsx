'use client'

import React from 'react'
import { createClient } from '@/lib/supabase'
import type { Page } from '@/app/page'

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
function IconLogOut() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
      <polyline points="16 17 21 12 16 7" />
      <line x1="21" y1="12" x2="9" y2="12" />
    </svg>
  )
}

const nav: { id: Page; label: string; Icon: () => React.ReactElement }[] = [
  { id: 'dashboard', label: 'Dashboard',  Icon: IconDashboard },
  { id: 'products',  label: 'Products',   Icon: IconBox },
  { id: 'contents',  label: 'Content',    Icon: IconFileText },
  { id: 'ads',       label: 'Ads',        Icon: IconBarChart },
  { id: 'sales',     label: 'Sales',      Icon: IconTrendingUp },
]

export default function Sidebar({ page, setPage, user }: {
  page: Page
  setPage: (p: Page) => void
  user: any
}) {
  const supabase = createClient()

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
        {nav.map(({ id, label, Icon }) => (
          <button
            key={id}
            onClick={() => setPage(id)}
            className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors
              ${page === id
                ? 'bg-gray-900 text-white'
                : 'text-gray-500 hover:bg-gray-50 hover:text-gray-900'}`}
          >
            <Icon />
            {label}
          </button>
        ))}
      </nav>

      {/* User */}
      <div className="px-3 py-3 border-t border-gray-100">
        <div className="flex items-center gap-2 px-3 py-2 mb-1">
          <div className="w-7 h-7 bg-gray-100 rounded-full flex items-center justify-center text-gray-600 font-semibold text-xs shrink-0">
            {user?.email?.[0]?.toUpperCase()}
          </div>
          <p className="text-xs text-gray-600 truncate flex-1 min-w-0">{user?.email}</p>
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
