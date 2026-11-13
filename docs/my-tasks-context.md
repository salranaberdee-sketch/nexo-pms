# หน้า "งานของฉัน" (`/my-tasks`) — Context Document for AI

> เอกสารนี้อธิบายสถาปัตยกรรม, data flow, business logic, และ edge cases ของหน้า `/my-tasks`
> ใช้เป็น context สำหรับ AI ก่อนแก้ไข หรือต่อยอดหน้านี้

---

## 1. ไฟล์ที่เกี่ยวข้อง

| ไฟล์ | บทบาท |
|---|---|
| `components/MyTasks.tsx` | Main component — UI + data fetching + actions ทั้งหมด |
| `app/(app)/my-tasks/page.tsx` | Next.js page — wrapper บาง mount `<MyTasks />` เท่านั้น |
| `components/ContentAssets.tsx` | Sub-component แสดงไฟล์แนบของ content (lazy loaded) |
| `components/TableState.tsx` | Export `todayStr()` — วันที่วันนี้ในรูป `YYYY-MM-DD` |
| `components/Toast.tsx` | Export `showToast(msg, type?)` — แสดง toast notification |
| `lib/profile-context.tsx` | Export `useProfile()` — ดึง profile ของ user ที่ login อยู่ |
| `lib/status-styles.ts` | Export `contentStatusStyle` — Tailwind class map ต่อ status |
| `lib/supabase.ts` | Export `createClient()` — Supabase browser client |
| `src/types/database.ts` | TypeScript types ที่ generate จาก Supabase schema |

**กฎสำคัญ:** ห้ามสร้าง Supabase client ใหม่ — ใช้ `createClient()` จาก `lib/supabase.ts` เสมอ

---

## 2. Tech Stack

- **Framework:** Next.js 16, App Router, TypeScript
- **Styling:** Tailwind CSS v4
- **Backend:** Supabase (PostgreSQL + RLS)
- **Data fetching:** `useEffect` + `useState` ธรรมดา (ไม่มี TanStack Query / SWR)
- **Timezone:** Asia/Bangkok (วันที่เปรียบเทียบใช้ string `YYYY-MM-DD` ตรงๆ ไม่แปลง timezone)

---

## 3. Database Schema ที่เกี่ยวข้อง

### `contents` (ตารางหลัก)

```sql
id                  BIGSERIAL PRIMARY KEY
product_id          TEXT NOT NULL → products(product_id)
seq                 INTEGER
type                TEXT  -- 'GRAPHIC' | 'VIDEO' | 'COPY'
title               TEXT NOT NULL
objective           TEXT
hook                TEXT
format_size         TEXT
channel             TEXT DEFAULT 'Facebook'
file_link           TEXT          -- ลิงก์ไฟล์งานที่ผลิต
post_link           TEXT          -- ลิงก์โพสต์จริง
issues              TEXT          -- ข้อแก้ไขจาก approver
status              TEXT          -- ดู enum ด้านล่าง
deadline            DATE
scheduled_post_date DATE
actual_post_date    DATE
actual_submit_date  DATE
acknowledged_at     TIMESTAMPTZ   -- เวลาที่ producer รับรู้งาน
acknowledged_by     UUID → profiles(id)
assigned_date       DATE
producer            TEXT          -- ชื่อสำหรับ display
producer_id         UUID → profiles(id)
approver            TEXT
approver_id         UUID → profiles(id)
assigned_to         TEXT
assigned_to_id      UUID → profiles(id)
poster              TEXT
poster_id           UUID → profiles(id)
```

**Content Status Enum (ทุกค่าเป็นภาษาไทย — ตรงตัวอักษร):**
```
'รอผลิต'      → ยังไม่เริ่ม
'ผลิตอยู่'     → กำลังผลิต
'รออนุมัติ'   → ส่ง approver ตรวจ
'อนุมัติแล้ว' → ผ่านการอนุมัติ
'กำหนดโพสต์' → รอกำหนดวันโพสต์
'โพสต์แล้ว'  → เสร็จสิ้น (DONE_STATUS)
```

