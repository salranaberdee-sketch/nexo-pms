-- ============================================================
-- NEXO PMS — Add user approval system + profile-linked assignment columns
-- ============================================================

-- 1. Add approval columns to profiles
ALTER TABLE public.profiles
  ADD COLUMN approval_status TEXT NOT NULL DEFAULT 'pending'
    CHECK (approval_status IN ('pending', 'approved', 'rejected')),
  ADD COLUMN approved_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  ADD COLUMN approved_at TIMESTAMPTZ;

-- 2. Grandfather all existing users as approved (pre-approval system)
UPDATE public.profiles SET approval_status = 'approved';

-- 3. Update handle_new_user trigger — new signups always start pending
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, name, email, role, approval_status)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'name', split_part(NEW.email,'@',1)),
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'role', 'viewer'),
    'pending'
  );
  RETURN NEW;
END;
$$;

-- 4. Protect profile fields — non-admins cannot change role or approval_status
CREATE OR REPLACE FUNCTION public.protect_profile_fields()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  current_uid UUID;
  is_admin BOOLEAN;
BEGIN
  current_uid := (SELECT auth.uid());

  -- System operations (migrations, service role) have no auth context — allow
  IF current_uid IS NULL THEN
    RETURN NEW;
  END IF;

  SELECT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = current_uid
    AND role = 'admin'
    AND approval_status = 'approved'
  ) INTO is_admin;

  IF NOT is_admin THEN
    -- Non-admins cannot change protected fields
    NEW.role := OLD.role;
    NEW.approval_status := OLD.approval_status;
    NEW.approved_by := OLD.approved_by;
    NEW.approved_at := OLD.approved_at;
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER protect_profile_fields BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.protect_profile_fields();

-- 5. Add profile-linked assignment columns (alongside existing TEXT fields)
ALTER TABLE public.products ADD COLUMN owner_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL;

ALTER TABLE public.contents
  ADD COLUMN assigned_to_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  ADD COLUMN producer_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  ADD COLUMN approver_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  ADD COLUMN poster_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL;

ALTER TABLE public.ads ADD COLUMN managed_by_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL;

-- 6. Add indexes for new FK columns and approval_status
CREATE INDEX idx_profiles_approval_status ON public.profiles(approval_status);
CREATE INDEX idx_products_owner_id ON public.products(owner_id);
CREATE INDEX idx_contents_assigned_to_id ON public.contents(assigned_to_id);
CREATE INDEX idx_contents_producer_id ON public.contents(producer_id);
CREATE INDEX idx_contents_approver_id ON public.contents(approver_id);
CREATE INDEX idx_contents_poster_id ON public.contents(poster_id);
CREATE INDEX idx_ads_managed_by_id ON public.ads(managed_by_id);
