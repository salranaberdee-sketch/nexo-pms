'use client'

import { createContext, useContext } from 'react'

// Profile type matching the profiles table Row
export type Profile = {
  id: string
  name: string
  email: string
  role: string
  approval_status: string
  brand_access: string[] | null
}

const ProfileContext = createContext<Profile | null>(null)

export function ProfileProvider({ profile, children }: { profile: Profile; children: React.ReactNode }) {
  return <ProfileContext.Provider value={profile}>{children}</ProfileContext.Provider>
}

export function useProfile(): Profile {
  const profile = useContext(ProfileContext)
  if (!profile) throw new Error('useProfile must be used within ProfileProvider')
  return profile
}

// Role × operation matrix — mirrors the RLS policies in the database.
// Used for client-side UI gating (RLS remains the source of truth at the DB level).
const PERMISSION_MATRIX: Record<string, Record<string, string[]>> = {
  products:               { insert: ['admin', 'manager'],                update: ['admin', 'manager'],                delete: ['admin'] },
  contents:               { insert: ['admin', 'manager', 'editor'],     update: ['admin', 'manager', 'editor'],     delete: ['admin', 'manager'] },
  ads:                    { insert: ['admin', 'manager'],                update: ['admin', 'manager'],                delete: ['admin'] },
  sales:                  { insert: ['admin', 'manager'],                update: ['admin', 'manager'],                delete: ['admin'] },
  product_briefs:         { insert: ['admin', 'manager', 'editor'],     update: ['admin', 'manager', 'editor'],     delete: ['admin', 'manager'] },
  profiles:               { insert: [],                                   update: ['admin'],                           delete: ['admin'] },
  ad_contents:            { insert: ['admin', 'manager'],                update: ['admin', 'manager'],                delete: ['admin'] },
  leads:                  { insert: ['admin', 'manager'],                update: ['admin', 'manager'],                delete: ['admin'] },
  categories:             { insert: ['admin', 'manager'],                update: ['admin', 'manager'],                delete: ['admin'] },
  content_assets:         { insert: ['admin', 'manager', 'editor'],     update: ['admin', 'manager', 'editor'],     delete: ['admin', 'manager'] },
  content_assignment_log: { insert: ['admin', 'manager'],                update: [],                                  delete: [] },
}

// Returns true if the current user's role allows the given action on the given table.
export function useCan(action: 'insert' | 'update' | 'delete', table: string): boolean {
  const { role } = useProfile()
  const allowed = PERMISSION_MATRIX[table]?.[action] || []
  return allowed.includes(role)
}

// Convenience: returns true if the current user is admin
export function useIsAdmin(): boolean {
  return useProfile().role === 'admin'
}
