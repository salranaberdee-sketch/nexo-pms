-- ============================================================
-- NEXO PMS — Core Schema
-- ============================================================

CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'viewer'
    CHECK (role IN ('admin','manager','editor','viewer')),
  brand_access TEXT[] DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE public.products (
  id BIGSERIAL PRIMARY KEY,
  product_id TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  business_type TEXT,
  product_type TEXT,
  brand TEXT,
  owner TEXT,
  start_date DATE,
  status TEXT DEFAULT 'กำลังพัฒนา'
    CHECK (status IN ('กำลังพัฒนา','เตรียมเปิดตัว','เปิดขาย','หยุดขาย')),
  notes TEXT DEFAULT '',
  created_by UUID REFERENCES public.profiles(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE public.product_briefs (
  id BIGSERIAL PRIMARY KEY,
  product_id TEXT NOT NULL REFERENCES public.products(product_id) ON DELETE CASCADE,
  brief_type TEXT NOT NULL CHECK (brief_type IN ('A','B')),
  topic TEXT, target_audience TEXT, problem TEXT, benefits TEXT,
  highlights TEXT, competitors TEXT, evidence TEXT, instructors TEXT,
  format TEXT, schedule TEXT, deliverables TEXT, registration_period TEXT,
  price TEXT, payment_method TEXT, registration_link TEXT, contact_channel TEXT,
  product_description TEXT, usage_method TEXT, warnings TEXT, legal_info TEXT,
  packages TEXT, delivery TEXT, warranty TEXT, order_method TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(product_id, brief_type)
);

CREATE TABLE public.contents (
  id BIGSERIAL PRIMARY KEY,
  product_id TEXT NOT NULL REFERENCES public.products(product_id) ON DELETE CASCADE,
  seq INTEGER NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('GRAPHIC','VIDEO','COPY')),
  title TEXT NOT NULL,
  objective TEXT,
  channel TEXT DEFAULT 'Facebook',
  hook TEXT, message TEXT, cta TEXT, format_size TEXT, file_reference TEXT,
  assigned_to TEXT, producer TEXT,
  assigned_date DATE, deadline DATE, actual_submit_date DATE,
  status TEXT DEFAULT 'รอผลิต'
    CHECK (status IN ('รอผลิต','ผลิตอยู่','รออนุมัติ','อนุมัติแล้ว','กำหนดโพสต์','โพสต์แล้ว')),
  file_link TEXT, approver TEXT, approved_at DATE,
  poster TEXT, scheduled_post_date DATE, actual_post_date DATE, post_link TEXT,
  issues TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE public.ads (
  id BIGSERIAL PRIMARY KEY,
  product_id TEXT NOT NULL REFERENCES public.products(product_id) ON DELETE CASCADE,
  month TEXT NOT NULL,
  budget_approved NUMERIC DEFAULT 0,
  budget_adjustment NUMERIC DEFAULT 0,
  budget_total NUMERIC GENERATED ALWAYS AS (budget_approved + budget_adjustment) STORED,
  campaign_name TEXT NOT NULL,
  channel TEXT DEFAULT 'Facebook',
  content_ref TEXT, managed_by TEXT,
  start_date DATE, end_date DATE,
  budget_allocated NUMERIC DEFAULT 0,
  budget_spent NUMERIC DEFAULT 0,
  budget_remaining NUMERIC GENERATED ALWAYS AS (budget_allocated - budget_spent) STORED,
  reach INTEGER DEFAULT 0,
  clicks INTEGER DEFAULT 0,
  leads INTEGER DEFAULT 0,
  cpl NUMERIC GENERATED ALWAYS AS (CASE WHEN leads > 0 THEN budget_spent / leads ELSE 0 END) STORED,
  sales_amount NUMERIC DEFAULT 0,
  roas NUMERIC GENERATED ALWAYS AS (CASE WHEN budget_spent > 0 THEN sales_amount / budget_spent ELSE 0 END) STORED,
  result_notes TEXT, next_action TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE public.sales (
  id BIGSERIAL PRIMARY KEY,
  product_id TEXT NOT NULL REFERENCES public.products(product_id) ON DELETE CASCADE,
  period_start DATE NOT NULL,
  period_end DATE NOT NULL,
  sales_target_amount NUMERIC DEFAULT 0,
  sales_target_count INTEGER DEFAULT 0,
  actual_sales NUMERIC DEFAULT 0,
  actual_received NUMERIC DEFAULT 0,
  status TEXT DEFAULT 'ยังไม่เริ่ม'
    CHECK (status IN ('ยังไม่เริ่ม','กำลังขาย','ปิดเป้า','ยังไม่เปิดขาย')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(product_id, period_start)
);

CREATE INDEX idx_products_brand ON public.products(brand);
CREATE INDEX idx_products_status ON public.products(status);
CREATE INDEX idx_contents_product_id ON public.contents(product_id);
CREATE INDEX idx_contents_status ON public.contents(status);
CREATE INDEX idx_ads_product_id ON public.ads(product_id);
CREATE INDEX idx_ads_month ON public.ads(month);
CREATE INDEX idx_sales_product_id ON public.sales(product_id);
