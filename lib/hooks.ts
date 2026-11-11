'use client'

/**
 * lib/hooks.ts — Shared React hooks used across multiple components.
 *
 * Rules:
 *  - Each hook must solve a cross-cutting concern, not a single-component need.
 *  - No business logic — only infrastructure (data fetching, event handling, etc.).
 */

import { useState, useEffect, useCallback, useRef } from 'react'

// ─── useFetch ─────────────────────────────────────────────────────────────────

export type FetchState<T> = {
  data:    T
  loading: boolean
  error:   string
  reload:  () => void
}

/**
 * Abstracts the loading/error/data/reload pattern that was copy-pasted into
 * every feature component.
 *
 * Usage:
 *   const { data: contents, loading, error, reload } = useFetch(
 *     async () => {
 *       const { data, error } = await supabase.from('contents').select('...')
 *       if (error) throw error
 *       return data ?? []
 *     },
 *     [] // initial value
 *   )
 *
 * The fetcher is called once on mount and again whenever `reload()` is called.
 * If the fetcher throws, `error` is set to the thrown message and `data` keeps
 * its previous value so the UI can show stale data + an error banner.
 *
 * @param fetcher  Async function that returns T. Should throw on failure.
 * @param initial  Initial value for `data` before the first fetch completes.
 */
export function useFetch<T>(fetcher: () => Promise<T>, initial: T): FetchState<T> {
  const [data, setData]       = useState<T>(initial)
  const [loading, setLoading] = useState(true)
  const [error, setError]     = useState('')
  // Guard against state updates on unmounted component
  const mounted = useRef(true)

  // Stable fetcher reference — consumers pass a new inline function each render,
  // but we only want to re-run on explicit reload() calls, not on every render.
  const fetcherRef = useRef(fetcher)
  useEffect(() => { fetcherRef.current = fetcher })

  const run = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const result = await fetcherRef.current()
      if (mounted.current) { setData(result); setLoading(false) }
    } catch (e: unknown) {
      if (mounted.current) {
        setError(e instanceof Error ? e.message : String(e))
        setLoading(false)
      }
    }
  }, []) // stable — intentionally no deps; fetcherRef handles updates

  useEffect(() => {
    mounted.current = true
    run()
    return () => { mounted.current = false }
  }, [run])

  return { data, loading, error, reload: run }
}

// ─── useEscapeKey ─────────────────────────────────────────────────────────────

/**
 * Calls `onEscape` when the Escape key is pressed.
 * Automatically removes the listener on unmount.
 * Commonly used to close modals and slide-in panels.
 *
 * @param onEscape  Callback to invoke when Escape is pressed.
 * @param active    If false, the listener is not registered (default true).
 */
export function useEscapeKey(onEscape: () => void, active = true): void {
  useEffect(() => {
    if (!active) return
    function handleKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onEscape()
    }
    window.addEventListener('keydown', handleKey)
    return () => window.removeEventListener('keydown', handleKey)
  }, [onEscape, active])
}

// ─── useClickOutside ──────────────────────────────────────────────────────────

/**
 * Calls `onClickOutside` when a mousedown event fires outside `ref`.
 * Used for dropdowns and floating panels.
 *
 * @param ref            React ref pointing to the container element.
 * @param onClickOutside Callback to invoke.
 * @param active         If false, the listener is not registered (default true).
 */
export function useClickOutside<T extends HTMLElement>(
  ref: React.RefObject<T | null>,
  onClickOutside: () => void,
  active = true,
): void {
  useEffect(() => {
    if (!active) return
    function handle(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        onClickOutside()
      }
    }
    document.addEventListener('mousedown', handle)
    return () => document.removeEventListener('mousedown', handle)
  }, [ref, onClickOutside, active])
}
