'use client'

import Team from '@/components/Team'

// Team management page — admin only (layout guard + RLS enforce this).
// Lists all users, lets admin approve/reject and change roles.
export default function TeamPage() {
  return <Team />
}
