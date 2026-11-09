-- =============================================================
-- Fix security advisors found after Phase 1 migrations
-- 1. set_leads_updated_at — pin search_path (mutable search_path fix)
-- 2. v_content_roi — recreate with security_invoker = true
-- =============================================================

-- Fix 1: pin search_path on trigger function
CREATE OR REPLACE FUNCTION public.set_leads_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = ''
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

-- Fix 2: recreate view as SECURITY INVOKER (PostgreSQL 15+)
CREATE OR REPLACE VIEW public.v_content_roi
  WITH (security_invoker = true)
AS
WITH
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
content_ad_cost AS (
  SELECT
    ac.content_id,
    COALESCE(SUM(a.budget_spent * ac.attribution_pct / 100.0), 0) AS ad_cost_share
  FROM public.ad_contents ac
  JOIN public.ads a ON a.id = ac.ad_id
  GROUP BY ac.content_id
)
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
  COALESCE(cac.ad_cost_share, 0) + COALESCE(c.production_cost, 0) AS total_cost,
  COALESCE(cr.total_leads, 0)                                   AS total_leads,
  COALESCE(cr.closed_leads, 0)                                  AS closed_leads,
  COALESCE(cr.deal_revenue, 0)                                  AS deal_revenue,
  COALESCE(cr.deal_revenue, 0)
    - COALESCE(cac.ad_cost_share, 0)
    - COALESCE(c.production_cost, 0)                            AS roi,
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
  'ROI per content - first-touch attribution (SECURITY INVOKER). '
  'deal_revenue = SUM(leads.deal_amount) for closed leads. '
  'roi = deal_revenue - production_cost - ad_cost_share.';

GRANT SELECT ON public.v_content_roi TO authenticated;
