'use client'

import { createContext, useContext } from 'react'
import type { Profile, PermissionAction } from '@/lib/types'

// Re-export so existing imports like `import { type Profile } from '@/lib/profile-context'`
// continue to work without changes across the codebase.
export type { Profile }

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
const PERMISSION_MATRIX: Record<string, Record<PermissionAction, string[]>> = {
  orders:                 { insert: ['admin', 'manager'],                update: ['admin', 'manager'],                delete: ['admin'] },
  customers:              { insert: ['admin', 'manager'],                update: ['admin', 'manager'],                delete: ['admin'] },
  products:               { insert: ['admin', 'manager'],                update: ['admin', 'manager'],                delete: ['admin'] },
  contents:               { insert: ['admin', 'manager', 'editor'],     update: ['admin', 'manager', 'editor'],     delete: ['admin', 'manager'] },
  ads:                    { insert: ['admin', 'manager'],                update: ['admin', 'manager'],                delete: ['admin'] },
  sales:                  { insert: ['admin', 'manager'],                update: ['admin', 'manager'],                delete: ['admin'] },
  product_briefs:         { insert: ['admin', 'manager', 'editor'],     update: ['admin', 'manager', 'editor'],     delete: ['admin', 'manager'] },
  // product_briefs table exists in DB but the UI feature is removed — kept here for RLS reference only
  profiles:               { insert: [],                                   update: ['admin'],                           delete: ['admin'] },
  ad_contents:            { insert: ['admin', 'manager'],                update: ['admin', 'manager'],                delete: ['admin'] },
  leads:                  { insert: ['admin', 'manager'],                update: ['admin', 'manager'],                delete: ['admin'] },
  categories:             { insert: ['admin', 'manager'],                update: ['admin', 'manager'],                delete: ['admin'] },
  content_assets:         { insert: ['admin', 'manager', 'editor'],     update: ['admin', 'manager', 'editor'],     delete: ['admin', 'manager'] },
  content_assignment_log: { insert: ['admin', 'manager'],                update: [],                                  delete: [] },
  content_types:          { insert: ['admin', 'manager'],                update: ['admin', 'manager'],                delete: ['admin'] },
  app_settings:           { insert: ['admin'],                            update: ['admin'],                           delete: ['admin'] },
  report_schedules:       { insert: ['admin', 'manager'],                update: ['admin', 'manager'],                delete: ['admin', 'manager'] },
}

/**
 * Returns true if the current user's role allows the given action on the given table.
 * This mirrors the DB RLS matrix for client-side UI gating only.
 * RLS at the database level remains the authoritative source of truth.
 */
export function useCan(action: PermissionAction, table: string): boolean {
  const { role } = useProfile()
  const allowed = PERMISSION_MATRIX[table]?.[action] ?? []
  return allowed.includes(role)
}

/** Returns true if the current user is admin. */
export function useIsAdmin(): boolean {
  return useProfile().role === 'admin'
}
