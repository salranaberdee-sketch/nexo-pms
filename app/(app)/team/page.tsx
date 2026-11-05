import Team from '@/components/Team'

export const dynamic = 'force-static'

// Team management page — admin only (layout guard + RLS enforce this).
export default function TeamPage() {
  return <Team />
}
