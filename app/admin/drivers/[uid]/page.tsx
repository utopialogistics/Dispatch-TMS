'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useParams } from 'next/navigation'
import type { Driver } from '../../types'
import { getDriverById } from '@/services/driver.service'
import { getDriverDocuments, deleteDriverDocument } from '@/services/document.service'

interface DriverDocument {
  id: string
  name?: string
  type?: string
  url?: string
  downloadURL?: string
  storagePath?: string
  fileName?: string
  expiryDate?: string | null
  status?: string
}

function displayName(driver: Driver): string {
  if (driver.name) return driver.name
  const parts = [driver.firstName, driver.middleName, driver.lastName].filter(Boolean)
  return parts.length > 0 ? parts.join(' ') : driver.email
}

function formatDate(value: string | null | undefined): string {
  if (!value) return '-'

  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return '-'

  return date.toLocaleDateString('en-CA', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  })
}


function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="space-y-1">
      <p className="text-xs font-medium uppercase tracking-wide text-zinc-400">{label}</p>
      <p className="text-sm text-zinc-800">{value || '-'}</p>
    </div>
  )
}

function Section({
  title,
  children,
}: {
  title: string
  children: React.ReactNode
}) {
  return (
    <section className="rounded-2xl bg-white p-6 shadow-sm">
      <h2 className="text-lg font-semibold text-zinc-900">{title}</h2>
      <div className="mt-5">{children}</div>
    </section>
  )
}

