'use client'

import { useState, useRef, useCallback } from 'react'
import { createClient } from '@/lib/supabase'
import { useProfile } from '@/lib/profile-context'
import { showToast } from './Toast'
import { btnPrimary, btnSecondary, btnDanger, tableWrapCls } from '@/lib/cx'

// ─── Types ────────────────────────────────────────────────────────────────────

interface BackupMeta {
  version: string
  created_at: string
  created_by_email: string
  tables: string[]
  row_counts: Record<string, number>
}

interface BackupFile {
  meta: BackupMeta
  data: Record<string, any[]>
}

type ImportMode = 'upsert' | 'replace'
type TableStatus = 'pending' | 'running' | 'done' | 'error' | 'skipped'

interface TableProgress {
  status: TableStatus
  processed: number
  total: number
  error?: string
}

// ─── Tables config — ลำดับ dependency (parent ก่อน child) ──────────────────

const BACKUP_TABLES = [
  { name: 'categories',    label: 'Categories',    pk: 'id' },
  { name: 'content_types', label: 'Content Types', pk: 'id' },
  { name: 'products',      label: 'Products',      pk: 'id' },
  { name: 'product_briefs',label: 'Product Briefs', pk: 'id' },
  { name: 'contents',      label: 'Contents',      pk: 'id' },
  { name: 'ads',           label: 'Ads',           pk: 'id' },
  { name: 'sales',         label: 'Sales',         pk: 'id' },
  { name: 'leads',         label: 'Leads',         pk: 'id' },
]

// Generated columns — ห้าม insert/update โดยตรง (DB คำนวณเอง)
const GENERATED_COLUMNS: Record<string, string[]> = {
  ads: ['budget_total', 'budget_remaining', 'cpl', 'roas'],
}

const BACKUP_VERSION = '1.0'
const CHUNK_SIZE = 100  // upsert ทีละ 100 rows เพื่อไม่ให้ request ใหญ่เกิน

// ─── Helpers ──────────────────────────────────────────────────────────────────

function stripGeneratedColumns(table: string, rows: any[]): any[] {
  const cols = GENERATED_COLUMNS[table]
  if (!cols || cols.length === 0) return rows
  return rows.map(row => {
    const clean = { ...row }
    cols.forEach(c => delete clean[c])
    return clean
  })
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleString('th-TH', {
    year: 'numeric', month: 'short', day: 'numeric',
    hour: '2-digit', minute: '2-digit',
  })
}

