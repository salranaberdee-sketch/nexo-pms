# Nexo PMS — เอกสารส่งมอบโปรเจกต์ (Handover Document)

> สร้างจากโค้ดจริง ณ วันที่ 9 พฤศจิกายน 2026  
> ทุกข้อมูลมาจากไฟล์โปรเจกต์โดยตรง — ไม่มีการเดา

---

## 1. ภาพรวมโปรเจกต์

**ชื่อ:** Nexo PMS (Product Management System)

**วัตถุประสงค์:** ระบบ internal สำหรับทีมการตลาด/ผลิตภัณฑ์ เพื่อจัดการ workflow ตั้งแต่ต้นน้ำถึงปลายน้ำในที่เดียว ครอบคลุม:

1. **Products** — ลงทะเบียนสินค้า/บริการและติดตามสถานะ
2. **Contents** — pipeline การผลิต content (มอบหมาย → ผลิต → อนุมัติ → โพสต์)
3. **Ads** — บันทึกและติดตามแคมเปญโฆษณา (budget, reach, leads, CPL, ROAS)
4. **Sales** — เปรียบเทียบยอดขายจริงกับเป้า
5. **Dashboard** — KPI summary + Team Workload + งานของฉัน
6. **Team** — จัดการสมาชิกและสิทธิ์ (admin เท่านั้น)

**ผู้ใช้งานหลัก:** ทีมการตลาด/ผลิตภัณฑ์ภายในองค์กร — ต้อง login และได้รับการอนุมัติก่อนเข้าใช้ (ไม่มี public access)

**ธุรกิจ/สินค้าที่เกี่ยวข้อง (seed data):**
- `MED-PSY-001` — คอร์สจิตวิทยาในโรงเรียน (brand: medFTU)
- `REB-KET-001` — ผลิตภัณฑ์สนับสนุนการฟื้นฟู (brand: DEBORN / REBORN)
- `CLN-CIR-001` — บริการขลิบไร้เลือด (brand: คลินิกหมอหมาด)
- `REB-REH-001` — ศูนย์บำบัดรีบอร์น (brand: REBORN)

---

## 2. Tech Stack

### Frontend / Backend / Database

| Layer | เทคโนโลยี | เวอร์ชัน | หมายเหตุ |
|---|---|---|---|
| Framework | Next.js | **16.4.5** | App Router, Turbopack, React Compiler เปิด |
| UI Library | React | **19.3.0** | |
| Styling | Tailwind CSS | **^4** | ใช้ผ่าน `@tailwindcss/turbopack` loader |
| Language | TypeScript | **^5** | Strict mode |
| Database + Auth | Supabase (PostgreSQL 17) | `@supabase/ssr ^0.12.7` | RLS, Auth built-in |
| Icons | ไม่มี — ใช้ inline SVG ทั้งหมด | — | `lucide-react` ติดตั้งแล้วแต่**ไม่ได้ใช้งาน** |

### Next.js config พิเศษ (next.config.ts)
- `cacheComponents: true`
- `partialPrefetching: true`
- `reactCompiler: true` (experimental)

### Hosting / Deployment / CI/CD

| ส่วน | รายละเอียด |
|---|---|
| Hosting | Vercel |
| Vercel Project ID | `prj_PpE5QHOPIwNUymNEwgx13TYa9gKD` |
| Production URL | `https://nexo-three-cyan.vercel.app` |
| CI/CD | Push ไป `main` → Vercel auto-deploy |
| Database | Supabase hosted (project ref: `plbiokygjkohoaucdxpo`) |
| Supabase Org | `anwbdxpjlocvyjqpqqvy` (deeclub) |

**กฎเหล็กของโปรเจกต์:**
- ห้ามรัน `supabase` CLI หรือ `npx tsc` บน local — ทุก DDL ผ่าน Supabase MCP เท่านั้น
- ห้ามเขียน `.sql` ไฟล์เองหรือรัน migration ผ่าน terminal
- Production Supabase คือ source of truth เพียงแห่งเดียว

---

## 3. โครงสร้างโปรเจกต์

