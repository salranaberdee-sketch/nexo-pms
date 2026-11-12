'use client'

import { useEffect, useState, useCallback } from 'react'
import { createClient } from '@/lib/supabase'
import { useIsAdmin, useProfile } from '@/lib/profile-context'
import { showToast } from './Toast'
import { inputCls, btnPrimary, btnSecondary, tableWrapCls } from '@/lib/cx'

// This section was moved from Settings.tsx into the Report page (Email tab).
// It manages only the email-related app_settings keys independently.

type Setting = { key: string; value: string; description: string; updated_at: string }
type SettingsMap = Record<string, string>

const EMAIL_KEYS = ['resend_api_key', 'email_from_name', 'email_from_address'] as const

// ─── Icons ────────────────────────────────────────────────────────────────────

function IconMail() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/>
    </svg>
  )
}
function IconEye() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/>
    </svg>
  )
}
function IconEyeOff() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94"/>
      <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19"/>
      <line x1="1" y1="1" x2="23" y2="23"/>
    </svg>
  )
}
function IconSend() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/>
    </svg>
  )
}
function IconCheck() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="20 6 9 17 4 12"/>
    </svg>
  )
}
function IconExternalLink() {
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/>
      <polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/>
    </svg>
  )
}
function IconSave() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z" />
      <polyline points="17 21 17 13 7 13 7 21" /><polyline points="7 3 7 8 15 8" />
    </svg>
  )
}

// ─── Section wrapper ──────────────────────────────────────────────────────────

function Section({ icon, title, description, children }: {
  icon: React.ReactNode; title: string; description?: string; children: React.ReactNode
}) {
  return (
    <div className={tableWrapCls}>
      <div className="px-5 py-4 border-b border-slate-100 flex items-center gap-3">
        <div className="w-8 h-8 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0">
          {icon}
        </div>
        <div>
          <h2 className="text-sm font-semibold text-slate-900">{title}</h2>
          {description && <p className="text-xs text-slate-400 mt-0.5">{description}</p>}
        </div>
      </div>
      <div className="p-5">{children}</div>
    </div>
  )
}

// ─── Field row ────────────────────────────────────────────────────────────────

function FieldRow({ label, description, children }: {
  label: string; description?: string | React.ReactNode; children: React.ReactNode
}) {
  return (
    <div className="flex flex-col md:flex-row md:gap-6 py-4 border-b border-slate-100 last:border-0 items-start gap-2">
      <div className="md:w-48 md:shrink-0 w-full">
        <p className="text-sm font-medium text-slate-700">{label}</p>
        {description && <p className="text-xs text-slate-400 mt-0.5 leading-relaxed">{description}</p>}
      </div>
      <div className="flex-1 w-full">{children}</div>
    </div>
  )
}

// ─── Main component ──────────────────────────────────────────────────────────

