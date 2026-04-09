import {
  collection,
  doc,
  getDocs,
  addDoc,
  setDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  Timestamp,
} from 'firebase/firestore'
import { db } from '@/lib/firebase'

export interface LoadDoc {
  id: string
  loadId?: string
  driverUid?: string
  driverName?: string
  origin?: string
  destination?: string
  status?: 'pending' | 'in-transit' | 'delivered'
  date?: string
  createdAt?: unknown
  deliveredAt?: unknown
  startedAt?: unknown
  assignedAt?: unknown
  [key: string]: unknown
}

function snapToLoad(id: string, data: Record<string, unknown>): LoadDoc {
  return { id, ...data }
}

export async function getAllLoads(): Promise<LoadDoc[]> {
  const snap = await getDocs(collection(db, 'loads'))
  return snap.docs.map((d) => snapToLoad(d.id, d.data() as Record<string, unknown>))
}

export async function getLoadsByDriver(driverUid: string): Promise<LoadDoc[]> {
  const snap = await getDocs(query(collection(db, 'loads'), where('driverUid', '==', driverUid)))
  return snap.docs.map((d) => snapToLoad(d.id, d.data() as Record<string, unknown>))
}

export async function getLoadsByStatus(status: string): Promise<LoadDoc[]> {
  const snap = await getDocs(query(collection(db, 'loads'), where('status', '==', status)))
  return snap.docs.map((d) => snapToLoad(d.id, d.data() as Record<string, unknown>))
}

export async function getActiveLoads(): Promise<LoadDoc[]> {
  return getLoadsByStatus('in-transit')
}

export async function getPendingLoads(): Promise<LoadDoc[]> {
  return getLoadsByStatus('pending')
}

export async function getDeliveredToday(): Promise<LoadDoc[]> {
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const snap = await getDocs(
    query(
      collection(db, 'loads'),
      where('status', '==', 'delivered'),
      where('deliveredAt', '>=', Timestamp.fromDate(today)),
    ),
  )
  return snap.docs.map((d) => snapToLoad(d.id, d.data() as Record<string, unknown>))
}

export async function createLoad(loadData: Record<string, unknown>): Promise<LoadDoc> {
  const existingSnap = await getDocs(collection(db, 'loads'))
  const count = existingSnap.size + 1
  const loadId = `LD-${String(count).padStart(3, '0')}`

  const dataToStore = {
    ...loadData,
    loadId,
    createdAt: Timestamp.now(),
  }

  const docRef = await addDoc(collection(db, 'loads'), dataToStore)
  return snapToLoad(docRef.id, dataToStore)
}

export async function updateLoad(loadId: string, data: Record<string, unknown>): Promise<void> {
  await setDoc(doc(db, 'loads', loadId), data, { merge: true })
}

export async function updateLoadStatus(loadId: string, status: string): Promise<void> {
  const update: Record<string, unknown> = { status }
  if (status === 'delivered') update.deliveredAt = Timestamp.now()
  if (status === 'in-transit') update.startedAt = Timestamp.now()
  await updateDoc(doc(db, 'loads', loadId), update)
}

export async function deleteLoad(loadId: string): Promise<void> {
  await deleteDoc(doc(db, 'loads', loadId))
}

export async function assignLoadToDriver(
  loadId: string,
  driverUid: string,
  driverName: string,
): Promise<void> {
  await updateDoc(doc(db, 'loads', loadId), {
    driverUid,
    driverName,
    status: 'pending',
    assignedAt: Timestamp.now(),
  })
}
