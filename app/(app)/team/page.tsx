import TeamGuard from '@/app/(app)/team/team-guard'

// Server Component wrapper — allows instant = false (not supported in 'use client' files).
export default function TeamPage() {
  return <TeamGuard />
}

export const instant = false
