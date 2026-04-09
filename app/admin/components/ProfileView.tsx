'use client'

import { useState, useEffect } from 'react'
import { doc, getDoc, setDoc } from 'firebase/firestore'
import {
  updatePassword,
  reauthenticateWithCredential,
  EmailAuthProvider,
} from 'firebase/auth'
import { auth, db } from '@/lib/firebase'
import type { ProfileData } from '../types'
import { EMPTY_PROFILE } from '../constants'
import ProfileCard from './ui/ProfileCard'
import PField from './ui/PField'
import ReadField from './ui/ReadField'
import PwField from './ui/PwField'

export default function ProfileView({ uid, email, name }: { uid: string; email: string; name: string }) {
  const [data, setData]       = useState<ProfileData>({ ...EMPTY_PROFILE, name })
  const [draft, setDraft]     = useState<ProfileData>({ ...EMPTY_PROFILE, name })
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
        const loaded: ProfileData = {
          name:           d.name           ?? name,
          phone:          d.phone          ?? '',
          jobTitle:       d.jobTitle       ?? '',
          companyName:    d.companyName    ?? '',
          companyAddress: d.companyAddress ?? '',
          city:           d.city           ?? '',
          province:       d.province       ?? '',
          postalCode:     d.postalCode     ?? '',
          country:        d.country        ?? '',
          companyPhone:   d.companyPhone   ?? '',
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
      await setDoc(doc(db, 'users', uid), { ...draft, role: 'admin' }, { merge: true })
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

  return (
    <div className="max-w-3xl space-y-6">
      {/* Toast */}
      {toast && (
        <div className={`fixed right-6 top-6 z-50 flex items-center gap-2 rounded-xl px-4 py-3 text-sm font-medium text-white shadow-lg transition-all ${toast.type === 'success' ? 'bg-green-600' : 'bg-red-600'}`}>
          {toast.type === 'success' ? '✓' : '✕'} {toast.msg}
        </div>
      )}

      {/* ── Header card ── */}
      <div className="flex items-center gap-6 rounded-xl bg-white p-6 shadow-sm">
        <div className="flex h-20 w-20 shrink-0 items-center justify-center rounded-full bg-zinc-900 text-2xl font-bold text-white">
          {initials}
        </div>
        <div className="min-w-0">
          <h2 className="text-xl font-bold text-zinc-900">{data.name}</h2>
          <p className="text-sm text-zinc-500">{email}</p>
          <p className="mt-0.5 text-xs text-zinc-400">{data.jobTitle || 'No job title set'}</p>
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

      {/* ── Personal information ── */}
      <ProfileCard title="Personal Information">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <PField label="Full Name"     value={editing ? draft.name        : data.name}        editing={editing} onChange={(v) => setDraft((d) => ({ ...d, name: v }))} />
          <ReadField label="Email Address" value={email} />
          <PField label="Phone Number"  value={editing ? draft.phone       : data.phone}       editing={editing} onChange={(v) => setDraft((d) => ({ ...d, phone: v }))} />
          <PField label="Job Title"     value={editing ? draft.jobTitle    : data.jobTitle}    editing={editing} onChange={(v) => setDraft((d) => ({ ...d, jobTitle: v }))} />
          <PField label="Company Name"  value={editing ? draft.companyName : data.companyName} editing={editing} onChange={(v) => setDraft((d) => ({ ...d, companyName: v }))} />
        </div>
        {editing && (
          <div className="mt-5 flex gap-3">
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
      </ProfileCard>

      {/* ── Company information ── */}
      <ProfileCard title="Company Information">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <PField label="Company Name"    value={editing ? draft.companyName    : data.companyName}    editing={editing} onChange={(v) => setDraft((d) => ({ ...d, companyName: v }))} />
          <PField label="Company Phone"   value={editing ? draft.companyPhone   : data.companyPhone}   editing={editing} onChange={(v) => setDraft((d) => ({ ...d, companyPhone: v }))} />
          <div className="sm:col-span-2">
            <PField label="Company Address" value={editing ? draft.companyAddress : data.companyAddress} editing={editing} onChange={(v) => setDraft((d) => ({ ...d, companyAddress: v }))} />
          </div>
          <PField label="City"              value={editing ? draft.city       : data.city}       editing={editing} onChange={(v) => setDraft((d) => ({ ...d, city: v }))} />
          <PField label="Province / State"  value={editing ? draft.province   : data.province}   editing={editing} onChange={(v) => setDraft((d) => ({ ...d, province: v }))} />
          <PField label="Postal / Zip Code" value={editing ? draft.postalCode : data.postalCode} editing={editing} onChange={(v) => setDraft((d) => ({ ...d, postalCode: v }))} />
          <PField label="Country"           value={editing ? draft.country    : data.country}    editing={editing} onChange={(v) => setDraft((d) => ({ ...d, country: v }))} />
        </div>
      </ProfileCard>

      {/* ── Account security ── */}
      <ProfileCard title="Account Security">
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
      </ProfileCard>

      {/* ── Account info ── */}
      <ProfileCard title="Account Information">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <ReadField label="Account Role"    value="Admin" />
          <ReadField label="Account Created" value={createdAt  ? new Date(createdAt).toLocaleDateString()  : '—'} />
          <ReadField label="Last Sign In"    value={lastSignIn ? new Date(lastSignIn).toLocaleDateString() : '—'} />
        </div>
      </ProfileCard>
    </div>
  )
}
