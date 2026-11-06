'use client'

import { useProfile } from '@/lib/profile-context'
import { useRouter } from 'next/navigation'
import { useEffect } from 'react'
import Team from '@/components/Team'

// Team management page — admin only.
// Client-side route guard (defence-in-depth; RLS blocks writes for non-admins at DB level).
// The layout already ensures the user is authenticated and approved before reaching here.
export default function TeamPage() {
  const profile = useProfile()
  const router = useRouter()

  useEffect(() => {
    if (profile.role !== 'admin') {
      router.replace('/dashboard')
    }
  }, [profile.role, router])

  if (profile.role !== 'admin') return null

  return <Team />
}