```
nexo/
├── app/                          # Next.js App Router
│   ├── (app)/                    # Route group (requires auth + approval)
│   │   ├── layout.tsx            # 🔑 Auth guard + ProfileProvider + Sidebar
│   │   ├── dashboard/page.tsx    # KPI dashboard page
│   │   ├── products/page.tsx     # Products page
│   │   ├── contents/page.tsx     # Contents page
│   │   ├── ads/page.tsx          # Ads page
│   │   ├── sales/page.tsx        # Sales page
│   │   ├── my-tasks/page.tsx     # งานของฉัน page
│   │   └── team/page.tsx         # Team management (admin only)
│   ├── login/page.tsx            # Login + Register form
│   ├── pending/page.tsx          # หน้ารออนุมัติ (polls every 30s)
│   ├── page.tsx                  # redirect('/dashboard')
│   ├── layout.tsx                # Root layout (metadata, body)
│   └── globals.css               # Global styles (Tailwind v4)
│
├── components/                   # Feature components (1 component = 1 page)
│   ├── Dashboard.tsx             # KPI + Team Workload + งานของฉัน
│   ├── Products.tsx              # Products CRUD
│   ├── Contents.tsx              # Content pipeline CRUD + assignment log
│   ├── Ads.tsx                   # Ads CRUD + metrics
│   ├── Sales.tsx                 # Sales CRUD + progress tracking
│   ├── Team.tsx                  # User management (admin only)
│   ├── MyTasks.tsx               # Personal task list
│   ├── Sidebar.tsx               # Navigation + badges + user info
│   ├── ProfilePicker.tsx         # <select> dropdown for profile selection
│   ├── InlinePersonPicker.tsx    # Table-cell assignee chip with dropdown
│   ├── CategoryManager.tsx       # CRUD + drag-reorder for `categories` table
│   ├── Modal.tsx                 # Reusable modal + Field + ConfirmModal
│   ├── StatusSelect.tsx          # Colored badge-style <select>
│   ├── Toast.tsx                 # Global event-bus toast notification
│   ├── TableState.tsx            # TableSkeleton + EmptyState + todayStr()
│   └── SearchInput.tsx           # Search field with clear button
│
├── lib/
│   ├── supabase.ts               # 🔑 Singleton Supabase browser client
│   └── profile-context.tsx       # 🔑 ProfileContext + useCan() + PERMISSION_MATRIX
│
├── src/types/
│   └── database.ts               # TypeScript types (generated จาก Supabase MCP)
│
└── supabase/migrations/          # Migration history (reference only — ห้ามรันเอง)
```

**Entry point สำคัญ:**
- `app/page.tsx` → redirect ไป `/dashboard` ทันที
- `app/(app)/layout.tsx` → auth guard ของทั้ง app
- `lib/supabase.ts` → singleton client ที่ทุก component ต้องใช้
- `lib/profile-context.tsx` → permission system ฝั่ง client

**Page components** (`app/(app)/*/page.tsx`) ทุกไฟล์เป็นแค่ wrapper ที่ import component จาก `components/` เท่านั้น — logic ทั้งหมดอยู่ใน `components/`

---

## 4. ฐานข้อมูล

### ตารางทั้งหมดและ Schema

**`profiles`** (extends `auth.users`)
```
id              UUID PK → auth.users (CASCADE DELETE)
name            TEXT NOT NULL
email           TEXT NOT NULL
role            TEXT CHECK(admin|manager|editor|viewer) DEFAULT 'viewer'
brand_access    TEXT[] DEFAULT '{}'    -- สำหรับ editor: brands ที่มีสิทธิ์เข้าถึง
approval_status TEXT CHECK(pending|approved|rejected) DEFAULT 'pending'
approved_by     UUID → profiles(id)
approved_at     TIMESTAMPTZ
created_at, updated_at TIMESTAMPTZ
```

**`products`**
```
id              BIGSERIAL PK
product_id      TEXT UNIQUE NOT NULL    -- format: XXX-YYY-NNN เช่น MED-PSY-001
name            TEXT NOT NULL
business_type   TEXT                    -- เช่น "การศึกษา", "สุขภาพ"
product_type    TEXT                    -- เช่น "หลักสูตร", "สินค้า", "บริการ"
brand           TEXT
owner           TEXT                    -- ชื่อสำหรับ display
owner_id        UUID → profiles(id)     -- FK สำหรับ KPI/assignment
start_date      DATE
status          TEXT CHECK(กำลังพัฒนา|เตรียมเปิดตัว|เปิดขาย|หยุดขาย)
notes           TEXT DEFAULT ''
created_by      UUID → profiles(id)
created_at, updated_at TIMESTAMPTZ
```

