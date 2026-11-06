# รายงานการตรวจสอบโปรเจกต์ Nexo PMS

**วันที่ตรวจสอบ**: 2026-11-06  
**ผู้ตรวจสอบ**: Principal Engineer / Security Reviewer  
**โปรเจกต์**: Nexo PMS (Next.js 16.4.5 + Supabase)

---

## 1. ภาพรวมโปรเจกต์

- **สแต็ก**: Next.js 16.4.5, React 19.3.0, Supabase (@supabase/ssr ^0.12.7, @supabase/supabase-js ^2.119.0), Tailwind 4, TypeScript 5, lucide-react 1.68.0
- **การเดploy**: Vercel
- **โครงสร้างโฟลเดอร์**:
  - `app/` — root layout + `(app)/` route group: dashboard, contents, products, ads, sales, my-tasks, team, login, pending
  - `components/` — 15 components (Dashboard, MyTasks, Contents, Team, Sidebar, InlinePersonPicker, ProfilePicker, SearchInput, KPICard, Loading, Modal, TableState, Toast, EmptyState)
  - `lib/` — supabase.ts, profile-context.tsx
  - `src/types/database.ts` — generated DB types (Postgrest 14.18)
  - `supabase/migrations/` — 10 migration files
  - `.env.local` — Contains `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `VERCEL_OIDC_TOKEN` JWT

## 2. ความเสี่ยงด้านความปลอดภัยสูง

### 2.1 ข้อมูลรับเข้าระบบแบบHardcoded (วิพากษ์ร้าย)
- **ไฟล์**: `app/login/page.tsx:19-20`
- **ปัญหา**: ใส่คำcredentialsเดาไว้ล่วงหน้า `admin@nexo.dev` / `nexo1234` และปุ่มทดสอบบัญชีทดสอบหลายบัญชี
- **ผลกระทบ**: ใครก็ตามที่เข้าถึงไฟล์นี้หรือดู source code สามารถล็อกอินเข้าระบบได้ทันทีโดยไม่ต้องมีสิทธิ์จริง
- **คำแนะนำ**: ลบ hardcoded credentials ทันที ใช้ระบบยืนยันตัวตนที่แท้จริง

### 2.2 ไฟล์ `.env.local` ถูก Commit (วิพากษ์ร้าย)
- **ไฟล์**: `.env.local`
- **ข้อมูลที่เปิดเผย**: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `VERCEL_OIDC_TOKEN` (JWT token จริงของ Vercel)
- **ผลกระทบ**: ข้อมูลรับเข้าคีย์ความลับถูกเก็บใน Git ซึ่งเป็นการละเมิดความปลอดภัยอย่างร้ายแรง หาก repo ถูกเปิดเผยข้อมูลรับเข้าจะสามารถแอบแทนตัวตนได้
- **คำแนะนำ**: เพิ่ม `.env.local` เข้าไปใน `.gitignore` ทันที และสร้าง `.env.example` ที่มีแค่ตัวอย่าง (ไม่มีค่าจริง)

## 3. โครงสร้างข้อมูลและ Schema

### 3.1 การเลื่อนตัวของ Schema (Schema Drift)
คอลัมน์/ฟิลด์ที่ใช้ใน Code แต่ **ไม่อยู่ในไฟล์ Migration เลย** (พบอ้างอิงในส่วนประกอบแต่ไม่มีใน DB Schema):

| ฟิลด์ | ใช้ที่ไหน | มีใน Migration |
|---|---|---|
| `acknowledged_at` | MyTasks.tsx:97, Contents.tsx:423, MyTasks.tsx:119 | **ไม่มี** |
| `acknowledged_by` | MyTasks.tsx:120, Contents.tsx:265 | **ไม่มี** |
| `content_assignment_log` table | MyTasks.tsx:64-66, logAssignment fn:156-163 | **ไม่มี** (0 migration files) |
| `owner_id` products | Migration 20261105052318:70 ใช้ แต่ Products UI เรียก `p.owner_id` (Dashboard.tsx:696) | มี (partial) |
| `product_briefs` | `lib/profile-context.tsx:34`, `src/types/database.ts` | มีใน schema แต่ **ไม่มี UI/route/query เลย** (สมมติ #2 ยืนยันแล้ว) |

### 3.2 ฟิลด์ขาดหายใน UI (แต่มีใน Schema)
ฟิลด์เหล่านี้ถูกกำหนดใน `20261105023802_nexo_core_schema.sql` แต่ **ไม่มีการใช้ใน UI/logic**:

- `cta`, `message`, `file_link`, `file_reference`, `poster`, `scheduled_post_date`, `actual_post_date`, `post_link`, `issues`, `actual_submit_date`

### 3.3 ตัวอย่างข้อมูล seed มีครบ แต่ Migration บางส่วนขาด
- `20261105023848_nexo_triggers_seed.sql` มี seed data ครบ (products, sales, ads, contents, profiles)
- แต่ฟิลด์ `brand_access`, `approval_status`, `approved_by`, `approved_at` เพิ่มใน migration ต่อมาแล้ว

## 4. ระบบควบคุมการเข้าถึง (Access Control)

### 4.1 RLS Policies - Evolution
Migration files แสดงการพัฒนาระบบ RLS จาก simple policies สู่ insurance approval_status:

1. **20261105023816_nexo_rls_policies.sql** — เริ่มต้น: policies ทั้งหมดใช้ `USING (true)` (เปิดให้ทุก authenticated เข้าถึง) พร้อม check position role ง่ายๆ

2. **20261105052957_update_rls_for_approval_via_alter.sql** — อัปเกรด: เพิ่ม `approval_status = 'approved'` เข้าทุก policy ทั้ง select/insert/update/delete ทั้ง tables (profiles, products, product_briefs, contents, ads, sales)

3. **20261105062637_fix_profiles_select_policy_self_join_loop.sql** — แก้ไข: policy "Users can view all profiles" ใช้ self-join บน profiles table เอง ทำให้เกิด RLS recursion infinite → เปลี่ยนมา join ผ่าน `auth.users` แทน

4. **20261106_fix_editor_brand_access_rls.sql** — ปรับปรุง: แยก policies ออกเป็น 2 ระดับสำหรับ products/contents/product_briefs:
   - "Viewer can view all products" → ผู้ชมเห็นทุกอย่าง (ไม่มีฟิลเตอร์แบรนด์)
   - "Editor sees own brand products" → คัดเลือกเฉพาะสินค้าที่ brand_access 包含
   - **พฤติกรรมหลัง migration**: editor ที่ brand_access ว่าง `{}` มองเห็น 0 product (เจตนาตามที่ออกแบบ)

### 4.2 ช่องโหว่ RLS ที่ยังคงเหลือ
- **Products**: Policy "Viewer and editor can view all products" (ก่อน migration 20261106) ใช้ `OR` รวม admin/manager/editor/viewer → อาจ override policy เฉพาะ editor Brand filtering เดิม
- **Contents/Product Briefs**: SELECT policies ยังคงขึ้นกับ `role IN ('admin','manager','editor','viewer')` โดยไม่ได้ตรวจสอบ `brand_access` ของ editor ในทุกกรณี (ขึ้นอยู่กับการ join กับ products)
- **Insert/Update/Delete**: ยังคงจำกัดแค่ role อีกครั้ง (admin/manager/editor) แต่ **ไม่มีการตรวจสอบ brand_access** ของ editor ในการ insert/update

### 4.3 การป้องกันฟิลด์ Profile
- **20261105052318_add_approval_status_and_profile_links.sql** เพิ่ม trigger `protect_profile_fields()` ห้าม non-admin แก้ไข role/approval_status/approved_by/approved_at
- **20261105053017_revoke_execute_on_trigger_functions.sql** 撤销 EXECUTE ให้ anon/authenticated ไม่เรียก trigger functions ได้โดยตรง (ดีมาก)

### 4.4 brand_access ไม่สมบูรณ์ใน UI
- **Team.tsx** มีการ UI สำหรับกำหนด brand_access แต่ **ไม่มีการตรวจสอบบนฝั่ง RLS** ให้บังคับจนกว่าจะ migration 20261106 ฟิก (ซึ่งเปลี่ยน policy แบบ split แล้ว)
- **Editor with empty brand_access** → มองเห็นข้อมูล 0 รายการ (เจตนาตามที่ออกแบบแล้วหลัง migration)

### 4.5 Login เบิร์ดแคร็ก
- ใช้ `supabase.auth.signInWithPassword` kèm credential แบบ hardcoded
- ไม่มี multi-factor authentication (MFA) ตั้งค่า
- เซสชันไม่มีการจำกัดอุปกรณ์/IP

## 5. ปัญหาที่พบ (Findings)

| # | หัวข้อ | ความรุนแรง | เส้นทาง (path:line) | สถานะ |
|---|---|---|---|---|
| F1 | Credentials hardcoded ใน login page | 🔴 วิพากษ์ร้าย | `app/login/page.tsx:19-20` | ยืนยัน |
| F2 | .env.local committed kèm VERCEL_OIDC_TOKEN | 🔴 วิพากษ์ร้าย | `.env.local` (not gitignored) | ยืนยัน |
| F3 | `content_assignment_log` table ไม่มีใน Migration 0 files | 🔴 วิพากษ์ร้าย | ใช้ที่ `MyTasks.tsx:64-66`, `Contents.tsx:156-163` | ยืนยันไม่ได้ (ต้องตรวจสอบ DB) |
| F4 | `acknowledged_at` / `acknowledged_by` ใช้ใน code แต่ไม่อยู่ใน Schema | 🔴 วิพากษ์ร้าย | `MyTasks.tsx:97-98`, `Contents.tsx:423,265` | ยืนยันไม่ได้ |
| F5 | RLS policies เริ่มต้นใช้ `USING (true)` — ทุกคนเห็นทุกอย่าง | 🔟 สูง | `20261105023816_nexo_rls_policies.sql:2-4` | ยืนยัน |
| F6 | Editor brand_access ฟิลด์มีอยู่ แต่ policy เริ่มต้น override กัน | 🟠 สูง | `20261105023816:8-9`, `20261106_fix_editor_brand_access_rls.sql:26-39` | ยืนยัน |
| F7 | product_briefs มีใน schema แต่ **ไม่มี UI/route/query เลย** | 🟡 ปานกลาง | `lib/profile-context.tsx:34`, `src/types/database.ts` | ยืนยัน |
| F8 | ฟิลด์ contents หลายรายการ (cta, message, file_link, ฯลฯ) มีใน Schema แต่ไม่ได้ใช้ใน UI | 🟡 ปานกลาง | `20261105023802:56-63` | ยืนยัน |
| F9 | ไม่มี test script ใน package.json | 🟢 ต่ำ | `package.json` | ยืนยัน |
| F10 | Login ใช้ credential แบบ hardcoded + ไม่มี MFA | 🔴 วิพากษ์ร้าย | `app/login/page.tsx:19-20` | ยืนยัน |

## 6. ข้อเสนอแนะ (Recommendations)

### 6.1 ข้อเสนอฉุกเฉิน (ทันที)
1. **ลบ `.env.local` ออกจาก Git** และเพิ่มเข้า `.gitignore` ทันที
2. **ลบ hardcoded credentials** ออกจาก `app/login/page.tsx` ทั้ง 2 บรรทัด
3. **สร้างบัญชีผู้ดูแลจริง** ผ่านอินเตอร์เฟซของ Supabase Auth แทนการใช้ credential เดา

### 6.2 ข้อเสนอระดับกลาง (สัปดาห์นี้)
1. **ปรับ RLS policies ให้แน่ชัด**:
   - products: ยกเลิก "Viewer and editor can view all products" ที่ใช้ OR รวม role ทั้งหมด แทนให้มีแค่ "Viewer can view all products" (อ่านอย่างเดียว ไม่มี brand filter) + "Editor sees own brand products" (คัดเลือกโดย brand_access)
   - contents / product_briefs: ใช้รูปแบบเดียวกัน — แยกเป็น "Admin/manager/viewer see all" vs "Editor sees own brand" โดยต้อง ensure join กับ products ถูกต้อง
2. **ตรวจสอบ DB by direct SQL** เพื่อยืนยันคอลัมน์ใดมีจริง และคอลัมน์ใดไม่มี (ฟindings F3, F4)
3. **รัน `supabase gen types typescript --project-id ...`** ใหม่ให้ types สอดคล้องกับ DB สถานะจริง

### 6.3 ข้อเสนอระดับสูง (ไตรมาสนี้)
1. **นำเอาตัวจัดการสิทธิ์ (RBAC/ABAC) ที่แท้จริง** มาใช้แทนการพึ่งพา `brand_access` array + RLS policies เพียงอย่างเดียว
2. **นำระบบ MFA เข้ามาใช้** สำหรับทุกบทบาทผู้ใช้
3. **เพิ่มการทดสอบความปลอดภัย (security testing)** เข้าไปใน CI/CD ถ้ามี
4. **แยกใช้ Service Role Key** เฉพาะบน server-side (API routes) เท่านั้น แจไม่เคยส่งไปฝั่ง client

### 6.4 ข้อเสนอโครงสร้าง (Architecture)
1. ย้ายข้อมูล `content_assignment_log` ไปอยู่ใน migration ที่ถูกต้อง หรือลบออกหากไม่จำเป็น (ส่งผลต่อ MyTasks.tsx กับ Contents.tsx)
2. ตัดหรือใช้ฟิลด์ `acknowledged_at/by` ให้สอดคล้องกับ schema จริง (เพิ่มลง migration หรือปรับ code ให้สอดคล้อง)
3. ตัด "product_briefs" ออกหากไม่ได้ใช้ หรือสร้าง UI/route ให้ครบถ้วน
4. พิจารณาใช้ `supabase-edge-functions` หรือ `supabase-admin` สำหรับ operations ที่ซับซ้อนแทนการพึ่งพา RLS เพียงอย่างเดียว

---

**สรุป**: โปรเจกต์ Nexo PMS มีความเสี่ยงสูงจากการเก็บ credential แบ่งปิดและ `.env.local` ที่ถูก commit รวมถึงโครงสร้าง RLS ที่เริ่มต้นไม่แน่นอนและมีการเลื่อนตัวของ schema ระหว่าง migration กับ code ใช้งาน หากปรับปรุงข้อเสนอแนะข้อที่ 6.1 ขึ้นทันที และข้อ 6.2 ภายในสัปดาห์นี้จะช่วยลดความเสี่ยงลงได้อย่างมีนัยสำคัญ