'use client'

import { useState, useRef, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { auth } from '@/lib/firebase'
import {
  DOCUMENT_TYPES,
  MAX_UPLOAD_BYTES,
  UPLOAD_ACCEPT,
  formatBytes,
  optimizeDriverUpload,
} from '../upload-utils'
import { createDriver } from '@/services/driver.service'
import { uploadDriverDocument } from '@/services/document.service'

// ── Constants ─────────────────────────────────────────────────────────────────

const CANADIAN_PROVINCES = [
  { code: 'AB', name: 'Alberta' },
  { code: 'BC', name: 'British Columbia' },
  { code: 'MB', name: 'Manitoba' },
  { code: 'NB', name: 'New Brunswick' },
  { code: 'NL', name: 'Newfoundland and Labrador' },
  { code: 'NS', name: 'Nova Scotia' },
  { code: 'NT', name: 'Northwest Territories' },
  { code: 'NU', name: 'Nunavut' },
  { code: 'ON', name: 'Ontario' },
  { code: 'PE', name: 'Prince Edward Island' },
  { code: 'QC', name: 'Quebec' },
  { code: 'SK', name: 'Saskatchewan' },
  { code: 'YT', name: 'Yukon' },
]

const US_STATES = [
  { code: 'AL', name: 'Alabama' }, { code: 'AK', name: 'Alaska' },
  { code: 'AZ', name: 'Arizona' }, { code: 'AR', name: 'Arkansas' },
  { code: 'CA', name: 'California' }, { code: 'CO', name: 'Colorado' },
  { code: 'CT', name: 'Connecticut' }, { code: 'DE', name: 'Delaware' },
  { code: 'FL', name: 'Florida' }, { code: 'GA', name: 'Georgia' },
  { code: 'HI', name: 'Hawaii' }, { code: 'ID', name: 'Idaho' },
  { code: 'IL', name: 'Illinois' }, { code: 'IN', name: 'Indiana' },
  { code: 'IA', name: 'Iowa' }, { code: 'KS', name: 'Kansas' },
  { code: 'KY', name: 'Kentucky' }, { code: 'LA', name: 'Louisiana' },
  { code: 'ME', name: 'Maine' }, { code: 'MD', name: 'Maryland' },
  { code: 'MA', name: 'Massachusetts' }, { code: 'MI', name: 'Michigan' },
  { code: 'MN', name: 'Minnesota' }, { code: 'MS', name: 'Mississippi' },
  { code: 'MO', name: 'Missouri' }, { code: 'MT', name: 'Montana' },
  { code: 'NE', name: 'Nebraska' }, { code: 'NV', name: 'Nevada' },
  { code: 'NH', name: 'New Hampshire' }, { code: 'NJ', name: 'New Jersey' },
  { code: 'NM', name: 'New Mexico' }, { code: 'NY', name: 'New York' },
  { code: 'NC', name: 'North Carolina' }, { code: 'ND', name: 'North Dakota' },
  { code: 'OH', name: 'Ohio' }, { code: 'OK', name: 'Oklahoma' },
  { code: 'OR', name: 'Oregon' }, { code: 'PA', name: 'Pennsylvania' },
  { code: 'RI', name: 'Rhode Island' }, { code: 'SC', name: 'South Carolina' },
  { code: 'SD', name: 'South Dakota' }, { code: 'TN', name: 'Tennessee' },
  { code: 'TX', name: 'Texas' }, { code: 'UT', name: 'Utah' },
  { code: 'VT', name: 'Vermont' }, { code: 'VA', name: 'Virginia' },
  { code: 'WA', name: 'Washington' }, { code: 'WV', name: 'West Virginia' },
  { code: 'WI', name: 'Wisconsin' }, { code: 'WY', name: 'Wyoming' },
]

const LICENSE_CLASSES = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'AZ', 'DZ']
const VEHICLE_TYPES   = ['Dry Van', 'Flatbed', 'Reefer', 'Tanker', 'Step Deck', 'Lowboy', 'Car Carrier', 'LTL']
const PREFERRED_ROUTES = ['Local', 'Regional', 'Long Haul', 'Cross Border', 'Team Driving']
const RELATIONSHIPS   = ['Spouse', 'Parent', 'Sibling', 'Friend', 'Other']

// ── Types ─────────────────────────────────────────────────────────────────────

interface DocRow {
  id: string
  name: string
  type: string
  file: File | null
  expiryDate: string
  optimized?: boolean
  originalSize?: number
}

