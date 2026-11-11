/**
 * Shared UI class constants — keeps styling consistent across all components.
 * Import what you need: import { inputCls, selectCls, ... } from '@/lib/cx'
 */

// ── Form inputs ─────────────────────────────────────────────────────────────
export const inputCls =
  'w-full border border-slate-200 rounded-xl px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 placeholder:text-slate-400 bg-white'

export const selectCls =
  'w-full border border-slate-200 rounded-xl px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white'

export const textareaCls =
  'w-full border border-slate-200 rounded-xl px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 placeholder:text-slate-400 bg-white resize-none'

// ── Table ────────────────────────────────────────────────────────────────────
/** Default table header cell */
export const thCls =
  'text-left px-4 py-3 text-[11px] font-semibold text-slate-400 whitespace-nowrap uppercase tracking-wide'

/** Right-aligned table header cell (numbers, amounts) */
export const thRightCls =
  'text-right px-4 py-3 text-[11px] font-semibold text-slate-400 whitespace-nowrap uppercase tracking-wide'

/** Default table data cell */
export const tdCls = 'px-4 py-3.5'

/** Right-aligned table data cell */
export const tdRightCls = 'px-4 py-3.5 text-right tabular-nums'

// ── Summary cards ────────────────────────────────────────────────────────────
export const cardCls =
  'bg-white rounded-2xl border border-slate-100 p-5 shadow-sm'

// ── Buttons ──────────────────────────────────────────────────────────────────
/** Primary action button */
export const btnPrimary =
  'flex items-center gap-2 bg-indigo-600 text-white px-4 py-2.5 rounded-xl text-sm font-medium hover:bg-indigo-500 active:bg-indigo-700 transition-colors shadow-sm'

/** Secondary / ghost button — min-h-[36px] on mobile for comfortable tap target */
export const btnSecondary =
  'flex items-center gap-1.5 px-3 py-2 sm:py-1.5 text-xs font-medium text-slate-600 bg-white border border-slate-200 hover:bg-slate-50 hover:border-slate-300 rounded-lg transition-colors'

/** Destructive ghost button — min-h-[36px] on mobile for comfortable tap target */
export const btnDanger =
  'flex items-center gap-1.5 px-3 py-2 sm:py-1.5 text-xs font-medium text-slate-400 hover:bg-red-50 hover:text-red-600 hover:border-red-200 border border-transparent rounded-lg transition-colors'

// ── Filter pill ──────────────────────────────────────────────────────────────
export const pillActive =
  'px-3.5 py-1.5 rounded-lg text-sm font-medium transition-colors border bg-indigo-600 text-white border-indigo-600'

export const pillInactive =
  'px-3.5 py-1.5 rounded-lg text-sm font-medium transition-colors border bg-white border-slate-200 text-slate-500 hover:bg-slate-50 hover:border-slate-300'

// ── Table container ──────────────────────────────────────────────────────────
export const tableWrapCls =
  'bg-white rounded-2xl border border-slate-100 overflow-hidden shadow-sm'

// ── Page section header ──────────────────────────────────────────────────────
export const sectionLabelCls =
  'text-[11px] font-semibold text-slate-400 uppercase tracking-widest'

// ── Mobile-safe page padding ──────────────────────────────────────────────────
/** Use instead of p-6 for top-level page wrapper */
export const pagePadCls = 'p-4 md:p-6 space-y-4 md:space-y-5'

// ── Mobile card — used as row replacement on small screens ────────────────────
export const mobileCardCls =
  'bg-white rounded-2xl border border-slate-100 p-4 shadow-sm'
