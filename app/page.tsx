import { redirect } from 'next/navigation'

// Root entry — send users to the dashboard.
// Auth guard lives in the (app) route group layout, which redirects
// unauthenticated visitors to /login.
export default function Home() {
  redirect('/dashboard')
}
