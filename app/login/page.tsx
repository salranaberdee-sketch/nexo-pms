'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase'
import { Eye, EyeOff, Mail, Lock, User, ArrowRight, CheckCircle } from 'lucide-react'

const TEST_ACCOUNTS = [
  { label: 'Admin',   email: 'admin@nexo.dev',   color: 'text-indigo-600 border-indigo-100 bg-indigo-50 hover:bg-indigo-100' },
  { label: 'Manager', email: 'manager@nexo.dev', color: 'text-blue-600 border-blue-100 bg-blue-50 hover:bg-blue-100' },
  { label: 'Editor',  email: 'editor@nexo.dev',  color: 'text-teal-600 border-teal-100 bg-teal-50 hover:bg-teal-100' },
  { label: 'Viewer',  email: 'viewer@nexo.dev',  color: 'text-slate-600 border-slate-100 bg-slate-100 hover:bg-slate-200' },
]

type Mode = 'login' | 'register' | 'forgot' | 'registered'

export default function LoginPage() {
  const router = useRouter()
  const supabase = createClient()

  const [mode, setMode]             = useState<Mode>('login')
  const [email, setEmail]           = useState('admin@nexo.dev')
  const [password, setPassword]     = useState('nexo1234')
  const [name, setName]             = useState('')
  const [error, setError]           = useState('')
  const [loading, setLoading]       = useState(false)
  const [checking, setChecking]     = useState(true)
  const [showPassword, setShowPassword] = useState(false)

  // Check if already logged in — redirect away immediately
  useEffect(() => {
    async function check() {
      const { data } = await supabase.auth.getSession()
      if (data.session?.user) {
        // Check approval status before redirecting
        const { data: profile } = await supabase
          .from('profiles')
          .select('approval_status')
          .eq('id', data.session.user.id)
          .single()
        if (profile?.approval_status === 'approved') {
          router.replace('/dashboard')
        } else {
          router.replace('/pending')
        }
      } else {
        setChecking(false)
      }
    }
    check()
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  function switchMode(next: Mode) {
    setMode(next)
    setError('')
    // Keep email across mode switch so user doesn't retype
    if (next === 'login') {
      setPassword('nexo1234')
    } else {
      setPassword('')
    }
  }

  // ── Login ──────────────────────────────────────────────────────
  async function handleLogin(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')

    const { data, error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) {
      setError('อีเมลหรือรหัสผ่านไม่ถูกต้อง')
      setLoading(false)
      return
    }

    // Check approval status after successful auth — before redirect
    const { data: profile } = await supabase
      .from('profiles')
      .select('approval_status')
      .eq('id', data.user.id)
      .single()

    if (profile?.approval_status === 'approved') {
      router.replace('/dashboard')
    } else {
      // pending or rejected — layout.tsx will also catch this, but be explicit
      router.replace('/pending')
    }
  }

  // ── Register ──────────────────────────────────────────────────
  async function handleRegister(e: React.FormEvent) {
    e.preventDefault()
    if (!name.trim()) { setError('กรุณากรอกชื่อเต็ม'); return }
    if (password.length < 6) { setError('รหัสผ่านต้องมีอย่างน้อย 6 ตัวอักษร'); return }
    setLoading(true)
    setError('')

    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { name: name.trim() } },
    })

    setLoading(false)

    if (error) {
      // Handle common errors with Thai messages
      if (error.message.includes('already registered') || error.message.includes('User already registered')) {
        setError('อีเมลนี้ถูกใช้งานแล้ว กรุณาเข้าสู่ระบบแทน')
      } else {
        setError(error.message)
      }
      return
    }

    // Success — show confirmation state (do NOT redirect to /dashboard)
    setMode('registered')
  }

  // ── Forgot password ───────────────────────────────────────────
  async function handleForgot(e: React.FormEvent) {
    e.preventDefault()
    if (!email) { setError('กรุณากรอกอีเมล'); return }
    setLoading(true)
    setError('')

    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/login`,
    })

    setLoading(false)

    if (error) {
      setError(error.message)
    } else {
      setError('__success__ส่งลิงก์รีเซ็ตรหัสผ่านไปที่อีเมลของคุณแล้ว กรุณาตรวจสอบกล่องจดหมาย')
    }
  }

  // ── Loading spinner ───────────────────────────────────────────
  if (checking) return (
    <div className="min-h-screen flex items-center justify-center bg-white">
      <div className="flex flex-col items-center gap-2.5">
        <div className="w-10 h-10 rounded-2xl bg-indigo-600 flex items-center justify-center shadow-lg shadow-indigo-200/40">
          <span className="text-white text-lg font-bold">N</span>
        </div>
        <div className="w-5 h-5 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin mt-1" />
      </div>
    </div>
  )

  // ── Registered success state ──────────────────────────────────
  if (mode === 'registered') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white px-4">
        <div className="w-full max-w-md text-center">
          <div className="w-16 h-16 bg-emerald-50 rounded-full flex items-center justify-center mx-auto mb-5">
            <CheckCircle className="text-emerald-500" size={32} strokeWidth={1.5} />
          </div>
          <h1 className="text-2xl font-bold text-slate-900 mb-2">สมัครสำเร็จแล้ว!</h1>
          <p className="text-slate-500 text-sm leading-relaxed mb-1">
            ยินดีต้อนรับ <span className="font-semibold text-slate-700">{name}</span>
          </p>
          <p className="text-slate-500 text-sm leading-relaxed mb-8">
            บัญชีของคุณกำลังรอผู้ดูแลระบบอนุมัติ<br />
            คุณจะได้รับการแจ้งเตือนเมื่อได้รับการอนุมัติ
          </p>
          <div className="bg-amber-50 border border-amber-100 rounded-2xl px-5 py-4 text-left mb-6">
            <p className="text-xs font-semibold text-amber-700 mb-1">ขั้นตอนถัดไป</p>
            <ol className="text-xs text-amber-700 space-y-1 list-decimal list-inside">
              <li>ผู้ดูแลระบบจะตรวจสอบคำขอของคุณ</li>
              <li>เมื่ออนุมัติแล้ว คุณจะเข้าใช้งานได้ทันที</li>
              <li>เข้าสู่ระบบและกดรอที่หน้ารออนุมัติได้เลย</li>
            </ol>
          </div>
          <button
            onClick={() => {
              // Auto-sign-in then redirect to pending page
              void supabase.auth.signInWithPassword({ email, password }).then(() => {
                router.replace('/pending')
              }).catch(() => router.replace('/login'))
            }}
            className="w-full bg-indigo-600 text-white py-3.5 rounded-2xl text-sm font-bold shadow-lg shadow-indigo-500/25 hover:bg-indigo-700 transition-all duration-200 flex items-center justify-center gap-2 mb-3"
          >
            ดูสถานะการอนุมัติ
            <ArrowRight size={14} strokeWidth={2} />
          </button>
          <button
            onClick={() => switchMode('login')}
            className="text-xs text-slate-400 hover:text-slate-700 transition-colors"
          >
            กลับหน้าเข้าสู่ระบบ
          </button>
        </div>
      </div>
    )
  }

  // ── Forgot password form ──────────────────────────────────────
  if (mode === 'forgot') {
    const isSent = error.startsWith('__success__')
    return (
      <div className="min-h-screen flex items-center justify-center bg-white px-4">
        <div className="w-full max-w-md">
          <div className="text-center mb-10">
            <div className="w-12 h-12 rounded-2xl bg-indigo-600 flex items-center justify-center mx-auto mb-4 shadow-lg shadow-indigo-200/40">
              <span className="text-white text-xl font-bold tracking-tighter">N</span>
            </div>
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight">รีเซ็ตรหัสผ่าน</h1>
            <p className="text-slate-500 text-sm mt-2">ระบุอีเมลที่ใช้สมัคร เราจะส่งลิงก์ให้</p>
          </div>

          {isSent ? (
            <div className="bg-emerald-50 border border-emerald-100 rounded-2xl px-5 py-6 text-center">
              <CheckCircle className="text-emerald-500 mx-auto mb-3" size={28} strokeWidth={1.5} />
              <p className="text-sm font-semibold text-emerald-800 mb-1">ส่งลิงก์แล้ว!</p>
              <p className="text-xs text-emerald-700">{error.replace('__success__', '')}</p>
            </div>
          ) : (
            <form onSubmit={handleForgot} className="space-y-5">
              <div className="space-y-1.5">
                <label className="block text-[11px] font-semibold text-slate-500 uppercase tracking-wider">อีเมล</label>
                <div className="relative group">
                  <Mail size={16} strokeWidth={1.5} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-indigo-600 transition-colors" />
                  <input
                    type="email" value={email} onChange={e => setEmail(e.target.value)} required
                    placeholder="your@email.com"
                    className="w-full border border-slate-200 rounded-xl px-4 py-3 pl-10 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-600/20 focus:border-indigo-600 transition-all placeholder:text-slate-300"
                  />
                </div>
              </div>
              {error && !error.startsWith('__success__') && (
                <p className="text-sm text-red-600 bg-red-50 border border-red-100 rounded-xl px-3.5 py-2.5">{error}</p>
              )}
              <button type="submit" disabled={loading}
                className="w-full bg-indigo-600 text-white py-3.5 rounded-2xl text-sm font-bold shadow-lg shadow-indigo-500/25 hover:bg-indigo-700 transition-all duration-200 disabled:opacity-70 flex items-center justify-center gap-2">
                {loading ? <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> : <>ส่งลิงก์รีเซ็ต <ArrowRight size={14} /></>}
              </button>
            </form>
          )}

          <div className="text-center mt-6">
            <button onClick={() => switchMode('login')} className="text-xs text-slate-400 hover:text-slate-700 transition-colors">
              ← กลับหน้าเข้าสู่ระบบ
            </button>
          </div>
        </div>
      </div>
    )
  }

  // ── Main login / register form ────────────────────────────────
  const isRegister = mode === 'register'
  const handleSubmit = isRegister ? handleRegister : handleLogin

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

        {/* Test account chips — login only */}
        {!isRegister && (
          <div className="mb-8 space-y-2">
            <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-widest mb-3">บัญชีทดสอบ</p>
            <div className="grid grid-cols-2 gap-2">
              {TEST_ACCOUNTS.map(({ label, email: acc, color }) => (
                <button
                  key={label}
                  type="button"
                  onClick={() => { setEmail(acc); setPassword('nexo1234') }}
                  className={`flex items-center justify-between gap-2 border px-3 py-2.5 rounded-xl text-xs font-medium transition-all duration-200 ${color}`}
                >
                  <span className="flex items-center gap-1.5">
                    <span className="font-bold">{label}</span>
                    <span className="font-normal opacity-60 truncate">{acc.split('@')[0]}</span>
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
            onClick={() => switchMode('login')}
            className={`flex-1 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 ${
              !isRegister ? 'bg-white shadow-sm shadow-slate-200/50 text-slate-900' : 'text-slate-400 hover:text-slate-600'
            }`}
          >
            เข้าสู่ระบบ
          </button>
          <button
            onClick={() => switchMode('register')}
            className={`flex-1 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 ${
              isRegister ? 'bg-white shadow-sm shadow-slate-200/50 text-slate-900' : 'text-slate-400 hover:text-slate-600'
            }`}
          >
            สมัครสมาชิก
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Name field — register only */}
          {isRegister && (
            <div className="space-y-1.5">
              <label className="block text-[11px] font-semibold text-slate-500 uppercase tracking-wider">ชื่อเต็ม</label>
              <div className="relative group">
                <User size={16} strokeWidth={1.5} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-indigo-600 transition-colors" />
                <input
                  type="text" value={name} onChange={e => setName(e.target.value)} required
                  placeholder="ชื่อนามสกุล"
                  className="w-full border border-slate-200 rounded-xl px-4 py-3 pl-10 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-600/20 focus:border-indigo-600 transition-all placeholder:text-slate-300"
                />
              </div>
            </div>
          )}

          {/* Email */}
          <div className="space-y-1.5">
            <label className="block text-[11px] font-semibold text-slate-500 uppercase tracking-wider">อีเมล</label>
            <div className="relative group">
              <Mail size={16} strokeWidth={1.5} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-indigo-600 transition-colors" />
              <input
                type="email" value={email} onChange={e => setEmail(e.target.value)} required
                placeholder="your@email.com"
                className="w-full border border-slate-200 rounded-xl px-4 py-3 pl-10 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-600/20 focus:border-indigo-600 transition-all placeholder:text-slate-300"
              />
            </div>
          </div>

          {/* Password */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="block text-[11px] font-semibold text-slate-500 uppercase tracking-wider">รหัสผ่าน</label>
            </div>
            <div className="relative group">
              <Lock size={16} strokeWidth={1.5} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-indigo-600 transition-colors" />
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={e => setPassword(e.target.value)}
                required
                minLength={6}
                placeholder={isRegister ? 'อย่างน้อย 6 ตัวอักษร' : '••••••••'}
                className="w-full border border-slate-200 rounded-xl px-4 py-3 pl-10 pr-12 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-600/20 focus:border-indigo-600 transition-all placeholder:text-slate-300"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 p-1.5 text-slate-400 hover:text-indigo-600 transition-all"
              >
                {showPassword ? <EyeOff size={15} strokeWidth={1.5} /> : <Eye size={15} strokeWidth={1.5} />}
              </button>
            </div>
            {isRegister && password.length > 0 && password.length < 6 && (
              <p className="text-[11px] text-red-500 mt-1">รหัสผ่านต้องมีอย่างน้อย 6 ตัวอักษร</p>
            )}
          </div>

          {/* Register note */}
          {isRegister && (
            <div className="bg-blue-50 border border-blue-100 rounded-xl px-3.5 py-3 text-xs text-blue-700 space-y-0.5">
              <p className="font-semibold">หมายเหตุ</p>
              <p>หลังสมัครสำเร็จ บัญชีจะอยู่ในสถานะ "รอการอนุมัติ" จนกว่าผู้ดูแลระบบจะอนุมัติ</p>
            </div>
          )}

          {/* Error message */}
          {error && (
            <div className={`rounded-xl border px-3.5 py-3 text-sm flex items-start gap-2.5 ${
              error.startsWith('__success__')
                ? 'bg-emerald-50 border-emerald-100 text-emerald-800'
                : 'bg-red-50 border-red-100 text-red-700'
            }`}>
              <span className="shrink-0 mt-0.5">
                {error.startsWith('__success__') ? '✓' : '!'}
              </span>
              <span>{error.startsWith('__success__') ? error.replace('__success__', '') : error}</span>
            </div>
          )}

          {/* Submit button */}
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-indigo-600 text-white py-3.5 rounded-2xl text-sm font-bold shadow-lg shadow-indigo-500/25 hover:bg-indigo-700 hover:shadow-indigo-500/40 hover:-translate-y-0.5 transition-all duration-200 disabled:opacity-70 disabled:cursor-not-allowed disabled:shadow-none disabled:hover:translate-y-0 active:scale-[0.98] flex items-center justify-center gap-2"
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

          {/* Forgot password link — login only, below submit for visibility */}
          {!isRegister && (
            <button
              type="button"
              onClick={() => switchMode('forgot')}
              className="w-full text-center text-sm text-slate-400 hover:text-indigo-600 transition-colors py-1"
            >
              ลืมรหัสผ่าน?
            </button>
          )}
        </form>
      </div>
    </div>
  )
}
