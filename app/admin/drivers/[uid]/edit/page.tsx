'use client'

import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { useParams, useRouter } from 'next/navigation'
import { auth } from '@/lib/firebase'
import type { Driver } from '../../../types'
import {
  DOCUMENT_TYPES,
  MAX_UPLOAD_BYTES,
  UPLOAD_ACCEPT,
  formatBytes,
  optimizeDriverUpload,
} from '../../upload-utils'
import { getDriverById, updateDriver } from '@/services/driver.service'
import { getDriverDocuments, uploadDriverDocument, deleteDriverDocument } from '@/services/document.service'

const REGIONS = {
  Canada: ['AB', 'BC', 'MB', 'NB', 'NL', 'NS', 'NT', 'NU', 'ON', 'PE', 'QC', 'SK', 'YT'],
  'United States': ['AL', 'AK', 'AZ', 'AR', 'CA', 'CO', 'CT', 'DE', 'FL', 'GA', 'HI', 'ID', 'IL', 'IN', 'IA', 'KS', 'KY', 'LA', 'ME', 'MD', 'MA', 'MI', 'MN', 'MS', 'MO', 'MT', 'NE', 'NV', 'NH', 'NJ', 'NM', 'NY', 'NC', 'ND', 'OH', 'OK', 'OR', 'PA', 'RI', 'SC', 'SD', 'TN', 'TX', 'UT', 'VT', 'VA', 'WA', 'WV', 'WI', 'WY'],
} as const

const LICENSE_CLASSES = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'AZ', 'DZ']
const VEHICLE_TYPES = ['Dry Van', 'Flatbed', 'Reefer', 'Tanker', 'Step Deck', 'Lowboy', 'Car Carrier', 'LTL']
const PREFERRED_ROUTES = ['Local', 'Regional', 'Long Haul', 'Cross Border', 'Team Driving']

type DriverDocument = {
  id: string
  name?: string
  type?: string
  url?: string
  downloadURL?: string
  storagePath?: string
  expiryDate?: string | null
}

type PendingUpload = {
  id: string
  name: string
  type: string
  expiryDate: string
  file: File
  optimized: boolean
  originalSize: number
}

type FormState = {
  firstName: string
  middleName: string
  lastName: string
  dateOfBirth: string
  gender: string
  email: string
  phone: string
  emergencyName: string
  emergencyPhone: string
  emergencyRelationship: string
  streetAddress: string
  city: string
  provinceState: string
  postalZipCode: string
  country: string
  licenseNumber: string
  licenseClass: string
  licenseExpiry: string
  licenseProvince: string
  yearsOfExperience: string
  vehicleTypes: string[]
  preferredRoutes: string[]
  hasHazmat: boolean
  hasFastCard: boolean
  hasTwicCard: boolean
  medicalCertExpiry: string
  internalNotes: string
  status: 'active' | 'disabled'
}

const EMPTY_FORM: FormState = {
  firstName: '',
  middleName: '',
  lastName: '',
  dateOfBirth: '',
  gender: '',
  email: '',
  phone: '',
  emergencyName: '',
  emergencyPhone: '',
  emergencyRelationship: '',
  streetAddress: '',
  city: '',
  provinceState: '',
  postalZipCode: '',
  country: '',
  licenseNumber: '',
  licenseClass: '',
  licenseExpiry: '',
  licenseProvince: '',
  yearsOfExperience: '',
  vehicleTypes: [],
  preferredRoutes: [],
  hasHazmat: false,
  hasFastCard: false,
  hasTwicCard: false,
  medicalCertExpiry: '',
  internalNotes: '',
  status: 'active',
}

function normalizeDate(value: unknown): string {
  if (!value) return ''
  if (typeof value === 'string') return value.slice(0, 10)
  if (value instanceof Date) return value.toISOString().slice(0, 10)
  if (typeof value === 'object' && 'toDate' in value && typeof value.toDate === 'function') {
    const date = value.toDate()
    return date instanceof Date ? date.toISOString().slice(0, 10) : ''
  }
  return ''
}