### `content_assignment_log`

```sql
id               BIGSERIAL PRIMARY KEY
content_id       BIGINT → contents(id)
role             TEXT  -- 'producer' | 'approver' | 'assigned_to'
assigned_to_id   UUID
assigned_to_name TEXT
assigned_by_id   UUID
assigned_by_name TEXT
assigned_at      TIMESTAMPTZ DEFAULT NOW()
```

บันทึกทุกครั้งที่มีการมอบหมาย producer / approver / assigned_to ใหม่
(`poster` ไม่ถูก log)

### `content_assets`

```sql
id           BIGSERIAL PRIMARY KEY
content_id   BIGINT → contents(id)
asset_type   TEXT  -- 'image' | 'video' | 'url' | 'file'
category     TEXT  -- 'work_order' | 'deliverable'
label        TEXT
url          TEXT
storage_path TEXT  -- path ใน Supabase Storage bucket 'content-assets'
file_size    BIGINT
mime_type    TEXT
sort_order   INTEGER
uploaded_by  UUID
created_at   TIMESTAMPTZ
```

### `products` (ดึงแค่ 3 fields)

```sql
product_id  TEXT PRIMARY KEY
name        TEXT
brand       TEXT
```

---

## 4. Role System (4 roles ต่อ content)

content 1 ชิ้นมีคน 4 บทบาท บทบาทอาจซ้ำกันในคนเดียวได้

| Role | Field ใน contents | หน้าที่ | Action ที่ทำได้ |
|---|---|---|---|
| `producer` | `producer_id` | ผู้ผลิตหลัก | รอผลิต→ผลิตอยู่→รออนุมัติ→กำหนดโพสต์→โพสต์แล้ว |
| `assigned_to` | `assigned_to_id` | ผู้รับผิดชอบ | รอผลิต→ผลิตอยู่→รออนุมัติ |
| `approver` | `approver_id` | ผู้อนุมัติ | อนุมัติ (รออนุมัติ→อนุมัติแล้ว) หรือ ส่งกลับแก้ไข (→ผลิตอยู่) |
| `poster` | `poster_id` | ผู้โพสต์ | กำหนดโพสต์→โพสต์แล้ว |

**กฎ deduplication ตอน buildTasks():**
- ถ้า `producer_id === me.id` → ไม่ใส่ `assigned_to` และ `poster` ให้คนเดียวกัน เพราะ producer จัดการ flow ทั้งหมดแทนอยู่แล้ว
- ถ้า user ถือหลาย role บน content เดียวกัน → content จะ **ปรากฏหลายแถว** โดยแต่ละแถวมี `myRole` ต่างกัน

**`canManage`** = `role === 'admin' || role === 'manager'`

---

## 5. Data Fetching

### Queries (ทำงานพร้อมกันด้วย `Promise.all`)

```typescript
// Q1: contents ที่ user เกี่ยวข้อง (ทุก role)
supabase.from('contents')
  .select([...all fields...])
  .or(`producer_id.eq.${me.id},approver_id.eq.${me.id},assigned_to_id.eq.${me.id},poster_id.eq.${me.id}`)

// Q2: contents ทั้งหมดที่ active (เฉพาะ canManage)
supabase.from('contents')
  .select([...all fields...])
  .in('status', ACTIVE_STATUSES)
// ถ้าไม่ใช่ canManage → resolve { data: [], error: null } ทันที

// Q3: products ทั้งหมด
supabase.from('products').select('product_id, name, brand')

// Q4: content_assignment_log ทั้งหมด (ไม่มี filter — ดู Known Issues)
supabase.from('content_assignment_log')
  .select('content_id, role, assigned_by_id, assigned_by_name, assigned_at')
  .order('assigned_at', { ascending: false })
```

### Sequential Query (หลัง Promise.all)

```typescript
// Q5: approved profiles สำหรับ ReassignPicker (เฉพาะ canManage)
supabase.from('profiles')
  .select('id, name, role')
  .eq('approval_status', 'approved')
  .order('name')
```

