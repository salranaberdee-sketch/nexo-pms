'use client'

import { useEffect, useState, useRef } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import Link from 'next/link'
import type { User, AuthChangeEvent, Session } from '@supabase/supabase-js'
import { createClient } from '@/lib/supabase'
import Sidebar from '@/components/Sidebar'
import { ProfileProvider, useIsAdmin, type Profile } from '@/lib/profile-context'
import { AppSettingsProvider } from '@/lib/app-settings'
import { ToastContainer } from '@/components/Toast'
import {
  IconDashboard, IconBox, IconFileText, IconBarChart,
  IconTrendingUp, IconCheckSquare,
} from '@/lib/icons'

// ─── Page label map for mobile header ───────────────────────────────────────
const PAGE_LABELS: Record<string, string> = {
  '/dashboard': 'Dashboard',
  '/products':  'Products',
  '/contents':  'Content',
  '/my-tasks':  'งานของฉัน',
  '/ads':       'Ads',
  '/leads':     'Leads',
  '/sales':     'Sales',
  '/report':    'Report',
  '/team':      'ทีม',
  '/settings':  'ตั้งค่า',
}

// ─── Bottom nav tabs (5 tabs แสดงบน bottom bar) ─────────────────────────────
const BOTTOM_TABS = [
  { path: '/dashboard', label: 'หน้าหลัก', Icon: IconDashboard },
  { path: '/contents',  label: 'Content',   Icon: IconFileText },
  { path: '/my-tasks',  label: 'งานของฉัน', Icon: IconCheckSquare },
  { path: '/ads',       label: 'Ads',        Icon: IconBarChart },
  { path: '/sales',     label: 'Sales',      Icon: IconTrendingUp },
]

// ─── BottomNav component ─────────────────────────────────────────────────────
function BottomNav({ profile, myTaskCount, pendingCount }: {
  profile: Profile | null
  myTaskCount: number
  pendingCount: number
}) {
  const pathname = usePathname()
  const isAdmin = useIsAdmin()

  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 z-30 bg-white border-t border-slate-200"
      style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}>
      <div className="flex">
        {BOTTOM_TABS.map(({ path, label, Icon }) => {
          const active = pathname === path
          const badge =
            path === '/my-tasks' && myTaskCount > 0 ? myTaskCount :
            path === '/team'     && pendingCount > 0 && isAdmin ? pendingCount : 0

          return (
            <Link
              key={path}
              href={path}
              prefetch={true}
              className={`flex-1 flex flex-col items-center justify-center py-2 gap-0.5 relative transition-colors
                ${active ? 'text-indigo-600' : 'text-slate-400'}`}
            >
              <span className="relative">
                <Icon size={22} />
                {badge > 0 && (
                  <span className="absolute -top-1.5 -right-1.5 w-3.5 h-3.5 bg-indigo-500 text-white text-[8px] font-bold rounded-full flex items-center justify-center">
                    {badge > 9 ? '9+' : badge}
                  </span>
                )}
              </span>
              <span className={`text-[10px] font-medium leading-none ${active ? 'text-indigo-600' : 'text-slate-400'}`}>
                {label}
              </span>
              {active && (
                <span className="absolute top-0 left-1/2 -translate-x-1/2 w-6 h-0.5 bg-indigo-500 rounded-b-full" />
              )}
            </Link>
          )
        })}
      </div>
    </nav>
  )
}

// Shared layout for authenticated app pages.
// Guards auth + approval status, then provides profile to all children via context.
export default function AppLayout({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [profile, setProfile] = useState<Profile | null>(null)
  const [loading, setLoading] = useState(true)
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)
  const [myTaskCount, setMyTaskCount] = useState(0)
  const [pendingCount, setPendingCount] = useState(0)
  const router = useRouter()
  const pathname = usePathname()
  const supabase = createClient()
  const initializing = useRef(false)

  async function init(sessionUser: User) {
    if (initializing.current) return
    initializing.current = true

    setUser(sessionUser)

    const { data, error } = await supabase
      .from('profiles')
      .select('id, name, email, role, approval_status, brand_access')
      .eq('id', sessionUser.id)
      .single()

    initializing.current = false

    if (error || !data) {
      router.replace('/pending')
      return
    }

    if (data.approval_status !== 'approved') {
      router.replace('/pending')
      return
    }

    setProfile(data as Profile)
    setLoading(false)

    // Load badge counts after profile is set
    if (data.role === 'admin') {
      supabase
        .from('profiles')
        .select('id', { count: 'exact', head: true })
        .eq('approval_status', 'pending')
        .then(({ count, error }: { count: number | null; error: { message: string } | null }) => {
          if (!error) setPendingCount(count ?? 0)
        })
    }
    supabase
      .from('contents')
      .select('id', { count: 'exact', head: true })
      .or(`producer_id.eq.${data.id},approver_id.eq.${data.id},assigned_to_id.eq.${data.id},poster_id.eq.${data.id}`)
      .is('acknowledged_at', null)
      .neq('status', 'โพสต์แล้ว')
      .then(({ count, error }: { count: number | null; error: { message: string } | null }) => {
        if (!error) setMyTaskCount(count ?? 0)
      })
  }

  useEffect(() => {
    async function bootstrap() {
      const { data } = await supabase.auth.getSession()
      const session: Session | null = data.session
      if (!session?.user) {
        router.replace('/login')
        return
      }
      await init(session.user)
    }
    bootstrap()

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event: AuthChangeEvent, session: Session | null) => {
        if (event === 'SIGNED_OUT' || !session?.user) {
          router.replace('/login')
          return
        }
        if (event === 'TOKEN_REFRESHED') {
          initializing.current = false
          init(session.user)
        }
      },
    )

    return () => subscription.unsubscribe()
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  if (loading || !user || !profile) return (
    <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: 'var(--color-canvas)' }}>
      <div className="text-center">
        <div className="w-9 h-9 border-[3px] border-indigo-500 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
        <p className="text-sm text-slate-400">กำลังโหลด...</p>
      </div>
    </div>
  )

  const pageLabel = PAGE_LABELS[pathname] || 'Nexo'

  return (
    <ProfileProvider profile={profile}>
      <AppSettingsProvider>
        {/* ── Mobile top bar (page title only — no hamburger) ── */}
        <header className="md:hidden fixed top-0 left-0 right-0 z-30 h-12 bg-white border-b border-slate-200 flex items-center px-4">
          <div className="flex items-center gap-2 flex-1 min-w-0">
            <div className="w-6 h-6 rounded-lg flex items-center justify-center shrink-0"
              style={{ background: 'linear-gradient(135deg, #6366f1, #8b5cf6)' }}>
              <span className="text-white font-bold text-[10px]">N</span>
            </div>
            <span className="text-sm font-semibold text-slate-900 truncate">{pageLabel}</span>
          </div>
        </header>

        <div className="flex h-screen overflow-hidden" style={{ backgroundColor: 'var(--color-canvas)' }}>
          <Sidebar
            user={user}
            profile={profile}
            onCollapse={setSidebarCollapsed}
          />
          {/* pt-12 on mobile to clear the fixed top bar, pb-16 to clear the bottom nav */}
          <main className="flex-1 overflow-y-auto min-w-0 pt-12 pb-16 md:pt-0 md:pb-0">
            {children}
          </main>
        </div>

        {/* ── Mobile bottom nav ── */}
        <BottomNav
          profile={profile}
          myTaskCount={myTaskCount}
          pendingCount={pendingCount}
        />

        <ToastContainer />
      </AppSettingsProvider>
    </ProfileProvider>
  )
}
