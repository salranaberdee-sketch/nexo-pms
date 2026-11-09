-- Phase 2: Merge 3 overlapping SELECT policies on products into 1
-- Resolves: Supabase "Multiple Permissive Policies" performance warning
-- Decision log: policy "Viewer and editor can view all products" already covers ALL roles
-- (admin, manager, editor, viewer) so the other two are redundant.
-- We replace all 3 with a single clean policy.

DROP POLICY IF EXISTS "Admin manager see all products" ON public.products;
DROP POLICY IF EXISTS "Editor sees own brand products" ON public.products;
DROP POLICY IF EXISTS "Viewer and editor can view all products" ON public.products;

-- Single SELECT policy: every approved user can read all products
-- (Editor brand_access scoping was never actually enforced due to OR logic between policies)
CREATE POLICY "View all products" ON public.products
  FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM profiles p
    WHERE p.id = (SELECT auth.uid())
    AND p.approval_status = 'approved'
  ));
