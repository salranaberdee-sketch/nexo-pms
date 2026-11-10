'use client'

import { useEffect, useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import type { User, AuthChangeEvent, Session } from '@supabase/supabase-js'
import { createClient } from '@/lib/supabase'
import Sidebar from '@/components/Sidebar'
import { ProfileProvider, type Profile } from '@/lib/profile-context'
import { AppSettingsProvider } from '@/lib/app-settings'
import { ToastContainer } from '@/components/Toast'

// Shared layout for authenticated app pages.
// Guards auth + approval status, then provides profile to all children via context.
export default function AppLayout({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [profile, setProfile] = useState<Profile | null>(null)
  const [loading, setLoading] = useState(true)
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)
  const router = useRouter()
  const supabase = createClient()
  // Prevent concurrent calls to init() from overwriting each other
  const initializing = useRef(false)

  async function init(sessionUser: User) {
    // Deduplicate concurrent calls — only the first one runs
    if (initializing.current) return
    initializing.current = true

    setUser(sessionUser)

    // Select only the fields consumed by ProfileProvider + useCan/useIsAdmin.
    // Avoids fetching approved_by, approved_at, created_at, updated_at (unused).
    const { data, error } = await supabase
      .from('profiles')
      .select('id, name, email, role, approval_status, brand_access')
      .eq('id', sessionUser.id)
      .single()

    initializing.current = false

    if (error || !data) {
      // Profile row not yet created by trigger (rare race) — redirect to pending
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
    // Use getSession() which reads from the local cookie — zero network cost.
    // getUser() makes a round-trip to Supabase Auth to verify the JWT,
    // which adds 200-500 ms to every protected page load.
    // Security note: the session token is verified by RLS on every DB call anyway.
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
        // Only re-init on token refresh — bootstrap() already handles the initial load.
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

  return (
    <ProfileProvider profile={profile}>
      <AppSettingsProvider>
        <div className="flex h-screen overflow-hidden" style={{ backgroundColor: 'var(--color-canvas)' }}>
          <Sidebar user={user} profile={profile} onCollapse={setSidebarCollapsed} />
          <main className="flex-1 overflow-y-auto min-w-0">
            {children}
          </main>
        </div>
        <ToastContainer />
      </AppSettingsProvider>
    </ProfileProvider>
  )
}
