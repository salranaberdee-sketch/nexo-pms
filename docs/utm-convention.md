# UTM Naming Convention — Nexo PMS

> เอกสารนี้กำหนดมาตรฐาน UTM parameters สำหรับทุกแคมเปญใน Nexo PMS
> เพื่อให้ field `utm_*` ใน `leads` table ตรงกับ `ads` table ได้อัตโนมัติ

---

## กฎทั่วไป

- ใช้ **lowercase** ทั้งหมด ยกเว้นห้ามใช้ตัวพิมพ์ใหญ่
- ใช้ `-` (hyphen) แทนช่องว่าง เช่น `med-psy-001` ไม่ใช่ `med psy 001`
- ห้ามใช้ special characters: `& % # $ @ ! ^ * ( ) = + [ ] { } | \ / ? , . ;`
- ทุก UTM ต้องมีอย่างน้อย `utm_source` + `utm_medium` + `utm_campaign`

---

## utm_source — แพลตฟอร์มต้นทาง

| ค่า | ความหมาย |
|---|---|
| `facebook` | Facebook Feed / Stories |
| `instagram` | Instagram Feed / Reels |
| `tiktok` | TikTok For Business |
| `google` | Google Ads (Search / Display) |
| `youtube` | YouTube Ads |
| `line` | LINE Official Account / LINE Ads |
| `email` | Email marketing |
| `organic` | โพสต์ organic (ไม่ใช่ paid) |
| `direct` | ลูกค้ากรอก URL โดยตรง |
| `referral` | มาจาก website อื่น |

---

## utm_medium — ประเภท traffic

| ค่า | ความหมาย |
|---|---|
| `cpc` | Cost-per-click (paid ads ทั่วไป) |
| `social` | Paid social media |
| `video` | Video ads |
| `banner` | Display / Banner ads |
| `retargeting` | Remarketing / Retargeting |
| `email` | Email campaign |
| `organic` | Organic social / SEO |
| `referral` | Referral link |

---

## utm_campaign — ชื่อแคมเปญ

**รูปแบบ:** `{product_id}-{เดือน}-{คำอธิบายสั้น}`

```
ตัวอย่าง:
  med-psy-001-2026-11-open-enrollment
  reb-reh-001-2026-11-awareness
  cln-cir-001-2026-11-knowledge
```

**กฎ:** `utm_campaign` ต้องตรงกับ `ads.campaign_name` (lowercase, hyphen แทนช่องว่าง) เพื่อให้ match กันใน ROI view ได้

---

## utm_content — ระบุ creative ที่ใช้

**รูปแบบ:** `{product_id}-seq{เลข}-{ประเภท}` หรือ slug ของ content title

```
ตัวอย่าง:
  med-psy-001-seq1-graphic
  reb-reh-001-seq3-video
  cln-cir-001-seq2-copy
```

**กฎ:** `utm_content` ต้องตรงกับ `contents.title` (slug format) เพื่อให้ match กับ `ad_contents` table ได้

---

## ตัวอย่าง URL เต็ม

```
https://nexo-three-cyan.vercel.app/lead-form
  ?utm_source=facebook
  &utm_medium=cpc
  &utm_campaign=med-psy-001-2026-11-open-enrollment
  &utm_content=med-psy-001-seq1-graphic
```

---

## Attribution Model ที่ใช้ (Phase 1)

**First-touch manual** — sales team กรอก `utm_*` ตอนบันทึก lead ว่า lead มาจากช่องทางไหน

- **ข้อดี:** ง่าย เหมาะกับทีมเล็ก ไม่ต้องมี tracking pixel
- **ข้อเสีย:** accuracy ขึ้นกับ sales team กรอกถูก
- **Phase 2 (อนาคต):** เชื่อม form embed → webhook → leads table อัตโนมัติ

---

## การ match UTM กับตาราง Nexo

| leads field | ตรงกับ Nexo table | วิธี match |
|---|---|---|
| `utm_campaign` | `ads.campaign_name` | LOWER + REPLACE(' ', '-') |
| `utm_content` | `contents.title` (slug) | LOWER + REPLACE(' ', '-') |
| `utm_source` | `ads.channel` | mapping table (facebook→facebook) |
| `product_id` | `products.product_id` | exact match |

---

## PDPA Reminder

⚠️ ห้ามระบุข้อมูลต่อไปนี้ใน `leads.notes` หรือ `utm_*` fields:
- ชื่อ-นามสกุลลูกค้า
- เบอร์โทรศัพท์ / อีเมล
- หมายเลขบัตรประชาชน
- ประวัติสุขภาพ / ข้อมูลการรักษา
- ข้อมูลอาการหรือโรคใดๆ

สำหรับสินค้าที่เป็นคลินิกและศูนย์บำบัด (`CLN-CIR-001`, `REB-REH-001`) กฎนี้บังคับใช้อย่างเคร่งครัด
