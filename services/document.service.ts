import { ref, uploadBytes, getDownloadURL, deleteObject } from 'firebase/storage'
import {
  collection,
  collectionGroup,
  doc,
  getDocs,
  addDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  Timestamp,
} from 'firebase/firestore'
import { storage, db } from '@/lib/firebase'

export interface DriverDocument {
  id: string
  name?: string
  type?: string
  fileName?: string
  storagePath?: string
  downloadURL?: string
  url?: string
  uploadedAt?: unknown
  expiryDate?: string | null
  status?: string
  uploadedBy?: string
}

export interface ExpiringDocument {
  driverUid: string
  driverName: string
  docName: string
  expiryDate: string
}

const VALID_STATUSES = ['pending', 'verified', 'expired', 'rejected'] as const

export async function getDriverDocuments(driverUid: string): Promise<DriverDocument[]> {
  const snap = await getDocs(collection(db, 'users', driverUid, 'documents'))
  return snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<DriverDocument, 'id'>) }))
}

export async function uploadDriverDocument(
  driverUid: string,
  file: File,
  metadata: {
    name: string
    type: string
    expiryDate?: string
    uploadedBy?: string
  },
): Promise<DriverDocument> {
  const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_')
  const fileName = `${Date.now()}_${safeName}`
  const storagePath = `drivers/${driverUid}/documents/${fileName}`

  const storageRef = ref(storage, storagePath)
  await uploadBytes(storageRef, file)
  const downloadURL = await getDownloadURL(storageRef)

  const docData = {
    name: metadata.name || file.name,
    type: metadata.type || 'Other',
    fileName: file.name,
    storagePath,
    downloadURL,
    uploadedAt: Timestamp.now(),
    expiryDate: metadata.expiryDate || null,
    status: 'pending',
    uploadedBy: metadata.uploadedBy || '',
  }

  const docRef = await addDoc(collection(db, 'users', driverUid, 'documents'), docData)
  return { id: docRef.id, ...docData }
}

export async function deleteDriverDocument(
  driverUid: string,
  docId: string,
  storagePath?: string,
): Promise<void> {
  if (storagePath) {
    try {
      await deleteObject(ref(storage, storagePath))
    } catch {
      // Storage file may already be gone — still delete the Firestore record
    }
  }
  await deleteDoc(doc(db, 'users', driverUid, 'documents', docId))
}

export async function updateDocumentStatus(
  driverUid: string,
  docId: string,
  status: string,
): Promise<void> {
  if (!VALID_STATUSES.includes(status as (typeof VALID_STATUSES)[number])) {
    throw new Error(`Invalid status "${status}". Must be one of: ${VALID_STATUSES.join(', ')}`)
  }
  await updateDoc(doc(db, 'users', driverUid, 'documents', docId), { status })
}

export async function getExpiringDocuments(daysAhead: number): Promise<ExpiringDocument[]> {
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const future = new Date(today)
  future.setDate(future.getDate() + daysAhead)

  const todayStr = today.toISOString().slice(0, 10)
  const futureStr = future.toISOString().slice(0, 10)

  const snap = await getDocs(
    query(
      collectionGroup(db, 'documents'),
      where('expiryDate', '>=', todayStr),
      where('expiryDate', '<=', futureStr),
    ),
  )

  const results: ExpiringDocument[] = []

  // Batch-fetch unique parent user docs
  const uidSet = new Set<string>()
  for (const docSnap of snap.docs) {
    const uid = docSnap.ref.parent.parent?.id
    if (uid) uidSet.add(uid)
  }

  const userNames: Record<string, string> = {}
  await Promise.all(
    Array.from(uidSet).map(async (uid) => {
      const userSnap = await getDocs(
        query(collection(db, 'users'), where('__name__', '==', uid)),
      )
      if (!userSnap.empty) {
        const data = userSnap.docs[0].data()
        const name = data.name || [data.firstName, data.lastName].filter(Boolean).join(' ') || uid
        userNames[uid] = name as string
      }
    }),
  )

  for (const docSnap of snap.docs) {
    const uid = docSnap.ref.parent.parent?.id
    if (!uid) continue
    const data = docSnap.data()
    results.push({
      driverUid: uid,
      driverName: userNames[uid] || uid,
      docName: (data.name as string) || (data.type as string) || 'Document',
      expiryDate: data.expiryDate as string,
    })
  }

  return results
}