export default function DriverProfilePage() {
  const params = useParams<{ uid: string }>()
  const uid = typeof params?.uid === 'string' ? params.uid : ''

  const [driver, setDriver] = useState<Driver | null>(null)
  const [documents, setDocuments] = useState<DriverDocument[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [deleteError, setDeleteError] = useState('')

  async function handleDeleteDocument(document: DriverDocument) {
    if (!confirm(`Delete "${document.name || document.type || 'this document'}"? This cannot be undone.`)) return
    setDeleteError('')
    try {
      await deleteDriverDocument(uid, document.id, document.storagePath)
      setDocuments((current) => current.filter((d) => d.id !== document.id))
    } catch {
      setDeleteError('Failed to delete document.')
    }
  }

  useEffect(() => {
    async function loadDriverProfile() {
      if (!uid) {
        setError('Missing driver ID.')
        setLoading(false)
        return
      }

      setLoading(true)
      setError('')

      try {
        const [driverData, docs] = await Promise.all([
          getDriverById(uid),
          getDriverDocuments(uid),
        ])

        if (!driverData) {
          setDriver(null)
          setDocuments([])
          setError('Driver not found.')
          return
        }

        setDriver(driverData)
        setDocuments(docs)
      } catch {
        setDriver(null)
        setDocuments([])
        setError('Failed to load driver profile.')
      } finally {
        setLoading(false)
      }
    }

    loadDriverProfile()
  }, [uid])

  if (loading) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-zinc-300 border-t-zinc-800" />
      </div>
    )
  }

  if (error || !driver) {
    return (
      <div className="mx-auto max-w-3xl space-y-4">
        <Link
          href="/admin/drivers"
          className="inline-flex items-center gap-2 text-sm font-medium text-zinc-500 transition-colors hover:text-zinc-900"
        >
          <span aria-hidden="true">&larr;</span>
          Back to drivers
        </Link>

        <div className="rounded-2xl border border-red-200 bg-red-50 p-6 text-red-700 shadow-sm">
          <h1 className="text-lg font-semibold">Unable to open driver profile</h1>
          <p className="mt-2 text-sm">{error || 'Driver not found.'}</p>
        </div>
      </div>
    )
  }

  const name = displayName(driver)
  const initials = name
    .split(' ')
    .map((part) => part[0])
    .join('')
    .slice(0, 2)
    .toUpperCase() || '?'

  const address = [
    driver.address?.street,
    driver.address?.city,
    driver.address?.provinceState,
    driver.address?.postalZipCode,
    driver.address?.country,
  ]
    .filter(Boolean)
    .join(', ')

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <Link
        href="/admin/drivers"
        className="inline-flex items-center gap-2 text-sm font-medium text-zinc-500 transition-colors hover:text-zinc-900"
      >
        <span aria-hidden="true">&larr;</span>
        Back to drivers
      </Link>

      <section className="rounded-2xl bg-white p-6 shadow-sm">
        <div className="flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
          <div className="flex items-center gap-4">
            <div className="flex h-20 w-20 items-center justify-center rounded-full bg-zinc-900 text-2xl font-bold text-white">
              {initials}
            </div>
            <div>
              <h1 className="text-2xl font-bold text-zinc-900">{name}</h1>
              <p className="mt-1 text-sm text-zinc-500">{driver.email}</p>
              <p className="mt-2 inline-flex rounded-full px-3 py-1 text-xs font-semibold ring-1 ring-inset">
                <span
                  className={
                    driver.status === 'disabled'
                      ? 'text-red-700'
                      : 'text-green-700'
                  }
                >
                  {driver.status === 'disabled' ? 'Disabled' : 'Active'}
                </span>
              </p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4 md:min-w-[18rem]">
            <InfoRow label="Joined" value={formatDate(driver.createdAt)} />
            <InfoRow label="Experience" value={`${driver.yearsOfExperience ?? 0} years`} />
            <InfoRow label="License Class" value={driver.license?.class || '-'} />
            <InfoRow label="Medical Expiry" value={formatDate(driver.medicalCertExpiry)} />
          </div>
        </div>
      </section>

      <div className="grid gap-6 xl:grid-cols-[1.3fr_0.9fr]">
        <div className="space-y-6">
          <Section title="Contact Information">
            <div className="grid gap-5 sm:grid-cols-2">
              <InfoRow label="Phone" value={driver.phone || '-'} />
              <InfoRow label="Date of Birth" value={formatDate(driver.dateOfBirth)} />
              <InfoRow label="Gender" value={driver.gender || '-'} />
              <InfoRow label="Address" value={address || '-'} />
            </div>
          </Section>

          <Section title="License and Qualifications">
            <div className="grid gap-5 sm:grid-cols-2">
              <InfoRow label="License Number" value={driver.license?.number || '-'} />
              <InfoRow label="Province / State" value={driver.license?.provinceState || '-'} />
              <InfoRow label="License Expiry" value={formatDate(driver.license?.expiry)} />
              <InfoRow
                label="Vehicle Types"
                value={driver.vehicleTypes?.length ? driver.vehicleTypes.join(', ') : '-'}
              />
              <InfoRow
                label="Preferred Routes"
                value={driver.preferredRoutes?.length ? driver.preferredRoutes.join(', ') : '-'}
              />
              <InfoRow
                label="Certifications"
                value={[
                  driver.certifications?.hazmat ? 'Hazmat' : '',
                  driver.certifications?.fastCard ? 'FAST Card' : '',
                  driver.certifications?.twicCard ? 'TWIC Card' : '',
                ].filter(Boolean).join(', ') || '-'}
              />
            </div>
          </Section>

          <Section title="Emergency Contact">
            <div className="grid gap-5 sm:grid-cols-3">
              <InfoRow label="Name" value={driver.emergencyContact?.name || '-'} />
              <InfoRow label="Phone" value={driver.emergencyContact?.phone || '-'} />
              <InfoRow label="Relationship" value={driver.emergencyContact?.relationship || '-'} />
            </div>
          </Section>

          <Section title="Internal Notes">
            <p className="whitespace-pre-wrap text-sm leading-6 text-zinc-700">
              {driver.internalNotes || 'No internal notes added for this driver.'}
            </p>
          </Section>
        </div>

        <div className="space-y-6">
          <Section title="Documents">
            {deleteError && (
              <p className="mb-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{deleteError}</p>
            )}
            {documents.length === 0 ? (
              <p className="text-sm text-zinc-500">No driver documents uploaded yet.</p>
            ) : (
              <div className="space-y-3">
                {documents.map((document) => {
                  const fileURL = document.downloadURL || document.url
                  const fileName = document.fileName || document.name || document.type || 'document'
                  return (
                    <div
                      key={document.id}
                      className="rounded-xl border border-zinc-200 p-4"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className="truncate text-sm font-semibold text-zinc-900">
                            {document.name || document.type || 'Document'}
                          </p>
                          <p className="mt-1 text-xs text-zinc-500">
                            {document.type || 'Uncategorized'}
                          </p>
                        </div>
                        {document.status ? (
                          <span className={`rounded-full px-2.5 py-1 text-xs font-medium ${
                            document.status === 'verified' ? 'bg-green-100 text-green-700' :
                            document.status === 'expired' ? 'bg-red-100 text-red-700' :
                            'bg-zinc-100 text-zinc-600'
                          }`}>
                            {document.status.charAt(0).toUpperCase() + document.status.slice(1)}
                          </span>
                        ) : null}
                      </div>

                      <div className="mt-3 text-xs text-zinc-500">
                        <p>Expiry: {formatDate(document.expiryDate)}</p>
                      </div>

                      <div className="mt-3 flex flex-wrap items-center gap-2">
                        {fileURL ? (
                          <>
                            <a
                              href={fileURL}
                              target="_blank"
                              rel="noreferrer"
                              className="inline-flex items-center gap-1.5 rounded-lg border border-zinc-200 px-3 py-1.5 text-xs font-medium text-zinc-700 transition-colors hover:bg-zinc-50"
                            >
                              View
                            </a>
                            <a
                              href={fileURL}
                              download={fileName}
                              className="inline-flex items-center gap-1.5 rounded-lg border border-zinc-200 px-3 py-1.5 text-xs font-medium text-zinc-700 transition-colors hover:bg-zinc-50"
                            >
                              Download
                            </a>
                          </>
                        ) : (
                          <p className="text-xs text-zinc-400">No file URL saved.</p>
                        )}
                        <button
                          type="button"
                          onClick={() => handleDeleteDocument(document)}
                          className="inline-flex items-center gap-1.5 rounded-lg border border-red-200 px-3 py-1.5 text-xs font-medium text-red-600 transition-colors hover:bg-red-50"
                        >
                          Delete
                        </button>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </Section>

          <Section title="Account Details">
            <div className="grid gap-5">
              <InfoRow label="Driver UID" value={driver.uid} />
              <InfoRow label="Status" value={driver.status || 'active'} />
              <InfoRow label="Disabled At" value={formatDate(driver.disabledAt)} />
              <InfoRow
                label="Welcome Email"
                value={driver.sendWelcomeEmail ? 'Enabled' : 'Not requested'}
              />
            </div>
          </Section>
        </div>
      </div>
    </div>
  )
}