export default function EmailSettings() {
  const isAdmin = useIsAdmin()
  const me = useProfile()
  const supabase = createClient()

  const [settings, setSettings]   = useState<SettingsMap>({})
  const [draft, setDraft]         = useState<SettingsMap>({})
  const [loading, setLoading]     = useState(true)
  const [saving, setSaving]       = useState(false)
  const [loadError, setLoadError] = useState('')
  const [dirtyKeys, setDirtyKeys] = useState<Set<string>>(new Set())
  // Test send state
  const [showApiKey, setShowApiKey]   = useState(false)
  const [testEmail, setTestEmail]     = useState('')
  const [testSending, setTestSending] = useState(false)
  const [testResult, setTestResult]   = useState<{ ok: boolean; msg: string } | null>(null)

  const load = useCallback(async () => {
    setLoadError('')
    const { data, error } = await supabase
      .from('app_settings')
      .select('key, value, description, updated_at')
      .in('key', [...EMAIL_KEYS])
    if (error) { setLoadError(error.message); setLoading(false); return }
    const map: SettingsMap = {}
    for (const row of (data as Setting[])) map[row.key] = row.value ?? ''
    setSettings(map)
    setDraft(map)
    setDirtyKeys(new Set())
    setLoading(false)
  }, [supabase])

  useEffect(() => { load() }, [load])

  function set(key: string, value: string) {
    setDraft(prev => ({ ...prev, [key]: value }))
    setDirtyKeys(prev => new Set(prev).add(key))
  }

  async function saveAll() {
    if (dirtyKeys.size === 0) return
    setSaving(true)
    const results = await Promise.all(
      Array.from(dirtyKeys).map(key =>
        supabase.from('app_settings').upsert({ key, value: draft[key] ?? '', updated_by: me.id }, { onConflict: 'key' }),
      ),
    )
    const errors = results.map(r => r.error).filter(Boolean)
    setSaving(false)
    if (errors.length > 0) { showToast(errors[0]!.message, 'error'); return }
    setSettings({ ...draft })
    setDirtyKeys(new Set())
    showToast('บันทึกการตั้งค่าแล้ว')
  }

  function discard() {
    setDraft({ ...settings })
    setDirtyKeys(new Set())
  }

  async function testSendEmail() {
    if (!testEmail.trim()) { showToast('กรุณาใส่ email ที่จะทดสอบ', 'error'); return }
    // Save dirty keys first so the test uses the latest values
    if (dirtyKeys.size > 0) await saveAll()
    setTestSending(true)
    setTestResult(null)
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) { showToast('ไม่พบ session', 'error'); setTestSending(false); return }
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/send-report`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          test_recipient: testEmail.trim(),
          sections: ['summary', 'products', 'sales'],
          format: 'pdf',
          date_range_days: 30,
          report_name: 'ทดสอบระบบ Email',
        }),
      })
      const json = await res.json()
      if (json.ok) {
        setTestResult({ ok: true, msg: `ส่งสำเร็จ — เช็ค inbox ของ ${testEmail.trim()}` })
      } else {
        setTestResult({ ok: false, msg: json.error ?? 'เกิดข้อผิดพลาด' })
      }
    } catch (e: any) {
      setTestResult({ ok: false, msg: e.message })
    }
    setTestSending(false)
  }

  const isDirty = dirtyKeys.size > 0
  const val = (k: string) => draft[k] ?? ''

  if (!isAdmin) {
    return (
      <div className="p-6 flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <div className="text-4xl mb-3">🔒</div>
          <p className="text-sm text-slate-500">เฉพาะ admin เท่านั้นที่เข้าถึงหน้านี้ได้</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-5 max-w-3xl">

      {loadError && (
        <div className="bg-red-50 border border-red-100 rounded-2xl px-4 py-3 text-sm text-red-600 flex items-center gap-3">
          <span className="flex-1">โหลดการตั้งค่าไม่สำเร็จ: {loadError}</span>
          <button onClick={load} className="text-red-600 underline underline-offset-2 hover:no-underline shrink-0">ลองใหม่</button>
        </div>
      )}

      {loading ? (
        <div className={tableWrapCls}>
          <div className="h-14 bg-slate-50 border-b border-slate-100 animate-pulse" />
          <div className="p-5 space-y-4">
            {[...Array(3)].map((_, j) => <div key={j} className="h-10 bg-slate-100 rounded-xl animate-pulse" />)}
          </div>
        </div>
      ) : (
        <>
          <Section
            icon={<IconMail />}
            title="Email & การแจ้งเตือน"
            description="ตั้งค่า Resend API สำหรับส่ง Report อัตโนมัติ"
          >
            {/* Guide banner */}
            <div className="mb-5 bg-indigo-50 border border-indigo-100 rounded-2xl p-4 text-sm text-indigo-800 space-y-2">
              <p className="font-semibold flex items-center gap-1.5">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/>
                </svg>
                วิธีตั้งค่า Resend (ฟรี 3,000 emails/เดือน)
              </p>
              <ol className="space-y-1 pl-5 list-decimal text-xs text-indigo-700">
                <li>
                  สมัครที่{' '}
                  <a href="https://resend.com" target="_blank" rel="noopener noreferrer"
                    className="underline underline-offset-2 font-medium hover:text-indigo-900 inline-flex items-center gap-0.5">
                    resend.com <IconExternalLink />
                  </a>
                </li>
                <li>ไปที่ <strong>API Keys</strong> → <strong>Create API Key</strong> → Permission: Full access</li>
                <li>Copy key (ขึ้นต้นด้วย <code className="bg-indigo-100 px-1 rounded">re_</code>) มาวางในช่อง Resend API Key ด้านล่าง</li>
                <li>กด <strong>บันทึก</strong> แล้วทดสอบส่งได้เลย</li>
              </ol>
              <p className="text-xs text-indigo-600 pt-1 border-t border-indigo-100">
                ⚡ ทดสอบได้ทันทีโดยใช้ <code className="bg-indigo-100 px-1 rounded">From: reports@resend.dev</code> (default) — ไม่ต้อง verify domain
              </p>
            </div>

            <FieldRow label="Resend API Key" description="Key จาก resend.com/api-keys">
              <div className="relative max-w-md">
                <input
                  type={showApiKey ? 'text' : 'password'}
                  value={val('resend_api_key')}
                  onChange={e => set('resend_api_key', e.target.value)}
                  placeholder="re_xxxxxxxxxxxxxxxxxxxxxxxx"
                  className={`${inputCls} pr-10 font-mono text-sm`}
                />
                <button
                  type="button"
                  onClick={() => setShowApiKey(v => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700 transition-colors"
                  title={showApiKey ? 'ซ่อน' : 'แสดง'}
                >
                  {showApiKey ? <IconEyeOff /> : <IconEye />}
                </button>
              </div>
              {val('resend_api_key') && !val('resend_api_key').startsWith('re_') && (
                <p className="text-xs text-amber-600 mt-1.5">⚠️ API Key ควรขึ้นต้นด้วย <code>re_</code></p>
              )}
              {val('resend_api_key').startsWith('re_') && (
                <p className="text-xs text-emerald-600 mt-1.5 flex items-center gap-1"><IconCheck /> รูปแบบถูกต้อง</p>
              )}
            </FieldRow>

            <FieldRow label="ชื่อผู้ส่ง" description="แสดงใน inbox ของผู้รับ">
              <input
                value={val('email_from_name')}
                onChange={e => set('email_from_name', e.target.value)}
                placeholder="เช่น Nexo PMS"
                className={`${inputCls} max-w-xs`}
              />
            </FieldRow>

            <FieldRow
              label="Email ผู้ส่ง"
              description={
                <>
                  <span>ใช้ <code className="bg-slate-100 px-1 rounded text-[11px]">reports@resend.dev</code> สำหรับทดสอบ</span>
                  <br />
                  <span>ถ้ามี domain ให้ verify ที่ Resend แล้วเปลี่ยนมาใช้ของตัวเอง</span>
                </>
              }
            >
              <input
                value={val('email_from_address')}
                onChange={e => set('email_from_address', e.target.value)}
                placeholder="reports@resend.dev"
                className={`${inputCls} max-w-xs`}
              />
            </FieldRow>

            {/* Test send */}
            <FieldRow label="ทดสอบส่ง Email" description="ส่ง report ทดสอบไปที่ email ที่ระบุ">
              <div className="flex gap-2 items-start max-w-md flex-wrap">
                <input
                  type="email"
                  value={testEmail}
                  onChange={e => { setTestEmail(e.target.value); setTestResult(null) }}
                  placeholder="your@email.com"
                  className={`${inputCls} flex-1 min-w-0`}
                />
                <button
                  onClick={testSendEmail}
                  disabled={testSending || !testEmail.trim()}
                  className={`${btnPrimary} shrink-0 ${(testSending || !testEmail.trim()) ? 'opacity-50 cursor-not-allowed' : ''}`}
                >
                  {testSending ? (
                    <span className="flex items-center gap-1.5">
                      <svg className="animate-spin w-3.5 h-3.5" viewBox="0 0 24 24" fill="none">
                        <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" opacity=".3"/>
                        <path d="M12 2a10 10 0 0 1 10 10" stroke="currentColor" strokeWidth="4" strokeLinecap="round"/>
                      </svg>
                      กำลังส่ง…
                    </span>
                  ) : (
                    <><IconSend />ส่งทดสอบ</>
                  )}
                </button>
              </div>

              {testResult && (
                <div className={`mt-2.5 flex items-start gap-2 text-sm px-3.5 py-2.5 rounded-xl border ${
                  testResult.ok
                    ? 'bg-emerald-50 border-emerald-100 text-emerald-800'
                    : 'bg-red-50 border-red-100 text-red-700'
                }`}>
                  {testResult.ok
                    ? <span className="text-emerald-500 mt-0.5 shrink-0"><IconCheck /></span>
                    : <span className="text-red-500 mt-0.5 shrink-0">✕</span>}
                  <div>
                    <p className="font-medium">{testResult.ok ? 'ส่งสำเร็จ!' : 'เกิดข้อผิดพลาด'}</p>
                    <p className="text-xs mt-0.5 opacity-80">{testResult.msg}</p>
                    {!testResult.ok && testResult.msg.includes('setup_required') && (
                      <p className="text-xs mt-1 font-medium">→ ตรวจสอบ Resend API Key ด้านบน</p>
                    )}
                  </div>
                </div>
              )}
            </FieldRow>
          </Section>
        </>
      )}

      {/* Sticky save bar */}
      {isDirty && !loading && (
        <div className="sticky bottom-6 flex justify-end">
          <div className="flex items-center gap-2 bg-white border border-slate-200 rounded-2xl px-4 py-2.5 shadow-lg">
            <button onClick={discard} className={btnSecondary}>ยกเลิก</button>
            <button onClick={saveAll} disabled={saving} className={btnPrimary}>
              <IconSave />
              {saving ? 'กำลังบันทึก...' : 'บันทึกการตั้งค่า'}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