function toForm(driver: Driver): FormState {
  return {
    firstName: driver.firstName || '',
    middleName: driver.middleName || '',
    lastName: driver.lastName || '',
    dateOfBirth: normalizeDate(driver.dateOfBirth),
    gender: driver.gender || '',
    email: driver.email || '',
    phone: driver.phone || '',
    emergencyName: driver.emergencyContact?.name || '',
    emergencyPhone: driver.emergencyContact?.phone || '',
    emergencyRelationship: driver.emergencyContact?.relationship || '',
    streetAddress: driver.address?.street || '',
    city: driver.address?.city || '',
    provinceState: driver.address?.provinceState || '',
    postalZipCode: driver.address?.postalZipCode || '',
    country: driver.address?.country || '',
    licenseNumber: driver.license?.number || '',
    licenseClass: driver.license?.class || '',
    licenseExpiry: normalizeDate(driver.license?.expiry),
    licenseProvince: driver.license?.provinceState || '',
    yearsOfExperience: driver.yearsOfExperience != null ? String(driver.yearsOfExperience) : '',
    vehicleTypes: driver.vehicleTypes || [],
    preferredRoutes: driver.preferredRoutes || [],
    hasHazmat: Boolean(driver.certifications?.hazmat),
    hasFastCard: Boolean(driver.certifications?.fastCard),
    hasTwicCard: Boolean(driver.certifications?.twicCard),
    medicalCertExpiry: normalizeDate(driver.medicalCertExpiry),
    internalNotes: driver.internalNotes || '',
    status: driver.status === 'disabled' ? 'disabled' : 'active',
  }
}

function makePendingUpload(file: File, optimized: boolean, originalSize: number): PendingUpload {
  return {
    id: crypto.randomUUID(),
    name: file.name.replace(/\.[^.]+$/, ''),
    type: 'Other',
    expiryDate: '',
    file,
    optimized,
    originalSize,
  }
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="rounded-2xl bg-white p-6 shadow-sm">
      <h2 className="text-base font-semibold text-zinc-900">{title}</h2>
      <div className="mt-4">{children}</div>
    </section>
  )
}

function Toggle({ value, onChange }: { value: boolean; onChange: (value: boolean) => void }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={value}
      onClick={() => onChange(!value)}
      className={`relative h-6 w-11 rounded-full transition-colors ${value ? 'bg-zinc-900' : 'bg-zinc-300'}`}
    >
      <span className={`absolute top-0.5 left-0.5 h-5 w-5 rounded-full bg-white shadow-sm transition-transform ${value ? 'translate-x-5' : ''}`} />
    </button>
  )
}

