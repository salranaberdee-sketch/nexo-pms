'use client'

import { useEffect, useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import type { User } from '@supabase/supabase-js'
import { createClient } from '@/lib/supabase'
import Sidebar from '@/components/Sidebar'
import { ProfileProvider, type Profile } from '@/lib/profile-context'

// Shared layout for authenticated app pages.
// Guards auth + approval status, then provides profile to all children via context.
export default function AppLayout({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [profile, setProfile] = useState<Profile | null>(null)
  const [loading, setLoading] = useState(true)
  const router = useRouter()
  const supabase = createClient()
  // Prevent concurrent calls to init() from overwriting each other
  const initializing = useRef(false)

  async function init(sessionUser: User) {
    // Deduplicate concurrent calls — only the first one runs
    if (initializing.current) return
    initializing.current = true

    setUser(sessionUser)

    // Fetch own profile row — "Users view own profile" policy allows this
    // regardless of approval_status, so pending users can read their own row
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
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
    // Use getUser() which verifies the JWT with Supabase Auth server
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) {
        router.replace('/login')
        return
      }
      init(user)
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_OUT' || !session?.user) {
        router.replace('/login')
        return
      }
      // Only re-init on token refresh or explicit sign-in, not on initial SIGNED_IN
      // (already handled above by getUser). This prevents the double-init race.
      if (event === 'TOKEN_REFRESHED') {
        initializing.current = false
        init(session.user)
      }
    })

    return () => subscription.unsubscribe()
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  if (loading || !user || !profile) return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="text-center">
        <div className="w-8 h-8 border-2 border-gray-900 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
        <p className="text-sm text-gray-400">กำลังโหลด...</p>
      </div>
    </div>
  )

  return (
    <ProfileProvider profile={profile}>
      <div className="flex h-screen overflow-hidden bg-gray-50">
        <Sidebar user={user} profile={profile} />
        <main className="flex-1 overflow-y-auto">
          {children}
        </main>
      </div>
    </ProfileProvider>
  )
}
