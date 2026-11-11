'use client'

import { useEffect, useState, useMemo, useCallback } from 'react'
import { createClient } from '@/lib/supabase'
import { useProfile, useCan } from '@/lib/profile-context'
import { showToast } from './Toast'
import Modal, { Field, ConfirmModal } from './Modal'
import { btnPrimary, btnSecondary, btnDanger, tableWrapCls, sectionLabelCls, inputCls, selectCls } from '@/lib/cx'
import { IconPlus, IconTrash, IconPencil, IconDownload, IconMail, IconSend, IconClock, IconToggle, IconBarChart2 } from '@/lib/icons'

// ─── Types ────────────────────────────────────────────────────────────────────
interface ReportSchedule {
  id: number
  name: string
  created_by: string
  recipients: string[]
  frequency: 'daily' | 'weekly' | 'monthly' | 'custom'
  schedule_day: number | null
  schedule_time: string
  timezone: string
  sections: string[]
  format: 'pdf' | 'csv' | 'both'
  date_range_days: number
  product_filter: string[] | null
  is_active: boolean
  last_sent_at: string | null
  next_run_at: string | null
  created_at: string
}

interface LiveReportData {
  products: any[]
  sales: any[]
  ads: any[]
  contents: any[]
  totalSales: number
  totalTarget: number
  totalBudget: number
  totalSpent: number
  totalLeads: number
  postedContents: number
  overdueContents: number
  pendingContents: number
}

const SECTION_OPTIONS = [
  { key: 'summary',  label: 'ภาพรวม KPI' },
  { key: 'products', label: 'สินค้า (Products)' },
  { key: 'sales',    label: 'ยอดขาย (Sales)' },
  { key: 'ads',      label: 'โฆษณา (Ads)' },
  { key: 'contents', label: 'Content' },
]

const FREQ_OPTIONS = [
  { key: 'daily',   label: 'ทุกวัน' },
  { key: 'weekly',  label: 'ทุกสัปดาห์' },
  { key: 'monthly', label: 'ทุกเดือน' },
]

const DAY_TH = ['อาทิตย์', 'จันทร์', 'อังคาร', 'พุธ', 'พฤหัสบดี', 'ศุกร์', 'เสาร์']

