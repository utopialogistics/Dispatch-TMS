import {
  collection,
  doc,
  getDocs,
  addDoc,
  updateDoc,
  query,
  orderBy,
  where,
  Timestamp,
  arrayUnion,
} from 'firebase/firestore'
import { db } from '@/lib/firebase'

export interface MessageDoc {
  id: string
  text?: string
  senderId?: string
  createdAt?: unknown
  [key: string]: unknown
}

export interface ConversationDoc {
  id: string
  participants?: string[]
  participantNames?: string[]
  lastMessage?: string
  lastMessageAt?: unknown
  readBy?: string[]
  createdAt?: unknown
  [key: string]: unknown
}

export async function getMessages(conversationId: string): Promise<MessageDoc[]> {
  const snap = await getDocs(
    query(collection(db, 'messages', conversationId, 'msgs'), orderBy('createdAt', 'asc')),
  )
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }))
}

export async function getConversations(uid: string): Promise<ConversationDoc[]> {
  const snap = await getDocs(
    query(collection(db, 'messages'), where('participants', 'array-contains', uid)),
  )
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }))
}

export async function sendMessage(
  conversationId: string,
  message: Record<string, unknown>,
): Promise<void> {
  await addDoc(collection(db, 'messages', conversationId, 'msgs'), {
    ...message,
    createdAt: Timestamp.now(),
  })
  await updateDoc(doc(db, 'messages', conversationId), {
    lastMessage: message.text ?? '',
    lastMessageAt: Timestamp.now(),
  })
}

export async function createConversation(
  participants: string[],
  participantNames: string[],
): Promise<string> {
  const docRef = await addDoc(collection(db, 'messages'), {
    participants,
    participantNames,
    createdAt: Timestamp.now(),
  })
  return docRef.id
}

export async function markMessagesAsRead(conversationId: string, uid: string): Promise<void> {
  await updateDoc(doc(db, 'messages', conversationId), {
    readBy: arrayUnion(uid),
  })
}
