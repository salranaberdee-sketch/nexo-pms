'use client'

import { useEffect, useState } from 'react'
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

  useEffect(() => {
    async function init(session: any) {
      if (!session?.user) {
        router.replace('/login')
        return
      }
      setUser(session.user)

      // Fetch profile — RLS allows self SELECT via "Users view own profile" policy
      const { data } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', session.user.id)
        .single()

      if (!data) {
        // Profile row not yet created by trigger — send to pending page
        router.replace('/pending')
        return
      }

      if (data.approval_status !== 'approved') {
        // Not approved yet — redirect to pending page
        router.replace('/pending')
        return
      }

      setProfile(data as Profile)
      setLoading(false)
    }

    supabase.auth.getSession().then(({ data: { session } }) => init(session))

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_e, session) => {
      if (!session?.user) {
        router.replace('/login')
      } else {
        init(session)
      }
    })
    return () => subscription.unsubscribe()
  }, [router, supabase])

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
