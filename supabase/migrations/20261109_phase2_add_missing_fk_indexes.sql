-- Phase 2: Add indexes for unindexed foreign keys
-- Resolves: Supabase performance advisor "Unindexed foreign keys"

CREATE INDEX IF NOT EXISTS idx_content_assets_uploaded_by
  ON public.content_assets (uploaded_by);

CREATE INDEX IF NOT EXISTS idx_assignment_log_assigned_by
  ON public.content_assignment_log (assigned_by_id);

CREATE INDEX IF NOT EXISTS idx_contents_acknowledged_by
  ON public.contents (acknowledged_by);

CREATE INDEX IF NOT EXISTS idx_products_created_by
  ON public.products (created_by);

CREATE INDEX IF NOT EXISTS idx_profiles_approved_by
  ON public.profiles (approved_by);