function fileSize(bytes: number) {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`
}

// ─── Icons ────────────────────────────────────────────────────────────────────

function IconDownload() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
      <polyline points="7 10 12 15 17 10"/>
      <line x1="12" y1="15" x2="12" y2="3"/>
    </svg>
  )
}

function IconUpload() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
      <polyline points="17 8 12 3 7 8"/>
      <line x1="12" y1="3" x2="12" y2="15"/>
    </svg>
  )
}

function IconShield() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
    </svg>
  )
}

function IconRefresh() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="23 4 23 10 17 10"/>
      <polyline points="1 20 1 14 7 14"/>
      <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"/>
    </svg>
  )
}

function IconCheck() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="20 6 9 17 4 12"/>
    </svg>
  )
}

function IconX() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
    </svg>
  )
}

function IconFile() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M13 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z"/>
      <polyline points="13 2 13 9 20 9"/>
    </svg>
  )
}

function Spinner({ size = 14 }: { size?: number }) {
  return (
    <svg className="animate-spin" width={size} height={size} viewBox="0 0 24 24" fill="none">
      <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" opacity=".25"/>
      <path d="M12 2a10 10 0 0 1 10 10" stroke="currentColor" strokeWidth="4" strokeLinecap="round"/>
    </svg>
  )
}

// ─── Section wrapper (matches Settings.tsx style) ─────────────────────────────

function Section({ icon, title, description, children }: {
  icon: React.ReactNode; title: string; description?: string; children: React.ReactNode
}) {
  return (
    <div className={tableWrapCls}>
      <div className="px-5 py-4 border-b border-slate-100 flex items-center gap-3">
        <div className="w-8 h-8 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0">
          {icon}
        </div>
        <div>
          <h2 className="text-sm font-semibold text-slate-900">{title}</h2>
          {description && <p className="text-xs text-slate-400 mt-0.5">{description}</p>}
        </div>
      </div>
      <div className="p-5">{children}</div>
    </div>
  )
}

// ─── Status badge for progress table ─────────────────────────────────────────

function StatusBadge({ status }: { status: TableStatus }) {
  if (status === 'pending')  return <span className="text-xs text-slate-400">รอดำเนินการ</span>
  if (status === 'running')  return <span className="flex items-center gap-1 text-xs text-indigo-600"><Spinner size={12} />กำลังทำ...</span>
  if (status === 'done')     return <span className="flex items-center gap-1 text-xs text-emerald-600"><IconCheck />สำเร็จ</span>
  if (status === 'error')    return <span className="flex items-center gap-1 text-xs text-red-500"><IconX />ผิดพลาด</span>
  if (status === 'skipped')  return <span className="text-xs text-slate-400">ข้ามไป</span>
  return null
}

// ─── Export Section ───────────────────────────────────────────────────────────

function ExportSection() {
  const supabase = createClient()
  const me = useProfile()
  const [exporting, setExporting] = useState(false)
  const [progress, setProgress] = useState<Record<string, TableProgress>>({})
  const [lastExport, setLastExport] = useState<{ time: string; size: string } | null>(null)

  const handleExport = useCallback(async () => {
    setExporting(true)
    setProgress({})

    const data: Record<string, any[]> = {}
    const rowCounts: Record<string, number> = {}
    const init: Record<string, TableProgress> = {}
    BACKUP_TABLES.forEach(t => {
      init[t.name] = { status: 'pending', processed: 0, total: 0 }
    })
    setProgress(init)

    try {
      for (const { name } of BACKUP_TABLES) {
        setProgress(prev => ({ ...prev, [name]: { ...prev[name], status: 'running' } }))

        const { data: rows, error } = await supabase
          .from(name)
          .select('*')
          .order('id', { ascending: true })

        if (error) {
          setProgress(prev => ({
            ...prev,
            [name]: { status: 'error', processed: 0, total: 0, error: error.message },
          }))
          // ไม่หยุด — export table อื่นต่อ
          data[name] = []
          rowCounts[name] = 0
          continue
        }

        const fetched = rows ?? []
        data[name] = fetched
        rowCounts[name] = fetched.length
        setProgress(prev => ({
          ...prev,
          [name]: { status: 'done', processed: fetched.length, total: fetched.length },
        }))
      }

      // Build backup file
      const backup: BackupFile = {
        meta: {
          version: BACKUP_VERSION,
          created_at: new Date().toISOString(),
          created_by_email: me.email,
          tables: BACKUP_TABLES.map(t => t.name),
          row_counts: rowCounts,
        },
        data,
      }

      const json = JSON.stringify(backup, null, 2)
      const blob = new Blob([json], { type: 'application/json' })
      const url  = URL.createObjectURL(blob)
      const a    = document.createElement('a')
      const ts   = new Date().toISOString().slice(0, 16).replace('T', '_').replace(':', '-')
      a.href     = url
      a.download = `nexo-backup-${ts}.json`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)

      const totalRows = Object.values(rowCounts).reduce((s, n) => s + n, 0)
      const sz = fileSize(blob.size)
      setLastExport({ time: new Date().toLocaleString('th-TH'), size: sz })
      showToast(`Export สำเร็จ — ${totalRows.toLocaleString()} รายการ (${sz})`)
    } catch (err: any) {
      showToast(err?.message ?? 'Export ล้มเหลว', 'error')
    } finally {
      setExporting(false)
    }
  }, [supabase, me.email])

  const totalRows = Object.values(progress).reduce((s, p) => s + p.processed, 0)
  const doneCount = Object.values(progress).filter(p => p.status === 'done').length
  const hasProgress = Object.keys(progress).length > 0

  return (
    <Section
      icon={<IconDownload />}
      title="สำรองข้อมูล (Export)"
      description="ดาวน์โหลดข้อมูลทุก table เป็นไฟล์ JSON"
    >
      <div className="space-y-4">

        {/* Summary cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {BACKUP_TABLES.map(t => {
            const p = progress[t.name]
            const statusColor =
              !p                    ? 'border-slate-100 bg-slate-50 text-slate-400' :
              p.status === 'done'   ? 'border-emerald-100 bg-emerald-50 text-emerald-700' :
              p.status === 'error'  ? 'border-red-100 bg-red-50 text-red-600' :
              p.status === 'running'? 'border-indigo-100 bg-indigo-50 text-indigo-700' :
              'border-slate-100 bg-slate-50 text-slate-400'
            return (
              <div key={t.name} className={`rounded-xl border px-3 py-2.5 transition-colors ${statusColor}`}>
                <p className="text-[11px] font-semibold uppercase tracking-wide opacity-70">{t.label}</p>
                <p className="text-lg font-bold tabular-nums mt-0.5">
                  {p?.processed.toLocaleString() ?? '—'}
                </p>
                <p className="text-[10px] opacity-60">รายการ</p>
              </div>
            )
          })}
        </div>

        {/* Progress bar */}
        {hasProgress && (
          <div className="space-y-1.5">
            <div className="flex justify-between text-xs text-slate-500">
              <span>{doneCount}/{BACKUP_TABLES.length} tables</span>
              <span>{totalRows.toLocaleString()} รายการ</span>
            </div>
            <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
              <div
                className="h-full bg-indigo-500 rounded-full transition-all duration-300"
                style={{ width: `${BACKUP_TABLES.length > 0 ? (doneCount / BACKUP_TABLES.length) * 100 : 0}%` }}
              />
            </div>
          </div>
        )}

        {/* Error list */}
        {hasProgress && Object.entries(progress).some(([, p]) => p.status === 'error') && (
          <div className="bg-red-50 border border-red-100 rounded-xl p-3 space-y-1">
            {Object.entries(progress)
              .filter(([, p]) => p.status === 'error')
              .map(([name, p]) => (
                <p key={name} className="text-xs text-red-600">
                  <span className="font-semibold">{name}:</span> {p.error}
                </p>
              ))}
          </div>
        )}

        {/* Last export info */}
        {lastExport && (
          <p className="text-xs text-slate-400">
            Export ล่าสุด: {lastExport.time} · {lastExport.size}
          </p>
        )}

        {/* CTA */}
        <div className="pt-1">
          <button
            onClick={handleExport}
            disabled={exporting}
            className={`${btnPrimary} ${exporting ? 'opacity-60 cursor-not-allowed' : ''}`}
          >
            {exporting ? <Spinner /> : <IconDownload />}
            {exporting ? 'กำลัง Export...' : 'Export ทั้งหมด'}
          </button>
        </div>
      </div>
    </Section>
  )
}

// ─── Import Section ───────────────────────────────────────────────────────────

function ImportSection() {
  const supabase = createClient()
  const fileRef  = useRef<HTMLInputElement>(null)

  const [file, setFile]       = useState<File | null>(null)
  const [backup, setBackup]   = useState<BackupFile | null>(null)
  const [parseError, setParseError] = useState('')
  const [mode, setMode]       = useState<ImportMode>('upsert')
  const [importing, setImporting]   = useState(false)
  const [progress, setProgress]     = useState<Record<string, TableProgress>>({})
  const [confirmed, setConfirmed]   = useState(false)
  const [done, setDone]       = useState(false)

  function resetFile() {
    setFile(null)
    setBackup(null)
    setParseError('')
    setProgress({})
    setConfirmed(false)
    setDone(false)
    if (fileRef.current) fileRef.current.value = ''
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0]
    if (!f) return
    setFile(f)
    setParseError('')
    setBackup(null)
    setConfirmed(false)
    setDone(false)

    const reader = new FileReader()
    reader.onload = (ev) => {
      try {
        const parsed = JSON.parse(ev.target?.result as string) as BackupFile
        // Basic validation
        if (!parsed.meta || !parsed.data || !parsed.meta.version) {
          setParseError('ไฟล์ไม่ถูกต้อง — ต้องเป็น Nexo backup file เท่านั้น')
          return
        }
        setBackup(parsed)
      } catch {
        setParseError('อ่านไฟล์ไม่สำเร็จ — ตรวจสอบว่าเป็นไฟล์ JSON ที่ถูกต้อง')
      }
    }
    reader.readAsText(f)
  }

  const handleImport = useCallback(async () => {
    if (!backup) return
    setImporting(true)
    setDone(false)

    const init: Record<string, TableProgress> = {}
    BACKUP_TABLES.forEach(t => {
      const rows = backup.data[t.name] ?? []
      if (rows.length === 0) {
        init[t.name] = { status: 'skipped', processed: 0, total: 0 }
      } else {
        init[t.name] = { status: 'pending', processed: 0, total: rows.length }
      }
    })
    setProgress(init)

    let totalDone = 0
    let totalError = 0

    try {
      for (const { name, pk } of BACKUP_TABLES) {
        const rows = backup.data[name] ?? []
        if (rows.length === 0) continue

        setProgress(prev => ({ ...prev, [name]: { ...prev[name], status: 'running' } }))

        // Clear table first in replace mode
        if (mode === 'replace') {
          // Use gt(pk, 0) since all pks are integer — neq(pk, '') would fail type check
          const { error: delErr } = await supabase.from(name).delete().gt(pk, 0)
          if (delErr) {
            setProgress(prev => ({
              ...prev, [name]: { status: 'error', processed: 0, total: rows.length, error: delErr.message },
            }))
            totalError++
            continue
          }
        }

        // Strip generated columns before upsert
        const cleaned = stripGeneratedColumns(name, rows)

        // Upsert in chunks
        let processed = 0
        let chunkError: string | undefined

        for (let i = 0; i < cleaned.length; i += CHUNK_SIZE) {
          const chunk = cleaned.slice(i, i + CHUNK_SIZE)
          const { error } = await supabase
            .from(name)
            .upsert(chunk, { onConflict: pk, ignoreDuplicates: false })

          if (error) {
            chunkError = error.message
            break
          }
          processed += chunk.length
          setProgress(prev => ({
            ...prev, [name]: { ...prev[name], processed, total: rows.length },
          }))
        }

        if (chunkError) {
          setProgress(prev => ({
            ...prev, [name]: { status: 'error', processed, total: rows.length, error: chunkError },
          }))
          totalError++
        } else {
          setProgress(prev => ({
            ...prev, [name]: { status: 'done', processed: rows.length, total: rows.length },
          }))
          totalDone++
        }
      }

      setDone(true)
      if (totalError === 0) {
        showToast(`Import สำเร็จ — ${totalDone} tables`)
      } else {
        showToast(`Import เสร็จ — ${totalDone} สำเร็จ, ${totalError} ผิดพลาด`, 'error')
      }
    } catch (err: any) {
      showToast(err?.message ?? 'Import ล้มเหลว', 'error')
    } finally {
      setImporting(false)
    }
  }, [backup, mode, supabase])

  const totalBackupRows = backup
    ? Object.values(backup.meta.row_counts).reduce((s, n) => s + n, 0)
    : 0

  const doneCount  = Object.values(progress).filter(p => p.status === 'done').length
  const errorCount = Object.values(progress).filter(p => p.status === 'error').length
  const totalTableCount = Object.keys(progress).filter(k => progress[k].status !== 'skipped').length
  const hasProgress = Object.keys(progress).length > 0

  return (
    <Section
      icon={<IconUpload />}
      title="กู้คืนข้อมูล (Import)"
      description="อัปโหลดไฟล์ backup JSON เพื่อกู้คืนหรืออัปเดตข้อมูล"
    >
      <div className="space-y-4">

        {/* File picker */}
        <div>
          <input
            ref={fileRef}
            type="file"
            accept=".json,application/json"
            onChange={handleFileChange}
            className="hidden"
            id="backup-file-input"
          />
          {!file ? (
            <label
              htmlFor="backup-file-input"
              className="flex flex-col items-center justify-center gap-3 border-2 border-dashed border-slate-200 rounded-2xl p-8 cursor-pointer hover:border-indigo-300 hover:bg-indigo-50/40 transition-colors group"
            >
              <div className="w-12 h-12 rounded-2xl bg-slate-100 group-hover:bg-indigo-100 flex items-center justify-center transition-colors text-slate-400 group-hover:text-indigo-500">
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                  <polyline points="17 8 12 3 7 8"/>
                  <line x1="12" y1="3" x2="12" y2="15"/>
                </svg>
              </div>
              <div className="text-center">
                <p className="text-sm font-medium text-slate-700 group-hover:text-indigo-700">เลือกไฟล์ Backup</p>
                <p className="text-xs text-slate-400 mt-0.5">รองรับเฉพาะ .json ที่ export จาก Nexo เท่านั้น</p>
              </div>
            </label>
          ) : (
            <div className="flex items-center gap-3 border border-slate-200 rounded-xl px-4 py-3 bg-slate-50">
              <div className="text-indigo-500 shrink-0"><IconFile /></div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-slate-800 truncate">{file.name}</p>
                <p className="text-xs text-slate-400">{fileSize(file.size)}</p>
              </div>
              {!importing && (
                <button onClick={resetFile} className="text-slate-400 hover:text-red-500 transition-colors p-1 shrink-0">
                  <IconX />
                </button>
              )}
            </div>
          )}
          {parseError && (
            <p className="mt-2 text-xs text-red-500">{parseError}</p>
          )}
        </div>

        {/* Backup preview */}
        {backup && !hasProgress && (
          <div className="border border-slate-100 rounded-2xl overflow-hidden">
            {/* Meta header */}
            <div className="bg-slate-50 px-4 py-3 border-b border-slate-100">
              <p className="text-xs font-semibold text-slate-700">ข้อมูล Backup</p>
              <div className="flex flex-wrap gap-x-4 gap-y-1 mt-1.5">
                <span className="text-xs text-slate-500">📅 {formatDate(backup.meta.created_at)}</span>
                <span className="text-xs text-slate-500">👤 {backup.meta.created_by_email}</span>
                <span className="text-xs text-slate-500">📦 v{backup.meta.version}</span>
                <span className="text-xs font-semibold text-indigo-600">
                  {totalBackupRows.toLocaleString()} รายการรวม
                </span>
              </div>
            </div>

            {/* Table breakdown */}
            <div className="divide-y divide-slate-50">
              {BACKUP_TABLES.map(t => {
                const count = backup.meta.row_counts[t.name] ?? backup.data[t.name]?.length ?? 0
                return (
                  <div key={t.name} className="flex items-center justify-between px-4 py-2.5">
                    <span className="text-sm text-slate-600">{t.label}</span>
                    <span className={`text-sm font-semibold tabular-nums ${count === 0 ? 'text-slate-300' : 'text-slate-800'}`}>
                      {count.toLocaleString()}
                    </span>
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {/* Import mode selector */}
        {backup && !hasProgress && (
          <div className="space-y-2">
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">โหมด Import</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {/* Upsert */}
              <label className={`flex items-start gap-3 border-2 rounded-xl p-3.5 cursor-pointer transition-colors ${
                mode === 'upsert' ? 'border-indigo-400 bg-indigo-50/50' : 'border-slate-200 hover:border-slate-300'
              }`}>
                <input
                  type="radio" name="import-mode" value="upsert"
                  checked={mode === 'upsert'} onChange={() => setMode('upsert')}
                  className="mt-0.5 accent-indigo-600"
                />
                <div>
                  <p className="text-sm font-semibold text-slate-800">Upsert (แนะนำ)</p>
                  <p className="text-xs text-slate-500 mt-0.5 leading-relaxed">
                    เพิ่มข้อมูลใหม่ + อัปเดตรายการที่มีอยู่ตาม ID — ไม่ลบข้อมูลเดิมที่ไม่มีในไฟล์
                  </p>
                </div>
              </label>
              {/* Replace */}
              <label className={`flex items-start gap-3 border-2 rounded-xl p-3.5 cursor-pointer transition-colors ${
                mode === 'replace' ? 'border-red-400 bg-red-50/50' : 'border-slate-200 hover:border-slate-300'
              }`}>
                <input
                  type="radio" name="import-mode" value="replace"
                  checked={mode === 'replace'} onChange={() => setMode('replace')}
                  className="mt-0.5 accent-red-500"
                />
                <div>
                  <p className="text-sm font-semibold text-slate-800">Replace (ล้างแล้วใส่ใหม่)</p>
                  <p className="text-xs text-slate-500 mt-0.5 leading-relaxed">
                    ลบข้อมูลเดิมทุกอย่างใน table นั้นก่อน แล้วใส่ข้อมูลจากไฟล์ backup ทั้งหมด
                  </p>
                </div>
              </label>
            </div>
          </div>
        )}

        {/* Replace mode warning */}
        {backup && !hasProgress && mode === 'replace' && (
          <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 space-y-2">
            <p className="text-sm font-semibold text-red-700 flex items-center gap-2">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/>
                <line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/>
              </svg>
              คำเตือน: โหมดนี้จะลบข้อมูลเดิมทั้งหมด
            </p>
            <p className="text-xs text-red-600 leading-relaxed">
              ข้อมูลใน {BACKUP_TABLES.length} tables จะถูกลบก่อน แล้วแทนที่ด้วยข้อมูลจากไฟล์ backup
              การกระทำนี้ไม่สามารถ Undo ได้
            </p>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={confirmed}
                onChange={e => setConfirmed(e.target.checked)}
                className="accent-red-600"
              />
              <span className="text-xs font-medium text-red-700">ฉันเข้าใจและยืนยันว่าต้องการล้างข้อมูลเดิม</span>
            </label>
          </div>
        )}

        {/* Import button */}
        {backup && !hasProgress && (
          <div className="flex items-center gap-2 pt-1">
            <button
              onClick={handleImport}
              disabled={importing || (mode === 'replace' && !confirmed)}
              className={`${mode === 'replace'
                ? 'flex items-center gap-2 bg-red-600 text-white px-4 py-2.5 rounded-xl text-sm font-medium hover:bg-red-500 active:bg-red-700 transition-colors shadow-sm'
                : btnPrimary
              } ${(importing || (mode === 'replace' && !confirmed)) ? 'opacity-50 cursor-not-allowed' : ''}`}
            >
              {importing ? <Spinner /> : <IconUpload />}
              {importing
                ? 'กำลัง Import...'
                : mode === 'replace'
                  ? 'ล้างแล้ว Import ใหม่'
                  : 'Import ข้อมูล'}
            </button>
            <button onClick={resetFile} className={btnSecondary}>ยกเลิก</button>
          </div>
        )}

        {/* Import progress */}
        {hasProgress && (
          <div className="border border-slate-100 rounded-2xl overflow-hidden">
            <div className="bg-slate-50 px-4 py-2.5 border-b border-slate-100 flex items-center justify-between">
              <p className="text-xs font-semibold text-slate-700">ความคืบหน้า Import</p>
              {!importing && done && (
                <span className={`text-xs font-medium ${errorCount === 0 ? 'text-emerald-600' : 'text-amber-600'}`}>
                  {errorCount === 0 ? '✓ สำเร็จทั้งหมด' : `${doneCount} สำเร็จ · ${errorCount} ผิดพลาด`}
                </span>
              )}
            </div>

            {/* Overall progress bar */}
            {totalTableCount > 0 && (
              <div className="px-4 py-2.5 border-b border-slate-50">
                <div className="flex justify-between text-xs text-slate-400 mb-1">
                  <span>{doneCount + errorCount}/{totalTableCount} tables</span>
                  <span>
                    {Object.values(progress).reduce((s, p) => s + p.processed, 0).toLocaleString()} รายการ
                  </span>
                </div>
                <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all duration-300 ${errorCount > 0 ? 'bg-amber-400' : 'bg-indigo-500'}`}
                    style={{ width: `${totalTableCount > 0 ? ((doneCount + errorCount) / totalTableCount) * 100 : 0}%` }}
                  />
                </div>
              </div>
            )}

            {/* Per-table rows */}
            <div className="divide-y divide-slate-50">
              {BACKUP_TABLES.map(t => {
                const p = progress[t.name]
                if (!p) return null
                return (
                  <div key={t.name} className="flex items-center justify-between px-4 py-2.5 gap-3">
                    <span className="text-sm text-slate-600 w-32 shrink-0">{t.label}</span>
                    <div className="flex-1">
                      {p.status !== 'skipped' && p.total > 0 && (
                        <div className="h-1 bg-slate-100 rounded-full overflow-hidden">
                          <div
                            className={`h-full rounded-full transition-all duration-200 ${
                              p.status === 'error' ? 'bg-red-400' :
                              p.status === 'done'  ? 'bg-emerald-400' : 'bg-indigo-400'
                            }`}
                            style={{ width: `${p.total > 0 ? (p.processed / p.total) * 100 : 0}%` }}
                          />
                        </div>
                      )}
                    </div>
                    <span className="text-xs tabular-nums text-slate-500 w-20 text-right shrink-0">
                      {p.status !== 'skipped' ? `${p.processed.toLocaleString()}/${p.total.toLocaleString()}` : ''}
                    </span>
                    <div className="w-28 shrink-0 text-right">
                      <StatusBadge status={p.status} />
                    </div>
                  </div>
                )
              })}
            </div>

            {/* Error detail */}
            {Object.entries(progress).some(([, p]) => p.status === 'error') && (
              <div className="bg-red-50 border-t border-red-100 px-4 py-3 space-y-1">
                {Object.entries(progress)
                  .filter(([, p]) => p.status === 'error')
                  .map(([name, p]) => (
                    <p key={name} className="text-xs text-red-600">
                      <span className="font-semibold">{name}:</span> {p.error}
                    </p>
                  ))}
              </div>
            )}
          </div>
        )}

        {/* Done — reset button */}
        {hasProgress && done && !importing && (
          <div>
            <button onClick={resetFile} className={btnSecondary}>
              <IconRefresh />
              Import ใหม่
            </button>
          </div>
        )}

      </div>
    </Section>
  )
}

// ─── Main component ───────────────────────────────────────────────────────────

export default function BackupRestore() {
  return (
    <div className="p-4 md:p-6 space-y-4 md:space-y-5 max-w-3xl">
      <div>
        <h1 className="text-lg md:text-xl font-semibold text-slate-900">สำรอง / กู้คืนข้อมูล</h1>
        <p className="text-sm text-slate-400 mt-0.5">Export ข้อมูลทั้งหมดเป็น JSON และ Import กลับได้ทุกเมื่อ</p>
      </div>

      {/* Security notice */}
      <div className="flex items-start gap-3 bg-amber-50 border border-amber-200 rounded-2xl px-4 py-3.5">
        <div className="text-amber-600 mt-0.5 shrink-0"><IconShield /></div>
        <div>
          <p className="text-sm font-semibold text-amber-800">เฉพาะ Admin เท่านั้น</p>
          <p className="text-xs text-amber-700 mt-0.5 leading-relaxed">
            ไฟล์ backup มีข้อมูลทั้งหมดในระบบ — เก็บในที่ปลอดภัย อย่าแชร์ไฟล์กับบุคคลที่ไม่มีสิทธิ์
          </p>
        </div>
      </div>

      <ExportSection />
      <ImportSection />
    </div>
  )
}
