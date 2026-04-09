import {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  Timestamp,
  serverTimestamp,
} from 'firebase/firestore'
import { createUserWithEmailAndPassword, signOut } from 'firebase/auth'
import { db, secondaryAuth } from '@/lib/firebase'
import type { Driver } from '@/app/admin/types'

function normalizeDate(value: unknown): string | null {
  if (!value) return null
  if (typeof value === 'string') return value
  if (value instanceof Date) return value.toISOString()
  if (typeof value === 'object' && 'toDate' in value && typeof (value as { toDate: unknown }).toDate === 'function') {
    const date = (value as { toDate: () => Date }).toDate()
    return date instanceof Date ? date.toISOString() : null
  }
  return null
}

function snapToDriver(uid: string, raw: Record<string, unknown>): Driver {
  return {
    uid,
    ...(raw as Omit<Driver, 'uid' | 'createdAt' | 'disabledAt'>),
    createdAt: normalizeDate(raw.createdAt),
    disabledAt: normalizeDate(raw.disabledAt),
  }
}

export async function getAllDrivers(): Promise<Driver[]> {
  const snap = await getDocs(query(collection(db, 'users'), where('role', '==', 'driver')))
  return snap.docs.map((d) => snapToDriver(d.id, d.data() as Record<string, unknown>))
}

export async function getActiveDrivers(): Promise<Driver[]> {
  const snap = await getDocs(
    query(collection(db, 'users'), where('role', '==', 'driver'), where('status', '==', 'active')),
  )
  return snap.docs.map((d) => snapToDriver(d.id, d.data() as Record<string, unknown>))
}

export async function getDisabledDrivers(): Promise<Driver[]> {
  const snap = await getDocs(
    query(collection(db, 'users'), where('role', '==', 'driver'), where('status', '==', 'disabled')),
  )
  return snap.docs.map((d) => snapToDriver(d.id, d.data() as Record<string, unknown>))
}

export async function getDriverById(uid: string): Promise<Driver | null> {
  const snap = await getDoc(doc(db, 'users', uid))
  if (!snap.exists()) return null
  return snapToDriver(snap.id, snap.data() as Record<string, unknown>)
}

export async function createDriver(
  driverData: Record<string, unknown>,
  password: string,
): Promise<Driver> {
  const email = driverData.email as string
  const credential = await createUserWithEmailAndPassword(secondaryAuth, email, password)
  const uid = credential.user.uid

  const dataToStore = {
    ...driverData,
    role: 'driver',
    createdAt: serverTimestamp(),
  }

  await setDoc(doc(db, 'users', uid), dataToStore)
  await signOut(secondaryAuth)

  return snapToDriver(uid, { ...dataToStore, createdAt: new Date().toISOString() })
}

export async function updateDriver(uid: string, data: Record<string, unknown>): Promise<Record<string, unknown>> {
  await setDoc(doc(db, 'users', uid), data, { merge: true })
  return data
}

export async function disableDriver(uid: string): Promise<void> {
  await fetch('/api/updateUser', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ uid, disabled: true }),
  })
  await updateDoc(doc(db, 'users', uid), {
    status: 'disabled',
    disabledAt: Timestamp.now(),
  })
}

export async function enableDriver(uid: string): Promise<void> {
  await fetch('/api/updateUser', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ uid, disabled: false }),
  })
  await updateDoc(doc(db, 'users', uid), {
    status: 'active',
    enabledAt: Timestamp.now(),
  })
}

export async function deleteDriver(uid: string): Promise<void> {
  await fetch('/api/deleteUser', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ uid }),
  })
  await deleteDoc(doc(db, 'users', uid))
}

export async function getDriversAddedThisMonth(): Promise<number> {
  const now = new Date()
  const firstDay = new Date(now.getFullYear(), now.getMonth(), 1)
  const snap = await getDocs(
    query(
      collection(db, 'users'),
      where('role', '==', 'driver'),
      where('createdAt', '>=', Timestamp.fromDate(firstDay)),
    ),
  )
  return snap.size
}
