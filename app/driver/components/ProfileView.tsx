'use client'

import { useState, useEffect } from 'react'
import { doc, getDoc, setDoc } from 'firebase/firestore'
import {
  updatePassword,
  reauthenticateWithCredential,
  EmailAuthProvider,
} from 'firebase/auth'
import { auth, db } from '@/lib/firebase'
import type { DriverProfileData } from '../types'
import { EMPTY_DRIVER_PROFILE } from '../constants'

// ── Small reusable sub-components ────────────────────────────────────────────

function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-xl bg-white p-6 shadow-sm space-y-4">
      <h3 className="text-sm font-semibold text-zinc-900">{title}</h3>
      {children}
    </div>
  )
}

function Field({
  label, value, editing, onChange,
}: { label: string; value: string; editing: boolean; onChange: (v: string) => void }) {
  return (
    <div>
      <label className="block text-xs font-medium text-zinc-500 uppercase tracking-wide mb-1">{label}</label>
      {editing ? (
        <input
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm text-zinc-900 outline-none focus:border-zinc-400"
        />
      ) : (
        <p className="text-sm text-zinc-900">{value || <span className="text-zinc-400">—</span>}</p>
      )}
    </div>
  )
}

function ReadField({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <label className="block text-xs font-medium text-zinc-500 uppercase tracking-wide mb-1">{label}</label>
      <p className="text-sm text-zinc-900">{value || <span className="text-zinc-400">—</span>}</p>
    </div>
  )
}

function PwField({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <div>
      <label className="block text-xs font-medium text-zinc-500 uppercase tracking-wide mb-1">{label}</label>
      <input
        type="password"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        autoComplete="new-password"
        className="w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm text-zinc-900 outline-none focus:border-zinc-400"
      />
    </div>
  )
}

// ── Main component ────────────────────────────────────────────────────────────

