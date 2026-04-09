'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import JSZip from 'jszip'
import { saveAs } from 'file-saver'
import { jsPDF } from 'jspdf'
import { collection, getDocs } from 'firebase/firestore'
import { db } from '@/lib/firebase'
import type { Driver } from '../types'

// ── Constants ─────────────────────────────────────────────────────────────────

const PAGE_SIZE = 10

// ── Local types ───────────────────────────────────────────────────────────────

type Filter  = 'all' | 'active' | 'disabled'
type SortKey = 'name' | 'email' | 'status' | 'createdAt'

interface DriverDoc {
  id: string
  name?: string
  type?: string
  url?: string
  downloadURL?: string
  expiryDate?: string | null
  status?: string
}

interface OpenMenu {
  uid: string
  style: React.CSSProperties
}

// ── Pure helpers ──────────────────────────────────────────────────────────────

function displayName(d: Driver): string {
  if (d.name) return d.name
  const parts = [d.firstName, d.middleName, d.lastName].filter(Boolean)
  return parts.length > 0 ? parts.join(' ') : (d.email ?? '')
}

function fmtDate(iso: string | null | undefined): string {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString('en-CA', {
    year: 'numeric', month: 'short', day: 'numeric',
  })
}

function generateCSV(rows: Driver[]): string {
  const headers = ['Name', 'Email', 'Phone', 'License #', 'Class', 'Status', 'Joined Date', 'Experience (yrs)']
  const data = rows.map((d) => [
    displayName(d),
    d.email || '',
    d.phone || '',
    d.license?.number || '',
    d.license?.class || '',
    d.status || 'active',
    fmtDate(d.createdAt),
    String(d.yearsOfExperience ?? ''),
  ])
  return [headers, ...data]
    .map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(','))
    .join('\r\n')
}

function paginationRange(current: number, total: number): (number | '…')[] {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1)
  if (current <= 4) return [1, 2, 3, 4, 5, '…', total]
  if (current >= total - 3) return [1, '…', total - 4, total - 3, total - 2, total - 1, total]
  return [1, '…', current - 1, current, current + 1, '…', total]
}

// ── Firebase helpers ──────────────────────────────────────────────────────────

async function fetchDriverDocs(uid: string): Promise<DriverDoc[]> {
  try {
    const snap = await getDocs(collection(db, 'users', uid, 'documents'))
    return snap.docs.map((d) => ({ id: d.id, ...d.data() } as DriverDoc))
  } catch {
    return []
  }
}

// ── PDF builder ───────────────────────────────────────────────────────────────

function buildDriverPDF(driver: Driver & { documents: DriverDoc[] }): Blob {
  const doc = new jsPDF()
  const M = 20
  let y = 25

  doc.setFontSize(20)
  doc.setFont('helvetica', 'bold')
  doc.text(displayName(driver), M, y)
  y += 8

  doc.setFontSize(9)
  doc.setFont('helvetica', 'normal')
  doc.setTextColor(140)
  doc.text(`Generated ${new Date().toLocaleDateString()}`, M, y)
  y += 10
  doc.setTextColor(0)

  doc.setDrawColor(220)
  doc.line(M, y, 190, y)
  y += 10

  function section(title: string) {
    doc.setFontSize(12)
    doc.setFont('helvetica', 'bold')
    doc.text(title, M, y)
    y += 7
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(10)
  }

  function kv(label: string, value: string, indent = 0) {
    doc.setFont('helvetica', 'bold')
    doc.text(`${label}:`, M + indent, y)
    doc.setFont('helvetica', 'normal')
    doc.text(value || '—', M + indent + 40, y)
    y += 6
  }

  section('Contact Information')
  kv('Email', driver.email)
  kv('Phone', driver.phone || '—')
  kv('Status', (driver.status || 'active').toUpperCase())
  kv('Joined', fmtDate(driver.createdAt))
  y += 4

  section('License')
  kv('Number', driver.license?.number || '—')
  kv('Class', driver.license?.class || '—')
  kv('Expiry', driver.license?.expiry || '—')
  kv('Province/State', driver.license?.provinceState || '—')
  kv('Experience', `${driver.yearsOfExperience ?? 0} years`)
  y += 4

  if (driver.documents.length > 0) {
    section('Documents')
    for (const d of driver.documents) {
      const expiry = d.expiryDate ? ` — exp. ${d.expiryDate}` : ''
      const status = d.status ? ` [${d.status}]` : ''
      doc.text(`• ${d.name || d.type || 'Document'}${status}${expiry}`, M + 4, y)
      y += 5.5
      if (y > 270) { doc.addPage(); y = 20 }
    }
    y += 4
  }

  if (driver.internalNotes) {
    section('Notes')
    const lines = doc.splitTextToSize(driver.internalNotes, 160)
    doc.text(lines, M, y)
  }

  return doc.output('blob')
}