**`contents`**
```
id                  BIGSERIAL PK
product_id          TEXT → products(product_id) CASCADE DELETE
seq                 INTEGER NOT NULL    -- ลำดับ (ไม่มี UNIQUE constraint — ระวัง!)
type                TEXT CHECK(GRAPHIC|VIDEO|COPY)
title               TEXT NOT NULL
objective, channel, hook, message, cta, format_size, file_reference TEXT
assigned_to         TEXT               -- display name
assigned_to_id      UUID → profiles(id)
producer            TEXT
producer_id         UUID → profiles(id)
assigned_date, deadline, actual_submit_date DATE
status              TEXT CHECK(รอผลิต|ผลิตอยู่|รออนุมัติ|อนุมัติแล้ว|กำหนดโพสต์|โพสต์แล้ว)
file_link, approver TEXT
approver_id         UUID → profiles(id)
approved_at         DATE
poster              TEXT
poster_id           UUID → profiles(id)
scheduled_post_date, actual_post_date DATE
post_link, issues   TEXT
acknowledged_at     TIMESTAMPTZ        -- เพิ่มใน migration 20261105052318
acknowledged_by     TEXT               -- เพิ่มใน migration ที่ไม่มีใน local files
created_at, updated_at TIMESTAMPTZ
```

**`ads`**
```
id                BIGSERIAL PK
product_id        TEXT → products(product_id) CASCADE DELETE
month             TEXT NOT NULL          -- เช่น "2026-11"
budget_approved   NUMERIC DEFAULT 0
budget_adjustment NUMERIC DEFAULT 0
budget_total      GENERATED = budget_approved + budget_adjustment  ← ห้าม INSERT/UPDATE
campaign_name     TEXT NOT NULL
channel           TEXT DEFAULT 'Facebook'
content_ref       TEXT
managed_by        TEXT
managed_by_id     UUID → profiles(id)
start_date, end_date DATE
budget_allocated  NUMERIC DEFAULT 0
budget_spent      NUMERIC DEFAULT 0
budget_remaining  GENERATED = budget_allocated - budget_spent  ← ห้าม INSERT/UPDATE
reach, clicks, leads INTEGER DEFAULT 0
cpl               GENERATED = budget_spent/leads (0 if leads=0)  ← ห้าม INSERT/UPDATE
sales_amount      NUMERIC DEFAULT 0
roas              GENERATED = sales_amount/budget_spent (0 if spent=0)  ← ห้าม INSERT/UPDATE
result_notes, next_action TEXT
created_at, updated_at TIMESTAMPTZ
```

⚠️ **4 generated columns ใน `ads`** — ห้ามส่งค่าจาก frontend เด็ดขาด: `budget_total`, `budget_remaining`, `cpl`, `roas`

**`sales`**
```
id                  BIGSERIAL PK
product_id          TEXT → products(product_id) CASCADE DELETE
period_start        DATE NOT NULL
period_end          DATE NOT NULL
sales_target_amount NUMERIC DEFAULT 0
sales_target_count  INTEGER DEFAULT 0
actual_sales        NUMERIC DEFAULT 0
actual_received     NUMERIC DEFAULT 0
status              TEXT CHECK(ยังไม่เริ่ม|กำลังขาย|ปิดเป้า|ยังไม่เปิดขาย)
UNIQUE(product_id, period_start)
created_at, updated_at TIMESTAMPTZ
```

**`product_briefs`**
```
id              BIGSERIAL PK
product_id      TEXT → products(product_id) CASCADE DELETE
brief_type      TEXT CHECK(A|B)    -- A=คอร์ส/อบรม, B=สินค้า/บริการ
[25+ TEXT fields สำหรับ brief content]
UNIQUE(product_id, brief_type)
created_at, updated_at TIMESTAMPTZ
```

**`categories`** ⚠️ ไม่มี local migration file — อยู่ใน production DB เท่านั้น
```
id          BIGSERIAL PK
name        TEXT
sort_order  INTEGER
```

**`content_assignment_log`** ⚠️ ไม่มี local migration file — อยู่ใน production DB เท่านั้น
```
content_id        BIGINT → contents(id)
role              TEXT    -- 'assigned_to' | 'producer' | 'approver'
assigned_to_id    UUID
assigned_to_name  TEXT
assigned_by_id    UUID
assigned_by_name  TEXT
assigned_at       TIMESTAMPTZ
```