export default function DriverProfileView({ uid, email, name }: { uid: string; email: string; name: string }) {
  const [data, setData]       = useState<DriverProfileData>({ ...EMPTY_DRIVER_PROFILE, name })
  const [draft, setDraft]     = useState<DriverProfileData>({ ...EMPTY_DRIVER_PROFILE, name })
  const [editing, setEditing] = useState(false)
  const [saving, setSaving]   = useState(false)

  const [pwForm, setPwForm]       = useState({ current: '', next: '', confirm: '' })
  const [pwLoading, setPwLoading] = useState(false)

  const [createdAt, setCreatedAt]   = useState('')
  const [lastSignIn, setLastSignIn] = useState('')

  const [toast, setToast] = useState<{ type: 'success' | 'error'; msg: string } | null>(null)

  useEffect(() => {
    async function load() {
      if (!uid) return
      const snap = await getDoc(doc(db, 'users', uid))
      if (snap.exists()) {
        const d = snap.data()
        const loaded: DriverProfileData = {
          name:              d.name              ?? name,
          phone:             d.phone             ?? '',
          dateOfBirth:       d.dateOfBirth       ?? '',
          address:           d.address           ?? '',
          city:              d.city              ?? '',
          province:          d.province          ?? '',
          postalCode:        d.postalCode        ?? '',
          country:           d.country           ?? '',
          licenseNumber:     d.licenseNumber     ?? '',
          licenseClass:      d.licenseClass      ?? '',
          licenseExpiry:     d.licenseExpiry     ?? '',
          yearsExperience:   d.yearsExperience   ?? '',
          vehiclePreference: d.vehiclePreference ?? '',
        }
        setData(loaded)
        setDraft(loaded)
      }
    }
    load()

    const user = auth.currentUser
    if (user?.metadata) {
      setCreatedAt(user.metadata.creationTime ?? '')
      setLastSignIn(user.metadata.lastSignInTime ?? '')
    }
  }, [uid, name])

  function flash(type: 'success' | 'error', msg: string) {
    setToast({ type, msg })
    setTimeout(() => setToast(null), 3500)
  }

  async function handleSave() {
    setSaving(true)
    try {
      await setDoc(doc(db, 'users', uid), { ...draft, role: 'driver' }, { merge: true })
      setData(draft)
      setEditing(false)
      flash('success', 'Profile updated successfully.')
    } catch {
      flash('error', 'Failed to save profile.')
    } finally {
      setSaving(false)
    }
  }

  async function handleUpdatePassword(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    if (pwForm.next !== pwForm.confirm) { flash('error', 'New passwords do not match.'); return }
    if (pwForm.next.length < 6)         { flash('error', 'New password must be at least 6 characters.'); return }
    setPwLoading(true)
    try {
      const user       = auth.currentUser!
      const credential = EmailAuthProvider.credential(email, pwForm.current)
      await reauthenticateWithCredential(user, credential)
      await updatePassword(user, pwForm.next)
      setPwForm({ current: '', next: '', confirm: '' })
      flash('success', 'Password updated successfully.')
    } catch (err: unknown) {
      const code = (err as { code?: string }).code
      flash('error',
        code === 'auth/wrong-password' || code === 'auth/invalid-credential'
          ? 'Current password is incorrect.'
          : 'Failed to update password.',
      )
    } finally {
      setPwLoading(false)
    }
  }

  const initials = data.name
    .split(' ').map((w) => w[0]).join('').slice(0, 2).toUpperCase() || '?'

  function f(key: keyof DriverProfileData) {
    return editing ? draft[key] : data[key]
  }
  function update(key: keyof DriverProfileData) {
    return (v: string) => setDraft((d) => ({ ...d, [key]: v }))
  }

  return (
    <div className="max-w-3xl space-y-6">
      {/* Toast */}
      {toast && (
        <div className={`fixed right-6 top-6 z-50 flex items-center gap-2 rounded-xl px-4 py-3 text-sm font-medium text-white shadow-lg ${toast.type === 'success' ? 'bg-green-600' : 'bg-red-600'}`}>
          {toast.type === 'success' ? '✓' : '✕'} {toast.msg}
        </div>
      )}

      {/* Header card */}
      <div className="flex items-center gap-6 rounded-xl bg-white p-6 shadow-sm">
        <div className="flex h-20 w-20 shrink-0 items-center justify-center rounded-full bg-zinc-900 text-2xl font-bold text-white">
          {initials}
        </div>
        <div className="min-w-0">
          <h2 className="text-xl font-bold text-zinc-900">{data.name}</h2>
          <p className="text-sm text-zinc-500">{email}</p>
          <p className="mt-0.5 text-xs text-zinc-400">CDL Driver · {data.licenseClass || 'No class set'}</p>
        </div>
        {!editing && (
          <button
            onClick={() => { setDraft(data); setEditing(true) }}
            className="ml-auto shrink-0 rounded-lg border border-zinc-300 px-4 py-2 text-sm font-medium text-zinc-700 transition-colors hover:bg-zinc-50"
          >
            Edit Profile
          </button>
        )}
      </div>

      {/* Personal information */}
      <Card title="Personal Information">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field label="Full Name"     value={f('name')}        editing={editing} onChange={update('name')} />
          <ReadField label="Email Address" value={email} />
          <Field label="Phone Number"  value={f('phone')}       editing={editing} onChange={update('phone')} />
          <Field label="Date of Birth" value={f('dateOfBirth')} editing={editing} onChange={update('dateOfBirth')} />
          <div className="sm:col-span-2">
            <Field label="Address" value={f('address')} editing={editing} onChange={update('address')} />
          </div>
          <Field label="City"              value={f('city')}       editing={editing} onChange={update('city')} />
          <Field label="Province / State"  value={f('province')}   editing={editing} onChange={update('province')} />
          <Field label="Postal / Zip Code" value={f('postalCode')} editing={editing} onChange={update('postalCode')} />
          <Field label="Country"           value={f('country')}    editing={editing} onChange={update('country')} />
        </div>
        {editing && (
          <div className="flex gap-3 pt-1">
            <button onClick={() => setEditing(false)}
              className="rounded-lg border border-zinc-300 px-4 py-2 text-sm font-medium text-zinc-700 transition-colors hover:bg-zinc-50">
              Cancel
            </button>
            <button onClick={handleSave} disabled={saving}
              className="rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-zinc-700 disabled:opacity-50">
              {saving ? 'Saving…' : 'Save Changes'}
            </button>
          </div>
        )}
      </Card>

      {/* Driver information */}
      <Card title="Driver Information">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field label="License Number"     value={f('licenseNumber')}     editing={editing} onChange={update('licenseNumber')} />
          <Field label="License Class"      value={f('licenseClass')}      editing={editing} onChange={update('licenseClass')} />
          <Field label="License Expiry"     value={f('licenseExpiry')}     editing={editing} onChange={update('licenseExpiry')} />
          <Field label="Years Experience"   value={f('yearsExperience')}   editing={editing} onChange={update('yearsExperience')} />
          <div className="sm:col-span-2">
            <Field label="Vehicle Preference" value={f('vehiclePreference')} editing={editing} onChange={update('vehiclePreference')} />
          </div>
        </div>
      </Card>

      {/* Account security */}
      <Card title="Account Security">
        <form onSubmit={handleUpdatePassword} className="space-y-4">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <PwField label="Current Password"     value={pwForm.current}  onChange={(v) => setPwForm((f) => ({ ...f, current: v }))} />
            <PwField label="New Password"         value={pwForm.next}     onChange={(v) => setPwForm((f) => ({ ...f, next: v }))} />
            <PwField label="Confirm New Password" value={pwForm.confirm}  onChange={(v) => setPwForm((f) => ({ ...f, confirm: v }))} />
          </div>
          <button type="submit" disabled={pwLoading}
            className="rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-zinc-700 disabled:opacity-50">
            {pwLoading ? 'Updating…' : 'Update Password'}
          </button>
        </form>
      </Card>

      {/* Account information */}
      <Card title="Account Information">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <ReadField label="Account Role"    value="Driver" />
          <ReadField label="Account Created" value={createdAt  ? new Date(createdAt).toLocaleDateString()  : '—'} />
          <ReadField label="Last Sign In"    value={lastSignIn ? new Date(lastSignIn).toLocaleDateString() : '—'} />
        </div>
      </Card>
    </div>
  )
}