export default function EditDriverPage() {
  const router = useRouter()
  const params = useParams<{ uid: string }>()
  const uid = typeof params?.uid === 'string' ? params.uid : ''
  const fileInputRef = useRef<HTMLInputElement>(null)

  const [form, setForm] = useState<FormState>(EMPTY_FORM)
  const [documents, setDocuments] = useState<DriverDocument[]>([])
  const [pendingUploads, setPendingUploads] = useState<PendingUpload[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  useEffect(() => {
    async function load() {
      if (!uid) {
        setError('Missing driver ID.')
        setLoading(false)
        return
      }

      try {
        const [driverData, docs] = await Promise.all([
          getDriverById(uid),
          getDriverDocuments(uid),
        ])

        if (!driverData) {
          setError('Driver not found.')
          return
        }

        setForm(toForm(driverData))
        setDocuments(docs)
      } catch {
        setError('Failed to load driver details.')
      } finally {
        setLoading(false)
      }
    }

    load()
  }, [uid])

  function setF<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((current) => ({ ...current, [key]: value }))
  }

  function toggleMulti(field: 'vehicleTypes' | 'preferredRoutes', value: string) {
    setForm((current) => ({
      ...current,
      [field]: current[field].includes(value)
        ? current[field].filter((item) => item !== value)
        : [...current[field], value],
    }))
  }

  async function handleFilesSelected(e: React.ChangeEvent<HTMLInputElement>) {
    const selected = Array.from(e.target.files ?? [])
    if (selected.length === 0) return

    const nextUploads: PendingUpload[] = []
    const skipped: string[] = []

    for (const file of selected) {
      const optimized = await optimizeDriverUpload(file)
      if (optimized.file.size > MAX_UPLOAD_BYTES) {
        skipped.push(`${file.name} is still larger than 10 MB after optimization.`)
        continue
      }

      nextUploads.push(
        makePendingUpload(optimized.file, optimized.compressed, optimized.originalSize),
      )
    }

    if (nextUploads.length > 0) {
      setPendingUploads((current) => [...current, ...nextUploads])
    }

    if (skipped.length > 0) {
      setError(skipped.join(' '))
    }

    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  function updatePendingUpload(id: string, updates: Partial<PendingUpload>) {
    setPendingUploads((current) =>
      current.map((upload) => (upload.id === id ? { ...upload, ...updates } : upload)),
    )
  }

  function removePendingUpload(id: string) {
    setPendingUploads((current) => current.filter((upload) => upload.id !== id))
  }

  async function handleDeleteDocument(document: DriverDocument) {
    if (!confirm(`Delete "${document.name || document.type || 'this document'}"? This cannot be undone.`)) return
    try {
      await deleteDriverDocument(uid, document.id, document.storagePath)
      setDocuments((current) => current.filter((d) => d.id !== document.id))
    } catch {
      setError('Failed to delete document.')
    }
  }

  function inputClass(required?: boolean, value?: string) {
    return `w-full rounded-lg border px-3 py-2 text-sm text-zinc-900 outline-none focus:border-zinc-500 focus:ring-1 focus:ring-zinc-500 ${required && !value ? 'border-red-300 bg-red-50' : 'border-zinc-300 bg-white'}`
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setSuccess('')

    const required = [
      form.firstName, form.lastName, form.dateOfBirth, form.gender, form.phone,
      form.streetAddress, form.city, form.provinceState, form.postalZipCode, form.country,
      form.licenseNumber, form.licenseClass, form.licenseExpiry, form.yearsOfExperience,
    ]
    if (required.some((value) => !value.trim())) {
      setError('Please complete all required fields before saving.')
      window.scrollTo({ top: 0, behavior: 'smooth' })
      return
    }

    setSaving(true)
    setError('')

    try {
      await updateDriver(uid, {
        firstName: form.firstName,
        middleName: form.middleName || null,
        lastName: form.lastName,
        name: [form.firstName, form.middleName, form.lastName].filter(Boolean).join(' '),
        dateOfBirth: form.dateOfBirth,
        gender: form.gender,
        phone: form.phone,
        emergencyContact: {
          name: form.emergencyName || null,
          phone: form.emergencyPhone || null,
          relationship: form.emergencyRelationship || null,
        },
        address: {
          street: form.streetAddress,
          city: form.city,
          provinceState: form.provinceState,
          postalZipCode: form.postalZipCode,
          country: form.country,
        },
        license: {
          number: form.licenseNumber,
          class: form.licenseClass,
          expiry: form.licenseExpiry,
          provinceState: form.licenseProvince || null,
        },
        yearsOfExperience: Number(form.yearsOfExperience) || 0,
        vehicleTypes: form.vehicleTypes,
        preferredRoutes: form.preferredRoutes,
        certifications: {
          hazmat: form.hasHazmat,
          fastCard: form.hasFastCard,
          twicCard: form.hasTwicCard,
        },
        medicalCertExpiry: form.medicalCertExpiry || null,
        internalNotes: form.internalNotes || null,
        status: form.status,
      })

      const uploadedDocuments: DriverDocument[] = []

      for (const upload of pendingUploads) {
        const uploaded = await uploadDriverDocument(uid, upload.file, {
          name: upload.name || upload.file.name,
          type: upload.type || 'Other',
          expiryDate: upload.expiryDate || '',
          uploadedBy: auth.currentUser?.uid || '',
        })

        uploadedDocuments.push({
          id: uploaded.id,
          name: uploaded.name,
          type: uploaded.type,
          downloadURL: uploaded.downloadURL,
          storagePath: uploaded.storagePath,
          expiryDate: uploaded.expiryDate,
        })
      }

      if (uploadedDocuments.length > 0) {
        setDocuments((current) => [...current, ...uploadedDocuments])
        setPendingUploads([])
      }

      setSuccess(
        uploadedDocuments.length > 0
          ? `Driver updated successfully and ${uploadedDocuments.length} file${uploadedDocuments.length === 1 ? '' : 's'} uploaded.`
          : 'Driver updated successfully.',
      )
      window.scrollTo({ top: 0, behavior: 'smooth' })
    } catch {
      setError('Failed to save driver changes. Please try again.')
      window.scrollTo({ top: 0, behavior: 'smooth' })
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return <div className="flex min-h-[40vh] items-center justify-center"><div className="h-8 w-8 animate-spin rounded-full border-4 border-zinc-300 border-t-zinc-800" /></div>
  }

  if (error && !form.email) {
    return (
      <div className="mx-auto max-w-3xl space-y-4">
        <Link href="/admin/drivers" className="inline-flex items-center gap-2 text-sm font-medium text-zinc-500 hover:text-zinc-900">
          <span aria-hidden="true">&larr;</span>
          Back to drivers
        </Link>
        <div className="rounded-2xl border border-red-200 bg-red-50 p-6 text-red-700 shadow-sm">{error}</div>
      </div>
    )
  }

  const regionOptions = REGIONS[form.country as keyof typeof REGIONS] || REGIONS.Canada

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link href={`/admin/drivers/${uid}`} className="flex h-9 w-9 items-center justify-center rounded-lg text-zinc-500 transition-colors hover:bg-zinc-200 hover:text-zinc-900">
          <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </Link>
        <div>
          <h1 className="text-xl font-semibold text-zinc-900">Edit Driver</h1>
          <p className="text-sm text-zinc-500">Update the driver&apos;s stored profile information</p>
        </div>
      </div>

      {error && <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">{error}</div>}
      {success && <div className="rounded-xl border border-green-200 bg-green-50 p-4 text-sm text-green-700">{success}</div>}

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="grid gap-6 lg:grid-cols-2">
          <Section title="Personal Information">
            <div className="grid gap-4 sm:grid-cols-2">
              <div><label className="mb-1 block text-xs font-medium text-zinc-500">First Name</label><input value={form.firstName} onChange={(e) => setF('firstName', e.target.value)} className={inputClass(true, form.firstName)} /></div>
              <div><label className="mb-1 block text-xs font-medium text-zinc-500">Middle Name</label><input value={form.middleName} onChange={(e) => setF('middleName', e.target.value)} className={inputClass()} /></div>
              <div><label className="mb-1 block text-xs font-medium text-zinc-500">Last Name</label><input value={form.lastName} onChange={(e) => setF('lastName', e.target.value)} className={inputClass(true, form.lastName)} /></div>
              <div><label className="mb-1 block text-xs font-medium text-zinc-500">Phone Number</label><input value={form.phone} onChange={(e) => setF('phone', e.target.value)} className={inputClass(true, form.phone)} /></div>
              <div><label className="mb-1 block text-xs font-medium text-zinc-500">Date of Birth</label><input type="date" value={form.dateOfBirth} onChange={(e) => setF('dateOfBirth', e.target.value)} className={inputClass(true, form.dateOfBirth)} /></div>
              <div>
                <label className="mb-1 block text-xs font-medium text-zinc-500">Gender</label>
                <select value={form.gender} onChange={(e) => setF('gender', e.target.value)} className={inputClass(true, form.gender)}>
                  <option value="">Select gender</option>
                  <option value="Male">Male</option>
                  <option value="Female">Female</option>
                  <option value="Non-binary">Non-binary</option>
                  <option value="Prefer not to say">Prefer not to say</option>
                </select>
              </div>
              <div className="sm:col-span-2">
                <label className="mb-1 block text-xs font-medium text-zinc-500">Email Address</label>
                <input value={form.email} readOnly className="w-full rounded-lg border border-zinc-200 bg-zinc-50 px-3 py-2 text-sm text-zinc-500 outline-none" />
                <p className="mt-1 text-xs text-zinc-400">Email is read-only here so Firebase Auth and Firestore stay in sync.</p>
              </div>
            </div>
          </Section>

          <Section title="Emergency Contact">
            <div className="grid gap-4 sm:grid-cols-3">
              <div><label className="mb-1 block text-xs font-medium text-zinc-500">Name</label><input value={form.emergencyName} onChange={(e) => setF('emergencyName', e.target.value)} className={inputClass()} /></div>
              <div><label className="mb-1 block text-xs font-medium text-zinc-500">Phone</label><input value={form.emergencyPhone} onChange={(e) => setF('emergencyPhone', e.target.value)} className={inputClass()} /></div>
              <div><label className="mb-1 block text-xs font-medium text-zinc-500">Relationship</label><input value={form.emergencyRelationship} onChange={(e) => setF('emergencyRelationship', e.target.value)} className={inputClass()} /></div>
            </div>
          </Section>
        </div>

        <div className="grid gap-6 lg:grid-cols-2">
          <Section title="Address">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="sm:col-span-2"><label className="mb-1 block text-xs font-medium text-zinc-500">Street Address</label><input value={form.streetAddress} onChange={(e) => setF('streetAddress', e.target.value)} className={inputClass(true, form.streetAddress)} /></div>
              <div><label className="mb-1 block text-xs font-medium text-zinc-500">City</label><input value={form.city} onChange={(e) => setF('city', e.target.value)} className={inputClass(true, form.city)} /></div>
              <div><label className="mb-1 block text-xs font-medium text-zinc-500">Postal / Zip Code</label><input value={form.postalZipCode} onChange={(e) => setF('postalZipCode', e.target.value)} className={inputClass(true, form.postalZipCode)} /></div>
              <div>
                <label className="mb-1 block text-xs font-medium text-zinc-500">Country</label>
                <select value={form.country} onChange={(e) => setF('country', e.target.value)} className={inputClass(true, form.country)}>
                  <option value="">Select country</option>
                  <option value="Canada">Canada</option>
                  <option value="United States">United States</option>
                </select>
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-zinc-500">Province / State</label>
                <select value={form.provinceState} onChange={(e) => setF('provinceState', e.target.value)} className={inputClass(true, form.provinceState)}>
                  <option value="">Select province/state</option>
                  {regionOptions.map((region) => <option key={region} value={region}>{region}</option>)}
                </select>
              </div>
            </div>
          </Section>

          <Section title="License">
            <div className="grid gap-4 sm:grid-cols-2">
              <div><label className="mb-1 block text-xs font-medium text-zinc-500">License Number</label><input value={form.licenseNumber} onChange={(e) => setF('licenseNumber', e.target.value)} className={inputClass(true, form.licenseNumber)} /></div>
              <div>
                <label className="mb-1 block text-xs font-medium text-zinc-500">License Class</label>
                <select value={form.licenseClass} onChange={(e) => setF('licenseClass', e.target.value)} className={inputClass(true, form.licenseClass)}>
                  <option value="">Select class</option>
                  {LICENSE_CLASSES.map((licenseClass) => <option key={licenseClass} value={licenseClass}>{licenseClass}</option>)}
                </select>
              </div>
              <div><label className="mb-1 block text-xs font-medium text-zinc-500">License Expiry</label><input type="date" value={form.licenseExpiry} onChange={(e) => setF('licenseExpiry', e.target.value)} className={inputClass(true, form.licenseExpiry)} /></div>
              <div><label className="mb-1 block text-xs font-medium text-zinc-500">License Province / State</label><input value={form.licenseProvince} onChange={(e) => setF('licenseProvince', e.target.value)} className={inputClass()} /></div>
              <div><label className="mb-1 block text-xs font-medium text-zinc-500">Years of Experience</label><input type="number" min="0" value={form.yearsOfExperience} onChange={(e) => setF('yearsOfExperience', e.target.value)} className={inputClass(true, form.yearsOfExperience)} /></div>
              <div><label className="mb-1 block text-xs font-medium text-zinc-500">Medical Certificate Expiry</label><input type="date" value={form.medicalCertExpiry} onChange={(e) => setF('medicalCertExpiry', e.target.value)} className={inputClass()} /></div>
            </div>
          </Section>
        </div>

        <div className="grid gap-6 lg:grid-cols-[1.4fr_0.8fr]">
          <Section title="Preferences and Notes">
            <div className="grid gap-6 sm:grid-cols-2">
              <div>
                <label className="mb-2 block text-xs font-medium text-zinc-500">Vehicle Types</label>
                <div className="space-y-2">
                  {VEHICLE_TYPES.map((vehicleType) => (
                    <label key={vehicleType} className="flex items-center gap-2 text-sm text-zinc-700">
                      <input type="checkbox" checked={form.vehicleTypes.includes(vehicleType)} onChange={() => toggleMulti('vehicleTypes', vehicleType)} className="h-4 w-4 rounded border-zinc-300 accent-zinc-900" />
                      {vehicleType}
                    </label>
                  ))}
                </div>
              </div>
              <div>
                <label className="mb-2 block text-xs font-medium text-zinc-500">Preferred Routes</label>
                <div className="space-y-2">
                  {PREFERRED_ROUTES.map((route) => (
                    <label key={route} className="flex items-center gap-2 text-sm text-zinc-700">
                      <input type="checkbox" checked={form.preferredRoutes.includes(route)} onChange={() => toggleMulti('preferredRoutes', route)} className="h-4 w-4 rounded border-zinc-300 accent-zinc-900" />
                      {route}
                    </label>
                  ))}
                </div>
              </div>
            </div>

            <div className="mt-6 grid gap-4 sm:grid-cols-3">
              <div className="flex items-center justify-between rounded-xl border border-zinc-200 px-4 py-3"><span className="text-sm text-zinc-700">Hazmat</span><Toggle value={form.hasHazmat} onChange={(value) => setF('hasHazmat', value)} /></div>
              <div className="flex items-center justify-between rounded-xl border border-zinc-200 px-4 py-3"><span className="text-sm text-zinc-700">FAST Card</span><Toggle value={form.hasFastCard} onChange={(value) => setF('hasFastCard', value)} /></div>
              <div className="flex items-center justify-between rounded-xl border border-zinc-200 px-4 py-3"><span className="text-sm text-zinc-700">TWIC Card</span><Toggle value={form.hasTwicCard} onChange={(value) => setF('hasTwicCard', value)} /></div>
            </div>

            <div className="mt-6">
              <label className="mb-1 block text-xs font-medium text-zinc-500">Internal Notes</label>
              <textarea value={form.internalNotes} onChange={(e) => setF('internalNotes', e.target.value)} rows={6} className="w-full rounded-xl border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 outline-none focus:border-zinc-500 focus:ring-1 focus:ring-zinc-500" placeholder="Add private notes about this driver" />
            </div>
          </Section>

          <Section title="Status and Documents">
            <div className="space-y-4">
              <div>
                <label className="mb-1 block text-xs font-medium text-zinc-500">Account Status</label>
                <select value={form.status} onChange={(e) => setF('status', e.target.value as 'active' | 'disabled')} className={inputClass()}>
                  <option value="active">Active</option>
                  <option value="disabled">Disabled</option>
                </select>
              </div>

              <div>
                <label className="mb-2 block text-xs font-medium text-zinc-500">Saved Documents</label>
                <div className="space-y-2">
                  {documents.length === 0 ? (
                    <p className="rounded-xl border border-dashed border-zinc-200 px-4 py-3 text-sm text-zinc-500">No documents uploaded yet.</p>
                  ) : (
                    documents.map((document) => (
                      <div key={document.id} className="rounded-xl border border-zinc-200 px-4 py-3">
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0">
                            <p className="text-sm font-medium text-zinc-800">{document.name || document.type || 'Document'}</p>
                            <p className="mt-1 text-xs text-zinc-500">
                              {document.type || 'Uncategorized'}
                              {document.expiryDate ? ` - Expires ${document.expiryDate}` : ''}
                            </p>
                            {(document.downloadURL || document.url) ? (
                              <a href={document.downloadURL || document.url} target="_blank" rel="noreferrer" className="mt-1 inline-flex text-xs font-medium text-zinc-900 underline underline-offset-2">Open file</a>
                            ) : null}
                          </div>
                          <button
                            type="button"
                            onClick={() => handleDeleteDocument(document)}
                            className="shrink-0 rounded-lg p-1.5 text-zinc-400 transition-colors hover:bg-red-50 hover:text-red-600"
                            aria-label="Delete document"
                          >
                            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                          </button>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>

              <div className="rounded-xl border border-zinc-200 p-4">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-sm font-medium text-zinc-800">Add Files</p>
                    <p className="mt-1 text-xs text-zinc-500">Images are optimized before upload. PDFs stay unchanged.</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="rounded-lg border border-zinc-300 px-3 py-2 text-sm font-medium text-zinc-700 transition-colors hover:bg-zinc-50"
                  >
                    + Add Files
                  </button>
                </div>
                <input
                  ref={fileInputRef}
                  type="file"
                  multiple
                  accept={UPLOAD_ACCEPT}
                  onChange={handleFilesSelected}
                  className="hidden"
                />
              </div>

              {pendingUploads.length > 0 && (
                <div className="space-y-3">
                  <label className="block text-xs font-medium text-zinc-500">Pending Uploads</label>
                  {pendingUploads.map((upload) => (
                    <div key={upload.id} className="rounded-xl border border-zinc-200 p-4">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-medium text-zinc-800">{upload.file.name}</p>
                          <p className="mt-1 text-xs text-zinc-500">
                            {upload.optimized
                              ? `Optimized from ${formatBytes(upload.originalSize)} to ${formatBytes(upload.file.size)}`
                              : upload.file.type === 'application/pdf'
                                ? `PDF ready to upload (${formatBytes(upload.file.size)})`
                                : `Ready to upload (${formatBytes(upload.file.size)})`}
                          </p>
                        </div>
                        <button
                          type="button"
                          onClick={() => removePendingUpload(upload.id)}
                          className="rounded-lg p-2 text-zinc-400 transition-colors hover:bg-zinc-100 hover:text-zinc-700"
                          aria-label="Remove upload"
                        >
                          <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                          </svg>
                        </button>
                      </div>

                      <div className="mt-4 grid gap-3">
                        <div>
                          <label className="mb-1 block text-xs font-medium text-zinc-500">Document Name</label>
                          <input
                            value={upload.name}
                            onChange={(e) => updatePendingUpload(upload.id, { name: e.target.value })}
                            className="w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 outline-none focus:border-zinc-500 focus:ring-1 focus:ring-zinc-500"
                          />
                        </div>
                        <div className="grid gap-3 sm:grid-cols-2">
                          <div>
                            <label className="mb-1 block text-xs font-medium text-zinc-500">Document Type</label>
                            <select
                              value={upload.type}
                              onChange={(e) => updatePendingUpload(upload.id, { type: e.target.value })}
                              className="w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 outline-none focus:border-zinc-500 focus:ring-1 focus:ring-zinc-500"
                            >
                              {DOCUMENT_TYPES.map((type) => (
                                <option key={type} value={type}>{type}</option>
                              ))}
                            </select>
                          </div>
                          <div>
                            <label className="mb-1 block text-xs font-medium text-zinc-500">Expiry Date</label>
                            <input
                              type="date"
                              value={upload.expiryDate}
                              onChange={(e) => updatePendingUpload(upload.id, { expiryDate: e.target.value })}
                              className="w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 outline-none focus:border-zinc-500 focus:ring-1 focus:ring-zinc-500"
                            />
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              <div className="space-y-3 border-t border-zinc-100 pt-4">
                <button type="submit" disabled={saving} className="w-full rounded-xl bg-zinc-900 px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-zinc-700 disabled:cursor-not-allowed disabled:opacity-60">
                  {saving ? 'Saving Changes...' : 'Save Changes'}
                </button>
                <button type="button" onClick={() => router.push(`/admin/drivers/${uid}`)} className="w-full rounded-xl border border-zinc-300 px-4 py-2.5 text-sm font-medium text-zinc-700 transition-colors hover:bg-zinc-50">
                  View Profile
                </button>
                <button type="button" onClick={() => router.push('/admin/drivers')} className="w-full rounded-xl border border-zinc-300 px-4 py-2.5 text-sm font-medium text-zinc-700 transition-colors hover:bg-zinc-50">
                  Back to Drivers
                </button>
              </div>
            </div>
          </Section>
        </div>
      </form>
    </div>
  )
}