### Lazy Load (เมื่อ user กด expand row)

```typescript
// content_assets ของ content นั้น — cache ใน assetsMap: Record<number, ContentAsset[]>
supabase.from('content_assets')
  .select([...all fields...])
  .eq('content_id', contentId)
  .order('sort_order').order('created_at')
```

---

## 6. State Management

```typescript
tasks: MyTask[]         // contents ของ user คนนี้ (Mine tab)
teamTasks: MyTask[]     // contents ทั้งหมดที่ active (Team tab — canManage เท่านั้น)
profiles: ProfileOption[] // สำหรับ ReassignPicker
loading: boolean
loadError: string
activeTab: 'mine' | 'team'  // sync กับ URL ?tab=team
filterBrand: string     // 'all' หรือชื่อ brand
filterStatus: string    // 'all' หรือ status value
expandedId: string | null  // key รูป `${id}-${role}` หรือ `team-${id}-${role}`
actioning: string | null   // key รูป `${id}-{action}` ระหว่าง API call
assetsMap: Record<number, ContentAsset[]>  // lazy-loaded assets
```

**URL State:** `activeTab` sync กับ `?tab=team` ผ่าน `useSearchParams` + `router.replace()`

---

## 7. `MyTask` Type

```typescript
type MyTask = {
  id: number
  product_id: string
  product_name: string
  seq: number
  type: string            // 'GRAPHIC' | 'VIDEO' | 'COPY'
  title: string
  objective: string | null
  hook: string | null
  format_size: string | null
  channel: string
  file_link: string | null
  post_link: string | null
  issues: string | null
  status: string
  deadline: string | null
  scheduled_post_date: string | null
  actual_post_date: string | null
  actual_submit_date: string | null
  acknowledged_at: string | null  // ระดับ content (ไม่ใช่ per-role)
  assigned_date: string | null
  assigned_by: string         // ชื่อคนที่มอบหมาย (จาก assignment_log)
  assigned_by_id: string
  producer: string
  producer_id: string | null
  approver: string
  approver_id: string | null
  assigned_to: string
  assigned_to_id: string | null
  poster: string
  poster_id: string | null
  myRole: 'producer' | 'approver' | 'assigned_to' | 'poster'  // role ของ user สำหรับแถวนี้
  brand: string
}
```

---

## 8. Grouping Logic (Mine tab)

ใช้ **first-match-wins** — task จะอยู่ในกลุ่มแรกที่ตรงเงื่อนไข

```
Priority 1 — งานใหม่:        acknowledged_at = null AND status ≠ 'โพสต์แล้ว'
Priority 2 — รอฉันอนุมัติ:   myRole = 'approver' AND status = 'รออนุมัติ'
Priority 3 — ต้องโพสต์วันนี้: status = 'กำหนดโพสต์' AND scheduled_post_date <= TODAY
Priority 4 — เกิน Deadline:   deadline < TODAY AND status ≠ 'โพสต์แล้ว'
Priority 5 — กำลังดำเนินการ:  ทุกงานที่ active และไม่ตรงกลุ่มข้างบน
Priority 6 — เสร็จแล้ว:       status = 'โพสต์แล้ว'
```

**⚠️ Edge case:** งานใหม่ที่ overdue จะอยู่ใน Priority 1 (งานใหม่) ไม่ใช่ Priority 4 (เกิน Deadline) เพราะ first-match-wins — user ยังเห็น deadline badge บน row แต่ไม่ถูกจัดกลุ่มว่า overdue

---

## 9. Advance Status Flow

### Status Transitions ต่อ Role

```
NEXT_STATUS = {
  producer:    { รอผลิต→ผลิตอยู่, ผลิตอยู่→รออนุมัติ, อนุมัติแล้ว→กำหนดโพสต์, กำหนดโพสต์→โพสต์แล้ว }
  assigned_to: { รอผลิต→ผลิตอยู่, ผลิตอยู่→รออนุมัติ }
  approver:    { รออนุมัติ→อนุมัติแล้ว }
  poster:      { กำหนดโพสต์→โพสต์แล้ว }
}
```

