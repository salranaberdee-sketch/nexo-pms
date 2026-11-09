'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase'
import { Eye, EyeOff, Mail, Lock, User, ArrowRight } from 'lucide-react'

const TEST_ACCOUNTS = [
  { label: 'Admin',   email: 'admin@nexo.dev',   color: 'text-indigo-600 border-indigo-100 bg-indigo-50 hover:bg-indigo-100' },
  { label: 'Manager', email: 'manager@nexo.dev', color: 'text-blue-600 border-blue-100 bg-blue-50 hover:bg-blue-100' },
  { label: 'Editor',  email: 'editor@nexo.dev',  color: 'text-teal-600 border-teal-100 bg-teal-50 hover:bg-teal-100' },
  { label: 'Viewer',  email: 'viewer@nexo.dev',  color: 'text-slate-600 border-slate-100 bg-slate-100 hover:bg-slate-200' },
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
  const [showPassword, setShowPassword] = useState(false)

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
    <div className="min-h-screen flex items-center justify-center bg-white">
      <div className="flex flex-col items-center gap-2.5 animate-bounce">
        <div className="w-10 h-10 rounded-2xl bg-indigo-600 flex items-center justify-center shadow-lg shadow-indigo-200/40">
          <span className="text-white text-lg font-bold">N</span>
        </div>
        <p className="text-sm font-medium text-slate-500 tracking-wide uppercase">กำลังโหลด…</p>
      </div>
    </div>
  )

  return (
    <div className="min-h-screen flex items-center justify-center bg-white px-4">
      <div className="w-full max-w-md">
        {/* Brand */}
        <div className="text-center mb-10">
          <div className="w-12 h-12 rounded-2xl bg-indigo-600 flex items-center justify-center mx-auto mb-4 shadow-lg shadow-indigo-200/40">
            <span className="text-white text-xl font-bold tracking-tighter">N</span>
          </div>
          <h1 className="text-3xl font-bold text-slate-900 tracking-tight">Nexo PMS</h1>
          <p className="text-slate-500 text-sm mt-2">เข้าสู่ระบบเพื่อจัดการธุรกิจของคุณ</p>
        </div>

        {/* Test account chips */}
        {!isRegister && (
          <div className="mb-8 space-y-2">
            <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-widest mb-3">บัญชีทดสอบ</p>
            <div className="grid grid-cols-2 gap-2">
              {TEST_ACCOUNTS.map(({ label, email, color }) => (
                <button
                  key={label}
                  type="button"
                  onClick={() => { setEmail(email); setPassword('nexo1234') }}
                  className={`flex items-center justify-between gap-2 border px-3 py-2.5 rounded-xl text-xs font-medium transition-all duration-200 ${color}`}
                >
                  <span className="flex items-center gap-1.5">
                    <span className="font-bold">{label}</span>
                    <span className="font-normal opacity-60 truncate">{email.split('@')[0]}</span>
                  </span>
                  <ArrowRight size={12} strokeWidth={2} />
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Tab toggle */}
        <div className="flex items-center justify-center bg-slate-100 rounded-2xl p-1 mb-8 border border-slate-200">
          <button
            onClick={() => setIsRegister(false)}
            className={`flex-1 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 ${
              !isRegister ? 'bg-white shadow-sm shadow-slate-200/50 text-slate-900' : 'text-slate-400 hover:text-slate-600'
            }`}
          >
            เข้าสู่ระบบ
          </button>
          <button
            onClick={() => setIsRegister(true)}
            className={`flex-1 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 ${
              isRegister ? 'bg-white shadow-sm shadow-slate-200/50 text-slate-900' : 'text-slate-400 hover:text-slate-600'
            }`}
          >
            สมัครสมาชิก
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          {isRegister && (
            <div className="space-y-1.5">
              <label className="block text-[11px] font-semibold text-slate-500 uppercase tracking-wider">ชื่อเต็ม</label>
              <div className="relative group">
                <User size={16} strokeWidth={1.5} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-indigo-600 transition-colors" />
                <input
                  type="text" value={name} onChange={e => setName(e.target.value)} required
                  placeholder="ชื่อของคุณ"
                  className="w-full border border-slate-200 rounded-xl px-4 py-3 pl-10 pr-4 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-600/20 focus:border-indigo-600 transition-all placeholder:text-slate-300"
                />
              </div>
            </div>
          )}
          <div className="space-y-1.5">
            <label className="block text-[11px] font-semibold text-slate-500 uppercase tracking-wider">อีเมล</label>
            <div className="relative group">
              <Mail size={16} strokeWidth={1.5} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-indigo-600 transition-colors" />
              <input
                type="email" value={email} onChange={e => setEmail(e.target.value)} required
                placeholder="your@email.com"
                className="w-full border border-slate-200 rounded-xl px-4 py-3 pl-10 pr-4 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-600/20 focus:border-indigo-600 transition-all placeholder:text-slate-300"
              />
            </div>
          </div>
          <div className="space-y-1.5">
            <label className="block text-[11px] font-semibold text-slate-500 uppercase tracking-wider">รหัสผ่าน</label>
            <div className="relative group">
              <Lock size={16} strokeWidth={1.5} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-indigo-600 transition-colors" />
              <input
                type={showPassword ? 'text' : 'password'} value={password} onChange={e => setPassword(e.target.value)} required minLength={6}
                placeholder="••••••••"
                className="w-full border border-slate-200 rounded-xl px-4 py-3 pl-10 pr-12 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-600/20 focus:border-indigo-600 transition-all placeholder:text-slate-300"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 p-1.5 text-slate-400 hover:text-indigo-600 transition-all group-hover:text-slate-600"
              >
                {showPassword ? <EyeOff size={15} strokeWidth={1.5} /> : <Eye size={15} strokeWidth={1.5} />}
              </button>
            </div>
          </div>

          {error && (
            <div className="rounded-lg border px-3.5 py-2.5 text-sm flex items-start gap-3 ${
              error.includes('สมัครสำเร็จ')
                ? 'bg-emerald-50 border-emerald-100 text-emerald-800'
                : 'bg-red-50 border-red-100 text-red-700'
            }">
              {error.includes('สมัครสำเร็จ') ? (
                <span className="mt-0.5 flex-shrink-0 text-emerald-500">✓</span>
              ) : (
                <span className="mt-0.5 flex-shrink-0 text-red-500">!</span>
              )}
              <span>{error}</span>
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-indigo-600 text-white py-3.5 rounded-2xl text-sm font-bold shadow-lg shadow-indigo-500/25 hover:bg-indigo-700 hover:shadow-indigo-500/40 hover:-translate-y-0.5 transition-all duration-200 disabled:opacity-70 disabled:cursor-not-allowed disabled:shadow-none active:scale-[0.98] flex items-center justify-center gap-2"
          >
            {loading ? (
              <span className="flex items-center justify-center gap-2">
                <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                กำลังดำเนินการ…
              </span>
            ) : (
              <>
                {isRegister ? 'สร้างบัญชี' : 'เข้าสู่ระบบ'}
                <ArrowRight size={14} strokeWidth={2} />
              </>
            )}
          </button>
        </form>
      </div>
    </div>
  )
}
