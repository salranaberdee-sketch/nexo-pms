'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase'

// Pending approval page — shown when a logged-in user has not yet been approved by an admin.
// Polls every 30s so the user is redirected automatically once approved.
export default function PendingPage() {
  const router = useRouter()
  const supabase = createClient()
  const [profile, setProfile] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function check() {
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

      if (!data) {
        // Profile row not yet created by trigger — show generic pending
        setProfile({ name: session.user.email?.split('@')[0] || 'ผู้ใช้', approval_status: 'pending' })
      } else if (data.approval_status === 'approved') {
        router.replace('/dashboard')
        return
      } else {
        setProfile(data)
      }
      setLoading(false)
    }

    check()

    // Poll every 30 seconds — redirects automatically once admin approves
    const interval = setInterval(check, 30_000)
    return () => clearInterval(interval)
  }, [router, supabase])

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="text-center">
        <div className="w-8 h-8 border-2 border-gray-900 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
        <p className="text-sm text-gray-400">กำลังโหลด...</p>
      </div>
    </div>
  )

  const isRejected = profile?.approval_status === 'rejected'

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="max-w-md w-full mx-auto px-6">

        {/* Logo */}
        <div className="text-center mb-8">
          <div className="w-12 h-12 bg-gray-900 rounded-xl flex items-center justify-center mx-auto mb-4">
            <span className="text-white font-bold text-lg tracking-tight">N</span>
          </div>
          <p className="text-sm font-semibold text-gray-900">Nexo PMS</p>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 p-8 text-center">

          {isRejected ? (
            <>
              {/* Rejected state */}
              <div className="w-14 h-14 bg-red-50 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-red-500">
                  <circle cx="12" cy="12" r="10" />
                  <line x1="15" y1="9" x2="9" y2="15" />
                  <line x1="9" y1="9" x2="15" y2="15" />
                </svg>
              </div>
              <h1 className="text-lg font-semibold text-gray-900 mb-2">คำขอเข้าใช้งานถูกปฏิเสธ</h1>
              <p className="text-sm text-gray-500 leading-relaxed mb-1">
                สวัสดี <span className="font-medium text-gray-700">{profile?.name}</span>,
              </p>
              <p className="text-sm text-gray-500 leading-relaxed">
                ผู้ดูแลระบบปฏิเสธคำขอเข้าใช้งานของคุณ หากมีข้อสงสัยกรุณาติดต่อผู้ดูแลระบบโดยตรง
              </p>
            </>
          ) : (
            <>
              {/* Pending state */}
              <div className="w-14 h-14 bg-amber-50 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-amber-500">
                  <circle cx="12" cy="12" r="10" />
                  <polyline points="12 6 12 12 16 14" />
                </svg>
              </div>
              <h1 className="text-lg font-semibold text-gray-900 mb-2">รอการอนุมัติ</h1>
              <p className="text-sm text-gray-500 leading-relaxed mb-1">
                สวัสดี <span className="font-medium text-gray-700">{profile?.name}</span>,
              </p>
              <p className="text-sm text-gray-500 leading-relaxed">
                บัญชีของคุณกำลังรอผู้ดูแลระบบอนุมัติ หน้านี้จะเปลี่ยนไปหน้า Dashboard อัตโนมัติเมื่อได้รับการอนุมัติ
              </p>
              <div className="flex items-center justify-center gap-1.5 mt-4 text-xs text-gray-400">
                <span className="w-1.5 h-1.5 bg-amber-400 rounded-full animate-pulse" />
                กำลังตรวจสอบสถานะ...
              </div>
            </>
          )}
        </div>

        {/* Sign out */}
        <div className="text-center mt-6">
          <button
            onClick={() => supabase.auth.signOut().then(() => router.replace('/login'))}
            className="text-xs text-gray-400 hover:text-gray-900 transition-colors"
          >
            ออกจากระบบ
          </button>
        </div>
      </div>
    </div>
  )
}
