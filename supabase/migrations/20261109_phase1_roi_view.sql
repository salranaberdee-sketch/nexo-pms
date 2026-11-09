-- =============================================================
-- Phase 1.6: ROI view per content (first-touch attribution)
-- =============================================================
--
-- Attribution model: FIRST-TOUCH
--   - Each lead is credited 100% to the content_id it linked to
--     (or to the ad_id if no content_id is set)
--   - ad_cost_share = sum(ads.budget_spent × ad_contents.attribution_pct/100)
--     across all ads that link to this content
--   - roi = deal_revenue - production_cost - ad_cost_share
--
-- Formulas (shown here for documentation):
--   deal_revenue    = SUM(leads.deal_amount) WHERE status = 'ปิดการขาย'
--   production_cost = contents.production_cost (set by team)
--   ad_cost_share   = SUM(ads.budget_spent × attribution_pct / 100)
--                     for each (ad_id, content_id) pair in ad_contents
--   roi             = deal_revenue - production_cost - ad_cost_share
--   roi_pct         = roi / NULLIF(production_cost + ad_cost_share, 0) × 100
-- =============================================================

CREATE OR REPLACE VIEW public.v_content_roi AS
WITH
-- Step 1: revenue credited to each content via first-touch leads
content_revenue AS (
  SELECT
    l.content_id,
    l.product_id,
    COUNT(*)                                          AS total_leads,
    COUNT(*) FILTER (WHERE l.status = 'ปิดการขาย')  AS closed_leads,
    COALESCE(SUM(l.deal_amount) FILTER (WHERE l.status = 'ปิดการขาย'), 0) AS deal_revenue
  FROM public.leads l
  WHERE l.content_id IS NOT NULL
  GROUP BY l.content_id, l.product_id
),

-- Step 2: ad spend attributed to each content via ad_contents join table
content_ad_cost AS (
  SELECT
    ac.content_id,
    COALESCE(SUM(a.budget_spent * ac.attribution_pct / 100.0), 0) AS ad_cost_share
  FROM public.ad_contents ac
  JOIN public.ads a ON a.id = ac.ad_id
  GROUP BY ac.content_id
)

-- Final: join everything onto contents
SELECT
  c.id                                                          AS content_id,
  c.product_id,
  c.seq,
  c.title,
  c.type,
  c.channel,
  c.assigned_to,
  c.status                                                      AS content_status,
  COALESCE(c.production_cost, 0)                                AS production_cost,
  COALESCE(cac.ad_cost_share, 0)                                AS ad_cost_share,
  COALESCE(cac.ad_cost_share, 0) + COALESCE(c.production_cost, 0)
                                                                AS total_cost,
  COALESCE(cr.total_leads, 0)                                   AS total_leads,
  COALESCE(cr.closed_leads, 0)                                  AS closed_leads,
  COALESCE(cr.deal_revenue, 0)                                  AS deal_revenue,
  -- ROI = revenue - total cost
  COALESCE(cr.deal_revenue, 0)
    - COALESCE(cac.ad_cost_share, 0)
    - COALESCE(c.production_cost, 0)                            AS roi,
  -- ROI % = roi / total_cost × 100  (NULL when no cost)
  CASE
    WHEN (COALESCE(cac.ad_cost_share, 0) + COALESCE(c.production_cost, 0)) > 0
    THEN ROUND(
      (
        COALESCE(cr.deal_revenue, 0)
        - COALESCE(cac.ad_cost_share, 0)
        - COALESCE(c.production_cost, 0)
      )
      / (COALESCE(cac.ad_cost_share, 0) + COALESCE(c.production_cost, 0))
      * 100, 1
    )
    ELSE NULL
  END                                                           AS roi_pct,
  -- Conversion rate for this content
  CASE
    WHEN COALESCE(cr.total_leads, 0) > 0
    THEN ROUND(COALESCE(cr.closed_leads, 0)::NUMERIC / cr.total_leads * 100, 1)
    ELSE 0
  END                                                           AS conversion_rate
FROM public.contents c
LEFT JOIN content_revenue  cr  ON cr.content_id = c.id
LEFT JOIN content_ad_cost  cac ON cac.content_id = c.id
ORDER BY deal_revenue DESC, total_leads DESC;

COMMENT ON VIEW public.v_content_roi IS
  'ROI per content — first-touch attribution. '
  'deal_revenue = SUM(leads.deal_amount) for closed leads linked to this content. '
  'ad_cost_share = budget_spent × attribution_pct/100 from ad_contents. '
  'roi = deal_revenue - production_cost - ad_cost_share. '
  'roi_pct = roi / total_cost × 100.';

-- Grant SELECT on the view to authenticated role
-- (inherits RLS from underlying tables via SECURITY INVOKER — default for views)
GRANT SELECT ON public.v_content_roi TO authenticated;
