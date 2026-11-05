ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view all profiles" ON public.profiles FOR SELECT TO authenticated USING (true);
CREATE POLICY "Users can insert own profile" ON public.profiles FOR INSERT TO authenticated WITH CHECK ((select auth.uid()) = id);
CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE TO authenticated USING ((select auth.uid()) = id);

ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admin manager see all products" ON public.products FOR SELECT TO authenticated USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = (select auth.uid()) AND role IN ('admin','manager')));
CREATE POLICY "Editor sees own brand products" ON public.products FOR SELECT TO authenticated USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = (select auth.uid()) AND role = 'editor' AND brand = ANY(brand_access)));
CREATE POLICY "Admin manager insert products" ON public.products FOR INSERT TO authenticated WITH CHECK (EXISTS (SELECT 1 FROM public.profiles WHERE id = (select auth.uid()) AND role IN ('admin','manager')));
CREATE POLICY "Admin manager update products" ON public.products FOR UPDATE TO authenticated USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = (select auth.uid()) AND role IN ('admin','manager')));
CREATE POLICY "Admin delete products" ON public.products FOR DELETE TO authenticated USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = (select auth.uid()) AND role = 'admin'));

ALTER TABLE public.product_briefs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "View briefs" ON public.product_briefs FOR SELECT TO authenticated USING (true);
CREATE POLICY "Manage briefs" ON public.product_briefs FOR INSERT TO authenticated WITH CHECK (EXISTS (SELECT 1 FROM public.profiles WHERE id = (select auth.uid()) AND role IN ('admin','manager','editor')));
CREATE POLICY "Update briefs" ON public.product_briefs FOR UPDATE TO authenticated USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = (select auth.uid()) AND role IN ('admin','manager','editor')));
CREATE POLICY "Delete briefs" ON public.product_briefs FOR DELETE TO authenticated USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = (select auth.uid()) AND role IN ('admin','manager')));

ALTER TABLE public.contents ENABLE ROW LEVEL SECURITY;
CREATE POLICY "View contents" ON public.contents FOR SELECT TO authenticated USING (true);
CREATE POLICY "Manage contents" ON public.contents FOR INSERT TO authenticated WITH CHECK (EXISTS (SELECT 1 FROM public.profiles WHERE id = (select auth.uid()) AND role IN ('admin','manager','editor')));
CREATE POLICY "Update contents" ON public.contents FOR UPDATE TO authenticated USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = (select auth.uid()) AND role IN ('admin','manager','editor')));
CREATE POLICY "Delete contents" ON public.contents FOR DELETE TO authenticated USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = (select auth.uid()) AND role IN ('admin','manager')));

ALTER TABLE public.ads ENABLE ROW LEVEL SECURITY;
CREATE POLICY "View ads" ON public.ads FOR SELECT TO authenticated USING (true);
CREATE POLICY "Manage ads" ON public.ads FOR INSERT TO authenticated WITH CHECK (EXISTS (SELECT 1 FROM public.profiles WHERE id = (select auth.uid()) AND role IN ('admin','manager')));
CREATE POLICY "Update ads" ON public.ads FOR UPDATE TO authenticated USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = (select auth.uid()) AND role IN ('admin','manager')));
CREATE POLICY "Delete ads" ON public.ads FOR DELETE TO authenticated USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = (select auth.uid()) AND role = 'admin'));

ALTER TABLE public.sales ENABLE ROW LEVEL SECURITY;
CREATE POLICY "View sales" ON public.sales FOR SELECT TO authenticated USING (true);
CREATE POLICY "Manage sales" ON public.sales FOR INSERT TO authenticated WITH CHECK (EXISTS (SELECT 1 FROM public.profiles WHERE id = (select auth.uid()) AND role IN ('admin','manager')));
CREATE POLICY "Update sales" ON public.sales FOR UPDATE TO authenticated USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = (select auth.uid()) AND role IN ('admin','manager')));
CREATE POLICY "Delete sales" ON public.sales FOR DELETE TO authenticated USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = (select auth.uid()) AND role = 'admin'));
