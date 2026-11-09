-- =============================================================
-- Phase 1.3: Create leads table
-- Attribution: manual (sales team records source)
-- Privacy: minimal PII — no medical/health data stored
-- =============================================================

CREATE TABLE IF NOT EXISTS public.leads (
  id              BIGSERIAL PRIMARY KEY,

  -- ── Attribution FK ──────────────────────────────────────────
  product_id      TEXT        NOT NULL REFERENCES public.products(product_id) ON DELETE CASCADE,
  ad_id           BIGINT      REFERENCES public.ads(id)      ON DELETE SET NULL,
  content_id      BIGINT      REFERENCES public.contents(id) ON DELETE SET NULL,

  -- ── Channel ─────────────────────────────────────────────────
  channel_in      TEXT        NOT NULL DEFAULT 'other'
    CONSTRAINT chk_lead_channel CHECK (
      channel_in IN ('form', 'LINE', 'inbox', 'phone', 'other')
    ),

  -- ── UTM (first-touch, filled manually or via form webhook) ──
  utm_source      TEXT,   -- เช่น facebook, tiktok, google
  utm_medium      TEXT,   -- เช่น cpc, social, email
  utm_campaign    TEXT,   -- ตรงกับ ads.campaign_name
  utm_content     TEXT,   -- ตรงกับ contents.title หรือ ad creative ID

  -- ── Status pipeline ─────────────────────────────────────────
  status          TEXT        NOT NULL DEFAULT 'ใหม่'
    CONSTRAINT chk_lead_status CHECK (
      status IN ('ใหม่', 'ติดต่อแล้ว', 'ผ่านเกณฑ์', 'ปิดการขาย', 'ไม่สำเร็จ')
    ),

  -- ── Deal ────────────────────────────────────────────────────
  deal_amount     NUMERIC     DEFAULT 0,
  closed_at       TIMESTAMPTZ,

  -- ── Assignment ──────────────────────────────────────────────
  owner_id        UUID        REFERENCES public.profiles(id) ON DELETE SET NULL,
  owner_name      TEXT,   -- denormalised display name

  -- ── PDPA consent ────────────────────────────────────────────
  -- ⚠️  Do NOT store: name, surname, phone, email, ID card,
  --     medical history, health conditions, treatment records.
  -- Only store: consent flag + timestamp for audit trail.
  consent_given   BOOLEAN     NOT NULL DEFAULT FALSE,
  consent_at      TIMESTAMPTZ,

  -- ── Notes ───────────────────────────────────────────────────
  -- For any text entered by sales team. Remind users:
  -- "ห้ามระบุชื่อ-นามสกุล เบอร์โทร หรือข้อมูลสุขภาพในช่องนี้"
  notes           TEXT,

  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW()
);

COMMENT ON TABLE public.leads IS
  'Lead tracking table. '
  'PDPA constraint: do NOT store name, surname, phone, email, ID card, '
  'medical history, health conditions, or treatment records. '
  'Store only: consent_given + consent_at for audit trail. '
  'For products that are clinics/rehabilitation centres (REB-REH-001, CLN-CIR-001), '
  'this constraint is especially critical.';

COMMENT ON COLUMN public.leads.notes IS
  'Free-text notes by sales team. Remind users: ห้ามระบุชื่อ-นามสกุล เบอร์โทร หรือข้อมูลสุขภาพ';

-- Indexes
CREATE INDEX IF NOT EXISTS idx_leads_product_id  ON public.leads (product_id);
CREATE INDEX IF NOT EXISTS idx_leads_ad_id        ON public.leads (ad_id);
CREATE INDEX IF NOT EXISTS idx_leads_content_id   ON public.leads (content_id);
CREATE INDEX IF NOT EXISTS idx_leads_status       ON public.leads (status);
CREATE INDEX IF NOT EXISTS idx_leads_owner_id     ON public.leads (owner_id);
CREATE INDEX IF NOT EXISTS idx_leads_created_at   ON public.leads (created_at);

-- Updated-at trigger
CREATE OR REPLACE FUNCTION set_leads_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = NOW(); RETURN NEW; END; $$;

CREATE TRIGGER set_leads_updated_at
  BEFORE UPDATE ON public.leads
  FOR EACH ROW EXECUTE FUNCTION set_leads_updated_at();

-- ──────────────────────────────────────────────────────────────
-- RLS for leads
-- Role matrix (same as ads/sales — marketing data):
--   SELECT  → all authenticated (viewer+)
--   INSERT  → admin, manager
--   UPDATE  → admin, manager
--   DELETE  → admin
-- ──────────────────────────────────────────────────────────────
ALTER TABLE public.leads ENABLE ROW LEVEL SECURITY;

-- SELECT
CREATE POLICY "View leads" ON public.leads
  FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = (SELECT auth.uid())
      AND approval_status = 'approved'
  ));

-- INSERT
CREATE POLICY "Manage leads" ON public.leads
  FOR INSERT TO authenticated
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = (SELECT auth.uid())
      AND approval_status = 'approved'
      AND role IN ('admin', 'manager')
  ));

-- UPDATE
CREATE POLICY "Update leads" ON public.leads
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
CREATE POLICY "Delete leads" ON public.leads
  FOR DELETE TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = (SELECT auth.uid())
      AND approval_status = 'approved'
      AND role = 'admin'
  ));