### Cascade Delete Chain
```
products → product_briefs   (CASCADE DELETE)
products → contents          (CASCADE DELETE)
products → ads               (CASCADE DELETE)
products → sales             (CASCADE DELETE)
```
⚠️ ลบ product = ลบทุกอย่างที่อ้างอิงทันที — UI ต้องแสดง warning ก่อน

### Indexes ที่มี
```
profiles(approval_status)
products(brand), products(status), products(owner_id)
contents(product_id), contents(status), contents(assigned_to_id),
contents(producer_id), contents(approver_id), contents(poster_id)
ads(product_id), ads(month), ads(managed_by_id)
sales(product_id)
```

### Triggers
| Trigger | Table | หน้าที่ |
|---|---|---|
| `on_auth_user_created` | auth.users | เรียก `handle_new_user()` → INSERT profile (role='viewer', approval_status='pending') |
| `protect_profile_fields` | profiles (BEFORE UPDATE) | ป้องกัน non-admin เปลี่ยน role/approval_status/approved_by/approved_at |
| `set_*_updated_at` | products, product_briefs, contents, ads, sales | อัปเดต `updated_at = NOW()` อัตโนมัติ |

### Migrations ที่รันแล้วใน Production (10 ไฟล์)

| ไฟล์ | สิ่งที่ทำ |
|---|---|
| `20261105023802_nexo_core_schema.sql` | สร้างตาราง 5 ตารางหลัก + indexes |
| `20261105023816_nexo_rls_policies.sql` | สร้าง RLS policies เริ่มต้น |
| `20261105023848_nexo_triggers_seed.sql` | Triggers + seed data (4 products, 4 sales, 3 ads) |
| `20261105040630_add_viewer_select_policy_to_products.sql` | เพิ่ม policy ให้ viewer/editor เห็น products ได้ |
| `20261105040649_seed_contents_data.sql` | Seed contents 13 rows |
| `20261105052318_add_approval_status_and_profile_links.sql` | เพิ่ม approval_status + FK columns (_id) ทุก table + trigger protect_profile_fields |
| `20261105052957_update_rls_for_approval_via_alter.sql` | อัปเดต RLS ทุก policy ให้เช็ค approval_status='approved' |
| `20261105053017_revoke_execute_on_trigger_functions.sql` | Revoke EXECUTE บน trigger functions จาก anon/authenticated |
| `20261105062637_fix_profiles_select_policy_self_join_loop.sql` | แก้ infinite RLS recursion บน profiles SELECT |
| `20261106_fix_editor_brand_access_rls.sql` | แก้ editor brand_access bypass — split policies สำหรับ products/contents/product_briefs |

⚠️ Migration สำหรับ `categories` และ `content_assignment_log` **ไม่มีใน local repository** แต่ทั้งสองตารางมีอยู่ใน production DB และถูกใช้งานอยู่

### ตัวอย่างข้อมูล Seed

**products:**
| product_id | name | business_type | brand | status |
|---|---|---|---|---|
| MED-PSY-001 | คอร์สจิตวิทยาในโรงเรียน | การศึกษา | medFTU | เตรียมเปิดตัว |
| REB-KET-001 | ผลิตภัณฑ์สนับสนุนการฟื้นฟู | สุขภาพ | DEBORN / REBORN | กำลังพัฒนา |
| CLN-CIR-001 | บริการขลิบไร้เลือด | คลินิก | คลินิกหมอหมาด | เปิดขาย |
| REB-REH-001 | ศูนย์บำบัดรีบอร์น | ศูนย์ฟื้นฟู | REBORN | เปิดขาย |

**sales (period: 2026-11):**
| product_id | sales_target_amount | actual_sales | status |
|---|---|---|---|
| MED-PSY-001 | 300,000 | 20,000 | ยังไม่เริ่ม |
| REB-KET-001 | 0 | 0 | ยังไม่เปิดขาย |
| CLN-CIR-001 | 500,000 | 5,000 | ยังไม่เริ่ม |
| REB-REH-001 | 900,000 | 30,000 | ยังไม่เริ่ม |

