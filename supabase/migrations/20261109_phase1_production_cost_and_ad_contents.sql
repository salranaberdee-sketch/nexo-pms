-- =============================================================
-- Phase 1.1: Add production_cost to contents
-- Phase 1.2: Create ad_contents (many-to-many: ads ↔ contents)
-- =============================================================

-- ──────────────────────────────────────────────────────────────
-- 1.1  production_cost column on contents
-- ──────────────────────────────────────────────────────────────
ALTER TABLE public.contents
  ADD COLUMN IF NOT EXISTS production_cost NUMERIC DEFAULT 0;

-- ──────────────────────────────────────────────────────────────
-- 1.2  ad_contents — join table between ads and contents
--      Purpose: one ad can use many contents; one content can
--               appear in many ads (many-to-many).
--      ads.content_ref (TEXT) is kept untouched for backward
--      compatibility; ad_contents is the structured FK version.
-- ──────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.ad_contents (
  id          BIGSERIAL PRIMARY KEY,
  ad_id       BIGINT  NOT NULL REFERENCES public.ads(id)      ON DELETE CASCADE,
  content_id  BIGINT  NOT NULL REFERENCES public.contents(id) ON DELETE CASCADE,
  -- attribution weight: how much of the ad's leads/spend is
  -- attributed to this content (0–100, sum across rows per ad
  -- should be 100 but is not enforced by DB)
  attribution_pct  NUMERIC DEFAULT 100
    CONSTRAINT chk_attribution_pct CHECK (attribution_pct >= 0 AND attribution_pct <= 100),
  note        TEXT,
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (ad_id, content_id)
);

COMMENT ON TABLE public.ad_contents IS
  'Many-to-many link between ads and contents. '
  'attribution_pct (0-100) records how much of the ad spend/leads is attributed to each content. '
  'ads.content_ref (TEXT) is kept for legacy display; ad_contents is the FK-based source of truth.';

-- Updated-at trigger
CREATE OR REPLACE FUNCTION set_ad_contents_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN NEW.created_at = OLD.created_at; RETURN NEW; END; $$;
-- (ad_contents rows are immutable after insert — update means replacing attribution weight)

-- Indexes for fast lookup in both directions
CREATE INDEX IF NOT EXISTS idx_ad_contents_ad_id      ON public.ad_contents (ad_id);
CREATE INDEX IF NOT EXISTS idx_ad_contents_content_id ON public.ad_contents (content_id);

-- ──────────────────────────────────────────────────────────────
-- RLS for ad_contents
-- Role matrix:
--   SELECT  → all authenticated (viewer+)
--   INSERT  → admin, manager
--   UPDATE  → admin, manager
--   DELETE  → admin
-- ──────────────────────────────────────────────────────────────
ALTER TABLE public.ad_contents ENABLE ROW LEVEL SECURITY;

-- SELECT
CREATE POLICY "View ad_contents" ON public.ad_contents
  FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = (SELECT auth.uid())
      AND approval_status = 'approved'
  ));

-- INSERT
CREATE POLICY "Manage ad_contents" ON public.ad_contents
  FOR INSERT TO authenticated
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = (SELECT auth.uid())
      AND approval_status = 'approved'
      AND role IN ('admin', 'manager')
  ));

-- UPDATE
CREATE POLICY "Update ad_contents" ON public.ad_contents
  FOR UPDATE TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = (SELECT auth.uid())
      AND approval_status = 'approved'
      AND role IN ('admin', 'manager')
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = (SELECT auth.uid())
      AND approval_status = 'approved'
      AND role IN ('admin', 'manager')
  ));

-- DELETE
CREATE POLICY "Delete ad_contents" ON public.ad_contents
  FOR DELETE TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = (SELECT auth.uid())
      AND approval_status = 'approved'
      AND role = 'admin'
  ));

-- ──────────────────────────────────────────────────────────────
-- Backfill strategy for ads.content_ref → ad_contents
-- (run manually after verifying content titles match exactly)
-- This INSERT is wrapped in a DO block so it only runs when
-- there is an exact title match; no-match rows are skipped safely.
-- ──────────────────────────────────────────────────────────────
DO $$
BEGIN
  INSERT INTO public.ad_contents (ad_id, content_id, attribution_pct, note)
  SELECT
    a.id          AS ad_id,
    c.id          AS content_id,
    100           AS attribution_pct,
    'backfilled from ads.content_ref'  AS note
  FROM public.ads a
  JOIN public.contents c
    ON TRIM(LOWER(c.title)) = TRIM(LOWER(a.content_ref))
    AND c.product_id = a.product_id   -- same product keeps it scoped
  WHERE a.content_ref IS NOT NULL
    AND a.content_ref <> ''
  ON CONFLICT (ad_id, content_id) DO NOTHING;
END $$;
