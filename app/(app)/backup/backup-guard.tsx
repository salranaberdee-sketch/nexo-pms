'use client'

import { useProfile } from '@/lib/profile-context'
import { useRouter } from 'next/navigation'
import { useEffect } from 'react'
import BackupRestore from '@/components/BackupRestore'

// Client-side admin guard for the backup/restore page.
// Defence-in-depth: Supabase RLS blocks reads for non-admins at the DB level.
export default function BackupGuard() {
  const profile = useProfile()
  const router  = useRouter()

  useEffect(() => {
    if (profile.role !== 'admin') {
      router.replace('/dashboard')
    }
  }, [profile.role, router])

  if (profile.role !== 'admin') return null

  return <BackupRestore />
}
