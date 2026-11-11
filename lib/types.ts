/**
 * lib/types.ts — Shared domain types used across multiple components.
 *
 * Rules:
 *  - Types here must be referenced by ≥2 files, or represent a core domain concept.
 *  - Derive from Tables<> wherever possible — avoids drift when schema changes.
 *  - No React imports. No Supabase client imports.
 */

import type { Tables } from '@/src/types/database'

// ─── Profile ──────────────────────────────────────────────────────────────────

/**
 * The subset of profiles fields loaded by the app layout and distributed
 * via ProfileContext. Derived directly from the generated database type so
 * schema changes are caught by TypeScript automatically.
 *
 * Previously a manually-maintained type in lib/profile-context.tsx.
 */
export type Profile = Pick<
  Tables<'profiles'>,
  'id' | 'name' | 'email' | 'role' | 'approval_status' | 'brand_access'
>

// ─── ProfileOption ────────────────────────────────────────────────────────────

/**
 * Minimal profile shape used in dropdowns (ProfilePicker, InlinePersonPicker).
 * Previously defined independently in both ProfilePicker.tsx and InlinePersonPicker.tsx.
 * Single definition here prevents the two from silently diverging.
 */
export type ProfileOption = Pick<Tables<'profiles'>, 'id' | 'name' | 'role' | 'brand_access'>

// ─── Permission helpers ───────────────────────────────────────────────────────

/** Operations that can be permission-checked on the client side. */
export type PermissionAction = 'insert' | 'update' | 'delete'