### Extra Fields บังคับก่อน Advance

```
เปลี่ยนเป็น 'รออนุมัติ'   → ต้องมี file_link (ลิงก์ไฟล์งาน)
เปลี่ยนเป็น 'กำหนดโพสต์' → ต้องมี scheduled_post_date (วันที่จะโพสต์)
เปลี่ยนเป็น 'โพสต์แล้ว'  → ต้องมี post_link (ลิงก์โพสต์จริง)
```

Pattern: กดปุ่มครั้งแรก → เปิด inline form, กดครั้งสอง → submit จริง

### Auto-fill เมื่อ Advance

```
advance → 'โพสต์แล้ว'   → actual_post_date = today (ถ้ายังไม่มี)
advance → 'รออนุมัติ'   → actual_submit_date = today (ถ้ายังไม่มี)
advance ครั้งแรก         → acknowledged_at = now() (auto-acknowledge)
```

### Reject Flow (approver เท่านั้น)

```
กด "ส่งกลับแก้ไข" → เปิด textarea ให้ระบุ issues
กด "ส่งกลับ"      → supabase.update({ status: 'ผลิตอยู่', issues: text })
```

---

## 10. Optimistic Update Pattern

**ใช้รูปแบบ: DB ก่อน → setState ตาม response (ไม่ใช่ optimistic)**

```typescript
const { error } = await supabase.from('contents').update(payload).eq('id', task.id)
if (error) { showToast(error.message, 'error'); return }  // ไม่เปลี่ยน state
updateLocalTask(task.id, task.myRole, { ...payload })     // เปลี่ยน state หลัง DB สำเร็จ
```

### `updateLocalTask()` — Global vs Role-Scoped Fields

content เดียวกันอาจมีหลายแถวใน `tasks` (หลาย role) การ update ต้องแยก:

```
Global fields (อัปเดตทุกแถวของ content นั้น):
  status, actual_post_date, actual_submit_date, file_link, post_link,
  scheduled_post_date, issues, producer, producer_id, approver, approver_id,
  assigned_to, assigned_to_id, poster, poster_id

Role-scoped fields (อัปเดตเฉพาะแถวที่ myRole ตรง):
  acknowledged_at, myRole
```

ทั้ง `tasks` และ `teamTasks` ถูก patch พร้อมกันทุกครั้ง

---

## 11. Team Tab (canManage เท่านั้น)

แสดง contents ทั้งหมดที่ `status IN active_statuses` จัดกลุ่มตามผู้รับผิดชอบ

**การหา "responsible person" ต่อ content:**
```
priority: producer_id > assigned_to_id > approver_id > poster_id
```

**Deduplication:** ใช้ `Set<"personId:contentId">` ป้องกัน content ที่ user ถือหลาย role นับซ้ำในกลุ่มเดียวกัน

**Team tab TaskRow:** ส่ง `myRole="producer"` hardcode ทุกแถว เพราะ team tab เน้น reassign ไม่ใช่ advance status

**ReassignPicker:** dropdown เลือกจาก approved profiles ทั้งหมด มี "บันทึก" ปุ่มเมื่อค่าเปลี่ยน การ reassign producer จะ reset `acknowledged_at = null` เพื่อให้ producer ใหม่ต้องกด "รับงาน"

---

## 12. Summary Chips (ตัวเลขสรุปบนหน้า)

```
งานที่ยังทำอยู่  = unique content ids ที่ status ≠ 'โพสต์แล้ว'
งานใหม่รอรับ    = unique content ids ที่ acknowledged_at = null AND ไม่ done
รอฉันอนุมัติ    = แถวที่ myRole = 'approver' AND status = 'รออนุมัติ'
เกิน deadline   = unique content ids ที่ deadline < today AND ไม่ done
งานทั้งทีม      = unique content ids ใน teamTasks ที่ไม่ done (canManage เท่านั้น)
```

