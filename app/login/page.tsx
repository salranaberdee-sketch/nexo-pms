'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase'

// Feature list for login branding panel
const FEATURES = [
  'จัดการ Product ทุกประเภท',
  'ติดตาม Content workflow',
  'วิเคราะห์ Ads และ ROI',
  'กรอกยอดขายและติดตามเป้า',
]

export default function LoginPage() {
  const router = useRouter()
  const supabase = createClient()

  const [email, setEmail]           = useState('admin@nexo.dev')
  const [password, setPassword]     = useState('nexo1234')
  const [isRegister, setIsRegister] = useState(false)
  const [name, setName]             = useState('')
  const [error, setError]           = useState('')
  const [loading, setLoading]       = useState(false)
  const [checking, setChecking]     = useState(true)

  // Redirect to dashboard if already authenticated
  useEffect(() => {
    async function check() {
      const { data } = await supabase.auth.getSession()
      if (data.session?.user) router.replace('/dashboard')
      else setChecking(false)
    }
    check()
  }, [router, supabase])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')
    if (isRegister) {
      const { error } = await supabase.auth.signUp({ email, password, options: { data: { name } } })
      if (error) setError(error.message)
      else setError('สมัครสำเร็จ กรุณารอผู้ดูแลระบบอนุมัติก่อนเข้าใช้งาน')
    } else {
      const { error } = await supabase.auth.signInWithPassword({ email, password })
      if (error) setError('อีเมลหรือรหัสผ่านไม่ถูกต้อง')
      else router.replace('/dashboard')
    }
    setLoading(false)
  }

  if (checking) return (
    <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: 'var(--color-canvas)' }}>
      <div className="text-center">
        <div className="w-9 h-9 border-[3px] border-indigo-500 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
        <p className="text-sm text-slate-400">กำลังโหลด...</p>
      </div>
    </div>
  )

  return (
    <div className="min-h-screen flex bg-slate-950">

      {/* Left — Branding */}
      <div className="hidden lg:flex flex-1 flex-col justify-center px-16">
        <div className="w-10 h-10 rounded-xl flex items-center justify-center mb-10" style={{ background: 'linear-gradient(135deg, #6366f1, #8b5cf6)' }}>
          <span className="text-white text-lg font-bold">N</span>
        </div>
        <h1 className="text-3xl font-semibold text-white mb-3">Nexo PMS</h1>
        <p className="text-slate-400 text-base mb-10 leading-relaxed">
          ระบบจัดการสินค้า, Content, Ads<br />และยอดขาย ในที่เดียว
        </p>
        <ul className="space-y-3">
          {FEATURES.map(t => (
            <li key={t} className="flex items-center gap-3 text-slate-400 text-sm">
              <span className="w-1.5 h-1.5 bg-indigo-400 rounded-full shrink-0" />
              {t}
            </li>
          ))}
        </ul>
      </div>

      {/* Right — Form */}
      <div className="flex-1 flex items-center justify-center p-8 bg-white">
        <div className="w-full max-w-sm">

          {/* Mobile logo */}
          <div className="lg:hidden text-center mb-8">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center mx-auto mb-3" style={{ background: 'linear-gradient(135deg, #6366f1, #8b5cf6)' }}>
              <span className="text-white text-lg font-bold">N</span>
            </div>
            <p className="text-lg font-semibold text-slate-900">Nexo PMS</p>
          </div>

          <div className="mb-7">
            <h2 className="text-2xl font-semibold text-slate-900">
              {isRegister ? 'สร้างบัญชี' : 'ยินดีต้อนรับ'}
            </h2>
            <p className="text-sm text-slate-400 mt-1">
              {isRegister ? 'กรอกข้อมูลเพื่อสมัครสมาชิก' : 'เข้าสู่ระบบเพื่อจัดการสินค้า'}
            </p>
          </div>

          {/* Test account hint */}
          {!isRegister && (
            <div className="bg-slate-50 border border-slate-200 rounded-xl p-3.5 mb-6">
              <p className="text-xs font-medium text-slate-500 mb-2">Test Account</p>
              <button
                onClick={() => { setEmail('admin@nexo.dev'); setPassword('nexo1234') }}
                className="text-xs bg-white border border-slate-200 text-slate-700 px-3 py-1.5 rounded-lg hover:bg-slate-100 transition-colors font-medium"
              >
                Admin — admin@nexo.dev
              </button>
            </div>
          )}

          {/* Tab toggle */}
          <div className="flex bg-slate-100 rounded-xl p-1 mb-6">
            <button
              onClick={() => setIsRegister(false)}
              className={`flex-1 py-2 rounded-lg text-sm font-medium transition-all ${!isRegister ? 'bg-white shadow-sm text-slate-900' : 'text-slate-400'}`}
            >
              เข้าสู่ระบบ
            </button>
            <button
              onClick={() => setIsRegister(true)}
              className={`flex-1 py-2 rounded-lg text-sm font-medium transition-all ${isRegister ? 'bg-white shadow-sm text-slate-900' : 'text-slate-400'}`}
            >
              สมัครสมาชิก
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {isRegister && (
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1.5">ชื่อ</label>
                <input
                  type="text" value={name} onChange={e => setName(e.target.value)} required
                  placeholder="ชื่อของคุณ"
                  className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 placeholder:text-slate-400"
                />
              </div>
            )}
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1.5">อีเมล</label>
              <input
                type="email" value={email} onChange={e => setEmail(e.target.value)} required
                placeholder="your@email.com"
                className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 placeholder:text-slate-400"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1.5">รหัสผ่าน</label>
              <input
                type="password" value={password} onChange={e => setPassword(e.target.value)} required minLength={6}
                placeholder="••••••••"
                className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 placeholder:text-slate-400"
              />
            </div>

            {error && (
              <p className={`text-sm px-3.5 py-2.5 rounded-lg ${
                error.includes('สมัครสำเร็จ')
                  ? 'bg-emerald-50 text-emerald-700 border border-emerald-100'
                  : 'bg-red-50 text-red-600 border border-red-100'
              }`}>
                {error}
              </p>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-indigo-600 text-white py-3 rounded-xl text-sm font-semibold hover:bg-indigo-500 transition-colors disabled:opacity-50 mt-1"
            >
              {loading
                ? <span className="flex items-center justify-center gap-2">
                    <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    กำลังดำเนินการ...
                  </span>
                : isRegister ? 'สร้างบัญชี' : 'เข้าสู่ระบบ'
              }
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}
