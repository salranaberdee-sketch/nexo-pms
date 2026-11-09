'use client'

import { useState, useRef, useCallback } from 'react'
import { createClient } from '@/lib/supabase'
import { useProfile } from '@/lib/profile-context'
import { showToast } from './Toast'

// ─── Types ─────────────────────────────────────────────────────────────────

export type ContentAsset = {
  id: number
  content_id: number
  asset_type: 'image' | 'video' | 'url' | 'file'
  label: string | null
  url: string
  storage_path: string | null
  file_size: number | null
  mime_type: string | null
  sort_order: number
  uploaded_by: string | null
  created_at: string
}

// ─── Helpers ────────────────────────────────────────────────────────────────

const BUCKET = 'content-assets'

function getFileCategory(mime: string | null): ContentAsset['asset_type'] {
  if (!mime) return 'file'
  if (mime.startsWith('image/')) return 'image'
  if (mime.startsWith('video/')) return 'video'
  return 'file'
}

function formatSize(bytes: number | null) {
  if (!bytes) return ''
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

function getDomain(url: string) {
  try { return new URL(url).hostname.replace('www.', '') } catch { return '' }
}

// ─── Main component ─────────────────────────────────────────────────────────

export default function ContentAssets({
  contentId,
  assets,
  canWrite,
  canDelete,
  onAssetsChange,
}: {
  contentId: number
  assets: ContentAsset[]
  canWrite: boolean
  canDelete: boolean
  onAssetsChange: (assets: ContentAsset[]) => void
}) {
  const me = useProfile()
  const supabase = createClient()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const dropRef = useRef<HTMLDivElement>(null)

  const [uploading, setUploading] = useState(false)
  const [uploadProgress, setUploadProgress] = useState<Record<string, number>>({})
  const [urlInput, setUrlInput] = useState('')
  const [urlLabel, setUrlLabel] = useState('')
  const [addingUrl, setAddingUrl] = useState(false)
  const [showUrlForm, setShowUrlForm] = useState(false)
  const [dragging, setDragging] = useState(false)
  const [editingId, setEditingId] = useState<number | null>(null)
  const [editLabel, setEditLabel] = useState('')
  const [lightboxUrl, setLightboxUrl] = useState<string | null>(null)

  // ── Upload files ────────────────────────────────────────────

  async function uploadFiles(files: FileList | File[]) {
    if (!canWrite || !files.length) return
    setUploading(true)
    const newAssets: ContentAsset[] = []

    for (const file of Array.from(files)) {
      const ext = file.name.split('.').pop()
      const path = `${contentId}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`
      setUploadProgress(p => ({ ...p, [file.name]: 0 }))

      const { data: uploadData, error: uploadErr } = await supabase.storage
        .from(BUCKET)
        .upload(path, file, { cacheControl: '3600', upsert: false })

      if (uploadErr) {
        showToast(`อัปโหลด ${file.name} ล้มเหลว: ${uploadErr.message}`, 'error')
        setUploadProgress(p => { const n = { ...p }; delete n[file.name]; return n })
        continue
      }

      const { data: urlData } = supabase.storage.from(BUCKET).getPublicUrl(path)
      const publicUrl = urlData.publicUrl
      const category = getFileCategory(file.type)

      const { data: row, error: insertErr } = await supabase
        .from('content_assets')
        .insert([{
          content_id:   contentId,
          asset_type:   category,
          label:        file.name,
          url:          publicUrl,
          storage_path: path,
          file_size:    file.size,
          mime_type:    file.type,
          sort_order:   assets.length + newAssets.length,
          uploaded_by:  me.id,
        }])
        .select()
        .single()

      if (insertErr) {
        showToast(`บันทึก ${file.name} ล้มเหลว`, 'error')
      } else {
        newAssets.push(row as ContentAsset)
      }
      setUploadProgress(p => { const n = { ...p }; delete n[file.name]; return n })
    }

    setUploading(false)
    if (newAssets.length) {
      onAssetsChange([...assets, ...newAssets])
      showToast(`อัปโหลด ${newAssets.length} ไฟล์สำเร็จ`)
    }
  }

  // ── Add URL ─────────────────────────────────────────────────

  async function addUrl() {
    const url = urlInput.trim()
    if (!url) return
    setAddingUrl(true)
    const { data: row, error } = await supabase
      .from('content_assets')
      .insert([{
        content_id:  contentId,
        asset_type:  'url',
        label:       urlLabel.trim() || null,
        url,
        sort_order:  assets.length,
        uploaded_by: me.id,
      }])
      .select()
      .single()
    setAddingUrl(false)
    if (error) { showToast(error.message, 'error'); return }
    onAssetsChange([...assets, row as ContentAsset])
    setUrlInput('')
    setUrlLabel('')
    setShowUrlForm(false)
    showToast('เพิ่มลิงก์แล้ว')
  }

  // ── Delete ──────────────────────────────────────────────────

  async function deleteAsset(asset: ContentAsset) {
    // Delete from Storage if uploaded
    if (asset.storage_path) {
      await supabase.storage.from(BUCKET).remove([asset.storage_path])
    }
    const { error } = await supabase.from('content_assets').delete().eq('id', asset.id)
    if (error) { showToast(error.message, 'error'); return }
    onAssetsChange(assets.filter(a => a.id !== asset.id))
    showToast('ลบแล้ว')
  }

  // ── Update label ────────────────────────────────────────────

  async function saveLabel(assetId: number) {
    const { error } = await supabase
      .from('content_assets').update({ label: editLabel || null }).eq('id', assetId)
    if (error) { showToast(error.message, 'error'); return }
    onAssetsChange(assets.map(a => a.id === assetId ? { ...a, label: editLabel } : a))
    setEditingId(null)
  }

  // ── Drag and drop ───────────────────────────────────────────

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setDragging(false)
    if (e.dataTransfer.files.length) uploadFiles(e.dataTransfer.files)
  }, [assets])

  // ─── Derived ────────────────────────────────────────────────

  const imageAssets = assets.filter(a => a.asset_type === 'image')
  const videoAssets = assets.filter(a => a.asset_type === 'video')
  const urlAssets   = assets.filter(a => a.asset_type === 'url')
  const fileAssets  = assets.filter(a => a.asset_type === 'file')
  const uploadingFiles = Object.keys(uploadProgress)

  return (
    <div className="space-y-4">

      {/* ── Header ── */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-xs font-semibold text-slate-600 uppercase tracking-wide">ชิ้นงาน</span>
          {assets.length > 0 && (
            <span className="text-[11px] bg-slate-100 text-slate-500 px-2 py-0.5 rounded-full font-medium">
              {assets.length} ไฟล์
            </span>
          )}
          {imageAssets.length > 0 && <TypeBadge icon="🖼" count={imageAssets.length} label="ภาพ" />}
          {videoAssets.length > 0 && <TypeBadge icon="🎬" count={videoAssets.length} label="วีดีโอ" />}
          {urlAssets.length  > 0 && <TypeBadge icon="🔗" count={urlAssets.length}  label="ลิงก์" />}
          {fileAssets.length > 0 && <TypeBadge icon="📄" count={fileAssets.length} label="ไฟล์" />}
        </div>
        {canWrite && (
          <div className="flex gap-1.5">
            <button
              onClick={() => setShowUrlForm(v => !v)}
              className="text-xs font-medium text-slate-600 bg-slate-100 hover:bg-slate-200 px-3 py-1.5 rounded-lg transition-colors flex items-center gap-1"
            >
              🔗 เพิ่มลิงก์
            </button>
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading}
              className="text-xs font-medium text-white bg-indigo-600 hover:bg-indigo-500 px-3 py-1.5 rounded-lg transition-colors flex items-center gap-1 disabled:opacity-40"
            >
              📎 อัปโหลด
            </button>
            <input
              ref={fileInputRef}
              type="file"
              multiple
              accept="image/*,video/*,.pdf,.zip,.txt"
              className="hidden"
              onChange={e => e.target.files && uploadFiles(e.target.files)}
            />
          </div>
        )}
      </div>

      {/* ── URL form ── */}
      {showUrlForm && (
        <div className="bg-white border border-slate-200 rounded-xl p-3 space-y-2">
          <div className="flex gap-2">
            <input
              autoFocus
              value={urlInput}
              onChange={e => setUrlInput(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && addUrl()}
              placeholder="วาง URL: https://drive.google.com/ หรือ https://fb.com/..."
              className="flex-1 border border-slate-200 rounded-lg px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
            <input
              value={urlLabel}
              onChange={e => setUrlLabel(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && addUrl()}
              placeholder="ชื่อ (ถ้ามี)"
              className="w-32 border border-slate-200 rounded-lg px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
            <button
              onClick={addUrl}
              disabled={!urlInput.trim() || addingUrl}
              className="bg-indigo-600 text-white text-xs font-semibold px-4 py-2 rounded-lg hover:bg-indigo-500 disabled:opacity-40 transition-colors whitespace-nowrap"
            >
              {addingUrl ? '...' : '+ เพิ่ม'}
            </button>
            <button onClick={() => setShowUrlForm(false)} className="text-slate-400 hover:text-slate-600 px-2">✕</button>
          </div>
          <p className="text-[10px] text-slate-400">รองรับทุก URL — Google Drive, Facebook, YouTube, Figma, Notion ฯลฯ</p>
        </div>
      )}

      {/* ── Drop zone (shown when canWrite and no files yet, or always as drag target) ── */}
      {canWrite && (
        <div
          ref={dropRef}
          onDragOver={e => { e.preventDefault(); setDragging(true) }}
          onDragLeave={() => setDragging(false)}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
          className={`border-2 border-dashed rounded-xl p-4 text-center cursor-pointer transition-all ${
            dragging
              ? 'border-indigo-400 bg-indigo-50'
              : assets.length === 0
                ? 'border-slate-200 hover:border-indigo-300 hover:bg-slate-50'
                : 'border-slate-100 hover:border-slate-300'
          }`}
        >
          <p className="text-xs text-slate-400">
            {dragging
              ? '🎯 วางไฟล์ที่นี่...'
              : assets.length === 0
                ? '📎 ลากไฟล์มาวาง หรือคลิกเพื่อเลือก — รูปภาพ, วีดีโอ, PDF ฯลฯ'
                : '+ ลากไฟล์เพิ่มเติม'}
          </p>
          {uploading && (
            <p className="text-xs text-indigo-600 mt-1 animate-pulse">กำลังอัปโหลด...</p>
          )}
          {uploadingFiles.map(name => (
            <p key={name} className="text-[10px] text-indigo-500 mt-0.5 truncate">{name}</p>
          ))}
        </div>
      )}

      {/* ── Empty state ── */}
      {assets.length === 0 && !canWrite && (
        <p className="text-xs text-slate-400 py-2 text-center">ยังไม่มีชิ้นงาน</p>
      )}

      {/* ── Image grid ── */}
      {imageAssets.length > 0 && (
        <div>
          <SectionLabel icon="🖼" label="รูปภาพ" count={imageAssets.length} />
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-2 mt-2">
            {imageAssets.map(asset => (
              <ImageCard
                key={asset.id}
                asset={asset}
                canDelete={canDelete}
                canWrite={canWrite}
                editingId={editingId}
                editLabel={editLabel}
                onEditStart={() => { setEditingId(asset.id); setEditLabel(asset.label || '') }}
                onEditChange={setEditLabel}
                onEditSave={() => saveLabel(asset.id)}
                onEditCancel={() => setEditingId(null)}
                onLightbox={() => setLightboxUrl(asset.url)}
                onDelete={() => deleteAsset(asset)}
              />
            ))}
          </div>
        </div>
      )}

      {/* ── Video list ── */}
      {videoAssets.length > 0 && (
        <div>
          <SectionLabel icon="🎬" label="วีดีโอ" count={videoAssets.length} />
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-2">
            {videoAssets.map(asset => (
              <VideoCard
                key={asset.id}
                asset={asset}
                canDelete={canDelete}
                canWrite={canWrite}
                editingId={editingId}
                editLabel={editLabel}
                onEditStart={() => { setEditingId(asset.id); setEditLabel(asset.label || '') }}
                onEditChange={setEditLabel}
                onEditSave={() => saveLabel(asset.id)}
                onEditCancel={() => setEditingId(null)}
                onDelete={() => deleteAsset(asset)}
              />
            ))}
          </div>
        </div>
      )}

      {/* ── URL + File list ── */}
      {(urlAssets.length > 0 || fileAssets.length > 0) && (
        <div>
          <SectionLabel icon="🔗" label="ลิงก์ & ไฟล์" count={urlAssets.length + fileAssets.length} />
          <div className="space-y-1 mt-2">
            {[...urlAssets, ...fileAssets].map(asset => (
              <LinkRow
                key={asset.id}
                asset={asset}
                canDelete={canDelete}
                canWrite={canWrite}
                editingId={editingId}
                editLabel={editLabel}
                onEditStart={() => { setEditingId(asset.id); setEditLabel(asset.label || '') }}
                onEditChange={setEditLabel}
                onEditSave={() => saveLabel(asset.id)}
                onEditCancel={() => setEditingId(null)}
                onDelete={() => deleteAsset(asset)}
              />
            ))}
          </div>
        </div>
      )}

      {/* ── Lightbox ── */}
      {lightboxUrl && (
        <div
          className="fixed inset-0 z-[200] bg-black/80 flex items-center justify-center p-4"
          onClick={() => setLightboxUrl(null)}
        >
          <div className="relative max-w-5xl max-h-[90vh] w-full">
            <button
              onClick={() => setLightboxUrl(null)}
              className="absolute -top-10 right-0 text-white text-2xl font-bold hover:opacity-70"
            >✕</button>
            <img
              src={lightboxUrl}
              alt="preview"
              className="w-full h-full object-contain rounded-xl"
              onClick={e => e.stopPropagation()}
            />
          </div>
        </div>
      )}
    </div>
  )
}

// ─── Sub-components ────────────────────────────────────────────────────────

function TypeBadge({ icon, count, label }: { icon: string; count: number; label: string }) {
  return (
    <span className="text-[11px] text-slate-500 flex items-center gap-0.5">
      {icon} <span className="font-medium">{count}</span> {label}
    </span>
  )
}

function SectionLabel({ icon, label, count }: { icon: string; label: string; count: number }) {
  return (
    <div className="flex items-center gap-1.5">
      <span className="text-sm">{icon}</span>
      <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wide">{label}</span>
      <span className="text-[11px] text-slate-400">({count})</span>
    </div>
  )
}

type EditProps = {
  editingId: number | null
  editLabel: string
  onEditStart: () => void
  onEditChange: (v: string) => void
  onEditSave: () => void
  onEditCancel: () => void
}

function ImageCard({ asset, canDelete, canWrite, onLightbox, onDelete, editingId, editLabel, onEditStart, onEditChange, onEditSave, onEditCancel }: {
  asset: ContentAsset; canDelete: boolean; canWrite: boolean; onLightbox: () => void; onDelete: () => void
} & EditProps) {
  const [imgErr, setImgErr] = useState(false)
  const isEditing = editingId === asset.id

  return (
    <div className="group relative bg-slate-100 rounded-xl overflow-hidden border border-slate-200">
      {/* Thumbnail */}
      <button onClick={onLightbox} className="block w-full">
        {!imgErr ? (
          <img
            src={asset.url}
            alt={asset.label || ''}
            onError={() => setImgErr(true)}
            className="w-full h-28 object-cover"
          />
        ) : (
          <div className="w-full h-28 flex flex-col items-center justify-center text-slate-400 gap-1">
            <span className="text-2xl">🖼</span>
            <span className="text-[10px]">คลิกเปิด</span>
          </div>
        )}
      </button>

      {/* Label */}
      <div className="px-2 py-1.5 bg-white">
        {isEditing ? (
          <InlineLabelEdit label={editLabel} onChange={onEditChange} onSave={onEditSave} onCancel={onEditCancel} />
        ) : (
          <button onClick={canWrite ? onEditStart : undefined}
            className={`text-[11px] text-slate-600 truncate w-full text-left ${canWrite ? 'hover:text-indigo-600 cursor-pointer' : 'cursor-default'}`}
            title={asset.label || 'คลิกตั้งชื่อ'}>
            {asset.label || <span className="text-slate-300 italic">ตั้งชื่อ...</span>}
          </button>
        )}
        {asset.file_size && (
          <p className="text-[10px] text-slate-400">{formatSize(asset.file_size)}</p>
        )}
      </div>

      {/* Delete overlay */}
      {canDelete && (
        <button
          onClick={e => { e.stopPropagation(); onDelete() }}
          className="absolute top-1.5 right-1.5 w-6 h-6 bg-red-500 text-white rounded-full text-xs flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity shadow-md"
          title="ลบ"
        >✕</button>
      )}
    </div>
  )
}

function VideoCard({ asset, canDelete, canWrite, onDelete, editingId, editLabel, onEditStart, onEditChange, onEditSave, onEditCancel }: {
  asset: ContentAsset; canDelete: boolean; canWrite: boolean; onDelete: () => void
} & EditProps) {
  const isEditing = editingId === asset.id

  return (
    <div className="group bg-slate-900 rounded-xl overflow-hidden border border-slate-700 relative">
      <video
        src={asset.url}
        controls
        className="w-full max-h-48 object-contain"
        preload="metadata"
      />
      <div className="px-3 py-2 flex items-center justify-between gap-2">
        <div className="min-w-0 flex-1">
          {isEditing ? (
            <InlineLabelEdit label={editLabel} onChange={onEditChange} onSave={onEditSave} onCancel={onEditCancel} dark />
          ) : (
            <button onClick={canWrite ? onEditStart : undefined}
              className={`text-[11px] text-slate-300 truncate w-full text-left ${canWrite ? 'hover:text-white cursor-pointer' : 'cursor-default'}`}>
              {asset.label || <span className="italic opacity-50">ตั้งชื่อ...</span>}
            </button>
          )}
          {asset.file_size && <p className="text-[10px] text-slate-500">{formatSize(asset.file_size)}</p>}
        </div>
        {canDelete && (
          <button onClick={onDelete}
            className="shrink-0 w-6 h-6 bg-red-500/80 text-white rounded-full text-xs flex items-center justify-center hover:bg-red-500 transition-colors opacity-0 group-hover:opacity-100"
          >✕</button>
        )}
      </div>
    </div>
  )
}

function LinkRow({ asset, canDelete, canWrite, onDelete, editingId, editLabel, onEditStart, onEditChange, onEditSave, onEditCancel }: {
  asset: ContentAsset; canDelete: boolean; canWrite: boolean; onDelete: () => void
} & EditProps) {
  const isEditing = editingId === asset.id
  const domain = getDomain(asset.url)
  const favicon = domain ? `https://www.google.com/s2/favicons?domain=${domain}&sz=16` : ''
  const isFile = asset.asset_type === 'file'

  return (
    <div className="group flex items-center gap-2.5 bg-white border border-slate-200 rounded-xl px-3 py-2.5 hover:border-slate-300 transition-colors">
      {/* Icon */}
      <div className="shrink-0 w-6 h-6 flex items-center justify-center">
        {isFile
          ? <span className="text-sm">📄</span>
          : favicon
            ? <img src={favicon} alt="" className="w-4 h-4 rounded-sm" onError={e => (e.currentTarget.style.display = 'none')} />
            : <span className="text-sm">🔗</span>
        }
      </div>

      {/* Label + URL */}
      <div className="flex-1 min-w-0">
        {isEditing ? (
          <InlineLabelEdit label={editLabel} onChange={onEditChange} onSave={onEditSave} onCancel={onEditCancel} />
        ) : (
          <div className="flex items-center gap-1.5 min-w-0">
            <a href={asset.url} target="_blank" rel="noreferrer"
              className="text-xs text-indigo-600 hover:underline truncate font-medium"
              title={asset.url}
            >
              {asset.label || asset.url}
            </a>
            {asset.label && <span className="text-[10px] text-slate-400 hidden sm:block shrink-0">{domain}</span>}
          </div>
        )}
        {asset.file_size && <p className="text-[10px] text-slate-400">{formatSize(asset.file_size)}</p>}
      </div>

      {/* Actions */}
      <div className="shrink-0 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
        {canWrite && !isEditing && (
          <button onClick={onEditStart}
            className="text-[10px] text-slate-400 hover:text-indigo-600 px-1.5 py-0.5 rounded hover:bg-indigo-50 transition-colors"
            title="ตั้งชื่อ">✏️</button>
        )}
        {canDelete && (
          <button onClick={onDelete}
            className="text-[10px] text-slate-400 hover:text-red-600 px-1.5 py-0.5 rounded hover:bg-red-50 transition-colors"
            title="ลบ">✕</button>
        )}
      </div>
    </div>
  )
}

function InlineLabelEdit({ label, onChange, onSave, onCancel, dark }: {
  label: string; onChange: (v: string) => void; onSave: () => void; onCancel: () => void; dark?: boolean
}) {
  return (
    <div className="flex gap-1 items-center">
      <input
        autoFocus
        value={label}
        onChange={e => onChange(e.target.value)}
        onKeyDown={e => { if (e.key === 'Enter') onSave(); if (e.key === 'Escape') onCancel() }}
        className={`flex-1 min-w-0 border rounded px-2 py-0.5 text-[11px] focus:outline-none ${
          dark ? 'bg-slate-800 border-slate-600 text-white' : 'border-slate-300'
        }`}
        placeholder="ชื่อไฟล์..."
      />
      <button onClick={onSave} className="text-emerald-500 text-xs font-bold hover:text-emerald-400">✓</button>
      <button onClick={onCancel} className="text-slate-400 text-xs hover:text-slate-600">✕</button>
    </div>
  )
}
