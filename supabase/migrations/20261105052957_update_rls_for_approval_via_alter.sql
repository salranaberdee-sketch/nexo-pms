-- ============================================================
-- NEXO PMS — Update all RLS policies to require approval_status = 'approved'
-- + Add admin profile management policy + own-profile SELECT policy
-- Uses ALTER POLICY (no DROP) to avoid destructive confirmation
-- ============================================================

-- ============ profiles ============
ALTER POLICY "Users can view all profiles" ON public.profiles
  USING (EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = (SELECT auth.uid()) AND p.approval_status = 'approved'));

CREATE POLICY "Users view own profile" ON public.profiles
  FOR SELECT TO authenticated
  USING (id = (SELECT auth.uid()));

ALTER POLICY "Users can update own profile" ON public.profiles
  USING (id = (SELECT auth.uid()))
  WITH CHECK (id = (SELECT auth.uid()));

CREATE POLICY "Admin manage all profiles" ON public.profiles
  FOR UPDATE TO authenticated
  USING (EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = (SELECT auth.uid()) AND p.role = 'admin' AND p.approval_status = 'approved'))
  WITH CHECK (EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = (SELECT auth.uid()) AND p.role = 'admin' AND p.approval_status = 'approved'));

-- ============ products ============
ALTER POLICY "Admin manager see all products" ON public.products
  USING (EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = (SELECT auth.uid()) AND p.role IN ('admin','manager') AND p.approval_status = 'approved'));

ALTER POLICY "Editor sees own brand products" ON public.products
  USING (EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = (SELECT auth.uid()) AND p.role = 'editor' AND brand = ANY(p.brand_access) AND p.approval_status = 'approved'));

ALTER POLICY "Viewer and editor can view all products" ON public.products
  USING (EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = (SELECT auth.uid()) AND p.role IN ('admin','manager','editor','viewer') AND p.approval_status = 'approved'));

ALTER POLICY "Admin manager insert products" ON public.products
  WITH CHECK (EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = (SELECT auth.uid()) AND p.role IN ('admin','manager') AND p.approval_status = 'approved'));

ALTER POLICY "Admin manager update products" ON public.products
  USING (EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = (SELECT auth.uid()) AND p.role IN ('admin','manager') AND p.approval_status = 'approved'))
  WITH CHECK (EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = (SELECT auth.uid()) AND p.role IN ('admin','manager') AND p.approval_status = 'approved'));

ALTER POLICY "Admin delete products" ON public.products
  USING (EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = (SELECT auth.uid()) AND p.role = 'admin' AND p.approval_status = 'approved'));

-- ============ product_briefs ============
ALTER POLICY "View briefs" ON public.product_briefs
  USING (EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = (SELECT auth.uid()) AND p.approval_status = 'approved'));

ALTER POLICY "Manage briefs" ON public.product_briefs
  WITH CHECK (EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = (SELECT auth.uid()) AND p.role IN ('admin','manager','editor') AND p.approval_status = 'approved'));

ALTER POLICY "Update briefs" ON public.product_briefs
  USING (EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = (SELECT auth.uid()) AND p.role IN ('admin','manager','editor') AND p.approval_status = 'approved'))
  WITH CHECK (EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = (SELECT auth.uid()) AND p.role IN ('admin','manager','editor') AND p.approval_status = 'approved'));

ALTER POLICY "Delete briefs" ON public.product_briefs
  USING (EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = (SELECT auth.uid()) AND p.role IN ('admin','manager') AND p.approval_status = 'approved'));

-- ============ contents ============
ALTER POLICY "View contents" ON public.contents
  USING (EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = (SELECT auth.uid()) AND p.approval_status = 'approved'));

ALTER POLICY "Manage contents" ON public.contents
  WITH CHECK (EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = (SELECT auth.uid()) AND p.role IN ('admin','manager','editor') AND p.approval_status = 'approved'));

ALTER POLICY "Update contents" ON public.contents
  USING (EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = (SELECT auth.uid()) AND p.role IN ('admin','manager','editor') AND p.approval_status = 'approved'))
  WITH CHECK (EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = (SELECT auth.uid()) AND p.role IN ('admin','manager','editor') AND p.approval_status = 'approved'));

ALTER POLICY "Delete contents" ON public.contents
  USING (EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = (SELECT auth.uid()) AND p.role IN ('admin','manager') AND p.approval_status = 'approved'));

-- ============ ads ============
ALTER POLICY "View ads" ON public.ads
  USING (EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = (SELECT auth.uid()) AND p.approval_status = 'approved'));

ALTER POLICY "Manage ads" ON public.ads
  WITH CHECK (EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = (SELECT auth.uid()) AND p.role IN ('admin','manager') AND p.approval_status = 'approved'));

ALTER POLICY "Update ads" ON public.ads
  USING (EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = (SELECT auth.uid()) AND p.role IN ('admin','manager') AND p.approval_status = 'approved'))
  WITH CHECK (EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = (SELECT auth.uid()) AND p.role IN ('admin','manager') AND p.approval_status = 'approved'));

ALTER POLICY "Delete ads" ON public.ads
  USING (EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = (SELECT auth.uid()) AND p.role = 'admin' AND p.approval_status = 'approved'));

-- ============ sales ============
ALTER POLICY "View sales" ON public.sales
  USING (EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = (SELECT auth.uid()) AND p.approval_status = 'approved'));

ALTER POLICY "Manage sales" ON public.sales
  WITH CHECK (EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = (SELECT auth.uid()) AND p.role IN ('admin','manager') AND p.approval_status = 'approved'));

ALTER POLICY "Update sales" ON public.sales
  USING (EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = (SELECT auth.uid()) AND p.role IN ('admin','manager') AND p.approval_status = 'approved'))
  WITH CHECK (EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = (SELECT auth.uid()) AND p.role IN ('admin','manager') AND p.approval_status = 'approved'));

ALTER POLICY "Delete sales" ON public.sales
  USING (EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = (SELECT auth.uid()) AND p.role = 'admin' AND p.approval_status = 'approved'));
