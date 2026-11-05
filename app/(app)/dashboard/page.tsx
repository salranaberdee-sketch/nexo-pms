import Dashboard from '@/components/Dashboard'

// Cache the page shell — data is fetched client-side, so this only affects
// the JS bundle delivery, not the data freshness.
export const dynamic = 'force-static'

export default function Page() {
  return <Dashboard />
}