**ads (2026-11):**
| product_id | campaign_name | budget_approved | budget_spent | leads |
|---|---|---|---|---|
| MED-PSY-001 | เปิดรับสมัครคอร์ส | 30,000 | 6,000 | 40 |
| CLN-CIR-001 | ให้ความรู้บริการขลิบ | 20,000 | 4,500 | 25 |
| REB-REH-001 | ให้ความรู้และปรึกษาศูนย์ | 40,000 | 10,000 | 32 |

---

## 5. ฟีเจอร์และสถานะ

| ฟีเจอร์ | สถานะ | ไฟล์หลัก | หมายเหตุ |
|---|---|---|---|
| Auth (email/password login + register) | ✅ เสร็จ | `app/login/page.tsx` | มี quick-fill buttons สำหรับ test accounts |
| User approval system (pending → approved) | ✅ เสร็จ | `app/pending/page.tsx`, `components/Team.tsx` | Polls ทุก 30s |
| Role system (admin/manager/editor/viewer) | ✅ เสร็จ | `lib/profile-context.tsx` | Client-side mirror of RLS |
| Products CRUD | ✅ เสร็จ | `components/Products.tsx` | Inline status + owner assignment |
| Contents CRUD + workflow pipeline | ✅ เสร็จ | `components/Contents.tsx` | 6 สถานะ, deadline coloring |
| Content assignment logging | ✅ เสร็จ | `components/Contents.tsx` | บันทึกทุก assignment change ใน `content_assignment_log` |
| Content acknowledgement ("รับงาน") | ✅ เสร็จ | `components/MyTasks.tsx` | Badge "ใหม่" + ปุ่มรับงาน |
| Ads CRUD + metrics (CPL, ROAS) | ✅ เสร็จ | `components/Ads.tsx` | Generated columns จาก DB |
| Sales CRUD + progress tracking | ✅ เสร็จ | `components/Sales.tsx` | Progress bar, gap, collection rate |
| Dashboard KPIs | ✅ เสร็จ | `components/Dashboard.tsx` | อ่านจาก 4 tables พร้อมกัน |
| Dashboard Team Workload | ✅ เสร็จ | `components/Dashboard.tsx` | Aggregate per person |
| Dashboard "งานของฉัน" | ✅ เสร็จ | `components/Dashboard.tsx` | Filter by current user ID |
| My Tasks page (/my-tasks) | ✅ เสร็จ | `components/MyTasks.tsx` | แยกกลุ่มงาน: ใหม่, เกิน deadline, รออนุมัติ |
| Team management (role + brand_access) | ✅ เสร็จ | `components/Team.tsx` | admin เท่านั้น |
| Category management (business_type) | ✅ เสร็จ | `components/CategoryManager.tsx` | Drag-and-drop reorder |
| Profile-linked assignment (FK บน contents/ads/products) | ✅ เสร็จ | `components/InlinePersonPicker.tsx` | เก็บทั้ง _id (FK) และ TEXT (display) |
| RLS brand_access enforcement สำหรับ editor | ✅ เสร็จ | migration `20261106` | editor ที่ brand_access={} เห็น 0 สินค้า |
| product_briefs UI | ❌ ยังไม่มี | — | ตาราง DB มีอยู่, 0 rows, ไม่มี component |
| Ad campaign pull จาก Meta/TikTok/Google/LINE | ❌ ยังไม่มี | — | ป้อนข้อมูลแบบ manual ทั้งหมด |
| Attribution (UTM, content_id, campaign_id, ad_id) | ❌ ยังไม่มี | — | `ads.content_ref` เป็นแค่ text ไม่ใช่ FK |
| Report export (PDF/CSV) | ❌ ยังไม่มี | — | |
| Alert / Notification system | ❌ ยังไม่มี | — | มีแค่ Toast + Sidebar badge |
| Realtime updates | ❌ ยังไม่มี | — | ทุกหน้าใช้ manual refresh / reload |
| Dark mode | ❌ ยังไม่มี | — | ไม่ได้อยู่ใน scope ปัจจุบัน |

---

## 6. API และการเชื่อมต่อภายนอก

### ไม่มี Custom API Routes
โปรเจกต์นี้ **ไม่มี** `app/api/` routes เลย — ทุก data operation ผ่าน Supabase client โดยตรงจาก browser (client components ทั้งหมด)

