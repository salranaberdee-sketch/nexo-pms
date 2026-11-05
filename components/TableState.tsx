'use client'

// Shared loading skeleton + empty state for data tables.
// Keeps table UX consistent across Products / Contents / Ads / Sales.

export function TableSkeleton({ cols, rows = 6 }: { cols: number; rows?: number }) {
  return (
    <>
      {[...Array(rows)].map((_, r) => (
        <tr key={r} className="border-b border-gray-50 last:border-0">
          {[...Array(cols)].map((_, c) => (
            <td key={c} className="px-4 py-3">
              <div
                className="h-4 bg-gray-100 rounded animate-pulse"
                style={{ width: `${50 + ((r + c) % 4) * 15}%` }}
              />
            </td>
          ))}
        </tr>
      ))}
    </>
  )
}

export function EmptyState({ message = 'ยังไม่มีข้อมูล' }: { message?: string }) {
  return (
    <tr>
      <td colSpan={100} className="px-4 py-16 text-center">
        <div className="flex flex-col items-center gap-2">
          <svg
            width="36" height="36" viewBox="0 0 24 24" fill="none"
            stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"
            className="text-gray-200"
          >
            <path d="M3 7v10a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-6l-2-2H5a2 2 0 0 0-2 2z" />
          </svg>
          <p className="text-sm text-gray-400">{message}</p>
        </div>
      </td>
    </tr>
  )
}

// Local date today as YYYY-MM-DD (timezone-safe for date-string comparisons).
export function todayStr(): string {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}
