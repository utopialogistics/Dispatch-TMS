import { signInWithEmailAndPassword, signOut } from 'firebase/auth'
import { doc, getDoc } from 'firebase/firestore'
import { auth, db } from '@/lib/firebase'

export async function loginUser(email: string, password: string) {
  const credential = await signInWithEmailAndPassword(auth, email, password)
  const user = credential.user

  const userSnap = await getDoc(doc(db, 'users', user.uid))
  if (!userSnap.exists()) {
    await signOut(auth)
    throw new Error('Account not found. Contact your administrator.')
  }

  const userData = userSnap.data()
  if (userData.status === 'disabled') {
    await signOut(auth)
    throw new Error('Your account has been disabled. Contact your administrator.')
  }

  return {
    user,
    role: (userData.role as string) || null,
    userData,
  }
}

export async function logoutUser(): Promise<void> {
  await signOut(auth)
}

export async function getUserRole(uid: string): Promise<string | null> {
  const snap = await getDoc(doc(db, 'users', uid))
  if (!snap.exists()) return null
  return (snap.data().role as string) || null
}

export async function getUserData(uid: string): Promise<Record<string, unknown> | null> {
  const snap = await getDoc(doc(db, 'users', uid))
  if (!snap.exists()) return null
  return snap.data() as Record<string, unknown>
}
