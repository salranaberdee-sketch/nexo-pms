'use client'

import { useEffect, useState, useCallback } from 'react'

export type ToastType = 'success' | 'error' | 'info'

export interface ToastMessage {
  id: number
  message: string
  type: ToastType
}

// Global toast queue — components call showToast() directly, no context needed.
let _listeners: ((t: ToastMessage) => void)[] = []
let _nextId = 1

export function showToast(message: string, type: ToastType = 'success') {
  const toast: ToastMessage = { id: _nextId++, message, type }
  _listeners.forEach(fn => fn(toast))
}

// Drop-in portal — place once inside AppLayout above <main>.
export function ToastContainer() {
  const [toasts, setToasts] = useState<ToastMessage[]>([])

  const add = useCallback((t: ToastMessage) => {
    setToasts(prev => [...prev, t])
    setTimeout(() => {
      setToasts(prev => prev.filter(x => x.id !== t.id))
    }, 3000)
  }, [])

  useEffect(() => {
    _listeners.push(add)
    return () => { _listeners = _listeners.filter(fn => fn !== add) }
  }, [add])

  if (toasts.length === 0) return null

  return (
    <div className="fixed bottom-5 right-5 z-50 flex flex-col gap-2 pointer-events-none">
      {toasts.map(t => (
        <div
          key={t.id}
          className={`flex items-center gap-2.5 px-4 py-3 rounded-xl shadow-lg text-sm font-medium
            pointer-events-auto animate-in slide-in-from-bottom-2 fade-in duration-200
            ${t.type === 'success' ? 'bg-emerald-600 text-white'
              : t.type === 'error' ? 'bg-red-600 text-white'
              : 'bg-white text-slate-900 border border-slate-100'}`}
        >
          {t.type === 'success' && (
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="20 6 9 17 4 12" />
            </svg>
          )}
          {t.type === 'error' && (
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" />
            </svg>
          )}
          {t.message}
        </div>
      ))}
    </div>
  )
}
