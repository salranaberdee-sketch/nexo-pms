'use client'

import { useEffect, useState, useMemo } from 'react'
import { createClient } from '@/lib/supabase'
import { useCan } from '@/lib/profile-context'
import SearchInput from './SearchInput'
import { TableSkeleton, EmptyState } from './TableState'
import { showToast } from './Toast'
import Modal, { Field, ConfirmModal } from './Modal'
import {
  inputCls, selectCls, btnPrimary, btnSecondary, btnDanger,
  thCls, tdCls, tableWrapCls, pagePadCls,
} from '@/lib/cx'
import { IconPlus, IconPencil, IconTrash } from '@/lib/icons'
import type { Tables } from '@/src/types/database'
import Link from 'next/link'

type Customer = Tables<'customers'>

const GENDERS: Record<string, string> = {
  male: 'ชาย', female: 'หญิง', other: 'อื่นๆ', unknown: 'ไม่ระบุ',
}
const BLOOD_TYPES = ['A', 'B', 'AB', 'O', 'unknown']

const EMPTY_FORM = {
  hn:               '',
  first_name:       '',
  last_name:        '',
  nickname:         '',
  gender:           'unknown',
  dob:              '',
  phone:            '',
  line_id:          '',
  email:            '',
  id_card:          '',
  blood_type:       'unknown',
  allergies:        '',
  chronic_diseases: '',
  address:          '',
  consent_given:    false,
  consent_at:       '',
  notes:            '',
}
type CustomerForm = typeof EMPTY_FORM

