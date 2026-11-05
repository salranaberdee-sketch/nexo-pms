CREATE POLICY "Viewer and editor can view all products"
ON public.products FOR SELECT TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = (SELECT auth.uid())
    AND profiles.role = ANY (ARRAY['admin','manager','editor','viewer'])
  )
);
