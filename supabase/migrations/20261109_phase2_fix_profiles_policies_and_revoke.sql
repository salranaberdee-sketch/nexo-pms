-- Phase 2: Fix profiles RLS policies + revoke EXECUTE from SECURITY DEFINER helpers
-- Resolves: Supabase security advisor warnings
-- (1) Replace Admin manage all profiles — use EXISTS instead of SECURITY DEFINER functions
-- (2) Merge 2 redundant SELECT policies into 1
-- (3) Revoke EXECUTE on get_my_role() + get_my_approval_status() from authenticated

-- ── Step 1: Replace Admin manage all profiles UPDATE policy ─────────────────────
DROP POLICY IF EXISTS "Admin manage all profiles" ON public.profiles;
CREATE POLICY "Admin manage all profiles" ON public.profiles
  FOR UPDATE TO authenticated
  USING (EXISTS (
    SELECT 1 FROM profiles p
    WHERE p.id = (SELECT auth.uid())
    AND p.role = 'admin'
    AND p.approval_status = 'approved'
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM profiles p
    WHERE p.id = (SELECT auth.uid())
    AND p.role = 'admin'
    AND p.approval_status = 'approved'
  ));

-- ── Step 2: Merge redundant SELECT policies into one ────────────────────────────
-- Old: "Users can view all profiles" (approved users see all) + "Users view own profile" (pending sees self)
-- New: single policy covering both cases
DROP POLICY IF EXISTS "Users can view all profiles" ON public.profiles;
DROP POLICY IF EXISTS "Users view own profile" ON public.profiles;
CREATE POLICY "View profiles" ON public.profiles
  FOR SELECT TO authenticated
  USING (
    id = (SELECT auth.uid())
    OR EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.id = (SELECT auth.uid())
      AND p.approval_status = 'approved'
    )
  );

-- ── Step 3: Revoke EXECUTE from authenticated on SECURITY DEFINER helpers ────────
-- These are only used by DB-internal logic now (via trigger / other DEFINER funcs)
REVOKE EXECUTE ON FUNCTION public.get_my_role() FROM authenticated;
REVOKE EXECUTE ON FUNCTION public.get_my_approval_status() FROM authenticated;
