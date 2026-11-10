'use client'

import { useEffect, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase'

// Pending approval page — shown when a logged-in user has not yet been approved.
// Polls every 15s and redirects automatically once approved.
// Also handles rejected state with clear next steps.
export default function PendingPage() {
  const router = useRouter()
  const supabase = createClient()

  const [profile, setProfile] = useState<{ name: string; email: string; approval_status: string } | null>(null)
  const [loading, setLoading] = useState(true)
  const [signingOut, setSigningOut] = useState(false)
  const [lastChecked, setLastChecked] = useState<Date | null>(null)

  const check = useCallback(async () => {
    const { data: { session } } = await supabase.auth.getSession()
    if (!session?.user) {
      router.replace('/login')
      return
    }

    const { data } = await supabase
      .from('profiles')
      .select('name, email, approval_status')
      .eq('id', session.user.id)
      .single()

    setLastChecked(new Date())

    if (!data) {
      // Profile row not yet created by trigger (edge case — trigger runs async)
      setProfile({ name: session.user.email?.split('@')[0] || 'ผู้ใช้', email: session.user.email || '', approval_status: 'pending' })
    } else if (data.approval_status === 'approved') {
      // Auto-redirect on approval
      router.replace('/dashboard')
      return
    } else {
      setProfile(data)
    }
    setLoading(false)
  }, [router, supabase])

  useEffect(() => {
    check()
    // Poll every 15 seconds — fast enough to feel responsive, light enough for Supabase hobby tier
    const interval = setInterval(check, 15_000)
    return () => clearInterval(interval)
  }, [check])

  async function signOut() {
    setSigningOut(true)
    await supabase.auth.signOut()
    router.replace('/login')
  }

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: 'var(--color-canvas)' }}>
      <div className="text-center">
        <div className="w-9 h-9 border-[3px] border-indigo-500 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
        <p className="text-sm text-slate-400">กำลังโหลด...</p>
      </div>
    </div>
  )

  const isRejected = profile?.approval_status === 'rejected'
  const checkedLabel = lastChecked
    ? lastChecked.toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit', second: '2-digit' })
    : ''

  return (
    <div className="min-h-screen flex items-center justify-center px-4" style={{ backgroundColor: 'var(--color-canvas)' }}>
      <div className="max-w-md w-full mx-auto">

        {/* Logo */}
        <div className="text-center mb-8">
          <div className="w-12 h-12 rounded-xl flex items-center justify-center mx-auto mb-4"
            style={{ background: 'linear-gradient(135deg, #6366f1, #8b5cf6)' }}>
            <span className="text-white font-bold text-lg tracking-tight">N</span>
          </div>
          <p className="text-sm font-semibold text-slate-900">Nexo PMS</p>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200 p-8 shadow-sm">
          {isRejected ? (
            /* ── Rejected state ──────────────────────────────── */
            <>
              <div className="w-14 h-14 bg-red-50 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-red-500">
                  <circle cx="12" cy="12" r="10" />
                  <line x1="15" y1="9" x2="9" y2="15" />
                  <line x1="9" y1="9" x2="15" y2="15" />
                </svg>
              </div>
              <h1 className="text-lg font-semibold text-slate-900 mb-2 text-center">คำขอถูกปฏิเสธ</h1>
              <p className="text-sm text-slate-500 leading-relaxed text-center mb-1">
                สวัสดี <span className="font-medium text-slate-700">{profile?.name}</span>
              </p>
              <p className="text-sm text-slate-500 leading-relaxed text-center mb-6">
                ผู้ดูแลระบบปฏิเสธคำขอเข้าใช้งานของคุณ
              </p>
              <div className="bg-slate-50 border border-slate-100 rounded-xl px-4 py-3.5 text-xs text-slate-600 space-y-1.5 mb-6">
                <p className="font-semibold text-slate-700">ตัวเลือกของคุณ</p>
                <p>• ติดต่อผู้ดูแลระบบโดยตรงเพื่อขอสิทธิ์เพิ่มเติม</p>
                <p>• สมัครด้วยอีเมลอื่นหากต้องการ</p>
              </div>
              <button
                onClick={signOut}
                disabled={signingOut}
                className="w-full bg-slate-900 text-white py-3 rounded-xl text-sm font-semibold hover:bg-slate-700 transition-colors disabled:opacity-50"
              >
                {signingOut ? 'กำลังออกจากระบบ...' : 'ออกจากระบบ / สมัครใหม่'}
              </button>
            </>
          ) : (
            /* ── Pending state ───────────────────────────────── */
            <>
              <div className="w-14 h-14 bg-amber-50 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-amber-500">
                  <circle cx="12" cy="12" r="10" />
                  <polyline points="12 6 12 12 16 14" />
                </svg>
              </div>
              <h1 className="text-lg font-semibold text-slate-900 mb-2 text-center">รอการอนุมัติ</h1>
              <p className="text-sm text-slate-500 leading-relaxed text-center mb-1">
                สวัสดี <span className="font-medium text-slate-700">{profile?.name}</span>
              </p>
              <p className="text-sm text-slate-500 leading-relaxed text-center mb-6">
                บัญชีของคุณกำลังรอผู้ดูแลระบบอนุมัติ<br />
                หน้านี้จะเปลี่ยนไป Dashboard อัตโนมัติเมื่อได้รับการอนุมัติ
              </p>

              {/* Status indicator */}
              <div className="bg-amber-50 border border-amber-100 rounded-xl px-4 py-3 text-center mb-6">
                <div className="flex items-center justify-center gap-2 text-xs text-amber-700">
                  <span className="w-1.5 h-1.5 bg-amber-400 rounded-full animate-pulse" />
                  <span>ตรวจสอบสถานะอัตโนมัติทุก 15 วินาที</span>
                </div>
                {checkedLabel && (
                  <p className="text-[10px] text-amber-500 mt-1">ตรวจสอบล่าสุด {checkedLabel}</p>
                )}
              </div>

              {/* Manual refresh */}
              <button
                onClick={check}
                className="w-full border border-slate-200 text-slate-600 py-2.5 rounded-xl text-sm font-medium hover:bg-slate-50 transition-colors mb-3"
              >
                ตรวจสอบสถานะตอนนี้
              </button>
            </>
          )}
        </div>

        {/* Sign out link */}
        {!isRejected && (
          <div className="text-center mt-5">
            <button
              onClick={signOut}
              disabled={signingOut}
              className="text-xs text-slate-400 hover:text-slate-700 transition-colors disabled:opacity-50"
            >
              {signingOut ? 'กำลังออกจากระบบ...' : 'ออกจากระบบ'}
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