### External API ที่เชื่อมอยู่
| Service | สถานะ | หมายเหตุ |
|---|---|---|
| Supabase Auth | ✅ ทำงาน | Email/password only |
| Supabase Database (REST) | ✅ ทำงาน | ผ่าน `@supabase/ssr` browser client |
| Vercel | ✅ ทำงาน | Auto-deploy จาก GitHub `main` |
| Meta Ads API | ❌ ไม่มี | ป้อน manual |
| TikTok Ads API | ❌ ไม่มี | ป้อน manual |
| Google Ads API | ❌ ไม่มี | ป้อน manual |
| LINE API | ❌ ไม่มี | ป้อน manual |

### Webhooks
ไม่มี webhook ใดๆ ทั้งขาเข้าและขาออก

### Environment Variables ที่ต้องใช้

| Variable | ใช้ที่ | Required |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | `lib/supabase.ts` | ✅ |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | `lib/supabase.ts` | ✅ |

⚠️ ทั้งสองค่ามี prefix `NEXT_PUBLIC_` — ถูกเปิดเผยใน browser ซึ่งปลอดภัยเพราะ anon key ถูกควบคุมด้วย RLS  
ไม่มี service role key ใน codebase

---

## 7. วิธีรันโปรเจกต์

### ติดตั้งและรันบนเครื่อง

```bash
# 1. Clone โปรเจกต์
git clone <repo-url>
cd nexo

# 2. ติดตั้ง dependencies
npm install

# 3. สร้าง .env.local ในโฟลเดอร์ nexo/ และใส่:
# NEXT_PUBLIC_SUPABASE_URL=[ขอจากเจ้าของโปรเจกต์เดิม หรือดูใน Vercel project settings]
# NEXT_PUBLIC_SUPABASE_ANON_KEY=[ขอจากเจ้าของโปรเจกต์เดิม]

# 4. รัน dev server
npm run dev
# เปิดที่ http://localhost:3000
```

### Test accounts (dev)
| Email | Password | Role |
|---|---|---|
| admin@nexo.dev | nexo1234 | admin |
| manager@nexo.dev | nexo1234 | manager |
| editor@nexo.dev | nexo1234 | editor |
| viewer@nexo.dev | nexo1234 | viewer |

⚠️ Credentials เหล่านี้ hardcode อยู่ใน `app/login/page.tsx` เป็น quick-fill buttons — ต้องลบออกก่อน production จริง

### ไม่มี Test Suite
โปรเจกต์นี้ไม่มี test files เลย (`jest`, `vitest`, `playwright` ไม่ได้ติดตั้ง)

### Deploy

```bash
# Option 1: Push ไป GitHub → Vercel auto-deploy (แนะนำ)
git push origin main

# Option 2: Deploy manual
vercel deploy --prod --yes
```

**Post-deploy verification:**
```bash
# ตรวจว่า URL ตอบ 200
curl -s -o /dev/null -w "%{http_code}" https://nexo-three-cyan.vercel.app

# ถ้า 302 → SSO protection เปิดอยู่ (แก้ผ่าน Vercel API)
# ถ้า 404 → Vercel framework ไม่ใช่ nextjs (แก้ผ่าน Vercel API)
```

---

## 8. ปัญหาที่ค้างอยู่

### บั๊กที่รู้

**[Medium] `budget_adjustment` ไม่ถูก SELECT ใน `Ads.tsx` load()**
- ไฟล์: `components/Ads.tsx` — function `load()`
- ปัญหา: query หลักไม่ได้ SELECT `budget_adjustment`, `next_action`, `start_date`, `end_date`, `content_ref` — แต่ `openEdit()` อ่านค่าเหล่านี้จาก object ที่โหลดมา ทำให้ edit form แสดง `budget_adjustment = undefined` (render เป็น 0 แต่ค่าจริงในฐานข้อมูลอาจไม่ใช่ 0)
- วิธีแก้: เพิ่ม fields ที่ขาดใน SELECT ของ `load()`

**[Low] `Sales.tsx` updateStatus() ทำ setState ก่อน DB call**
- ไฟล์: `components/Sales.tsx` — function `updateStatus()`
- ปัญหา: ผิดจาก pattern ที่กำหนดไว้ (ต้อง call DB ก่อน setState เสมอ) มี rollback แต่ขัดกับ project convention
- วิธีแก้: swap ลำดับให้ await supabase ก่อน setState

### Technical Debt