ใช้ `new Set(...map(t => t.id)).size` เพื่อ dedup content ที่ user ถือหลาย role

---

## 13. Known Issues / Edge Cases

| # | ปัญหา | ผลกระทบ | วิธีแก้ที่แนะนำ |
|---|---|---|---|
| 1 | `content_assignment_log` ดึงมาทั้งหมดไม่มี filter หรือ limit | ถ้า log มีหลายพัน rows จะ slow ขึ้นเรื่อยๆ | เพิ่ม `.in('content_id', myContentIds)` filter |
| 2 | `profiles` query อยู่นอก `Promise.all` (sequential) | ReassignPicker dropdown ว่างสักพักก่อน load ครบ | ย้ายเข้า `Promise.all` เป็น Q5 |
| 3 | `load()` ไม่ wrap ด้วย `useCallback` | สร้างใหม่ทุก render, `useEffect([me.id])` อาจ race | wrap `useCallback([me.id])` |
| 4 | งานใหม่ที่ overdue ไม่ถูกจัดกลุ่ม overdue | user อาจพลาดเห็น deadline สีแดงใน group | แสดง overdue badge พิเศษใน group "งานใหม่" |
| 5 | `actioning` ใช้ `startsWith(task.id)` — disable ทุกปุ่มของ content นั้น | ถ้า content id prefix เหมือนกัน (เช่น id=1 กับ id=10) อาจ block ผิด | ใช้ exact match หรือ `Set<string>` |
| 6 | `acknowledged_at` เก็บระดับ content ไม่ใช่ per-role | user ที่เป็นทั้ง producer และ approver: รับงานในฐานะ producer แล้ว approver badge "ใหม่" หาย | ถ้าต้องการ per-role ต้องเพิ่ม column ใหม่ใน DB |

---

## 14. Constants สำคัญ

```typescript
DONE_STATUS    = 'โพสต์แล้ว'
ACTIVE_STATUSES = ['รอผลิต', 'ผลิตอยู่', 'รออนุมัติ', 'อนุมัติแล้ว', 'กำหนดโพสต์']
ALL_STATUSES   = [...ACTIVE_STATUSES, DONE_STATUS]
```

---

## 15. Sub-components ใน MyTasks.tsx

| Component | ทำอะไร |
|---|---|
| `TaskRow` | แสดง 1 แถวของ task พร้อม expand panel, action buttons |
| `InlineFieldUpdate` | inline edit ลิงก์ไฟล์งาน — click to edit, Enter/Escape |
| `ReassignPicker` | dropdown เลือก profile + ปุ่ม "บันทึก" (canManage) |
| `Chip` | สรุปตัวเลขสถิติบนหน้า |
| `TabBtn` | ปุ่มสลับ Mine / Team tab |
| `InfoPair` | label + value pair ใน expand panel |
| `EmptyState` | UI เมื่อไม่มี task |
| `fmtDate()` | format `YYYY-MM-DD` → `DD MMM` ภาษาไทย |

`ContentAssets` import จาก `components/ContentAssets.tsx` แยกไฟล์

---

## 16. RLS Permissions ที่เกี่ยวข้อง

| Table | SELECT | INSERT | UPDATE | DELETE |
|---|---|---|---|---|
| `contents` | ทุก role (approved) | admin, manager, editor | admin, manager, editor | admin, manager |
| `content_assignment_log` | ทุก role (approved) | admin, manager | — | — |
| `content_assets` | ทุก role (approved) | admin, manager, editor | admin, manager, editor | admin, manager |
| `products` | ทุก role (approved) | — | — | — |
| `profiles` | ทุก role (approved) | — | ของตัวเอง / admin ทั้งหมด | — |

**สิ่งที่ต้องระวัง:** editor มีสิทธิ์ UPDATE contents — ดังนั้น editor ที่เป็น producer/approver ของ content นั้นสามารถ advance status ได้ตาม RLS แต่ใน UI จะเห็น action ตาม `myRole` ที่กำหนดไว้ใน `NEXT_STATUS` map เท่านั้น
