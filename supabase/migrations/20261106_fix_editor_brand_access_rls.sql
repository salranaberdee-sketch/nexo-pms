-- ============================================================
-- Migration: fix_editor_brand_access_rls
-- Purpose  : Make brand_access actually enforce per-editor visibility.
--
-- Root cause: The broad "Viewer and editor can view all products"
--   policy (PERMISSIVE OR) overrode the narrower
--   "Editor sees own brand products" policy, so every editor
--   could see every product regardless of brand_access.
--
-- Strategy:
--   products       → remove combined policy, add viewer-only policy
--   contents       → split into admin/manager/viewer vs editor-brand
--   product_briefs → split into admin/manager/viewer vs editor-brand
--
-- Behaviour after migration (Option B):
--   editor with brand_access = {} → sees nothing (intentional)
--   editor with brand_access = {'REBORN'} → sees only REBORN data
--   admin/manager/viewer → unchanged (see everything)
--
-- Rollback: see commented section at the bottom
-- ============================================================


-- ── products ────────────────────────────────────────────────
-- 1. Remove the combined policy that let editors bypass brand_access
DROP POLICY IF EXISTS "Viewer and editor can view all products" ON public.products;

-- 2. Viewer-only SELECT (viewer sees all products, no brand filter)
CREATE POLICY "Viewer can view all products"
  ON public.products
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.id = (SELECT auth.uid())
        AND p.role = 'viewer'
        AND p.approval_status = 'approved'
    )
  );

-- Note: "Editor sees own brand products" policy already exists and is correct.
-- It uses: products.brand = ANY(p.brand_access)
-- editor with brand_access = '{}' sees zero products (Option B).


-- ── contents ────────────────────────────────────────────────
-- 3. Replace broad "View contents" with role-split policies
DROP POLICY IF EXISTS "View contents" ON public.contents;

-- admin/manager/viewer: see all contents
CREATE POLICY "Admin manager viewer see all contents"
  ON public.contents
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.id = (SELECT auth.uid())
        AND p.role IN ('admin', 'manager', 'viewer')
        AND p.approval_status = 'approved'
    )
  );

-- editor: see only contents whose product.brand is in brand_access
CREATE POLICY "Editor sees own brand contents"
  ON public.contents
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles p
      JOIN products pr ON pr.product_id = contents.product_id
      WHERE p.id = (SELECT auth.uid())
        AND p.role = 'editor'
        AND pr.brand = ANY(p.brand_access)
        AND p.approval_status = 'approved'
    )
  );


-- ── product_briefs ───────────────────────────────────────────
-- 4. Replace broad "View briefs" with role-split policies
DROP POLICY IF EXISTS "View briefs" ON public.product_briefs;

-- admin/manager/viewer: see all briefs
CREATE POLICY "Admin manager viewer see all briefs"
  ON public.product_briefs
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.id = (SELECT auth.uid())
        AND p.role IN ('admin', 'manager', 'viewer')
        AND p.approval_status = 'approved'
    )
  );

-- editor: see only briefs whose product.brand is in brand_access
CREATE POLICY "Editor sees own brand briefs"
  ON public.product_briefs
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles p
      JOIN products pr ON pr.product_id = product_briefs.product_id
      WHERE p.id = (SELECT auth.uid())
        AND p.role = 'editor'
        AND pr.brand = ANY(p.brand_access)
        AND p.approval_status = 'approved'
    )
  );


-- ============================================================
-- ROLLBACK (run manually if needed):
--
-- DROP POLICY IF EXISTS "Viewer can view all products" ON public.products;
-- CREATE POLICY "Viewer and editor can view all products" ON public.products
--   FOR SELECT TO authenticated
--   USING (EXISTS (SELECT 1 FROM profiles p
--     WHERE p.id = (SELECT auth.uid())
--     AND p.role IN ('admin','manager','editor','viewer')
--     AND p.approval_status = 'approved'));
--
-- DROP POLICY IF EXISTS "Admin manager viewer see all contents" ON public.contents;
-- DROP POLICY IF EXISTS "Editor sees own brand contents" ON public.contents;
-- CREATE POLICY "View contents" ON public.contents FOR SELECT TO authenticated
--   USING (EXISTS (SELECT 1 FROM profiles p
--     WHERE p.id = (SELECT auth.uid()) AND p.approval_status = 'approved'));
--
-- DROP POLICY IF EXISTS "Admin manager viewer see all briefs" ON public.product_briefs;
-- DROP POLICY IF EXISTS "Editor sees own brand briefs" ON public.product_briefs;
-- CREATE POLICY "View briefs" ON public.product_briefs FOR SELECT TO authenticated
--   USING (EXISTS (SELECT 1 FROM profiles p
--     WHERE p.id = (SELECT auth.uid()) AND p.approval_status = 'approved'));
-- ============================================================