// ── Hoisted form ──────────────────────────────────────────────────────────────
function CustomerFormFields({ form, setForm }: {
  form: CustomerForm
  setForm: (f: CustomerForm) => void
}) {
  return (
    <div className="space-y-5">

      {/* ── ข้อมูลพื้นฐาน ── */}
      <div>
        <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-widest mb-3">ข้อมูลพื้นฐาน</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <Field label="HN (รหัสผู้ป่วย)" hint="เว้นว่างให้ระบบกำหนดเอง หรือใส่จากระบบเก่า">
            <input value={form.hn} onChange={e => setForm({ ...form, hn: e.target.value })}
              placeholder="เช่น 2024-00001" className={inputCls} />
          </Field>
          <div /> {/* spacer */}
          <Field label="ชื่อ" required>
            <input value={form.first_name} onChange={e => setForm({ ...form, first_name: e.target.value })}
              placeholder="ชื่อจริง" className={inputCls} autoComplete="given-name" />
          </Field>
          <Field label="นามสกุล" required>
            <input value={form.last_name} onChange={e => setForm({ ...form, last_name: e.target.value })}
              placeholder="นามสกุล" className={inputCls} autoComplete="family-name" />
          </Field>
          <Field label="ชื่อเล่น">
            <input value={form.nickname} onChange={e => setForm({ ...form, nickname: e.target.value })}
              placeholder="ชื่อเล่น" className={inputCls} />
          </Field>
          <Field label="เพศ">
            <select value={form.gender} onChange={e => setForm({ ...form, gender: e.target.value })} className={selectCls}>
              <option value="unknown">ไม่ระบุ</option>
              <option value="male">ชาย</option>
              <option value="female">หญิง</option>
              <option value="other">อื่นๆ</option>
            </select>
          </Field>
          <Field label="วันเกิด">
            <input type="date" value={form.dob} onChange={e => setForm({ ...form, dob: e.target.value })} className={inputCls} />
          </Field>
          <Field label="หมู่เลือด">
            <select value={form.blood_type} onChange={e => setForm({ ...form, blood_type: e.target.value })} className={selectCls}>
              <option value="unknown">ไม่ทราบ</option>
              {['A','B','AB','O'].map(b => <option key={b} value={b}>{b}</option>)}
            </select>
          </Field>
        </div>
      </div>

      {/* ── ติดต่อ ── */}
      <div className="border-t border-slate-100 pt-4">
        <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-widest mb-3">ช่องทางติดต่อ</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <Field label="เบอร์โทร">
            <input value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })}
              placeholder="0812345678" type="tel" className={inputCls} autoComplete="tel" />
          </Field>
          <Field label="LINE ID">
            <input value={form.line_id} onChange={e => setForm({ ...form, line_id: e.target.value })}
              placeholder="@line_id" className={inputCls} />
          </Field>
          <Field label="อีเมล">
            <input value={form.email} onChange={e => setForm({ ...form, email: e.target.value })}
              placeholder="email@example.com" type="email" className={inputCls} autoComplete="email" />
          </Field>
          <Field label="เลขบัตรประชาชน" hint="เก็บเฉพาะเมื่อจำเป็น (PDPA)">
            <input value={form.id_card} onChange={e => setForm({ ...form, id_card: e.target.value })}
              placeholder="x-xxxx-xxxxx-xx-x" className={inputCls} />
          </Field>
          <div className="col-span-2">
            <Field label="ที่อยู่">
              <textarea rows={2} value={form.address} onChange={e => setForm({ ...form, address: e.target.value })}
                placeholder="บ้านเลขที่ ซอย ถนน ตำบล อำเภอ จังหวัด" className={inputCls + ' resize-none'} />
            </Field>
          </div>
        </div>
      </div>

      {/* ── ข้อมูลทางการแพทย์ ── */}
      <div className="border-t border-slate-100 pt-4">
        <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-widest mb-3">ข้อมูลทางการแพทย์</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <Field label="แพ้ยา / แพ้อาหาร" hint="สำคัญ — จะแสดงเตือนตอนสร้าง Order">
            <input value={form.allergies} onChange={e => setForm({ ...form, allergies: e.target.value })}
              placeholder="เช่น แพ้ Penicillin, แพ้กุ้ง" className={inputCls} />
          </Field>
          <Field label="โรคประจำตัว">
            <input value={form.chronic_diseases} onChange={e => setForm({ ...form, chronic_diseases: e.target.value })}
              placeholder="เช่น เบาหวาน, ความดันสูง" className={inputCls} />
          </Field>
        </div>
      </div>

      {/* ── PDPA ── */}
      <div className="border-t border-slate-100 pt-4">
        <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-widest mb-3">การยินยอมข้อมูล (PDPA)</p>
        <div className="flex items-start gap-3">
          <input type="checkbox" id="consent_given_cust" checked={form.consent_given}
            onChange={e => setForm({ ...form, consent_given: e.target.checked, consent_at: e.target.checked ? form.consent_at : '' })}
            className="mt-0.5 h-4 w-4 rounded border-slate-300 text-indigo-600" />
          <label htmlFor="consent_given_cust" className="text-sm text-slate-600">
            ผู้ป่วยยินยอมให้เก็บและใช้ข้อมูลส่วนตัวแล้ว
          </label>
        </div>
        {form.consent_given && (
          <div className="mt-3">
            <Field label="วันที่ยินยอม">
              <input type="date" value={form.consent_at} onChange={e => setForm({ ...form, consent_at: e.target.value })} className={inputCls} />
            </Field>
          </div>
        )}
      </div>

      {/* ── หมายเหตุ ── */}
      <div className="border-t border-slate-100 pt-4">
        <Field label="หมายเหตุ">
          <textarea rows={2} value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })}
            placeholder="บันทึกเพิ่มเติม" className={inputCls + ' resize-none'} />
        </Field>
      </div>

    </div>
  )
}

// ── Helper: age from dob ──────────────────────────────────────────────────────
function age(dob: string | null): string {
  if (!dob) return '—'
  const y = new Date().getFullYear() - new Date(dob).getFullYear()
  return `${y} ปี`
}

