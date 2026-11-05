import { createBrowserClient } from '@supabase/ssr'

// Module-level singleton — prevents creating a new client object on every render.
// Without this, every component that calls createClient() in the component body
// gets a fresh object, which destabilizes all useEffect dependency arrays.
let _client: ReturnType<typeof createBrowserClient> | null = null

export function createClient() {
  if (!_client) {
    _client = createBrowserClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    )
  }
  return _client
}
