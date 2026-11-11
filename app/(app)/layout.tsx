'use client'

import { useEffect, useState, useRef } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import type { User, AuthChangeEvent, Session } from '@supabase/supabase-js'
import { createClient } from '@/lib/supabase'
import Sidebar from '@/components/Sidebar'
import { ProfileProvider, type Profile } from '@/lib/profile-context'
import { AppSettingsProvider } from '@/lib/app-settings'
import { ToastContainer } from '@/components/Toast'

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

// Shared layout for authenticated app pages.
// Guards auth + approval status, then provides profile to all children via context.
export default function AppLayout({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [profile, setProfile] = useState<Profile | null>(null)
  const [loading, setLoading] = useState(true)
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)
  const [mobileNavOpen, setMobileNavOpen] = useState(false)
  const router = useRouter()
  const pathname = usePathname()
  const supabase = createClient()
  const initializing = useRef(false)

  // Close mobile nav on route change
  useEffect(() => { setMobileNavOpen(false) }, [pathname])

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
        {/* ── Mobile top bar ── */}
        <header className="md:hidden fixed top-0 left-0 right-0 z-30 h-14 bg-white border-b border-slate-200 flex items-center px-4 gap-3">
          <button
            onClick={() => setMobileNavOpen(v => !v)}
            className="w-9 h-9 flex items-center justify-center rounded-xl text-slate-500 hover:text-slate-900 hover:bg-slate-100 transition-colors -ml-1"
            aria-label="เปิด menu"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <line x1="3" y1="6" x2="21" y2="6" />
              <line x1="3" y1="12" x2="21" y2="12" />
              <line x1="3" y1="18" x2="21" y2="18" />
            </svg>
          </button>
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
            mobileOpen={mobileNavOpen}
            onMobileClose={() => setMobileNavOpen(false)}
          />
          {/* pt-14 on mobile to clear the fixed top bar */}
          <main className="flex-1 overflow-y-auto min-w-0 pt-14 md:pt-0">
            {children}
          </main>
        </div>
        <ToastContainer />
      </AppSettingsProvider>
    </ProfileProvider>
  )
}