// ── Main component ────────────────────────────────────────────────────────────
export default function Customers() {
  const [customers, setCustomers] = useState<Customer[]>([])
  const [loading, setLoading]     = useState(true)
  const [loadError, setLoadError] = useState('')
  const [search, setSearch]       = useState('')
  const [filterConsent, setFilterConsent] = useState<'all' | 'yes' | 'no'>('all')

  // Add
  const [showAdd, setShowAdd]   = useState(false)
  const [addForm, setAddForm]   = useState<CustomerForm>({ ...EMPTY_FORM })
  const [saving, setSaving]     = useState(false)
  const [addError, setAddError] = useState('')

  // Edit
  const [editingRow, setEditingRow] = useState<Customer | null>(null)
  const [editForm, setEditForm]     = useState<CustomerForm>({ ...EMPTY_FORM })
  const [savingEdit, setSavingEdit] = useState(false)
  const [editError, setEditError]   = useState('')

  // Delete
  const [confirmDelete, setConfirmDelete] = useState<number | null>(null)
  const [deleting, setDeleting]           = useState(false)

  // Orders lookup (count per customer)
  const [orderCounts, setOrderCounts] = useState<Record<number, number>>({})

  // Pagination
  const [visibleCount, setVisibleCount] = useState(20)

  const canInsert = useCan('insert', 'customers')
  const canUpdate = useCan('update', 'customers')
  const canDelete = useCan('delete', 'customers')
  const supabase  = createClient()

  async function load() {
    setLoadError('')
    const [c, o] = await Promise.all([
      supabase.from('customers')
        .select('id, hn, first_name, last_name, nickname, gender, dob, phone, line_id, email, id_card, blood_type, allergies, chronic_diseases, address, consent_given, consent_at, notes, created_at, updated_at')
        .order('first_name'),
      supabase.from('orders').select('id, customer_id').not('customer_id', 'is', null),
    ])
    if (c.error) { setLoadError(c.error.message); setLoading(false); return }
    setCustomers(c.data || [])
    // Build order count map
    const counts: Record<number, number> = {}
    for (const ord of o.data || []) {
      if (ord.customer_id) counts[ord.customer_id] = (counts[ord.customer_id] || 0) + 1
    }
    setOrderCounts(counts)
    setLoading(false)
  }
  useEffect(() => { load() }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // ── Add ──────────────────────────────────────────────────────────────────
  async function saveAdd() {
    setSaving(true); setAddError('')
    if (!addForm.first_name.trim() || !addForm.last_name.trim()) {
      setAddError('กรุณาระบุชื่อและนามสกุล')
      setSaving(false); return
    }
    const { error } = await supabase.from('customers').insert([{
      hn:               addForm.hn.trim()              || null,
      first_name:       addForm.first_name.trim(),
      last_name:        addForm.last_name.trim(),
      nickname:         addForm.nickname.trim()         || null,
      gender:           addForm.gender,
      dob:              addForm.dob                     || null,
      phone:            addForm.phone.trim()            || null,
      line_id:          addForm.line_id.trim()          || null,
      email:            addForm.email.trim()            || null,
      id_card:          addForm.id_card.trim()          || null,
      blood_type:       addForm.blood_type,
      allergies:        addForm.allergies.trim()        || null,
      chronic_diseases: addForm.chronic_diseases.trim() || null,
      address:          addForm.address.trim()          || null,
      consent_given:    addForm.consent_given,
      consent_at:       addForm.consent_given && addForm.consent_at ? addForm.consent_at : null,
      notes:            addForm.notes.trim()            || null,
    }])
    if (error) {
      setAddError(error.code === '23505' ? 'HN นี้มีอยู่ในระบบแล้ว' : error.message)
      setSaving(false); return
    }
    setShowAdd(false)
    setAddForm({ ...EMPTY_FORM })
    await load()
    setSaving(false)
    showToast('เพิ่มผู้ป่วยแล้ว')
  }

  // ── Edit ─────────────────────────────────────────────────────────────────
  function openEdit(c: Customer) {
    setEditingRow(c)
    setEditForm({
      hn:               c.hn              || '',
      first_name:       c.first_name,
      last_name:        c.last_name,
      nickname:         c.nickname        || '',
      gender:           c.gender          || 'unknown',
      dob:              c.dob             || '',
      phone:            c.phone           || '',
      line_id:          c.line_id         || '',
      email:            c.email           || '',
      id_card:          c.id_card         || '',
      blood_type:       c.blood_type      || 'unknown',
      allergies:        c.allergies       || '',
      chronic_diseases: c.chronic_diseases || '',
      address:          c.address         || '',
      consent_given:    c.consent_given,
      consent_at:       c.consent_at      || '',
      notes:            c.notes           || '',
    })
    setEditError('')
  }

  async function saveEdit() {
    if (!editingRow) return
    setSavingEdit(true); setEditError('')
    const { error } = await supabase.from('customers').update({
      hn:               editForm.hn.trim()              || null,
      first_name:       editForm.first_name.trim(),
      last_name:        editForm.last_name.trim(),
      nickname:         editForm.nickname.trim()         || null,
      gender:           editForm.gender,
      dob:              editForm.dob                     || null,
      phone:            editForm.phone.trim()            || null,
      line_id:          editForm.line_id.trim()          || null,
      email:            editForm.email.trim()            || null,
      id_card:          editForm.id_card.trim()          || null,
      blood_type:       editForm.blood_type,
      allergies:        editForm.allergies.trim()        || null,
      chronic_diseases: editForm.chronic_diseases.trim() || null,
      address:          editForm.address.trim()          || null,
      consent_given:    editForm.consent_given,
      consent_at:       editForm.consent_given && editForm.consent_at ? editForm.consent_at : null,
      notes:            editForm.notes.trim()            || null,
    }).eq('id', editingRow.id)
    setSavingEdit(false)
    if (error) { setEditError(error.message); return }
    setEditingRow(null)
    await load()
    showToast('บันทึกข้อมูลผู้ป่วยแล้ว')
  }

  // ── Delete ────────────────────────────────────────────────────────────────
  async function deleteRow(id: number) {
    setDeleting(true)
    const { error } = await supabase.from('customers').delete().eq('id', id)
    setDeleting(false)
    if (error) { showToast(error.message, 'error'); return }
    setConfirmDelete(null)
    setCustomers(prev => prev.filter(c => c.id !== id))
    showToast('ลบผู้ป่วยแล้ว')
  }

  // ── Filter ────────────────────────────────────────────────────────────────
  const filtered = useMemo(() => {
    let list = customers
    if (filterConsent === 'yes') list = list.filter(c => c.consent_given)
    if (filterConsent === 'no')  list = list.filter(c => !c.consent_given)
    if (!search) return list
    const q = search.toLowerCase()
    return list.filter(c =>
      (c.hn            || '').toLowerCase().includes(q) ||
      (c.first_name       ).toLowerCase().includes(q) ||
      (c.last_name        ).toLowerCase().includes(q) ||
      (c.nickname      || '').toLowerCase().includes(q) ||
      (c.phone         || '').includes(q) ||
      (c.line_id       || '').toLowerCase().includes(q) ||
      (c.allergies     || '').toLowerCase().includes(q) ||
      (c.chronic_diseases || '').toLowerCase().includes(q),
    )
  }, [customers, search, filterConsent])

  useEffect(() => { setVisibleCount(20) }, [search, filterConsent])

  const totalConsent    = customers.filter(c => c.consent_given).length
  const totalNoConsent  = customers.length - totalConsent
  const totalWithOrders = Object.keys(orderCounts).length

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <div className={pagePadCls}>

      {/* Header */}
      <div className="flex items-center justify-between gap-2">
        <div>
          <h1 className="text-lg md:text-xl font-semibold text-slate-900">ลูกค้า / ผู้ป่วย</h1>
          <p className="text-sm text-slate-400 mt-0.5">ทะเบียนผู้ป่วย — {customers.length} ราย</p>
        </div>
        {canInsert && (
          <button onClick={() => { setAddForm({ ...EMPTY_FORM }); setAddError(''); setShowAdd(true) }} className={btnPrimary}>
            <IconPlus />เพิ่มผู้ป่วย
          </button>
        )}
      </div>

      {loadError && (
        <div className="bg-red-50 border border-red-100 rounded-2xl px-4 py-3 text-sm text-red-600 flex items-center gap-3">
          <span className="flex-1">{loadError}</span>
          <button onClick={load} className="underline shrink-0">ลองใหม่</button>
        </div>
      )}

      {/* KPI cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: 'ผู้ป่วยทั้งหมด',      value: customers.length,    color: 'bg-indigo-500' },
          { label: 'ยินยอม PDPA แล้ว',    value: totalConsent,         color: 'bg-emerald-500' },
          { label: 'ยังไม่ยินยอม PDPA',  value: totalNoConsent,       color: 'bg-amber-500' },
          { label: 'มีประวัติ Order',      value: totalWithOrders,      color: 'bg-violet-500' },
        ].map(({ label, value, color }) => (
          <div key={label} className="bg-white rounded-2xl border border-slate-100 p-5 shadow-sm relative overflow-hidden">
            <div className={`absolute top-0 left-0 right-0 h-0.5 ${color}`} />
            <p className="text-xs text-slate-400 mb-2 mt-1">{label}</p>
            <p className="text-2xl font-semibold text-slate-900">{value}</p>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="flex gap-2 flex-wrap items-center">
        <SearchInput value={search} onChange={setSearch} placeholder="ค้นหา HN, ชื่อ, เบอร์, แพ้ยา..." />
        <div className="flex gap-1">
          {(['all','yes','no'] as const).map(v => (
            <button key={v} onClick={() => setFilterConsent(v)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors ${
                filterConsent === v
                  ? 'bg-indigo-600 text-white border-indigo-600'
                  : 'bg-white border-slate-200 text-slate-500 hover:bg-slate-50'
              }`}>
              {v === 'all' ? 'ทั้งหมด' : v === 'yes' ? 'ยินยอมแล้ว' : 'ยังไม่ยินยอม'}
            </button>
          ))}
        </div>
      </div>

      {/* Table */}
      <div className={tableWrapCls}>
        <div className="px-4 py-3 border-b border-slate-100 flex items-center justify-between">
          <span className="text-sm text-slate-400 tabular-nums">{filtered.length} ราย</span>
        </div>

        {/* Desktop */}
        <div className="hidden md:block overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-slate-50/60 border-b border-slate-100">
                <th className={thCls}>HN</th>
                <th className={thCls}>ชื่อ-นามสกุล</th>
                <th className={thCls}>เพศ / อายุ</th>
                <th className={thCls}>เบอร์โทร</th>
                <th className={thCls}>แพ้ยา / โรคประจำตัว</th>
                <th className={thCls}>PDPA</th>
                <th className={thCls}>Orders</th>
                <th className={thCls}></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100/60">
              {loading ? (
                <TableSkeleton cols={8} />
              ) : filtered.length === 0 ? (
                <EmptyState message="ไม่พบผู้ป่วย" />
              ) : filtered.slice(0, visibleCount).map(c => (
                <tr key={c.id} className="hover:bg-slate-50/60 transition-colors">
                  {/* HN */}
                  <td className={tdCls}>
                    {c.hn
                      ? <span className="font-mono text-xs font-semibold bg-indigo-50 text-indigo-700 px-2 py-1 rounded-lg">{c.hn}</span>
                      : <span className="text-slate-200 text-xs">—</span>}
                  </td>
                  {/* ชื่อ */}
                  <td className={tdCls}>
                    <p className="font-semibold text-slate-900">{c.first_name} {c.last_name}</p>
                    {c.nickname && <p className="text-xs text-slate-400">({c.nickname})</p>}
                  </td>
                  {/* เพศ/อายุ */}
                  <td className={`${tdCls} whitespace-nowrap`}>
                    <span className="text-sm text-slate-600">
                      {GENDERS[c.gender || 'unknown']} {c.dob ? `· ${age(c.dob)}` : ''}
                    </span>
                    {c.blood_type && c.blood_type !== 'unknown' && (
                      <span className="ml-2 text-xs bg-red-50 text-red-600 px-1.5 py-0.5 rounded font-semibold">{c.blood_type}</span>
                    )}
                  </td>
                  {/* เบอร์ */}
                  <td className={tdCls}>
                    {c.phone
                      ? <a href={`tel:${c.phone}`} className="text-sm text-indigo-600 hover:underline">{c.phone}</a>
                      : <span className="text-slate-200">—</span>}
                    {c.line_id && <p className="text-xs text-slate-400 mt-0.5">LINE: {c.line_id}</p>}
                  </td>
                  {/* แพ้/โรค */}
                  <td className={`${tdCls} max-w-[180px]`}>
                    {c.allergies && (
                      <p className="text-xs text-red-600 font-medium flex items-center gap-1">
                        <span>⚠</span>
                        <span className="truncate">{c.allergies}</span>
                      </p>
                    )}
                    {c.chronic_diseases && (
                      <p className="text-xs text-amber-600 truncate">{c.chronic_diseases}</p>
                    )}
                    {!c.allergies && !c.chronic_diseases && <span className="text-slate-200 text-xs">—</span>}
                  </td>
                  {/* PDPA */}
                  <td className={tdCls}>
                    {c.consent_given
                      ? <span className="text-xs bg-emerald-50 text-emerald-600 px-2 py-1 rounded-lg font-medium">ยินยอม ✓</span>
                      : <span className="text-xs bg-red-50 text-red-400 px-2 py-1 rounded-lg">ยังไม่ยินยอม</span>}
                  </td>
                  {/* Orders */}
                  <td className={tdCls}>
                    {orderCounts[c.id]
                      ? (
                        <Link href={`/orders?customer=${c.id}`}
                          className="text-xs font-semibold text-indigo-600 hover:underline">
                          {orderCounts[c.id]} orders
                        </Link>
                      )
                      : <span className="text-slate-200 text-xs">—</span>}
                  </td>
                  {/* Actions */}
                  <td className={`${tdCls} whitespace-nowrap`}>
                    <div className="flex items-center gap-1">
                      {canUpdate && (
                        <button onClick={() => openEdit(c)} className={btnSecondary}>
                          <IconPencil />แก้ไข
                        </button>
                      )}
                      {canDelete && (
                        <button onClick={() => setConfirmDelete(c.id)} className={btnDanger}>
                          <IconTrash />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {visibleCount < filtered.length && (
            <div className="px-4 py-4 border-t border-slate-100 text-center">
              <button onClick={() => setVisibleCount(v => v + 20)}
                className="text-sm text-indigo-600 font-medium hover:text-indigo-800 transition-colors">
                ดูเพิ่มเติม ({filtered.length - visibleCount} ราย)
              </button>
            </div>
          )}
        </div>

        {/* Mobile cards */}
        <div className="md:hidden divide-y divide-slate-100">
          {loading ? (
            <div className="p-6 text-center text-sm text-slate-400">กำลังโหลด...</div>
          ) : filtered.length === 0 ? (
            <div className="p-6 text-center text-sm text-slate-400">ไม่พบผู้ป่วย</div>
          ) : filtered.slice(0, visibleCount).map(c => (
            <div key={c.id} className="p-4 space-y-2">
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    {c.hn && <span className="font-mono text-[10px] font-semibold bg-indigo-50 text-indigo-700 px-1.5 py-0.5 rounded">HN {c.hn}</span>}
                    <span className="text-sm font-semibold text-slate-900">{c.first_name} {c.last_name}</span>
                    {c.blood_type && c.blood_type !== 'unknown' && (
                      <span className="text-xs bg-red-50 text-red-600 px-1.5 py-0.5 rounded font-semibold">{c.blood_type}</span>
                    )}
                  </div>
                  <div className="flex items-center gap-2 mt-1 flex-wrap text-xs text-slate-400">
                    <span>{GENDERS[c.gender || 'unknown']}{c.dob ? ` · ${age(c.dob)}` : ''}</span>
                    {c.phone && <span>{c.phone}</span>}
                  </div>
                  {c.allergies && (
                    <p className="text-xs text-red-600 font-medium mt-1">⚠ แพ้ {c.allergies}</p>
                  )}
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  {canUpdate && <button onClick={() => openEdit(c)} className={btnSecondary}><IconPencil /></button>}
                  {canDelete && <button onClick={() => setConfirmDelete(c.id)} className={btnDanger}><IconTrash /></button>}
                </div>
              </div>
            </div>
          ))}
          {visibleCount < filtered.length && (
            <div className="p-4 text-center">
              <button onClick={() => setVisibleCount(v => v + 20)}
                className="text-sm text-indigo-600 font-medium">
                ดูเพิ่มเติม ({filtered.length - visibleCount} ราย)
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Modals */}
      <ConfirmModal
        open={confirmDelete !== null}
        onClose={() => setConfirmDelete(null)}
        onConfirm={() => deleteRow(confirmDelete!)}
        loading={deleting}
        title="ยืนยันลบผู้ป่วย"
        message="ข้อมูลผู้ป่วยจะถูกลบถาวร แต่ Order ที่เชื่อมอยู่จะยังคงอยู่ (customer_id จะเป็น null)"
      />

      <Modal open={showAdd} onClose={() => setShowAdd(false)} title="เพิ่มผู้ป่วยใหม่" width="max-w-2xl">
        <CustomerFormFields form={addForm} setForm={setAddForm} />
        {addError && <p className="text-sm bg-red-50 text-red-600 border border-red-100 rounded-xl px-3.5 py-2.5 mt-4">{addError}</p>}
        <div className="flex gap-2 mt-6">
          <button onClick={saveAdd} disabled={saving}
            className="flex-1 bg-indigo-600 text-white py-2.5 rounded-xl text-sm font-semibold disabled:opacity-40 hover:bg-indigo-500 transition-colors">
            {saving ? 'กำลังบันทึก...' : 'บันทึกผู้ป่วย'}
          </button>
          <button onClick={() => setShowAdd(false)} className="px-5 py-2.5 text-sm text-slate-500 rounded-xl hover:bg-slate-100">ยกเลิก</button>
        </div>
      </Modal>

      <Modal open={!!editingRow} onClose={() => setEditingRow(null)} title="แก้ไขข้อมูลผู้ป่วย" width="max-w-2xl">
        <CustomerFormFields form={editForm} setForm={setEditForm} />
        {editError && <p className="text-sm bg-red-50 text-red-600 border border-red-100 rounded-xl px-3.5 py-2.5 mt-4">{editError}</p>}
        <div className="flex gap-2 mt-6">
          <button onClick={saveEdit} disabled={savingEdit}
            className="flex-1 bg-indigo-600 text-white py-2.5 rounded-xl text-sm font-semibold disabled:opacity-40 hover:bg-indigo-500 transition-colors">
            {savingEdit ? 'กำลังบันทึก...' : 'บันทึกการแก้ไข'}
          </button>
          <button onClick={() => setEditingRow(null)} className="px-5 py-2.5 text-sm text-slate-500 rounded-xl hover:bg-slate-100">ยกเลิก</button>
        </div>
      </Modal>

    </div>
  )
}