| ปัญหา | ระดับ | ตำแหน่ง |
|---|---|---|
| State ทุกก้อนใน feature components typed เป็น `any[]` | Low | Products.tsx, Contents.tsx, Ads.tsx, Sales.tsx |
| `lucide-react` ติดตั้งแต่ไม่ได้ใช้ — ทุกที่ใช้ inline SVG | Low | package.json |
| Hardcoded test credentials ใน login page | ⚠️ ต้องแก้ก่อน production | `app/login/page.tsx` |
| Status style maps นิยามซ้ำกันใน Dashboard.tsx และ feature components | Low | Dashboard.tsx |
| `seq` ใน `contents` ไม่มี UNIQUE constraint ใน DB | Low risk | schema |
| `product_briefs` มี table แต่ไม่มี UI | Feature gap | — |
| Migration สำหรับ `categories` และ `content_assignment_log` ไม่อยู่ใน local repo | ⚠️ เสี่ยงถ้า rebuild | `supabase/migrations/` |
| Date range filter บน Sales กรอง `created_at` ไม่ใช่ `period_start/end` | UX | `components/Sales.tsx` |
| ไม่มี realtime — ต้อง reload หน้าเพื่อเห็นข้อมูลใหม่ | UX | ทุก feature component |
| `ads.content_ref` เป็น TEXT ไม่ใช่ FK → content title เปลี่ยนแล้วค่าไม่ตาม | Data integrity | `ads` table |

### ความเสี่ยงด้านความปลอดภัย

- **Test credentials hardcode** (`admin@nexo.dev / nexo1234`) ใน `app/login/page.tsx` — ต้องลบก่อน deploy ให้ผู้ใช้จริง
- ไม่มี rate limiting บน auth calls
- `protect_profile_fields` trigger ป้องกัน role/approval escalation แล้ว แต่ต้องตรวจสอบทุกครั้งที่แก้ RLS

---

## 9. การตัดสินใจเชิงออกแบบ

### สิ่งที่เลือกและเหตุผล

**Supabase + RLS เป็น source of truth:**
ใช้ Row Level Security แทนการเขียน API middleware เอง ทำให้ permission logic อยู่ที่ DB — frontend เป็นแค่ mirror สำหรับ UI gating

**Client components ทั้งหมด (ไม่มี Server Components):**
ทุกหน้าเป็น `'use client'` components ที่ fetch ข้อมูลเองผ่าน Supabase browser client — ไม่มี Server Actions หรือ Route Handlers เลย

**Singleton Supabase client (`lib/supabase.ts`):**
ใช้ module-level `_client` variable เพื่อป้องกัน client ใหม่สร้างทุก render ซึ่งจะทำให้ `useEffect` dependencies ไม่ stable

**`getSession()` แทน `getUser()` ใน layout.tsx:**
`getSession()` อ่านจาก local cookie (zero network) — Security ยังปลอดภัยเพราะ RLS validate JWT ทุก DB call

**เก็บทั้ง `_id` (UUID FK) และ TEXT (display name) สำหรับ assignment:**
เช่น `assigned_to TEXT` + `assigned_to_id UUID` — backward compatibility กับข้อมูลเก่าที่มีแค่ text และ display โดยไม่ต้อง JOIN เสมอ

**Toast ใช้ event-bus pattern (module-level `_listeners`):**
`showToast()` callable จากทุก component โดยไม่ต้องผ่าน context หรือ prop drilling

### สิ่งที่เคยลองแล้วไม่เวิร์ก

- **Self-join บน profiles RLS policy** → เกิด infinite recursion — แก้ใน migration `20261105062637` โดยเปลี่ยนเป็น JOIN ผ่าน `auth.users`
- **Policy "Viewer and editor can view all products"** → override policy "Editor sees own brand products" เพราะ RLS ใช้ OR logic ระหว่าง PERMISSIVE policies — แก้ใน migration `20261106` โดย split เป็น role-specific policies

---

## 10. ขั้นตอนถัดไป (เรียงตามความสำคัญ)

### ต้องทำก่อน production
1. **ลบ test credentials** ออกจาก `app/login/page.tsx` — ตอนนี้ admin credentials แสดงใน UI ชัดเจน
2. **เพิ่ม migration files สำหรับ `categories` และ `content_assignment_log`** — สองตารางนี้ไม่มีใน local repo ถ้า rebuild จาก scratch จะพัง