const INITIAL_FORM = {
  firstName: '', middleName: '', lastName: '',
  dateOfBirth: '', gender: '',
  email: '', password: '', confirmPassword: '',
  phone: '',
  emergencyName: '', emergencyPhone: '', emergencyRelationship: '',
  streetAddress: '', city: '', provinceState: '', postalZipCode: '', country: '',
  licenseNumber: '', licenseClass: '', licenseExpiry: '', licenseProvince: '',
  yearsOfExperience: '',
  vehicleTypes: [] as string[],
  preferredRoutes: [] as string[],
  hasHazmat: false, hasFastCard: false, hasTwicCard: false,
  medicalCertExpiry: '',
  internalNotes: '',
  status: 'active' as 'active' | 'inactive',
  sendWelcomeEmail: false,
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function makeDocRow(): DocRow {
  return { id: crypto.randomUUID(), name: '', type: '', file: null, expiryDate: '' }
}

// ── Sub-components ────────────────────────────────────────────────────────────

function SectionHeader({ title }: { title: string }) {
  return (
    <div className="mb-5 flex items-center gap-3">
      <h3 className="shrink-0 text-xs font-semibold uppercase tracking-wider text-zinc-400">{title}</h3>
      <div className="h-px flex-1 bg-zinc-100" />
    </div>
  )
}

function Toggle({ value, onChange }: { value: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={value}
      onClick={() => onChange(!value)}
      className={`relative h-6 w-11 shrink-0 rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-zinc-500 focus:ring-offset-2 ${value ? 'bg-zinc-900' : 'bg-zinc-300'}`}
    >
      <span className={`pointer-events-none absolute top-0.5 left-0.5 h-5 w-5 rounded-full bg-white shadow-sm transition-transform duration-200 ${value ? 'translate-x-5' : 'translate-x-0'}`} />
    </button>
  )
}

function EyeIcon({ open }: { open: boolean }) {
  return open ? (
    <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
    </svg>
  ) : (
    <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
    </svg>
  )
}

function DocumentRowComp({
  row, submitted, onChange, onRemove,
}: {
  row: DocRow
  submitted: boolean
  onChange: (id: string, updates: Partial<DocRow>) => void
  onRemove: (id: string) => void
}) {
  const [showDrop, setShowDrop] = useState(false)
  const dropRef  = useRef<HTMLDivElement>(null)
  const fileRef  = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (!showDrop) return
    function handler(e: MouseEvent) {
      if (dropRef.current && !dropRef.current.contains(e.target as Node)) setShowDrop(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [showDrop])

  const filteredTypes = row.name.trim()
    ? DOCUMENT_TYPES.filter(t => t.toLowerCase().includes(row.name.toLowerCase()))
    : DOCUMENT_TYPES

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0] ?? null
    if (!file) {
      onChange(row.id, { file: null, optimized: false, originalSize: undefined })
      return
    }

    const optimized = await optimizeDriverUpload(file)
    if (optimized.file.size > MAX_UPLOAD_BYTES) {
      if (fileRef.current) fileRef.current.value = ''
      alert('File must be smaller than 10 MB after optimization.')
      return
    }

    onChange(row.id, {
      file: optimized.file,
      optimized: optimized.compressed,
      originalSize: optimized.originalSize,
    })
  }

  const missingFile = submitted && !row.file

  return (
    <div className={`space-y-3 rounded-xl border p-4 transition-colors ${missingFile ? 'border-red-200 bg-red-50/30' : 'border-zinc-200'}`}>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        {/* Document Name */}
        <div>
          <label className="mb-1 block text-xs font-medium text-zinc-500">Document Name</label>
          <input
            type="text"
            placeholder="e.g. FAST Card"
            value={row.name}
            onChange={e => onChange(row.id, { name: e.target.value })}
            className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm text-zinc-900 outline-none focus:border-zinc-500 focus:ring-1 focus:ring-zinc-500"
          />
        </div>

        {/* Document Type — searchable dropdown filtered by name */}
        <div className="relative" ref={dropRef}>
          <label className="mb-1 block text-xs font-medium text-zinc-500">Document Type</label>
          <button
            type="button"
            onClick={() => setShowDrop(s => !s)}
            className="flex w-full items-center justify-between rounded-lg border border-zinc-300 px-3 py-2 text-sm outline-none focus:border-zinc-500 focus:ring-1 focus:ring-zinc-500"
          >
            <span className={row.type ? 'text-zinc-900' : 'text-zinc-400'}>{row.type || 'Select type…'}</span>
            <svg className="h-4 w-4 shrink-0 text-zinc-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </button>
          {showDrop && (
            <div className="absolute left-0 top-full z-20 mt-1 w-full overflow-hidden rounded-lg border border-zinc-200 bg-white shadow-lg">
              <div className="max-h-48 overflow-y-auto">
                {filteredTypes.length === 0 ? (
                  <p className="px-3 py-2 text-sm text-zinc-400">No match</p>
                ) : filteredTypes.map(t => (
                  <button
                    key={t}
                    type="button"
                    onClick={() => { onChange(row.id, { type: t }); setShowDrop(false) }}
                    className={`block w-full px-3 py-2 text-left text-sm transition-colors hover:bg-zinc-50 ${row.type === t ? 'bg-zinc-100 font-medium text-zinc-900' : 'text-zinc-700'}`}
                  >
                    {t}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="flex flex-wrap items-end gap-3">
        {/* File upload */}
        <div className="flex-1">
          <label className="mb-1 block text-xs font-medium text-zinc-500">
            File <span className="font-normal text-zinc-400">PDF, JPG, PNG — max 10 MB</span>
          </label>
          <input ref={fileRef} type="file" accept={UPLOAD_ACCEPT} onChange={handleFileChange} className="hidden" />
          {row.file ? (
            <div className="rounded-lg border border-zinc-200 bg-zinc-50 px-3 py-2">
              <div className="flex items-center gap-2">
                <svg className="h-4 w-4 shrink-0 text-zinc-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                <span className="flex-1 truncate text-xs text-zinc-700">{row.file.name}</span>
                <span className="shrink-0 text-xs text-zinc-400">{formatBytes(row.file.size)}</span>
                <button
                  type="button"
                  onClick={() => {
                    onChange(row.id, { file: null, optimized: false, originalSize: undefined })
                    if (fileRef.current) fileRef.current.value = ''
                  }}
                  className="text-zinc-400 hover:text-zinc-700"
                >
                  <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
              <p className="mt-2 text-xs text-zinc-500">
                {row.optimized && row.originalSize
                  ? `Image optimized from ${formatBytes(row.originalSize)} to ${formatBytes(row.file.size)} before upload.`
                  : row.file.type === 'application/pdf'
                    ? 'PDF files are uploaded as-is.'
                    : 'Ready to upload.'}
              </p>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              className={`flex w-full items-center gap-2 rounded-lg border-2 border-dashed px-4 py-2.5 text-sm transition-colors hover:border-zinc-400 hover:bg-zinc-50 ${missingFile ? 'border-red-300 bg-red-50/30' : 'border-zinc-300'}`}
            >
              <svg className="h-4 w-4 shrink-0 text-zinc-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
              </svg>
              <span className="text-zinc-500">Choose file or drag & drop</span>
            </button>
          )}
        </div>

        {/* Expiry Date */}
        <div>
          <label className="mb-1 block text-xs font-medium text-zinc-500">
            Expiry <span className="font-normal text-zinc-400">(optional)</span>
          </label>
          <input
            type="date"
            value={row.expiryDate}
            onChange={e => onChange(row.id, { expiryDate: e.target.value })}
            className="rounded-lg border border-zinc-300 px-3 py-2 text-sm text-zinc-900 outline-none focus:border-zinc-500 focus:ring-1 focus:ring-zinc-500"
          />
        </div>

        {/* Remove */}
        <button
          type="button"
          onClick={() => onRemove(row.id)}
          className="flex h-[38px] w-[38px] items-center justify-center rounded-lg border border-zinc-200 text-zinc-400 transition-colors hover:border-red-200 hover:bg-red-50 hover:text-red-600"
          aria-label="Remove document"
        >
          <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>
    </div>
  )
}

// ── Province/State select options ─────────────────────────────────────────────

function ProvinceStateOptions() {
  return (
    <>
      <option value="">Select…</option>
      <optgroup label="Canadian Provinces">
        {CANADIAN_PROVINCES.map(p => (
          <option key={p.code} value={p.code}>{p.name} ({p.code})</option>
        ))}
      </optgroup>
      <optgroup label="US States">
        {US_STATES.map(s => (
          <option key={s.code} value={s.code}>{s.name} ({s.code})</option>
        ))}
      </optgroup>
    </>
  )
}

// ── Main Page ─────────────────────────────────────────────────────────────────

export default function AddDriverPage() {
  const router = useRouter()
  const [form, setForm]   = useState(INITIAL_FORM)
  const [docs, setDocs]   = useState<DocRow[]>([makeDocRow()])
  const [submitting, setSubmitting] = useState(false)
  const [submitted, setSubmitted]   = useState(false)
  const [errors, setErrors]         = useState<string[]>([])
  const [showPw, setShowPw]         = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)

  function setF<K extends keyof typeof INITIAL_FORM>(key: K, value: (typeof INITIAL_FORM)[K]) {
    setForm(f => ({ ...f, [key]: value }))
  }

  function toggleMulti(field: 'vehicleTypes' | 'preferredRoutes', value: string) {
    setForm(f => ({
      ...f,
      [field]: f[field].includes(value)
        ? f[field].filter(v => v !== value)
        : [...f[field], value],
    }))
  }

  function updateDocRow(id: string, updates: Partial<DocRow>) {
    setDocs(prev => prev.map(d => d.id === id ? { ...d, ...updates } : d))
  }

  function removeDocRow(id: string) {
    setDocs(prev => prev.filter(d => d.id !== id))
  }

  function addDocRow() {
    setDocs(prev => [...prev, makeDocRow()])
  }

  // CSS helpers — return tailwind class string for inputs/selects
  function fi(value: string) {
    return `w-full rounded-lg border px-3 py-2 text-sm text-zinc-900 outline-none focus:ring-1 ${
      submitted && !value.trim()
        ? 'border-red-400 bg-red-50 focus:border-red-500 focus:ring-red-500'
        : 'border-zinc-300 focus:border-zinc-500 focus:ring-zinc-500'
    }`
  }

  function sel(value: string) {
    return `w-full rounded-lg border bg-white px-3 py-2 text-sm text-zinc-900 outline-none focus:ring-1 ${
      submitted && !value
        ? 'border-red-400 bg-red-50 focus:border-red-500 focus:ring-red-500'
        : 'border-zinc-300 focus:border-zinc-500 focus:ring-zinc-500'
    }`
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSubmitted(true)

    const errs: string[] = []

    if (!form.firstName.trim())         errs.push('First name is required')
    if (!form.lastName.trim())          errs.push('Last name is required')
    if (!form.dateOfBirth)              errs.push('Date of birth is required')
    if (!form.gender)                   errs.push('Gender is required')
    if (!form.email.trim())             errs.push('Email address is required')
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) errs.push('Email address is invalid')
    if (!form.password)                 errs.push('Password is required')
    else if (form.password.length < 8)  errs.push('Password must be at least 8 characters')
    if (form.password !== form.confirmPassword) errs.push('Passwords do not match')
    if (!form.phone.trim())             errs.push('Phone number is required')
    if (!form.emergencyName.trim())     errs.push('Emergency contact name is required')
    if (!form.emergencyPhone.trim())    errs.push('Emergency contact phone is required')
    if (!form.streetAddress.trim())     errs.push('Street address is required')
    if (!form.city.trim())              errs.push('City is required')
    if (!form.provinceState)            errs.push('Province/State is required')
    if (!form.postalZipCode.trim())     errs.push('Postal/Zip code is required')
    if (!form.country)                  errs.push('Country is required')
    if (!form.licenseNumber.trim())     errs.push('License number is required')
    if (!form.licenseClass)             errs.push('License class is required')
    if (!form.licenseExpiry)            errs.push('License expiry date is required')
    else if (new Date(form.licenseExpiry) <= new Date()) errs.push('License expiry must be a future date')
    if (!form.yearsOfExperience)        errs.push('Years of experience is required')
    if (form.medicalCertExpiry && new Date(form.medicalCertExpiry) <= new Date()) {
      errs.push('Medical certificate expiry must be a future date')
    }
    if (!docs.some(d => d.file !== null)) errs.push('At least one document must be uploaded')

    if (errs.length > 0) {
      setErrors(errs)
      window.scrollTo({ top: 0, behavior: 'smooth' })
      return
    }

    setErrors([])
    setSubmitting(true)

    try {
      const driverData = {
        firstName:    form.firstName,
        middleName:   form.middleName || null,
        lastName:     form.lastName,
        name:         [form.firstName, form.middleName, form.lastName].filter(Boolean).join(' '),
        dateOfBirth:  form.dateOfBirth,
        gender:       form.gender,
        email:        form.email,
        phone:        form.phone,
        emergencyContact: {
          name:         form.emergencyName,
          phone:        form.emergencyPhone,
          relationship: form.emergencyRelationship || null,
        },
        address: {
          street:       form.streetAddress,
          city:         form.city,
          provinceState: form.provinceState,
          postalZipCode: form.postalZipCode,
          country:      form.country,
        },
        license: {
          number:       form.licenseNumber,
          class:        form.licenseClass,
          expiry:       form.licenseExpiry,
          provinceState: form.licenseProvince || null,
        },
        yearsOfExperience: Number(form.yearsOfExperience) || 0,
        vehicleTypes:   form.vehicleTypes,
        preferredRoutes: form.preferredRoutes,
        certifications: {
          hazmat:   form.hasHazmat,
          fastCard: form.hasFastCard,
          twicCard: form.hasTwicCard,
        },
        medicalCertExpiry: form.medicalCertExpiry || null,
        internalNotes:     form.internalNotes || null,
        sendWelcomeEmail:  form.sendWelcomeEmail,
        status: form.status,
      }

      const created = await createDriver(driverData, form.password)
      const uid = created.uid

      for (const d of docs) {
        if (!d.file) continue
        await uploadDriverDocument(uid, d.file, {
          name: d.name || d.file.name,
          type: d.type || 'Other',
          expiryDate: d.expiryDate || '',
          uploadedBy: auth.currentUser?.uid || '',
        })
      }

      router.push('/admin/drivers')
    } catch (err: unknown) {
      const code = (err as { code?: string }).code
      const msg =
        code === 'auth/email-already-in-use' ? 'That email address is already in use.' :
        code === 'auth/weak-password'         ? 'Password is too weak. Use at least 8 characters.' :
        'Failed to create driver account. Please try again.'
      setErrors([msg])
      window.scrollTo({ top: 0, behavior: 'smooth' })
    } finally {
      setSubmitting(false)
    }
  }

  function Req() { return <span className="ml-0.5 text-red-500">*</span> }

  return (
    <div className="space-y-6">

      {/* ── Page header ─────────────────────────────────────────────────────── */}
      <div className="flex items-center gap-4">
        <Link
          href="/admin/drivers"
          className="flex h-9 w-9 items-center justify-center rounded-lg text-zinc-500 transition-colors hover:bg-zinc-200 hover:text-zinc-900"
        >
          <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </Link>
        <div>
          <h1 className="text-xl font-semibold text-zinc-900">Add New Driver</h1>
          <p className="text-sm text-zinc-500">Fill in the driver&apos;s information and upload required documents</p>
        </div>
      </div>

      {/* ── Validation summary ───────────────────────────────────────────────── */}
      {errors.length > 0 && (
        <div className="rounded-xl border border-red-200 bg-red-50 p-4">
          <p className="mb-2 text-sm font-semibold text-red-700">
            Please fix {errors.length} {errors.length === 1 ? 'error' : 'errors'} before submitting
          </p>
          <ul className="space-y-0.5">
            {errors.map((e, i) => (
              <li key={i} className="flex items-start gap-1.5 text-sm text-red-600">
                <span className="mt-0.5 shrink-0">•</span>{e}
              </li>
            ))}
          </ul>
        </div>
      )}

      <form onSubmit={handleSubmit} noValidate className="space-y-6">

        {/* ── Two-column grid ──────────────────────────────────────────────── */}
        <div className="grid gap-6 lg:grid-cols-2">

          {/* ═══════════════ LEFT COLUMN ═══════════════ */}
          <div className="space-y-6">

            {/* 1. PERSONAL INFORMATION */}
            <div className="rounded-xl bg-white p-6 shadow-sm">
              <SectionHeader title="Personal Information" />
              <div className="space-y-4">

                {/* First / Middle / Last */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="mb-1 block text-sm font-medium text-zinc-700">First Name<Req /></label>
                    <input type="text" value={form.firstName} onChange={e => setF('firstName', e.target.value)} className={fi(form.firstName)} />
                  </div>
                  <div>
                    <label className="mb-1 block text-sm font-medium text-zinc-700">Middle Name <span className="font-normal text-zinc-400 text-xs">(Optional)</span></label>
                    <input type="text" value={form.middleName} onChange={e => setF('middleName', e.target.value)} className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm text-zinc-900 outline-none focus:border-zinc-500 focus:ring-1 focus:ring-zinc-500" />
                  </div>
                </div>

                <div>
                  <label className="mb-1 block text-sm font-medium text-zinc-700">Last Name<Req /></label>
                  <input type="text" value={form.lastName} onChange={e => setF('lastName', e.target.value)} className={fi(form.lastName)} />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="mb-1 block text-sm font-medium text-zinc-700">Date of Birth<Req /></label>
                    <input type="date" value={form.dateOfBirth} onChange={e => setF('dateOfBirth', e.target.value)} className={sel(form.dateOfBirth)} />
                  </div>
                  <div>
                    <label className="mb-1 block text-sm font-medium text-zinc-700">Gender<Req /></label>
                    <select value={form.gender} onChange={e => setF('gender', e.target.value)} className={sel(form.gender)}>
                      <option value="">Select…</option>
                      <option>Male</option>
                      <option>Female</option>
                      <option>Prefer not to say</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="mb-1 block text-sm font-medium text-zinc-700">Email Address<Req /></label>
                  <input type="email" value={form.email} onChange={e => setF('email', e.target.value)} className={fi(form.email)} />
                </div>

                {/* Password */}
                <div>
                  <label className="mb-1 block text-sm font-medium text-zinc-700">Password<Req /></label>
                  <div className="relative">
                    <input
                      type={showPw ? 'text' : 'password'}
                      value={form.password}
                      onChange={e => setF('password', e.target.value)}
                      className={`${fi(form.password)} pr-10`}
                    />
                    <button type="button" onClick={() => setShowPw(s => !s)} className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-700">
                      <EyeIcon open={showPw} />
                    </button>
                  </div>
                  <p className="mt-1 text-xs text-zinc-400">Minimum 8 characters</p>
                </div>

                {/* Confirm Password */}
                <div>
                  <label className="mb-1 block text-sm font-medium text-zinc-700">Confirm Password<Req /></label>
                  <div className="relative">
                    <input
                      type={showConfirm ? 'text' : 'password'}
                      value={form.confirmPassword}
                      onChange={e => setF('confirmPassword', e.target.value)}
                      className={`w-full rounded-lg border px-3 py-2 text-sm text-zinc-900 outline-none focus:ring-1 pr-10 ${
                        submitted && form.password !== form.confirmPassword
                          ? 'border-red-400 bg-red-50 focus:border-red-500 focus:ring-red-500'
                          : 'border-zinc-300 focus:border-zinc-500 focus:ring-zinc-500'
                      }`}
                    />
                    <button type="button" onClick={() => setShowConfirm(s => !s)} className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-700">
                      <EyeIcon open={showConfirm} />
                    </button>
                  </div>
                </div>

                {/* Phone */}
                <div>
                  <label className="mb-1 block text-sm font-medium text-zinc-700">Phone Number<Req /></label>
                  <div className="flex gap-2">
                    <span className="flex items-center rounded-lg border border-zinc-300 bg-zinc-50 px-3 py-2 text-sm text-zinc-600 shrink-0">+1</span>
                    <input
                      type="tel"
                      placeholder="(555) 000-0000"
                      value={form.phone}
                      onChange={e => setF('phone', e.target.value)}
                      className={`flex-1 rounded-lg border px-3 py-2 text-sm text-zinc-900 outline-none focus:ring-1 ${
                        submitted && !form.phone.trim()
                          ? 'border-red-400 bg-red-50 focus:border-red-500 focus:ring-red-500'
                          : 'border-zinc-300 focus:border-zinc-500 focus:ring-zinc-500'
                      }`}
                    />
                  </div>
                </div>

                {/* Emergency Contact */}
                <div>
                  <label className="mb-1 block text-sm font-medium text-zinc-700">Emergency Contact Name<Req /></label>
                  <input type="text" value={form.emergencyName} onChange={e => setF('emergencyName', e.target.value)} className={fi(form.emergencyName)} />
                </div>

                <div>
                  <label className="mb-1 block text-sm font-medium text-zinc-700">Emergency Contact Phone<Req /></label>
                  <input type="tel" value={form.emergencyPhone} onChange={e => setF('emergencyPhone', e.target.value)} className={fi(form.emergencyPhone)} />
                </div>

                <div>
                  <label className="mb-1 block text-sm font-medium text-zinc-700">Emergency Contact Relationship <span className="font-normal text-zinc-400 text-xs">(Optional)</span></label>
                  <select value={form.emergencyRelationship} onChange={e => setF('emergencyRelationship', e.target.value)} className="w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 outline-none focus:border-zinc-500 focus:ring-1 focus:ring-zinc-500">
                    <option value="">Select…</option>
                    {RELATIONSHIPS.map(r => <option key={r}>{r}</option>)}
                  </select>
                </div>

              </div>
            </div>

            {/* 2. ADDRESS INFORMATION */}
            <div className="rounded-xl bg-white p-6 shadow-sm">
              <SectionHeader title="Address Information" />
              <div className="space-y-4">

                <div>
                  <label className="mb-1 block text-sm font-medium text-zinc-700">Street Address<Req /></label>
                  <input type="text" value={form.streetAddress} onChange={e => setF('streetAddress', e.target.value)} className={fi(form.streetAddress)} />
                </div>

                <div>
                  <label className="mb-1 block text-sm font-medium text-zinc-700">City<Req /></label>
                  <input type="text" value={form.city} onChange={e => setF('city', e.target.value)} className={fi(form.city)} />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="mb-1 block text-sm font-medium text-zinc-700">Province/State<Req /></label>
                    <select value={form.provinceState} onChange={e => setF('provinceState', e.target.value)} className={sel(form.provinceState)}>
                      <ProvinceStateOptions />
                    </select>
                  </div>
                  <div>
                    <label className="mb-1 block text-sm font-medium text-zinc-700">Postal/Zip Code<Req /></label>
                    <input type="text" value={form.postalZipCode} onChange={e => setF('postalZipCode', e.target.value)} className={fi(form.postalZipCode)} />
                  </div>
                </div>

                <div>
                  <label className="mb-1 block text-sm font-medium text-zinc-700">Country<Req /></label>
                  <select value={form.country} onChange={e => setF('country', e.target.value)} className={sel(form.country)}>
                    <option value="">Select…</option>
                    <option>Canada</option>
                    <option>United States</option>
                  </select>
                </div>

              </div>
            </div>

          </div>

          {/* ═══════════════ RIGHT COLUMN ═══════════════ */}
          <div className="space-y-6">

            {/* 3. DRIVER INFORMATION */}
            <div className="rounded-xl bg-white p-6 shadow-sm">
              <SectionHeader title="Driver Information" />
              <div className="space-y-4">

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="mb-1 block text-sm font-medium text-zinc-700">License Number<Req /></label>
                    <input type="text" value={form.licenseNumber} onChange={e => setF('licenseNumber', e.target.value)} className={fi(form.licenseNumber)} />
                  </div>
                  <div>
                    <label className="mb-1 block text-sm font-medium text-zinc-700">License Class<Req /></label>
                    <select value={form.licenseClass} onChange={e => setF('licenseClass', e.target.value)} className={sel(form.licenseClass)}>
                      <option value="">Select…</option>
                      {LICENSE_CLASSES.map(c => <option key={c}>{c}</option>)}
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="mb-1 block text-sm font-medium text-zinc-700">License Expiry<Req /></label>
                    <input type="date" value={form.licenseExpiry} onChange={e => setF('licenseExpiry', e.target.value)} className={sel(form.licenseExpiry)} />
                  </div>
                  <div>
                    <label className="mb-1 block text-sm font-medium text-zinc-700">License Province/State <span className="font-normal text-zinc-400 text-xs">(Optional)</span></label>
                    <select value={form.licenseProvince} onChange={e => setF('licenseProvince', e.target.value)} className="w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 outline-none focus:border-zinc-500 focus:ring-1 focus:ring-zinc-500">
                      <ProvinceStateOptions />
                    </select>
                  </div>
                </div>

                <div>
                  <label className="mb-1 block text-sm font-medium text-zinc-700">Years of Experience<Req /></label>
                  <input
                    type="number"
                    min="0"
                    max="99"
                    value={form.yearsOfExperience}
                    onChange={e => setF('yearsOfExperience', e.target.value)}
                    className={fi(form.yearsOfExperience)}
                    placeholder="0"
                  />
                </div>

                {/* Vehicle Types */}
                <div>
                  <p className="mb-2 text-sm font-medium text-zinc-700">Vehicle Types <span className="text-xs font-normal text-zinc-400">(Optional)</span></p>
                  <div className="grid grid-cols-2 gap-y-2">
                    {VEHICLE_TYPES.map(v => (
                      <label key={v} className="flex cursor-pointer items-center gap-2">
                        <input
                          type="checkbox"
                          checked={form.vehicleTypes.includes(v)}
                          onChange={() => toggleMulti('vehicleTypes', v)}
                          className="h-4 w-4 rounded border-zinc-300 accent-zinc-900"
                        />
                        <span className="text-sm text-zinc-700">{v}</span>
                      </label>
                    ))}
                  </div>
                </div>

                {/* Preferred Routes */}
                <div>
                  <p className="mb-2 text-sm font-medium text-zinc-700">Preferred Routes <span className="text-xs font-normal text-zinc-400">(Optional)</span></p>
                  <div className="grid grid-cols-2 gap-y-2">
                    {PREFERRED_ROUTES.map(r => (
                      <label key={r} className="flex cursor-pointer items-center gap-2">
                        <input
                          type="checkbox"
                          checked={form.preferredRoutes.includes(r)}
                          onChange={() => toggleMulti('preferredRoutes', r)}
                          className="h-4 w-4 rounded border-zinc-300 accent-zinc-900"
                        />
                        <span className="text-sm text-zinc-700">{r}</span>
                      </label>
                    ))}
                  </div>
                </div>

                {/* Certifications */}
                <div className="space-y-3 rounded-lg bg-zinc-50 p-4">
                  {[
                    { key: 'hasHazmat' as const,   label: 'Hazmat Certification',  desc: 'Has hazardous materials certification' },
                    { key: 'hasFastCard' as const, label: 'FAST Card',             desc: 'Free and Secure Trade (border crossing)' },
                    { key: 'hasTwicCard' as const, label: 'TWIC Card',             desc: 'Transportation Worker Identification' },
                  ].map(({ key, label, desc }) => (
                    <div key={key} className="flex items-center justify-between gap-4">
                      <div>
                        <p className="text-sm font-medium text-zinc-700">{label}</p>
                        <p className="text-xs text-zinc-400">{desc}</p>
                      </div>
                      <Toggle value={form[key]} onChange={v => setF(key, v)} />
                    </div>
                  ))}
                </div>

                <div>
                  <label className="mb-1 block text-sm font-medium text-zinc-700">Medical Certificate Expiry <span className="font-normal text-zinc-400 text-xs">(Optional)</span></label>
                  <input type="date" value={form.medicalCertExpiry} onChange={e => setF('medicalCertExpiry', e.target.value)} className="w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 outline-none focus:border-zinc-500 focus:ring-1 focus:ring-zinc-500" />
                </div>

              </div>
            </div>

            {/* 4. DOCUMENT UPLOADS */}
            <div className="rounded-xl bg-white p-6 shadow-sm">
              <SectionHeader title="Document Uploads" />
              <p className="mb-4 text-xs text-zinc-500">
                At least one document is required. Type in the name field to filter the type dropdown.
              </p>

              <div className="space-y-3">
                {docs.map(d => (
                  <DocumentRowComp
                    key={d.id}
                    row={d}
                    submitted={submitted}
                    onChange={updateDocRow}
                    onRemove={removeDocRow}
                  />
                ))}
              </div>

              <button
                type="button"
                onClick={addDocRow}
                className="mt-3 flex w-full items-center justify-center gap-2 rounded-lg border-2 border-dashed border-zinc-300 px-4 py-3 text-sm text-zinc-600 transition-colors hover:border-zinc-400 hover:bg-zinc-50"
              >
                <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                Add Document
              </button>
            </div>

          </div>
        </div>

        {/* ── 5. NOTES & ADDITIONAL INFO ──────────────────────────────────────── */}
        <div className="rounded-xl bg-white p-6 shadow-sm">
          <SectionHeader title="Notes & Additional Information" />
          <div className="grid gap-6 lg:grid-cols-2">

            <div>
              <label className="mb-1 block text-sm font-medium text-zinc-700">
                Internal Notes <span className="text-xs font-normal text-zinc-400">(Optional)</span>
              </label>
              <p className="mb-2 text-xs text-zinc-400">Notes visible to admin only</p>
              <textarea
                value={form.internalNotes}
                onChange={e => setF('internalNotes', e.target.value)}
                rows={5}
                className="w-full resize-none rounded-lg border border-zinc-300 px-3 py-2 text-sm text-zinc-900 outline-none focus:border-zinc-500 focus:ring-1 focus:ring-zinc-500"
              />
            </div>

            <div className="space-y-6">
              <div>
                <p className="mb-3 text-sm font-medium text-zinc-700">Status on Creation</p>
                <div className="flex gap-5">
                  {(['active', 'inactive'] as const).map(s => (
                    <label key={s} className="flex cursor-pointer items-center gap-2">
                      <input
                        type="radio"
                        name="status"
                        value={s}
                        checked={form.status === s}
                        onChange={() => setF('status', s)}
                        className="accent-zinc-900"
                      />
                      <span className="text-sm capitalize text-zinc-700">{s}</span>
                    </label>
                  ))}
                </div>
              </div>

              <div className="flex items-start gap-3">
                <Toggle value={form.sendWelcomeEmail} onChange={v => setF('sendWelcomeEmail', v)} />
                <div>
                  <p className="text-sm font-medium text-zinc-700">Send Welcome Email</p>
                  <p className="text-xs text-zinc-400">Send login credentials to driver&apos;s email</p>
                </div>
              </div>
            </div>

          </div>
        </div>

        {/* ── Submit row ───────────────────────────────────────────────────────── */}
        <div className="flex items-center justify-end gap-3 pb-4">
          <Link
            href="/admin/drivers"
            className="rounded-lg border border-zinc-300 px-5 py-2.5 text-sm font-medium text-zinc-700 transition-colors hover:bg-zinc-50"
          >
            Cancel
          </Link>
          <button
            type="submit"
            disabled={submitting}
            className="min-w-[200px] rounded-lg bg-zinc-900 px-5 py-2.5 text-sm font-medium text-white transition-colors hover:bg-zinc-700 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {submitting ? 'Creating Driver Account…' : 'Create Driver Account'}
          </button>
        </div>

      </form>
    </div>
  )
}