// ── Download functions ────────────────────────────────────────────────────────

async function downloadOneDriver(driver: Driver) {
  const docs = await fetchDriverDocs(driver.uid)
  const driverWithDocs = { ...driver, documents: docs }
  const zip  = new JSZip()
  const safe = displayName(driver).replace(/[^a-z0-9]/gi, '_')

  zip.file('driver_info.json', JSON.stringify(driverWithDocs, null, 2))

  try {
    zip.file('driver_info.pdf', buildDriverPDF(driverWithDocs))
  } catch { /* skip PDF if generation fails */ }

  if (docs.length > 0) {
    const folder = zip.folder('documents')
    for (const d of docs) {
      const fileURL = d.downloadURL || d.url
      if (!fileURL) continue
      try {
        const res = await fetch(fileURL)
        if (!res.ok) continue
        const blob = await res.blob()
        const ext  = (fileURL.split('?')[0].split('.').pop() ?? 'bin').toLowerCase()
        const fn   = (d.name || d.type || 'document').replace(/[^a-z0-9]/gi, '_') + '.' + ext
        folder?.file(fn, blob)
      } catch { /* skip unfetchable file */ }
    }
  }

  const blob = await zip.generateAsync({ type: 'blob' })
  saveAs(blob, `${safe}_Profile.zip`)
}

async function downloadDrivers(driversToDownload: Driver[], zipName: string) {
  const zip     = new JSZip()
  const allData: object[] = []

  for (const driver of driversToDownload) {
    const docs          = await fetchDriverDocs(driver.uid)
    const driverWithDocs = { ...driver, documents: docs }
    allData.push(driverWithDocs)

    const folderName = displayName(driver).replace(/[^a-z0-9]/gi, '_') || driver.uid
    const folder     = zip.folder(folderName)

    folder?.file('driver_info.json', JSON.stringify(driverWithDocs, null, 2))
    try { folder?.file('driver_info.pdf', buildDriverPDF(driverWithDocs)) } catch {}

    if (docs.length > 0) {
      const docsFolder = folder?.folder('documents')
      for (const d of docs) {
        const fileURL = d.downloadURL || d.url
        if (!fileURL) continue
        try {
          const res = await fetch(fileURL)
          if (!res.ok) continue
          const blob = await res.blob()
          const ext  = (fileURL.split('?')[0].split('.').pop() ?? 'bin').toLowerCase()
          const fn   = (d.name || d.type || 'document').replace(/[^a-z0-9]/gi, '_') + '.' + ext
          docsFolder?.file(fn, blob)
        } catch {}
      }
    }
  }

  zip.file('all_drivers.json', JSON.stringify(allData, null, 2))
  zip.file('all_drivers.csv', generateCSV(driversToDownload))

  const blob = await zip.generateAsync({ type: 'blob' })
  saveAs(blob, zipName)
}

// ── Sub-components ────────────────────────────────────────────────────────────

