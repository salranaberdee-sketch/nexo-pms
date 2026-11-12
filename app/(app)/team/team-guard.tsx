'use client'

import { useProfile } from '@/lib/profile-context'
import { useRouter } from 'next/navigation'
import { useEffect } from 'react'
import Team from '@/components/Team'

// Client-side admin guard — rendered by the Server Component page wrapper.
// Defence-in-depth: RLS blocks writes for non-admins at the DB level too.
export default function TeamGuard() {
  const profile = useProfile()
  const router  = useRouter()

  useEffect(() => {
    if (profile.role !== 'admin') {
      router.replace('/dashboard')
    }
  }, [profile.role, router])

  if (profile.role !== 'admin') return null

  return <Team />
}
