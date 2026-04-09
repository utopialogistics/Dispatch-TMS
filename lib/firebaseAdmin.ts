import { initializeApp, getApps, cert } from 'firebase-admin/app'
import { getAuth } from 'firebase-admin/auth'
import { getFirestore } from 'firebase-admin/firestore'
import { getStorage } from 'firebase-admin/storage'

function resolveAdminStorageBucket() {
  const explicit = process.env.FIREBASE_ADMIN_STORAGE_BUCKET
  if (explicit) return explicit

  const publicBucket = process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET
  if (publicBucket?.endsWith('.firebasestorage.app')) {
    const projectId =
      process.env.FIREBASE_ADMIN_PROJECT_ID || process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID
    return projectId ? `${projectId}.appspot.com` : publicBucket
  }

  return publicBucket
}

if (!getApps().length) {
  initializeApp({
    credential: cert({
      projectId:   process.env.FIREBASE_ADMIN_PROJECT_ID,
      clientEmail: process.env.FIREBASE_ADMIN_CLIENT_EMAIL,
      // Newlines in the private key get escaped in .env — restore them here
      privateKey:  process.env.FIREBASE_ADMIN_PRIVATE_KEY?.replace(/\\n/g, '\n'),
    }),
    storageBucket: resolveAdminStorageBucket(),
  })
}

export const adminAuth = getAuth()
export const adminDb = getFirestore()
export const adminStorage = getStorage()
