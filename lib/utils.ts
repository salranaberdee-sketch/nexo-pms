/**
 * lib/utils.ts — Shared pure utility functions.
 *
 * Rules:
 *  - No imports from React, Supabase, or any component.
 *  - Every function must be pure and free of side-effects.
 *  - Prefer explicit types over `any`.
 */

// ─── Date helpers ─────────────────────────────────────────────────────────────

/**
 * Returns today's date as a YYYY-MM-DD string using local timezone.
 * Safe for date-string comparisons (deadline < todayStr()).
 * Previously lived in components/TableState.tsx — centralised here so
 * non-table components (Dashboard, etc.) can import without pulling in
 * React component code.
 */
export function todayStr(): string {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

/**
 * Returns the number of days between two YYYY-MM-DD strings.
 * Positive = target is in the future, negative = in the past.
 */
export function daysDiff(from: string, to: string): number {
  return Math.round((new Date(to).getTime() - new Date(from).getTime()) / 86_400_000)
}

/**
 * Formats a YYYY-MM-DD string to a Thai locale short date, e.g. "5 ม.ค. 68".
 * Returns '—' for empty/null values.
 */
export function formatDateTH(dateStr: string | null | undefined): string {
  if (!dateStr) return '—'
  return new Date(dateStr).toLocaleDateString('th-TH', {
    day: 'numeric',
    month: 'short',
    year: '2-digit',
  })
}

/**
 * Formats a YYYY-MM string (e.g. "2026-11") to Thai short month-year "พ.ย. 69".
 * Returns the raw string if parsing fails.
 */
export function formatMonthTH(monthStr: string | null | undefined): string {
  if (!monthStr) return '—'
  const [year, month] = monthStr.split('-').map(Number)
  if (!year || !month) return monthStr
  return new Date(year, month - 1, 1).toLocaleDateString('th-TH', {
    month: 'short',
    year: '2-digit',
  })
}

// ─── Number / currency helpers ────────────────────────────────────────────────

/**
 * Formats a number as Thai Baht with thousand separators.
 * e.g. formatBaht(1234567.5) → "฿1,234,568"
 * Returns "—" for null/undefined.
 */
export function formatBaht(value: number | null | undefined): string {
  if (value == null) return '—'
  return `฿${Math.round(value).toLocaleString('th-TH')}`
}

/**
 * Formats a number as Thai Baht with decimal places.
 * e.g. formatBahtDecimal(1234567.56) → "฿1,234,567.56"
 */
export function formatBahtDecimal(value: number | null | undefined, decimals = 2): string {
  if (value == null) return '—'
  return `฿${value.toLocaleString('th-TH', { minimumFractionDigits: decimals, maximumFractionDigits: decimals })}`
}

/**
 * Formats a plain number with thousand separators.
 * e.g. formatNumber(12345) → "12,345"
 */
export function formatNumber(value: number | null | undefined): string {
  if (value == null) return '—'
  return value.toLocaleString('th-TH')
}

/**
 * Formats a ratio as a percentage string.
 * e.g. formatPct(0.753) → "75.3%"
 */
export function formatPct(value: number | null | undefined, decimals = 1): string {
  if (value == null) return '—'
  return `${(value * 100).toFixed(decimals)}%`
}

// ─── String helpers ───────────────────────────────────────────────────────────

/**
 * Returns the first character of a string, uppercased, for avatar initials.
 * Returns '?' for empty strings.
 */
export function initial(name: string | null | undefined): string {
  if (!name) return '?'
  return name[0].toUpperCase()
}

/**
 * Splits a comma-separated settings string into a trimmed string array.
 * Returns [] for empty/null input.
 */
export function parseCSV(raw: string | null | undefined): string[] {
  if (!raw) return []
  return raw.split(',').map(s => s.trim()).filter(Boolean)
}

/**
 * Clamps a number between min and max (inclusive).
 */
export function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max)
}