function SortTh({
  col, label, active, dir, onSort,
}: {
  col: SortKey; label: string; active: boolean; dir: 'asc' | 'desc'; onSort: () => void
}) {
  return (
    <th
      onClick={onSort}
      className="cursor-pointer select-none px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-zinc-400 transition-colors hover:text-zinc-700"
    >
      <span className="flex items-center gap-1">
        {label}
        <span className={active ? 'text-zinc-500' : 'text-zinc-300'}>
          {active ? (dir === 'asc' ? '↑' : '↓') : '↕'}
        </span>
      </span>
    </th>
  )
}

function StatusBadge({ status }: { status?: string }) {
  const disabled = status === 'disabled'
  return (
    <span className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold ring-1 ${
      disabled
        ? 'bg-red-50 text-red-700 ring-red-200'
        : 'bg-green-50 text-green-700 ring-green-200'
    }`}>
      {disabled ? 'Disabled' : 'Active'}
    </span>
  )
}

// ── Main component ────────────────────────────────────────────────────────────

export default function DriversView({
  drivers,
  loading,
  onDisable,
  onEnable,
  onDelete,
  onBulkDisable,
  onBulkEnable,
}: {
  drivers: Driver[]
  loading: boolean
  onDisable: (uid: string) => void
  onEnable:  (uid: string) => void
  onDelete:  (uid: string) => void
  onBulkDisable: (uids: string[]) => void
  onBulkEnable:  (uids: string[]) => void
}) {
  const router = useRouter()

  // ── UI state ─────────────────────────────────────────────────────────────
  const [filter,   setFilter]   = useState<Filter>('all')
  const [search,   setSearch]   = useState('')
  const [sortKey,  setSortKey]  = useState<SortKey | null>(null)
  const [sortDir,  setSortDir]  = useState<'asc' | 'desc'>('asc')
  const [page,     setPage]     = useState(1)
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [openMenu, setOpenMenu] = useState<OpenMenu | null>(null)
  const [downloading, setDownloading] = useState<string | null>(null)

  const masterRef = useRef<HTMLInputElement>(null)
  const searchRef = useRef<HTMLInputElement>(null)

  // ── Derived values ────────────────────────────────────────────────────────

  const now          = new Date()
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)

  const counts = {
    total:     drivers.length,
    active:    drivers.filter((d) => d.status !== 'disabled').length,
    disabled:  drivers.filter((d) => d.status === 'disabled').length,
    thisMonth: drivers.filter((d) => d.createdAt && new Date(d.createdAt) >= startOfMonth).length,
  }

  // Filter by tab
  const afterFilter = drivers.filter((d) => {
    if (filter === 'active')   return d.status !== 'disabled'
    if (filter === 'disabled') return d.status === 'disabled'
    return true
  })

  // Filter by search
  const q           = search.toLowerCase().trim()
  const qDigits    = q.replace(/\D/g, '')
  const afterSearch = q
    ? afterFilter.filter((d) =>
        (displayName(d) || '').toLowerCase().includes(q) ||
        (d.email || '').toLowerCase().includes(q) ||
        (qDigits.length > 0 && (d.phone || '').replace(/\D/g, '').includes(qDigits)) ||
        (d.phone || '').toLowerCase().includes(q)
      )
    : afterFilter

  // Sort
  const sorted: Driver[] = sortKey
    ? [...afterSearch].sort((a, b) => {
        let av = '', bv = ''
        if (sortKey === 'name')      { av = displayName(a); bv = displayName(b) }
        if (sortKey === 'email')     { av = a.email || '';  bv = b.email || '' }
        if (sortKey === 'status')    { av = a.status || ''; bv = b.status || '' }
        if (sortKey === 'createdAt') { av = a.createdAt || ''; bv = b.createdAt || '' }
        const cmp = av.localeCompare(bv)
        return sortDir === 'asc' ? cmp : -cmp
      })
    : afterSearch

  const totalPages   = Math.max(1, Math.ceil(sorted.length / PAGE_SIZE))
  const currentPage  = Math.min(Math.max(1, page), totalPages)
  const paginated    = sorted.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE)
  const showStart    = sorted.length === 0 ? 0 : (currentPage - 1) * PAGE_SIZE + 1
  const showEnd      = Math.min(currentPage * PAGE_SIZE, sorted.length)

  const allOnPage  = paginated.length > 0 && paginated.every((d) => selected.has(d.uid))
  const someOnPage = paginated.some((d) => selected.has(d.uid))

  // ── Effects ───────────────────────────────────────────────────────────────

  // Master checkbox indeterminate state
  useEffect(() => {
    if (masterRef.current) {
      masterRef.current.indeterminate = someOnPage && !allOnPage
    }
  }, [someOnPage, allOnPage])

  // Close menu on click outside
  useEffect(() => {
    if (!openMenu) return
    function handler(e: MouseEvent) {
      const target = e.target as Element
      if (!target.closest('[data-menu]')) setOpenMenu(null)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [openMenu])

  // ── Handlers ──────────────────────────────────────────────────────────────

  function handleFilter(f: Filter) { setFilter(f); setPage(1) }
  function handleSearch(q: string) { setSearch(q); setPage(1) }

  function handleSort(key: SortKey) {
    if (sortKey === key) setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'))
    else { setSortKey(key); setSortDir('asc') }
    setPage(1)
  }

  function handleSelectOne(uid: string, checked: boolean) {
    setSelected((prev) => {
      const next = new Set(prev)
      checked ? next.add(uid) : next.delete(uid)
      return next
    })
  }

  function handleSelectAll(checked: boolean) {
    setSelected((prev) => {
      const next = new Set(prev)
      paginated.forEach((d) => (checked ? next.add(d.uid) : next.delete(d.uid)))
      return next
    })
  }

  function handleOpenMenu(e: React.MouseEvent<HTMLButtonElement>, uid: string) {
    e.stopPropagation()
    if (openMenu?.uid === uid) { setOpenMenu(null); return }
    const rect       = e.currentTarget.getBoundingClientRect()
    const spaceBelow = window.innerHeight - rect.bottom
    setOpenMenu({
      uid,
      style: {
        position: 'fixed',
        right:    window.innerWidth - rect.right,
        ...(spaceBelow >= 260
          ? { top:    rect.bottom + 6 }
          : { bottom: window.innerHeight - rect.top + 6 }
        ),
      },
    })
  }

  async function handleDownloadOne(driver: Driver) {
    setDownloading(driver.uid)
    try { await downloadOneDriver(driver) }
    catch { alert('Download failed. Please try again.') }
    finally { setDownloading(null) }
  }

  async function handleDownloadAll() {
    setDownloading('all')
    const date = new Date().toISOString().slice(0, 10)
    try { await downloadDrivers(drivers, `All_Drivers_${date}.zip`) }
    catch { alert('Export failed. Please try again.') }
    finally { setDownloading(null) }
  }

  async function handleDownloadSelected() {
    setDownloading('bulk')
    const toExport = drivers.filter((d) => selected.has(d.uid))
    const date     = new Date().toISOString().slice(0, 10)
    try { await downloadDrivers(toExport, `Selected_Drivers_${date}.zip`) }
    catch { alert('Export failed. Please try again.') }
    finally { setDownloading(null) }
  }

  function handleBulkDisable() {
    const uids = Array.from(selected)
    setSelected(new Set())
    onBulkDisable(uids)
  }

  function handleBulkEnable() {
    const uids = Array.from(selected)
    setSelected(new Set())
    onBulkEnable(uids)
  }

  const busy = !!downloading

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="space-y-4">


      {/* ── Toolbar ────────────────────────────────────────────────────────── */}
      <div className="flex flex-wrap items-center gap-3">

        {/* Filter tabs */}
        <div className="flex gap-1 rounded-lg bg-zinc-100 p-1">
          {(['all', 'active', 'disabled'] as Filter[]).map((f) => (
            <button
              key={f}
              onClick={() => handleFilter(f)}
              className={`rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
                filter === f
                  ? 'bg-white text-zinc-900 shadow-sm'
                  : 'text-zinc-500 hover:text-zinc-700'
              }`}
            >
              {f === 'all' ? 'All Drivers' : f.charAt(0).toUpperCase() + f.slice(1)}
              <span className="ml-1.5 text-zinc-400">
                {f === 'all' ? counts.total : f === 'active' ? counts.active : counts.disabled}
              </span>
            </button>
          ))}
        </div>

        {/* Search */}
        <div className="relative flex-1 min-w-48 max-w-xs">
          <svg
            className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400"
            fill="none" stroke="currentColor" viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
              d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <input
            ref={searchRef}
            type="text"
            placeholder="Search name, email, phone…"
            value={search}
            onChange={(e) => handleSearch(e.target.value)}
            className="w-full rounded-lg border border-zinc-300 bg-white py-2 pl-9 pr-8 text-sm text-zinc-900 outline-none focus:border-zinc-500 focus:ring-1 focus:ring-zinc-500"
          />
          {search && (
            <button
              onClick={() => { handleSearch(''); searchRef.current?.focus() }}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-700"
            >
              <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          )}
        </div>

        {/* Right-side buttons */}
        <div className="ml-auto flex items-center gap-2">
          <button
            onClick={handleDownloadAll}
            disabled={busy || loading || drivers.length === 0}
            className="flex items-center gap-1.5 rounded-lg border border-zinc-300 px-3 py-2 text-sm font-medium text-zinc-700 transition-colors hover:bg-zinc-50 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {downloading === 'all' ? (
              <svg className="h-4 w-4 animate-spin" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
              </svg>
            ) : (
              <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
              </svg>
            )}
            {downloading === 'all' ? 'Exporting…' : 'Export All'}
          </button>

          <Link
            href="/admin/drivers/add"
            className="rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-zinc-700"
          >
            + Add Driver
          </Link>
        </div>
      </div>

      {/* ── Bulk action bar ─────────────────────────────────────────────────── */}
      {selected.size > 0 && (
        <div className="flex flex-wrap items-center gap-3 rounded-xl bg-zinc-900 px-4 py-3">
          <span className="text-sm font-medium text-white">
            {selected.size} driver{selected.size !== 1 ? 's' : ''} selected
          </span>
          <button
            onClick={() => setSelected(new Set())}
            className="text-xs text-zinc-400 underline underline-offset-2 hover:text-white"
          >
            Deselect all
          </button>
          <div className="ml-auto flex flex-wrap items-center gap-2">
            <button
              onClick={handleBulkDisable}
              className="rounded-lg border border-zinc-700 px-3 py-1.5 text-xs font-medium text-zinc-300 transition-colors hover:bg-zinc-800 hover:text-white"
            >
              Disable Selected
            </button>
            <button
              onClick={handleBulkEnable}
              className="rounded-lg border border-zinc-700 px-3 py-1.5 text-xs font-medium text-zinc-300 transition-colors hover:bg-zinc-800 hover:text-white"
            >
              Enable Selected
            </button>
            <button
              onClick={handleDownloadSelected}
              disabled={busy}
              className="flex items-center gap-1.5 rounded-lg bg-zinc-700 px-3 py-1.5 text-xs font-medium text-white transition-colors hover:bg-zinc-600 disabled:opacity-50"
            >
              {downloading === 'bulk' ? 'Downloading…' : 'Download Selected'}
            </button>
          </div>
        </div>
      )}

      {/* ── Table ───────────────────────────────────────────────────────────── */}
      <div className="rounded-xl bg-white shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-zinc-100 text-left">

                {/* Master checkbox */}
                <th className="w-10 pl-4 pr-2 py-3">
                  <input
                    ref={masterRef}
                    type="checkbox"
                    checked={allOnPage}
                    onChange={(e) => handleSelectAll(e.target.checked)}
                    className="h-4 w-4 cursor-pointer rounded border-zinc-300 accent-zinc-900"
                    disabled={loading || paginated.length === 0}
                  />
                </th>

                <SortTh col="name"      label="Name"        active={sortKey === 'name'}      dir={sortDir} onSort={() => handleSort('name')} />
                <SortTh col="email"     label="Email"       active={sortKey === 'email'}     dir={sortDir} onSort={() => handleSort('email')} />
                <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-zinc-400">Phone</th>
                <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-zinc-400">License Class</th>
                <SortTh col="createdAt" label="Joined"      active={sortKey === 'createdAt'} dir={sortDir} onSort={() => handleSort('createdAt')} />
                <SortTh col="status"    label="Status"      active={sortKey === 'status'}    dir={sortDir} onSort={() => handleSort('status')} />
                <th className="w-12 py-3 pr-4" />

              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-50">

              {loading && (
                <tr>
                  <td colSpan={8} className="px-6 py-12 text-center text-sm text-zinc-400">
                    Loading drivers…
                  </td>
                </tr>
              )}

              {!loading && paginated.length === 0 && (
                <tr>
                  <td colSpan={8} className="px-6 py-12 text-center text-sm text-zinc-400">
                    {search
                      ? <>No drivers found matching <span className="font-medium text-zinc-600">&quot;{search}&quot;</span></>
                      : filter === 'all'
                        ? <span>No drivers yet. Click <span className="font-medium text-zinc-600">+ Add Driver</span> to create one.</span>
                        : `No ${filter} drivers.`
                    }
                  </td>
                </tr>
              )}

              {paginated.map((driver) => {
                const isDisabled = driver.status === 'disabled'
                const isChecked  = selected.has(driver.uid)
                return (
                  <tr
                    key={driver.uid}
                    onClick={() => router.push(`/admin/drivers/${driver.uid}`)}
                    className={`cursor-pointer transition-colors ${
                      isDisabled ? 'opacity-60' : ''
                    } ${isChecked ? 'bg-zinc-50' : 'hover:bg-zinc-50/70'}`}
                  >
                    {/* Checkbox */}
                    <td
                      className="pl-4 pr-2 py-4"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <input
                        type="checkbox"
                        checked={isChecked}
                        onChange={(e) => handleSelectOne(driver.uid, e.target.checked)}
                        className="h-4 w-4 cursor-pointer rounded border-zinc-300 accent-zinc-900"
                      />
                    </td>

                    <td className="px-6 py-4 font-medium text-zinc-800">
                      {displayName(driver)}
                    </td>
                    <td className="px-6 py-4 text-zinc-600">{driver.email}</td>
                    <td className="px-6 py-4 text-zinc-600">{driver.phone || '—'}</td>
                    <td className="px-6 py-4 text-zinc-600">
                      {driver.license?.class
                        ? <span className="rounded bg-zinc-100 px-2 py-0.5 text-xs font-semibold text-zinc-700">{driver.license.class}</span>
                        : '—'}
                    </td>
                    <td className="px-6 py-4 text-zinc-500 text-xs">{fmtDate(driver.createdAt)}</td>
                    <td className="px-6 py-4"><StatusBadge status={driver.status} /></td>

                    {/* Three dots menu trigger */}
                    <td
                      className="pr-4 py-4 text-right"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <button
                        data-menu="true"
                        onClick={(e) => handleOpenMenu(e, driver.uid)}
                        className="flex h-8 w-8 items-center justify-center rounded-lg text-zinc-400 transition-colors hover:bg-zinc-100 hover:text-zinc-700"
                      >
                        <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 24 24">
                          <circle cx="12" cy="5"  r="1.5" />
                          <circle cx="12" cy="12" r="1.5" />
                          <circle cx="12" cy="19" r="1.5" />
                        </svg>
                      </button>
                    </td>
                  </tr>
                )
              })}

            </tbody>
          </table>
        </div>
      </div>

      {/* ── Pagination ──────────────────────────────────────────────────────── */}
      {!loading && sorted.length > 0 && (
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="text-sm text-zinc-500">
            Showing {showStart}–{showEnd} of {sorted.length} driver{sorted.length !== 1 ? 's' : ''}
          </p>

          {totalPages > 1 && (
            <div className="flex items-center gap-1">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                className="rounded-lg border border-zinc-300 px-3 py-1.5 text-xs font-medium text-zinc-600 transition-colors hover:bg-zinc-50 disabled:cursor-not-allowed disabled:opacity-40"
              >
                Previous
              </button>

              {paginationRange(currentPage, totalPages).map((p, i) =>
                p === '…' ? (
                  <span key={`ellipsis-${i}`} className="px-1 text-zinc-400">…</span>
                ) : (
                  <button
                    key={p}
                    onClick={() => setPage(p as number)}
                    className={`h-8 w-8 rounded-lg text-xs font-medium transition-colors ${
                      currentPage === p
                        ? 'bg-zinc-900 text-white'
                        : 'border border-zinc-300 text-zinc-600 hover:bg-zinc-50'
                    }`}
                  >
                    {p}
                  </button>
                )
              )}

              <button
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
                className="rounded-lg border border-zinc-300 px-3 py-1.5 text-xs font-medium text-zinc-600 transition-colors hover:bg-zinc-50 disabled:cursor-not-allowed disabled:opacity-40"
              >
                Next
              </button>
            </div>
          )}
        </div>
      )}

      {/* ── Three dots dropdown (fixed-positioned) ─────────────────────────── */}
      {openMenu && (() => {
        const driver = drivers.find((d) => d.uid === openMenu.uid)
        if (!driver) return null
        const isDisabled = driver.status === 'disabled'
        return (
          <div
            data-menu="true"
            style={openMenu.style}
            className="z-50 w-52 overflow-hidden rounded-xl border border-zinc-200 bg-white py-1 shadow-xl"
          >
            {/* View */}
            <button
              onClick={() => { setOpenMenu(null); router.push(`/admin/drivers/${driver.uid}`) }}
              className="flex w-full items-center gap-2.5 px-4 py-2.5 text-sm text-zinc-700 transition-colors hover:bg-zinc-50"
            >
              <span className="text-base">👁</span> View Profile
            </button>

            {/* Edit */}
            <button
              onClick={() => { setOpenMenu(null); router.push(`/admin/drivers/${driver.uid}/edit`) }}
              className="flex w-full items-center gap-2.5 px-4 py-2.5 text-sm text-zinc-700 transition-colors hover:bg-zinc-50"
            >
              <span className="text-base">✏️</span> Edit Driver
            </button>

            {/* Download */}
            <button
              onClick={() => { setOpenMenu(null); handleDownloadOne(driver) }}
              disabled={busy}
              className="flex w-full items-center gap-2.5 px-4 py-2.5 text-sm text-zinc-700 transition-colors hover:bg-zinc-50 disabled:opacity-50"
            >
              <span className="text-base">📄</span>
              {downloading === driver.uid ? 'Downloading…' : 'Download Info'}
            </button>

            <div className="my-1 border-t border-zinc-100" />

            {/* Enable / Disable */}
            {isDisabled ? (
              <button
                onClick={() => { setOpenMenu(null); onEnable(driver.uid) }}
                className="flex w-full items-center gap-2.5 px-4 py-2.5 text-sm text-green-700 transition-colors hover:bg-green-50"
              >
                <span className="text-base">✅</span> Enable
              </button>
            ) : (
              <button
                onClick={() => { setOpenMenu(null); onDisable(driver.uid) }}
                className="flex w-full items-center gap-2.5 px-4 py-2.5 text-sm text-orange-700 transition-colors hover:bg-orange-50"
              >
                <span className="text-base">🚫</span> Disable
              </button>
            )}

            <div className="my-1 border-t border-zinc-100" />

            {/* Delete */}
            <button
              onClick={() => { setOpenMenu(null); onDelete(driver.uid) }}
              className="flex w-full items-center gap-2.5 px-4 py-2.5 text-sm text-red-600 transition-colors hover:bg-red-50"
            >
              <span className="text-base">🗑</span> Delete Permanently
            </button>
          </div>
        )
      })()}

    </div>
  )
}
