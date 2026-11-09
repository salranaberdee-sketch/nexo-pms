-- Cleanup duplicate RLS policies
-- รันใน Supabase Dashboard > SQL Editor
-- หลังจาก Phase 2 migration ที่เพิ่ม v2 policies มาแทนที่ policies เก่า

-- ── products: ลบ SELECT policies เก่าที่ซ้ำกัน (ครอบคลุมโดย "View all products v2") ──
DROP POLICY IF EXISTS "Admin manager see all products" ON public.products;
DROP POLICY IF EXISTS "Editor sees own brand products" ON public.products;
DROP POLICY IF EXISTS "Viewer and editor can view all products" ON public.products;

-- ── profiles: ลบ SELECT policies เก่าที่ซ้ำกัน (ครอบคลุมโดย "View profiles v2") ──
DROP POLICY IF EXISTS "Users can view all profiles" ON public.profiles;
DROP POLICY IF EXISTS "Users view own profile" ON public.profiles;

-- ── profiles: ลบ UPDATE policy เก่าที่ซ้ำกัน (ครอบคลุมโดย "Admin manage all profiles v2") ──
DROP POLICY IF EXISTS "Admin manage all profiles" ON public.profiles;

-- ── Verify ─────────────────────────────────────────────────────────────────────
SELECT tablename, cmd, COUNT(*) as policy_count, array_agg(policyname) as policies
FROM pg_policies
WHERE schemaname = 'public' AND tablename IN ('products', 'profiles')
GROUP BY tablename, cmd
ORDER BY tablename, cmd;
