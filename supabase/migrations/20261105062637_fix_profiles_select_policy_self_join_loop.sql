-- Fix: The 'Users can view all profiles' SELECT policy used a self-join on profiles
-- which caused infinite RLS recursion, blocking every profile SELECT query.
-- Replace with a join through auth.users (no recursion) while keeping the
-- fallback 'Users view own profile' policy for pending users.

ALTER POLICY "Users can view all profiles" ON public.profiles
  USING (
    id = (SELECT auth.uid())
    OR
    EXISTS (
      SELECT 1 FROM auth.users au
      JOIN public.profiles p ON p.id = au.id
      WHERE au.id = (SELECT auth.uid())
      AND p.approval_status = 'approved'
    )
  );