const EMPTY_FORM = {
  name: '',
  recipients: '',        // comma-separated in UI, converted to array on save
  frequency: 'weekly' as 'daily' | 'weekly' | 'monthly' | 'custom',
  schedule_day: 1,       // Monday for weekly; 1 for monthly
  schedule_time: '08:00',
  sections: ['summary', 'products', 'contents', 'ads', 'sales'],
  format: 'pdf' as 'pdf' | 'csv' | 'both',
  date_range_days: 30,
  product_filter: [] as string[],
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
function fmt(n: number, prefix = '') {
  return prefix + n.toLocaleString('th-TH')
}
function pct(a: number, b: number) {
  return b > 0 ? Math.round((a / b) * 100) : 0
}
function formatRelative(iso: string | null) {
  if (!iso) return '—'
  const d = new Date(iso)
  const diff = Date.now() - d.getTime()
  const days = Math.floor(diff / 86400000)
  if (days === 0) return 'วันนี้'
  if (days === 1) return 'เมื่อวาน'
  if (days < 7)  return `${days} วันที่แล้ว`
  return d.toLocaleDateString('th-TH', { day: 'numeric', month: 'short' })
}
function formatNextRun(iso: string | null) {
  if (!iso) return '—'
  const d = new Date(iso)
  const diff = d.getTime() - Date.now()
  const hours = Math.floor(diff / 3600000)
  if (diff < 0) return 'เกินกำหนด'
  if (hours < 1) return 'ภายใน 1 ชั่วโมง'
  if (hours < 24) return `อีก ${hours} ชม.`
  const days = Math.floor(diff / 86400000)
  return `อีก ${days} วัน`
}

// ─── Live Preview Panel ───────────────────────────────────────────────────────
function LivePreview({ data, loading }: { data: LiveReportData | null; loading: boolean }) {
  const TODAY = new Date().toISOString().split('T')[0]

  if (loading) {
    return (
      <div className="space-y-3">
        {[1, 2, 3].map(i => (
          <div key={i} className="h-20 bg-slate-100 rounded-2xl animate-pulse" />
        ))}
      </div>
    )
  }
  if (!data) return null

  const achievePct = pct(data.totalSales, data.totalTarget)
  const spentPct   = pct(data.totalSpent, data.totalBudget)

  return (
    <div className="space-y-4">
      {/* KPI row */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {[
          { label: 'ยอดขายจริง',   value: fmt(data.totalSales, '฿'),  sub: `เป้า ฿${fmt(data.totalTarget)} (${achievePct}%)`, color: 'text-emerald-600' },
          { label: 'งบ Ads ใช้ไป', value: fmt(data.totalSpent, '฿'),   sub: `จากทั้งหมด ฿${fmt(data.totalBudget)} (${spentPct}%)`, color: 'text-indigo-600' },
          { label: 'Leads รวม',    value: fmt(data.totalLeads),          sub: `จาก ${data.ads.length} campaigns`, color: 'text-amber-600' },
          { label: 'Content โพสต์',value: String(data.postedContents),   sub: `ทั้งหมด ${data.contents.length} ชิ้น`, color: 'text-blue-600' },
        ].map(k => (
          <div key={k.label} className="bg-slate-50 rounded-2xl p-4 border border-slate-100">
            <p className="text-[11px] font-medium text-slate-500 mb-1">{k.label}</p>
            <p className={`text-xl font-bold ${k.color}`}>{k.value}</p>
            <p className="text-[11px] text-slate-400 mt-1">{k.sub}</p>
          </div>
        ))}
      </div>

      {/* Overdue alert */}
      {data.overdueContents > 0 && (
        <div className="bg-red-50 border border-red-100 rounded-2xl px-4 py-3 flex items-center gap-3">
          <span className="text-red-500 text-lg">⚠️</span>
          <div>
            <p className="text-sm font-semibold text-red-700">Content เลยกำหนด {data.overdueContents} ชิ้น</p>
            <p className="text-xs text-red-500 mt-0.5">จะแสดงใน report พร้อมรายละเอียด</p>
          </div>
        </div>
      )}

      {/* Products mini table */}
      {data.products.length > 0 && (
        <div>
          <p className={`${sectionLabelCls} mb-2`}>สินค้า ({data.products.length})</p>
          <div className={tableWrapCls}>
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-100">
                  {['Product ID', 'ชื่อ', 'Brand', 'สถานะ'].map(h => (
                    <th key={h} className="px-4 py-2.5 text-left text-[11px] font-semibold text-slate-400">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {data.products.slice(0, 5).map(p => (
                  <tr key={p.product_id} className="border-b border-slate-50 hover:bg-slate-50/60">
                    <td className="px-4 py-2 font-mono text-xs text-slate-600">{p.product_id}</td>
                    <td className="px-4 py-2 text-slate-800 font-medium">{p.name}</td>
                    <td className="px-4 py-2 text-slate-500">{p.brand ?? '—'}</td>
                    <td className="px-4 py-2">
                      <span className="text-xs px-2 py-0.5 rounded-full bg-slate-100 text-slate-600">{p.status}</span>
                    </td>
                  </tr>
                ))}
                {data.products.length > 5 && (
                  <tr>
                    <td colSpan={4} className="px-4 py-2 text-xs text-slate-400 text-center">
                      และอีก {data.products.length - 5} รายการในไฟล์ export
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Sales mini table */}
      {data.sales.length > 0 && (
        <div>
          <p className={`${sectionLabelCls} mb-2`}>ยอดขาย ({data.sales.length} รอบ)</p>
          <div className={tableWrapCls}>
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-100">
                  {['Product', 'ช่วงเวลา', 'เป้า', 'จริง', '%'].map(h => (
                    <th key={h} className="px-4 py-2.5 text-left text-[11px] font-semibold text-slate-400">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {data.sales.slice(0, 5).map((s, i) => {
                  const p = pct(s.actual_sales, s.sales_target_amount)
                  return (
                    <tr key={i} className="border-b border-slate-50 hover:bg-slate-50/60">
                      <td className="px-4 py-2 font-mono text-xs text-slate-600">{s.product_id}</td>
                      <td className="px-4 py-2 text-xs text-slate-500">{s.period_start} → {s.period_end}</td>
                      <td className="px-4 py-2 text-xs text-slate-700">{fmt(s.sales_target_amount, '฿')}</td>
                      <td className="px-4 py-2 text-xs font-semibold text-slate-800">{fmt(s.actual_sales, '฿')}</td>
                      <td className="px-4 py-2">
                        <span className={`text-xs font-bold ${p >= 100 ? 'text-emerald-600' : p >= 50 ? 'text-amber-600' : 'text-red-500'}`}>
                          {p}%
                        </span>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Ads mini table */}
      {data.ads.length > 0 && (
        <div>
          <p className={`${sectionLabelCls} mb-2`}>Ads ({data.ads.length} campaigns)</p>
          <div className={tableWrapCls}>
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-100">
                  {['Campaign', 'เดือน', 'ใช้ไป', 'Leads', 'CPL', 'ROAS'].map(h => (
                    <th key={h} className="px-4 py-2.5 text-left text-[11px] font-semibold text-slate-400">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {data.ads.slice(0, 5).map((a, i) => (
                  <tr key={i} className="border-b border-slate-50 hover:bg-slate-50/60">
                    <td className="px-4 py-2 text-xs font-medium text-slate-800 max-w-[160px] truncate">{a.campaign_name}</td>
                    <td className="px-4 py-2 text-xs text-slate-500">{a.month ?? '—'}</td>
                    <td className="px-4 py-2 text-xs text-slate-700">{fmt(a.budget_spent ?? 0, '฿')}</td>
                    <td className="px-4 py-2 text-xs font-semibold">{a.leads ?? 0}</td>
                    <td className="px-4 py-2 text-xs text-slate-600">{fmt(Math.round(a.cpl ?? 0), '฿')}</td>
                    <td className="px-4 py-2 text-xs font-semibold text-indigo-600">{a.roas ?? 0}x</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}

// ─── Schedule Form ────────────────────────────────────────────────────────────
function ScheduleForm({
  form, setForm, products,
  saving, error,
  onSave, onCancel,
}: {
  form: typeof EMPTY_FORM
  setForm: React.Dispatch<React.SetStateAction<typeof EMPTY_FORM>>
  products: { product_id: string; name: string }[]
  saving: boolean
  error: string
  onSave: () => void
  onCancel: () => void
}) {
  const [recipientInput, setRecipientInput] = useState(form.recipients)

  // Parse recipients on blur
  function commitRecipients() {
    setForm(f => ({ ...f, recipients: recipientInput }))
  }

  function toggleSection(key: string) {
    setForm(f => ({
      ...f,
      sections: f.sections.includes(key)
        ? f.sections.filter(s => s !== key)
        : [...f.sections, key],
    }))
  }

  function toggleProduct(pid: string) {
    setForm(f => ({
      ...f,
      product_filter: f.product_filter.includes(pid)
        ? f.product_filter.filter(p => p !== pid)
        : [...f.product_filter, pid],
    }))
  }

  return (
    <div className="space-y-5">
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-sm text-red-700">{error}</div>
      )}

      <Field label="ชื่อ Report" required>
        <input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
          placeholder="เช่น รายงานประจำสัปดาห์ Marketing" className={inputCls} />
      </Field>

      {/* Recipients */}
      <Field label="ส่งถึง (Email)" hint="คั่นหลายอีเมลด้วยจุลภาค (,)" required>
        <textarea
          value={recipientInput}
          onChange={e => setRecipientInput(e.target.value)}
          onBlur={commitRecipients}
          placeholder="user@example.com, another@company.com"
          rows={2}
          className={`${inputCls} resize-none`}
        />
        {/* Preview parsed list */}
        {recipientInput.split(',').map(e => e.trim()).filter(Boolean).length > 0 && (
          <div className="flex flex-wrap gap-1.5 mt-1">
            {recipientInput.split(',').map(e => e.trim()).filter(Boolean).map(email => (
              <span key={email} className="text-[11px] bg-indigo-50 text-indigo-700 border border-indigo-100 rounded-full px-2 py-0.5 font-medium">
                {email}
              </span>
            ))}
          </div>
        )}
      </Field>

      {/* Frequency */}
      <Field label="ความถี่">
        <div className="flex gap-2">
          {FREQ_OPTIONS.map(f => (
            <button
              key={f.key}
              type="button"
              onClick={() => setForm(ff => ({ ...ff, frequency: f.key as typeof form.frequency }))}
              className={`flex-1 py-2 text-xs font-medium rounded-xl border transition-colors ${
                form.frequency === f.key
                  ? 'bg-indigo-600 text-white border-indigo-600'
                  : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
      </Field>

      {/* Schedule day + time */}
      <div className="grid grid-cols-2 gap-3">
        {form.frequency === 'weekly' && (
          <Field label="วันที่ส่ง">
            <select value={form.schedule_day} onChange={e => setForm(f => ({ ...f, schedule_day: Number(e.target.value) }))} className={selectCls}>
              {DAY_TH.map((d, i) => <option key={i} value={i}>{d}</option>)}
            </select>
          </Field>
        )}
        {(form.frequency as string) === 'monthly' && (
          <Field label="วันที่ของเดือน" hint="1–28">
            <input type="number" min={1} max={28} value={form.schedule_day ?? 1}
              onChange={e => setForm(f => ({ ...f, schedule_day: Number(e.target.value) }))}
              className={inputCls} />
          </Field>
        )}
        <Field label="เวลาที่ส่ง">
          <input type="time" value={form.schedule_time}
            onChange={e => setForm(f => ({ ...f, schedule_time: e.target.value }))}
            className={inputCls} />
        </Field>
        <Field label="ช่วงข้อมูลย้อนหลัง" hint="วัน">
          <input type="number" min={1} max={365} value={form.date_range_days}
            onChange={e => setForm(f => ({ ...f, date_range_days: Number(e.target.value) }))}
            className={inputCls} />
        </Field>
      </div>

      {/* Format */}
      <Field label="รูปแบบไฟล์แนบ">
        <div className="flex gap-2">
          {(['pdf', 'csv', 'both'] as const).map(fmt => (
            <button key={fmt} type="button"
              onClick={() => setForm(f => ({ ...f, format: fmt as 'pdf' | 'csv' | 'both' }))}
              className={`flex-1 py-2 text-xs font-medium rounded-xl border transition-colors ${
                (form.format as string) === fmt
                  ? 'bg-indigo-600 text-white border-indigo-600'
                  : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
              }`}>
              {fmt === 'pdf' ? 'Email HTML' : fmt === 'csv' ? 'CSV' : 'ทั้งคู่'}
            </button>
          ))}
        </div>
        <p className="text-[11px] text-slate-400 mt-1">Email HTML = rich report ในอีเมล · CSV = ไฟล์แนบสำหรับ Excel</p>
      </Field>

      {/* Sections */}
      <Field label="ส่วนที่รวมใน Report">
        <div className="grid grid-cols-2 gap-2">
          {SECTION_OPTIONS.map(s => (
            <label key={s.key} className="flex items-center gap-2 cursor-pointer select-none">
              <input type="checkbox" checked={form.sections.includes(s.key)}
                onChange={() => toggleSection(s.key)}
                className="w-4 h-4 rounded accent-indigo-600" />
              <span className="text-sm text-slate-700">{s.label}</span>
            </label>
          ))}
        </div>
      </Field>

      {/* Product filter */}
      {products.length > 0 && (
        <Field label="กรองเฉพาะสินค้า" hint="ไม่เลือก = รวมทุกสินค้า">
          <div className="flex flex-wrap gap-1.5 max-h-28 overflow-y-auto pr-1">
            {products.map(p => (
              <button key={p.product_id} type="button"
                onClick={() => toggleProduct(p.product_id)}
                className={`text-xs px-2.5 py-1 rounded-lg border font-medium transition-colors ${
                  form.product_filter.includes(p.product_id)
                    ? 'bg-indigo-600 text-white border-indigo-600'
                    : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                }`}>
                {p.product_id}
              </button>
            ))}
          </div>
          {form.product_filter.length > 0 && (
            <button type="button" onClick={() => setForm(f => ({ ...f, product_filter: [] }))}
              className="text-xs text-slate-400 hover:text-slate-700 mt-1">
              ล้างตัวเลือก ✕
            </button>
          )}
        </Field>
      )}

      <div className="flex justify-end gap-2 pt-2">
        <button onClick={onCancel} className={btnSecondary}>ยกเลิก</button>
        <button onClick={onSave} disabled={saving} className={btnPrimary}>
          {saving ? 'กำลังบันทึก…' : 'บันทึก Schedule'}
        </button>
      </div>
    </div>
  )
}

// ─── Main Component ───────────────────────────────────────────────────────────
export default function Report() {
  const supabase = createClient()
  const profile  = useProfile()
  const canManage = useCan('insert', 'report_schedules')

  // Data
  const [schedules, setSchedules]       = useState<ReportSchedule[]>([])
  const [products, setProducts]         = useState<{ product_id: string; name: string }[]>([])
  const [liveData, setLiveData]         = useState<LiveReportData | null>(null)
  const [loadingLive, setLoadingLive]   = useState(true)
  const [loading, setLoading]           = useState(true)

  // UI state
  const [showAdd, setShowAdd]           = useState(false)
  const [editingId, setEditingId]       = useState<number | null>(null)
  const [confirmDelete, setConfirmDelete] = useState<number | null>(null)
  const [deleting, setDeleting]         = useState(false)
  const [sending, setSending]           = useState<number | 'manual' | null>(null)
  const [form, setForm]                 = useState({ ...EMPTY_FORM })
  const [saving, setSaving]             = useState(false)
  const [formError, setFormError]       = useState('')

  // Export on-demand state
  const [exportSections, setExportSections] = useState(['summary', 'products', 'contents', 'ads', 'sales'])
  const [exportFormat, setExportFormat]     = useState<'pdf' | 'csv' | 'both'>('csv')
  const [exportDays, setExportDays]         = useState(30)
  const [exportEmail, setExportEmail]       = useState('')
  const [showExportPanel, setShowExportPanel] = useState(false)
  const [filterSection, setFilterSection]   = useState('all')

  // Load schedules + live preview data
  async function loadSchedules() {
    const { data, error } = await supabase.from('report_schedules').select('*').order('created_at', { ascending: false })
    if (error) { showToast(error.message, 'error') }
    setSchedules((data ?? []) as ReportSchedule[])
    setLoading(false)
  }

  const loadLiveData = useCallback(async (days = 30, productFilter: string[] | null = null) => {
    setLoadingLive(true)
    const since = new Date(Date.now() - days * 86400000).toISOString().split('T')[0]
    const TODAY = new Date().toISOString().split('T')[0]

    const [pRes, sRes, aRes, cRes] = await Promise.all([
      supabase.from('products').select('product_id, name, brand, status, owner').order('name'),
      supabase.from('sales').select('product_id, period_start, period_end, sales_target_amount, actual_sales, actual_received, status').gte('period_start', since),
      supabase.from('ads').select('product_id, month, campaign_name, channel, budget_total, budget_spent, budget_remaining, leads, clicks, reach, cpl, roas').order('month', { ascending: false }),
      supabase.from('contents').select('product_id, seq, type, title, status, deadline, producer').order('product_id').order('seq'),
    ])

    const products  = ((pRes.data ?? []) as any[]).filter(p => !productFilter?.length || productFilter.includes(p.product_id))
    const sales     = ((sRes.data ?? []) as any[]).filter(s => !productFilter?.length || productFilter.includes(s.product_id))
    const ads       = ((aRes.data ?? []) as any[]).filter(a => !productFilter?.length || productFilter.includes(a.product_id))
    const contents  = ((cRes.data ?? []) as any[]).filter(c => !productFilter?.length || productFilter.includes(c.product_id))

    setLiveData({
      products, sales, ads, contents,
      totalSales:      sales.reduce((s: number, r: any) => s + Number(r.actual_sales ?? 0), 0),
      totalTarget:     sales.reduce((s: number, r: any) => s + Number(r.sales_target_amount ?? 0), 0),
      totalBudget:     ads.reduce((s: number, r: any) => s + Number(r.budget_total ?? 0), 0),
      totalSpent:      ads.reduce((s: number, r: any) => s + Number(r.budget_spent ?? 0), 0),
      totalLeads:      ads.reduce((s: number, r: any) => s + Number(r.leads ?? 0), 0),
      postedContents:  contents.filter((c: any) => c.status === 'โพสต์แล้ว').length,
      overdueContents: contents.filter((c: any) => c.deadline && c.deadline < TODAY && c.status !== 'โพสต์แล้ว').length,
      pendingContents: contents.filter((c: any) => c.status === 'รอผลิต').length,
    })
    setLoadingLive(false)
  }, [supabase])

  useEffect(() => {
    supabase.from('products').select('product_id, name').order('name').then((r: { data: any[] | null }) => setProducts(r.data ?? []))
    loadSchedules()
    loadLiveData(exportDays)
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // ── CRUD ─────────────────────────────────────────────────────
  function openAdd() {
    setForm({ ...EMPTY_FORM, recipients: profile.email })
    setFormError('')
    setEditingId(null)
    setShowAdd(true)
  }

  function openEdit(s: ReportSchedule) {
    setForm({
      name: s.name,
      recipients: s.recipients.join(', '),
      frequency: s.frequency,
      schedule_day: s.schedule_day ?? 1,
      schedule_time: s.schedule_time.substring(0, 5),
      sections: s.sections,
      format: s.format,
      date_range_days: s.date_range_days,
      product_filter: s.product_filter ?? [],
    })
    setFormError('')
    setEditingId(s.id)
    setShowAdd(true)
  }

  async function saveSchedule() {
    const emails = form.recipients.split(',').map(e => e.trim()).filter(Boolean)
    if (!form.name.trim()) { setFormError('กรุณาระบุชื่อ Report'); return }
    if (!emails.length)    { setFormError('กรุณาระบุอีเมลผู้รับอย่างน้อย 1 รายการ'); return }
    if (!form.sections.length) { setFormError('เลือกอย่างน้อย 1 ส่วน'); return }

    setSaving(true); setFormError('')

    // Compute first next_run_at
    const nextRun = new Date()
    const [h, m] = form.schedule_time.split(':')
    nextRun.setHours(parseInt(h), parseInt(m), 0, 0)
    if (nextRun <= new Date()) nextRun.setDate(nextRun.getDate() + 1)

    const payload = {
      name: form.name.trim(),
      recipients: emails,
      frequency: form.frequency,
      schedule_day: form.schedule_day,
      schedule_time: form.schedule_time + ':00',
      sections: form.sections,
      format: form.format,
      date_range_days: form.date_range_days,
      product_filter: form.product_filter.length ? form.product_filter : null,
      next_run_at: nextRun.toISOString(),
    }

    if (editingId) {
      const { error } = await supabase.from('report_schedules').update(payload).eq('id', editingId)
      setSaving(false)
      if (error) { setFormError(error.message); return }
      showToast('อัพเดต Schedule แล้ว')
    } else {
      const { error } = await supabase.from('report_schedules').insert([{
        ...payload, created_by: profile.id, is_active: true,
      }])
      setSaving(false)
      if (error) { setFormError(error.message); return }
      showToast('สร้าง Schedule แล้ว')
    }

    setShowAdd(false)
    loadSchedules()
  }

  async function deleteSchedule(id: number) {
    setDeleting(true)
    const { error } = await supabase.from('report_schedules').delete().eq('id', id)
    setDeleting(false)
    if (error) { showToast(error.message, 'error'); return }
    setConfirmDelete(null)
    setSchedules(prev => prev.filter(s => s.id !== id))
    showToast('ลบ Schedule แล้ว')
  }

  async function toggleActive(s: ReportSchedule) {
    const { error } = await supabase.from('report_schedules').update({ is_active: !s.is_active }).eq('id', s.id)
    if (error) { showToast(error.message, 'error'); return }
    setSchedules(prev => prev.map(r => r.id === s.id ? { ...r, is_active: !r.is_active } : r))
  }

  // ── Send now ──────────────────────────────────────────────────
  async function sendNow(scheduleId: number) {
    setSending(scheduleId)
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) { showToast('ไม่พบ session', 'error'); setSending(null); return }

    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/send-report`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ schedule_id: scheduleId }),
      })
      const json = await res.json()
      if (!json.ok) throw new Error(json.error)
      showToast(`ส่ง Report ไปที่ ${json.recipients?.length ?? 0} อีเมลแล้ว`)
      loadSchedules()
    } catch (e: any) {
      showToast(e.message, 'error')
    }
    setSending(null)
  }

  // ── On-demand export / email ──────────────────────────────────
  async function sendOnDemand() {
    const emails = exportEmail.split(',').map(e => e.trim()).filter(Boolean)
    if (!emails.length) { showToast('กรุณาใส่อีเมลผู้รับ', 'error'); return }

    setSending('manual')
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) { showToast('ไม่พบ session', 'error'); setSending(null); return }

    // Build CSV on client for immediate download
    if (exportFormat === 'csv' || exportFormat === 'both') {
      await downloadCSV()
    }

    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/send-report`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          manual: true,
          recipients: emails,
          sections: exportSections,
          format: exportFormat,
          date_range_days: exportDays,
          report_name: 'Nexo PMS Report',
        }),
      })
      const json = await res.json()
      if (!json.ok) throw new Error(json.error)
      showToast(`ส่ง Report ไปที่ ${emails.length} อีเมลแล้ว`)
    } catch (e: any) {
      showToast(e.message, 'error')
    }
    setSending(null)
  }

  async function downloadCSV() {
    if (!liveData) return
    // Build CSV from live data
    const rows: string[][] = []
    rows.push(['Nexo PMS Report', new Date().toLocaleString('th-TH')])
    rows.push([])
    rows.push(['Metric', 'Value'])
    rows.push(['ยอดขายรวม (฿)', String(liveData.totalSales)])
    rows.push(['เป้ายอดขาย (฿)', String(liveData.totalTarget)])
    rows.push(['Achievement %', String(pct(liveData.totalSales, liveData.totalTarget)) + '%'])
    rows.push(['งบ Ads ทั้งหมด (฿)', String(liveData.totalBudget)])
    rows.push(['ใช้ไปแล้ว (฿)', String(liveData.totalSpent)])
    rows.push(['Leads รวม', String(liveData.totalLeads)])
    rows.push(['Content โพสต์แล้ว', String(liveData.postedContents)])
    rows.push([])
    if (exportSections.includes('products') && liveData.products.length) {
      rows.push(['=== PRODUCTS ==='])
      rows.push(['Product ID', 'ชื่อ', 'Brand', 'สถานะ', 'เจ้าของ'])
      liveData.products.forEach(p => rows.push([p.product_id, p.name, p.brand ?? '', p.status, p.owner ?? '']))
      rows.push([])
    }
    if (exportSections.includes('sales') && liveData.sales.length) {
      rows.push(['=== SALES ==='])
      rows.push(['Product', 'ช่วงเวลา', 'เป้า (฿)', 'จริง (฿)', 'รับจริง (฿)', 'สถานะ', '%'])
      liveData.sales.forEach(s => rows.push([
        s.product_id, `${s.period_start} → ${s.period_end}`,
        String(s.sales_target_amount), String(s.actual_sales), String(s.actual_received),
        s.status, String(pct(s.actual_sales, s.sales_target_amount)) + '%',
      ]))
      rows.push([])
    }
    if (exportSections.includes('ads') && liveData.ads.length) {
      rows.push(['=== ADS ==='])
      rows.push(['Product', 'เดือน', 'Campaign', 'ช่องทาง', 'งบรวม (฿)', 'ใช้ไป (฿)', 'คงเหลือ (฿)', 'Reach', 'Clicks', 'Leads', 'CPL', 'ROAS'])
      liveData.ads.forEach(a => rows.push([
        a.product_id, a.month ?? '', a.campaign_name, a.channel ?? '',
        String(a.budget_total ?? 0), String(a.budget_spent ?? 0), String(a.budget_remaining ?? 0),
        String(a.reach ?? 0), String(a.clicks ?? 0), String(a.leads ?? 0),
        String(a.cpl ?? 0), String(a.roas ?? 0),
      ]))
      rows.push([])
    }
    if (exportSections.includes('contents') && liveData.contents.length) {
      rows.push(['=== CONTENTS ==='])
      rows.push(['Product', 'Seq', 'Type', 'Title', 'สถานะ', 'กำหนดส่ง', 'ผู้ผลิต'])
      liveData.contents.forEach(c => rows.push([c.product_id, String(c.seq ?? ''), c.type, c.title, c.status, c.deadline ?? '', c.producer ?? '']))
    }

    const csv = rows.map(r => r.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(',')).join('\n')
    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' })
    const url  = URL.createObjectURL(blob)
    const a    = document.createElement('a')
    a.href = url
    a.download = `nexo-report-${new Date().toISOString().split('T')[0]}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  // Filtered schedules
  const filteredSchedules = useMemo(() => {
    if (filterSection === 'all') return schedules
    if (filterSection === 'active') return schedules.filter(s => s.is_active)
    if (filterSection === 'inactive') return schedules.filter(s => !s.is_active)
    return schedules
  }, [schedules, filterSection])

  const deleteTarget = confirmDelete !== null ? schedules.find(s => s.id === confirmDelete) : null

  return (
    <div className="p-4 md:p-6 space-y-4 md:space-y-6">
      {/* ── Page Header ── */}
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div>
          <h1 className="text-lg md:text-xl font-semibold text-slate-900 flex items-center gap-2">
            <IconBarChart2 />
            Report
          </h1>
          <p className="text-sm text-slate-400 mt-0.5">ภาพรวมข้อมูลเชิงลึก · Export · ตั้งเวลาส่ง Email</p>
        </div>
        <div className="flex gap-2 shrink-0 flex-wrap">
          <button onClick={() => setShowExportPanel(v => !v)} className={btnSecondary}>
            <IconDownload />
            Export / ส่ง Email
          </button>
          {canManage && (
            <button onClick={openAdd} className={btnPrimary}>
              <IconPlus />
              ตั้ง Schedule
            </button>
          )}
        </div>
      </div>

      {/* ── On-demand Export Panel ── */}
      {showExportPanel && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5 space-y-4">
          <p className={sectionLabelCls}>Export ทันที / ส่ง Email</p>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {/* Sections */}
            <div>
              <p className="text-xs font-medium text-slate-600 mb-2">ส่วนที่รวม</p>
              <div className="space-y-1.5">
                {SECTION_OPTIONS.map(s => (
                  <label key={s.key} className="flex items-center gap-2 cursor-pointer">
                    <input type="checkbox"
                      checked={exportSections.includes(s.key)}
                      onChange={() => setExportSections(prev =>
                        prev.includes(s.key) ? prev.filter(k => k !== s.key) : [...prev, s.key]
                      )}
                      className="w-3.5 h-3.5 rounded accent-indigo-600" />
                    <span className="text-xs text-slate-700">{s.label}</span>
                  </label>
                ))}
              </div>
            </div>
            {/* Format + days */}
            <div className="space-y-3">
              <div>
                <p className="text-xs font-medium text-slate-600 mb-1.5">รูปแบบ</p>
                <div className="flex gap-1.5">
                  {(['pdf', 'csv', 'both'] as const).map(f => (
                    <button key={f} type="button"
                      onClick={() => setExportFormat(f)}
                      className={`flex-1 py-1.5 text-xs font-medium rounded-lg border transition-colors ${
                        exportFormat === f ? 'bg-indigo-600 text-white border-indigo-600' : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                      }`}>
                      {f === 'pdf' ? 'Email HTML' : f === 'csv' ? 'CSV' : 'ทั้งคู่'}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <p className="text-xs font-medium text-slate-600 mb-1.5">ข้อมูลย้อนหลัง (วัน)</p>
                <input type="number" min={1} max={365} value={exportDays}
                  onChange={e => { setExportDays(Number(e.target.value)); loadLiveData(Number(e.target.value)) }}
                  className={inputCls} />
              </div>
            </div>
            {/* Email + actions */}
            <div className="space-y-3">
              <div>
                <p className="text-xs font-medium text-slate-600 mb-1.5">ส่งไปที่ Email</p>
                <input type="email" placeholder="email1@co.com, email2@co.com"
                  value={exportEmail} onChange={e => setExportEmail(e.target.value)}
                  className={inputCls} />
              </div>
              <div className="flex flex-col gap-2">
                <button onClick={downloadCSV} disabled={!liveData} className={btnSecondary}>
                  <IconDownload />
                  ดาวน์โหลด CSV
                </button>
                <button onClick={sendOnDemand} disabled={sending === 'manual' || !exportEmail.trim()} className={btnPrimary}>
                  {sending === 'manual' ? (
                    <span className="flex items-center gap-1.5"><svg className="animate-spin w-3.5 h-3.5" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" opacity=".3"/><path d="M12 2a10 10 0 0 1 10 10" stroke="currentColor" strokeWidth="4" strokeLinecap="round"/></svg>กำลังส่ง…</span>
                  ) : (
                    <><IconSend />ส่ง Email ทันที</>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Live Preview ── */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5">
        <div className="flex items-center justify-between mb-4">
          <p className={sectionLabelCls}>ตัวอย่าง Report ล่าสุด ({exportDays} วันย้อนหลัง)</p>
          <button onClick={() => loadLiveData(exportDays)}
            className="text-xs text-slate-400 hover:text-indigo-600 flex items-center gap-1 transition-colors">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
              <polyline points="1 4 1 10 7 10"/><path d="M3.51 15a9 9 0 1 0 .49-4"/>
            </svg>
            รีเฟรช
          </button>
        </div>
        <LivePreview data={liveData} loading={loadingLive} />
      </div>

      {/* ── Schedules ── */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <p className={sectionLabelCls}>Email Schedules ({schedules.length})</p>
          <div className="flex gap-1">
            {['all', 'active', 'inactive'].map(f => (
              <button key={f} onClick={() => setFilterSection(f)}
                className={`px-3 py-1 text-xs font-medium rounded-lg border transition-colors ${
                  filterSection === f ? 'bg-indigo-600 text-white border-indigo-600' : 'bg-white text-slate-500 border-slate-200 hover:bg-slate-50'
                }`}>
                {f === 'all' ? 'ทั้งหมด' : f === 'active' ? 'เปิดอยู่' : 'ปิด'}
              </button>
            ))}
          </div>
        </div>

        {loading ? (
          <div className="space-y-2">
            {[1, 2].map(i => <div key={i} className="h-24 bg-slate-100 rounded-2xl animate-pulse" />)}
          </div>
        ) : filteredSchedules.length === 0 ? (
          <div className="bg-white rounded-2xl border border-slate-100 p-10 text-center">
            <div className="w-12 h-12 bg-indigo-50 rounded-2xl flex items-center justify-center mx-auto mb-3">
              <IconClock />
            </div>
            <p className="text-sm font-medium text-slate-700">ยังไม่มี Schedule</p>
            <p className="text-xs text-slate-400 mt-1">สร้าง Schedule เพื่อให้ระบบส่ง Report อัตโนมัติตามเวลาที่กำหนด</p>
            {canManage && (
              <button onClick={openAdd} className={`${btnPrimary} mx-auto mt-4`}>
                <IconPlus />
                สร้าง Schedule แรก
              </button>
            )}
          </div>
        ) : (
          <div className="space-y-2">
            {filteredSchedules.map(s => (
              <div key={s.id}
                className={`bg-white rounded-2xl border shadow-sm p-4 transition-all ${s.is_active ? 'border-slate-200' : 'border-slate-100 opacity-60'}`}>
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <p className="text-sm font-semibold text-slate-900 truncate">{s.name}</p>
                      <span className={`text-[10px] px-1.5 py-0.5 rounded font-semibold ${
                        s.format === 'csv' ? 'bg-emerald-50 text-emerald-700' :
                        s.format === 'pdf' ? 'bg-blue-50 text-blue-700' : 'bg-purple-50 text-purple-700'
                      }`}>
                        {s.format === 'pdf' ? 'Email HTML' : s.format.toUpperCase()}
                      </span>
                    </div>
                    {/* Meta row */}
                    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-400">
                      <span className="flex items-center gap-1">
                        <IconMail />
                        {s.recipients.slice(0, 2).join(', ')}{s.recipients.length > 2 && ` +${s.recipients.length - 2}`}
                      </span>
                      <span className="flex items-center gap-1">
                        <IconClock />
                        {FREQ_OPTIONS.find(f => f.key === s.frequency)?.label} · {s.schedule_time.substring(0, 5)}
                      </span>
                      <span>ย้อนหลัง {s.date_range_days} วัน</span>
                      {s.last_sent_at && <span>ส่งล่าสุด: {formatRelative(s.last_sent_at)}</span>}
                      {s.next_run_at && s.is_active && (
                        <span className="text-indigo-500 font-medium">รอบถัดไป: {formatNextRun(s.next_run_at)}</span>
                      )}
                    </div>
                    {/* Sections chips */}
                    <div className="flex flex-wrap gap-1 mt-2">
                      {s.sections.map(sec => (
                        <span key={sec} className="text-[10px] bg-slate-50 text-slate-500 border border-slate-100 rounded-full px-2 py-0.5">
                          {SECTION_OPTIONS.find(o => o.key === sec)?.label ?? sec}
                        </span>
                      ))}
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-1.5 shrink-0">
                    {/* Send now */}
                    <button onClick={() => sendNow(s.id)} disabled={sending === s.id}
                      title="ส่ง Report ทันที"
                      className={`${btnSecondary} ${sending === s.id ? 'opacity-50 cursor-not-allowed' : ''}`}>
                      {sending === s.id ? (
                        <svg className="animate-spin w-3.5 h-3.5" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" opacity=".3"/><path d="M12 2a10 10 0 0 1 10 10" stroke="currentColor" strokeWidth="4" strokeLinecap="round"/></svg>
                      ) : <IconSend />}
                      ส่งเลย
                    </button>
                    {canManage && (
                      <>
                        {/* Toggle active */}
                        <button onClick={() => toggleActive(s)} title={s.is_active ? 'ปิด Schedule' : 'เปิด Schedule'}
                          className="flex items-center gap-1.5 px-2 py-1.5 rounded-lg hover:bg-slate-50 transition-colors">
                          <IconToggle on={s.is_active} />
                        </button>
                        <button onClick={() => openEdit(s)} title="แก้ไข" className={btnSecondary}>
                          <IconPencil />
                        </button>
                        <button onClick={() => setConfirmDelete(s.id)} title="ลบ" className={btnDanger}>
                          <IconTrash />
                        </button>
                      </>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ── Add / Edit Modal ── */}
      <Modal
        open={showAdd}
        onClose={() => { setShowAdd(false); setFormError('') }}
        title={editingId ? 'แก้ไข Schedule' : 'สร้าง Report Schedule'}
        width="max-w-xl"
      >
        <ScheduleForm
          form={form} setForm={setForm}
          products={products}
          saving={saving} error={formError}
          onSave={saveSchedule}
          onCancel={() => { setShowAdd(false); setFormError('') }}
        />
      </Modal>

      {/* ── Delete confirm ── */}
      <ConfirmModal
        open={confirmDelete !== null}
        onClose={() => setConfirmDelete(null)}
        onConfirm={() => deleteSchedule(confirmDelete!)}
        loading={deleting}
        title="ยืนยันลบ Schedule"
        message={<>ลบ <strong>{deleteTarget?.name}</strong>? จะหยุดส่ง Report อัตโนมัติทันที</>}
      />
    </div>
  )
}