### ควรทำเร็ว
3. **แก้บั๊ก `budget_adjustment` ใน `Ads.tsx` load()** — เพิ่ม fields ที่ขาดใน SELECT
4. **แก้ Sales.tsx `updateStatus()` pattern** — swap ลำดับ DB call ก่อน setState
5. **สร้าง UI สำหรับ `product_briefs`** — table และ RLS พร้อมแล้ว ยังขาด component

### งานสำคัญถัดไป
6. **Ads API integration** — ดึงข้อมูล reach/clicks/leads/spend จาก Meta Ads API อัตโนมัติ แทนการป้อน manual
7. **Attribution tracking** — เปลี่ยน `ads.content_ref` จาก TEXT เป็น FK จริง + เพิ่ม UTM parameter tracking
8. **Realtime updates** — ใช้ Supabase Realtime subscription แทน manual refresh
9. **Typing ด้วย `Tables<'table_name'>[]`** — ลด `any[]` ใน state ทุก component

### สิ่งที่ยังต้องตัดสินใจ
- ขอบเขต product_briefs UI — read-only หรือ full CRUD? link กับ Contents workflow อย่างไร?
- จะ integrate Ads platform ไหนก่อน (Meta, TikTok, Google, LINE)?
- Content calendar view — ต้องการ calendar UI หรือแค่ list + deadline filter ที่มีอยู่พอแล้ว?
- จะเพิ่ม Lead tracking แยกตาราง หรือ aggregate จาก `ads.leads` เพียงพอ?

---

## 11. ไฟล์ที่สำคัญที่สุด 10 ไฟล์

| ไฟล์ | ทำไมสำคัญ |
|---|---|
| `lib/profile-context.tsx` | ระบบ role/permission ทั้งหมดอยู่ที่นี่ — `useCan()`, `PERMISSION_MATRIX`, `Profile` type — ทุก component อ้างอิง |
| `app/(app)/layout.tsx` | Auth guard กลางของทั้ง app — ควบคุม session, approval gate, และ ProfileProvider |
| `lib/supabase.ts` | Singleton client — ทุก component ต้อง import จากที่นี่เท่านั้น |
| `supabase/migrations/20261105023802_nexo_core_schema.sql` | Schema ต้นแบบของ 5 ตารางหลัก (ก่อน alter) |
| `supabase/migrations/20261105052318_add_approval_status_and_profile_links.sql` | Migration ใหญ่ที่สุด — เพิ่ม approval system + FK columns ทุก table + trigger protect_profile_fields |
| `supabase/migrations/20261106_fix_editor_brand_access_rls.sql` | แก้บั๊ก RLS สำคัญ — อ่านเพื่อเข้าใจ current state ของ editor permission |
| `components/Contents.tsx` | Component ที่ซับซ้อนที่สุด — content workflow, assignment log, acknowledgement system |
| `components/Dashboard.tsx` | อ่านข้อมูล 5 tables พร้อมกัน — KPI calculation logic ทั้งหมด |
| `src/types/database.ts` | TypeScript types ที่ generate จาก production DB — current source of truth สำหรับ schema |
| `app/login/page.tsx` | มี hardcoded test credentials — ต้องแก้ไขก่อน production |

---

## ข้อที่ไม่แน่ใจ (Self-Review)

ประเด็นที่ยืนยันไม่ได้ 100% จากไฟล์ที่อ่านได้:

1. **`categories` table schema ที่ครบ** — รู้แค่ `id`, `name`, `sort_order` จากโค้ด CategoryManager.tsx — ไม่ได้เห็น CREATE TABLE จริง
2. **`content_assignment_log` table schema ที่ครบ** — รู้ fields หลักจากโค้ดที่ query — อาจมี column อื่นที่ไม่ได้ถูก query
3. **`acknowledged_by` column type** — โค้ดเขียน `acknowledged_by: profile.name` (TEXT) แต่ไม่ได้เห็น ALTER TABLE ใน migration files ที่มีอยู่ใน local repo
4. **Seed contents 13 rows รายละเอียด** — migration `20261105040649_seed_contents_data.sql` มีอยู่แต่ไม่ได้อ่านเนื้อหา
5. **Production URL active หรือเปล่า** — `https://nexo-three-cyan.vercel.app` มาจาก config file ไม่ได้ verify live
